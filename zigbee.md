---
---

# 📡 Topik MQTT dan Struktur Pesan Zigbee2MQTT

Halaman ini menjelaskan topik MQTT yang digunakan oleh Zigbee2MQTT untuk sistem IoT Containment Monitoring. Topik dasar (default `zigbee2mqtt`) dapat dikonfigurasi dalam file [Zigbee2MQTT `configuration.yaml`](../information/configuration.md).

## 🌉 Bridge State Management

### zigbee2mqtt/bridge/state

Zigbee2MQTT menerbitkan status bridge ke topik ini untuk monitoring koneksi real-time:

- `"online"`: dipublikasikan ketika bridge berjalan (saat startup)  
- `"offline"`: dipublikasikan tepat sebelum bridge berhenti

**Fungsi dalam Sistem IoT:**
- **Monitoring Koneksi**: Frontend dapat memantau status konektivitas Zigbee bridge
- **Auto Reconnection**: Backend dapat mendeteksi disconnect dan melakukan reconnect otomatis
- **Health Check**: Sistem monitoring dapat memverifikasi status bridge secara real-time
- **Alert System**: Trigger notifikasi WhatsApp jika bridge offline

### zigbee2mqtt/bridge/config

Zigbee2MQTT menerbitkan konfigurasi ke topik ini yang berisi `log_level` dan `permit_join`:

**Data yang Dipublikasikan:**
```json
{
  "log_level": "info",
  "permit_join": false,
  "version": "1.28.4",
  "coordinator": {
    "type": "zStack3x0",
    "meta": {"revision": 20210708}
  }
}
```

**Integrasi dengan Backend:**
- **Configuration Management**: Backend dapat membaca dan menyimpan konfigurasi bridge
- **Dynamic Settings**: Mengubah pengaturan tanpa restart sistem
- **Version Tracking**: Monitor versi firmware coordinator

## 📝 Logging dan Event Management

### zigbee2mqtt/bridge/log

Zigbee2MQTT mengeluarkan log ke endpoint ini. Pesan selalu dalam format `{"type":"TYPE","message":"MESSAGE"}`. 

**Event Types untuk IoT Monitoring:**

#### Device Connection Events
- `"pairing"`: logged ketika perangkat sedang terkoneksi ke jaringan
  - **Implementasi**: Tampilkan notifikasi pairing di dashboard
  - **Backend Action**: Simpan event ke database AccessLog
  
- `"device_connected"`: dikirim ketika perangkat baru terhubung ke jaringan
  - **Auto Discovery**: Sistem otomatis mendeteksi sensor baru
  - **Device Registration**: Tambahkan perangkat ke database secara otomatis
  
- `"device_announced"`: dikirim ketika perangkat mengumumkan dirinya di jaringan
  - **Health Monitor**: Verifikasi perangkat masih aktif
  - **Status Update**: Update last_seen timestamp di database

#### Device Management Events  
- `"device_removed"`: dikirim ketika perangkat dihapus dari jaringan
  - **Cleanup Process**: Hapus data sensor terkait
  - **Alert Generation**: Notifikasi jika perangkat critical dihapus
  
- `"device_banned"`: dikirim ketika perangkat dibanned dari jaringan
  - **Security Log**: Catat event security ke AccessLog
  - **Admin Notification**: Alert ke admin tentang banned device
  
- `"device_renamed"`: dikirim ketika perangkat diubah namanya
  - **Database Sync**: Sinkronisasi nama di database
  - **UI Update**: Refresh device list di frontend

#### Group Management Events
- `"group_added"`: dikirim ketika grup ditambahkan
  - **Containment Groups**: Buat grup untuk setiap containment
  - **Batch Control**: Kontrol multiple device sekaligus
  
- `"device_group_add"`: dikirim ketika perangkat ditambahkan ke grup  
  - **Rack Assignment**: Assign device ke rack tertentu
  - **Hierarchy Building**: Buat struktur Containment → Rack → Device

#### Error Handling Events
- `"zigbee_publish_error"`: logged ketika terjadi error Zigbee publish
  - **Error Tracking**: Simpan error log untuk debugging
  - **Retry Mechanism**: Implementasi retry otomatis
  - **Maintenance Alert**: Notifikasi maintenance jika error berulang

- `"ota_update"`: logs terkait OTA updates
  - **Firmware Management**: Track update firmware device
  - **Maintenance Schedule**: Jadwalkan update saat maintenance window

## 🔍 Device Discovery dan Management

### zigbee2mqtt/bridge/config/devices/get

Memungkinkan Anda mengambil semua perangkat yang terhubung. Publikasikan payload kosong ke topik ini. Respons akan dipublikasikan ke `zigbee2mqtt/bridge/config/devices`.

