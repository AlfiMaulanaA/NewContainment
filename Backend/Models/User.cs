using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Enums;

namespace Backend.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [StringLength(20)]
        public string? PhoneNumber { get; set; }

        [StringLength(500)]
        public string? PhotoPath { get; set; }

        [Required]
        [StringLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        // Legacy enum role - kept for backward compatibility during migration
        [Required]
        public UserRole Role { get; set; } = UserRole.User;

        // New database-based role relationship
        public int? RoleId { get; set; }

        [ForeignKey("RoleId")]
        public virtual Role? DatabaseRole { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsActive { get; set; } = true;

        // Helper property to get the effective role (database role takes precedence)
        [NotMapped]
        public Role? EffectiveRole => DatabaseRole;

        // Helper property to get role name for compatibility
        [NotMapped]
        public string RoleName => DatabaseRole?.Name ?? Role.ToString();

        // Helper property to get role level
        [NotMapped]
        public int RoleLevel => DatabaseRole?.Level ?? (int)Role;
    }
}