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
    public class RackController : ControllerBase
    {
        private readonly IRackService _rackService;

        public RackController(IRackService rackService)
        {
            _rackService = rackService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Rack>>> GetRacks()
        {
            var racks = await _rackService.GetAllRacksAsync();
            return Ok(racks);
        }

        [HttpGet("by-containment/{containmentId}")]
        public async Task<ActionResult<IEnumerable<Rack>>> GetRacksByContainment(int containmentId)
        {
            var racks = await _rackService.GetRacksByContainmentIdAsync(containmentId);
            return Ok(racks);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Rack>> GetRack(int id)
        {
            var rack = await _rackService.GetRackByIdAsync(id);
            
            if (rack == null)
            {
                return NotFound();
            }

            return Ok(rack);
        }

        [HttpPost]
        public async Task<ActionResult<Rack>> CreateRack(CreateRackRequest request)
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

            var rack = new Rack
            {
                Name = request.Name,
                ContainmentId = request.ContainmentId,
                Description = request.Description
            };

            var createdRack = await _rackService.CreateRackAsync(rack, userId);
            return CreatedAtAction(nameof(GetRack), new { id = createdRack.Id }, createdRack);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRack(int id, UpdateRackRequest request)
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

            var rack = new Rack
            {
                Name = request.Name,
                ContainmentId = request.ContainmentId,
                Description = request.Description
            };

            var updatedRack = await _rackService.UpdateRackAsync(id, rack, userId);
            
            if (updatedRack == null)
            {
                return NotFound();
            }

            return Ok(updatedRack);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRack(int id)
        {
            var result = await _rackService.DeleteRackAsync(id);
            
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

    public class CreateRackRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public int ContainmentId { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
    }

    public class UpdateRackRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public int ContainmentId { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
    }
}