**Implementasi dalam Sistem IoT:**
```javascript
// Frontend - Auto refresh device list
mqttClient.publish('zigbee2mqtt/bridge/config/devices/get', '');

// Backend - Process device list response
mqttClient.subscribe('zigbee2mqtt/bridge/config/devices', (topic, message) => {
  const devices = JSON.parse(message.toString());
  await DeviceService.syncZigbeeDevices(devices);
});
```

**Use Cases:**
- **Device Inventory**: Sinkronisasi device list dengan database
- **Health Check**: Verifikasi device yang masih terhubung
- **Auto Discovery**: Deteksi device baru secara otomatis

### zigbee2mqtt/bridge/config/permit_join

Memungkinkan Anda mengizinkan bergabungnya perangkat baru melalui MQTT. Ini tidak persisten (tidak akan disimpan ke `configuration.yaml`).

**Control Messages:**
- `"true"`: izinkan perangkat baru bergabung
- `"false"`: nonaktifkan perangkat baru bergabung

**Implementasi Smart Pairing:**
```javascript
// Backend - Smart pairing mode dengan timeout
class ZigbeePairingService {
  async enablePairing(duration = 60) {
    // Enable pairing
    await mqttClient.publish('zigbee2mqtt/bridge/config/permit_join', 'true');
    
    // Auto disable setelah duration
    setTimeout(async () => {
      await mqttClient.publish('zigbee2mqtt/bridge/config/permit_join', 'false');
      console.log('Pairing mode disabled automatically');
    }, duration * 1000);
    
    // Log activity
    await AccessLogService.create({
      action: 'ZIGBEE_PAIRING_ENABLED',
      duration: duration,
      timestamp: new Date()
    });
  }
}
```

**Security Features:**
- **Timed Pairing**: Pairing otomatis dinonaktifkan setelah waktu tertentu
- **Admin Only**: Hanya admin yang dapat mengaktifkan pairing mode
- **Audit Log**: Semua aktivitas pairing dicatat ke AccessLog

## ⚙️ Advanced Configuration

### zigbee2mqtt/bridge/config/last_seen

Memungkinkan Anda mengatur opsi konfigurasi `advanced` -> `last_seen`. Lihat [Configuration](../information/configuration.md) untuk nilai yang memungkinkan.

**Tracking Options:**
- `"disable"`: Nonaktifkan tracking last_seen
- `"ISO_8601"`: Format timestamp ISO 8601 
- `"epoch"`: Unix timestamp format

**Database Integration:**
```javascript
// Backend - Update device last_seen
mqttClient.subscribe('zigbee2mqtt/+', (topic, message) => {
  const deviceName = topic.split('/')[1];
  const data = JSON.parse(message.toString());
  
  if (data.last_seen) {
    DeviceService.updateLastSeen(deviceName, data.last_seen);
  }
});
```

### zigbee2mqtt/bridge/config/elapsed

Memungkinkan Anda mengatur opsi konfigurasi `advanced` -> `elapsed`. Menampilkan waktu sejak pesan terakhir diterima.

**Performance Monitoring:**
- **Response Time**: Monitor response time device
- **Network Health**: Analisis kualitas jaringan Zigbee
- **Predictive Maintenance**: Prediksi device yang bermasalah

### zigbee2mqtt/bridge/config/reset

Reset ZNP (CC2530/CC2531) coordinator.

**Emergency Recovery:**
```javascript
// Backend - Emergency coordinator reset
class ZigbeeRecoveryService {
  async emergencyReset() {
    try {
      await mqttClient.publish('zigbee2mqtt/bridge/config/reset', '');
      
      // Log emergency action
      await EmergencyReportService.create({
        type: 'ZIGBEE_COORDINATOR_RESET',
        severity: 'HIGH',
        action_taken: 'Coordinator reset executed',
        timestamp: new Date()
      });
      
      // Send WhatsApp notification
      await WhatsAppService.sendAlert(
        'EMERGENCY: Zigbee coordinator telah di-reset. Mohon periksa koneksi device.'
      );
      
    } catch (error) {
      console.error('Reset failed:', error);
    }
  }
}
```

## 🔧 Runtime Configuration

### zigbee2mqtt/bridge/config/log_level

Memungkinkan Anda mengganti `log_level` selama runtime. Ini tidak persisten (tidak akan disimpan ke `configuration.yaml`). Payload yang mungkin: `"debug"`, `"info"`, `"warn"`, `"error"`.

**Dynamic Debugging:**
```javascript
// Backend - Dynamic log level control
class ZigbeeDebugService {
  async setDebugMode(enabled = true) {
    const logLevel = enabled ? 'debug' : 'info';
    await mqttClient.publish('zigbee2mqtt/bridge/config/log_level', logLevel);
    
    // Auto restore setelah 30 menit
    if (enabled) {
      setTimeout(async () => {
        await mqttClient.publish('zigbee2mqtt/bridge/config/log_level', 'info');
      }, 30 * 60 * 1000);
    }
  }
}
```

### zigbee2mqtt/bridge/config/device_options

