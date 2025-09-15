using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SystemManagementController : ControllerBase
    {
        private readonly ISystemManagementService _systemManagementService;
        private readonly ILogger<SystemManagementController> _logger;

        public SystemManagementController(ISystemManagementService systemManagementService, ILogger<SystemManagementController> logger)
        {
            _systemManagementService = systemManagementService;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("UserId");
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
            return 0;
        }

        [HttpPost("reboot")]
        public async Task<ActionResult<ApiResponse<SystemCommandResult>>> RebootSystem()
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _systemManagementService.RebootSystemAsync(userId);
                
                return Ok(new ApiResponse<SystemCommandResult>
                {
                    Success = result.Success,
                    Data = result,
                    Message = result.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing system reboot");
                return StatusCode(500, new ApiResponse<SystemCommandResult>
                {
                    Success = false,
                    Message = "Internal server error while executing reboot command"
                });
            }
        }

        [HttpPost("shutdown")]
        public async Task<ActionResult<ApiResponse<SystemCommandResult>>> ShutdownSystem()
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _systemManagementService.ShutdownSystemAsync(userId);
                
                return Ok(new ApiResponse<SystemCommandResult>
                {
                    Success = result.Success,
                    Data = result,
                    Message = result.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing system shutdown");
                return StatusCode(500, new ApiResponse<SystemCommandResult>
                {
                    Success = false,
                    Message = "Internal server error while executing shutdown command"
                });
            }
        }

        [HttpPost("services/{serviceName}/restart")]
        public async Task<ActionResult<ApiResponse<SystemCommandResult>>> RestartService(string serviceName)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _systemManagementService.RestartServiceAsync(serviceName, userId);
                
                return Ok(new ApiResponse<SystemCommandResult>
                {
                    Success = result.Success,
                    Data = result,
                    Message = result.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restarting service {ServiceName}", serviceName);
                return StatusCode(500, new ApiResponse<SystemCommandResult>
                {
                    Success = false,
                    Message = $"Internal server error while restarting service {serviceName}"
                });
            }
        }

        [HttpPost("services/{serviceName}/start")]
        public async Task<ActionResult<ApiResponse<SystemCommandResult>>> StartService(string serviceName)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _systemManagementService.StartServiceAsync(serviceName, userId);
                
                return Ok(new ApiResponse<SystemCommandResult>
                {
                    Success = result.Success,
                    Data = result,
                    Message = result.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting service {ServiceName}", serviceName);
                return StatusCode(500, new ApiResponse<SystemCommandResult>
                {
                    Success = false,
                    Message = $"Internal server error while starting service {serviceName}"
                });
            }
        }

        [HttpPost("services/{serviceName}/stop")]
        public async Task<ActionResult<ApiResponse<SystemCommandResult>>> StopService(string serviceName)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _systemManagementService.StopServiceAsync(serviceName, userId);
                
                return Ok(new ApiResponse<SystemCommandResult>
                {
                    Success = result.Success,
                    Data = result,
                    Message = result.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping service {ServiceName}", serviceName);
                return StatusCode(500, new ApiResponse<SystemCommandResult>
                {
                    Success = false,
                    Message = $"Internal server error while stopping service {serviceName}"
                });
            }
        }

        [HttpGet("services/{serviceName}/status")]
        public async Task<ActionResult<ApiResponse<SystemCommandResult>>> GetServiceStatus(string serviceName)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _systemManagementService.GetServiceStatusAsync(serviceName, userId);
                
                return Ok(new ApiResponse<SystemCommandResult>
                {
                    Success = result.Success,
                    Data = result,
                    Message = result.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting service status {ServiceName}", serviceName);
                return StatusCode(500, new ApiResponse<SystemCommandResult>
                {
                    Success = false,
                    Message = $"Internal server error while getting service {serviceName} status"
                });
            }
        }

        [HttpGet("services")]
        public async Task<ActionResult<ApiResponse<List<SystemService>>>> GetAvailableServices()
        {
            try
            {
                var services = await _systemManagementService.GetAvailableServicesAsync();
                
                return Ok(new ApiResponse<List<SystemService>>
                {
                    Success = true,
                    Data = services,
                    Message = "Services retrieved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting available services");
                return StatusCode(500, new ApiResponse<List<SystemService>>
                {
                    Success = false,
                    Message = "Internal server error while retrieving services"
                });
            }
        }

        [HttpGet("info")]
        public async Task<ActionResult<ApiResponse<SystemStatusInfo>>> GetSystemInfo()
        {
            try
            {
                var systemInfo = await _systemManagementService.GetSystemInfoAsync();
                
                return Ok(new ApiResponse<SystemStatusInfo>
                {
                    Success = true,
                    Data = systemInfo,
                    Message = "System information retrieved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system information");
                return StatusCode(500, new ApiResponse<SystemStatusInfo>
                {
                    Success = false,
                    Message = "Internal server error while retrieving system information"
                });
            }
        }
    }
}