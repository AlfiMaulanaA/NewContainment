import { apiClient } from './client';
import { 
  ApiResponse,
  RackCapacity,
  CapacitySummary,
  CapacityAlert,
  CapacityPlanningRequest,
  CapacityPlanningResponse
} from './types';

// Helper function to wrap apiClient responses in ApiResponse format
const wrapResponse = async <T>(promise: Promise<T>): Promise<ApiResponse<T>> => {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message || 'Request failed' };
  }
};

// Capacity API service
export const capacityApi = {
  // Get capacity for a specific rack
  getRackCapacity: async (rackId: number): Promise<ApiResponse<RackCapacity>> => {
    return wrapResponse(apiClient.get<RackCapacity>(`/capacity/rack/${rackId}`));
  },

  // Get capacity for all racks
  getAllRackCapacities: async (): Promise<ApiResponse<RackCapacity[]>> => {
    return wrapResponse(apiClient.get<RackCapacity[]>('/capacity/racks'));
  },

  // Get capacity summary
  getCapacitySummary: async (): Promise<ApiResponse<CapacitySummary>> => {
    return wrapResponse(apiClient.get<CapacitySummary>('/capacity/summary'));
  },

  // Get capacity alerts
  getCapacityAlerts: async (): Promise<ApiResponse<CapacityAlert[]>> => {
    return wrapResponse(apiClient.get<CapacityAlert[]>('/capacity/alerts'));
  },

  // Plan capacity for new devices
  planCapacity: async (request: CapacityPlanningRequest): Promise<ApiResponse<CapacityPlanningResponse>> => {
    return wrapResponse(apiClient.post<CapacityPlanningResponse>('/capacity/planning', request));
  },

  // Get capacity statistics
  getCapacityStatistics: async (): Promise<ApiResponse<any>> => {
    return wrapResponse(apiClient.get<any>('/capacity/statistics'));
  }
};