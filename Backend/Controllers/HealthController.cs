using Microsoft.AspNetCore.Mvc;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;

        public HealthController(ILogger<HealthController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Health check endpoint to verify backend status
        /// </summary>
        [HttpGet]
        public ActionResult<ApiResponse<object>> GetHealth()
        {
            try
            {
                var healthStatus = new
                {
                    status = "healthy",
                    timestamp = DateTime.UtcNow,
                    version = "1.0.0",
                    environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development",
                    uptime = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Backend is healthy",
                    Data = healthStatus
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Backend health check failed"
                });
            }
        }

        /// <summary>
        /// Simple ping endpoint for quick connectivity check
        /// </summary>
        [HttpGet("ping")]
        public ActionResult<object> Ping()
        {
            return Ok(new
            {
                status = "pong",
                timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
            });
        }
    }
}