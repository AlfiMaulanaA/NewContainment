using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.Enums;
using System.Text.Json;

namespace Backend.Services
{
    public class ContainmentControlService : IContainmentControlService
    {
        private readonly AppDbContext _context;
        private readonly IMqttService _mqttService;
        private readonly IAccessLogService _accessLogService;
        private readonly ILogger<ContainmentControlService> _logger;
        private const string CONTROL_TOPIC = "IOT/Containment/Control";

        public ContainmentControlService(
            AppDbContext context,
            IMqttService mqttService,
            IAccessLogService accessLogService,
            ILogger<ContainmentControlService> logger)
        {
            _context = context;
            _mqttService = mqttService;
            _accessLogService = accessLogService;
            _logger = logger;
        }

        public async Task<ContainmentControlResponse> SendToggleCommandAsync(ToggleControlRequest request, int userId)
        {
            try
            {
                List<Containment> targetContainments;
                
                if (request.ContainmentId == 0)
                {
                    // Control all active containments
                    targetContainments = await _context.Containments
                        .Where(c => c.IsActive)
                        .ToListAsync();
                        
                    if (!targetContainments.Any())
                    {
                        return new ContainmentControlResponse
                        {
                            Success = false,
                            Message = "No active containments found"
                        };
                    }
                }
                else
                {
                    // Control specific containment
                    var containment = await _context.Containments
                        .FirstOrDefaultAsync(c => c.Id == request.ContainmentId && c.IsActive);

                    if (containment == null)
                    {
                        return new ContainmentControlResponse
                        {
                            Success = false,
                            Message = $"Containment with ID {request.ContainmentId} not found or inactive"
                        };
                    }
                    
                    targetContainments = new List<Containment> { containment };
                }

                // Get MQTT payload for toggle command
                var commandPayload = await GetMqttTogglePayload(request.ControlType, request.IsEnabled);

                // Create control records for each target containment
                var controlRecords = new List<ContainmentControl>();
                var successCount = 0;
                var failedContainments = new List<string>();

                foreach (var containment in targetContainments)
                {
                    var controlRecord = new ContainmentControl
                    {
                        ContainmentId = containment.Id,
                        Command = $"{request.ControlType}_{(request.IsEnabled ? "enable" : "disable")}",
                        Description = GetToggleDescription(request.ControlType, request.IsEnabled),
                        ExecutedAt = DateTime.UtcNow,
                        ExecutedBy = userId,
                        Status = "Pending"
                    };

                    _context.ContainmentControls.Add(controlRecord);
                    controlRecords.Add(controlRecord);
                }

                await _context.SaveChangesAsync();

                // Send MQTT command to each containment
                foreach (var controlRecord in controlRecords)
                {
                    try
                    {
                        // Send MQTT command with containment-specific topic if needed
                        await _mqttService.PublishAsync(CONTROL_TOPIC, commandPayload);
                        
                        // Update status to sent
                        controlRecord.Status = "Sent";
                        successCount++;

                        // Log access for software-based control
                        try
                        {
                            var user = await _context.Users.FindAsync(userId);
                            var userName = user?.Name ?? $"User {userId}";
                            var containmentName = targetContainments.FirstOrDefault(c => c.Id == controlRecord.ContainmentId)?.Name ?? $"Containment {controlRecord.ContainmentId}";
                            var trigger = $"{GetToggleDescription(request.ControlType, request.IsEnabled)} - {containmentName}";
                            var additionalData = JsonSerializer.Serialize(new 
                            { 
                                ContainmentId = controlRecord.ContainmentId,
                                Command = controlRecord.Command,
                                ControlType = request.ControlType,
                                IsEnabled = request.IsEnabled 
                            });

                            await _accessLogService.LogSoftwareAccessAsync(userName, trigger, additionalData);
                        }
                        catch (Exception logEx)
                        {
                            _logger.LogWarning(logEx, "Failed to create access log for containment control");
                        }

                        _logger.LogInformation($"Toggle command {request.ControlType}={request.IsEnabled} sent successfully for ContainmentId: {controlRecord.ContainmentId}");
                    }
                    catch (Exception mqttEx)
                    {
                        // Update status to failed
                        controlRecord.Status = "Failed";
                        controlRecord.ErrorMessage = mqttEx.Message;
                        
                        var containment = targetContainments.FirstOrDefault(c => c.Id == controlRecord.ContainmentId);
                        failedContainments.Add(containment?.Name ?? $"ID {controlRecord.ContainmentId}");

                        _logger.LogError(mqttEx, $"Failed to send MQTT toggle command {request.ControlType} for ContainmentId: {controlRecord.ContainmentId}");
                    }
                }

                await _context.SaveChangesAsync();

                // Return response based on results
                if (successCount == targetContainments.Count)
                {
                    var description = request.ContainmentId == 0 
                        ? $"Control '{GetToggleDescription(request.ControlType, request.IsEnabled)}' sent to all {successCount} containments"
                        : $"Control '{GetToggleDescription(request.ControlType, request.IsEnabled)}' sent successfully";
                        
                    return new ContainmentControlResponse
                    {
                        Success = true,
                        Message = description,
                        Data = controlRecords.FirstOrDefault()
                    };
                }
                else if (successCount > 0)
                {
                    return new ContainmentControlResponse
                    {
                        Success = true,
                        Message = $"Control sent to {successCount}/{targetContainments.Count} containments. Failed: {string.Join(", ", failedContainments)}",
                        Data = controlRecords.FirstOrDefault()
                    };
                }
                else
                {
                    return new ContainmentControlResponse
                    {
                        Success = false,
                        Message = $"Failed to send control to all containments: {string.Join(", ", failedContainments)}",
                        Data = controlRecords.FirstOrDefault()
                    };
                }
            }
            catch (Exception ex)
            {
                var containmentInfo = request.ContainmentId == 0 ? "all containments" : $"ContainmentId: {request.ContainmentId}";
                _logger.LogError(ex, $"Error processing toggle command {request.ControlType} for {containmentInfo}");
                
                return new ContainmentControlResponse
                {
                    Success = false,
                    Message = $"Internal error: {ex.Message}"
                };
            }
        }

