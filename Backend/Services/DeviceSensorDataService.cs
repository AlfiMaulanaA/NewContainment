using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using System.Text.Json;

namespace Backend.Services
{
    public class DeviceSensorDataService : IDeviceSensorDataService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DeviceSensorDataService> _logger;

        public DeviceSensorDataService(AppDbContext context, ILogger<DeviceSensorDataService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<DeviceSensorData>> GetAllSensorDataAsync()
        {
            return await _context.DeviceSensorData
                .Include(d => d.Device)
                .Include(d => d.Rack)
                .Include(d => d.Containment)
                .OrderByDescending(d => d.Timestamp)
                .ToListAsync();
        }

        public async Task<IEnumerable<DeviceSensorData>> GetSensorDataByDeviceIdAsync(int deviceId)
        {
            return await _context.DeviceSensorData
                .Include(d => d.Device)
                .Include(d => d.Rack)
                .Include(d => d.Containment)
                .Where(d => d.DeviceId == deviceId)
                .OrderByDescending(d => d.Timestamp)
                .ToListAsync();
        }

        public async Task<IEnumerable<DeviceSensorData>> GetSensorDataByRackIdAsync(int rackId)
        {
            return await _context.DeviceSensorData
                .Include(d => d.Device)
                .Include(d => d.Rack)
                .Include(d => d.Containment)
                .Where(d => d.RackId == rackId)
                .OrderByDescending(d => d.Timestamp)
                .ToListAsync();
        }

        public async Task<IEnumerable<DeviceSensorData>> GetSensorDataByContainmentIdAsync(int containmentId)
        {
            return await _context.DeviceSensorData
                .Include(d => d.Device)
                .Include(d => d.Rack)
                .Include(d => d.Containment)
                .Where(d => d.ContainmentId == containmentId)
                .OrderByDescending(d => d.Timestamp)
                .ToListAsync();
        }

        public async Task<IEnumerable<DeviceSensorData>> GetLatestSensorDataAsync(int limit = 100)
        {
            return await _context.DeviceSensorData
                .Include(d => d.Device)
                .Include(d => d.Rack)
                .Include(d => d.Containment)
                .OrderByDescending(d => d.Timestamp)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<DeviceSensorData?> GetLatestSensorDataByDeviceAsync(int deviceId)
        {
            return await _context.DeviceSensorData
                .Include(d => d.Device)
                .Include(d => d.Rack)
                .Include(d => d.Containment)
                .Where(d => d.DeviceId == deviceId)
                .OrderByDescending(d => d.Timestamp)
                .FirstOrDefaultAsync();
        }

        public async Task<DeviceSensorData> StoreSensorDataAsync(DeviceSensorData sensorData)
        {
            _context.DeviceSensorData.Add(sensorData);
            await _context.SaveChangesAsync();
            return sensorData;
        }

        public async Task<DeviceSensorData> ParseAndStoreSensorDataAsync(int deviceId, string topic, string payload)
        {
            try
            {
                // Get device with related data
                var device = await _context.Devices
                    .Include(d => d.Rack)
                    .ThenInclude(r => r.Containment)
                    .FirstOrDefaultAsync(d => d.Id == deviceId);

                if (device == null)
                {
                    throw new ArgumentException($"Device with ID {deviceId} not found");
                }

                // Parse JSON payload
                var parsedData = ParseSensorPayload(payload);

                var sensorData = new DeviceSensorData
                {
                    DeviceId = deviceId,
                    RackId = device.Rack?.Id ?? 0,
                    ContainmentId = device.Rack?.Containment?.Id ?? 0,
                    Topic = topic,
                    Temperature = parsedData.Temperature,
                    Humidity = parsedData.Humidity,
                    Timestamp = parsedData.Timestamp,
                    ReceivedAt = DateTime.UtcNow,
                    RawPayload = payload
                };

                return await StoreSensorDataAsync(sensorData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse and store sensor data for device {DeviceId}, topic {Topic}", deviceId, topic);
                throw;
            }
        }

        private (decimal? Temperature, decimal? Humidity, DateTime Timestamp) ParseSensorPayload(string payload)
        {
            try
            {
                using JsonDocument doc = JsonDocument.Parse(payload);
                var root = doc.RootElement;

                decimal? temperature = null;
                decimal? humidity = null;
                DateTime timestamp = DateTime.UtcNow;

                // Parse temperature
                if (root.TryGetProperty("temp", out var tempElement))
                {
                    if (tempElement.TryGetDecimal(out var tempValue))
                    {
                        temperature = tempValue;
                    }
                }

                // Parse humidity
                if (root.TryGetProperty("hum", out var humElement))
                {
                    if (humElement.TryGetDecimal(out var humValue))
                    {
                        humidity = humValue;
                    }
                }

                // Parse timestamp
                if (root.TryGetProperty("timestamp", out var timestampElement) ||
                    root.TryGetProperty("Timestamp", out timestampElement))
                {
                    if (timestampElement.TryGetDateTime(out var timestampValue))
                    {
                        timestamp = timestampValue;
                    }
                    else if (timestampElement.ValueKind == JsonValueKind.String)
                    {
                        var timestampString = timestampElement.GetString();
                        if (DateTime.TryParse(timestampString, out var parsedTimestamp))
                        {
                            timestamp = parsedTimestamp;
                        }
                    }
                }

                return (temperature, humidity, timestamp);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse JSON payload: {Payload}", payload);
                throw new ArgumentException("Invalid JSON payload", ex);
            }
        }

        public async Task<object> GetSensorStatisticsAsync(int deviceId, DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.DeviceSensorData.Where(d => d.DeviceId == deviceId);

            if (startDate.HasValue)
                query = query.Where(d => d.Timestamp >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(d => d.Timestamp <= endDate.Value);

            var data = await query.ToListAsync();

            if (!data.Any())
            {
                return new
                {
                    DeviceId = deviceId,
                    Count = 0,
                    Temperature = new { Min = (decimal?)null, Max = (decimal?)null, Avg = (decimal?)null },
                    Humidity = new { Min = (decimal?)null, Max = (decimal?)null, Avg = (decimal?)null },
                    DateRange = new { Start = startDate, End = endDate }
                };
            }

            var temps = data.Where(d => d.Temperature.HasValue).Select(d => d.Temperature!.Value);
            var hums = data.Where(d => d.Humidity.HasValue).Select(d => d.Humidity!.Value);

            return new
            {
                DeviceId = deviceId,
                Count = data.Count,
                Temperature = new
                {
                    Min = temps.Any() ? temps.Min() : (decimal?)null,
                    Max = temps.Any() ? temps.Max() : (decimal?)null,
                    Avg = temps.Any() ? Math.Round(temps.Average(), 2) : (decimal?)null
                },
                Humidity = new
                {
                    Min = hums.Any() ? hums.Min() : (decimal?)null,
                    Max = hums.Any() ? hums.Max() : (decimal?)null,
                    Avg = hums.Any() ? Math.Round(hums.Average(), 2) : (decimal?)null
                },
                DateRange = new { Start = startDate, End = endDate }
            };
        }

        public async Task<IEnumerable<object>> GetTemperatureHistoryAsync(int deviceId, TimeSpan timeRange)
        {
            var startDate = DateTime.UtcNow - timeRange;
            
            return await _context.DeviceSensorData
                .Where(d => d.DeviceId == deviceId && d.Temperature.HasValue && d.Timestamp >= startDate)
                .OrderBy(d => d.Timestamp)
                .Select(d => new
                {
                    Timestamp = d.Timestamp,
                    Temperature = d.Temperature
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<object>> GetHumidityHistoryAsync(int deviceId, TimeSpan timeRange)
        {
            var startDate = DateTime.UtcNow - timeRange;
            
            return await _context.DeviceSensorData
                .Where(d => d.DeviceId == deviceId && d.Humidity.HasValue && d.Timestamp >= startDate)
                .OrderBy(d => d.Timestamp)
                .Select(d => new
                {
                    Timestamp = d.Timestamp,
                    Humidity = d.Humidity
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<string>> GetActiveTopicsAsync()
        {
            return await _context.DeviceSensorData
                .Select(d => d.Topic)
                .Distinct()
                .ToListAsync();
        }

        public async Task<IEnumerable<string>> GetTopicsByContainmentAsync(int containmentId)
        {
            return await _context.DeviceSensorData
                .Where(d => d.ContainmentId == containmentId)
                .Select(d => d.Topic)
                .Distinct()
                .ToListAsync();
        }
    }
}