# Backend Setup & Seed Data Guide

## 🚀 Quick Start

### 1. Run Backend dengan Seed Data
```bash
cd Backend
dotnet run
```

Backend akan otomatis:
- ✅ Create database jika belum ada
- ✅ Run migrations
- ✅ Initialize sensor interval configuration (1min dev / 1hr prod)
- ✅ Seed basic data (users, containments, racks, devices)

## 🌱 Seed Data Configuration

### Environment Variables untuk Seed Control
```bash
# Tambahkan di appsettings.json atau environment variables
SEED_ACCESS_LOG=false          # Default: false (performance)
SEED_SENSOR_DATA=true          # Default: false (enable untuk testing)
ENABLE_SEED_VALIDATION=false   # Default: false (enable untuk debug)
```

### Manual Seed Control
```bash
# Set environment variable sebelum run
set SEED_SENSOR_DATA=true
dotnet run

# Atau via appsettings.json
```

## 📊 Sensor Data Seeding

### Default Behavior
- **Development**: 1-minute intervals, 6 hours data
- **Production**: 1-hour intervals, minimal seed data
- **Sensor Types**: Temperature, Air Flow, Vibration, Dust Sensor, Humidity, Pressure

### Enable Sensor Data Seeding
```bash
# Method 1: Environment Variable
set SEED_SENSOR_DATA=true
dotnet run

# Method 2: Modify OptimizedSeedData.cs
// Change line 30:
{"DeviceSensorData", true} // Enable sensor data seeding
```

### Sample Data Generated
- **6 hours** of historical data
- **1-minute intervals** for development testing
- **Multiple sensor types** with realistic values:
  - Temperature: 18-33°C with humidity
  - Air Flow: 15-50 L/min with pressure
  - Vibration: 3-axis data with magnitude
  - Dust Sensor: 5-50 µg/m³ levels
  - Humidity: 35-80% with temperature
  - Pressure: 990-1020 hPa

## 🔧 Sensor Interval System

### Auto-Initialization
Backend automatically creates sensor interval configuration on startup:

```csharp
// Development Environment
- Interval: 1 minute
- Mode: Debug/Development  
- Save times: 18:00:00, 18:01:00, 18:02:00...

// Production Environment  
- Interval: 1 hour
- Mode: Production
- Save times: 18:00:00, 19:00:00, 20:00:00...
```

### Manual Configuration
```bash
# API Endpoints available:
GET    /api/sensorinterval/global              # Get global config
POST   /api/sensorinterval/global              # Set global interval
GET    /api/sensorinterval/configurations      # Get all configs
POST   /api/sensorinterval/device/{id}         # Set device-specific
```

## 🗄️ Database Operations

### Reset Database
```bash
cd Backend
rm -f app.db          # Delete SQLite database
dotnet run             # Recreate with fresh seed data
```

### Check Seed Data
```bash
# After running, check logs for:
[INFO] Optimized database seeding completed successfully
[INFO] Initialized global sensor interval configuration: X minutes
[INFO] Seeded X sensor data records
```

## 🧪 Testing Setup

### For Development/Testing
```bash
# Enable all seed data
set SEED_SENSOR_DATA=true
set SEED_ACCESS_LOG=true
set ENABLE_SEED_VALIDATION=true
dotnet run
```

### For Production  
```bash
# Minimal seed data (default)
dotnet run
```

## 📝 Seed Data Details

### Core Data (Always Seeded)
- ✅ **Users**: Admin, Developer, User accounts
- ✅ **Containments**: Sample containment areas
- ✅ **Racks**: Equipment racks with positions
- ✅ **Devices**: Sensors, PDUs, other equipment
- ✅ **Maintenance**: Scheduled maintenance tasks
- ✅ **Camera Config**: CCTV configurations
- ✅ **MQTT Configuration**: Message broker setup
- ✅ **Network Configuration**: Network settings
- ✅ **Menu Management**: Navigation structure

### Optional Data (Performance Controlled)
- ⚠️ **Access Logs**: Large datasets (disabled by default)
- ⚠️ **Device Sensor Data**: Historical sensor readings (disabled by default)

### Sensor Data Structure
```json
{
  "timestamp": "2024-01-15T18:00:00.000Z",
  "deviceId": 1,
  "sensorType": "Temperature", 
  "rawPayload": {
    "temp": 25.3,
    "hum": 65.2,
    "timestamp": "2024-01-15T18:00:00.000Z"
  }
}
```

## 🚨 Troubleshooting

### Build Errors
```bash
# If build fails, check:
dotnet restore
dotnet build
dotnet run
```

### Seed Data Issues
```bash
# Enable validation to debug
set ENABLE_SEED_VALIDATION=true
dotnet run

# Check logs for:
- "Found X data integrity issues"
- Seeding completion messages
- Error details
```

### Database Issues
```bash
# Reset completely
rm -f app.db
rm -rf Migrations
dotnet ef migrations add InitialCreate
dotnet run
```

## 🔄 Re-running Seeds

### Behavior
- **Idempotent**: Safe to run multiple times
- **Checks Existing**: Won't duplicate data
- **Updates**: Can update configuration if needed

### Force Fresh Seed
```bash
rm -f app.db          # Delete database
dotnet run             # Recreate everything
```

## ⚡ Performance Notes

- **Sensor Data**: Can be large (6 hours × devices × 1min intervals)
- **Batch Processing**: Uses 50-record batches for performance  
- **Memory Usage**: Monitor during large seed operations
- **Production**: Keep sensor data seeding disabled

## 🔗 Related APIs

After seeding, these endpoints are available:

### Data Management
```bash
GET    /api/devicesensordata                   # Get sensor data
DELETE /api/devicesensordata/all               # Delete all data
DELETE /api/devicesensordata/date-range        # Delete by date range
DELETE /api/devicesensordata/older-than/{days} # Delete old data
```

### Configuration
```bash
GET    /api/sensorinterval/global              # Get interval settings
POST   /api/sensorinterval/global              # Update intervals
```

---

## 🎯 Quick Commands Summary

```bash
# Standard Development Setup
cd Backend
set SEED_SENSOR_DATA=true
dotnet run

# Production Setup
cd Backend  
dotnet run

# Full Reset
cd Backend
rm -f app.db
dotnet run

# Debug Mode
cd Backend
set SEED_SENSOR_DATA=true
set ENABLE_SEED_VALIDATION=true
dotnet run
```

**Happy Coding! 🚀**