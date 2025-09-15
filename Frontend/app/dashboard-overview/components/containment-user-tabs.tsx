"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usersApi, User } from "@/lib/api-service";
import { toast } from "sonner";
import ThemeAvatar from "@/components/theme-avatar";
import { getAppConfig } from "@/lib/config";

const MAX_USERS_DISPLAY = 3;

export default function ContainmentUserTabs() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const displayedUsers = users.slice(0, MAX_USERS_DISPLAY);
  
  const { apiBaseUrl } = getAppConfig();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await usersApi.getUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        toast.error(result.message || "Failed to load users");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="p-4">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedUsers.length > 0 ? (
                displayedUsers.map((user) => (
                  <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center space-y-3">
                      <div
                        className={`relative w-16 h-16 rounded-full overflow-hidden border-2 ${
                          user.isActive
                            ? "border-green-500"
                            : "border-red-500"
                        }`}
                      >
                        <ThemeAvatar
                          user={user}
                          baseUrl={apiBaseUrl}
                          className="w-full h-full object-cover"
                          alt={user.name}
                          width={64}
                          height={64}
                        />
                      </div>
                      <div className="text-center space-y-1">
                        <h3 className="font-semibold text-sm text-foreground truncate max-w-full">
                          {user.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate max-w-full">
                          {user.email}
                        </p>
                        <div className="flex items-center justify-center">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              user.isActive ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="ml-2 text-xs text-muted-foreground">
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-sm text-muted-foreground">No users found.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
