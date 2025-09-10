# 🎯 Global Attendance Logger - Integration Guide

## 📋 Summary

Global Attendance Logger memungkinkan **automatic saving** dari MQTT attendance messages ke backend AccessLog **dari halaman mana pun** tanpa perlu setup di setiap page.

## 🔧 Files Created

### 1. Core Service
- **`/services/GlobalAttendanceLogger.ts`** - Singleton service untuk handle MQTT dan save ke backend
- **`/hooks/useGlobalAttendanceLogger.ts`** - React hook untuk menggunakan global logger
- **`/providers/GlobalAttendanceProvider.tsx`** - React provider untuk aplikasi level

### 2. Demo & Monitoring
- **`/components/GlobalAttendanceDemo.tsx`** - Component demo untuk monitoring status
- **Modified `/app/access-control/attendance/page.tsx`** - Updated untuk menggunakan global service

## 🚀 How to Integrate

### Step 1: Add Provider to App Layout

```tsx
// app/layout.tsx or your root layout
import { GlobalAttendanceProvider } from '@/providers/GlobalAttendanceProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* Other providers... */}
        <GlobalAttendanceProvider 
          enableAutoStart={true}
          showDebugLogs={process.env.NODE_ENV === 'development'}
        >
          {children}
        </GlobalAttendanceProvider>
      </body>
    </html>
  );
}
```

### Step 2: Monitor from Any Page

```tsx
// Any page/component
import { useGlobalAttendanceContext } from '@/providers/GlobalAttendanceProvider';

function MyComponent() {
  const { isListening, stats, isLoggingEnabled } = useGlobalAttendanceContext();
  
  return (
    <div>
      Status: {isListening ? 'Active' : 'Inactive'}
      Messages Processed: {stats.messagesProcessed}
      Auto-Logging: {isLoggingEnabled ? 'Always ON' : 'Always ON'}
    </div>
  );
}
```

### Step 3: Use Demo Component

```tsx
// Add to any dashboard page
import GlobalAttendanceDemo from '@/components/GlobalAttendanceDemo';

function Dashboard() {
  return (
    <div>
      <GlobalAttendanceDemo />
      {/* Other content... */}
    </div>
  );
}
```

## ✅ Features

### ✅ **Universal MQTT Listening**
- Automatically subscribes to `accessControl/attendance/live`
- Works from any page in the application
- No need to setup MQTT in individual components

### ✅ **Auto-Save to Backend**
- Every MQTT message automatically saved to AccessLog
- Structured data with proper AccessMethod mapping
- Error handling and retry logic

### ✅ **Real-time Monitoring**
- Live status of MQTT connection
- Statistics: processed, success, error counts
- Recent log messages with timestamps

### ✅ **Reliable Operation**
- Auto-logging always enabled - runs 24/7
- Start/stop MQTT listener on demand (for maintenance only)
- Callback system for custom logging

### ✅ **Zero Configuration**
- Works out of the box once provider is added
- Intelligent AccessMethod mapping
- Proper TypeScript support

## 🎯 Benefits

### Before (Old Way)
```tsx
// Every page needed this setup:
const { subscribe } = useMQTT();
useEffect(() => {
  subscribe("topic", handleMessage);
  // Custom save logic...
}, []);
```

### After (New Way)
```tsx
// Just use the provider - automatic logging everywhere!
<GlobalAttendanceProvider>
  <App /> {/* All attendance messages auto-saved */}
</GlobalAttendanceProvider>
```

## 📊 Data Structure

Each attendance message is automatically saved with:

```json
{
  "user": "John Doe",
  "via": 3, // AccessMethod enum
  "trigger": "access_granted", 
  "description": "Device access_granted on Front Door",
  "isSuccess": true,
  "additionalData": {
    "timestamp": "2024-01-01T12:00:00Z",
    "topic": "accessControl/attendance/live",
    "deviceId": "device001",
    "device_name": "Front Door",
    "uid": "12345",
    "verify_code": 1,
    "punch_code": 0,
    "event_type": "access",
    "via_method": "Fingerprint",
    "source": "global_mqtt_listener"
  }
}
```

## 🔧 Environment Control

```env
# Debug mode (shows overlay)
NODE_ENV=development

# Note: Attendance logging is always enabled - no environment control needed
```

## 🎉 Result

✅ **Universal Coverage** - All MQTT attendance messages saved automatically  
✅ **Zero Maintenance** - No need to add logging to each page  
✅ **Real-time Monitoring** - Live status and statistics  
✅ **Always Running** - 24/7 operation, no disable option  
✅ **Type Safety** - Full TypeScript support  
✅ **Error Handling** - Robust error management  

**Now ANY page in your application will automatically log attendance data to backend! 🚀**