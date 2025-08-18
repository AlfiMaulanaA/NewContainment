import { useState, useEffect, useCallback } from 'react';
import { healthApi } from '@/lib/api-service';

interface BackendStatus {
  isOnline: boolean;
  lastChecked: Date | null;
  responseTime: number | null;
  error: string | null;
}

interface UseBackendStatusOptions {
  checkInterval?: number; // in milliseconds
  timeout?: number; // in milliseconds
  enabled?: boolean;
}

export const useBackendStatus = (options: UseBackendStatusOptions = {}) => {
  const {
    checkInterval = 30000, // 30 seconds
    timeout = 5000, // 5 seconds
    enabled = true
  } = options;

  const [status, setStatus] = useState<BackendStatus>({
    isOnline: true, // Start with optimistic state
    lastChecked: null,
    responseTime: null,
    error: null
  });

  const checkBackendHealth = useCallback(async (): Promise<BackendStatus> => {
    const startTime = Date.now();
    
    try {
      // Use centralized API service with timeout
      const result = await Promise.race([
        healthApi.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;

      return {
        isOnline: true,
        lastChecked: new Date(),
        responseTime,
        error: null
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      let errorMessage = 'Connection failed';
      if (error.message === 'Request timeout') {
        errorMessage = `Request timeout (>${timeout}ms)`;
      } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Backend server is not responding';
      } else {
        errorMessage = error.message || 'Unknown error';
      }

      return {
        isOnline: false,
        lastChecked: new Date(),
        responseTime,
        error: errorMessage
      };
    }
  }, [timeout]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkBackendHealth().then(setStatus);

    // Set up interval for periodic checks
    const intervalId = setInterval(() => {
      checkBackendHealth().then(setStatus);
    }, checkInterval);

    return () => clearInterval(intervalId);
  }, [checkBackendHealth, checkInterval, enabled]);

  const manualCheck = useCallback(async () => {
    const newStatus = await checkBackendHealth();
    setStatus(newStatus);
    return newStatus;
  }, [checkBackendHealth]);

  return {
    ...status,
    manualCheck,
    checkInterval
  };
};