// lib/api/users.ts - User management API methods
import { apiClient } from './client';
import type {
  ApiResponse,
  User,
  CreateUserRequest,
  UpdateUserRequest
} from './types';

// Users API methods
export const usersApi = {
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const data = await apiClient.get<User[]>("/users");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get users",
      };
    }
  },

  async getUser(id: number): Promise<ApiResponse<User>> {
    try {
      const data = await apiClient.get<User>(`/users/${id}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get user",
      };
    }
  },

  async createUser(request: CreateUserRequest): Promise<ApiResponse<User>> {
    try {
      const data = await apiClient.post<User>("/users", request);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create user",
      };
    }
  },

  async updateUser(
    id: number,
    request: UpdateUserRequest
  ): Promise<ApiResponse<User>> {
    try {
      const data = await apiClient.put<User>(`/users/${id}`, request);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update user",
      };
    }
  },

  async deleteUser(id: number): Promise<ApiResponse> {
    try {
      await apiClient.delete(`/users/${id}`);
      return {
        success: true,
        message: "User deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete user",
      };
    }
  },
};