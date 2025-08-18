"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DEVELOPER_PASSWORD = 'IOT@1868';
const DEVELOPER_MODE_KEY = 'developer_mode_enabled';
const DEVELOPER_MODE_EXPIRY = 'developer_mode_expiry';
const EXPIRY_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface DeveloperModeContextType {
  isDeveloperMode: boolean;
  isLoading: boolean;
  enableDeveloperMode: (password: string) => boolean;
  disableDeveloperMode: () => void;
  getRemainingTime: () => number;
  getFormattedRemainingTime: () => string;
  refreshDeveloperMode: () => void;
  // Event emitter for real-time updates
  triggerUpdate: () => void;
}

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

export function DeveloperModeProvider({ children }: { children: React.ReactNode }) {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const checkDeveloperMode = useCallback(() => {
    try {
      const stored = localStorage.getItem(DEVELOPER_MODE_KEY);
      const expiry = localStorage.getItem(DEVELOPER_MODE_EXPIRY);
      
      if (stored === 'true' && expiry) {
        const expiryTime = parseInt(expiry);
        const currentTime = Date.now();
        
        if (currentTime < expiryTime) {
          setIsDeveloperMode(true);
        } else {
          // Expired, clear storage
          localStorage.removeItem(DEVELOPER_MODE_KEY);
          localStorage.removeItem(DEVELOPER_MODE_EXPIRY);
          setIsDeveloperMode(false);
        }
      } else {
        setIsDeveloperMode(false);
      }
    } catch (error) {
      console.error('Error checking developer mode:', error);
      setIsDeveloperMode(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkDeveloperMode();
  }, [checkDeveloperMode, updateTrigger]);

  // Auto-check expiry every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDeveloperMode) {
        checkDeveloperMode();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isDeveloperMode, checkDeveloperMode]);

  const enableDeveloperMode = useCallback((password: string): boolean => {
    if (password === DEVELOPER_PASSWORD) {
      const expiryTime = Date.now() + EXPIRY_DURATION;
      
      try {
        localStorage.setItem(DEVELOPER_MODE_KEY, 'true');
        localStorage.setItem(DEVELOPER_MODE_EXPIRY, expiryTime.toString());
        setIsDeveloperMode(true);
        triggerUpdate();
        return true;
      } catch (error) {
        console.error('Error enabling developer mode:', error);
        return false;
      }
    }
    return false;
  }, []);

  const disableDeveloperMode = useCallback(() => {
    try {
      localStorage.removeItem(DEVELOPER_MODE_KEY);
      localStorage.removeItem(DEVELOPER_MODE_EXPIRY);
      setIsDeveloperMode(false);
      triggerUpdate();
    } catch (error) {
      console.error('Error disabling developer mode:', error);
    }
  }, []);

  const getRemainingTime = useCallback((): number => {
    try {
      const expiry = localStorage.getItem(DEVELOPER_MODE_EXPIRY);
      if (expiry) {
        const expiryTime = parseInt(expiry);
        const currentTime = Date.now();
        return Math.max(0, expiryTime - currentTime);
      }
    } catch (error) {
      console.error('Error getting remaining time:', error);
    }
    return 0;
  }, []);

  const getFormattedRemainingTime = useCallback((): string => {
    const remaining = getRemainingTime();
    if (remaining <= 0) return '0h 0m';
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${hours}h ${minutes}m`;
  }, [getRemainingTime]);

  const triggerUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const refreshDeveloperMode = useCallback(() => {
    checkDeveloperMode();
    triggerUpdate();
  }, [checkDeveloperMode]);

  const value: DeveloperModeContextType = {
    isDeveloperMode,
    isLoading,
    enableDeveloperMode,
    disableDeveloperMode,
    getRemainingTime,
    getFormattedRemainingTime,
    refreshDeveloperMode,
    triggerUpdate,
  };

  return (
    <DeveloperModeContext.Provider value={value}>
      {children}
    </DeveloperModeContext.Provider>
  );
}

export function useDeveloperMode() {
  const context = useContext(DeveloperModeContext);
  if (context === undefined) {
    throw new Error('useDeveloperMode must be used within a DeveloperModeProvider');
  }
  return context;
}

// Developer mode configuration
export const DEVELOPER_MODE_CONFIG = {
  password: DEVELOPER_PASSWORD,
  expiryDuration: EXPIRY_DURATION,
  features: [
    {
      id: 'access-control',
      name: 'Access Control System',
      description: 'Manage user access and permissions',
      route: '/access-control',
    },
    {
      id: 'zkteco-integration',
      name: 'ZKTeco Device Integration',
      description: 'Biometric device management',
      route: '/access-control/devices',
    },
    {
      id: 'advanced-monitoring',
      name: 'Advanced Monitoring',
      description: 'Enhanced system monitoring tools',
      route: '/access-control/monitoring',
    },
    {
      id: 'developer-tools',
      name: 'Developer Tools',
      description: 'Development and debugging utilities',
      route: '/developer',
    },
  ],
} as const;