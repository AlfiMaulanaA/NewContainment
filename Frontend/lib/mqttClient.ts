// DEPRECATED - Use @/lib/mqtt and @/hooks/useMQTT instead
// This is a stub to prevent build errors for legacy components

import { mqttClient } from "./mqtt";

export function connectMQTT() {
  // DEPRECATED: Use useMQTT() hook instead
  return mqttClient;
}

export function getMQTTClient() {
  // DEPRECATED: Use useMQTT() hook instead
  return mqttClient;
}

export function disconnectMQTT() {
  // DEPRECATED: Use useMQTT() hook instead
  mqttClient.disconnect();
}