// Controllers/MenuManagementController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Services;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/menu-management")]
    public class MenuManagementController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IRoleMappingService _roleMappingService;
        private readonly ILogger<MenuManagementController> _logger;

        public MenuManagementController(AppDbContext context, IRoleMappingService roleMappingService, ILogger<MenuManagementController> logger)
        {
            _context = context;
            _roleMappingService = roleMappingService;
            _logger = logger;
        }

        // Get user's dynamic menu based on role and permissions
        [HttpGet("user-menu")]
        public async Task<IActionResult> GetUserMenu()
        {
            try
            {
                // Get current user from token claims
                var userIdClaim = User.FindFirst("UserId")?.Value ?? User.FindFirst("id")?.Value;
                if (!int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized("Invalid user token");
                }

                var user = await _context.Users
                    .Include(u => u.DatabaseRole)
                    .FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null)
                {
                    return NotFound("User not found");
                }

                // Check developer mode from headers
                var isDeveloperMode = Request.Headers.ContainsKey("X-Developer-Mode") && 
                                    Request.Headers["X-Developer-Mode"] == "true";

                // Get database role and permissions for the user
                var databaseRole = await _roleMappingService.GetDatabaseRoleFromEnumAsync(user.Role);
                var userPermissions = await _roleMappingService.GetUserPermissionNamesAsync(userId);

                // Try to get dynamic menu from database first, fallback to static if needed
                var menuGroups = await GetDynamicMenuGroups((int)user.Role, isDeveloperMode);
                
                // If no dynamic menu exists, use static menu as fallback
                if (!menuGroups.Any())
                {
                    menuGroups = GetStaticMenuGroups((int)user.Role, isDeveloperMode);
                }

                var response = new
                {
                    menuGroups,
                    userRole = new
                    {
                        id = databaseRole?.Id ?? (int)user.Role,
                        name = databaseRole?.Name ?? user.Role.ToString(),
                        displayName = databaseRole?.DisplayName ?? user.Role.ToString(),
                        description = databaseRole?.Description ?? $"{user.Role} role with appropriate permissions",
                        level = databaseRole?.Level ?? (int)user.Role,
                        color = databaseRole?.Color ?? user.Role switch
                        {
                            Backend.Enums.UserRole.Developer => "text-green-600 bg-green-100",
                            Backend.Enums.UserRole.Admin => "text-blue-600 bg-blue-100", 
                            Backend.Enums.UserRole.User => "text-gray-600 bg-gray-100",
                            _ => "text-gray-600 bg-gray-100"
                        },
                        isActive = user.IsActive,
                        permissions = userPermissions
                    },
                    isDeveloperMode,
                    userPermissions
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user menu");
                return StatusCode(500, "Error retrieving user menu");
            }
        }

        private async Task<object[]> GetDynamicMenuGroups(int userRoleLevel, bool isDeveloperMode)
        {
            try
            {
                var menuGroups = await _context.MenuGroups
                    .Where(g => g.IsActive && 
                               (g.MinRoleLevel == null || g.MinRoleLevel <= userRoleLevel) &&
                               (!g.RequiresDeveloperMode || isDeveloperMode))
                    .OrderBy(g => g.SortOrder)
                    .Include(g => g.MenuItems.Where(i => i.IsActive && 
                                                       (i.MinRoleLevel == null || i.MinRoleLevel <= userRoleLevel) &&
                                                       (!i.RequiresDeveloperMode || isDeveloperMode)))
                    .ToListAsync();

                return menuGroups
                    .Where(g => g.MenuItems.Any()) // Only include groups that have visible items
                    .Select(g => new
                    {
                        id = g.Id,
                        title = g.Title,
                        icon = g.Icon,
                        sortOrder = g.SortOrder,
                        minRoleLevel = g.MinRoleLevel,
                        requiresDeveloperMode = g.RequiresDeveloperMode,
                        items = g.MenuItems
                            .OrderBy(i => i.SortOrder)
                            .Select(i => new
                            {
                                id = i.Id,
                                title = i.Title,
                                url = i.Url,
                                icon = i.Icon,
                                sortOrder = i.SortOrder,
                                minRoleLevel = i.MinRoleLevel,
                                requiresDeveloperMode = i.RequiresDeveloperMode,
                                badgeText = i.BadgeText,
                                badgeVariant = i.BadgeVariant
                            }).ToArray()
                    }).ToArray();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dynamic menu groups");
                return new object[0]; // Return empty array on error
            }
        }

        private object[] GetStaticMenuGroups(int userRoleLevel, bool isDeveloperMode)
        {
            var menuGroups = new[]
            {
                new
                {
                    id = 1,
                    title = "Dashboard",
                    icon = "LayoutDashboard",
                    sortOrder = 1,
                    minRoleLevel = 1,
                    requiresDeveloperMode = false,
                    items = new[]
                    {
                        new
                        {
                            id = 1,
                            title = "Overview",
                            url = "/",
                            icon = "Home",
                            sortOrder = 1,
                            minRoleLevel = 1,
                            requiresDeveloperMode = false
                        }
                    }
                },
                new
                {
                    id = 2,
                    title = "Management",
                    icon = "Settings",
                    sortOrder = 2,
                    minRoleLevel = 1,
                    requiresDeveloperMode = false,
                    items = new[]
                    {
                        new
                        {
                            id = 2,
                            title = "Devices",
                            url = "/management/devices",
                            icon = "HardDrive",
                            sortOrder = 1,
                            minRoleLevel = 1,
                            requiresDeveloperMode = false
                        },
                        new
                        {
                            id = 3,
                            title = "Users",
                            url = "/management/users",
                            icon = "Users",
                            sortOrder = 2,
                            minRoleLevel = 2,
                            requiresDeveloperMode = false
                        },
                        new
                        {
                            id = 4,
                            title = "Sensors",
                            url = "/management/sensors",
                            icon = "Activity",
                            sortOrder = 3,
                            minRoleLevel = 1,
                            requiresDeveloperMode = false
                        },
                        new
                        {
                            id = 5,
                            title = "Camera",
                            url = "/management/camera",
                            icon = "Camera",
                            sortOrder = 4,
                            minRoleLevel = 1,
                            requiresDeveloperMode = false
                        },
                        new
                        {
                            id = 6,
                            title = "Maintenance",
                            url = "/management/maintenance",
                            icon = "Wrench",
                            sortOrder = 5,
                            minRoleLevel = 1,
                            requiresDeveloperMode = false
                        }
                    }
                },
                new
                {
                    id = 3,
                    title = "Control",
                    icon = "Sliders",
                    sortOrder = 3,
                    minRoleLevel = 1,
                    requiresDeveloperMode = false,
                    items = new[]
                    {
                        new
                        {
                            id = 7,
                            title = "Containment",
                            url = "/control/containment",
                            icon = "Box",
                            sortOrder = 1,
                            minRoleLevel = 1,
                            requiresDeveloperMode = false
                        }
                    }
                },
                new
                {
                    id = 4,
                    title = "System",
                    icon = "Cog",
                    sortOrder = 4,
                    minRoleLevel = 2,
                    requiresDeveloperMode = false,
                    items = new[]
                    {
                        new
                        {
                            id = 8,
                            title = "WhatsApp",
                            url = "/management/whatsapp",
                            icon = "MessageCircle",
                            sortOrder = 1,
                            minRoleLevel = 2,
                            requiresDeveloperMode = false
                        }
                    }
                }
            };

            // Filter menu items based on user role and developer mode
            return menuGroups
                .Where(g => g.minRoleLevel <= userRoleLevel && (!g.requiresDeveloperMode || isDeveloperMode))
                .Select(g => new
                {
                    g.id,
                    g.title,
                    g.icon,
                    g.sortOrder,
                    g.minRoleLevel,
                    g.requiresDeveloperMode,
                    items = g.items
                        .Where(i => i.minRoleLevel <= userRoleLevel && (!i.requiresDeveloperMode || isDeveloperMode))
                        .ToArray()
                })
                .Where(g => g.items.Any())
                .ToArray();
        }

        // ADMIN ENDPOINTS - Manage Roles
        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            try
            {
                var roles = await _context.Roles
                    .Where(r => r.IsActive)
                    .Include(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
                    .OrderBy(r => r.Level)
                    .ToListAsync();

                var roleDtos = roles.Select(role => new
                {
                    id = role.Id,
                    name = role.Name,
                    displayName = role.DisplayName,
                    description = role.Description,
                    level = role.Level,
                    color = role.Color,
                    isActive = role.IsActive,
                    permissions = role.RolePermissions
                        .Where(rp => rp.Permission.IsActive)
                        .Select(rp => rp.Permission.Name)
                        .ToList()
                }).ToList();

                return Ok(new { success = true, data = roleDtos });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting roles");
                return StatusCode(500, new { success = false, message = "Error retrieving roles" });
            }
        }

        [HttpPost("roles")]
        
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
        {
            try
            {
                // Check if role name already exists
                var existingRole = await _context.Roles
                    .FirstOrDefaultAsync(r => r.Name.ToLower() == request.Name.ToLower());
                
                if (existingRole != null)
                {
                    return BadRequest(new { success = false, message = "Role name already exists" });
                }

                var role = new Role
                {
                    Name = request.Name,
                    DisplayName = request.DisplayName,
                    Description = request.Description,
                    Level = request.Level,
                    Color = request.Color,
                    IsActive = request.IsActive,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Roles.Add(role);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    data = new { id = role.Id, message = "Role created successfully" } 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating role");
                return StatusCode(500, new { success = false, message = "Error creating role" });
            }
        }

        [HttpPut("roles/{id}")]
        
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleRequest request)
        {
            try
            {
                var role = await _context.Roles.FindAsync(id);
                if (role == null)
                {
                    return NotFound(new { success = false, message = "Role not found" });
                }

                // Check if new name conflicts with existing roles
                if (!string.IsNullOrEmpty(request.Name) && request.Name != role.Name)
                {
                    var existingRole = await _context.Roles
                        .FirstOrDefaultAsync(r => r.Name.ToLower() == request.Name.ToLower() && r.Id != id);
                    
                    if (existingRole != null)
                    {
                        return BadRequest(new { success = false, message = "Role name already exists" });
                    }
                }

                if (!string.IsNullOrEmpty(request.Name)) role.Name = request.Name;
                if (!string.IsNullOrEmpty(request.DisplayName)) role.DisplayName = request.DisplayName;
                if (!string.IsNullOrEmpty(request.Description)) role.Description = request.Description;
                if (request.Level.HasValue) role.Level = request.Level.Value;
                if (!string.IsNullOrEmpty(request.Color)) role.Color = request.Color;
                if (request.IsActive.HasValue) role.IsActive = request.IsActive.Value;
                
                role.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Role updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating role {Id}", id);
                return StatusCode(500, new { success = false, message = "Error updating role" });
            }
        }

        [HttpDelete("roles/{id}")]
        
        public async Task<IActionResult> DeleteRole(int id)
        {
            try
            {
                var role = await _context.Roles
                    .Include(r => r.UserRoles)
                        .ThenInclude(ur => ur.User)
                    .FirstOrDefaultAsync(r => r.Id == id);
                    
                if (role == null)
                {
                    return NotFound(new { success = false, message = "Role not found" });
                }

                // Check if role is being used by users
                if (role.UserRoles.Any())
                {
                    return BadRequest(new { 
                        success = false, 
                        message = "Cannot delete role that is assigned to users" 
                    });
                }

                // Don't allow deletion of system roles (Admin, Developer, User)
                if (role.Name == "Admin" || role.Name == "Developer" || role.Name == "User")
                {
                    return BadRequest(new { 
                        success = false, 
                        message = "Cannot delete system roles" 
                    });
                }

                _context.Roles.Remove(role);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Role deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting role {Id}", id);
                return StatusCode(500, new { success = false, message = "Error deleting role" });
            }
        }

        // ADMIN ENDPOINTS - Manage Menu Groups
        [HttpGet("menu-groups")]
        public async Task<IActionResult> GetMenuGroups()
        {
            try
            {
                var menuGroups = await _context.MenuGroups
                    .Include(mg => mg.MenuItems)
                    .OrderBy(mg => mg.SortOrder)
                    .ToListAsync();

                var result = menuGroups.Select(mg => new
                {
                    id = mg.Id,
                    title = mg.Title,
                    icon = mg.Icon,
                    sortOrder = mg.SortOrder,
                    minRoleLevel = mg.MinRoleLevel,
                    isActive = mg.IsActive,
                    requiresDeveloperMode = mg.RequiresDeveloperMode,
                    items = mg.MenuItems.OrderBy(mi => mi.SortOrder).Select(mi => new
                    {
                        id = mi.Id,
                        title = mi.Title,
                        url = mi.Url,
                        icon = mi.Icon,
                        sortOrder = mi.SortOrder,
                        minRoleLevel = mi.MinRoleLevel,
                        isActive = mi.IsActive,
                        requiresDeveloperMode = mi.RequiresDeveloperMode,
                        badgeText = mi.BadgeText,
                        badgeVariant = mi.BadgeVariant
                    }).ToList()
                }).ToList();

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting menu groups");
                return StatusCode(500, new { success = false, message = "Error retrieving menu groups" });
            }
        }

        [HttpPost("menu-groups")]
        
        public async Task<IActionResult> CreateMenuGroup([FromBody] CreateMenuGroupRequest request)
        {
            try
            {
                var menuGroup = new MenuGroup
                {
                    Title = request.Title,
                    Icon = request.Icon,
                    SortOrder = request.SortOrder,
                    MinRoleLevel = request.MinRoleLevel,
                    IsActive = request.IsActive,
                    RequiresDeveloperMode = request.RequiresDeveloperMode,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.MenuGroups.Add(menuGroup);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    data = new { id = menuGroup.Id, message = "Menu group created successfully" } 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating menu group");
                return StatusCode(500, new { success = false, message = "Error creating menu group" });
            }
        }

        [HttpPut("menu-groups/{id}")]
        
        public async Task<IActionResult> UpdateMenuGroup(int id, [FromBody] UpdateMenuGroupRequest request)
        {
            try
            {
                var menuGroup = await _context.MenuGroups.FindAsync(id);
                if (menuGroup == null)
                {
                    return NotFound(new { success = false, message = "Menu group not found" });
                }

                if (!string.IsNullOrEmpty(request.Title)) menuGroup.Title = request.Title;
                if (!string.IsNullOrEmpty(request.Icon)) menuGroup.Icon = request.Icon;
                if (request.SortOrder.HasValue) menuGroup.SortOrder = request.SortOrder.Value;
                if (request.MinRoleLevel.HasValue) menuGroup.MinRoleLevel = request.MinRoleLevel;
                if (request.IsActive.HasValue) menuGroup.IsActive = request.IsActive.Value;
                if (request.RequiresDeveloperMode.HasValue) menuGroup.RequiresDeveloperMode = request.RequiresDeveloperMode.Value;
                
                menuGroup.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Menu group updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating menu group {Id}", id);
                return StatusCode(500, new { success = false, message = "Error updating menu group" });
            }
        }

        // ADMIN ENDPOINTS - Manage Menu Items
        [HttpGet("menu-items")]
        public async Task<IActionResult> GetMenuItems()
        {
            try
            {
                var menuItems = await _context.MenuItems
                    .Include(mi => mi.MenuGroup)
                    .OrderBy(mi => mi.MenuGroup.SortOrder)
                        .ThenBy(mi => mi.SortOrder)
                    .ToListAsync();

                var result = menuItems.Select(mi => new
                {
                    id = mi.Id,
                    title = mi.Title,
                    url = mi.Url,
                    icon = mi.Icon,
                    sortOrder = mi.SortOrder,
                    minRoleLevel = mi.MinRoleLevel,
                    isActive = mi.IsActive,
                    requiresDeveloperMode = mi.RequiresDeveloperMode,
                    badgeText = mi.BadgeText,
                    badgeVariant = mi.BadgeVariant,
                    menuGroupId = mi.MenuGroupId,
                    menuGroup = new
                    {
                        id = mi.MenuGroup.Id,
                        title = mi.MenuGroup.Title,
                        icon = mi.MenuGroup.Icon
                    }
                }).ToList();

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting menu items");
                return StatusCode(500, new { success = false, message = "Error retrieving menu items" });
            }
        }

        [HttpPost("menu-items")]

        public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemRequest request)
        {
            try
            {
                // Verify the menu group exists
                var menuGroup = await _context.MenuGroups.FindAsync(request.MenuGroupId);
                if (menuGroup == null)
                {
                    return BadRequest(new { success = false, message = "Menu group not found" });
                }

                var menuItem = new MenuItem
                {
                    Title = request.Title,
                    Url = request.Url,
                    Icon = request.Icon,
                    SortOrder = request.SortOrder,
                    MinRoleLevel = request.MinRoleLevel,
                    IsActive = request.IsActive,
                    RequiresDeveloperMode = request.RequiresDeveloperMode,
                    BadgeText = request.BadgeText,
                    BadgeVariant = request.BadgeVariant,
                    MenuGroupId = request.MenuGroupId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.MenuItems.Add(menuItem);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    data = new { id = menuItem.Id, message = "Menu item created successfully" } 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating menu item");
                return StatusCode(500, new { success = false, message = "Error creating menu item" });
            }
        }

        [HttpPut("menu-items/{id}")]
        
        public async Task<IActionResult> UpdateMenuItem(int id, [FromBody] UpdateMenuItemRequest request)
        {
            try
            {
                var menuItem = await _context.MenuItems.FindAsync(id);
                if (menuItem == null)
                {
                    return NotFound(new { success = false, message = "Menu item not found" });
                }

                if (!string.IsNullOrEmpty(request.Title)) menuItem.Title = request.Title;
                if (!string.IsNullOrEmpty(request.Url)) menuItem.Url = request.Url;
                if (!string.IsNullOrEmpty(request.Icon)) menuItem.Icon = request.Icon;
                if (request.SortOrder.HasValue) menuItem.SortOrder = request.SortOrder.Value;
                if (request.MinRoleLevel.HasValue) menuItem.MinRoleLevel = request.MinRoleLevel;
                if (request.IsActive.HasValue) menuItem.IsActive = request.IsActive.Value;
                if (request.RequiresDeveloperMode.HasValue) menuItem.RequiresDeveloperMode = request.RequiresDeveloperMode.Value;
                if (request.BadgeText != null) menuItem.BadgeText = request.BadgeText;
                if (!string.IsNullOrEmpty(request.BadgeVariant)) menuItem.BadgeVariant = request.BadgeVariant;
                
                menuItem.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Menu item updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating menu item {Id}", id);
                return StatusCode(500, new { success = false, message = "Error updating menu item" });
            }
        }

        [HttpPatch("menu-items/{id}/toggle-active")]
        
        public async Task<IActionResult> ToggleMenuItemActive(int id)
        {
            try
            {
                var menuItem = await _context.MenuItems.FindAsync(id);
                if (menuItem == null)
                {
                    return NotFound(new { success = false, message = "Menu item not found" });
                }

                menuItem.IsActive = !menuItem.IsActive;
                menuItem.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    message = $"Menu item {(menuItem.IsActive ? "activated" : "deactivated")} successfully",
                    isActive = menuItem.IsActive
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling menu item active status {Id}", id);
                return StatusCode(500, new { success = false, message = "Error toggling menu item status" });
            }
        }

        [HttpPatch("menu-groups/{id}/toggle-active")]
        
        public async Task<IActionResult> ToggleMenuGroupActive(int id)
        {
            try
            {
                var menuGroup = await _context.MenuGroups.FindAsync(id);
                if (menuGroup == null)
                {
                    return NotFound(new { success = false, message = "Menu group not found" });
                }

                menuGroup.IsActive = !menuGroup.IsActive;
                menuGroup.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    message = $"Menu group {(menuGroup.IsActive ? "activated" : "deactivated")} successfully",
                    isActive = menuGroup.IsActive
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling menu group active status {Id}", id);
                return StatusCode(500, new { success = false, message = "Error toggling menu group status" });
            }
        }

        [HttpDelete("menu-items/{id}")]
        
        public async Task<IActionResult> DeleteMenuItem(int id)
        {
            try
            {
                var menuItem = await _context.MenuItems.FindAsync(id);
                if (menuItem == null)
                {
                    return NotFound(new { success = false, message = "Menu item not found" });
                }

                _context.MenuItems.Remove(menuItem);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Menu item deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting menu item {Id}", id);
                return StatusCode(500, new { success = false, message = "Error deleting menu item" });
            }
        }

        [HttpDelete("menu-groups/{id}")]
        
        public async Task<IActionResult> DeleteMenuGroup(int id)
        {
            try
            {
                var menuGroup = await _context.MenuGroups
                    .Include(mg => mg.MenuItems)
                    .FirstOrDefaultAsync(mg => mg.Id == id);
                    
                if (menuGroup == null)
                {
                    return NotFound(new { success = false, message = "Menu group not found" });
                }

                // Check if group has items
                if (menuGroup.MenuItems.Any())
                {
                    return BadRequest(new { 
                        success = false, 
                        message = "Cannot delete menu group that contains menu items. Please delete all items first." 
                    });
                }

                _context.MenuGroups.Remove(menuGroup);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Menu group deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting menu group {Id}", id);
                return StatusCode(500, new { success = false, message = "Error deleting menu group" });
            }
        }

    }

    // Request DTOs
    public class CreateRoleRequest
    {
        public string Name { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Level { get; set; }
        public string Color { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateRoleRequest
    {
        public string? Name { get; set; }
        public string? DisplayName { get; set; }
        public string? Description { get; set; }
        public int? Level { get; set; }
        public string? Color { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CreateMenuGroupRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public int? MinRoleLevel { get; set; }
        public bool IsActive { get; set; } = true;
        public bool RequiresDeveloperMode { get; set; }
    }

    public class CreateMenuItemRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public int? MinRoleLevel { get; set; }
        public bool IsActive { get; set; } = true;
        public bool RequiresDeveloperMode { get; set; }
        public string? BadgeText { get; set; }
        public string? BadgeVariant { get; set; }
        public int MenuGroupId { get; set; }
    }

    public class UpdateMenuGroupRequest
    {
        public string? Title { get; set; }
        public string? Icon { get; set; }
        public int? SortOrder { get; set; }
        public int? MinRoleLevel { get; set; }
        public bool? IsActive { get; set; }
        public bool? RequiresDeveloperMode { get; set; }
    }

    public class UpdateMenuItemRequest
    {
        public string? Title { get; set; }
        public string? Url { get; set; }
        public string? Icon { get; set; }
        public int? SortOrder { get; set; }
        public int? MinRoleLevel { get; set; }
        public bool? IsActive { get; set; }
        public bool? RequiresDeveloperMode { get; set; }
        public string? BadgeText { get; set; }
        public string? BadgeVariant { get; set; }
    }
}
