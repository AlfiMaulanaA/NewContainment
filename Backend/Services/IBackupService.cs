namespace Backend.Services
{
    public interface IBackupService
    {
        Task<bool> CreateBackupAsync();
        Task<bool> CreateBackupAsync(string backupPath);
        Task<string> GetBackupDirectoryAsync();
        Task<IEnumerable<string>> GetAvailableBackupsAsync();
        Task<bool> DeleteOldBackupsAsync(int keepLastN = 4);
        Task<DateTime?> GetLastBackupDateAsync();
        Task<bool> IsBackupDueAsync();
    }
}