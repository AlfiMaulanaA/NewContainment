import { toast } from 'sonner';

// MQTT Topics for configuration
export const MQTT_CONFIG_TOPICS = {
  // System Configuration Topics
  SYSTEM_CONTROL: "IOT/Containment/Control",
  SYSTEM_CONFIG: "IOT/Containment/Control/Config", 
  SYSTEM_CURRENT_CONFIG: "IOT/Containment/Control/Current_Config",
  
  // Pin Configuration Topics
  PIN_CONFIG: "IOT/Containment/Control/Config/Pin",
  PIN_CURRENT_CONFIG: "IOT/Containment/Control/Current_Config/Pin"
} as const;

// System configuration command types
export const SYSTEM_CONFIG_COMMANDS = {
  // General commands
  CHANGE_CONFIG_SYSTEM: "Change config system",
  GET_DATA_SETTING: "Get Data Setting",
  
  // Interval controls
  INTERVAL_CONTROL_LIGHT: "interval_control_light",
  INTERVAL_CONTROL_SELENOID: "interval_control_selenoid", 
  INTERVAL_DOOR_LOCK: "interval_door_lock",
  INTERVAL_OPEN_FRONT_DOOR: "interval_open_front_door",
  INTERVAL_OPEN_BACK_DOOR: "interval_open_back_door",
  
  // Temperature settings
  TEMP_UPPER_THRESHOLD: "temp_upper_threshold",
  TEMP_BOTTOM_THRESHOLD: "temp_bottom_threshold",
  EMERGENCY_TEMP_ON: "Emergency Temp ON",
  EMERGENCY_TEMP_OFF: "Emergency Temp OFF",
} as const;

// Pin configuration command types
export const PIN_CONFIG_COMMANDS = {
  GET_DATA_SETTING: "Get Data Setting",
  CHANGE_SETTING_PIN: "Change Setting Pin",
} as const;

// System configuration payload builders
export class SystemConfigPayloadBuilder {
  static getDataSetting() {
    return {
      data: SYSTEM_CONFIG_COMMANDS.GET_DATA_SETTING
    };
  }
  
  static changeConfigSystem() {
    return {
      data: SYSTEM_CONFIG_COMMANDS.CHANGE_CONFIG_SYSTEM
    };
  }
  
  static intervalControlLight(value: number) {
    return {
      data: SYSTEM_CONFIG_COMMANDS.INTERVAL_CONTROL_LIGHT,
      value: value
    };
  }
  
  static intervalControlSelenoid(value: number) {
    return {
      data: SYSTEM_CONFIG_COMMANDS.INTERVAL_CONTROL_SELENOID,
      value: value
    };
  }
  
  static intervalDoorLock(value: number) {
    return {
      data: SYSTEM_CONFIG_COMMANDS.INTERVAL_DOOR_LOCK,
      value: value
    };
  }
  
  static intervalOpenFrontDoor(value: number) {
    return {
      data: SYSTEM_CONFIG_COMMANDS.INTERVAL_OPEN_FRONT_DOOR,
      value: value
    };
  }
  
  static intervalOpenBackDoor(value: number) {
    return {
      data: SYSTEM_CONFIG_COMMANDS.INTERVAL_OPEN_BACK_DOOR,
      value: value
    };
  }
  
  static tempUpperThreshold(value: number) {
    return {
      data: SYSTEM_CONFIG_COMMANDS.TEMP_UPPER_THRESHOLD,
      value: value
    };
  }
  
  static tempBottomThreshold(value: number) {
    return {
      data: SYSTEM_CONFIG_COMMANDS.TEMP_BOTTOM_THRESHOLD,
      value: value
    };
  }
  
  static emergencyTempOn() {
    return {
      data: SYSTEM_CONFIG_COMMANDS.EMERGENCY_TEMP_ON
    };
  }
  
  static emergencyTempOff() {
    return {
      data: SYSTEM_CONFIG_COMMANDS.EMERGENCY_TEMP_OFF
    };
  }
}

// Pin configuration payload builders
export class PinConfigPayloadBuilder {
  static getDataSetting() {
    return {
      data: PIN_CONFIG_COMMANDS.GET_DATA_SETTING
    };
  }
  
  static changeSettingPin(pinConfig: {
    pir_sensor_pin: number;
    fss_pin: number;
    smoke_sensor_pin_button_emergency_pin: number;
    button_front_door_pin: number;
    button_back_door_pin: number;
    limit_switch_back_door_pin: number;
    limit_switch_front_door: number;
    relay_light_pin: number;
    relay_mini_selenoid_open: number;
    relay_mini_selenoid_close: number;
    relay_mini_front_door_pin: number;
    relay_mini_back_door_pin: number;
    relay_mini_door_emergency: number;
  }) {
    return {
      data: PIN_CONFIG_COMMANDS.CHANGE_SETTING_PIN,
      value: pinConfig
    };
  }
}

// Validation utilities
export class ConfigValidation {
  static validateSystemConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate I2C addresses
    if (typeof config.modular_i2c_address_1 !== 'number' || config.modular_i2c_address_1 < 0 || config.modular_i2c_address_1 > 127) {
      errors.push('Modular I2C Address 1 must be between 0 and 127');
    }
    
    if (typeof config.modular_i2c_address_2 !== 'number' || config.modular_i2c_address_2 < 0 || config.modular_i2c_address_2 > 127) {
      errors.push('Modular I2C Address 2 must be between 0 and 127');
    }
    
    if (typeof config.modular_i2c_relay_1_address !== 'number' || config.modular_i2c_relay_1_address < 0 || config.modular_i2c_relay_1_address > 127) {
      errors.push('Modular I2C Relay 1 Address must be between 0 and 127');
    }
    
