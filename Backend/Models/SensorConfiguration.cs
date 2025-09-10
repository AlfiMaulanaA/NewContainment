using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Backend.Models
{
    public class SensorConfiguration
    {
        public int Id { get; set; }

        [Required]
        public int SensorNumber { get; set; }

        [Required]
        [StringLength(100)]
        public string SensorName { get; set; } = string.Empty;

        [Required]
        [Range(1, 247)]
        public int ModbusAddress { get; set; }

        [Required]
        [StringLength(20)]
        public string ModbusPort { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string SensorType { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        public bool IsEnabled { get; set; } = true;

        public decimal TemperatureOffset { get; set; } = 0;

        public decimal HumidityOffset { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public int CreatedBy { get; set; }

        public int? UpdatedBy { get; set; }

        // Navigation properties
        public User? CreatedByUser { get; set; }
        public User? UpdatedByUser { get; set; }
    }

    public class ScanConfiguration
    {
        public int Id { get; set; }

        [Required]
        [Range(1, 247)]
        public int MaxAddressToScan { get; set; } = 247;

        [Required]
        [StringLength(20)]
        public string SelectedPort { get; set; } = "COM3";

        [Required]
        [StringLength(50)]
        public string SelectedSensor { get; set; } = "XY_MD02";

        [Range(100, 10000)]
        public int ScanTimeoutMs { get; set; } = 1000;

        [Range(10, 1000)]
        public int ScanIntervalMs { get; set; } = 100;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public int CreatedBy { get; set; }

        public int? UpdatedBy { get; set; }

        // Navigation properties
        public User? CreatedByUser { get; set; }
        public User? UpdatedByUser { get; set; }
    }

    // DTOs for API requests/responses
    public class SensorConfigurationRequest
    {
        [Required]
        public int SensorNumber { get; set; }

        [Required]
        [StringLength(100)]
        public string SensorName { get; set; } = string.Empty;

        [Required]
        [Range(1, 247)]
        public int ModbusAddress { get; set; }

        [Required]
        [StringLength(20)]
        public string ModbusPort { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string SensorType { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        public bool IsEnabled { get; set; } = true;

        public decimal TemperatureOffset { get; set; } = 0;

        public decimal HumidityOffset { get; set; } = 0;
    }

    public class ScanConfigurationRequest
    {
        [Required]
        [Range(1, 247)]
        public int MaxAddressToScan { get; set; } = 247;

        [Required]
        [StringLength(20)]
        public string SelectedPort { get; set; } = "COM3";

        [Required]
        [StringLength(50)]
        public string SelectedSensor { get; set; } = "XY_MD02";

        [Range(100, 10000)]
        public int ScanTimeoutMs { get; set; } = 1000;

        [Range(10, 1000)]
        public int ScanIntervalMs { get; set; } = 100;
    }

    public class CalibrationRequest
    {
        [Required]
        [StringLength(100)]
        public string SensorName { get; set; } = string.Empty;

        [Required]
        public decimal[] ValueCalibrate { get; set; } = new decimal[2];
    }

    // MQTT Command DTOs
    public class SensorMqttCommand
    {
        [Required]
        public string Command { get; set; } = string.Empty;

        public object? Data { get; set; }
    }

    public class SensorMqttResponse
    {
        public string Result { get; set; } = string.Empty;

        public string Command { get; set; } = string.Empty;

        public object? Data { get; set; }

        public string? Error { get; set; }
    }

    // Sensor List JSON Structure (for MQTT communication)
    public class SensorListData
    {
        public int NumberSensor { get; set; }

        public SensorDataStructure DataSensor { get; set; } = new();
    }

    public class SensorDataStructure
    {
        public string SensorName { get; set; } = string.Empty;

        public int ModbusAddress { get; set; }

        public string ModbusPort { get; set; } = string.Empty;

        public string SensorType { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool Enabled { get; set; }

        public decimal? TemperatureOffset { get; set; }

        public decimal? HumidityOffset { get; set; }
    }

    // Scan Config JSON Structure (for MQTT communication)
    public class ScanConfigData
    {
        public int MaxAddressToScan { get; set; }

        public string SelectedPort { get; set; } = string.Empty;

        public string SelectedSensor { get; set; } = string.Empty;

        public int? ScanTimeoutMs { get; set; }

        public int? ScanIntervalMs { get; set; }
    }

    // Constants
    public static class SensorConstants
    {
        public static readonly string[] SENSOR_TYPES =
        {
            "XY_MD02",
            "DHT22",
            "SHT30",
            "AM2302",
            "Custom"
        };

        public static readonly string[] MODBUS_PORTS =
        {
            "COM1",
            "COM2",
            "COM3",
            "COM4",
            "COM5",
            "/dev/ttyUSB0",
            "/dev/ttyUSB1",
            "/dev/ttyAMA0"
        };

        // MQTT Topics
        public const string MQTT_COMMAND_TOPIC = "IOT/Containment/Sensor/Config";
        public const string MQTT_RESPONSE_TOPIC = "IOT/Containment/Sensor/Config/Data";
        public const string MQTT_DATA_TOPIC = "IOT/Containment/Sensor/Data";

        // MQTT Commands
        public static class Commands
        {
            // Mode Commands
            public const string CHANGE_MODE_READING = "change mode to reading sensor";
            public const string CHANGE_MODE_SCAN = "change mode to scan";

            // Sensor List Commands
            public const string GET_TOTAL_SENSOR_LIST = "get total sensor list";
            public const string GET_SENSOR_LIST = "get sensor list";
            public const string SET_SENSOR_LIST = "set sensor list";
            public const string ADD_SENSOR_LIST = "add sensor list";
            public const string REMOVE_SENSOR_LIST = "remove sensor list";
            public const string UPLOAD_SENSOR_LIST = "upload sensor list";

            // Scan Commands
            public const string RUNNING_SCAN = "running scan";
            public const string STOP_SCAN = "stop scan";
            public const string WRITE_CONFIG_SCAN = "write config scan";
            public const string READ_CONFIG_SCAN = "read config scan";

            // Calibration Commands
            public const string READ_CALIBRATE_SENSOR = "read calibrate sensor";
            public const string WRITE_CALIBRATE_SENSOR = "write calibrate sensor";
        }

        // Operating Modes
        public static class Modes
        {
            public const string READING_SENSOR = "reading_sensor";
            public const string SCAN_ADDRESS = "scan_address";
        }
    }

    // Extension methods for mapping
    public static class SensorConfigurationExtensions
    {
        public static SensorListData ToMqttFormat(this SensorConfiguration config)
        {
            return new SensorListData
            {
                NumberSensor = config.SensorNumber,
                DataSensor = new SensorDataStructure
                {
                    SensorName = config.SensorName,
                    ModbusAddress = config.ModbusAddress,
                    ModbusPort = config.ModbusPort,
                    SensorType = config.SensorType,
                    Description = config.Description,
                    Enabled = config.IsEnabled,
                    TemperatureOffset = config.TemperatureOffset,
                    HumidityOffset = config.HumidityOffset
                }
            };
        }

        public static SensorConfiguration FromMqttFormat(this SensorListData mqttData, int userId)
        {
            return new SensorConfiguration
            {
                SensorNumber = mqttData.NumberSensor,
                SensorName = mqttData.DataSensor.SensorName,
                ModbusAddress = mqttData.DataSensor.ModbusAddress,
                ModbusPort = mqttData.DataSensor.ModbusPort,
                SensorType = mqttData.DataSensor.SensorType,
                Description = mqttData.DataSensor.Description,
                IsEnabled = mqttData.DataSensor.Enabled,
                TemperatureOffset = mqttData.DataSensor.TemperatureOffset ?? 0,
                HumidityOffset = mqttData.DataSensor.HumidityOffset ?? 0,
                CreatedBy = userId,
                UpdatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }

        public static ScanConfigData ToMqttFormat(this ScanConfiguration config)
        {
            return new ScanConfigData
            {
                MaxAddressToScan = config.MaxAddressToScan,
                SelectedPort = config.SelectedPort,
                SelectedSensor = config.SelectedSensor,
                ScanTimeoutMs = config.ScanTimeoutMs,
                ScanIntervalMs = config.ScanIntervalMs
            };
        }

        public static ScanConfiguration FromMqttFormat(this ScanConfigData mqttData, int userId)
        {
            return new ScanConfiguration
            {
                MaxAddressToScan = mqttData.MaxAddressToScan,
                SelectedPort = mqttData.SelectedPort,
                SelectedSensor = mqttData.SelectedSensor,
                ScanTimeoutMs = mqttData.ScanTimeoutMs ?? 1000,
                ScanIntervalMs = mqttData.ScanIntervalMs ?? 100,
                CreatedBy = userId,
                UpdatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }
    }
}