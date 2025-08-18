// lib/role-menu-config.ts
"use client";

import {
  LayoutDashboard,
  Users,
  Activity,
  Server,
  Computer,
  Database,
  Thermometer,
  Wrench,
  MessageCircleMore,
  Video,
  FileLock,
  BarChart3,
  DoorClosedLocked,
  AlertTriangle,
  FileText,
  Shield,
  ShieldAlert,
  UserCheck,
  Eye,
  Network,
  Wifi,
  Cog,
  InfoIcon,
  SlidersHorizontalIcon,
  Code,
} from "lucide-react";

// Role hierarchy levels
export enum RoleLevel {
  PUBLIC = 0,    // Accessible by all authenticated users
  USER = 1,      // Standard user access
  DEVELOPER = 2, // Developer access
  ADMIN = 3,     // Administrator access
}

// Role definitions with hierarchy
export const ROLES = {
  'user': { level: RoleLevel.USER, displayName: 'User', color: 'text-green-600 bg-green-100' },
  'developer': { level: RoleLevel.DEVELOPER, displayName: 'Developer', color: 'text-blue-600 bg-blue-100' },
  'admin': { level: RoleLevel.ADMIN, displayName: 'Administrator', color: 'text-red-600 bg-red-100' },
} as const;

// Menu item interface
export interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  requiredRole?: RoleLevel;
  requiredPermissions?: string[];
  isVisible?: (userRole: string, isDeveloperMode?: boolean) => boolean;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

// Menu group interface
export interface MenuGroup {
  id: string;
  title: string;
  icon?: React.ComponentType<any>;
  requiredRole?: RoleLevel;
  isVisible?: (userRole: string, isDeveloperMode?: boolean) => boolean;
  items: MenuItem[];
}

