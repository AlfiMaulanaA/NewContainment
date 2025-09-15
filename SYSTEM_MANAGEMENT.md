# System Management Feature Documentation

## 🎯 **Overview**
System Management functionality allows authorized users to execute system commands on Debian/Raspberry Pi servers through a web interface. This feature provides safe control over system services and power state.

## 🔧 **Backend Implementation**

### **Files Created:**
- `Backend/Services/ISystemManagementService.cs` - Service interface
- `Backend/Services/SystemManagementService.cs` - Service implementation  
- `Backend/Controllers/SystemManagementController.cs` - API controller
- Updated `Backend/Program.cs` - Service registration

### **API Endpoints:**
```
POST /api/systemmanagement/reboot          - Reboot system
POST /api/systemmanagement/shutdown        - Shutdown system
POST /api/systemmanagement/services/{name}/start    - Start service
POST /api/systemmanagement/services/{name}/stop     - Stop service
POST /api/systemmanagement/services/{name}/restart  - Restart service
GET  /api/systemmanagement/services/{name}/status   - Get service status
GET  /api/systemmanagement/services        - List available services
GET  /api/systemmanagement/info            - Get system information
```

### **Supported Services:**
- `NewContainment` → `NewContainment.service`
- `NewAccessControl` → `NewAccessControl.service`  
- `mosquitto` → `mosquitto.service`
- `nginx` → `nginx.service`
- `postgresql` → `postgresql.service`
- `mysql` → `mysql.service`
- `mariadb` → `mariadb.service`
- `docker` → `docker.service`

### **Security Features:**
- ✅ **Authorization Required**: All endpoints require authentication
- ✅ **Whitelist Services**: Only predefined services can be managed
- ✅ **Linux Only**: Commands only execute on Linux/Unix systems
- ✅ **Timeout Protection**: Commands have execution timeouts
- ✅ **User Audit**: All commands logged with user information
- ✅ **Sudo Commands**: Uses sudo for system operations

## 🎨 **Frontend Implementation**

### **Files Created:**
- `Frontend/components/system-management.tsx` - Main component
- Updated `Frontend/app/configuration/page.tsx` - Added new tab
- Updated `Frontend/lib/api-service.ts` - API integration

### **UI Features:**

#### **System Information Card:**
- Hostname, OS, uptime, load average
- Memory usage, disk usage
- Real-time system status

#### **System Control Card:**
- Reboot system (with confirmation)
- Shutdown system (with confirmation) 
- Refresh system info

#### **Services Management Card:**
- List of available services with status badges
- Start/Stop/Restart buttons per service
- Service status checking
- Real-time status updates

#### **Command Output Card:**
- Shows last executed command result
- Output and error display
- Execution timestamp and user info

### **Navigation:**
New tab "System Management" added to Configuration page:
- **Tab 1:** Pin Configuration
- **Tab 2:** System Configuration  
- **Tab 3:** System Management ← NEW

## 🚀 **Usage Examples**

### **Restart Application Service:**
```bash
# Frontend UI Action → Backend Command:
sudo systemctl restart NewContainment.service
```

### **Check Service Status:**
```bash
# Frontend UI Action → Backend Command:
sudo systemctl status NewContainment.service --no-pager -l
```

### **System Reboot:**
```bash
# Frontend UI Action → Backend Command:
sudo reboot
```

## 🔐 **Security Considerations**

### **What's Protected:**
- Only whitelisted services can be managed
- All commands require authentication
- User actions are logged for audit
- Confirmation dialogs for destructive actions
- Timeouts prevent hanging commands

### **What to Monitor:**
- System logs for command execution
- User audit trail in application logs
- Failed command attempts
- Unauthorized access attempts

## 🛠️ **Testing Instructions**

### **Backend Testing:**
```bash
cd Backend
dotnet build   # ✅ Should compile successfully
dotnet run     # Start backend server
```

### **Frontend Testing:**
```bash
cd Frontend  
npm run dev    # Start development server
```

### **Manual Testing:**
1. Navigate to `/configuration` page
2. Click "System Management" tab
3. View system information
4. Test service management (start/stop/restart)
5. Check command output display
6. Test system reboot (⚠️ only in test environment)

## 📊 **Command Examples Output:**

### **Service Status:**
```
● NewContainment.service - New Containment Application
   Loaded: loaded (/etc/systemd/system/NewContainment.service; enabled; vendor preset: enabled)
   Active: active (running) since Thu 2024-09-12 15:30:42 UTC; 2h 15min ago
   Main PID: 1234 (dotnet)
```

### **System Info:**
```
Hostname: containment-server-01
OS: Linux containment-server-01 5.4.0-74-generic #83-Ubuntu SMP Sat May 8 02:35:39 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux
Uptime: 15:45:23 up 2 days, 3:42, 1 user, load average: 0.08, 0.12, 0.15
```

## 🐛 **Error Handling:**

### **Common Error Scenarios:**
- **Service not whitelisted**: Returns error message
- **Command timeout**: Kills process and reports timeout
- **Permission denied**: Reports sudo permission issues
- **Service not found**: Returns systemctl error output
- **Network issues**: Frontend shows connection error

### **Error Response Format:**
```json
{
  "success": false,
  "message": "Failed to restart service NewContainment",
  "output": "",
  "error": "Unit NewContainment.service not found.",
  "exitCode": 5,
  "command": "sudo systemctl restart NewContainment.service",
  "executedAt": "2024-09-12T15:30:42Z",
  "executedBy": "admin_user"
}
```

## 🎉 **Features Complete:**

✅ Backend service and controller implementation  
✅ Frontend UI with confirmation dialogs  
✅ API integration with error handling  
✅ Security whitelist and authentication  
✅ Real-time command execution feedback  
✅ System information display  
✅ Service status management  
✅ User audit logging  
✅ Cross-platform safety checks  
✅ Integration with existing configuration page  

**The System Management feature is ready for use! 🚀**