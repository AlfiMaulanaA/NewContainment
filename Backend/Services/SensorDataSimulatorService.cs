using Backend.Models;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class SensorDataSimulatorService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SensorDataSimulatorService> _logger;

        public SensorDataSimulatorService(AppDbContext context, ILogger<SensorDataSimulatorService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task GenerateSampleSensorDataAsync(int daysBack = 7, int recordsPerHour = 6)
        {
            try
            {
                // Get all sensor devices
                var sensorDevices = await _context.Devices
                    .Where(d => d.IsActive && d.Type.ToLower() == "sensor")
                    .Include(d => d.Rack)
                    .ThenInclude(r => r!.Containment)
                    .ToListAsync();

                if (!sensorDevices.Any())
                {
                    _logger.LogWarning("No sensor devices found in database");
                    return;
                }

                _logger.LogInformation("Generating sample sensor data for {DeviceCount} devices, {DaysBack} days back", 
                    sensorDevices.Count, daysBack);

                var sensorDataList = new List<DeviceSensorData>();
                var random = new Random();
                var startDate = DateTime.UtcNow.AddDays(-daysBack);

                foreach (var device in sensorDevices)
                {
                    // Generate base temperature and humidity for each rack
                    var baseTemp = 20.0m + (decimal)(random.NextDouble() * 15); // 20-35°C
                    var baseHumidity = 40.0m + (decimal)(random.NextDouble() * 30); // 40-70%

                    for (var day = 0; day < daysBack; day++)
                    {
                        var currentDate = startDate.AddDays(day);
                        
                        for (var hour = 0; hour < 24; hour++)
                        {
                            for (var record = 0; record < recordsPerHour; record++)
                            {
                                var timestamp = currentDate.AddHours(hour).AddMinutes(record * 10);
                                
                                // Add some daily and hourly variations
                                var hourlyTempVariation = (decimal)(Math.Sin(hour * Math.PI / 12) * 3); // Daily cycle
                                var randomTempVariation = (decimal)((random.NextDouble() - 0.5) * 4); // ±2°C
                                var temperature = Math.Round(baseTemp + hourlyTempVariation + randomTempVariation, 1);
                                
                                var hourlyHumVariation = (decimal)(Math.Cos(hour * Math.PI / 12) * 5); // Inverse of temp
                                var randomHumVariation = (decimal)((random.NextDouble() - 0.5) * 10); // ±5%
                                var humidity = Math.Round(baseHumidity + hourlyHumVariation + randomHumVariation, 1);
                                
                                // Ensure realistic ranges
                                temperature = Math.Max(15, Math.Min(40, temperature)); // 15-40°C
                                humidity = Math.Max(30, Math.Min(80, humidity)); // 30-80%

                                var rawPayload = $"{{\"temp\":{temperature:F1},\"hum\":{humidity:F0},\"device_id\":{device.Id},\"timestamp\":\"{timestamp:yyyy-MM-ddTHH:mm:ssZ}\"}}";
                                
                                var sensorData = new DeviceSensorData
                                {
                                    DeviceId = device.Id,
                                    RackId = device.Rack?.Id ?? 0,
                                    ContainmentId = device.Rack?.Containment?.Id ?? 0,
                                    Topic = device.Topic ?? $"IOT/Containment/Sensor_TH/Rack_{device.RackId}",
                                    Timestamp = timestamp,
                                    ReceivedAt = timestamp.AddSeconds(random.Next(1, 30)), // Small delay for realism
                                    RawPayload = rawPayload
                                };

                                sensorDataList.Add(sensorData);
                            }
                        }
                    }
                }

                // Bulk insert in batches to avoid memory issues
                const int batchSize = 1000;
                var totalRecords = sensorDataList.Count;
                
                for (int i = 0; i < totalRecords; i += batchSize)
                {
                    var batch = sensorDataList.Skip(i).Take(batchSize).ToList();
                    _context.DeviceSensorData.AddRange(batch);
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation("Inserted batch {BatchNumber}/{TotalBatches} ({RecordsInserted}/{TotalRecords} records)", 
                        (i / batchSize) + 1, (totalRecords + batchSize - 1) / batchSize, i + batch.Count, totalRecords);
                }

                _logger.LogInformation("Successfully generated {TotalRecords} sensor data records for {DeviceCount} devices", 
                    totalRecords, sensorDevices.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate sample sensor data");
                throw;
            }
        }

        public async Task<object> GetSensorDataStatisticsAsync()
        {
            try
            {
                var totalRecords = await _context.DeviceSensorData.CountAsync();
                var latestRecord = await _context.DeviceSensorData
                    .OrderByDescending(d => d.Timestamp)
                    .FirstOrDefaultAsync();
                var oldestRecord = await _context.DeviceSensorData
                    .OrderBy(d => d.Timestamp)
                    .FirstOrDefaultAsync();

                var deviceCounts = await _context.DeviceSensorData
                    .GroupBy(d => d.DeviceId)
                    .Select(g => new { DeviceId = g.Key, Count = g.Count() })
                    .ToListAsync();

                return new
                {
                    TotalRecords = totalRecords,
                    DeviceCount = deviceCounts.Count,
                    DateRange = new
                    {
                        From = oldestRecord?.Timestamp,
                        To = latestRecord?.Timestamp
                    },
                    DeviceRecordCounts = deviceCounts
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get sensor data statistics");
                throw;
            }
        }
    }
}