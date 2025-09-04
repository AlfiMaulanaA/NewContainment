# 🔐 Access Control System - Frontend Implementation

Implementasi lengkap sistem Access Control untuk ZKTeco devices menggunakan MQTT di frontend Next.js 14.

## 📁 Structure

```
app/access-control/
├── page.tsx                    # Main access control overview
├── device/
│   └── page.tsx               # Device management page
└── README.md                  # This file

components/zkteco/
├── device-form.tsx            # Form untuk CRUD device
└── device-list.tsx            # List dan management devices

hooks/
└── useZKTecoDevices.ts        # Custom hook untuk device operations

types/
└── zkteco.ts                  # TypeScript types untuk ZKTeco
```

## 🚀 Features Implemented

### ✅ **Device Management (CRUD)**
- **Add Device**: Tambah device ZKTeco baru dengan validasi form
- **Edit Device**: Update konfigurasi device existing
- **Delete Device**: Hapus device dengan confirmation dialog
- **List Devices**: Tampilkan semua devices dengan status dan info

### ✅ **Connection Testing**
- **Test Single Device**: Test koneksi ke device tertentu
- **Test All Devices**: Test koneksi semua devices sekaligus
- **Real-time Status**: Status online/offline dengan response time
- **Device Information**: Firmware version, user count, attendance count

### ✅ **MQTT Integration** 
- **Real-time Communication**: WebSocket connection via MQTT
- **Command/Response Pattern**: Structured command handling
- **Error Handling**: Comprehensive error management
- **Connection Status**: Live MQTT connection monitoring

### ✅ **UI/UX Features**
- **Responsive Design**: Mobile-first dengan Tailwind CSS
- **Form Validation**: Zod schema validation dengan React Hook Form
- **Loading States**: Loading indicators untuk semua operations
- **Toast Notifications**: Real-time feedback dengan Sonner
- **Status Badges**: Visual indicators untuk device status
- **Confirmation Dialogs**: Safety confirmation untuk delete operations

## 📡 MQTT Topics Used

### Commands (Publish to)
- `accessControl/device/command` - Device CRUD commands
- `accessControl/user/command` - User management commands (ready untuk future)
- `accessControl/attendance/command` - Attendance commands (ready untuk future)

### Responses (Subscribe from)  
- `accessControl/device/response` - Device operation responses
- `accessControl/user/response` - User operation responses (ready untuk future)
- `accessControl/attendance/response` - Attendance responses (ready untuk future)

## 🎯 Usage Examples

### 1. **Add New Device**
```javascript
// Via UI Form atau programmatically
const deviceData = {
  id: "device_3",
  name: "Office Door", 
  ip: "192.168.0.203",
  port: 4370,
  password: 0,
  timeout: 10,
  force_udp: false
};

const success = await addDevice(deviceData);
```

### 2. **Test Device Connection**
```javascript
// Test single device
const result = await testDevice("device_1");
console.log(result.status); // 'online' atau 'offline'

// Test all devices
const results = await testAllDevices();
console.log(results); // Array of test results
```

### 3. **MQTT Command Structure**
```javascript
// Add Device Command
{
  "command": "addDevice",
  "data": {
    "id": "device_3",
    "name": "Office Door",
    "ip": "192.168.0.203",
    "port": 4370,
    "password": 0,
    "timeout": 10,
    "force_udp": false,
    "enabled": true
  }
}

// Test Connection Command
{
  "command": "testConnection", 
  "data": {
    "device_id": "device_1" // atau "all" untuk test semua
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# MQTT Configuration
NEXT_PUBLIC_MQTT_HOST=localhost
NEXT_PUBLIC_MQTT_PORT=9000
NEXT_PUBLIC_MQTT_USE_WEBSOCKET=true
NEXT_PUBLIC_MQTT_ENABLED=true

# API Configuration  
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### MQTT Client Settings
```javascript
// lib/config.ts - Auto-configured
const config = {
  mqttBrokerUrl: "ws://localhost:9000",  // WebSocket connection
  apiBaseUrl: "http://localhost:5000",
  environment: "development"
};
```

## 🎨 Component Usage

### 1. **Device Management Page**
```tsx
import { useZKTecoDevices } from '@/hooks/useZKTecoDevices';

function DeviceManagementPage() {
  const {
    devices,
    loading, 
    error,
    addDevice,
    testDevice,
    deleteDevice
  } = useZKTecoDevices();
  
  return (
    <DeviceList 
      devices={devices}
      loading={loading}
      onAddDevice={handleAdd}
      onTestDevice={handleTest}
    />
  );
}
```

### 2. **Custom Hook Usage**
```tsx
import { useZKTecoDevices } from '@/hooks/useZKTecoDevices';

