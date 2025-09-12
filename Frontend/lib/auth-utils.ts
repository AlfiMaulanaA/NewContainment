// lib/auth-utils.ts

// Debug configuration
interface AuthDebugConfig {
  enabled: boolean;
  prefix: string;
}

// Global debug configuration - set this to false in production
const DEBUG_CONFIG: AuthDebugConfig = {
  enabled: process.env.NODE_ENV === "development", // Auto-disable in production
  prefix: "🔒 AUTH:",
};

// Helper function for debug logging
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_CONFIG.enabled) {
    console.log(`${DEBUG_CONFIG.prefix} ${message}`, ...args);
  }
}

// Function to enable/disable auth debugging at runtime
export function setAuthDebug(enabled: boolean) {
  DEBUG_CONFIG.enabled = enabled;
  debugLog(`Debug ${enabled ? "ENABLED" : "DISABLED"}`);
}

// Function to get current debug status
export function isAuthDebugEnabled(): boolean {
  return DEBUG_CONFIG.enabled;
}

export interface DecodedToken {
  nameid: string;
  unique_name: string;
  email: string;
  role: string;
  UserId: string;
  RoleLevel?: string;
  DatabaseRoleId?: string;
  DatabaseRoleName?: string;
  DatabaseRoleDisplayName?: string;
  RoleColor?: string;
  nbf: number;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLevel: number;
  databaseRole?: {
    id: number;
    name: string;
    displayName: string;
    color: string;
  };
  isAuthenticated: boolean;
}

// JWT decode function (without external libraries)
export function decodeJWT(token: string): DecodedToken | null {
  try {
    // Split the token into parts
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (middle part)
    const payload = parts[1];

    // Add padding if needed for base64 decoding
    const paddedPayload = payload + "===".slice((payload.length + 3) % 4);

    // Decode base64
    const decodedPayload = atob(
      paddedPayload.replace(/-/g, "+").replace(/_/g, "/")
    );

    // Parse JSON
    return JSON.parse(decodedPayload) as DecodedToken;
  } catch (error) {
    debugLog("Error decoding JWT:", error);
    return null;
  }
}

// Check if token is expired (with 5 minute buffer for safety)
export function isTokenExpired(
  token: string,
  bufferMinutes: number = 5
): boolean {
  const decodedToken = decodeJWT(token);
  if (!decodedToken) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  const bufferTime = bufferMinutes * 60; // Convert minutes to seconds

  return decodedToken.exp < currentTime + bufferTime;
}

// Check if token will expire soon (within specified minutes)
export function isTokenExpiringSoon(
  token: string,
  withinMinutes: number = 10
): boolean {
  const decodedToken = decodeJWT(token);
  if (!decodedToken) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  const withinTime = withinMinutes * 60; // Convert minutes to seconds

  return decodedToken.exp < currentTime + withinTime;
}

// Get token time remaining in minutes
export function getTokenTimeRemaining(token: string): number {
  const decodedToken = decodeJWT(token);
  if (!decodedToken) return 0;

  const currentTime = Math.floor(Date.now() / 1000);
  const remainingSeconds = decodedToken.exp - currentTime;

  return Math.max(0, Math.floor(remainingSeconds / 60));
}

// Get token time remaining in seconds
export function getTokenTimeRemainingInSeconds(token: string): number {
  const decodedToken = decodeJWT(token);
  if (!decodedToken) return 0;

  const currentTime = Math.floor(Date.now() / 1000);
  const remainingSeconds = decodedToken.exp - currentTime;

  return Math.max(0, remainingSeconds);
}

// Get token expiry date
export function getTokenExpiryDate(token: string): Date | null {
  const decodedToken = decodeJWT(token);
  if (!decodedToken) return null;

  return new Date(decodedToken.exp * 1000);
}

// Get token issued date
export function getTokenIssuedDate(token: string): Date | null {
  const decodedToken = decodeJWT(token);
  if (!decodedToken) return null;

  return new Date(decodedToken.iat * 1000);
}

// Get detailed token information
export interface TokenInfo {
  isValid: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  remainingMinutes: number;
  remainingSeconds: number;
  expiryDate: Date | null;
  issuedDate: Date | null;
  user: CurrentUser | null;
}

