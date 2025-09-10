using Microsoft.EntityFrameworkCore;
using Backend.Data;
using System.IO.Compression;

namespace Backend.Services
{
    public class BackupService : IBackupService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BackupService> _logger;
        private readonly string _backupDirectory;
        private readonly string _dbPath;

        public BackupService(AppDbContext context, ILogger<BackupService> logger, IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _backupDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Backups");
            _dbPath = GetDatabasePath(configuration);

            // Create backup directory if it doesn't exist
            Directory.CreateDirectory(_backupDirectory);
        }

        public async Task<bool> CreateBackupAsync()
        {
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd_HH-mm-ss");
            var backupFileName = $"backup_{timestamp}.db";
            var backupPath = Path.Combine(_backupDirectory, backupFileName);

            return await CreateBackupAsync(backupPath);
        }

        public async Task<bool> CreateBackupAsync(string backupPath)
        {
            try
            {
                _logger.LogInformation("Starting database backup to {BackupPath}", backupPath);

                // Ensure all changes are saved
                await _context.SaveChangesAsync();

                // Copy the SQLite database file
                if (File.Exists(_dbPath))
                {
                    File.Copy(_dbPath, backupPath, true);

                    // Compress the backup
                    var compressedPath = backupPath + ".gz";
                    await CompressFileAsync(backupPath, compressedPath);

                    // Delete uncompressed file
                    File.Delete(backupPath);

                    _logger.LogInformation("Database backup completed successfully: {BackupPath}", compressedPath);

                    // Log backup activity
                    await LogBackupActivity("Success", $"Backup created: {Path.GetFileName(compressedPath)}");

                    return true;
                }
                else
                {
                    _logger.LogWarning("Database file not found at {DbPath}", _dbPath);
                    await LogBackupActivity("Failed", "Database file not found");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create database backup");
                await LogBackupActivity("Failed", $"Error: {ex.Message}");
                return false;
            }
        }

        public async Task<string> GetBackupDirectoryAsync()
        {
            return await Task.FromResult(_backupDirectory);
        }

        public async Task<IEnumerable<string>> GetAvailableBackupsAsync()
        {
            try
            {
                var backupFiles = Directory.GetFiles(_backupDirectory, "backup_*.db.gz")
                    .Select(Path.GetFileName)
                    .Where(f => f != null)
                    .Cast<string>()
                    .OrderByDescending(f => f)
                    .ToList();

                return await Task.FromResult(backupFiles);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get available backups");
                return new List<string>();
            }
        }

        public async Task<bool> DeleteOldBackupsAsync(int keepLastN = 4)
        {
            try
            {
                var backupFiles = Directory.GetFiles(_backupDirectory, "backup_*.db.gz")
                    .OrderByDescending(f => File.GetCreationTime(f))
                    .Skip(keepLastN)
                    .ToList();

                foreach (var file in backupFiles)
                {
                    File.Delete(file);
                    _logger.LogInformation("Deleted old backup: {FileName}", Path.GetFileName(file));
                }

                if (backupFiles.Any())
                {
                    await LogBackupActivity("Cleanup", $"Deleted {backupFiles.Count} old backup(s)");
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete old backups");
                await LogBackupActivity("Cleanup Failed", $"Error: {ex.Message}");
                return false;
            }
        }

        public async Task<DateTime?> GetLastBackupDateAsync()
        {
            try
            {
                var lastBackupFile = Directory.GetFiles(_backupDirectory, "backup_*.db.gz")
                    .OrderByDescending(f => File.GetCreationTime(f))
                    .FirstOrDefault();

                if (lastBackupFile != null)
                {
                    return await Task.FromResult(File.GetCreationTime(lastBackupFile));
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get last backup date");
                return null;
            }
        }

        public async Task<bool> IsBackupDueAsync()
        {
            var lastBackupDate = await GetLastBackupDateAsync();

            if (lastBackupDate == null)
            {
                return true; // No backup exists, so it's due
            }

            // Check if 3 months have passed since last backup
            var threeMonthsAgo = DateTime.UtcNow.AddMonths(-3);
            return lastBackupDate.Value < threeMonthsAgo;
        }

        private string GetDatabasePath(IConfiguration configuration)
        {
            // Get database path from connection string
            var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "Data Source=app.db";

            // Extract the database file path from SQLite connection string
            var dataSourceIndex = connectionString.IndexOf("Data Source=", StringComparison.OrdinalIgnoreCase);
            if (dataSourceIndex >= 0)
            {
                var pathStart = dataSourceIndex + "Data Source=".Length;
                var pathEnd = connectionString.IndexOf(';', pathStart);
                var dbPath = pathEnd > 0 ? connectionString.Substring(pathStart, pathEnd - pathStart) : connectionString.Substring(pathStart);

                // Make path absolute if it's relative
                if (!Path.IsPathRooted(dbPath))
                {
                    dbPath = Path.Combine(Directory.GetCurrentDirectory(), dbPath);
                }

                return dbPath.Trim();
            }

            // Default fallback
            return Path.Combine(Directory.GetCurrentDirectory(), "app.db");
        }

        private async Task CompressFileAsync(string sourceFile, string compressedFile)
        {
            using var originalFileStream = File.OpenRead(sourceFile);
            using var compressedFileStream = File.Create(compressedFile);
            using var compressionStream = new GZipStream(compressedFileStream, CompressionMode.Compress);

            await originalFileStream.CopyToAsync(compressionStream);
        }

        private async Task LogBackupActivity(string status, string description)
        {
            try
            {
                var activityReport = new Models.ActivityReport
                {
                    Description = description,
                    Status = status,
                    Trigger = "BackupService",
                    AdditionalData = $"Backup directory: {_backupDirectory}",
                    Timestamp = DateTime.UtcNow
                };

                _context.ActivityReports.Add(activityReport);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log backup activity");
            }
        }
    }
}