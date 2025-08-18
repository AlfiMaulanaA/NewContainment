// lib/api/menu.ts - Menu management API methods
import { apiClient } from './client';
import type { ApiResponse } from './types';

// Menu management types
export interface MenuItemData {
  id: number;
  title: string;
  url: string;
  icon: string;
  sortOrder: number;
  minRoleLevel?: number;
  requiresDeveloperMode: boolean;
  badgeText?: string;
  badgeVariant?: string;
}

export interface MenuGroupData {
  id: number;
  title: string;
  icon: string;
  sortOrder: number;
  minRoleLevel?: number;
  requiresDeveloperMode: boolean;
  items: MenuItemData[];
}

export interface MenuUserRole {
  id: number;
  name: string;
  displayName: string;
  description: string;
  level: number;
  color: string;
  isActive: boolean;
  permissions: string[];
}

export interface UserMenuResponse {
  menuGroups: MenuGroupData[];
  userRole: MenuUserRole;
  isDeveloperMode: boolean;
  userPermissions: string[];
}

// Menu Management API methods
export const menuApi = {
  async getUserMenu(): Promise<UserMenuResponse> {
    try {
      // Add developer mode header if active
      const headers: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        const developerMode = localStorage.getItem('developer_mode_enabled');
        const expiry = localStorage.getItem('developer_mode_expiry');
        
        if (developerMode === 'true' && expiry) {
          const expiryTime = parseInt(expiry);
          const currentTime = Date.now();
          
          if (currentTime < expiryTime) {
            headers['X-Developer-Mode'] = 'true';
          }
        }
      }

      const response = await fetch('/api/menu-management/user-menu', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          ...headers
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user menu');
      }

      return await response.json();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  },

  async getRoles(): Promise<ApiResponse<MenuUserRole[]>> {
    try {
      const data = await apiClient.get<MenuUserRole[]>("/menu-management/roles");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get roles",
      };
    }
  },

  async getMenuGroups(): Promise<ApiResponse<MenuGroupData[]>> {
    try {
      const data = await apiClient.get<MenuGroupData[]>("/menu-management/menu-groups");
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get menu groups",
      };
    }
  },

  async createRole(roleData: Partial<MenuUserRole>): Promise<ApiResponse<MenuUserRole>> {
    try {
      const data = await apiClient.post<MenuUserRole>("/menu-management/roles", roleData);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create role",
      };
    }
  },

  async createMenuGroup(groupData: Partial<MenuGroupData>): Promise<ApiResponse<MenuGroupData>> {
    try {
      const data = await apiClient.post<MenuGroupData>("/menu-management/menu-groups", groupData);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create menu group",
      };
    }
  },

  async createMenuItem(itemData: Partial<MenuItemData> & { menuGroupId: number }): Promise<ApiResponse<MenuItemData>> {
    try {
      const data = await apiClient.post<MenuItemData>("/menu-management/menu-items", itemData);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create menu item",
      };
    }
  },

  async updateMenuGroup(id: number, groupData: Partial<MenuGroupData>): Promise<ApiResponse<void>> {
    try {
      await apiClient.put(`/menu-management/menu-groups/${id}`, groupData);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update menu group",
      };
    }
  },

  async updateMenuItem(id: number, itemData: Partial<MenuItemData>): Promise<ApiResponse<void>> {
    try {
      await apiClient.put(`/menu-management/menu-items/${id}`, itemData);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update menu item",
      };
    }
  },

  async deleteMenuItem(id: number): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`/menu-management/menu-items/${id}`);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete menu item",
      };
    }
  },
};