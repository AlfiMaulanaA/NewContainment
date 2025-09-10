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
  async getAccessLogs(params?: { 
    page?: number; 
    pageSize?: number; 
    via?: number;
    user?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<AccessLog[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
      if (params?.via) queryParams.set('via', params.via.toString());
      if (params?.user) queryParams.set('user', params.user);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);

      const queryString = queryParams.toString();
      const url = queryString ? `/accesslog?${queryString}` : '/accesslog';
      
      const data = await apiClient.get<AccessLog[]>(url);
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

  async createAccessLog(accessLogData: {
    user: string;
    via: number;
    trigger: string;
    description?: string;
    isSuccess: boolean;
    additionalData?: string;
  }): Promise<ApiResponse<AccessLog>> {
    try {
      const data = await apiClient.post<AccessLog>('/accesslog', accessLogData);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create access log",
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