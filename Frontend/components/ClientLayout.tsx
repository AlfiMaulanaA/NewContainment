// components/ClientLayout.tsx
"use client";

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { SessionTimeoutWarning } from "@/components/session-timeout-warning";
// import { useRoutePreloader } from "@/hooks/useRoutePreloader";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Memeriksa apakah path saat ini dimulai dengan "/auth/login" atau "/auth/register"
  // Ini lebih robust terhadap trailing slashes atau sub-path
  const hideSidebar = pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register");

  // Temporarily disabled route preloader to isolate syntax error
  // useRoutePreloader({
  //   routes: [
  //     '/',
  //     '/management/containments',
  //     '/management/racks',
  //     '/management/devices',
  //     '/settings/setting',
  //     '/network',
  //     '/mqtt',
  //     '/reports/emergency',
  //     '/reports/maintenance',
  //   ],
  //   preloadDelay: 1500,
  // });

  return (
    <AuthProvider>
      <SidebarProvider>
        {/* Sidebar hanya ditampilkan jika hideSidebar adalah false */}
        {!hideSidebar && <AppSidebar />}
        <main className="flex-1 overflow-auto">{children}</main>
        {/* Session timeout warning */}
        <SessionTimeoutWarning />
        {/* Toaster untuk sonner notifications */}
        <Toaster richColors position="top-right" />
      </SidebarProvider>
    </AuthProvider>
  );
}