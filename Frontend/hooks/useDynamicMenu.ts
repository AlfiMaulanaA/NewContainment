// hooks/useDynamicMenu.ts
"use client";

import { useState, useEffect } from "react";
import {
  menuApi,
  type MenuItemData,
  type MenuGroupData,
  type UserMenuResponse,
  type MenuUserRole,
} from "@/lib/api";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";

// Re-export types for convenience
export type { MenuItemData, MenuGroupData, UserMenuResponse, MenuUserRole };

export function useDynamicMenu() {
  const [menuData, setMenuData] = useState<UserMenuResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { registerMenuRefresh } = useDeveloperMode();

  const fetchUserMenu = async (isRetryAttempt = false) => {
    try {
      if (!isRetryAttempt) {
        setIsLoading(true);
      } else {
        setIsRetrying(true);
      }
      setError(null);

      const data = await menuApi.getUserMenu();
      setMenuData(data);
      setLastUpdate(Date.now());
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);

      // Auto-retry mechanism for failed requests
      if (retryCount < 3) { // Max 3 retries
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);

        // Exponential backoff: 2s, 4s, 8s
        const retryDelay = Math.pow(2, nextRetryCount) * 1000;

        console.log(`Menu fetch failed, retrying in ${retryDelay/1000}s (attempt ${nextRetryCount}/3)`);

        setTimeout(() => {
          fetchUserMenu(true);
        }, retryDelay);
      } else {
        console.error("Menu fetch failed after 3 retries:", errorMessage);
      }
    } finally {
      if (!isRetryAttempt) {
        setIsLoading(false);
      } else {
        setIsRetrying(false);
      }
    }
  };

  const refreshMenu = () => {
    fetchUserMenu();
  };

  // Simplified menu refresh - every 10 minutes (no verbose logging)
  useEffect(() => {
    fetchUserMenu();

    // Register refresh callback with developer mode context
    registerMenuRefresh(fetchUserMenu);

    // Simple interval for menu refresh - 10 minutes
    const interval = setInterval(() => {
      fetchUserMenu();
    }, 10 * 60 * 1000); // 10 minutes

    // Listen for developer mode changes only
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "developer_mode_enabled" ||
        e.key === "developer_mode_expiry"
      ) {
        setTimeout(() => {
          fetchUserMenu();
        }, 100);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [registerMenuRefresh]); // Only depend on registerMenuRefresh to avoid infinite loops

  return {
    menuData,
    isLoading,
    error,
    refreshMenu,
    lastUpdate,
    isRetrying,
    retryCount,
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
      setError(null);
      const response = await menuApi.getRoles();
      if (response.success && response.data) {
        // Remove duplicates by ID to prevent duplicate roles in UI
        const uniqueRoles = response.data.filter((role, index, self) => 
          index === self.findIndex(r => r.id === role.id)
        );
        setRoles(uniqueRoles);
      } else {
        setError(response.message || "Failed to fetch roles");
        setRoles([]); // Ensure roles is always an array
      }
    } catch (err) {
      setError("Failed to fetch roles");
      setRoles([]); // Ensure roles is always an array
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMenuGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await menuApi.getMenuGroups();
      if (response.success && response.data) {
        // Remove duplicates by ID to prevent duplicate groups in UI
        const uniqueGroups = response.data.filter((group, index, self) => 
          index === self.findIndex(g => g.id === group.id)
        ).map(group => ({
          ...group,
          // Also ensure items are unique if they exist
          items: group.items ? group.items.filter((item, index, self) => 
            index === self.findIndex(i => i.id === item.id)
          ) : []
        }));
        setMenuGroups(uniqueGroups);
      } else {
        setError(response.message || "Failed to fetch menu groups");
        setMenuGroups([]); // Ensure menuGroups is always an array
      }
    } catch (err) {
      setError("Failed to fetch menu groups");
      setMenuGroups([]); // Ensure menuGroups is always an array
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await menuApi.getMenuItems();
      if (response.success && response.data && Array.isArray(response.data)) {
        // Update menu groups with individual menu items data
        const updatedGroups = menuGroups.map((group) => ({
          ...group,
          items: response.data!.filter((item) => item.menuGroupId === group.id),
        }));
        setMenuGroups(updatedGroups);
      } else {
        setError(response.message || "Failed to fetch menu items");
      }
    } catch (err) {
      setError("Failed to fetch menu items");
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
      throw new Error("Failed to create role");
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
      throw new Error("Failed to create menu group");
    } catch (err) {
      throw err;
    }
  };

  const createMenuItem = async (
    itemData: Partial<MenuItemData> & { menuGroupId: number }
  ) => {
    try {
      const response = await menuApi.createMenuItem(itemData);
      if (response.success) {
        await fetchMenuGroups();
        return response.data;
      }
      throw new Error("Failed to create menu item");
    } catch (err) {
      throw err;
    }
  };

  const updateMenuGroup = async (
    id: number,
    groupData: Partial<MenuGroupData>
  ) => {
    try {
      const response = await menuApi.updateMenuGroup(id, groupData);
      if (response.success) {
        await fetchMenuGroups();
        return true;
      }
      throw new Error("Failed to update menu group");
    } catch (err) {
      throw err;
    }
  };

  const updateMenuItem = async (
    id: number,
    itemData: Partial<MenuItemData>
  ) => {
    try {
      const response = await menuApi.updateMenuItem(id, itemData);
      if (response.success) {
        await fetchMenuGroups();
        return true;
      }
      throw new Error("Failed to update menu item");
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
      throw new Error("Failed to delete menu item");
    } catch (err) {
      throw err;
    }
  };

  const toggleMenuItemActive = async (id: number) => {
    try {
      const response = await menuApi.toggleMenuItemActive(id);
      if (response.success) {
        await fetchMenuGroups();
        return response.data;
      }
      throw new Error("Failed to toggle menu item active status");
    } catch (err) {
      throw err;
    }
  };

  const toggleMenuGroupActive = async (id: number) => {
    try {
      const response = await menuApi.toggleMenuGroupActive(id);
      if (response.success) {
        await fetchMenuGroups();
        return response.data;
      }
      throw new Error("Failed to toggle menu group active status");
    } catch (err) {
      throw err;
    }
  };

  const deleteMenuGroup = async (id: number) => {
    try {
      const response = await menuApi.deleteMenuGroup(id);
      if (response.success) {
        await fetchMenuGroups();
        return true;
      }
      throw new Error("Failed to delete menu group");
    } catch (err) {
      throw err;
    }
  };

  const updateRole = async (id: number, roleData: Partial<MenuUserRole>) => {
    try {
      const response = await menuApi.updateRole(id, roleData);
      if (response.success) {
        await fetchRoles();
        return true;
      }
      throw new Error("Failed to update role");
    } catch (err) {
      throw err;
    }
  };

  const deleteRole = async (id: number) => {
    try {
      const response = await menuApi.deleteRole(id);
      if (response.success) {
        await fetchRoles();
        return true;
      }
      throw new Error("Failed to delete role");
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
    updateRole,
    deleteRole,
    createMenuGroup,
    updateMenuGroup,
    deleteMenuGroup,
    toggleMenuGroupActive,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemActive,
    refreshData: () => {
      fetchRoles();
      fetchMenuGroups();
    },
  };
}
