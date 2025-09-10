using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WhatsAppController : ControllerBase
    {
        private readonly IWhatsAppService _whatsAppService;
        private readonly ILogger<WhatsAppController> _logger;
        private readonly IConfiguration _configuration;

        public WhatsAppController(IWhatsAppService whatsAppService, ILogger<WhatsAppController> logger, IConfiguration configuration)
        {
            _whatsAppService = whatsAppService;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Send a manual WhatsApp message
        /// </summary>
        [HttpPost("send-message")]
        public async Task<ActionResult<ApiResponse<object>>> SendMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.PhoneNumber) || string.IsNullOrEmpty(request.Message))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Phone number and message are required"
                    });
                }

                var success = await _whatsAppService.SendMessageAsync(
                    request.PhoneNumber,
                    request.RecipientName ?? "User",
                    request.Message);

                if (success)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Success = true,
                        Message = "Message sent successfully",
                        Data = new
                        {
                            PhoneNumber = request.PhoneNumber,
                            RecipientName = request.RecipientName,
                            Message = request.Message,
                            SentAt = DateTime.UtcNow
                        }
                    });
                }
                else
                {
                    return StatusCode(500, new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Failed to send message. Please check logs for details."
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WhatsApp message to {PhoneNumber}", request.PhoneNumber);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while sending the message"
                });
            }
        }

        /// <summary>
        /// Send a template WhatsApp message
        /// </summary>
        [HttpPost("send-template")]
        public async Task<ActionResult<ApiResponse<object>>> SendTemplateMessage([FromBody] SendTemplateMessageRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.PhoneNumber) || string.IsNullOrEmpty(request.TemplateId))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Phone number and template ID are required"
                    });
                }

                var success = await _whatsAppService.SendTemplateMessageAsync(
                    request.PhoneNumber,
                    request.RecipientName ?? "User",
                    request.TemplateId,
                    request.Parameters ?? new Dictionary<string, string>());

                if (success)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Success = true,
                        Message = "Template message sent successfully",
                        Data = new
                        {
                            PhoneNumber = request.PhoneNumber,
                            RecipientName = request.RecipientName,
                            TemplateId = request.TemplateId,
                            Parameters = request.Parameters,
                            SentAt = DateTime.UtcNow
                        }
                    });
                }
                else
                {
                    return StatusCode(500, new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Failed to send template message. Please check logs for details."
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WhatsApp template message to {PhoneNumber}", request.PhoneNumber);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while sending the template message"
                });
            }
        }

        /// <summary>
        /// Test WhatsApp connection and send a test message
        /// </summary>
        [HttpPost("test")]
        public async Task<ActionResult<ApiResponse<object>>> TestConnection([FromBody] WhatsAppTestMessageRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.PhoneNumber))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Phone number is required for test message"
                    });
                }

                var testMessage = $"Test message from IoT Containment Management System at {DateTime.Now:yyyy-MM-dd HH:mm:ss}";
                var success = await _whatsAppService.SendMessageAsync(
                    request.PhoneNumber,
                    request.RecipientName ?? "Test User",
                    testMessage);

                if (success)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Success = true,
                        Message = "Test message sent successfully",
                        Data = new
                        {
                            PhoneNumber = request.PhoneNumber,
                            TestMessage = testMessage,
                            SentAt = DateTime.UtcNow
                        }
                    });
                }
                else
                {
                    return StatusCode(500, new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Failed to send test message. Please check WhatsApp configuration and logs."
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WhatsApp test message to {PhoneNumber}", request.PhoneNumber);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while sending the test message"
                });
            }
        }

        /// <summary>
        /// Get WhatsApp service status and configuration
        /// </summary>
        [HttpGet("status")]
        public ActionResult<ApiResponse<object>> GetStatus()
        {
            try
            {
                // Check if WhatsApp service is properly configured
                var isConfigured = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WHATSAPP_QONTAK_BEARER_TOKEN")) ||
                                  !string.IsNullOrEmpty(_configuration["WhatsApp:Qontak:BearerToken"]);

                var status = new
                {
                    serviceAvailable = isConfigured,
                    lastChecked = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    provider = "Qontak",
                    apiEndpoint = "https://service-chat.qontak.com/api/open/v1"
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "WhatsApp service status retrieved",
                    Data = status
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving WhatsApp service status");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving service status"
                });
            }
        }
    }

    // Request models
    public class SendMessageRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string? RecipientName { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class SendTemplateMessageRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string? RecipientName { get; set; }
        public string TemplateId { get; set; } = string.Empty;
        public Dictionary<string, string>? Parameters { get; set; }
    }

    public class WhatsAppTestMessageRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string? RecipientName { get; set; }
    }
}