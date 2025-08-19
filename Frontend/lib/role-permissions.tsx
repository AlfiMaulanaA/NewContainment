// lib/role-permissions.tsx
import React from "react";
import { CurrentUser } from "./auth-utils";

// Role levels
export enum RoleLevel {
  User = 1,
  Admin = 2,
  Developer = 3,
}

// Permission types for CRUD operations
export interface CrudPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

// UI Element permissions
export interface UiPermissions {
  showTab: boolean;
  showColumn: boolean;
  showAdvancedFeatures: boolean;
}

// Hardcoded role-based permissions configuration
export const ROLE_PERMISSIONS = {
  // Menu Management Permissions
  menuManagement: {
    [RoleLevel.User]: {
      crud: {
        create: false,
        read: true,
        update: false,
        delete: false,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: false,
      } as UiPermissions,
      tabs: {
        menuGroups: false,
        menuItems: true,
        sensors: false,
        roles: false,
        preview: true,
      },
    },
    [RoleLevel.Admin]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
      tabs: {
        menuGroups: true,
        menuItems: true,
        sensors: true,
        roles: true,
        preview: true,
      },
    },
    [RoleLevel.Developer]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
      tabs: {
        menuGroups: true,
        menuItems: true,
        sensors: true,
        roles: true,
        preview: true,
      },
    },
  },

  // User Management Permissions
  userManagement: {
    [RoleLevel.User]: {
      crud: {
        create: false,
        read: false,
        update: false,
        delete: false,
      } as CrudPermissions,
      ui: {
        showTab: false,
        showColumn: false,
        showAdvancedFeatures: false,
      } as UiPermissions,
    },
    [RoleLevel.Admin]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
    [RoleLevel.Developer]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
  },

  // Containment Management Permissions
  containmentManagement: {
    [RoleLevel.User]: {
      crud: {
        create: false,
        read: true,
        update: false,
        delete: false,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: false,
      } as UiPermissions,
    },
    [RoleLevel.Admin]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
    [RoleLevel.Developer]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
  },

  // Rack Management Permissions
  rackManagement: {
    [RoleLevel.User]: {
      crud: {
        create: false,
        read: true,
        update: false,
        delete: false,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: false,
      } as UiPermissions,
    },
    [RoleLevel.Admin]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
    [RoleLevel.Developer]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
  },

  // Device Management Permissions
  deviceManagement: {
    [RoleLevel.User]: {
      crud: {
        create: false,
        read: true,
        update: false,
        delete: false,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: false,
      } as UiPermissions,
    },
    [RoleLevel.Admin]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
    [RoleLevel.Developer]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
  },

  // Maintenance Management Permissions
  maintenanceManagement: {
    [RoleLevel.User]: {
      crud: {
        create: false,
        read: true,
        update: true,
        delete: false,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: false,
      } as UiPermissions,
    },
    [RoleLevel.Admin]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
    [RoleLevel.Developer]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
  },

  // System Settings Permissions
  systemSettings: {
    [RoleLevel.User]: {
      crud: {
        create: false,
        read: false,
        update: false,
        delete: false,
      } as CrudPermissions,
      ui: {
        showTab: false,
        showColumn: false,
        showAdvancedFeatures: false,
      } as UiPermissions,
    },
    [RoleLevel.Admin]: {
      crud: {
        create: false,
        read: true,
        update: true,
        delete: false,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: false,
      } as UiPermissions,
    },
    [RoleLevel.Developer]: {
      crud: {
        create: true,
        read: true,
        update: true,
        delete: true,
      } as CrudPermissions,
      ui: {
        showTab: true,
        showColumn: true,
        showAdvancedFeatures: true,
      } as UiPermissions,
    },
  },
} as const;

// Utility functions to check permissions
export class PermissionChecker {
  public userRoleLevel: RoleLevel;

  constructor(user: CurrentUser | null) {
    this.userRoleLevel = user?.roleLevel || RoleLevel.User;
  }

