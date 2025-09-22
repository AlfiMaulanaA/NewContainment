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

### 2. Start All Services

```bash
# Windows (PowerShell/Command Prompt)
docker-compose up -d

# Linux
sudo docker-compose up -d
```

### 3. Wait for Services to Start

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access Application

- **Main Application**: http://localhost
- **API Documentation**: http://localhost/api/swagger
- **Health Check**: http://localhost/health

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
# Check MQTT broker
docker-compose logs mosquitto

# Test MQTT connection
docker-compose exec mosquitto mosquitto_sub -h localhost -t test

# Restart MQTT broker
docker-compose restart mosquitto
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

### Start Services

```bash
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
docker-compose logs -f
```

### Restart Services

```bash
docker-compose restart
```

### Update & Rebuild

```bash
git pull && docker-compose up -d --build
```

**Happy Dockering! 🐳🚀**
