using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ScanConfigurationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMqttService _mqttService;
        private readonly ILogger<ScanConfigurationController> _logger;

        public ScanConfigurationController(
            AppDbContext context,
            IMqttService mqttService,
            ILogger<ScanConfigurationController> logger)
        {
            _context = context;
            _mqttService = mqttService;
            _logger = logger;
        }

        // GET: api/ScanConfiguration
        [HttpGet]
        public async Task<ActionResult<ScanConfiguration>> GetScanConfiguration()
        {
            try
            {
                var configuration = await _context.ScanConfigurations
                    .Include(s => s.CreatedByUser)
                    .Include(s => s.UpdatedByUser)
                    .Where(s => s.IsActive)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (configuration == null)
                {
                    // Return default configuration if none exists
                    return Ok(new ScanConfiguration
                    {
                        MaxAddressToScan = 247,
                        SelectedPort = "COM3",
                        SelectedSensor = "XY_MD02",
                        ScanTimeoutMs = 1000,
                        ScanIntervalMs = 100,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                return Ok(configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving scan configuration");
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/ScanConfiguration/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ScanConfiguration>> GetScanConfiguration(int id)
        {
            try
            {
                var configuration = await _context.ScanConfigurations
                    .Include(s => s.CreatedByUser)
                    .Include(s => s.UpdatedByUser)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (configuration == null)
                {
                    return NotFound($"Scan configuration with ID {id} not found");
                }

                return Ok(configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving scan configuration {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/ScanConfiguration
        [HttpPost]
        public async Task<ActionResult<ScanConfiguration>> CreateScanConfiguration(ScanConfigurationRequest request)
        {
            try
            {
                // Deactivate existing configurations
                var existingConfigs = await _context.ScanConfigurations
                    .Where(s => s.IsActive)
                    .ToListAsync();

                foreach (var config in existingConfigs)
                {
                    config.IsActive = false;
                    config.UpdatedAt = DateTime.UtcNow;
                }

                var userId = GetCurrentUserId();
                var configuration = new ScanConfiguration
                {
                    MaxAddressToScan = request.MaxAddressToScan,
                    SelectedPort = request.SelectedPort,
                    SelectedSensor = request.SelectedSensor,
                    ScanTimeoutMs = request.ScanTimeoutMs,
                    ScanIntervalMs = request.ScanIntervalMs,
                    IsActive = true,
                    CreatedBy = userId,
                    UpdatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.ScanConfigurations.Add(configuration);
                await _context.SaveChangesAsync();

                // Send MQTT command to update scan configuration
                await SendWriteConfigScanMqttCommand(configuration);

                await _context.Entry(configuration)
                    .Reference(s => s.CreatedByUser)
                    .LoadAsync();

                _logger.LogInformation("Created scan configuration {Id}", configuration.Id);

                return CreatedAtAction(nameof(GetScanConfiguration),
                    new { id = configuration.Id }, configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating scan configuration");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/ScanConfiguration/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateScanConfiguration(int id, ScanConfigurationRequest request)
        {
            try
            {
                var configuration = await _context.ScanConfigurations
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (configuration == null)
                {
                    return NotFound($"Scan configuration with ID {id} not found");
                }

                var userId = GetCurrentUserId();
                configuration.MaxAddressToScan = request.MaxAddressToScan;
                configuration.SelectedPort = request.SelectedPort;
                configuration.SelectedSensor = request.SelectedSensor;
                configuration.ScanTimeoutMs = request.ScanTimeoutMs;
                configuration.ScanIntervalMs = request.ScanIntervalMs;
                configuration.UpdatedBy = userId;
                configuration.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Send MQTT command to update scan configuration
                await SendWriteConfigScanMqttCommand(configuration);

                _logger.LogInformation("Updated scan configuration {Id}", id);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating scan configuration {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/ScanConfiguration/active
        [HttpPut("active")]
        public async Task<IActionResult> UpdateActiveScanConfiguration(ScanConfigurationRequest request)
        {
            try
            {
                // Get the current active configuration
                var configuration = await _context.ScanConfigurations
                    .Where(s => s.IsActive)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (configuration == null)
                {
                    // Create new configuration if none exists
                    await CreateScanConfiguration(request);
                    return NoContent();
                }

                var userId = GetCurrentUserId();
                configuration.MaxAddressToScan = request.MaxAddressToScan;
                configuration.SelectedPort = request.SelectedPort;
                configuration.SelectedSensor = request.SelectedSensor;
                configuration.ScanTimeoutMs = request.ScanTimeoutMs;
                configuration.ScanIntervalMs = request.ScanIntervalMs;
                configuration.UpdatedBy = userId;
                configuration.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Send MQTT command to update scan configuration
                await SendWriteConfigScanMqttCommand(configuration);

                _logger.LogInformation("Updated active scan configuration");

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating active scan configuration");
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/ScanConfiguration/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteScanConfiguration(int id)
        {
            try
            {
                var configuration = await _context.ScanConfigurations
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (configuration == null)
                {
                    return NotFound($"Scan configuration with ID {id} not found");
                }

                _context.ScanConfigurations.Remove(configuration);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Deleted scan configuration {Id}", id);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting scan configuration {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/ScanConfiguration/mqtt/sync
        [HttpPost("mqtt/sync")]
        public async Task<IActionResult> SyncWithMqtt()
        {
            try
            {
                // Send command to read config scan from MQTT
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.READ_CONFIG_SCAN
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command);

                await _mqttService.PublishAsync(topic, message);

                _logger.LogInformation("Sent MQTT read config scan command");

                return Ok(new { message = "MQTT sync command sent" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing scan configuration with MQTT");
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/ScanConfiguration/mqtt/start
        [HttpPost("mqtt/start")]
        public async Task<IActionResult> StartScanning()
        {
            try
            {
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.RUNNING_SCAN
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command);

                await _mqttService.PublishAsync(topic, message);

                _logger.LogInformation("Sent MQTT start scanning command");

                return Ok(new { message = "Start scanning command sent" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting MQTT scanning");
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/ScanConfiguration/mqtt/stop
        [HttpPost("mqtt/stop")]
        public async Task<IActionResult> StopScanning()
        {
            try
            {
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.STOP_SCAN
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command);

                await _mqttService.PublishAsync(topic, message);

                _logger.LogInformation("Sent MQTT stop scanning command");

                return Ok(new { message = "Stop scanning command sent" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping MQTT scanning");
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/ScanConfiguration/constants
        [HttpGet("constants")]
        public IActionResult GetConstants()
        {
            try
            {
                var constants = new
                {
                    SensorTypes = SensorConstants.SENSOR_TYPES,
                    ModbusPorts = SensorConstants.MODBUS_PORTS,
                    Commands = new
                    {
                        ChangeMode = new
                        {
                            Reading = SensorConstants.Commands.CHANGE_MODE_READING,
                            Scan = SensorConstants.Commands.CHANGE_MODE_SCAN
                        },
                        Scan = new
                        {
                            Start = SensorConstants.Commands.RUNNING_SCAN,
                            Stop = SensorConstants.Commands.STOP_SCAN,
                            WriteConfig = SensorConstants.Commands.WRITE_CONFIG_SCAN,
                            ReadConfig = SensorConstants.Commands.READ_CONFIG_SCAN
                        }
                    },
                    Topics = new
                    {
                        Command = SensorConstants.MQTT_COMMAND_TOPIC,
                        Response = SensorConstants.MQTT_RESPONSE_TOPIC,
                        Data = SensorConstants.MQTT_DATA_TOPIC
                    }
                };

                return Ok(constants);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving constants");
                return StatusCode(500, "Internal server error");
            }
        }

        // Private helper methods
        private int GetCurrentUserId()
        {
            // Extract user ID from JWT token
            var userIdClaim = User.FindFirst("id");
            return userIdClaim != null ? int.Parse(userIdClaim.Value) : 1; // Default to admin user
        }

        private async Task SendWriteConfigScanMqttCommand(ScanConfiguration config)
        {
            try
            {
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.WRITE_CONFIG_SCAN,
                    Data = config.ToMqttFormat()
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await _mqttService.PublishAsync(topic, message);
                _logger.LogInformation("Sent MQTT write config scan command");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending MQTT write config scan command");
                // Don't throw - this is a background operation
            }
        }
    }
}