"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  X,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackendStatusAlertProps {
  className?: string;
  showWhenOnline?: boolean;
  autoHideDelay?: number; // in milliseconds
}

export function BackendStatusAlert({ 
  className,
  showWhenOnline = false,
  autoHideDelay = 5000
}: BackendStatusAlertProps) {
  const { isOnline, lastChecked, responseTime, error, manualCheck } = useBackendStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [isManuallyDismissed, setIsManuallyDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Show alert when backend goes offline
    if (!isOnline && !isManuallyDismissed) {
      setIsVisible(true);
    }
    
    // Show alert briefly when backend comes back online
    if (isOnline && showWhenOnline && !isManuallyDismissed) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }

    // Reset manual dismiss when status changes
    if (isOnline && isManuallyDismissed) {
      setIsManuallyDismissed(false);
    }
  }, [isOnline, showWhenOnline, autoHideDelay, isManuallyDismissed]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await manualCheck();
    } finally {
      setIsChecking(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsManuallyDismissed(true);
  };

  if (!isVisible) return null;

  const formatLastChecked = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  const formatResponseTime = (time: number | null) => {
    if (time === null) return 'N/A';
    return `${time}ms`;
  };

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-80 max-w-sm",
      "animate-in slide-in-from-right-full duration-300",
      className
    )}>
      <Alert className={cn(
        "border shadow-lg",
        isOnline 
          ? "border-green-200 bg-green-50 text-green-800" 
          : "border-red-200 bg-red-50 text-red-800"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 flex-1">
            {isOnline ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
                  {isOnline ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Backend Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Backend Offline
                    </>
                  )}
                </Badge>
              </div>
              <AlertDescription className="text-xs text-gray-600">
                {isOnline ? (
                  <div>
                    <div>Backend connection restored</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Response: {formatResponseTime(responseTime)} • Last checked: {formatLastChecked(lastChecked)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">{error || 'Backend server is not responding'}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Last checked: {formatLastChecked(lastChecked)}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={cn(
                "h-3 w-3",
                isChecking && "animate-spin"
              )} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}

export default BackendStatusAlert;