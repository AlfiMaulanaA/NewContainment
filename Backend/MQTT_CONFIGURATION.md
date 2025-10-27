# MQTT Configuration Guide

## Overview

Sistem MQTT telah dibersihkan dan disederhanakan untuk menghilangkan konfigurasi hardcode di `appsettings.json`. Sekarang hanya ada **2 sumber konfigurasi**:

1. **Database Configuration** - Konfigurasi yang disimpan di database (prioritas tertinggi)
2. **Environment Variables** - Variabel environment dengan logika pintar

## Environment Detection

Sistem secara otomatis mendeteksi environment menggunakan .NET built-in `IWebHostEnvironment`:

- **Development**: Saat menjalankan `dotnet run` atau dari IDE
- **Production**: Saat aplikasi di-publish dan dijalankan di server production

## MQTT Broker Selection Logic

### Database Configuration Mode
Jika ada konfigurasi aktif di database dan `UseEnvironmentConfig = false`:
```
Gunakan broker host dari database configuration
```

### Environment Configuration Mode
Jika `UseEnvironmentConfig = true` atau tidak ada database config:

#### Development Environment
```
1. Gunakan MQTT_BROKER_HOST dari environment variable
2. Jika tidak ada, gunakan default "localhost"
```

#### Production Environment
```
1. Otomatis gunakan hostname server (Environment.MachineName)
2. Log: "PRODUCTION environment detected. Using server hostname 'SERVER01' as MQTT broker"
```

## Environment Variables

```bash
# Core MQTT Settings
MQTT_ENABLE=true
MQTT_BROKER_HOST=192.168.0.138    # Hanya digunakan di Development
MQTT_BROKER_PORT=1883
MQTT_CLIENT_ID=ContainmentSystem
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_USE_TLS=false

# Advanced Settings
MQTT_KEEP_ALIVE_INTERVAL=60
MQTT_RECONNECT_DELAY=5
MQTT_TOPIC_PREFIX=containment

# WebSocket (Optional)
MQTT_USE_WEBSOCKET=false
MQTT_WEBSOCKET_URI=
MQTT_WEBSOCKET_PATH=/mqtt
```

## Deployment Scenarios

### Development (dotnet run)
```
✅ Environment: Development
✅ MQTT Broker: Dari MQTT_BROKER_HOST atau "localhost"
✅ Ideal untuk testing dengan external MQTT broker
```

### Production (published)
```
✅ Environment: Production  
✅ MQTT Broker: Otomatis gunakan hostname server
✅ Ideal untuk deployment di server dengan local MQTT broker
```

### Staging
```
✅ Environment: Staging
✅ MQTT Broker: Dari MQTT_BROKER_HOST atau default
✅ Mengikuti aturan non-production
```

## Logging Output

```
=== MQTT Configuration Analysis ===
Environment: Production (Production: True, Development: False)
Server Hostname: SERVER01
PRODUCTION environment detected. Using server hostname 'SERVER01' as MQTT broker
=== FINAL MQTT CONFIGURATION ===
Source: Environment/Defaults
Host: SERVER01
Port: 1883
Enabled: True
```

## Migration dari AppSettings

❌ **Dihapus**: Semua konfigurasi MQTT dari `appsettings.json`
❌ **Dihapus**: Fallback ke AppSettings di `GetFallbackValue()`
✅ **Ditambah**: Deteksi environment otomatis
✅ **Ditambah**: Hostname otomatis untuk production

## Best Practices

1. **Development**: Set `MQTT_BROKER_HOST` di `.env` untuk broker eksternal
2. **Production**: Pastikan MQTT broker terinstall di server yang sama
3. **Database Config**: Gunakan untuk konfigurasi spesifik per deployment
4. **Environment Config**: Gunakan untuk auto-detection hostname di production

## Troubleshooting

### "Cannot connect to MQTT broker" di Production
```bash
# Pastikan MQTT broker berjalan di server
sudo systemctl status mosquitto

# Cek hostname server
hostname

# Cek log aplikasi untuk melihat broker yang digunakan
tail -f /var/log/containment/app.log
```

### Development tidak connect ke broker eksternal
```bash
# Pastikan MQTT_BROKER_HOST di .env
echo $MQTT_BROKER_HOST

# Test koneksi manual
mosquitto_pub -h $MQTT_BROKER_HOST -p 1883 -t test -m "hello"
```