export function getTokenInfo(withinMinutes: number = 10): TokenInfo {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  if (!token) {
    return {
      isValid: false,
      isExpired: true,
      isExpiringSoon: true,
      remainingMinutes: 0,
      remainingSeconds: 0,
      expiryDate: null,
      issuedDate: null,
      user: null,
    };
  }

  const decodedToken = decodeJWT(token);
  if (!decodedToken) {
    return {
      isValid: false,
      isExpired: true,
      isExpiringSoon: true,
      remainingMinutes: 0,
      remainingSeconds: 0,
      expiryDate: null,
      issuedDate: null,
      user: null,
    };
  }

  const expired = isTokenExpired(token);
  const expiringSoon = isTokenExpiringSoon(token, withinMinutes);
  const remainingMinutes = getTokenTimeRemaining(token);
  const remainingSeconds = getTokenTimeRemainingInSeconds(token);
  const expiryDate = getTokenExpiryDate(token);
  const issuedDate = getTokenIssuedDate(token);
  const user = getCurrentUserFromToken();

  return {
    isValid: !expired,
    isExpired: expired,
    isExpiringSoon: expiringSoon,
    remainingMinutes,
    remainingSeconds,
    expiryDate,
    issuedDate,
    user,
  };
}

// Get current user from token
export function getCurrentUserFromToken(): CurrentUser | null {
  try {
    // Check localStorage first, then cookies
    let token = null;
    if (typeof window !== "undefined") {
      token = localStorage.getItem("authToken");
      debugLog("Token from localStorage:", token ? "EXISTS" : "NULL");

      // Fallback to cookies if localStorage is empty
      if (!token) {
        const cookies = document.cookie.split(";");
        debugLog("Checking cookies:", document.cookie);
        const authCookie = cookies.find((cookie) =>
          cookie.trim().startsWith("authToken=")
        );
        if (authCookie) {
          token = authCookie.split("=")[1];
          debugLog("Token from cookies:", token ? "EXISTS" : "NULL");
        }
      }
    }

    if (!token) {
      debugLog("No token found");
      return null;
    }

    // Check if token is expired (without buffer for initial check)
    const expired = isTokenExpired(token, 0);
    debugLog("Token expired?", expired);

    if (expired) {
      debugLog("Token is expired, clearing localStorage");
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
      }
      return null;
    }

    const decodedToken = decodeJWT(token);
    if (!decodedToken) return null;

    const user: CurrentUser = {
      id: decodedToken.UserId || decodedToken.nameid,
      name: decodedToken.unique_name,
      email: decodedToken.email,
      role: decodedToken.role,
      roleLevel: decodedToken.RoleLevel
        ? parseInt(decodedToken.RoleLevel)
        : getRoleLevelFromName(decodedToken.role),
      isAuthenticated: true,
    };

    // Add database role information if available
    if (decodedToken.DatabaseRoleId && decodedToken.DatabaseRoleName) {
      user.databaseRole = {
        id: parseInt(decodedToken.DatabaseRoleId),
        name: decodedToken.DatabaseRoleName,
        displayName:
          decodedToken.DatabaseRoleDisplayName || decodedToken.DatabaseRoleName,
        color:
          decodedToken.RoleColor || getRoleColor(decodedToken.DatabaseRoleName),
      };
    }

    return user;
  } catch (error) {
    debugLog("Error getting current user:", error);
    return null;
  }
}

// Get role level from role name (for backward compatibility)
export function getRoleLevelFromName(roleName?: string | null): number {
  if (!roleName) return 1;

  switch (roleName.toLowerCase()) {
    case "user":
      return 1;
    case "admin":
      return 2;
    case "developer":
      return 3;
    default:
      return 1;
  }
}

// Get role display name
export function getRoleDisplayName(role?: string | null): string {
  if (!role) return "User";

  switch (role.toLowerCase()) {
    case "admin":
      return "Administrator";
    case "developer":
      return "Developer";
    case "user":
      return "User";
    default:
      return role;
  }
}

// Get role color (with database role support)
export function getRoleColor(
  role?: string | null,
  user?: CurrentUser | null
): string {
  // Use database role color if available
  if (user?.databaseRole?.color) {
    return user.databaseRole.color;
  }

  // Fallback to enum-based colors
  if (!role) return "text-green-600 bg-green-100";

  switch (role.toLowerCase()) {
    case "admin":
      return "text-red-600 bg-red-100";
    case "developer":
      return "text-blue-600 bg-blue-100";
    case "user":
      return "text-green-600 bg-green-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

// Get effective role display name (database role takes precedence)
export function getEffectiveRoleDisplayName(user?: CurrentUser | null): string {
  if (user?.databaseRole?.displayName) {
    return user.databaseRole.displayName;
  }
  return getRoleDisplayName(user?.role);
}
