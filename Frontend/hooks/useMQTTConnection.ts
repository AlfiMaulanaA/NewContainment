// hooks/useMQTTConnection.ts
"use client";

import { useEffect, useState } from "react";
import { useMQTT } from "@/lib/mqtt-manager";
import { useMQTTConfig } from "@/lib/mqtt-config-manager";

export function useMQTTConnection() {
  const { isConnected } = useMQTT();
  const { config, isEnabled } = useMQTTConfig();
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeConnection = async () => {
      // Don't attempt connection if already connected or if MQTT is disabled
      if (isConnected() || !isEnabled || connectionAttempted) {
        setIsInitializing(false);
        return;
      }

      // Only attempt connection if we have valid config
      if (config) {
        try {
          setConnectionAttempted(true);
          console.log("Attempting MQTT connection initialization...");
          
          // Import MQTTManager and trigger connection
          const MQTTManager = (await import("@/lib/mqtt-manager")).default;
          const manager = MQTTManager.getInstance();
          
          await manager.connect();
          console.log("MQTT connection initialized");
        } catch (error) {
          console.error("Failed to initialize MQTT connection:", error);
          console.warn("Make sure MQTT WebSocket bridge is running on port", config?.brokerPort || 9000);
        } finally {
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }
    };

    // Small delay to ensure config is loaded
    const timeout = setTimeout(initializeConnection, 1000);

    return () => clearTimeout(timeout);
  }, [config, isEnabled, isConnected, connectionAttempted]);

  // Reset connection attempt flag when config changes
  useEffect(() => {
    setConnectionAttempted(false);
  }, [config?.brokerHost, config?.brokerPort, config?.source]);

  return {
    isInitializing,
    connectionAttempted
  };
}