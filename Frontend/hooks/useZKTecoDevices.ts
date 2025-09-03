"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useMQTT } from '@/hooks/useMQTT';
import type {
  ZKTecoDevice,
  DeviceConnectionTest,
  DeviceTestResponse,
  DeviceCRUDResponse,
  DeviceTestCommand,
  DeviceAddCommand,
  DeviceUpdateCommand,
  DeviceDeleteCommand,
  DeviceListCommand,
  UseZKTecoDevicesResult
} from '@/types/zkteco';

export function useZKTecoDevices(): UseZKTecoDevicesResult {
  const { subscribe, publish, isConnected } = useMQTT();
  
  // State management
  const [devices, setDevices] = useState<ZKTecoDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<DeviceConnectionTest[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  
  // Refs untuk tracking promises
  const pendingOperations = useRef<Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>>(new Map());

  // MQTT Topics
  const DEVICE_COMMAND_TOPIC = 'accessControl/device/command';
  const DEVICE_RESPONSE_TOPIC = 'accessControl/device/response';

  // Setup MQTT subscriptions
  useEffect(() => {
    if (!isConnected) return;

    const handleDeviceResponse = (topic: string, message: string) => {
      try {
        const response: DeviceTestResponse | DeviceCRUDResponse = JSON.parse(message);
        
        // Handle different response types
        if (response.command === 'testConnection') {
          handleTestResponse(response as DeviceTestResponse);
        } else if (['addDevice', 'updateDevice', 'deleteDevice', 'listDevices'].includes(response.command)) {
          handleCRUDResponse(response as DeviceCRUDResponse);
        }
      } catch (err) {
        console.error('Failed to parse MQTT response:', err);
      }
    };

    subscribe(DEVICE_RESPONSE_TOPIC, handleDeviceResponse);

    return () => {
      // Cleanup pending operations on unmount
      pendingOperations.current.forEach(({ timeout, reject }) => {
        clearTimeout(timeout);
        reject(new Error('Component unmounted'));
      });
      pendingOperations.current.clear();
    };
  }, [isConnected, subscribe]);

  // Handle test connection responses
  const handleTestResponse = useCallback((response: DeviceTestResponse) => {
    const operationId = `test_${response.data.device_id || 'all'}`;
    const pending = pendingOperations.current.get(operationId);
    
    if (response.status === 'success') {
      if (response.data.test_type === 'single_device' && response.data.result) {
        setTestResults([response.data.result]);
        pending?.resolve(response.data.result);
      } else if (response.data.test_type === 'all_devices' && response.data.devices) {
        setTestResults(response.data.devices);
        pending?.resolve(response.data.devices);
      }
      
      toast.success(response.message);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }
    
    setTestLoading(false);
    
    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }
  }, []);

  // Handle CRUD operation responses
  const handleCRUDResponse = useCallback((response: DeviceCRUDResponse) => {
    const operationId = `crud_${response.command}_${Date.now()}`;
    const pending = pendingOperations.current.get(operationId);
    
    if (response.status === 'success') {
      // Update local state based on operation
      if (response.command === 'addDevice' && response.device) {
        setDevices(prev => [...prev, response.device!]);
        toast.success(`Device ${response.device.name} added successfully`);
      } else if (response.command === 'updateDevice' && response.device) {
        setDevices(prev => prev.map(dev => 
          dev.id === response.device!.id ? response.device! : dev
        ));
        toast.success(`Device ${response.device.name} updated successfully`);
      } else if (response.command === 'deleteDevice' && response.deleted_device) {
        setDevices(prev => prev.filter(dev => dev.id !== response.deleted_device!.id));
        toast.success(`Device ${response.deleted_device.name} deleted successfully`);
      } else if (response.command === 'listDevices' && response.devices) {
        setDevices(response.devices);
      }
      
      pending?.resolve(true);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }
    
    setLoading(false);
    
    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }
  }, []);

  // Generic MQTT command sender with promise handling
  const sendCommand = useCallback(async <T>(
    command: DeviceTestCommand | DeviceAddCommand | DeviceUpdateCommand | DeviceDeleteCommand | DeviceListCommand,
    operationId: string,
    timeout: number = 10000
  ): Promise<T> => {
    if (!isConnected) {
      throw new Error('MQTT not connected');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingOperations.current.delete(operationId);
        reject(new Error('Operation timeout'));
      }, timeout);

      pendingOperations.current.set(operationId, {
        resolve,
        reject,
        timeout: timeoutId
      });

      const success = publish(DEVICE_COMMAND_TOPIC, JSON.stringify(command));
      if (!success) {
        clearTimeout(timeoutId);
        pendingOperations.current.delete(operationId);
        reject(new Error('Failed to publish MQTT command'));
      }
    });
  }, [isConnected, publish]);

  // Device CRUD Operations
  const addDevice = useCallback(async (deviceData: Omit<ZKTecoDevice, 'enabled'>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const command: DeviceAddCommand = {
        command: 'addDevice',
        data: {
          ...deviceData,
          enabled: true // Default to enabled
        }
      };
      
      const operationId = `crud_addDevice_${Date.now()}`;
      await sendCommand<boolean>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add device';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const updateDevice = useCallback(async (deviceId: string, updates: Partial<ZKTecoDevice>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const command: DeviceUpdateCommand = {
        command: 'updateDevice',
        data: {
          device_id: deviceId,
          ...updates
        }
      };
      
      const operationId = `crud_updateDevice_${Date.now()}`;
      await sendCommand<boolean>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update device';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const deleteDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const command: DeviceDeleteCommand = {
        command: 'deleteDevice',
        data: {
          device_id: deviceId
        }
      };
      
      const operationId = `crud_deleteDevice_${Date.now()}`;
      await sendCommand<boolean>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete device';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const refreshDevices = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const command: DeviceListCommand = {
        command: 'listDevices'
      };
      
      const operationId = `crud_listDevices_${Date.now()}`;
      await sendCommand<void>(command, operationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh devices';
      setError(message);
      setLoading(false);
    }
  }, [sendCommand]);

  // Connection Testing Operations
  const testDevice = useCallback(async (deviceId: string): Promise<DeviceConnectionTest | null> => {
    setTestLoading(true);
    setError(null);
    setTestResults([]);
    
    try {
      const command: DeviceTestCommand = {
        command: 'testConnection',
        data: {
          device_id: deviceId
        }
      };
      
      const operationId = `test_${deviceId}`;
      const result = await sendCommand<DeviceConnectionTest>(command, operationId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test device connection';
      setError(message);
      setTestLoading(false);
      return null;
    }
  }, [sendCommand]);

  const testAllDevices = useCallback(async (): Promise<DeviceConnectionTest[]> => {
    setTestLoading(true);
    setError(null);
    setTestResults([]);
    
    try {
      const command: DeviceTestCommand = {
        command: 'testConnection',
        data: {
          device_id: 'all'
        }
      };
      
      const operationId = `test_all`;
      const results = await sendCommand<DeviceConnectionTest[]>(command, operationId);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test all devices';
      setError(message);
      setTestLoading(false);
      return [];
    }
  }, [sendCommand]);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearTestResults = useCallback(() => {
    setTestResults([]);
  }, []);

  // Auto-refresh devices on mount
  useEffect(() => {
    if (isConnected && devices.length === 0) {
      refreshDevices();
    }
  }, [isConnected, devices.length, refreshDevices]);

  return {
    devices,
    loading,
    error,
    testResults,
    testLoading,
    
    // CRUD operations
    addDevice,
    updateDevice,
    deleteDevice,
    refreshDevices,
    
    // Connection testing
    testDevice,
    testAllDevices,
    
    // Utility functions
    clearError,
    clearTestResults
  };
}