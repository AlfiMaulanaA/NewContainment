using Backend.Models;
using Backend.Data;
using Backend.Enums;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class AccessLogService : IAccessLogService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AccessLogService> _logger;

        public AccessLogService(AppDbContext context, ILogger<AccessLogService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<AccessLog>> GetAllAccessLogsAsync()
        {
            return await _context.AccessLogs
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();
        }

        public async Task<(IEnumerable<AccessLog> Data, int Total)> GetAccessLogsAsync(
            int page = 1,
            int pageSize = 50,
            AccessMethod? via = null,
            string? user = null,
            DateTime? startDate = null,
            DateTime? endDate = null)
        {
            var query = _context.AccessLogs.AsQueryable();

            // Apply filters
            if (via.HasValue)
                query = query.Where(a => a.Via == via.Value);

            if (!string.IsNullOrEmpty(user))
                query = query.Where(a => a.User.Contains(user));

            if (startDate.HasValue)
                query = query.Where(a => a.Timestamp >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(a => a.Timestamp <= endDate.Value);

            // Get total count before pagination
            var total = await query.CountAsync();

            // Apply pagination and ordering
            var data = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }

        public async Task<AccessLog?> GetAccessLogByIdAsync(int id)
        {
            return await _context.AccessLogs.FindAsync(id);
        }

        public async Task<AccessLog> CreateAccessLogAsync(AccessLog accessLog)
        {
            accessLog.Timestamp = DateTime.UtcNow;
            _context.AccessLogs.Add(accessLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Access log created: User={User}, Via={Via}, Trigger={Trigger}",
                accessLog.User, accessLog.Via, accessLog.Trigger);

            return accessLog;
        }

        public async Task<AccessLog> LogSoftwareAccessAsync(string user, string trigger, string? additionalData = null)
        {
            var accessLog = new AccessLog
            {
                User = user,
                Via = AccessMethod.Software,
                Trigger = trigger,
                AdditionalData = additionalData,
                IsSuccess = true,
                Timestamp = DateTime.UtcNow
            };

            return await CreateAccessLogAsync(accessLog);
        }

        public async Task<IEnumerable<AccessLog>> GetAccessLogsByViaAsync(AccessMethod via)
        {
            return await _context.AccessLogs
                .Where(a => a.Via == via)
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();
        }

        public async Task<IEnumerable<AccessLog>> GetAccessLogsByUserAsync(string user)
        {
            return await _context.AccessLogs
                .Where(a => a.User.Contains(user))
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();
        }

        public async Task<object> GetAccessLogSummaryAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.AccessLogs.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(a => a.Timestamp >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(a => a.Timestamp <= endDate.Value);

            var totalLogs = await query.CountAsync();
            var successfulLogs = await query.CountAsync(a => a.IsSuccess);
            var failedLogs = totalLogs - successfulLogs;

            var logsByVia = await query
                .GroupBy(a => a.Via)
                .Select(g => new { Via = g.Key, Count = g.Count() })
                .ToListAsync();

            var logsByUser = await query
                .GroupBy(a => a.User)
                .Select(g => new { User = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync();

            var recentLogs = await query
                .OrderByDescending(a => a.Timestamp)
                .Take(10)
                .ToListAsync();

            return new
            {
                TotalLogs = totalLogs,
                SuccessfulLogs = successfulLogs,
                FailedLogs = failedLogs,
                LogsByVia = logsByVia,
                TopUsers = logsByUser,
                RecentLogs = recentLogs,
                DateRange = new { Start = startDate, End = endDate },
                GeneratedAt = DateTime.UtcNow
            };
        }
    }
}