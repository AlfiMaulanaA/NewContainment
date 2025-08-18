// lib/api/auth.ts - Authentication API methods
import { apiClient } from './client';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  VerifyResetCredentialsRequest,
  VerifyResetCredentialsResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserInfo
} from './types';

// Get auth token from localStorage
function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("authToken") || "";
}

// Auth API methods
export const authApi = {
  async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const data = await apiClient.post<LoginResponse>("/auth/login", request);

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Login failed",
      };
    }
  },

  async register(
    request: RegisterRequest
  ): Promise<ApiResponse<LoginResponse>> {
    try {
      const data = await apiClient.post<LoginResponse>("/auth/register", request);

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  },

  async logout(): Promise<ApiResponse> {
    try {
      await apiClient.post("/auth/logout");

      // Remove token from localStorage
      localStorage.removeItem("authToken");

      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error: any) {
      // Even if API call fails, clear local token
      localStorage.removeItem("authToken");

      return {
        success: false,
        message: error.message || "Logout failed",
      };
    }
  },

  async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    try {
      const data = await apiClient.get<UserInfo>("/auth/me");

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to get current user",
      };
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  // Validate current token by calling /auth/me endpoint
  async validateToken(): Promise<boolean> {
    try {
      await apiClient.get("/auth/me");
      return true;
    } catch {
      return false;
    }
  },

  // Verify credentials for password reset
  async verifyResetCredentials(
    request: VerifyResetCredentialsRequest
  ): Promise<ApiResponse<VerifyResetCredentialsResponse>> {
    try {
      const data = await apiClient.post<VerifyResetCredentialsResponse>(
        "/auth/verify-reset-credentials",
        request
      );

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to verify credentials",
      };
    }
  },

  // Reset password
  async resetPassword(
    request: ResetPasswordRequest
  ): Promise<ApiResponse<ResetPasswordResponse>> {
    try {
      const data = await apiClient.post<ResetPasswordResponse>(
        "/auth/reset-password",
        request
      );

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to reset password",
      };
    }
  },
};
