//Api Endpoint

// lib/api-service.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5218";

// Types based on backend models and responses
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  photoPath?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
}

export enum UserRole {
  User = 1,
  Admin = 2,
  Developer = 3
}

export enum ContainmentType {
  HotAisleContainment = 1,
  ColdAisleContainment = 2
}

export enum MaintenanceTarget {
  Device = 1,
  Rack = 2,
  Containment = 3
}

export enum CctvStreamType {
  Live = 1,
  Recording = 2,
  Snapshot = 3
}

export enum CctvStreamProtocol {
  RTSP = 1,
  HTTP = 2,
  HTTPS = 3,
  WebRTC = 4,
  HLS = 5,
  MJPEG = 6
}

export enum CctvResolution {
  QVGA = 1,      // 320x240
  VGA = 2,       // 640x480
  HD720p = 3,    // 1280x720
  HD1080p = 4,   // 1920x1080
  UHD4K = 5      // 3840x2160
}

export enum CctvStatus {
  Offline = 0,
  Online = 1,
  Error = 2,
  Maintenance = 3
}

export interface Containment {
  id: number;
  name: string;
  type: ContainmentType;
  description?: string;
  location: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  createdBy: number;
  updatedBy?: number;
}

export interface Rack {
  id: number;
  name: string;
  containmentId: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  createdBy: number;
  updatedBy?: number;
  containment?: Containment;
  devices?: Device[];
}

export interface Device {
  id: number;
  name: string;
  type: string;
  rackId: number;
  description?: string;
  serialNumber?: string;
  status?: string;
  topic?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  createdBy: number;
  updatedBy?: number;
  rack?: Rack;
}

export interface ContainmentStatus {
  id: number;
  containmentId: number;
  lightingStatus: boolean;
  emergencyStatus: boolean;
  smokeDetectorStatus: boolean;
  fssStatus: boolean;
  emergencyButtonState: boolean;
  selenoidStatus: boolean;
  limitSwitchFrontDoorStatus: boolean;
  limitSwitchBackDoorStatus: boolean;
  openFrontDoorStatus: boolean;
  openBackDoorStatus: boolean;
  emergencyTemp: boolean;
  mqttTimestamp: string;
  createdAt: string;
  updatedAt: string;
  rawPayload?: string;
  containment?: Containment;
}

export interface ContainmentControl {
  id: number;
  containmentId: number;
  command: string;
  description: string;
  executedAt: string;
  executedBy: number;
  status: string;
  errorMessage?: string;
  containment?: Containment;
}

export interface ContainmentControlRequest {
  containmentId: number;
  command: number;
  description?: string;
}

export interface ContainmentControlResponse {
  success: boolean;
  message: string;
  data?: ContainmentControl;
}

