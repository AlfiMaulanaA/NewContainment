// hooks/useMQTTStatus.ts
"use client";

import { useState, useEffect } from "react";
import { useMQTT } from "@/hooks/useMQTT";

export type MQTTStatus = "connecting" | "connected" | "disconnected" | "error";

export function useMQTTStatus(): MQTTStatus {
  const { isConnected, isConnecting, error } = useMQTT();
  const [status, setStatus] = useState<MQTTStatus>("disconnected");

  useEffect(() => {
    if (error) {
      setStatus("error");
    } else if (isConnecting) {
      setStatus("connecting");
    } else if (isConnected) {
      setStatus("connected");
    } else {
      setStatus("disconnected");
    }
  }, [isConnected, isConnecting, error]);

  return status;
}