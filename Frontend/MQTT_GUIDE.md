# MQTT System Guide

## Overview

The MQTT system has been simplified to use a unified client that supports both native MQTT and WebSocket connections. This guide explains how to use the new simplified MQTT system.

## Architecture

### Files Structure
```
lib/
├── mqtt.ts          # Unified MQTT client
└── mqttClient.ts    # Deprecated compatibility layer

hooks/
├── useMQTT.ts       # Main MQTT hook
├── useMQTTStatus.ts # Connection status hook
└── useMQTTPublish.ts # Publishing helper hook
```

## Configuration

### Environment Variables

```env
# Native MQTT Connection (recommended for server/native apps)
NEXT_PUBLIC_MQTT_HOST="localhost"
NEXT_PUBLIC_MQTT_PORT="1883"
NEXT_PUBLIC_MQTT_PROTOCOL="mqtt"

# Authentication (optional)
NEXT_PUBLIC_MQTT_USERNAME="your_username"
NEXT_PUBLIC_MQTT_PASSWORD="your_password"

# Client Settings
NEXT_PUBLIC_MQTT_CLIENT_ID="containment_web_client"
NEXT_PUBLIC_MQTT_TOPIC_PREFIX="containment"
NEXT_PUBLIC_MQTT_ENABLED="true"

# WebSocket MQTT (for browser compatibility)
NEXT_PUBLIC_MQTT_USE_WEBSOCKET="false"
NEXT_PUBLIC_MQTT_WS_HOST="localhost"
NEXT_PUBLIC_MQTT_WS_PORT="9000"
```

### Protocols Supported

1. **Native MQTT** (default):
   - `mqtt://` - MQTT over TCP
   - `mqtts://` - MQTT over TLS

2. **WebSocket MQTT** (for browsers):
   - `ws://` - MQTT over WebSocket
   - `wss://` - MQTT over WebSocket Secure

## Usage

### Basic Usage with Hook

```tsx
import { useMQTT } from '@/hooks/useMQTT';

function MyComponent() {
  const { 
    isConnected, 
    isConnecting, 
    error,
    subscribe, 
    publish,
    subscribeTopic,
    publishTopic 
  } = useMQTT();

  useEffect(() => {
    // Subscribe to a topic
    const handleMessage = (topic, message) => {
      console.log(`Received: ${message} from ${topic}`);
    };

    subscribe('sensors/temperature', handleMessage);

    // Cleanup
    return () => {
      unsubscribe('sensors/temperature');
    };
  }, []);

  const sendCommand = async () => {
    await publish('devices/control', 'turn_on');
  };

  return (
    <div>
      <p>MQTT Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={sendCommand}>Send Command</button>
    </div>
  );
}
```

### Using Topic Prefix

The system automatically adds a prefix to topics. Use `subscribeTopic` and `publishTopic` for convenience:

```tsx
// These are equivalent:
subscribe('containment/sensors/temp', handler);
subscribeTopic('sensors/temp', handler); // Automatically adds prefix

publish('containment/devices/control', 'on');
publishTopic('devices/control', 'on'); // Automatically adds prefix
```

### Direct Client Access

For advanced usage, you can access the client directly:

```tsx
import { mqttClient } from '@/lib/mqtt';

// Direct access to the MQTT client
const status = mqttClient.getStatus();
const config = mqttClient.getConfig();

// Update configuration
mqttClient.updateConfig({
  host: 'new-broker.example.com',
  port: 1883
});
```

## Migration from Old System

### Old System (DEPRECATED)
```tsx
// OLD - Don't use
import { useMQTT } from '@/lib/mqtt-manager';
import { useMQTTConfig } from '@/lib/mqtt-config-manager';
```

### New System
```tsx
// NEW - Use this
import { useMQTT } from '@/hooks/useMQTT';
import { mqttClient } from '@/lib/mqtt';
```

### Key Changes

1. **Simplified Configuration**: No more dual database/environment config system
2. **Native MQTT Support**: Direct MQTT connection without WebSocket bridge requirement
3. **Unified Client**: Single client handles both native and WebSocket connections
4. **Cleaner API**: Simplified hook interface
5. **Better Error Handling**: Clear error states and messages

## Connection Modes

### Native MQTT Mode (Recommended)

Best for:
- Server-side applications
- Native desktop applications
- Direct MQTT broker access

```env
NEXT_PUBLIC_MQTT_USE_WEBSOCKET="false"
NEXT_PUBLIC_MQTT_PROTOCOL="mqtt"
NEXT_PUBLIC_MQTT_HOST="broker.example.com"
NEXT_PUBLIC_MQTT_PORT="1883"
```

### WebSocket Mode (Browser Compatibility)

Best for:
- Browser applications with WebSocket bridge
- When direct MQTT access is not available

```env
NEXT_PUBLIC_MQTT_USE_WEBSOCKET="true"
NEXT_PUBLIC_MQTT_WS_HOST="websocket-bridge.example.com"
NEXT_PUBLIC_MQTT_WS_PORT="9000"
```

## Troubleshooting

### Connection Issues

1. **Check Protocol**: Ensure `NEXT_PUBLIC_MQTT_PROTOCOL` matches your broker
2. **Verify Host/Port**: Confirm broker accessibility
3. **Authentication**: Check username/password if required
4. **WebSocket Bridge**: If using WebSocket mode, ensure bridge is running

### Common Error Messages

- `"MQTT is disabled"` - Set `NEXT_PUBLIC_MQTT_ENABLED="true"`
- `"Connection timeout"` - Check host/port configuration
- `"Authentication failed"` - Verify credentials
- `"Failed to connect"` - Check network connectivity

## Best Practices

1. **Use Topic Prefix**: Utilize `subscribeTopic` and `publishTopic` for consistent naming
2. **Handle Errors**: Always check connection status before publishing
3. **Cleanup Subscriptions**: Unsubscribe in component cleanup
4. **Monitor Status**: Use `useMQTTStatus` for connection monitoring
5. **Graceful Degradation**: Handle disconnected states in UI

## Examples

### Sensor Data Subscription

```tsx
function SensorDashboard() {
  const { subscribeTopic } = useMQTT();
  const [sensorData, setSensorData] = useState({});

  useEffect(() => {
    const handleSensorData = (topic, message) => {
      const data = JSON.parse(message);
      setSensorData(prev => ({ ...prev, [topic]: data }));
    };

    subscribeTopic('sensors/+', handleSensorData); // Subscribe to all sensors

    return () => unsubscribe('containment/sensors/+');
  }, []);

  return (
    <div>
      {Object.entries(sensorData).map(([topic, data]) => (
        <div key={topic}>
          <h3>{topic}</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

### Device Control

```tsx
function DeviceController({ deviceId }) {
  const { publishTopic, isConnected } = useMQTT();

  const sendCommand = async (command) => {
    if (!isConnected) {
      toast.error('MQTT not connected');
      return;
    }

    const success = await publishTopic(`devices/${deviceId}/control`, command);
    if (success) {
      toast.success(`Command sent: ${command}`);
    } else {
      toast.error('Failed to send command');
    }
  };

  return (
    <div>
      <button onClick={() => sendCommand('turn_on')}>Turn On</button>
      <button onClick={() => sendCommand('turn_off')}>Turn Off</button>
    </div>
  );
}
```