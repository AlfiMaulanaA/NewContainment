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
    public class MaintenanceController : ControllerBase
    {
        private readonly IMaintenanceService _maintenanceService;

        public MaintenanceController(IMaintenanceService maintenanceService)
        {
            _maintenanceService = maintenanceService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Maintenance>>> GetMaintenances()
        {
            var maintenances = await _maintenanceService.GetAllMaintenancesAsync();
            return Ok(maintenances);
        }

        [HttpGet("by-target/{targetType}/{targetId}")]
        public async Task<ActionResult<IEnumerable<Maintenance>>> GetMaintenancesByTarget(MaintenanceTarget targetType, int targetId)
        {
            var maintenances = await _maintenanceService.GetMaintenancesByTargetAsync(targetType, targetId);
            return Ok(maintenances);
        }

        [HttpGet("by-assignee/{userId}")]
        public async Task<ActionResult<IEnumerable<Maintenance>>> GetMaintenancesByAssignee(int userId)
        {
            var maintenances = await _maintenanceService.GetMaintenancesByAssigneeAsync(userId);
            return Ok(maintenances);
        }

        [HttpGet("my-tasks")]
        public async Task<ActionResult<IEnumerable<Maintenance>>> GetMyMaintenanceTasks()
        {
            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var maintenances = await _maintenanceService.GetMaintenancesByAssigneeAsync(userId);
            return Ok(maintenances);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Maintenance>> GetMaintenance(int id)
        {
            var maintenance = await _maintenanceService.GetMaintenanceByIdAsync(id);
            
            if (maintenance == null)
            {
                return NotFound();
            }

            return Ok(maintenance);
        }

        [HttpPost]
        public async Task<ActionResult<Maintenance>> CreateMaintenance(CreateMaintenanceRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (request.StartTask >= request.EndTask)
            {
                return BadRequest("End task must be after start task");
            }

            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var maintenance = new Maintenance
            {
                Name = request.Name,
                Description = request.Description,
                StartTask = request.StartTask,
                EndTask = request.EndTask,
                AssignTo = request.AssignTo,
                TargetType = request.TargetType,
                TargetId = request.TargetId
            };

            var createdMaintenance = await _maintenanceService.CreateMaintenanceAsync(maintenance, userId);
            return CreatedAtAction(nameof(GetMaintenance), new { id = createdMaintenance.Id }, createdMaintenance);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMaintenance(int id, UpdateMaintenanceRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (request.StartTask >= request.EndTask)
            {
                return BadRequest("End task must be after start task");
            }

            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var maintenance = new Maintenance
            {
                Name = request.Name,
                Description = request.Description,
                StartTask = request.StartTask,
                EndTask = request.EndTask,
                AssignTo = request.AssignTo,
                TargetType = request.TargetType,
                TargetId = request.TargetId,
                Status = request.Status ?? "Scheduled"
            };

            var updatedMaintenance = await _maintenanceService.UpdateMaintenanceAsync(id, maintenance, userId);
            
            if (updatedMaintenance == null)
            {
                return NotFound();
            }

            return Ok(updatedMaintenance);
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateMaintenanceStatus(int id, UpdateMaintenanceStatusRequest request)
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

            var result = await _maintenanceService.UpdateMaintenanceStatusAsync(id, request.Status, userId);
            
            if (!result)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMaintenance(int id)
        {
            var result = await _maintenanceService.DeleteMaintenanceAsync(id);
            
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

    public class CreateMaintenanceRequest
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(1000)]
        public string? Description { get; set; }
        
        [Required]
        public DateTime StartTask { get; set; }
        
        [Required]
        public DateTime EndTask { get; set; }
        
        [Required]
        public int AssignTo { get; set; }
        
        [Required]
        public MaintenanceTarget TargetType { get; set; }
        
        [Required]
        public int TargetId { get; set; }
    }

    public class UpdateMaintenanceRequest
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(1000)]
        public string? Description { get; set; }
        
        [Required]
        public DateTime StartTask { get; set; }
        
        [Required]
        public DateTime EndTask { get; set; }
        
        [Required]
        public int AssignTo { get; set; }
        
        [Required]
        public MaintenanceTarget TargetType { get; set; }
        
        [Required]
        public int TargetId { get; set; }
        
        [StringLength(50)]
        public string? Status { get; set; } = "Scheduled";
    }

    public class UpdateMaintenanceStatusRequest
    {
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = string.Empty;
    }
}