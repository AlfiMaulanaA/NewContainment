# Environment Configuration Guide

Dokumen ini menjelaskan konfigurasi environment yang telah dibuat untuk project NewContainment.

## 📁 File Environment Yang Dibuat

### 1. Backend Environment Files

#### `Backend/.env` - Production Environment
```bash
# Konfigurasi untuk Docker production deployment
MQTT_BROKER_HOST=mosquitto
ConnectionStrings__DefaultConnection=Data Source=/app/data/app.db
ASPNETCORE_ENVIRONMENT=Production
```

#### `Backend/.env.development` - Development Environment
```bash
# Konfigurasi untuk local development
MQTT_BROKER_HOST=localhost
ConnectionStrings__DefaultConnection=Data Source=app_dev.db
ASPNETCORE_ENVIRONMENT=Development
```

### 2. Frontend Environment Files

#### `Frontend/.env` - Development Environment
```bash
# Konfigurasi untuk Next.js development
NEXT_PUBLIC_API_BASE_URL="http://localhost:5000"
NEXT_PUBLIC_MQTT_HOST="localhost"
NEXT_PUBLIC_MQTT_PORT="9001"
NODE_ENV="development"
```

#### `Frontend/.env.production` - Production Environment
```bash
# Konfigurasi untuk Docker production
NEXT_PUBLIC_API_BASE_URL="http://backend:5000"
NEXT_PUBLIC_MQTT_HOST="mosquitto"
NEXT_PUBLIC_MQTT_PORT="9001"
NODE_ENV="production"
```

### 3. Middleware Configuration Files

#### `Middleware/JSON/mqtt_config.json` - MQTT Configuration
```json
{
  "mqtt": {
    "broker": "mosquitto",
    "port": 1883,
    "client_id": "zkteco_device_manager_NewContainment"
  }
}
```

#### `Middleware/JSON/access_control_config.json` - Device Configuration
```json
{
  "devices": [
    {
      "id": "device_1",
      "name": "Main Entrance ZKTeco Device",
      "ip": "192.168.1.100",
      "port": 4370,
      "enabled": true
    }
  ],
  "settings": {
    "master_device_id": "device_1",
    "auto_sync_enabled": true
  }
}
```

## 🚀 Penggunaan Environment

### Development Setup
```bash
# 1. Copy environment files
cp Backend/.env.development Backend/.env
cp Frontend/.env Frontend/.env

# 2. Start services locally
docker-compose -f docker-compose.dev.yml up
```

### Production Deployment
```bash
# 1. Environment files sudah ter-siap (production)
# 2. Build dan deploy
docker-compose up -d

# 3. Atau menggunakan script deployment
./script/deploy.sh
```

## 🔧 Konfigurasi Utama

### MQTT Communication
- **Development**: `localhost:1883` (Native MQTT)
- **Production**: `mosquitto:1883` (Docker container)

### Database
- **Development**: `app_dev.db` (SQLite local)
- **Production**: `/app/data/app.db` (Persistent volume)

### API Endpoints
- **Backend API**: `http://localhost:5000` (dev) / `http://backend:5000` (prod)
- **Frontend**: `http://localhost:3000` (dev)
- **Nginx Proxy**: `http://localhost:80` (prod)

### Device Management
- **Master Device**: Device ID `device_1`
- **Auto Sync**: Aktif setiap 1 jam
- **Health Monitoring**: Aktif dengan interval 3 detik

## ⚠️ Important Notes

1. **Security**: Ganti JWT secret key di production!
2. **Network**: Update device IP addresses sesuai setup jaringan
3. **MQTT**: Pastikan Mosquitto service running
4. **Database**: Backup data sebelum deploy production

## 🔄 Switching Environments

```bash
# Switch to development
cp Backend/.env.development Backend/.env
cp Frontend/.env Frontend/.env

# Switch to production
cp Backend/.env.production Backend/.env  # (create if needed)
cp Frontend/.env.production Frontend/.env
```

---

## 📝 Default Users

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password123 | Admin |
| dev@example.com | password123 | Developer |
| user@example.com | password123 | User |

## 🔑 JWT Configuration

- **Development**: `DevelopmentModeSecretKeyThatIsSecureForDevelopmentPurposesOnly!`
- **Production**: `YourSuperSecretKeyThatMustBeAtLeast256BitsLongForSecurityPurposes-NewContainment2025!`

**Always change the production JWT secret before deployment!**
