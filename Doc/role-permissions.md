# Role-Based CRUD Permissions System

This document describes the role-based access control (RBAC) system implemented for the IoT Containment Monitoring System frontend.

## Overview

The permission system provides granular control over user interface elements and CRUD operations based on user roles. It's implemented as a hardcoded system for simplicity and security.

## Role Hierarchy

### User (Level 1)
- **Basic access level**
- Limited to viewing and monitoring capabilities
- Cannot modify system configuration

### Developer (Level 2) 
- **Development and configuration access**
- Can create and modify most system components
- Cannot delete critical system elements
- Access to developer tools and debugging features

### Admin (Level 3)
- **Full system access**
- Complete CRUD operations on all modules
- Can manage users and system settings
- Access to all administrative functions

## Permission Structure

### CRUD Permissions
Each role has specific permissions for Create, Read, Update, Delete operations:

```typescript
interface CrudPermissions {
  create: boolean;
  read: boolean; 
  update: boolean;
  delete: boolean;
}
```

### UI Permissions
Controls visibility of UI elements:

```typescript
interface UiPermissions {
  showTab: boolean;
  showColumn: boolean;
  showAdvancedFeatures: boolean;
}
```

## Module Permissions

### Menu Management

#### User (Level 1)
- **CRUD**: `{ create: false, read: true, update: false, delete: false }`
- **UI**: Limited visibility, basic features only
- **Tabs**: Menu Items (view-only), Preview
- **Restrictions**: No create/edit/delete buttons, no advanced configuration

#### Developer (Level 2)
- **CRUD**: `{ create: true, read: true, update: true, delete: false }`
- **UI**: Full visibility, advanced features enabled
- **Tabs**: Menu Groups, Menu Items, Sensors, Preview
- **Restrictions**: No delete operations, no roles management

#### Admin (Level 3)
- **CRUD**: `{ create: true, read: true, update: true, delete: true }`
- **UI**: Complete access to all features
- **Tabs**: All tabs available (Menu Groups, Menu Items, Sensors, Roles, Preview)
- **Restrictions**: None

### User Management

#### User (Level 1)
- **Access**: Completely restricted
- **UI**: No tabs or features visible

#### Developer (Level 2)
- **CRUD**: `{ create: false, read: true, update: false, delete: false }`
- **UI**: View-only access
- **Features**: Can view user information but cannot modify

#### Admin (Level 3)
- **CRUD**: `{ create: true, read: true, update: true, delete: true }`
- **UI**: Full management capabilities
- **Features**: Complete user lifecycle management

### System Settings

#### User (Level 1)
- **CRUD**: `{ create: false, read: true, update: false, delete: false }`
- **UI**: Limited to basic system information
- **Restrictions**: No configuration access

#### Developer (Level 2)
- **CRUD**: `{ create: false, read: true, update: true, delete: false }`
- **UI**: Access to development settings and configurations
- **Features**: Can modify system configurations for development

#### Admin (Level 3)
- **CRUD**: `{ create: true, read: true, update: true, delete: true }`
- **UI**: Complete system administration
- **Features**: All system configuration and management tools

## Implementation

### Core Files

#### `lib/role-permissions.ts`
Main permission system implementation:
- Role level definitions
- Permission matrices for each module
- PermissionChecker class for validation
- React hooks for easy component integration

#### Usage in Components

```typescript
import { usePermissions, PermissionWrapper, CrudPermission } from '@/lib/role-permissions';

function MyComponent() {
  const permissions = usePermissions();
  
  return (
    <div>
      {/* Tab visibility */}
      <PermissionWrapper condition={permissions.menu.tabs.menuGroups}>
        <TabsTrigger value="menu-groups">Menu Groups</TabsTrigger>
      </PermissionWrapper>
      
      {/* CRUD operation buttons */}
      <CrudPermission module="menuManagement" operation="create">
        <Button>Add Item</Button>
      </CrudPermission>
      
      <CrudPermission module="menuManagement" operation="delete">
        <Button variant="destructive">Delete</Button>
      </CrudPermission>
    </div>
  );
}
```

### Permission Hook