export interface EmergencyReport {
  id: number;
  emergencyType: string;
  status: boolean;
  startTime: string;
  endTime?: string;
  duration?: string;
  isActive: boolean;
  notes?: string;
  rawMqttPayload?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyReportSummary {
  emergencyType: string;
  totalEvents: number;
  totalDuration: string;
  lastEmergencyTime?: string;
  currentlyActive: boolean;
  currentActiveDuration?: string;
}

export interface EmergencyReportFilter {
  emergencyType?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface Maintenance {
  id: number;
  name: string;
  description?: string;
  startTask: string;
  endTask: string;
  assignTo: number;
  targetType: MaintenanceTarget;
  targetId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  createdBy: number;
  updatedBy?: number;
  assignedToUser?: User;
  createdByUser?: User;
  updatedByUser?: User;
  targetDevice?: Device;
  targetRack?: Rack;
  targetContainment?: Containment;
}

export interface CreateMaintenanceRequest {
  name: string;
  description?: string;
  startTask: string;
  endTask: string;
  assignTo: number;
  targetType: MaintenanceTarget;
  targetId: number;
}

export interface UpdateMaintenanceRequest {
  name: string;
  description?: string;
  startTask: string;
  endTask: string;
  assignTo: number;
  targetType: MaintenanceTarget;
  targetId: number;
  status?: string;
}

export interface UpdateMaintenanceStatusRequest {
  status: string;
}

export interface MaintenanceFilter {
  targetType?: MaintenanceTarget;
  targetId?: number;
  assigneeId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface MqttConfiguration {
  id: number;
  isEnabled: boolean;
  useEnvironmentConfig: boolean;
  brokerHost?: string;
  brokerPort?: number;
  username?: string;
  password?: string;
  clientId?: string;
  useSsl: boolean;
  keepAliveInterval: number;
  reconnectDelay: number;
  topicPrefix?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  createdBy: number;
  updatedBy?: number;
  createdByUser?: User;
  updatedByUser?: User;
}

export interface CreateMqttConfigurationRequest {
  isEnabled: boolean;
  useEnvironmentConfig: boolean;
  brokerHost?: string;
  brokerPort?: number;
  username?: string;
  password?: string;
  clientId?: string;
  useSsl: boolean;
  keepAliveInterval: number;
  reconnectDelay: number;
  topicPrefix?: string;
  description?: string;
}

export interface UpdateMqttConfigurationRequest {
  isEnabled: boolean;
  useEnvironmentConfig: boolean;
  brokerHost?: string;
  brokerPort?: number;
  username?: string;
  password?: string;
  clientId?: string;
  useSsl: boolean;
  keepAliveInterval: number;
  reconnectDelay: number;
  topicPrefix?: string;
  description?: string;
}

export interface ToggleMqttRequest {
  enabled: boolean;
}

export interface TestMqttConnectionRequest {
  brokerHost: string;
  brokerPort: number;
  username?: string;
  password?: string;
  clientId?: string;
  useSsl: boolean;
  keepAliveInterval: number;
}

// Helper function to get role string from enum
export function getUserRoleString(role: UserRole): string {
  switch (role) {
    case UserRole.Admin: return 'Admin';
    case UserRole.Developer: return 'Developer';
    case UserRole.User: return 'User';
    default: return 'User';
  }
}

// Helper function to get role enum from string
export function getUserRoleEnum(roleString: string): UserRole {
  switch (roleString?.toLowerCase()) {
    case 'admin': return UserRole.Admin;
    case 'developer': return UserRole.Developer;
    case 'user':
    default: return UserRole.User;
  }
}

// Helper function to get containment type string from enum
export function getContainmentTypeString(type: ContainmentType): string {
  switch (type) {
    case ContainmentType.HotAisleContainment: return 'Hot Aisle Containment';
    case ContainmentType.ColdAisleContainment: return 'Cold Aisle Containment';
    default: return 'Unknown';
  }
}

// Helper function to get containment type enum from string
export function getContainmentTypeEnum(typeString: string): ContainmentType {
  switch (typeString?.toLowerCase()) {
    case 'hot aisle containment':
    case 'hotaislecontainment': return ContainmentType.HotAisleContainment;
    case 'cold aisle containment':
    case 'coldaislecontainment': return ContainmentType.ColdAisleContainment;
    default: return ContainmentType.HotAisleContainment;
  }
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
}

export interface CreateContainmentRequest {
  name: string;
  type: ContainmentType;
  description?: string;
  location: string;
}

export interface UpdateContainmentRequest {
  name: string;
  type: ContainmentType;
  description?: string;
  location: string;
}

export interface CreateRackRequest {
  name: string;
  containmentId: number;
  description?: string;
}

export interface UpdateRackRequest {
  name: string;
  containmentId: number;
  description?: string;
}

export interface CreateDeviceRequest {
  name: string;
  type: string;
  rackId: number;
  description?: string;
  serialNumber?: string;
  status?: string;
  topic?: string;
}

export interface UpdateDeviceRequest {
  name: string;
  type: string;
  rackId: number;
  description?: string;
  serialNumber?: string;
  status?: string;
  topic?: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// Get auth token from localStorage or cookies
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken') || null;
}

// HTTP client with auth support
class ApiClient {
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
      // Clear invalid/expired token
      this.clearAuthToken();
      // Trigger logout only if we're not already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
        this.redirectToLogin();
      }
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      let errorMessage = 'Something went wrong';
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }

  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      // Use replace to prevent back button issues
      window.location.replace('/auth/login');
    }
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const client = new ApiClient();

// Auth API methods
export const authApi = {
  async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const data = await client.post<LoginResponse>('/auth/login', request);
      
      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  },

  async register(request: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const data = await client.post<LoginResponse>('/auth/register', request);
      
      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }
  },

  async logout(): Promise<ApiResponse> {
    try {
      await client.post('/auth/logout');
      
      // Remove token from localStorage
      localStorage.removeItem('authToken');
      
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      // Even if API call fails, clear local token
      localStorage.removeItem('authToken');
      
      return {
        success: false,
        message: error.message || 'Logout failed',
      };
    }
  },

  async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    try {
      const data = await client.get<UserInfo>('/auth/me');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get current user',
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
      await client.get('/auth/me');
      return true;
    } catch {
      return false;
    }
  },
};

