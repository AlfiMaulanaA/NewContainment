"use client";

import { useState, useEffect, useCallback } from 'react';

export interface DashboardPreferences {
  isCarouselMode: boolean;
  autoPlayEnabled: boolean;
  autoPlayInterval: number;
  favoriteComponents: string[];
  lastViewedComponent: number;
  // New dashboard UI layout settings
  selectedDashboardLayout: 'dashboard-1' | 'dashboard-2' | 'dashboard-3';
  displayType: 'scroll' | 'carousel';
  carouselMode: 'manual' | 'automatic';
  carouselInterval: number; // in seconds - time between section transitions
  // CCTV wrapper settings
  cctvSettings: {
    enabled: boolean;
    autoRefresh: boolean;
    refreshInterval: number; // in seconds
    showTitles: boolean;
    gridLayout: '2x2' | '3x3' | '4x4';
    autoSwitchChannels: boolean;
    channelSwitchInterval: number; // in seconds
  };
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  isCarouselMode: true,
  autoPlayEnabled: false,
  autoPlayInterval: 15000,
  favoriteComponents: [],
  lastViewedComponent: 0,
  // New dashboard UI layout settings
  selectedDashboardLayout: 'dashboard-1',
  displayType: 'carousel',
  carouselMode: 'manual',
  carouselInterval: 8, // 8 seconds default
  // CCTV wrapper settings
  cctvSettings: {
    enabled: true,
    autoRefresh: true,
    refreshInterval: 30,
    showTitles: true,
    gridLayout: '2x2',
    autoSwitchChannels: false,
    channelSwitchInterval: 10
  }
};

const STORAGE_KEY = 'dashboard-preferences';

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load dashboard preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.error('Failed to save dashboard preferences:', error);
      }
    }
  }, [preferences, isLoaded]);

  const updatePreferences = useCallback((updates: Partial<DashboardPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const toggleCarouselMode = useCallback(() => {
    setPreferences(prev => ({ ...prev, isCarouselMode: !prev.isCarouselMode }));
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setPreferences(prev => ({ ...prev, autoPlayEnabled: !prev.autoPlayEnabled }));
  }, []);

  const setAutoPlayInterval = (interval: number) => {
    updatePreferences({ autoPlayInterval: interval });
  };

  const addFavoriteComponent = (componentName: string) => {
    if (!preferences.favoriteComponents.includes(componentName)) {
      updatePreferences({
        favoriteComponents: [...preferences.favoriteComponents, componentName]
      });
    }
  };

  const removeFavoriteComponent = (componentName: string) => {
    updatePreferences({
      favoriteComponents: preferences.favoriteComponents.filter(name => name !== componentName)
    });
  };

  const setLastViewedComponent = useCallback((index: number) => {
    setPreferences(prev => ({ ...prev, lastViewedComponent: index }));
  }, []);

  // New dashboard layout functions
  const setDashboardLayout = useCallback((layout: 'dashboard-1' | 'dashboard-2' | 'dashboard-3') => {
    setPreferences(prev => ({ ...prev, selectedDashboardLayout: layout }));
  }, []);

  const setDisplayType = useCallback((type: 'scroll' | 'carousel') => {
    setPreferences(prev => ({ ...prev, displayType: type }));
  }, []);

  const setCarouselMode = useCallback((mode: 'manual' | 'automatic') => {
    setPreferences(prev => ({ ...prev, carouselMode: mode }));
  }, []);

  const setCarouselInterval = useCallback((interval: number) => {
    setPreferences(prev => ({ ...prev, carouselInterval: interval }));
  }, []);

  // CCTV settings functions
  const updateCctvSettings = useCallback((updates: Partial<typeof preferences.cctvSettings>) => {
    setPreferences(prev => ({
      ...prev,
      cctvSettings: { ...prev.cctvSettings, ...updates }
    }));
  }, []);

  const toggleCctvEnabled = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      cctvSettings: { ...prev.cctvSettings, enabled: !prev.cctvSettings.enabled }
    }));
  }, []);

  const toggleCctvAutoRefresh = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      cctvSettings: { ...prev.cctvSettings, autoRefresh: !prev.cctvSettings.autoRefresh }
    }));
  }, []);

  const toggleCctvAutoSwitch = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      cctvSettings: { ...prev.cctvSettings, autoSwitchChannels: !prev.cctvSettings.autoSwitchChannels }
    }));
  }, []);

  return {
    preferences,
    isLoaded,
    updatePreferences,
    resetPreferences,
    toggleCarouselMode,
    toggleAutoPlay,
    setAutoPlayInterval,
    addFavoriteComponent,
    removeFavoriteComponent,
    setLastViewedComponent,
    // New dashboard layout functions
    setDashboardLayout,
    setDisplayType,
    setCarouselMode,
    setCarouselInterval,
    // CCTV settings functions
    updateCctvSettings,
    toggleCctvEnabled,
    toggleCctvAutoRefresh,
    toggleCctvAutoSwitch
  };
}