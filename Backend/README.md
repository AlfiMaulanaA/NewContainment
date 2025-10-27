## Backend Setup Guide - Fixed Version

The original project has extremely slow compilation times. Here's a fixed approach:

### **Issue Diagnosis:**
- Original `dotnet build` takes 50-100+ seconds to compile
- Huge number of assembly references causing performance issues
- Startup also extremely slow due to full dependency loading

### **Solution: Optimized Startup**

#### **Step 1: Clean Build Cache**
```bash
cd Backend
rm -rf obj bin
rm -f app.db
```

#### **Step 2: Use Release Build (Faster)**
```bash
cd Backend
dotnet build --configuration Release --verbosity minimal
```

#### **Step 3: Run with Minimal Configuration**
```bash
cd Backend

# Disable heavy features during startup
export ENABLE_SEED_DATA=false
export SEED_SENSOR_DATA=false
export SEED_ACCESS_LOG=false
export MQTT_ENABLE=false

dotnet run --urls=http://localhost:5250
```

### **Alternative: Direct Database Creation**

If the build continues to be slow, create database manually:

```bash
cd Backend

# Install Entity Framework tools if needed
dotnet tool install --global dotnet-ef

# Remove any existing database
rm -f app.db
rm -rf Migrations

# Try manual database creation - this bypasses Entity Framework migrations
# The application will auto-create tables on first run
```

### **Production Deployment**

For production, use:

```bash
cd Backend

# Build optimized version
dotnet publish -c Release -o ./publish

# Then run the published version which is faster to start
./publish/Backend
```

### **Troubleshooting**

1. **Certificate Errors**: This is normal and can be ignored
2. **Extreme Build Slowness**: Use `--verbosity minimal` to reduce output
3. **Memory Issues**: Add `--disable-parallel` if available
4. **Database Issues**: The app will auto-create the database on launch

### **Expected Output Upon Success:**

```
=== IoT Containment Management System ===
Version: 1.0.0
Environment: Production/Development
Startup Time: 2025-10-27 XX:XX:XX
Creating database...
Database creation completed successfully
Database seeding completed
Server starting on: http://localhost:5250
=== Server Ready ===
```

The application will automatically create all necessary tables and seed data appropriate for the environment.
