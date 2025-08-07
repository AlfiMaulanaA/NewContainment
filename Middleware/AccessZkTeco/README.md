# ZKTeco Access Control Middleware

Middleware Python untuk mengelola perangkat access control ZKTeco menggunakan library PYZK dengan integrasi MQTT.

## Fitur

### 1. Koneksi Access Control
- Konfigurasi IP dan port dari file JSON
- Multi-device support
- Auto-reconnect functionality
- Connection timeout management

### 2. User Management via MQTT
- Get All Users dari access control
- CRUD operations untuk user (Create, Read, Update, Delete)
- Pengiriman data via MQTT broker

### 3. Card & Fingerprint Registration
- Register kartu akses
- Register fingerprint
- Manajemen template fingerprint
- Integrasi dengan MQTT

### 4. Live Monitoring
- Real-time attendance capture
- Live event monitoring
- MQTT broadcast untuk events

### 5. Management Interface
- GUI berbasis Tkinter
- Real-time response monitoring
- User-friendly interface untuk semua operasi

## Struktur Folder

```
Middleware/AccessZkTeco/
├── JSON/Config/
│   ├── access_control_config.json    # Konfigurasi perangkat
│   └── mqtt_config.json              # Konfigurasi MQTT
├── logs/                             # Log files
├── zkteco_middleware.py              # Main middleware
├── management_interface.py           # GUI interface
├── requirements.txt                  # Dependencies
└── README.md                         # Documentation
```

## Instalasi

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Konfigurasi perangkat di `JSON/Config/access_control_config.json`
3. Konfigurasi MQTT di `JSON/Config/mqtt_config.json`

## Penggunaan

### Menjalankan Middleware
```bash
python zkteco_middleware.py
```

### Menjalankan GUI Management Interface
```bash
python management_interface.py
```

## MQTT Topics

### User Management
- `access_control/zkteco/users/get_all` - Get semua users
- `access_control/zkteco/users/create` - Buat user baru
- `access_control/zkteco/users/update/{user_id}` - Update user
- `access_control/zkteco/users/delete/{user_id}` - Hapus user
- `access_control/zkteco/users/response` - Response dari operasi user

### Fingerprint Management
- `access_control/zkteco/fingerprints/register` - Register fingerprint
- `access_control/zkteco/fingerprints/get_templates/{user_id}` - Get templates
- `access_control/zkteco/fingerprints/response` - Response fingerprint

### Card Management
- `access_control/zkteco/cards/register` - Register kartu
- `access_control/zkteco/cards/response` - Response kartu

### Device Management
- `access_control/zkteco/device/connect/{device_id}` - Koneksi device
- `access_control/zkteco/device/disconnect/{device_id}` - Disconnect device
- `access_control/zkteco/device/response` - Response device

### Live Monitoring
- `access_control/zkteco/attendance/live_capture` - Live attendance
- `access_control/zkteco/attendance/response` - Response attendance

## Format JSON Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "timestamp": "2025-01-01T12:00:00",
  "device_id": "device_001"
}
```

## Contoh Penggunaan MQTT

### Get All Users
Publish ke: `access_control/zkteco/users/get_all`
```json
{
  "device_id": "device_001"
}
```

### Create User
Publish ke: `access_control/zkteco/users/create`
```json
{
  "device_id": "device_001",
  "user_data": {
    "uid": 1,
    "name": "John Doe",
    "privilege": 0,
    "password": "123456",
    "card": 1234567890
  }
}
```

### Register Fingerprint
Publish ke: `access_control/zkteco/fingerprints/register`
```json
{
  "device_id": "device_001",
  "user_id": "1",
  "finger_id": 0
}
```

### Register Card
Publish ke: `access_control/zkteco/cards/register`
```json
{
  "device_id": "device_001",
  "user_id": "1",
  "card_number": "1234567890"
}
```

## Konfigurasi

### Access Control Config (`access_control_config.json`)
```json
{
  "devices": [
    {
      "id": "device_001",
      "name": "Main Entry",
      "ip": "192.168.1.201",
      "port": 4370,
      "timeout": 30,
      "password": "",
      "enabled": true,
      "location": "Main Entrance"
    }
  ],
  "connection_settings": {
    "max_retries": 3,
    "retry_delay": 5,
    "auto_reconnect": true
  }
}
```

### MQTT Config (`mqtt_config.json`)
```json
{
  "broker": {
    "host": "localhost",
    "port": 1883,
    "username": "",
    "password": "",
    "client_id": "zkteco_access_control_middleware"
  },
  "topics": {
    // MQTT topics configuration
  }
}
```

## Troubleshooting

1. **Koneksi gagal ke device**: Periksa IP, port, dan network connectivity
2. **MQTT tidak terkoneksi**: Periksa konfigurasi broker MQTT
3. **User tidak bisa dibuat**: Pastikan UID unik dan device terkoneksi
4. **Fingerprint gagal register**: Pastikan user sudah ada di device

## Log Files

Log disimpan di folder `logs/access_control.log` dengan format:
```
[2025-01-01 12:00:00] - INFO - Message
```

## Dependencies

- **pyzk**: Library untuk komunikasi dengan ZKTeco devices
- **paho-mqtt**: MQTT client library
- **tkinter**: GUI framework (built-in Python)
- **python-dateutil**: Date utilities

## Kompatibilitas

- Python 3.7+
- ZKTeco devices dengan firmware yang didukung PYZK
- MQTT Broker (Mosquitto, HiveMQ, dll.)

## Support

Untuk masalah teknis, periksa:
1. Log files di folder `logs/`
2. Konfigurasi JSON files
3. Network connectivity
4. Device compatibility dengan PYZK library