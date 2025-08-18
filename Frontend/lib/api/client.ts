// lib/api/client.ts - Shared HTTP client
import { getAppConfig } from "@/lib/config";

const config = getAppConfig();
const BASE_URL = config.apiBaseUrl;

// Get auth token from localStorage
function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("authToken") || "";
}

// Shared HTTP client with auth support
export class ApiClient {
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/api${endpoint}`, {
      ...options,
      headers,
    });

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      this.clearAuthToken();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/auth/")
      ) {
        this.redirectToLogin();
      }
      throw new Error("Session expired. Please login again.");
    }

    if (!response.ok) {
      let errorMessage = "Something went wrong";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.title || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  private clearAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      document.cookie =
        "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
  }

  private redirectToLogin(): void {
    if (typeof window !== "undefined") {
      window.location.replace("/auth/login");
    }
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Export shared client instance
export const apiClient = new ApiClient();