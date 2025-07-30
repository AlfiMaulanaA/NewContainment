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
    public class ActivityReportController : ControllerBase
    {
        private readonly IActivityReportService _activityReportService;

        public ActivityReportController(IActivityReportService activityReportService)
        {
            _activityReportService = activityReportService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ActivityReport>>> GetActivityReports()
        {
            var reports = await _activityReportService.GetAllActivityReportsAsync();
            return Ok(reports);
        }

        [HttpGet("by-date-range")]
        public async Task<ActionResult<IEnumerable<ActivityReport>>> GetActivityReportsByDateRange(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate)
        {
            if (startDate > endDate)
            {
                return BadRequest("Start date must be before end date");
            }

            var reports = await _activityReportService.GetActivityReportsByDateRangeAsync(startDate, endDate);
            return Ok(reports);
        }

        [HttpGet("by-status/{status}")]
        public async Task<ActionResult<IEnumerable<ActivityReport>>> GetActivityReportsByStatus(string status)
        {
            var reports = await _activityReportService.GetActivityReportsByStatusAsync(status);
            return Ok(reports);
        }

        [HttpGet("by-trigger/{trigger}")]
        public async Task<ActionResult<IEnumerable<ActivityReport>>> GetActivityReportsByTrigger(string trigger)
        {
            var reports = await _activityReportService.GetActivityReportsByTriggerAsync(trigger);
            return Ok(reports);
        }

        [HttpGet("count")]
        public async Task<ActionResult<int>> GetTotalCount()
        {
            var count = await _activityReportService.GetTotalActivityReportsCountAsync();
            return Ok(count);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ActivityReport>> GetActivityReport(int id)
        {
            var report = await _activityReportService.GetActivityReportByIdAsync(id);
            
            if (report == null)
            {
                return NotFound();
            }

            return Ok(report);
        }

        [HttpPost]
        public async Task<ActionResult<ActivityReport>> CreateActivityReport(CreateActivityReportRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();

            var activityReport = new ActivityReport
            {
                Description = request.Description,
                Status = request.Status,
                Trigger = request.Trigger,
                AdditionalData = request.AdditionalData,
                UserId = userId > 0 ? userId : null
            };

            var createdReport = await _activityReportService.CreateActivityReportAsync(activityReport);
            return CreatedAtAction(nameof(GetActivityReport), new { id = createdReport.Id }, createdReport);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteActivityReport(int id)
        {
            var result = await _activityReportService.DeleteActivityReportByIdAsync(id);
            
            if (!result)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpDelete("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteAllActivityReports()
        {
            var result = await _activityReportService.DeleteAllActivityReportsAsync();
            
            if (!result)
            {
                return NotFound("No activity reports found to delete");
            }

            return Ok(new { message = "All activity reports have been deleted" });
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

    public class CreateActivityReportRequest
    {
        [Required]
        [StringLength(1000)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Trigger { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? AdditionalData { get; set; }
    }
}