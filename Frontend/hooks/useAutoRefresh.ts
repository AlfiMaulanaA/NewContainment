import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onRefresh?: () => void;
}

export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
  const {
    enabled = false,
    interval = 5 * 60 * 1000, // 5 minutes default
    onRefresh
  } = options;

  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Update next refresh time when enabled state changes
  useEffect(() => {
    if (isEnabled) {
      const next = new Date(Date.now() + interval);
      setNextRefresh(next);
    } else {
      setNextRefresh(null);
      setTimeRemaining(0);
    }
  }, [isEnabled, interval]);

  // Update countdown timer
  useEffect(() => {
    if (!isEnabled || !nextRefresh) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, nextRefresh.getTime() - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [isEnabled, nextRefresh]);

  // Main auto refresh effect
  useEffect(() => {
    if (!isEnabled) return;

    const refreshInterval = setInterval(() => {
      const now = new Date();
      setLastRefresh(now);

      if (onRefresh) {
        onRefresh();
      } else {
        // Default behavior: refresh current page
        router.refresh();
      }

      // Set next refresh time
      const next = new Date(Date.now() + interval);
      setNextRefresh(next);
    }, interval);

    return () => clearInterval(refreshInterval);
  }, [isEnabled, interval, onRefresh, router]);

  // Format time remaining for display
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return '0:00';

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    isEnabled,
    setIsEnabled,
    lastRefresh,
    nextRefresh,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    intervalMinutes: Math.floor(interval / (1000 * 60)),
  };
}