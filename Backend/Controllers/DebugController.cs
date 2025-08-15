using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Controllers
{
    [ApiController] 
    [Route("api/[controller]")]
    public class DebugController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DebugController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("device-references/{deviceId}")]
        public async Task<IActionResult> GetDeviceReferences(int deviceId)
        {
            try
            {
                var results = new
                {
                    DeviceId = deviceId,
                    References = new
                    {
                        DeviceSensorData = await _context.DeviceSensorData.CountAsync(d => d.DeviceId == deviceId),
                        MaintenanceTargets = await _context.Maintenances
                            .CountAsync(m => m.TargetType == Backend.Enums.MaintenanceTarget.Device && m.TargetId == deviceId),
                    },
                    DeviceInfo = await _context.Devices.FindAsync(deviceId),
                    AllMaintenanceWithDeviceTarget = await _context.Maintenances
                        .Where(m => m.TargetType == Backend.Enums.MaintenanceTarget.Device && m.TargetId == deviceId)
                        .Select(m => new { m.Id, m.Name, m.TargetId, m.TargetType })
                        .ToListAsync(),
                    AllSensorDataForDevice = await _context.DeviceSensorData
                        .Where(d => d.DeviceId == deviceId)
                        .Select(d => new { d.Id, d.DeviceId, d.Timestamp })
                        .Take(5)
                        .ToListAsync()
                };

                return Ok(results);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}