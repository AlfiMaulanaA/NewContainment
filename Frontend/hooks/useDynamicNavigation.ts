// hooks/useDynamicNavigation.ts
"use client";

import { useState, useEffect } from "react";
import { menuApi, type UserMenuResponse } from "@/lib/api/menu";

interface NavigationItem {
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

interface NavigationGroup {
  id: number;
  title: string;
  icon: string;
  sortOrder: number;
  minRoleLevel?: number;
  requiresDeveloperMode: boolean;
  items: NavigationItem[];
}

export interface DynamicNavigationData {
  menuGroups: NavigationGroup[];
  userRole: {
    id: number;
    name: string;
    displayName: string;
    description: string;
    level: number;
    color: string;
    isActive: boolean;
    permissions: string[];
  };
  isDeveloperMode: boolean;
  userPermissions: string[];
}

export function useDynamicNavigation() {
  const [navigationData, setNavigationData] =
    useState<DynamicNavigationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNavigation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const menuData = await menuApi.getUserMenu();
      setNavigationData(menuData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load navigation"
      );
      setNavigationData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return navigationData?.userPermissions?.includes(permission) ?? false;
  };

  const canAccessMenu = (menuItem: NavigationItem): boolean => {
    if (!navigationData) return false;

    // Check role level requirement
    if (
      menuItem.minRoleLevel &&
      navigationData.userRole.level < menuItem.minRoleLevel
    ) {
      return false;
    }

    // Check developer mode requirement
    if (menuItem.requiresDeveloperMode && !navigationData.isDeveloperMode) {
      return false;
    }

    return true;
  };

  const getVisibleMenuGroups = (): NavigationGroup[] => {
    if (!navigationData) return [];

    return navigationData.menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessMenu(item)),
      }))
      .filter((group) => group.items.length > 0) // Only show groups with visible items
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  useEffect(() => {
    fetchNavigation();
  }, []);

  return {
    navigationData,
    isLoading,
    error,
    hasPermission,
    canAccessMenu,
    getVisibleMenuGroups,
    refetch: fetchNavigation,
  };
}
