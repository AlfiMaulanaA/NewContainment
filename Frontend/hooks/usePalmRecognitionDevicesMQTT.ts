"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import mqtt from "mqtt";
import { toast } from "sonner";

// Types for device connection state
export interface DeviceConnection {
  deviceId: number;
  ipAddress: string;
  isConnected: boolean;
  isConnecting: boolean;
  client: mqtt.MqttClient | null;
  error: string | null;
  lastConnected: Date | null;
}

export interface DeviceMQTTManager {
  getConnections: () => Map<number, DeviceConnection>;
  connectDevice: (deviceId: number, ipAddress: string) => Promise<boolean>;
  disconnectDevice: (deviceId: number) => void;
  publishToDevice: (deviceId: number, topic: string, message: string) => Promise<boolean>;
  subscribeToDevice: (deviceId: number, topic: string, callback: (topic: string, message: string) => void) => Promise<boolean>;
  getDeviceConnection: (deviceId: number) => DeviceConnection | undefined;
  reconnectDevice: (deviceId: number) => Promise<boolean>;
}

const MQTT_PORT = 9000;
const RECONNECT_INTERVAL = 5000; // 5 seconds
const CONNECTION_TIMEOUT = 15000; // 15 seconds instead of 10 seconds

// Enhanced MQTT Client for Palm Recognition Devices - Based on existing MQTT client pattern
class PalmRecognitionDeviceMQTTClient {
  private static _instances = new Map<number, PalmRecognitionDeviceMQTTClient>();
  private client: mqtt.MqttClient | null = null;
  private deviceId: number;
  private ipAddress: string;
  private config: { host: string; port: number; clientId: string };
  private subscriptions = new Map<string, Set<(topic: string, message: string) => void>>();
  private connectionPromise: Promise<boolean> | null = null;
  private isConnecting = false;
  private connectionListeners = new Set<(connected: boolean) => void>();
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private constructor(deviceId: number, ipAddress: string) {
    this.deviceId = deviceId;
    this.ipAddress = ipAddress;
    this.config = {
      host: ipAddress,
      port: MQTT_PORT,
      clientId: `palm_device_${deviceId}_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`
    };
  }

  static getInstance(deviceId: number, ipAddress: string): PalmRecognitionDeviceMQTTClient {
    const key = `${deviceId}_${ipAddress}`;
    if (!PalmRecognitionDeviceMQTTClient._instances.has(deviceId)) {
      PalmRecognitionDeviceMQTTClient._instances.set(deviceId, new PalmRecognitionDeviceMQTTClient(deviceId, ipAddress));
    }
    return PalmRecognitionDeviceMQTTClient._instances.get(deviceId)!;
  }

