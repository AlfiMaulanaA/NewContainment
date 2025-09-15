"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    // Reset redirect flag when pathname changes
    setHasRedirected(false);
    setLoadingTimeout(false);
  }, [pathname]);

  // Set timeout for showing refresh button
  useEffect(() => {
    if (isLoading || isChecking) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // Show refresh button after 5 seconds

      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading, isChecking]);

  const handleRefresh = () => {
    setLoadingTimeout(false);
    setIsChecking(true);
    setHasRedirected(false);
    window.location.reload();
  };

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

      if (!user) {
        // Prevent infinite redirect loops
        if (!hasRedirected && pathname !== "/auth/login") {
          console.log(
            "RouteGuard: User not authenticated for protected route, redirecting"
          );
          setHasRedirected(true);
          // router.replace("/auth/login");
        } else {
          setIsChecking(false);
        }
        return;
      }

      if (user && isPublicRoute) {
        // Only redirect away from auth pages if user is authenticated
        console.log("RouteGuard: User authenticated, redirecting to dashboard");
        router.replace("/dashboard-overview");
        return;
      }

      // All checks passed
      setIsChecking(false);
    };

    authCheck();
  }, [user, isLoading, pathname, router]);

  // Show loading spinner while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading authentication...</p>

        {loadingTimeout && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <p className="text-sm text-muted-foreground">Taking longer than expected?</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
