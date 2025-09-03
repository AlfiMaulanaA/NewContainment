#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZKTeco Access Control Device Reset Utility
Utility to reset/clear data from all access control devices configured in access_control_config.json

Features:
- Reset all data from all devices
- Selective reset (users only, attendance only, etc.)
- Backup data before reset
- Safety confirmations
- Parallel processing for multiple devices
- Detailed logging and reporting

Author: Assistant
Version: 1.1
"""

import json
import os
import sys
import time
import argparse
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any
import concurrent.futures

# Import pyzk library
sys.path.insert(1, os.path.abspath("./pyzk"))
try:
    from zk import ZK, const
    from zk.exception import ZKErrorConnection, ZKErrorResponse, ZKNetworkError
except ImportError:
    print("Error: pyzk library not found. Please ensure pyzk folder exists in the same directory.")
    sys.exit(1)


class DeviceResetManager:
    """Manager for resetting ZKTeco access control devices"""
    
    def __init__(self, config_file: str = "JSON/access_control_config.json"):
        """
        Initialize the reset manager
        
        Args:
            config_file (str): Path to device configuration file
        """
        self.config_file = config_file
        self.config = None
        self.reset_results = []
        self.backup_results = []
        
    def load_config(self) -> Dict:
        """Load device configuration from JSON file"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            return self.config
        except FileNotFoundError:
            print(f"❌ Configuration file not found: {self.config_file}")
            return {}
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in configuration file: {e}")
            return {}
        except Exception as e:
            print(f"❌ Error loading configuration: {e}")
            return {}
    
    def test_device_connection(self, device_config: Dict) -> bool:
        """Test if device is accessible"""
        try:
            zk = ZK(
                ip=device_config['ip'],
                port=device_config.get('port', 4370),
                timeout=device_config.get('timeout', 10),
                password=device_config.get('password', 0),
                force_udp=device_config.get('force_udp', False),
                verbose=False
            )
            
            conn = zk.connect()
            conn.disconnect()
            return True
        except Exception:
            return False
    
    def backup_device_data(self, device_config: Dict, backup_types: List[str] = None) -> Dict:
        """
        Backup device data before reset
        
        Args:
            device_config (Dict): Device configuration
            backup_types (List[str]): Types to backup ['users', 'attendance', 'fingerprints']
            
        Returns:
            Dict: Backup result with data
        """
        if backup_types is None:
            backup_types = ['users', 'attendance', 'fingerprints']
            
        backup_result = {
            'device_id': device_config.get('id', 'unknown'),
            'device_name': device_config.get('name', 'Unknown'),
            'ip': device_config.get('ip'),
            'timestamp': datetime.now().isoformat(),
            'status': 'failed',
            'data': {},
            'error_message': ''
        }
        
        try:
            print(f"📦 Backing up data from {device_config.get('name')} ({device_config.get('ip')})...")
            
            zk = ZK(
                ip=device_config['ip'],
                port=device_config.get('port', 4370),
                timeout=device_config.get('timeout', 10),
                password=device_config.get('password', 0),
                force_udp=device_config.get('force_udp', False),
                verbose=False
            )
            
            conn = zk.connect()
            
            # Backup users
            if 'users' in backup_types:
                try:
                    users = conn.get_users()
                    backup_result['data']['users'] = []
                    for user in users:
                        backup_result['data']['users'].append({
                            'uid': user.uid,
                            'name': user.name,
                            'privilege': user.privilege,
                            'password': user.password,
                            'group_id': user.group_id,
                            'user_id': user.user_id,
                            'card': user.card
                        })
                    print(f"  ✓ Backed up {len(users)} users")
                except Exception as e:
                    print(f"  ⚠️ Failed to backup users: {e}")
                    backup_result['data']['users'] = []
            
            # Backup fingerprints
            if 'fingerprints' in backup_types:
                try:
                    templates = conn.get_templates()
                    backup_result['data']['fingerprints'] = []
                    for template in templates:
                        backup_result['data']['fingerprints'].append({
                            'uid': template.uid,
                            'fid': template.fid,
                            'valid': template.valid,
                            'template': template.template.hex() if template.template else ''
                        })
                    print(f"  ✓ Backed up {len(templates)} fingerprint templates")
                except Exception as e:
                    print(f"  ⚠️ Failed to backup fingerprints: {e}")
                    backup_result['data']['fingerprints'] = []
            
            # Backup attendance records
            if 'attendance' in backup_types:
                try:
                    attendance = conn.get_attendance()
                    backup_result['data']['attendance'] = []
                    for record in attendance:
                        backup_result['data']['attendance'].append({
                            'user_id': record.user_id,
                            'timestamp': record.timestamp.isoformat() if record.timestamp else '',
                            'status': record.status,
                            'punch': record.punch
                        })
                    print(f"  ✓ Backed up {len(attendance)} attendance records")
                except Exception as e:
                    print(f"  ⚠️ Failed to backup attendance: {e}")
                    backup_result['data']['attendance'] = []
            
            conn.disconnect()
            backup_result['status'] = 'success'
            print(f"  ✅ Backup completed for {device_config.get('name')}")
            
        except ZKNetworkError as e:
            backup_result['error_message'] = f"Network error: {str(e)}"
            print(f"  ❌ Network error: {e}")
        except ZKErrorConnection as e:
            backup_result['error_message'] = f"Connection error: {str(e)}"
            print(f"  ❌ Connection error: {e}")
        except Exception as e:
            backup_result['error_message'] = f"Unexpected error: {str(e)}"
            print(f"  ❌ Unexpected error: {e}")
        
        return backup_result
    
    def reset_device_data(self, device_config: Dict, reset_types: List[str] = None) -> Dict:
        """
        Reset/clear data from device
        
        Args:
            device_config (Dict): Device configuration
            reset_types (List[str]): Types to reset ['users', 'attendance', 'fingerprints', 'all']
            
        Returns:
            Dict: Reset result
        """
        if reset_types is None:
            reset_types = ['all']
            
        reset_result = {
            'device_id': device_config.get('id', 'unknown'),
            'device_name': device_config.get('name', 'Unknown'),
            'ip': device_config.get('ip'),
            'timestamp': datetime.now().isoformat(),
            'status': 'failed',
            'operations': [],
            'error_message': ''
        }
        
        try:
            print(f"🧹 Resetting data on {device_config.get('name')} ({device_config.get('ip')})...")
            
            zk = ZK(
                ip=device_config['ip'],
                port=device_config.get('port', 4370),
                timeout=device_config.get('timeout', 15),
                password=device_config.get('password', 0),
                force_udp=device_config.get('force_udp', False),
                verbose=False
            )
            
            conn = zk.connect()
            
            # Disable device during reset
            conn.disable_device()
            reset_result['operations'].append({'operation': 'disable_device', 'status': 'success'})
            
            # Reset users and fingerprints (usually cleared together)
            if 'users' in reset_types or 'all' in reset_types:
                try:
                    conn.clear_data()  # Clear user and fingerprint data
                    reset_result['operations'].append({'operation': 'clear_users_and_fingerprints', 'status': 'success'})
                    print("  ✓ Cleared all users and fingerprint templates")
                except Exception as e:
                    reset_result['operations'].append({'operation': 'clear_users_and_fingerprints', 'status': 'failed', 'error': str(e)})
                    print(f"  ⚠️ Failed to clear users and fingerprints: {e}")
            
            # Reset attendance records
            if 'attendance' in reset_types or 'all' in reset_types:
                try:
                    conn.clear_attendance()
                    reset_result['operations'].append({'operation': 'clear_attendance', 'status': 'success'})
                    print("  ✓ Cleared attendance records")
                except Exception as e:
                    reset_result['operations'].append({'operation': 'clear_attendance', 'status': 'failed', 'error': str(e)})
                    print(f"  ⚠️ Failed to clear attendance: {e}")
            
            # Re-enable device
            conn.enable_device()
            reset_result['operations'].append({'operation': 'enable_device', 'status': 'success'})
            
            conn.disconnect()
            reset_result['status'] = 'success'
            print(f"  ✅ Reset completed for {device_config.get('name')}")
            
        except ZKNetworkError as e:
            reset_result['error_message'] = f"Network error: {str(e)}"
            print(f"  ❌ Network error: {e}")
        except ZKErrorConnection as e:
            reset_result['error_message'] = f"Connection error: {str(e)}"
            print(f"  ❌ Connection error: {e}")
        except Exception as e:
            reset_result['error_message'] = f"Unexpected error: {str(e)}"
            print(f"  ❌ Unexpected error: {e}")
        
        return reset_result
    
    def save_backup_to_file(self, backup_results: List[Dict], filename: str = None) -> str:
        """Save backup results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"device_backup_{timestamp}.json"
        
        # Create backups directory
        os.makedirs("backups", exist_ok=True)
        filepath = os.path.join("backups", filename)
        
        backup_data = {
            'backup_timestamp': datetime.now().isoformat(),
            'total_devices': len(backup_results),
            'successful_backups': sum(1 for r in backup_results if r['status'] == 'success'),
            'backups': backup_results
        }
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            print(f"💾 Backup saved to: {filepath}")
            return filepath
        except Exception as e:
            print(f"❌ Failed to save backup: {e}")
            return ""
    
    def reset_all_devices(self, reset_types: List[str] = None, 
                          backup_first: bool = True, 
                          device_filter: List[str] = None,
                          parallel: bool = True) -> Dict:
        """
        Reset all configured devices
        
        Args:
            reset_types (List[str]): Types to reset
            backup_first (bool): Whether to backup before reset
            device_filter (List[str]): Filter specific device IDs
            parallel (bool): Whether to process devices in parallel
            
        Returns:
            Dict: Overall operation results
        """
        if not self.config:
            self.load_config()
        
        devices = self.config.get('devices', [])
        if not devices:
            return {'status': 'error', 'message': 'No devices found in configuration'}
        
        # Filter devices if specified
        if device_filter:
            devices = [d for d in devices if d.get('id') in device_filter]
        
        # Filter enabled devices only
        enabled_devices = [d for d in devices if d.get('enabled', True)]
        
        print(f"🎯 Starting reset operation for {len(enabled_devices)} devices...")
        print("-" * 60)
        
        # Test connectivity first
        print("🔍 Testing device connectivity...")
        accessible_devices = []
        for device in enabled_devices:
            if self.test_device_connection(device):
                accessible_devices.append(device)
                print(f"  ✓ {device.get('name')} ({device.get('ip')}) - Accessible")
            else:
                print(f"  ❌ {device.get('name')} ({device.get('ip')}) - Not accessible")
        
        if not accessible_devices:
            return {'status': 'error', 'message': 'No accessible devices found'}
        
        print(f"\n📊 {len(accessible_devices)} out of {len(enabled_devices)} devices are accessible")
        
        # Backup phase
        if backup_first:
            print(f"\n📦 Starting backup phase...")
            if parallel:
                backup_results = self._parallel_backup(accessible_devices, ['users', 'attendance', 'fingerprints'])
            else:
                backup_results = self._sequential_backup(accessible_devices, ['users', 'attendance', 'fingerprints'])
            
            self.backup_results = backup_results
            backup_file = self.save_backup_to_file(backup_results)
        
        # Reset phase
        print(f"\n🧹 Starting reset phase...")
        if parallel:
            reset_results = self._parallel_reset(accessible_devices, reset_types or ['all'])
        else:
            reset_results = self._sequential_reset(accessible_devices, reset_types or ['all'])
        
        self.reset_results = reset_results
        
        # Summary
        successful_resets = sum(1 for r in reset_results if r['status'] == 'success')
        successful_backups = sum(1 for r in self.backup_results if r['status'] == 'success') if backup_first else 0
        
        summary = {
            'status': 'completed',
            'timestamp': datetime.now().isoformat(),
            'devices_processed': len(accessible_devices),
            'successful_resets': successful_resets,
            'failed_resets': len(reset_results) - successful_resets,
            'backup_created': backup_first,
            'successful_backups': successful_backups,
            'backup_file': backup_file if backup_first else '',
            'reset_results': reset_results,
            'backup_results': self.backup_results if backup_first else []
        }
        
        return summary
    
    def _parallel_backup(self, devices: List[Dict], backup_types: List[str]) -> List[Dict]:
        """Backup devices in parallel"""
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_device = {
                executor.submit(self.backup_device_data, device, backup_types): device 
                for device in devices
            }
            
            results = []
            for future in concurrent.futures.as_completed(future_to_device):
                try:
                    result = future.result(timeout=60)
                    results.append(result)
                except Exception as e:
                    device = future_to_device[future]
                    results.append({
                        'device_id': device.get('id', 'unknown'),
                        'status': 'failed',
                        'error_message': f"Backup timeout or error: {str(e)}"
                    })
            
            return results
    
    def _sequential_backup(self, devices: List[Dict], backup_types: List[str]) -> List[Dict]:
        """Backup devices sequentially"""
        results = []
        for device in devices:
            result = self.backup_device_data(device, backup_types)
            results.append(result)
        return results
    
    def _parallel_reset(self, devices: List[Dict], reset_types: List[str]) -> List[Dict]:
        """Reset devices in parallel"""
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_device = {
                executor.submit(self.reset_device_data, device, reset_types): device 
                for device in devices
            }
            
            results = []
            for future in concurrent.futures.as_completed(future_to_device):
                try:
                    result = future.result(timeout=120)
                    results.append(result)
                except Exception as e:
                    device = future_to_device[future]
                    results.append({
                        'device_id': device.get('id', 'unknown'),
                        'status': 'failed',
                        'error_message': f"Reset timeout or error: {str(e)}"
                    })
            
            return results
    
    def _sequential_reset(self, devices: List[Dict], reset_types: List[str]) -> List[Dict]:
        """Reset devices sequentially"""
        results = []
        for device in devices:
            result = self.reset_device_data(device, reset_types)
            results.append(result)
        return results
    
    def print_summary(self, results: Dict):
        """Print operation summary"""
        print("\n" + "=" * 80)
        print("DEVICE RESET OPERATION SUMMARY")
        print("=" * 80)
        
        print(f"⏰ Completed at: {results['timestamp']}")
        print(f"📱 Devices processed: {results['devices_processed']}")
        print(f"✅ Successful resets: {results['successful_resets']}")
        print(f"❌ Failed resets: {results['failed_resets']}")
        
        if results['backup_created']:
            print(f"💾 Backup file: {results['backup_file']}")
            print(f"📦 Successful backups: {results['successful_backups']}")
        
        print(f"\n📋 DETAILED RESULTS:")
        print("-" * 60)
        
        for result in results['reset_results']:
            status_icon = "✅" if result['status'] == 'success' else "❌"
            print(f"{status_icon} {result['device_name']} ({result['device_id']})")
            print(f"    IP: {result['ip']}")
            print(f"    Status: {result['status'].upper()}")
            
            if result['status'] == 'success':
                successful_ops = [op for op in result['operations'] if op['status'] == 'success']
                print(f"    Operations: {len(successful_ops)}/{len(result['operations'])} successful")
                for op in result['operations']:
                    op_icon = "✓" if op['status'] == 'success' else "✗"
                    print(f"        {op_icon} {op['operation']}")
            else:
                print(f"    Error: {result['error_message']}")
            
            print()


def main():
    """Main function for CLI usage"""
    parser = argparse.ArgumentParser(
        description='ZKTeco Access Control Device Reset Utility',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                 # Reset all data from all devices (with backup)
  %(prog)s --no-backup                     # Reset without backup
  %(prog)s --reset-types users attendance  # Reset only users and attendance
  %(prog)s --devices device_1 device_2     # Reset specific devices only
  %(prog)s --sequential                     # Process devices one by one
  %(prog)s --backup-only                    # Only create backup, don't reset
        """
    )
    
    parser.add_argument('--config', '-c', default='JSON/access_control_config.json',
                        help='Configuration file path')
    parser.add_argument('--devices', '-d', nargs='+',
                        help='Specific device IDs to reset')
    parser.add_argument('--reset-types', '-t', nargs='+', 
                        choices=['users', 'attendance', 'fingerprints', 'all'],
                        default=['all'],
                        help='Types of data to reset')
    parser.add_argument('--no-backup', action='store_true',
                        help='Skip backup before reset')
    parser.add_argument('--backup-only', action='store_true',
                        help='Only create backup, do not reset')
    parser.add_argument('--sequential', action='store_true',
                        help='Process devices sequentially instead of parallel')
    parser.add_argument('--yes', '-y', action='store_true',
                        help='Skip confirmation prompts')
    
    args = parser.parse_args()
    
    try:
        # Initialize reset manager
        reset_manager = DeviceResetManager(args.config)
        
        # Load configuration
        config = reset_manager.load_config()
        if not config:
            print("❌ Failed to load configuration")
            sys.exit(1)
        
        devices = config.get('devices', [])
        if not devices:
            print("❌ No devices found in configuration")
            sys.exit(1)
        
        # Filter devices if specified
        devices_to_process = devices
        if args.devices:
            devices_to_process = [d for d in devices if d.get('id') in args.devices]
            if not devices_to_process:
                print(f"❌ No matching devices found for: {args.devices}")
                sys.exit(1)
        
        enabled_devices = [d for d in devices_to_process if d.get('enabled', True)]
        
        # Show what will be processed
        print("ZKTeco Access Control Device Reset Utility")
        print("=" * 50)
        print(f"Configuration: {args.config}")
        print(f"Devices to process: {len(enabled_devices)}")
        print(f"Reset types: {', '.join(args.reset_types)}")
        print(f"Backup first: {not args.no_backup and not args.backup_only}")
        print(f"Parallel processing: {not args.sequential}")
        
        print(f"\nDevices:")
        for device in enabled_devices:
            print(f"  • {device.get('name', 'Unknown')} ({device.get('id')}) - {device.get('ip')}")
        
        # Confirmation
        if not args.yes and not args.backup_only:
            print(f"\n⚠️  WARNING: This will permanently delete data from {len(enabled_devices)} device(s)!")
            if not args.no_backup:
                print("  A backup will be created before reset.")
            else:
                print("  NO BACKUP will be created!")
            
            confirm = input("\nAre you sure you want to continue? (yes/no): ")
            if confirm.lower() not in ['yes', 'y']:
                print("Operation cancelled.")
                sys.exit(0)
        
        # Execute operation
        if args.backup_only:
            print(f"\n📦 Creating backup only (no reset)...")
            backup_results = reset_manager._parallel_backup(enabled_devices, ['users', 'attendance', 'fingerprints'])
            reset_manager.backup_results = backup_results
            backup_file = reset_manager.save_backup_to_file(backup_results)
            
            successful_backups = sum(1 for r in backup_results if r['status'] == 'success')
            print(f"\n✅ Backup completed: {successful_backups}/{len(backup_results)} devices")
            if backup_file:
                print(f"💾 Backup saved to: {backup_file}")
        else:
            results = reset_manager.reset_all_devices(
                reset_types=args.reset_types,
                backup_first=not args.no_backup,
                device_filter=args.devices,
                parallel=not args.sequential
            )
            
            reset_manager.print_summary(results)
            
            if results['failed_resets'] > 0:
                sys.exit(1)
    
    except KeyboardInterrupt:
        print("\n⚠️  Operation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()