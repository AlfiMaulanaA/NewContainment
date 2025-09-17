# ZKTeco Device Management System - API Documentation v3.0

## Overview

Complete MQTT-based API for ZKTeco device management with advanced features including device CRUD, user management, fingerprint enrollment, card synchronization, live attendance monitoring, and comprehensive device configuration using PYZK Library https://github.com/fananimi/pyzk.git.

## MQTT Topic Structure

All MQTT topics follow the standardized pattern:

```
accessControl/{category}/{type}
```

### Configuration Files

- **Device Config**: `/JSON/access_control_config.json` - Device management and settings
- **MQTT Config**: `/JSON/mqtt_config.json` - MQTT broker configuration

### Topic Categories

| Category | Command Topic | Response Topic | Live Topic |
|----------|---------------|----------------|------------|
| **device** | `accessControl/device/command` | `accessControl/device/response` | - |
| **user** | `accessControl/user/command` | `accessControl/user/response` | - |
| **attendance** | `accessControl/attendance/command` | `accessControl/attendance/response` | `accessControl/attendance/live` |
| **system** | `accessControl/system/command` | `accessControl/system/response` | `accessControl/system/status` |

## ⚡ API Design Principles

- **Minimal Required Fields**: Only essential fields are mandatory
- **Auto-generated Values**: System assigns defaults for optional parameters  
- **Smart Validation**: Comprehensive input validation with helpful error messages
- **Batch Operations**: Single commands can operate on all devices
- **Real-time Feedback**: Multi-stage responses for long-running operations
- **Safety First**: Destructive operations require explicit confirmation
- **Consistent Structure**: All commands follow the same request/response pattern

## 📋 Table of Contents

