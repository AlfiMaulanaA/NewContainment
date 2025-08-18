"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  User,
  Clock,
  Activity,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
} from "lucide-react";

interface UserActivity {
  id: number;
  username: string;
  email: string;
  isOnline: boolean;
  lastLogin: string;
  lastActivity: string;
  sessionDuration?: string;
  ipAddress?: string;
}

interface UserActivityWidgetProps {
  compact?: boolean;
}

export default function UserActivityWidget({ compact = false }: UserActivityWidgetProps) {
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);

  // Mock data - replace with actual API call
  const loadUserActivities = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API call
      // const response = await userActivityApi.getActiveUsers();
      
      // Mock data for demonstration
      const mockData: UserActivity[] = [
        {
          id: 1,
          username: "admin",
          email: "admin@containment.com",
          isOnline: true,
          lastLogin: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
          lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
          sessionDuration: "2h 15m",
          ipAddress: "192.168.1.100"
        },
        {
          id: 2,
          username: "operator1",
          email: "operator1@containment.com",
          isOnline: true,
          lastLogin: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
          lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          sessionDuration: "45m",
          ipAddress: "192.168.1.101"
        },
        {
          id: 3,
          username: "supervisor",
          email: "supervisor@containment.com",
          isOnline: false,
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          ipAddress: "192.168.1.102"
        },
        {
          id: 4,
          username: "technician",
          email: "tech@containment.com",
          isOnline: false,
          lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          ipAddress: "192.168.1.103"
        }
      ];

      setUserActivities(mockData);
      setOnlineCount(mockData.filter(user => user.isOnline).length);
    } catch (error) {
      console.error('Failed to load user activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserActivities();

    // Refresh every 30 seconds
    const interval = setInterval(loadUserActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (compact) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Active Users</p>
                <p className="text-xs text-muted-foreground">Currently online</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{onlineCount}</p>
              <p className="text-xs text-muted-foreground">of {userActivities.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" />
            User Activity Monitor
            <Badge variant="outline" className="ml-2">
              {onlineCount} Online
            </Badge>
          </CardTitle>
          
          <Button
            onClick={loadUserActivities}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : userActivities.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {userActivities.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.isOnline ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <User className={`h-5 w-5 ${
                      user.isOnline ? 'text-green-600' : 'text-gray-500'
                    }`} />
                  </div>
                  {user.isOnline && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{user.username}</span>
                    {user.isOnline ? (
                      <UserCheck className="h-3 w-3 text-green-500" />
                    ) : (
                      <UserX className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last login: {formatTimeAgo(user.lastLogin)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>Last activity: {formatTimeAgo(user.lastActivity)}</span>
                    </div>
                    {user.isOnline && user.sessionDuration && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>Session: {user.sessionDuration}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant={user.isOnline ? "default" : "secondary"} className="text-xs mb-1">
                    {user.isOnline ? "Online" : "Offline"}
                  </Badge>
                  {user.ipAddress && (
                    <div className="text-xs text-muted-foreground">
                      {user.ipAddress}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No user activity data available</p>
            <p className="text-sm">User login information will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}