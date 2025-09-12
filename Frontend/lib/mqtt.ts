import mqtt, { MqttClient } from "mqtt";
import { toast } from "sonner";
import { mqttConfigurationApi } from "@/lib/api-service";

// Enhanced MQTT Configuration supporting both env and database
export interface EnhancedMQTTConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  clientId?: string;
  topicPrefix?: string;
  enabled?: boolean;
  useSsl?: boolean;
  useWebSocket?: boolean;
  protocol?: "mqtt" | "ws";
  brokerSource?: "env" | "database";
}

// Get configuration from environment variables (simplified)
function getEnvConfig(): EnhancedMQTTConfig {
  const brokerHosthame = window.location.hostname;

  const useWebSocket = process.env.NEXT_PUBLIC_MQTT_USE_WEBSOCKET === "true";
  const host = process.env.NEXT_PUBLIC_MQTT_HOST || brokerHosthame;
  const port = parseInt(
    process.env.NEXT_PUBLIC_MQTT_PORT || (useWebSocket ? "9000" : "1883")
  );

  return {
    host,
    port,
    username: process.env.NEXT_PUBLIC_MQTT_USERNAME || undefined,
    password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || undefined,
    clientId:
      process.env.NEXT_PUBLIC_MQTT_CLIENT_ID ||
      `frontend_${Math.random().toString(16).substr(2, 8)}`,
    topicPrefix: process.env.NEXT_PUBLIC_MQTT_TOPIC_PREFIX || "containment",
    enabled: process.env.NEXT_PUBLIC_MQTT_ENABLED !== "false",
    useWebSocket,
    useSsl: false, // Force plain connection as requested
    protocol: useWebSocket ? "ws" : "mqtt",
    brokerSource: "env",
  };
}

// Default configuration
const DEFAULT_CONFIG: EnhancedMQTTConfig = getEnvConfig();

