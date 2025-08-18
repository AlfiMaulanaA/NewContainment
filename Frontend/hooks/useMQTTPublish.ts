// hooks/useMQTTPublish.ts
"use client";

import { useCallback } from "react";
import { useMQTT } from "@/hooks/useMQTT";
import { toast } from "sonner";

export interface MQTTMessage {
  topic: string;
  payload: any;
}

export function useMQTTPublish() {
  const { publish, publishTopic, isConnected } = useMQTT();
  
  const publishMessage = useCallback(async (topic: string, payload: any): Promise<boolean> => {
    if (!isConnected) {
      toast.error("MQTT client is not connected");
      return false;
    }

    const success = await publish(topic, JSON.stringify(payload));
    
    if (success) {
      // MQTT message published successfully
    } else {
      toast.error("Failed to publish MQTT message");
    }
    
    return success;
  }, [publish, isConnected]);

  const publishControlCommand = useCallback(async (command: string): Promise<boolean> => {
    const topic = "IOT/Containment/Control";
    const payload = { data: command };
    
    const success = await publishMessage(topic, payload);
    
    if (success) {
      toast.success(`Command sent: ${command}`);
    }
    
    return success;
  }, [publishMessage]);

  return {
    publishMessage,
    publishControlCommand
  };
}