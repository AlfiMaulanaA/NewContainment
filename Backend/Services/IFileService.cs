using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Services
{
    public interface IFileService
    {
        Task<string> SaveUserPhotoAsync(IFormFile file, int userId);
        Task<bool> DeleteUserPhotoAsync(string photoPath);
        Task<FileContentResult?> GetUserPhotoAsync(string photoPath);
        Task<IFormFile?> GetUserPhotoFileAsync(string photoPath);
        bool IsValidImageFile(IFormFile file);
        string GetDefaultPhotoPath();
    }
}