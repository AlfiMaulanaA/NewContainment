// hooks/useAuth.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCurrentUserFromToken, CurrentUser } from '@/lib/auth-utils';
import { authApi } from '@/lib/api-service';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(() => {
    try {
      const currentUser = getCurrentUserFromToken();
      setUser(currentUser);
      setIsLoading(false);
      
      // Only redirect to login if we're sure there's no valid token AND we're not already on auth pages
      if (!currentUser && typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const authToken = localStorage.getItem('authToken');
        
        // Give a small delay before redirecting to avoid race conditions
        setTimeout(() => {
          // Double-check conditions after delay
          const recheckUser = getCurrentUserFromToken();
          const recheckToken = localStorage.getItem('authToken');
          const currentPathname = window.location.pathname;
          
          // Only redirect if:
          // 1. Still no valid user after recheck
          // 2. Still no token after recheck
          // 3. We're not on an auth page
          if (!recheckUser && !recheckToken && !currentPathname.startsWith('/auth/')) {
            console.log('No auth token found after recheck, redirecting to login');
            router.replace('/auth/login');
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error in refreshUser:', error);
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear all authentication data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
      setUser(null);
      // Use replace to prevent back button issues
      router.replace('/auth/login');
    }
  }, [router]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await authApi.login({ email, password });
      if (result.success) {
        // Small delay to ensure token is stored, then refresh user
        setTimeout(() => {
          refreshUser();
        }, 50);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, [refreshUser]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    // Set up periodic token validation every 5 minutes
    const tokenCheckInterval = setInterval(() => {
      const currentUser = getCurrentUserFromToken();
      if (!currentUser && user) {
        // Token expired, auto logout
        logout();
      } else if (currentUser && !user) {
        // Token became valid, refresh user
        setUser(currentUser);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(tokenCheckInterval);
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}