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
    public class SensorConfigurationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMqttService _mqttService;
        private readonly ILogger<SensorConfigurationController> _logger;

        public SensorConfigurationController(
            AppDbContext context,
            IMqttService mqttService,
            ILogger<SensorConfigurationController> logger)
        {
            _context = context;
            _mqttService = mqttService;
            _logger = logger;
        }

        // GET: api/SensorConfiguration
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SensorConfiguration>>> GetSensorConfigurations()
        {
            try
            {
                var configurations = await _context.SensorConfigurations
                    .Include(s => s.CreatedByUser)
                    .Include(s => s.UpdatedByUser)
                    .OrderBy(s => s.SensorNumber)
                    .ToListAsync();

                return Ok(configurations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor configurations");
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/SensorConfiguration/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SensorConfiguration>> GetSensorConfiguration(int id)
        {
            try
            {
                var configuration = await _context.SensorConfigurations
                    .Include(s => s.CreatedByUser)
                    .Include(s => s.UpdatedByUser)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (configuration == null)
                {
                    return NotFound($"Sensor configuration with ID {id} not found");
                }

                return Ok(configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor configuration {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/SensorConfiguration/sensor/{sensorNumber}
        [HttpGet("sensor/{sensorNumber}")]
        public async Task<ActionResult<SensorConfiguration>> GetSensorConfigurationBySensorNumber(int sensorNumber)
        {
            try
            {
                var configuration = await _context.SensorConfigurations
                    .Include(s => s.CreatedByUser)
                    .Include(s => s.UpdatedByUser)
                    .FirstOrDefaultAsync(s => s.SensorNumber == sensorNumber);

                if (configuration == null)
                {
                    return NotFound($"Sensor configuration for sensor number {sensorNumber} not found");
                }

                return Ok(configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor configuration for sensor number {SensorNumber}", sensorNumber);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/SensorConfiguration
        [HttpPost]
        public async Task<ActionResult<SensorConfiguration>> CreateSensorConfiguration(SensorConfigurationRequest request)
        {
            try
            {
                // Check if sensor number already exists
                var existingConfig = await _context.SensorConfigurations
                    .FirstOrDefaultAsync(s => s.SensorNumber == request.SensorNumber);

                if (existingConfig != null)
                {
                    return Conflict($"Sensor configuration for sensor number {request.SensorNumber} already exists");
                }

                var userId = GetCurrentUserId();
                var configuration = new SensorConfiguration
                {
                    SensorNumber = request.SensorNumber,
                    SensorName = request.SensorName,
                    ModbusAddress = request.ModbusAddress,
                    ModbusPort = request.ModbusPort,
                    SensorType = request.SensorType,
                    Description = request.Description,
                    IsEnabled = request.IsEnabled,
                    TemperatureOffset = request.TemperatureOffset,
                    HumidityOffset = request.HumidityOffset,
                    CreatedBy = userId,
                    UpdatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.SensorConfigurations.Add(configuration);
                await _context.SaveChangesAsync();

                // Send MQTT command to add sensor
                await SendAddSensorMqttCommand(configuration);

                await _context.Entry(configuration)
                    .Reference(s => s.CreatedByUser)
                    .LoadAsync();

                _logger.LogInformation("Created sensor configuration {Id} for sensor number {SensorNumber}", 
                    configuration.Id, configuration.SensorNumber);

                return CreatedAtAction(nameof(GetSensorConfiguration), 
                    new { id = configuration.Id }, configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating sensor configuration");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/SensorConfiguration/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSensorConfiguration(int id, SensorConfigurationRequest request)
        {
            try
            {
                var configuration = await _context.SensorConfigurations
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (configuration == null)
                {
                    return NotFound($"Sensor configuration with ID {id} not found");
                }

                // Check if sensor number conflicts with another configuration
                var existingConfig = await _context.SensorConfigurations
                    .FirstOrDefaultAsync(s => s.SensorNumber == request.SensorNumber && s.Id != id);

                if (existingConfig != null)
                {
                    return Conflict($"Sensor number {request.SensorNumber} is already used by another configuration");
                }

                var userId = GetCurrentUserId();
                configuration.SensorNumber = request.SensorNumber;
                configuration.SensorName = request.SensorName;
                configuration.ModbusAddress = request.ModbusAddress;
                configuration.ModbusPort = request.ModbusPort;
                configuration.SensorType = request.SensorType;
                configuration.Description = request.Description;
                configuration.IsEnabled = request.IsEnabled;
                configuration.TemperatureOffset = request.TemperatureOffset;
                configuration.HumidityOffset = request.HumidityOffset;
                configuration.UpdatedBy = userId;
                configuration.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Send MQTT command to update sensor
                await SendSetSensorMqttCommand(configuration);

                _logger.LogInformation("Updated sensor configuration {Id}", id);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating sensor configuration {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // DELETE: api/SensorConfiguration/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSensorConfiguration(int id)
        {
            try
            {
                var configuration = await _context.SensorConfigurations
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (configuration == null)
                {
                    return NotFound($"Sensor configuration with ID {id} not found");
                }

                // Send MQTT command to remove sensor
                await SendRemoveSensorMqttCommand(configuration.SensorNumber);

                _context.SensorConfigurations.Remove(configuration);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Deleted sensor configuration {Id} for sensor number {SensorNumber}", 
                    id, configuration.SensorNumber);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting sensor configuration {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/SensorConfiguration/calibration
        [HttpPost("calibration")]
        public async Task<IActionResult> UpdateCalibration(CalibrationRequest request)
        {
            try
            {
                var configuration = await _context.SensorConfigurations
                    .FirstOrDefaultAsync(s => s.SensorName == request.SensorName);

                if (configuration == null)
                {
                    return NotFound($"Sensor with name '{request.SensorName}' not found");
                }

                if (request.ValueCalibrate.Length != 2)
                {
                    return BadRequest("Calibration values must contain exactly 2 values [temperature_offset, humidity_offset]");
                }

                var userId = GetCurrentUserId();
                configuration.TemperatureOffset = request.ValueCalibrate[0];
                configuration.HumidityOffset = request.ValueCalibrate[1];
                configuration.UpdatedBy = userId;
                configuration.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Send MQTT command to update calibration
                await SendCalibrateSenosorMqttCommand(request);

                _logger.LogInformation("Updated calibration for sensor {SensorName}", request.SensorName);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating calibration for sensor {SensorName}", request.SensorName);
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/SensorConfiguration/calibration
        [HttpGet("calibration")]
        public async Task<ActionResult<Dictionary<string, decimal[]>>> GetAllCalibrations()
        {
            try
            {
                var configurations = await _context.SensorConfigurations
                    .Where(s => s.IsEnabled)
                    .ToListAsync();

                var calibrations = configurations.ToDictionary(
                    s => s.SensorName,
                    s => new decimal[] { s.TemperatureOffset, s.HumidityOffset }
                );

                return Ok(calibrations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving calibrations");
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/SensorConfiguration/mqtt/sync
        [HttpPost("mqtt/sync")]
        public async Task<IActionResult> SyncWithMqtt()
        {
            try
            {
                // Send command to get total sensor list from MQTT
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.GET_TOTAL_SENSOR_LIST
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command);

                await _mqttService.PublishAsync(topic, message);

                _logger.LogInformation("Sent MQTT sync command");

                return Ok(new { message = "MQTT sync command sent" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing with MQTT");
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/SensorConfiguration/mqtt/upload
        [HttpPost("mqtt/upload")]
        public async Task<IActionResult> UploadSensorListToMqtt()
        {
            try
            {
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.UPLOAD_SENSOR_LIST
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command);

                await _mqttService.PublishAsync(topic, message);

                _logger.LogInformation("Sent MQTT upload sensor list command");

                return Ok(new { message = "Upload sensor list command sent" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading sensor list to MQTT");
                return StatusCode(500, "Internal server error");
            }
        }

        // POST: api/SensorConfiguration/mqtt/mode/{mode}
        [HttpPost("mqtt/mode/{mode}")]
        public async Task<IActionResult> ChangeMqttMode(string mode)
        {
            try
            {
                string commandText;
                switch (mode.ToLower())
                {
                    case "reading":
                    case "reading_sensor":
                        commandText = SensorConstants.Commands.CHANGE_MODE_READING;
                        break;
                    case "scan":
                    case "scan_address":
                        commandText = SensorConstants.Commands.CHANGE_MODE_SCAN;
                        break;
                    default:
                        return BadRequest($"Invalid mode: {mode}. Use 'reading' or 'scan'");
                }

                var command = new SensorMqttCommand
                {
                    Command = commandText
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command);

                await _mqttService.PublishAsync(topic, message);

                _logger.LogInformation("Sent MQTT mode change command: {Mode}", mode);

                return Ok(new { message = $"Mode change command sent: {mode}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing MQTT mode to {Mode}", mode);
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

        private async Task SendAddSensorMqttCommand(SensorConfiguration config)
        {
            try
            {
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.ADD_SENSOR_LIST,
                    Data = config.ToMqttFormat()
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await _mqttService.PublishAsync(topic, message);
                _logger.LogInformation("Sent MQTT add sensor command for sensor {SensorNumber}", config.SensorNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending MQTT add sensor command for sensor {SensorNumber}", config.SensorNumber);
                // Don't throw - this is a background operation
            }
        }

        private async Task SendSetSensorMqttCommand(SensorConfiguration config)
        {
            try
            {
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.SET_SENSOR_LIST,
                    Data = config.ToMqttFormat()
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await _mqttService.PublishAsync(topic, message);
                _logger.LogInformation("Sent MQTT set sensor command for sensor {SensorNumber}", config.SensorNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending MQTT set sensor command for sensor {SensorNumber}", config.SensorNumber);
                // Don't throw - this is a background operation
            }
        }

        private async Task SendRemoveSensorMqttCommand(int sensorNumber)
        {
            try
            {
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.REMOVE_SENSOR_LIST,
                    Data = new { number_sensor = sensorNumber }
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await _mqttService.PublishAsync(topic, message);
                _logger.LogInformation("Sent MQTT remove sensor command for sensor {SensorNumber}", sensorNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending MQTT remove sensor command for sensor {SensorNumber}", sensorNumber);
                // Don't throw - this is a background operation
            }
        }

        private async Task SendCalibrateSenosorMqttCommand(CalibrationRequest request)
        {
            try
            {
                var command = new SensorMqttCommand
                {
                    Command = SensorConstants.Commands.WRITE_CALIBRATE_SENSOR,
                    Data = new
                    {
                        sensor_name = request.SensorName,
                        value_calibrate = request.ValueCalibrate
                    }
                };

                var topic = SensorConstants.MQTT_COMMAND_TOPIC;
                var message = JsonSerializer.Serialize(command, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await _mqttService.PublishAsync(topic, message);
                _logger.LogInformation("Sent MQTT calibrate sensor command for sensor {SensorName}", request.SensorName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending MQTT calibrate sensor command for sensor {SensorName}", request.SensorName);
                // Don't throw - this is a background operation
            }
        }
    }
}