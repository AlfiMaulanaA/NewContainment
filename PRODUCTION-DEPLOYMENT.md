# 🚀 Production Deployment Guide

NewContainment IoT System production deployment dengan akses port 80.

## 📋 Quick Start

### Standard Deployment (Development)
```bash
sudo ./deploy.sh
```
- Frontend: http://server-ip:3000
- Backend: http://server-ip:5000

### Production Deployment (Port 80)
```bash
sudo ./deploy.sh --production
```
atau
```bash
sudo ./deploy.sh -p
```
- **Main Application**: http://server-ip (port 80)
- API: http://server-ip/api
- Health Check: http://server-ip/health

## 🔧 What Production Mode Does

1. **🌐 Nginx Reverse Proxy Setup**
   - Configures Nginx to serve on port 80
   - Routes `/api/*` to backend (port 5000)  
   - Routes all other requests to frontend (port 3000)
   - Adds security headers and gzip compression

2. **🔒 Security Enhancements**
   - Generates secure JWT secret key
   - Updates CORS settings for production
   - Adds security headers (X-Frame-Options, etc.)

3. **⚙️ Production Environment**
   - Uses production environment variables
   - Optimizes configurations for production use
   - Sets up proper logging and monitoring

## 📁 Files Created/Modified

### Nginx Configuration
- `nginx/newcontainment.conf` - Nginx configuration for port 80
- Installed to `/etc/nginx/sites-available/newcontainment`

### Backend Configuration  
- `Backend/appsettings.Production.json` - Updated with secure JWT key
- CORS settings updated for production

### Frontend Configuration
- `Frontend/.env.production` - Production environment variables
- Dynamic API base URL for production

## 🔍 Verification Commands

### Check Service Status
```bash
# All services status
systemctl status nginx
systemctl status NewContainmentWeb.service  
pm2 list

# Port check
netstat -tuln | grep -E ":(80|3000|5000)"
```

### Test Access
```bash
# Port 80 access
curl http://localhost
curl http://localhost/api/health

# Direct service access  
curl http://localhost:3000  # Frontend
curl http://localhost:5000/api/health  # Backend
```

### View Logs
```bash
# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Backend logs
sudo journalctl -u NewContainmentWeb.service -f

# Frontend logs
pm2 logs newcontainment-frontend
```

## 🛠️ Manual Management

### Restart Services
```bash
# Restart all services
sudo systemctl restart nginx NewContainmentWeb.service
pm2 restart newcontainment-frontend

# Individual services
sudo systemctl restart nginx
sudo systemctl restart NewContainmentWeb.service
pm2 restart newcontainment-frontend
```

### Update Application
```bash
# Standard update
sudo ./update-prod.sh

# Production update with port 80
sudo ./deploy.sh --production
```

## 🔥 Firewall Configuration

### UFW (Ubuntu Firewall)
```bash
# Allow port 80
sudo ufw allow 80

# Allow SSH (important!)
sudo ufw allow 22

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### iptables (Alternative)
```bash
# Allow port 80
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables-save
```

## 🚨 Troubleshooting

### Port 80 Not Accessible
1. **Check Nginx status**: `systemctl status nginx`
2. **Test Nginx config**: `sudo nginx -t`
3. **Check firewall**: `sudo ufw status` atau `iptables -L`
4. **Check port binding**: `netstat -tuln | grep :80`

### Backend API Not Working
1. **Check backend service**: `systemctl status NewContainmentWeb.service`
2. **Check backend logs**: `sudo journalctl -u NewContainmentWeb.service -f`
3. **Test direct access**: `curl http://localhost:5000/api/health`

### Frontend Not Loading
1. **Check PM2 status**: `pm2 list`
2. **Check PM2 logs**: `pm2 logs newcontainment-frontend`  
3. **Test direct access**: `curl http://localhost:3000`

### Configuration Issues
1. **Regenerate configs**: `sudo ./deploy.sh --production`
2. **Check Nginx config**: `sudo nginx -t`
3. **Reset services**: Restart all services

## 📊 Architecture Overview

```
Internet/Network
       ↓
   Port 80 (Nginx)
       ↓
┌─────────────────┐
│  Nginx Proxy    │
│  Security       │  
│  Compression    │
└─────────────────┘
       ↓
┌─────────────────┬─────────────────┐
│   Frontend      │   Backend       │
│   Next.js       │   .NET API      │  
│   Port 3000     │   Port 5000     │
└─────────────────┴─────────────────┘
       ↓
┌─────────────────┐
│   Database      │
│   SQLite        │
└─────────────────┘
```

## 🎯 Production Checklist

- [ ] Run `sudo ./deploy.sh --production`
- [ ] Verify port 80 access: `curl http://server-ip`
- [ ] Check all services running: `systemctl status nginx NewContainmentWeb.service`
- [ ] Test API access: `curl http://server-ip/api/health`
- [ ] Configure firewall: `sudo ufw allow 80`
- [ ] Test from external network
- [ ] Setup monitoring/logging
- [ ] Backup configuration files

## 🔄 Update Process

1. **Pull latest code**: `git pull`
2. **Run production deployment**: `sudo ./deploy.sh --production`
3. **Verify services**: Check status and access
4. **Test functionality**: Login, navigate, check features

## 📝 Notes

- Nginx akan otomatis di-setup jika terinstall
- JWT secret akan di-generate secara otomatis
- CORS settings akan di-update untuk production
- Semua service akan di-restart untuk apply konfigurasi baru
- Firewall perlu di-configure manual untuk akses external

---

**Happy Deploying! 🎉**