1. [Device Management](#1-device-management)
   - Basic Operations (Test, Add, Update, Delete, List)
   - Configuration Management (Time, Language, Network)
   - Advanced Operations (Restart, Reset, Info)

2. [User Management](#2-user-management)
   - CRUD Operations (Create, Read, Update, Delete)
   - Advanced Features (Fingerprint, Cards, Roles)

3. [Attendance Management](#3-attendance-management)
   - Live Monitoring (Start, Stop, Status)
   - Data Retrieval (History, Reports)

4. [Device Synchronization](#4-device-synchronization)
   - Automatic Synchronization (Scheduled, Hourly)
   - Manual Synchronization (On-demand, Device-specific)
   - Device Discovery and Health Monitoring
   - Failed Device Reset and Recovery

5. [System Management](#5-system-management)
   - Configuration Management
   - System Status and Control

---

# 1. Device Management

This section covers all device-related operations including basic CRUD operations, configuration management, and advanced device control features.

**Command Topic**: `accessControl/device/command`  
**Response Topic**: `accessControl/device/response`

## 1.1 Basic Device Operations

### 1.1.1 Test Device Connection

Test connectivity to one or all devices.

**Command**: `testConnection`

**Single Device Request**:
```json
{
  "command": "testConnection",
  "data": {
    "device_id": "device_1"
  }
}
```

**All Devices Request**:
```json
{
  "command": "testConnection",
  "data": {
    "device_id": "all"
  }
}
```

**Parameters**:
- **`device_id`**: String, Required - Device ID or "all" for all devices

**Response Examples**:

<details>
<summary>Single Device Response</summary>

```json
{
  "status": "success",
  "message": "Device Main Entrance online",
  "data": {
    "test_type": "single_device",
    "device_id": "device_1",
    "device_name": "Main Entrance",
    "result": {
      "status": "online",
      "response_time_ms": 45.25,
      "device_info": {
        "firmware_version": "Ver 6.60 Apr 12 2017",
        "user_count": 150,
        "attendance_count": 2500
      }
    }
  }
}
```
</details>

<details>
<summary>All Devices Response</summary>

```json
{
  "status": "success",
  "message": "Connection test completed",
  "data": {
    "test_type": "all_devices",
    "summary": {
      "total_devices": 3,
      "online_devices": 2,
      "offline_devices": 1,
      "success_rate": 66.67
    },
    "devices": [
      {
        "device_id": "device_1",
        "device_name": "Main Entrance",
        "status": "online",
        "response_time_ms": 45.25
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door", 
        "status": "online",
        "response_time_ms": 52.1
      },
      {
        "device_id": "device_3",
        "device_name": "Office Door",
        "status": "offline",
        "error": "Connection timeout"
      }
    ]
  }
}
```
</details>

---

### 1.1.2 Add New Device

**Request Topic**: `accessControl/device/command`

**Minimal Request Payload** (only required fields):

```json
{
  "command": "addDevice",
  "data": {
    "id": "device_3",
    "name": "New Office Door",
    "ip": "192.168.0.203"
  }
}
```

**Complete Request Payload** (with optional parameters):

```json
{
  "command": "addDevice",
  "data": {
    "id": "device_3",
    "name": "New Office Door",
    "ip": "192.168.0.203",
    "port": 4370,
    "password": 0,
    "timeout": 5,
    "force_udp": false,
    "enabled": true
  }
}
```

**Parameter Details**:

- **`id`**: String, **Required** - Unique device identifier
- **`name`**: String, **Required** - Device display name
- **`ip`**: String, **Required** - Device IP address
- **`port`**: Integer, Optional (default: 4370) - Device port
- **`password`**: Integer, Optional (default: 0) - Device access password
- **`timeout`**: Integer, Optional (default: 5) - Connection timeout in seconds
- **`force_udp`**: Boolean, Optional (default: false) - Force UDP connection
- **`enabled`**: Boolean, Optional (default: true) - Enable/disable device

**Response Topic**: `accessControl/device/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Device New Office Door added successfully",
  "device": {
    "id": "device_3",
    "name": "New Office Door",
    "ip": "192.168.0.203",
    "port": 4370,
    "password": 0,
    "timeout": 5,
    "force_udp": false,
    "enabled": true
  }
}
```

**Error Response**:

```json
{
  "status": "error",
  "message": "Device with ID device_3 already exists"
}
```

### 3. Update Existing Device

**Request Topic**: `accessControl/device/command`

**Request Payload** (only fields to update):

```json
{
  "command": "updateDevice",
  "data": {
    "device_id": "device_3",
    "name": "Updated Office Door",
    "ip": "192.168.0.204",
    "enabled": false
  }
}
```

**Response Topic**: `accessControl/device/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Device device_3 updated successfully",
  "device": {
    "id": "device_3",
    "name": "Updated Office Door",
    "ip": "192.168.0.204",
    "port": 4370,
    "password": 0,
    "timeout": 5,
    "force_udp": false,
    "enabled": false
  },
  "old_device": {
    "id": "device_3",
    "name": "New Office Door",
    "ip": "192.168.0.203",
    "port": 4370,
    "password": 0,
    "timeout": 5,
    "force_udp": false,
    "enabled": true
  }
}
```

### 4. Delete Device

**Request Topic**: `accessControl/device/command`

**Request Payload**:

```json
{
  "command": "deleteDevice",
  "data": {
    "device_id": "device_3"
  }
}
```

**Response Topic**: `accessControl/device/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Device Updated Office Door deleted successfully",
  "deleted_device": {
    "id": "device_3",
    "name": "Updated Office Door",
    "ip": "192.168.0.204",
    "port": 4370,
    "password": 0,
    "timeout": 5,
    "force_udp": false,
    "enabled": false
  }
}
```

### 5. List All Devices

**Request Topic**: `accessControl/device/command`

**Request Payload**:

```json
{
  "command": "listDevices"
}
```

**Response Topic**: `accessControl/device/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Found 2 devices",
  "devices": [
    {
      "id": "device_1",
      "name": "Main Entrance",
      "ip": "192.168.0.201",
      "port": 4370,
      "password": 0,
      "timeout": 5,
      "force_udp": false,
      "enabled": true
    },
    {
      "id": "device_2",
      "name": "Back Door",
      "ip": "192.168.0.202",
      "port": 4370,
      "password": 0,
      "timeout": 5,
      "force_udp": false,
      "enabled": true
    }
  ],
  "total_devices": 2
}
```

---

## 1.2 Device Configuration Management

### 1.2.1 Set Device Time

Set device date and time to synchronize with system time.

**Command**: `setDeviceTime`

**Request**:
```json
{
  "command": "setDeviceTime",
  "data": {
    "device_id": "device_1",
    "timestamp": "2024-01-15T10:30:00"
  }
}
```

**Parameters**:
- **`device_id`**: String, Required - Device ID or "all" for all devices
- **`timestamp`**: String/Number, Required - ISO datetime string or Unix timestamp

**Alternative with Unix timestamp**:
```json
{
  "command": "setDeviceTime",
  "data": {
    "device_id": "all",
    "timestamp": 1705312200
  }
}
```

---

### 1.2.2 Get Device Time

Retrieve current device time.

**Command**: `getDeviceTime`

**Request**:
```json
{
  "command": "getDeviceTime",
  "data": {
    "device_id": "device_1"
  }
}
```

---

### 1.2.3 Set Device Language

Configure device display language.

**Command**: `setDeviceLanguage`

**Request**:
```json
{
  "command": "setDeviceLanguage",
  "data": {
    "device_id": "device_1",
    "language": "id"
  }
}
```

**Parameters**:
- **`device_id`**: String, Required - Device ID or "all" for all devices
- **`language`**: String, Required - Language code

**Supported Languages**:
| Code | Language | Code | Language |
|------|----------|------|----------|
| `en` | English | `es` | Spanish |
| `id` | Indonesian | `pt` | Portuguese |
| `zh` | Chinese | `fr` | French |
| `ko` | Korean | `de` | German |
| `jp` | Japanese | `it` | Italian |
| `th` | Thai | `ru` | Russian |
| `vi` | Vietnamese | | |

---

## 1.3 Advanced Device Operations

### 1.3.1 Get Device Information

Retrieve comprehensive device information including firmware, capacity, and status.

**Command**: `getDeviceInfo`

**Request**:
```json
{
  "command": "getDeviceInfo",
  "data": {
    "device_id": "device_1"
  }
}
```

**Response includes**:
- Firmware version and platform info
- Device name and serial number
- Current time and capacity
- User/attendance/fingerprint counts

---

### 1.3.2 Restart Device

Restart/reboot device remotely.

**Command**: `restartDevice`

**Single Device Request**:
```json
{
  "command": "restartDevice",
  "data": {
    "device_id": "device_1"
  }
}
```

**Restart All Devices (Safety Required)**:
```json
{
  "command": "restartDevice",
  "data": {
    "device_id": "all",
    "force": true
  }
}
```

**Parameters**:
- **`device_id`**: String, Required - Device ID or "all" for all devices
- **`force`**: Boolean, Required for "all" - Safety confirmation for mass restart

**⚠️ Safety Notes**:
- Requires `force: true` for restarting all devices
- Devices will be offline for 30-60 seconds
- Only restart all devices during maintenance windows

---

### 1.3.3 Set Device Network Configuration

Configure device network settings including IP address.

**Command**: `setDeviceNetwork`

**Request**:
```json
{
  "command": "setDeviceNetwork",
  "data": {
    "device_id": "device_1",
    "ip": "192.168.1.100",
    "netmask": "255.255.255.0",
    "gateway": "192.168.1.1"
  }
}
```

**Parameters**:
- **`device_id`**: String, Required - Device ID (single device only)
- **`ip`**: String, Required - New IP address
- **`netmask`**: String, Optional (default: "255.255.255.0") - Subnet mask
- **`gateway`**: String, Optional - Gateway IP address

**⚠️ Warning**: This command changes the device IP address. Local configuration will be automatically updated.

---

### 1.3.4 Reset Device Data

Clear device data with selective reset options.

**Command**: `resetDevice`

**Request**:
```json
{
  "command": "resetDevice",
  "data": {
    "device_id": "device_1",
    "reset_type": "users",
    "confirm": true
  }
}
```

**Parameters**:
- **`device_id`**: String, Required - Device ID or "all" for all devices
- **`reset_type`**: String, Required - Type of data to reset
- **`confirm`**: Boolean, Required - Safety confirmation
- **`confirm_all`**: Boolean, Required for "all" devices - Additional safety for mass reset

**Reset Types**:
- `users` - Clear all users
- `attendance` - Clear attendance records  
- `templates` - Clear fingerprint templates
- `all` - Clear everything

**Reset All Devices Example**:
```json
{
  "command": "resetDevice",
  "data": {
    "device_id": "all",
    "reset_type": "attendance",
    "confirm": true,
    "confirm_all": true
  }
}
```

**⚠️ Safety Notes**:
- Requires `confirm: true` for all reset operations
- Requires `confirm_all: true` for resetting all devices
- Data cannot be recovered after reset
- Always backup data before reset operations

---

### 1.3.5 Device Configuration Management

Get and set device configuration settings.

**Get Configuration** - `getDeviceConfig`:
```json
{
  "command": "getDeviceConfig",
  "data": {
    "device_id": "device_1"
  }
}
```

**Set Configuration** - `setDeviceConfig`:
```json
{
  "command": "setDeviceConfig",
  "data": {
    "device_id": "device_1",
    "config": {
      "device_name": "Main Gate Scanner",
      "time": "2024-01-15T10:30:00"
    }
  }
}
```

---

# 2. User Management

This section covers all user-related operations including CRUD operations, fingerprint management, and card synchronization.

**Command Topic**: `accessControl/user/command`  
**Response Topic**: `accessControl/user/response`

## 2.1 Basic User Operations

### 2.1.1 Create User

Create user and automatically sync to all configured devices.

**Command**: `createData` or `createUser`

**Minimal Request Payload** (only name required):

```json
{
  "command": "createData",
  "data": {
    "name": "John Doe"
  }
}
```

**Minimal with Password**:

```json
{
  "command": "createData",
  "data": {
    "name": "John Doe",
    "password": "123456"
  }
}
```

**Complete Request Payload** (with optional parameters):

```json
{
  "command": "createData",
  "data": {
    "name": "John Doe",
    "uid": 15,
    "privilege": 0,
    "password": "123456",
    "group_id": 0,
    "user_id": "john_doe"
  }
}
```

**Parameter Details**:

- **`name`**: String, **Required** - User full name
- **`uid`**: Integer, Optional (auto-generated) - Unique user identifier
- **`privilege`**: Integer, Optional (default: 0) - User privilege level (0=User, 1=Admin, 2=SuperAdmin)
- **`password`**: String, Optional (default: "") - Password for device access
- **`group_id`**: Integer, Optional (default: 0) - Group classification ID
- **`user_id`**: String, Optional (auto-generated) - Custom user identifier
- **`card`**: Integer, Optional (default: 0) - Card number for card access

**Response Topic**: `accessControl/user/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "User John Doe created and synced to 2/2 devices",
  "data": {
    "user": {
      "uid": 15,
      "name": "John Doe",
      "privilege": 0,
      "password": "123456",
      "group_id": 0,
      "user_id": "john_doe"
    },
    "synced_devices": 2,
    "total_devices": 2,
    "sync_results": [
      {
        "device_id": "device_1",
        "device_name": "Main Entrance",
        "status": "success",
        "message": "User synced successfully"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "status": "success",
        "message": "User synced successfully"
      }
    ]
  }
}
```

### 2. Get All Users

**Request Topic**: `accessControl/user/command`

**From All Devices** (minimal):

```json
{
  "command": "getData"
}
```

**From Specific Device**:

```json
{
  "command": "getData",
  "data": {
    "device_id": "device_1"
  }
}
```

**Response Topic**: `accessControl/user/response`

**All Devices Response**:

```json
{
  "status": "success",
  "message": "Retrieved users from 2/2 devices",
  "data": {
    "query_type": "all_devices",
    "summary": {
      "total_devices": 2,
      "successful_queries": 2,
      "unique_users": 3,
      "total_user_records": 6
    },
    "unique_users": [
      {
        "uid": 15,
        "name": "John Doe",
        "privilege": 0,
        "password": "123456",
        "group_id": 0,
        "user_id": "john_doe",
        "devices": ["device_1", "device_2"]
      },
      {
        "uid": 16,
        "name": "Jane Smith",
        "privilege": 1,
        "password": "654321",
        "group_id": 1,
        "user_id": "jane_smith",
        "devices": ["device_1", "device_2"]
      }
    ],
    "devices": [
      {
        "device_id": "device_1",
        "device_name": "Main Entrance",
        "status": "success",
        "user_count": 3,
        "users": [...]
      }
    ]
  }
}
```

**Single Device Response**:

```json
{
  "status": "success",
  "message": "Retrieved 3 users from Main Entrance",
  "data": {
    "query_type": "single_device",
    "device_id": "device_1",
    "device_name": "Main Entrance",
    "users": [
      {
        "uid": 15,
        "name": "John Doe",
        "privilege": 0,
        "password": "123456",
        "group_id": 0,
        "user_id": "john_doe"
      }
    ],
    "user_count": 3
  }
}
```

### 3. Get User by UID

**Request Topic**: `accessControl/user/command`

**From All Devices**:

```json
{
  "command": "getByUID",
  "data": {
    "uid": 15
  }
}
```

**From Specific Device**:

```json
{
  "command": "getByUID",
  "data": {
    "uid": 15,
    "device_id": "device_1"
  }
}
```

**Response Topic**: `accessControl/user/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "User found on 2 device(s)",
  "data": {
    "user": {
      "uid": 15,
      "name": "John Doe",
      "privilege": 0,
      "password": "123456",
      "group_id": 0,
      "user_id": "john_doe",
      "devices": ["device_1", "device_2"]
    }
  }
}
```

### 4. Update User (Auto-Sync to All Devices)

**Request Topic**: `accessControl/user/command`

**Request Payload** (only fields to update):

```json
{
  "command": "updateData",
  "data": {
    "uid": 15,
    "name": "John Updated",
    "privilege": 1,
    "password": "new_password"
  }
}
```

**Response Topic**: `accessControl/user/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "User John Updated updated and synced to 2/2 devices",
  "data": {
    "user": {
      "uid": 15,
      "name": "John Updated",
      "privilege": 1,
      "password": "new_password",
      "group_id": 0,
      "user_id": "john_doe"
    },
    "old_user": {
      "uid": 15,
      "name": "John Doe",
      "privilege": 0,
      "password": "123456",
      "group_id": 0,
      "user_id": "john_doe"
    },
    "synced_devices": 2,
    "total_devices": 2,
    "sync_results": [
      {
        "device_id": "device_1",
        "device_name": "Main Entrance",
        "status": "success",
        "message": "User synced successfully"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "status": "success",
        "message": "User synced successfully"
      }
    ]
  }
}
```

### 5. Delete User (Auto-Remove from All Devices)

**Request Topic**: `accessControl/user/command`

**Request Payload**:

```json
{
  "command": "deleteData",
  "data": {
    "uid": 15
  }
}
```

**Response Topic**: `accessControl/user/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "User John Updated deleted from 2/2 devices",
  "data": {
    "deleted_user": {
      "uid": 15,
      "name": "John Updated",
      "privilege": 1,
      "password": "new_password",
      "group_id": 0,
      "user_id": "john_doe"
    },
    "successful_deletions": 2,
    "total_devices": 2,
    "deletion_results": [
      {
        "device_id": "device_1",
        "device_name": "Main Entrance",
        "status": "success",
        "message": "User deleted successfully"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "status": "success",
        "message": "User deleted successfully"
      }
    ],
    "sound_feedback": {
      "successful_sounds": 2,
      "total_devices": 2,
      "sound_results": [
        {
          "device_id": "device_1",
          "device_name": "Main Entrance",
          "status": "success",
          "message": "Sound 0 played successfully"
        }
      ]
    }
  }
}
```

# Advanced User Operations

### 6. Play Sound on Devices

**Command**: `playSound`  
**Topic**: `accessControl/user/command`

#### 6.1 Play on All Devices

```json
{
  "command": "playSound",
  "data": {
    "sound_index": 0
  }
}
```

#### 6.2 Play on Specific Device

```json
{
  "command": "playSound",
  "data": {
    "sound_index": 24,
    "device_id": "device_1"
  }
}
```

**Sound Index Reference**:

- **0** - "Thank You" (Success sound)
- **1** - "Incorrect Password"
- **2** - "Access Denied" (Error sound)
- **3** - "Invalid ID"
- **4** - "Please try again"
- **10** - "Beep kuko"
- **11** - "Beep siren"
- **13** - "Beep bell"
- **18** - "Windows® opening sound"
- **24** - "Beep standard" (Default beep)
- **30** - "Invalid user"
- **51** - "Focus eyes on the green box"

**Response Topic**: `accessControl/user/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Sound 0 played on 2/2 devices",
  "data": {
    "sound_index": 0,
    "sound_feedback": {
      "successful_sounds": 2,
      "total_devices": 2,
      "sound_results": [
        {
          "device_id": "device_1",
          "device_name": "Main Entrance",
          "status": "success",
          "message": "Sound 0 played successfully"
        },
        {
          "device_id": "device_2",
          "device_name": "Back Door",
          "status": "success",
          "message": "Sound 0 played successfully"
        }
      ]
    }
  }
}
```

### 7. Register Fingerprint (Master Device + Sync Process)

**Request Topic**: `accessControl/user/command`

**Request Payload**:

```json
{
  "command": "registerFinger",
  "data": {
    "uid": 1,
    "fid": 1
  }
}
```

**Alternative Command** (backward compatibility):

```json
{
  "command": "registerFinger",
  "data": {
    "uid": 1,
    "fid": 1
  }
}
```

**Parameters**:

- **`uid`**: Integer, **Required** - User ID that exists on devices
- **`fid`**: Integer, **Required** - Finger template ID (0-9)

**Process Overview**:

1. **Master Device Enrollment**: Fingerprint is enrolled only on the master device (configurable, default: device_1)
2. **Template Extraction**: Fingerprint template is extracted from master device
3. **Auto-Sync**: Template is automatically synchronized to all other enabled devices

**Response Topic**: `accessControl/user/response`

This command returns **5 sequential responses** showing detailed enrollment and sync progress:

#### Stage 1 Response - Ready to Enroll on Master:

```json
{
  "status": "ready_to_enroll",
  "message": "Ready to enroll fingerprint for John Doe on master device Front Door. Place finger on scanner.",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "master_device": {
      "device_id": "device_1",
      "device_name": "Front Door",
      "status": "ready"
    },
    "enrollment_stage": 1,
    "enrollment_mode": "master_device",
    "next_action": "Place finger on the master device scanner 3 times when prompted"
  }
}
```

#### Stage 2 Response - Processing on Master (after 2 seconds):

```json
{
  "status": "processing",
  "message": "Processing fingerprint enrollment for John Doe on master device Front Door. Please wait...",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "master_device": {
      "device_id": "device_1",
      "device_name": "Front Door",
      "status": "processing"
    },
    "enrollment_stage": 2,
    "enrollment_mode": "master_device",
    "message": "Enrollment in progress on master device. Please keep finger on scanner."
  }
}
```

#### Stage 2.1 Response - Enrollment UI Active (after 5 seconds):

```json
{
  "status": "enrolling",
  "message": "Starting fingerprint enrollment for John Doe on master device Front Door...",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "master_device": "Front Door",
    "enrollment_stage": "2.1",
    "enrollment_mode": "master_device",
    "status": "enrollment_ui_active",
    "message": "Please place your finger on the master device scanner 3 times"
  }
}
```

#### Stage 2.2 Response - Enrollment Success + Sync Starting:

```json
{
  "status": "enrollment_success_syncing",
  "message": "Fingerprint enrolled successfully on master Front Door. Starting sync to other devices...",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "master_device": "Front Door",
    "master_enrollment": {
      "success": true,
      "message": "Fingerprint enrollment completed successfully on Front Door"
    },
    "enrollment_stage": "2.2",
    "enrollment_mode": "master_device",
    "status": "sync_starting",
    "message": "Synchronizing fingerprint template to other devices..."
  }
}
```

#### Stage 3 Response - Final Result:

    "user_name": "John Doe",
    "master_device": {
      "device_id": "device_1",
      "device_name": "Front Door",
      "status": "processing"
    },
    "enrollment_stage": 2,
    "enrollment_mode": "master_device",
    "message": "Enrollment in progress on master device. Please keep finger on scanner."

}
}

````

#### Stage 3 Response - Enrollment + Sync Result (after 5 more seconds):

**Success Response** (Master enrolled + All devices synced):

```json
{
  "status": "success",
  "message": "Fingerprint enrolled on master Front Door and synced to all 1 other devices successfully for John Doe",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "master_device": "Front Door",
    "master_enrollment": {
      "success": true,
      "message": "Fingerprint enrollment initiated on Front Door"
    },
    "sync_results": [
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": true,
        "message": "Fingerprint template synced to Back Door using save_template method",
        "status": "success"
      }
    ],
    "successful_syncs": 1,
    "total_other_devices": 1,
    "total_successful_devices": 2,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 2,
      "total_devices": 2
    },
    "enrollment_stage": 3,
    "enrollment_mode": "master_device",
    "final_result": true
  }
}
````

**Partial Success Response** (some devices failed):

```json
{
  "status": "partial_success",
  "message": "Fingerprint enrollment partially successful for John Doe: 1/2 devices",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "successful_enrollments": 1,
    "failed_enrollments": 1,
    "total_devices": 2,
    "enrollment_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": true,
        "message": "Fingerprint enrollment initiated on Front Door",
        "status": "success"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": false,
        "message": "Failed to enroll fingerprint on Back Door: Connection failed",
        "status": "failed"
      }
    ],
    "sound_feedback": {
      "successful_operations": 1,
      "total_devices": 2
    },
    "enrollment_stage": 3,
    "final_result": true
  }
}
```

**Failed Response** (all devices failed):

```json
{
  "status": "failed",
  "message": "Fingerprint enrollment failed for John Doe on all devices",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "successful_enrollments": 0,
    "failed_enrollments": 2,
    "total_devices": 2,
    "enrollment_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": false,
        "message": "Failed to enroll fingerprint on Front Door: Device not responding",
        "status": "failed"
      }
    ],
    "sound_feedback": {
      "successful_operations": 0,
      "total_devices": 2
    },
    "enrollment_stage": 3,
    "final_result": true
  }
}
```

**Important Notes**:

- **Master Device Approach**: Fingerprint enrollment only occurs on the master device (default: device_1)
- **Auto-Sync**: After successful enrollment, fingerprint template is automatically synced to other devices
- **Configuration**: Master device can be changed in settings.master_device_id in access_control_config.json
- User must exist on master device before fingerprint registration
- During enrollment, users must place finger on master device scanner when prompted (typically 3 times)
- Master device will be temporarily disabled during enrollment process
- Sound feedback plays automatically (Thank You for success, Access Denied for failure)
- Process takes approximately 7-10 seconds total (5s for enrollment + sync time)
- Finger ID (fid) should be between 0-9 for most ZKTeco devices
- Multi-stage responses allow real-time UI updates
- Even if sync fails to some devices, master enrollment is still considered successful

### 8. Delete Fingerprint (Parallel Deletion Process)

**Request Topic**: `accessControl/user/command`

**Request Payload**:

```json
{
  "command": "deleteFinger",
  "data": {
    "uid": 1,
    "fid": 1
  }
}
```

**Parameters**:

- **`uid`**: Integer, **Required** - User ID that exists on devices
- **`fid`**: Integer, **Required** - Finger template ID (0-9) to delete

**Process Overview**:

1. **Parallel Deletion**: Fingerprint template is deleted from all enabled devices simultaneously
2. **No UI Changes**: Deletion happens in background without affecting device displays
3. **Real-time Updates**: Multiple response stages showing deletion progress

**Response Topic**: `accessControl/user/response`

This command returns **4 sequential responses** showing deletion progress:

#### Response 1 - Request Accepted (Immediate):

```json
{
  "status": "accepted",
  "message": "Fingerprint deletion request accepted for UID 1 FID 1. Processing in background...",
  "data": {
    "uid": 1,
    "fid": 1,
    "target_devices": 2,
    "processing_time": "0.05s",
    "status": "async_deletion_started"
  }
}
```

#### Response 2 - Validation (after ~200ms):

```json
{
  "status": "validating",
  "message": "Validating fingerprint deletion for John Doe (UID 1, FID 1)",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "target_devices": 2,
    "deletion_stage": 1,
    "status": "validation_in_progress"
  }
}
```

#### Response 3 - Deletion Started (after ~400ms):

```json
{
  "status": "deleting",
  "message": "Starting fingerprint deletion for John Doe from 2 devices...",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "target_devices": 2,
    "deletion_stage": 2,
    "status": "deletion_in_progress"
  }
}
```

#### Response 4 - Final Result (after 2-5 seconds):

**Success Response** (All devices successful):

```json
{
  "status": "success",
  "message": "Fingerprint deleted successfully from all 2 devices for John Doe",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "deletion_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": true,
        "message": "Fingerprint deleted successfully from Front Door using delete_user_template",
        "status": "success"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": true,
        "message": "Fingerprint deleted successfully from Back Door using delete_user_template",
        "status": "success"
      }
    ],
    "successful_deletions": 2,
    "failed_deletions": 0,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 2,
      "total_devices": 2
    },
    "deletion_stage": 3,
    "final_result": true
  }
}
```

**Partial Success Response** (Some devices failed):

```json
{
  "status": "partial_success",
  "message": "Fingerprint deleted from 1/2 devices for John Doe",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "deletion_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": true,
        "message": "Fingerprint deleted successfully from Front Door using delete_user_template",
        "status": "success"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": false,
        "message": "Failed to delete fingerprint from Back Door: Connection failed",
        "status": "failed"
      }
    ],
    "successful_deletions": 1,
    "failed_deletions": 1,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 1,
      "total_devices": 2
    },
    "deletion_stage": 3,
    "final_result": true
  }
}
```

**Failed Response** (All devices failed):

```json
{
  "status": "failed",
  "message": "Failed to delete fingerprint from all devices for John Doe",
  "data": {
    "uid": 1,
    "fid": 1,
    "user_name": "John Doe",
    "deletion_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": false,
        "message": "Failed to delete fingerprint from Front Door: Device not responding",
        "status": "failed"
      }
    ],
    "successful_deletions": 0,
    "failed_deletions": 2,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 0,
      "total_devices": 2
    },
    "deletion_stage": 3,
    "final_result": true
  }
}
```

**Important Notes**:

- **Parallel Processing**: Deletion occurs on all devices simultaneously for maximum speed
- **No Device UI Changes**: Deletion happens in background without affecting device displays
- **Template Not Found Handling**: If fingerprint doesn't exist, it's considered successful deletion
- **Multiple Deletion Methods**: System tries different pyzk methods (delete_user_template, delete_template, clear_template)
- **Real-time Progress**: 4-stage response system provides immediate feedback
- **Sound Feedback**: Audio notification on completion (Thank You for success, Access Denied for failure)
- **Graceful Failures**: Partial success when some devices fail
- **Fast Response**: Initial response in <100ms, total process typically 2-5 seconds

### 9. Synchronize Card Data (Cross-Device Card Detection & Sync)

**Request Topic**: `accessControl/user/command`

**Request Payload**:

```json
{
  "command": "syncronizeCard",
  "data": {}
}
```

**Parameters**:

- **`data`**: Object, **Optional** - Empty object (no parameters required)

**Process Overview**:

1. **Device Scanning**: Scans all enabled devices to detect registered cards
2. **Card Analysis**: Analyzes which cards are missing on which devices
3. **Auto-Sync**: Synchronizes missing cards across all devices simultaneously

**Response Topic**: `accessControl/user/response`

This command returns **4 sequential responses** showing card sync progress:

#### Response 1 - Request Accepted (Immediate):

```json
{
  "status": "accepted",
  "message": "Card synchronization request accepted. Scanning 2 devices...",
  "data": {
    "total_devices": 2,
    "processing_time": "0.03s",
    "status": "async_card_sync_started"
  }
}
```

#### Response 2 - Device Scanning (after ~500ms):

```json
{
  "status": "scanning",
  "message": "Scanning 2 devices for registered cards...",
  "data": {
    "total_devices": 2,
    "sync_stage": 1,
    "status": "device_scanning_in_progress"
  }
}
```

#### Response 3 - Card Analysis (after ~1-2 seconds):

```json
{
  "status": "analyzing",
  "message": "Found 3 registered cards. Analyzing sync requirements...",
  "data": {
    "total_devices": 2,
    "cards_found": 3,
    "users_with_cards": [
      {
        "uid": 1,
        "name": "John Doe",
        "card_number": 12345,
        "present_on_devices": ["device_1"]
      },
      {
        "uid": 2,
        "name": "Jane Smith",
        "card_number": 67890,
        "present_on_devices": ["device_1", "device_2"]
      },
      {
        "uid": 3,
        "name": "Bob Johnson",
        "card_number": 11111,
        "present_on_devices": ["device_2"]
      }
    ],
    "sync_stage": 2,
    "status": "card_analysis_complete"
  }
}
```

#### Response 4 - Final Result (after 3-7 seconds):

**Success Response** (Cards synchronized):

```json
{
  "status": "success",
  "message": "Card synchronization completed successfully. 4 sync operations completed.",
  "data": {
    "total_devices": 2,
    "cards_analyzed": 3,
    "cards_synced": 2,
    "successful_sync_operations": 4,
    "total_sync_operations": 4,
    "sync_results": [
      {
        "card_number": 12345,
        "uid": 1,
        "name": "John Doe",
        "target_devices": ["device_2"],
        "sync_results": [
          {
            "device_id": "device_2",
            "device_name": "Back Door",
            "success": true,
            "message": "Card synced successfully",
            "status": "success"
          }
        ]
      },
      {
        "card_number": 11111,
        "uid": 3,
        "name": "Bob Johnson",
        "target_devices": ["device_1"],
        "sync_results": [
          {
            "device_id": "device_1",
            "device_name": "Front Door",
            "success": true,
            "message": "Card synced successfully",
            "status": "success"
          }
        ]
      }
    ],
    "sound_feedback": {
      "successful_operations": 2,
      "total_devices": 2
    },
    "sync_stage": 3,
    "final_result": true
  }
}
```

**No Sync Required Response** (All cards already synchronized):

```json
{
  "status": "success",
  "message": "Card synchronization completed. All cards are already synchronized across devices.",
  "data": {
    "total_devices": 2,
    "cards_analyzed": 3,
    "cards_synced": 0,
    "sync_results": [],
    "sound_feedback": {
      "successful_operations": 2,
      "total_devices": 2
    },
    "sync_stage": 3,
    "final_result": true,
    "message": "No synchronization needed - all cards already consistent"
  }
}
```

**Partial Success Response** (Some sync operations failed):

```json
{
  "status": "partial_success",
  "message": "Card synchronization partially successful: 2/4 operations completed.",
  "data": {
    "total_devices": 2,
    "cards_analyzed": 3,
    "cards_synced": 2,
    "successful_sync_operations": 2,
    "total_sync_operations": 4,
    "sync_results": [
      {
        "card_number": 12345,
        "uid": 1,
        "name": "John Doe",
        "target_devices": ["device_2"],
        "sync_results": [
          {
            "device_id": "device_2",
            "device_name": "Back Door",
            "success": true,
            "message": "Card synced successfully",
            "status": "success"
          }
        ]
      },
      {
        "card_number": 11111,
        "uid": 3,
        "name": "Bob Johnson",
        "target_devices": ["device_1"],
        "sync_results": [
          {
            "device_id": "device_1",
            "device_name": "Front Door",
            "success": false,
            "message": "Failed to sync card: Connection timeout",
            "status": "failed"
          }
        ]
      }
    ],
    "sound_feedback": {
      "successful_operations": 1,
      "total_devices": 2
    },
    "sync_stage": 3,
    "final_result": true
  }
}
```

**Failed Response** (All sync operations failed):

```json
{
  "status": "failed",
  "message": "Card synchronization failed. No cards were successfully synced.",
  "data": {
    "total_devices": 2,
    "cards_analyzed": 3,
    "cards_synced": 2,
    "successful_sync_operations": 0,
    "total_sync_operations": 4,
    "sync_results": [
      {
        "card_number": 12345,
        "uid": 1,
        "name": "John Doe",
        "target_devices": ["device_2"],
        "sync_results": [
          {
            "device_id": "device_2",
            "device_name": "Back Door",
            "success": false,
            "message": "Failed to sync card: Device not responding",
            "status": "failed"
          }
        ]
      }
    ],
    "sound_feedback": {
      "successful_operations": 0,
      "total_devices": 2
    },
    "sync_stage": 3,
    "final_result": true
  }
}
```

**Important Notes**:

- **Manual Registration First**: Cards must be manually registered on at least one device before synchronization
- **Cross-Device Detection**: System automatically detects cards registered on any device
- **Parallel Processing**: Card synchronization occurs on all target devices simultaneously
- **Smart Analysis**: Only syncs cards that are missing on target devices
- **User Preservation**: Maintains user information (name, UID, privileges) during sync
- **Multi-stage Progress**: 4-stage response system provides real-time sync status
- **Sound Feedback**: Audio notification on completion (Thank You for success, Access Denied for failure)
- **Minimum Requirements**: Requires at least 2 enabled devices for synchronization
- **Background Processing**: Initial response in <100ms, total process typically 3-7 seconds
- **No UI Disruption**: Synchronization happens in background without affecting device displays

### 10. Delete Card Data (Remove Card Assignment from User)

**Request Topic**: `accessControl/user/command`

**Request Payload**:

```json
{
  "command": "deleteCard",
  "data": {
    "uid": 1
  }
}
```

**Parameters**:

- **`uid`**: Integer, **Required** - User ID to remove card assignment from

**Process Overview**:

1. **User Validation**: Checks if user exists and has card assignment
2. **Card Detection**: Identifies current card assignment across devices
3. **Parallel Deletion**: Removes card assignment from user across all devices simultaneously

**Response Topic**: `accessControl/user/response`

This command returns **3 sequential responses** showing card deletion progress:

#### Response 1 - Request Accepted (Immediate):

```json
{
  "status": "accepted",
  "message": "Card deletion request accepted for UID 1. Processing across 2 devices...",
  "data": {
    "uid": 1,
    "target_devices": 2,
    "processing_time": "0.02s",
    "status": "async_card_deletion_started"
  }
}
```

#### Response 2 - User Validation (after ~300ms):

```json
{
  "status": "validating",
  "message": "Validating card deletion for UID 1. Checking user existence...",
  "data": {
    "uid": 1,
    "target_devices": 2,
    "deletion_stage": 1,
    "status": "validation_in_progress"
  }
}
```

#### Response 3 - Card Deletion Started (after ~600ms):

```json
{
  "status": "deleting",
  "message": "Starting card deletion for John Doe (UID 1). Removing card 12345 from 2 devices...",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "card_number": 12345,
    "target_devices": 2,
    "deletion_stage": 2,
    "status": "card_deletion_in_progress"
  }
}
```

#### Response 4 - Final Result (after 2-5 seconds):

**Success Response** (Card deleted from all devices):

```json
{
  "status": "success",
  "message": "Card deleted successfully from all 2 devices for John Doe",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "card_number": 12345,
    "deletion_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": true,
        "message": "Card deleted successfully from Front Door",
        "status": "success"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": true,
        "message": "Card deleted successfully from Back Door",
        "status": "success"
      }
    ],
    "successful_deletions": 2,
    "failed_deletions": 0,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 2,
      "total_devices": 2
    },
    "deletion_stage": 3,
    "final_result": true
  }
}
```

**No Card Response** (User has no card assigned):

```json
{
  "status": "success",
  "message": "No card deletion needed for John Doe. User has no card assigned.",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "card_number": 0,
    "deletion_results": [],
    "successful_deletions": 0,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 2,
      "total_devices": 2
    },
    "deletion_stage": 3,
    "final_result": true
  }
}
```

**Partial Success Response** (Some devices failed):

```json
{
  "status": "partial_success",
  "message": "Card deleted from 1/2 devices for John Doe",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "card_number": 12345,
    "deletion_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": true,
        "message": "Card deleted successfully from Front Door",
        "status": "success"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": false,
        "message": "Failed to delete card from Back Door: Connection timeout",
        "status": "failed"
      }
    ],
    "successful_deletions": 1,
    "failed_deletions": 1,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 1,
      "total_devices": 2
    },
    "deletion_stage": 3,
    "final_result": true
  }
}
```

**Failed Response** (All devices failed):

```json
{
  "status": "failed",
  "message": "Failed to delete card from all devices for John Doe",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "card_number": 12345,
    "deletion_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": false,
        "message": "User not found on Front Door",
        "status": "failed"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": false,
        "message": "Failed to delete card from Back Door: Device not responding",
        "status": "failed"
      }
    ],
    "successful_deletions": 0,
    "failed_deletions": 2,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 0,
      "total_devices": 2
    },
    "deletion_stage": 3,
    "final_result": true
  }
}
```

**User Not Found Response**:

```json
{
  "status": "error",
  "message": "User with UID 1 not found on any device"
}
```

**Important Notes**:

- **User Must Exist**: User with specified UID must exist on at least one device
- **Card Assignment Removal**: Sets card number to 0 (removes card assignment) while preserving user data
- **Parallel Processing**: Card deletion occurs on all devices with the user simultaneously
- **Smart Detection**: Automatically finds which devices contain the user
- **User Data Preservation**: Maintains all user information (name, UID, privileges) except card assignment
- **Multi-stage Progress**: 3-stage response system provides real-time deletion status
- **Sound Feedback**: Audio notification on completion (Thank You for success, Access Denied for failure)
- **Graceful Handling**: Success response even if user has no card assigned
- **Background Processing**: Initial response in <100ms, total process typically 2-5 seconds
- **No UI Disruption**: Deletion happens in background without affecting device displays

### 11. Set User Role/Privilege (Access Level Management)

**Request Topic**: `accessControl/user/command`

**Request Payload**:

```json
{
  "command": "setUserRole",
  "data": {
    "uid": 1,
    "role": 2
  }
}
```

**Parameters**:

- **`uid`**: Integer, **Required** - User ID to update role for
- **`role`**: Integer, **Required** - New privilege level (0-3, 14)

**Role/Privilege Levels**:

- **0** = Normal User (can only authenticate)
- **1** = Enroll User (can enroll fingerprints)
- **2** = Admin (can manage users and settings)
- **3** = Super Admin (full device access)
- **14** = Super User (special administrative level)

**Process Overview**:

1. **User Validation**: Checks if user exists and gets current role
2. **Role Update**: Updates user privilege level across all devices
3. **Parallel Processing**: Updates role on all devices containing the user simultaneously

**Response Topic**: `accessControl/user/response`

This command returns **3 sequential responses** showing role update progress:

#### Response 1 - Request Accepted (Immediate):

```json
{
  "status": "accepted",
  "message": "User role update request accepted for UID 1. Processing across 2 devices...",
  "data": {
    "uid": 1,
    "role": 2,
    "role_name": "Admin",
    "target_devices": 2,
    "processing_time": "0.02s",
    "status": "async_role_update_started"
  }
}
```

#### Response 2 - User Validation (after ~300ms):

```json
{
  "status": "validating",
  "message": "Validating user role update for UID 1. Checking user existence...",
  "data": {
    "uid": 1,
    "role": 2,
    "role_name": "Admin",
    "target_devices": 2,
    "update_stage": 1,
    "status": "validation_in_progress"
  }
}
```

#### Response 3 - Role Update Started (after ~600ms):

```json
{
  "status": "updating",
  "message": "Updating role for John Doe (UID 1) from Normal User to Admin on 2 devices...",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "old_role": 0,
    "old_role_name": "Normal User",
    "new_role": 2,
    "new_role_name": "Admin",
    "target_devices": 2,
    "update_stage": 2,
    "status": "role_update_in_progress"
  }
}
```

#### Response 4 - Final Result (after 2-5 seconds):

**Success Response** (Role updated on all devices):

```json
{
  "status": "success",
  "message": "User role updated successfully on all 2 devices for John Doe",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "old_role": 0,
    "old_role_name": "Normal User",
    "new_role": 2,
    "new_role_name": "Admin",
    "update_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": true,
        "message": "Role updated successfully on Front Door from Normal User to Admin",
        "old_role": 0,
        "new_role": 2,
        "status": "success"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": true,
        "message": "Role updated successfully on Back Door from Normal User to Admin",
        "old_role": 0,
        "new_role": 2,
        "status": "success"
      }
    ],
    "successful_updates": 2,
    "failed_updates": 0,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 2,
      "total_devices": 2
    },
    "update_stage": 3,
    "final_result": true
  }
}
```

**Partial Success Response** (Some devices failed):

```json
{
  "status": "partial_success",
  "message": "User role updated on 1/2 devices for John Doe",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "old_role": 0,
    "old_role_name": "Normal User",
    "new_role": 2,
    "new_role_name": "Admin",
    "update_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": true,
        "message": "Role updated successfully on Front Door from Normal User to Admin",
        "old_role": 0,
        "new_role": 2,
        "status": "success"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": false,
        "message": "Failed to update role on Back Door: Connection timeout",
        "old_role": 0,
        "new_role": 2,
        "status": "failed"
      }
    ],
    "successful_updates": 1,
    "failed_updates": 1,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 1,
      "total_devices": 2
    },
    "update_stage": 3,
    "final_result": true
  }
}
```

**Failed Response** (All devices failed):

```json
{
  "status": "failed",
  "message": "Failed to update user role on all devices for John Doe",
  "data": {
    "uid": 1,
    "user_name": "John Doe",
    "old_role": 0,
    "old_role_name": "Normal User",
    "new_role": 2,
    "new_role_name": "Admin",
    "update_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "success": false,
        "message": "User not found on Front Door",
        "old_role": 0,
        "new_role": 2,
        "status": "failed"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "success": false,
        "message": "Failed to update role on Back Door: Device not responding",
        "old_role": 0,
        "new_role": 2,
        "status": "failed"
      }
    ],
    "successful_updates": 0,
    "failed_updates": 2,
    "total_devices": 2,
    "sound_feedback": {
      "successful_operations": 0,
      "total_devices": 2
    },
    "update_stage": 3,
    "final_result": true
  }
}
```

**Invalid Role Response**:

```json
{
  "status": "error",
  "message": "Invalid role. Valid values: 0=Normal User, 1=Enroll User, 2=Admin, 3=Super Admin, 14=Super User"
}
```

**User Not Found Response**:

```json
{
  "status": "error",
  "message": "User with UID 1 not found on any device"
}
```

**Important Notes**:

- **User Must Exist**: User with specified UID must exist on at least one device
- **Role Preservation**: Updates only privilege level while preserving all other user data
- **Parallel Processing**: Role update occurs on all devices with the user simultaneously
- **Smart Detection**: Automatically finds which devices contain the user
- **Data Integrity**: Maintains user information (name, card, password, etc.) during role change
- **Multi-stage Progress**: 3-stage response system provides real-time update status
- **Sound Feedback**: Audio notification on completion (Thank You for success, Access Denied for failure)
- **Role Validation**: Validates role values against ZKTeco standard privilege levels
- **Background Processing**: Initial response in <100ms, total process typically 2-5 seconds
- **No UI Disruption**: Update happens in background without affecting device displays
- **Access Control**: Higher privilege levels have more access rights on the devices

**Role Usage Examples**:

- **Normal User (0)**: Standard employees with access only
- **Enroll User (1)**: Staff who can register fingerprints for others
- **Admin (2)**: Managers who can manage users and basic settings
- **Super Admin (3)**: IT staff with full device configuration access
- **Super User (14)**: Special administrative role for system management

# Attendance Management

### 1. Live Attendance Monitoring

**Command**: `startLiveMonitoring`  
**Topic**: `accessControl/attendance/command`

#### 1.1 Monitor All Devices

```json
{
  "command": "startLiveMonitoring",
  "data": {
    "poll_interval": 2
  }
}
```

#### 1.2 Monitor Specific Devices

```json
{
  "command": "startLiveMonitoring",
  "data": {
    "device_ids": ["device_1", "device_2"],
    "poll_interval": 3
  }
}
```

**Response Topic**: `accessControl/attendance/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Live monitoring started on 2 devices",
  "data": {
    "monitoring_devices": ["device_1", "device_2"],
    "poll_interval": 2,
    "live_topic": "accessControl/attendance/live"
  }
}
```

### 2. Stop Live Attendance Monitoring

**Request Topic**: `accessControl/attendance/command`

**Request Payload**:

```json
{
  "command": "stopLiveMonitoring"
}
```

**Response Topic**: `accessControl/attendance/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Live monitoring stopped on 2 devices",
  "data": {
    "stopped_devices": 2
  }
}
```

### 3. Get Monitoring Status

**Request Topic**: `accessControl/attendance/command`

**Request Payload**:

```json
{
  "command": "getMonitoringStatus"
}
```

**Response Topic**: `accessControl/attendance/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Monitoring status retrieved",
  "data": {
    "is_monitoring": true,
    "active_devices": ["device_1", "device_2"],
    "total_monitoring_devices": 2,
    "last_check": "2025-01-20T10:30:45Z"
  }
}
```

### 4. Get Attendance History

**Request Topic**: `accessControl/attendance/command`

**From All Devices**:

```json
{
  "command": "getAttendanceHistory",
  "data": {
    "limit": 50
  }
}
```

**From Specific Device**:

```json
{
  "command": "getAttendanceHistory",
  "data": {
    "device_id": "device_1",
    "limit": 100
  }
}
```

**Response Topic**: `accessControl/attendance/response`

**Success Response**:

```json
{
  "status": "success",
  "message": "Retrieved 25 attendance records from 2/2 devices",
  "data": {
    "query_type": "all_devices",
    "total_records": 25,
    "records": [
      {
        "timestamp": "2025-01-20T10:10:29Z",
        "name": "alfi",
        "uid": 1,
        "device": "device_1",
        "device_name": "Main Entrance",
        "via": "fingerprint",
        "status": "success",
        "punch_type": "check_in",
        "verify_code": 1,
        "event_type": "attendance"
      },
      {
        "timestamp": "2025-01-20T10:05:15Z",
        "name": "john_doe",
        "uid": 2,
        "device": "device_2",
        "device_name": "Back Door",
        "via": "card",
        "status": "failed",
        "punch_type": "check_in",
        "verify_code": 23,
        "event_type": "attendance"
      }
    ],
    "device_summaries": [
      {
        "device_id": "device_1",
        "device_name": "Main Entrance",
        "status": "success",
        "record_count": 15
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "status": "success",
        "record_count": 10
      }
    ],
    "successful_devices": 2,
    "total_devices": 2
  }
}
```

### 5. Live Attendance Stream

**Live Stream Topic**: `accessControl/attendance/live`

**Real-time Attendance Data** (Published automatically when monitoring is active):

```json
{
  "timestamp": "2025-01-20T10:10:29Z",
  "name": "alfi",
  "uid": 1,
  "device": "device_1",
  "device_name": "Main Entrance",
  "via": "fingerprint",
  "status": "success",
  "punch_type": "check_in",
  "verify_code": 1,
  "event_type": "attendance"
}
```

**Access Control Success Example**:

```json
{
  "timestamp": "2025-01-20T10:10:29Z",
  "name": "alfi",
  "uid": 1,
  "device": "device_1",
  "device_name": "Main Entrance",
  "via": "fingerprint",
  "status": "success",
  "punch_type": "check_in",
  "verify_code": 1,
  "event_type": "attendance"
}
```

**Access Control Failure Example**:

```json
{
  "timestamp": "2025-01-20T10:12:45Z",
  "name": "unknown_user",
  "uid": 999,
  "device": "device_1",
  "device_name": "Main Entrance",
  "via": "fingerprint",
  "status": "failed",
  "punch_type": "check_in",
  "verify_code": 36,
  "event_type": "attendance"
}
```

### Attendance Data Fields

- **`timestamp`**: ISO 8601 formatted timestamp with timezone
- **`name`**: User's full name (or UID_xxx if name not found)
- **`uid`**: User's unique identifier
- **`device`**: Device ID where the event occurred
- **`device_name`**: Human-readable device name
- **`via`**: Access method (`fingerprint`, `card`, `password`, `face`, `unknown`)
- **`status`**: Access result (`success` or `failed`)
- **`punch_type`**: Type of attendance (`check_in`, `check_out`, `break_in`, `break_out`, `overtime_in`, `overtime_out`)
- **`verify_code`**: Raw verification code from device
- **`event_type`**: Always `"attendance"` for attendance records

### Verify Code Reference

- **0** - Password access
- **1-10** - Fingerprint access (success)
- **15** - Card access (success)
- **23** - Face not registered (failed)
- **36** - Fingerprint not registered (failed)
- **200** - Face access (success)

## Error Codes

### Device Errors

- `CONNECTION_TIMEOUT`: Device connection timeout
- `CONNECTION_REFUSED`: Device refused connection
- `AUTHENTICATION_FAILED`: Device authentication failed
- `DEVICE_BUSY`: Device is busy with another operation
- `DEVICE_NOT_FOUND`: Device with specified ID not found
- `DEVICE_ALREADY_EXISTS`: Device with ID already exists
- `INVALID_DEVICE_DATA`: Invalid device data provided
- `CONFIG_SAVE_FAILED`: Failed to save device configuration

### User Errors

- `USER_NOT_FOUND`: User with specified UID not found
- `USER_ALREADY_EXISTS`: User with UID already exists
- `INVALID_USER_DATA`: Invalid user data provided
- `SYNC_FAILED`: User sync to devices failed
- `MISSING_REQUIRED_FIELD`: Required field missing in request
- `NO_ENABLED_DEVICES`: No enabled devices found for user operations

### System Errors

- `CONFIG_ERROR`: Configuration file error
- `MQTT_DISCONNECTED`: MQTT broker disconnected
- `INSUFFICIENT_PERMISSIONS`: Insufficient permissions for operation
- `RESOURCE_UNAVAILABLE`: Required resource unavailable

## 🚀 Usage Examples (Ultra-Minimal Payloads)

### Test All Devices Example

```bash
# Test all devices with minimal payload
mosquitto_pub -h localhost -t "accessControl/device/command" -m '{
  "command": "testConnection",
  "data": {"device_id": "all"}
}'

