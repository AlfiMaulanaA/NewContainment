"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { DeviceActivityStatus } from '@/lib/api-service';
import { Wifi, WifiOff, AlertTriangle, Clock, Activity } from 'lucide-react';

interface DeviceStatusBadgeProps {
  status?: DeviceActivityStatus;
  deviceId?: number;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function DeviceStatusBadge({ 
  status, 
  deviceId,
  showIcon = true,
  showTooltip = true,
  size = 'default',
  className = ''
}: DeviceStatusBadgeProps) {
  if (!status) {
    return (
      <Badge 
        variant="outline" 
        className={`text-gray-500 bg-gray-50 border-gray-200 ${className}`}
      >
        {showIcon && <AlertTriangle className="h-3 w-3 mr-1" />}
        Unknown
      </Badge>
    );
  }

  const getStatusConfig = () => {
    switch (status.status.toLowerCase()) {
      case 'online':
        return {
          variant: 'default' as const,
          className: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
          icon: <Wifi className="h-3 w-3" />,
          text: 'Online',
          color: '🟢'
        };
      case 'offline':
        return {
          variant: 'destructive' as const,
          className: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100',
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline',
          color: '🔴'
        };
      case 'unknown':
      default:
        return {
          variant: 'outline' as const,
          className: 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100',
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Unknown',
          color: '🟡'
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const badgeContent = (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && (
        <span className="mr-1">
          {config.icon}
        </span>
      )}
      {config.text}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  const lastSeenDate = new Date(status.lastSeen);
  const lastStatusChangeDate = new Date(status.lastStatusChange);
  const now = new Date();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span className="font-medium">Device Status</span>
            </div>
            
            <div>Status: <span className="font-medium">{config.color} {status.status}</span></div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last seen: {formatDistanceToNow(lastSeenDate, { addSuffix: true })}
            </div>
            
            {status.topic && (
              <div>Topic: <span className="font-mono text-xs">{status.topic}</span></div>
            )}
            
            <div>Status changed: {formatDistanceToNow(lastStatusChangeDate, { addSuffix: true })}</div>
            
            {status.consecutiveFailures > 0 && (
              <div className="text-red-600">
                Consecutive failures: {status.consecutiveFailures}
              </div>
            )}
            
            {status.lastMessage && (
              <div className="pt-1 border-t border-gray-200">
                <div className="text-gray-600">Last message:</div>
                <div className="font-mono text-xs bg-gray-100 p-1 rounded mt-1 max-w-48 truncate">
                  {status.lastMessage}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Simplified version for inline use
interface InlineDeviceStatusProps {
  status?: DeviceActivityStatus;
  showText?: boolean;
}

export function InlineDeviceStatus({ status, showText = true }: InlineDeviceStatusProps) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 text-gray-500">
        <AlertTriangle className="h-3 w-3" />
        {showText && <span className="text-xs">Unknown</span>}
      </span>
    );
  }

  const getConfig = () => {
    switch (status.status.toLowerCase()) {
      case 'online':
        return {
          icon: <Wifi className="h-3 w-3 text-green-500" />,
          text: 'Online',
          textClass: 'text-green-600'
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-3 w-3 text-red-500" />,
          text: 'Offline',
          textClass: 'text-red-600'
        };
      default:
        return {
          icon: <AlertTriangle className="h-3 w-3 text-gray-500" />,
          text: 'Unknown',
          textClass: 'text-gray-600'
        };
    }
  };

  const config = getConfig();

  return (
    <span className="inline-flex items-center gap-1">
      {config.icon}
      {showText && (
        <span className={`text-xs ${config.textClass}`}>
          {config.text}
        </span>
      )}
    </span>
  );
}