"use client";

import { useCallback, useEffect, useState } from 'react';
import { useMQTT } from '@/lib/mqtt-manager';
import { useMQTTPublish } from '@/hooks/useMQTTPublish';
import { toast } from 'sonner';

// Types for pin configuration
export interface PinConfig {
  pir_sensor_pin: number;
  fss_pin: number;
  smoke_sensor_pin_button_emergency_pin: number;
  button_front_door_pin: number;
  button_back_door_pin: number;
  limit_switch_back_door_pin: number;
  limit_switch_front_door: number;
  relay_light_pin: number;
  relay_magnetic_back_door_pin: number;
  relay_magnetic_pin: number;
  relay_mini_selenoid_open: number;
  relay_mini_selenoid_close: number;
  relay_mini_front_door_pin: number;
  relay_mini_back_door_pin: number;
  relay_mini_door_emergency: number;
}

export interface PinConfigResponse {
  optocoupler: {
    pir_sensor_pin: number;
    fss_pin: number;
    smoke_sensor_pin_button_emergency_pin: number;
    button_front_door_pin: number;
    button_back_door_pin: number;
    limit_switch_back_door_pin: number;
    limit_switch_front_door: number;
  };
  relay: {
    relay_light_pin: number;
    relay_magnetic_back_door_pin: number;
    relay_magnetic_pin: number;
  };
  relay_mini: {
    relay_mini_selenoid_open: number;
    relay_mini_selenoid_close: number;
    relay_mini_front_door_pin: number;
    relay_mini_back_door_pin: number;
    relay_mini_door_emergency: number;
  };
}

export interface MqttPinResponse {
  success?: boolean;
  result?: string;
}

export const defaultPinConfig: PinConfig = {
  pir_sensor_pin: 1,
  fss_pin: 2,
  smoke_sensor_pin_button_emergency_pin: 3,
  button_front_door_pin: 4,
  button_back_door_pin: 5,
  limit_switch_back_door_pin: 6,
  limit_switch_front_door: 7,
  relay_light_pin: 1,
  relay_magnetic_back_door_pin: 6,
  relay_magnetic_pin: 7,
  relay_mini_selenoid_open: 1,
  relay_mini_selenoid_close: 2,
  relay_mini_front_door_pin: 3,
  relay_mini_back_door_pin: 4,
  relay_mini_door_emergency: 5,
};