# Subscribe to response
mosquitto_sub -h localhost -t "accessControl/device/response"
```

### Add Device Example

```bash
# Add device with minimal payload (only required fields)
mosquitto_pub -h localhost -t "accessControl/device/command" -m '{
  "command": "addDevice",
  "data": {
    "id": "device_3",
    "name": "Office Door",
    "ip": "192.168.0.203"
  }
}'
```

### Update Device Example

```bash
# Update device IP address
mosquitto_pub -h localhost -t "accessControl/device/command" -m '{
  "command": "updateDevice",
  "data": {
    "device_id": "device_3",
    "ip": "192.168.0.204"
  }
}'
```

### Delete Device Example

```bash
# Delete device
mosquitto_pub -h localhost -t "accessControl/device/command" -m '{
  "command": "deleteDevice",
  "data": {
    "device_id": "device_3"
  }
}'
```

### List Devices Example

```bash
# List all devices
mosquitto_pub -h localhost -t "accessControl/device/command" -m '{
  "command": "listDevices"
}'

# Subscribe to responses
mosquitto_sub -h localhost -t "accessControl/device/response"
```

### User Management Examples

```bash
# Create user with minimal payload (only name required)
mosquitto_pub -h localhost -t "accessControl/user/command" -m '{
  "command": "createData",
  "data": {
    "name": "John Doe"
  }
}'

