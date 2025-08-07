"use client";

import { useState, useEffect, useCallback } from 'react';

export interface DashboardPreferences {
  isCarouselMode: boolean;
  autoPlayEnabled: boolean;
  autoPlayInterval: number;
  favoriteComponents: string[];
  lastViewedComponent: number;
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  isCarouselMode: true,
  autoPlayEnabled: false,
  autoPlayInterval: 15000,
  favoriteComponents: [],
  lastViewedComponent: 0
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
    setLastViewedComponent
  };
}