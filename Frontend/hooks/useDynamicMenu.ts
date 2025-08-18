// hooks/useDynamicMenu.ts
"use client";

import { useState, useEffect } from 'react';
import { 
  menuApi,
  type MenuItemData, 
  type MenuGroupData, 
  type UserMenuResponse,
  type MenuUserRole 
} from '@/lib/api';

// Re-export types for convenience
export type { MenuItemData, MenuGroupData, UserMenuResponse, MenuUserRole };

export function useDynamicMenu() {
  const [menuData, setMenuData] = useState<UserMenuResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const fetchUserMenu = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await menuApi.getUserMenu();
      setMenuData(data);
      setLastUpdate(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching user menu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMenu = () => {
    fetchUserMenu();
  };

  // Auto-refresh menu every 5 minutes or when developer mode changes
  useEffect(() => {
    fetchUserMenu();

    const interval = setInterval(() => {
      fetchUserMenu();
    }, 5 * 60 * 1000); // 5 minutes

    // Listen for developer mode changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'developer_mode_enabled' || e.key === 'developer_mode_expiry') {
        setTimeout(() => {
          fetchUserMenu();
        }, 100); // Small delay to ensure storage is updated
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    menuData,
    isLoading,
    error,
    refreshMenu,
    lastUpdate,
  };
}

// Hook for admin menu management
export function useMenuManagement() {
  const [roles, setRoles] = useState<MenuUserRole[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroupData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const response = await menuApi.getRoles();
      if (response.success) {
        setRoles(response.data);
      }
    } catch (err) {
      setError('Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMenuGroups = async () => {
    try {
      setIsLoading(true);
      const response = await menuApi.getMenuGroups();
      if (response.success) {
        setMenuGroups(response.data);
      }
    } catch (err) {
      setError('Failed to fetch menu groups');
    } finally {
      setIsLoading(false);
    }
  };

  const createRole = async (roleData: Partial<MenuUserRole>) => {
    try {
      const response = await menuApi.createRole(roleData);
      if (response.success) {
        await fetchRoles();
        return response.data;
      }
      throw new Error('Failed to create role');
    } catch (err) {
      throw err;
    }
  };

  const createMenuGroup = async (groupData: Partial<MenuGroupData>) => {
    try {
      const response = await menuApi.createMenuGroup(groupData);
      if (response.success) {
        await fetchMenuGroups();
        return response.data;
      }
      throw new Error('Failed to create menu group');
    } catch (err) {
      throw err;
    }
  };

  const createMenuItem = async (itemData: Partial<MenuItemData> & { menuGroupId: number }) => {
    try {
      const response = await menuApi.createMenuItem(itemData);
      if (response.success) {
        await fetchMenuGroups();
        return response.data;
      }
      throw new Error('Failed to create menu item');
    } catch (err) {
      throw err;
    }
  };

  const updateMenuGroup = async (id: number, groupData: Partial<MenuGroupData>) => {
    try {
      const response = await menuApi.updateMenuGroup(id, groupData);
      if (response.success) {
        await fetchMenuGroups();
        return true;
      }
      throw new Error('Failed to update menu group');
    } catch (err) {
      throw err;
    }
  };

  const updateMenuItem = async (id: number, itemData: Partial<MenuItemData>) => {
    try {
      const response = await menuApi.updateMenuItem(id, itemData);
      if (response.success) {
        await fetchMenuGroups();
        return true;
      }
      throw new Error('Failed to update menu item');
    } catch (err) {
      throw err;
    }
  };

  const deleteMenuItem = async (id: number) => {
    try {
      const response = await menuApi.deleteMenuItem(id);
      if (response.success) {
        await fetchMenuGroups();
        return true;
      }
      throw new Error('Failed to delete menu item');
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchMenuGroups();
  }, []);

  return {
    roles,
    menuGroups,
    isLoading,
    error,
    createRole,
    createMenuGroup,
    createMenuItem,
    updateMenuGroup,
    updateMenuItem,
    deleteMenuItem,
    refreshData: () => {
      fetchRoles();
      fetchMenuGroups();
    },
  };
}