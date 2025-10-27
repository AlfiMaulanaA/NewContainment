using Backend.Models;

namespace Backend.Services
{
    public interface ICapacityService
    {
        Task<RackCapacityInfo> GetRackCapacityAsync(int rackId);
        Task<List<RackCapacityInfo>> GetAllRackCapacitiesAsync();
        Task<CapacitySummary> GetCapacitySummaryAsync();
        Task<List<CapacityAlert>> GetCapacityAlertsAsync();
        Task<CapacityPlanningResult> PlanCapacityAsync(CapacityPlanningRequest request);
    }

    public class RackCapacityInfo
    {
        public int RackId { get; set; }
        public string RackName { get; set; } = string.Empty;
        public int TotalCapacityU { get; set; }
        public int UsedCapacityU { get; set; }
        public int AvailableCapacityU => TotalCapacityU - UsedCapacityU;
        public decimal UtilizationPercentage => TotalCapacityU > 0 
            ? Math.Round((decimal)UsedCapacityU / TotalCapacityU * 100, 2) 
            : 0;
        public List<DeviceCapacityInfo> Devices { get; set; } = new();
    }

    public class DeviceCapacityInfo
    {
        public int DeviceId { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = string.Empty;
        public int UCapacity { get; set; }
    }

    public class CapacitySummary
    {
        public int TotalRacks { get; set; }
        public int TotalCapacityU { get; set; }
        public int TotalUsedU { get; set; }
        public int TotalAvailableU => TotalCapacityU - TotalUsedU;
        public decimal AverageUtilization { get; set; }
        public int TotalDevices { get; set; }
        public List<CapacityByType> CapacityByType { get; set; } = new();
    }

    public class CapacityByType
    {
        public string Type { get; set; } = string.Empty;
        public int Count { get; set; }
        public int UsedCapacityU { get; set; }
    }

    public class CapacityAlert
    {
        public int Id { get; set; }
        public string Type { get; set; } = "capacity";
        public string Severity { get; set; } = "medium";
        public string Message { get; set; } = string.Empty;
        public int? RackId { get; set; }
        public int? DeviceId { get; set; }
        public decimal Threshold { get; set; }
        public decimal CurrentValue { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class CapacityPlanningRequest
    {
        public string DeviceType { get; set; } = string.Empty;
        public int UCapacity { get; set; }
        public int Quantity { get; set; }
    }

    public class CapacityPlanningResult
    {
        public bool CanAccommodate { get; set; }
        public List<SuggestedRack> SuggestedRacks { get; set; } = new();
        public List<string> Constraints { get; set; } = new();
    }

    public class SuggestedRack
    {
        public int RackId { get; set; }
        public string RackName { get; set; } = string.Empty;
        public int AvailableCapacityU { get; set; }
    }
}