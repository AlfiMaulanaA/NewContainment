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

  // Simplified: Build MQTT URL from HOST and PORT
  const buildMqttUrl = (host: string, port: string, useWss: boolean = false) => {
    const protocol = useWss ? 'wss' : 'ws';
    return `${protocol}://${host}:${port}`;
  };

  if (isProduction && isBrowser) {
    // Production - Dynamic Runtime Detection in Browser
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const isHttps = protocol === "https:";
    
    const envApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const envMqttHost = process.env.NEXT_PUBLIC_MQTT_HOST;
    const envMqttPort = process.env.NEXT_PUBLIC_MQTT_PORT;
    
    // Check if env vars are hardcoded IPs/hostnames vs localhost
    const shouldUseDynamic = !envApiUrl || 
                           envApiUrl.includes('localhost') || 
                           envApiUrl.includes('127.0.0.1');
    
    if (shouldUseDynamic) {
      // Use dynamic hostname detection
      if (isHttps) {
        mqttBrokerUrl = buildMqttUrl(hostname, PORTS.MQTT_WS_HTTPS.toString(), true);
        apiBaseUrl = `https://${hostname}:${PORTS.API_HTTPS}`;
      } else {
        mqttBrokerUrl = buildMqttUrl(hostname, PORTS.MQTT_WS_HTTP.toString());
        apiBaseUrl = `http://${hostname}:${PORTS.API_HTTP}`;
      }
    } else {
      // Use environment variables
      apiBaseUrl = envApiUrl;
      mqttBrokerUrl = buildMqttUrl(
        envMqttHost || hostname, 
        envMqttPort || PORTS.MQTT_WS_HTTP.toString()
      );
    }
    
  } else if (isProduction && !isBrowser) {
    // Production - Build/SSR time
    const host = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
    const port = process.env.NEXT_PUBLIC_MQTT_PORT || PORTS.MQTT_WS_HTTP.toString();
    mqttBrokerUrl = buildMqttUrl(host, port);
    apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || `http://localhost:${PORTS.API_HTTP}`;
  } else {
    // Development Configuration
    const host = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
    const port = process.env.NEXT_PUBLIC_MQTT_PORT || PORTS.MQTT_WS_HTTP.toString();
    mqttBrokerUrl = buildMqttUrl(host, port);
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
