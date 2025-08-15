import { mqttConfigurationApi, MqttConfiguration } from "./api-service";

interface MQTTConnectionConfig {
  brokerHost: string;
  brokerPort: number;
  username?: string;
  password?: string;
  clientId: string;
  useSsl: boolean;
  keepAliveInterval: number;
  reconnectDelay: number;
  topicPrefix: string;
  isEnabled: boolean;
  source: "environment" | "database";
}

class MQTTConfigManager {
  private static instance: MQTTConfigManager;
  private currentConfig: MQTTConnectionConfig | null = null;
  private configListeners: Array<
    (config: MQTTConnectionConfig | null) => void
  > = [];

  private constructor() {}

  static getInstance(): MQTTConfigManager {
    if (!MQTTConfigManager.instance) {
      MQTTConfigManager.instance = new MQTTConfigManager();
    }
    return MQTTConfigManager.instance;
  }

  /**
   * Get effective MQTT configuration following priority system:
   * 1. Database configuration (if active and not using environment config)
   * 2. Environment variables
   * 3. Default fallback
   */
  async getEffectiveConfiguration(): Promise<MQTTConnectionConfig> {
    try {
      // Try to get active configuration from database
      const activeConfigRes =
        await mqttConfigurationApi.getActiveConfiguration();

      if (activeConfigRes.success && activeConfigRes.data) {
        const dbConfig = activeConfigRes.data;

        // If database config exists and is enabled and NOT using environment config
        if (dbConfig.isEnabled && !dbConfig.useEnvironmentConfig) {
          this.currentConfig = {
            brokerHost:
              dbConfig.brokerHost || this.getEnvironmentConfig().brokerHost,
            brokerPort: Number(9000) || this.getEnvironmentConfig().brokerPort,
            username: dbConfig.username || this.getEnvironmentConfig().username,
            password: dbConfig.password || this.getEnvironmentConfig().password,
            clientId: dbConfig.clientId || this.getEnvironmentConfig().clientId,
            useSsl: dbConfig.useSsl,
            keepAliveInterval: dbConfig.keepAliveInterval,
            reconnectDelay: dbConfig.reconnectDelay,
            topicPrefix:
              dbConfig.topicPrefix || this.getEnvironmentConfig().topicPrefix,
            isEnabled: dbConfig.isEnabled,
            source: "database",
          };

          this.notifyListeners();
          return this.currentConfig;
        }
      }

      // Fallback to environment configuration
      this.currentConfig = this.getEnvironmentConfig();
      this.notifyListeners();
      return this.currentConfig;
    } catch (error) {
      console.warn(
        "Failed to fetch database MQTT config, using environment:",
        error
      );
      this.currentConfig = this.getEnvironmentConfig();
      this.notifyListeners();
      return this.currentConfig;
    }
  }

  /**
   * Get configuration from environment variables
   */
  private getEnvironmentConfig(): MQTTConnectionConfig {
    // Debug environment variables in development
    if (process.env.NODE_ENV === "development") {
      import("./mqtt-debug").then(({ debugMQTTConfig }) => debugMQTTConfig());
    }
    const isProduction = process.env.NODE_ENV === "production";
    const isBrowser = typeof window !== "undefined";

    let brokerUrl: string;
    let brokerHost: string;
    let brokerPort: number;
    let useSsl: boolean;

    if (isBrowser && isProduction) {
      // Production browser - dynamic detection
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const isHttps = protocol === "https:";

      // Check if we have explicit MQTT broker config
      const envBrokerHost = process.env.NEXT_PUBLIC_MQTT_BROKER_HOST;
      const envBrokerPort = process.env.NEXT_PUBLIC_MQTT_BROKER_PORT;
      const envUseSsl = process.env.NEXT_PUBLIC_MQTT_USE_SSL;

      if (envBrokerHost) {
        brokerHost = envBrokerHost;
        // Use WebSocket bridge ports, not direct MQTT ports
        brokerPort = envBrokerPort
          ? parseInt(envBrokerPort)
          : isHttps
          ? 9001
          : 9000;
        useSsl = envUseSsl ? envUseSsl.toLowerCase() === "true" : isHttps;
      } else {
        // Dynamic detection based on current page - use WebSocket bridge ports
        brokerHost = hostname;
        brokerPort = isHttps ? 9001 : 9000;
        useSsl = isHttps;
      }
    } else {
      // Development or SSR - use WebSocket bridge ports
      // Try to parse from MQTT_BROKER_URL first, then fall back to individual settings
      const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL;
      if (brokerUrl) {
        try {
          const url = new URL(brokerUrl);
          brokerHost = url.hostname;
          brokerPort =
            parseInt(url.port) || (url.protocol === "wss:" ? 9001 : 9000);
          useSsl = url.protocol === "wss:";
        } catch (error) {
          console.warn(
            "Failed to parse NEXT_PUBLIC_MQTT_BROKER_URL:",
            brokerUrl
          );
          // Fallback to individual settings
          brokerHost = process.env.NEXT_PUBLIC_MQTT_BROKER_HOST || "localhost";
          brokerPort = parseInt(
            process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || "9000"
          );
          useSsl =
            process.env.NEXT_PUBLIC_MQTT_USE_SSL?.toLowerCase() === "true";
        }
      } else {
        // Use individual settings
        brokerHost = process.env.NEXT_PUBLIC_MQTT_BROKER_HOST || "localhost";
        brokerPort = parseInt(
          process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || "9000"
        );
        useSsl = process.env.NEXT_PUBLIC_MQTT_USE_SSL?.toLowerCase() === "true";
      }
    }

    return {
      brokerHost,
      brokerPort,
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME || "",
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || "",
      clientId:
        process.env.NEXT_PUBLIC_MQTT_CLIENT_ID ||
        `containment_web_${Math.random().toString(16).substr(2, 8)}`,
      useSsl,
      keepAliveInterval: parseInt(
        process.env.NEXT_PUBLIC_MQTT_KEEP_ALIVE || "60"
      ),
      reconnectDelay: parseInt(
        process.env.NEXT_PUBLIC_MQTT_RECONNECT_DELAY || "5"
      ),
      topicPrefix: process.env.NEXT_PUBLIC_MQTT_TOPIC_PREFIX || "containment",
      isEnabled:
        process.env.NEXT_PUBLIC_MQTT_ENABLED?.toLowerCase() !== "false",
      source: "environment",
    };
  }

