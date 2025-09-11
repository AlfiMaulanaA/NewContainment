using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class RackCapacity
    {
        public int Id { get; set; }

        [Required]
        public int RackId { get; set; }

        [Required]
        public int TotalCapacityU { get; set; }

        public int UsedCapacityU { get; set; }

        public int AvailableCapacityU => TotalCapacityU - UsedCapacityU;

        public decimal UtilizationPercentage => TotalCapacityU > 0 
            ? Math.Round((decimal)UsedCapacityU / TotalCapacityU * 100, 2) 
            : 0;

        // Power capacity tracking
        public int? PowerCapacityW { get; set; }
        public int? UsedPowerW { get; set; }
        public int? AvailablePowerW => PowerCapacityW.HasValue && UsedPowerW.HasValue 
            ? PowerCapacityW.Value - UsedPowerW.Value 
            : null;
        
        public decimal? PowerUtilizationPercentage => PowerCapacityW.HasValue && PowerCapacityW.Value > 0 && UsedPowerW.HasValue
            ? Math.Round((decimal)UsedPowerW.Value / PowerCapacityW.Value * 100, 2)
            : null;

        // Weight capacity tracking
        public decimal? WeightCapacityKg { get; set; }
        public decimal? UsedWeightKg { get; set; }
        public decimal? AvailableWeightKg => WeightCapacityKg.HasValue && UsedWeightKg.HasValue 
            ? WeightCapacityKg.Value - UsedWeightKg.Value 
            : null;
        
        public decimal? WeightUtilizationPercentage => WeightCapacityKg.HasValue && WeightCapacityKg.Value > 0 && UsedWeightKg.HasValue
            ? Math.Round(UsedWeightKg.Value / WeightCapacityKg.Value * 100, 2)
            : null;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Rack? Rack { get; set; }
    }
}