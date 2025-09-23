# 🐳 NewContainment Docker Setup Guide

Panduan lengkap untuk menjalankan sistem NewContainment menggunakan Docker di Windows dan Linux.

## 📋 Prerequisites

### Windows

- **Docker Desktop for Windows**: [Download](https://www.docker.com/products/docker-desktop)
- **WSL 2** (recommended): Enable WSL 2 in Docker Desktop settings
- **Git**: [Download](https://git-scm.com/downloads)
- **PowerShell** atau **Command Prompt**

### Linux

- **Docker Engine**: Install Docker menggunakan package manager
- **Docker Compose**: Biasanya included dengan Docker Engine
- **Git**: `sudo apt install git` (Ubuntu/Debian)

### System Requirements

- **RAM**: Minimum 4GB, recommended 8GB+
- **Disk Space**: 5GB+ free space
- **CPU**: Multi-core processor recommended

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/AlfiMaulanaA/NewContainment.git
cd NewContainment
```

### 2. Fix Requirements File (Python Middleware)

```bash
# Edit Middleware/requirements.txt to remove incompatible dependencies
# concurrent.futures and typing are built-in Python 3.2+ and should be removed
```

### 3. Start Core Services First

```bash
# Start database and MQTT broker first
docker-compose up -d db mosquitto

# Wait for mosquitto to start properly
docker-compose ps
```

### 4. Start Remaining Services

```bash
# Start middleware and backend
docker-compose up -d middleware backend

# Note: Frontend build may take 15-20 minutes due to Next.js compilation
# Start frontend separately if needed
docker-compose up -d frontend
```

### 5. Wait for Services to Start

```bash
# Check service status
docker-compose ps

# View logs for troubleshooting
docker-compose logs -f mosquitto
docker-compose logs -f backend
```

### 6. Access Application

- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health
- **Frontend**: http://localhost:3000 (when build completes)
- **MQTT Broker**: localhost:1883 (TCP) or localhost:9001 (WebSocket)

## 📁 Project Structure

```
NewContainment/
├── docker-compose.yml      # Main Docker orchestration
├── mosquitto.conf         # MQTT broker configuration
├── Backend/               # .NET 9 API
│   ├── Dockerfile
│   └── .dockerignore
├── Frontend/              # Next.js application
│   ├── Dockerfile
│   └── .dockerignore
├── Middleware/            # Python ZKTeco manager
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .dockerignore
└── nginx/                 # Reverse proxy config
    └── newcontainment.conf
```

## 🏗️ Services Overview

### Core Services

- **mosquitto**: MQTT broker untuk IoT communication
- **backend**: ASP.NET Core API (.NET 9)
- **frontend**: Next.js web application
- **middleware**: Python service untuk access control
- **nginx**: Reverse proxy untuk production deployment

### Supporting Services

- **db**: SQLite database persistence (Alpine Linux container)

## 🔧 Configuration

### Environment Variables

Edit `docker-compose.yml` untuk customize:

```yaml
# Backend configuration
backend:
  environment:
    - ASPNETCORE_ENVIRONMENT=Production
    - MQTT_BROKER_HOST=mosquitto
    - ENABLE_SEED_DATA=true

# Frontend configuration
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=http://localhost:5000
    - NEXT_PUBLIC_MQTT_HOST=localhost
```

### Port Configuration

Default ports (ubah di `docker-compose.yml` jika perlu):

- **80**: Nginx (main application)
- **3000**: Next.js frontend (direct access)
- **5000**: .NET API (direct access)
- **1883**: MQTT broker
- **9001**: MQTT WebSocket

## 💻 Windows Setup

### 1. Install Docker Desktop

1. Download dari [docker.com](https://www.docker.com/products/docker-desktop)
2. Install dengan WSL 2 backend
3. Restart computer setelah install

### 2. Enable WSL 2 (Recommended)

```powershell
# PowerShell sebagai Administrator
wsl --set-default-version 2
wsl --update
```

### 3. Clone and Run

```powershell
# Clone repository
git clone https://github.com/AlfiMaulanaA/NewContainment.git
cd NewContainment

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 4. Access Application

- Buka browser: http://localhost
- Jika tidak bisa akses, coba http://localhost:3000

### Troubleshooting Windows

```powershell
# Check Docker status
docker --version
docker-compose --version

# View detailed logs
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart

# Clean restart
docker-compose down
docker-compose up -d --build
```

## 🐧 Linux Setup

### 1. Install Docker

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# CentOS/RHEL
sudo yum install docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group (optional)
sudo usermod -aG docker $USER
# Logout and login kembali
```

### 2. Clone and Run

```bash
# Clone repository
git clone https://github.com/AlfiMaulanaA/NewContainment.git
cd NewContainment

# Start services
sudo docker-compose up -d

# Check status
sudo docker-compose ps
```

### 3. Access Application

- Buka browser: http://localhost atau http://server-ip
- API: http://localhost/api/health

### Troubleshooting Linux

```bash
# Check Docker status
sudo systemctl status docker

# View logs
sudo docker-compose logs -f backend

# Check port usage
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3000

# Restart services
sudo docker-compose restart

# Clean restart
sudo docker-compose down
sudo docker-compose up -d --build
```

## 🔍 Monitoring & Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mosquitto

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check Service Health

```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Container resource usage
docker stats $(docker-compose ps -q)
```

### Access Containers

```bash
# Backend container
docker-compose exec backend bash

# Frontend container
docker-compose exec frontend sh

# MQTT broker
docker-compose exec mosquitto sh
```

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Backup Data

```bash
# Backup database
docker-compose exec db tar czf /tmp/backup.tar.gz /app/data/
docker cp $(docker-compose ps -q db):/tmp/backup.tar.gz ./backup.tar.gz

# Backup configurations
cp docker-compose.yml docker-compose.yml.backup
```

### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean unused Docker resources
docker system prune -a --volumes
```

## 🚨 Common Issues & Solutions

### Python Middleware Build Issues

```bash
# Error: No matching distribution found for concurrent.futures
# Solution: Remove concurrent.futures and typing from requirements.txt
# These are built-in Python modules since Python 3.2+

# Edit Middleware/requirements.txt to contain only:
paho-mqtt>=1.6.1
pyzk>=0.9
schedule>=1.1.0
```

### MQTT Broker Configuration Issues

```bash
# Error: Unknown configuration variable "max_retained_messages"
# Error: Invalid max_packet_size value (0)
# Solution: Use simplified mosquitto.conf

# Minimal working mosquitto.conf:
listener 1883
allow_anonymous true

listener 9001
protocol websockets
allow_anonymous true

persistence true
persistence_location /mosquitto/data/

log_dest stdout
```

### Frontend Build Issues (Next.js)

```bash
# Error: Failed to load SWC binary for linux/x64
# Solution 1: Use Node.js slim instead of alpine
FROM node:18-slim AS base

# Solution 2: Install compatibility libraries for alpine
RUN apk add --no-cache libc6-compat gcompat

# Build may take 15-20 minutes - be patient!
```

### Port Conflicts

```bash
# Check what's using ports
# Windows
netstat -ano | findstr :80
netstat -ano | findstr :3000

# Linux
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3000

# Change ports in docker-compose.yml
ports:
  - "8080:80"    # Change 80 to 8080
  - "3001:3000"  # Change 3000 to 3001
```

### Permission Issues (Linux)

```bash
# Fix Docker socket permissions
sudo chmod 666 /var/run/docker.sock

# Or add user to docker group
sudo usermod -aG docker $USER
# Logout and login kembali
```

### Memory Issues

```bash
# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory > Increase to 4GB+

# Check container memory usage
docker stats
```

### Database Issues

```bash
# Reset database
docker-compose exec db rm -f /app/data/app.db
docker-compose restart backend

# Check database file
docker-compose exec db ls -la /app/data/
```

### MQTT Connection Issues

```bash
# Check MQTT broker logs
docker-compose logs mosquitto

# Test MQTT connection from host
mosquitto_sub -h localhost -p 1883 -t test

# Test from within container network
docker-compose exec backend ping mosquitto  # May not work on minimal images

# Restart MQTT broker
docker-compose restart mosquitto

# Check network connectivity
docker network inspect newcontainment_newcontainment
```

### Backend MQTT Connection Issues

```bash
# Backend trying to connect to external IP instead of mosquitto hostname
# Check environment variables in docker-compose.yml:
environment:
  - MQTT_BROKER_HOST=mosquitto  # Should be 'mosquitto', not IP address
  - MQTT_BROKER_PORT=1883

# Restart backend after config change
docker-compose restart backend
```

### Container Build Timeouts

```bash
# Build individual services with longer timeout
docker build -t newcontainment-middleware ./Middleware
docker build -t newcontainment-backend ./Backend
docker build --no-cache -t newcontainment-frontend ./Frontend

# Or build with increased timeout
DOCKER_BUILDKIT=0 docker-compose build --build-arg BUILDKIT_INLINE_CACHE=1
```

## 📊 Performance Tuning

### Production Optimizations

```yaml
# docker-compose.yml adjustments
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  frontend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Database Optimization

```bash
# Enable WAL mode for better concurrency
docker-compose exec backend sqlite3 /app/data/app.db "PRAGMA journal_mode=WAL;"

# Optimize database
docker-compose exec backend sqlite3 /app/data/app.db "VACUUM;"
```

## 🔒 Security Considerations

### Production Deployment

1. **Change default passwords** di environment variables
2. **Enable HTTPS** dengan SSL certificate
3. **Configure firewall** untuk restrict access
4. **Use secrets management** untuk sensitive data
5. **Regular updates** untuk base images

### Network Security

```yaml
# Add to docker-compose.yml
networks:
  newcontainment:
    driver: bridge
    internal: true # Isolate from external networks
```

## 📞 Support

### Useful Commands

```bash
# Get service IPs
docker inspect $(docker-compose ps -q backend) | grep IPAddress

# Export logs for support
docker-compose logs > debug.log

# Create support bundle
docker-compose config > compose-config.yaml
docker images > images.txt
```

### Health Checks

- **Application**: http://localhost/health
- **API**: http://localhost/api/health
- **Database**: Check logs untuk SQLite errors
- **MQTT**: Test dengan MQTT client tools

---

## 🎯 Quick Reference

### Start Services (Recommended Order)

```bash
# Start core infrastructure first
docker-compose up -d db mosquitto

# Start application services
docker-compose up -d middleware backend

# Start frontend (may take 15-20 minutes to build)
docker-compose up -d frontend

# Or start all at once (may timeout on slower systems)
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### View Status

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mosquitto
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Update & Rebuild

```bash
git pull && docker-compose up -d --build
```

### Build Individual Services

```bash
# If docker-compose build times out
docker build -t newcontainment-middleware ./Middleware
docker build -t newcontainment-backend ./Backend
docker build -t newcontainment-frontend ./Frontend

# Then start with compose
docker-compose up -d --no-build
```

### Troubleshooting Quick Commands

```bash
# Check service status
docker-compose ps

# View logs for specific issues
docker-compose logs mosquitto | grep -i error
docker-compose logs backend | grep -i error

# Test backend API
curl http://localhost:5000/api/health

# Check network connectivity
docker network inspect newcontainment_newcontainment

# Clean restart
docker-compose down && docker-compose up -d
```

**Happy Dockering! 🐳🚀**
