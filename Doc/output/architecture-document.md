# System Architecture Document

## 📋 Document Overview

**Project:** IoT Containment Monitoring System
**Version:** 0.1.0  
**Date:** 2025-09-03
**Author:** System Architecture Team

## 🎯 Architecture Vision

The IoT Containment Monitoring System follows a modern, scalable architecture pattern with clear separation of concerns, real-time capabilities, and robust security implementations.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 Frontend (TypeScript + Tailwind CSS + Radix UI)   │
│  ├── Pages & Routing (App Router)                             │
│  ├── Components & UI Elements                                 │
│  ├── State Management (React Context)                         │
│  ├── API Client & HTTP Communication                          │
│  └── Real-time Communication (MQTT.js + WebSockets)           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS/WSS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                         │
├─────────────────────────────────────────────────────────────────┤
│         .NET 9 Web API (ASP.NET Core + C#)                    │
│  ├── Controllers (API Endpoints)                              │
│  ├── Services (Business Logic)                                │
│  ├── Middleware (Auth, CORS, Logging)                         │
│  ├── Authentication (JWT Tokens)                              │
│  └── Real-time Hub (MQTT Client + SignalR)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Entity Framework Core
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                              │
├─────────────────────────────────────────────────────────────────┤
│              SQLite Database + Entity Framework                │
│  ├── User Management & Authentication                         │
│  ├── Device & Sensor Configuration                            │
│  ├── Real-time Sensor Data Storage                            │
│  ├── System Logs & Audit Trail                               │
│  └── Configuration & Settings                                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ MQTT Protocol
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Systems Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ├── MQTT Broker (Eclipse Mosquitto)                          │
│  ├── IoT Sensors (Temperature, Humidity, Vibration, etc.)     │
│  ├── CCTV Cameras (IP Cameras with RTSP/HTTP streams)         │
│  ├── WhatsApp Business API (Notifications)                    │
│  ├── Email Services (SMTP)                                    │
│  └── ZKTeco Biometric Devices (Access Control)                │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Frontend Architecture

### Technology Stack
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript for type safety
- **Styling:** Tailwind CSS + CSS-in-JS
- **UI Components:** Radix UI + shadcn/ui
- **State Management:** React Context + Custom Hooks
- **Real-time:** MQTT.js for sensor data, WebSockets for notifications

### Component Architecture
```
components/
├── ui/                     # Base UI components (buttons, inputs, etc.)
├── layout/                 # Layout components (sidebar, header, etc.)  
├── forms/                  # Form components with validation
├── charts/                 # Data visualization components
├── real-time/             # Real-time data display components
└── domain-specific/       # Feature-specific components
```

### State Management Pattern
```typescript
// Context Provider Pattern
const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DeveloperModeProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </DeveloperModeProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};
```

### Routing Architecture
- **App Router:** File-based routing with layouts
- **Route Protection:** Middleware and component guards
- **Dynamic Routes:** Parameter-based navigation
- **Nested Layouts:** Shared UI components across routes

## ⚙️ Backend Architecture

### Technology Stack
- **Framework:** ASP.NET Core 9.0
- **Language:** C# with async/await patterns
- **Database:** SQLite with Entity Framework Core
- **Authentication:** JWT with role-based authorization
- **Real-time:** MQTTnet for IoT communication

### Layered Architecture
```
Controllers/               # API endpoints and request handling
├── AuthController        # Authentication and user management
├── DeviceController      # IoT device management
├── SensorController      # Sensor data and configuration
├── MonitoringController  # Real-time monitoring endpoints
└── ReportController     # Data reporting and analytics

Services/                 # Business logic layer
├── AuthService          # Authentication business logic
├── DeviceService        # Device management logic
├── SensorService        # Sensor data processing
├── NotificationService  # Alert and notification logic
└── MqttService         # MQTT communication handling

Data/                    # Data access layer
├── AppDbContext        # Entity Framework context
├── Repositories/       # Data access repositories
├── Models/            # Entity models
└── Migrations/        # Database migrations
```

### API Design Patterns
- **RESTful Design:** Resource-based endpoints
- **Standard HTTP Methods:** GET, POST, PUT, DELETE, PATCH
- **Consistent Response Format:** Standardized JSON responses
- **Error Handling:** Comprehensive error responses
- **Versioning:** API version management

## 🗃️ Database Architecture

### Entity Relationship Model
```
Users ──────────── UserRoles ──────────── Roles
  │                                         │
  │                                         │
  ├── UserActivity                          │
  └── AccessLogs                            │
                                           │
Containments ────── Devices ──────── SensorData
     │                │                    │
     │                ├── DeviceActivity   │
     │                └── DeviceConfig     │
     │                                    │
     ├── Racks                            │
     └── MaintenanceSchedule              │
                                         │
CameraConfigs ──── CameraStreams        │
                                       │
MqttConfiguration ──── SensorConfigs  │
                                     │  
MenuGroups ────── MenuItems          │
                                   │
WhatsAppConfig ────── Notifications │
```

### Data Flow Architecture
1. **Sensor Data Collection:** IoT devices → MQTT → Backend → Database
2. **Real-time Updates:** Database → Backend → WebSocket → Frontend
3. **User Interactions:** Frontend → API → Business Logic → Database
4. **Notifications:** Event Triggers → Notification Service → External APIs

## 🔄 Real-time Communication

### MQTT Architecture
```
IoT Sensors ──► MQTT Broker ──► Backend MQTT Client ──► Database
                     │                    │
                     │                    ├──► WebSocket Hub
                     │                    └──► Alert System
                     │
                ┌────▼────┐
                │ Topics: │
                │ sensors/│
                │ devices/│  
                │ alerts/ │
                │ system/ │
                └─────────┘
```

### WebSocket Communication
- **Real-time Updates:** Live sensor data streaming
- **User Notifications:** System alerts and messages
- **System Status:** Device online/offline status
- **Cross-tab Sync:** Multi-tab application state sync

## 🔐 Security Architecture

### Authentication Flow
```
1. User Login ──► Validate Credentials ──► Generate JWT Token
2. Client Request ──► Token Validation ──► Authorize Access
3. Token Refresh ──► Validate Refresh Token ──► Issue New Token
4. Logout ──► Invalidate Token ──► Clear Session
```

### Authorization Layers
- **Route Level:** Middleware-based protection
- **Controller Level:** Attribute-based authorization
- **Component Level:** UI element visibility control
- **Data Level:** Row-level security (future enhancement)

### Security Measures
- **Input Validation:** All user inputs validated
- **SQL Injection Prevention:** Parameterized queries
- **XSS Protection:** Content sanitization
- **CSRF Protection:** Anti-forgery tokens
- **Rate Limiting:** API request throttling

## 📊 Data Processing Architecture

### Sensor Data Pipeline
```
Raw Sensor Data ──► Validation ──► Transformation ──► Aggregation ──► Storage
        │                                                      │
        └──► Real-time Display                                │
                                                              │
Historical Data ◄── Analytics ◄── Reporting ◄── Query Layer ◄┘
```

### Data Aggregation Strategy
- **Real-time Aggregation:** Moving averages for live display
- **Historical Aggregation:** Daily/weekly/monthly summaries
- **Alert Processing:** Threshold-based monitoring
- **Data Retention:** Configurable retention policies

## 🔧 Integration Architecture

### External System Integrations
- **MQTT Broker:** Eclipse Mosquitto for IoT communication
- **CCTV Systems:** IP camera integration with RTSP streams
- **WhatsApp API:** Business API for alert notifications
- **Email Services:** SMTP integration for system notifications
- **Biometric Devices:** ZKTeco SDK integration

### API Gateway Pattern
- **Centralized Entry Point:** Single API endpoint
- **Request Routing:** Route to appropriate services
- **Authentication:** Centralized auth validation
- **Rate Limiting:** Request throttling and quotas
- **Logging:** Centralized request/response logging

## 🚀 Deployment Architecture

### Development Environment
- **Frontend:** Next.js dev server (localhost:3000)
- **Backend:** .NET dev server (localhost:5000)  
- **Database:** Local SQLite file
- **MQTT:** Local broker instance

### Production Environment
- **Frontend:** Static files served by CDN/Web server
- **Backend:** ASP.NET Core hosted on IIS/Nginx
- **Database:** SQLite with backup strategies
- **MQTT:** Production MQTT broker cluster

### Scalability Considerations
- **Horizontal Scaling:** Load balancer + multiple backend instances
- **Database Scaling:** Read replicas and connection pooling
- **Caching Layer:** Redis for session and data caching
- **CDN Integration:** Static asset delivery optimization

## 📈 Performance Architecture

### Frontend Optimizations
- **Code Splitting:** Route-based lazy loading
- **Tree Shaking:** Unused code elimination
- **Image Optimization:** Next.js automatic image optimization
- **Caching Strategies:** Browser and service worker caching

### Backend Optimizations
- **Async Operations:** Non-blocking I/O operations
- **Connection Pooling:** Database connection efficiency
- **Response Caching:** API response caching
- **Query Optimization:** Efficient database queries

## 🔍 Monitoring Architecture

### Application Monitoring
- **Health Checks:** Endpoint health monitoring
- **Performance Metrics:** Response time and throughput
- **Error Tracking:** Exception logging and alerting
- **User Analytics:** Usage patterns and behavior

### Infrastructure Monitoring
- **System Resources:** CPU, memory, disk usage
- **Network Performance:** Latency and bandwidth
- **Database Performance:** Query performance and locks
- **External Dependencies:** Third-party service availability

## 🔄 DevOps Architecture

### CI/CD Pipeline
```
Code Commit ──► Build ──► Test ──► Security Scan ──► Deploy
     │                                               │
     └── Feature Branch ──► PR Review ──► Merge ────┘
```

### Environment Strategy
- **Development:** Feature development and testing
- **Staging:** Pre-production testing and validation
- **Production:** Live system with monitoring and alerting

## 📚 Architecture Patterns

### Design Patterns Used
- **Repository Pattern:** Data access abstraction
- **Service Layer Pattern:** Business logic encapsulation
- **Factory Pattern:** Object creation abstraction
- **Observer Pattern:** Event-driven notifications
- **Strategy Pattern:** Configurable behavior algorithms

### Architectural Principles
- **Single Responsibility:** Each component has one job
- **Open/Closed Principle:** Open for extension, closed for modification
- **Dependency Inversion:** Depend on abstractions, not concretions
- **Separation of Concerns:** Clear architectural boundaries
- **SOLID Principles:** Object-oriented design guidelines

## 🔮 Future Architecture Considerations

### Microservices Evolution
- **Service Decomposition:** Break monolith into services
- **API Gateway:** Centralized service communication
- **Service Mesh:** Inter-service communication management
- **Container Orchestration:** Kubernetes deployment

### Cloud-Native Architecture
- **Serverless Functions:** Event-driven computing
- **Cloud Database:** Managed database services
- **Auto-scaling:** Dynamic resource allocation
- **Global Distribution:** Multi-region deployments

This architecture document serves as the blueprint for the IoT Containment Monitoring System, providing guidance for current implementation and future enhancements.
