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
  LayoutDashboard,
  Wifi,
  Server,
  Settings,
  LogOut,
  Network,
  FileWarning,
  ShieldAlert,
  HardDriveUpload,
  InfoIcon,
  Mail,
  User2,
  School,
  Users,
  AlertTriangle,
  BarChart3,
  Gamepad2,
  FileSpreadsheet,
  Computer,
  Wrench,
  Camera,
  Monitor,
  Activity,
  Shield,
  UserCheck,
  Code,
  Unlock,
  SlidersHorizontalIcon,
  Database,
  Eye,
  FileText,
  Cog,
  ChevronDown,
  ChevronRight,
  Video,
  DoorClosedLocked,
  FileLock,
  MessageCircleMore,
  Thermometer,
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
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { deleteCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LogoutConfirmation } from "@/components/logout-confirmation";
import { Badge } from "@/components/ui/badge";

interface NavigationItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  requireRole?: string[];
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

const appName =
  process.env.NEXT_PUBLIC_APP_NAME || "IOT Containment Monitoring";

const avatarIcon =
  process.env.NEXT_PUBLIC_APP_AVATAR_URL || "/images/avatar-user.png";

const navigation: NavigationGroup[] = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Overview",
        url: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Control Panel",
        url: "/control/containment",
        icon: SlidersHorizontalIcon,
      },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      {
        title: "Users",
        url: "/management/users",
        icon: Users,
      },
      {
        title: "User Activity",
        url: "/management/user-activity",
        icon: Activity,
      },
      {
        title: "Containments",
        url: "/management/containments",
        icon: Server,
      },
      {
        title: "Racks",
        url: "/management/racks",
        icon: Computer,
      },
      {
        title: "Devices",
        url: "/management/devices",
        icon: Database,
      },
      {
        title: "Sensors",
        url: "/management/sensors",
        icon: Thermometer,
      },
      {
        title: "Maintenance",
        url: "/management/maintenance",
        icon: Wrench,
      },
      {
        title: "WhatsApp",
        url: "/management/whatsapp",
        icon: MessageCircleMore,
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        title: "Camera Setup",
        url: "/management/camera",
        icon: Video,
      },
      {
        title: "Access Control",
        url: "/access-control",
        icon: FileLock,
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        title: "Sensor Data",
        url: "/reports/sensor-data",
        icon: BarChart3,
      },
      {
        title: "Access Logs",
        url: "/reports/access-log",
        icon: DoorClosedLocked,
      },
      {
        title: "Emergency Logs",
        url: "/reports/emergency",
        icon: AlertTriangle,
      },
      {
        title: "Maintenance Reports",
        url: "/reports/maintenance",
        icon: FileText,
      },
    ],
  },
  {
    title: "Security & Access",
    items: [
      {
        title: "Access Overview",
        url: "/access-control",
        icon: Shield,
      },
      {
        title: "Access Devices",
        url: "/access-control/devices",
        icon: ShieldAlert,
      },
      {
        title: "Access Users",
        url: "/access-control/users",
        icon: UserCheck,
      },
      {
        title: "Live Access Monitor",
        url: "/access-control/monitoring",
        icon: Eye,
      },
      {
        title: "User Management",
        url: "/management/users",
        icon: Users,
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        title: "Network Settings",
        url: "/network",
        icon: Network,
      },
      {
        title: "MQTT Config",
        url: "/mqtt",
        icon: Wifi,
      },
      {
        title: "System Settings",
        url: "/settings/setting",
        icon: Cog,
      },
      {
        title: "System Info",
        url: "/info",
        icon: InfoIcon,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isDeveloperMode, getFormattedRemainingTime } = useDeveloperMode();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string>(avatarIcon);
  const [isScrollVisible, setIsScrollVisible] = useState(false);
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  // Get user photo URL
  const getUserPhotoUrl = (user: any) => {
    if (user?.photoPath && user.photoPath !== "/images/avatar-user.png") {
      const { apiBaseUrl } = getAppConfig();
      return `${apiBaseUrl}${user.photoPath}`;
    }
    return avatarIcon;
  };

  // Fetch user photo
  const fetchUserPhoto = async (userId: number) => {
    try {
      const { apiBaseUrl } = getAppConfig();
      const result = await userProfileApi.getUserProfile(userId);

      if (result.success && result.data) {
        const photoUrl =
          result.data.photoPath && result.data.photoPath !== "/images/avatar-user.png"
            ? `${apiBaseUrl}${result.data.photoPath}`
            : avatarIcon;
        setUserPhotoUrl(photoUrl);
      } else {
        setUserPhotoUrl(avatarIcon);
      }
    } catch (error) {
      console.error("Error fetching user photo:", error);
      setUserPhotoUrl(avatarIcon);
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

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

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
      // Even if API fails, still logout locally
      deleteCookie("authToken", { path: "/" });
      router.replace("/auth/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4 bg-background">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center border-gray-400 justify-center rounded-lg bg-primary text-primary-foreground">
            {/* Replaced Atom icon with an <img> tag */}
            <img
              src="/images/gspe.jpg"
              alt="GSPE Logo"
              className="h-full w-full object-cover rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              GSPE
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
        {navigation.map((group) => {
          // Hide Security & Access group items if Developer Mode is not enabled for access control
          if (group.title === "Security & Access" && !isDeveloperMode) {
            // Filter out access control items if developer mode is not enabled
            const filteredItems = group.items.filter(
              (item) => !item.url.includes("/access-control")
            );
            if (filteredItems.length === 0) {
              return null;
            }
            // Return group with filtered items
            group = { ...group, items: filteredItems };
          }

          // Check if user has access to Security features
          if (group.title === "Security & Access" && currentUser) {
            const userRole = getRoleDisplayName(currentUser.role);
            const hasAccess = userRole === "Admin" || userRole === "Developer";
            if (!hasAccess) {
              return null;
            }
          }

          return (
            <SidebarGroup key={group.title} className="sidebar-group-animate">
              <SidebarGroupLabel className="text-sidebar-foreground/80 flex items-center justify-between group cursor-pointer hover:text-sidebar-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <span>{group.title}</span>
                  {group.title === "Security & Access" && isDeveloperMode && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      <Code className="h-3 w-3 mr-1" />
                      Dev
                    </Badge>
                  )}
                  {group.title === "Security & Access" && currentUser && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleDisplayName(currentUser.role)}
                    </Badge>
                  )}
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    // Check individual item role requirements
                    if (item.requireRole && currentUser) {
                      const userRole = getRoleDisplayName(currentUser.role);
                      if (!item.requireRole.includes(userRole)) {
                        return null;
                      }
                    }

                    return (
                      <SidebarMenuItem
                        key={item.title}
                        className="sidebar-menu-item"
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                          className="group flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm hover:scale-[1.01] data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-md data-[active=true]:scale-[1.01] data-[active=true]:border-l-3 data-[active=true]:border-primary sidebar-focus-ring"
                        >
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4 text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground group-hover:scale-110 transition-all duration-200" />
                            <span className="truncate">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

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
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/developer"}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm hover:scale-[1.01] data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-md data-[active=true]:scale-[1.01] data-[active=true]:border-l-3 data-[active=true]:border-primary sidebar-focus-ring"
                    >
                      <Link href="/developer">
                        <Code className="h-4 w-4 text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground group-hover:scale-110 transition-all duration-200" />
                        <span className="truncate">Developer Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
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

        <SidebarFooter className="p-4 bg-background border-t border-sidebar-border">
          {/* JWT Token Information */}
          {/* <div className="mb-4">
            <JwtTokenInfo compact={true} />
          </div> */}

          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-3 mb-4 px-1 cursor-pointer hover:bg-muted rounded-md p-1 transition hover:shadow-sm">
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-sidebar-border">
                  <img
                    src={userPhotoUrl}
                    alt="User Avatar"
                    className="object-cover h-full w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = avatarIcon;
                    }}
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
                  <img
                    src={userPhotoUrl}
                    alt="User Avatar"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = avatarIcon;
                    }}
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
      </SidebarContent>
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
