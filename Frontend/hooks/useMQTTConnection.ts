// hooks/useMQTTConnection.ts
"use client";

import { useEffect, useState } from "react";
import { useMQTT } from "@/hooks/useMQTT";

export function useMQTTConnection() {
  const { isConnected, isConnecting } = useMQTT();
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Mark as initialized once we have connection status
    if (!isConnecting) {
      setIsInitializing(false);
      setConnectionAttempted(true);
    }
  }, [isConnecting]);

  return {
    isInitializing,
    connectionAttempted,
    isConnected,
    isConnecting
  };
}