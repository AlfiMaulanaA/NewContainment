// hooks/useMQTTStatus.ts
"use client";

import { useState, useEffect } from "react";
import { useMQTT } from "@/lib/mqtt-manager";

export type MQTTStatus = "connecting" | "connected" | "disconnected" | "error";

export function useMQTTStatus(): MQTTStatus {
  const { isConnected, getClient } = useMQTT();
  const [status, setStatus] = useState<MQTTStatus>("disconnected");

  useEffect(() => {
    const checkConnectionStatus = () => {
      if (isConnected()) {
        setStatus("connected");
      } else {
        setStatus("disconnected");
      }
    };

    // Initial check
    checkConnectionStatus();

    // Set up periodic status checking
    const statusInterval = setInterval(checkConnectionStatus, 2000);

    // Listen to MQTT client events if available
    const client = getClient();
    if (client) {
      const handleConnect = () => setStatus("connected");
      const handleDisconnect = () => setStatus("disconnected");
      const handleError = () => setStatus("error");
      const handleReconnect = () => setStatus("connecting");

      client.on('connect', handleConnect);
      client.on('disconnect', handleDisconnect);
      client.on('close', handleDisconnect);
      client.on('error', handleError);
      client.on('reconnect', handleReconnect);

      return () => {
        clearInterval(statusInterval);
        client.off('connect', handleConnect);
        client.off('disconnect', handleDisconnect);
        client.off('close', handleDisconnect);
        client.off('error', handleError);
        client.off('reconnect', handleReconnect);
      };
    }

    return () => {
      clearInterval(statusInterval);
    };
  }, [isConnected, getClient]);

  return status;
}