using System.ComponentModel.DataAnnotations;
using System.Reflection;

namespace Backend.Enums
{
    public enum SensorType
    {
        [Display(Name = "Temperature")]
        Temperature,

        [Display(Name = "Air Flow")]
        AirFlow,

        [Display(Name = "Dust Sensor")]
        DustSensor,

        [Display(Name = "Vibration")]
        Vibration,

        [Display(Name = "Humidity")]
        Humidity,

        [Display(Name = "Unknown")]
        Unknown
    }

    public static class SensorTypeExtensions
    {
        public static string GetDisplayName(this SensorType sensorType)
        {
            var fieldInfo = sensorType.GetType().GetField(sensorType.ToString());
            var displayAttribute = fieldInfo?.GetCustomAttribute<DisplayAttribute>();
            return displayAttribute?.Name ?? sensorType.ToString();
        }

        public static SensorType FromString(string sensorTypeString)
        {
            if (string.IsNullOrEmpty(sensorTypeString))
                return SensorType.Unknown;

            foreach (var value in Enum.GetValues(typeof(SensorType)).Cast<SensorType>())
            {
                if (value.GetDisplayName().Equals(sensorTypeString, StringComparison.OrdinalIgnoreCase))
                {
                    return value;
                }
            }

            return SensorType.Unknown;
        }

        public static SensorType? FromStringNullable(string? sensorTypeString)
        {
            return string.IsNullOrEmpty(sensorTypeString) ? null : FromString(sensorTypeString);
        }

        public static IEnumerable<string> GetAllDisplayNames()
        {
            return Enum.GetValues(typeof(SensorType))
                .Cast<SensorType>()
                .Select(v => v.GetDisplayName());
        }
    }
}