// User Photo API methods
export const userPhotoApi = {
  async uploadPhoto(userId: number, photoFile: File): Promise<ApiResponse<any>> {
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('photo', photoFile);

      const response = await fetch(`${BASE_URL}/api/userphoto/upload/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data,
          message: 'Photo uploaded successfully'
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          message: error.message || 'Failed to upload photo'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error uploading photo'
      };
    }
  },

  async deletePhoto(userId: number): Promise<ApiResponse<any>> {
    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/userphoto/${userId}/photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Photo deleted successfully'
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          message: error.message || 'Failed to delete photo'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error deleting photo'
      };
    }
  },

  getPhotoUrl(user: { photoPath?: string }): string {
    if (user.photoPath && user.photoPath !== '/images/avatar-user.png') {
      return `${BASE_URL}${user.photoPath}`;
    }
    return '/images/avatar-user.png';
  }
};

// Users API methods
export const usersApi = {
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const data = await client.get<User[]>('/users');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get users',
      };
    }
  },

  async getUser(id: number): Promise<ApiResponse<User>> {
    try {
      const data = await client.get<User>(`/users/${id}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get user',
      };
    }
  },

  async createUser(request: CreateUserRequest): Promise<ApiResponse<User>> {
    try {
      const data = await client.post<User>('/users', request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create user',
      };
    }
  },

  async updateUser(id: number, request: UpdateUserRequest): Promise<ApiResponse<User>> {
    try {
      const data = await client.put<User>(`/users/${id}`, request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update user',
      };
    }
  },

  async deleteUser(id: number): Promise<ApiResponse> {
    try {
      await client.delete(`/users/${id}`);
      
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete user',
      };
    }
  },
};

// Containments API methods
export const containmentsApi = {
  async getContainments(): Promise<ApiResponse<Containment[]>> {
    try {
      const data = await client.get<Containment[]>('/containment');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get containments',
      };
    }
  },

  async getContainment(id: number): Promise<ApiResponse<Containment>> {
    try {
      const data = await client.get<Containment>(`/containment/${id}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get containment',
      };
    }
  },

  async createContainment(request: CreateContainmentRequest): Promise<ApiResponse<Containment>> {
    try {
      const data = await client.post<Containment>('/containment', request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create containment',
      };
    }
  },

  async updateContainment(id: number, request: UpdateContainmentRequest): Promise<ApiResponse<Containment>> {
    try {
      const data = await client.put<Containment>(`/containment/${id}`, request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update containment',
      };
    }
  },

  async deleteContainment(id: number): Promise<ApiResponse> {
    try {
      await client.delete(`/containment/${id}`);
      
      return {
        success: true,
        message: 'Containment deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete containment',
      };
    }
  },
};

// Racks API methods
export const racksApi = {
  async getRacks(): Promise<ApiResponse<Rack[]>> {
    try {
      const data = await client.get<Rack[]>('/rack');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get racks',
      };
    }
  },

  async getRack(id: number): Promise<ApiResponse<Rack>> {
    try {
      const data = await client.get<Rack>(`/rack/${id}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get rack',
      };
    }
  },

  async getRacksByContainment(containmentId: number): Promise<ApiResponse<Rack[]>> {
    try {
      const data = await client.get<Rack[]>(`/rack/by-containment/${containmentId}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get racks by containment',
      };
    }
  },

  async createRack(request: CreateRackRequest): Promise<ApiResponse<Rack>> {
    try {
      const data = await client.post<Rack>('/rack', request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create rack',
      };
    }
  },

  async updateRack(id: number, request: UpdateRackRequest): Promise<ApiResponse<Rack>> {
    try {
      const data = await client.put<Rack>(`/rack/${id}`, request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update rack',
      };
    }
  },

  async deleteRack(id: number): Promise<ApiResponse> {
    try {
      await client.delete(`/rack/${id}`);
      
      return {
        success: true,
        message: 'Rack deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete rack',
      };
    }
  },
};

// Device API
export const devicesApi = {
  async getDevices(): Promise<ApiResponse<Device[]>> {
    try {
      const data = await client.get<Device[]>('/device');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get devices',
      };
    }
  },

  async getDevicesByRack(rackId: number): Promise<ApiResponse<Device[]>> {
    try {
      const data = await client.get<Device[]>(`/device/by-rack/${rackId}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get devices by rack',
      };
    }
  },

  async getDevice(id: number): Promise<ApiResponse<Device>> {
    try {
      const data = await client.get<Device>(`/device/${id}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get device',
      };
    }
  },

  async createDevice(request: CreateDeviceRequest): Promise<ApiResponse<Device>> {
    try {
      const data = await client.post<Device>('/device', request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create device',
      };
    }
  },

  async updateDevice(id: number, request: UpdateDeviceRequest): Promise<ApiResponse<Device>> {
    try {
      const data = await client.put<Device>(`/device/${id}`, request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update device',
      };
    }
  },

  async deleteDevice(id: number): Promise<ApiResponse> {
    try {
      await client.delete(`/device/${id}`);
      
      return {
        success: true,
        message: 'Device deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete device',
      };
    }
  },
};

// ContainmentStatus API methods
export const containmentStatusApi = {
  async getLatestStatus(containmentId: number): Promise<ApiResponse<ContainmentStatus>> {
    try {
      const data = await client.get<ContainmentStatus>(`/containmentstatus/${containmentId}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get containment status',
      };
    }
  },

  async getAllLatestStatuses(): Promise<ApiResponse<ContainmentStatus[]>> {
    try {
      const data = await client.get<ContainmentStatus[]>('/containmentstatus');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get all containment statuses',
      };
    }
  },

  async processPayload(containmentId: number, payload: any): Promise<ApiResponse<ContainmentStatus>> {
    try {
      const data = await client.post<ContainmentStatus>(`/containmentstatus/${containmentId}/process`, payload);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to process containment status payload',
      };
    }
  },
};

