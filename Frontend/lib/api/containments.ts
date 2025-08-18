// lib/api/containments.ts - Containment and Rack management API methods
import { apiClient } from './client';
import type {
  ApiResponse,
  Containment,
  Rack
} from './types';

// Containments API methods
export const containmentsApi = {
  async getContainments(): Promise<ApiResponse<Containment[]>> {
    try {
      const data = await apiClient.get<Containment[]>("/containments");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get containments",
      };
    }
  },

  async getContainment(id: number): Promise<ApiResponse<Containment>> {
    try {
      const data = await apiClient.get<Containment>(`/containments/${id}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get containment",
      };
    }
  },

  async createContainment(containment: Partial<Containment>): Promise<ApiResponse<Containment>> {
    try {
      const data = await apiClient.post<Containment>("/containments", containment);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create containment",
      };
    }
  },

  async updateContainment(id: number, containment: Partial<Containment>): Promise<ApiResponse<Containment>> {
    try {
      const data = await apiClient.put<Containment>(`/containments/${id}`, containment);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update containment",
      };
    }
  },

  async deleteContainment(id: number): Promise<ApiResponse> {
    try {
      await apiClient.delete(`/containments/${id}`);
      return {
        success: true,
        message: "Containment deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete containment",
      };
    }
  },
};

// Racks API methods
export const racksApi = {
  async getRacks(): Promise<ApiResponse<Rack[]>> {
    try {
      const data = await apiClient.get<Rack[]>("/racks");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get racks",
      };
    }
  },

  async getRack(id: number): Promise<ApiResponse<Rack>> {
    try {
      const data = await apiClient.get<Rack>(`/racks/${id}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get rack",
      };
    }
  },

  async getRacksByContainment(containmentId: number): Promise<ApiResponse<Rack[]>> {
    try {
      const data = await apiClient.get<Rack[]>(`/racks/containment/${containmentId}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get racks by containment",
      };
    }
  },

  async createRack(rack: Partial<Rack>): Promise<ApiResponse<Rack>> {
    try {
      const data = await apiClient.post<Rack>("/racks", rack);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create rack",
      };
    }
  },

  async updateRack(id: number, rack: Partial<Rack>): Promise<ApiResponse<Rack>> {
    try {
      const data = await apiClient.put<Rack>(`/racks/${id}`, rack);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update rack",
      };
    }
  },

  async deleteRack(id: number): Promise<ApiResponse> {
    try {
      await apiClient.delete(`/racks/${id}`);
      return {
        success: true,
        message: "Rack deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete rack",
      };
    }
  },
};