export function usePinConfig() {
  const [config, setConfig] = useState<PinConfig>(defaultPinConfig);
  const [originalConfig, setOriginalConfig] = useState<PinConfig>(defaultPinConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { publishMessage } = useMQTTPublish();
  const { subscribe, unsubscribe, isConnected } = useMQTT();

  // MQTT Topics
  const TOPICS = {
    PIN_CONFIG: "IOT/Containment/Control/Config/Pin",
    CURRENT_PIN_CONFIG: "IOT/Containment/Control/Current_Config/Pin"
  };

  // Subscribe to MQTT messages
  useEffect(() => {
    const handleMessage = (topic: string, message: Buffer) => {
      if (topic === TOPICS.CURRENT_PIN_CONFIG) {
        try {
          const response = JSON.parse(message.toString());
          console.log('Received pin config response:', response);
          
          // Check if it's a command response or actual config data
          if (response.success !== undefined || response.result !== undefined) {
            // Handle command response
            const mqttResponse = response as MqttPinResponse;
            if (mqttResponse.success) {
              toast.success(mqttResponse.result || 'Pin configuration updated successfully');
              setOriginalConfig({ ...config }); // Update original config on success
            } else {
              toast.error(mqttResponse.result || 'Failed to update pin configuration');
              setValidationErrors([mqttResponse.result || 'Unknown error']);
            }
          } else {
            // Handle actual config data
            const receivedConfig = response as PinConfigResponse;
            const flatConfig: PinConfig = {
              // Optocoupler pins
              pir_sensor_pin: receivedConfig.optocoupler.pir_sensor_pin,
              fss_pin: receivedConfig.optocoupler.fss_pin,
              smoke_sensor_pin_button_emergency_pin: receivedConfig.optocoupler.smoke_sensor_pin_button_emergency_pin,
              button_front_door_pin: receivedConfig.optocoupler.button_front_door_pin,
              button_back_door_pin: receivedConfig.optocoupler.button_back_door_pin,
              limit_switch_back_door_pin: receivedConfig.optocoupler.limit_switch_back_door_pin,
              limit_switch_front_door: receivedConfig.optocoupler.limit_switch_front_door,
              // Relay pins
              relay_light_pin: receivedConfig.relay.relay_light_pin,
              relay_magnetic_back_door_pin: receivedConfig.relay.relay_magnetic_back_door_pin,
              relay_magnetic_pin: receivedConfig.relay.relay_magnetic_pin,
              // Relay mini pins
              relay_mini_selenoid_open: receivedConfig.relay_mini.relay_mini_selenoid_open,
              relay_mini_selenoid_close: receivedConfig.relay_mini.relay_mini_selenoid_close,
              relay_mini_front_door_pin: receivedConfig.relay_mini.relay_mini_front_door_pin,
              relay_mini_back_door_pin: receivedConfig.relay_mini.relay_mini_back_door_pin,
              relay_mini_door_emergency: receivedConfig.relay_mini.relay_mini_door_emergency,
            };
            
            setConfig(flatConfig);
            setOriginalConfig(flatConfig);
            setLastUpdated(new Date());
            setValidationErrors([]);
            toast.success('Pin configuration received from device');
          }
        } catch (error) {
          console.error('Failed to parse pin config message:', error);
          toast.error('Failed to parse pin configuration from device');
        }
      }
    };

    if (isConnected()) {
      subscribe(TOPICS.CURRENT_PIN_CONFIG, handleMessage, 'pin-config-hook');
    }

    return () => {
      unsubscribe(TOPICS.CURRENT_PIN_CONFIG, 'pin-config-hook');
    };
  }, [isConnected(), config]);

  // Validate pin configuration
  const validatePinConfig = useCallback((pinConfig: PinConfig) => {
    const errors: string[] = [];
    
    // Define pin ranges
    const optocouplerPins = [
      pinConfig.pir_sensor_pin,
      pinConfig.fss_pin,
      pinConfig.smoke_sensor_pin_button_emergency_pin,
      pinConfig.button_front_door_pin,
      pinConfig.button_back_door_pin,
      pinConfig.limit_switch_back_door_pin,
      pinConfig.limit_switch_front_door
    ];
    
    const relayPins = [
      pinConfig.relay_light_pin,
      pinConfig.relay_magnetic_back_door_pin,
      pinConfig.relay_magnetic_pin
    ];
    
    const relayMiniPins = [
      pinConfig.relay_mini_selenoid_open,
      pinConfig.relay_mini_selenoid_close,
      pinConfig.relay_mini_front_door_pin,
      pinConfig.relay_mini_back_door_pin,
      pinConfig.relay_mini_door_emergency
    ];

    // Check optocoupler pin range (1-7)
    optocouplerPins.forEach((pin, index) => {
      if (pin < 1 || pin > 7) {
        errors.push(`Optocoupler pin ${index + 1} is out of range (1-7)`);
      }
    });

    // Check relay pin range (1-7)
    relayPins.forEach((pin, index) => {
      if (pin < 1 || pin > 7) {
        errors.push(`Relay pin ${index + 1} is out of range (1-7)`);
      }
    });

    // Check relay mini pin range (1-6)
    relayMiniPins.forEach((pin, index) => {
      if (pin < 1 || pin > 6) {
        errors.push(`Relay mini pin ${index + 1} is out of range (1-6)`);
      }
    });

    // Check for duplicate pins within each category
    const optocouplerDuplicates = optocouplerPins.filter((pin, index) => 
      optocouplerPins.indexOf(pin) !== index
    );
    if (optocouplerDuplicates.length > 0) {
      errors.push(`Duplicate pins in optocoupler configuration: ${[...new Set(optocouplerDuplicates)].join(', ')}`);
    }

    const relayDuplicates = relayPins.filter((pin, index) => 
      relayPins.indexOf(pin) !== index
    );
    if (relayDuplicates.length > 0) {
      errors.push(`Duplicate pins in relay configuration: ${[...new Set(relayDuplicates)].join(', ')}`);
    }

    const relayMiniDuplicates = relayMiniPins.filter((pin, index) => 
      relayMiniPins.indexOf(pin) !== index
    );
    if (relayMiniDuplicates.length > 0) {
      errors.push(`Duplicate pins in relay mini configuration: ${[...new Set(relayMiniDuplicates)].join(', ')}`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, []);

  // Validate configuration when it changes
  useEffect(() => {
    const hasConfigChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
    if (hasConfigChanges) {
      validatePinConfig(config);
    } else {
      setValidationErrors([]);
    }
  }, [config, originalConfig, validatePinConfig]);

  // Request current pin configuration from device
  const requestCurrentPinConfig = useCallback(async () => {
    if (!isConnected()) {
      toast.error('MQTT not connected');
      return false;
    }

    setIsLoading(true);
    
    const payload = {
      data: "Get Data Setting"
    };

    const success = await publishMessage(TOPICS.PIN_CONFIG, payload);
    if (success) {
      console.log('Requested current pin config');
      toast.info('Requesting current pin configuration...');
      // Loading will be cleared when response is received or timeout
      setTimeout(() => setIsLoading(false), 5000);
      return true;
    } else {
      setIsLoading(false);
      return false;
    }
  }, [publishMessage, isConnected]);

  // Save pin configuration to device
  const savePinConfig = useCallback(async () => {
    if (!isConnected()) {
      toast.error('MQTT not connected');
      return false;
    }

    // Validate before saving
    if (!validatePinConfig(config)) {
      toast.error('Please fix validation errors before saving');
      return false;
    }

    const payload = {
      data: "Change Setting Pin",
      value: {
        pir_sensor_pin: config.pir_sensor_pin,
        fss_pin: config.fss_pin,
        smoke_sensor_pin_button_emergency_pin: config.smoke_sensor_pin_button_emergency_pin,
        button_front_door_pin: config.button_front_door_pin,
        button_back_door_pin: config.button_back_door_pin,
        limit_switch_back_door_pin: config.limit_switch_back_door_pin,
        limit_switch_front_door: config.limit_switch_front_door,
        relay_light_pin: config.relay_light_pin,
        relay_mini_selenoid_open: config.relay_mini_selenoid_open,
        relay_mini_selenoid_close: config.relay_mini_selenoid_close,
        relay_mini_front_door_pin: config.relay_mini_front_door_pin,
        relay_mini_back_door_pin: config.relay_mini_back_door_pin,
        relay_mini_door_emergency: config.relay_mini_door_emergency
      }
    };

    const success = await publishMessage(TOPICS.PIN_CONFIG, payload);
    if (success) {
      console.log('Published pin configuration');
      toast.info('Saving pin configuration...');
      return true;
    }
    return false;
  }, [config, publishMessage, isConnected, validatePinConfig]);

  // Update local configuration
  const updateConfig = useCallback((updates: Partial<PinConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset to default configuration
  const resetToDefault = useCallback(() => {
    setConfig(defaultPinConfig);
    toast.info('Pin configuration reset to default values');
  }, []);

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  return {
    config,
    originalConfig,
    isLoading,
    lastUpdated,
    validationErrors,
    hasChanges,
    isConnected: isConnected(),
    requestCurrentPinConfig,
    savePinConfig,
    updateConfig,
    resetToDefault,
    validatePinConfig,
  };
}