  // Check if user can perform CRUD operation
  canCreate(module: keyof typeof ROLE_PERMISSIONS): boolean {
    return ROLE_PERMISSIONS[module][this.userRoleLevel]?.crud.create || false;
  }

  canRead(module: keyof typeof ROLE_PERMISSIONS): boolean {
    return ROLE_PERMISSIONS[module][this.userRoleLevel]?.crud.read || false;
  }

  canUpdate(module: keyof typeof ROLE_PERMISSIONS): boolean {
    return ROLE_PERMISSIONS[module][this.userRoleLevel]?.crud.update || false;
  }

  canDelete(module: keyof typeof ROLE_PERMISSIONS): boolean {
    return ROLE_PERMISSIONS[module][this.userRoleLevel]?.crud.delete || false;
  }

  // Check UI element visibility
  canShowTab(module: keyof typeof ROLE_PERMISSIONS): boolean {
    return ROLE_PERMISSIONS[module][this.userRoleLevel]?.ui.showTab || false;
  }

  canShowColumn(module: keyof typeof ROLE_PERMISSIONS): boolean {
    return ROLE_PERMISSIONS[module][this.userRoleLevel]?.ui.showColumn || false;
  }

  canShowAdvancedFeatures(module: keyof typeof ROLE_PERMISSIONS): boolean {
    return (
      ROLE_PERMISSIONS[module][this.userRoleLevel]?.ui.showAdvancedFeatures ||
      false
    );
  }

  // Check specific tab access for menu management
  canShowMenuTab(
    tabName: keyof (typeof ROLE_PERMISSIONS.menuManagement)[RoleLevel.Admin]["tabs"]
  ): boolean {
    const permissions = ROLE_PERMISSIONS.menuManagement[this.userRoleLevel];
    return permissions?.tabs[tabName] || false;
  }

  // Check if user has minimum role level
  hasMinimumRole(minimumLevel: RoleLevel): boolean {
    return this.userRoleLevel >= minimumLevel;
  }

  // Check if user is specific role
  isUser(): boolean {
    return this.userRoleLevel === RoleLevel.User;
  }

  isDeveloper(): boolean {
    return this.userRoleLevel === RoleLevel.Developer;
  }

  isAdmin(): boolean {
    return this.userRoleLevel === RoleLevel.Admin;
  }

  // Get all CRUD permissions for a module
  getCrudPermissions(module: keyof typeof ROLE_PERMISSIONS): CrudPermissions {
    return (
      ROLE_PERMISSIONS[module][this.userRoleLevel]?.crud || {
        create: false,
        read: false,
        update: false,
        delete: false,
      }
    );
  }

  // Get all UI permissions for a module
  getUiPermissions(module: keyof typeof ROLE_PERMISSIONS): UiPermissions {
    return (
      ROLE_PERMISSIONS[module][this.userRoleLevel]?.ui || {
        showTab: false,
        showColumn: false,
        showAdvancedFeatures: false,
      }
    );
  }
}

// React hook for easy permission checking
import { useAuth } from "@/hooks/useAuth";

