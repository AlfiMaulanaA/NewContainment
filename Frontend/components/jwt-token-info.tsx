"use client";

import { useState, useEffect } from "react";
import {
  getCurrentUserFromToken,
  getTokenTimeRemaining,
  isTokenExpiringSoon,
} from "@/lib/auth-utils";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface TokenInfoProps {
  showInHeader?: boolean;
  compact?: boolean;
}

export default function JwtTokenInfo({
  showInHeader = false,
  compact = false,
}: TokenInfoProps) {
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
        console.log('JWT Token Info (Global): No current user found');
        setTimeRemaining(0);
        setIsExpiring(false);
        return;
      }

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken")
          : null;
      if (!token) {
        console.log('JWT Token Info (Global): No token found in localStorage');
        setTimeRemaining(0);
        setIsExpiring(false);
        return;
      }

      const remaining = getTokenTimeRemaining(token);
      const expiringSoon = isTokenExpiringSoon(token, 30); // 30 minutes warning

      // Reduced logging frequency to prevent Fast Refresh rebuilds
      // Only log when token status changes significantly
      if (expiringSoon !== isExpiring || Math.abs(remaining - timeRemaining) > 5) {
        console.log('JWT Token Info (Global):', { remaining, expiringSoon, user: currentUser });
      }

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
    if (minutes <= 0) return "Expired";

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
    if (timeRemaining <= 0) return "bg-red-500 dark:bg-red-400";
    if (isExpiring) return "bg-yellow-500 dark:bg-yellow-400";
    return "bg-green-500 dark:bg-green-400";
  };

  const getStatusIcon = () => {
    if (timeRemaining <= 0) return <AlertTriangle className="w-3 h-3" />;
    if (isExpiring) return <Clock className="w-3 h-3" />;
    return <CheckCircle className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (timeRemaining <= 0) return "Session Expired";
    if (isExpiring) return "Expiring Soon";
    return "Active";
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  // Show a placeholder or message when token is not available
  if (timeRemaining <= 0) {
    return (
      <div className="p-2 rounded-lg border border-muted bg-muted/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            No session data available
          </span>
        </div>
      </div>
    );
  }

  if (compact || showInHeader) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`flex items-center gap-1 text-xs ${
            isExpiring
              ? "border-yellow-500/30 text-yellow-700 dark:border-yellow-400/30 dark:text-yellow-300 bg-yellow-500/5 dark:bg-yellow-400/5"
              : "border-green-500/30 text-green-700 dark:border-green-400/30 dark:text-green-300 bg-green-500/5 dark:bg-green-400/5"
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
    <div
      className={`p-4 rounded-lg border ${
        isExpiring
          ? "bg-yellow-500/5 dark:bg-yellow-400/5 border-yellow-500/20 dark:border-yellow-400/20"
          : "bg-green-500/5 dark:bg-green-400/5 border-green-500/20 dark:border-green-400/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <div>
            <div className="font-medium text-sm text-foreground">Session Status</div>
            <div className="text-xs text-muted-foreground">{getStatusText()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-medium text-foreground">
            {formatTimeRemaining(timeRemaining)}
          </div>
          <div className="text-xs text-muted-foreground">remaining</div>
        </div>
      </div>

      {isExpiring && timeRemaining > 0 && (
        <div className="mt-3 pt-3 border-t border-yellow-500/20 dark:border-yellow-400/20">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
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
