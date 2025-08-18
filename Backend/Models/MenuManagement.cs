// Models/MenuManagement.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    // Role model for dynamic role management
    public class Role
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(100)]
        public string DisplayName { get; set; } = string.Empty;
        
        [StringLength(200)]
        public string Description { get; set; } = string.Empty;
        
        public int Level { get; set; } // 0=Public, 1=User, 2=Developer, 3=Admin
        
        [StringLength(50)]
        public string Color { get; set; } = "text-gray-600 bg-gray-100";
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public virtual ICollection<UserRoleAssignment> UserRoles { get; set; } = new List<UserRoleAssignment>();
        public virtual ICollection<MenuPermission> MenuPermissions { get; set; } = new List<MenuPermission>();
        public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }

    // Permission model
    public class Permission
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(200)]
        public string Description { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string Category { get; set; } = string.Empty; // e.g., "menu", "action", "data"
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
        public virtual ICollection<MenuPermission> MenuPermissions { get; set; } = new List<MenuPermission>();
    }

    // Menu group model
    public class MenuGroup
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Title { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string Icon { get; set; } = string.Empty;
        
        public int SortOrder { get; set; } = 0;
        
        public int? MinRoleLevel { get; set; } // Minimum role level required
        
        public bool IsActive { get; set; } = true;
        
        public bool RequiresDeveloperMode { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public virtual ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
    }

    // Menu item model
    public class MenuItem
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        [StringLength(200)]
        public string Url { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string Icon { get; set; } = string.Empty;
        
        public int SortOrder { get; set; } = 0;
        
        public int? MinRoleLevel { get; set; } // Minimum role level required
        
        public bool IsActive { get; set; } = true;
        
        public bool RequiresDeveloperMode { get; set; } = false;
        
        [StringLength(50)]
        public string? BadgeText { get; set; }
        
        [StringLength(20)]
        public string? BadgeVariant { get; set; } = "default";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        // Foreign keys
        public int MenuGroupId { get; set; }
        
        // Navigation properties
        [ForeignKey("MenuGroupId")]
        public virtual MenuGroup MenuGroup { get; set; } = null!;
        public virtual ICollection<MenuPermission> MenuPermissions { get; set; } = new List<MenuPermission>();
    }

    // Menu permission junction table
    public class MenuPermission
    {
        [Key]
        public int Id { get; set; }
        
        public int? MenuItemId { get; set; }
        public int? MenuGroupId { get; set; }
        public int? RoleId { get; set; }
        public int? PermissionId { get; set; }
        
        public bool IsRequired { get; set; } = true; // If true, all permissions must be met
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        [ForeignKey("MenuItemId")]
        public virtual MenuItem? MenuItem { get; set; }
        
        [ForeignKey("MenuGroupId")]
        public virtual MenuGroup? MenuGroup { get; set; }
        
        [ForeignKey("RoleId")]
        public virtual Role? Role { get; set; }
        
        [ForeignKey("PermissionId")]
        public virtual Permission? Permission { get; set; }
    }

    // User role assignment junction table
    public class UserRoleAssignment
    {
        [Key]
        public int Id { get; set; }
        
        public int UserId { get; set; }
        public int RoleId { get; set; }
        
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ExpiresAt { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        public virtual User User { get; set; } = null!;
        
        [ForeignKey("RoleId")]
        public virtual Role Role { get; set; } = null!;
    }

    // Role permission junction table
    public class RolePermission
    {
        [Key]
        public int Id { get; set; }
        
        public int RoleId { get; set; }
        public int PermissionId { get; set; }
        
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        [ForeignKey("RoleId")]
        public virtual Role Role { get; set; } = null!;
        
        [ForeignKey("PermissionId")]
        public virtual Permission Permission { get; set; } = null!;
    }

    // DTOs for API responses
    public class MenuGroupDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public int? MinRoleLevel { get; set; }
        public bool RequiresDeveloperMode { get; set; }
        public List<MenuItemDto> Items { get; set; } = new();
    }

    public class MenuItemDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public int? MinRoleLevel { get; set; }
        public bool RequiresDeveloperMode { get; set; }
        public string? BadgeText { get; set; }
        public string? BadgeVariant { get; set; }
    }

    public class RoleDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Level { get; set; }
        public string Color { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public List<string> Permissions { get; set; } = new();
    }

    public class UserMenuResponse
    {
        public List<MenuGroupDto> MenuGroups { get; set; } = new();
        public RoleDto UserRole { get; set; } = new();
        public bool IsDeveloperMode { get; set; }
        public List<string> UserPermissions { get; set; } = new();
    }
}