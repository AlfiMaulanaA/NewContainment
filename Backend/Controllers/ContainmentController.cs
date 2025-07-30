using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Models;
using Backend.Services;
using Backend.Enums;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ContainmentController : ControllerBase
    {
        private readonly IContainmentService _containmentService;

        public ContainmentController(IContainmentService containmentService)
        {
            _containmentService = containmentService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Containment>>> GetContainments()
        {
            var containments = await _containmentService.GetAllContainmentsAsync();
            return Ok(containments);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Containment>> GetContainment(int id)
        {
            var containment = await _containmentService.GetContainmentByIdAsync(id);
            
            if (containment == null)
            {
                return NotFound();
            }

            return Ok(containment);
        }

        [HttpPost]
        public async Task<ActionResult<Containment>> CreateContainment(CreateContainmentRequest request)
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

            var containment = new Containment
            {
                Name = request.Name,
                Type = request.Type,
                Description = request.Description,
                Location = request.Location
            };

            var createdContainment = await _containmentService.CreateContainmentAsync(containment, userId);
            return CreatedAtAction(nameof(GetContainment), new { id = createdContainment.Id }, createdContainment);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateContainment(int id, UpdateContainmentRequest request)
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

            var containment = new Containment
            {
                Name = request.Name,
                Type = request.Type,
                Description = request.Description,
                Location = request.Location
            };

            var updatedContainment = await _containmentService.UpdateContainmentAsync(id, containment, userId);
            
            if (updatedContainment == null)
            {
                return NotFound();
            }

            return Ok(updatedContainment);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteContainment(int id)
        {
            var result = await _containmentService.DeleteContainmentAsync(id);
            
            if (!result)
            {
                return NotFound();
            }

            return NoContent();
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

    public class CreateContainmentRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public ContainmentType Type { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Location { get; set; } = string.Empty;
    }

    public class UpdateContainmentRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public ContainmentType Type { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Location { get; set; } = string.Empty;
    }
}