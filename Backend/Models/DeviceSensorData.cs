using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Backend.Models
{
    public class DeviceSensorData
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DeviceId { get; set; }

        [ForeignKey(nameof(DeviceId))]
        public virtual Device Device { get; set; } = null!;

        [Required]
        public int RackId { get; set; }

        [ForeignKey(nameof(RackId))]
        public virtual Rack Rack { get; set; } = null!;

        [Required]
        public int ContainmentId { get; set; }

        [ForeignKey(nameof(ContainmentId))]
        public virtual Containment Containment { get; set; } = null!;

        [Required]
        [StringLength(200)]
        public string Topic { get; set; } = string.Empty;

        [Required]
        public DateTime Timestamp { get; set; }

        [Required]
        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public string RawPayload { get; set; } = string.Empty;

        [StringLength(50)]
        public string? SensorType { get; set; }

        // Helper method to parse raw payload as JSON
        [NotMapped]
        public JsonDocument? ParsedData
        {
            get
            {
                try
                {
                    return string.IsNullOrEmpty(RawPayload) ? null : JsonDocument.Parse(RawPayload);
                }
                catch
                {
                    return null;
                }
            }
        }

        // Helper method to get specific value from parsed data
        public T? GetValue<T>(string propertyName) where T : struct
        {
            try
            {
                var parsedData = ParsedData;
                if (parsedData?.RootElement.TryGetProperty(propertyName, out var property) == true)
                {
                    if (typeof(T) == typeof(decimal) && property.TryGetDecimal(out var decimalValue))
                        return (T)(object)decimalValue;
                    if (typeof(T) == typeof(double) && property.TryGetDouble(out var doubleValue))
                        return (T)(object)doubleValue;
                    if (typeof(T) == typeof(int) && property.TryGetInt32(out var intValue))
                        return (T)(object)intValue;
                    if (typeof(T) == typeof(float) && property.TryGetSingle(out var floatValue))
                        return (T)(object)floatValue;
                }
            }
            catch { }
            return null;
        }

        // Helper method to get string value from parsed data
        public string? GetStringValue(string propertyName)
        {
            try
            {
                var parsedData = ParsedData;
                if (parsedData?.RootElement.TryGetProperty(propertyName, out var property) == true)
                {
                    return property.GetString();
                }
            }
            catch { }
            return null;
        }
    }
}