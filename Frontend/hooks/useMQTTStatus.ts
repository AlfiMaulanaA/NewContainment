// hooks/useMQTTStatus.ts
"use client";

import { useMQTT } from "@/lib/mqtt-manager";

export function useMQTTStatus() {
  const { isConnected } = useMQTT();
  
  if (isConnected()) {
    return "connected";
  } else {
    return "disconnected";
  }
}