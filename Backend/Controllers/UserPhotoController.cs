using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserPhotoController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<UserPhotoController> _logger;
        private readonly IWebHostEnvironment _environment;

        public UserPhotoController(IUserService userService, ILogger<UserPhotoController> logger, IWebHostEnvironment environment)
        {
            _userService = userService;
            _logger = logger;
            _environment = environment;
        }

        [HttpPost("upload/{userId}")]
        public async Task<IActionResult> UploadPhoto(int userId, IFormFile photo)
        {
            try
            {
                if (photo == null || photo.Length == 0)
                {
                    return BadRequest(new { success = false, message = "No photo file provided" });
                }

                // Validate file type
                var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif" };
                if (!allowedTypes.Contains(photo.ContentType.ToLower()))
                {
                    return BadRequest(new { success = false, message = "Only image files are allowed (JPEG, PNG, GIF)" });
                }

                // Validate file size (max 5MB)
                if (photo.Length > 5 * 1024 * 1024)
                {
                    return BadRequest(new { success = false, message = "File size cannot exceed 5MB" });
                }

                // Check if user exists
                var user = await _userService.GetUserByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Create uploads directory if it doesn't exist
                var uploadsPath = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, "uploads", "users");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Generate unique filename
                var fileExtension = Path.GetExtension(photo.FileName);
                var fileName = $"user_{userId}_{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Delete old photo if exists
                if (!string.IsNullOrEmpty(user.PhotoPath) && user.PhotoPath != "/images/avatar-user.png")
                {
                    var oldPhotoPath = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, user.PhotoPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                    if (System.IO.File.Exists(oldPhotoPath))
                    {
                        try
                        {
                            System.IO.File.Delete(oldPhotoPath);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to delete old photo file: {FilePath}", oldPhotoPath);
                        }
                    }
                }

                // Save new photo
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await photo.CopyToAsync(stream);
                }

                // Update user photo path in database
                var relativePath = $"/uploads/users/{fileName}";
                user.PhotoPath = relativePath;
                
                var updatedUser = await _userService.UpdateUserAsync(userId, user);
                if (updatedUser == null)
                {
                    return BadRequest(new { success = false, message = "Failed to update user photo path" });
                }

                _logger.LogInformation("User photo uploaded successfully for user {UserId}: {PhotoPath}", userId, relativePath);

                return Ok(new 
                { 
                    success = true, 
                    message = "Photo uploaded successfully",
                    photoPath = relativePath,
                    photoUrl = $"{Request.Scheme}://{Request.Host}{relativePath}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading photo for user {UserId}", userId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpDelete("delete/{userId}")]
        public async Task<IActionResult> DeletePhoto(int userId)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                if (string.IsNullOrEmpty(user.PhotoPath) || user.PhotoPath == "/images/avatar-user.png")
                {
                    return BadRequest(new { success = false, message = "User has no custom photo to delete" });
                }

                // Delete photo file
                var photoPath = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, user.PhotoPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(photoPath))
                {
                    try
                    {
                        System.IO.File.Delete(photoPath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete photo file: {FilePath}", photoPath);
                    }
                }

                // Reset user photo to default
                user.PhotoPath = "/images/avatar-user.png";
                var updatedUser = await _userService.UpdateUserAsync(userId, user);
                
                if (updatedUser == null)
                {
                    return BadRequest(new { success = false, message = "Failed to reset user photo" });
                }

                _logger.LogInformation("User photo deleted successfully for user {UserId}", userId);

                return Ok(new 
                { 
                    success = true, 
                    message = "Photo deleted successfully",
                    photoPath = "/images/avatar-user.png"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting photo for user {UserId}", userId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("get/{userId}")]
        public async Task<IActionResult> GetPhoto(int userId)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                var photoPath = user.PhotoPath ?? "/images/avatar-user.png";
                var photoUrl = string.IsNullOrEmpty(photoPath) || photoPath == "/images/avatar-user.png" 
                    ? "/images/avatar-user.png"
                    : $"{Request.Scheme}://{Request.Host}{photoPath}";

                return Ok(new 
                { 
                    success = true,
                    photoPath = photoPath,
                    photoUrl = photoUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting photo for user {UserId}", userId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }
}