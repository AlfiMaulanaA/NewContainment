using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using System.Text.Json;

namespace Backend.Services
{
    public class ContainmentStatusService : IContainmentStatusService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ContainmentStatusService> _logger;

        public ContainmentStatusService(AppDbContext context, ILogger<ContainmentStatusService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ContainmentStatus?> GetLatestStatusByContainmentIdAsync(int containmentId)
        {
            return await _context.ContainmentStatuses
                .Include(cs => cs.Containment)
                .Where(cs => cs.ContainmentId == containmentId)
                .OrderByDescending(cs => cs.MqttTimestamp)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<ContainmentStatus>> GetStatusHistoryByContainmentIdAsync(int containmentId, int limit = 100)
        {
            return await _context.ContainmentStatuses
                .Include(cs => cs.Containment)
                .Where(cs => cs.ContainmentId == containmentId)
                .OrderByDescending(cs => cs.MqttTimestamp)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<ContainmentStatus> CreateOrUpdateStatusAsync(ContainmentStatus status)
        {
            // Check if this containment exists
            var containmentExists = await _context.Containments
                .AnyAsync(c => c.Id == status.ContainmentId && c.IsActive);

            if (!containmentExists)
            {
                throw new ArgumentException($"Containment with ID {status.ContainmentId} not found or inactive");
            }

            // Always create a new record for status history
            status.CreatedAt = DateTime.UtcNow;
            status.UpdatedAt = DateTime.UtcNow;

            _context.ContainmentStatuses.Add(status);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"ContainmentStatus created for ContainmentId: {status.ContainmentId} at {status.MqttTimestamp}");

            return status;
        }

        public async Task<ContainmentStatus> ProcessMqttPayloadAsync(int containmentId, string jsonPayload)
        {
            _logger.LogInformation($"Processing MQTT payload for ContainmentId: {containmentId}");

            try
            {
                var payloadData = JsonSerializer.Deserialize<JsonElement>(jsonPayload);
                
                var status = new ContainmentStatus
                {
                    ContainmentId = containmentId,
                    RawPayload = jsonPayload
                };

                // Parse the JSON payload to map to database fields
                if (payloadData.TryGetProperty("Lighting status", out var lightingStatus))
                    status.LightingStatus = lightingStatus.GetBoolean();

                if (payloadData.TryGetProperty("Emergency status", out var emergencyStatus))
                    status.EmergencyStatus = emergencyStatus.GetBoolean();

                if (payloadData.TryGetProperty("Smoke Detector status", out var smokeDetectorStatus))
                    status.SmokeDetectorStatus = smokeDetectorStatus.GetBoolean();

                if (payloadData.TryGetProperty("FSS status", out var fssStatus))
                    status.FssStatus = fssStatus.GetBoolean();

                if (payloadData.TryGetProperty("Emergency Button State", out var emergencyButtonState))
                    status.EmergencyButtonState = emergencyButtonState.GetBoolean();

                if (payloadData.TryGetProperty("selenoid status", out var selenoidStatus))
                    status.SelenoidStatus = selenoidStatus.GetBoolean();

                if (payloadData.TryGetProperty("limit switch front door status", out var limitSwitchFrontDoorStatus))
                    status.LimitSwitchFrontDoorStatus = limitSwitchFrontDoorStatus.GetBoolean();

                if (payloadData.TryGetProperty("limit switch back door status", out var limitSwitchBackDoorStatus))
                    status.LimitSwitchBackDoorStatus = limitSwitchBackDoorStatus.GetBoolean();

                if (payloadData.TryGetProperty("open front door status", out var openFrontDoorStatus))
                    status.OpenFrontDoorStatus = openFrontDoorStatus.GetBoolean();

                if (payloadData.TryGetProperty("open back door status", out var openBackDoorStatus))
                    status.OpenBackDoorStatus = openBackDoorStatus.GetBoolean();

                if (payloadData.TryGetProperty("Emergency temp", out var emergencyTemp))
                    status.EmergencyTemp = emergencyTemp.GetBoolean();

                // Parse timestamp
                if (payloadData.TryGetProperty("Timestamp", out var timestamp))
                {
                    if (DateTime.TryParse(timestamp.GetString(), out var parsedTimestamp))
                    {
                        status.MqttTimestamp = parsedTimestamp;
                    }
                    else
                    {
                        status.MqttTimestamp = DateTime.UtcNow;
                        _logger.LogWarning($"Failed to parse timestamp from MQTT payload: {timestamp.GetString()}. Using current time.");
                    }
                }
                else
                {
                    status.MqttTimestamp = DateTime.UtcNow;
                    _logger.LogWarning("No timestamp found in MQTT payload. Using current time.");
                }

                return await CreateOrUpdateStatusAsync(status);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, $"Failed to parse MQTT JSON payload: {jsonPayload}");
                throw new ArgumentException("Invalid JSON payload", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing MQTT payload for ContainmentId: {containmentId}");
                throw;
            }
        }

        public async Task<IEnumerable<ContainmentStatus>> GetAllLatestStatusesAsync()
        {
            // Get the latest status for each containment
            var latestStatuses = await _context.ContainmentStatuses
                .Include(cs => cs.Containment)
                .GroupBy(cs => cs.ContainmentId)
                .Select(g => g.OrderByDescending(cs => cs.MqttTimestamp).First())
                .ToListAsync();

            return latestStatuses;
        }

        public async Task<bool> DeleteOldStatusesAsync(DateTime cutoffDate)
        {
            try
            {
                var oldStatuses = await _context.ContainmentStatuses
                    .Where(cs => cs.CreatedAt < cutoffDate)
                    .ToListAsync();

                if (oldStatuses.Any())
                {
                    _context.ContainmentStatuses.RemoveRange(oldStatuses);
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation($"Deleted {oldStatuses.Count} old containment status records before {cutoffDate}");
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting old containment statuses before {cutoffDate}");
                throw;
            }
        }
    }
}