// hooks/useAuth.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { getCurrentUserFromToken, CurrentUser } from "@/lib/auth-utils";
import { authApi } from "@/lib/api-service";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(() => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken")
          : null;
      // console.log('🔍 RefreshUser: Token from localStorage:', token ? 'EXISTS' : 'NULL');

      const currentUser = getCurrentUserFromToken();

      setUser(currentUser);
      setIsLoading(false);
    } catch (error) {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if API call fails
    } finally {
      // Clear all authentication data
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
      }
      setUser(null);
      // Use replace to prevent back button issues
      router.replace("/auth/login");
    }
  }, [router]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const result = await authApi.login({ email, password });
        if (result.success) {
          // Immediately refresh user data after successful login
          refreshUser();
          return true;
        }
        return false;
      } catch (error) {
        console.error("Login error:", error);
        return false;
      }
    },
    [refreshUser]
  );

  useEffect(() => {
    // Only refresh user once on mount - remove refreshUser dependency to prevent loops
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only on mount

  useEffect(() => {
    // Set up periodic token validation every 10 minutes (reduced frequency)
    const tokenCheckInterval = setInterval(() => {
      try {
        const currentUser = getCurrentUserFromToken();
        if (!currentUser && user) {
          // Token expired, auto logout
          console.log("Token expired, logging out");
          logout();
        }
      } catch (error) {
        console.error("Token check error:", error);
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => clearInterval(tokenCheckInterval);
  }, [user, logout]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
