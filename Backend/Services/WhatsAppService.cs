using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Backend.Services
{
    public interface IWhatsAppService
    {
        Task<bool> SendMessageAsync(string phoneNumber, string recipientName, string messageText);
        Task<bool> SendTemplateMessageAsync(string phoneNumber, string recipientName, string templateId, Dictionary<string, string> parameters);
        // New public method for sending a hardcoded startup message
        Task SendStartupMessageAsync();
    }

    public class WhatsAppService : IWhatsAppService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<WhatsAppService> _logger;

        // Qontak API Configuration
        private readonly string _apiBaseUrl = "https://service-chat.qontak.com/api/open/v1";
        private readonly string? _bearerToken;
        private readonly string _defaultTemplateId;
        private readonly string _channelIntegrationId;

        public WhatsAppService(HttpClient httpClient, IConfiguration configuration, ILogger<WhatsAppService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;

            // Load configuration from appsettings.json or environment variables
            _bearerToken = Environment.GetEnvironmentVariable("WHATSAPP_QONTAK_BEARER_TOKEN") ??
                          _configuration["WhatsApp:Qontak:BearerToken"] ??
                          "1Bs4cNxWFLUWUEd-3WSUKJOOmfeis8z4VrHU73v6_1Q";

            _defaultTemplateId = Environment.GetEnvironmentVariable("WHATSAPP_QONTAK_DEFAULT_TEMPLATE_ID") ??
                                _configuration["WhatsApp:Qontak:DefaultTemplateId"] ??
                                "300d84f2-d962-4451-bc27-870fb99d18e7";

            _channelIntegrationId = Environment.GetEnvironmentVariable("WHATSAPP_QONTAK_CHANNEL_INTEGRATION_ID") ??
                                   _configuration["WhatsApp:Qontak:ChannelIntegrationId"] ??
                                   "662f9fcb-7e2b-4c1a-8eda-9aeb4a388004";

            // Log configuration for debugging
            _logger.LogInformation("WhatsApp Configuration - Bearer Token: {Token}, Template ID: {TemplateId}, Channel ID: {ChannelId}",
                _bearerToken?.Substring(0, Math.Min(_bearerToken.Length, 10)) + "...",
                _defaultTemplateId,
                _channelIntegrationId);

            // Setup HttpClient headers
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _bearerToken);
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        }

        /// <summary>
        /// Send a simple text message via WhatsApp using Qontak API
        /// </summary>
        /// <param name="phoneNumber">Phone number with country code (e.g., 6281284842478)</param>
        /// <param name="recipientName">Name of the recipient</param>
        /// <param name="messageText">Message content to send</param>
        /// <returns>True if message sent successfully</returns>
        public async Task<bool> SendMessageAsync(string phoneNumber, string recipientName, string messageText)
        {
            try
            {
                // Validate configuration
                if (string.IsNullOrEmpty(_defaultTemplateId) || string.IsNullOrEmpty(_channelIntegrationId))
                {
                    _logger.LogError("WhatsApp configuration is invalid. Template ID: {TemplateId}, Channel ID: {ChannelId}",
                        _defaultTemplateId, _channelIntegrationId);
                    return false;
                }

                // Format phone number (ensure it starts with country code)
                var formattedPhoneNumber = FormatPhoneNumber(phoneNumber);

                // For direct text messages, use simple payload
                var payload = new
                {
                    to_number = formattedPhoneNumber,
                    to_name = recipientName,
                    message_template_id = _defaultTemplateId,
                    channel_integration_id = _channelIntegrationId,
                    language = new
                    {
                        code = "en"
                    },
                    parameters = new
                    {
                        body = new[]
                        {
                            new
                            {
                                key = "1",
                                value = "full_name",
                                value_text = recipientName
                            },
                            new
                            {
                                key = "2",
                                value = "messagetext",
                                value_text = messageText
                            }
                        }
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                    WriteIndented = true
                });

                _logger.LogInformation("Sending WhatsApp message to {PhoneNumber}: {Payload}", formattedPhoneNumber, jsonPayload);

                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_apiBaseUrl}/broadcasts/whatsapp/direct", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("✅ WhatsApp message sent successfully to {PhoneNumber}. Response: {Response}",
                        formattedPhoneNumber, responseContent);
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("❌ Failed to send WhatsApp message to {PhoneNumber}. Status: {StatusCode}, Error: {Error}",
                        formattedPhoneNumber, response.StatusCode, errorContent);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred while sending WhatsApp message to {PhoneNumber}", phoneNumber);
                return false;
            }
        }

        /// <summary>
        /// Send a template message via WhatsApp using Qontak API
        /// </summary>
        /// <param name="phoneNumber">Phone number with country code (e.g., 6281284842478)</param>
        /// <param name="recipientName">Name of the recipient</param>
        /// <param name="templateId">Qontak template ID</param>
        /// <param name="parameters">Template parameters</param>
        /// <returns>True if message sent successfully</returns>
        public async Task<bool> SendTemplateMessageAsync(string phoneNumber, string recipientName, string templateId, Dictionary<string, string> parameters)
        {
            try
            {
                // Format phone number (ensure it starts with country code)
                var formattedPhoneNumber = FormatPhoneNumber(phoneNumber);

                // Build parameters for template
                var bodyParameters = parameters.Select((kvp, index) => new
                {
                    key = (index + 1).ToString(),
                    value = kvp.Key,
                    value_text = kvp.Value
                }).ToArray();

                var payload = new
                {
                    to_number = formattedPhoneNumber,
                    to_name = recipientName,
                    message_template_id = templateId,
                    channel_integration_id = _channelIntegrationId,
                    language = new
                    {
                        code = "en"
                    },
                    parameters = new
                    {
                        body = bodyParameters
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                    WriteIndented = true
                });

                _logger.LogInformation("Sending WhatsApp message to {PhoneNumber}: {Payload}", formattedPhoneNumber, jsonPayload);

                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_apiBaseUrl}/broadcasts/whatsapp/direct", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("✅ WhatsApp message sent successfully to {PhoneNumber}. Response: {Response}",
                        formattedPhoneNumber, responseContent);
                    return true;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("❌ Failed to send WhatsApp message to {PhoneNumber}. Status: {StatusCode}, Error: {Error}",
                        formattedPhoneNumber, response.StatusCode, errorContent);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred while sending WhatsApp message to {PhoneNumber}", phoneNumber);
                return false;
            }
        }

        /// <summary>
        /// Sends a predefined "Hello, World!" message to a specific number on application startup.
        /// </summary>
        public async Task SendStartupMessageAsync()
        {
            string phoneNumber = "083116297507";
            string recipientName = "User"; // You can customize this name
            string messageText = "Hello, World! This is a test message from your backend application startup.";

            _logger.LogInformation("Attempting to send startup message to {PhoneNumber}...", phoneNumber);
            bool success = await SendMessageAsync(phoneNumber, recipientName, messageText);

            if (success)
            {
                _logger.LogInformation("Startup message successfully sent to {PhoneNumber}.", phoneNumber);
            }
            else
            {
                _logger.LogError("Failed to send startup message to {PhoneNumber}.", phoneNumber);
            }
        }

        /// <summary>
        /// Format phone number to ensure it has the correct format for Indonesian numbers
        /// </summary>
        /// <param name="phoneNumber">Raw phone number</param>
        /// <returns>Formatted phone number with country code</returns>
        private string FormatPhoneNumber(string phoneNumber)
        {
            if (string.IsNullOrEmpty(phoneNumber))
                return phoneNumber;

            // Remove all non-digit characters
            var cleanNumber = new string(phoneNumber.Where(char.IsDigit).ToArray());

            // Handle Indonesian numbers
            if (cleanNumber.StartsWith("08"))
            {
                // Convert 08xxx to 628xxx
                return "62" + cleanNumber.Substring(1);
            }
            else if (cleanNumber.StartsWith("8") && cleanNumber.Length >= 10)
            {
                // Convert 8xxx to 628xxx
                return "62" + cleanNumber;
            }
            else if (!cleanNumber.StartsWith("62") && cleanNumber.Length >= 10)
            {
                // Add 62 prefix if not present
                return "62" + cleanNumber;
            }

            return cleanNumber;
        }
    }
}
