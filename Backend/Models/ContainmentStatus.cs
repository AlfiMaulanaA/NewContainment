using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class ContainmentStatus
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int ContainmentId { get; set; }
        
        [ForeignKey("ContainmentId")]
        public Containment? Containment { get; set; }
        
        // Status fields from MQTT payload
        public bool LightingStatus { get; set; }
        public bool EmergencyStatus { get; set; }
        public bool SmokeDetectorStatus { get; set; }
        public bool FssStatus { get; set; }
        public bool EmergencyButtonState { get; set; }
        public bool SelenoidStatus { get; set; }
        public bool LimitSwitchFrontDoorStatus { get; set; }
        public bool LimitSwitchBackDoorStatus { get; set; }
        public bool OpenFrontDoorStatus { get; set; }
        public bool OpenBackDoorStatus { get; set; }
        public bool EmergencyTemp { get; set; }
        
        // MQTT timestamp
        public DateTime MqttTimestamp { get; set; }
        
        // System timestamps
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // Raw JSON payload for debugging/audit
        [Column(TypeName = "TEXT")]
        public string? RawPayload { get; set; }
    }
}