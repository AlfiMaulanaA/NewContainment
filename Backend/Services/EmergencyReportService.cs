using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Services
{
    public class EmergencyReportService : IEmergencyReportService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<EmergencyReportService> _logger;

        // State buffer untuk tracking status sebelumnya
        private static readonly Dictionary<string, bool> _previousStates = new();
        private static readonly object _lockObject = new();

        public EmergencyReportService(AppDbContext context, ILogger<EmergencyReportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ProcessEmergencyStatusAsync(string emergencyType, bool status, string rawPayload)
        {
            lock (_lockObject)
            {
                // Cek apakah ada perubahan status
                if (_previousStates.TryGetValue(emergencyType, out var previousStatus) && previousStatus == status)
                {
                    // Tidak ada perubahan, skip processing
                    return;
                }

                // Update state buffer
                _previousStates[emergencyType] = status;
            }

            try
            {
                if (status) // Emergency menjadi aktif
                {
                    await StartEmergencyAsync(emergencyType, rawPayload);
                }
                else // Emergency menjadi tidak aktif
                {
                    await EndEmergencyAsync(emergencyType, rawPayload);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing emergency status for {EmergencyType}", emergencyType);
                throw;
            }
        }

        private async Task StartEmergencyAsync(string emergencyType, string rawPayload)
        {
            // Cek apakah sudah ada emergency aktif untuk tipe ini
            var activeEmergency = await GetActiveEmergencyAsync(emergencyType);
            
            if (activeEmergency != null)
            {
                _logger.LogWarning("Emergency {EmergencyType} is already active since {StartTime}", 
                    emergencyType, activeEmergency.StartTime);
                return;
            }

            // Buat emergency report baru
            var emergency = new EmergencyReport
            {
                EmergencyType = emergencyType,
                Status = true,
                StartTime = DateTime.UtcNow,
                IsActive = true,
                RawMqttPayload = rawPayload,
                Notes = $"Emergency {emergencyType} started",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.EmergencyReports.Add(emergency);
            await _context.SaveChangesAsync();

            _logger.LogWarning("EMERGENCY STARTED: {EmergencyType} at {StartTime}", 
                emergencyType, emergency.StartTime);
        }

        private async Task EndEmergencyAsync(string emergencyType, string rawPayload)
        {
            var activeEmergency = await GetActiveEmergencyAsync(emergencyType);
            
            if (activeEmergency == null)
            {
                _logger.LogInformation("No active emergency found for {EmergencyType} to end", emergencyType);
                return;
            }

            // Update emergency record
            activeEmergency.Status = false;
            activeEmergency.IsActive = false;
            activeEmergency.EndTime = DateTime.UtcNow;
            activeEmergency.Duration = activeEmergency.EndTime - activeEmergency.StartTime;
            activeEmergency.UpdatedAt = DateTime.UtcNow;
            activeEmergency.Notes += $" | Emergency ended at {activeEmergency.EndTime}";

            _context.EmergencyReports.Update(activeEmergency);
            await _context.SaveChangesAsync();

            _logger.LogInformation("EMERGENCY ENDED: {EmergencyType} at {EndTime}. Duration: {Duration}", 
                emergencyType, activeEmergency.EndTime, activeEmergency.Duration);
        }

        public async Task<EmergencyReport?> GetActiveEmergencyAsync(string emergencyType)
        {
            return await _context.EmergencyReports
                .Where(er => er.EmergencyType == emergencyType && er.IsActive)
                .OrderByDescending(er => er.StartTime)
                .FirstOrDefaultAsync();
        }

        public async Task CloseActiveEmergencyAsync(string emergencyType)
        {
            var activeEmergency = await GetActiveEmergencyAsync(emergencyType);
            if (activeEmergency != null)
            {
                await EndEmergencyAsync(emergencyType, "Manual close");
            }
        }

        public async Task<IEnumerable<EmergencyReport>> GetEmergencyReportsAsync(EmergencyReportFilter filter)
        {
            var query = _context.EmergencyReports.AsQueryable();

            if (!string.IsNullOrEmpty(filter.EmergencyType))
            {
                query = query.Where(er => er.EmergencyType == filter.EmergencyType);
            }

            if (filter.StartDate.HasValue)
            {
                query = query.Where(er => er.StartTime >= filter.StartDate.Value);
            }

            if (filter.EndDate.HasValue)
            {
                query = query.Where(er => er.StartTime <= filter.EndDate.Value);
            }

            if (filter.IsActive.HasValue)
            {
                query = query.Where(er => er.IsActive == filter.IsActive.Value);
            }

            return await query
                .OrderByDescending(er => er.StartTime)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<EmergencyReportSummary>> GetEmergencyReportSummaryAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.EmergencyReports.AsQueryable();

            if (startDate.HasValue)
            {
                query = query.Where(er => er.StartTime >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(er => er.StartTime <= endDate.Value);
            }

            // Get basic summary data first
            var basicSummaries = await query
                .GroupBy(er => er.EmergencyType)
                .Select(g => new
                {
                    EmergencyType = g.Key,
                    TotalEvents = g.Count(),
                    LastEmergencyTime = g.Max(er => er.StartTime),
                    CurrentlyActive = g.Any(er => er.IsActive)
                })
                .ToListAsync();

            // Calculate total duration client-side for each emergency type
            var summaries = new List<EmergencyReportSummary>();
            
            foreach (var basicSummary in basicSummaries)
            {
                // Get all records for this emergency type to calculate duration
                var records = await query
                    .Where(er => er.EmergencyType == basicSummary.EmergencyType && er.Duration.HasValue)
                    .Select(er => er.Duration!.Value)
                    .ToListAsync();

                var totalDuration = records.Aggregate(TimeSpan.Zero, (sum, duration) => sum.Add(duration));

                var summary = new EmergencyReportSummary
                {
                    EmergencyType = basicSummary.EmergencyType,
                    TotalEvents = basicSummary.TotalEvents,
                    TotalDuration = totalDuration,
                    LastEmergencyTime = basicSummary.LastEmergencyTime,
                    CurrentlyActive = basicSummary.CurrentlyActive
                };

                // Add current active duration if applicable
                if (summary.CurrentlyActive)
                {
                    var activeEmergency = await GetActiveEmergencyAsync(summary.EmergencyType);
                    if (activeEmergency != null)
                    {
                        summary.CurrentActiveDuration = DateTime.UtcNow - activeEmergency.StartTime;
                    }
                }

                summaries.Add(summary);
            }

            return summaries;
        }
    }
}