// ContainmentControl API methods
export const containmentControlApi = {
  async sendControlCommand(request: ContainmentControlRequest): Promise<ApiResponse<ContainmentControlResponse>> {
    try {
      const data = await client.post<ContainmentControlResponse>('/containmentcontrol/send', request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send control command',
      };
    }
  },

  async getControlHistory(containmentId: number, limit: number = 50): Promise<ApiResponse<ContainmentControl[]>> {
    try {
      const data = await client.get<ContainmentControl[]>(`/containmentcontrol/${containmentId}/history?limit=${limit}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get control history',
      };
    }
  },

  async getAllControlHistory(limit: number = 100): Promise<ApiResponse<ContainmentControl[]>> {
    try {
      const data = await client.get<ContainmentControl[]>(`/containmentcontrol/history?limit=${limit}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get all control history',
      };
    }
  },

  async getAvailableCommands(): Promise<ApiResponse<any>> {
    try {
      const data = await client.get<any>('/containmentcontrol/commands');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get available commands',
      };
    }
  },

  async testMqttControl(): Promise<ApiResponse<any>> {
    try {
      const data = await client.post<any>('/containmentcontrol/test');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to test MQTT control',
      };
    }
  },
};

// Emergency Reports API methods
// Maintenance API methods
export const maintenanceApi = {
  async getMaintenances(): Promise<ApiResponse<Maintenance[]>> {
    try {
      const data = await client.get<Maintenance[]>('/maintenance');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get maintenances',
      };
    }
  },

  async getMaintenance(id: number): Promise<ApiResponse<Maintenance>> {
    try {
      const data = await client.get<Maintenance>(`/maintenance/${id}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get maintenance',
      };
    }
  },

  async getMaintenancesByTarget(targetType: MaintenanceTarget, targetId: number): Promise<ApiResponse<Maintenance[]>> {
    try {
      const data = await client.get<Maintenance[]>(`/maintenance/by-target/${targetType}/${targetId}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get maintenances by target',
      };
    }
  },

  async getMaintenancesByAssignee(userId: number): Promise<ApiResponse<Maintenance[]>> {
    try {
      const data = await client.get<Maintenance[]>(`/maintenance/by-assignee/${userId}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get maintenances by assignee',
      };
    }
  },

  async getMyMaintenanceTasks(): Promise<ApiResponse<Maintenance[]>> {
    try {
      const data = await client.get<Maintenance[]>('/maintenance/my-tasks');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get my maintenance tasks',
      };
    }
  },

  async createMaintenance(request: CreateMaintenanceRequest): Promise<ApiResponse<Maintenance>> {
    try {
      const data = await client.post<Maintenance>('/maintenance', request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create maintenance',
      };
    }
  },

  async updateMaintenance(id: number, request: UpdateMaintenanceRequest): Promise<ApiResponse<Maintenance>> {
    try {
      const data = await client.put<Maintenance>(`/maintenance/${id}`, request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update maintenance',
      };
    }
  },

  async updateMaintenanceStatus(id: number, request: UpdateMaintenanceStatusRequest): Promise<ApiResponse> {
    try {
      await client.put(`/maintenance/${id}/status`, request);
      
      return {
        success: true,
        message: 'Maintenance status updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update maintenance status',
      };
    }
  },

  async deleteMaintenance(id: number): Promise<ApiResponse> {
    try {
      await client.delete(`/maintenance/${id}`);
      
      return {
        success: true,
        message: 'Maintenance deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete maintenance',
      };
    }
  },
};

// Network Configuration types and interfaces
export interface NetworkConfiguration {
  id: number;
  interfaceType: 'ETH0' | 'ETH1';
  configMethod: 'DHCP' | 'Static';
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  primaryDns?: string;
  secondaryDns?: string;
  metric?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy?: number;
  createdByUser?: User;
  updatedByUser?: User;
}

export interface NetworkConfigurationRequest {
  interfaceType: 'ETH0' | 'ETH1';
  configMethod: 'DHCP' | 'Static';
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  primaryDns?: string;
  secondaryDns?: string;
  metric?: string;
}

export interface NetworkInterfaceStatus {
  interfaceType: 'ETH0' | 'ETH1';
  interfaceName: string;
  configMethod: 'DHCP' | 'Static';
  currentIpAddress?: string;
  subnetMask?: string;
  gateway?: string;
  primaryDns?: string;
  secondaryDns?: string;
  isUp: boolean;
  macAddress?: string;
  lastUpdated: string;
}

export interface ApplyNetworkConfigRequest {
  restartNetworking: boolean;
  backupCurrentConfig: boolean;
}

export interface TestConnectivityRequest {
  ipAddress: string;
}

// Network Configuration API methods
export const networkConfigurationApi = {
  async getAllConfigurations(): Promise<ApiResponse<NetworkConfiguration[]>> {
    try {
      const response = await client.get('/api/network');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get network configurations',
        data: []
      };
    }
  },

  async getConfigurationById(id: number): Promise<ApiResponse<NetworkConfiguration>> {
    try {
      const response = await client.get(`/api/network/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get network configuration'
      };
    }
  },

  async getConfigurationByInterface(interfaceType: 'ETH0' | 'ETH1'): Promise<ApiResponse<NetworkConfiguration>> {
    try {
      const response = await client.get(`/api/network/interface/${interfaceType}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get network configuration'
      };
    }
  },

  async createConfiguration(request: NetworkConfigurationRequest): Promise<ApiResponse<NetworkConfiguration>> {
    try {
      const response = await client.post('/api/network', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create network configuration'
      };
    }
  },

  async updateConfiguration(id: number, request: NetworkConfigurationRequest): Promise<ApiResponse<NetworkConfiguration>> {
    try {
      const response = await client.put(`/api/network/${id}`, request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update network configuration'
      };
    }
  },

  async deleteConfiguration(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await client.delete(`/api/network/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete network configuration'
      };
    }
  },

  async getInterfacesFile(): Promise<ApiResponse<string>> {
    try {
      const response = await client.get('/api/network/interfaces-file');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get interfaces file'
      };
    }
  },

  async applyConfiguration(request: ApplyNetworkConfigRequest): Promise<ApiResponse<void>> {
    try {
      const response = await client.post('/api/network/apply', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to apply network configuration'
      };
    }
  },

  async restartNetworking(): Promise<ApiResponse<void>> {
    try {
      const response = await client.post('/api/network/restart');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to restart networking'
      };
    }
  },

  async backupConfiguration(): Promise<ApiResponse<void>> {
    try {
      const response = await client.post('/api/network/backup');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to backup configuration'
      };
    }
  },

  async restoreConfiguration(): Promise<ApiResponse<void>> {
    try {
      const response = await client.post('/api/network/restore');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to restore configuration'
      };
    }
  },

  async getInterfaceStatus(): Promise<ApiResponse<NetworkInterfaceStatus[]>> {
    try {
      const response = await client.get('/api/network/status');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get interface status',
        data: []
      };
    }
  },

  async testConnectivity(request: TestConnectivityRequest): Promise<ApiResponse<{ipAddress: string, isReachable: boolean}>> {
    try {
      const response = await client.post('/api/network/test-connectivity', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to test connectivity'
      };
    }
  },

  async validateConfiguration(request: NetworkConfigurationRequest): Promise<ApiResponse<{isValid: boolean}>> {
    try {
      const response = await client.post('/api/network/validate', request);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to validate configuration'
      };
    }
  },
};

