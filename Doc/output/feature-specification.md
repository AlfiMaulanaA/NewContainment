# Feature Specification Document

## 📋 Document Information

**Project:** IoT Containment Monitoring System  
**Version:** 0.1.0
**Date:** 2025-09-03
**Status:** Active Development

## 🎯 System Overview

The IoT Containment Monitoring System is a comprehensive solution for real-time monitoring and management of containment environments with integrated sensor networks, CCTV surveillance, and access control systems.

## 🔧 Core Features


### 1. Frontend

**Description:** Frontend functionality

**Components:**
- **Frontend Pages:** 39 page(s)
- **Backend Controllers:** 0 controller(s)

**Functional Requirements:**
- User authentication and authorization
- Real-time data processing and display  
- Configuration management interface
- Data validation and error handling
- Notification and alert management

**Technical Specifications:**
- Frontend: Next.js 14 with TypeScript
- Backend: .NET 9 Web API
- Database: SQLite with Entity Framework
- Real-time: MQTT and WebSocket connections
- Security: JWT authentication with role-based access

**User Stories:**
- As a user, I want to access frontend functionality
- As an admin, I want to configure frontend settings  
- As a developer, I want to monitor frontend performance

**Acceptance Criteria:**
- [ ] Feature is accessible to appropriate user roles
- [ ] All functionality works as expected
- [ ] Error handling is implemented
- [ ] Performance meets requirements
- [ ] Security controls are in place

---


## 🔐 Security Features

### Role-Based Access Control
- **User (Level 1):** Basic monitoring and reporting
- **Developer (Level 2):** Advanced features and access control
- **Admin (Level 3):** Full system administration

### Authentication & Authorization
- JWT token-based authentication
- Session management with automatic refresh
- Multi-factor authentication support (future)
- Password policies and complexity requirements

### Data Security
- Encrypted data transmission (HTTPS/WSS)
- Secure database connections
- Input validation and sanitization
- SQL injection prevention
- XSS protection mechanisms

## 📊 Data Management

### Real-time Data Processing
- MQTT protocol for sensor communication
- WebSocket connections for live updates
- Data aggregation and averaging
- Historical data retention policies

### Database Schema

**AccessLog**
- AccessLog: class
- User: string (Required) (Key)
- Via: AccessMethod (Required) (Key)
- Trigger: string (Required) (Key)
- Timestamp: DateTime (Required) (Key)
- IsSuccess: bool (Required) (Key)


**ActivityReport**
- ActivityReport: class
- Description: string (Required)
- Timestamp: DateTime (Required)
- Status: string (Required)
- Trigger: string (Required)


**ApiResponse**
- Success: bool
- Message: string


**CameraConfig**
- CameraConfig: class
- Name: string
- IpAddress: string
- Port: int
- ApiKey: string
- Group: string
- CreatedAt: DateTime
- UpdatedAt: DateTime
- IsActive: bool


