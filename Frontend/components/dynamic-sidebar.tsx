"use client";

import { useDeveloperMode } from "@/contexts/DeveloperModeContext";
import { DeveloperModeDialog } from "@/components/developer-mode-dialog";
import JwtTokenInfo from "@/components/jwt-token-info";
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
  Unlock,
  Code,
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
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { deleteCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LogoutConfirmation } from "@/components/logout-confirmation";
import { Badge } from "@/components/ui/badge";
import ThemeAvatar from "@/components/theme-avatar";
import { useDynamicMenu } from "@/hooks/useDynamicMenu";

// Icon mapping for dynamic menu
const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard: require("lucide-react").LayoutDashboard,
  SlidersHorizontalIcon: require("lucide-react").SlidersHorizontal,
  Users: require("lucide-react").Users,
  Activity: require("lucide-react").Activity,
  Server: require("lucide-react").Server,
  Computer: require("lucide-react").Computer,
  Database: require("lucide-react").Database,
  Thermometer: require("lucide-react").Thermometer,
  Wrench: require("lucide-react").Wrench,
  MessageCircleMore: require("lucide-react").MessageCircleMore,
  Video: require("lucide-react").Video,
  FileLock: require("lucide-react").FileLock,
  BarChart3: require("lucide-react").BarChart3,
  DoorClosedLocked: require("lucide-react").DoorClosed,
  AlertTriangle: require("lucide-react").AlertTriangle,
  FileText: require("lucide-react").FileText,
  Shield: require("lucide-react").Shield,
  ShieldAlert: require("lucide-react").ShieldAlert,
  UserCheck: require("lucide-react").UserCheck,
  Eye: require("lucide-react").Eye,
  Network: require("lucide-react").Network,
  Wifi: require("lucide-react").Wifi,
  Cog: require("lucide-react").Cog,
  InfoIcon: require("lucide-react").Info,
  Menu: require("lucide-react").Menu,
  // Add more icons as needed
};

const appName =
  process.env.NEXT_PUBLIC_APP_NAME || "IOT Containment Monitoring";
export function DynamicSidebar() {
  const pathname = usePathname();
  const { isDeveloperMode, getFormattedRemainingTime, isDynamicMenuLoading } =
    useDeveloperMode();
  const { menuData, isLoading: menuLoading, refreshMenu } = useDynamicMenu();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isScrollVisible, setIsScrollVisible] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const { apiBaseUrl } = getAppConfig();

  // Fetch user photo data to populate user object for ThemeAvatar component
  const fetchUserPhoto = async (userId: number) => {
    try {
      const result = await userProfileApi.getUserProfile(userId);

      if (result.success && result.data) {
        // Update currentUser with photo data for ThemeAvatar component
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

    // Setup scroll visibility detection
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

  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true);
  };

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

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName];
    return IconComponent || iconMap.Menu; // Fallback to Menu icon
  };

  if (menuLoading || isDynamicMenuLoading) {
    return (
      <Sidebar>
        <SidebarContent className="bg-background">
          <div className="flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">
                {isDynamicMenuLoading ? "Updating menu..." : "Loading menu..."}
              </span>
            </div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4 bg-background">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
            <Container className="h-6 w-6" />
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

      <SidebarContent
        ref={sidebarContentRef}
        className={`bg-background overflow-y-auto sidebar-content-transition ${
          isScrollVisible ? "sidebar-scroll-visible" : "sidebar-scroll-hidden"
        }`}
      >
        {/* Dynamic Menu Groups */}
        {menuData?.menuGroups.map((group) => (
          <SidebarGroup key={group.id} className="sidebar-group-animate">
            <SidebarGroupLabel className="text-sidebar-foreground/80 flex items-center justify-between group cursor-pointer hover:text-sidebar-foreground transition-colors">
              <div className="flex items-center gap-2">
                <span>{group.title}</span>
                {group.requiresDeveloperMode && isDeveloperMode && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    <Code className="h-3 w-3 mr-1" />
                    Dev
                  </Badge>
                )}
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const IconComponent = getIcon(item.icon);
                  return (
                    <SidebarMenuItem
                      key={item.id}
                      className="sidebar-menu-item"
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm hover:scale-[1.01] data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-md data-[active=true]:scale-[1.01] data-[active=true]:border-l-3 data-[active=true]:border-primary sidebar-focus-ring"
                      >
                        <Link href={item.url}>
                          <IconComponent className="h-4 w-4 text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground group-hover:scale-110 transition-all duration-200" />
                          <span className="truncate">{item.title}</span>
                          {item.badgeText && (
                            <Badge
                              variant={item.badgeVariant as any}
                              className="ml-auto text-xs"
                            >
                              {item.badgeText}
                            </Badge>
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

        {/* Developer Mode Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80">
            Developer Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {isDeveloperMode ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-md bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 text-green-700">
                        <Unlock className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Developer Mode
                        </span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Active • {getFormattedRemainingTime()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <DeveloperModeDialog>
                    <SidebarMenuButton className="w-full hover:bg-orange-50 hover:text-orange-700">
                      <Code className="h-4 w-4" />
                      <span>Enable Developer Mode</span>
                    </SidebarMenuButton>
                  </DeveloperModeDialog>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-background border-t border-sidebar-border">
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center gap-3 mb-4 px-1 cursor-pointer hover:bg-muted rounded-md p-1 transition hover:shadow-sm">
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
                    {menuData?.userRole.displayName ||
                      getRoleDisplayName(currentUser?.role)}
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
                  className={
                    menuData?.userRole.color || getRoleColor(currentUser?.role)
                  }
                >
                  {menuData?.userRole.displayName ||
                    getRoleDisplayName(currentUser?.role)}
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
                  {menuData?.userRole.displayName ||
                    getRoleDisplayName(currentUser?.role)}
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

      <SidebarRail />

      <LogoutConfirmation
        isOpen={showLogoutConfirmation}
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={handleLogoutConfirm}
      />
    </Sidebar>
  );
}
