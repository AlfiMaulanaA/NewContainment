# Port Configuration & URL Standardization

## Standard Ports Configuration

| Service | Development | Production | Protocol | Description |
|---------|-------------|------------|-----------|-------------|
| Backend API (HTTP) | 5000 | 5000 | HTTP | Main REST API endpoint |
| Backend API (HTTPS) | 5001 | 5001 | HTTPS | Secure REST API endpoint |
| Frontend | 3000 | 3000 | HTTP/HTTPS | Next.js application |
| MQTT WebSocket (HTTP) | 9000 | 9000 | WebSocket | MQTT bridge for browsers |
| MQTT WebSocket (HTTPS) | 9001 | 9001 | WSS | Secure MQTT bridge |
| MQTT Broker | 1883 | 1883 | TCP | Native MQTT protocol |

## Environment Configuration

### Development Mode
- **Backend**: `http://localhost:5000`
- **Frontend**: `http://localhost:3000`
- **MQTT WS**: `ws://localhost:9000`
- **Swagger**: Enabled at `/swagger`
- **CORS**: Permissive for development

### Production Mode
- **Backend**: `http://{hostname}:5000` or HTTPS equivalent
- **Frontend**: `http://{hostname}:3000` or HTTPS equivalent  
- **MQTT WS**: `ws://{hostname}:9000` or WSS equivalent
- **Swagger**: Disabled for security
- **CORS**: Restricted to specific origins

## Running the Application

### Development
```bash
# Backend
cd Backend
dotnet run --launch-profile http

# Frontend
cd Frontend
npm run dev
```

### Production

#### Backend Production Deployment
```bash
# Build and publish
cd Backend
.\build-production.bat    # Windows
# or ./build-production.sh  # Linux/macOS

# Run production server
cd publish
.\run-production.bat      # Windows  
# or ./run-production.sh    # Linux/macOS
```

#### Frontend Production Deployment (Static Export - Recommended)
```bash
# Build static files
cd Frontend
.\build-static.bat         # Will prompt for backend server IP

# Serve locally for testing
.\serve-production.bat

# Deploy to server
# Copy 'out' folder to your web server document root
```

#### Manual Production Steps
```bash
# Backend - Manual steps
cd Backend
dotnet publish --configuration Release --output ./publish
cd publish
set ASPNETCORE_ENVIRONMENT=Production
dotnet Backend.dll

# Frontend - Manual steps  
cd Frontend
set NODE_ENV=production
set NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP:5000
set NEXT_PUBLIC_MQTT_BROKER_URL=ws://YOUR_SERVER_IP:9000
npx next build
# Copy 'out' folder to web server
```

## Environment Variables

### Backend (.NET)
- `ASPNETCORE_ENVIRONMENT`: `Development` | `Production`
- `JWT_SECRET_KEY`: Override default JWT secret
- `JWT_ISSUER`: JWT issuer for authentication
- `JWT_AUDIENCE`: JWT audience for authentication
- `MQTT_ENABLE`: `true` | `false` - Enable/disable MQTT service

### Frontend (Next.js)
- `NODE_ENV`: `development` | `production`
- `NEXT_PUBLIC_API_BASE_URL`: Backend API base URL
- `NEXT_PUBLIC_MQTT_BROKER_URL`: MQTT WebSocket URL

## Configuration Files

### Backend
- `appsettings.json` - Base configuration
- `appsettings.Development.json` - Development overrides
- `appsettings.Production.json` - Production overrides
- `Properties/launchSettings.json` - Launch profiles

### Frontend
- `.env.local` - Development environment variables
- `.env.production` - Production environment variables
- `lib/config.ts` - Dynamic configuration logic

## Troubleshooting

### "Connection Refused" Error
1. **Backend not running**: Ensure backend is running on correct port (5000)
2. **Firewall blocking**: Check if firewall is blocking the port
3. **Wrong IP/hostname**: Verify you used correct server IP when building frontend
4. **Environment variables**: Ensure production build was done with correct backend URL
5. **Frontend-Backend mismatch**: 
   - If backend runs on `192.168.1.100:5000`
   - Frontend must be built with `NEXT_PUBLIC_API_BASE_URL=http://192.168.1.100:5000`
   - Use build scripts that prompt for server IP

**Solution**: Rebuild frontend with correct backend IP:
```bash
cd Frontend
.\build-static.bat  # Enter your backend server IP when prompted
# Then copy 'out' folder to your web server
```

### Production Deployment Issues
1. **Silent startup**: Application appears to start but no server response
   - Check `ASPNETCORE_ENVIRONMENT=Production` is set
   - Verify logging configuration in `appsettings.Production.json`
   - Look for startup logs showing "Server Ready"

2. **Entity Framework Warnings**: Now resolved with sentinel values
   - `UserRole.None` as sentinel for User role enum
   - `CctvResolution.Unknown` as sentinel for CCTV resolution enum

### MQTT Connection Issues
1. Verify MQTT broker is running on port 1883
2. Check MQTT WebSocket bridge is available on port 9000
3. For WSS, ensure SSL certificates are properly configured

### CORS Issues
1. Development: Should work with AllowAll policy
2. Production: Add your domain to AllowedOrigins in appsettings.Production.json