    // Validate intervals (must be positive)
    const intervalFields = [
      'interval_control_light',
      'interval_control_selenoid', 
      'interval_door_lock',
      'interval_open_front_door',
      'interval_open_back_door'
    ];
    
    intervalFields.forEach(field => {
      if (typeof config[field] !== 'number' || config[field] <= 0) {
        errors.push(`${field} must be a positive number`);
      }
    });
    
    // Validate temperature thresholds
    if (typeof config.temp_upper_threshold !== 'number' || config.temp_upper_threshold < -50 || config.temp_upper_threshold > 150) {
      errors.push('Temperature upper threshold must be between -50 and 150°C');
    }
    
    if (typeof config.temp_bottom_threshold !== 'number' || config.temp_bottom_threshold < -50 || config.temp_bottom_threshold > 150) {
      errors.push('Temperature bottom threshold must be between -50 and 150°C');
    }
    
    if (config.temp_upper_threshold <= config.temp_bottom_threshold) {
      errors.push('Temperature upper threshold must be greater than bottom threshold');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static validatePinConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Define pin ranges and categories
    const pinRanges = {
      optocoupler: { min: 1, max: 7 },
      relay: { min: 1, max: 7 },
      relay_mini: { min: 1, max: 6 }
    };
    
    const pinCategories = {
      optocoupler: [
        'pir_sensor_pin',
        'fss_pin',
        'smoke_sensor_pin_button_emergency_pin',
        'button_front_door_pin',
        'button_back_door_pin',
        'limit_switch_back_door_pin',
        'limit_switch_front_door'
      ],
      relay: [
        'relay_light_pin',
        'relay_magnetic_back_door_pin',
        'relay_magnetic_pin'
      ],
      relay_mini: [
        'relay_mini_selenoid_open',
        'relay_mini_selenoid_close',
        'relay_mini_front_door_pin',
        'relay_mini_back_door_pin',
        'relay_mini_door_emergency'
      ]
    };
    
    // Validate pin ranges
    Object.entries(pinCategories).forEach(([category, pins]) => {
      const range = pinRanges[category as keyof typeof pinRanges];
      
      pins.forEach(pinName => {
        const pinValue = config[pinName];
        if (typeof pinValue !== 'number' || pinValue < range.min || pinValue > range.max) {
          errors.push(`${pinName} must be between ${range.min} and ${range.max}`);
        }
      });
      
      // Check for duplicates within category
      const pinValues = pins.map(pinName => config[pinName]).filter(val => typeof val === 'number');
      const duplicates = pinValues.filter((pin, index) => pinValues.indexOf(pin) !== index);
      
      if (duplicates.length > 0) {
        errors.push(`Duplicate pins in ${category}: ${[...new Set(duplicates)].join(', ')}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Message parsing utilities
export class MqttMessageParser {
  static parseSystemConfigResponse(message: Buffer) {
    try {
      const data = JSON.parse(message.toString());
      
      // Validate expected system config structure
      if (typeof data === 'object' && data !== null) {
        return {
          success: true,
          data,
          error: null
        };
      } else {
        return {
          success: false,
          data: null,
          error: 'Invalid system config format'
        };
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Failed to parse system config: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  static parsePinConfigResponse(message: Buffer) {
    try {
      const data = JSON.parse(message.toString());
      
      // Check if it's a command response (success/result format)
      if (data.success !== undefined || data.result !== undefined) {
        return {
          success: true,
          isCommandResponse: true,
          data,
          error: null
        };
      }
      
      // Check if it's actual pin config data (optocoupler/relay/relay_mini format)
      if (data.optocoupler && data.relay && data.relay_mini) {
        return {
          success: true,
          isCommandResponse: false,
          data,
          error: null
        };
      }
      
      return {
        success: false,
        isCommandResponse: false,
        data: null,
        error: 'Invalid pin config format'
      };
    } catch (error) {
      return {
        success: false,
        isCommandResponse: false,
        data: null,
        error: `Failed to parse pin config: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Logging utilities for debugging
export class ConfigLogger {
  static logSystemConfigChange(key: string, oldValue: any, newValue: any) {
    console.log(`[System Config] ${key}: ${oldValue} → ${newValue}`);
  }
  
  static logPinConfigChange(pinName: string, oldValue: number, newValue: number) {
    console.log(`[Pin Config] ${pinName}: ${oldValue} → ${newValue}`);
  }
  
  static logMqttPublish(topic: string, payload: any) {
    console.log(`[MQTT Publish] Topic: ${topic}`, payload);
  }
  
  static logMqttReceive(topic: string, message: any) {
    console.log(`[MQTT Receive] Topic: ${topic}`, message);
  }
  
  static logConfigValidation(configType: 'system' | 'pin', errors: string[]) {
    if (errors.length > 0) {
      console.warn(`[${configType} Config Validation] Errors:`, errors);
    } else {
      console.log(`[${configType} Config Validation] Valid`);
    }
  }
}

// Toast notification helpers
export class ConfigNotifications {
  static showSuccess(message: string, description?: string) {
    toast.success(message, { description });
  }
  
  static showError(message: string, description?: string) {
    toast.error(message, { description });
  }
  
  static showInfo(message: string, description?: string) {
    toast.info(message, { description });
  }
  
  static showWarning(message: string, description?: string) {
    toast.warning(message, { description });
  }
  
  static showConnectionError() {
    toast.error('MQTT not connected', {
      description: 'Please check your MQTT connection and try again.'
    });
  }
  
  static showValidationError(errors: string[]) {
    toast.error('Configuration validation failed', {
      description: errors.join('; ')
    });
  }
}