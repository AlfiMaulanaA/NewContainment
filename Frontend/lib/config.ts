// Standardized Configuration for IoT Containment System

interface AppConfig {
  mqttBrokerUrl: string;
  apiBaseUrl: string;
  environment: 'development' | 'production';
}

// Standard Ports Configuration
const PORTS = {
  // Single port for both development and production (HTTP only)
  API_PORT: 5000,
  FRONTEND_PROD: 3000,
  // MQTT WebSocket Bridge
  MQTT_WS_PORT: 9000,
} as const;

export function getAppConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const isBrowser = typeof window !== "undefined";
  
  let mqttBrokerUrl: string;
  let apiBaseUrl: string;

  // Simplified: Build MQTT URL from HOST and PORT
  const buildMqttUrl = (host: string, port: string, useWss: boolean = false) => {
    const protocol = useWss ? 'wss' : 'ws';
    return `${protocol}://${host}:${port}`;
  };

  // Simplified configuration - Single HTTP port for all environments
  const host = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_MQTT_PORT || PORTS.MQTT_WS_PORT.toString();

  // Always use HTTP for API calls
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || `http://localhost:${PORTS.API_PORT}`;

  // MQTT broker URL (WebSocket)
  mqttBrokerUrl = buildMqttUrl(host, port);

  // Validation
  if (!mqttBrokerUrl) {
    throw new Error("MQTT broker URL is not defined.");
  }
  if (!apiBaseUrl) {
    throw new Error("API base URL is not defined.");
  }

  return { 
    mqttBrokerUrl, 
    apiBaseUrl,
    environment: isProduction ? 'production' : 'development'
  };
}

// Export port constants for other components
export { PORTS };
