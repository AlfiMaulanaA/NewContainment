using Backend.Models;

namespace Backend.Services
{
    public interface IActivityReportService
    {
        Task<IEnumerable<ActivityReport>> GetAllActivityReportsAsync();
        Task<IEnumerable<ActivityReport>> GetActivityReportsByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<ActivityReport>> GetActivityReportsByStatusAsync(string status);
        Task<IEnumerable<ActivityReport>> GetActivityReportsByTriggerAsync(string trigger);
        Task<ActivityReport?> GetActivityReportByIdAsync(int id);
        Task<ActivityReport> CreateActivityReportAsync(ActivityReport activityReport);
        Task<bool> DeleteActivityReportByIdAsync(int id);
        Task<bool> DeleteAllActivityReportsAsync();
        Task<int> GetTotalActivityReportsCountAsync();
    }
}