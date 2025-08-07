// components/session-timeout-warning.tsx
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isTokenExpiringSoon, getTokenTimeRemaining } from '@/lib/auth-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function SessionTimeoutWarning() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!user) return;

    const checkTokenExpiration = () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const expiringSoon = isTokenExpiringSoon(token, 10); // Warn 10 minutes before expiry
      const remaining = getTokenTimeRemaining(token);

      setTimeRemaining(remaining);

      if (expiringSoon && remaining > 0) {
        setShowWarning(prev => {
          if (!prev) {
            toast.warning(`Session expires in ${remaining} minutes`, {
              duration: 5000,
            });
            return true;
          }
          return prev;
        });
      }

      if (remaining <= 0) {
        // Token expired, force logout
        logout();
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, logout]);

  const handleExtendSession = () => {
    setShowWarning(false);
    // You could implement a token refresh API call here
    toast.success('Session awareness acknowledged');
  };

  const handleLogout = () => {
    setShowWarning(false);
    logout();
  };

  if (!user || !showWarning) return null;

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in approximately {timeRemaining} minutes due to inactivity.
            Your work will be lost if you don't take action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>
            Logout Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession}>
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}