export function usePermissions() {
  const { user } = useAuth();
  const permissions = new PermissionChecker(user);

  return {
    // Menu Management
    menu: {
      canCreate: permissions.canCreate("menuManagement"),
      canRead: permissions.canRead("menuManagement"),
      canUpdate: permissions.canUpdate("menuManagement"),
      canDelete: permissions.canDelete("menuManagement"),
      canShowTab: permissions.canShowTab("menuManagement"),
      canShowAdvancedFeatures:
        permissions.canShowAdvancedFeatures("menuManagement"),
      tabs: {
        menuGroups: permissions.canShowMenuTab("menuGroups"),
        menuItems: permissions.canShowMenuTab("menuItems"),
        sensors: permissions.canShowMenuTab("sensors"),
        roles: permissions.canShowMenuTab("roles"),
        preview: permissions.canShowMenuTab("preview"),
      },
    },

    // User Management
    user: {
      canCreate: permissions.canCreate("userManagement"),
      canRead: permissions.canRead("userManagement"),
      canUpdate: permissions.canUpdate("userManagement"),
      canDelete: permissions.canDelete("userManagement"),
      canShowTab: permissions.canShowTab("userManagement"),
    },

    // Containment Management
    containment: {
      canCreate: permissions.canCreate("containmentManagement"),
      canRead: permissions.canRead("containmentManagement"),
      canUpdate: permissions.canUpdate("containmentManagement"),
      canDelete: permissions.canDelete("containmentManagement"),
      canShowTab: permissions.canShowTab("containmentManagement"),
      canShowAdvancedFeatures:
        permissions.canShowAdvancedFeatures("containmentManagement"),
    },

    // Rack Management
    rack: {
      canCreate: permissions.canCreate("rackManagement"),
      canRead: permissions.canRead("rackManagement"),
      canUpdate: permissions.canUpdate("rackManagement"),
      canDelete: permissions.canDelete("rackManagement"),
      canShowTab: permissions.canShowTab("rackManagement"),
      canShowAdvancedFeatures:
        permissions.canShowAdvancedFeatures("rackManagement"),
    },

    // Device Management
    device: {
      canCreate: permissions.canCreate("deviceManagement"),
      canRead: permissions.canRead("deviceManagement"),
      canUpdate: permissions.canUpdate("deviceManagement"),
      canDelete: permissions.canDelete("deviceManagement"),
      canShowTab: permissions.canShowTab("deviceManagement"),
      canShowAdvancedFeatures:
        permissions.canShowAdvancedFeatures("deviceManagement"),
    },

    // Maintenance Management
    maintenance: {
      canCreate: permissions.canCreate("maintenanceManagement"),
      canRead: permissions.canRead("maintenanceManagement"),
      canUpdate: permissions.canUpdate("maintenanceManagement"),
      canDelete: permissions.canDelete("maintenanceManagement"),
      canShowTab: permissions.canShowTab("maintenanceManagement"),
      canShowAdvancedFeatures:
        permissions.canShowAdvancedFeatures("maintenanceManagement"),
    },

    // System Settings
    system: {
      canCreate: permissions.canCreate("systemSettings"),
      canRead: permissions.canRead("systemSettings"),
      canUpdate: permissions.canUpdate("systemSettings"),
      canDelete: permissions.canDelete("systemSettings"),
      canShowTab: permissions.canShowTab("systemSettings"),
      canShowAdvancedFeatures:
        permissions.canShowAdvancedFeatures("systemSettings"),
    },

    // Role checks
    isUser: permissions.isUser(),
    isDeveloper: permissions.isDeveloper(),
    isAdmin: permissions.isAdmin(),
    hasMinimumRole: permissions.hasMinimumRole.bind(permissions),

    // Current user info
    currentUser: user,
    roleLevel: user?.roleLevel || RoleLevel.User,
  };
}

// Helper components for conditional rendering
interface PermissionWrapperProps {
  children: React.ReactNode;
  condition: boolean;
  fallback?: React.ReactNode;
}

export function PermissionWrapper({
  children,
  condition,
  fallback = null,
}: PermissionWrapperProps) {
  return condition ? <>{children}</> : <>{fallback}</>;
}

// Specific permission wrapper for CRUD operations
interface CrudPermissionProps {
  children: React.ReactNode;
  module: keyof typeof ROLE_PERMISSIONS;
  operation: "create" | "read" | "update" | "delete";
  fallback?: React.ReactNode;
}

export function CrudPermission({
  children,
  module,
  operation,
  fallback = null,
}: CrudPermissionProps) {
  const permissions = usePermissions();
  const checker = new PermissionChecker(permissions.currentUser);

  let hasPermission = false;
  switch (operation) {
    case "create":
      hasPermission = checker.canCreate(module);
      break;
    case "read":
      hasPermission = checker.canRead(module);
      break;
    case "update":
      hasPermission = checker.canUpdate(module);
      break;
    case "delete":
      hasPermission = checker.canDelete(module);
      break;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
