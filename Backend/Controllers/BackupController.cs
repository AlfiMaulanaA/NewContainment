using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class BackupController : ControllerBase
    {
        private readonly IBackupService _backupService;

        public BackupController(IBackupService backupService)
        {
            _backupService = backupService;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateBackup()
        {
            var result = await _backupService.CreateBackupAsync();

            if (result)
            {
                return Ok(new { message = "Backup created successfully" });
            }

            return BadRequest(new { message = "Failed to create backup" });
        }

        [HttpGet("available")]
        public async Task<ActionResult<IEnumerable<string>>> GetAvailableBackups()
        {
            var backups = await _backupService.GetAvailableBackupsAsync();
            return Ok(backups);
        }

        [HttpGet("last-backup-date")]
        public async Task<ActionResult<DateTime?>> GetLastBackupDate()
        {
            var lastBackupDate = await _backupService.GetLastBackupDateAsync();
            return Ok(lastBackupDate);
        }

        [HttpGet("is-backup-due")]
        public async Task<ActionResult<bool>> IsBackupDue()
        {
            var isDue = await _backupService.IsBackupDueAsync();
            return Ok(isDue);
        }

        [HttpDelete("cleanup")]
        public async Task<IActionResult> CleanupOldBackups([FromQuery] int keepLastN = 4)
        {
            var result = await _backupService.DeleteOldBackupsAsync(keepLastN);

            if (result)
            {
                return Ok(new { message = $"Old backups cleaned up, kept last {keepLastN}" });
            }

            return BadRequest(new { message = "Failed to cleanup old backups" });
        }

        [HttpGet("directory")]
        public async Task<ActionResult<string>> GetBackupDirectory()
        {
            var directory = await _backupService.GetBackupDirectoryAsync();
            return Ok(directory);
        }
    }
}