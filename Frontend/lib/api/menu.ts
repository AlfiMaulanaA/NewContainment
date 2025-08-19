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
  isActive: boolean;
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
  isActive: boolean;
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
      // Prepare custom headers for developer mode
      const customHeaders: Record<string, string> = {};
      
      // Add developer mode header if active
      if (typeof window !== 'undefined') {
        const developerMode = localStorage.getItem('developer_mode_enabled');
        const expiry = localStorage.getItem('developer_mode_expiry');
        
        if (developerMode === 'true' && expiry) {
          const expiryTime = parseInt(expiry);
          const currentTime = Date.now();
          
          if (currentTime < expiryTime) {
            customHeaders['X-Developer-Mode'] = 'true';
          }
        }
      }

      // Use apiClient for consistent configuration and auth handling
      return await apiClient.get<UserMenuResponse>("/menu-management/user-menu", customHeaders);
    } catch (error) {
      console.error('getUserMenu error:', error);
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  },

  async getRoles(): Promise<ApiResponse<MenuUserRole[]>> {
    try {
      // Backend returns { success: true, data: [...] }, so we need to extract data
      const response = await apiClient.get<{success: boolean, data: MenuUserRole[]}>("/menu-management/roles");
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: "Failed to get roles from backend",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get roles",
      };
    }
  },

  async getMenuGroups(): Promise<ApiResponse<MenuGroupData[]>> {
    try {
      // Backend returns { success: true, data: [...] }, so we need to extract data
      const response = await apiClient.get<{success: boolean, data: MenuGroupData[]}>("/menu-management/menu-groups");
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: "Failed to get menu groups from backend",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get menu groups",
      };
    }
  },

  async createRole(roleData: Partial<MenuUserRole>): Promise<ApiResponse<MenuUserRole>> {
    try {
      // Backend returns { success: true, data: {...} }
      const response = await apiClient.post<{success: boolean, data: MenuUserRole}>("/menu-management/roles", roleData);
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: "Failed to create role from backend",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create role",
      };
    }
  },

  async createMenuGroup(groupData: Partial<MenuGroupData>): Promise<ApiResponse<MenuGroupData>> {
    try {
      // Backend returns { success: true, data: {...} }
      const response = await apiClient.post<{success: boolean, data: MenuGroupData}>("/menu-management/menu-groups", groupData);
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: "Failed to create menu group from backend",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create menu group",
      };
    }
  },

  async createMenuItem(itemData: Partial<MenuItemData> & { menuGroupId: number }): Promise<ApiResponse<MenuItemData>> {
    try {
      // Backend returns { success: true, data: {...} }
      const response = await apiClient.post<{success: boolean, data: MenuItemData}>("/menu-management/menu-items", itemData);
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: "Failed to create menu item from backend",
        };
      }
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

  async toggleMenuItemActive(id: number): Promise<ApiResponse<{isActive: boolean}>> {
    try {
      const response = await apiClient.patch<{success: boolean, isActive: boolean}>(`/menu-management/menu-items/${id}/toggle-active`);
      if (response.success) {
        return {
          success: true,
          data: { isActive: response.isActive },
        };
      } else {
        return {
          success: false,
          message: "Failed to toggle menu item active status",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to toggle menu item active status",
      };
    }
  },

  async toggleMenuGroupActive(id: number): Promise<ApiResponse<{isActive: boolean}>> {
    try {
      const response = await apiClient.patch<{success: boolean, isActive: boolean}>(`/menu-management/menu-groups/${id}/toggle-active`);
      if (response.success) {
        return {
          success: true,
          data: { isActive: response.isActive },
        };
      } else {
        return {
          success: false,
          message: "Failed to toggle menu group active status",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to toggle menu group active status",
      };
    }
  },

  async deleteMenuGroup(id: number): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`/menu-management/menu-groups/${id}`);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete menu group",
      };
    }
  },

  async updateRole(id: number, roleData: Partial<MenuUserRole>): Promise<ApiResponse<void>> {
    try {
      await apiClient.put(`/menu-management/roles/${id}`, roleData);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to update role",
      };
    }
  },

  async deleteRole(id: number): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`/menu-management/roles/${id}`);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete role",
      };
    }
  },
};