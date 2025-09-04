# NewContainment Deployment Guide

## Overview
Panduan deployment untuk aplikasi NewContainment IoT Monitoring System di server Linux.

## Prerequisites
- Ubuntu/Debian Linux server
- Root atau sudo access
- Internet connection

## Deployment Script

Script `deploy.sh` akan otomatis:

### 1. ✅ Dependency Check & Installation
- **Node.js** (LTS version) untuk frontend
- **.NET 9** untuk backend 
- **Nginx** untuk reverse proxy
- **PM2** untuk process management

### 2. 🚀 Frontend Deployment
- Install dependencies dengan `npm install`
- Build production dengan `npm run build`  
- Deploy dengan PM2 sebagai `newcontainment-frontend`

### 3. 🏗️ Backend Build
- Build backend untuk Linux x64
- Self-contained deployment ke folder `publish`
- Set executable permissions

### 4. ⚙️ Systemd Service
- Copy file `NewContainmentWeb.service` ke `/etc/systemd/system/`
- Enable auto-start service
- Daemon reload

## Usage

### Menjalankan Deployment

```bash
# 1. Clone repository
git clone <repository-url>
cd NewContainment

# 2. Buat script executable
chmod +x deploy.sh

# 3. Jalankan deployment (memerlukan sudo)
./deploy.sh
```

### Manual Commands

```bash
# Check status layanan
sudo systemctl status NewContainmentWeb.service

# Start/Stop/Restart layanan
sudo systemctl start NewContainmentWeb.service
sudo systemctl stop NewContainmentWeb.service  
sudo systemctl restart NewContainmentWeb.service

# Check PM2 processes
pm2 list
pm2 logs newcontainment-frontend
pm2 restart newcontainment-frontend
```

## Service Configuration

File `NewContainmentWeb.service` menggunakan konfigurasi:
- **ExecStart**: `/home/containment/NewContainment/Backend/publish/Backend`
- **WorkingDirectory**: `/home/containment/NewContainment/Backend/publish`
- **User**: System default (dapat diubah sesuai kebutuhan)

## Port Configuration

- **Frontend**: Port 3000 (Next.js)
- **Backend API**: Port 5000 (ASP.NET Core)
- **Swagger**: http://localhost:5000/swagger

## Environment Variables

Backend mendukung environment variables:
- `ASPNETCORE_ENVIRONMENT=Production`
- `JWT_SECRET_KEY` untuk keamanan
- `MQTT_ENABLE` untuk MQTT functionality
- `ENABLE_SEED_DATA` untuk data seeding

## Troubleshooting

### Backend Issues
```bash
# Check logs
sudo journalctl -u NewContainmentWeb.service -f

# Check if port is in use
sudo netstat -tulpn | grep :5000
```

### Frontend Issues  
```bash
# Check PM2 logs
pm2 logs newcontainment-frontend

# Restart frontend
pm2 restart newcontainment-frontend
```

### Permission Issues
```bash
# Fix executable permissions
chmod +x /home/containment/NewContainment/Backend/publish/Backend

# Check service file permissions
ls -la /etc/systemd/system/NewContainmentWeb.service
```

## Security Notes

⚠️ **Production Security**:
- Ubah default JWT secret key
- Configure firewall untuk port yang diperlukan
- Set proper user permissions
- Enable HTTPS dengan SSL certificate
- Regular security updates

## Post-Deployment

Setelah deployment berhasil:

1. **Verify Services**:
   - Frontend: http://server-ip:3000
   - Backend API: http://server-ip:5000
   - Swagger: http://server-ip:5000/swagger

2. **Configure Nginx** (opsional):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Setup SSL** (recommended):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx
   ```

## Script Features

### ✅ Completed Features
- [x] Dependency checking & auto-installation
- [x] Frontend build & PM2 deployment  
- [x] Backend Linux build configuration
- [x] Systemd service management
- [x] Status monitoring & logging
- [x] Error handling & rollback
- [x] Colored output & progress tracking

### 🔄 Monitoring Commands
```bash
# Real-time status monitoring
watch -n 2 'systemctl status NewContainmentWeb.service --no-pager && echo "---" && pm2 list'

# Log monitoring
tail -f /var/log/syslog | grep newcontainment
```

---

**Created by**: Claude Code Assistant  
**Last Updated**: $(date)  
**Version**: 1.0