function MyComponent() {
  const { 
    devices,           // Current devices array
    loading,           // Loading state for CRUD ops
    testLoading,       // Loading state for testing
    error,             // Error message if any
    testResults,       // Connection test results
    
    // CRUD operations
    addDevice,
    updateDevice, 
    deleteDevice,
    refreshDevices,
    
    // Testing operations
    testDevice,
    testAllDevices,
    
    // Utilities
    clearError,
    clearTestResults
  } = useZKTecoDevices();
}
```

## 🛡️ Security & Validation

### Form Validation Schema
```javascript
// Zod validation schema
const deviceSchema = z.object({
  id: z.string()
    .min(1, "Device ID is required")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid characters"),
  name: z.string()
    .min(1, "Device name is required")
    .max(100, "Name too long"),
  ip: z.string()
    .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "Invalid IP format"),
  port: z.number().min(1).max(65535),
  timeout: z.number().min(1).max(60)
});
```

### MQTT Security
- **Connection Authentication**: Optional username/password
- **Topic Validation**: Structured topic patterns
- **Error Handling**: Comprehensive error catching
- **Timeout Management**: Operation timeouts untuk prevent hanging

## 📊 Monitoring & Analytics

### Device Status Indicators
- 🟢 **Online**: Device responding dengan response time
- 🔴 **Offline**: Device tidak responding atau error
- ⚪ **Unknown**: Belum di-test atau status unclear
- ⚫ **Disabled**: Device di-disable dalam config

### Statistics Dashboard
```javascript
// Real-time statistics
const stats = {
  totalDevices: devices.length,
  enabledDevices: devices.filter(d => d.enabled).length,
  onlineDevices: testResults.filter(r => r.status === 'online').length,
  offlineDevices: testResults.filter(r => r.status === 'offline').length
};
```

## 🚧 Future Enhancements Ready

### 1. **User Management** (Architecture ready)
- Hook pattern: `useZKTecoUsers()`
- MQTT topics: `accessControl/user/command|response`
- Components: `UserForm`, `UserList`

### 2. **Biometric Management** (Architecture ready)
- Fingerprint enrollment via MQTT
- Card management
- Template synchronization

### 3. **Live Monitoring** (Architecture ready)  
- Real-time attendance stream
- Live access logs
- Security event monitoring

## 🐛 Troubleshooting

### Common Issues

#### 1. **MQTT Connection Issues**
```bash
# Check MQTT broker running
# Default: ws://localhost:9000
# Verify WebSocket endpoint accessible
```

#### 2. **Device Not Responding**
- Verify IP address dan network connectivity
- Check device port (default: 4370)  
- Ensure device password correct (default: 0)
- Verify UDP/TCP protocol setting

#### 3. **Form Validation Errors**
- IP format harus valid (xxx.xxx.xxx.xxx)
- Device ID hanya alphanumeric, underscore, dash
- Port range: 1-65535
- Timeout range: 1-60 seconds

#### 4. **TypeScript Errors**
```bash
# Ensure types properly imported
import type { ZKTecoDevice } from '@/types/zkteco';

# Check path aliases in tsconfig.json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

## 📝 Development Notes

### Code Patterns Used
- **Custom Hooks**: Reusable logic abstraction
- **Compound Components**: Flexible UI composition  
- **Provider Pattern**: Global state management
- **Command Pattern**: MQTT command/response handling
- **Observer Pattern**: Real-time status updates

### Performance Optimizations
- **Lazy Loading**: Components loaded on demand
- **Memoization**: Prevent unnecessary re-renders
- **Debouncing**: Form input debouncing
- **Connection Pooling**: MQTT connection reuse
- **Error Boundaries**: Graceful error handling

### Testing Strategy
- **Unit Tests**: Hook logic testing
- **Integration Tests**: MQTT communication testing
- **E2E Tests**: User workflow testing
- **Manual Testing**: Device connectivity testing

---

**🎉 Implementation Complete!**

Fitur ZKTeco Access Control device management via MQTT telah berhasil diimplementasikan dengan pattern dan struktur yang konsisten dengan project existing. Ready untuk production use dan easily extensible untuk future features.

**Next Steps:**
1. ✅ Device Management - **COMPLETED**
2. 🔄 User Management - Architecture ready
3. 🔄 Biometric Management - Architecture ready  
4. 🔄 Live Monitoring - Architecture ready

**Architecture Pattern:** 
`Page Component → Custom Hook → MQTT Client → ZKTeco Middleware → Device Hardware`