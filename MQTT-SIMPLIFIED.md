# MQTT Simplified Configuration

## 🎯 **Overview**

Frontend MQTT handling has been **simplified** to use **WebSocket only**, removing complex multi-protocol detection and fallback logic.

## ✅ **What was Removed:**

### ❌ **Complex Features Removed:**
- Multi-protocol support (mqtt, mqtts, ws, wss)
- Protocol auto-detection
- Server vs Browser environment detection
- Complex API configuration fetching
- SSL/TLS certificate handling
- Environment variable fallbacks
- Native MQTT protocol support

### ❌ **Deleted Files:**
- `lib/mqtt-complex-backup.ts` (original complex implementation)
- `hooks/useSensorMQTT.ts` (complex sensor hook)

## ✅ **What Remains:**

### 🎯 **Simplified MQTT Client** (`lib/mqtt.ts`):
```typescript
interface SimpleMQTTConfig {
  host: string;           // Fixed: mqttws.iotech.my.id
  port: number;          // Fixed: 8080 (with fallbacks)
  username?: string;
  password?: string;
  clientId?: string;
  topicPrefix?: string;  // Fixed: 'containment'
  enabled?: boolean;
}
```

### 🌐 **WebSocket Only Configuration:**
- **Protocol**: WebSocket only (`ws://` or `wss://`)
- **Host**: `mqttws.iotech.my.id`
- **Fallback Ports**: `8080`, `8000`, `9000`, `8883`
- **Path**: `/mqtt`

### 📡 **Connection URLs:**
```
ws://mqttws.iotech.my.id:8080/mqtt
ws://mqttws.iotech.my.id:8000/mqtt
ws://mqttws.iotech.my.id:9000/mqtt
ws://mqttws.iotech.my.id:8883/mqtt
```

## 🔧 **Architecture:**

### **Frontend → MQTT Broker (Direct)**
```
Browser → WebSocket → mqttws.iotech.my.id → MQTT Topics
```

### **No Intermediary:**
- ❌ No SignalR
- ❌ No Backend MQTT processing
- ❌ No Protocol translation
- ✅ Direct WebSocket MQTT connection

## 📱 **UI Components:**

### **Enhanced Sensor Display** (`components/enhanced-sensor-display.tsx`):
- Real-time sensor data visualization
- Trend indicators (↗️ ↘️ ➖)
- Alert system with thresholds
- Progress bars and color coding

### **Sensor Dashboard** (`components/sensor-dashboard.tsx`):
- Multi-view modes (Enhanced, Classic, Compact)
- Tabbed interface (All, By Containment, Alerts, Config)
- Auto-refresh and connection monitoring

## 🚀 **Benefits of Simplification:**

### **🎯 Performance:**
- Faster connection (no protocol detection)
- Reduced bundle size
- Less memory usage
- Simplified debugging

### **🔧 Maintenance:**
- Single protocol to maintain
- Clearer error messages
- Simplified logging
- Easier configuration

### **🌐 Browser Compatibility:**
- WebSocket works in all modern browsers
- No native MQTT limitations
- Consistent behavior across browsers

## 📝 **Usage Examples:**

### **Subscribe to Sensor Data:**
```typescript
import { mqttClient } from '@/lib/mqtt';

// Simple subscription
await mqttClient.subscribe('containment/rack1/sensor1', (topic, message) => {
  console.log(`Data from ${topic}: ${message}`);
});

// With topic prefix
await mqttClient.subscribeTopic('rack1/sensor1', (topic, message) => {
  // Automatically subscribes to: containment/rack1/sensor1
});
```

### **Publish Control Commands:**
```typescript
// Simple publish
await mqttClient.publish('containment/rack1/control', '{"door": "open"}');

// With topic prefix
await mqttClient.publishTopic('rack1/control', '{"door": "open"}');
```

### **Connection Status:**
```typescript
const status = mqttClient.getStatus();
console.log(status);
// {
//   connected: true,
//   connecting: false,
//   config: { host: 'mqttws.iotech.my.id', ... },
//   subscriptions: ['containment/rack1/sensor1'],
//   protocol: 'WebSocket'
// }
```

## 🔍 **Testing:**

### **Test Page**: `/test/mqtt`
- Add virtual test devices
- Monitor real-time MQTT data
- Connection status monitoring
- WebSocket fallback testing

### **Sensor Dashboard**: `/management/sensors`
- Enhanced sensor visualization
- Multi-view modes
- Configuration overview
- Alert monitoring

## 🛠️ **Configuration:**

### **Fixed Configuration** (No Environment Variables Needed):
```typescript
const DEFAULT_CONFIG = {
  host: 'mqttws.iotech.my.id',
  port: 8080,
  clientId: `containment_${randomId}`,
  topicPrefix: 'containment',
  enabled: true,
};
```

### **Automatic Fallback:**
- Tries ports: 8080, 8000, 9000, 8883
- 5-second timeout per attempt
- Automatic resubscription after reconnect
- Toast notifications for connection status

## 💡 **Migration Notes:**

### **From Complex → Simple:**
1. ✅ **Automatic**: All existing components updated
2. ✅ **Backward Compatible**: Same API methods
3. ✅ **Enhanced UI**: Better visualization components
4. ✅ **Simplified Config**: No environment variables needed

### **Breaking Changes:**
- ❌ **Protocol Selection**: Only WebSocket supported
- ❌ **Custom Brokers**: Fixed to mqttws.iotech.my.id
- ❌ **Complex Config**: API-based config removed

## 🎉 **Result:**

**Frontend MQTT handling is now:**
- ✅ **Simple**: Single protocol (WebSocket)
- ✅ **Fast**: Direct connection, no detection overhead
- ✅ **Reliable**: Automatic fallback ports
- ✅ **User-Friendly**: Enhanced visualization components
- ✅ **Maintainable**: Clear, focused codebase