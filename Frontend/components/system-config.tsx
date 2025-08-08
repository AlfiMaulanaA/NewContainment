"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Wifi, 
  RefreshCw, 
  Save, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Lightbulb,
  DoorOpen,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useMQTT } from '@/lib/mqtt-manager';
import { useMQTTStatus } from '@/hooks/useMQTTStatus';
import { useMQTTPublish } from '@/hooks/useMQTTPublish';

// Types for system configuration
interface SystemConfig {
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

const defaultConfig: SystemConfig = {
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

export function SystemConfigComponent() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Use existing MQTT hooks
  const mqttStatus = useMQTTStatus();
  const { publishMessage } = useMQTTPublish();
  const { subscribe, unsubscribe, isConnected } = useMQTT();
  const isConnectedStatus = isConnected();

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
          console.log('Received current config:', receivedConfig);
          
          setConfig(receivedConfig);
          setOriginalConfig(receivedConfig);
          setLastUpdated(new Date());
          setHasChanges(false);
          toast.success('Configuration received from device');
        } catch (error) {
          console.error('Failed to parse config message:', error);
          toast.error('Failed to parse configuration from device');
        }
      }
    };

    if (isConnectedStatus) {
      subscribe(TOPICS.CURRENT_CONFIG, handleMessage, 'system-config');
      // Request current configuration on connect
      requestCurrentConfig();
    }

    return () => {
      unsubscribe(TOPICS.CURRENT_CONFIG, 'system-config');
    };
  }, [isConnectedStatus]);

  // Check for changes
  useEffect(() => {
    const hasConfigChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(hasConfigChanges);
  }, [config, originalConfig]);

  const requestCurrentConfig = async () => {
    if (!isConnectedStatus) {
      toast.error('MQTT not connected');
      return;
    }

    setIsLoading(true);
    
    const payload = {
      data: "Get Data Setting"
    };

    const success = await publishMessage(TOPICS.CONFIG, payload);
    if (success) {
      console.log('Requested current config');
      toast.info('Requesting current configuration...');
      // Loading will be cleared when response is received
      setTimeout(() => setIsLoading(false), 5000); // Timeout after 5 seconds
    } else {
      setIsLoading(false);
    }
  };

  const publishConfigChange = async (key: string, value: any) => {
    if (!isConnectedStatus) {
      toast.error('MQTT not connected');
      return;
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
  };

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveChanges = async () => {
    if (!isConnectedStatus) {
      toast.error('MQTT not connected');
      return;
    }

    // First publish the general config change command
    const generalPayload = {
      data: "Change config system"
    };

    const generalSuccess = await publishMessage(TOPICS.CONTROL, generalPayload);
    if (!generalSuccess) {
      toast.error('Failed to initiate configuration change');
      return;
    }

    // Then publish individual changes
    for (const key of Object.keys(config)) {
      const configKey = key as keyof SystemConfig;
      if (config[configKey] !== originalConfig[configKey]) {
        await publishConfigChange(key, config[configKey]);
      }
    }

    setOriginalConfig({ ...config });
    toast.success('All configuration changes saved');
  };

  const handleEmergencyTempToggle = async (enable: boolean) => {
    if (!isConnectedStatus) {
      toast.error('MQTT not connected');
      return;
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
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    toast.info('Configuration reset to default values');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">System Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Configure IoT containment system parameters via MQTT
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={mqttStatus === "connected" ? "default" : "destructive"} className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            {mqttStatus === "connected" ? 'Connected' : 'Disconnected'}
          </Badge>
          
          {lastUpdated && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button 
          onClick={requestCurrentConfig} 
          disabled={!isConnectedStatus || isLoading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading...' : 'Refresh Config'}
        </Button>

        <Button 
          onClick={handleSaveChanges} 
          disabled={!isConnectedStatus || !hasChanges}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>

        <Button 
          onClick={resetToDefault} 
          variant="outline"
        >
          Reset to Default
        </Button>

        {hasChanges && (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Unsaved Changes
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* I2C Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              I2C Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="i2c_addr1">Modular I2C Address 1</Label>
              <Input
                id="i2c_addr1"
                type="number"
                value={config.modular_i2c_address_1}
                onChange={(e) => handleConfigChange('modular_i2c_address_1', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="i2c_addr2">Modular I2C Address 2</Label>
              <Input
                id="i2c_addr2"
                type="number"
                value={config.modular_i2c_address_2}
                onChange={(e) => handleConfigChange('modular_i2c_address_2', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="i2c_relay">Modular I2C Relay 1 Address</Label>
              <Input
                id="i2c_relay"
                type="number"
                value={config.modular_i2c_relay_1_address}
                onChange={(e) => handleConfigChange('modular_i2c_relay_1_address', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="debug">Debug Mode</Label>
              <Switch
                id="debug"
                checked={config.debug}
                onCheckedChange={(checked) => handleConfigChange('debug', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Interval Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Interval Controls (seconds)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="interval_light" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Light Control Interval
              </Label>
              <Input
                id="interval_light"
                type="number"
                value={config.interval_control_light}
                onChange={(e) => handleConfigChange('interval_control_light', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="interval_selenoid">Selenoid Control Interval</Label>
              <Input
                id="interval_selenoid"
                type="number"
                value={config.interval_control_selenoid}
                onChange={(e) => handleConfigChange('interval_control_selenoid', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="interval_door_lock" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Door Lock Interval
              </Label>
              <Input
                id="interval_door_lock"
                type="number"
                value={config.interval_door_lock}
                onChange={(e) => handleConfigChange('interval_door_lock', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="interval_front_door" className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4" />
                Front Door Open Interval
              </Label>
              <Input
                id="interval_front_door"
                type="number"
                value={config.interval_open_front_door}
                onChange={(e) => handleConfigChange('interval_open_front_door', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="interval_back_door" className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4" />
                Back Door Open Interval
              </Label>
              <Input
                id="interval_back_door"
                type="number"
                value={config.interval_open_back_door}
                onChange={(e) => handleConfigChange('interval_open_back_door', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Temperature Settings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Temperature Emergency Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="temp_upper">Upper Threshold (°C)</Label>
                <Input
                  id="temp_upper"
                  type="number"
                  step="0.1"
                  value={config.temp_upper_threshold}
                  onChange={(e) => handleConfigChange('temp_upper_threshold', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="temp_bottom">Bottom Threshold (°C)</Label>
                <Input
                  id="temp_bottom"
                  type="number"
                  step="0.1"
                  value={config.temp_bottom_threshold}
                  onChange={(e) => handleConfigChange('temp_bottom_threshold', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Emergency Temperature</Label>
                  <Switch
                    checked={config.temp_emergency}
                    onCheckedChange={(checked) => handleEmergencyTempToggle(checked)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEmergencyTempToggle(true)}
                    disabled={!isConnectedStatus}
                  >
                    Enable
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEmergencyTempToggle(false)}
                    disabled={!isConnectedStatus}
                  >
                    Disable
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{config.modular_i2c_address_1}</div>
              <div className="text-sm text-muted-foreground">I2C Address 1</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{config.interval_control_light}s</div>
              <div className="text-sm text-muted-foreground">Light Interval</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{config.temp_upper_threshold}°C</div>
              <div className="text-sm text-muted-foreground">Upper Threshold</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${config.temp_emergency ? 'text-green-600' : 'text-red-600'}`}>
                {config.temp_emergency ? 'ON' : 'OFF'}
              </div>
              <div className="text-sm text-muted-foreground">Emergency Temp</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}