  // Add connection status listener
  addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.add(listener);
    listener(this.isConnected());
  }

  // Remove connection status listener
  removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.delete(listener);
  }

  // Notify listeners of connection status change
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  }

  // Connect to MQTT broker
  async connect(): Promise<boolean> {
    if (this.client?.connected) {
      return true;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this.attemptConnection();
    return this.connectionPromise;
  }

  // Attempt connection
  private async attemptConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const url = `ws://${this.config.host}:${this.config.port}`;
        const connectionOptions = {
          clientId: this.config.clientId,
          clean: true,
          keepalive: 60,
          reconnectPeriod: 0,
          connectTimeout: CONNECTION_TIMEOUT,
        };

        this.client = mqtt.connect(url, connectionOptions);

        const timeout = setTimeout(() => {
          this.client?.end();
          this.notifyConnectionListeners(false);
          this.isConnecting = false;
          resolve(false);
        }, CONNECTION_TIMEOUT);

        this.client.on("connect", () => {
          clearTimeout(timeout);
          console.log(`✅ Connected to palm device MQTT broker: ${this.deviceId} (${this.config.host})`);
          this.notifyConnectionListeners(true);
          this.startConnectionMonitoring();
          this.resubscribeAll();
          this.isConnecting = false;
          toast.success(`Connected to palm device at ${this.config.host}`);
          resolve(true);
        });

        this.client.on("error", (error) => {
          clearTimeout(timeout);
          console.error(`❌ MQTT connection error for device ${this.deviceId}:`, error);
          this.notifyConnectionListeners(false);
          this.isConnecting = false;
          resolve(false);
        });

        this.client.on("close", () => {
          clearTimeout(timeout);
          console.log(`📡 Connection closed for device ${this.deviceId}`);
          this.notifyConnectionListeners(false);
          this.stopConnectionMonitoring();
          this.scheduleReconnect();
          this.isConnecting = false;
          resolve(false);
        });

        this.client.on("offline", () => {
          console.log(`📡 Device ${this.deviceId} went offline`);
          this.notifyConnectionListeners(false);
        });

        this.client.on("message", (topic, message) => {
          this.handleMessage(topic, message.toString());
        });

      } catch (error) {
        console.error(`❌ Failed to create MQTT client for device ${this.deviceId}:`, error);
        this.notifyConnectionListeners(false);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  // Start monitoring connection status
  private startConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      const currentStatus = this.isConnected();
      this.notifyConnectionListeners(currentStatus);
    }, 5000);
  }

  // Stop monitoring connection status
  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  // Schedule reconnection
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(async () => {
      if (!this.isConnected() && !this.isConnecting) {
        console.log(`🔄 Auto-reconnecting to device ${this.deviceId}...`);
        await this.connect();
      }
    }, RECONNECT_INTERVAL);
  }

  // Disconnect
  disconnect(): void {
    this.stopConnectionMonitoring();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client) {
      this.client.end();
      this.client = null;
    }

    this.subscriptions.clear();
    this.connectionPromise = null;
    this.isConnecting = false;
    this.notifyConnectionListeners(false);
  }

  // Check if connected
  isConnected(): boolean {
    return this.client?.connected || false;
  }

  // Subscribe to topic
  async subscribe(topic: string, callback: (topic: string, message: string) => void): Promise<boolean> {
    await this.connect();

    if (!this.client?.connected) {
      return false;
    }

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
      this.client.subscribe(topic, (error) => {
        if (error) {
          console.error(`❌ Failed to subscribe to ${topic}:`, error);
        }
      });
    }

    this.subscriptions.get(topic)!.add(callback);
    return true;
  }

  // Unsubscribe from topic
  unsubscribe(topic: string, callback?: (topic: string, message: string) => void): void {
    const callbacks = this.subscriptions.get(topic);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(topic);
        if (this.client?.connected) {
          this.client.unsubscribe(topic);
        }
      }
    } else {
      this.subscriptions.delete(topic);
      if (this.client?.connected) {
        this.client.unsubscribe(topic);
      }
    }
  }

  // Publish message
  async publish(topic: string, message: string, retain = false): Promise<boolean> {
    await this.connect();

    if (!this.client?.connected) {
      return false;
    }

    return new Promise((resolve) => {
      this.client!.publish(topic, message, { retain }, (error) => {
        if (error) {
          console.error(`❌ Failed to publish to ${topic}:`, error);
          resolve(false);
        } else {
          console.log(`📤 Published to device ${this.deviceId}: ${topic}`);
          resolve(true);
        }
      });
    });
  }

  // Get connection status
  getConnectionStatus(): DeviceConnection {
    return {
      deviceId: this.deviceId,
      ipAddress: this.config.host,
      isConnected: this.isConnected(),
      isConnecting: this.isConnecting,
      client: this.client,
      error: null,
      lastConnected: null
    };
  }

  // Handle incoming messages
  private handleMessage(topic: string, message: string): void {
    const callbacks = this.subscriptions.get(topic);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(topic, message);
        } catch (error) {
          console.error(`❌ Error in MQTT callback for ${topic}:`, error);
        }
      });
    }
  }

  // Resubscribe to all topics after reconnection
  private resubscribeAll(): void {
    if (!this.client?.connected) return;

    for (const topic of this.subscriptions.keys()) {
      this.client.subscribe(topic, (error) => {
        if (error) {
          console.error(`❌ Failed to resubscribe to ${topic}:`, error);
        }
      });
    }
  }
}

// Singleton MQTT Manager for all palm recognition devices
class PalmRecognitionDeviceMQTTManager implements DeviceMQTTManager {
  private static _instance: PalmRecognitionDeviceMQTTManager | null = null;
  private clients = new Map<number, PalmRecognitionDeviceMQTTClient>();
  private connectionListeners = new Set<(deviceId: number, connected: boolean) => void>();

  private constructor() {}

  static getInstance(): PalmRecognitionDeviceMQTTManager {
    if (!PalmRecognitionDeviceMQTTManager._instance) {
      PalmRecognitionDeviceMQTTManager._instance = new PalmRecognitionDeviceMQTTManager();
    }
    return PalmRecognitionDeviceMQTTManager._instance;
  }

  // Add connection status listener
  addConnectionListener(listener: (deviceId: number, connected: boolean) => void): void {
    this.connectionListeners.add(listener);
  }

