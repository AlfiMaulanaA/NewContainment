// components/ClientLayout.tsx
"use client";

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { SessionTimeoutWarning } from "@/components/session-timeout-warning";
import { BackendStatusAlert } from "@/components/backend-status-alert";
import { DeveloperModeProvider } from "@/contexts/DeveloperModeContext";
import { SafeGlobalAttendanceProvider } from "@/providers/SafeGlobalAttendanceProvider";
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
      {/* </RouteGuard> */}
    </AuthProvider>
  );
}
