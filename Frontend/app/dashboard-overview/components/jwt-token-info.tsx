"use client";

import { useState, useEffect } from 'react';
import { getCurrentUserFromToken, getTokenTimeRemaining, isTokenExpiringSoon } from '@/lib/auth-utils';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface TokenInfoProps {
  showInHeader?: boolean;
  compact?: boolean;
}

export default function JwtTokenInfo({ showInHeader = false, compact = false }: TokenInfoProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpiring, setIsExpiring] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const { refreshUser, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateTokenInfo = () => {
      const currentUser = getCurrentUserFromToken();
      if (!currentUser) {
        setTimeRemaining(0);
        setIsExpiring(false);
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setTimeRemaining(0);
        setIsExpiring(false);
        return;
      }

      const remaining = getTokenTimeRemaining(token);
      const expiringSoon = isTokenExpiringSoon(token, 30); // 30 minutes warning

      setTimeRemaining(remaining);
      setIsExpiring(expiringSoon);
    };

    // Update immediately
    updateTokenInfo();

    // Update every minute
    const interval = setInterval(updateTokenInfo, 60000);

    return () => clearInterval(interval);
  }, [mounted]);

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) return 'Expired';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleRefreshToken = () => {
    refreshUser();
    // In a real application, you might want to implement token refresh here
    // For now, we'll just refresh the user context
  };

  const getStatusColor = () => {
    if (timeRemaining <= 0) return 'bg-red-500';
    if (isExpiring) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (timeRemaining <= 0) return <AlertTriangle className="w-3 h-3" />;
    if (isExpiring) return <Clock className="w-3 h-3" />;
    return <CheckCircle className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (timeRemaining <= 0) return 'Session Expired';
    if (isExpiring) return 'Expiring Soon';
    return 'Active';
  };

  if (!mounted || timeRemaining <= 0) {
    return null;
  }

  if (compact || showInHeader) {
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`flex items-center gap-1 text-xs ${
            isExpiring ? 'border-yellow-300 text-yellow-700' : 'border-green-300 text-green-700'
          }`}
        >
          {getStatusIcon()}
          {formatTimeRemaining(timeRemaining)}
        </Badge>
        {isExpiring && timeRemaining > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshToken}
            className="h-6 px-2 text-xs"
          >
            Extend
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${
      isExpiring ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <div>
            <div className="font-medium text-sm">Session Status</div>
            <div className="text-xs text-gray-600">{getStatusText()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-medium">
            {formatTimeRemaining(timeRemaining)}
          </div>
          <div className="text-xs text-gray-500">remaining</div>
        </div>
      </div>
      
      {isExpiring && timeRemaining > 0 && (
        <div className="mt-3 pt-3 border-t border-yellow-200">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-yellow-700">
              Your session will expire soon
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshToken}
                className="text-xs h-7"
              >
                Extend Session
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={logout}
                className="text-xs h-7"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}