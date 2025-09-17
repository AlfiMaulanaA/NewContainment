"use client";

import React, { useEffect, useState, useRef } from "react";
import { useDynamicMenu } from "@/hooks/useDynamicMenu";
import { getIconComponent } from "@/lib/icon-mapping";
import {
  getCurrentUserFromToken,
  getRoleDisplayName,
  getRoleColor,
} from "@/lib/auth-utils";
import { authApi, userProfileApi } from "@/lib/api-service";
import { getAppConfig } from "@/lib/config";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  LogOut,
  Mail,
  User2,
  School,
  Shield,
  RefreshCw,
  AlertCircle,
  Home,
  Settings,
  BarChart3,
  Users,
  Container,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { deleteCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { LogoutConfirmation } from "@/components/logout-confirmation";
import { Badge } from "@/components/ui/badge";
import ThemeAvatar from "@/components/theme-avatar";

// Fallback menu structure
const fallbackMenu = {
  menuGroups: [
    {
      id: "main",
      title: "Main",
      items: [
        {
          id: "dashboard",
          title: "Dashboard",
          url: "/dashboard",
          icon: "Home",
        },
        {
          id: "dashboard-overview",
          title: "Overview",
          url: "/dashboard-overview",
          icon: "BarChart3",
        },
      ],
    },
    {
      id: "management",
      title: "Management",
      items: [
        {
          id: "control-containment",
          title: "Containment Control",
          url: "/control/containment",
          icon: "Settings",
        },
        {
          id: "management-users",
          title: "Users",
          url: "/management/users",
          icon: "Users",
        },
        {
          id: "configuration",
          title: "Configuration",
          url: "/configuration",
          icon: "Settings",
        },
      ],
    },
  ],
};

export function AppSidebar() {
  const pathname = usePathname();
  const {
    menuData,
    isLoading: menuLoading,
    error: menuError,
    refreshMenu,
    isRetrying: menuRetrying,
    retryCount: menuRetryCount,
  } = useDynamicMenu();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isScrollVisible, setIsScrollVisible] = useState(false);
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const { apiBaseUrl } = getAppConfig();

  // Enhanced function to check if menu item is active
  const isMenuItemActive = (itemUrl: string) => {
    // Exact match for root routes
    if (itemUrl === "/" && pathname === "/") return true;
    if (itemUrl === "/" && pathname !== "/") return false;

    // For non-root routes, check if pathname starts with itemUrl
    if (itemUrl !== "/" && pathname.startsWith(itemUrl)) {
      // Additional check to avoid false positives like "/user" matching "/users"
      const nextChar = pathname[itemUrl.length];
      return (
        nextChar === "/" ||
        nextChar === undefined ||
        nextChar === "?" ||
        nextChar === "#"
      );
    }

    return false;
  };

  const fetchUserPhoto = async (userId: number) => {
    try {
      const result = await userProfileApi.getUserProfile(userId);
      if (result.success && result.data) {
        setCurrentUser((prev: any) => ({
          ...prev,
          photoPath: result?.data?.photoPath,
        }));
      }
    } catch (error) {
      console.error("Error fetching user photo:", error);
    }
  };

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
    if (user?.id) {
      fetchUserPhoto(Number(user.id));
    }

    const handleMouseEnter = () => setIsScrollVisible(true);
    const handleMouseLeave = () => setIsScrollVisible(false);
    const contentElement = sidebarContentRef.current;
    if (contentElement) {
      contentElement.addEventListener("mouseenter", handleMouseEnter);
      contentElement.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        contentElement.removeEventListener("mouseenter", handleMouseEnter);
        contentElement.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, []);

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  // Handle menu retry
  const handleRetryMenu = async () => {
    if (menuRetrying || menuRetryCount >= 3) return;

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      await refreshMenu();
    } catch (error) {
      console.error("Menu retry failed:", error);
    }
  };

  const handleLogoutClick = () => setShowLogoutConfirmation(true);
  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
      deleteCookie("authToken", { path: "/" });
      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      deleteCookie("authToken", { path: "/" });
      router.replace("/auth/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (menuLoading) {
    return (
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border px-6 py-4 bg-background">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
              <Container className="h-6 w-6 text-dark" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">
                Containment
              </h1>
              <p className="text-xs text-sidebar-foreground/70">
                IOT Monitoring System
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground text-center">
            {menuRetrying
              ? `Retrying... (${menuRetryCount}/3)`
              : "Loading menu..."}
          </p>
          {menuRetrying && (
            <p className="text-xs text-orange-500 text-center">
              Reconnecting to server...
            </p>
          )}
        </SidebarContent>
      </Sidebar>
    );
  }

  // Enhanced error handling with retry and fallback
  if (menuError) {
    const shouldShowFallback = menuRetryCount >= 3;

    return (
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border px-6 py-4 bg-background">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary shadow-lg">
              <Container className="h-6 w-6 text-dark" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">
                Containment
              </h1>
              <p className="text-xs text-sidebar-foreground/70">
                IoT Monitoring System
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-4">
          {!shouldShowFallback ? (
            // Error state with retry option
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Failed to load menu
                </p>
                <p className="text-xs text-muted-foreground">
                  {menuRetryCount > 0
                    ? `Attempt ${menuRetryCount}/3 failed`
                    : "Unable to connect to server"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryMenu}
                disabled={menuRetrying || menuRetryCount >= 3}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${menuRetrying ? "animate-spin" : ""}`}
                />
                {menuRetrying
                  ? "Retrying..."
                  : menuRetryCount >= 3
                  ? "Max retries reached"
                  : "Retry"}
              </Button>
              {menuRetryCount >= 2 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    // Use fallback menu directly
                    window.location.reload();
                  }}
                  className="text-xs"
                >
                  Use basic menu instead
                </Button>
              )}
            </div>
          ) : (
            // Fallback menu
            <div>
              <div className="flex items-center gap-2 p-2 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Using basic menu (limited features)
                </p>
              </div>

              {fallbackMenu.menuGroups.map((group) => (
                <SidebarGroup key={group.id} className="mb-6">
                  <SidebarGroupLabel className="text-sidebar-foreground/80 mb-2">
                    {group.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const IconComponent = getIconComponent(item.icon);
                        const isActive = isMenuItemActive(item.url);
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={`w-full ${
                                isActive ? "sidebar-menu-active" : ""
                              }`}
                            >
                              <Link
                                href={item.url}
                                className="flex items-center gap-3"
                              >
                                {IconComponent && (
                                  <IconComponent
                                    className={`sidebar-icon h-4 w-4 transition-colors ${
                                      isActive
                                        ? ""
                                        : "text-sidebar-foreground/60"
                                    }`}
                                  />
                                )}
                                <span
                                  className={`sidebar-text transition-colors ${
                                    isActive ? "" : ""
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </div>
          )}
        </SidebarContent>

        {/* Footer tetap ada walaupun error */}
        <SidebarFooter className="p-4 bg-background border-t border-sidebar-border">
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-3 px-1 cursor-pointer hover:bg-muted rounded-md p-1 transition hover:shadow-sm">
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-sidebar-border">
                  <ThemeAvatar
                    user={currentUser}
                    baseUrl={apiBaseUrl}
                    className="object-cover"
                    alt="User Avatar"
                    width={40}
                    height={40}
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-sm text-sidebar-foreground truncate">
                    {currentUser?.name || "Loading..."}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-sidebar-foreground/70">
                      {getRoleDisplayName(currentUser?.role)}
                    </span>
                  </div>
                </div>
              </div>
            </DialogTrigger>

            <DialogContent className="max-w-md animate-in fade-in zoom-in-75 bg-background p-6 rounded-xl shadow-xl border">
              <DialogHeader>
                <DialogTitle className="text-center text-lg font-bold text-foreground">
                  User Profile
                </DialogTitle>
                <DialogDescription className="text-center text-muted-foreground">
                  Your account information
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center mt-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-md mb-2">
                  <ThemeAvatar
                    user={currentUser}
                    baseUrl={apiBaseUrl}
                    className="object-cover"
                    alt="User Avatar"
                    width={96}
                    height={96}
                  />
                </div>
                <h3 className="text-lg font-semibold">
                  {currentUser?.name || ""}
                </h3>
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    className={`text-xs ${getRoleColor(currentUser?.role)}`}
                  >
                    {getRoleDisplayName(currentUser?.role)}
                  </Badge>
                  <p className="text-sm text-muted-foreground italic">
                    IOT Containment System User
                  </p>
                </div>
              </div>

              <Separator />

              <div className="mt-2 space-y-3 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>
                    <span className="font-medium text-foreground">Email:</span>{" "}
                    {currentUser?.email || "user@example.com"}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <User2 className="w-4 h-4 text-primary" />
                  <span>
                    <span className="font-medium text-foreground">Role:</span>{" "}
                    {getRoleDisplayName(currentUser?.role)}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <User2 className="w-4 h-4 text-primary" />
                  <span>
                    <span className="font-medium text-foreground">
                      User ID:
                    </span>{" "}
                    #{currentUser?.id || "N/A"}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <School className="w-4 h-4 text-primary" />
                  <span>
                    <span className="font-medium text-foreground">System:</span>{" "}
                    IOT Containment Monitoring
                  </span>
                </p>
              </div>

              <Separator className="mt-4" />

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="destructive"
                  className="hover:scale-105 transition"
                  onClick={handleLogoutClick}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Logging out...
                    </span>
                  ) : (
                    "Logout"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Separator className="my-2 bg-sidebar-border h-px" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="flex items-center gap-2 text-destructive bg-destructive/5 hover:bg-destructive/20 hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 transition-colors px-3 py-3 rounded-md w-full border border-transparent hover:border-destructive/40"
                asChild
              >
                <span
                  onClick={handleLogoutClick}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <LogoutConfirmation
          isOpen={showLogoutConfirmation}
          onClose={() => setShowLogoutConfirmation(false)}
          onConfirm={handleLogoutConfirm}
        />
      </Sidebar>
    );
  }

  // Use dynamic menu data or fallback
  const effectiveMenuData = menuData || fallbackMenu;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4 bg-background">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center border-gray-400 justify-center rounded-lg bg-primary text-primary-foreground">
            <Container className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              Containment
            </h1>
            <p className="text-xs text-sidebar-foreground/70">
              Containment System
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent
        ref={sidebarContentRef}
        className={`bg-background overflow-y-auto sidebar-content-transition ${
          isScrollVisible ? "sidebar-scroll-visible" : "sidebar-scroll-hidden"
        }`}
      >
        {effectiveMenuData?.menuGroups.map((group: any) => (
          <SidebarGroup
            key={group.id || group.title}
            className="sidebar-group-animate"
          >
            <SidebarGroupLabel className="text-sidebar-foreground/80 flex items-center justify-between group cursor-pointer hover:text-sidebar-foreground transition-colors">
              <span>{group.title}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item: any) => {
                  const IconComponent = getIconComponent(item.icon);
                  const isActive = isMenuItemActive(item.url);

                  return (
                    <SidebarMenuItem
                      key={item.id || item.title}
                      className="sidebar-menu-item"
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md ${
                          isActive ? "sidebar-menu-active" : ""
                        }`}
                      >
                        <Link href={item.url}>
                          {IconComponent && (
                            <IconComponent
                              className={`sidebar-icon h-4 w-4 transition-all duration-200 ${
                                isActive
                                  ? ""
                                  : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground group-hover:scale-110"
                              }`}
                            />
                          )}
                          <span
                            className={`sidebar-text truncate transition-all duration-200 ${
                              isActive ? "" : ""
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.badgeText && (
                            <SidebarMenuBadge
                              className={`ml-auto text-xs transition-colors ${
                                item.badgeVariant === "destructive"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {item.badgeText}
                            </SidebarMenuBadge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 bg-background border-t border-sidebar-border">
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center gap-3 px-1 cursor-pointer hover:bg-muted rounded-md p-1 transition hover:shadow-sm">
              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-sidebar-border">
                <ThemeAvatar
                  user={currentUser}
                  baseUrl={apiBaseUrl}
                  className="object-cover"
                  alt="User Avatar"
                  width={40}
                  height={40}
                />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-semibold text-sm text-sidebar-foreground truncate">
                  {currentUser?.name || "Loading..."}{" "}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-sidebar-foreground/70">
                    {getRoleDisplayName(currentUser?.role)}
                  </span>
                </div>
              </div>
            </div>
          </DialogTrigger>

          <DialogContent className="max-w-md animate-in fade-in zoom-in-75 bg-background p-6 rounded-xl shadow-xl border">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold text-foreground">
                User Profile
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                Your account information
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center mt-2">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-md mb-2">
                <ThemeAvatar
                  user={currentUser}
                  baseUrl={apiBaseUrl}
                  className="object-cover"
                  alt="User Avatar"
                  width={96}
                  height={96}
                />
              </div>
              <h3 className="text-lg font-semibold">
                {currentUser?.name || ""}
              </h3>
              <div className="flex items-center gap-2 mb-4">
                <Badge className={`text-xs ${getRoleColor(currentUser?.role)}`}>
                  {getRoleDisplayName(currentUser?.role)}
                </Badge>
                <p className="text-sm text-muted-foreground italic">
                  IOT Containment System User
                </p>
              </div>
            </div>

            <Separator />

            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>
                  <span className="font-medium text-foreground">Email:</span>{" "}
                  {currentUser?.email || "user@example.com"}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <User2 className="w-4 h-4 text-primary" />
                <span>
                  <span className="font-medium text-foreground">Role:</span>{" "}
                  {getRoleDisplayName(currentUser?.role)}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <User2 className="w-4 h-4 text-primary" />
                <span>
                  <span className="font-medium text-foreground">User ID:</span>{" "}
                  #{currentUser?.id || "N/A"}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <School className="w-4 h-4 text-primary" />
                <span>
                  <span className="font-medium text-foreground">System:</span>{" "}
                  IOT Containment Monitoring
                </span>
              </p>
            </div>

            <Separator className="mt-4" />

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="destructive"
                className="hover:scale-105 transition"
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Logging out...
                  </span>
                ) : (
                  "Logout"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Separator className="my-2 bg-sidebar-border h-px" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="flex items-center gap-2
  text-destructive bg-destructive/5 hover:bg-destructive/20 hover:text-destructive-foreground
  focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2
  transition-colors px-3 py-3 rounded-md w-full border border-transparent hover:border-destructive/40
  dark:hover:border-white/40 dark:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
              asChild
            >
              <span
                onClick={handleLogoutClick}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <br />
      <LogoutConfirmation
        isOpen={showLogoutConfirmation}
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={handleLogoutConfirm}
      />
    </Sidebar>
  );
}
