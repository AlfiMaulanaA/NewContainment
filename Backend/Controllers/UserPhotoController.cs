using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserPhotoController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IFileService _fileService;
        private readonly ILogger<UserPhotoController> _logger;

        public UserPhotoController(AppDbContext context, IFileService fileService, ILogger<UserPhotoController> logger)
        {
            _context = context;
            _fileService = fileService;
            _logger = logger;
        }

        [HttpPost("upload/{userId}")]
        public async Task<IActionResult> UploadUserPhoto(int userId, IFormFile photo)
        {
            try
            {
                if (photo == null || photo.Length == 0)
                {
                    return BadRequest(new { message = "No photo file provided" });
                }

                // Check if user exists
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Validate file
                if (!_fileService.IsValidImageFile(photo))
                {
                    return BadRequest(new { message = "Invalid image file. Please upload JPG, JPEG, PNG, or GIF files under 5MB." });
                }

                // Delete old photo if exists
                if (!string.IsNullOrEmpty(user.PhotoPath) && user.PhotoPath != _fileService.GetDefaultPhotoPath())
                {
                    await _fileService.DeleteUserPhotoAsync(user.PhotoPath);
                }

                // Save new photo
                var photoPath = await _fileService.SaveUserPhotoAsync(photo, userId);

                // Update user record
                user.PhotoPath = photoPath;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = "Photo uploaded successfully", 
                    photoPath = photoPath,
                    userId = userId
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error uploading user photo: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error occurred while uploading photo" });
            }
        }

        [HttpDelete("{userId}/photo")]
        public async Task<IActionResult> DeleteUserPhoto(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Delete photo file if exists
                if (!string.IsNullOrEmpty(user.PhotoPath) && user.PhotoPath != _fileService.GetDefaultPhotoPath())
                {
                    await _fileService.DeleteUserPhotoAsync(user.PhotoPath);
                }

                // Reset to default photo
                user.PhotoPath = _fileService.GetDefaultPhotoPath();
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Photo deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error deleting user photo: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error occurred while deleting photo" });
            }
        }

        [HttpGet("{userId}/photo")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserPhoto(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                if (string.IsNullOrEmpty(user.PhotoPath) || user.PhotoPath == _fileService.GetDefaultPhotoPath())
                {
                    return Ok(new { photoPath = _fileService.GetDefaultPhotoPath() });
                }

                var fileResult = await _fileService.GetUserPhotoAsync(user.PhotoPath);
                if (fileResult != null)
                {
                    return fileResult;
                }

                // If file doesn't exist, return default
                return Ok(new { photoPath = _fileService.GetDefaultPhotoPath() });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving user photo: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error occurred while retrieving photo" });
            }
        }

        [HttpGet("{userId}/photo/path")]
        public async Task<IActionResult> GetUserPhotoPath(int userId)
        {
            try
            {
                var user = await _context.Users
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.Id, u.PhotoPath })
                    .FirstOrDefaultAsync();

                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                return Ok(new 
                { 
                    userId = user.Id,
                    photoPath = user.PhotoPath ?? _fileService.GetDefaultPhotoPath()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving user photo path: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error occurred while retrieving photo path" });
            }
        }
    }
}