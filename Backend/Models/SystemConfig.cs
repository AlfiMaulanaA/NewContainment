using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class SystemConfig
    {
        [Key]
        public int Id { get; set; }
        
        // Modular I2C Addresses
        public int ModularI2cAddress1 { get; set; } = 34;
        public int ModularI2cAddress2 { get; set; } = 37;
        public int ModularI2cRelay1Address { get; set; } = 57;
        
        // Debug mode
        public bool Debug { get; set; } = true;
        
        // Interval controls (in seconds)
        public int IntervalControlLight { get; set; } = 120;
        public int IntervalControlSelenoid { get; set; } = 2;
        public int IntervalDoorLock { get; set; } = 4;
        public int IntervalOpenFrontDoor { get; set; } = 2;
        public int IntervalOpenBackDoor { get; set; } = 2;
        
        // Temperature settings
        public bool TempEmergency { get; set; } = true;
        public double TempUpperThreshold { get; set; } = 60.0;
        public double TempBottomThreshold { get; set; } = 50.0;
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int CreatedBy { get; set; }
        public int? UpdatedBy { get; set; }
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        public virtual User? CreatedByUser { get; set; }
        public virtual User? UpdatedByUser { get; set; }
    }

    public class PinConfig
    {
        [Key]
        public int Id { get; set; }
        
        // Optocoupler pins (1-7)
        public int PirSensorPin { get; set; } = 1;
        public int FssPin { get; set; } = 2;
        public int SmokeSensorButtonEmergencyPin { get; set; } = 3;
        public int ButtonFrontDoorPin { get; set; } = 4;
        public int ButtonBackDoorPin { get; set; } = 5;
        public int LimitSwitchBackDoorPin { get; set; } = 6;
        public int LimitSwitchFrontDoor { get; set; } = 7;
        
        // Relay pins (1-7)
        public int RelayLightPin { get; set; } = 1;
        public int RelayMagneticBackDoorPin { get; set; } = 6;
        public int RelayMagneticPin { get; set; } = 7;
        
        // Relay mini pins (1-6)
        public int RelayMiniSelenoidOpen { get; set; } = 1;
        public int RelayMiniSelenoidClose { get; set; } = 2;
        public int RelayMiniFrontDoorPin { get; set; } = 3;
        public int RelayMiniBackDoorPin { get; set; } = 4;
        public int RelayMiniDoorEmergency { get; set; } = 5;
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int CreatedBy { get; set; }
        public int? UpdatedBy { get; set; }
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        public virtual User? CreatedByUser { get; set; }
        public virtual User? UpdatedByUser { get; set; }
    }

    // DTOs for API requests and responses
    public class SystemConfigRequest
    {
        public int ModularI2cAddress1 { get; set; } = 34;
        public int ModularI2cAddress2 { get; set; } = 37;
        public int ModularI2cRelay1Address { get; set; } = 57;
        public bool Debug { get; set; } = true;
        public int IntervalControlLight { get; set; } = 120;
        public int IntervalControlSelenoid { get; set; } = 2;
        public int IntervalDoorLock { get; set; } = 4;
        public int IntervalOpenFrontDoor { get; set; } = 2;
        public int IntervalOpenBackDoor { get; set; } = 2;
        public bool TempEmergency { get; set; } = true;
        public double TempUpperThreshold { get; set; } = 60.0;
        public double TempBottomThreshold { get; set; } = 50.0;
    }

    public class PinConfigRequest
    {
        // Optocoupler pins (1-7)
        public int PirSensorPin { get; set; } = 1;
        public int FssPin { get; set; } = 2;
        public int SmokeSensorButtonEmergencyPin { get; set; } = 3;
        public int ButtonFrontDoorPin { get; set; } = 4;
        public int ButtonBackDoorPin { get; set; } = 5;
        public int LimitSwitchBackDoorPin { get; set; } = 6;
        public int LimitSwitchFrontDoor { get; set; } = 7;
        
        // Relay pins (1-7)
        public int RelayLightPin { get; set; } = 1;
        public int RelayMagneticBackDoorPin { get; set; } = 6;
        public int RelayMagneticPin { get; set; } = 7;
        
        // Relay mini pins (1-6)
        public int RelayMiniSelenoidOpen { get; set; } = 1;
        public int RelayMiniSelenoidClose { get; set; } = 2;
        public int RelayMiniFrontDoorPin { get; set; } = 3;
        public int RelayMiniBackDoorPin { get; set; } = 4;
        public int RelayMiniDoorEmergency { get; set; } = 5;
    }

    // MQTT payload classes
    public class MqttConfigPayload
    {
        public string Data { get; set; } = string.Empty;
        public object? Value { get; set; }
    }

    public class MqttConfigResponse
    {
        public bool Success { get; set; }
        public string Result { get; set; } = string.Empty;
    }

    // Current config response format for MQTT
    public class CurrentSystemConfigResponse
    {
        public int modular_i2c_address_1 { get; set; }
        public int modular_i2c_address_2 { get; set; }
        public int modular_i2c_relay_1_address { get; set; }
        public bool debug { get; set; }
        public int interval_control_light { get; set; }
        public int interval_control_selenoid { get; set; }
        public int interval_door_lock { get; set; }
        public int interval_open_front_door { get; set; }
        public int interval_open_back_door { get; set; }
        public bool temp_emergency { get; set; }
        public double temp_upper_threshold { get; set; }
        public double temp_bottom_threshold { get; set; }
    }

    public class CurrentPinConfigResponse
    {
        public OptocouplerPins optocoupler { get; set; } = new();
        public RelayPins relay { get; set; } = new();
        public RelayMiniPins relay_mini { get; set; } = new();
    }

    public class OptocouplerPins
    {
        public int pir_sensor_pin { get; set; }
        public int fss_pin { get; set; }
        public int smoke_sensor_pin_button_emergency_pin { get; set; }
        public int button_front_door_pin { get; set; }
        public int button_back_door_pin { get; set; }
        public int limit_switch_back_door_pin { get; set; }
        public int limit_switch_front_door { get; set; }
    }

    public class RelayPins
    {
        public int relay_light_pin { get; set; }
        public int relay_magnetic_back_door_pin { get; set; }
        public int relay_magnetic_pin { get; set; }
    }

    public class RelayMiniPins
    {
        public int relay_mini_selenoid_open { get; set; }
        public int relay_mini_selenoid_close { get; set; }
        public int relay_mini_front_door_pin { get; set; }
        public int relay_mini_back_door_pin { get; set; }
        public int relay_mini_door_emergency { get; set; }
    }
}