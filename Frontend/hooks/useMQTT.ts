// hooks/useMQTT.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { mqttClient } from "@/lib/mqtt";

// MQTT Hook for React components
export function useMQTT() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionsRef = useRef<
    Map<string, (topic: string, message: string) => void>
  >(new Map());

  useEffect(() => {
    let mounted = true;

    const handleConnectionStatusChange = (connected: boolean) => {
      if (mounted) {
        setIsConnected(connected);
        if (!connected) {
          setError("MQTT connection lost");
        } else {
          setError(null);
        }
      }
    };

    const initConnection = async () => {
      if (!mounted) return;

      setIsConnecting(true);
      setError(null);

      try {
        if (!mqttClient) {
          throw new Error("MQTT client not initialized");
        }

        if (mqttClient.addConnectionListener) {
          mqttClient.addConnectionListener(handleConnectionStatusChange);
        }

        const connected = await mqttClient.connect();
        if (mounted) {
          setIsConnected(connected);
          if (!connected) {
            setError("Failed to connect to MQTT broker");
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown MQTT error");
          setIsConnected(false);
        }
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    };

    initConnection();

    return () => {
      mounted = false;

      if (mqttClient && mqttClient.removeConnectionListener) {
        mqttClient.removeConnectionListener(handleConnectionStatusChange);
      }

      subscriptionsRef.current.forEach((callback, topic) => {
        mqttClient.unsubscribe(topic, callback);
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  const subscribe = useCallback(
    async (
      topic: string,
      callback: (topic: string, message: string) => void
    ) => {
      try {
        const success = await mqttClient.subscribe(topic, callback);
        if (success) {
          subscriptionsRef.current.set(topic, callback);
        }
        return success;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Subscription failed");
        return false;
      }
    },
    []
  );

  const subscribeTopic = useCallback(
    async (
      subtopic: string,
      callback: (topic: string, message: string) => void
    ) => {
      try {
        const success = await mqttClient.subscribeTopic(subtopic, callback);
        if (success) {
          const fullTopic = mqttClient.getTopic(subtopic);
          subscriptionsRef.current.set(fullTopic, callback);
        }
        return success;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Subscription failed");
        return false;
      }
    },
    []
  );

  const unsubscribe = useCallback((topic: string): void => {
    const callback = subscriptionsRef.current.get(topic);
    if (callback) {
      mqttClient.unsubscribe(topic, callback);
      subscriptionsRef.current.delete(topic);
    }
  }, []);

  const publish = useCallback(
    async (topic: string, message: string, retain = false) => {
      try {
        const success = await mqttClient.publish(topic, message, retain);
        if (!success) {
          setError("Failed to publish message");
        }
        return success;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Publish failed");
        return false;
      }
    },
    []
  );

  const publishTopic = useCallback(
    async (subtopic: string, message: string, retain = false) => {
      try {
        const success = await mqttClient.publishTopic(
          subtopic,
          message,
          retain
        );
        if (!success) {
          setError("Failed to publish message");
        }
        return success;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Publish failed");
        return false;
      }
    },
    []
  );

  const getTopic = useCallback((subtopic: string) => {
    return mqttClient.getTopic(subtopic);
  }, []);

  const reconnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      mqttClient.disconnect();
      const connected = await mqttClient.connect();
      setIsConnected(connected);
      if (!connected) {
        setError("Failed to reconnect to MQTT broker");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconnection failed");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const getStatus = useCallback(() => {
    return mqttClient.getStatus();
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    reconnect,
    getStatus,
    subscribe,
    subscribeTopic,
    unsubscribe,
    publish,
    publishTopic,
    getTopic,
    reloadConfig: useCallback(async () => {
      try {
        if (!mqttClient) {
          throw new Error("MQTT client not initialized");
        }
        setError(null);
        setIsConnecting(true);
        const result = await mqttClient.reloadConfig();
        setIsConnected(result);
        if (!result) {
          setError("Failed to reload MQTT configuration");
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown reload error");
        setIsConnected(false);
        return false;
      } finally {
        setIsConnecting(false);
      }
    }, []),
    client: mqttClient,
  };
}

export default useMQTT;
