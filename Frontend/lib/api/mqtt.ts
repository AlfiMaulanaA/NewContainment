// lib/api/mqtt.ts - MQTT Configuration API methods
import { apiClient } from './client';
import type {
  ApiResponse,
  MqttConfiguration
} from './types';

// MQTT Configuration API methods
export const mqttConfigurationApi = {
  async getMqttConfigurations(): Promise<ApiResponse<MqttConfiguration[]>> {
    try {
      const data = await apiClient.get<MqttConfiguration[]>("/mqttconfiguration");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get MQTT configurations",
      };
    }
  },

  async getEffectiveConfiguration(): Promise<ApiResponse<MqttConfiguration>> {
    try {
      const data = await apiClient.get<MqttConfiguration>("/mqttconfiguration/effective");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get effective MQTT configuration",
      };
    }
  },

  async createMqttConfiguration(config: Partial<MqttConfiguration>): Promise<ApiResponse<MqttConfiguration>> {
    try {
      const data = await apiClient.post<MqttConfiguration>("/mqttconfiguration", config);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create MQTT configuration",
      };
    }
  },

  async updateMqttConfiguration(id: number, config: Partial<MqttConfiguration>): Promise<ApiResponse<MqttConfiguration>> {
    try {
      const data = await apiClient.put<MqttConfiguration>(`/mqttconfiguration/${id}`, config);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update MQTT configuration",
      };
    }
  },

  async deleteMqttConfiguration(id: number): Promise<ApiResponse> {
    try {
      await apiClient.delete(`/mqttconfiguration/${id}`);
      return {
        success: true,
        message: "MQTT configuration deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete MQTT configuration",
      };
    }
  },

  async reloadConfiguration(): Promise<ApiResponse> {
    try {
      await apiClient.post("/mqttconfiguration/reload");
      return {
        success: true,
        message: "MQTT configuration reloaded successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to reload MQTT configuration",
      };
    }
  },
};