# Create user with name and password (recommended minimal)
mosquitto_pub -h localhost -t "accessControl/user/command" -m '{
  "command": "createData",
  "data": {
    "name": "John Doe",
    "password": "123456"
  }
}'

# Create user with all parameters
mosquitto_pub -h localhost -t "accessControl/user/command" -m '{
  "command": "createData",
  "data": {
    "name": "John Doe",
    "uid": 15,
    "privilege": 0,
    "password": "123456",
    "group_id": 0,
    "user_id": "john_doe",
    "card": 0
  }
}'

# Get all users from all devices
mosquitto_pub -h localhost -t "accessControl/user/command" -m '{
  "command": "getData"
}'

# Get all users from specific device
mosquitto_pub -h localhost -t "accessControl/user/command" -m '{
  "command": "getData",
  "data": {
    "device_id": "device_1"
  }
}'

# Get user by UID from all devices
mosquitto_pub -h localhost -t "accessControl/user/command" -m '{
  "command": "getByUID",
  "data": {
    "uid": 15
  }
}'

# Update user
mosquitto_pub -h localhost -t "accessControl/user/command" -m '{
  "command": "updateData",
  "data": {
    "uid": 15,
    "name": "John Updated",
    "privilege": 1
  }
}'

# Delete user
mosquitto_pub -h localhost -t "accessControl/user/command" -m '{
  "command": "deleteData",
  "data": {
    "uid": 15
  }
}'

