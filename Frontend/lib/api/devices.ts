// lib/api/devices.ts - Device management API methods
import { apiClient } from './client';
import type {
  ApiResponse,
  Device,
  DeviceSensorData,
  DeviceActivityStatus
} from './types';

// Devices API methods
export const devicesApi = {
  async getDevices(): Promise<ApiResponse<Device[]>> {
    try {
      const data = await apiClient.get<Device[]>("/device");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get devices",
      };
    }
  },

  async getDevice(id: number): Promise<ApiResponse<Device>> {
    try {
      const data = await apiClient.get<Device>(`/device/${id}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get device",
      };
    }
  },

  async getDevicesByRack(rackId: number): Promise<ApiResponse<Device[]>> {
    try {
      const data = await apiClient.get<Device[]>(`/device/rack/${rackId}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get devices by rack",
      };
    }
  },

  async createDevice(device: Partial<Device>): Promise<ApiResponse<Device>> {
    try {
      const data = await apiClient.post<Device>("/device", device);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create device",
      };
    }
  },

  async updateDevice(id: number, device: Partial<Device>): Promise<ApiResponse<Device>> {
    try {
      const data = await apiClient.put<Device>(`/device/${id}`, device);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update device",
      };
    }
  },

  async deleteDevice(id: number): Promise<ApiResponse> {
    try {
      await apiClient.delete(`/device/${id}`);
      return {
        success: true,
        message: "Device deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete device",
      };
    }
  },

  // Device status API methods
  async getDevicesStatus(): Promise<ApiResponse<DeviceActivityStatus[]>> {
    try {
      const data = await apiClient.get<DeviceActivityStatus[]>("/device/status");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get devices status",
      };
    }
  },

  async getDeviceStatus(id: number): Promise<ApiResponse<DeviceActivityStatus>> {
    try {
      const data = await apiClient.get<DeviceActivityStatus>(`/device/${id}/status`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get device status",
      };
    }
  },

  async isDeviceOnline(id: number): Promise<ApiResponse<boolean>> {
    try {
      const data = await apiClient.get<boolean>(`/device/${id}/online`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to check device online status",
      };
    }
  },

  async forceStatusCheck(): Promise<ApiResponse<{ message: string }>> {
    try {
      const data = await apiClient.post<{ message: string }>("/device/status/check", {});
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to force status check",
      };
    }
  },

  async initializeMonitoring(): Promise<ApiResponse<{ message: string }>> {
    try {
      const data = await apiClient.post<{ message: string }>("/device/status/initialize", {});
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to initialize monitoring",
      };
    }
  },
};

// Device Sensor Data API methods
export const deviceSensorDataApi = {
  async getSensorDataByRack(rackId: number, limit?: number): Promise<ApiResponse<DeviceSensorData[]>> {
    try {
      const endpoint = limit 
        ? `/devicesensordata/rack/${rackId}?limit=${limit}`
        : `/devicesensordata/rack/${rackId}`;
      const data = await apiClient.get<DeviceSensorData[]>(endpoint);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get sensor data",
      };
    }
  },

  async getSensorDataByDevice(deviceId: number, limit?: number): Promise<ApiResponse<DeviceSensorData[]>> {
    try {
      const endpoint = limit 
        ? `/devicesensordata/device/${deviceId}?limit=${limit}`
        : `/devicesensordata/device/${deviceId}`;
      const data = await apiClient.get<DeviceSensorData[]>(endpoint);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get sensor data",
      };
    }
  },

  async getRecentSensorData(limit: number = 100): Promise<ApiResponse<DeviceSensorData[]>> {
    try {
      const data = await apiClient.get<DeviceSensorData[]>(`/devicesensordata/recent?limit=${limit}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get recent sensor data",
      };
    }
  },
};