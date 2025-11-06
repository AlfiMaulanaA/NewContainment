"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTokenInfo, TokenInfo } from "@/lib/auth-utils";
import { useAuth } from "@/hooks/useAuth";
import JwtTokenInfo from "@/components/jwt-token-info";
import {
  Clock,
  User,
  Shield,
  RefreshCw,
  LogOut,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";
import { getEffectiveRoleDisplayName, getRoleColor } from "@/lib/auth-utils";

export function SessionInfo() {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const { refreshUser, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateTokenInfo = () => {
      const info = getTokenInfo(30); // 30 minutes warning threshold
      setTokenInfo(info);
    };

    // Update immediately
    updateTokenInfo();

    // Update every 5 minutes to reduce rebuild frequency
    const interval = setInterval(updateTokenInfo, 300000);

    return () => clearInterval(interval);
  }, [mounted]);

  const formatDateTime = (date: Date | null): string => {
    if (!date) return "N/A";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes <= 0) return "Expired";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ${mins} minute${
        mins !== 1 ? "s" : ""
      }`;
    }
    return `${mins} minute${mins !== 1 ? "s" : ""}`;
  };

  const getStatusBadge = (info: TokenInfo) => {
    if (info.isExpired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expired
        </Badge>
      );
    }
    if (info.isExpiringSoon) {
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-yellow-300 text-yellow-700"
        >
          <AlertTriangle className="w-3 h-3" />
          Expiring Soon
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 border-green-300 text-green-700"
      >
        <CheckCircle className="w-3 h-3" />
        Active
      </Badge>
    );
  };

  if (!mounted || !tokenInfo) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Session Information...</CardTitle>
            <CardDescription>Please wait while we fetch your session details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Session Status
            </span>
            {getStatusBadge(tokenInfo)}
          </CardTitle>
          <CardDescription>
            Current authentication session information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JwtTokenInfo />
        </CardContent>
      </Card>

      {/* Detailed Token Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">
                Time Remaining
              </span>
              <span className="font-mono font-medium">
                {formatDuration(tokenInfo.remainingMinutes)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">
                Issued At
              </span>
              <span className="font-mono text-sm">
                {formatDateTime(tokenInfo.issuedDate)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">
                Expires At
              </span>
              <span className="font-mono text-sm">
                {formatDateTime(tokenInfo.expiryDate)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenInfo.user ? (
              <>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Name
                  </span>
                  <span className="font-medium">{tokenInfo.user.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Email
                  </span>
                  <span className="font-mono text-sm">
                    {tokenInfo.user.email}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Role
                  </span>
                  <Badge 
                    variant="secondary"
                    className={getRoleColor(tokenInfo.user.role, tokenInfo.user)}
                  >
                    {getEffectiveRoleDisplayName(tokenInfo.user)}
                  </Badge>
                </div>
                {tokenInfo.user.databaseRole && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">
                      Role Level
                    </span>
                    <span className="font-mono text-sm">
                      {tokenInfo.user.roleLevel}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">
                    User ID
                  </span>
                  <span className="font-mono text-sm">
                    {tokenInfo.user.id}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2" />
                No user information available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Session Actions</CardTitle>
          <CardDescription>
            Manage your current authentication session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={refreshUser}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Session
            </Button>

            <Button
              variant="outline"
              onClick={logout}
              className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Your session will automatically expire after 24 hours of
              inactivity.
            </p>
            <p>
              For security reasons, you'll be logged out automatically when
              your session expires.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      {tokenInfo.isExpiringSoon && !tokenInfo.isExpired && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              Session Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-4">
              Your session will expire in{" "}
              {formatDuration(tokenInfo.remainingMinutes)}. Please save any
              unsaved work and refresh your session or log in again.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={refreshUser}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Extend Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
