# Real-time Sensor Monitoring Page

## Overview
Halaman monitoring sensor real-time yang menampilkan data dari berbagai jenis sensor IoT dengan integrasi MQTT dan CCTV surveillance.

## Features

### ✅ Real-time MQTT Integration
- **Auto-connect** ke MQTT broker menggunakan konfigurasi database
- **Dynamic subscription** ke topic sensor devices
- **Real-time data streaming** dengan update otomatis
- **Connection status** monitoring dengan visual indicator

### ✅ Sensor Type Support
Mendukung berbagai jenis sensor dengan visualisasi khusus:
- **Temperature** (°C) - Termometer dengan status normal/warning/critical
- **Air Flow** (L/min) - Monitoring aliran udara dengan pressure data
- **Vibration** (m/s²) - 3-axis vibration dengan magnitude calculation
- **Dust Sensor** (µg/m³) - PM2.5 monitoring
- **Humidity** (%) - Kelembaban udara
- **Pressure** (hPa) - Tekanan udara

### ✅ Data Averaging & Status
- **Group-based averaging** untuk setiap tipe sensor
- **Smart status calculation** (normal, warning, critical, offline)
- **Historical data** tracking (50 entries per device)
- **Real-time value extraction** dari raw MQTT payload

### ✅ Advanced Filtering
- **Containment filter** - Filter berdasarkan containment
- **Sensor type filter** - Filter berdasarkan jenis sensor
- **Real-time updates** dengan filter preservation

### ✅ CCTV Integration
- **Camera configuration** dari database
- **Embedded CCTV viewer** dengan dialog modal
- **Full-screen monitoring** capabilities
- **Multiple camera support**

### ✅ Modern UI/UX
- **Responsive design** dengan Tailwind CSS
- **Dark mode support** dengan theme switching
- **Real-time status indicators** dan animations
- **Progressive enhancement** dengan loading states

## Technical Implementation

### MQTT Data Handling
```typescript
// Format sensor data berdasarkan tipe
const formatSensorData = (device: Device, data: any) => {
  switch (device.sensorType) {
    case "Temperature":
      return {
        display: `${temp}°C / ${humidity}%`,
        status: calculateTemperatureStatus(temp),
        values: [/* detailed breakdown */]
      };
    // ... other sensor types
  }
};
```

### Real-time Updates
```typescript
// Update realtime data dengan history tracking
const updateRealtimeData = (deviceId, sensorType, data) => {
  setSensorGroups(prevGroups => {
    // Update current value
    // Add to history (max 50 entries)
    // Recalculate group average
    // Update status indicators
  });
};
```

### Group Averaging
```typescript
// Calculate weighted average untuk sensor group
const calculateGroupAverage = (group: SensorGroup) => {
  const activeData = Object.values(group.realtimeData)
    .filter(data => data.status !== "offline");
  
  return {
    value: totalValue / activeData.length,
    status: determineGroupStatus(statusCounts),
    lastUpdated: new Date()
  };
};
```

## API Integration

### Device & Sensor Data
- `devicesApi.getDevices()` - Load all sensor devices
- `deviceSensorDataApi.getLatestSensorData()` - Historical data
- `containmentsApi.getContainments()` - Filter options

### Camera Integration  
- `cameraConfigApi.getCameraConfigs()` - CCTV configurations
- Dynamic stream URLs: `http://${camera.ip}:${camera.port}/stream`

### MQTT Configuration
- Auto-load dari database via `mqttConfigurationApi`
- Fallback ke environment variables
- Dynamic reconnection support

## File Structure
```
app/monitoring/sensors/
├── page.tsx              # Main sensor monitoring page
├── README.md             # Documentation
└── layout.tsx            # Layout with metadata

lib/
├── mqtt.ts               # Enhanced MQTT client
├── api-service.ts        # API integration
└── role-menu-config.ts   # Navigation menu config
```

## Usage

### Navigation
Halaman dapat diakses melalui:
- **Menu**: Real-time Monitoring > Sensor Monitor
- **URL**: `/monitoring/sensors`
- **Required Role**: USER level (semua authenticated users)

### Filtering
1. **Containment Filter**: Pilih containment spesifik atau "All Containments"
2. **Sensor Type Filter**: Filter berdasarkan jenis sensor atau "All Sensors"
3. **Real-time Updates**: Filter tetap aktif selama streaming

### CCTV Viewing
1. Click **"View CCTV"** button pada sensor group card
2. Modal dialog akan terbuka dengan live stream
3. Support full-screen viewing untuk monitoring detail

## Status Indicators

### Connection Status
- 🟢 **MQTT Connected** - Real-time streaming aktif
- 🔴 **MQTT Disconnected** - Offline mode, data historical only

### Sensor Status
- 🟢 **Normal** - Nilai dalam rentang normal
- 🟡 **Warning** - Nilai mendekati batas bahaya
- 🔴 **Critical** - Nilai melampaui batas aman (dengan pulse animation)
- ⚫ **Offline** - Device tidak mengirim data

### Data Freshness
- **Timestamp** ditampilkan pada setiap sensor card
- **Last updated** untuk group averages
- **Real-time indicators** dengan visual feedback

## Performance Optimizations

- **Efficient MQTT subscriptions** dengan automatic cleanup
- **History limiting** (50 entries per device)
- **Debounced updates** untuk mencegah excessive re-renders
- **Conditional rendering** dengan loading states
- **Memory management** untuk long-running sessions

## Future Enhancements

### Planned Features
- 📊 **Historical charts** dengan time-series visualization
- 📱 **Mobile responsiveness** improvements
- 🔔 **Alert notifications** untuk critical status
- 📈 **Trend analysis** dengan predictive indicators
- 🎛️ **Custom thresholds** per device/sensor type
- 📤 **Data export** functionality (CSV, PDF)

### Technical Improvements
- WebSocket fallback untuk MQTT
- Progressive Web App (PWA) support  
- Offline data caching
- Advanced filtering (date ranges, etc)
- Performance monitoring dashboard