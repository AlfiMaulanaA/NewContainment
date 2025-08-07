// Standardized Configuration for IoT Containment System

interface AppConfig {
  mqttBrokerUrl: string;
  apiBaseUrl: string;
  environment: 'development' | 'production';
}

// Standard Ports Configuration
const PORTS = {
  // Backend API
  API_HTTP: 5000,
  API_HTTPS: 5001,
  // Frontend
  FRONTEND_DEV: 3000,
  FRONTEND_PROD: 3000,
  // MQTT WebSocket Bridge
  MQTT_WS_HTTP: 9000,
  MQTT_WS_HTTPS: 9001,
} as const;

export function getAppConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const isBrowser = typeof window !== "undefined";
  
  let mqttBrokerUrl: string;
  let apiBaseUrl: string;

  if (isProduction && isBrowser) {
    // Production - Dynamic Runtime Detection in Browser
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const isHttps = protocol === "https:";
    
    // For static exports, ALWAYS use dynamic detection (ignore build-time env vars)
    // Only use env vars if they explicitly contain dynamic hostname patterns
    const envApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const envMqttUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL;
    
    // Check if env vars are hardcoded IPs/hostnames vs localhost
    const shouldUseDynamic = !envApiUrl || 
                           envApiUrl.includes('localhost') || 
                           envApiUrl.includes('127.0.0.1');
    
    if (shouldUseDynamic) {
      // Use dynamic hostname detection
      if (isHttps) {
        mqttBrokerUrl = `wss://${hostname}:${PORTS.MQTT_WS_HTTPS}`;
        apiBaseUrl = `https://${hostname}:${PORTS.API_HTTPS}`;
      } else {
        mqttBrokerUrl = `ws://${hostname}:${PORTS.MQTT_WS_HTTP}`;
        apiBaseUrl = `http://${hostname}:${PORTS.API_HTTP}`;
      }
    } else {
      // Use hardcoded environment variables (for specific deployments)
      apiBaseUrl = envApiUrl;
      mqttBrokerUrl = envMqttUrl || `ws://${hostname}:${PORTS.MQTT_WS_HTTP}`;
    }
    
  } else if (isProduction && !isBrowser) {
    // Production - Build/SSR time - use environment variables or sensible defaults
    mqttBrokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || `ws://localhost:${PORTS.MQTT_WS_HTTP}`;
    apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || `http://localhost:${PORTS.API_HTTP}`;
  } else {
    // Development Configuration
    mqttBrokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || `ws://localhost:${PORTS.MQTT_WS_HTTP}`;
    apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || `http://localhost:${PORTS.API_HTTP}`;
  }

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