        public Task<string> GetMqttTogglePayload(string controlType, bool isEnabled)
        {
            // Based on prompt file format
            var commandData = controlType.ToLower() switch
            {
                "front_door" => isEnabled ? "Open front door" : "Close front door",
                "back_door" => isEnabled ? "Open back door" : "Close back door", 
                "front_door_always" => isEnabled ? "Open front door always enable" : "Open front door always disable",
                "back_door_always" => isEnabled ? "Open back door always enable" : "Open back door always disable",
                "ceiling" => isEnabled ? "Open Ceiiling" : "Close Ceiiling",
                _ => throw new ArgumentException($"Unknown control type: {controlType}")
            };

            var payload = new
            {
                data = commandData,
                timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                controlType = controlType,
                enabled = isEnabled
            };

            return Task.FromResult(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        }

        public async Task<IEnumerable<ContainmentControl>> GetControlHistoryAsync(int containmentId, int limit = 50)
        {
            return await _context.ContainmentControls
                .Include(cc => cc.Containment)
                .Include(cc => cc.ExecutedByUser)
                .Where(cc => cc.ContainmentId == containmentId)
                .OrderByDescending(cc => cc.ExecutedAt)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<IEnumerable<ContainmentControl>> GetAllControlHistoryAsync(int limit = 100)
        {
            return await _context.ContainmentControls
                .Include(cc => cc.Containment)
                .Include(cc => cc.ExecutedByUser)
                .OrderByDescending(cc => cc.ExecutedAt)
                .Take(limit)
                .ToListAsync();
        }

        private string GetToggleDescription(string controlType, bool isEnabled)
        {
            var action = isEnabled ? "Enable" : "Disable";
            return controlType.ToLower() switch
            {
                "front_door" => $"{action} Front Door",
                "back_door" => $"{action} Back Door",
                "front_door_always" => $"{action} Front Door Always Open",
                "back_door_always" => $"{action} Back Door Always Open", 
                "ceiling" => $"{action} Ceiling",
                _ => $"{action} {controlType}"
            };
        }
    }
}