  /**
   * Get current cached configuration
   */
  getCurrentConfig(): MQTTConnectionConfig | null {
    return this.currentConfig;
  }

  /**
   * Force refresh configuration from database/environment
   */
  async refreshConfiguration(): Promise<MQTTConnectionConfig> {
    return this.getEffectiveConfiguration();
  }

  /**
   * Listen for configuration changes
   */
  onConfigurationChange(
    listener: (config: MQTTConnectionConfig | null) => void
  ) {
    this.configListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.configListeners.indexOf(listener);
      if (index > -1) {
        this.configListeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.configListeners.forEach((listener) => {
      try {
        listener(this.currentConfig);
      } catch (error) {
        console.error("Error in MQTT config listener:", error);
      }
    });
  }

  /**
   * Get connection URL for MQTT client
   */
  getConnectionUrl(config?: MQTTConnectionConfig): string {
    const cfg = config || this.currentConfig;
    if (!cfg) {
      throw new Error("No MQTT configuration available");
    }

    const protocol = cfg.useSsl ? "wss" : "ws";

    // Check if using WebSocket bridge ports (9000/9001) or direct MQTT ports (1883/8883)
    const isWebSocketBridge =
      cfg.brokerPort === 9000 || cfg.brokerPort === 9001;

    if (isWebSocketBridge) {
      // WebSocket bridge - use /mqtt path
      return `${protocol}://${cfg.brokerHost}:${cfg.brokerPort}/mqtt`;
    } else {
      // Direct MQTT WebSocket connection (if broker supports it)
      return `${protocol}://${cfg.brokerHost}:${cfg.brokerPort}`;
    }
  }

  /**
   * Get connection options for MQTT client
   */
  getConnectionOptions(config?: MQTTConnectionConfig): any {
    const cfg = config || this.currentConfig;
    if (!cfg) {
      throw new Error("No MQTT configuration available");
    }

    return {
      clientId: cfg.clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: cfg.reconnectDelay * 1000,
      keepalive: cfg.keepAliveInterval,
      username: cfg.username || undefined,
      password: cfg.password || undefined,
    };
  }

  /**
   * Check if MQTT is enabled
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.getEffectiveConfiguration();
    return config.isEnabled;
  }

  /**
   * Get configuration status for debugging
   */
  async getConfigurationStatus(): Promise<{
    source: "environment" | "database";
    isEnabled: boolean;
    brokerEndpoint: string;
    hasCredentials: boolean;
  }> {
    const config = await this.getEffectiveConfiguration();

    return {
      source: config.source,
      isEnabled: config.isEnabled,
      brokerEndpoint: `${config.brokerHost}:${config.brokerPort}`,
      hasCredentials: !!(config.username && config.password),
    };
  }
}

// React Hook for using MQTT Config Manager
export function useMQTTConfig() {
  const [config, setConfig] = React.useState<MQTTConnectionConfig | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const manager = MQTTConfigManager.getInstance();

  React.useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        const effectiveConfig = await manager.getEffectiveConfiguration();
        if (mounted) {
          setConfig(effectiveConfig);
        }
      } catch (error) {
        console.error("Failed to load MQTT config:", error);
        if (mounted) {
          setConfig(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadConfig();

    // Listen for config changes
    const unsubscribe = manager.onConfigurationChange((newConfig) => {
      if (mounted) {
        setConfig(newConfig);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const refreshConfig = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const newConfig = await manager.refreshConfiguration();
      setConfig(newConfig);
    } catch (error) {
      console.error("Failed to refresh MQTT config:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    config,
    isLoading,
    refreshConfig,
    isEnabled: config?.isEnabled || false,
    source: config?.source || "environment",
  };
}

export default MQTTConfigManager;

// Import React for the hook
import React from "react";