Memungkinkan Anda mengubah opsi spesifik perangkat selama runtime. Opsi hanya dapat diubah, tidak ditambah atau dihapus. Payload harus berupa pesan JSON:

```json
{
  "friendly_name": "motion_sensor_toilet",
  "options": {
    "occupancy_timeout": 100,
    "sensitivity": "medium",
    "reporting_interval": 60
  }
}
```

**Smart Device Configuration:**
```javascript
// Backend - Smart sensor configuration
class ZigbeeConfigService {
  async optimizeSensorSettings(deviceName, roomType) {
    let config = {};
    
    switch (roomType) {
      case 'toilet':
        config = {
          occupancy_timeout: 30,
          sensitivity: 'high',
          reporting_interval: 15
        };
        break;
      case 'office':
        config = {
          occupancy_timeout: 300,
          sensitivity: 'medium', 
          reporting_interval: 60
        };
        break;
      case 'server_room':
        config = {
          temperature_calibration: -2,
          humidity_calibration: 0,
          reporting_interval: 10
        };
        break;
    }
    
    await mqttClient.publish('zigbee2mqtt/bridge/config/device_options', 
      JSON.stringify({
        friendly_name: deviceName,
        options: config
      })
    );
  }
}
```

## zigbee2mqtt/bridge/config/remove

