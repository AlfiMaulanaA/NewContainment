// lib/api/types.ts - Shared types and interfaces

// Common API Response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// User related types
export enum UserRole {
  User = 1,
  Admin = 2,
  Developer = 3,
}

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

// Auth related types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface VerifyResetCredentialsRequest {
  email: string;
  name: string;
}

export interface VerifyResetCredentialsResponse {
  userId: number;
  message: string;
  isValid: boolean;
}

export interface ResetPasswordRequest {
  userId: number;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

// User management types
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
}

// Containment types
export enum ContainmentType {
  HotAisleContainment = 1,
  ColdAisleContainment = 2,
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

// Rack types
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

// Device types
export enum DeviceType {
  Server = "Server",
  Switch = "Switch",
  Router = "Router",
  Sensor = "Sensor",
  PDU = "PDU",
  UPS = "UPS",
  Other = "Other",
}

export enum SensorType {
  Temperature = "Temperature",
  AirFlow = "Air Flow",
  DustSensor = "Dust Sensor",
  Vibration = "Vibration",
  Humidity = "Humidity",
  Unknown = "Unknown",
}

export interface Device {
  id: number;
  name: string;
  type?: string;
  sensorType?: string;
  rackId: number;
  serialNumber?: string;
  description?: string;
  status?: string;
  topic?: string;
  uCapacity?: number;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  createdBy: number;
  updatedBy?: number;
  rack?: Rack;
}

export interface DeviceActivityStatus {
  id: number;
  deviceId: number;
  topic?: string;
  status: string; // Online, Offline, Unknown
  lastSeen: string;
  lastStatusChange: string;
  lastMessage?: string;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
  device?: Device;
}

// Maintenance types
export enum MaintenanceTarget {
  Device = 1,
  Rack = 2,
  Containment = 3,
}

export interface Maintenance {
  id: number;
  targetType: MaintenanceTarget;
  targetId: number;
  title: string;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  status: string;
  priority: string;
  assignedTo?: number;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  createdBy: number;
  updatedBy?: number;
}

// MQTT Configuration types
export interface MqttConfiguration {
  id: number;
  brokerHost: string;
  brokerPort: number;
  username?: string;
  password?: string;
  clientId?: string;
  topicPrefix?: string;
  useSsl: boolean;
  useWebSocket?: boolean;
  keepAliveInterval: number;
  reconnectDelay: number;
  isEnabled: boolean;
  useEnvironmentConfig: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: number;
  updatedBy?: number;
}

// Camera Configuration types
export interface CameraConfig {
  id: number;
  name: string;
  url: string;
  username?: string;
  password?: string;
  description?: string;
  isActive: boolean;
}

// Sensor Data types
export interface DeviceSensorData {
  id: number;
  deviceId: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  vibration?: number;
  airFlow?: number;
  dustLevel?: number;
  timestamp: string;
  rawPayload?: string;
  device?: Device;
}

// System Info types
export interface SystemInfo {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkStats: {
    bytesReceived: number;
    bytesSent: number;
  };
  uptime: string;
  processes: Array<{
    name: string;
    cpuUsage: number;
    memoryUsage: number;
  }>;
  timestamp: string;
}

// Access Log types
export enum AccessMethod {
  Fingerprint = 1,
  Face = 2,
  Password = 3,
  Card = 4,
  BMS = 5,
  Software = 6,
}

export interface AccessLog {
  id: number;
  user: string;
  via: AccessMethod;
  trigger: string;
  timestamp: string;
  additionalData?: string;
  description?: string;
  isSuccess: boolean;
}

export interface CreateAccessLogRequest {
  user: string;
  via: AccessMethod;
  trigger: string;
  description?: string;
  isSuccess: boolean;
  additionalData?: string;
}

// Live Attendance types
export interface AttendanceData {
  status: "success" | "failed";
  data: {
    deviceId: string;
    via: number;
    uid: string | null;
    name: string;
    message: string;
    device_name: string;
    access_action: string;
    timestamp: string;
    verify_code: number;
    punch_code: number;
  };
  event_type: string;
}

// Emergency Report types
export interface EmergencyReport {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  reportedAt: string;
  resolvedAt?: string;
  reportedBy: number;
  assignedTo?: number;
  isActive: boolean;
}

// Activity Report types
export interface ActivityReport {
  id: number;
  title: string;
  description: string;
  category: string;
  timestamp: string;
  userId: number;
  metadata?: any;
}

// Network Configuration types
export interface NetworkConfiguration {
  id: number;
  interfaceName: string;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dnsServers: string;
  interfaceType: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: number;
  updatedBy?: number;
}

// Capacity Management types
export interface RackCapacity {
  rackId: number;
  rackName: string;
  totalCapacityU: number;
  usedCapacityU: number;
  availableCapacityU: number;
  utilizationPercentage: number;
  devices: DeviceCapacityInfo[];
}

export interface DeviceCapacityInfo {
  deviceId: number;
  deviceName: string;
  deviceType: string;
  uCapacity: number;
}

export interface DeviceCapacity {
  id: number;
  deviceId: number;
  rackId: number;
  uCapacity: number;
  startPosition?: number;
  endPosition?: number;
  powerConsumptionW?: number;
  weightKg?: number;
  device?: Device;
  rack?: Rack;
}

export interface CapacitySummary {
  totalRacks: number;
  totalCapacityU: number;
  totalUsedU: number;
  totalAvailableU: number;
  averageUtilization: number;
  totalDevices: number;
  capacityByType: Array<{
    type: string;
    count: number;
    usedCapacityU: number;
  }>;
  utilizationTrend: Array<{
    date: string;
    utilization: number;
  }>;
}

export interface CapacityAlert {
  id: number;
  type: 'capacity' | 'power' | 'weight';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  rackId?: number;
  deviceId?: number;
  threshold: number;
  currentValue: number;
  createdAt: string;
  isActive: boolean;
}

export interface CapacityPlanningRequest {
  deviceType: string;
  uCapacity: number;
  quantity: number;
}

export interface CapacityPlanningResponse {
  canAccommodate: boolean;
  suggestedRacks: Array<{
    rackId: number;
    rackName: string;
    availableCapacityU: number;
    availablePositions: Array<{
      startPosition: number;
      endPosition: number;
    }>;
  }>;
  constraints: string[];
}
