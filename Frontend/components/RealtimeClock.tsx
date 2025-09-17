"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock } from 'lucide-react';

interface RealtimeClockProps {
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function RealtimeClock({
  showRefreshButton = true,
  onRefresh,
  className = ""
}: RealtimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Realtime Clock */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm">
          <div className="font-mono font-semibold text-muted-foreground">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {formatDate(currentTime)}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      {showRefreshButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-8 px-3"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      )}
    </div>
  );
}