# Subscribe to user responses
mosquitto_sub -h localhost -t "accessControl/user/response"

# Subscribe to device responses
mosquitto_sub -h localhost -t "accessControl/device/response"
```

### Attendance Management Examples

```bash
# Start live attendance monitoring on all devices
mosquitto_pub -h localhost -t "accessControl/attendance/command" -m '{
  "command": "startLiveMonitoring",
  "data": {
    "poll_interval": 2
  }
}'

# Start monitoring on specific devices with custom interval
mosquitto_pub -h localhost -t "accessControl/attendance/command" -m '{
  "command": "startLiveMonitoring",
  "data": {
    "device_ids": ["device_1"],
    "poll_interval": 3
  }
}'

# Stop live attendance monitoring
mosquitto_pub -h localhost -t "accessControl/attendance/command" -m '{
  "command": "stopLiveMonitoring"
}'

# Get monitoring status
mosquitto_pub -h localhost -t "accessControl/attendance/command" -m '{
  "command": "getMonitoringStatus"
}'

# Get attendance history from all devices (last 50 records)
mosquitto_pub -h localhost -t "accessControl/attendance/command" -m '{
  "command": "getAttendanceHistory",
  "data": {
    "limit": 50
  }
}'

# Get attendance history from specific device
mosquitto_pub -h localhost -t "accessControl/attendance/command" -m '{
  "command": "getAttendanceHistory",
  "data": {
    "device_id": "device_1",
    "limit": 100
  }
}'

