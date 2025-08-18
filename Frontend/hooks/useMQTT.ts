"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { mqttClient } from '@/lib/mqtt';

// MQTT Hook for React components
export function useMQTT() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionsRef = useRef<Map<string, (topic: string, message: string) => void>>(new Map());

  // Initialize connection with real-time status updates
  useEffect(() => {
    let mounted = true;

    const handleConnectionStatusChange = (connected: boolean) => {
      if (mounted) {
        // Connection status changed
        setIsConnected(connected);
        if (!connected) {
          setError('MQTT connection lost');
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
        // Add null check for mqttClient
        if (!mqttClient) {
          throw new Error('MQTT client not initialized');
        }
        
        // Add connection status listener if available
        if (mqttClient.addConnectionListener) {
          mqttClient.addConnectionListener(handleConnectionStatusChange);
        }
        
        const connected = await mqttClient.connect();
        if (mounted) {
          setIsConnected(connected);
          if (!connected) {
            setError('Failed to connect to MQTT broker');
          }
        }
      } catch (err) {
        // MQTT connection failed
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown MQTT error');
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
      
      // Remove connection listener
      if (mqttClient && mqttClient.removeConnectionListener) {
        mqttClient.removeConnectionListener(handleConnectionStatusChange);
      }
      
      // Cleanup subscriptions
      subscriptionsRef.current.forEach((callback, topic) => {
        mqttClient.unsubscribe(topic, callback);
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  // Subscribe to topic
  const subscribe = useCallback(async (topic: string, callback: (topic: string, message: string) => void) => {
    try {
      const success = await mqttClient.subscribe(topic, callback);
      if (success) {
        subscriptionsRef.current.set(topic, callback);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
      return false;
    }
  }, []);

  // Subscribe with topic prefix
  const subscribeTopic = useCallback(async (subtopic: string, callback: (topic: string, message: string) => void) => {
    try {
      const success = await mqttClient.subscribeTopic(subtopic, callback);
      if (success) {
        const fullTopic = mqttClient.getTopic(subtopic);
        subscriptionsRef.current.set(fullTopic, callback);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
      return false;
    }
  }, []);

  // Unsubscribe from topic
  const unsubscribe = useCallback((topic: string) => {
    const callback = subscriptionsRef.current.get(topic);
    if (callback) {
      mqttClient.unsubscribe(topic, callback);
      subscriptionsRef.current.delete(topic);
    }
  }, []);

  // Publish message
  const publish = useCallback(async (topic: string, message: string, retain = false) => {
    try {
      const success = await mqttClient.publish(topic, message, retain);
      if (!success) {
        setError('Failed to publish message');
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
      return false;
    }
  }, []);

  // Publish with topic prefix
  const publishTopic = useCallback(async (subtopic: string, message: string, retain = false) => {
    try {
      const success = await mqttClient.publishTopic(subtopic, message, retain);
      if (!success) {
        setError('Failed to publish message');
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
      return false;
    }
  }, []);

  // Get topic with prefix
  const getTopic = useCallback((subtopic: string) => {
    return mqttClient.getTopic(subtopic);
  }, []);

  // Reconnect
  const reconnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      mqttClient.disconnect();
      const connected = await mqttClient.connect();
      setIsConnected(connected);
      if (!connected) {
        setError('Failed to reconnect to MQTT broker');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconnection failed');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Get status
  const getStatus = useCallback(() => {
    return mqttClient.getStatus();
  }, []);

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,
    
    // Connection methods
    reconnect,
    getStatus,
    
    // Messaging methods
    subscribe,
    subscribeTopic,
    unsubscribe,
    publish,
    publishTopic,
    getTopic,
    
    // Configuration methods
    reloadConfig: useCallback(async () => {
      try {
        if (!mqttClient) {
          throw new Error('MQTT client not initialized');
        }
        
        setError(null);
        setIsConnecting(true);
        
        const result = await mqttClient.reloadConfig();
        setIsConnected(result);
        
        if (!result) {
          setError('Failed to reload MQTT configuration');
        }
        
        return result;
      } catch (err) {
        // MQTT config reload failed
        setError(err instanceof Error ? err.message : 'Unknown reload error');
        setIsConnected(false);
        return false;
      } finally {
        setIsConnecting(false);
      }
    }, []),
    
    // Direct client access (for advanced usage)
    client: mqttClient,
  };
}

// Backwards compatibility exports
export default useMQTT;