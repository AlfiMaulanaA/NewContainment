"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export interface PageHeaderProps {
  /**
   * Main icon for the page (from lucide-react)
   */
  icon?: LucideIcon;
  
  /**
   * Main title of the page
   */
  title: string;
  
  /**
   * Optional subtitle or additional context
   */
  subtitle?: string;
  
  /**
   * Show back button with custom path
   */
  backButton?: {
    href: string;
    label?: string;
  };
  
  /**
   * Action buttons to display on the right side
   */
  actions?: React.ReactNode;
  
  /**
   * Additional className for the header
   */
  className?: string;
  
  /**
   * Custom children to replace the default left side content
   */
  children?: React.ReactNode;
}

/**
 * Reusable Page Header Component
 * 
 * Provides a consistent header layout across all pages with:
 * - Sidebar trigger
 * - Optional back button
 * - Icon and title
 * - Optional subtitle
 * - Action buttons on the right
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <PageHeader 
 *   icon={HardDrive} 
 *   title="Device Management" 
 *   actions={<Button>Add Device</Button>}
 * />
 * 
 * // With subtitle and back button
 * <PageHeader 
 *   icon={HardDrive} 
 *   title="Device Management"
 *   subtitle="Rack A1 - Main Containment"
 *   backButton={{ href: "/management/racks", label: "Back to Racks" }}
 *   actions={<Button>Add Device</Button>}
 * />
 * 
 * // Multiple actions
 * <PageHeader 
 *   icon={Users} 
 *   title="User Management"
 *   actions={
 *     <div className="flex items-center gap-2">
 *       <Button variant="outline">Import</Button>
 *       <Button>Add User</Button>
 *     </div>
 *   }
 * />
 * ```
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  backButton,
  actions,
  className = "",
  children,
}: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on an auth page where sidebar is not available
  const isAuthPage = pathname.startsWith("/auth/");

  const handleBackClick = () => {
    if (backButton?.href) {
      router.push(backButton.href);
    }
  };

  return (
    <header className={`flex h-16 items-center justify-between border-b px-4 ${className}`}>
      <div className="flex items-center gap-2">
        {children ? (
          children
        ) : (
          <>
            {/* Only show SidebarTrigger if not on auth page */}
            {!isAuthPage && (
              <>
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
              </>
            )}

            {/* Back button */}
            {backButton && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackClick}
                  className="mr-2"
                  title={backButton.label || "Go back"}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {backButton.label && <span className="hidden sm:inline">{backButton.label}</span>}
                </Button>
                <Separator orientation="vertical" className="mr-2 h-4" />
              </>
            )}

            {/* Icon */}
            {Icon && <Icon className="h-5 w-5" />}

            {/* Title and subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <h1 className="text-lg font-semibold">{title}</h1>
              {subtitle && (
                <span className="text-sm font-normal text-muted-foreground">
                  {subtitle}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

// Export types for external use
export type { PageHeaderProps };