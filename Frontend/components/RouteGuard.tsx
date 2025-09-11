"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const authCheck = () => {
      // Public routes
      const publicRoutes = [
        "/auth/login",
        "/auth/register",
        "/auth/forgot-password",
      ];
      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
      );

      // Wait for auth hook to finish loading
      if (isLoading) {
        return;
      }

      // console.log('RouteGuard - Auth check:', { user: !!user, isPublicRoute, pathname, isLoading });

      // IMPORTANT: Let middleware handle redirects to avoid conflicts
      // RouteGuard should only handle client-side state, not navigation

      if (!user && !isPublicRoute) {
        // Don't redirect here - middleware will handle it
        console.log("RouteGuard: User not authenticated for protected route");
        setIsChecking(false);
        return;
      }

      if (user && isPublicRoute) {
        // Only redirect away from auth pages if user is authenticated
        // TEMPORARILY DISABLED TO TEST REDIRECT LOOPS
        // console.log('RouteGuard: User authenticated, redirecting to dashboard');
        // router.replace('/dashboard-overview');
        // return;
      }

      // All checks passed
      setIsChecking(false);
    };

    authCheck();
  }, [user, isLoading, pathname, router]);

  // Show loading spinner while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
