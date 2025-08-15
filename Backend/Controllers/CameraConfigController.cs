using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Models;
using Backend.Services;
using System.ComponentModel.DataAnnotations;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CameraConfigsController : ControllerBase
    {
        private readonly ICameraConfigsService _cameraConfigService;

        public CameraConfigsController(ICameraConfigsService cameraConfigService)
        {
            _cameraConfigService = cameraConfigService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CameraConfig>>> GetCameraConfigs()
        {
            var configs = await _cameraConfigService.GetAllCameraConfigsAsync();
            return Ok(configs);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CameraConfig>> GetCameraConfig(int id)
        {
            var config = await _cameraConfigService.GetCameraConfigByIdAsync(id);
            if (config == null)
            {
                return NotFound();
            }
            return Ok(config);
        }

        [HttpPost]
        public async Task<ActionResult<CameraConfig>> CreateCameraConfig(CreateCameraConfigRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var config = new CameraConfig
            {
                Name = request.Name,
                IpAddress = request.IpAddress,
                Port = request.Port,
                ApiKey = request.ApiKey,
                Group = request.Group
            };

            var createdConfig = await _cameraConfigService.CreateCameraConfigAsync(config);
            return CreatedAtAction(nameof(GetCameraConfig), new { id = createdConfig.Id }, createdConfig);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCameraConfig(int id, UpdateCameraConfigRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var existingConfig = await _cameraConfigService.GetCameraConfigByIdAsync(id);
            if (existingConfig == null)
            {
                return NotFound();
            }
            
            // This is the line that was causing the error in the image.
            // The method call in your original code was missing the 'existingConfig' parameter.
            // This code block is correct as written in the provided code snippet.
            existingConfig.Name = request.Name;
            existingConfig.IpAddress = request.IpAddress;
            existingConfig.Port = request.Port;
            existingConfig.ApiKey = request.ApiKey;
            existingConfig.Group = request.Group;
            
            var updatedConfig = await _cameraConfigService.UpdateCameraConfigAsync(id, existingConfig);

            if (updatedConfig == null)
            {
                return NotFound();
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCameraConfig(int id)
        {
            var config = await _cameraConfigService.GetCameraConfigByIdAsync(id);
            if (config == null)
            {
                return NotFound();
            }
            await _cameraConfigService.DeleteCameraConfigAsync(id);
            return NoContent();
        }


        public class CreateCameraConfigRequest
        {
            [Required]
            public string Name { get; set; } = string.Empty; // Added default value to avoid CS8618 warning

            [Required]
            [RegularExpression(@"^(\d{1,3}\.){3}\d{1,3}$", ErrorMessage = "Invalid IP address format.")]
            public string IpAddress { get; set; } = string.Empty; // Added default value

            [Required]
            [Range(1, 65535, ErrorMessage = "Port must be between 1 and 65535.")]
            public int Port { get; set; }

            [Required]
            public string ApiKey { get; set; } = string.Empty; // Added default value

            [Required]
            public string Group { get; set; } = string.Empty; // Added default value
        }

        public class UpdateCameraConfigRequest
        {
            [Required]
            [StringLength(100)]
            public string Name { get; set; } = string.Empty;

            [Required]
            [RegularExpression(@"^(\d{1,3}\.){3}\d{1,3}$", ErrorMessage = "Invalid IP address format.")]
            public string IpAddress { get; set; } = string.Empty;

            [Required]
            [Range(1, 65535, ErrorMessage = "Port must be between 1 and 65535.")]
            public int Port { get; set; } = 80;

            [Required]
            public string ApiKey { get; set; } = string.Empty;

            [Required]
            [StringLength(50)]
            public string Group { get; set; } = string.Empty;
        }
    }
}