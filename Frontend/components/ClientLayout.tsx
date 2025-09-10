// components/ClientLayout.tsx
"use client";

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { SessionTimeoutWarning } from "@/components/session-timeout-warning";
import { BackendStatusAlert } from "@/components/backend-status-alert";
import { DeveloperModeProvider } from "@/contexts/DeveloperModeContext";
import { GlobalAttendanceProvider } from "@/providers/GlobalAttendanceProvider";
// import { useRoutePreloader } from "@/hooks/useRoutePreloader";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Memeriksa apakah path saat ini dimulai dengan "/auth/login" atau "/auth/register"
  // Ini lebih robust terhadap trailing slashes atau sub-path
  const hideSidebar = pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register") || pathname.startsWith("/auth/forgot-password");

  return (
    <AuthProvider>
      <DeveloperModeProvider>
        <GlobalAttendanceProvider showDebugLogs={process.env.NODE_ENV === 'development'}>
          <SidebarProvider>
            {/* Sidebar hanya ditampilkan jika hideSidebar adalah false */}
            {!hideSidebar && <AppSidebar />}
            <main className="flex-1 overflow-auto">{children}</main>
            {/* Session timeout warning */}
            <SessionTimeoutWarning />
            {/* Backend status alert - only show when not on auth pages */}
            {!hideSidebar && <BackendStatusAlert showWhenOnline={true} />}
            {/* Toaster untuk sonner notifications */}
            <Toaster richColors position="top-right" />
          </SidebarProvider>
        </GlobalAttendanceProvider>
      </DeveloperModeProvider>
    </AuthProvider>
  );
}