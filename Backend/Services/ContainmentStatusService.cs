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
        private readonly IEmergencyReportService _emergencyReportService;

        public ContainmentStatusService(
            AppDbContext context, 
            ILogger<ContainmentStatusService> logger,
            IEmergencyReportService emergencyReportService)
        {
            _context = context;
            _logger = logger;
            _emergencyReportService = emergencyReportService;
        }

        public async Task<ContainmentStatus?> GetStatusByContainmentIdAsync(int containmentId)
        {
            return await _context.ContainmentStatuses
                .Include(cs => cs.Containment)
                .FirstOrDefaultAsync(cs => cs.ContainmentId == containmentId);
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

            // Try to find existing status record for this containment
            var existingStatus = await _context.ContainmentStatuses
                .FirstOrDefaultAsync(cs => cs.ContainmentId == status.ContainmentId);

            if (existingStatus != null)
            {
                // UPDATE existing record
                existingStatus.LightingStatus = status.LightingStatus;
                existingStatus.EmergencyStatus = status.EmergencyStatus;
                existingStatus.SmokeDetectorStatus = status.SmokeDetectorStatus;
                existingStatus.FssStatus = status.FssStatus;
                existingStatus.EmergencyButtonState = status.EmergencyButtonState;
                existingStatus.SelenoidStatus = status.SelenoidStatus;
                existingStatus.LimitSwitchFrontDoorStatus = status.LimitSwitchFrontDoorStatus;
                existingStatus.LimitSwitchBackDoorStatus = status.LimitSwitchBackDoorStatus;
                existingStatus.OpenFrontDoorStatus = status.OpenFrontDoorStatus;
                existingStatus.OpenBackDoorStatus = status.OpenBackDoorStatus;
                existingStatus.EmergencyTemp = status.EmergencyTemp;
                existingStatus.MqttTimestamp = status.MqttTimestamp;
                existingStatus.UpdatedAt = DateTime.UtcNow;
                existingStatus.RawPayload = status.RawPayload;

                _context.ContainmentStatuses.Update(existingStatus);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"ContainmentStatus UPDATED for ContainmentId: {status.ContainmentId} at {status.MqttTimestamp}");
                return existingStatus;
            }
            else
            {
                // CREATE new record if doesn't exist (first time)
                status.CreatedAt = DateTime.UtcNow;
                status.UpdatedAt = DateTime.UtcNow;

                _context.ContainmentStatuses.Add(status);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"ContainmentStatus CREATED for ContainmentId: {status.ContainmentId} at {status.MqttTimestamp}");
                return status;
            }
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

                // Process emergency status untuk reporting
                await ProcessEmergencyStatuses(payloadData, jsonPayload);

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

        public async Task<IEnumerable<ContainmentStatus>> GetAllStatusesAsync()
        {
            return await _context.ContainmentStatuses
                .Include(cs => cs.Containment)
                .ToListAsync();
        }

        public async Task<ContainmentStatus> InitializeDefaultStatusAsync(int containmentId)
        {
            // Check if status already exists
            var existingStatus = await GetStatusByContainmentIdAsync(containmentId);
            if (existingStatus != null)
            {
                return existingStatus;
            }

            // Check if containment exists
            var containmentExists = await _context.Containments
                .AnyAsync(c => c.Id == containmentId && c.IsActive);

            if (!containmentExists)
            {
                throw new ArgumentException($"Containment with ID {containmentId} not found or inactive");
            }

            // Create default status record
            var defaultStatus = new ContainmentStatus
            {
                ContainmentId = containmentId,
                LightingStatus = false,
                EmergencyStatus = false,
                SmokeDetectorStatus = false,
                FssStatus = false,
                EmergencyButtonState = false,
                SelenoidStatus = false,
                LimitSwitchFrontDoorStatus = false,
                LimitSwitchBackDoorStatus = false,
                OpenFrontDoorStatus = false,
                OpenBackDoorStatus = false,
                EmergencyTemp = false,
                MqttTimestamp = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                RawPayload = "{\"status\":\"initialized\"}"
            };

            _context.ContainmentStatuses.Add(defaultStatus);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Default ContainmentStatus initialized for ContainmentId: {containmentId}");
            return defaultStatus;
        }

        private async Task ProcessEmergencyStatuses(JsonElement payloadData, string rawPayload)
        {
            try
            {
                // Process Smoke Detector
                if (payloadData.TryGetProperty("Smoke Detector status", out var smokeStatus))
                {
                    await _emergencyReportService.ProcessEmergencyStatusAsync("SmokeDetector", smokeStatus.GetBoolean(), rawPayload);
                }

                // Process FSS (Fire Suppression System)
                if (payloadData.TryGetProperty("FSS status", out var fssStatus))
                {
                    await _emergencyReportService.ProcessEmergencyStatusAsync("FSS", fssStatus.GetBoolean(), rawPayload);
                }

                // Process Emergency Button
                if (payloadData.TryGetProperty("Emergency Button State", out var emergencyButtonStatus))
                {
                    await _emergencyReportService.ProcessEmergencyStatusAsync("EmergencyButton", emergencyButtonStatus.GetBoolean(), rawPayload);
                }

                // Process Emergency Temperature
                if (payloadData.TryGetProperty("Emergency temp", out var emergencyTempStatus))
                {
                    await _emergencyReportService.ProcessEmergencyStatusAsync("EmergencyTemp", emergencyTempStatus.GetBoolean(), rawPayload);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing emergency statuses from MQTT payload");
                // Don't throw - we don't want to break the main status processing
            }
        }
    }
}