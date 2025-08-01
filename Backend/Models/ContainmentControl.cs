using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class ContainmentControl
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int ContainmentId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Command { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
        
        public int ExecutedBy { get; set; }
        
        [StringLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Sent, Failed
        
        [StringLength(255)]
        public string? ErrorMessage { get; set; }
        
        // Navigation properties
        public Containment? Containment { get; set; }
        public User? ExecutedByUser { get; set; }
    }
    
    public enum ContainmentControlType
    {
        FrontDoor,
        BackDoor,
        FrontDoorAlways,
        BackDoorAlways,
        Ceiling
    }
    
    public enum ControlAction
    {
        Enable,
        Disable,
        Open,
        Close
    }
    
    public class ContainmentControlRequest
    {
        public int ContainmentId { get; set; }
        public ContainmentControlType ControlType { get; set; }
        public ControlAction Action { get; set; }
        public string? Description { get; set; }
    }
    
    public class ToggleControlRequest
    {
        public int ContainmentId { get; set; }
        public string ControlType { get; set; } = string.Empty; // "front_door", "back_door", etc.
        public bool IsEnabled { get; set; }
    }
    
    public class ContainmentControlResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public ContainmentControl? Data { get; set; }
    }
}