# Subscribe to live attendance stream
mosquitto_sub -h localhost -t "accessControl/attendance/live"

# Subscribe to attendance command responses
mosquitto_sub -h localhost -t "accessControl/attendance/response"
```

## Configuration Files

### Device Configuration: `JSON/access_control_config.json`

```json
{
  "devices": [
    {
      "id": "device_1",
      "name": "Main Entrance",
      "ip": "192.168.0.201",
      "port": 4370,
      "password": 0,
      "timeout": 5,
      "force_udp": false,
      "enabled": true
    },
    {
      "id": "device_2",
      "name": "Back Door",
      "ip": "192.168.0.202",
      "port": 4370,
      "password": 0,
      "timeout": 5,
      "force_udp": false,
      "enabled": true
    }
  ],
  "settings": {
    "default_timeout": 5,
    "default_port": 4370,
    "max_retries": 3,
    "verbose": true
  }
}
```

### MQTT Configuration: `JSON/mqtt_config.json`

```json
{
  "mqtt": {
    "broker": "localhost",
    "port": 1883,
    "keepalive": 60,
    "client_id": "zkteco_device_manager",
    "username": "",
    "password": ""
  },
  "mqtt_settings": {
    "qos": 1,
    "retain": false
  }
}
```

## Running the System

### Command Line Usage

```bash
# Start the middleware service
python main.py --service

