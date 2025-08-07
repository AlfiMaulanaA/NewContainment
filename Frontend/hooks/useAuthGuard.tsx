// hooks/useAuthGuard.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import { getCurrentUserFromToken } from '@/lib/auth-utils';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requiredRole?: string;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { redirectTo = '/auth/login', requiredRole } = options;
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Check if user is authenticated
    const currentUser = getCurrentUserFromToken();
    
    if (!currentUser) {
      // No valid token, redirect to login
      router.replace(redirectTo);
      return;
    }

    // Check role requirement if specified
    if (requiredRole && currentUser.role.toLowerCase() !== requiredRole.toLowerCase()) {
      // User doesn't have required role, redirect to unauthorized page or dashboard
      router.replace('/');
      return;
    }

    setIsAuthorized(true);
  }, [user, isLoading, redirectTo, requiredRole, router]);

  return {
    isAuthorized,
    isLoading,
    user
  };
}

// HOC for protecting pages
export function withAuthGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: UseAuthGuardOptions = {}
) {
  return function AuthGuardedComponent(props: P) {
    const { isAuthorized, isLoading } = useAuthGuard(options);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthorized) {
      return null; // Component will be redirected by useAuthGuard
    }

    return <WrappedComponent {...props} />;
  };
}