// Enhanced MQTT Client supporting env and database config
class EnhancedMQTTClient {
  private static instance: EnhancedMQTTClient;
  private client: MqttClient | null = null;
  private config: EnhancedMQTTConfig = DEFAULT_CONFIG;
  private subscriptions = new Map<
    string,
    Set<(topic: string, message: string) => void>
  >();
  private connectionPromise: Promise<boolean> | null = null;
  private isConnecting = false;
  private connectionListeners = new Set<(connected: boolean) => void>();
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Load database config asynchronously without blocking
    this.loadConfigFromDatabaseAsync();
  }

  // Async wrapper to avoid blocking constructor
  private loadConfigFromDatabaseAsync(): void {
    // Run in next tick to avoid blocking initialization
    setTimeout(async () => {
      try {
        await this.loadConfigFromDatabase();
      } catch (error) {
        // Using environment MQTT configuration as fallback
      }
    }, 0);
  }

  // Load MQTT configuration from backend database via api-service
  private async loadConfigFromDatabase(): Promise<void> {
    try {
      const response = await mqttConfigurationApi.getEffectiveConfiguration();

      if (response.success && response.data) {
        const dbConfig = response.data;

        // Map database config to our format
        const enhancedConfig: EnhancedMQTTConfig = {
          host: dbConfig.BrokerHost || this.config.host,
          port: dbConfig.BrokerPort || this.config.port,
          username: dbConfig.Username || this.config.username,
          password: dbConfig.Password || this.config.password,
          clientId: dbConfig.ClientId || this.config.clientId,
          topicPrefix: dbConfig.TopicPrefix || this.config.topicPrefix,
          enabled:
            dbConfig.IsEnabled !== undefined
              ? dbConfig.IsEnabled
              : this.config.enabled,
          useSsl: false, // Force plain connection as requested
          useWebSocket: dbConfig.UseWebSocket || this.config.useWebSocket,
          protocol: dbConfig.UseWebSocket ? "ws" : "mqtt",
          brokerSource: "database",
        };

        this.config = enhancedConfig;
      } else {
        throw new Error(
          response.message || "Failed to get effective configuration"
        );
      }
    } catch (error) {
      // Silently fallback to environment config
      // Keep using environment config as fallback
    }
  }

  static getInstance(): EnhancedMQTTClient {
    if (!EnhancedMQTTClient.instance) {
      EnhancedMQTTClient.instance = new EnhancedMQTTClient();
    }
    return EnhancedMQTTClient.instance;
  }

  // Get connection URLs based on configuration (plain connections only)
  private getConnectionUrls(): string[] {
    const { host, port, useWebSocket } = this.config;

    if (useWebSocket) {
      // Force plain WebSocket (ws://) - no WSS/HTTPS as requested
      return [
        `ws://${host}:9000`, // Primary WebSocket port
        `ws://${host}:${port}`, // Configured port
        `ws://${host}:8083`, // Common MQTT WebSocket port
      ];
    } else {
      // For native MQTT connections (not used in browser but kept for completeness)
      return [
        `mqtt://${host}:${port}`,
        `mqtt://${host}:1883`, // Standard MQTT port
      ];
    }
  }

  // Connect to MQTT broker with WebSocket fallback
  async connect(): Promise<boolean> {
    if (!this.config.enabled) {
      // MQTT is disabled
      return false;
    }

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

  // Attempt connection with fallback URLs
  private async attemptConnection(): Promise<boolean> {
    const connectionUrls = this.getConnectionUrls();
    const connectionType = this.config.useWebSocket ? "WebSocket" : "MQTT";

    for (let i = 0; i < connectionUrls.length; i++) {
      const url = connectionUrls[i];

      const success = await this.tryConnect(url);
      if (success) {
        this.isConnecting = false;
        toast.success(`MQTT connected via ${connectionType}`);
        return true;
      }

      // Wait 1 second before next attempt
      if (i < connectionUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.isConnecting = false;
    toast.error(`MQTT ${connectionType} connection failed`);
    return false;
  }

  // Try single connection attempt with enhanced event handling
  private async tryConnect(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const connectionOptions = {
          clientId: this.config.clientId,
          clean: true,
          keepalive: 60,
          reconnectPeriod: 0, // Disable auto-reconnect for manual fallback
          connectTimeout: 5000,
          username: this.config.username,
          password: this.config.password,
        };

        // Attempting MQTT connection
        this.client = mqtt.connect(url, connectionOptions);

        // Set up connection timeout
        const timeout = setTimeout(() => {
          // Connection timeout
          this.client?.end();
          this.notifyConnectionListeners(false);
          resolve(false);
        }, 5000);

        this.client.on("connect", () => {
          // MQTT connected successfully
          clearTimeout(timeout);
          this.notifyConnectionListeners(true);
          this.startConnectionMonitoring();
          this.resubscribeAll();
          resolve(true);
        });

        this.client.on("error", (error) => {
          console.error(`❌ MQTT connection error for ${url}:`, error);
          clearTimeout(timeout);
          this.client?.end();
          this.notifyConnectionListeners(false);
          resolve(false);
        });

        this.client.on("close", () => {
          // MQTT connection closed
          clearTimeout(timeout);
          this.notifyConnectionListeners(false);
          this.stopConnectionMonitoring();
          resolve(false);
        });

        this.client.on("disconnect", () => {
          // MQTT disconnected
          this.notifyConnectionListeners(false);
        });

        this.client.on("offline", () => {
          // MQTT went offline
          this.notifyConnectionListeners(false);
        });

        this.client.on("reconnect", () => {
          // MQTT attempting reconnect
        });

        this.client.on("message", (topic, message) => {
          this.handleMessage(topic, message.toString());
        });
      } catch (error) {
        console.error("❌ MQTT connection failed:", error);
        this.notifyConnectionListeners(false);
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
    }, 5000); // Check every 5 seconds
  }

  // Stop monitoring connection status
  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  // Disconnect from MQTT broker
  disconnect(): void {
    // Disconnecting MQTT client

    this.stopConnectionMonitoring();

    if (this.client) {
      this.client.end();
      this.client = null;
    }

    this.subscriptions.clear();
    this.connectionPromise = null;
    this.isConnecting = false;
    this.notifyConnectionListeners(false);

    // MQTT disconnected
  }

  // Check if connected with real-time updates
  isConnected(): boolean {
    return this.client?.connected || false;
  }

  // Add connection status listener
  addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.add(listener);
    // Immediately notify current status
    listener(this.isConnected());
  }

  // Remove connection status listener
  removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.delete(listener);
  }

  // Notify all listeners of connection status change
  private notifyConnectionListeners(connected: boolean): void {
    // Notify connection listeners
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  }

  // Subscribe to topic
  async subscribe(
    topic: string,
    callback: (topic: string, message: string) => void
  ): Promise<boolean> {
    await this.connect();

    if (!this.client?.connected) {
      // Cannot subscribe: Not connected
      return false;
    }

    // Add callback to subscriptions
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());

      // Subscribe to MQTT topic
      this.client.subscribe(topic, (error) => {
        if (error) {
          console.error(`❌ Failed to subscribe to ${topic}:`, error);
        } else {
          // Successfully subscribed
        }
      });
    }

    this.subscriptions.get(topic)!.add(callback);
    return true;
  }

  // Unsubscribe from topic
  unsubscribe(
    topic: string,
    callback?: (topic: string, message: string) => void
  ): void {
    const callbacks = this.subscriptions.get(topic);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);

      // If no more callbacks, unsubscribe from MQTT
      if (callbacks.size === 0) {
        this.subscriptions.delete(topic);
        if (this.client?.connected) {
          this.client.unsubscribe(topic);
          // Successfully unsubscribed
        }
      }
    } else {
      // Remove all callbacks for this topic
      this.subscriptions.delete(topic);
      if (this.client?.connected) {
        this.client.unsubscribe(topic);
        console.log(`📡 Unsubscribed from ${topic}`);
      }
    }
  }

  // Publish message
  async publish(
    topic: string,
    message: string,
    retain = false
  ): Promise<boolean> {
    await this.connect();

    if (!this.client?.connected) {
      // Cannot publish: Not connected
      return false;
    }

    return new Promise((resolve) => {
      this.client!.publish(topic, message, { retain }, (error) => {
        if (error) {
          console.error(`❌ Failed to publish to ${topic}:`, error);
          resolve(false);
        } else {
          // Successfully published
          resolve(true);
        }
      });
    });
  }

  // Helper: Get topic with prefix
  getTopic(subtopic: string): string {
    return `${this.config.topicPrefix}/${subtopic}`;
  }

  // Helper: Subscribe with prefix
  async subscribeTopic(
    subtopic: string,
    callback: (topic: string, message: string) => void
  ): Promise<boolean> {
    return this.subscribe(this.getTopic(subtopic), callback);
  }

  // Helper: Publish with prefix
  async publishTopic(
    subtopic: string,
    message: string,
    retain = false
  ): Promise<boolean> {
    return this.publish(this.getTopic(subtopic), message, retain);
  }

  // Get current configuration
  getConfig(): EnhancedMQTTConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<EnhancedMQTTConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reconnect with new config if currently connected
    if (this.client?.connected) {
      this.disconnect();
      setTimeout(() => this.connect(), 1000);
    }
  }

  // Reload configuration from database
  async reloadConfigFromDatabase(): Promise<boolean> {
    try {
      await this.loadConfigFromDatabase();

      // Reconnect with new config if currently connected
      if (this.client?.connected) {
        this.disconnect();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await this.connect();
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to reload MQTT config from database:", error);
      return false;
    }
  }

  // Backward compatibility alias
  async reloadConfig(): Promise<boolean> {
    return this.reloadConfigFromDatabase();
  }

  // Get connection status info
  getStatus() {
    const config = this.getConfig();

    // Add backward compatibility properties
    const compatibleConfig = {
      ...config,
      brokerHost: config.host, // Backward compatibility
      brokerPort: config.port, // Backward compatibility
      source: config.brokerSource, // Backward compatibility
    };

    return {
      connected: this.isConnected(),
      connecting: this.isConnecting,
      config: compatibleConfig,
      subscriptions: Array.from(this.subscriptions.keys()),
      protocol: this.config.useWebSocket ? "WebSocket" : "MQTT",
    };
  }

  // Handle incoming messages
  private handleMessage(topic: string, message: string): void {
    // Handle MQTT message silently

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

    // Resubscribing to topics
    for (const topic of this.subscriptions.keys()) {
      this.client.subscribe(topic, (error) => {
        if (error) {
          console.error(`❌ Failed to resubscribe to ${topic}:`, error);
        } else {
          // Successfully resubscribed
        }
      });
    }
  }
}

// Export singleton instance
export const mqttClient = EnhancedMQTTClient.getInstance();

// Export default
export default mqttClient;
