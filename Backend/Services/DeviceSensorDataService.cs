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

        public async Task<(IEnumerable<DeviceSensorData> Data, int Total)> GetSensorDataAsync(
            int page = 1, 
            int pageSize = 50, 
            int? deviceId = null, 
            int? rackId = null, 
            int? containmentId = null,
            string? sensorType = null,
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            var query = _context.DeviceSensorData
                .Include(d => d.Device)
                .Include(d => d.Rack)
                .Include(d => d.Containment)
                .AsQueryable();

            // Apply filters
            if (deviceId.HasValue)
                query = query.Where(d => d.DeviceId == deviceId.Value);
            
            if (rackId.HasValue)
                query = query.Where(d => d.RackId == rackId.Value);
            
            if (containmentId.HasValue)
                query = query.Where(d => d.ContainmentId == containmentId.Value);
            
            if (!string.IsNullOrEmpty(sensorType))
                query = query.Where(d => d.SensorType == sensorType);
            
            if (startDate.HasValue)
                query = query.Where(d => d.Timestamp >= startDate.Value);
            
            if (endDate.HasValue)
                query = query.Where(d => d.Timestamp <= endDate.Value);

            // Get total count before pagination
            var total = await query.CountAsync();

            // Apply pagination and ordering
            var data = await query
                .OrderByDescending(d => d.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
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
                    .ThenInclude(r => r!.Containment)
                    .FirstOrDefaultAsync(d => d.Id == deviceId);

                if (device == null)
                {
                    throw new ArgumentException($"Device with ID {deviceId} not found");
                }

                // Parse timestamp from payload or use current time
                var timestamp = ParseTimestampFromPayload(payload);

                var sensorData = new DeviceSensorData
                {
                    DeviceId = deviceId,
                    RackId = device.Rack?.Id ?? 0,
                    ContainmentId = device.Rack?.Containment?.Id ?? 0,
                    Topic = topic,
                    Timestamp = timestamp,
                    ReceivedAt = DateTime.UtcNow,
                    RawPayload = payload,
                    SensorType = device.SensorType
                };

                return await StoreSensorDataAsync(sensorData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse and store sensor data for device {DeviceId}, topic {Topic}", deviceId, topic);
                throw;
            }
        }

        private DateTime ParseTimestampFromPayload(string payload)
        {
            try
            {
                using JsonDocument doc = JsonDocument.Parse(payload);
                var root = doc.RootElement;

                // Parse timestamp
                if (root.TryGetProperty("timestamp", out var timestampElement) ||
                    root.TryGetProperty("Timestamp", out timestampElement))
                {
                    if (timestampElement.TryGetDateTime(out var timestampValue))
                    {
                        return timestampValue;
                    }
                    else if (timestampElement.ValueKind == JsonValueKind.String)
                    {
                        var timestampString = timestampElement.GetString();
                        if (DateTime.TryParse(timestampString, out var parsedTimestamp))
                        {
                            return parsedTimestamp;
                        }
                    }
                }

                return DateTime.UtcNow;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse JSON payload for timestamp: {Payload}", payload);
                return DateTime.UtcNow;
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
                    DataKeys = new string[0],
                    Statistics = new Dictionary<string, object>(),
                    DateRange = new { Start = startDate, End = endDate }
                };
            }

            // Parse all data and collect all unique keys
            var allKeys = new HashSet<string>();
            var parsedDataList = new List<Dictionary<string, object>>();

            foreach (var item in data)
            {
                try
                {
                    using var doc = JsonDocument.Parse(item.RawPayload);
                    var parsedData = new Dictionary<string, object>();
                    
                    foreach (var property in doc.RootElement.EnumerateObject())
                    {
                        allKeys.Add(property.Name);
                        
                        // Store the value based on its type
                        switch (property.Value.ValueKind)
                        {
                            case JsonValueKind.Number:
                                if (property.Value.TryGetDecimal(out var decimalVal))
                                    parsedData[property.Name] = decimalVal;
                                break;
                            case JsonValueKind.String:
                                parsedData[property.Name] = property.Value.GetString() ?? "";
                                break;
                            case JsonValueKind.True:
                                parsedData[property.Name] = true;
                                break;
                            case JsonValueKind.False:
                                parsedData[property.Name] = false;
                                break;
                        }
                    }
                    
                    parsedDataList.Add(parsedData);
                }
                catch (JsonException)
                {
                    // Skip invalid JSON entries
                }
            }

            // Calculate statistics for numeric values
            var statistics = new Dictionary<string, object>();
            
            foreach (var key in allKeys)
            {
                var numericValues = parsedDataList
                    .Where(d => d.ContainsKey(key) && d[key] is decimal)
                    .Select(d => (decimal)d[key])
                    .ToList();

                if (numericValues.Any())
                {
                    statistics[key] = new
                    {
                        Type = "numeric",
                        Count = numericValues.Count,
                        Min = numericValues.Min(),
                        Max = numericValues.Max(),
                        Avg = Math.Round(numericValues.Average(), 2)
                    };
                }
                else
                {
                    var stringValues = parsedDataList
                        .Where(d => d.ContainsKey(key))
                        .Select(d => d[key]?.ToString())
                        .Where(s => !string.IsNullOrEmpty(s))
                        .GroupBy(s => s)
                        .ToDictionary(g => g.Key!, g => g.Count());

                    if (stringValues.Any())
                    {
                        statistics[key] = new
                        {
                            Type = "categorical",
                            Values = stringValues
                        };
                    }
                }
            }

            return new
            {
                DeviceId = deviceId,
                Count = data.Count,
                DataKeys = allKeys.ToArray(),
                Statistics = statistics,
                DateRange = new { Start = startDate, End = endDate }
            };
        }

        public async Task<IEnumerable<object>> GetDataHistoryAsync(int deviceId, string dataKey, TimeSpan timeRange)
        {
            var startDate = DateTime.UtcNow - timeRange;
            
            var data = await _context.DeviceSensorData
                .Where(d => d.DeviceId == deviceId && d.Timestamp >= startDate)
                .OrderBy(d => d.Timestamp)
                .Select(d => new
                {
                    d.Timestamp,
                    d.RawPayload
                })
                .ToListAsync();

            var result = new List<object>();

            foreach (var item in data)
            {
                try
                {
                    using var doc = JsonDocument.Parse(item.RawPayload);
                    if (doc.RootElement.TryGetProperty(dataKey, out var property))
                    {
                        object? value = null;
                        
                        switch (property.ValueKind)
                        {
                            case JsonValueKind.Number:
                                if (property.TryGetDecimal(out var decimalVal))
                                    value = decimalVal;
                                break;
                            case JsonValueKind.String:
                                value = property.GetString();
                                break;
                            case JsonValueKind.True:
                                value = true;
                                break;
                            case JsonValueKind.False:
                                value = false;
                                break;
                        }

                        if (value != null)
                        {
                            result.Add(new
                            {
                                Timestamp = item.Timestamp,
                                Key = dataKey,
                                Value = value
                            });
                        }
                    }
                }
                catch (JsonException)
                {
                    // Skip invalid JSON entries
                }
            }

            return result;
        }

        public async Task<IEnumerable<object>> GetAggregatedDataAsync(int deviceId, string dataKey, string interval, DateTime startDate, DateTime endDate)
        {
            var data = await _context.DeviceSensorData
                .Where(d => d.DeviceId == deviceId && d.Timestamp >= startDate && d.Timestamp <= endDate)
                .OrderBy(d => d.Timestamp)
                .ToListAsync();

            var result = new List<object>();
            var groupedData = new List<(DateTime Timestamp, object? Value)>();

            foreach (var item in data)
            {
                try
                {
                    using var doc = JsonDocument.Parse(item.RawPayload);
                    if (doc.RootElement.TryGetProperty(dataKey, out var property))
                    {
                        object? value = null;
                        
                        switch (property.ValueKind)
                        {
                            case JsonValueKind.Number:
                                if (property.TryGetDecimal(out var decimalVal))
                                    value = decimalVal;
                                break;
                            case JsonValueKind.String:
                                value = property.GetString();
                                break;
                            case JsonValueKind.True:
                                value = true;
                                break;
                            case JsonValueKind.False:
                                value = false;
                                break;
                        }

                        if (value != null)
                        {
                            groupedData.Add((item.Timestamp, value));
                        }
                    }
                }
                catch (JsonException)
                {
                    // Skip invalid JSON entries
                }
            }

            // Group data by interval
            var intervalMinutes = interval.ToLower() switch
            {
                "minute" => 1,
                "5minutes" => 5,
                "15minutes" => 15,
                "30minutes" => 30,
                "hour" => 60,
                "day" => 1440,
                _ => 60
            };

            var grouped = groupedData
                .Where(d => d.Value is decimal)
                .GroupBy(d => new DateTime(
                    d.Timestamp.Year,
                    d.Timestamp.Month,
                    d.Timestamp.Day,
                    d.Timestamp.Hour,
                    (d.Timestamp.Minute / intervalMinutes) * intervalMinutes,
                    0))
                .Select(g => new
                {
                    Timestamp = g.Key,
                    Count = g.Count(),
                    Average = Math.Round(g.Select(x => (decimal)x.Value!).Average(), 2),
                    Min = g.Select(x => (decimal)x.Value!).Min(),
                    Max = g.Select(x => (decimal)x.Value!).Max()
                })
                .OrderBy(g => g.Timestamp);

            return grouped.Cast<object>();
        }

        public async Task<IEnumerable<string>> GetAvailableSensorTypesAsync()
        {
            return await _context.DeviceSensorData
                .Where(d => !string.IsNullOrEmpty(d.SensorType))
                .Select(d => d.SensorType!)
                .Distinct()
                .ToListAsync();
        }

        public async Task<object> GetSensorDataSummaryAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.DeviceSensorData.AsQueryable();
            
            if (startDate.HasValue)
                query = query.Where(d => d.Timestamp >= startDate.Value);
            
            if (endDate.HasValue)
                query = query.Where(d => d.Timestamp <= endDate.Value);

            var totalRecords = await query.CountAsync();
            var deviceCount = await query.Select(d => d.DeviceId).Distinct().CountAsync();
            var sensorTypes = await query
                .Where(d => !string.IsNullOrEmpty(d.SensorType))
                .GroupBy(d => d.SensorType)
                .Select(g => new { SensorType = g.Key, Count = g.Count() })
                .ToListAsync();
            
            var latestDataByDevice = await query
                .GroupBy(d => d.DeviceId)
                .Select(g => new
                {
                    DeviceId = g.Key,
                    DeviceName = g.First().Device.Name,
                    LatestTimestamp = g.Max(x => x.Timestamp),
                    RecordCount = g.Count()
                })
                .ToListAsync();

            return new
            {
                TotalRecords = totalRecords,
                ActiveDevices = deviceCount,
                SensorTypes = sensorTypes,
                DevicesSummary = latestDataByDevice,
                DateRange = new { Start = startDate, End = endDate },
                GeneratedAt = DateTime.UtcNow
            };
        }

        // Keep for backward compatibility - now calls the generic method
        public async Task<IEnumerable<object>> GetTemperatureHistoryAsync(int deviceId, TimeSpan timeRange)
        {
            return await GetDataHistoryAsync(deviceId, "temp", timeRange);
        }

        public async Task<IEnumerable<object>> GetHumidityHistoryAsync(int deviceId, TimeSpan timeRange)
        {
            return await GetDataHistoryAsync(deviceId, "hum", timeRange);
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