// Dynamic menu configuration
export const DYNAMIC_MENU_CONFIG: MenuGroup[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    requiredRole: RoleLevel.PUBLIC,
    items: [
      {
        id: 'overview',
        title: 'Overview',
        url: '/',
        icon: LayoutDashboard,
        requiredRole: RoleLevel.PUBLIC,
      },
      {
        id: 'control-panel',
        title: 'Control Panel',
        url: '/control/containment',
        icon: SlidersHorizontalIcon,
        requiredRole: RoleLevel.USER,
      },
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    requiredRole: RoleLevel.USER,
    items: [
      {
        id: 'users',
        title: 'Users',
        url: '/management/users',
        icon: Users,
        requiredRole: RoleLevel.ADMIN,
      },
      {
        id: 'user-activity',
        title: 'User Activity',
        url: '/management/user-activity',
        icon: Activity,
        requiredRole: RoleLevel.ADMIN,
      },
      {
        id: 'containments',
        title: 'Containments',
        url: '/management/containments',
        icon: Server,
        requiredRole: RoleLevel.USER,
      },
      {
        id: 'racks',
        title: 'Racks',
        url: '/management/racks',
        icon: Computer,
        requiredRole: RoleLevel.USER,
      },
      {
        id: 'devices',
        title: 'Devices',
        url: '/management/devices',
        icon: Database,
        requiredRole: RoleLevel.USER,
      },
      {
        id: 'sensors',
        title: 'Sensors',
        url: '/management/sensors',
        icon: Thermometer,
        requiredRole: RoleLevel.USER,
      },
      {
        id: 'maintenance',
        title: 'Maintenance',
        url: '/management/maintenance',
        icon: Wrench,
        requiredRole: RoleLevel.USER,
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp',
        url: '/management/whatsapp',
        icon: MessageCircleMore,
        requiredRole: RoleLevel.ADMIN,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    requiredRole: RoleLevel.DEVELOPER,
    items: [
      {
        id: 'camera-setup',
        title: 'Camera Setup',
        url: '/management/camera',
        icon: Video,
        requiredRole: RoleLevel.DEVELOPER,
      },
      {
        id: 'access-control',
        title: 'Access Control',
        url: '/access-control',
        icon: FileLock,
        requiredRole: RoleLevel.DEVELOPER,
        isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    requiredRole: RoleLevel.USER,
    items: [
      {
        id: 'sensor-data',
        title: 'Sensor Data',
        url: '/reports/sensor-data',
        icon: BarChart3,
        requiredRole: RoleLevel.USER,
      },
      {
        id: 'access-logs',
        title: 'Access Logs',
        url: '/reports/access-log',
        icon: DoorClosedLocked,
        requiredRole: RoleLevel.DEVELOPER,
        isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
      },
      {
        id: 'emergency-logs',
        title: 'Emergency Logs',
        url: '/reports/emergency',
        icon: AlertTriangle,
        requiredRole: RoleLevel.ADMIN,
      },
      {
        id: 'maintenance-reports',
        title: 'Maintenance Reports',
        url: '/reports/maintenance',
        icon: FileText,
        requiredRole: RoleLevel.USER,
      },
    ],
  },
  {
    id: 'advanced-security',
    title: 'Security & Access',
    requiredRole: RoleLevel.DEVELOPER,
    isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
    items: [
      {
        id: 'access-overview',
        title: 'Access Overview',
        url: '/access-control',
        icon: Shield,
        requiredRole: RoleLevel.DEVELOPER,
        isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
      },
      {
        id: 'access-devices',
        title: 'Access Devices',
        url: '/access-control/devices',
        icon: ShieldAlert,
        requiredRole: RoleLevel.DEVELOPER,
        isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
      },
      {
        id: 'access-users',
        title: 'Access Users',
        url: '/access-control/users',
        icon: UserCheck,
        requiredRole: RoleLevel.DEVELOPER,
        isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
      },
      {
        id: 'live-monitoring',
        title: 'Live Access Monitor',
        url: '/access-control/monitoring',
        icon: Eye,
        requiredRole: RoleLevel.DEVELOPER,
        isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
      },
    ],
  },
  {
    id: 'configuration',
    title: 'Configuration',
    requiredRole: RoleLevel.USER,
    items: [
      {
        id: 'network-settings',
        title: 'Network Settings',
        url: '/network',
        icon: Network,
        requiredRole: RoleLevel.ADMIN,
      },
      {
        id: 'mqtt-config',
        title: 'MQTT Config',
        url: '/mqtt',
        icon: Wifi,
        requiredRole: RoleLevel.DEVELOPER,
      },
      {
        id: 'system-settings',
        title: 'System Settings',
        url: '/settings/setting',
        icon: Cog,
        requiredRole: RoleLevel.ADMIN,
      },
      {
        id: 'system-info',
        title: 'System Info',
        url: '/info',
        icon: InfoIcon,
        requiredRole: RoleLevel.USER,
      },
    ],
  },
  {
    id: 'developer-tools',
    title: 'Developer Tools',
    requiredRole: RoleLevel.DEVELOPER,
    isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
    items: [
      {
        id: 'developer-dashboard',
        title: 'Developer Dashboard',
        url: '/developer',
        icon: Code,
        requiredRole: RoleLevel.DEVELOPER,
        isVisible: (userRole, isDeveloperMode) => isDeveloperMode === true,
        badge: {
          text: 'Dev',
          variant: 'secondary',
        },
      },
    ],
  },
];

// Helper functions
export function getUserRoleLevel(role: string): RoleLevel {
  const roleData = ROLES[role.toLowerCase() as keyof typeof ROLES];
  return roleData?.level || RoleLevel.PUBLIC;
}

export function hasAccess(userRole: string, requiredRole?: RoleLevel): boolean {
  if (requiredRole === undefined) return true;
  return getUserRoleLevel(userRole) >= requiredRole;
}

export function filterMenuByRole(
  menu: MenuGroup[], 
  userRole: string, 
  isDeveloperMode: boolean = false
): MenuGroup[] {
  const userRoleLevel = getUserRoleLevel(userRole);
  
  return menu
    .filter(group => {
      // Check group-level access
      if (!hasAccess(userRole, group.requiredRole)) return false;
      
      // Check custom visibility function
      if (group.isVisible && !group.isVisible(userRole, isDeveloperMode)) return false;
      
      // Filter items within the group
      const filteredItems = group.items.filter(item => {
        // Check item-level access
        if (!hasAccess(userRole, item.requiredRole)) return false;
        
        // Check custom visibility function
        if (item.isVisible && !item.isVisible(userRole, isDeveloperMode)) return false;
        
        return true;
      });
      
      // Only include group if it has accessible items
      return filteredItems.length > 0;
    })
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!hasAccess(userRole, item.requiredRole)) return false;
        if (item.isVisible && !item.isVisible(userRole, isDeveloperMode)) return false;
        return true;
      }),
    }));
}

// Permission check utilities
export function canAccessMenuItem(
  menuId: string,
  userRole: string,
  isDeveloperMode: boolean = false
): boolean {
  for (const group of DYNAMIC_MENU_CONFIG) {
    const item = group.items.find(item => item.id === menuId);
    if (item) {
      if (!hasAccess(userRole, item.requiredRole)) return false;
      if (item.isVisible && !item.isVisible(userRole, isDeveloperMode)) return false;
      return true;
    }
  }
  return false;
}

export function getMenuItemByUrl(url: string): MenuItem | null {
  for (const group of DYNAMIC_MENU_CONFIG) {
    const item = group.items.find(item => item.url === url);
    if (item) return item;
  }
  return null;
}