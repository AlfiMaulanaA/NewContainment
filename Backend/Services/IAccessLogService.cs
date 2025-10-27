using Backend.Models;
using Backend.Enums;

namespace Backend.Services
{
    public interface IAccessLogService
    {
        Task<IEnumerable<AccessLog>> GetAllAccessLogsAsync();
        Task<(IEnumerable<AccessLog> Data, int Total)> GetAccessLogsAsync(
            int page = 1,
            int pageSize = 50,
            AccessMethod? via = null,
            string? user = null,
            DateTime? startDate = null,
            DateTime? endDate = null);
        Task<AccessLog?> GetAccessLogByIdAsync(int id);
        Task<AccessLog> CreateAccessLogAsync(AccessLog accessLog);
        Task<AccessLog> LogSoftwareAccessAsync(string user, string trigger, string? additionalData = null);
        Task<IEnumerable<AccessLog>> GetAccessLogsByViaAsync(AccessMethod via);
        Task<IEnumerable<AccessLog>> GetAccessLogsByUserAsync(string user);
        Task<object> GetAccessLogSummaryAsync(DateTime? startDate = null, DateTime? endDate = null);
    }
}