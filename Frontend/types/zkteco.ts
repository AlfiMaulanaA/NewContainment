// ZKTeco Device Management Types

export interface ZKTecoDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  password: number;
  timeout: number;
  force_udp: boolean;
  enabled: boolean;
}

export interface DeviceConnectionTest {
  device_id: string;
  device_name: string;
  status: 'online' | 'offline';
  response_time_ms?: number;
  device_info?: {
    firmware_version?: string;
    user_count?: number;
    attendance_count?: number;
  };
  error?: string;
}

export interface DeviceTestResponse {
  command: string;
  status: 'success' | 'error';
  message: string;
  data: {
    test_type: 'single_device' | 'all_devices';
    device_id?: string;
    device_name?: string;
    result?: DeviceConnectionTest;
    summary?: {
      total_devices: number;
      online_devices: number;
      offline_devices: number;
      success_rate: number;
    };
    devices?: DeviceConnectionTest[];
  };
}

export interface DeviceCRUDResponse {
  command: string;
  status: 'success' | 'error';
  message: string;
  device?: ZKTecoDevice;
  devices?: ZKTecoDevice[];
  total_devices?: number;
  deleted_device?: ZKTecoDevice;
  old_device?: ZKTecoDevice;
}

// MQTT Command Types
export interface DeviceTestCommand {
  command: 'testConnection';
  data: {
    device_id: string; // 'all' untuk test semua devices
  };
}

export interface DeviceAddCommand {
  command: 'addDevice';
  data: {
    id: string;
    name: string;
    ip: string;
    port?: number;
    password?: number;
    timeout?: number;
    force_udp?: boolean;
    enabled?: boolean;
  };
}

export interface DeviceUpdateCommand {
  command: 'updateDevice';
  data: {
    device_id: string;
    name?: string;
    ip?: string;
    port?: number;
    password?: number;
    timeout?: number;
    force_udp?: boolean;
    enabled?: boolean;
  };
}

export interface DeviceDeleteCommand {
  command: 'deleteDevice';
  data: {
    device_id: string;
  };
}

export interface DeviceListCommand {
  command: 'listDevices';
}

// Form Types
export interface DeviceFormData {
  id: string;
  name: string;
  ip: string;
  port: number;
  password: number;
  timeout: number;
  force_udp: boolean;
  enabled: boolean;
}

// Hook return types
export interface UseZKTecoDevicesResult {
  devices: ZKTecoDevice[];
  loading: boolean;
  error: string | null;
  testResults: DeviceConnectionTest[];
  testLoading: boolean;
  
  // Device CRUD operations
  addDevice: (device: Omit<ZKTecoDevice, 'enabled'>) => Promise<boolean>;
  updateDevice: (deviceId: string, updates: Partial<ZKTecoDevice>) => Promise<boolean>;
  deleteDevice: (deviceId: string) => Promise<boolean>;
  refreshDevices: () => Promise<void>;
  
  // Connection testing
  testDevice: (deviceId: string) => Promise<DeviceConnectionTest | null>;
  testAllDevices: () => Promise<DeviceConnectionTest[]>;
  
  // Clear states
  clearError: () => void;
  clearTestResults: () => void;
}