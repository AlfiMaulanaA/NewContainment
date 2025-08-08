"use client";

import { useCallback, useEffect, useState } from 'react';
import { useMQTT } from '@/lib/mqtt-manager';
import { useMQTTPublish } from '@/hooks/useMQTTPublish';
import { toast } from 'sonner';

// Types for system configuration
export interface SystemConfig {
  modular_i2c_address_1: number;
  modular_i2c_address_2: number;
  modular_i2c_relay_1_address: number;
  debug: boolean;
  interval_control_light: number;
  interval_control_selenoid: number;
  interval_door_lock: number;
  interval_open_front_door: number;
  interval_open_back_door: number;
  temp_emergency: boolean;
  temp_upper_threshold: number;
  temp_bottom_threshold: number;
}

export const defaultSystemConfig: SystemConfig = {
  modular_i2c_address_1: 34,
  modular_i2c_address_2: 37,
  modular_i2c_relay_1_address: 57,
  debug: true,
  interval_control_light: 120,
  interval_control_selenoid: 2,
  interval_door_lock: 4,
  interval_open_front_door: 2,
  interval_open_back_door: 2,
  temp_emergency: true,
  temp_upper_threshold: 60.0,
  temp_bottom_threshold: 50.0,
};

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>(defaultSystemConfig);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig>(defaultSystemConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { publishMessage } = useMQTTPublish();
  const { subscribe, unsubscribe, isConnected } = useMQTT();

  // MQTT Topics
  const TOPICS = {
    CONTROL: "IOT/Containment/Control",
    CONFIG: "IOT/Containment/Control/Config",
    CURRENT_CONFIG: "IOT/Containment/Control/Current_Config"
  };

  // Subscribe to MQTT messages
  useEffect(() => {
    const handleMessage = (topic: string, message: Buffer) => {
      if (topic === TOPICS.CURRENT_CONFIG) {
        try {
          const receivedConfig = JSON.parse(message.toString());
          console.log('Received system config:', receivedConfig);
          
          setConfig(receivedConfig);
          setOriginalConfig(receivedConfig);
          setLastUpdated(new Date());
          toast.success('System configuration received from device');
        } catch (error) {
          console.error('Failed to parse system config message:', error);
          toast.error('Failed to parse system configuration from device');
        }
      }
    };

    if (isConnected()) {
      subscribe(TOPICS.CURRENT_CONFIG, handleMessage, 'system-config-hook');
    }

    return () => {
      unsubscribe(TOPICS.CURRENT_CONFIG, 'system-config-hook');
    };
  }, [isConnected()]);

  // Request current configuration from device
  const requestCurrentConfig = useCallback(async () => {
    if (!isConnected()) {
      toast.error('MQTT not connected');
      return false;
    }

    setIsLoading(true);
    
    const payload = {
      data: "Get Data Setting"
    };

    const success = await publishMessage(TOPICS.CONFIG, payload);
    if (success) {
      console.log('Requested current system config');
      toast.info('Requesting current system configuration...');
      // Loading will be cleared when response is received or timeout
      setTimeout(() => setIsLoading(false), 5000);
      return true;
    } else {
      setIsLoading(false);
      return false;
    }
  }, [publishMessage, isConnected]);

  // Publish individual configuration changes
  const publishConfigChange = useCallback(async (key: string, value: any) => {
    if (!isConnected()) {
      toast.error('MQTT not connected');
      return false;
    }

    const payload = {
      data: key,
      value: value
    };

    const success = await publishMessage(TOPICS.CONFIG, payload);
    if (success) {
      console.log(`Published ${key}:`, value);
      toast.success(`${key} updated successfully`);
    }
    return success;
  }, [publishMessage, isConnected]);

  // Save all configuration changes
  const saveAllChanges = useCallback(async () => {
    if (!isConnected()) {
      toast.error('MQTT not connected');
      return false;
    }

    // First publish the general config change command
    const generalPayload = {
      data: "Change config system"
    };

    const generalSuccess = await publishMessage(TOPICS.CONTROL, generalPayload);
    if (!generalSuccess) {
      toast.error('Failed to initiate configuration change');
      return false;
    }

    // Then publish individual changes
    let allSuccess = true;
    for (const key of Object.keys(config)) {
      const configKey = key as keyof SystemConfig;
      if (config[configKey] !== originalConfig[configKey]) {
        const success = await publishConfigChange(key, config[configKey]);
        if (!success) {
          allSuccess = false;
        }
      }
    }

    if (allSuccess) {
      setOriginalConfig({ ...config });
      toast.success('All configuration changes saved');
    } else {
      toast.error('Some configuration changes failed to save');
    }

    return allSuccess;
  }, [config, originalConfig, publishMessage, publishConfigChange, isConnected]);

  // Toggle emergency temperature
  const toggleEmergencyTemp = useCallback(async (enable: boolean) => {
    if (!isConnected()) {
      toast.error('MQTT not connected');
      return false;
    }

    const command = enable ? "Emergency Temp ON" : "Emergency Temp OFF";
    const payload = {
      data: command
    };

    const success = await publishMessage(TOPICS.CONFIG, payload);
    if (success) {
      console.log(`Emergency temp ${enable ? 'enabled' : 'disabled'}`);
      toast.success(`Emergency temperature ${enable ? 'enabled' : 'disabled'}`);
      setConfig(prev => ({ ...prev, temp_emergency: enable }));
    }
    return success;
  }, [publishMessage, isConnected]);

  // Update local configuration
  const updateConfig = useCallback((updates: Partial<SystemConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset to default configuration
  const resetToDefault = useCallback(() => {
    setConfig(defaultSystemConfig);
    toast.info('System configuration reset to default values');
  }, []);

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  return {
    config,
    originalConfig,
    isLoading,
    lastUpdated,
    hasChanges,
    isConnected: isConnected(),
    requestCurrentConfig,
    publishConfigChange,
    saveAllChanges,
    toggleEmergencyTemp,
    updateConfig,
    resetToDefault,
  };
}