// MQTT Configuration API methods
export const mqttConfigurationApi = {
  async getActiveConfiguration(): Promise<ApiResponse<MqttConfiguration>> {
    try {
      const data = await client.get<MqttConfiguration>('/mqttconfiguration/active');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get active MQTT configuration',
      };
    }
  },

  async getEffectiveConfiguration(): Promise<ApiResponse<Record<string, any>>> {
    try {
      const data = await client.get<Record<string, any>>('/mqttconfiguration/effective');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get effective MQTT configuration',
      };
    }
  },

  async getConfigurations(): Promise<ApiResponse<MqttConfiguration[]>> {
    try {
      const data = await client.get<MqttConfiguration[]>('/mqttconfiguration');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get MQTT configurations',
      };
    }
  },

  async getConfiguration(id: number): Promise<ApiResponse<MqttConfiguration>> {
    try {
      const data = await client.get<MqttConfiguration>(`/mqttconfiguration/${id}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get MQTT configuration',
      };
    }
  },

  async createConfiguration(request: CreateMqttConfigurationRequest): Promise<ApiResponse<MqttConfiguration>> {
    try {
      const data = await client.post<MqttConfiguration>('/mqttconfiguration', request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create MQTT configuration',
      };
    }
  },

  async updateConfiguration(id: number, request: UpdateMqttConfigurationRequest): Promise<ApiResponse<MqttConfiguration>> {
    try {
      const data = await client.put<MqttConfiguration>(`/mqttconfiguration/${id}`, request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update MQTT configuration',
      };
    }
  },

  async deleteConfiguration(id: number): Promise<ApiResponse> {
    try {
      await client.delete(`/mqttconfiguration/${id}`);
      
      return {
        success: true,
        message: 'MQTT configuration deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete MQTT configuration',
      };
    }
  },

  async setActiveConfiguration(id: number): Promise<ApiResponse> {
    try {
      await client.post(`/mqttconfiguration/${id}/activate`);
      
      return {
        success: true,
        message: 'Configuration activated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to activate configuration',
      };
    }
  },

  async toggleMqtt(request: ToggleMqttRequest): Promise<ApiResponse> {
    try {
      await client.post('/mqttconfiguration/toggle', request);
      
      return {
        success: true,
        message: `MQTT ${request.enabled ? 'enabled' : 'disabled'} successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to toggle MQTT',
      };
    }
  },

  async testConnection(id: number): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const data = await client.post<{ success: boolean; message: string }>(`/mqttconfiguration/${id}/test`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to test connection',
      };
    }
  },

  async testConnectionWithConfig(request: TestMqttConnectionRequest): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const data = await client.post<{ success: boolean; message: string }>('/mqttconfiguration/test', request);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to test connection',
      };
    }
  },
};