  // Remove connection status listener
  removeConnectionListener(listener: (deviceId: number, connected: boolean) => void): void {
    this.connectionListeners.delete(listener);
  }

  // Notify listeners of connection status change
  private notifyConnectionListeners(deviceId: number, connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(deviceId, connected);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  }

  // Get all connections
  getConnections(): Map<number, DeviceConnection> {
    const connections = new Map<number, DeviceConnection>();
    for (const [deviceId, client] of this.clients.entries()) {
      connections.set(deviceId, client.getConnectionStatus());
    }
    return connections;
  }

  async connectDevice(deviceId: number, ipAddress: string): Promise<boolean> {
    if (!this.clients.has(deviceId)) {
      this.clients.set(deviceId, PalmRecognitionDeviceMQTTClient.getInstance(deviceId, ipAddress));
    }

    const client = this.clients.get(deviceId)!;
    return await client.connect();
  }

  disconnectDevice(deviceId: number): void {
    const client = this.clients.get(deviceId);
    if (client) {
      client.disconnect();
    }
  }

  async publishToDevice(deviceId: number, topic: string, message: string): Promise<boolean> {
    const client = this.clients.get(deviceId);
    if (!client) return false;
    return await client.publish(topic, message);
  }

  async subscribeToDevice(deviceId: number, topic: string, callback: (topic: string, message: string) => void): Promise<boolean> {
    const client = this.clients.get(deviceId);
    if (!client) return false;
    return await client.subscribe(topic, callback);
  }

  getDeviceConnection(deviceId: number): DeviceConnection | undefined {
    const client = this.clients.get(deviceId);
    if (!client) return undefined;
    return client.getConnectionStatus();
  }

  async reconnectDevice(deviceId: number): Promise<boolean> {
    const client = this.clients.get(deviceId);
    if (!client) return false;

    client.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await client.connect();
  }

}

// Export singleton instance
const palmDeviceMQTTManager = PalmRecognitionDeviceMQTTManager.getInstance();

// React Hook for managing palm recognition device MQTT connections
export function usePalmRecognitionDeviceMQTT() {
  const [connections, setConnections] = useState<Map<number, DeviceConnection>>(new Map());
  const connectionListenersRef = useRef<Set<() => void>>(new Set());

  // Update connection state when manager changes
  const updateConnections = useCallback(() => {
    setConnections(new Map(palmDeviceMQTTManager.getConnections()));
  }, []);

  // Listen for connection changes
  useEffect(() => {
    const handleConnectionChange = (deviceId: number, connected: boolean) => {
      updateConnections();
    };

    palmDeviceMQTTManager.addConnectionListener(handleConnectionChange);

    // Initial state
    updateConnections();

    return () => {
      palmDeviceMQTTManager.removeConnectionListener(handleConnectionChange);
    };
  }, [updateConnections]);

  // Connect to device
  const connectDevice = useCallback(async (deviceId: number, ipAddress: string): Promise<boolean> => {
    const success = await palmDeviceMQTTManager.connectDevice(deviceId, ipAddress);
    updateConnections();
    return success;
  }, [updateConnections]);

  // Disconnect from device
  const disconnectDevice = useCallback((deviceId: number): void => {
    palmDeviceMQTTManager.disconnectDevice(deviceId);
    updateConnections();
  }, [updateConnections]);

  // Publish to device
  const publishToDevice = useCallback(async (deviceId: number, topic: string, message: string): Promise<boolean> => {
    return await palmDeviceMQTTManager.publishToDevice(deviceId, topic, message);
  }, []);

  // Subscribe to device topic
  const subscribeToDevice = useCallback(async (deviceId: number, topic: string, callback: (topic: string, message: string) => void): Promise<boolean> => {
    return await palmDeviceMQTTManager.subscribeToDevice(deviceId, topic, callback);
  }, []);

  // Reconnect device
  const reconnectDevice = useCallback(async (deviceId: number): Promise<boolean> => {
    const success = await palmDeviceMQTTManager.reconnectDevice(deviceId);
    updateConnections();
    return success;
  }, [updateConnections]);

  // Get device connection
  const getDeviceConnection = useCallback((deviceId: number): DeviceConnection | undefined => {
    return palmDeviceMQTTManager.getDeviceConnection(deviceId);
  }, []);

  return {
    connections: Array.from(connections.values()),
    connectDevice,
    disconnectDevice,
    publishToDevice,
    subscribeToDevice,
    getDeviceConnection,
    reconnectDevice,
  };
}

export default usePalmRecognitionDeviceMQTT;
