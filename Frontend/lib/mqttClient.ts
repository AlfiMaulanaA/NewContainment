// DEPRECATED - Use @/lib/mqtt-manager instead
// This is a stub to prevent build errors for legacy components

import { useMQTT } from "./mqtt-manager";

export function connectMQTT() {
  console.warn("DEPRECATED: connectMQTT() is deprecated. Use useMQTT() hook instead.");
  // Return a mock client to prevent errors
  return {
    connected: false,
    disconnected: true,
    subscribe: () => {},
    publish: () => {},
    on: () => {},
    off: () => {},
    end: () => {}
  };
}

export function getMQTTClient() {
  console.warn("DEPRECATED: getMQTTClient() is deprecated. Use useMQTT() hook instead.");
  return null;
}

export function disconnectMQTT() {
  console.warn("DEPRECATED: disconnectMQTT() is deprecated. Use useMQTT() hook instead.");
}