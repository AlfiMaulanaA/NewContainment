"use client";

import { useState, useEffect, useCallback } from 'react';
import { devicesApi } from '@/lib/api-service';
import { DeviceActivityStatus } from '@/lib/api-service';
import { toast } from 'sonner';

export function useDeviceStatus(refreshInterval: number = 30000) {
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceActivityStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevicesStatus = useCallback(async () => {
    try {
      const response = await devicesApi.getDevicesStatus();
      
      if (response.success && response.data) {
        setDeviceStatuses(response.data);
        setError(null);
      } else {
        setError(response.message || 'Failed to fetch device statuses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const getDeviceStatus = useCallback(async (deviceId: number): Promise<DeviceActivityStatus | null> => {
    try {
      const response = await devicesApi.getDeviceStatus(deviceId);
      
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      return null;
    }
  }, []);

  const isDeviceOnline = useCallback(async (deviceId: number): Promise<boolean> => {
    try {
      const response = await devicesApi.isDeviceOnline(deviceId);
      
      if (response.success && response.data !== undefined) {
        return response.data;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, []);

  const forceStatusCheck = useCallback(async (): Promise<boolean> => {
    try {
      const response = await devicesApi.forceStatusCheck();
      
      if (response.success) {
        toast.success('Device status check completed');
        await fetchDevicesStatus(); // Refresh data after check
        return true;
      } else {
        toast.error(response.message || 'Failed to force status check');
        return false;
      }
    } catch (err) {
      toast.error('Failed to force status check');
      return false;
    }
  }, [fetchDevicesStatus]);

  const initializeMonitoring = useCallback(async (): Promise<boolean> => {
    try {
      const response = await devicesApi.initializeMonitoring();
      
      if (response.success) {
        toast.success('Device monitoring initialized');
        await fetchDevicesStatus(); // Refresh data after initialization
        return true;
      } else {
        toast.error(response.message || 'Failed to initialize monitoring');
        return false;
      }
    } catch (err) {
      toast.error('Failed to initialize monitoring');
      return false;
    }
  }, [fetchDevicesStatus]);

  // Get status for a specific device from cached data
  const getDeviceStatusFromCache = useCallback((deviceId: number): DeviceActivityStatus | null => {
    return deviceStatuses.find(status => status.deviceId === deviceId) || null;
  }, [deviceStatuses]);

  // Get online status for multiple devices from cached data
  const getDevicesOnlineStatus = useCallback((deviceIds: number[]): Record<number, boolean> => {
    const result: Record<number, boolean> = {};
    
    deviceIds.forEach(deviceId => {
      const status = getDeviceStatusFromCache(deviceId);
      result[deviceId] = status?.status === 'Online' || false;
    });
    
    return result;
  }, [getDeviceStatusFromCache]);

  // Helper function to get status color for UI
  const getStatusColor = useCallback((status: string): string => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'text-green-500 bg-green-50 border-green-200';
      case 'offline':
        return 'text-red-500 bg-red-50 border-red-200';
      case 'unknown':
        return 'text-gray-500 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  }, []);

  // Helper function to get status icon
  const getStatusIcon = useCallback((status: string): string => {
    switch (status.toLowerCase()) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'unknown':
        return '🟡';
      default:
        return '⚫';
    }
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchDevicesStatus();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchDevicesStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDevicesStatus, refreshInterval]);

  return {
    deviceStatuses,
    loading,
    error,
    
    // Data fetching functions
    fetchDevicesStatus,
    getDeviceStatus,
    isDeviceOnline,
    
    // Cache access functions
    getDeviceStatusFromCache,
    getDevicesOnlineStatus,
    
    // Management functions
    forceStatusCheck,
    initializeMonitoring,
    
    // UI helper functions
    getStatusColor,
    getStatusIcon,
  };
}

export default useDeviceStatus;