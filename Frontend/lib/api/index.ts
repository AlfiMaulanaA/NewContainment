// lib/api/index.ts - Centralized API exports

// Export client and types
export { apiClient } from './client';
export * from './types';

// Export API modules
export { authApi } from './auth';
export { usersApi } from './users';
export { devicesApi, deviceSensorDataApi } from './devices';
export { containmentsApi, racksApi } from './containments';
export { mqttConfigurationApi } from './mqtt';
export { maintenanceApi } from './maintenance';
export { systemApi, accessLogApi, cameraConfigApi } from './system';
export { menuApi, type MenuItemData, type MenuGroupData, type UserMenuResponse, type MenuUserRole } from './menu';

// Legacy compatibility exports - export main APIs with original names
export { authApi as api } from './auth';
export { apiClient as client } from './client';

// For backward compatibility, create an apiService object that includes all APIs
import { authApi } from './auth';
import { usersApi } from './users';
import { devicesApi, deviceSensorDataApi } from './devices';
import { containmentsApi, racksApi } from './containments';
import { mqttConfigurationApi } from './mqtt';
import { maintenanceApi } from './maintenance';
import { systemApi, accessLogApi, cameraConfigApi } from './system';
import { menuApi } from './menu';
import { apiClient } from './client';

export const apiService = {
  // HTTP methods
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  
  // Legacy methods for backward compatibility
  async loginUser(email: string, password: string) {
    return authApi.login({ email, password });
  },
  
  // API modules
  auth: authApi,
  users: usersApi,
  devices: devicesApi,
  deviceSensorData: deviceSensorDataApi,
  containments: containmentsApi,
  racks: racksApi,
  mqtt: mqttConfigurationApi,
  maintenance: maintenanceApi,
  system: systemApi,
  accessLog: accessLogApi,
  camera: cameraConfigApi,
  menu: menuApi,
};

// Default export for convenience
export default apiService;