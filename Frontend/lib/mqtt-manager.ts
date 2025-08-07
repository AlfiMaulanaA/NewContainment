import mqtt, { MqttClient } from 'mqtt';
import { toast } from 'sonner';

interface Subscription {
  topic: string;
  callback: (topic: string, message: Buffer) => void;
  component: string;
}

class MQTTManager {
  private static instance: MQTTManager;
  private client: MqttClient | null = null;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  private constructor() {}

  static getInstance(): MQTTManager {
    if (!MQTTManager.instance) {
      MQTTManager.instance = new MQTTManager();
    }
    return MQTTManager.instance;
  }

  async connect(): Promise<MqttClient | null> {
    if (this.client?.connected) {
      return this.client;
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.client?.connected) {
            resolve(this.client);
          } else if (!this.isConnecting) {
            resolve(null);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    try {
      this.isConnecting = true;
      
      const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:8000/mqtt';
      
      this.client = mqtt.connect(brokerUrl, {
        clientId: `containment_web_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 0, // Disable automatic reconnection, we'll handle it manually
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false;
          reject(new Error('Connection timeout'));
        }, 10000);

        this.client!.on('connect', () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.connectionAttempts = 0;
          console.log('MQTT Connected successfully');
          
          // Re-subscribe to all existing subscriptions
          this.resubscribeAll();
          
          resolve(this.client!);
        });

        this.client!.on('error', (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error('MQTT Connection error:', error);
          this.handleConnectionError();
          reject(error);
        });

        this.client!.on('close', () => {
          console.log('MQTT Connection closed');
          this.scheduleReconnect();
        });

        this.client!.on('message', this.handleMessage.bind(this));
      });

    } catch (error) {
      this.isConnecting = false;
      console.error('MQTT Connect failed:', error);
      return null;
    }
  }

  private handleConnectionError() {
    this.connectionAttempts++;
    if (this.connectionAttempts <= this.maxConnectionAttempts) {
      toast.error(`MQTT connection failed (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      this.scheduleReconnect();
    } else {
      toast.error('MQTT connection failed permanently. Please check your connection.');
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000); // Exponential backoff, max 30s
    this.reconnectTimer = setTimeout(() => {
      if (!this.client?.connected && this.connectionAttempts < this.maxConnectionAttempts) {
        this.connect();
      }
    }, delay);
  }

  private resubscribeAll() {
    if (!this.client?.connected) return;

    this.subscriptions.forEach((subs, topic) => {
      if (subs.length > 0) {
        this.client!.subscribe(topic, (err) => {
          if (err) {
            console.error(`Failed to resubscribe to ${topic}:`, err);
          }
        });
      }
    });
  }

  private handleMessage(topic: string, message: Buffer) {
    const topicSubscriptions = this.subscriptions.get(topic);
    if (topicSubscriptions) {
      topicSubscriptions.forEach(sub => {
        try {
          sub.callback(topic, message);
        } catch (error) {
          console.error(`Error in message handler for ${topic}:`, error);
        }
      });
    }
  }

  subscribe(
    topic: string, 
    callback: (topic: string, message: Buffer) => void, 
    componentName: string = 'unknown'
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        await this.connect();
        
        if (!this.client?.connected) {
          resolve(false);
          return;
        }

        // Add subscription to our tracking
        if (!this.subscriptions.has(topic)) {
          this.subscriptions.set(topic, []);
        }
        
        const existingSub = this.subscriptions.get(topic)!.find(s => s.component === componentName);
        if (existingSub) {
          // Update existing subscription
          existingSub.callback = callback;
          resolve(true);
          return;
        }

        this.subscriptions.get(topic)!.push({
          topic,
          callback,
          component: componentName
        });

        // Subscribe to MQTT topic if this is the first subscription
        if (this.subscriptions.get(topic)!.length === 1) {
          this.client.subscribe(topic, (err) => {
            if (err) {
              console.error(`Failed to subscribe to ${topic}:`, err);
              resolve(false);
            } else {
              resolve(true);
            }
          });
        } else {
          resolve(true);
        }
      } catch (error) {
        console.error(`Subscription error for ${topic}:`, error);
        resolve(false);
      }
    });
  }

  unsubscribe(topic: string, componentName: string = 'unknown') {
    const topicSubscriptions = this.subscriptions.get(topic);
    if (!topicSubscriptions) return;

    // Remove this component's subscription
    const filteredSubs = topicSubscriptions.filter(s => s.component !== componentName);
    
    if (filteredSubs.length === 0) {
      // No more subscriptions for this topic, unsubscribe from MQTT
      this.subscriptions.delete(topic);
      if (this.client?.connected) {
        this.client.unsubscribe(topic);
      }
    } else {
      this.subscriptions.set(topic, filteredSubs);
    }
  }

  publish(topic: string, message: string | Buffer): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        await this.connect();
        
        if (!this.client?.connected) {
          resolve(false);
          return;
        }

        this.client.publish(topic, message, {}, (err) => {
          if (err) {
            console.error(`Failed to publish to ${topic}:`, err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.error(`Publish error for ${topic}:`, error);
        resolve(false);
      }
    });
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }

  getClient(): MqttClient | null {
    return this.client;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.subscriptions.clear();
    
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
  }

  // Get subscription count for debugging
  getSubscriptionCount(): number {
    let count = 0;
    this.subscriptions.forEach(subs => count += subs.length);
    return count;
  }

  // Get active topics for debugging
  getActiveTopics(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Hook for React components
export function useMQTT() {
  const manager = MQTTManager.getInstance();
  
  const subscribe = async (
    topic: string, 
    callback: (topic: string, message: Buffer) => void, 
    componentName?: string
  ) => {
    return manager.subscribe(topic, callback, componentName);
  };

  const unsubscribe = (topic: string, componentName?: string) => {
    manager.unsubscribe(topic, componentName);
  };

  const publish = async (topic: string, message: string | Buffer) => {
    return manager.publish(topic, message);
  };

  const isConnected = () => manager.isConnected();

  return {
    subscribe,
    unsubscribe,
    publish,
    isConnected,
    getClient: () => manager.getClient()
  };
}

export default MQTTManager;