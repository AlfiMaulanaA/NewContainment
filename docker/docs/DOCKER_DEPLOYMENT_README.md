# 🚀 NewContainment Docker Production Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying the NewContainment IoT Containment Monitoring System using Docker containers. The deployment is production-ready with proper security, monitoring, and scalability features.

## 📁 Docker Project Structure

```
NewContainment/
├── docker/                          # 🐳 Docker deployment folder
│   ├── docker-compose.yml          # Docker Compose orchestration
│   ├── configs/                    # Configuration files
│   │   ├── nginx.conf             # Nginx reverse proxy config
│   │   ├── mosquitto.conf         # MQTT broker config
│   │   ├── dynamic-security.json  # MQTT ACLs & security
│   │   └── ssl/                   # SSL certificates (optional)
│   ├── images/                     # Docker image definitions
│   │   ├── frontend/Dockerfile     # Next.js frontend
│   │   ├── backend/Dockerfile      # ASP.NET Core backend
│   │   └── middleware/Dockerfile   # Python middleware
│   ├── scripts/                    # Deployment scripts
│   │   └── deploy-docker.sh       # Main deployment script
│   ├── env/                        # Environment templates
│   │   └── .env.example           # Environment variables template
│   └── docs/                       # Documentation
│       └── DOCKER_DEPLOYMENT_README.md
├── Frontend/                       # Source code
├── Backend/
├── Middleware/
├── Backend/
├── script/                        # Legacy scripts (deprecated)
│   ├── deploy.sh
│   ├── pull_github.sh
│   ├── setup_features.sh
│   └── setup-dummy-sensor.sh
└── deploy-docker.sh                # Symlink to docker/scripts/deploy-docker.sh
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Browser                              │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼ [Port 80/443]
            ┌─────────────┐
            │   Nginx     │ ← Reverse Proxy & Load Balancer
            │  (Alpine)   │
            └─────┬───────┘
                  │
                  ▼ [Internal Docker Network]
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │  Frontend   │     │   Backend   │     │  Middleware │
            │  Next.js    │◄───►│ .NET Core   │◄───►│ Python +    │
            │  (Port 3000)│     │ (Port 5000) │     │   ZKTeco    │
            └─────────────┘     └─────────────┘     └─────────────┘
                  ▲                   ▲                   ▲
                  │                   │                   │
                  └───────────────────┼───────────────────┘
                                    ▼
                            ┌─────────────┐
                            │  Mosquitto  │ ← MQTT Broker
                            │  (Port 1883)│
                            └─────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Persistent Volumes                           │
│  • newcontainment-data: SQLite database                            │
│  • newcontainment-logs: Application logs                          │
│  • mosquitto-data: MQTT persistence                               │
│  • middleware-config: ZKTeco device configuration                │
└─────────────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### System Requirements
- **Ubuntu/Debian 20.04+** or **Raspberry Pi OS**
- **Docker 20.10+** with Docker Compose
- **2GB RAM minimum** (4GB recommended)
- **10GB free disk space**
- **Internet connection** for initial setup

### Install Docker
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Restart session
newgrp docker
```

## 🚀 Quick Start Deployment

### 1. Clone and Setup
```bash
# Clone repository
git clone https://github.com/your-org/NewContainment.git
cd NewContainment

# Setup environment
cp .env.example.docker .env

# Edit environment file with secure values
nano .env  # Change JWT_SECRET, MQTT credentials, etc.
```

### 2. Deploy with One Command
```bash
# Make deployment script executable and run
chmod +x deploy-docker.sh
sudo ./deploy-docker.sh --production
```

### 3. Access Application
```bash
# Get server IP
hostname -I | awk '{print $1}'

# Access URLs:
# Main Application: http://YOUR_SERVER_IP
# Direct Frontend:  http://YOUR_SERVER_IP:3000
# API Backend:      http://YOUR_SERVER_IP:5000
# API Docs:         http://YOUR_SERVER_IP:5000/swagger
```

## ⚙️ Detailed Configuration

### Environment Variables

Edit `.env` file with your production values:

