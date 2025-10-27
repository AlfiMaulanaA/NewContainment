using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;
using Backend.Enums;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NetworkController : ControllerBase
    {
        private readonly INetworkConfigurationService _networkService;
        private readonly ILogger<NetworkController> _logger;

        public NetworkController(INetworkConfigurationService networkService, ILogger<NetworkController> logger)
        {
            _networkService = networkService;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }

        /// <summary>
        /// Get all network configurations
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllConfigurations()
        {
            try
            {
                var configurations = await _networkService.GetAllConfigurationsAsync();
                return Ok(new { success = true, data = configurations });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get network configurations");
                return StatusCode(500, new { success = false, message = "Failed to get network configurations" });
            }
        }

        /// <summary>
        /// Get network configuration by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetConfigurationById(int id)
        {
            try
            {
                var configuration = await _networkService.GetConfigurationByIdAsync(id);
                if (configuration == null)
                {
                    return NotFound(new { success = false, message = "Network configuration not found" });
                }

                return Ok(new { success = true, data = configuration });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get network configuration by ID: {Id}", id);
                return StatusCode(500, new { success = false, message = "Failed to get network configuration" });
            }
        }

        /// <summary>
        /// Get network configuration by interface type
        /// </summary>
        [HttpGet("interface/{interfaceType}")]
        public async Task<IActionResult> GetConfigurationByInterface(NetworkInterfaceType interfaceType)
        {
            try
            {
                var configuration = await _networkService.GetConfigurationByInterfaceAsync(interfaceType);
                if (configuration == null)
                {
                    return NotFound(new { success = false, message = $"Network configuration for {interfaceType} not found" });
                }

                return Ok(new { success = true, data = configuration });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get network configuration for interface: {Interface}", interfaceType);
                return StatusCode(500, new { success = false, message = "Failed to get network configuration" });
            }
        }

        /// <summary>
        /// Create new network configuration
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<IActionResult> CreateConfiguration([FromBody] NetworkConfigurationRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid request data", errors = ModelState });
                }

                var userId = GetCurrentUserId();
                var configuration = await _networkService.CreateConfigurationAsync(request, userId);

                return CreatedAtAction(nameof(GetConfigurationById),
                    new { id = configuration.Id },
                    new { success = true, data = configuration });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create network configuration");
                return StatusCode(500, new { success = false, message = "Failed to create network configuration" });
            }
        }

        /// <summary>
        /// Update network configuration
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<IActionResult> UpdateConfiguration(int id, [FromBody] NetworkConfigurationRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid request data", errors = ModelState });
                }

                var userId = GetCurrentUserId();
                var configuration = await _networkService.UpdateConfigurationAsync(id, request, userId);

                if (configuration == null)
                {
                    return NotFound(new { success = false, message = "Network configuration not found" });
                }

                return Ok(new { success = true, data = configuration });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update network configuration: {Id}", id);
                return StatusCode(500, new { success = false, message = "Failed to update network configuration" });
            }
        }

        /// <summary>
        /// Delete network configuration
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteConfiguration(int id)
        {
            try
            {
                var success = await _networkService.DeleteConfigurationAsync(id);
                if (!success)
                {
                    return NotFound(new { success = false, message = "Network configuration not found" });
                }

                return Ok(new { success = true, message = "Network configuration deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete network configuration: {Id}", id);
                return StatusCode(500, new { success = false, message = "Failed to delete network configuration" });
            }
        }

        /// <summary>
        /// Get current network interfaces file content
        /// </summary>
        [HttpGet("interfaces-file")]
        public async Task<IActionResult> GetInterfacesFile()
        {
            try
            {
                var content = await _networkService.ReadNetworkInterfacesFileAsync();
                return Ok(new { success = true, data = content });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read network interfaces file");
                return StatusCode(500, new { success = false, message = "Failed to read network interfaces file" });
            }
        }

        /// <summary>
        /// Apply network configuration to system
        /// </summary>
        [HttpPost("apply")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<IActionResult> ApplyConfiguration([FromBody] ApplyNetworkConfigRequest request)
        {
            try
            {
                var success = await _networkService.ApplyNetworkConfigurationAsync(request);
                if (success)
                {
                    return Ok(new { success = true, message = "Network configuration applied successfully" });
                }

                return StatusCode(500, new { success = false, message = "Failed to apply network configuration" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to apply network configuration");
                return StatusCode(500, new { success = false, message = "Failed to apply network configuration" });
            }
        }

        /// <summary>
        /// Restart networking service
        /// </summary>
        [HttpPost("restart")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RestartNetworking()
        {
            try
            {
                var success = await _networkService.RestartNetworkingServiceAsync();
                if (success)
                {
                    return Ok(new { success = true, message = "Networking service restarted successfully" });
                }

                return StatusCode(500, new { success = false, message = "Failed to restart networking service" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to restart networking service");
                return StatusCode(500, new { success = false, message = "Failed to restart networking service" });
            }
        }

        /// <summary>
        /// Backup current network configuration
        /// </summary>
        [HttpPost("backup")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<IActionResult> BackupConfiguration()
        {
            try
            {
                var success = await _networkService.BackupNetworkConfigAsync();
                if (success)
                {
                    return Ok(new { success = true, message = "Network configuration backed up successfully" });
                }

                return StatusCode(500, new { success = false, message = "Failed to backup network configuration" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to backup network configuration");
                return StatusCode(500, new { success = false, message = "Failed to backup network configuration" });
            }
        }

        /// <summary>
        /// Restore network configuration from backup
        /// </summary>
        [HttpPost("restore")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RestoreConfiguration()
        {
            try
            {
                var success = await _networkService.RestoreNetworkConfigAsync();
                if (success)
                {
                    return Ok(new { success = true, message = "Network configuration restored successfully" });
                }

                return StatusCode(500, new { success = false, message = "Failed to restore network configuration" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to restore network configuration");
                return StatusCode(500, new { success = false, message = "Failed to restore network configuration" });
            }
        }

        /// <summary>
        /// Get network interface status
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetInterfaceStatus()
        {
            try
            {
                var status = await _networkService.GetNetworkInterfaceStatusAsync();
                return Ok(new { success = true, data = status });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get network interface status");
                return StatusCode(500, new { success = false, message = "Failed to get network interface status" });
            }
        }

        /// <summary>
        /// Test connectivity to specific IP
        /// </summary>
        [HttpPost("test-connectivity")]
        public async Task<IActionResult> TestConnectivity([FromBody] TestConnectivityRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.IpAddress))
                {
                    return BadRequest(new { success = false, message = "IP address is required" });
                }

                var success = await _networkService.TestConnectivityAsync(request.IpAddress);
                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        ipAddress = request.IpAddress,
                        isReachable = success
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to test connectivity to {IpAddress}", request.IpAddress);
                return StatusCode(500, new { success = false, message = "Failed to test connectivity" });
            }
        }

        /// <summary>
        /// Validate network configuration
        /// </summary>
        [HttpPost("validate")]
        public async Task<IActionResult> ValidateConfiguration([FromBody] NetworkConfigurationRequest request)
        {
            try
            {
                var isValid = await _networkService.ValidateNetworkConfigurationAsync(request);
                return Ok(new { success = true, data = new { isValid } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to validate network configuration");
                return StatusCode(500, new { success = false, message = "Failed to validate network configuration" });
            }
        }

        /// <summary>
        /// Revert interface to DHCP
        /// </summary>
        [HttpPost("revert-to-dhcp/{interfaceType}")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<IActionResult> RevertToDhcp(NetworkInterfaceType interfaceType)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _networkService.RevertInterfaceToDhcpAsync(interfaceType, userId);

                if (success)
                {
                    return Ok(new { success = true, message = $"{interfaceType} reverted to DHCP successfully" });
                }

                return StatusCode(500, new { success = false, message = "Failed to revert to DHCP" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to revert {Interface} to DHCP", interfaceType);
                return StatusCode(500, new { success = false, message = "Failed to revert interface to DHCP" });
            }
        }

        /// <summary>
        /// Parse current interfaces file and get configurations
        /// </summary>
        [HttpGet("parse-interfaces-file")]
        public async Task<IActionResult> ParseInterfacesFile()
        {
            try
            {
                var configurations = await _networkService.ParseNetworkInterfacesFileAsync();
                return Ok(new { success = true, data = configurations });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse network interfaces file");
                return StatusCode(500, new { success = false, message = "Failed to parse network interfaces file" });
            }
        }

        /// <summary>
        /// Clear all static configurations and revert all to DHCP
        /// </summary>
        [HttpPost("clear-all-static")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ClearAllStaticConfigurations()
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _networkService.ClearAllStaticConfigurationsAsync(userId);

                if (success)
                {
                    return Ok(new { success = true, message = "All interfaces reverted to DHCP successfully" });
                }

                return StatusCode(500, new { success = false, message = "Failed to clear static configurations" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to clear all static configurations");
                return StatusCode(500, new { success = false, message = "Failed to clear static configurations" });
            }
        }
    }

    public class TestConnectivityRequest
    {
        public string IpAddress { get; set; } = string.Empty;
    }
}