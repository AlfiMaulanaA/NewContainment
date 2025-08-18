// Controllers/MenuManagementController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MenuManagementController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<MenuManagementController> _logger;

        public MenuManagementController(AppDbContext context, ILogger<MenuManagementController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Get user's dynamic menu based on role and permissions
        [HttpGet("user-menu")]
        public async Task<IActionResult> GetUserMenu()
        {
            try
            {
                // Get current user from token claims
                var userIdClaim = User.FindFirst("id")?.Value;
                if (!int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized("Invalid user token");
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound("User not found");
                }

                // Check developer mode from headers
                var isDeveloperMode = Request.Headers.ContainsKey("X-Developer-Mode") && 
                                    Request.Headers["X-Developer-Mode"] == "true";

                // Create static menu structure based on user role
                var menuGroups = GetStaticMenuGroups((int)user.Role, isDeveloperMode);

                var response = new
                {
                    menuGroups,
                    userRole = new
                    {
                        id = (int)user.Role,
                        name = user.Role.ToString(),
                        displayName = user.Role.ToString(),
                        description = $"{user.Role} role with appropriate permissions",
                        level = (int)user.Role,
                        color = user.Role switch
                        {
                            Backend.Enums.UserRole.Developer => "#10B981",
                            Backend.Enums.UserRole.Admin => "#3B82F6", 
                            Backend.Enums.UserRole.User => "#6B7280",
                            _ => "#6B7280"
                        },
                        isActive = user.IsActive,
                        permissions = new string[] { }
                    },
                    isDeveloperMode,
                    userPermissions = new string[] { }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user menu");
                return StatusCode(500, "Error retrieving user menu");
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
        public IActionResult GetRoles()
        {
            try
            {
                var roles = new[]
                {
                    new
                    {
                        id = 1,
                        name = "User",
                        displayName = "User",
                        description = "Standard user with basic permissions",
                        level = 1,
                        color = "#6B7280",
                        isActive = true,
                        permissions = new string[] { }
                    },
                    new
                    {
                        id = 2,
                        name = "Admin",
                        displayName = "Administrator",
                        description = "Administrator with elevated permissions",
                        level = 2,
                        color = "#3B82F6",
                        isActive = true,
                        permissions = new string[] { }
                    },
                    new
                    {
                        id = 3,
                        name = "Developer",
                        displayName = "Developer",
                        description = "Developer with full system access",
                        level = 3,
                        color = "#10B981",
                        isActive = true,
                        permissions = new string[] { }
                    }
                };

                return Ok(new { success = true, data = roles });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting roles");
                return StatusCode(500, new { success = false, message = "Error retrieving roles" });
            }
        }

        [HttpPost("roles")]
        public IActionResult CreateRole([FromBody] dynamic roleData)
        {
            try
            {
                // Mock implementation - return success
                return Ok(new { success = true, data = new { id = 1, message = "Role created successfully" } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating role");
                return StatusCode(500, new { success = false, message = "Error creating role" });
            }
        }

        // ADMIN ENDPOINTS - Manage Menu Groups
        [HttpGet("menu-groups")]
        public IActionResult GetMenuGroups()
        {
            try
            {
                var menuGroups = GetStaticMenuGroups(3, true); // Get all menu groups for admin

                return Ok(new { success = true, data = menuGroups });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting menu groups");
                return StatusCode(500, new { success = false, message = "Error retrieving menu groups" });
            }
        }

        [HttpPost("menu-groups")]
        public IActionResult CreateMenuGroup([FromBody] dynamic groupData)
        {
            try
            {
                // Mock implementation - return success
                return Ok(new { success = true, data = new { id = 1, message = "Menu group created successfully" } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating menu group");
                return StatusCode(500, new { success = false, message = "Error creating menu group" });
            }
        }

        [HttpPut("menu-groups/{id}")]
        public IActionResult UpdateMenuGroup(int id, [FromBody] dynamic groupData)
        {
            try
            {
                // Mock implementation - return success
                return Ok(new { success = true, message = "Menu group updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating menu group");
                return StatusCode(500, new { success = false, message = "Error updating menu group" });
            }
        }

        // ADMIN ENDPOINTS - Manage Menu Items
        [HttpPost("menu-items")]
        public IActionResult CreateMenuItem([FromBody] dynamic itemData)
        {
            try
            {
                // Mock implementation - return success
                return Ok(new { success = true, data = new { id = 1, message = "Menu item created successfully" } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating menu item");
                return StatusCode(500, new { success = false, message = "Error creating menu item" });
            }
        }

        [HttpPut("menu-items/{id}")]
        public IActionResult UpdateMenuItem(int id, [FromBody] dynamic itemData)
        {
            try
            {
                // Mock implementation - return success
                return Ok(new { success = true, message = "Menu item updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating menu item");
                return StatusCode(500, new { success = false, message = "Error updating menu item" });
            }
        }

        [HttpDelete("menu-items/{id}")]
        public IActionResult DeleteMenuItem(int id)
        {
            try
            {
                // Mock implementation - return success
                return Ok(new { success = true, message = "Menu item deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting menu item");
                return StatusCode(500, new { success = false, message = "Error deleting menu item" });
            }
        }

    }
}