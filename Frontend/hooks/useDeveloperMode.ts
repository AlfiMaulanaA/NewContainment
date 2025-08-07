"use client";

import { useState, useEffect } from 'react';

const DEVELOPER_PASSWORD = 'IOT@1868';
const DEVELOPER_MODE_KEY = 'developer_mode_enabled';
const DEVELOPER_MODE_EXPIRY = 'developer_mode_expiry';

// Developer mode expires after 5 minutes
const EXPIRY_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export function useDeveloperMode() {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkDeveloperMode();
  }, []);

  const checkDeveloperMode = () => {
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
  };

  const enableDeveloperMode = (password: string): boolean => {
    if (password === DEVELOPER_PASSWORD) {
      const expiryTime = Date.now() + EXPIRY_DURATION;
      
      try {
        localStorage.setItem(DEVELOPER_MODE_KEY, 'true');
        localStorage.setItem(DEVELOPER_MODE_EXPIRY, expiryTime.toString());
        setIsDeveloperMode(true);
        return true;
      } catch (error) {
        console.error('Error enabling developer mode:', error);
        return false;
      }
    }
    return false;
  };

  const disableDeveloperMode = () => {
    try {
      localStorage.removeItem(DEVELOPER_MODE_KEY);
      localStorage.removeItem(DEVELOPER_MODE_EXPIRY);
      setIsDeveloperMode(false);
    } catch (error) {
      console.error('Error disabling developer mode:', error);
    }
  };

  const getRemainingTime = (): number => {
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
  };

  const getFormattedRemainingTime = (): string => {
    const remaining = getRemainingTime();
    if (remaining <= 0) return '0h 0m';
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${hours}h ${minutes}m`;
  };

  return {
    isDeveloperMode,
    isLoading,
    enableDeveloperMode,
    disableDeveloperMode,
    getRemainingTime,
    getFormattedRemainingTime,
    refreshDeveloperMode: checkDeveloperMode
  };
}