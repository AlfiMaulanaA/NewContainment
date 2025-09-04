# Deployment Guide

## 🚀 Deployment Overview

This guide covers the deployment process for the IoT Containment Monitoring System in various environments.

## 📋 Prerequisites

### System Requirements
- **OS:** Windows Server 2019+, Ubuntu 20.04+, or CentOS 8+
- **CPU:** Minimum 2 cores, Recommended 4+ cores
- **RAM:** Minimum 4GB, Recommended 8GB+
- **Storage:** Minimum 20GB, Recommended 50GB+
- **Network:** Stable internet connection, MQTT broker access

### Software Dependencies
- .NET 9 Runtime
- Node.js 18+ Runtime
- SQLite (included)
- IIS or Nginx (for hosting)
- SSL Certificate (for HTTPS)

## 🛠️ Development Deployment

### Local Development
```bash
# Start backend
cd Backend
dotnet run

# Start frontend (new terminal)
cd Frontend  
npm run dev
```

### Docker Development
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./Frontend
    ports:
      - "3000:3000"
  backend:
    build: ./Backend
    ports:
      - "5000:80"
    volumes:
      - ./data:/app/data
```

## 🏭 Production Deployment

### Windows Server (IIS)

1. **Prepare Server**
```powershell
# Install IIS and .NET 9
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ASPNET47
# Install .NET 9 Hosting Bundle
```

2. **Deploy Backend**
```bash
cd Backend
dotnet publish -c Release -o ./publish
# Copy publish folder to IIS wwwroot
```

3. **Deploy Frontend** 
```bash
cd Frontend
npm run build
npm run export
# Copy out folder to IIS static site
```

### Linux Server (Nginx)

1. **Server Setup**
```bash
# Install .NET 9
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y aspnetcore-runtime-9.0

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt-get install nginx
```

2. **Configure Nginx**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐳 Docker Deployment

### Dockerfile - Backend
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY publish/ .
EXPOSE 80
ENTRYPOINT ["dotnet", "Backend.dll"]
```

### Dockerfile - Frontend
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: 
      context: ./Frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
      
  backend:
    build: ./Backend
    ports:
      - "5000:80"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
```

## ☁️ Cloud Deployment

### Azure App Service
```bash
# Install Azure CLI
# Login to Azure
az login

# Create resource group
az group create --name IoTMonitoring --location "East US"

# Create app service plan
az appservice plan create --name IoTMonitoringPlan --resource-group IoTMonitoring --sku B1

# Create web app for backend
az webapp create --resource-group IoTMonitoring --plan IoTMonitoringPlan --name iot-monitoring-api --runtime "DOTNETCORE|9.0"

# Create web app for frontend  
az webapp create --resource-group IoTMonitoring --plan IoTMonitoringPlan --name iot-monitoring-web --runtime "NODE|18-lts"
```

### AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize application
eb init iot-monitoring

# Create environment
eb create production

# Deploy
eb deploy
```

## 🔧 Configuration

### Environment Variables

**Production Backend (appsettings.Production.json):**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=/app/data/production.db"
  },
  "JwtSettings": {
    "SecretKey": "your-production-secret-key",
    "ExpiryMinutes": 60
  },
  "MqttSettings": {
    "BrokerUrl": "your-mqtt-broker",
    "Username": "mqtt-user",
    "Password": "mqtt-password"
  }
}
```

**Production Frontend (.env.production):**
```
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_MQTT_URL=wss://your-mqtt-broker:9001
NEXT_PUBLIC_APP_NAME=IoT Containment System
```

## 📊 Monitoring & Logging

### Application Monitoring
```bash
# Install monitoring tools
npm install -g pm2

# Start with PM2
pm2 start npm --name "iot-frontend" -- start
pm2 start "dotnet Backend.dll" --name "iot-backend"

# Monitor processes
pm2 monit
```

### Log Configuration
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    },
    "File": {
      "Path": "/app/logs/app-.log",
      "RollingInterval": "Day"
    }
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: '9.0.x'
        
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Build and Deploy
      run: |
        # Build backend
        cd Backend
        dotnet publish -c Release
        
        # Build frontend
        cd ../Frontend
        npm ci
        npm run build
        
        # Deploy to server
        # Add deployment scripts here
```

## 🔒 Security Considerations

### SSL/TLS Configuration
- Install SSL certificates
- Configure HTTPS redirects
- Enable HSTS headers
- Use secure headers

### Firewall Settings
- Open ports 80, 443 for web traffic
- Open MQTT broker ports as needed
- Restrict database access
- Enable fail2ban for SSH protection

## 📋 Post-Deployment Checklist

- [ ] Backend API is accessible
- [ ] Frontend loads correctly
- [ ] Database connection works
- [ ] MQTT connectivity established
- [ ] SSL certificates installed
- [ ] User authentication functional
- [ ] Real-time features working
- [ ] Monitoring systems active
- [ ] Backup procedures in place
- [ ] Log rotation configured

## 🆘 Troubleshooting

### Common Issues
- **503 Service Unavailable:** Check .NET runtime installation
- **Connection refused:** Verify firewall and port settings
- **Database errors:** Check file permissions and path
- **MQTT connection issues:** Verify broker configuration
- **SSL certificate errors:** Check certificate validity and configuration

### Support Resources
- Check application logs
- Review system event logs  
- Monitor resource usage
- Contact technical support team
