"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface VirtualKeyboardSettings {
  enabled: boolean;
  defaultLayout: 'qwerty' | 'numeric';
  defaultPosition: 'bottom' | 'center' | 'top' | 'left' | 'right';
  autoShow: boolean;
  autoHide: boolean;
}

interface VirtualKeyboardContextType {
  settings: VirtualKeyboardSettings;
  updateSettings: (settings: Partial<VirtualKeyboardSettings>) => void;
  toggleEnabled: () => void;
  shouldShowKeyboard: () => boolean;
}

const VirtualKeyboardContext = createContext<VirtualKeyboardContextType | null>(null);

const STORAGE_KEY = 'virtual-keyboard-settings';

const defaultSettings: VirtualKeyboardSettings = {
  enabled: true,
  defaultLayout: 'qwerty',
  defaultPosition: 'bottom',
  autoShow: true,
  autoHide: true
};

export function VirtualKeyboardProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<VirtualKeyboardSettings>(defaultSettings);

  // Load settings dari localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading virtual keyboard settings:', error);
    }
  }, []);

  // Save settings ke localStorage
  const updateSettings = (newSettings: Partial<VirtualKeyboardSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving virtual keyboard settings:', error);
    }
  };

  const toggleEnabled = () => {
    updateSettings({ enabled: !settings.enabled });
  };

  // Determine if keyboard should be shown based on settings
  const shouldShowKeyboard = () => {
    return settings.enabled;
  };

  return (
    <VirtualKeyboardContext.Provider value={{
      settings,
      updateSettings,
      toggleEnabled,
      shouldShowKeyboard
    }}>
      {children}
    </VirtualKeyboardContext.Provider>
  );
}

export function useVirtualKeyboardSettings() {
  const context = useContext(VirtualKeyboardContext);
  if (!context) {
    throw new Error('useVirtualKeyboardSettings must be used within VirtualKeyboardProvider');
  }
  return context;
}