"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw,
  Maximize2,
  Minimize2,
  List,
  Grid
} from "lucide-react";

interface DashboardCarouselProps {
  components: React.ComponentType<any>[];
  componentNames?: string[];
  autoPlayInterval?: number;
  showControls?: boolean;
  showNavigationOnly?: boolean;
  className?: string;
}

export function DashboardCarousel({ 
  components, 
  componentNames = [],
  autoPlayInterval = 10000, // 10 seconds default
  showControls = true,
  showNavigationOnly = false,
  className = ""
}: DashboardCarouselProps) {
  const { preferences, isLoaded, toggleCarouselMode, toggleAutoPlay, setLastViewedComponent } = useDashboardPreferences();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Early return if no components
  if (!components || components.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No dashboard components available</p>
      </div>
    );
  }

  // Use preferences when loaded, with stable defaults
  const isCarouselMode = isLoaded ? preferences.isCarouselMode : true;
  const isAutoPlay = isLoaded && isInitialized ? preferences.autoPlayEnabled : false;
  const effectiveInterval = isLoaded ? preferences.autoPlayInterval : autoPlayInterval;

  // Initialize from saved preferences with delay to prevent glitch
  useEffect(() => {
    if (isLoaded && components.length > 0) {
      // Clear any existing timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      
      // Delay initialization to ensure stable render
      initTimeoutRef.current = setTimeout(() => {
        if (preferences.lastViewedComponent < components.length) {
          setCurrentIndex(preferences.lastViewedComponent);
        }
        setIsInitialized(true);
      }, 100); // Small delay to prevent race conditions
    }
    
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isLoaded, preferences.lastViewedComponent, components.length]);

  // Auto-play functionality - only start after initialization
  useEffect(() => {
    if (isAutoPlay && isCarouselMode && isInitialized) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % components.length);
      }, effectiveInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlay, components.length, effectiveInterval, isCarouselMode, isInitialized]);

  // Save current index to preferences - only after initialization
  useEffect(() => {
    if (isLoaded && isInitialized) {
      setLastViewedComponent(currentIndex);
    }
  }, [currentIndex, isLoaded, isInitialized, setLastViewedComponent]);

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % components.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? components.length - 1 : prevIndex - 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const resetToFirst = () => {
    setCurrentIndex(0);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderCarouselMode = () => {
    const CurrentComponent = components[currentIndex];
    
    return (
      <div className="relative">
        {/* Component Display */}
        <div className="min-h-[400px] transition-all duration-300 ease-in-out">
          {!isInitialized ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              </div>
            </div>
          ) : (
            <CurrentComponent />
          )}
        </div>

        {/* Navigation Controls */}
        {showControls && components.length > 1 && (
          <div className="absolute inset-y-0 left-0 flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur -ml-4 shadow-lg hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {showControls && components.length > 1 && (
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur -mr-4 shadow-lg hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Dot Indicators */}
        {components.length > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {components.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 w-2 rounded-full transition-all duration-200 ${
                  index === currentIndex 
                    ? 'bg-primary w-6' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Current Component Name */}
        {componentNames[currentIndex] && (
          <div className="text-center mt-2">
            <Badge variant="secondary" className="text-xs">
              {componentNames[currentIndex]} ({currentIndex + 1}/{components.length})
            </Badge>
          </div>
        )}
      </div>
    );
  };

  const renderScrollMode = () => {
    return (
      <div className="space-y-6">
        {components.map((Component, index) => (
          <div key={index} className="transition-all duration-300">
            {componentNames[index] && (
              <div className="mb-2">
                <Badge variant="outline" className="text-xs">
                  {componentNames[index]}
                </Badge>
              </div>
            )}
            <Component />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}
    >
      {/* Minimal Control Panel - Only show fullscreen and navigation if enabled */}
      {showControls && !showNavigationOnly && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-1"
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      )}

      {/* Navigation Only Controls */}
      {showNavigationOnly && isCarouselMode && components.length > 1 && (
        <div className="mb-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            className="gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            className="gap-1"
          >
            <ChevronRight className="h-3 w-3" />
            Next
          </Button>
        </div>
      )}

      {/* Component Display */}
      <div className="relative">
        {isCarouselMode ? renderCarouselMode() : renderScrollMode()}
      </div>

      {/* Minimal Status Info */}
      {showControls && isCarouselMode && components.length > 1 && (
        <div className="mt-2 text-center">
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
            <span>{currentIndex + 1} of {components.length}</span>
            {isAutoPlay && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Play className="h-2 w-2" />
                Auto
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for keyboard navigation
export function useDashboardCarouselKeyboard(
  goNext: () => void,
  goPrev: () => void,
  toggleAutoPlay: () => void
) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goPrev();
          break;
        case ' ':
          event.preventDefault();
          toggleAutoPlay();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goNext, goPrev, toggleAutoPlay]);
}
