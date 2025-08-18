using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Models;
using Backend.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MqttConfigurationController : ControllerBase
    {
        private readonly IMqttConfigurationService _mqttConfigurationService;
        private readonly IMqttService _mqttService;

        public MqttConfigurationController(IMqttConfigurationService mqttConfigurationService, IMqttService mqttService)
        {
            _mqttConfigurationService = mqttConfigurationService;
            _mqttService = mqttService;
        }

        [HttpGet("active")]
        public async Task<ActionResult<MqttConfiguration>> GetActiveConfiguration()
        {
            var configuration = await _mqttConfigurationService.GetActiveConfigurationAsync();
            
            if (configuration == null)
            {
                return NotFound("No active MQTT configuration found");
            }

            return Ok(configuration);
        }

        [HttpGet("effective")]
        public async Task<ActionResult<Dictionary<string, object>>> GetEffectiveConfiguration()
        {
            var configuration = await _mqttConfigurationService.GetEffectiveConfigurationAsync();
            return Ok(configuration);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MqttConfiguration>>> GetConfigurations()
        {
            var configurations = await _mqttConfigurationService.GetAllConfigurationsAsync();
            return Ok(configurations);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MqttConfiguration>> GetConfiguration(int id)
        {
            var configuration = await _mqttConfigurationService.GetConfigurationByIdAsync(id);
            
            if (configuration == null)
            {
                return NotFound();
            }

            return Ok(configuration);
        }

        [HttpPost]
        public async Task<ActionResult<MqttConfiguration>> CreateConfiguration(CreateMqttConfigurationRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var configuration = new MqttConfiguration
            {
                IsEnabled = request.IsEnabled,
                UseEnvironmentConfig = request.UseEnvironmentConfig,
                BrokerHost = request.BrokerHost,
                BrokerPort = request.BrokerPort,
                Username = request.Username,
                Password = request.Password,
                ClientId = request.ClientId,
                UseSsl = request.UseSsl,
                KeepAliveInterval = request.KeepAliveInterval,
                ReconnectDelay = request.ReconnectDelay,
                TopicPrefix = request.TopicPrefix,
                Description = request.Description
            };

            var createdConfiguration = await _mqttConfigurationService.CreateConfigurationAsync(configuration, userId);
            return CreatedAtAction(nameof(GetConfiguration), new { id = createdConfiguration.Id }, createdConfiguration);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateConfiguration(int id, UpdateMqttConfigurationRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var configuration = new MqttConfiguration
            {
                IsEnabled = request.IsEnabled,
                UseEnvironmentConfig = request.UseEnvironmentConfig,
                BrokerHost = request.BrokerHost,
                BrokerPort = request.BrokerPort,
                Username = request.Username,
                Password = request.Password,
                ClientId = request.ClientId,
                UseSsl = request.UseSsl,
                KeepAliveInterval = request.KeepAliveInterval,
                ReconnectDelay = request.ReconnectDelay,
                TopicPrefix = request.TopicPrefix,
                Description = request.Description
            };

            var updatedConfiguration = await _mqttConfigurationService.UpdateConfigurationAsync(id, configuration, userId);
            
            if (updatedConfiguration == null)
            {
                return NotFound();
            }

            return Ok(updatedConfiguration);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteConfiguration(int id)
        {
            var result = await _mqttConfigurationService.DeleteConfigurationAsync(id);
            
            if (!result)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpPost("{id}/activate")]
        public async Task<IActionResult> SetActiveConfiguration(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var result = await _mqttConfigurationService.SetActiveConfigurationAsync(id, userId);
            
            if (!result)
            {
                return NotFound();
            }

            // Reconnect MQTT with new configuration
            try
            {
                await _mqttService.ReconnectWithNewConfigAsync();
            }
            catch (Exception ex)
            {
                // Log error but don't fail the request
                // Configuration was saved, connection will be retried later
                Console.WriteLine($"Failed to reconnect MQTT: {ex.Message}");
            }

            return Ok(new { message = "Configuration activated successfully" });
        }

        [HttpPost("toggle")]
        public async Task<IActionResult> ToggleMqtt(ToggleMqttRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var result = await _mqttConfigurationService.ToggleMqttAsync(request.Enabled, userId);
            
            if (!result)
            {
                return BadRequest("No active MQTT configuration found");
            }

            // Reconnect MQTT with new configuration
            try
            {
                if (request.Enabled)
                {
                    await _mqttService.ReconnectWithNewConfigAsync();
                }
                else
                {
                    await _mqttService.DisconnectAsync();
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the request
                // Configuration was saved, connection will be retried later
                Console.WriteLine($"Failed to reconnect MQTT: {ex.Message}");
            }

            return Ok(new { message = $"MQTT {(request.Enabled ? "enabled" : "disabled")} successfully" });
        }

        [HttpPost("{id}/test")]
        public async Task<IActionResult> TestConnection(int id)
        {
            var configuration = await _mqttConfigurationService.GetConfigurationByIdAsync(id);
            
            if (configuration == null)
            {
                return NotFound();
            }

            var result = await _mqttConfigurationService.TestConnectionAsync(configuration);
            
            return Ok(new { 
                success = result, 
                message = result ? "Connection successful" : "Connection failed" 
            });
        }

        [HttpPost("test")]
        public async Task<IActionResult> TestConnectionWithConfig(TestMqttConnectionRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var configuration = new MqttConfiguration
            {
                BrokerHost = request.BrokerHost,
                BrokerPort = request.BrokerPort,
                Username = request.Username,
                Password = request.Password,
                ClientId = request.ClientId,
                UseSsl = request.UseSsl,
                KeepAliveInterval = request.KeepAliveInterval
            };

            var result = await _mqttConfigurationService.TestConnectionAsync(configuration);
            
            return Ok(new { 
                success = result, 
                message = result ? "Connection successful" : "Connection failed" 
            });
        }

        [HttpGet("status/all")]
        public async Task<ActionResult<Dictionary<int, bool>>> GetAllConnectionStatus()
        {
            var statuses = await _mqttConfigurationService.GetAllConnectionStatusAsync();
            return Ok(statuses);
        }

        [HttpGet("status/current")]
        public async Task<ActionResult<object>> GetCurrentStatus()
        {
            var effectiveConfig = await _mqttConfigurationService.GetEffectiveConfigurationAsync();
            var isConnected = _mqttService.IsConnected;
            
            return Ok(new
            {
                IsConnected = isConnected,
                Configuration = effectiveConfig,
                ConnectionTime = DateTime.UtcNow
            });
        }

        [HttpPost("reload")]
        public async Task<IActionResult> ReloadConfiguration()
        {
            try
            {
                await _mqttService.ReconnectWithNewConfigAsync();
                return Ok(new { message = "MQTT configuration reloaded and reconnected successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to reload MQTT configuration", error = ex.Message });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("UserId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
            return 0;
        }
    }

    public class CreateMqttConfigurationRequest
    {
        [Required]
        public bool IsEnabled { get; set; } = true;
        
        [Required]
        public bool UseEnvironmentConfig { get; set; } = true;
        
        [StringLength(255)]
        public string? BrokerHost { get; set; }
        
        public int? BrokerPort { get; set; } = 1883;
        
        [StringLength(100)]
        public string? Username { get; set; }
        
        [StringLength(255)]
        public string? Password { get; set; }
        
        [StringLength(100)]
        public string? ClientId { get; set; }
        
        public bool UseSsl { get; set; } = false;
        
        public int KeepAliveInterval { get; set; } = 60;
        
        public int ReconnectDelay { get; set; } = 5;
        
        [StringLength(1000)]
        public string? TopicPrefix { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
    }

    public class UpdateMqttConfigurationRequest
    {
        [Required]
        public bool IsEnabled { get; set; } = true;
        
        [Required]
        public bool UseEnvironmentConfig { get; set; } = true;
        
        [StringLength(255)]
        public string? BrokerHost { get; set; }
        
        public int? BrokerPort { get; set; } = 1883;
        
        [StringLength(100)]
        public string? Username { get; set; }
        
        [StringLength(255)]
        public string? Password { get; set; }
        
        [StringLength(100)]
        public string? ClientId { get; set; }
        
        public bool UseSsl { get; set; } = false;
        
        public int KeepAliveInterval { get; set; } = 60;
        
        public int ReconnectDelay { get; set; } = 5;
        
        [StringLength(1000)]
        public string? TopicPrefix { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
    }

    public class ToggleMqttRequest
    {
        [Required]
        public bool Enabled { get; set; }
    }

    public class TestMqttConnectionRequest
    {
        [Required]
        [StringLength(255)]
        public string BrokerHost { get; set; } = string.Empty;
        
        [Required]
        public int BrokerPort { get; set; } = 1883;
        
        [StringLength(100)]
        public string? Username { get; set; }
        
        [StringLength(255)]
        public string? Password { get; set; }
        
        [StringLength(100)]
        public string? ClientId { get; set; }
        
        public bool UseSsl { get; set; } = false;
        
        public int KeepAliveInterval { get; set; } = 60;
    }
}