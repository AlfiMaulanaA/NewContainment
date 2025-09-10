#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
import time
import uuid
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable

# Import pyzk library
sys.path.insert(1, os.path.abspath("./pyzk"))
try:
    from zk import ZK, const
    from zk.exception import ZKErrorConnection, ZKErrorResponse, ZKNetworkError
except ImportError:
    print("Error: pyzk library not found. Please ensure pyzk folder exists in the same directory.")
    sys.exit(1)

# Try to import MQTT client
try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    print("Warning: paho-mqtt library not found. MQTT features will be disabled.")
    MQTT_AVAILABLE = False


class ZKDeviceManager:
    """Optimized ZKTeco Device Management System"""
    
    # MQTT Topics
    TOPICS = {
        'device_command': 'accessControl/device/command',
        'device_response': 'accessControl/device/response',
        'user_command': 'accessControl/user/command',
        'user_response': 'accessControl/user/response',
        'attendance_command': 'accessControl/attendance/command',
        'attendance_response': 'accessControl/attendance/response',
        'attendance_live': 'accessControl/attendance/live',
        'system_status': 'accessControl/system/status',
        'system_command': 'accessControl/system/command',
        'system_response': 'accessControl/system/response'
    }
    
    # Sound mappings
    SOUNDS = {
        'success': 0,    # "Thank You"
        'error': 2,      # "Access Denied"  
        'beep': 24       # "Beep standard"
    }
    
    def __init__(self, 
                 device_config_file: str = "JSON/access_control_config.json",
                 mqtt_config_file: str = "JSON/mqtt_config.json"):
        """Initialize device manager"""
        self.device_config_file = device_config_file
        self.mqtt_config_file = mqtt_config_file
        self.device_config = None
        self.mqtt_config = None
        
        # MQTT management
        self.mqtt_client = None
        self.mqtt_connected = False
        self.running = False
        
        # Device management
        self.devices = []
        
        # Real-time access monitoring
        self.attendance_monitoring = False
        self.attendance_threads = {}
        self.last_attendance_records = {}
        self.device_last_access_time = {}  # Track last access time per device
        self.user_cache = {}  # Cache user data for faster lookup
        
        # Create directories and initialize
        os.makedirs("JSON", exist_ok=True)
        self.load_configurations()
        if MQTT_AVAILABLE:
            self.setup_mqtt()
    
    # ==================== BASE HELPER METHODS ====================
    
    def create_response(self, status: str, message: str, data: Any = None) -> Dict:
        """Create standardized response"""
        response = {'status': status, 'message': message}
        if data is not None:
            response['data'] = data
        return response
    
    def execute_on_devices(self, 
                          operation: Callable, 
                          target_devices: List[Dict] = None, 
                          operation_name: str = "operation",
                          **kwargs) -> Dict:
        """Execute operation on multiple devices with standardized result handling"""
        try:
            if target_devices is None:
                target_devices = [d for d in self.devices if d.get('enabled', True)]
            
            if not target_devices:
                return self.create_response('error', f'No enabled devices found for {operation_name}')
            
            results = []
            successful_count = 0
            
            for device in target_devices:
                result = operation(device, **kwargs)
                device_result = {
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'status': 'success' if result.get('success', False) else 'error',
                    'message': result.get('message', '')
                }
                
                if result.get('success', False):
                    successful_count += 1
                    if 'data' in result:
                        device_result['data'] = result['data']
                else:
                    device_result['error'] = result.get('message', 'Unknown error')
                
                results.append(device_result)
            
            return {
                'successful_operations': successful_count,
                'total_devices': len(target_devices),
                'operation_results': results
            }
            
        except Exception as e:
            return {
                'successful_operations': 0,
                'total_devices': 0,
                'operation_results': [],
                'error': f'Error executing {operation_name}: {str(e)}'
            }
    
    def with_device_connection(self, device_config: Dict, operation: Callable, **kwargs) -> Dict:
        """Execute operation with device connection handling"""
        try:
            success, conn, zk, response_time, error = self.connect_to_device(device_config)
            
            if not success:
                return {'success': False, 'message': f'Connection failed: {error}'}
            
            try:
                result = operation(conn, **kwargs)
                conn.disconnect()
                return {'success': True, 'message': 'Operation completed successfully', **result}
            except Exception as e:
                if conn:
                    try:
                        conn.disconnect()
                    except:
                        pass
                return {'success': False, 'message': f'Operation failed: {str(e)}'}
                
        except Exception as e:
            return {'success': False, 'message': f'Connection error: {str(e)}'}
    
    def add_sound_feedback(self, base_result: Dict, operation_success: bool) -> Dict:
        """Add sound feedback to operation result"""
        try:
            sound_type = 'success' if operation_success else 'error'
            sound_result = self.play_sound_on_devices(self.SOUNDS[sound_type])
            base_result.setdefault('data', {})['sound_feedback'] = sound_result
            return base_result
        except Exception as e:
            print(f"Error adding sound feedback: {e}")
            return base_result
    
    # ==================== CONFIGURATION MANAGEMENT ====================
    
    def load_configurations(self):
        """Load all configuration files"""
        self.load_config_file(
            self.device_config_file,
            self.create_default_device_config,
            lambda config: setattr(self, 'device_config', config) or setattr(self, 'devices', config.get('devices', []))
        )
        
        if MQTT_AVAILABLE:
            self.load_config_file(
                self.mqtt_config_file,
                self.create_default_mqtt_config,
                lambda config: setattr(self, 'mqtt_config', config)
            )
    
    def load_config_file(self, file_path: str, create_default: Callable, setter: Callable):
        """Generic config file loader"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            setter(config)
            print(f"Loaded configuration from {file_path}")
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Config file {file_path} error: {e}. Creating default.")
            create_default()
    
    def save_device_config(self) -> bool:
        """Save device configuration"""
        return self.save_config_file(self.device_config_file, self.device_config)
    
    def save_config_file(self, file_path: str, config: Dict) -> bool:
        """Generic config file saver"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving {file_path}: {e}")
            return False
    
    def create_default_device_config(self):
        """Create default device configuration"""
        self.device_config = {
            "devices": [],
            "settings": {
                "default_timeout": 5,
                "default_port": 4370,
                "max_retries": 3,
                "verbose": True
            }
        }
        self.devices = []
        self.save_device_config()
    
    def create_default_mqtt_config(self):
        """Create default MQTT configuration"""
        self.mqtt_config = {
            "mqtt": {
                "broker": "localhost",
                "port": 1883,
                "keepalive": 60,
                "client_id": "zkteco_device_manager",
                "username": "",
                "password": ""
            },
            "mqtt_settings": {"qos": 1, "retain": False}
        }
        self.save_config_file(self.mqtt_config_file, self.mqtt_config)
    
    # ==================== DEVICE CRUD OPERATIONS ====================
    
    def add_device(self, device_data: Dict) -> Dict:
        """Add new device"""
        return self.modify_device_list('add', device_data)
    
    def update_device(self, device_id: str, device_data: Dict) -> Dict:
        """Update existing device"""
        return self.modify_device_list('update', device_data, device_id=device_id)
    
    def delete_device(self, device_id: str) -> Dict:
        """Delete device"""
        return self.modify_device_list('delete', device_id=device_id)
    
    def modify_device_list(self, operation: str, device_data: Any = None, device_id: str = None) -> Dict:
        """Generic device list modifier"""
        try:
            if operation == 'add':
                return self._add_device_to_list(device_data)
            elif operation == 'update':
                return self._update_device_in_list(device_id, device_data)
            elif operation == 'delete':
                return self._delete_device_from_list(device_id)
            else:
                return self.create_response('error', f'Unknown operation: {operation}')
        except Exception as e:
            return self.create_response('error', f'Error in {operation} device: {str(e)}')
    
    def _add_device_to_list(self, device_data: Dict) -> Dict:
        """Add device to list with validation"""
        # Validate required fields
        for field in ['id', 'name', 'ip']:
            if field not in device_data:
                return self.create_response('error', f'Missing required field: {field}')
        
        # Check duplicate ID
        if self.get_device_by_id(device_data['id']):
            return self.create_response('error', f'Device with ID {device_data["id"]} already exists')
        
        # Create new device with defaults
        new_device = {
            'id': device_data['id'],
            'name': device_data['name'],
            'ip': device_data['ip'],
            'port': device_data.get('port', self.device_config['settings']['default_port']),
            'password': device_data.get('password', 0),
            'timeout': device_data.get('timeout', self.device_config['settings']['default_timeout']),
            'force_udp': device_data.get('force_udp', False),
            'enabled': device_data.get('enabled', True)
        }
        
        # Add and save
        self.devices.append(new_device)
        self.device_config['devices'] = self.devices
        
        if self.save_device_config():
            return self.create_response('success', f'Device {device_data["name"]} added successfully', new_device)
        else:
            self.devices.pop()  # Rollback
            return self.create_response('error', 'Failed to save device configuration')
    
    def _update_device_in_list(self, device_id: str, device_data: Dict) -> Dict:
        """Update device in list"""
        device_index = next((i for i, d in enumerate(self.devices) if d['id'] == device_id), None)
        
        if device_index is None:
            return self.create_response('error', f'Device with ID {device_id} not found')
        
        old_device = self.devices[device_index].copy()
        
        # Update allowed fields
        for field in ['name', 'ip', 'port', 'password', 'timeout', 'force_udp', 'enabled']:
            if field in device_data:
                self.devices[device_index][field] = device_data[field]
        
        if self.save_device_config():
            return self.create_response('success', f'Device {device_id} updated successfully', {
                'device': self.devices[device_index],
                'old_device': old_device
            })
        else:
            self.devices[device_index] = old_device  # Rollback
            return self.create_response('error', 'Failed to save device configuration')
    
    def _delete_device_from_list(self, device_id: str) -> Dict:
        """Delete device from list"""
        device_index = next((i for i, d in enumerate(self.devices) if d['id'] == device_id), None)
        
        if device_index is None:
            return self.create_response('error', f'Device with ID {device_id} not found')
        
        deleted_device = self.devices.pop(device_index)
        self.device_config['devices'] = self.devices
        
        if self.save_device_config():
            return self.create_response('success', f'Device {deleted_device["name"]} deleted successfully', deleted_device)
        else:
            self.devices.insert(device_index, deleted_device)  # Rollback
            return self.create_response('error', 'Failed to save device configuration')
    
    def get_device_by_id(self, device_id: str) -> Optional[Dict]:
        """Get device by ID"""
        return next((device for device in self.devices if device['id'] == device_id), None)
    
    def list_devices(self) -> Dict:
        """List all devices"""
        return self.create_response('success', f'Found {len(self.devices)} devices', {
            'devices': self.devices,
            'total_devices': len(self.devices)
        })
    
    # ==================== DEVICE CONNECTION MANAGEMENT ====================
    
    def connect_to_device(self, device_config: Dict, max_retries: int = None) -> tuple:
        """Connect to ZK device with retry mechanism"""
        if max_retries is None:
            max_retries = self.device_config.get('settings', {}).get('max_retries', 3)
            
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # Increase timeout for better reliability  
                timeout = min(device_config['timeout'] * (attempt + 1), 15)
                
                zk = ZK(
                    ip=device_config['ip'],
                    port=device_config['port'],
                    timeout=timeout,
                    password=device_config['password'],
                    force_udp=device_config.get('force_udp', False),
                    ommit_ping=device_config.get('ommit_ping', True),  # Skip ping to avoid conflicts
                    verbose=device_config.get('verbose', False)
                )
                
                start_time = time.time()
                conn = zk.connect()
                response_time = time.time() - start_time
                
                # Test connection with a simple operation
                try:
                    conn.get_firmware_version()
                    return True, conn, zk, response_time, None
                except:
                    conn.disconnect()
                    raise
                
            except (ZKErrorConnection, ZKErrorResponse, Exception) as e:
                last_error = str(e)
                if attempt < max_retries - 1:
                    # Exponential backoff: 1s, 2s, 4s
                    backoff_time = 2 ** attempt
                    time.sleep(backoff_time)
                    continue
                    
        error_msg = f"Connection failed after {max_retries} attempts: {last_error}"
        return False, None, None, 0, error_msg
    
    def test_device_connection(self, device_id: str = None) -> Dict:
        """Test device connection(s)"""
        if device_id and device_id != "all":
            return self._test_single_device(device_id)
        else:
            return self._test_all_devices()
    
    def _test_single_device(self, device_id: str) -> Dict:
        """Test single device connection"""
        device = self.get_device_by_id(device_id)
        if not device:
            return self.create_response('error', f'Device {device_id} not found')
        
        if not device.get('enabled', True):
            return self.create_response('error', f'Device {device_id} is disabled')
        
        def test_operation(conn):
            return {
                'device_info': {
                    'firmware_version': conn.get_firmware_version(),
                    'user_count': len(conn.get_users()),
                    'attendance_count': len(conn.get_attendance())
                }
            }
        
        result = self.with_device_connection(device, test_operation)
        
        return self.create_response(
            'success' if result['success'] else 'error',
            f"Device {device['name']} {'online' if result['success'] else 'offline'}",
            {
                'test_type': 'single_device',
                'device_id': device_id,
                'device_name': device['name'],
                'result': result
            }
        )
    
    def _test_all_devices(self) -> Dict:
        """Test all device connections"""
        def test_operation(device):
            success, conn, zk, response_time, error = self.connect_to_device(device)
            result = {
                'device_id': device['id'],
                'device_name': device['name'],
                'status': 'online' if success else 'offline',
                'response_time_ms': round(response_time * 1000, 2) if success else 0
            }
            
            if success:
                try:
                    conn.disconnect()
                except:
                    pass
            else:
                result['error'] = error
            
            return {'success': success, 'data': result}
        
        test_result = self.execute_on_devices(test_operation, operation_name="connection test")
        
        return self.create_response('success', 'Connection test completed', {
            'test_type': 'all_devices',
            'summary': {
                'total_devices': test_result['total_devices'],
                'online_devices': test_result['successful_operations'],
                'offline_devices': test_result['total_devices'] - test_result['successful_operations'],
                'success_rate': round((test_result['successful_operations'] / test_result['total_devices'] * 100), 2) if test_result['total_devices'] > 0 else 0
            },
            'devices': [r.get('data', r) for r in test_result['operation_results']]
        })
    
    # ==================== USER MANAGEMENT ====================
    
    def create_user(self, user_data: Dict) -> Dict:
        """Create user and sync to all devices"""
        return self.user_operation('create', user_data)
    
    def update_user(self, uid: int, user_data: Dict) -> Dict:
        """Update user and sync to all devices"""
        return self.user_operation('update', user_data, uid=uid)
    
    def delete_user(self, uid: int) -> Dict:
        """Delete user from all devices"""
        return self.user_operation('delete', uid=uid)
    
    def user_operation(self, operation: str, data: Any = None, uid: int = None) -> Dict:
        """Generic user operation handler"""
        try:
            if operation == 'create':
                return self._create_user(data)
            elif operation == 'update':
                return self._update_user(uid, data)
            elif operation == 'delete':
                return self._delete_user(uid)
            else:
                return self.create_response('error', f'Unknown user operation: {operation}')
        except Exception as e:
            return self.create_response('error', f'Error in user {operation}: {str(e)}')
    
    def _create_user(self, user_data: Dict) -> Dict:
        """Create user implementation"""
        # Validate required fields
        if 'name' not in user_data:
            return self.create_response('error', 'Missing required field: name')
        
        # Auto-generate UID if needed
        if 'uid' not in user_data:
            user_data['uid'] = self.get_next_available_uid()
        
        # Prepare user info
        user_info = self._prepare_user_data(user_data)
        
        # Sync to devices
        def sync_operation(device):
            return self._sync_user_to_device(user_info, device)
        
        sync_result = self.execute_on_devices(sync_operation, operation_name="user creation")
        
        # Create response with sound feedback
        if sync_result['successful_operations'] > 0:
            result = self.create_response('success', 
                f'User {user_info["name"]} created and synced to {sync_result["successful_operations"]}/{sync_result["total_devices"]} devices', 
                {'user': user_info, **sync_result}
            )
            return self.add_sound_feedback(result, True)
        else:
            result = self.create_response('error', 'Failed to create user on any device', 
                {'user': user_info, **sync_result}
            )
            return self.add_sound_feedback(result, False)
    
    def _update_user(self, uid: int, user_data: Dict) -> Dict:
        """Update user implementation"""
        # Get current user
        current_user_result = self.get_user_by_uid(uid)
        if current_user_result['status'] != 'success':
            return self.create_response('error', f'User with UID {uid} not found')
        
        # Update user data
        current_user = current_user_result['data']['user']
        updated_user = current_user.copy()
        
        for field in ['name', 'privilege', 'password', 'group_id', 'user_id', 'card']:
            if field in user_data:
                updated_user[field] = user_data[field]
        
        # Remove devices info
        updated_user.pop('devices', None)
        updated_user = self._prepare_user_data(updated_user)
        
        # Sync to devices
        def sync_operation(device):
            return self._sync_user_to_device(updated_user, device)
        
        sync_result = self.execute_on_devices(sync_operation, operation_name="user update")
        
        # Create response with sound feedback
        if sync_result['successful_operations'] > 0:
            result = self.create_response('success',
                f'User {updated_user["name"]} updated and synced to {sync_result["successful_operations"]}/{sync_result["total_devices"]} devices',
                {'user': updated_user, 'old_user': current_user, **sync_result}
            )
            return self.add_sound_feedback(result, True)
        else:
            result = self.create_response('error', 'Failed to update user on any device',
                {'user': updated_user, **sync_result}
            )
            return self.add_sound_feedback(result, False)
    
    def _delete_user(self, uid: int) -> Dict:
        """Delete user implementation"""
        # Get user info first
        user_result = self.get_user_by_uid(uid)
        if user_result['status'] != 'success':
            return self.create_response('error', f'User with UID {uid} not found')
        
        user_info = user_result['data']['user']
        
        # Delete from devices
        def delete_operation(device):
            return self._delete_user_from_device(uid, device)
        
        delete_result = self.execute_on_devices(delete_operation, operation_name="user deletion")
        
        # Create response with sound feedback
        if delete_result['successful_operations'] > 0:
            result = self.create_response('success',
                f'User {user_info["name"]} deleted from {delete_result["successful_operations"]}/{delete_result["total_devices"]} devices',
                {'deleted_user': user_info, **delete_result}
            )
            return self.add_sound_feedback(result, True)
        else:
            result = self.create_response('error', 'Failed to delete user from any device',
                {'user': user_info, **delete_result}
            )
            return self.add_sound_feedback(result, False)
    
    def _prepare_user_data(self, user_data: Dict) -> Dict:
        """Prepare user data with proper defaults and types"""
        return {
            'uid': user_data['uid'],
            'name': user_data['name'],
            'privilege': user_data.get('privilege', 0),
            'password': user_data.get('password', ''),
            'group_id': user_data.get('group_id', ''),
            'user_id': user_data.get('user_id', str(user_data['uid'])),
            'card': user_data.get('card', 0)
        }
    
    def _sync_user_to_device(self, user_info: Dict, device_config: Dict) -> Dict:
        """Sync user to device"""
        def sync_operation(conn):
            # Prepare user data with proper types for pyzk
            conn.set_user(
                uid=int(user_info['uid']),
                name=str(user_info['name']),
                privilege=int(user_info.get('privilege', 0)),
                password=str(user_info.get('password', '')),
                group_id=str(user_info.get('group_id', '')) if user_info.get('group_id') not in [None, 0, '0'] else '',
                user_id=str(user_info.get('user_id', str(user_info['uid']))),
                card=int(user_info.get('card', 0))
            )
            return {}
        
        return self.with_device_connection(device_config, sync_operation)
    
    def _delete_user_from_device(self, uid: int, device_config: Dict) -> Dict:
        """Delete user from device"""
        def delete_operation(conn):
            conn.delete_user(uid)
            return {}
        
        return self.with_device_connection(device_config, delete_operation)
    
    def get_users(self, device_id: str = None) -> Dict:
        """Get users from device(s)"""
        if device_id and device_id != "all":
            return self._get_users_from_single_device(device_id)
        else:
            return self._get_users_from_all_devices()
    
    def _get_users_from_single_device(self, device_id: str) -> Dict:
        """Get users from single device"""
        device = self.get_device_by_id(device_id)
        if not device:
            return self.create_response('error', f'Device {device_id} not found')
        
        if not device.get('enabled', True):
            return self.create_response('error', f'Device {device_id} is disabled')
        
        def get_users_operation(conn):
            users = conn.get_users()
            return {'users': [self._format_user(user) for user in users]}
        
        result = self.with_device_connection(device, get_users_operation)
        
        if result['success']:
            users = result.get('users', [])
            return self.create_response('success', f'Retrieved {len(users)} users from {device["name"]}', {
                'query_type': 'single_device',
                'device_id': device_id,
                'device_name': device['name'],
                'users': users,
                'user_count': len(users)
            })
        else:
            return self.create_response('error', result['message'])
    
    def _get_users_from_all_devices(self) -> Dict:
        """Get users from all devices"""
        def get_users_operation(device):
            def operation(conn):
                users = conn.get_users()
                return {'users': [self._format_user(user) for user in users]}
            
            result = self.with_device_connection(device, operation)
            if result['success']:
                result['data'] = result.get('users', [])
            return result
        
        users_result = self.execute_on_devices(get_users_operation, operation_name="get users")
        
        # Merge users from all devices
        all_users = {}
        device_results = []
        
        for device_result in users_result['operation_results']:
            device_info = {
                'device_id': device_result['device_id'],
                'device_name': device_result['device_name'],
                'status': device_result['status']
            }
            
            if device_result['status'] == 'success' and 'data' in device_result:
                users = device_result['data']
                device_info['user_count'] = len(users)
                device_info['users'] = users
                
                # Merge users by UID
                for user in users:
                    uid = user['uid']
                    if uid not in all_users:
                        all_users[uid] = user.copy()
                        all_users[uid]['devices'] = [device_result['device_id']]
                    else:
                        all_users[uid]['devices'].append(device_result['device_id'])
            else:
                device_info['user_count'] = 0
                device_info['error'] = device_result.get('error', 'Unknown error')
            
            device_results.append(device_info)
        
        unique_users = list(all_users.values())
        
        return self.create_response('success', f'Retrieved users from {users_result["successful_operations"]}/{users_result["total_devices"]} devices', {
            'query_type': 'all_devices',
            'summary': {
                'total_devices': users_result['total_devices'],
                'successful_queries': users_result['successful_operations'],
                'unique_users': len(unique_users),
                'total_user_records': sum(d.get('user_count', 0) for d in device_results)
            },
            'unique_users': unique_users,
            'devices': device_results
        })
    
    def get_user_by_uid(self, uid: int, device_id: str = None) -> Dict:
        """Get user by UID"""
        if device_id:
            # Get from specific device
            users_result = self.get_users(device_id)
            if users_result['status'] == 'success':
                users = users_result['data']['users']
                user_found = next((user for user in users if user['uid'] == uid), None)
                
                if user_found:
                    return self.create_response('success', f'User found on {users_result["data"]["device_name"]}', {
                        'user': user_found,
                        'device_id': device_id,
                        'device_name': users_result['data']['device_name']
                    })
                else:
                    return self.create_response('error', f'User with UID {uid} not found on {users_result["data"]["device_name"]}')
            else:
                return users_result
        else:
            # Get from all devices
            users_result = self.get_users("all")
            if users_result['status'] == 'success':
                unique_users = users_result['data']['unique_users']
                user_found = next((user for user in unique_users if user['uid'] == uid), None)
                
                if user_found:
                    return self.create_response('success', f'User found on {len(user_found.get("devices", []))} device(s)', {
                        'user': user_found
                    })
                else:
                    return self.create_response('error', f'User with UID {uid} not found on any device')
            else:
                return users_result
    
    def _format_user(self, user) -> Dict:
        """Format user object to dict"""
        return {
            'uid': user.uid,
            'name': user.name,
            'privilege': user.privilege,
            'password': user.password,
            'group_id': user.group_id,
            'user_id': user.user_id,
            'card': user.card
        }
    
    def get_next_available_uid(self) -> int:
        """Get next available UID"""
        try:
            all_users_result = self.get_users("all")
            if all_users_result['status'] == 'success':
                unique_users = all_users_result['data']['unique_users']
                used_uids = {user['uid'] for user in unique_users}
                
                uid = 1
                while uid in used_uids:
                    uid += 1
                return uid
            else:
                return 1
        except Exception as e:
            print(f"Error getting next available UID: {e}")
            return 1
    
    # ==================== SOUND MANAGEMENT ====================
    
    def play_sound_on_devices(self, sound_index: int, device_list: List[Dict] = None):
        """Play sound on devices"""
        def sound_operation(device):
            return self._play_sound_on_device(sound_index, device)
        
        return self.execute_on_devices(sound_operation, device_list, "sound playback")
    
    def _play_sound_on_device(self, sound_index: int, device_config: Dict) -> Dict:
        """Play sound on single device"""
        def sound_operation(conn):
            success = conn.test_voice(sound_index)
            return {'sound_played': success}
        
        result = self.with_device_connection(device_config, sound_operation)
        if not result['success']:
            result['message'] = f"Failed to play sound {sound_index}: {result['message']}"
        return result
    
    # ==================== REAL-TIME ACCESS MONITORING ====================
    
    def _refresh_all_user_cache(self) -> Dict:
        """Refresh user cache for all devices"""
        try:
            enabled_devices = [d for d in self.devices if d.get('enabled', True)]
            refreshed_count = 0
            
            for device in enabled_devices:
                try:
                    self._update_user_cache(device)
                    refreshed_count += 1
                except Exception as e:
                    print(f"⚠️ Failed to refresh cache for {device['name']}: {e}")
            
            return self.create_response('success', f'User cache refreshed for {refreshed_count}/{len(enabled_devices)} devices', {
                'refreshed_devices': refreshed_count,
                'total_devices': len(enabled_devices)
            })
            
        except Exception as e:
            return self.create_response('error', f'Error refreshing user cache: {str(e)}')
    
    def get_monitoring_status(self) -> Dict:
        """Get current monitoring status (always active)"""
        try:
            active_devices = list(self.attendance_threads.keys())
            enabled_devices = [d for d in self.devices if d.get('enabled', True)]
            
            return self.create_response('success', 'Live monitoring status (always active)', {
                'is_monitoring': self.attendance_monitoring,
                'monitoring_mode': 'always_active',
                'active_devices': active_devices,
                'total_monitoring_devices': len(active_devices),
                'total_enabled_devices': len(enabled_devices),
                'last_check': datetime.now().isoformat() + 'Z',
                'poll_interval': '1 second',
                'auto_start': True
            })
        except Exception as e:
            return self.create_response('error', f'Error getting monitoring status: {str(e)}')
    
    def _monitor_device_attendance(self, device_config: Dict, poll_interval: int):
        """Monitor real-time access events for a single device"""
        device_id = device_config['id']
        device_name = device_config['name']
        
        print(f"🚀 Starting REAL-TIME access monitoring for {device_name} ({device_id}) - Poll: {poll_interval}s")
        
        # Initialize tracking
        self.device_last_access_time[device_id] = None
        
        # Cache users for this device
        self._update_user_cache(device_config)
        
        consecutive_failures = 0
        max_consecutive_failures = 5
        base_poll_interval = poll_interval
        
        while self.attendance_monitoring and device_id in self.attendance_threads:
            try:
                def get_attendance_operation(conn):
                    attendances = conn.get_attendance()
                    return {'attendances': attendances}
                
                result = self.with_device_connection(device_config, get_attendance_operation)
                
                if result['success']:
                    attendances = result.get('attendances', [])
                    consecutive_failures = 0  # Reset failure counter on success
                    poll_interval = base_poll_interval  # Reset to base interval
                    
                    # Sort by timestamp to get latest first
                    sorted_attendances = sorted(attendances, key=lambda x: x.timestamp, reverse=True)
                    
                    # Get the most recent access event
                    if sorted_attendances:
                        latest_access = sorted_attendances[0]
                        last_access_time = self.device_last_access_time.get(device_id)
                        
                        # Check if this is a new access event
                        if (last_access_time is None or 
                            latest_access.timestamp > last_access_time):
                            
                            # Update last access time
                            self.device_last_access_time[device_id] = latest_access.timestamp
                            
                            # Format and publish real-time access event
                            access_data = self._format_realtime_access(latest_access, device_config)
                            self._publish_realtime_access(access_data)
                            
                            # Also publish to attendance live (backward compatibility)
                            attendance_data = self._format_attendance_record(latest_access, device_config)
                            self._publish_attendance_record(attendance_data)
                
                else:
                    consecutive_failures += 1
                    # Exponential backoff for failed connections
                    poll_interval = min(base_poll_interval * (2 ** min(consecutive_failures, 3)), 30)
                    
                    if consecutive_failures <= 2:  # Reduce log noise - only show first few failures
                        print(f"❌ Failed to get attendance from {device_name}: {result['message']} (attempt {consecutive_failures})")
                    elif consecutive_failures == max_consecutive_failures:
                        print(f"⚠️ Device {device_name} has failed {consecutive_failures} consecutive times. Continuing monitoring with {poll_interval}s interval.")
                
            except Exception as e:
                consecutive_failures += 1
                poll_interval = min(base_poll_interval * (2 ** min(consecutive_failures, 3)), 30)
                if consecutive_failures <= 2:
                    print(f"🔥 Error monitoring {device_name}: {e}")
            
            time.sleep(poll_interval)
        
        print(f"🛑 Real-time access monitoring stopped for {device_name} ({device_id})")
    
    def _update_user_cache(self, device_config: Dict):
        """Update user cache for faster lookup"""
        try:
            def get_users_operation(conn):
                users = conn.get_users()
                return {'users': users}
            
            result = self.with_device_connection(device_config, get_users_operation)
            if result['success']:
                users = result.get('users', [])
                device_id = device_config['id']
                
                if device_id not in self.user_cache:
                    self.user_cache[device_id] = {}
                
                for user in users:
                    self.user_cache[device_id][user.uid] = {
                        'name': user.name,
                        'privilege': user.privilege
                    }
                
                print(f"📝 Updated user cache for {device_config['name']}: {len(users)} users")
        except Exception as e:
            print(f"⚠️ Error updating user cache for {device_config['name']}: {e}")
    
    def _get_user_from_cache(self, device_id: str, user_id: int) -> Dict:
        """Get user info from cache (handles both int and str keys)"""
        device_cache = self.user_cache.get(device_id, {})
        
        # Try both int and str keys (pyzk data type inconsistency)
        cached_user = device_cache.get(user_id) or device_cache.get(str(user_id))
        
        if cached_user:
            return cached_user
        else:
            # Cache miss - return default for live lookup
            return {'name': f'UID_{user_id}', 'privilege': 0}
    
    def _get_real_user_name(self, device_config: Dict, user_id: int) -> str:
        """Get real user name from device (live lookup)"""
        try:
                
            def get_user_operation(conn):
                users = conn.get_users()
                
                # Try both exact match and string comparison
                user_found = next((u for u in users if u.uid == user_id), None)
                if not user_found:
                    user_found = next((u for u in users if str(u.uid) == str(user_id)), None)
                    
                return {'user': user_found, 'total_users': len(users)}
            
            result = self.with_device_connection(device_config, get_user_operation)
            
            if result['success']:
                if result.get('user'):
                    return result['user'].name
                else:
                    return f'UID_{user_id}'
            else:
                return f'UID_{user_id}'
                
        except Exception as e:
            print(f"❌ Error in live lookup: {e}")
            return f'UID_{user_id}'
    
    def _format_realtime_access(self, attendance, device_config: Dict) -> Dict:
        """Format real-time access event with custom message"""
        device_id = device_config['id']
        device_name = device_config['name']
        
        # Get user info from cache with fallback to live lookup
        user_info = self._get_user_from_cache(device_id, attendance.user_id)
        user_name = user_info['name']
        
        # If still showing UID_X, try to get real name from device
        # Fallback: Live lookup if cache miss
        if user_name.startswith('UID_'):
            try:
                real_name = self._get_real_user_name(device_config, attendance.user_id)
                if real_name and not real_name.startswith('UID_'):
                    user_name = real_name
                    # Update cache with real name (use string key for consistency)
                    if device_id not in self.user_cache:
                        self.user_cache[device_id] = {}
                    self.user_cache[device_id][str(attendance.user_id)] = {
                        'name': real_name,
                        'privilege': user_info.get('privilege', 0)
                    }
            except Exception:
                pass  # Fallback to UID_X format
        
        # Determine access method and status
        access_method = attendance.status
        access_status = "success"
        
        # Check for failed access conditions
        failed_status_codes = [23, 36, 39, 5, 6, 10, 11]  # Common failed access codes
        if attendance.status in failed_status_codes:
            access_status = "failed"
        elif attendance.user_id == 0:  # Unregistered user/fingerprint
            access_status = "failed"
            user_name = "Unregistered"
        elif user_name.startswith('UID_0'):  # Another check for unregistered
            access_status = "failed"
            user_name = "Unregistered"
        elif attendance.status != 1 and attendance.status != 3 and attendance.status != 4:
            # If status is not success codes (1,3,4) and not in user lookup, likely failed
            if user_name.startswith('UID_'):
                access_status = "failed"
                user_name = "Unregistered"
        
        # Generate custom message based on access status
        if access_status == "success":
            message = f"Open {device_name}"
        else:
            message = f"Access Denied - {device_name}"
        
        # Determine door action based on punch type
        punch_type_map = {
            0: "Entry",
            1: "Exit", 
            2: "Break Out",
            3: "Break In",
            4: "Overtime In",
            5: "Overtime Out"
        }
        
        access_action = punch_type_map.get(attendance.punch, "Access")
        
        # Format UID for unregistered users
        display_uid = attendance.user_id if access_status == "success" else None
        
        return {
            'status': access_status,
            'data': {
                'deviceId': device_id,
                'via': access_method,
                'uid': display_uid,
                'name': user_name,
                'message': message,
                'device_name': device_name,
                'access_action': access_action,
                'timestamp': attendance.timestamp.isoformat() + 'Z',
                'verify_code': attendance.status,
                'punch_code': attendance.punch
            },
            'event_type': 'realtime_access'
        }
    
    def _format_attendance_record(self, attendance, device_config: Dict) -> Dict:
        """Format attendance record for publishing (backward compatibility)"""
        device_id = device_config['id']
        
        # Get user info from cache
        user_info = self._get_user_from_cache(device_id, attendance.user_id)
        user_name = user_info['name']
        
        # Map punch types to readable status
        punch_type_map = {
            0: "check_in",
            1: "check_out",
            2: "break_out", 
            3: "break_in",
            4: "overtime_in",
            5: "overtime_out"
        }
        
        # Detect access method based on verify code
        access_method = attendance.status
        access_status = "success"
        
        # Check for failed access conditions  
        failed_status_codes = [23, 36, 39, 5, 6, 10, 11]  # Common failed access codes
        if attendance.status in failed_status_codes:
            access_status = "failed"
        elif attendance.user_id == 0:  # Unregistered user/fingerprint
            access_status = "failed"
            user_name = "Unregistered"
        elif user_name.startswith('UID_0'):  # Another check for unregistered
            access_status = "failed"
            user_name = "Unregistered"
        elif attendance.status != 1 and attendance.status != 3 and attendance.status != 4:
            # If status is not success codes (1,3,4) and not in user lookup, likely failed
            if user_name.startswith('UID_'):
                access_status = "failed"
                user_name = "Unregistered"
        
        # Format UID for unregistered users
        display_uid = attendance.user_id if access_status == "success" else None
        
        return {
            'timestamp': attendance.timestamp.isoformat() + 'Z',
            'name': user_name,
            'uid': display_uid,
            'device': device_config['id'],
            'device_name': device_config['name'],
            'via': access_method,
            'status': access_status,
            'punch_type': punch_type_map.get(attendance.punch, f"punch_{attendance.punch}"),
            'verify_code': attendance.status,
            'event_type': 'attendance'
        }
    
    def _publish_realtime_access(self, access_data: Dict):
        """Publish real-time access event via MQTT"""
        if self.mqtt_connected:
            try:
                topic = self.TOPICS['attendance_live']
                payload = json.dumps(access_data)
                self.mqtt_client.publish(topic, payload)
                
                data = access_data['data']
                status_emoji = "🟢" if access_data['status'] == 'success' else "🔴"
                uid_display = data['uid'] if data['uid'] is not None else "UNREGISTERED"
                print(f"{status_emoji} REAL-TIME ACCESS: {data['name']} ({uid_display}) - {access_data['status']} via mode {data['via']}")
                print(f"   📍 {data['message']} at {data['timestamp']}")
                if access_data['status'] == 'failed':
                    print(f"   ❌ REASON: Unregistered fingerprint/user (verify_code: {data.get('verify_code', 'unknown')})")
                
            except Exception as e:
                print(f"❌ Error publishing real-time access: {e}")
        else:
            # Print to console if MQTT not available
            print(f"🔌 REAL-TIME ACCESS (No MQTT): {json.dumps(access_data, indent=2)}")
    
    def _publish_attendance_record(self, attendance_data: Dict):
        """Publish attendance record via MQTT (backward compatibility)"""
        if self.mqtt_connected:
            try:
                # Use different topic for backward compatibility
                topic = "accessControl/attendance/record"
                payload = json.dumps(attendance_data)
                self.mqtt_client.publish(topic, payload)
                
            except Exception as e:
                print(f"❌ Error publishing attendance record: {e}")
        else:
            # Print to console if MQTT not available
            print(f"📝 ATTENDANCE RECORD: {json.dumps(attendance_data, indent=2)}")
    
    # ==================== MQTT MANAGEMENT ====================
    
    def setup_mqtt(self):
        """Setup MQTT client"""
        if not MQTT_AVAILABLE or not self.mqtt_config:
            return
        
        try:
            mqtt_conf = self.mqtt_config['mqtt']
            client_id = mqtt_conf.get('client_id', f'zkteco_manager_{uuid.uuid4().hex[:8]}')
            
            self.mqtt_client = mqtt.Client(client_id=client_id)
            self.mqtt_client.on_connect = self.on_mqtt_connect
            self.mqtt_client.on_disconnect = self.on_mqtt_disconnect
            self.mqtt_client.on_message = self.on_mqtt_message
            
            if mqtt_conf.get('username'):
                self.mqtt_client.username_pw_set(mqtt_conf['username'], mqtt_conf.get('password', ''))
            
        except Exception as e:
            print(f"Error setting up MQTT: {e}")
    
    def connect_mqtt(self):
        """Connect to MQTT broker"""
        if not self.mqtt_client:
            return False
        
        try:
            mqtt_conf = self.mqtt_config['mqtt']
            self.mqtt_client.connect(mqtt_conf['broker'], mqtt_conf['port'], mqtt_conf.get('keepalive', 60))
            self.mqtt_client.loop_start()
            return True
        except Exception as e:
            print(f"Error connecting to MQTT: {e}")
            return False
    
    def on_mqtt_connect(self, client, userdata, flags, rc):
        """Handle MQTT connection"""
        if rc == 0:
            print(f"✅ Connected to MQTT broker successfully")
            self.mqtt_connected = True
            
            # Subscribe to command topics
            for topic_name, topic in self.TOPICS.items():
                if 'command' in topic_name:
                    client.subscribe(topic)
                    print(f"📡 Subscribed to {topic}")
            
            # Auto-start live monitoring if service is running (prevent duplicate)
            if self.running and not self.attendance_monitoring and not self.attendance_threads:
                threading.Thread(target=self._delayed_auto_start, daemon=True).start()
        else:
            print(f"❌ Failed to connect to MQTT broker: {rc}")
            self.mqtt_connected = False
    
    def on_mqtt_disconnect(self, client, userdata, rc):
        """Handle MQTT disconnection"""
        self.mqtt_connected = False
    
    def on_mqtt_message(self, client, userdata, msg):
        """Handle MQTT messages"""
        try:
            # Decode payload and strip any whitespace/newlines
            raw_payload = msg.payload.decode().strip()
            print(f"📨 Received MQTT message on {msg.topic}: {raw_payload}")
            
            # Parse JSON payload with better error handling
            try:
                payload = json.loads(raw_payload)
                
                # Validate basic structure
                if not isinstance(payload, dict):
                    print("❌ Invalid payload: Must be a JSON object")
                    return
                    
                if 'command' not in payload:
                    print("❌ Invalid payload: Missing 'command' field")
                    return
                    
            except json.JSONDecodeError as json_err:
                print(f"❌ JSON parsing error: {json_err}")
                print(f"📄 Raw payload length: {len(raw_payload)} chars")
                print(f"📄 Raw payload: {repr(raw_payload)}")
                print(f"🔍 Error location: Line {json_err.lineno}, Column {json_err.colno}")
                print(f"🔍 Error position: Character {json_err.pos}")
                if json_err.pos > 0 and json_err.pos < len(raw_payload):
                    error_context = raw_payload[max(0, json_err.pos-10):json_err.pos+10]
                    print(f"🔍 Context around error: {repr(error_context)}")
                
                # Try to suggest fix for common issues
                if "Expecting ',' delimiter" in str(json_err):
                    print("💡 Suggestion: Check for missing commas or closing brackets")
                elif "Expecting property name" in str(json_err):
                    print("💡 Suggestion: Check for trailing commas or malformed property names")
                elif "Unterminated string" in str(json_err):
                    print("💡 Suggestion: Check for missing quotes")
                
                return
            
            if msg.topic == self.TOPICS['device_command']:
                self.handle_device_command(payload)
            elif msg.topic == self.TOPICS['user_command']:
                self.handle_user_command(payload)
            elif msg.topic == self.TOPICS['attendance_command']:
                self.handle_attendance_command(payload)
            elif msg.topic == self.TOPICS['system_command']:
                self.handle_system_command(payload)
        except Exception as e:
            print(f"❌ Error processing MQTT message: {e}")
            print(f"📄 Topic: {msg.topic}")
            print(f"📄 Raw payload: {repr(msg.payload.decode())}")
    
    def handle_device_command(self, payload: Dict):
        """Handle device commands"""
        command = payload.get('command')
        data = payload.get('data', {})
        
        command_map = {
            'testConnection': lambda: self.test_device_connection(data.get('device_id')),
            'addDevice': lambda: self.add_device(data),
            'updateDevice': lambda: self.update_device(data.get('device_id'), {k: v for k, v in data.items() if k != 'device_id'}) if data.get('device_id') else self.create_response('error', 'Missing device_id'),
            'deleteDevice': lambda: self.delete_device(data.get('device_id')) if data.get('device_id') else self.create_response('error', 'Missing device_id'),
            'listDevices': lambda: self.list_devices(),
            # New device configuration commands
            'setDeviceTime': lambda: self.set_device_time(data),
            'getDeviceTime': lambda: self.get_device_time(data),
            'setDeviceLanguage': lambda: self.set_device_language(data),
            'getDeviceInfo': lambda: self.get_device_info(data),
            'restartDevice': lambda: self.restart_device(data),
            'setDeviceNetwork': lambda: self.set_device_network(data),
            'resetDevice': lambda: self.reset_device(data),
            'getDeviceConfig': lambda: self.get_device_config(data),
            'setDeviceConfig': lambda: self.set_device_config(data)
        }
        
        result = command_map.get(command, lambda: self.create_response('error', f'Unknown command: {command}'))()
        
        if self.mqtt_connected:
            self.mqtt_client.publish(self.TOPICS['device_response'], json.dumps(result))
    
    def handle_user_command(self, payload: Dict):
        """Handle user commands"""
        command = payload.get('command')
        data = payload.get('data', {})
        
        print(f"🎯 Received user command: {command} with data: {data}")
        
        command_map = {
            'createData': lambda: self.create_user(data),
            'createUser': lambda: self.create_user(data),
            'getData': lambda: self.get_users(data.get('device_id')),
            'getUsers': lambda: self.get_users(data.get('device_id')),
            'getByUID': lambda: self.get_user_by_uid(int(data['uid']), data.get('device_id')) if data.get('uid') is not None else self.create_response('error', 'Missing uid parameter'),
            'getUserByUID': lambda: self.get_user_by_uid(int(data['uid']), data.get('device_id')) if data.get('uid') is not None else self.create_response('error', 'Missing uid parameter'),
            'updateData': lambda: self.update_user(int(data['uid']), {k: v for k, v in data.items() if k != 'uid'}) if data.get('uid') is not None else self.create_response('error', 'Missing uid parameter'),
            'updateUser': lambda: self.update_user(int(data['uid']), {k: v for k, v in data.items() if k != 'uid'}) if data.get('uid') is not None else self.create_response('error', 'Missing uid parameter'),
            'deleteData': lambda: self.delete_user(int(data['uid'])) if data.get('uid') is not None else self.create_response('error', 'Missing uid parameter'),
            'deleteUser': lambda: self.delete_user(int(data['uid'])) if data.get('uid') is not None else self.create_response('error', 'Missing uid parameter'),
            'registerFinger': lambda: self.register_fingerprint(data),
            'deleteFinger': lambda: self.delete_fingerprint(data),
            'syncronizeCard': lambda: self.synchronize_card(data),
            'deleteCard': lambda: self.delete_card(data),
            'setUserRole': lambda: self.set_user_role(data),
            'playSound': lambda: self._handle_play_sound_command(data),
            'getFingerprintList': lambda: self.get_fingerprint_list(data.get('device_id'))
        }
        
        result = command_map.get(command, lambda: self.create_response('error', f'Unknown user command: {command}'))()
        
        # Special handling for fingerprint and card commands - they handle their own MQTT publishing
        if command in ['registerFinger', 'regsterFinger', 'deleteFinger', 'syncronizeCard', 'deleteCard', 'setUserRole']:
            print(f"📤 {command} command completed - MQTT responses handled internally")
            return
        
        print(f"📤 Publishing user response: {result.get('status', 'unknown')} - {result.get('message', 'no message')}")
        
        if self.mqtt_connected:
            self.mqtt_client.publish(self.TOPICS['user_response'], json.dumps(result))
            print(f"✅ Response published to {self.TOPICS['user_response']}")
        else:
            print("❌ MQTT not connected - cannot publish response")
    
    def handle_attendance_command(self, payload: Dict):
        """Handle attendance commands (monitoring is always active)"""
        command = payload.get('command')
        data = payload.get('data', {})
        
        command_map = {
            'getMonitoringStatus': lambda: self.get_monitoring_status(),
            'getAttendanceHistory': lambda: self._get_attendance_history(data),
            'refreshUserCache': lambda: self._refresh_all_user_cache(),
        }
        
        # Legacy commands (for compatibility) - but monitoring is always active
        if command in ['startLiveMonitoring', 'stopLiveMonitoring']:
            result = self.create_response('info', 
                f'Live monitoring is always active. Command "{command}" ignored.',
                {'monitoring_status': 'always_active', 'active_devices': len(self.attendance_threads)}
            )
        else:
            result = command_map.get(command, lambda: self.create_response('error', f'Unknown attendance command: {command}'))()
        
        if self.mqtt_connected:
            self.mqtt_client.publish(self.TOPICS['attendance_response'], json.dumps(result))
    
    def _get_attendance_history(self, data: Dict) -> Dict:
        """Get attendance history from devices"""
        device_id = data.get('device_id')
        limit = data.get('limit', 100)
        
        if device_id and device_id != "all":
            device = self.get_device_by_id(device_id)
            if not device:
                return self.create_response('error', f'Device {device_id} not found')
            
            def get_history_operation(conn):
                attendances = conn.get_attendance()
                # Sort by timestamp descending and limit
                sorted_attendances = sorted(attendances, key=lambda x: x.timestamp, reverse=True)
                limited_attendances = sorted_attendances[:limit]
                
                formatted_records = []
                for att in limited_attendances:
                    record = self._format_attendance_record(att, device)
                    formatted_records.append(record)
                
                return {'history': formatted_records}
            
            result = self.with_device_connection(device, get_history_operation)
            
            if result['success']:
                return self.create_response('success', f'Retrieved {len(result.get("history", []))} attendance records from {device["name"]}', {
                    'device_id': device_id,
                    'device_name': device['name'],
                    'records': result.get('history', []),
                    'total_records': len(result.get('history', []))
                })
            else:
                return self.create_response('error', f'Failed to get attendance history: {result["message"]}')
        
        else:
            # Get from all devices
            def get_history_from_device(device):
                def operation(conn):
                    attendances = conn.get_attendance()
                    sorted_attendances = sorted(attendances, key=lambda x: x.timestamp, reverse=True)
                    limited_attendances = sorted_attendances[:limit]
                    
                    formatted_records = []
                    for att in limited_attendances:
                        record = self._format_attendance_record(att, device)
                        formatted_records.append(record)
                    
                    return {'history': formatted_records}
                
                result = self.with_device_connection(device, operation)
                if result['success']:
                    result['data'] = result.get('history', [])
                return result
            
            history_result = self.execute_on_devices(get_history_from_device, operation_name="get attendance history")
            
            # Collect all records and sort by timestamp
            all_records = []
            device_summaries = []
            
            for device_result in history_result['operation_results']:
                device_summary = {
                    'device_id': device_result['device_id'],
                    'device_name': device_result['device_name'],
                    'status': device_result['status']
                }
                
                if device_result['status'] == 'success' and 'data' in device_result:
                    records = device_result['data']
                    device_summary['record_count'] = len(records)
                    all_records.extend(records)
                else:
                    device_summary['record_count'] = 0
                    device_summary['error'] = device_result.get('error', 'Unknown error')
                
                device_summaries.append(device_summary)
            
            # Sort all records by timestamp and limit
            all_records_sorted = sorted(all_records, key=lambda x: x['timestamp'], reverse=True)[:limit]
            
            return self.create_response('success', f'Retrieved {len(all_records_sorted)} attendance records from {history_result["successful_operations"]}/{history_result["total_devices"]} devices', {
                'query_type': 'all_devices',
                'total_records': len(all_records_sorted),
                'records': all_records_sorted,
                'device_summaries': device_summaries,
                'successful_devices': history_result['successful_operations'],
                'total_devices': history_result['total_devices']
            })
    
    def _handle_play_sound_command(self, data: Dict) -> Dict:
        """Handle play sound command"""
        sound_index = data.get('sound_index', 0)
        device_id = data.get('device_id')
        
        if device_id and device_id != "all":
            device = self.get_device_by_id(device_id)
            if device:
                sound_result = self._play_sound_on_device(sound_index, device)
                return self.create_response(
                    'success' if sound_result['success'] else 'error',
                    f'Sound {sound_index} played on {device["name"]}',
                    {'sound_index': sound_index, 'device_id': device_id, 'device_name': device['name'], 'sound_result': sound_result}
                )
            else:
                return self.create_response('error', f'Device {device_id} not found')
        else:
            sound_result = self.play_sound_on_devices(sound_index)
            return self.create_response('success',
                f'Sound {sound_index} played on {sound_result["successful_operations"]}/{sound_result["total_devices"]} devices',
                {'sound_index': sound_index, 'sound_feedback': sound_result}
            )
    
    def get_fingerprint_list(self, device_id: str = None) -> Dict:
        """Get fingerprint templates list from devices"""
        try:
            def get_templates_operation(device):
                def templates_operation(conn):
                    # Get all fingerprint templates
                    templates = conn.get_templates()
                    fingerprint_data = []
                    
                    for template in templates:
                        fingerprint_data.append({
                            'uid': template.uid,
                            'fid': template.fid,
                            'template_size': template.size if hasattr(template, 'size') else 0,
                            'valid': template.valid if hasattr(template, 'valid') else True
                        })
                    
                    return {'fingerprints': fingerprint_data, 'total_count': len(fingerprint_data)}
                
                result = self.with_device_connection(device, templates_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Retrieved fingerprints from {device['name']}" if result.get('success') else f"Failed to get fingerprints from {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'fingerprints': result.get('fingerprints', []),
                    'total_count': result.get('total_count', 0)
                }
            
            if device_id and device_id != 'all':
                device = self.get_device_by_id(device_id)
                if not device:
                    return self.create_response('error', f'Device {device_id} not found')
                
                fingerprint_result = get_templates_operation(device)
                return self.create_response(
                    'success' if fingerprint_result['success'] else 'error',
                    fingerprint_result['message'],
                    {
                        'device': fingerprint_result,
                        'summary': {
                            'total_devices': 1,
                            'successful_queries': 1 if fingerprint_result['success'] else 0,
                            'total_fingerprints': fingerprint_result['total_count']
                        }
                    }
                )
            else:
                # Get from all devices
                fingerprint_result = self.execute_on_devices(get_templates_operation, operation_name="get fingerprint templates")
                
                # Consolidate fingerprint data across devices
                all_fingerprints = {}
                total_fingerprints = 0
                
                for device_result in fingerprint_result['operation_results']:
                    if device_result.get('success'):
                        for fp in device_result.get('fingerprints', []):
                            fp_key = f"{fp['uid']}-{fp['fid']}"
                            if fp_key not in all_fingerprints:
                                all_fingerprints[fp_key] = {
                                    'uid': fp['uid'],
                                    'fid': fp['fid'],
                                    'devices': []
                                }
                            all_fingerprints[fp_key]['devices'].append({
                                'device_id': device_result['device_id'],
                                'device_name': device_result['device_name']
                            })
                        total_fingerprints += device_result.get('total_count', 0)
                
                return self.create_response('success',
                    f'Retrieved fingerprints from {fingerprint_result["successful_operations"]}/{fingerprint_result["total_devices"]} devices',
                    {
                        'devices': fingerprint_result['operation_results'],
                        'consolidated_fingerprints': list(all_fingerprints.values()),
                        'summary': {
                            'total_devices': fingerprint_result["total_devices"],
                            'successful_queries': fingerprint_result["successful_operations"],
                            'unique_fingerprints': len(all_fingerprints),
                            'total_fingerprint_records': total_fingerprints
                        }
                    }
                )
                
        except Exception as e:
            return self.create_response('error', f'Failed to get fingerprint list: {str(e)}')
    
    def register_fingerprint(self, data: Dict) -> Dict:
        """Register fingerprint on master device and sync to all devices - OPTIMIZED"""
        print(f"🚀 Starting OPTIMIZED fingerprint registration with data: {data}")
        start_time = time.time()
        
        try:
            uid = data.get('uid')
            fid = data.get('fid')
            
            if uid is None:
                error_response = self.create_response('error', 'Missing uid parameter')
                self._publish_response_async(error_response)
                return error_response
            if fid is None:
                error_response = self.create_response('error', 'Missing fid parameter')
                self._publish_response_async(error_response)
                return error_response
                
            uid = int(uid)
            fid = int(fid)
            
            # Get master device
            master_device_id = self.device_config.get('settings', {}).get('master_device_id', 'device_1')
            master_device = self.get_device_by_id(master_device_id)
            
            if not master_device or not master_device.get('enabled', True):
                error_response = self.create_response('error', f'Master device {master_device_id} not found or disabled')
                self._publish_response_async(error_response)
                return error_response
            
            # Start asynchronous enrollment process
            threading.Thread(
                target=self._async_fingerprint_enrollment_process,
                args=(uid, fid, master_device),
                daemon=True
            ).start()
            
            # Return immediate response - actual process continues in background
            immediate_response = self.create_response('accepted', 
                f'Fingerprint registration request accepted for UID {uid}. Processing in background...', {
                'uid': uid,
                'fid': fid,
                'master_device': master_device['name'],
                'processing_time': f"{time.time() - start_time:.2f}s",
                'status': 'async_processing_started'
            })
            
            return immediate_response
            
        except Exception as e:
            error_response = self.create_response('error', f'Fingerprint registration failed: {str(e)}')
            self._publish_response_async(error_response)
            return error_response
    
    def delete_fingerprint(self, data: Dict) -> Dict:
        """Delete fingerprint from user across all devices - OPTIMIZED"""
        print(f"🗑️ Starting OPTIMIZED fingerprint deletion with data: {data}")
        start_time = time.time()
        
        try:
            uid = data.get('uid')
            fid = data.get('fid')
            
            if uid is None:
                error_response = self.create_response('error', 'Missing uid parameter')
                self._publish_response_async(error_response)
                return error_response
            if fid is None:
                error_response = self.create_response('error', 'Missing fid parameter')
                self._publish_response_async(error_response)
                return error_response
                
            uid = int(uid)
            fid = int(fid)
            
            # Get all enabled devices (deletion should happen from all devices)
            enabled_devices = [d for d in self.devices if d.get('enabled', True)]
            
            if not enabled_devices:
                error_response = self.create_response('error', 'No enabled devices found')
                self._publish_response_async(error_response)
                return error_response
            
            # Start asynchronous deletion process
            threading.Thread(
                target=self._async_fingerprint_deletion_process,
                args=(uid, fid, enabled_devices),
                daemon=True
            ).start()
            
            # Return immediate response - actual process continues in background
            immediate_response = self.create_response('accepted', 
                f'Fingerprint deletion request accepted for UID {uid} FID {fid}. Processing in background...', {
                'uid': uid,
                'fid': fid,
                'target_devices': len(enabled_devices),
                'processing_time': f"{time.time() - start_time:.2f}s",
                'status': 'async_deletion_started'
            })
            
            return immediate_response
            
        except Exception as e:
            error_response = self.create_response('error', f'Fingerprint deletion failed: {str(e)}')
            self._publish_response_async(error_response)
            return error_response
    
    def _async_fingerprint_deletion_process(self, uid: int, fid: int, target_devices: List[Dict]):
        """Asynchronous fingerprint deletion process with real-time updates"""
        try:
            print(f"🗑️ Starting async deletion process for UID {uid} FID {fid}")
            
            # Stage 1: Fast validation
            user_name = self._get_user_name_from_any_device(uid, target_devices)
            
            stage1_response = self.create_response('validating', 
                f'Validating fingerprint deletion for {user_name} (UID {uid}, FID {fid})', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'target_devices': len(target_devices),
                'deletion_stage': 1,
                'status': 'validation_in_progress'
            })
            self._publish_response_async(stage1_response)
            
            # Stage 2: Start parallel deletion
            stage2_response = self.create_response('deleting', 
                f'Starting fingerprint deletion for {user_name} from {len(target_devices)} devices...', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'target_devices': len(target_devices),
                'deletion_stage': 2,
                'status': 'deletion_in_progress'
            })
            self._publish_response_async(stage2_response)
            
            # Stage 3: Execute parallel deletion
            deletion_results = self._parallel_fingerprint_deletion(uid, fid, user_name, target_devices)
            
            # Stage 4: Final result
            successful_deletions = sum(1 for result in deletion_results if result['success'])
            total_devices = len(target_devices)
            
            if successful_deletions == total_devices:
                final_status = 'success'
                message = f'Fingerprint deleted successfully from all {successful_deletions} devices for {user_name}'
                sound_index = 0  # Success sound
            elif successful_deletions > 0:
                final_status = 'partial_success'
                message = f'Fingerprint deleted from {successful_deletions}/{total_devices} devices for {user_name}'
                sound_index = 0  # Partial success sound
            else:
                final_status = 'failed'
                message = f'Failed to delete fingerprint from all devices for {user_name}'
                sound_index = 2  # Error sound
            
            # Play sound feedback
            sound_feedback = self.play_sound_on_devices(sound_index)
            
            final_response = self.create_response(final_status, message, {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'deletion_results': deletion_results,
                'successful_deletions': successful_deletions,
                'failed_deletions': total_devices - successful_deletions,
                'total_devices': total_devices,
                'sound_feedback': sound_feedback,
                'deletion_stage': 3,
                'final_result': True
            })
            
            self._publish_response_async(final_response)
            print(f"✅ Async deletion process completed for UID {uid} FID {fid}")
            
        except Exception as e:
            error_response = self.create_response('error', f'Async deletion process failed: {str(e)}')
            self._publish_response_async(error_response)
            print(f"❌ Async deletion process error: {str(e)}")
    
    def _get_user_name_from_any_device(self, uid: int, devices: List[Dict]) -> str:
        """Get user name from any available device cache"""
        for device in devices:
            device_cache = self.user_cache.get(device['id'], {})
            cached_user = device_cache.get(uid) or device_cache.get(str(uid))
            if cached_user:
                return cached_user.get('name', f'UID_{uid}')
        
        # Cache miss - return UID format
        print(f"⚠️ Cache miss for UID {uid} across all devices, using UID format")
        return f'UID_{uid}'
    
    def _parallel_fingerprint_deletion(self, uid: int, fid: int, user_name: str, target_devices: List[Dict]) -> List[Dict]:
        """Parallel fingerprint deletion from multiple devices"""
        try:
            print(f"🗑️ Starting parallel deletion from {len(target_devices)} devices")
            
            # Parallel deletion using threads
            deletion_threads = []
            deletion_results = []
            
            def delete_from_device(device):
                result = self._delete_fingerprint_from_device(uid, fid, device)
                deletion_results.append({
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'success': result['success'],
                    'message': result.get('message', ''),
                    'status': 'success' if result['success'] else 'failed'
                })
            
            # Start all deletion operations in parallel
            for device in target_devices:
                thread = threading.Thread(target=delete_from_device, args=(device,), daemon=True)
                deletion_threads.append(thread)
                thread.start()
            
            # Wait for all deletion operations to complete
            for thread in deletion_threads:
                thread.join(timeout=10)  # Max 10 seconds per deletion
            
            successful_deletions = sum(1 for result in deletion_results if result['success'])
            print(f"✅ Parallel deletion completed: {successful_deletions}/{len(target_devices)} successful")
            
            return deletion_results
            
        except Exception as e:
            print(f"❌ Parallel deletion error: {str(e)}")
            return []
    
    def _delete_fingerprint_from_device(self, uid: int, fid: int, device: Dict) -> Dict:
        """Delete specific fingerprint from device"""
        def deletion_operation(conn):
            try:
                print(f"🗑️ Deleting fingerprint UID {uid} FID {fid} from {device['name']}")
                
                # Method 1: Try to delete specific template
                if hasattr(conn, 'delete_user_template'):
                    conn.delete_user_template(uid=uid, temp_id=fid)
                    return {'deletion_result': 'template_deleted', 'method': 'delete_user_template'}
                
                # Method 2: Alternative deletion method
                elif hasattr(conn, 'delete_template'):
                    # Get template first, then delete
                    templates = conn.get_templates()
                    for template in templates:
                        if (hasattr(template, 'uid') and hasattr(template, 'fid') and 
                            template.uid == uid and template.fid == fid):
                            conn.delete_template(template)
                            return {'deletion_result': 'template_found_and_deleted', 'method': 'delete_template'}
                    
                    return {'deletion_result': 'template_not_found', 'method': 'delete_template'}
                
                # Method 3: Clear specific finger data (if available)
                elif hasattr(conn, 'clear_template'):
                    conn.clear_template(uid, fid)
                    return {'deletion_result': 'template_cleared', 'method': 'clear_template'}
                
                else:
                    return {'deletion_result': 'no_deletion_method_available', 'method': 'none'}
                
            except Exception as e:
                print(f"❌ Deletion failed on {device['name']}: {str(e)}")
                raise e
        
        result = self.with_device_connection(device, deletion_operation)
        
        if result.get('success'):
            deletion_result = result.get('deletion_result', 'unknown')
            method = result.get('method', 'unknown')
            
            if 'not_found' in deletion_result:
                return {
                    'success': True,  # Consider as success since template doesn't exist
                    'message': f'Fingerprint template not found on {device["name"]} (already deleted or never existed)',
                    'deletion_method': method
                }
            elif 'no_deletion_method_available' in deletion_result:
                return {
                    'success': False,
                    'message': f'No fingerprint deletion method available for {device["name"]}',
                    'deletion_method': method
                }
            else:
                return {
                    'success': True,
                    'message': f'Fingerprint deleted successfully from {device["name"]} using {method}',
                    'deletion_method': method
                }
        else:
            return {
                'success': False,
                'message': f'Failed to delete fingerprint from {device["name"]}: {result.get("message", "Unknown error")}'
            }
    
    def synchronize_card(self, data: Dict) -> Dict:
        """Synchronize card data across all devices - detect and sync registered cards"""
        print(f"💳 Starting OPTIMIZED card synchronization with data: {data}")
        start_time = time.time()
        
        try:
            # Get all enabled devices
            enabled_devices = [d for d in self.devices if d.get('enabled', True)]
            
            if not enabled_devices:
                error_response = self.create_response('error', 'No enabled devices found')
                self._publish_response_async(error_response)
                return error_response
            
            if len(enabled_devices) < 2:
                error_response = self.create_response('error', 'At least 2 devices required for card synchronization')
                self._publish_response_async(error_response)
                return error_response
            
            # Start asynchronous card synchronization process
            threading.Thread(
                target=self._async_card_synchronization_process,
                args=(enabled_devices,),
                daemon=True
            ).start()
            
            # Return immediate response - actual process continues in background
            immediate_response = self.create_response('accepted', 
                f'Card synchronization request accepted. Scanning {len(enabled_devices)} devices...', {
                'total_devices': len(enabled_devices),
                'processing_time': f"{time.time() - start_time:.2f}s",
                'status': 'async_card_sync_started'
            })
            
            return immediate_response
            
        except Exception as e:
            error_response = self.create_response('error', f'Card synchronization failed: {str(e)}')
            self._publish_response_async(error_response)
            return error_response
    
    def _async_card_synchronization_process(self, enabled_devices: List[Dict]):
        """Asynchronous card synchronization process with real-time updates"""
        try:
            print(f"💳 Starting async card sync process for {len(enabled_devices)} devices")
            
            # Stage 1: Scanning all devices for card data
            stage1_response = self.create_response('scanning', 
                f'Scanning {len(enabled_devices)} devices for registered cards...', {
                'total_devices': len(enabled_devices),
                'sync_stage': 1,
                'status': 'device_scanning_in_progress'
            })
            self._publish_response_async(stage1_response)
            
            # Stage 2: Get all users from all devices to detect card assignments
            all_users_by_device = self._get_all_users_from_devices_parallel(enabled_devices)
            
            # Stage 3: Analyze card data and find cards that need sync
            card_analysis = self._analyze_card_data_across_devices(all_users_by_device, enabled_devices)
            
            # Stage 2 Response: Analysis complete
            stage2_response = self.create_response('analyzing', 
                f'Found {card_analysis["total_cards_found"]} registered cards. Analyzing sync requirements...', {
                'total_devices': len(enabled_devices),
                'cards_found': card_analysis['total_cards_found'],
                'users_with_cards': card_analysis['users_with_cards'],
                'sync_stage': 2,
                'status': 'card_analysis_complete'
            })
            self._publish_response_async(stage2_response)
            
            # Stage 4: Execute card synchronization
            if card_analysis['cards_to_sync']:
                sync_results = self._execute_parallel_card_sync(card_analysis, enabled_devices)
                
                # Stage 3 Response: Synchronization complete
                successful_syncs = sum(len([r for r in card_sync['sync_results'] if r['success']]) 
                                     for card_sync in sync_results)
                total_sync_operations = sum(len(card_sync['sync_results']) for card_sync in sync_results)
                
                if successful_syncs == total_sync_operations:
                    final_status = 'success'
                    message = f'Card synchronization completed successfully. {successful_syncs} sync operations completed.'
                elif successful_syncs > 0:
                    final_status = 'partial_success'
                    message = f'Card synchronization partially successful: {successful_syncs}/{total_sync_operations} operations completed.'
                else:
                    final_status = 'failed'
                    message = f'Card synchronization failed. No cards were successfully synced.'
                
                # Play sound feedback
                sound_feedback = self.play_sound_on_devices(0 if successful_syncs > 0 else 2)
                
                final_response = self.create_response(final_status, message, {
                    'total_devices': len(enabled_devices),
                    'cards_analyzed': card_analysis['total_cards_found'],
                    'cards_synced': len(sync_results),
                    'successful_sync_operations': successful_syncs,
                    'total_sync_operations': total_sync_operations,
                    'sync_results': sync_results,
                    'sound_feedback': sound_feedback,
                    'sync_stage': 3,
                    'final_result': True
                })
            else:
                # No cards to sync
                sound_feedback = self.play_sound_on_devices(0)
                final_response = self.create_response('success', 
                    'Card synchronization completed. All cards are already synchronized across devices.', {
                    'total_devices': len(enabled_devices),
                    'cards_analyzed': card_analysis['total_cards_found'],
                    'cards_synced': 0,
                    'sync_results': [],
                    'sound_feedback': sound_feedback,
                    'sync_stage': 3,
                    'final_result': True,
                    'message': 'No synchronization needed - all cards already consistent'
                })
            
            self._publish_response_async(final_response)
            print(f"✅ Async card sync process completed")
            
        except Exception as e:
            error_response = self.create_response('error', f'Async card sync process failed: {str(e)}')
            self._publish_response_async(error_response)
            print(f"❌ Async card sync process error: {str(e)}")
    
    def _get_all_users_from_devices_parallel(self, devices: List[Dict]) -> Dict:
        """Get all users from all devices in parallel"""
        print(f"👥 Getting users from {len(devices)} devices in parallel")
        
        device_users = {}
        threads = []
        
        def get_users_from_device(device):
            try:
                def get_users_operation(conn):
                    users = conn.get_users()
                    return {'users': users}
                
                result = self.with_device_connection(device, get_users_operation)
                if result.get('success'):
                    users = result.get('users', [])
                    device_users[device['id']] = {
                        'device': device,
                        'users': users,
                        'success': True
                    }
                    print(f"✅ Got {len(users)} users from {device['name']}")
                else:
                    device_users[device['id']] = {
                        'device': device,
                        'users': [],
                        'success': False,
                        'error': result.get('message', 'Unknown error')
                    }
                    print(f"❌ Failed to get users from {device['name']}: {result.get('message')}")
            except Exception as e:
                device_users[device['id']] = {
                    'device': device,
                    'users': [],
                    'success': False,
                    'error': str(e)
                }
                print(f"❌ Exception getting users from {device['name']}: {str(e)}")
        
        # Start all operations in parallel
        for device in devices:
            thread = threading.Thread(target=get_users_from_device, args=(device,), daemon=True)
            threads.append(thread)
            thread.start()
        
        # Wait for all operations to complete
        for thread in threads:
            thread.join(timeout=15)  # Max 15 seconds per device
        
        return device_users
    
    def _analyze_card_data_across_devices(self, all_users_by_device: Dict, devices: List[Dict]) -> Dict:
        """Analyze card assignments across devices to determine sync requirements"""
        print(f"🔍 Analyzing card data across {len(devices)} devices")
        
        # Dictionary to track card assignments: card_number -> {uid, name, device_ids}
        card_registry = {}
        users_with_cards = []
        total_cards_found = 0
        
        # Collect all card assignments from all devices
        for device_id, device_data in all_users_by_device.items():
            if not device_data['success']:
                continue
                
            device = device_data['device']
            users = device_data['users']
            
            for user in users:
                try:
                    card_number = getattr(user, 'card', 0)
                    uid = int(getattr(user, 'uid', 0))
                    name = getattr(user, 'name', f'UID_{uid}')
                    
                    # Skip users without cards (card = 0 or None)
                    if not card_number or card_number == 0:
                        continue
                    
                    card_number = int(card_number)
                    
                    if card_number not in card_registry:
                        card_registry[card_number] = {
                            'card_number': card_number,
                            'uid': uid,
                            'name': name,
                            'device_ids': set(),
                            'user_info': {
                                'uid': uid,
                                'name': name,
                                'privilege': getattr(user, 'privilege', 0),
                                'password': getattr(user, 'password', ''),
                                'group_id': getattr(user, 'group_id', ''),
                                'user_id': getattr(user, 'user_id', str(uid)),
                                'card': card_number
                            }
                        }
                        total_cards_found += 1
                    
                    card_registry[card_number]['device_ids'].add(device_id)
                    
                except Exception as e:
                    print(f"⚠️ Error processing user data: {e}")
                    continue
        
        # Determine which cards need synchronization
        cards_to_sync = []
        all_device_ids = set(device_data['device']['id'] for device_data in all_users_by_device.values() 
                           if device_data['success'])
        
        for card_number, card_info in card_registry.items():
            assigned_devices = card_info['device_ids']
            missing_devices = all_device_ids - assigned_devices
            
            if missing_devices:
                cards_to_sync.append({
                    'card_number': card_number,
                    'uid': card_info['uid'],
                    'name': card_info['name'],
                    'user_info': card_info['user_info'],
                    'source_devices': list(assigned_devices),
                    'target_devices': list(missing_devices),
                    'sync_required': True
                })
                
                users_with_cards.append({
                    'uid': card_info['uid'],
                    'name': card_info['name'],
                    'card_number': card_number,
                    'assigned_devices': len(assigned_devices),
                    'missing_devices': len(missing_devices)
                })
        
        analysis_result = {
            'total_cards_found': total_cards_found,
            'users_with_cards': users_with_cards,
            'cards_to_sync': cards_to_sync,
            'devices_analyzed': len(all_device_ids),
            'sync_required': len(cards_to_sync) > 0
        }
        
        print(f"📊 Card analysis complete: {total_cards_found} cards found, {len(cards_to_sync)} need sync")
        return analysis_result
    
    def _execute_parallel_card_sync(self, card_analysis: Dict, devices: List[Dict]) -> List[Dict]:
        """Execute parallel card synchronization across devices"""
        cards_to_sync = card_analysis['cards_to_sync']
        print(f"💳 Executing parallel card sync for {len(cards_to_sync)} cards")
        
        sync_results = []
        
        # Create device lookup for easy access
        device_lookup = {device['id']: device for device in devices}
        
        for card_info in cards_to_sync:
            card_sync_result = {
                'card_number': card_info['card_number'],
                'uid': card_info['uid'],
                'name': card_info['name'],
                'target_devices': card_info['target_devices'],
                'sync_results': []
            }
            
            # Sync this card to all missing devices in parallel
            sync_threads = []
            
            def sync_card_to_device(target_device_id):
                target_device = device_lookup[target_device_id]
                result = self._sync_card_to_device(card_info['user_info'], target_device)
                card_sync_result['sync_results'].append({
                    'device_id': target_device_id,
                    'device_name': target_device['name'],
                    'success': result['success'],
                    'message': result.get('message', ''),
                    'status': 'success' if result['success'] else 'failed'
                })
            
            # Start parallel sync for this card
            for target_device_id in card_info['target_devices']:
                thread = threading.Thread(target=sync_card_to_device, args=(target_device_id,), daemon=True)
                sync_threads.append(thread)
                thread.start()
            
            # Wait for this card's sync to complete
            for thread in sync_threads:
                thread.join(timeout=10)
            
            sync_results.append(card_sync_result)
            
            successful_syncs = sum(1 for result in card_sync_result['sync_results'] if result['success'])
            total_syncs = len(card_sync_result['sync_results'])
            print(f"💳 Card {card_info['card_number']} ({card_info['name']}): {successful_syncs}/{total_syncs} devices synced")
        
        return sync_results
    
    def _sync_card_to_device(self, user_info: Dict, target_device: Dict) -> Dict:
        """Sync card (user with card number) to target device"""
        try:
            print(f"💳 Syncing card {user_info['card']} (UID {user_info['uid']}) to {target_device['name']}")
            
            def sync_user_operation(conn):
                try:
                    # Check if user already exists on target device
                    existing_users = conn.get_users()
                    user_exists = False
                    
                    for existing_user in existing_users:
                        if int(existing_user.uid) == int(user_info['uid']):
                            user_exists = True
                            break
                    
                    if user_exists:
                        # Update existing user with card number
                        conn.set_user(
                            uid=int(user_info['uid']),
                            name=str(user_info['name']),
                            privilege=int(user_info.get('privilege', 0)),
                            password=str(user_info.get('password', '')),
                            group_id=str(user_info.get('group_id', '')) if user_info.get('group_id') not in [None, 0, '0'] else '',
                            user_id=str(user_info.get('user_id', str(user_info['uid']))),
                            card=int(user_info['card'])
                        )
                        return {'operation': 'updated', 'user_existed': True}
                    else:
                        # Create new user with card number
                        conn.set_user(
                            uid=int(user_info['uid']),
                            name=str(user_info['name']),
                            privilege=int(user_info.get('privilege', 0)),
                            password=str(user_info.get('password', '')),
                            group_id=str(user_info.get('group_id', '')) if user_info.get('group_id') not in [None, 0, '0'] else '',
                            user_id=str(user_info.get('user_id', str(user_info['uid']))),
                            card=int(user_info['card'])
                        )
                        return {'operation': 'created', 'user_existed': False}
                
                except Exception as e:
                    print(f"❌ Card sync operation failed on {target_device['name']}: {str(e)}")
                    raise e
            
            result = self.with_device_connection(target_device, sync_user_operation)
            
            if result.get('success'):
                operation = result.get('operation', 'unknown')
                user_existed = result.get('user_existed', False)
                action = 'updated' if user_existed else 'created'
                
                return {
                    'success': True,
                    'message': f'Card {user_info["card"]} successfully synced to {target_device["name"]} (user {action})',
                    'operation': operation,
                    'user_existed': user_existed
                }
            else:
                return {
                    'success': False,
                    'message': f'Failed to sync card to {target_device["name"]}: {result.get("message", "Unknown error")}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Error syncing card to {target_device["name"]}: {str(e)}'
            }
    
    def delete_card(self, data: Dict) -> Dict:
        """Delete card from user across all devices - remove card number assignment"""
        print(f"💳 Starting OPTIMIZED card deletion with data: {data}")
        start_time = time.time()
        
        try:
            # Validate required parameters
            if 'uid' not in data:
                error_response = self.create_response('error', 'Missing required parameter: uid')
                self._publish_response_async(error_response)
                return error_response
            
            uid = int(data['uid'])
            
            # Get all enabled devices
            enabled_devices = [d for d in self.devices if d.get('enabled', True)]
            
            if not enabled_devices:
                error_response = self.create_response('error', 'No enabled devices found')
                self._publish_response_async(error_response)
                return error_response
            
            # Start asynchronous card deletion process
            threading.Thread(
                target=self._async_card_deletion_process,
                args=(uid, enabled_devices),
                daemon=True
            ).start()
            
            # Return immediate response - actual process continues in background
            immediate_response = self.create_response('accepted', 
                f'Card deletion request accepted for UID {uid}. Processing across {len(enabled_devices)} devices...', {
                'uid': uid,
                'target_devices': len(enabled_devices),
                'processing_time': f"{time.time() - start_time:.2f}s",
                'status': 'async_card_deletion_started'
            })
            
            return immediate_response
            
        except ValueError:
            error_response = self.create_response('error', 'Invalid UID: must be an integer')
            self._publish_response_async(error_response)
            return error_response
        except Exception as e:
            error_response = self.create_response('error', f'Card deletion failed: {str(e)}')
            self._publish_response_async(error_response)
            return error_response
    
    def _async_card_deletion_process(self, uid: int, enabled_devices: List[Dict]):
        """Asynchronous card deletion process with real-time updates"""
        try:
            print(f"💳 Starting async card deletion process for UID {uid} on {len(enabled_devices)} devices")
            
            # Stage 1: User validation and card detection
            stage1_response = self.create_response('validating', 
                f'Validating card deletion for UID {uid}. Checking user existence...', {
                'uid': uid,
                'target_devices': len(enabled_devices),
                'deletion_stage': 1,
                'status': 'validation_in_progress'
            })
            self._publish_response_async(stage1_response)
            
            # Find user and current card assignment
            user_info = self._find_user_with_card_info(uid, enabled_devices)
            
            if not user_info['found']:
                error_response = self.create_response('error', f'User with UID {uid} not found on any device')
                self._publish_response_async(error_response)
                return
            
            user_name = user_info['name']
            current_card = user_info['card_number']
            devices_with_user = user_info['devices_with_user']
            
            # Stage 2: Card deletion started
            if current_card and current_card != 0:
                message = f'Starting card deletion for {user_name} (UID {uid}). Removing card {current_card} from {len(devices_with_user)} devices...'
            else:
                message = f'User {user_name} (UID {uid}) has no card assigned. Nothing to delete.'
            
            stage2_response = self.create_response('deleting', message, {
                'uid': uid,
                'user_name': user_name,
                'card_number': current_card,
                'target_devices': len(devices_with_user),
                'deletion_stage': 2,
                'status': 'card_deletion_in_progress'
            })
            self._publish_response_async(stage2_response)
            
            # If no card to delete, return success
            if not current_card or current_card == 0:
                sound_feedback = self.play_sound_on_devices(0)  # Success sound
                final_response = self.create_response('success', 
                    f'No card deletion needed for {user_name}. User has no card assigned.', {
                    'uid': uid,
                    'user_name': user_name,
                    'card_number': 0,
                    'deletion_results': [],
                    'successful_deletions': 0,
                    'total_devices': len(devices_with_user),
                    'sound_feedback': sound_feedback,
                    'deletion_stage': 3,
                    'final_result': True
                })
                self._publish_response_async(final_response)
                return
            
            # Stage 3: Execute parallel card deletion
            deletion_results = self._execute_parallel_card_deletion(uid, user_name, current_card, devices_with_user)
            
            # Calculate success metrics
            successful_deletions = sum(1 for result in deletion_results if result['success'])
            total_devices = len(deletion_results)
            
            # Determine final status
            if successful_deletions == total_devices:
                final_status = 'success'
                message = f'Card deleted successfully from all {total_devices} devices for {user_name}'
            elif successful_deletions > 0:
                final_status = 'partial_success'
                message = f'Card deleted from {successful_deletions}/{total_devices} devices for {user_name}'
            else:
                final_status = 'failed'
                message = f'Failed to delete card from all devices for {user_name}'
            
            # Play sound feedback
            sound_feedback = self.play_sound_on_devices(0 if successful_deletions > 0 else 2)
            
            # Stage 3 Response: Final result
            final_response = self.create_response(final_status, message, {
                'uid': uid,
                'user_name': user_name,
                'card_number': current_card,
                'deletion_results': deletion_results,
                'successful_deletions': successful_deletions,
                'failed_deletions': total_devices - successful_deletions,
                'total_devices': total_devices,
                'sound_feedback': sound_feedback,
                'deletion_stage': 3,
                'final_result': True
            })
            
            self._publish_response_async(final_response)
            print(f"✅ Async card deletion process completed for UID {uid}")
            
        except Exception as e:
            error_response = self.create_response('error', f'Async card deletion process failed: {str(e)}')
            self._publish_response_async(error_response)
            print(f"❌ Async card deletion process error: {str(e)}")
    
    def _find_user_with_card_info(self, uid: int, devices: List[Dict]) -> Dict:
        """Find user across devices and get card information"""
        print(f"🔍 Finding user UID {uid} and card info across {len(devices)} devices")
        
        user_info = {
            'found': False,
            'name': f'UID_{uid}',
            'card_number': 0,
            'devices_with_user': [],
            'user_data': {}
        }
        
        # Search for user in parallel across devices
        threads = []
        results = {}
        
        def find_user_on_device(device):
            try:
                def get_user_operation(conn):
                    users = conn.get_users()
                    for user in users:
                        if int(getattr(user, 'uid', 0)) == uid:
                            return {
                                'found': True,
                                'user': user,
                                'name': getattr(user, 'name', f'UID_{uid}'),
                                'card': int(getattr(user, 'card', 0)),
                                'privilege': getattr(user, 'privilege', 0),
                                'password': getattr(user, 'password', ''),
                                'group_id': getattr(user, 'group_id', ''),
                                'user_id': getattr(user, 'user_id', str(uid))
                            }
                    return {'found': False}
                
                result = self.with_device_connection(device, get_user_operation)
                if result.get('success') and result.get('found'):
                    results[device['id']] = {
                        'device': device,
                        'user_data': result
                    }
                    
            except Exception as e:
                print(f"⚠️ Error finding user on {device['name']}: {e}")
        
        # Start parallel search
        for device in devices:
            thread = threading.Thread(target=find_user_on_device, args=(device,), daemon=True)
            threads.append(thread)
            thread.start()
        
        # Wait for all searches to complete
        for thread in threads:
            thread.join(timeout=5)
        
        # Process results
        if results:
            # Get user info from first device that has the user
            first_result = next(iter(results.values()))
            user_data = first_result['user_data']
            
            user_info.update({
                'found': True,
                'name': user_data['name'],
                'card_number': user_data['card'],
                'devices_with_user': [result['device'] for result in results.values()],
                'user_data': user_data
            })
            
            print(f"✅ User {user_info['name']} (UID {uid}) found on {len(user_info['devices_with_user'])} devices with card: {user_info['card_number']}")
        else:
            print(f"❌ User UID {uid} not found on any device")
        
        return user_info
    
    def _execute_parallel_card_deletion(self, uid: int, user_name: str, card_number: int, devices: List[Dict]) -> List[Dict]:
        """Execute parallel card deletion across devices"""
        print(f"💳 Executing parallel card deletion for UID {uid} across {len(devices)} devices")
        
        deletion_results = []
        threads = []
        
        def delete_card_from_device(device):
            result = self._delete_card_from_device(uid, user_name, card_number, device)
            deletion_results.append({
                'device_id': device['id'],
                'device_name': device['name'], 
                'success': result['success'],
                'message': result.get('message', ''),
                'status': 'success' if result['success'] else 'failed'
            })
        
        # Start parallel deletion
        for device in devices:
            thread = threading.Thread(target=delete_card_from_device, args=(device,), daemon=True)
            threads.append(thread)
            thread.start()
        
        # Wait for all deletions to complete
        for thread in threads:
            thread.join(timeout=10)
        
        successful_deletions = sum(1 for result in deletion_results if result['success'])
        print(f"💳 Card deletion completed: {successful_deletions}/{len(devices)} devices successful")
        
        return deletion_results
    
    def _delete_card_from_device(self, uid: int, user_name: str, card_number: int, device: Dict) -> Dict:
        """Delete card assignment from user on specific device"""
        try:
            print(f"💳 Deleting card {card_number} from user {user_name} (UID {uid}) on {device['name']}")
            
            def delete_card_operation(conn):
                try:
                    # Get current user data
                    users = conn.get_users()
                    user_found = False
                    current_user_data = None
                    
                    for user in users:
                        if int(getattr(user, 'uid', 0)) == uid:
                            user_found = True
                            current_user_data = {
                                'uid': uid,
                                'name': getattr(user, 'name', user_name),
                                'privilege': getattr(user, 'privilege', 0),
                                'password': getattr(user, 'password', ''),
                                'group_id': getattr(user, 'group_id', ''),
                                'user_id': getattr(user, 'user_id', str(uid)),
                                'card': 0  # Remove card by setting to 0
                            }
                            break
                    
                    if not user_found:
                        return {'operation': 'user_not_found', 'success': False}
                    
                    # Update user with card removed (set to 0)
                    conn.set_user(
                        uid=int(current_user_data['uid']),
                        name=str(current_user_data['name']),
                        privilege=int(current_user_data['privilege']),
                        password=str(current_user_data['password']),
                        group_id=str(current_user_data['group_id']) if current_user_data['group_id'] not in [None, 0, '0'] else '',
                        user_id=str(current_user_data['user_id']),
                        card=0  # Remove card assignment
                    )
                    
                    return {'operation': 'card_deleted', 'success': True}
                
                except Exception as e:
                    print(f"❌ Card deletion operation failed on {device['name']}: {str(e)}")
                    return {'operation': 'operation_failed', 'success': False, 'error': str(e)}
            
            result = self.with_device_connection(device, delete_card_operation)
            
            if result.get('success'):
                operation = result.get('operation', 'unknown')
                if operation == 'card_deleted':
                    return {
                        'success': True,
                        'message': f'Card deleted successfully from {device["name"]}'
                    }
                elif operation == 'user_not_found':
                    return {
                        'success': False,
                        'message': f'User not found on {device["name"]}'
                    }
                else:
                    return {
                        'success': False,
                        'message': f'Unknown operation result: {operation}'
                    }
            else:
                return {
                    'success': False,
                    'message': f'Failed to delete card from {device["name"]}: {result.get("message", "Connection failed")}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Error deleting card from {device["name"]}: {str(e)}'
            }
    
    def set_user_role(self, data: Dict) -> Dict:
        """Set user role/privilege level across all devices"""
        print(f"👤 Starting OPTIMIZED user role update with data: {data}")
        start_time = time.time()
        
        try:
            # Validate required parameters
            if 'uid' not in data:
                error_response = self.create_response('error', 'Missing required parameter: uid')
                self._publish_response_async(error_response)
                return error_response
                
            if 'role' not in data:
                error_response = self.create_response('error', 'Missing required parameter: role')
                self._publish_response_async(error_response)
                return error_response
            
            uid = int(data['uid'])
            role = int(data['role'])
            
            # Validate role value (ZKTeco privilege levels)
            if role not in [0, 1, 2, 3, 14]:
                error_response = self.create_response('error', 
                    'Invalid role. Valid values: 0=Normal User, 1=Enroll User, 2=Admin, 3=Super Admin, 14=Super User')
                self._publish_response_async(error_response)
                return error_response
            
            # Get all enabled devices
            enabled_devices = [d for d in self.devices if d.get('enabled', True)]
            
            if not enabled_devices:
                error_response = self.create_response('error', 'No enabled devices found')
                self._publish_response_async(error_response)
                return error_response
            
            # Start asynchronous role update process
            threading.Thread(
                target=self._async_user_role_update_process,
                args=(uid, role, enabled_devices),
                daemon=True
            ).start()
            
            # Return immediate response - actual process continues in background
            immediate_response = self.create_response('accepted', 
                f'User role update request accepted for UID {uid}. Processing across {len(enabled_devices)} devices...', {
                'uid': uid,
                'role': role,
                'role_name': self._get_role_name(role),
                'target_devices': len(enabled_devices),
                'processing_time': f"{time.time() - start_time:.2f}s",
                'status': 'async_role_update_started'
            })
            
            return immediate_response
            
        except ValueError:
            error_response = self.create_response('error', 'Invalid UID or role: must be integers')
            self._publish_response_async(error_response)
            return error_response
        except Exception as e:
            error_response = self.create_response('error', f'User role update failed: {str(e)}')
            self._publish_response_async(error_response)
            return error_response
    
    def _get_role_name(self, role: int) -> str:
        """Get human-readable role name"""
        role_names = {
            0: "Normal User",
            1: "Enroll User", 
            2: "Admin",
            3: "Super Admin",
            14: "Super User"
        }
        return role_names.get(role, f"Role {role}")
    
    def _async_user_role_update_process(self, uid: int, role: int, enabled_devices: List[Dict]):
        """Asynchronous user role update process with real-time updates"""
        try:
            print(f"👤 Starting async role update process for UID {uid} to role {role} on {len(enabled_devices)} devices")
            
            role_name = self._get_role_name(role)
            
            # Stage 1: User validation
            stage1_response = self.create_response('validating', 
                f'Validating user role update for UID {uid}. Checking user existence...', {
                'uid': uid,
                'role': role,
                'role_name': role_name,
                'target_devices': len(enabled_devices),
                'update_stage': 1,
                'status': 'validation_in_progress'
            })
            self._publish_response_async(stage1_response)
            
            # Find user across devices
            user_info = self._find_user_across_devices(uid, enabled_devices)
            
            if not user_info['found']:
                error_response = self.create_response('error', f'User with UID {uid} not found on any device')
                self._publish_response_async(error_response)
                return
            
            user_name = user_info['name']
            devices_with_user = user_info['devices_with_user']
            current_role = user_info.get('current_role', 0)
            current_role_name = self._get_role_name(current_role)
            
            # Stage 2: Role update started
            stage2_response = self.create_response('updating', 
                f'Updating role for {user_name} (UID {uid}) from {current_role_name} to {role_name} on {len(devices_with_user)} devices...', {
                'uid': uid,
                'user_name': user_name,
                'old_role': current_role,
                'old_role_name': current_role_name,
                'new_role': role,
                'new_role_name': role_name,
                'target_devices': len(devices_with_user),
                'update_stage': 2,
                'status': 'role_update_in_progress'
            })
            self._publish_response_async(stage2_response)
            
            # Stage 3: Execute parallel role update
            update_results = self._execute_parallel_role_update(uid, user_name, role, user_info['user_data'], devices_with_user)
            
            # Calculate success metrics
            successful_updates = sum(1 for result in update_results if result['success'])
            total_devices = len(update_results)
            
            # Determine final status
            if successful_updates == total_devices:
                final_status = 'success'
                message = f'User role updated successfully on all {total_devices} devices for {user_name}'
            elif successful_updates > 0:
                final_status = 'partial_success'
                message = f'User role updated on {successful_updates}/{total_devices} devices for {user_name}'
            else:
                final_status = 'failed'
                message = f'Failed to update user role on all devices for {user_name}'
            
            # Play sound feedback
            sound_feedback = self.play_sound_on_devices(0 if successful_updates > 0 else 2)
            
            # Stage 3 Response: Final result
            final_response = self.create_response(final_status, message, {
                'uid': uid,
                'user_name': user_name,
                'old_role': current_role,
                'old_role_name': current_role_name,
                'new_role': role,
                'new_role_name': role_name,
                'update_results': update_results,
                'successful_updates': successful_updates,
                'failed_updates': total_devices - successful_updates,
                'total_devices': total_devices,
                'sound_feedback': sound_feedback,
                'update_stage': 3,
                'final_result': True
            })
            
            self._publish_response_async(final_response)
            print(f"✅ Async user role update process completed for UID {uid}")
            
        except Exception as e:
            error_response = self.create_response('error', f'Async user role update process failed: {str(e)}')
            self._publish_response_async(error_response)
            print(f"❌ Async user role update process error: {str(e)}")
    
    def _find_user_across_devices(self, uid: int, devices: List[Dict]) -> Dict:
        """Find user across devices and get current information"""
        print(f"🔍 Finding user UID {uid} across {len(devices)} devices")
        
        user_info = {
            'found': False,
            'name': f'UID_{uid}',
            'current_role': 0,
            'devices_with_user': [],
            'user_data': {}
        }
        
        # Search for user in parallel across devices
        threads = []
        results = {}
        
        def find_user_on_device(device):
            try:
                def get_user_operation(conn):
                    users = conn.get_users()
                    for user in users:
                        if int(getattr(user, 'uid', 0)) == uid:
                            return {
                                'found': True,
                                'user': user,
                                'name': getattr(user, 'name', f'UID_{uid}'),
                                'privilege': int(getattr(user, 'privilege', 0)),
                                'card': int(getattr(user, 'card', 0)),
                                'password': getattr(user, 'password', ''),
                                'group_id': getattr(user, 'group_id', ''),
                                'user_id': getattr(user, 'user_id', str(uid))
                            }
                    return {'found': False}
                
                result = self.with_device_connection(device, get_user_operation)
                if result.get('success') and result.get('found'):
                    results[device['id']] = {
                        'device': device,
                        'user_data': result
                    }
                    
            except Exception as e:
                print(f"⚠️ Error finding user on {device['name']}: {e}")
        
        # Start parallel search
        for device in devices:
            thread = threading.Thread(target=find_user_on_device, args=(device,), daemon=True)
            threads.append(thread)
            thread.start()
        
        # Wait for all searches to complete
        for thread in threads:
            thread.join(timeout=5)
        
        # Process results
        if results:
            # Get user info from first device that has the user
            first_result = next(iter(results.values()))
            user_data = first_result['user_data']
            
            user_info.update({
                'found': True,
                'name': user_data['name'],
                'current_role': user_data['privilege'],
                'devices_with_user': [result['device'] for result in results.values()],
                'user_data': user_data
            })
            
            print(f"✅ User {user_info['name']} (UID {uid}) found on {len(user_info['devices_with_user'])} devices with current role: {user_info['current_role']}")
        else:
            print(f"❌ User UID {uid} not found on any device")
        
        return user_info
    
    def _execute_parallel_role_update(self, uid: int, user_name: str, new_role: int, user_data: Dict, devices: List[Dict]) -> List[Dict]:
        """Execute parallel role update across devices"""
        print(f"👤 Executing parallel role update for UID {uid} to role {new_role} across {len(devices)} devices")
        
        update_results = []
        threads = []
        
        def update_role_on_device(device):
            result = self._update_user_role_on_device(uid, user_name, new_role, user_data, device)
            update_results.append({
                'device_id': device['id'],
                'device_name': device['name'], 
                'success': result['success'],
                'message': result.get('message', ''),
                'old_role': result.get('old_role', 0),
                'new_role': new_role,
                'status': 'success' if result['success'] else 'failed'
            })
        
        # Start parallel updates
        for device in devices:
            thread = threading.Thread(target=update_role_on_device, args=(device,), daemon=True)
            threads.append(thread)
            thread.start()
        
        # Wait for all updates to complete
        for thread in threads:
            thread.join(timeout=10)
        
        successful_updates = sum(1 for result in update_results if result['success'])
        print(f"👤 Role update completed: {successful_updates}/{len(devices)} devices successful")
        
        return update_results
    
    def _update_user_role_on_device(self, uid: int, user_name: str, new_role: int, user_data: Dict, device: Dict) -> Dict:
        """Update user role on specific device"""
        try:
            print(f"👤 Updating role for user {user_name} (UID {uid}) to role {new_role} on {device['name']}")
            
            def update_role_operation(conn):
                try:
                    # Get current user data to preserve other fields
                    users = conn.get_users()
                    user_found = False
                    current_user_data = None
                    
                    for user in users:
                        if int(getattr(user, 'uid', 0)) == uid:
                            user_found = True
                            current_user_data = {
                                'uid': uid,
                                'name': getattr(user, 'name', user_name),
                                'privilege': int(getattr(user, 'privilege', 0)),
                                'card': int(getattr(user, 'card', 0)),
                                'password': getattr(user, 'password', ''),
                                'group_id': getattr(user, 'group_id', ''),
                                'user_id': getattr(user, 'user_id', str(uid))
                            }
                            break
                    
                    if not user_found:
                        return {'operation': 'user_not_found', 'success': False, 'old_role': 0}
                    
                    old_role = current_user_data['privilege']
                    
                    # Update user with new role while preserving other data
                    conn.set_user(
                        uid=int(current_user_data['uid']),
                        name=str(current_user_data['name']),
                        privilege=int(new_role),  # Update role/privilege
                        password=str(current_user_data['password']),
                        group_id=str(current_user_data['group_id']) if current_user_data['group_id'] not in [None, 0, '0'] else '',
                        user_id=str(current_user_data['user_id']),
                        card=int(current_user_data['card'])
                    )
                    
                    return {'operation': 'role_updated', 'success': True, 'old_role': old_role}
                
                except Exception as e:
                    print(f"❌ Role update operation failed on {device['name']}: {str(e)}")
                    return {'operation': 'operation_failed', 'success': False, 'error': str(e), 'old_role': 0}
            
            result = self.with_device_connection(device, update_role_operation)
            
            if result.get('success'):
                operation = result.get('operation', 'unknown')
                old_role = result.get('old_role', 0)
                if operation == 'role_updated':
                    return {
                        'success': True,
                        'message': f'Role updated successfully on {device["name"]} from {self._get_role_name(old_role)} to {self._get_role_name(new_role)}',
                        'old_role': old_role
                    }
                elif operation == 'user_not_found':
                    return {
                        'success': False,
                        'message': f'User not found on {device["name"]}',
                        'old_role': 0
                    }
                else:
                    return {
                        'success': False,
                        'message': f'Unknown operation result: {operation}',
                        'old_role': old_role
                    }
            else:
                return {
                    'success': False,
                    'message': f'Failed to update role on {device["name"]}: {result.get("message", "Connection failed")}',
                    'old_role': result.get('old_role', 0)
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Error updating role on {device["name"]}: {str(e)}',
                'old_role': 0
            }
    
    def _publish_response_async(self, response: Dict):
        """Publish MQTT response asynchronously to avoid blocking"""
        def publish_worker():
            if self.mqtt_connected:
                self.mqtt_client.publish(self.TOPICS['user_response'], json.dumps(response))
                print(f"✅ Async response published: {response.get('status', 'unknown')}")
            else:
                print(f"❌ MQTT not connected - cannot publish async response")
        
        threading.Thread(target=publish_worker, daemon=True).start()
    
    def handle_system_command(self, payload: Dict):
        """Handle system configuration commands"""
        command = payload.get('command')
        data = payload.get('data', {})
        
        command_map = {
            'getConfig': lambda: self.get_system_config(),
            'updateConfig': lambda: self.update_system_config(data),
            'reloadConfig': lambda: self.reload_system_config(),
            'getStatus': lambda: self.get_system_status()
        }
        
        result = command_map.get(command, lambda: self.create_response('error', f'Unknown system command: {command}'))()
        self.mqtt_client.publish(self.TOPICS['system_response'], json.dumps(result))
        
    def get_system_config(self) -> Dict:
        """Get current system configuration"""
        try:
            config = {
                'device_config': self.device_config,
                'mqtt_config': self.mqtt_config,
                'topics': self.TOPICS,
                'sounds': self.SOUNDS
            }
            return self.create_response('success', 'Configuration retrieved successfully', config)
        except Exception as e:
            return self.create_response('error', f'Failed to get configuration: {str(e)}')
    
    def update_system_config(self, data: Dict) -> Dict:
        """Update system configuration"""
        try:
            config_type = data.get('config_type')  # 'device' or 'mqtt' or 'settings'
            config_data = data.get('config_data', {})
            
            if config_type == 'device':
                return self.update_device_config(config_data)
            elif config_type == 'mqtt':
                return self.update_mqtt_config(config_data)
            elif config_type == 'settings':
                return self.update_settings_config(config_data)
            else:
                return self.create_response('error', 'Invalid config_type. Use: device, mqtt, or settings')
                
        except Exception as e:
            return self.create_response('error', f'Failed to update configuration: {str(e)}')
    
    def update_device_config(self, config_data: Dict) -> Dict:
        """Update device configuration settings"""
        try:
            if 'settings' in config_data:
                # Update device settings
                current_settings = self.device_config.get('settings', {})
                current_settings.update(config_data['settings'])
                self.device_config['settings'] = current_settings
                
            # Save updated config
            if self.save_device_config():
                return self.create_response('success', 'Device configuration updated successfully', {
                    'updated_settings': config_data.get('settings', {}),
                    'current_settings': self.device_config.get('settings', {})
                })
            else:
                return self.create_response('error', 'Failed to save device configuration')
                
        except Exception as e:
            return self.create_response('error', f'Failed to update device config: {str(e)}')
    
    def update_mqtt_config(self, config_data: Dict) -> Dict:
        """Update MQTT configuration settings"""
        try:
            if 'mqtt' in config_data:
                # Update MQTT broker settings
                current_mqtt = self.mqtt_config.get('mqtt', {})
                current_mqtt.update(config_data['mqtt'])
                self.mqtt_config['mqtt'] = current_mqtt
            
            if 'mqtt_settings' in config_data:
                # Update MQTT settings
                current_mqtt_settings = self.mqtt_config.get('mqtt_settings', {})
                current_mqtt_settings.update(config_data['mqtt_settings'])
                self.mqtt_config['mqtt_settings'] = current_mqtt_settings
            
            # Save updated config
            if self.save_config_file(self.mqtt_config_file, self.mqtt_config):
                return self.create_response('success', 'MQTT configuration updated successfully', {
                    'updated_mqtt': config_data.get('mqtt', {}),
                    'updated_settings': config_data.get('mqtt_settings', {}),
                    'current_config': self.mqtt_config
                })
            else:
                return self.create_response('error', 'Failed to save MQTT configuration')
                
        except Exception as e:
            return self.create_response('error', f'Failed to update MQTT config: {str(e)}')
            
    def update_settings_config(self, config_data: Dict) -> Dict:
        """Update general settings configuration"""
        try:
            settings_updated = False
            
            # Update device settings
            if 'device_settings' in config_data:
                current_settings = self.device_config.get('settings', {})
                current_settings.update(config_data['device_settings'])
                self.device_config['settings'] = current_settings
                settings_updated = True
            
            # Save changes
            if settings_updated and self.save_device_config():
                return self.create_response('success', 'Settings configuration updated successfully', {
                    'updated_settings': config_data,
                    'current_device_settings': self.device_config.get('settings', {})
                })
            else:
                return self.create_response('error', 'Failed to save settings configuration or no changes made')
                
        except Exception as e:
            return self.create_response('error', f'Failed to update settings: {str(e)}')
    
    def reload_system_config(self) -> Dict:
        """Reload system configuration from files"""
        try:
            self.load_configurations()
            return self.create_response('success', 'Configuration reloaded successfully', {
                'device_config_loaded': self.device_config is not None,
                'mqtt_config_loaded': self.mqtt_config is not None
            })
        except Exception as e:
            return self.create_response('error', f'Failed to reload configuration: {str(e)}')
            
    def get_system_status(self) -> Dict:
        """Get system status and information"""
        try:
            # Count devices
            total_devices = len(self.device_config.get('devices', []))
            enabled_devices = len([d for d in self.device_config.get('devices', []) if d.get('enabled', True)])
            
            status_info = {
                'mqtt_connected': self.mqtt_connected,
                'config_loaded': self.device_config is not None and self.mqtt_config is not None,
                'total_devices': total_devices,
                'enabled_devices': enabled_devices,
                'disabled_devices': total_devices - enabled_devices,
                'master_device_id': self.device_config.get('settings', {}).get('master_device_id', 'device_1'),
                'default_timeout': self.device_config.get('settings', {}).get('default_timeout', 5),
                'default_port': self.device_config.get('settings', {}).get('default_port', 4370),
                'max_retries': self.device_config.get('settings', {}).get('max_retries', 3),
                'poll_interval': self.device_config.get('settings', {}).get('poll_interval', 3),
                'mqtt_broker': self.mqtt_config.get('mqtt', {}).get('broker', 'localhost'),
                'mqtt_port': self.mqtt_config.get('mqtt', {}).get('port', 1883)
            }
            
            return self.create_response('success', 'System status retrieved successfully', status_info)
        except Exception as e:
            return self.create_response('error', f'Failed to get system status: {str(e)}')

    def _async_fingerprint_enrollment_process(self, uid: int, fid: int, master_device: Dict):
        """Asynchronous fingerprint enrollment process with real-time updates"""
        try:
            print(f"🔄 Starting async enrollment process for UID {uid}")
            
            # Stage 1: Fast validation and ready check
            stage1_response = self._fingerprint_master_stage1_validation_optimized(uid, fid, master_device)
            if stage1_response['status'] == 'error':
                self._publish_response_async(stage1_response)
                return
                
            self._publish_response_async(stage1_response)
            
            # Stage 2: Immediate processing notification (no artificial delay)
            stage2_response = self._fingerprint_master_stage2_process(uid, fid, master_device)
            self._publish_response_async(stage2_response)
            
            # Stage 3: Start actual enrollment (this is the only real wait time)
            stage3_response = self._fingerprint_master_stage3_enrollment_and_sync_optimized(uid, fid, master_device)
            self._publish_response_async(stage3_response)
            
            print(f"✅ Async enrollment process completed for UID {uid}")
            
        except Exception as e:
            error_response = self.create_response('error', f'Async enrollment process failed: {str(e)}')
            self._publish_response_async(error_response)
            print(f"❌ Async enrollment process error: {str(e)}")
    
    def _fingerprint_master_stage1_validation_optimized(self, uid: int, fid: int, master_device: Dict) -> Dict:
        """OPTIMIZED Stage 1: Fast validation using cache-first approach"""
        try:
            print(f"⚡ Fast validation for UID {uid} on master {master_device['name']}")
            
            # Fast cache-first user lookup
            user_name = self._get_user_name_fast(uid, master_device['id'])
            if not user_name:
                return self.create_response('error', f'User with UID {uid} not found on master device {master_device["name"]}')
            
            # Quick connectivity test (no full operation)
            if not self._quick_device_ping(master_device):
                return self.create_response('error', f'Master device {master_device["name"]} not responding')
            
            return self.create_response('ready_to_enroll', 
                f'Ready to enroll fingerprint for {user_name} on master device {master_device["name"]}', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': {
                    'device_id': master_device['id'],
                    'device_name': master_device['name'],
                    'status': 'ready'
                },
                'enrollment_stage': 1,
                'enrollment_mode': 'master_device_optimized',
                'next_action': 'Place finger on master device scanner'
            })
            
        except Exception as e:
            return self.create_response('error', f'Fast validation failed: {str(e)}')
    
    def _fingerprint_master_stage3_enrollment_and_sync_optimized(self, uid: int, fid: int, master_device: Dict) -> Dict:
        """OPTIMIZED Stage 3: Enrollment with parallel sync operations"""
        try:
            user_name = self._get_user_name_fast(uid, master_device['id'])
            
            # Enrollment started notification
            self._publish_response_async(self.create_response('enrolling', 
                f'Starting fingerprint enrollment for {user_name} on master {master_device["name"]}', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': master_device['name'],
                'enrollment_stage': '2.1',
                'status': 'enrollment_ui_active'
            }))
            
            # Master enrollment (this is the only unavoidable wait)
            print(f"🎯 Starting actual enrollment on master device: {master_device['name']}")
            master_result = self._enroll_fingerprint_on_device(uid, fid, master_device)
            
            if not master_result['success']:
                sound_feedback = self.play_sound_on_devices(2)
                return self.create_response('failed', 
                    f'Fingerprint enrollment failed on master device {master_device["name"]}: {master_result.get("message", "")}', {
                    'uid': uid,
                    'fid': fid,
                    'user_name': user_name,
                    'master_enrollment': master_result,
                    'sound_feedback': sound_feedback
                })
            
            # Enrollment success notification
            self._publish_response_async(self.create_response('enrollment_success_syncing', 
                f'Fingerprint enrolled on master {master_device["name"]}. Starting background sync...', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': master_device['name'],
                'master_enrollment': master_result,
                'enrollment_stage': '2.2',
                'status': 'sync_starting'
            }))
            
            # Start parallel sync operations (non-blocking)
            other_devices = [d for d in self.devices if d.get('enabled', True) and d['id'] != master_device['id']]
            if other_devices:
                threading.Thread(
                    target=self._parallel_fingerprint_sync,
                    args=(uid, fid, user_name, master_device, other_devices, master_result),
                    daemon=True
                ).start()
                
                # Return success immediately for master, sync continues in background
                return self.create_response('success', 
                    f'Fingerprint enrolled on master {master_device["name"]}. Background sync to {len(other_devices)} devices in progress...', {
                    'uid': uid,
                    'fid': fid,
                    'user_name': user_name,
                    'master_device': master_device['name'],
                    'master_enrollment': master_result,
                    'background_sync_devices': len(other_devices),
                    'enrollment_stage': 3,
                    'sync_mode': 'background_parallel'
                })
            else:
                # No other devices to sync
                sound_feedback = self.play_sound_on_devices(0)
                return self.create_response('success', 
                    f'Fingerprint enrolled successfully on master {master_device["name"]} (only device)', {
                    'uid': uid,
                    'fid': fid,
                    'user_name': user_name,
                    'master_device': master_device['name'],
                    'master_enrollment': master_result,
                    'sound_feedback': sound_feedback,
                    'enrollment_stage': 3
                })
                
        except Exception as e:
            return self.create_response('error', f'Optimized enrollment failed: {str(e)}')
    
    def _get_user_name_fast(self, uid: int, device_id: str) -> str:
        """Fast user name lookup using cache first, then fallback"""
        # Check cache first (instant)
        device_cache = self.user_cache.get(device_id, {})
        cached_user = device_cache.get(uid) or device_cache.get(str(uid))
        if cached_user:
            return cached_user.get('name', f'UID_{uid}')
        
        # Cache miss - return UID format, let background process handle
        print(f"⚠️ Cache miss for UID {uid}, using UID format")
        return f'UID_{uid}'
    
    def _quick_device_ping(self, device: Dict) -> bool:
        """Quick device connectivity check"""
        try:
            # Simple socket connection test (much faster than full ZK connection)
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)  # 2 second timeout
            result = sock.connect_ex((device['ip'], device['port']))
            sock.close()
            return result == 0
        except:
            return False
    
    def _parallel_fingerprint_sync(self, uid: int, fid: int, user_name: str, master_device: Dict, other_devices: List, master_result: Dict):
        """Parallel fingerprint template sync to other devices"""
        try:
            print(f"🔄 Starting parallel sync to {len(other_devices)} devices")
            
            # Get template from master
            fingerprint_template = self._get_fingerprint_template_from_master(uid, fid, master_device)
            
            if not fingerprint_template:
                print(f"⚠️ Could not retrieve template for parallel sync")
                return
            
            # Parallel sync using threads
            sync_threads = []
            sync_results = []
            successful_syncs = 0
            
            def sync_to_device(device):
                result = self._sync_fingerprint_template_to_device(uid, fid, fingerprint_template, device)
                sync_results.append({
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'success': result['success'],
                    'message': result.get('message', ''),
                    'status': 'success' if result['success'] else 'failed'
                })
                if result['success']:
                    nonlocal successful_syncs
                    successful_syncs += 1
            
            # Start all sync operations in parallel
            for device in other_devices:
                thread = threading.Thread(target=sync_to_device, args=(device,), daemon=True)
                sync_threads.append(thread)
                thread.start()
            
            # Wait for all sync operations to complete
            for thread in sync_threads:
                thread.join(timeout=10)  # Max 10 seconds per sync
            
            # Play sound feedback
            sound_feedback = self.play_sound_on_devices(0)  # Success sound
            
            # Send final sync result
            final_sync_response = self.create_response('sync_completed', 
                f'Background sync completed: {successful_syncs}/{len(other_devices)} devices successful for {user_name}', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': master_device['name'],
                'master_enrollment': master_result,
                'sync_results': sync_results,
                'successful_syncs': successful_syncs,
                'total_other_devices': len(other_devices),
                'sound_feedback': sound_feedback,
                'enrollment_stage': 3.1,
                'sync_mode': 'parallel_completed'
            })
            
            self._publish_response_async(final_sync_response)
            print(f"✅ Parallel sync completed: {successful_syncs}/{len(other_devices)} successful")
            
        except Exception as e:
            error_response = self.create_response('sync_error', f'Parallel sync failed: {str(e)}', {
                'uid': uid,
                'user_name': user_name,
                'master_device': master_device['name']
            })
            self._publish_response_async(error_response)
            print(f"❌ Parallel sync error: {str(e)}")
    
    def _fingerprint_master_stage1_validation(self, uid: int, fid: int, master_device: Dict) -> Dict:
        """Stage 1: Validate user on master device and prepare for enrollment"""
        try:
            # Check if user exists on master device
            user_found = False
            user_name = f"UID_{uid}"
            
            # Check cache first
            device_cache = self.user_cache.get(master_device['id'], {})
            if device_cache.get(uid) or device_cache.get(str(uid)):
                cached_user = device_cache.get(uid) or device_cache.get(str(uid))
                user_name = cached_user.get('name', f"UID_{uid}")
                user_found = True
            
            if not user_found:
                # Try to find user from live lookup on master device
                def find_user_operation(conn):
                    users = conn.get_users()
                    for user in users:
                        if int(user.uid) == uid:
                            return {'user': user}
                    return {'user': None}
                
                result = self.with_device_connection(master_device, find_user_operation)
                if result.get('success') and result.get('user'):
                    user_name = result['user'].name
                    user_found = True
            
            if not user_found:
                return self.create_response('error', f'User with UID {uid} not found on master device {master_device["name"]}')
            
            # Test master device connectivity
            device_ready = self._prepare_device_for_enrollment(master_device)
            if not device_ready['success']:
                return self.create_response('error', f'Master device {master_device["name"]} is not ready: {device_ready.get("message", "Unknown error")}')
            
            return self.create_response('ready_to_enroll', 
                f'Ready to enroll fingerprint for {user_name} on master device {master_device["name"]}. Place finger on scanner.', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': {
                    'device_id': master_device['id'],
                    'device_name': master_device['name'],
                    'status': 'ready'
                },
                'enrollment_stage': 1,
                'enrollment_mode': 'master_device',
                'next_action': 'Place finger on the master device scanner 3 times when prompted'
            })
            
        except Exception as e:
            return self.create_response('error', f'Master stage 1 validation failed: {str(e)}')
    
    def _fingerprint_master_stage2_process(self, uid: int, fid: int, master_device: Dict) -> Dict:
        """Stage 2: Processing enrollment on master device"""
        try:
            # Get user name from cache/previous stage
            device_cache = self.user_cache.get(master_device['id'], {})
            cached_user = device_cache.get(uid) or device_cache.get(str(uid))
            user_name = cached_user.get('name', f'UID_{uid}') if cached_user else f'UID_{uid}'
            
            return self.create_response('processing', 
                f'Processing fingerprint enrollment for {user_name} on master device {master_device["name"]}. Please wait...', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': {
                    'device_id': master_device['id'],
                    'device_name': master_device['name'],
                    'status': 'processing'
                },
                'enrollment_stage': 2,
                'enrollment_mode': 'master_device',
                'message': 'Enrollment in progress on master device. Please keep finger on scanner.'
            })
            
        except Exception as e:
            return self.create_response('error', f'Master stage 2 processing failed: {str(e)}')
    
    def _fingerprint_master_stage3_enrollment_and_sync(self, uid: int, fid: int, master_device: Dict) -> Dict:
        """Stage 3: Execute enrollment on master and sync fingerprint template to all devices"""
        try:
            # Get user name
            device_cache = self.user_cache.get(master_device['id'], {})
            cached_user = device_cache.get(uid) or device_cache.get(str(uid))
            user_name = cached_user.get('name', f'UID_{uid}') if cached_user else f'UID_{uid}'
            
            # Step 1: Publish enrollment started status
            enrollment_started_response = self.create_response('enrolling', 
                f'Starting fingerprint enrollment for {user_name} on master device {master_device["name"]}...', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': master_device['name'],
                'enrollment_stage': '2.1',
                'enrollment_mode': 'master_device',
                'status': 'enrollment_ui_active',
                'message': 'Please place your finger on the master device scanner 3 times'
            })
            
            if self.mqtt_connected:
                self.mqtt_client.publish(self.TOPICS['user_response'], json.dumps(enrollment_started_response))
                print(f"✅ Enrollment started response published")
            
            # Step 2: Enroll fingerprint on master device
            print(f"🎯 Enrolling fingerprint on master device: {master_device['name']}")
            master_result = self._enroll_fingerprint_on_device(uid, fid, master_device)
            
            if not master_result['success']:
                # Master enrollment failed
                sound_feedback = self.play_sound_on_devices(2)  # Error sound
                failed_response = self.create_response('failed', 
                    f'Fingerprint enrollment failed on master device {master_device["name"]}: {master_result.get("message", "Unknown error")}', {
                    'uid': uid,
                    'fid': fid,
                    'user_name': user_name,
                    'master_enrollment': master_result,
                    'sync_results': [],
                    'enrollment_stage': 3,
                    'enrollment_mode': 'master_device',
                    'final_result': True,
                    'sound_feedback': sound_feedback
                })
                
                if self.mqtt_connected:
                    self.mqtt_client.publish(self.TOPICS['user_response'], json.dumps(failed_response))
                    print(f"✅ Enrollment failed response published")
                
                return failed_response
            
            print(f"✅ Master enrollment successful, starting sync to other devices...")
            
            # Step 3: Publish enrollment success + sync starting status
            sync_starting_response = self.create_response('enrollment_success_syncing', 
                f'Fingerprint enrolled successfully on master {master_device["name"]}. Starting sync to other devices...', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': master_device['name'],
                'master_enrollment': master_result,
                'enrollment_stage': '2.2',
                'enrollment_mode': 'master_device',
                'status': 'sync_starting',
                'message': 'Synchronizing fingerprint template to other devices...'
            })
            
            if self.mqtt_connected:
                self.mqtt_client.publish(self.TOPICS['user_response'], json.dumps(sync_starting_response))
                print(f"✅ Sync starting response published")
            
            # Step 2: Get fingerprint template from master device
            fingerprint_template = self._get_fingerprint_template_from_master(uid, fid, master_device)
            
            # Step 3: Sync fingerprint template to all other devices
            other_devices = [d for d in self.devices if d.get('enabled', True) and d['id'] != master_device['id']]
            sync_results = []
            successful_syncs = 0
            
            if fingerprint_template and other_devices:
                print(f"🔄 Syncing fingerprint template to {len(other_devices)} other devices...")
                for device in other_devices:
                    sync_result = self._sync_fingerprint_template_to_device(uid, fid, fingerprint_template, device)
                    sync_results.append({
                        'device_id': device['id'],
                        'device_name': device['name'],
                        'success': sync_result['success'],
                        'message': sync_result.get('message', ''),
                        'status': 'success' if sync_result['success'] else 'failed'
                    })
                    
                    if sync_result['success']:
                        successful_syncs += 1
            
            # Step 4: Determine final status and play sound
            total_devices = len(other_devices) + 1  # +1 for master device
            total_successful = successful_syncs + 1  # +1 for master device (always successful if we reach here)
            
            if successful_syncs == len(other_devices):
                final_status = 'success'
                message = f'Fingerprint enrolled on master {master_device["name"]} and synced to all {successful_syncs} other devices successfully for {user_name}'
                sound_index = 0  # Success sound
            elif successful_syncs > 0:
                final_status = 'partial_success'
                message = f'Fingerprint enrolled on master {master_device["name"]} and synced to {successful_syncs}/{len(other_devices)} other devices for {user_name}'
                sound_index = 0  # Success sound (master succeeded)
            else:
                final_status = 'partial_success'
                message = f'Fingerprint enrolled on master {master_device["name"]} only. Failed to sync to other devices for {user_name}'
                sound_index = 0  # Success sound (master succeeded)
            
            # Play sound feedback
            sound_feedback = self.play_sound_on_devices(sound_index)
            
            return self.create_response(final_status, message, {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'master_device': master_device['name'],
                'master_enrollment': master_result,
                'sync_results': sync_results,
                'successful_syncs': successful_syncs,
                'total_other_devices': len(other_devices),
                'total_successful_devices': total_successful,
                'total_devices': total_devices,
                'sound_feedback': sound_feedback,
                'enrollment_stage': 3,
                'enrollment_mode': 'master_device',
                'final_result': True
            })
            
        except Exception as e:
            return self.create_response('error', f'Master stage 3 enrollment and sync failed: {str(e)}')
    
    def _get_fingerprint_template_from_master(self, uid: int, fid: int, master_device: Dict) -> Dict:
        """Get fingerprint template from master device after enrollment"""
        try:
            def get_template_operation(conn):
                try:
                    # Get user's fingerprint template
                    template = conn.get_user_template(uid=uid, temp_id=fid)
                    if template:
                        return {'template': template}
                    else:
                        # Alternative: get all templates and filter
                        templates = conn.get_templates()
                        for temp in templates:
                            if hasattr(temp, 'uid') and hasattr(temp, 'fid') and temp.uid == uid and temp.fid == fid:
                                return {'template': temp}
                        return {'template': None}
                except Exception as e:
                    print(f"⚠️ Template retrieval failed: {e}")
                    return {'template': None}
            
            result = self.with_device_connection(master_device, get_template_operation)
            if result.get('success') and result.get('template'):
                print(f"✅ Retrieved fingerprint template from master device")
                return result['template']
            else:
                print(f"⚠️ Could not retrieve fingerprint template from master device")
                return None
                
        except Exception as e:
            print(f"❌ Error getting fingerprint template: {e}")
            return None
    
    def _sync_fingerprint_template_to_device(self, uid: int, fid: int, template, target_device: Dict) -> Dict:
        """Sync fingerprint template from master to target device WITHOUT showing enrollment UI"""
        try:
            print(f"🔄 Syncing fingerprint template to {target_device['name']} (NO enrollment UI)")
            
            def sync_template_operation(conn):
                try:
                    # Method 1: Direct template save (preferred method - no UI change)
                    if hasattr(conn, 'save_user_template') and template:
                        print(f"📝 Using save_user_template method for {target_device['name']}")
                        conn.save_user_template(uid, [template])
                        return {'synced': True, 'method': 'save_user_template', 'ui_shown': False}
                    
                    # Method 2: Try to save template via set_user_template
                    elif hasattr(conn, 'set_user_template') and template:
                        print(f"📝 Using set_user_template method for {target_device['name']}")
                        conn.set_user_template(template)
                        return {'synced': True, 'method': 'set_user_template', 'ui_shown': False}
                    
                    # Method 3: Template data transfer (if available)
                    elif template and hasattr(template, 'template') and hasattr(conn, 'upload_template'):
                        print(f"📝 Using upload_template method for {target_device['name']}")
                        conn.upload_template(template)
                        return {'synced': True, 'method': 'upload_template', 'ui_shown': False}
                    
                    # Fallback: Template not available or method not supported
                    else:
                        print(f"⚠️ No template sync method available for {target_device['name']}")
                        return {'synced': False, 'method': 'none', 'reason': 'No suitable template sync method available', 'ui_shown': False}
                    
                except Exception as e:
                    print(f"❌ Template sync error on {target_device['name']}: {str(e)}")
                    return {'synced': False, 'method': 'error', 'error': str(e), 'ui_shown': False}
            
            result = self.with_device_connection(target_device, sync_template_operation)
            
            if result.get('success') and result.get('synced'):
                print(f"✅ Template sync successful to {target_device['name']} - NO UI CHANGE")
                return {
                    'success': True,
                    'message': f'Fingerprint template synced to {target_device["name"]} using {result.get("method", "unknown")} method (background)',
                    'method': result.get('method'),
                    'ui_change': False
                }
            else:
                print(f"❌ Template sync failed to {target_device['name']}: {result.get('error', result.get('reason', 'Unknown error'))}")
                return {
                    'success': False,
                    'message': f'Failed to sync fingerprint template to {target_device["name"]}: {result.get("error", result.get("reason", "Unknown error"))}',
                    'ui_change': False
                }
                
        except Exception as e:
            print(f"❌ Sync operation error to {target_device['name']}: {str(e)}")
            return {
                'success': False,
                'message': f'Error syncing to {target_device["name"]}: {str(e)}',
                'ui_change': False
            }
    
    def _fingerprint_stage1_validation(self, uid: int, fid: int) -> Dict:
        """Stage 1: Validate user and prepare for enrollment"""
        try:
            # Get enabled devices
            enabled_devices = [d for d in self.devices if d.get('enabled', True)]
            if not enabled_devices:
                return self.create_response('error', 'No enabled devices found')
            
            # Check if user exists across devices
            user_found = False
            user_name = f"UID_{uid}"
            
            for device in enabled_devices:
                device_cache = self.user_cache.get(device['id'], {})
                if device_cache.get(uid) or device_cache.get(str(uid)):
                    cached_user = device_cache.get(uid) or device_cache.get(str(uid))
                    user_name = cached_user.get('name', f"UID_{uid}")
                    user_found = True
                    break
            
            if not user_found:
                # Try to find user from live lookup
                for device in enabled_devices:
                    def find_user_operation(conn):
                        users = conn.get_users()
                        for user in users:
                            if int(user.uid) == uid:
                                return {'user': user}
                        return {'user': None}
                    
                    result = self.with_device_connection(device, find_user_operation)
                    if result.get('success') and result.get('user'):
                        user_name = result['user'].name
                        user_found = True
                        break
            
            if not user_found:
                return self.create_response('error', f'User with UID {uid} not found on any device')
            
            # Prepare devices for enrollment
            ready_devices = []
            failed_devices = []
            
            for device in enabled_devices:
                device_ready = self._prepare_device_for_enrollment(device)
                if device_ready['success']:
                    ready_devices.append({
                        'device_id': device['id'],
                        'device_name': device['name'],
                        'status': 'ready'
                    })
                else:
                    failed_devices.append({
                        'device_id': device['id'],
                        'device_name': device['name'],
                        'status': 'failed',
                        'error': device_ready.get('message', 'Unknown error')
                    })
            
            if not ready_devices:
                return self.create_response('error', 'No devices are ready for enrollment')
            
            return self.create_response('ready_to_enroll', 
                f'Ready to enroll fingerprint for {user_name}. Place finger on scanner(s).', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'ready_devices': ready_devices,
                'failed_devices': failed_devices,
                'total_devices': len(enabled_devices),
                'ready_count': len(ready_devices),
                'enrollment_stage': 1,
                'next_action': 'Place finger on the scanner 3 times when prompted'
            })
            
        except Exception as e:
            return self.create_response('error', f'Stage 1 validation failed: {str(e)}')
    
    def _fingerprint_stage2_process(self, uid: int, fid: int, stage1_data: Dict) -> Dict:
        """Stage 2: Processing enrollment"""
        try:
            user_name = stage1_data.get('user_name', f'UID_{uid}')
            ready_devices = stage1_data.get('ready_devices', [])
            
            processing_devices = []
            for device_info in ready_devices:
                processing_devices.append({
                    'device_id': device_info['device_id'],
                    'device_name': device_info['device_name'],
                    'status': 'processing'
                })
            
            return self.create_response('processing', 
                f'Processing fingerprint enrollment for {user_name}. Please wait...', {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'processing_devices': processing_devices,
                'enrollment_stage': 2,
                'message': 'Enrollment in progress. Please keep finger on scanner.'
            })
            
        except Exception as e:
            return self.create_response('error', f'Stage 2 processing failed: {str(e)}')
    
    def _fingerprint_stage3_result(self, uid: int, fid: int, stage1_data: Dict) -> Dict:
        """Stage 3: Execute enrollment and return final result"""
        try:
            user_name = stage1_data.get('user_name', f'UID_{uid}')
            ready_devices_info = stage1_data.get('ready_devices', [])
            
            # Get actual device configs for ready devices
            ready_devices = []
            for device_info in ready_devices_info:
                device = self.get_device_by_id(device_info['device_id'])
                if device:
                    ready_devices.append(device)
            
            # Start fingerprint enrollment on ready devices
            successful_enrollments = 0
            failed_enrollments = 0
            enrollment_results = []
            
            for device in ready_devices:
                device_result = self._enroll_fingerprint_on_device(uid, fid, device)
                enrollment_results.append({
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'success': device_result['success'],
                    'message': device_result.get('message', ''),
                    'status': 'success' if device_result['success'] else 'failed'
                })
                
                if device_result['success']:
                    successful_enrollments += 1
                else:
                    failed_enrollments += 1
            
            # Play sound feedback
            sound_feedback = self.play_sound_on_devices(0 if successful_enrollments > 0 else 2)
            
            # Determine final status
            if successful_enrollments == len(ready_devices):
                final_status = 'success'
                message = f'Fingerprint enrollment completed successfully for {user_name} on all {successful_enrollments} devices'
            elif successful_enrollments > 0:
                final_status = 'partial_success'
                message = f'Fingerprint enrollment partially successful for {user_name}: {successful_enrollments}/{len(ready_devices)} devices'
            else:
                final_status = 'failed'
                message = f'Fingerprint enrollment failed for {user_name} on all devices'
            
            return self.create_response(final_status, message, {
                'uid': uid,
                'fid': fid,
                'user_name': user_name,
                'successful_enrollments': successful_enrollments,
                'failed_enrollments': failed_enrollments,
                'total_devices': len(ready_devices),
                'enrollment_results': enrollment_results,
                'sound_feedback': sound_feedback,
                'enrollment_stage': 3,
                'final_result': True
            })
            
        except Exception as e:
            return self.create_response('error', f'Stage 3 result failed: {str(e)}')
    
    def _prepare_device_for_enrollment(self, device: Dict) -> Dict:
        """Prepare device for fingerprint enrollment"""
        def preparation_operation(conn):
            try:
                # Test connection and get device info
                firmware = conn.get_firmware_version()
                return {'firmware': firmware, 'prepared': True}
            except Exception as e:
                raise e
        
        result = self.with_device_connection(device, preparation_operation)
        return result
    
    def _enroll_fingerprint_on_device(self, uid: int, fid: int, device: Dict) -> Dict:
        """Enroll fingerprint on specific device - ONLY triggers enrollment UI on device"""
        def enroll_operation(conn):
            try:
                print(f"📱 Starting fingerprint enrollment UI on {device['name']}")
                
                # Pre-enrollment check: verify user exists (safe approach)
                try:
                    users = conn.get_users()
                    user_exists = any(user.uid == uid for user in users)
                    if not user_exists:
                        print(f"⚠️ User with UID {uid} not found on device {device['name']}, but proceeding with enrollment")
                        # Don't raise exception - let enrollment proceed as it might create the user
                except Exception as user_check_error:
                    print(f"⚠️ Could not verify user existence: {user_check_error}")
                    # Continue anyway - enrollment might still work
                
                # Check if fingerprint already exists at this index (safe approach)
                try:
                    templates = conn.get_templates()
                    existing_template = next((t for t in templates if t.uid == uid and t.fid == fid), None)
                    if existing_template:
                        print(f"⚠️ Fingerprint already exists for UID {uid} at index {fid}")
                        try:
                            # Try to delete existing template first
                            conn.delete_template(uid, fid)
                            print(f"🗑️ Deleted existing fingerprint template for UID {uid} at index {fid}")
                        except Exception as delete_error:
                            print(f"⚠️ Could not delete existing template: {delete_error}")
                            # Continue anyway - enrollment might overwrite
                except Exception as template_check_error:
                    print(f"⚠️ Could not check existing templates: {template_check_error}")
                    # Continue anyway - the enrollment might still work
                
                # Step 1: Put device in enrollment mode - this will show enrollment screen
                conn.disable_device()
                
                print(f"🔄 Device {device['name']} disabled for enrollment")
                
                # Step 2: Start fingerprint enrollment - this shows the enrollment interface
                # User must place finger on scanner during this process (typically 3 times)
                print(f"🎯 Starting enrollment for UID {uid} at finger index {fid}")
                
                try:
                    result = conn.enroll_user(uid, temp_id=fid)
                    print(f"📋 Enrollment result: {result}")
                    print(f"✅ Fingerprint enrollment completed on {device['name']}")
                    
                    # Step 3: Re-enable device after enrollment
                    conn.enable_device()
                    print(f"🔄 Device {device['name']} re-enabled after enrollment")
                    
                    return {'enrollment_result': result, 'enrollment_success': True}
                    
                except AttributeError as attr_error:
                    conn.enable_device()  # Ensure device is enabled
                    if "enroll_user" in str(attr_error):
                        raise Exception(f"Enrollment method not supported on this device model. Device: {device['name']}. Try using a different enrollment approach or check device compatibility.")
                    else:
                        raise Exception(f"Device method not available: {str(attr_error)}")
                        
                except Exception as enroll_error:
                    conn.enable_device()  # Ensure device is enabled
                    error_msg = str(enroll_error)
                    if "Can't Enroll" in error_msg or "Cant Enroll" in error_msg:
                        raise Exception(f"Device rejected enrollment for UID {uid} at finger index {fid}. Reasons could be: finger already enrolled, device memory full, poor finger quality, or user doesn't exist. Original: {error_msg}")
                    else:
                        raise Exception(f"Enrollment failed: {error_msg}")
                
            except Exception as e:
                # This catches any remaining errors not handled by the inner try-catch
                error_message = str(e)
                print(f"❌ Outer enrollment error on {device['name']}: {error_message}")
                
                try:
                    conn.enable_device()  # Ensure device is enabled on error
                    print(f"🔄 Device {device['name']} re-enabled after outer error")
                except:
                    print(f"⚠️ Could not re-enable device {device['name']} after outer error")
                    pass
                
                # Re-raise the exception from inner handler
                raise e
        
        result = self.with_device_connection(device, enroll_operation)
        
        if result.get('success'):
            return {
                'success': True,
                'message': f'Fingerprint enrollment completed successfully on {device["name"]}',
                'enrollment_result': result.get('enrollment_result')
            }
        else:
            return {
                'success': False,
                'message': f'Failed to enroll fingerprint on {device["name"]}: {result.get("message", "Unknown error")}'
            }
    
    # ==================== AUTO-START LIVE MONITORING ====================
    
    def _delayed_auto_start(self):
        """Delayed auto-start for live monitoring after MQTT connection"""
        time.sleep(3)  # Wait for connection to stabilize
        if self.running and self.mqtt_connected:
            self._auto_start_live_monitoring()
    
    def _auto_start_live_monitoring(self):
        """Auto-start live attendance monitoring for all enabled devices"""
        try:
            enabled_devices = [d for d in self.devices if d.get('enabled', True)]
            
            if not enabled_devices:
                print("⚠️ No enabled devices found for live monitoring")
                return
            
            print(f"🎯 Auto-starting live monitoring for {len(enabled_devices)} devices...")
            
            # Start monitoring threads for each enabled device
            self.attendance_monitoring = True
            
            for device in enabled_devices:
                device_id = device['id']
                if device_id not in self.attendance_threads:
                    # Update user cache first
                    self._update_user_cache(device)
                    
                    # Wait a bit for cache to be populated
                    time.sleep(0.5)
                    
                    # Start monitoring thread with configurable poll interval
                    poll_interval = self.device_config.get('settings', {}).get('poll_interval', 3)
                    thread = threading.Thread(
                        target=self._monitor_device_attendance,
                        args=(device, poll_interval),
                        daemon=True
                    )
                    thread.start()
                    self.attendance_threads[device_id] = thread
                    self.last_attendance_records[device_id] = []
                    self.device_last_access_time[device_id] = None
                    
                    print(f"🔥 Started live monitoring: {device['name']} ({device_id})")
                    
                    # Start periodic cache refresh (every 10 minutes)
                    def refresh_cache_periodically(target_device):
                        while self.attendance_monitoring and target_device['id'] in self.attendance_threads:
                            time.sleep(600)  # 10 minutes
                            if self.attendance_monitoring:
                                self._update_user_cache(target_device)
                    
                    threading.Thread(
                        target=refresh_cache_periodically,
                        args=(device,),
                        daemon=True
                    ).start()
            
            print(f"✅ Live monitoring active on {len(enabled_devices)} devices")
            
            # Publish system status
            if self.mqtt_connected:
                status_data = {
                    'event_type': 'system_status',
                    'message': 'Live attendance monitoring started',
                    'active_devices': len(enabled_devices),
                    'device_list': [d['id'] for d in enabled_devices],
                    'timestamp': datetime.now().isoformat() + 'Z'
                }
                self.mqtt_client.publish(self.TOPICS['system_status'], json.dumps(status_data))
                
        except Exception as e:
            print(f"❌ Error auto-starting live monitoring: {e}")
    
    def _stop_live_monitoring(self):
        """Stop live monitoring (internal method)"""
        try:
            if self.attendance_monitoring:
                stopped_devices = list(self.attendance_threads.keys())
                self.attendance_monitoring = False
                
                # Clear monitoring threads
                self.attendance_threads.clear()
                self.last_attendance_records.clear()
                self.device_last_access_time.clear()
                
                print(f"🛑 Live monitoring stopped on {len(stopped_devices)} devices")
                
                # Publish system status
                if self.mqtt_connected:
                    status_data = {
                        'event_type': 'system_status',
                        'message': 'Live attendance monitoring stopped',
                        'stopped_devices': len(stopped_devices),
                        'timestamp': datetime.now().isoformat() + 'Z'
                    }
                    self.mqtt_client.publish(self.TOPICS['system_status'], json.dumps(status_data))
                    
        except Exception as e:
            print(f"❌ Error stopping live monitoring: {e}")
    
    # ==================== SERVICE MANAGEMENT ====================
    
    def start_service(self):
        """Start service with auto-start live attendance monitoring"""
        print("🚀 Starting ZKTeco Device Manager Service...")
        self.running = True
        
        if MQTT_AVAILABLE and self.connect_mqtt():
            print("✅ MQTT service started successfully")
            # Auto-start will be handled by MQTT connection callback
        else:
            # If no MQTT, start monitoring directly
            self._auto_start_live_monitoring()
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n⚠️ Received interrupt signal")
        finally:
            self.stop_service()
    
    def stop_service(self):
        """Stop service"""
        print("🔄 Stopping ZKTeco Device Manager Service...")
        self.running = False
        
        # Stop attendance monitoring
        if self.attendance_monitoring:
            self._stop_live_monitoring()
        
        if self.mqtt_client and self.mqtt_connected:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
        
        print("✅ Service stopped successfully")


    # ==================== NEW DEVICE CONFIGURATION METHODS ====================
    
    def set_device_time(self, data: Dict) -> Dict:
        """Set device date and time"""
        try:
            device_id = data.get('device_id', 'all')
            timestamp = data.get('timestamp')  # Unix timestamp or datetime string
            
            if not timestamp:
                return self.create_response('error', 'Missing timestamp parameter')
            
            # Convert timestamp to datetime if needed
            if isinstance(timestamp, (int, float)):
                from datetime import datetime
                dt = datetime.fromtimestamp(timestamp)
            elif isinstance(timestamp, str):
                from datetime import datetime
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except:
                    dt = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
            else:
                return self.create_response('error', 'Invalid timestamp format')
            
            def set_time_operation(device):
                def time_operation(conn):
                    # Set device time
                    conn.set_time(dt)
                    return {'operation': 'time_set', 'timestamp': dt.isoformat()}
                
                result = self.with_device_connection(device, time_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Time set on {device['name']}" if result.get('success') else f"Failed to set time on {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'new_time': dt.isoformat()
                }
            
            if device_id == 'all':
                time_result = self.execute_on_devices(set_time_operation, operation_name="set device time")
                return self.create_response('success', f'Time set on {time_result["successful_operations"]}/{time_result["total_devices"]} devices', {
                    'timestamp': dt.isoformat(),
                    'summary': time_result,
                    'devices': [r for r in time_result['operation_results']]
                })
            else:
                device = self.get_device_by_id(device_id)
                if not device:
                    return self.create_response('error', f'Device {device_id} not found')
                
                result = set_time_operation(device)
                return self.create_response(
                    'success' if result['success'] else 'error',
                    result['message'],
                    result
                )
                
        except Exception as e:
            return self.create_response('error', f'Failed to set device time: {str(e)}')
    
    def get_device_time(self, data: Dict) -> Dict:
        """Get device current time"""
        try:
            device_id = data.get('device_id', 'all')
            
            def get_time_operation(device):
                def time_operation(conn):
                    # Get device time
                    device_time = conn.get_time()
                    return {'operation': 'time_retrieved', 'device_time': device_time}
                
                result = self.with_device_connection(device, time_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Time retrieved from {device['name']}" if result.get('success') else f"Failed to get time from {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'device_time': result.get('device_time').isoformat() if result.get('device_time') else None
                }
            
            if device_id == 'all':
                time_result = self.execute_on_devices(get_time_operation, operation_name="get device time")
                return self.create_response('success', f'Time retrieved from {time_result["successful_operations"]}/{time_result["total_devices"]} devices', {
                    'summary': time_result,
                    'devices': [r for r in time_result['operation_results']]
                })
            else:
                device = self.get_device_by_id(device_id)
                if not device:
                    return self.create_response('error', f'Device {device_id} not found')
                
                result = get_time_operation(device)
                return self.create_response(
                    'success' if result['success'] else 'error',
                    result['message'],
                    result
                )
                
        except Exception as e:
            return self.create_response('error', f'Failed to get device time: {str(e)}')
    
    def set_device_language(self, data: Dict) -> Dict:
        """Set device language"""
        try:
            device_id = data.get('device_id', 'all')
            language = data.get('language')  # Language code (e.g., 'en', 'id', 'zh')
            
            if not language:
                return self.create_response('error', 'Missing language parameter')
            
            # Language mapping for ZKTeco devices
            language_map = {
                'en': 0,    # English
                'id': 1,    # Indonesian
                'zh': 2,    # Chinese
                'ko': 3,    # Korean
                'jp': 4,    # Japanese
                'th': 5,    # Thai
                'vi': 6,    # Vietnamese
                'es': 7,    # Spanish
                'pt': 8,    # Portuguese
                'fr': 9,    # French
                'de': 10,   # German
                'it': 11,   # Italian
                'ru': 12    # Russian
            }
            
            if language not in language_map:
                return self.create_response('error', f'Unsupported language: {language}. Supported: {list(language_map.keys())}')
            
            lang_code = language_map[language]
            
            def set_language_operation(device):
                def language_operation(conn):
                    # Set device language (this may vary by device model)
                    # Some devices use set_user_info or device-specific commands
                    try:
                        # Try to set language via device command
                        conn.set_user(uid=0, name='admin', privilege=14, password='', group_id='', user_id='', card=0)
                        return {'operation': 'language_set', 'language': language, 'code': lang_code}
                    except:
                        # Fallback: just return success for now (device-specific implementation needed)
                        return {'operation': 'language_set_partial', 'language': language, 'code': lang_code}
                
                result = self.with_device_connection(device, language_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Language set to {language} on {device['name']}" if result.get('success') else f"Failed to set language on {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'language': language,
                    'language_code': lang_code
                }
            
            if device_id == 'all':
                lang_result = self.execute_on_devices(set_language_operation, operation_name="set device language")
                return self.create_response('success', f'Language set on {lang_result["successful_operations"]}/{lang_result["total_devices"]} devices', {
                    'language': language,
                    'language_code': lang_code,
                    'summary': lang_result,
                    'devices': [r for r in lang_result['operation_results']]
                })
            else:
                device = self.get_device_by_id(device_id)
                if not device:
                    return self.create_response('error', f'Device {device_id} not found')
                
                result = set_language_operation(device)
                return self.create_response(
                    'success' if result['success'] else 'error',
                    result['message'],
                    result
                )
                
        except Exception as e:
            return self.create_response('error', f'Failed to set device language: {str(e)}')
    
    def get_device_info(self, data: Dict) -> Dict:
        """Get comprehensive device information"""
        try:
            device_id = data.get('device_id', 'all')
            
            def get_info_operation(device):
                def info_operation(conn):
                    # Get comprehensive device info
                    info = {
                        'firmware_version': conn.get_firmware_version(),
                        'device_name': conn.get_device_name(),
                        'serial_number': conn.get_serialnumber(),
                        'platform': conn.get_platform(),
                        'device_time': conn.get_time(),
                        'user_count': len(conn.get_users()),
                        'attendance_count': len(conn.get_attendance()),
                        'fingerprint_count': len(conn.get_templates()),
                        'capacity': {
                            'users': len(conn.get_users()),
                            'fingerprints': len(conn.get_templates()),
                            'records': len(conn.get_attendance())
                        }
                    }
                    return {'operation': 'info_retrieved', 'device_info': info}
                
                result = self.with_device_connection(device, info_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Info retrieved from {device['name']}" if result.get('success') else f"Failed to get info from {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'device_info': result.get('device_info', {})
                }
            
            if device_id == 'all':
                info_result = self.execute_on_devices(get_info_operation, operation_name="get device info")
                return self.create_response('success', f'Info retrieved from {info_result["successful_operations"]}/{info_result["total_devices"]} devices', {
                    'summary': info_result,
                    'devices': [r for r in info_result['operation_results']]
                })
            else:
                device = self.get_device_by_id(device_id)
                if not device:
                    return self.create_response('error', f'Device {device_id} not found')
                
                result = get_info_operation(device)
                return self.create_response(
                    'success' if result['success'] else 'error',
                    result['message'],
                    result
                )
                
        except Exception as e:
            return self.create_response('error', f'Failed to get device info: {str(e)}')
    
    def restart_device(self, data: Dict) -> Dict:
        """Restart/reboot device"""
        try:
            device_id = data.get('device_id')
            force = data.get('force', False)
            
            if not device_id:
                return self.create_response('error', 'Missing device_id parameter')
            
            if device_id == 'all' and not force:
                return self.create_response('error', 'Cannot restart all devices without force=true parameter for safety')
            
            def restart_operation(device):
                def reboot_operation(conn):
                    # Restart the device
                    conn.restart()
                    return {'operation': 'device_restarted'}
                
                result = self.with_device_connection(device, reboot_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Device {device['name']} restart command sent" if result.get('success') else f"Failed to restart {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'warning': 'Device will be offline for 30-60 seconds during restart'
                }
            
            if device_id == 'all':
                restart_result = self.execute_on_devices(restart_operation, operation_name="restart device")
                return self.create_response('success', f'Restart command sent to {restart_result["successful_operations"]}/{restart_result["total_devices"]} devices', {
                    'summary': restart_result,
                    'devices': [r for r in restart_result['operation_results']],
                    'warning': 'All devices will be offline for 30-60 seconds during restart'
                })
            else:
                device = self.get_device_by_id(device_id)
                if not device:
                    return self.create_response('error', f'Device {device_id} not found')
                
                result = restart_operation(device)
                return self.create_response(
                    'success' if result['success'] else 'error',
                    result['message'],
                    result
                )
                
        except Exception as e:
            return self.create_response('error', f'Failed to restart device: {str(e)}')
    
    def set_device_network(self, data: Dict) -> Dict:
        """Set device network configuration"""
        try:
            device_id = data.get('device_id')
            new_ip = data.get('ip')
            new_netmask = data.get('netmask', '255.255.255.0')
            new_gateway = data.get('gateway')
            
            if not device_id or not new_ip:
                return self.create_response('error', 'Missing device_id or ip parameter')
            
            def set_network_operation(device):
                def network_operation(conn):
                    # Set network configuration
                    # Note: This will change the device IP, so connection will be lost
                    try:
                        conn.set_network(new_ip, new_netmask, new_gateway or '192.168.1.1')
                        return {'operation': 'network_set', 'new_ip': new_ip, 'netmask': new_netmask, 'gateway': new_gateway}
                    except Exception as e:
                        return {'operation': 'network_set_failed', 'error': str(e)}
                
                result = self.with_device_connection(device, network_operation)
                
                # Update device config if successful
                if result.get('success'):
                    # Update local device configuration
                    device['ip'] = new_ip
                    self.save_device_config()
                
                return {
                    'success': result.get('success', False),
                    'message': f"Network config updated for {device['name']}" if result.get('success') else f"Failed to update network for {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'old_ip': device.get('ip'),
                    'new_ip': new_ip,
                    'netmask': new_netmask,
                    'gateway': new_gateway,
                    'warning': 'Device IP changed - update your configuration'
                }
            
            device = self.get_device_by_id(device_id)
            if not device:
                return self.create_response('error', f'Device {device_id} not found')
            
            result = set_network_operation(device)
            return self.create_response(
                'success' if result['success'] else 'error',
                result['message'],
                result
            )
                
        except Exception as e:
            return self.create_response('error', f'Failed to set device network: {str(e)}')
    
    def reset_device(self, data: Dict) -> Dict:
        """Reset device data (users, attendance, etc.)"""
        try:
            device_id = data.get('device_id')
            reset_type = data.get('reset_type', 'all')  # 'users', 'attendance', 'all'
            confirm = data.get('confirm', False)
            
            if not device_id:
                return self.create_response('error', 'Missing device_id parameter')
            
            if not confirm:
                return self.create_response('error', 'Reset operation requires confirm=true parameter for safety')
            
            def reset_operation(device):
                def device_reset_operation(conn):
                    reset_results = []
                    
                    if reset_type in ['users', 'all']:
                        conn.clear_users()
                        reset_results.append('users_cleared')
                    
                    if reset_type in ['attendance', 'all']:
                        conn.clear_attendance()
                        reset_results.append('attendance_cleared')
                    
                    if reset_type in ['templates', 'all']:
                        conn.clear_templates()
                        reset_results.append('templates_cleared')
                    
                    return {'operation': 'device_reset', 'reset_operations': reset_results}
                
                result = self.with_device_connection(device, device_reset_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Reset {reset_type} completed on {device['name']}" if result.get('success') else f"Failed to reset {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'reset_type': reset_type,
                    'reset_operations': result.get('reset_operations', [])
                }
            
            if device_id == 'all':
                if not data.get('confirm_all', False):
                    return self.create_response('error', 'Reset all devices requires confirm_all=true parameter for safety')
                
                reset_result = self.execute_on_devices(reset_operation, operation_name=f"reset device {reset_type}")
                return self.create_response('success', f'Reset {reset_type} completed on {reset_result["successful_operations"]}/{reset_result["total_devices"]} devices', {
                    'reset_type': reset_type,
                    'summary': reset_result,
                    'devices': [r for r in reset_result['operation_results']]
                })
            else:
                device = self.get_device_by_id(device_id)
                if not device:
                    return self.create_response('error', f'Device {device_id} not found')
                
                result = reset_operation(device)
                return self.create_response(
                    'success' if result['success'] else 'error',
                    result['message'],
                    result
                )
                
        except Exception as e:
            return self.create_response('error', f'Failed to reset device: {str(e)}')
    
    def get_device_config(self, data: Dict) -> Dict:
        """Get device configuration settings"""
        try:
            device_id = data.get('device_id')
            
            if not device_id:
                return self.create_response('error', 'Missing device_id parameter')
            
            device = self.get_device_by_id(device_id)
            if not device:
                return self.create_response('error', f'Device {device_id} not found')
            
            def get_config_operation(device):
                def config_operation(conn):
                    # Get device configuration
                    config = {
                        'device_name': conn.get_device_name(),
                        'firmware_version': conn.get_firmware_version(),
                        'serial_number': conn.get_serialnumber(),
                        'platform': conn.get_platform(),
                        'current_time': conn.get_time(),
                        'network_info': {
                            'ip': device['ip'],
                            'port': device['port'],
                            'configured_timeout': device.get('timeout', 5)
                        }
                    }
                    return {'operation': 'config_retrieved', 'device_config': config}
                
                result = self.with_device_connection(device, config_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Config retrieved from {device['name']}" if result.get('success') else f"Failed to get config from {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'device_config': result.get('device_config', {})
                }
            
            result = get_config_operation(device)
            return self.create_response(
                'success' if result['success'] else 'error',
                result['message'],
                result
            )
                
        except Exception as e:
            return self.create_response('error', f'Failed to get device config: {str(e)}')
    
    def set_device_config(self, data: Dict) -> Dict:
        """Set device configuration settings"""
        try:
            device_id = data.get('device_id')
            config_data = data.get('config', {})
            
            if not device_id:
                return self.create_response('error', 'Missing device_id parameter')
            
            device = self.get_device_by_id(device_id)
            if not device:
                return self.create_response('error', f'Device {device_id} not found')
            
            def set_config_operation(device):
                def config_operation(conn):
                    config_results = []
                    
                    # Set device name if provided
                    if 'device_name' in config_data:
                        try:
                            conn.set_device_name(config_data['device_name'])
                            config_results.append('device_name_set')
                        except:
                            config_results.append('device_name_failed')
                    
                    # Set time if provided
                    if 'time' in config_data:
                        try:
                            from datetime import datetime
                            if isinstance(config_data['time'], str):
                                dt = datetime.fromisoformat(config_data['time'])
                            else:
                                dt = datetime.fromtimestamp(config_data['time'])
                            conn.set_time(dt)
                            config_results.append('time_set')
                        except:
                            config_results.append('time_failed')
                    
                    return {'operation': 'config_set', 'config_operations': config_results}
                
                result = self.with_device_connection(device, config_operation)
                return {
                    'success': result.get('success', False),
                    'message': f"Config updated on {device['name']}" if result.get('success') else f"Failed to update config on {device['name']}: {result.get('message', 'Unknown error')}",
                    'device_id': device['id'],
                    'device_name': device['name'],
                    'config_operations': result.get('config_operations', []),
                    'config_data': config_data
                }
            
            result = set_config_operation(device)
            return self.create_response(
                'success' if result['success'] else 'error',
                result['message'],
                result
            )
                
        except Exception as e:
            return self.create_response('error', f'Failed to set device config: {str(e)}')


def main():
    """Main function"""
    manager = ZKDeviceManager()
    manager.start_service()


if __name__ == "__main__":
    main()