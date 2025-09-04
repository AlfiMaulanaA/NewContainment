"use client";

import { Mail, User2, Users, Moon, Sun, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { getCurrentUserFromToken, getRoleDisplayName } from "@/lib/auth-utils";
import JwtTokenInfo from "@/components/jwt-token-info";
import { userProfileApi } from "@/lib/api-service";
import { getAppConfig } from "@/lib/config";
import Link from "next/link";
import ThemeAvatar from "@/components/theme-avatar";

export default function ContainmentInfoTabs() {
  const { theme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch user photo from API
  const fetchUserPhoto = async (userId: number) => {
    try {
      const result = await userProfileApi.getUserProfile(userId);
      if (result.success && result.data) {
        setCurrentUser((prev: any) => ({
          ...prev,
          photoPath: result.data?.photoPath
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
  }, []);

  return (
    <div className="p-2">
      <Card className="relative w-full rounded-xl">
        <CardHeader className="text-start pr-40">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-green-500 dark:text-green-400" />
            <span className="text-2xl font-bold text-foreground">
              User Logged In
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 p-6">
          {/* User Avatar Section */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-emerald-400 shadow-md">
              <ThemeAvatar
                user={currentUser}
                baseUrl={getAppConfig().apiBaseUrl}
                className="object-cover"
                alt="User Avatar"
                width={80}
                height={80}
              />
            </div>
          </div>
          {/* User Details Section */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
            {/* Name and Role */}
            <div className="flex items-center gap-2 flex-wrap">
              <User2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-lg font-semibold">
                {currentUser?.name || "N/A"}
              </span>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                {getRoleDisplayName(currentUser?.role) || "N/A"}
              </span>
            </div>
            {/* Email */}
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-sm text-muted-foreground">
                {currentUser?.email || "N/A"}
              </span>
            </div>
          </div>
        </CardContent>

        <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
          {/* Tombol Tema */}
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 px-4 py-2"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <>
                <Moon className="h-5 w-5" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="h-5 w-5" />
                <span>Light Mode</span>
              </>
            )}
          </Button>

          {/* Info JWT Token */}
          <JwtTokenInfo />
        </div>
      </Card>
    </div>
  );
}