export const emergencyReportsApi = {
  async getEmergencyReports(filter?: EmergencyReportFilter): Promise<ApiResponse<EmergencyReport[]>> {
    try {
      const params = new URLSearchParams();
      if (filter?.emergencyType) params.append('emergencyType', filter.emergencyType);
      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);
      if (filter?.isActive !== undefined) params.append('isActive', String(filter.isActive));
      if (filter?.page) params.append('page', String(filter.page));
      if (filter?.pageSize) params.append('pageSize', String(filter.pageSize));
      
      const queryString = params.toString();
      const endpoint = queryString ? `/emergencyreport?${queryString}` : '/emergencyreport';
      
      const data = await client.get<EmergencyReport[]>(endpoint);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get emergency reports',
      };
    }
  },

  async getEmergencyReportSummary(startDate?: string, endDate?: string): Promise<ApiResponse<EmergencyReportSummary[]>> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      const endpoint = queryString ? `/emergencyreport/summary?${queryString}` : '/emergencyreport/summary';
      
      const data = await client.get<EmergencyReportSummary[]>(endpoint);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get emergency report summary',
      };
    }
  },

  async getActiveEmergencies(): Promise<ApiResponse<EmergencyReport[]>> {
    try {
      const data = await client.get<EmergencyReport[]>('/emergencyreport/active');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get active emergencies',
      };
    }
  },

  async getActiveEmergency(emergencyType: string): Promise<ApiResponse<EmergencyReport>> {
    try {
      const data = await client.get<EmergencyReport>(`/emergencyreport/active/${emergencyType}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get active emergency',
      };
    }
  },

  async closeActiveEmergency(emergencyType: string): Promise<ApiResponse<any>> {
    try {
      const data = await client.post<any>(`/emergencyreport/close/${emergencyType}`);
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to close active emergency',
      };
    }
  },

  async getEmergencyStatus(): Promise<ApiResponse<any>> {
    try {
      const data = await client.get<any>('/emergencyreport/status');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get emergency status',
      };
    }
  },
};

// ZKTeco Access Control Types
export enum AccessControlUserPrivilege {
  User = 0,
  Enroller = 2,
  Administrator = 14
}

export interface AccessControlUser {
  uid: number;
  name: string;
  privilege: AccessControlUserPrivilege;
  password?: string;
  group_id?: string;
  user_id?: string;
  card?: number;
}

export interface AccessControlDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  timeout: number;
  enabled: boolean;
  location: string;
  description: string;
  isConnected?: boolean;
  lastPingTime?: string;
}

export interface AccessControlAttendance {
  user_id: string;
  timestamp: string;
  status: number;
  punch: number;
}

export interface CreateAccessControlUserRequest {
  device_id: string;
  user_data: {
    uid: number;
    name: string;
    privilege: AccessControlUserPrivilege;
    password?: string;
    group_id?: string;
    user_id?: string;
    card?: number;
  };
}

export interface UpdateAccessControlUserRequest {
  device_id: string;
  user_data: {
    uid?: number;
    name?: string;
    privilege?: AccessControlUserPrivilege;
    password?: string;
    group_id?: string;
    user_id?: string;
    card?: number;
  };
}

export interface RegisterFingerprintRequest {
  device_id: string;
  user_id: string;
  finger_id: number;
  template_data?: string;
}

export interface RegisterCardRequest {
  device_id: string;
  user_id: string;
  card_number: string;
}

export interface AccessControlMqttResponse {
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
  device_id?: string;
}

// ZKTeco Access Control API methods
export const accessControlApi = {
  // Device Management
  async getDevices(): Promise<ApiResponse<AccessControlDevice[]>> {
    try {
      // This would typically come from backend configuration
      const mockDevices: AccessControlDevice[] = [
        {
          id: "device_001",
          name: "Main Entry Access Control",
          ip: "192.168.1.201",
          port: 4370,
          timeout: 30,
          enabled: true,
          location: "Main Entrance",
          description: "Primary access control device",
          isConnected: false
        },
        {
          id: "device_002", 
          name: "Secondary Entry Access Control",
          ip: "192.168.1.202",
          port: 4370,
          timeout: 30,
          enabled: false,
          location: "Secondary Entrance",
          description: "Secondary access control device",
          isConnected: false
        }
      ];
      
      return {
        success: true,
        data: mockDevices,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get access control devices',
      };
    }
  },

  async connectDevice(deviceId: string): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      // In real implementation, this would publish to MQTT broker
      const response: AccessControlMqttResponse = {
        success: true,
        message: `Device ${deviceId} connection initiated`,
        timestamp: new Date().toISOString(),
        device_id: deviceId
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect device',
      };
    }
  },

  async disconnectDevice(deviceId: string): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      const response: AccessControlMqttResponse = {
        success: true,
        message: `Device ${deviceId} disconnection initiated`,
        timestamp: new Date().toISOString(),
        device_id: deviceId
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to disconnect device',
      };
    }
  },

  // User Management
  async getAllUsers(deviceId: string): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      // Simulate MQTT response with user data
      const mockUsers: AccessControlUser[] = [
        {
          uid: 1,
          name: "John Doe",
          privilege: AccessControlUserPrivilege.User,
          user_id: "1",
          card: 1234567890
        },
        {
          uid: 2,
          name: "Jane Smith",
          privilege: AccessControlUserPrivilege.Administrator,
          user_id: "2",
          card: 1234567891
        }
      ];
      
      const response: AccessControlMqttResponse = {
        success: true,
        message: `Retrieved ${mockUsers.length} users`,
        data: mockUsers,
        timestamp: new Date().toISOString(),
        device_id: deviceId
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get users',
      };
    }
  },

  async createUser(request: CreateAccessControlUserRequest): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      const response: AccessControlMqttResponse = {
        success: true,
        message: `User ${request.user_data.name} created successfully`,
        data: request.user_data,
        timestamp: new Date().toISOString(),
        device_id: request.device_id
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create user',
      };
    }
  },

  async updateUser(userId: string, request: UpdateAccessControlUserRequest): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      const response: AccessControlMqttResponse = {
        success: true,
        message: `User ${userId} updated successfully`,
        data: request.user_data,
        timestamp: new Date().toISOString(),
        device_id: request.device_id
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update user',
      };
    }
  },

  async deleteUser(deviceId: string, userId: string, useUid: boolean = true): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      const response: AccessControlMqttResponse = {
        success: true,
        message: `User ${userId} deleted successfully`,
        timestamp: new Date().toISOString(),
        device_id: deviceId
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete user',
      };
    }
  },

  // Biometric Management
  async registerFingerprint(request: RegisterFingerprintRequest): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      const response: AccessControlMqttResponse = {
        success: true,
        message: `Fingerprint registration initiated for user ${request.user_id}`,
        data: {
          user_id: request.user_id,
          finger_id: request.finger_id
        },
        timestamp: new Date().toISOString(),
        device_id: request.device_id
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to register fingerprint',
      };
    }
  },

  async registerCard(request: RegisterCardRequest): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      const response: AccessControlMqttResponse = {
        success: true,
        message: `Card ${request.card_number} registered for user ${request.user_id}`,
        data: {
          user_id: request.user_id,
          card_number: request.card_number
        },
        timestamp: new Date().toISOString(),
        device_id: request.device_id
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to register card',
      };
    }
  },

  // Attendance Management
  async getLiveAttendance(deviceId: string): Promise<ApiResponse<AccessControlMqttResponse>> {
    try {
      // Simulate live attendance data
      const mockAttendance: AccessControlAttendance[] = [
        {
          user_id: "1",
          timestamp: new Date().toISOString(),
          status: 1,
          punch: 0
        }
      ];
      
      const response: AccessControlMqttResponse = {
        success: true,
        message: "Live attendance captured",
        data: mockAttendance,
        timestamp: new Date().toISOString(),
        device_id: deviceId
      };
      
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get live attendance',
      };
    }
  },
};

// Legacy support - keeping the old api object for backward compatibility
export const api = {
  async post<T = any>(endpoint: string, body: Record<string, any>): Promise<T> {
    return client.post<T>(endpoint, body);
  },

  async loginUser(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return authApi.login({ email, password });
  },
};

export default api;

// CCTV Camera interfaces
export interface CctvCamera {
  id: number;
  name: string;
  description?: string;
  streamUrl: string;
  snapshotUrl?: string;
  streamType: CctvStreamType;
  protocol: CctvStreamProtocol;
  port?: number;
  location: string;
  containmentId?: number;
  rackId?: number;
  resolution: CctvResolution;
  frameRate: number;
  isActive: boolean;
  isOnline: boolean;
  lastOnlineAt?: string;
  showDashboard: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  containmentName?: string;
  rackName?: string;
}

export interface CreateCctvCameraRequest {
  name: string;
  description?: string;
  streamUrl: string;
  snapshotUrl?: string;
  streamType: CctvStreamType;
  protocol: CctvStreamProtocol;
  username?: string;
  password?: string;
  port?: number;
  location: string;
  containmentId?: number;
  rackId?: number;
  resolution: CctvResolution;
  frameRate: number;
  showDashboard?: boolean;
}

export interface UpdateCctvCameraRequest {
  name: string;
  description?: string;
  streamUrl: string;
  snapshotUrl?: string;
  protocol: CctvStreamProtocol;
  username?: string;
  password?: string;
  port?: number;
  location: string;
  containmentId?: number;
  rackId?: number;
  resolution: CctvResolution;
  frameRate: number;
  showDashboard?: boolean;
}

// CCTV API methods
export const cctvApi = {
  async getAllCameras(): Promise<ApiResponse<CctvCamera[]>> {
    try {
      const data = await client.get<CctvCamera[]>('/cctv');
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get cameras',
      };
    }
  },

  async getCameraById(id: number): Promise<ApiResponse<CctvCamera>> {
    try {
      const data = await client.get<CctvCamera>(`/cctv/${id}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get camera',
      };
    }
  },

  async getCamerasByContainment(containmentId: number): Promise<ApiResponse<CctvCamera[]>> {
    try {
      const data = await client.get<CctvCamera[]>(`/cctv/containment/${containmentId}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get cameras',
      };
    }
  },

  async getCamerasByRack(rackId: number): Promise<ApiResponse<CctvCamera[]>> {
    try {
      const data = await client.get<CctvCamera[]>(`/cctv/rack/${rackId}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get cameras',
      };
    }
  },

  async getOnlineCameras(): Promise<ApiResponse<CctvCamera[]>> {
    try {
      const data = await client.get<CctvCamera[]>('/cctv/online');
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get online cameras',
      };
    }
  },

  async getOfflineCameras(): Promise<ApiResponse<CctvCamera[]>> {
    try {
      const data = await client.get<CctvCamera[]>('/cctv/offline');
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get offline cameras',
      };
    }
  },

  async createCamera(camera: CreateCctvCameraRequest): Promise<ApiResponse<CctvCamera>> {
    try {
      const data = await client.post<CctvCamera>('/cctv', camera);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create camera',
      };
    }
  },

  async updateCamera(id: number, camera: UpdateCctvCameraRequest): Promise<ApiResponse<CctvCamera>> {
    try {
      const data = await client.put<CctvCamera>(`/cctv/${id}`, camera);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update camera',
      };
    }
  },

  async deleteCamera(id: number): Promise<ApiResponse<any>> {
    try {
      const data = await client.delete<any>(`/cctv/${id}`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete camera',
      };
    }
  },

  async testCameraConnection(id: number): Promise<ApiResponse<{ isOnline: boolean; message: string }>> {
    try {
      const data = await client.post<{ isOnline: boolean; message: string }>(`/cctv/${id}/test-connection`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to test camera connection',
      };
    }
  },

  async getCameraSnapshot(id: number): Promise<ApiResponse<{ snapshot: string }>> {
    try {
      const data = await client.get<{ snapshot: string }>(`/cctv/${id}/snapshot`);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get camera snapshot',
      };
    }
  },
};