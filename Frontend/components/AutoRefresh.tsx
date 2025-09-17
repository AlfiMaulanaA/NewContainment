"use client";

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RefreshCw,
  Timer,
  Settings,
  Clock
} from 'lucide-react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

interface AutoRefreshProps {
  onRefresh?: () => void;
  defaultEnabled?: boolean;
  className?: string;
}

export function AutoRefresh({
  onRefresh,
  defaultEnabled = false,
  className = ""
}: AutoRefreshProps) {
  const [selectedInterval, setSelectedInterval] = useState(5); // minutes

  const {
    isEnabled,
    setIsEnabled,
    lastRefresh,
    timeRemainingFormatted,
    intervalMinutes
  } = useAutoRefresh({
    enabled: defaultEnabled,
    interval: selectedInterval * 60 * 1000, // convert minutes to milliseconds
    onRefresh
  });

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('autoRefreshSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setIsEnabled(settings.enabled || false);
        setSelectedInterval(settings.interval || 5);
      } catch (error) {
        console.warn('Failed to load auto-refresh settings:', error);
      }
    }
  }, [setIsEnabled]);

  // Save preferences
  useEffect(() => {
    const settings = {
      enabled: isEnabled,
      interval: selectedInterval
    };
    localStorage.setItem('autoRefreshSettings', JSON.stringify(settings));
  }, [isEnabled, selectedInterval]);

  const intervalOptions = [
    { value: 1, label: '1 minute', shortLabel: '1m' },
    { value: 2, label: '2 minutes', shortLabel: '2m' },
    { value: 5, label: '5 minutes', shortLabel: '5m' },
    { value: 10, label: '10 minutes', shortLabel: '10m' },
    { value: 15, label: '15 minutes', shortLabel: '15m' },
    { value: 30, label: '30 minutes', shortLabel: '30m' },
  ];

  const currentOption = intervalOptions.find(opt => opt.value === selectedInterval);

  const handleIntervalChange = (minutes: number) => {
    setSelectedInterval(minutes);
    // If currently enabled, restart with new interval
    if (isEnabled) {
      setIsEnabled(false);
      setTimeout(() => setIsEnabled(true), 100);
    }
  };

  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Auto Refresh Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                className="data-[state=checked]:bg-green-600"
              />
              <Timer className={`h-4 w-4 ${isEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isEnabled ? 'Disable' : 'Enable'} auto refresh</p>
          </TooltipContent>
        </Tooltip>

        {/* Countdown Timer */}
        {isEnabled && (
          <Badge variant="outline" className="flex items-center gap-1 font-mono text-xs">
            <Clock className="h-3 w-3" />
            {timeRemainingFormatted}
          </Badge>
        )}

        {/* Interval Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Settings className="h-4 w-4" />
              <span className="ml-1 text-xs">
                {currentOption?.shortLabel}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Refresh Interval
            </div>
            {intervalOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleIntervalChange(option.value)}
                className={selectedInterval === option.value ? 'bg-accent' : ''}
              >
                <Timer className="h-4 w-4 mr-2" />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Manual Refresh */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh now</p>
          </TooltipContent>
        </Tooltip>

        {/* Last Refresh Info */}
        {lastRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground">
                {lastRefresh.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Last refreshed: {lastRefresh.toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}