// lib/api/sensor-intervals.ts - Sensor interval configuration API
import { apiClient } from "./client";

// Types
export interface SensorIntervalConfig {
  id: number;
  name: string;
  description?: string;
  saveIntervalMinutes: number;
  isEnabled: boolean;
  deviceId?: number;
  containmentId?: number;
  isGlobalConfiguration: boolean;
  device?: { id: number; name: string };
  containment?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
  createdByUser?: { id: number; name: string };
  updatedByUser?: { id: number; name: string };
}

export interface AvailableInterval {
  value: number;
  label: string;
}

export interface CreateSensorIntervalRequest {
  name: string;
  description?: string;
  saveIntervalMinutes: number;
  isEnabled: boolean;
  deviceId?: number;
  containmentId?: number;
  isGlobalConfiguration: boolean;
}

export interface UpdateSensorIntervalRequest {
  name: string;
  description?: string;
  saveIntervalMinutes: number;
  isEnabled: boolean;
}

export interface ToggleConfigRequest {
  enabled: boolean;
}

export interface UpdateSensorIntervalOnlyRequest {
  intervalMinutes: number;
}

export interface SetGlobalIntervalRequest {
  intervalMinutes: number;
}

export interface SetDeviceIntervalRequest {
  deviceId: number;
  intervalMinutes: number;
}

export interface SetContainmentIntervalRequest {
  containmentId: number;
  intervalMinutes: number;
}

export interface ShouldSaveResponse {
  success: boolean;
  shouldSave: boolean;
  deviceId: number;
  timestamp: string;
  containmentId?: number;
}

// API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// Sensor Interval Configuration API
export class SensorIntervalsApi {
  // Configuration Management
  async getConfigurations(): Promise<ApiResponse<SensorIntervalConfig[]>> {
    return apiClient.get("/SensorDataInterval");
  }

  async getConfiguration(id: number): Promise<ApiResponse<SensorIntervalConfig>> {
    return apiClient.get(`/SensorDataInterval/${id}`);
  }

  async createConfiguration(config: CreateSensorIntervalRequest): Promise<ApiResponse<SensorIntervalConfig>> {
    return apiClient.post("/SensorDataInterval", config);
  }

  async updateConfiguration(id: number, config: UpdateSensorIntervalRequest): Promise<ApiResponse<SensorIntervalConfig>> {
    return apiClient.put(`/SensorDataInterval/${id}`, config);
  }

  async deleteConfiguration(id: number): Promise<ApiResponse> {
    return apiClient.delete(`/SensorDataInterval/${id}`);
  }

  // Specific configuration types
  async getGlobalConfiguration(): Promise<ApiResponse<SensorIntervalConfig>> {
    return apiClient.get("/SensorDataInterval/global");
  }

  async getDeviceConfiguration(deviceId: number): Promise<ApiResponse<SensorIntervalConfig>> {
    return apiClient.get(`/SensorDataInterval/device/${deviceId}`);
  }

  async getContainmentConfiguration(containmentId: number): Promise<ApiResponse<SensorIntervalConfig>> {
    return apiClient.get(`/SensorDataInterval/containment/${containmentId}`);
  }

  async getEffectiveConfiguration(deviceId: number, containmentId?: number): Promise<ApiResponse<SensorIntervalConfig>> {
    const params = new URLSearchParams();
    if (containmentId) {
      params.append('containmentId', containmentId.toString());
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/SensorDataInterval/effective/${deviceId}${queryString}`);
  }

  // Available intervals
  async getAvailableIntervals(): Promise<ApiResponse<AvailableInterval[]>> {
    return apiClient.get("/SensorDataInterval/available-intervals");
  }

  // Toggle enable/disable
  async toggleConfiguration(id: number, enabled: boolean): Promise<ApiResponse> {
    return apiClient.put(`/SensorDataInterval/${id}/toggle`, { Enabled: enabled });
  }

  // Update interval only
  async updateInterval(id: number, intervalMinutes: number): Promise<ApiResponse> {
    return apiClient.put(`/SensorDataInterval/${id}/interval`, { IntervalMinutes: intervalMinutes });
  }

  // Bulk operations
  async setGlobalInterval(intervalMinutes: number): Promise<ApiResponse> {
    return apiClient.post("/SensorDataInterval/set-global-interval", { IntervalMinutes: intervalMinutes });
  }

  async setDeviceInterval(deviceId: number, intervalMinutes: number): Promise<ApiResponse> {
    return apiClient.post("/SensorDataInterval/set-device-interval", { DeviceId: deviceId, IntervalMinutes: intervalMinutes });
  }

  async setContainmentInterval(containmentId: number, intervalMinutes: number): Promise<ApiResponse> {
    return apiClient.post("/SensorDataInterval/set-containment-interval", { ContainmentId: containmentId, IntervalMinutes: intervalMinutes });
  }

  // Check if should save
  async shouldSaveByInterval(deviceId: number, timestamp?: Date, containmentId?: number): Promise<ApiResponse<ShouldSaveResponse>> {
    const params = new URLSearchParams();
    if (timestamp) {
      params.append('timestamp', timestamp.toISOString());
    }
    if (containmentId) {
      params.append('containmentId', containmentId.toString());
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/SensorDataInterval/should-save/${deviceId}${queryString}`);
  }
}

// Export shared instance
export const sensorIntervalsApi = new SensorIntervalsApi();

// Helper functions
export const sensorIntervalHelpers = {
  // Format interval display
  formatInterval: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  },

  // Get config type label
  getConfigTypeLabel: (config: SensorIntervalConfig): string => {
    if (config.isGlobalConfiguration) return 'Global';
    if (config.deviceId) return `Device: ${config.device?.name || config.deviceId}`;
    if (config.containmentId) return `Containment: ${config.containment?.name || config.containmentId}`;
    return 'Unknown';
  },

  // Get config priority level for sorting
  getConfigPriority: (config: SensorIntervalConfig): number => {
    if (config.deviceId) return 3; // Highest priority
    if (config.containmentId) return 2; // Medium priority
    if (config.isGlobalConfiguration) return 1; // Lowest priority
    return 0; // Unknown
  },

  // Validate interval value
  isValidInterval: (minutes: number): boolean => {
    const validIntervals = [1, 15, 30, 60, 360, 720, 1440];
    return validIntervals.includes(minutes);
  },

  // Get default available intervals
  getDefaultIntervals: (): AvailableInterval[] => [
    { value: 1, label: '1 minute' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 360, label: '6 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '24 hours' }
  ]
};