**Containment**
- Containment: class
- Name: string (Required)
- Type: ContainmentType (Required)
- Location: string (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- IsActive: bool (Required)
- Racks: ICollection<Rack> (Required)


**ContainmentControl**
- ContainmentControl: class
- ContainmentId: int (Required) (Key)
- Command: string (Required) (Key)
- ExecutedAt: DateTime (Required) (Key)
- Status: string (Required) (Key)
- ContainmentControlType: enum (Required) (Key)
- ControlAction: enum (Required) (Key)
- ContainmentControlRequest: class (Required) (Key)
- ControlType: ContainmentControlType (Required) (Key)
- Action: ControlAction (Required) (Key)
- ToggleControlRequest: class (Required) (Key)
- ControlType: string (Required) (Key)
- IsEnabled: bool (Required) (Key)
- ContainmentControlResponse: class (Required) (Key)
- Message: string (Required) (Key)


**ContainmentStatus**
- ContainmentStatus: class
- ContainmentId: int (Required) (Key)
- LightingStatus: bool (Required) (Key)
- EmergencyStatus: bool (Required) (Key)
- SmokeDetectorStatus: bool (Required) (Key)
- FssStatus: bool (Required) (Key)
- EmergencyButtonState: bool (Required) (Key)
- SelenoidStatus: bool (Required) (Key)
- LimitSwitchFrontDoorStatus: bool (Required) (Key)
- LimitSwitchBackDoorStatus: bool (Required) (Key)
- OpenFrontDoorStatus: bool (Required) (Key)
- OpenBackDoorStatus: bool (Required) (Key)
- EmergencyTemp: bool (Required) (Key)
- MqttTimestamp: DateTime (Required) (Key)
- CreatedAt: DateTime (Required) (Key)
- UpdatedAt: DateTime (Required) (Key)


**Device**
- Device: class
- Name: string (Required)
- Type: string (Required)
- RackId: int (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- IsActive: bool (Required)


**DeviceActivityStatus**
- DeviceActivityStatus: class
- DeviceId: int (Required)
- Status: string (Required)
- LastSeen: DateTime (Required)
- LastStatusChange: DateTime (Required)
- ConsecutiveFailures: int (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)


**DeviceSensorData**
- DeviceSensorData: class
- DeviceId: int (Required) (Key)
- RackId: int (Required) (Key)
- ContainmentId: int (Required) (Key)
- Topic: string (Required) (Key)
- Timestamp: DateTime (Required) (Key)
- ReceivedAt: DateTime (Required) (Key)
- RawPayload: string (Required) (Key)


**EmergencyReport**
- EmergencyReport: class
- EmergencyType: string (Required) (Key)
- Status: bool (Required) (Key)
- StartTime: DateTime (Required) (Key)
- IsActive: bool (Required) (Key)
- CreatedAt: DateTime (Required) (Key)
- UpdatedAt: DateTime (Required) (Key)
- EmergencyType: enum (Required) (Key)
- EmergencyReportSummary: class (Required) (Key)
- TotalEvents: int (Required) (Key)
- TotalDuration: TimeSpan (Required) (Key)
- CurrentlyActive: bool (Required) (Key)
- EmergencyReportFilter: class (Required) (Key)
- Page: int (Required) (Key)
- PageSize: int (Required) (Key)


**Maintenance**
- Maintenance: class
- Name: string (Required)
- StartTask: DateTime (Required)
- EndTask: DateTime (Required)
- AssignTo: int (Required)
- TargetType: MaintenanceTarget (Required)
- TargetId: int (Required)
- Status: string (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- IsActive: bool (Required)


**MenuManagement**
- Role: class
- Name: string (Required) (Key)
- DisplayName: string (Required) (Key)
- Description: string (Required) (Key)
- Level: int (Required) (Key)
- Color: string (Required) (Key)
- IsActive: bool (Required) (Key)
- CreatedAt: DateTime (Required) (Key)
- Permission: class (Required) (Key)
- Name: string (Required) (Key)
- Description: string (Required) (Key)
- Category: string (Required) (Key)
- IsActive: bool (Required) (Key)
- CreatedAt: DateTime (Required) (Key)
- MenuGroup: class (Required) (Key)
- Title: string (Required) (Key)
- Icon: string (Required) (Key)
- SortOrder: int (Required) (Key)
- IsActive: bool (Required) (Key)
- RequiresDeveloperMode: bool (Required) (Key)
- CreatedAt: DateTime (Required) (Key)
- MenuItem: class (Required) (Key)
- Title: string (Required) (Key)
- Url: string (Required) (Key)
- Icon: string (Required) (Key)
- SortOrder: int (Required) (Key)
- IsActive: bool (Required) (Key)
- RequiresDeveloperMode: bool (Required) (Key)
- CreatedAt: DateTime (Required) (Key)
- MenuGroupId: int (Required) (Key)
- MenuPermission: class (Required) (Key)
- IsRequired: bool (Required) (Key)
- CreatedAt: DateTime (Required) (Key)
- UserRoleAssignment: class (Required) (Key)
- UserId: int (Required) (Key)
- RoleId: int (Required) (Key)
- AssignedAt: DateTime (Required) (Key)
- IsActive: bool (Required) (Key)
- RolePermission: class (Required) (Key)
- RoleId: int (Required) (Key)
- PermissionId: int (Required) (Key)
- AssignedAt: DateTime (Required) (Key)
- MenuGroupDto: class (Required) (Key)
- Title: string (Required) (Key)
- Icon: string (Required) (Key)
- SortOrder: int (Required) (Key)
- RequiresDeveloperMode: bool (Required) (Key)
- Items: List<MenuItemDto> (Required) (Key)
- MenuItemDto: class (Required) (Key)
- Title: string (Required) (Key)
- Url: string (Required) (Key)
- Icon: string (Required) (Key)
- SortOrder: int (Required) (Key)
- RequiresDeveloperMode: bool (Required) (Key)
- RoleDto: class (Required) (Key)
- Name: string (Required) (Key)
- DisplayName: string (Required) (Key)
- Description: string (Required) (Key)
- Level: int (Required) (Key)
- Color: string (Required) (Key)
- IsActive: bool (Required) (Key)
- Permissions: List<string> (Required) (Key)
- UserMenuResponse: class (Required) (Key)
- UserRole: RoleDto (Required) (Key)
- IsDeveloperMode: bool (Required) (Key)
- UserPermissions: List<string> (Required) (Key)


**MqttConfiguration**
- MqttConfiguration: class
- IsEnabled: bool (Required)
- UseEnvironmentConfig: bool (Required)
- UseSsl: bool (Required)
- KeepAliveInterval: int (Required)
- ReconnectDelay: int (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- IsActive: bool (Required)
- CreatedBy: int (Required)


**NetworkConfiguration**
- NetworkConfiguration: class
- InterfaceType: NetworkInterfaceType (Required)
- ConfigMethod: NetworkConfigMethod (Required)
- IsActive: bool (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- CreatedBy: int (Required)
- NetworkConfigurationRequest: class (Required)
- ConfigMethod: NetworkConfigMethod (Required)
- NetworkInterfaceStatus: class (Required)
- InterfaceName: string (Required)
- ConfigMethod: NetworkConfigMethod (Required)
- IsUp: bool (Required)
- LastUpdated: DateTime (Required)
- ApplyNetworkConfigRequest: class (Required)
- BackupCurrentConfig: bool (Required)


**Rack**
- Rack: class
- Name: string (Required)
- ContainmentId: int (Required)
- CapacityU: int (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- IsActive: bool (Required)
- Devices: ICollection<Device> (Required)


**ScannedDevice**
- ScannedDevice: class


**SensorConfiguration**
- SensorConfiguration: class
- SensorNumber: int (Required)
- SensorName: string (Required)
- ModbusAddress: int (Required)
- ModbusPort: string (Required)
- SensorType: string (Required)
- IsEnabled: bool (Required)
- TemperatureOffset: decimal (Required)
- HumidityOffset: decimal (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- CreatedBy: int (Required)
- ScanConfiguration: class (Required)
- MaxAddressToScan: int (Required)
- SelectedPort: string (Required)
- SelectedSensor: string (Required)
- ScanTimeoutMs: int (Required)
- ScanIntervalMs: int (Required)
- IsActive: bool (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- CreatedBy: int (Required)
- SensorConfigurationRequest: class (Required)
- SensorName: string (Required)
- ModbusAddress: int (Required)
- ModbusPort: string (Required)
- SensorType: string (Required)
- IsEnabled: bool (Required)
- TemperatureOffset: decimal (Required)
- HumidityOffset: decimal (Required)
- ScanConfigurationRequest: class (Required)
- SelectedPort: string (Required)
- SelectedSensor: string (Required)
- ScanTimeoutMs: int (Required)
- ScanIntervalMs: int (Required)
- CalibrationRequest: class (Required)
- SensorMqttCommand: class (Required)
- SensorMqttResponse: class (Required)
- Command: string (Required)
- SensorListData: class (Required)
- DataSensor: SensorDataStructure (Required)
- SensorDataStructure: class (Required)
- ModbusAddress: int (Required)
- ModbusPort: string (Required)
- SensorType: string (Required)
- Enabled: bool (Required)
- ScanConfigData: class (Required)
- SelectedPort: string (Required)
- SelectedSensor: string (Required)


**SystemConfig**
- SystemConfig: class
- ModularI2cAddress1: int (Key)
- ModularI2cAddress2: int (Key)
- ModularI2cRelay1Address: int (Key)
- Debug: bool (Key)
- IntervalControlLight: int (Key)
- IntervalControlSelenoid: int (Key)
- IntervalDoorLock: int (Key)
- IntervalOpenFrontDoor: int (Key)
- IntervalOpenBackDoor: int (Key)
- TempEmergency: bool (Key)
- TempUpperThreshold: double (Key)
- TempBottomThreshold: double (Key)
- CreatedAt: DateTime (Key)
- UpdatedAt: DateTime (Key)
- CreatedBy: int (Key)
- IsActive: bool (Key)
- PinConfig: class (Key)
- PirSensorPin: int (Key)
- FssPin: int (Key)
- SmokeSensorButtonEmergencyPin: int (Key)
- ButtonFrontDoorPin: int (Key)
- ButtonBackDoorPin: int (Key)
- LimitSwitchBackDoorPin: int (Key)
- LimitSwitchFrontDoor: int (Key)
- RelayLightPin: int (Key)
- RelayMagneticBackDoorPin: int (Key)
- RelayMagneticPin: int (Key)
- RelayMiniSelenoidOpen: int (Key)
- RelayMiniSelenoidClose: int (Key)
- RelayMiniFrontDoorPin: int (Key)
- RelayMiniBackDoorPin: int (Key)
- RelayMiniDoorEmergency: int (Key)
- CreatedAt: DateTime (Key)
- UpdatedAt: DateTime (Key)
- CreatedBy: int (Key)
- IsActive: bool (Key)
- SystemConfigRequest: class (Key)
- ModularI2cAddress2: int (Key)
- ModularI2cRelay1Address: int (Key)
- Debug: bool (Key)
- IntervalControlLight: int (Key)
- IntervalControlSelenoid: int (Key)
- IntervalDoorLock: int (Key)
- IntervalOpenFrontDoor: int (Key)
- IntervalOpenBackDoor: int (Key)
- TempEmergency: bool (Key)
- TempUpperThreshold: double (Key)
- TempBottomThreshold: double (Key)
- PinConfigRequest: class (Key)
- FssPin: int (Key)
- SmokeSensorButtonEmergencyPin: int (Key)
- ButtonFrontDoorPin: int (Key)
- ButtonBackDoorPin: int (Key)
- LimitSwitchBackDoorPin: int (Key)
- LimitSwitchFrontDoor: int (Key)
- RelayLightPin: int (Key)
- RelayMagneticBackDoorPin: int (Key)
- RelayMagneticPin: int (Key)
- RelayMiniSelenoidOpen: int (Key)
- RelayMiniSelenoidClose: int (Key)
- RelayMiniFrontDoorPin: int (Key)
- RelayMiniBackDoorPin: int (Key)
- RelayMiniDoorEmergency: int (Key)
- MqttConfigPayload: class (Key)
- MqttConfigResponse: class (Key)
- Result: string (Key)
- CurrentSystemConfigResponse: class (Key)
- modular_i2c_address_2: int (Key)
- modular_i2c_relay_1_address: int (Key)
- debug: bool (Key)
- interval_control_light: int (Key)
- interval_control_selenoid: int (Key)
- interval_door_lock: int (Key)
- interval_open_front_door: int (Key)
- interval_open_back_door: int (Key)
- temp_emergency: bool (Key)
- temp_upper_threshold: double (Key)
- temp_bottom_threshold: double (Key)
- CurrentPinConfigResponse: class (Key)
- relay: RelayPins (Key)
- relay_mini: RelayMiniPins (Key)
- OptocouplerPins: class (Key)
- fss_pin: int (Key)
- smoke_sensor_pin_button_emergency_pin: int (Key)
- button_front_door_pin: int (Key)
- button_back_door_pin: int (Key)
- limit_switch_back_door_pin: int (Key)
- limit_switch_front_door: int (Key)
- RelayPins: class (Key)
- relay_magnetic_back_door_pin: int (Key)
- relay_magnetic_pin: int (Key)
- RelayMiniPins: class (Key)
- relay_mini_selenoid_close: int (Key)
- relay_mini_front_door_pin: int (Key)
- relay_mini_back_door_pin: int (Key)
- relay_mini_door_emergency: int (Key)


**SystemInfo**
- SystemInfo: class
- CpuTemp: string
- MemoryUsage: double
- UsedMemory: long
- TotalMemory: long
- DiskUsage: double
- UsedDisk: long
- TotalDisk: long
- Eth0IpAddress: string
- Wlan0IpAddress: string
- Uptime: long
- Hostname: string
- OsPlatform: string
- OsVersion: string
- ProcessorCount: int
- Timestamp: DateTime
- IsAvailable: bool
- SystemInfoDto: class
- CpuTemp: string
- MemoryUsage: double
- UsedMemory: long
- TotalMemory: long
- DiskUsage: double
- UsedDisk: long
- TotalDisk: long
- Eth0IpAddress: string
- Wlan0IpAddress: string
- Uptime: long
- Hostname: string
- OsPlatform: string
- OsVersion: string
- ProcessorCount: int
- Timestamp: DateTime
- IsAvailable: bool


**User**
- User: class
- Name: string (Required)
- Email: string (Required)
- PasswordHash: string (Required)
- Role: UserRole (Required)
- CreatedAt: DateTime (Required)
- UpdatedAt: DateTime (Required)
- IsActive: bool (Required)


## 🌐 Integration Points

### External Systems
- **MQTT Broker:** Real-time sensor data communication
- **CCTV Systems:** IP camera integration
- **WhatsApp API:** Alert notifications
- **Email Services:** System notifications
- **Biometric Devices:** ZKTeco access control integration

### API Interfaces
- RESTful API architecture
- Real-time WebSocket connections
- MQTT message broker integration
- File upload/download capabilities

## 📱 User Interface Specifications

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimization
- Touch-friendly interface elements
- Accessibility compliance (WCAG 2.1)

### Theme Support
- Light and dark mode themes
- Customizable color schemes
- User preference persistence
- Brand customization options

## ⚡ Performance Requirements

### Response Time
- Page load time: < 3 seconds
- API response time: < 500ms
- Real-time updates: < 100ms latency
- Database queries: < 200ms

### Scalability
- Support for 100+ concurrent users
- Handle 1000+ IoT devices
- Process 10,000+ sensor readings per minute
- Horizontal scaling capability

### Reliability
- 99.9% uptime requirement
- Automatic failover mechanisms
- Data backup and recovery procedures
- Error handling and graceful degradation

## 🔄 System Workflows

### User Registration & Authentication
1. User registration with role assignment
2. Email verification (optional)
3. Profile setup and customization
4. Multi-factor authentication setup
5. Session management and token refresh

### Sensor Data Processing
1. Sensor data collection via MQTT
2. Data validation and filtering
3. Real-time aggregation and analysis
4. Alert threshold monitoring
5. Data storage and archival

### Alert Management
1. Threshold-based alert generation
2. Alert prioritization and routing
3. Multi-channel notifications
4. Alert acknowledgment and resolution
5. Alert history and reporting

## 📈 Future Enhancements

### Planned Features
- Mobile application development
- Advanced analytics and AI integration
- Predictive maintenance algorithms
- Voice control integration
- Blockchain-based data integrity
- Cloud deployment options

### Technology Upgrades
- Migration to microservices architecture
- Implementation of event sourcing
- Integration with IoT platforms
- Advanced caching mechanisms
- Performance monitoring tools

## ✅ Testing Strategy

### Unit Testing
- Backend controller testing
- Frontend component testing
- Service layer validation
- Database operation testing

### Integration Testing  
- API endpoint testing
- MQTT communication testing
- Database integration validation
- External service integration

### End-to-End Testing
- User workflow validation
- Cross-browser compatibility
- Performance testing
- Security penetration testing

## 📋 Acceptance Criteria

### System Performance
- [ ] All pages load within 3 seconds
- [ ] API responses under 500ms
- [ ] Real-time updates with minimal latency
- [ ] Support for concurrent users

### Functionality
- [ ] User authentication and authorization
- [ ] Real-time sensor data display
- [ ] CCTV integration and viewing
- [ ] Alert management and notifications
- [ ] Administrative functions

### Security
- [ ] Secure authentication mechanism
- [ ] Role-based access control
- [ ] Data encryption in transit
- [ ] Input validation and sanitization

### Usability
- [ ] Intuitive user interface
- [ ] Responsive design implementation
- [ ] Accessibility compliance
- [ ] User preference management
