using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class CapacityService : ICapacityService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<CapacityService> _logger;

        public CapacityService(AppDbContext context, ILogger<CapacityService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<RackCapacityInfo> GetRackCapacityAsync(int rackId)
        {
            try
            {
                var rack = await _context.Racks
                    .Include(r => r.Devices.Where(d => d.IsActive))
                    .FirstOrDefaultAsync(r => r.Id == rackId && r.IsActive);

                if (rack == null)
                {
                    throw new ArgumentException($"Rack with ID {rackId} not found");
                }

                var devices = rack.Devices
                    .Where(d => d.UCapacity.HasValue)
                    .Select(d => new DeviceCapacityInfo
                    {
                        DeviceId = d.Id,
                        DeviceName = d.Name,
                        DeviceType = d.Type,
                        UCapacity = d.UCapacity ?? 0
                    })
                    .ToList();

                var usedCapacityU = devices.Sum(d => d.UCapacity);

                return new RackCapacityInfo
                {
                    RackId = rack.Id,
                    RackName = rack.Name,
                    TotalCapacityU = rack.CapacityU,
                    UsedCapacityU = usedCapacityU,
                    Devices = devices
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting rack capacity for rack ID {RackId}", rackId);
                throw;
            }
        }

        public async Task<List<RackCapacityInfo>> GetAllRackCapacitiesAsync()
        {
            try
            {
                var racks = await _context.Racks
                    .Include(r => r.Devices.Where(d => d.IsActive))
                    .Where(r => r.IsActive)
                    .ToListAsync();

                var rackCapacities = new List<RackCapacityInfo>();

                foreach (var rack in racks)
                {
                    var devices = rack.Devices
                        .Where(d => d.UCapacity.HasValue)
                        .Select(d => new DeviceCapacityInfo
                        {
                            DeviceId = d.Id,
                            DeviceName = d.Name,
                            DeviceType = d.Type,
                            UCapacity = d.UCapacity ?? 0
                        })
                        .ToList();

                    var usedCapacityU = devices.Sum(d => d.UCapacity);

                    rackCapacities.Add(new RackCapacityInfo
                    {
                        RackId = rack.Id,
                        RackName = rack.Name,
                        TotalCapacityU = rack.CapacityU,
                        UsedCapacityU = usedCapacityU,
                        Devices = devices
                    });
                }

                return rackCapacities;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all rack capacities");
                throw;
            }
        }

        public async Task<CapacitySummary> GetCapacitySummaryAsync()
        {
            try
            {
                var rackCapacities = await GetAllRackCapacitiesAsync();

                var totalRacks = rackCapacities.Count;
                var totalCapacityU = rackCapacities.Sum(r => r.TotalCapacityU);
                var totalUsedU = rackCapacities.Sum(r => r.UsedCapacityU);
                var totalDevices = rackCapacities.Sum(r => r.Devices.Count);

                var averageUtilization = totalRacks > 0 
                    ? Math.Round(rackCapacities.Average(r => r.UtilizationPercentage), 2)
                    : 0;

                // Capacity by device type
                var capacityByType = rackCapacities
                    .SelectMany(r => r.Devices)
                    .GroupBy(d => d.DeviceType)
                    .Select(g => new CapacityByType
                    {
                        Type = g.Key,
                        Count = g.Count(),
                        UsedCapacityU = g.Sum(d => d.UCapacity)
                    })
                    .ToList();

                return new CapacitySummary
                {
                    TotalRacks = totalRacks,
                    TotalCapacityU = totalCapacityU,
                    TotalUsedU = totalUsedU,
                    AverageUtilization = averageUtilization,
                    TotalDevices = totalDevices,
                    CapacityByType = capacityByType
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting capacity summary");
                throw;
            }
        }

        public async Task<List<CapacityAlert>> GetCapacityAlertsAsync()
        {
            try
            {
                var alerts = new List<CapacityAlert>();
                var rackCapacities = await GetAllRackCapacitiesAsync();

                foreach (var rack in rackCapacities)
                {
                    // High utilization alert (>= 80%)
                    if (rack.UtilizationPercentage >= 80)
                    {
                        var severity = rack.UtilizationPercentage >= 95 ? "critical" :
                                     rack.UtilizationPercentage >= 90 ? "high" : "medium";

                        alerts.Add(new CapacityAlert
                        {
                            Id = alerts.Count + 1,
                            Type = "capacity",
                            Severity = severity,
                            Message = $"{rack.RackName} is at {rack.UtilizationPercentage}% capacity utilization",
                            RackId = rack.RackId,
                            Threshold = 80,
                            CurrentValue = rack.UtilizationPercentage,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = true
                        });
                    }

                    // Low available space alert (< 5U remaining)
                    if (rack.AvailableCapacityU < 5 && rack.AvailableCapacityU > 0)
                    {
                        alerts.Add(new CapacityAlert
                        {
                            Id = alerts.Count + 1,
                            Type = "capacity",
                            Severity = "medium",
                            Message = $"{rack.RackName} has only {rack.AvailableCapacityU}U remaining",
                            RackId = rack.RackId,
                            Threshold = 5,
                            CurrentValue = rack.AvailableCapacityU,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = true
                        });
                    }

                    // Full capacity alert
                    if (rack.AvailableCapacityU == 0)
                    {
                        alerts.Add(new CapacityAlert
                        {
                            Id = alerts.Count + 1,
                            Type = "capacity",
                            Severity = "critical",
                            Message = $"{rack.RackName} is at full capacity",
                            RackId = rack.RackId,
                            Threshold = 100,
                            CurrentValue = 100,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = true
                        });
                    }
                }

                return alerts.OrderByDescending(a => a.CurrentValue).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting capacity alerts");
                throw;
            }
        }

        public async Task<CapacityPlanningResult> PlanCapacityAsync(CapacityPlanningRequest request)
        {
            try
            {
                var rackCapacities = await GetAllRackCapacitiesAsync();
                var totalRequiredU = request.UCapacity * request.Quantity;

                var suggestedRacks = rackCapacities
                    .Where(r => r.AvailableCapacityU >= request.UCapacity)
                    .Select(r => new SuggestedRack
                    {
                        RackId = r.RackId,
                        RackName = r.RackName,
                        AvailableCapacityU = r.AvailableCapacityU
                    })
                    .OrderByDescending(r => r.AvailableCapacityU)
                    .ToList();

                var totalAvailableU = suggestedRacks.Sum(r => r.AvailableCapacityU);
                var canAccommodate = totalAvailableU >= totalRequiredU;

                var constraints = new List<string>();
                if (!canAccommodate)
                {
                    constraints.Add($"Insufficient rack space. Required: {totalRequiredU}U, Available: {totalAvailableU}U");
                }

                if (suggestedRacks.Count == 0 && request.UCapacity > 0)
                {
                    constraints.Add($"No racks can accommodate devices requiring {request.UCapacity}U");
                }

                return new CapacityPlanningResult
                {
                    CanAccommodate = canAccommodate,
                    SuggestedRacks = suggestedRacks.Take(5).ToList(), // Limit to top 5 suggestions
                    Constraints = constraints
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error planning capacity for request {@Request}", request);
                throw;
            }
        }
    }
}