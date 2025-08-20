// lib/api/maintenance.ts - Maintenance management API methods
import { apiClient } from './client';
import type {
  ApiResponse,
  Maintenance
} from './types';

// Maintenance API methods
export const maintenanceApi = {
  async getMaintenances(): Promise<ApiResponse<Maintenance[]>> {
    try {
      const data = await apiClient.get<Maintenance[]>("/maintenance");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get maintenances",
      };
    }
  },

  async getMaintenance(id: number): Promise<ApiResponse<Maintenance>> {
    try {
      const data = await apiClient.get<Maintenance>(`/maintenance/${id}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get maintenance",
      };
    }
  },

  async createMaintenance(maintenance: Partial<Maintenance>): Promise<ApiResponse<Maintenance>> {
    try {
      const data = await apiClient.post<Maintenance>("/maintenance", maintenance);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create maintenance",
      };
    }
  },

  async updateMaintenance(id: number, maintenance: Partial<Maintenance>): Promise<ApiResponse<Maintenance>> {
    try {
      const data = await apiClient.put<Maintenance>(`/maintenance/${id}`, maintenance);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update maintenance",
      };
    }
  },

  async deleteMaintenance(id: number): Promise<ApiResponse> {
    try {
      await apiClient.delete(`/maintenance/${id}`);
      return {
        success: true,
        message: "Maintenance deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete maintenance",
      };
    }
  },

  async getUpcomingMaintenances(days: number = 7): Promise<ApiResponse<Maintenance[]>> {
    try {
      const data = await apiClient.get<Maintenance[]>(`/maintenance/upcoming?days=${days}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get upcoming maintenances",
      };
    }
  },

  async getOverdueMaintenances(): Promise<ApiResponse<Maintenance[]>> {
    try {
      const data = await apiClient.get<Maintenance[]>("/maintenance/overdue");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get overdue maintenances",
      };
    }
  },

  async getMaintenancesForCalendar(): Promise<ApiResponse<Maintenance[]>> {
    try {
      const data = await apiClient.get<Maintenance[]>("/maintenance/calendar");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get calendar maintenances",
      };
    }
  },
};