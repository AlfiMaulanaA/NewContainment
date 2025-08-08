using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

public class CctvCamera
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(45)]
    public string Ip { get; set; } = string.Empty;

    [Required]
    [Range(1, 65535)]
    public int Port { get; set; } = 554;

    [StringLength(100)]
    public string? Username { get; set; }

    [StringLength(100)]
    public string? Password { get; set; }

    [Required]
    [StringLength(500)]
    public string StreamUrl { get; set; } = string.Empty;

    public int? ContainmentId { get; set; }
    [ForeignKey("ContainmentId")]
    public virtual Containment? Containment { get; set; }

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// DTO for CCTV operations
public class CctvCameraDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Ip { get; set; } = string.Empty;
    public int Port { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string StreamUrl { get; set; } = string.Empty;
    public int? ContainmentId { get; set; }
    public string? ContainmentName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// DTO for creating/updating CCTV
public class CreateUpdateCctvCameraDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(45)]
    public string Ip { get; set; } = string.Empty;

    [Required]
    [Range(1, 65535)]
    public int Port { get; set; } = 554;

    [StringLength(100)]
    public string? Username { get; set; }

    [StringLength(100)]
    public string? Password { get; set; }

    [Required]
    [StringLength(500)]
    public string StreamUrl { get; set; } = string.Empty;

    public int? ContainmentId { get; set; }
}