The `usePermissions()` hook provides easy access to all permissions:

```typescript
const permissions = usePermissions();

// Access specific permissions
permissions.menu.canCreate          // boolean
permissions.menu.canUpdate          // boolean
permissions.menu.canDelete          // boolean
permissions.menu.tabs.menuGroups    // boolean

// Role checks
permissions.isUser()                 // boolean
permissions.isDeveloper()            // boolean
permissions.isAdmin()                // boolean
permissions.roleLevel                // number (1-3)
```

### Wrapper Components

#### PermissionWrapper
Generic wrapper for conditional rendering:
```typescript
<PermissionWrapper 
  condition={permissions.menu.canCreate}
  fallback={<div>Access Denied</div>}
>
  <Button>Create</Button>
</PermissionWrapper>
```

#### CrudPermission
Specific wrapper for CRUD operations:
```typescript
<CrudPermission 
  module="menuManagement" 
  operation="update"
  fallback={<div>No edit permission</div>}
>
  <EditButton />
</CrudPermission>
```

## Security Considerations

### Client-Side Only
- This system only controls UI visibility
- **Important**: Server-side validation is required for actual security
- Frontend permissions are for UX enhancement, not security enforcement

### Best Practices
1. Always validate permissions on the server
2. Use permissions for UI/UX improvement
3. Provide clear feedback when access is restricted
4. Test all permission combinations thoroughly

## Testing Scenarios

### Test Cases by Role

#### User Testing
- [ ] Can only see Menu Items and Preview tabs
- [ ] No Create/Edit/Delete buttons visible
- [ ] Cannot access admin features
- [ ] Read-only access to allowed content

#### Developer Testing  
- [ ] Can access Menu Groups, Items, Sensors, Preview tabs
- [ ] Create and Update buttons visible
- [ ] Delete buttons hidden
- [ ] No access to Roles tab

#### Admin Testing
- [ ] All tabs visible and accessible
- [ ] All CRUD buttons available
- [ ] Can manage roles and users
- [ ] Access to all advanced features

### Edge Cases
- [ ] Role level changes update permissions immediately
- [ ] Invalid/missing roles default to User level
- [ ] Permission changes don't break existing UI state
- [ ] Concurrent user sessions with different roles

## Extending the System

### Adding New Modules
1. Add module to `ROLE_PERMISSIONS` constant
2. Define CRUD and UI permissions for each role
3. Create specific permission checks in components
4. Add tests for new permission scenarios

### Adding New Roles
1. Define new role level in `RoleLevel` enum
2. Add permissions for new role in all modules
3. Update backend role validation
4. Test permission inheritance and conflicts

### Custom Permissions
For complex scenarios, extend the PermissionChecker class:

```typescript
class CustomPermissionChecker extends PermissionChecker {
  canAccessSpecialFeature(): boolean {
    return this.isAdmin() || (this.isDeveloper() && someCondition);
  }
}
```

## Troubleshooting

### Common Issues

#### Permissions Not Updating
- Check if `useAuth()` is properly implemented
- Verify token contains correct role information
- Ensure permission hook is called in component

#### UI Elements Still Visible
- Confirm PermissionWrapper is correctly implemented
- Check permission condition logic
- Verify role level mapping

#### TypeScript Errors
- Ensure all module names are correctly typed
- Check CRUD operation strings match interface
- Verify component prop types

### Debug Tools

```typescript
// Debug current user permissions
const permissions = usePermissions();
console.log('Current permissions:', {
  user: permissions.currentUser,
  roleLevel: permissions.roleLevel,
  menuPermissions: permissions.menu
});
```

## Changelog

### Version 1.0 (Current)
- Initial implementation with User/Developer/Admin roles
- Menu management permissions
- User management permissions  
- System settings permissions
- React hooks and wrapper components
- Documentation and testing guidelines

## Future Enhancements

### Planned Features
- [ ] Dynamic permission loading from backend
- [ ] Permission inheritance system
- [ ] Audit logging for permission changes
- [ ] Temporary role elevation
- [ ] Resource-specific permissions (per-item access)
- [ ] Permission groups and categories
- [ ] Advanced permission debugging tools