# Test configuration
python main.py --test-config

# Test device connections
python main.py --test-devices

# List all devices
python main.py --list-devices
```

### Service Mode

The middleware runs as a persistent service listening for MQTT commands and publishing responses in real-time.

## Logging

All operations are logged with detailed information including:

- Command execution details
- Device communication logs
- Error tracking and debugging
- CRUD operation results
- Configuration changes

---

# 4. Device Synchronization

This section covers automatic and manual device synchronization features including device discovery, health monitoring, and failed device recovery.

**Command Topic**: `accessControl/user/command`
**Response Topic**: `accessControl/user/response`
**Status Topic**: `accessControl/system/status`

## 4.1 Start Automatic Synchronization

**Command**: `startAutoSync`

Start automatic device synchronization scheduler that runs at specified intervals.

### Request Format

```json
{
  "command": "startAutoSync",
  "interval_hours": 1
}
```

### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `interval_hours` | integer | No | 1 | Synchronization interval in hours (1-24) |

### Response

```json
{
  "status": "success",
  "message": "Auto-sync scheduler started with 1 hour interval",
  "data": {
    "interval_hours": 1,
    "status": "started",
    "start_time": "2024-01-15T10:30:00Z"
  }
}
```

### Example

**Request:**
```json
{
  "command": "startAutoSync",
  "interval_hours": 2
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Auto-sync scheduler started with 2 hour interval",
  "data": {
    "interval_hours": 2,
    "status": "started",
    "start_time": "2024-01-15T10:30:00Z"
  }
}
```

## 4.2 Stop Automatic Synchronization

**Command**: `stopAutoSync`

Stop the automatic device synchronization scheduler.

### Request Format

```json
{
  "command": "stopAutoSync"
}
```

### Response

```json
{
  "status": "success",
  "message": "Auto-sync scheduler stopped",
  "data": {
    "status": "stopped",
    "stop_time": "2024-01-15T12:30:00Z"
  }
}
```

## 4.3 Manual Device Synchronization

**Command**: `manualSync`

Perform immediate synchronization between devices. Can sync all devices or specific devices only.

### Request Format

```json
{
  "command": "manualSync",
  "device_ids": ["device_1", "device_2"]
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `device_ids` | array | No | List of specific device IDs to sync. If omitted, all enabled devices will be synced |

### Response

```json
{
  "status": "success",
  "message": "Device synchronization completed for 3 devices",
  "data": {
    "devices_synced": 3,
    "duration_seconds": 12.5,
    "start_time": "2024-01-15T10:30:00Z",
    "end_time": "2024-01-15T10:30:12Z",
    "card_sync": {
      "status": "success",
      "message": "Card synchronization completed"
    },
    "user_sync": {
      "status": "success",
      "message": "User sync completed - 15 users synced across devices",
      "total_users": 25,
      "sync_results": [
        {
          "device_id": "device_1",
          "device_name": "Front Door",
          "synced_users": 5,
          "total_missing": 5
        }
      ]
    }
  }
}
```

### Example - Sync All Devices

**Request:**
```json
{
  "command": "manualSync"
}
```

### Example - Sync Specific Devices

**Request:**
```json
{
  "command": "manualSync",
  "device_ids": ["front_door", "back_door"]
}
```

## 4.4 Device Discovery

**Command**: `discoverDevices`

Discover and test connectivity of all configured devices, providing real-time device status and health information.

### Request Format

```json
{
  "command": "discoverDevices"
}
```

### Response

```json
{
  "status": "success",
  "message": "Device discovery completed - 3/4 devices accessible",
  "data": {
    "total_devices": 4,
    "discovery_duration": 5.2,
    "timestamp": "2024-01-15T10:30:00Z",
    "accessible_devices": [
      {
        "device_id": "device_1",
        "name": "Front Door",
        "ip": "192.168.1.100",
        "users_count": 25,
        "templates_count": 45,
        "status": "online",
        "serial_number": "DGD9190019060",
        "firmware_version": "6.60",
        "last_check": "2024-01-15T10:30:00Z"
      },
      {
        "device_id": "device_2",
        "name": "Back Door",
        "ip": "192.168.1.101",
        "users_count": 20,
        "templates_count": 35,
        "status": "online",
        "serial_number": "DGD9190019061",
        "firmware_version": "6.60",
        "last_check": "2024-01-15T10:30:00Z"
      }
    ],
    "failed_devices": [
      {
        "device_id": "device_3",
        "name": "Side Door",
        "ip": "192.168.1.102",
        "status": "offline",
        "error": "Network timeout after 5 seconds",
        "last_check": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

## 4.5 Reset Failed Devices

**Command**: `resetFailedDevices`

Attempt to reset and recover devices that have failed multiple connectivity tests.

### Request Format

```json
{
  "command": "resetFailedDevices"
}
```

### Response

```json
{
  "status": "success",
  "message": "Reset completed - 2/3 devices reset successfully",
  "data": {
    "total_attempted": 3,
    "successful_resets": 2,
    "remaining_failed_devices": 1,
    "reset_results": [
      {
        "device_id": "device_1",
        "device_name": "Front Door",
        "status": "success",
        "message": "Device reset successful"
      },
      {
        "device_id": "device_2",
        "device_name": "Back Door",
        "status": "success",
        "message": "Device reset successful"
      },
      {
        "device_id": "device_3",
        "device_name": "Side Door",
        "status": "failed",
        "error": "Connection timeout during reset"
      }
    ]
  }
}
```

## 4.6 Get Synchronization Status

**Command**: `getSyncStatus`

Get comprehensive status information about device synchronization, including scheduler status, sync history, and device health.

### Request Format

```json
{
  "command": "getSyncStatus"
}
```

### Response

```json
{
  "status": "success",
  "message": "Sync status retrieved",
  "data": {
    "auto_sync_enabled": true,
    "sync_interval_hours": 1,
    "last_sync_time": "2024-01-15T09:30:00Z",
    "total_syncs_performed": 24,
    "failed_devices_count": 1,
    "failed_devices": ["device_3"],
    "device_health_status": {
      "device_1": {
        "status": "online",
        "last_check": "2024-01-15T10:30:00Z",
        "consecutive_failures": 0
      },
      "device_2": {
        "status": "online",
        "last_check": "2024-01-15T10:30:00Z",
        "consecutive_failures": 0
      },
      "device_3": {
        "status": "offline",
        "last_error": "Network timeout",
        "consecutive_failures": 5,
        "last_check": "2024-01-15T10:25:00Z"
      }
    },
    "recent_sync_history": [
      {
        "type": "scheduled",
        "start_time": "2024-01-15T09:30:00Z",
        "end_time": "2024-01-15T09:30:15Z",
        "devices_count": 2,
        "result": {
          "status": "success",
          "devices_synced": 2
        }
      },
      {
        "type": "manual",
        "start_time": "2024-01-15T08:45:00Z",
        "end_time": "2024-01-15T08:45:10Z",
        "devices_count": 3,
        "result": {
          "status": "success",
          "devices_synced": 3
        }
      }
    ]
  }
}
```

## 4.7 Automatic Sync Notifications

When automatic synchronization is enabled, the system publishes periodic status updates to the system status topic.

**Topic**: `accessControl/system/status`

### Scheduled Sync Notification

```json
{
  "event_type": "scheduled_sync_completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "result": {
    "status": "success",
    "message": "Device synchronization completed for 3 devices",
    "data": {
      "devices_synced": 3,
      "duration_seconds": 8.2,
      "card_sync": {
        "status": "success"
      },
      "user_sync": {
        "status": "success",
        "total_users": 25
      }
    }
  }
}
```

## Device Synchronization Features

✅ **Automatic Scheduling**
- Configurable hourly synchronization (1-24 hours)
- Background scheduler with thread management
- Automatic device discovery before each sync
- Smart sync skipping when insufficient devices

✅ **Manual Synchronization**
- On-demand sync for all devices or specific devices
- Real-time progress reporting
- Comprehensive sync results with timing
- User and card synchronization support

✅ **Device Discovery & Health Monitoring**
- Parallel device connectivity testing
- Real-time device information collection (users, templates, firmware)
- Device health status tracking
- Failed device detection and tracking
- Consecutive failure counting

✅ **Failed Device Recovery**
- Automatic device reset for failed devices
- Smart retry logic with exponential backoff
- Device recovery status reporting
- Failed device cooldown management

✅ **Comprehensive Status Reporting**
- Real-time sync status and history
- Device health monitoring dashboard
- Sync performance metrics
- MQTT integration for all sync operations

✅ **Data Synchronization**
- User data sync across all devices
- Card synchronization (existing feature integration)
- Smart differential sync (only missing data)
- Cross-device data consistency

---

## Features Removed

The following features have been removed from this simplified version:

- ❌ Fingerprint enrollment and synchronization
- ❌ Card registration and management

## Available Features

✅ **Device CRUD Operations**

- Add new devices to configuration
- Update existing device settings
- Delete devices from configuration
- List all configured devices

✅ **Device Connection Testing**

- Test connection to single device
- Test connection to all devices
- Get device information and status
- Response time measurement

✅ **User CRUD Operations**

- Create user with auto-sync to all devices
- Get users from specific device or all devices
- Get user by UID with device filtering
- Update user with auto-sync to all devices
- Delete user from all devices
- Auto-generate UID for new users
- Duplicate user detection and merging

✅ **User Synchronization**

- Automatic sync to all enabled devices
- Real-time sync status reporting
- Error handling per device
- Rollback on sync failures
- Device filtering (enabled/disabled)

✅ **Configuration Management**

- Auto-create default configurations
- Persistent JSON-based storage
- Configuration validation
- Error handling with rollback

✅ **Live Attendance Monitoring**

- Real-time attendance tracking with threading
- Live stream publishing to MQTT topic
- Access control success/failure tracking
- Configurable polling intervals
- Multi-device monitoring support
- Start/stop monitoring commands

✅ **Attendance History**

- Retrieve attendance records from devices
- Filter by specific device or all devices
- Configurable record limits
- Detailed attendance information with user names
- Access method detection (fingerprint, card, password, face)
- Success/failure status tracking

✅ **Device Synchronization**

- Automatic hourly synchronization scheduler (configurable 1-24 hours)
- Manual on-demand synchronization for all or specific devices
- Real-time device discovery and connectivity testing
- Device health monitoring with consecutive failure tracking
- Failed device reset and recovery functionality
- Comprehensive sync status reporting and history
- User and card data synchronization across devices
- Smart differential sync (only missing data)
- MQTT integration for all sync operations
- Background threading with safe scheduler management

✅ **MQTT Integration**

- Standardized topic structure
- Command/response pattern
- Error handling and reporting
- Connection management
- Separate response topics for device, user, and attendance operations