```bash
# Application Settings
APP_NAME=IoT Containment System
APP_VERSION=1.0.0

# Security (CRITICAL: Change these!)
JWT_SECRET=YOUR_SECURE_RANDOM_JWT_SECRET_HERE
MQTT_USERNAME=containment_prod
MQTT_PASSWORD=YOUR_SECURE_MQTT_PASSWORD

# Database (handled by Docker volumes)
# No configuration needed - SQLite auto-configured

# Optional Features
DEVICE_COUNT=5          # Number of test devices
UPDATE_INTERVAL=15      # Sensor update interval (seconds)
```

### Generate Secure Secrets

```bash
# Generate JWT Secret (64 characters)
openssl rand -base64 64 | tr -d "=+/" | cut -c1-64

# Generate MQTT Password
openssl rand -hex 16
```

## 🎯 Deployment Options

### Production Deployment (Port 80)
```bash
# Full production deployment with nginx reverse proxy
sudo ./deploy-docker.sh --production
```

### Testing Deployment (With Dummy Sensors)
```bash
# Include dummy sensors for development/testing
sudo ./deploy-docker.sh --testing
```

### Force Rebuild
```bash
# Force rebuild all images (--no-cache)
sudo ./deploy-docker.sh --build
```

## 🐳 Docker Services Explained

### 1. **Nginx Reverse Proxy**
- **Purpose**: Load balancing, SSL termination, security headers
- **Port**: 80 (HTTP), 443 (HTTPS-ready)
- **Configuration**: `nginx/nginx.prod.conf`
- **Features**: Rate limiting, CORS, WebSocket support

### 2. **Frontend (Next.js)**
- **Base Image**: `node:20-alpine`
- **Build**: Multi-stage (deps → builder → runner)
- **Features**: Production optimized, telemetry disabled
- **Health Check**: `/api/health`

### 3. **Backend (.NET Core)**
- **Framework**: ASP.NET Core 9.0
- **Database**: SQLite (persistent volume)
- **Features**: JWT auth, MQTT integration, Swagger API
- **Health Check**: `/health`

### 4. **Mosquitto MQTT Broker**
- **Version**: 2.0 with SSL support
- **Ports**: 1883 (MQTT), 8883 (MQTTS-ready), 9001 (WebSocket)
- **Persistence**: Retained messages, client sessions
- **Security**: User authentication required

### 5. **Middleware (Python + ZKTeco)**
- **Purpose**: Biometric device integration
- **Libraries**: PyZK, paho-mqtt, flask
- **Features**: Real-time access monitoring
- **Devices**: USB ZKTeco fingerprint readers

## 🔧 Management Commands

### Service Management
```bash
# Check status
sudo ./deploy-docker.sh --status

# View logs (all services)
sudo ./deploy-docker.sh --logs

# View specific service logs
sudo ./deploy-docker.sh --logs frontend
sudo ./deploy-docker.sh --logs backend

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Scaling Services
```bash
# Scale frontend instances
docker-compose up -d --scale frontend=3

# Scale backend instances (requires load balancer)
docker-compose up -d --scale backend=2
```

### Updates & Rollback
```bash
# Update all images and redeploy
docker-compose pull && docker-compose up -d

# Rollback to previous deployment
sudo ./deploy-docker.sh --rollback
```

### Cleanup
```bash
# Clean containers and networks (preserve volumes)
sudo ./deploy-docker.sh --cleanup

# Complete cleanup including volumes (DESTROY DATA!)
docker-compose down -v
docker system prune -a
```

## 🔍 Monitoring & Troubleshooting

### Health Checks
```bash
# Check all services health
curl -s http://localhost/health

# Check individual services
curl -s http://localhost:3000/api/health  # Frontend
curl -s http://localhost:5000/health     # Backend
```

### Resource Monitoring
```bash
# Container resource usage
docker stats

# System resource usage
htop
docker system df
```

### Debug Logging
```bash
# Enable debug logging for .NET
echo "LOG_LEVEL=Debug" >> .env
docker-compose restart backend

