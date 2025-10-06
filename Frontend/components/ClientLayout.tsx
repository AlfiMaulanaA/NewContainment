// components/ClientLayout.tsx
"use client";

import React, { Suspense, lazy } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { SessionTimeoutWarning } from "@/components/session-timeout-warning";
import { BackendStatusAlert } from "@/components/backend-status-alert";

// Lazy load heavy providers - only load when needed
const DeveloperModeProvider = lazy(() => import("@/contexts/DeveloperModeContext").then(module => ({ default: module.DeveloperModeProvider })));
const SafeGlobalAttendanceProvider = lazy(() => import("@/providers/SafeGlobalAttendanceProvider").then(module => ({ default: module.SafeGlobalAttendanceProvider })));

// import { useRoutePreloader } from "@/hooks/useRoutePreloader";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Memeriksa apakah path saat ini dimulai dengan "/auth/"
  // Ini lebih robust terhadap trailing slashes atau sub-path
  const hideSidebar = pathname.startsWith("/auth/");

  // For auth pages, render minimal layout without RouteGuard to prevent conflicts
  if (hideSidebar) {
    return (
      <AuthProvider>
        <div className="min-h-screen">
          {children}
        </div>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    );
  }

  // For protected pages, use full layout with sidebar
  return (
    <AuthProvider>
      {/* <RouteGuard> */}
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-background via-muted to-muted/80 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted/20 rounded-2xl mb-6 animate-pulse-3d">
              <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
            </div>
            <p className="text-muted-foreground">Preparing your workspace...</p>
          </div>
        </div>
      }>
        <DeveloperModeProvider>
          <SafeGlobalAttendanceProvider>
            <SidebarProvider>
              <AppSidebar />
              <main className="flex-1 overflow-auto">{children}</main>
              <Toaster richColors position="top-right" />
              <SessionTimeoutWarning />
              <BackendStatusAlert autoHideDelay={3000} />
            </SidebarProvider>
          </SafeGlobalAttendanceProvider>
        </DeveloperModeProvider>
      </Suspense>
      {/* </RouteGuard> */}
    </AuthProvider>
  );
}
