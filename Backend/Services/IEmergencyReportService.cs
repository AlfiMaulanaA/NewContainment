using Backend.Models;

namespace Backend.Services
{
    public interface IEmergencyReportService
    {
        Task ProcessEmergencyStatusAsync(string emergencyType, bool status, string rawPayload);
        Task<IEnumerable<EmergencyReport>> GetEmergencyReportsAsync(EmergencyReportFilter filter);
        Task<IEnumerable<EmergencyReportSummary>> GetEmergencyReportSummaryAsync(DateTime? startDate = null, DateTime? endDate = null);
        Task<EmergencyReport?> GetActiveEmergencyAsync(string emergencyType);
        Task CloseActiveEmergencyAsync(string emergencyType);
    }
}