# MQTT message debugging
docker-compose logs -f mosquitto
```

### Common Issues

#### **Port 80 Already in Use**
```bash
# Stop conflicting service
sudo systemctl stop apache2 nginx
docker-compose up -d
```

#### **USB Device Permission Denied**
```bash
# Add user to dialout group
sudo usermod -aG dialout $USER
# Restart session
```

#### **Out of Memory**
```bash
# Check memory usage
docker stats
# Increase system memory or reduce container limits
```

## 🔐 Security Considerations

### Production Security Checklist
- [ ] Change all default passwords
- [ ] Use strong JWT secrets (64+ characters)
- [ ] Configure SSL certificates
- [ ] Restrict network access (firewall)
- [ ] Enable fail2ban
- [ ] Regular security updates
- [ ] Monitor access logs

### SSL Configuration (Optional)
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates
cp /path/to/cert.pem nginx/ssl/
cp /path/to/key.pem nginx/ssl/

# Uncomment SSL configuration in docker-compose.yml
# Uncomment SSL server block in nginx.conf
docker-compose restart nginx
```

## 📊 Performance Tuning

### Resource Limits
```yaml
# In docker-compose.yml, adjust as needed
deploy:
  resources:
    limits:
      cpus: '0.75'
      memory: 1G
    reservations:
      cpus: '0.50'
      memory: 512M
```

### Database Optimization
```bash
# SQLite WAL mode for better performance
docker-compose exec backend \
  sqlite3 /app/data/app.db "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;"
```

### MQTT Performance
```bash
# Adjust Mosquitto configuration
max_connections 10000
max_queued_messages 1000
message_size_limit 268435455
```

## 🔄 Backup & Migration

### Automated Backups
```bash
# Database backup script
docker-compose exec backend \
  sqlite3 /app/data/app.db ".backup '/backup/containment_$(date +%Y%m%d_%H%M%S).db'"

# Configuration backup
docker run --rm -v newcontainment_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/config_backup.tar.gz -C / data
```

### Migration to PostgreSQL (Future)
```bash
# When switching to PostgreSQL
docker-compose down
# Modify docker-compose.yml to include postgres service
# Migrate data using dotnet ef tools
docker-compose up -d
```

## 🌐 Networking

### Custom Network Configuration
```yaml
# Custom bridge network with specific subnet
networks:
  newcontainment-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
        - gateway: 172.20.0.1
```

### External Access
```bash
# Port forwarding for external access
iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination $(hostname -I | awk '{print $1}'):80
iptables -t nat -A POSTROUTING -j MASQUERADE
```

## 📚 API Documentation

### Backend API
- **Swagger UI**: http://localhost:5000/swagger
- **Health Check**: http://localhost:5000/health
- **API Base**: http://localhost:5000/api

### Frontend Development
- **Development Server**: http://localhost:3000
- **Production Build**: Static files served via Nginx

## 🚨 Production Checklist

Before going live:

- [ ] Environment variables configured securely
- [ ] JWT secrets generated (64+ characters)
- [ ] Database backups working
- [ ] SSL certificates installed (optional)
- [ ] Firewall configured
- [ ] Monitoring and alerting set up
- [ ] Log rotation configured
- [ ] Resource limits appropriate for server
- [ ] Backup strategy implemented
- [ ] Emergency rollback procedures documented

## 📞 Support & Documentation

- **Project Repository**: https://github.com/your-org/NewContainment
- **Docker Hub**: Search for `newcontainment/*`
- **Issues**: Use GitHub Issues for bug reports
- **Wiki**: Project documentation

---

## 🎯 Quick Commands Summary

| Command | Description |
|---------|-------------|
| `./deploy-docker.sh` | Standard deployment |
| `./deploy-docker.sh --production` | Production with port 80 |
| `./deploy-docker.sh --testing` | Include dummy sensors |
| `./deploy-docker.sh --status` | Show deployment status |
| `./deploy-docker.sh --logs` | Show all logs |
| `docker-compose logs -f` | Follow live logs |
| `docker-compose restart` | Restart all services |
| `docker-compose down` | Stop deployment |
| `docker system prune` | Clean unused resources |

**Happy Deploying! 🚀**