Allows you to remove devices from the network. Payload should be the `friendly_name`, e.g. `0x00158d0001b79111`. On successful remove a [`device_removed`](https://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html#zigbee2mqttbridgelog) message is sent.

Note that in Zigbee the coordinator can only **request** a device to remove itself from the network.
Which means that in case a device refuses to respond to this request it is not removed from the network.
This can happen for e.g. battery powered devices which are sleeping and thus not receiving this request.
In this case you will see the following in the Zigbee2MQTT log:

```
Zigbee2MQTT:info  2019-11-03T13:39:30: Removing 'dimmer'
Zigbee2MQTT:error 2019-11-03T13:39:40: Failed to remove dimmer (Error: AREQ - ZDO - mgmtLeaveRsp after 10000ms)
```

An alternative way to remove the device is by factory resetting it, this probably won't work for all devices as it depends on the device itself.
In case the device did remove itself from the network, you will see:

```
Zigbee2MQTT:warn  2019-11-03T13:36:18: Device '0x00158d00024a5e57' left the network
```

In case all of the above fails, you can force remove a device. Note that a force remove will **only** remove the device from the database. Until this device is factory reset, it will still hold the network encryption key and thus is still able to communicate over the network!

To force remove a device use the following topic: `zigbee2mqtt/bridge/config/force_remove`

## zigbee2mqtt/bridge/config/ban

Allows you to ban devices from the network. Payload should be the `friendly_name`, e.g. `0x00158d0001b79111`. On successful ban a [`device_banned`](https://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html#zigbee2mqttbridgelog) message is sent.

## zigbee2mqtt/bridge/config/whitelist

Allows you to whitelist devices in the network. Payload should be the `friendly_name`, e.g. `0x00158d0001b79111`. On successful whitelisting a [`device_whitelisted`](https://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html#zigbee2mqttbridgelog) message is sent. Note that when devices are whitelisted, all device which are not whitelisted will be removed from the network.

## zigbee2mqtt/bridge/config/rename

Allows you to change the `friendly_name` of a device or group on the fly.
Format should be: `{"old": "OLD_FRIENDLY_NAME", "new": "NEW_FRIENDLY_NAME"}`.

## zigbee2mqtt/bridge/config/rename_last

Allows you to rename the last joined device. Payload should be the new name e.g. `my_new_device_name`.

## zigbee2mqtt/bridge/config/add_group

Allows you to add a group, payload should be the name of the group, e.g. `my_group`.

In case you also want to specify the group ID, provide the following payload `{"friendly_name": "my_group", "id": 42}`.

## zigbee2mqtt/bridge/config/remove_group

Allows you to remove a group, payload should be the name of the group, e.g. `my_group`.
In case group removal fails because on of the devices cannot be removed from the group you can force it via `zigbee2mqtt/bridge/config/remove_group`.

## zigbee2mqtt/bridge/networkmap

**WARNING: During the networkmap scan your network will be not/less responsive. Depending on the size of your network this can take somewhere between 10 seconds and 2 minutes. Therefore it is recommended to only trigger these scans manually!**

Allows you to retrieve a map of your zigbee network. Possible payloads are `raw`, `graphviz`, and `plantuml`. Zigbee2MQTT will send the networkmap to topic `zigbee2mqtt/bridge/networkmap/[raw|graphviz|plantuml]`. <br /> Use [webgraphviz.com](http://www.webgraphviz.com/) (for `graphviz`), [planttext.com](https://www.planttext.com/) (for `plantuml`), or other tools to generate the Network Graph. <br /> **NOTE:** Zigbee2MQTT 1.2.1+ required.

To request a networkmap with **routes** use `zigbee2mqtt/bridge/networkmap/routes` as topic.

### graphviz

The graphviz map shows the devices as follows:

- **Coordinator:** rectangle with bold outline
- **Router:** rectangle with rounded corners
- **End device:** rectangle with rounded corners and dashed outline

Links are labelled with link quality (0..255) and active routes (listed by short 16 bit destination address). Arrow indicates direction of messaging. Coordinator and routers will typically have two lines for each connection showing bi-directional message path. Line style is:

- To **end devices**: normal line
- To and between **coordinator** and **routers**: heavy line for active routes or thin line for no active routes

## zigbee2mqtt/bridge/group/[friendly_name]/(add|remove|remove_all)

See [Groups](groups.md)

## zigbee2mqtt/bridge/(bind|unbind)/[friendly_name]

See [Binding](binding.md)

## zigbee2mqtt/bridge/device/[friendly_name]/get_group_membership

Returns the list of groups a device is in, and its group capacity.

## zigbee2mqtt/bridge/configure

Allows to manually trigger a re-configure of the device. Should only be used when the device is not working as expected, also not all devices require this. Payload should be friendly name of the device, e.g. `my_remote`.

## 📊 Data Sensor dan Komunikasi Real-time

### zigbee2mqtt/[FRIENDLY_NAME]

Di mana `[FRIENDLY_NAME]` adalah misalnya `containment_1_temp_sensor`. Pesan yang dipublikasikan ke topik ini **selalu** dalam format JSON. Setiap perangkat menghasilkan pesan JSON yang berbeda.

### **🌡️ Sensor Suhu & Kelembaban untuk Containment Monitoring**

**Xiaomi MiJia temperature & humidity sensor (WSDCGQ01LM)**

```json
{
  "temperature": 27.34,
  "humidity": 44.72,
  "battery": 95,
  "voltage": 3025,
  "last_seen": "2024-01-15T10:30:00Z"
}
```

**Implementasi Backend untuk Containment Monitoring:**
```javascript
// Backend - Process temperature sensor data
mqttClient.subscribe('zigbee2mqtt/containment_+_temp_+', async (topic, message) => {
  const data = JSON.parse(message.toString());
  const topicParts = topic.split('/')[1].split('_'); // containment_1_temp_sensor
  const containmentId = topicParts[1];
  
  // Save sensor data
  await DeviceSensorDataService.create({
    containment_id: containmentId,
    sensor_type: 'temperature_humidity',
    temperature: data.temperature,
    humidity: data.humidity,
    battery_level: data.battery,
    timestamp: new Date(data.last_seen)
  });
  
  // Check temperature thresholds
  if (data.temperature > 30 || data.temperature < 15) {
    await EmergencyReportService.create({
      type: 'TEMPERATURE_ALERT',
      containment_id: containmentId,
      current_value: data.temperature,
      threshold: data.temperature > 30 ? 30 : 15,
      severity: 'MEDIUM'
    });
    
    // Send WhatsApp alert
    await WhatsAppService.sendAlert(
      `⚠️ TEMPERATURE ALERT: Containment ${containmentId} - ${data.temperature}°C`
    );
  }
});
```

### **🚶 Motion Sensor untuk Access Control**

**Xiaomi MiJia human body movement sensor (RTCGQ01LM)**

```json
{
  "occupancy": true,
  "illuminance": 150,
  "battery": 88,
  "last_seen": "2024-01-15T10:30:00Z"
}
```

**Smart Access Control Implementation:**
```javascript
// Backend - Motion detection dengan access control integration
mqttClient.subscribe('zigbee2mqtt/+_motion_sensor', async (topic, message) => {
  const data = JSON.parse(message.toString());
  const sensorLocation = topic.split('/')[1].replace('_motion_sensor', '');
  
  if (data.occupancy) {
    // Log access event
    await AccessLogService.create({
      location: sensorLocation,
      detection_type: 'MOTION_DETECTED',
      illuminance: data.illuminance,
      timestamp: new Date()
    });
    
    // Trigger CCTV recording
    await CCTVService.startRecording(sensorLocation, duration: 30);
    
    // Real-time notification ke frontend
    websocketServer.emit('motion_detected', {
      location: sensorLocation,
      illuminance: data.illuminance,
      timestamp: new Date()
    });
  }
});
```

### **💡 Smart Lighting Control untuk Containment**

**IKEA TRADFRI LED bulb untuk Emergency Lighting**

```json
{
  "state": "ON",
  "brightness": 215,
  "color_temp": 325,
  "power": 8.5,
  "last_seen": "2024-01-15T10:30:00Z"
}
```

### **🔌 Smart Switch & Power Monitoring**

**Xiaomi Mi power plug untuk Equipment Control**

```json
{
  "state": "ON",
  "power": 156.7,
  "current": 0.68,
  "voltage": 230.4,
  "energy": 1247.89,
  "temperature": 42.1
}
```

**Power Management Implementation:**
```javascript
// Backend - Smart power management
mqttClient.subscribe('zigbee2mqtt/+_power_+', async (topic, message) => {
  const data = JSON.parse(message.toString());
  const deviceInfo = topic.split('/')[1];
  
  // Monitor power consumption
  await DeviceSensorDataService.create({
    device_id: deviceInfo,
    sensor_type: 'power_consumption',
    power: data.power,
    current: data.current,
    voltage: data.voltage,
    energy_total: data.energy,
    timestamp: new Date()
  });
  
  // Detect power anomalies
  if (data.power > 200 || data.temperature > 50) {
    await EmergencyReportService.create({
      type: 'POWER_ANOMALY',
      device_id: deviceInfo,
      power: data.power,
      temperature: data.temperature,
      severity: 'HIGH'
    });
    
    // Auto shutdown if critical
    if (data.temperature > 60) {
      await mqttClient.publish(`zigbee2mqtt/${deviceInfo}/set`, 
        JSON.stringify({ state: 'OFF' })
      );
    }
  }
});
```

## 🎛️ Device Control dan Automation

### zigbee2mqtt/[FRIENDLY_NAME]/set

Mempublikasikan pesan ke topik ini memungkinkan Anda mengontrol perangkat Zigbee melalui MQTT. Hanya menerima pesan JSON.

### **Smart Containment Lighting Control**

```javascript
// Backend - Automated lighting berdasarkan kondisi
class ContainmentLightingService {
  async setEmergencyLighting(containmentId, enabled = true) {
    const lightDevices = await DeviceService.getByType('smart_bulb', containmentId);
    
    for (const device of lightDevices) {
      const command = {
        state: enabled ? 'ON' : 'OFF',
        brightness: enabled ? 255 : 0,
        color: enabled ? { r: 255, g: 0, b: 0 } : null, // Red untuk emergency
        effect: enabled ? 'blink' : 'finish_effect',
        transition: 1
      };
      
      await mqttClient.publish(`zigbee2mqtt/${device.friendly_name}/set`, 
        JSON.stringify(command)
      );
    }
    
    // Log emergency lighting activation
    await EmergencyReportService.create({
      type: 'EMERGENCY_LIGHTING',
      containment_id: containmentId,
      action: enabled ? 'ACTIVATED' : 'DEACTIVATED',
      timestamp: new Date()
    });
  }
  
  async setWorkingHoursLighting(containmentId) {
    const currentHour = new Date().getHours();
    const isWorkingHours = currentHour >= 7 && currentHour <= 18;
    
    const command = {
      state: isWorkingHours ? 'ON' : 'OFF',
      brightness: isWorkingHours ? 180 : 50,
      color_temp: isWorkingHours ? 250 : 400, // Warm light untuk malam
      transition: 5
    };
    
    const lightDevices = await DeviceService.getByType('smart_bulb', containmentId);
    for (const device of lightDevices) {
      await mqttClient.publish(`zigbee2mqtt/${device.friendly_name}/set`, 
        JSON.stringify(command)
      );
    }
  }
}
```

### **Smart Ventilation Control**

```javascript
// Backend - Automated ventilation berdasarkan suhu
class VentilationControlService {
  async controlBasedOnTemperature(containmentId, temperature, humidity) {
    const fanDevices = await DeviceService.getByType('smart_fan', containmentId);
    
    let fanSpeed = 0;
    if (temperature > 28 || humidity > 70) {
      fanSpeed = 255; // Maximum speed
    } else if (temperature > 25 || humidity > 60) {
      fanSpeed = 180; // Medium speed
    } else if (temperature > 22) {
      fanSpeed = 100; // Low speed
    }
    
    for (const fan of fanDevices) {
      await mqttClient.publish(`zigbee2mqtt/${fan.friendly_name}/set`, 
        JSON.stringify({
          state: fanSpeed > 0 ? 'ON' : 'OFF',
          brightness: fanSpeed, // Fan speed control
          transition: 3
        })
      );
    }
    
    // Log ventilation control
    await ActivityReportService.create({
      type: 'VENTILATION_CONTROL',
      containment_id: containmentId,
      fan_speed: fanSpeed,
      trigger_temp: temperature,
      trigger_humidity: humidity,
      timestamp: new Date()
    });
  }
}
```

### **Smart Access Control Integration**

```javascript
// Backend - Kontrol akses dengan smart lock
class SmartAccessService {
  async grantTemporaryAccess(userId, containmentId, durationMinutes = 60) {
    const lockDevice = await DeviceService.getLockByContainment(containmentId);
    
    // Unlock door
    await mqttClient.publish(`zigbee2mqtt/${lockDevice.friendly_name}/set`, 
      JSON.stringify({
        state: 'UNLOCK',
        effect: 'okay' // Confirmation feedback
      })
    );
    
    // Schedule auto lock
    setTimeout(async () => {
      await mqttClient.publish(`zigbee2mqtt/${lockDevice.friendly_name}/set`, 
        JSON.stringify({ state: 'LOCK' })
      );
    }, durationMinutes * 60 * 1000);
    
    // Log access granted
    await AccessLogService.create({
      user_id: userId,
      containment_id: containmentId,
      action: 'TEMPORARY_ACCESS_GRANTED',
      duration_minutes: durationMinutes,
      device_used: lockDevice.friendly_name,
      timestamp: new Date()
    });
    
    // Send confirmation via WhatsApp
    await WhatsAppService.sendMessage(
      `🔓 Akses sementara diberikan untuk Containment ${containmentId}. Auto-lock dalam ${durationMinutes} menit.`
    );
  }
}
```

### Without JSON

In case you don't want to use JSON, publishing to `zigbee2mqtt/[FRIENDLY_NAME]/set/state` with payload `ON` is the same as publishing to `zigbee2mqtt/[FRIENDLY_NAME]/set`

```js
{
  "state": "ON"
}
```

## zigbee2mqtt/[FRIENDLY_NAME]/get

This is the counterpart of the `set` command. It allows you to read a value from a device. To read e.g. the state of a device send the payload:

```js
{
  "state": ""
}
```

## homeassistant/[DEVICE_TYPE]/[IEEEADDR]/[OBJECT_ID]/config

Only used when `homeassistant: true` in `configuration.yaml`. Required for [Home Assistant MQTT discovery](https://www.home-assistant.io/docs/mqtt/discovery/).

---

## 🏗️ Arsitektur MQTT dalam Sistem IoT Containment Monitoring

### **Struktur Topik MQTT untuk Containment System**

```
zigbee2mqtt/
├── bridge/                          # Bridge management
│   ├── state                       # Online/offline status
│   ├── config/                     # Configuration management
│   └── log                         # System events & logs
├── containment_1/                  # Containment specific topics
│   ├── temp_sensor_main/           # Primary temperature sensor
│   ├── temp_sensor_backup/         # Backup temperature sensor
│   ├── humidity_sensor/            # Humidity monitoring
│   ├── motion_sensor_entrance/     # Entry motion detection
│   ├── smart_bulb_main/           # Main lighting control
│   ├── smart_bulb_emergency/      # Emergency lighting
│   ├── power_outlet_critical/     # Critical equipment power
│   ├── smart_lock_main/           # Main access control
│   └── ventilation_fan/           # Climate control
└── common_area/                    # Shared facility sensors
    ├── smoke_detector/
    ├── water_leak_sensor/
    └── emergency_button/
```

### **🔄 Data Flow dan Processing Pipeline**

```javascript
// Backend - Comprehensive MQTT data processing
class ZigbeeDataProcessor {
  constructor() {
    this.mqttClient = new MqttClient();
    this.setupSubscriptions();
  }
  
  setupSubscriptions() {
    // Bridge monitoring
    this.mqttClient.subscribe('zigbee2mqtt/bridge/state', this.handleBridgeState.bind(this));
    this.mqttClient.subscribe('zigbee2mqtt/bridge/log', this.handleBridgeLog.bind(this));
    
    // Sensor data processing
    this.mqttClient.subscribe('zigbee2mqtt/+/temp_sensor_+', this.handleTemperatureData.bind(this));
    this.mqttClient.subscribe('zigbee2mqtt/+/humidity_sensor', this.handleHumidityData.bind(this));
    this.mqttClient.subscribe('zigbee2mqtt/+/motion_sensor_+', this.handleMotionData.bind(this));
    this.mqttClient.subscribe('zigbee2mqtt/+/power_outlet_+', this.handlePowerData.bind(this));
    this.mqttClient.subscribe('zigbee2mqtt/+/smart_lock_+', this.handleAccessControl.bind(this));
    
    // Emergency sensors
    this.mqttClient.subscribe('zigbee2mqtt/+/smoke_detector', this.handleEmergencyData.bind(this));
    this.mqttClient.subscribe('zigbee2mqtt/+/water_leak_sensor', this.handleEmergencyData.bind(this));
    this.mqttClient.subscribe('zigbee2mqtt/+/emergency_button', this.handleEmergencyButton.bind(this));
  }
  
  async handleTemperatureData(topic, message) {
    const data = JSON.parse(message.toString());
    const topicParts = topic.split('/');
    const containmentId = topicParts[1];
    const sensorType = topicParts[2];
    
    // Save sensor data dengan enhanced metadata
    await DeviceSensorDataService.create({
      containment_id: containmentId,
      sensor_type: 'temperature',
      sensor_location: sensorType,
      temperature: data.temperature,
      battery_level: data.battery,
      signal_strength: data.linkquality,
      timestamp: new Date(data.last_seen || Date.now())
    });
    
    // Real-time threshold monitoring
    await this.checkTemperatureThresholds(containmentId, data.temperature, sensorType);
    
    // Trigger automated responses
    if (sensorType === 'temp_sensor_main') {
      await VentilationControlService.controlBasedOnTemperature(
        containmentId, data.temperature, data.humidity || 0
      );
    }
    
    // Update real-time dashboard
    this.broadcastToFrontend('sensor_update', {
      containment_id: containmentId,
      sensor_type: 'temperature',
      value: data.temperature,
      status: this.getTemperatureStatus(data.temperature),
      timestamp: new Date()
    });
  }
  
  async handleMotionData(topic, message) {
    const data = JSON.parse(message.toString());
    const topicParts = topic.split('/');
    const containmentId = topicParts[1];
    const sensorLocation = topicParts[2];
    
    if (data.occupancy) {
      // Enhanced access logging
      await AccessLogService.create({
        containment_id: containmentId,
        location: sensorLocation,
        detection_type: 'MOTION_DETECTED',
        illuminance: data.illuminance,
        metadata: {
          battery_level: data.battery,
          signal_strength: data.linkquality,
          sensor_sensitivity: data.sensitivity
        },
        timestamp: new Date()
      });
      
      // Smart automation responses
      await this.triggerMotionResponse(containmentId, sensorLocation, data);
    }
  }
  
  async triggerMotionResponse(containmentId, location, data) {
    // Multi-layered response system
    const responses = [];
    
    // 1. Lighting automation
    if (data.illuminance < 50) { // Dark environment
      responses.push(
        ContainmentLightingService.setMotionActivatedLighting(containmentId, location)
      );
    }
    
    // 2. CCTV activation
    responses.push(
      CCTVService.startRecording(containmentId, {
        location: location,
        duration: 120, // 2 minutes
        quality: 'high',
        trigger: 'motion_detected'
      })
    );
    
    // 3. Security protocol untuk akses di luar jam kerja
    const currentHour = new Date().getHours();
    if (currentHour < 7 || currentHour > 18) {
      responses.push(
        this.triggerAfterHoursAlert(containmentId, location)
      );
    }
    
    // Execute all responses concurrently
    await Promise.all(responses);
  }
  
  async handleEmergencyData(topic, message) {
    const data = JSON.parse(message.toString());
    const topicParts = topic.split('/');
    const containmentId = topicParts[1];
    const emergencyType = topicParts[2];
    
    // Immediate emergency response
    await EmergencyReportService.create({
      type: emergencyType.toUpperCase(),
      containment_id: containmentId,
      severity: 'CRITICAL',
      sensor_data: data,
      timestamp: new Date(),
      status: 'ACTIVE'
    });
    
    // Execute emergency protocols
    await this.executeEmergencyProtocol(containmentId, emergencyType, data);
  }
  
  async executeEmergencyProtocol(containmentId, emergencyType, data) {
    const protocols = {
      smoke_detector: async () => {
        // Fire emergency protocol
        await ContainmentLightingService.setEmergencyLighting(containmentId, true);
        await this.triggerEvacuationMode(containmentId);
        await this.notifyFireDepartment(containmentId, data);
      },
      
      water_leak_sensor: async () => {
        // Water leak protocol
        await this.shutdownElectrical(containmentId);
        await this.activateWaterAlarms(containmentId);
        await this.notifyMaintenanceTeam(containmentId, 'WATER_LEAK', data);
      },
      
      emergency_button: async () => {
        // Manual emergency activation
        await this.activateAllEmergencyProtocols(containmentId);
        await this.notifySecurityTeam(containmentId, data);
      }
    };
    
    if (protocols[emergencyType]) {
      await protocols[emergencyType]();
    }
  }
}
```

### **📊 Real-time Dashboard Integration**

```javascript
// Frontend - Real-time MQTT data visualization
class ZigbeeDashboard {
  constructor() {
    this.websocket = new WebSocket('ws://localhost:8080');
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.websocket.on('sensor_update', this.updateSensorDisplay.bind(this));
    this.websocket.on('motion_detected', this.showMotionAlert.bind(this));
    this.websocket.on('emergency_alert', this.handleEmergencyAlert.bind(this));
    this.websocket.on('device_offline', this.showOfflineAlert.bind(this));
  }
  
  updateSensorDisplay(data) {
    const { containment_id, sensor_type, value, status } = data;
    
    // Update real-time charts
    this.updateChart(`${containment_id}_${sensor_type}`, value);
    
    // Update status indicators
    this.updateStatusBadge(containment_id, sensor_type, status);
    
    // Trigger visual alerts if needed
    if (status === 'CRITICAL' || status === 'WARNING') {
      this.showSensorAlert(containment_id, sensor_type, value);
    }
  }
  
  async sendDeviceCommand(deviceId, command) {
    // Send command through backend MQTT service
    await fetch('/api/zigbee/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        command: command
      })
    });
  }
}
```

### **⚡ Performance Optimization & Best Practices**

#### **1. Topic Organization Strategy**
- **Hierarchical Structure**: `zigbee2mqtt/containment_id/device_type/device_instance`
- **Wildcard Subscriptions**: Menggunakan `+` dan `#` untuk efficient subscriptions
- **QoS Levels**: 
  - QoS 0 untuk sensor data real-time
  - QoS 1 untuk control commands
  - QoS 2 untuk emergency protocols

#### **2. Data Processing Optimization**
```javascript
// Batch processing untuk high-frequency sensors
class OptimizedDataProcessor {
  constructor() {
    this.sensorBuffer = new Map();
    this.batchInterval = 5000; // 5 seconds
    this.setupBatchProcessing();
  }
  
  setupBatchProcessing() {
    setInterval(() => {
      this.processBatchedSensorData();
    }, this.batchInterval);
  }
  
  async processBatchedSensorData() {
    const batches = Array.from(this.sensorBuffer.entries());
    
    // Process in parallel batches
    await Promise.all(
      batches.map(([containmentId, sensorData]) => 
        this.processSensorBatch(containmentId, sensorData)
      )
    );
    
    this.sensorBuffer.clear();
  }
}
```

#### **3. Error Handling & Resilience**
```javascript
class ResilientMqttClient {
  constructor() {
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
  }
  
  async connect() {
    try {
      await this.mqttClient.connect();
      this.reconnectAttempts = 0;
      console.log('MQTT connected successfully');
    } catch (error) {
      await this.handleReconnect(error);
    }
  }
  
  async handleReconnect(error) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`MQTT reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => this.connect(), delay);
    } else {
      // Fallback to offline mode
      await this.activateOfflineMode();
    }
  }
}
```

### **🔐 Security & Access Control**

#### **MQTT Authentication & Authorization**
```javascript
// Backend - Secured MQTT with role-based access
class SecureMqttService {
  async authenticateDevice(clientId, username, password) {
    // Verify device credentials against database
    const device = await DeviceService.getByCredentials(username, password);
    
    if (!device || !device.is_active) {
      throw new Error('Device authentication failed');
    }
    
    // Check device permissions
    const permissions = await this.getDevicePermissions(device.id);
    
    return {
      authenticated: true,
      device_id: device.id,
      permissions: permissions
    };
  }
  
  async authorizeTopicAccess(deviceId, topic, action) {
    const permissions = await this.getDevicePermissions(deviceId);
    
    // Check if device can access specific containment
    const containmentId = this.extractContainmentFromTopic(topic);
    
    return permissions.containments.includes(containmentId) &&
           permissions.actions.includes(action);
  }
}
```

---

## 📋 Ringkasan Implementasi MQTT untuk IoT Containment System

### **🎯 Key Benefits dari Zigbee2MQTT Integration:**

1. **Real-time Monitoring**: Data sensor real-time dari semua containment
2. **Automated Response**: Sistem otomatis merespons kondisi abnormal
3. **Centralized Control**: Kontrol terpusat untuk semua perangkat IoT
4. **Scalable Architecture**: Mudah menambah device dan containment baru
5. **Emergency Management**: Protokol darurat terintegrasi
6. **Energy Efficiency**: Optimisasi konsumsi daya berdasarkan penggunaan
7. **Predictive Maintenance**: Prediksi maintenance berdasarkan data sensor
8. **Audit Trail**: Complete logging untuk compliance dan security

### **🔧 Technical Implementation Checklist:**

- ✅ **Bridge Management**: Monitor status Zigbee2MQTT bridge
- ✅ **Device Discovery**: Auto-detection perangkat baru
- ✅ **Sensor Data Processing**: Real-time processing dengan threshold monitoring  
- ✅ **Automated Control**: Smart lighting, ventilation, dan access control
- ✅ **Emergency Protocols**: Smoke detection, water leak, dan emergency button
- ✅ **Performance Optimization**: Batch processing dan efficient subscriptions
- ✅ **Security**: Authentication, authorization, dan encrypted communications
- ✅ **Dashboard Integration**: Real-time visualization dan control interface
- ✅ **Notification System**: WhatsApp alerts dan emergency notifications
- ✅ **Database Integration**: Persistent storage dengan comprehensive logging

Sistem ini memberikan foundation yang solid untuk IoT containment monitoring dengan kemampuan real-time response, automation, dan emergency management yang terintegrasi penuh dengan backend .NET 9 dan frontend Next.js 14.

## Device specific commands

Beberapa perangkat menawarkan perintah khusus perangkat. Contoh: untuk Xiaomi DJT11LM Aqara vibration sensor Anda dapat mengatur `sensitivity`. Untuk mengetahui apakah perangkat Anda mendukung perintah khusus apa pun, periksa halaman perangkat (yang dapat diakses melalui halaman perangkat yang didukung).
