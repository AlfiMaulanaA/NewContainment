using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Services
{
    public class FileService : IFileService
    {
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<FileService> _logger;
        private readonly string _uploadsPath;
        private readonly long _maxFileSize = 5 * 1024 * 1024; // 5MB
        private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };

        public FileService(IWebHostEnvironment environment, ILogger<FileService> logger)
        {
            _environment = environment;
            _logger = logger;
            _uploadsPath = Path.Combine(_environment.WebRootPath, "uploads", "users");
            
            // Ensure uploads directory exists
            if (!Directory.Exists(_uploadsPath))
            {
                Directory.CreateDirectory(_uploadsPath);
            }
        }

        public async Task<string> SaveUserPhotoAsync(IFormFile file, int userId)
        {
            try
            {
                if (!IsValidImageFile(file))
                {
                    throw new ArgumentException("Invalid file format or size");
                }

                // Generate unique filename
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
                var fileName = $"user_{userId}_{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(_uploadsPath, fileName);

                // Delete existing photo if exists
                var existingFiles = Directory.GetFiles(_uploadsPath, $"user_{userId}_*");
                foreach (var existingFile in existingFiles)
                {
                    try
                    {
                        File.Delete(existingFile);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Failed to delete existing photo {existingFile}: {ex.Message}");
                    }
                }

                // Save new file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Return relative path for database storage
                return $"/uploads/users/{fileName}";
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error saving user photo: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteUserPhotoAsync(string photoPath)
        {
            try
            {
                if (string.IsNullOrEmpty(photoPath) || photoPath == GetDefaultPhotoPath())
                {
                    return true;
                }

                var fullPath = Path.Combine(_environment.WebRootPath, photoPath.TrimStart('/'));
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error deleting user photo: {ex.Message}");
                return false;
            }
        }

        public async Task<FileContentResult?> GetUserPhotoAsync(string photoPath)
        {
            try
            {
                if (string.IsNullOrEmpty(photoPath))
                {
                    return null;
                }

                var fullPath = Path.Combine(_environment.WebRootPath, photoPath.TrimStart('/'));
                if (!File.Exists(fullPath))
                {
                    return null;
                }

                var bytes = await File.ReadAllBytesAsync(fullPath);
                var contentType = GetContentType(photoPath);
                
                return new FileContentResult(bytes, contentType)
                {
                    FileDownloadName = Path.GetFileName(photoPath)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving user photo: {ex.Message}");
                return null;
            }
        }

        public bool IsValidImageFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return false;
            }

            // Check file size
            if (file.Length > _maxFileSize)
            {
                return false;
            }

            // Check file extension
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_allowedExtensions.Contains(extension))
            {
                return false;
            }

            // Check content type
            var allowedContentTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif" };
            if (!allowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
            {
                return false;
            }

            return true;
        }

        public string GetDefaultPhotoPath()
        {
            return "/images/avatar-user.png";
        }

        private string GetContentType(string path)
        {
            var extension = Path.GetExtension(path).ToLowerInvariant();
            return extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };
        }
    }
}