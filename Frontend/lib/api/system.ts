// lib/api/system.ts - System and monitoring API methods
import { apiClient } from './client';
import type {
  ApiResponse,
  SystemInfo,
  AccessLog,
  CameraConfig
} from './types';

// System Info API methods
export const systemApi = {
  async getSystemInfo(): Promise<ApiResponse<SystemInfo>> {
    try {
      const data = await apiClient.get<SystemInfo>("/system/info");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get system info",
      };
    }
  },

  async getHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const data = await apiClient.get<{ status: string; timestamp: string }>("/health");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get health status",
      };
    }
  },
};

// Access Log API methods
export const accessLogApi = {
  async getAccessLogs(page: number = 1, limit: number = 50): Promise<ApiResponse<{ logs: AccessLog[]; total: number }>> {
    try {
      const data = await apiClient.get<{ logs: AccessLog[]; total: number }>(`/accesslog?page=${page}&limit=${limit}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get access logs",
      };
    }
  },

  async getAccessLogsByUser(userId: number, page: number = 1, limit: number = 50): Promise<ApiResponse<{ logs: AccessLog[]; total: number }>> {
    try {
      const data = await apiClient.get<{ logs: AccessLog[]; total: number }>(`/accesslog/user/${userId}?page=${page}&limit=${limit}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get access logs by user",
      };
    }
  },
};

// Camera Configuration API methods
export const cameraConfigApi = {
  async getCameraConfigs(): Promise<ApiResponse<CameraConfig[]>> {
    try {
      const data = await apiClient.get<CameraConfig[]>("/cameraconfig");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get camera configs",
      };
    }
  },

  async getCameraConfig(id: number): Promise<ApiResponse<CameraConfig>> {
    try {
      const data = await apiClient.get<CameraConfig>(`/cameraconfig/${id}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get camera config",
      };
    }
  },

  async createCameraConfig(config: Partial<CameraConfig>): Promise<ApiResponse<CameraConfig>> {
    try {
      const data = await apiClient.post<CameraConfig>("/cameraconfig", config);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create camera config",
      };
    }
  },

  async updateCameraConfig(id: number, config: Partial<CameraConfig>): Promise<ApiResponse<CameraConfig>> {
    try {
      const data = await apiClient.put<CameraConfig>(`/cameraconfig/${id}`, config);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update camera config",
      };
    }
  },

  async deleteCameraConfig(id: number): Promise<ApiResponse> {
    try {
      await apiClient.delete(`/cameraconfig/${id}`);
      return {
        success: true,
        message: "Camera config deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete camera config",
      };
    }
  },
};