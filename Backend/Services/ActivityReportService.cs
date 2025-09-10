using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Services
{
    public class ActivityReportService : IActivityReportService
    {
        private readonly AppDbContext _context;

        public ActivityReportService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ActivityReport>> GetAllActivityReportsAsync()
        {
            return await _context.ActivityReports
                .Include(ar => ar.User)
                .OrderByDescending(ar => ar.Timestamp)
                .ToListAsync();
        }

        public async Task<IEnumerable<ActivityReport>> GetActivityReportsByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            return await _context.ActivityReports
                .Include(ar => ar.User)
                .Where(ar => ar.Timestamp >= startDate && ar.Timestamp <= endDate)
                .OrderByDescending(ar => ar.Timestamp)
                .ToListAsync();
        }

        public async Task<IEnumerable<ActivityReport>> GetActivityReportsByStatusAsync(string status)
        {
            return await _context.ActivityReports
                .Include(ar => ar.User)
                .Where(ar => ar.Status == status)
                .OrderByDescending(ar => ar.Timestamp)
                .ToListAsync();
        }

        public async Task<IEnumerable<ActivityReport>> GetActivityReportsByTriggerAsync(string trigger)
        {
            return await _context.ActivityReports
                .Include(ar => ar.User)
                .Where(ar => ar.Trigger == trigger)
                .OrderByDescending(ar => ar.Timestamp)
                .ToListAsync();
        }

        public async Task<ActivityReport?> GetActivityReportByIdAsync(int id)
        {
            return await _context.ActivityReports
                .Include(ar => ar.User)
                .FirstOrDefaultAsync(ar => ar.Id == id);
        }

        public async Task<ActivityReport> CreateActivityReportAsync(ActivityReport activityReport)
        {
            activityReport.Timestamp = DateTime.UtcNow;

            _context.ActivityReports.Add(activityReport);
            await _context.SaveChangesAsync();

            return await GetActivityReportByIdAsync(activityReport.Id) ?? activityReport;
        }

        public async Task<bool> DeleteActivityReportByIdAsync(int id)
        {
            var activityReport = await _context.ActivityReports.FindAsync(id);
            if (activityReport == null)
            {
                return false;
            }

            _context.ActivityReports.Remove(activityReport);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAllActivityReportsAsync()
        {
            var allReports = await _context.ActivityReports.ToListAsync();
            if (!allReports.Any())
            {
                return false;
            }

            _context.ActivityReports.RemoveRange(allReports);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> GetTotalActivityReportsCountAsync()
        {
            return await _context.ActivityReports.CountAsync();
        }
    }
}