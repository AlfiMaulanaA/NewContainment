/**
 * IoT Containment System - Documentation Template Generator
 * Generates various documentation formats from codebase analysis
 */

const fs = require('fs').promises;
const path = require('path');

class TemplateGenerator {
    constructor() {
        this.templates = new Map();
        this.initializeTemplates();
    }

    initializeTemplates() {
        // Register all template generators
        this.templates.set('system-overview', this.generateSystemOverview.bind(this));
        this.templates.set('api-documentation', this.generateApiDocumentation.bind(this));
        this.templates.set('user-guide', this.generateUserGuide.bind(this));
        this.templates.set('developer-guide', this.generateDeveloperGuide.bind(this));
        this.templates.set('deployment-guide', this.generateDeploymentGuide.bind(this));
        this.templates.set('architecture-document', this.generateArchitectureDocument.bind(this));
        this.templates.set('feature-specification', this.generateFeatureSpecification.bind(this));
        this.templates.set('security-documentation', this.generateSecurityDocumentation.bind(this));
    }

    async generateAll(analysis, outputDir) {
        console.log('📝 Generating documentation templates...');
        
        for (const [templateName, generator] of this.templates) {
            try {
                const content = await generator(analysis);
                const fileName = `${templateName}.md`;
                await fs.writeFile(path.join(outputDir, fileName), content, 'utf8');
                console.log(`✅ Generated: ${fileName}`);
            } catch (error) {
                console.error(`❌ Error generating ${templateName}:`, error.message);
            }
        }
        
        // Generate additional formats
        await this.generateReadme(analysis, outputDir);
        await this.generateChangelog(analysis, outputDir);
    }

    generateSystemOverview(analysis) {
        const { overview, features } = analysis;
        
        return `# ${overview.projectName} - System Overview

## 📋 Project Information

**Version:** ${overview.version}  
**Description:** ${overview.description}  
**Generated:** ${new Date().toISOString().split('T')[0]}

## 🏗️ Architecture Overview

### Technology Stack

#### Frontend
- **Framework:** ${overview.technologies.frontend.framework}
- **Language:** ${overview.technologies.frontend.language}  
- **Styling:** ${overview.technologies.frontend.styling}
- **UI Components:** ${overview.technologies.frontend.ui}
- **State Management:** ${overview.technologies.frontend.stateManagement}
- **Real-time Communication:** ${overview.technologies.frontend.realtime}

#### Backend  
- **Framework:** ${overview.technologies.backend.framework}
- **Language:** ${overview.technologies.backend.language}
- **Database:** ${overview.technologies.backend.database}
- **Authentication:** ${overview.technologies.backend.authentication}
- **Real-time Communication:** ${overview.technologies.backend.realtime}
- **API:** ${overview.technologies.backend.api}

## 🎯 Core Features

${features.map(feature => `### ${feature.name}
${feature.description}

**Pages:** ${feature.pages?.length || 0} | **Controllers:** ${feature.controllers?.length || 0}`).join('\n\n')}

## 📦 Dependencies

### Frontend Dependencies
${overview.dependencies.frontend.map(dep => `- ${dep}`).join('\n')}

### Backend Dependencies  
${overview.dependencies.backend.map(dep => `- ${dep}`).join('\n')}

## 🔄 Data Flow

\`\`\`
Frontend (Next.js) ←→ Backend API (.NET 9) ←→ SQLite Database
                    ↕
              MQTT Broker ←→ IoT Sensors
                    ↕  
               CCTV Cameras
\`\`\`

## 🏢 System Architecture

\`\`\`
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI   │◄──►│  .NET 9 Web API  │◄──►│ SQLite Database │
│                 │    │                  │    │                 │
│ - Dashboard     │    │ - Controllers    │    │ - User Data     │
│ - Real-time     │    │ - Services       │    │ - Sensor Data   │
│ - CCTV          │    │ - MQTT Client    │    │ - Device Config │
│ - Admin Panel   │    │ - Authentication │    │ - Logs          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │              ┌──────────────────┐
         │              │   MQTT Broker    │
         │              │                  │
         │              │ - Sensor Data    │
         └──────────────┤ - Device Control │
                        │ - Real-time Sync │
                        └──────────────────┘
                                 │
                        ┌──────────────────┐
                        │   IoT Devices    │
                        │                  │
                        │ - Temperature    │
                        │ - Humidity       │
                        │ - Air Flow       │
                        │ - Vibration      │
                        │ - CCTV Cameras   │
                        └──────────────────┘
\`\`\`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- .NET 9 SDK
- SQLite

### Development Setup
\`\`\`bash
# Clone repository
git clone <repository-url>

# Frontend setup
cd Frontend
npm install
npm run dev

# Backend setup (new terminal)
cd Backend  
dotnet restore
dotnet run
\`\`\`

### Production Build
\`\`\`bash
# Frontend build
cd Frontend
npm run build

# Backend build
cd Backend
dotnet publish -c Release
\`\`\`

## 📊 System Statistics

- **Total Pages:** ${analysis.frontend.pages.length}
- **Total API Endpoints:** ${analysis.apiEndpoints.length}
- **Total Controllers:** ${analysis.backend.controllers.length}
- **Total Models:** ${analysis.backend.models.length}
- **Database Tables:** ${analysis.database.models.length}
- **Features:** ${features.length}
`;
    }

    generateApiDocumentation(analysis) {
        const { apiEndpoints, backend } = analysis;
        
        const groupedEndpoints = this.groupEndpointsByController(apiEndpoints);
        
        return `# API Documentation

## 📡 REST API Reference

Base URL: \`http://localhost:5000/api\` (Development)

## 🔐 Authentication

All API endpoints require JWT authentication unless specified otherwise.

**Headers:**
\`\`\`
Authorization: Bearer <jwt-token>
Content-Type: application/json
\`\`\`

## 📋 Controllers Overview

${Object.entries(groupedEndpoints).map(([controller, endpoints]) => `### ${controller}
${endpoints.length} endpoints available`).join('\n\n')}

## 🔗 API Endpoints

${Object.entries(groupedEndpoints).map(([controller, endpoints]) => `
## ${controller}

${endpoints.map(endpoint => `### ${endpoint.method} ${endpoint.path}

**Description:** ${endpoint.description || 'No description available'}

${endpoint.requiresAuth ? '🔒 **Requires Authentication**' : '🌐 **Public Endpoint**'}

${endpoint.roles.length > 0 ? `**Required Roles:** ${endpoint.roles.join(', ')}` : ''}

**Example Request:**
\`\`\`http
${endpoint.method} /api${endpoint.path}
Authorization: Bearer <token>
Content-Type: application/json
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
\`\`\``).join('\n\n')}
`).join('\n')}

## 📝 Response Format

All API responses follow this standard format:

\`\`\`json
{
  "success": boolean,
  "data": any,
  "message": string,
  "errors": string[] (optional)
}
\`\`\`

## ⚠️ Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Bad Request |  
| 401  | Unauthorized |
| 403  | Forbidden |
| 404  | Not Found |
| 500  | Internal Server Error |

## 🔧 Testing

Use tools like Postman, Insomnia, or curl to test the API endpoints.

**Example with curl:**
\`\`\`bash
curl -X GET \\
  http://localhost:5000/api/devices \\
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
\`\`\`
`;
    }

    generateUserGuide(analysis) {
        const { features, frontend } = analysis;
        
        return `# User Guide - IoT Containment Monitoring System

## 🎯 Introduction

Welcome to the IoT Containment Monitoring System! This guide will help you navigate and use all the features of the application.

## 🚪 Getting Started

### Login Process
1. Navigate to the login page
2. Enter your username and password
3. Click "Sign In" to access the system

### User Roles
- **User (Level 1):** Basic monitoring and reporting access
- **Developer (Level 2):** Advanced features and access control systems  
- **Admin (Level 3):** Full system administration capabilities

## 📊 Dashboard Overview

The main dashboard provides a real-time overview of your containment systems:

- **System Status:** Overall health indicators
- **Active Alerts:** Current warnings and critical issues
- **Sensor Readings:** Real-time environmental data
- **Device Status:** Connected device health

## 🎛️ Main Features

${features.map(feature => `### ${feature.name}
${feature.description}

**Access Level:** ${this.getFeatureAccessLevel(feature)}
**Navigation:** ${this.getFeatureNavigation(feature)}

${this.generateFeatureInstructions(feature)}
`).join('\n')}

## 📱 Real-time Monitoring

### Sensor Dashboard
- View live sensor data from all containments
- Monitor temperature, humidity, air flow, and vibration
- Set custom alerts and thresholds
- Export data for analysis

### CCTV Integration  
- Access live camera feeds
- Full-screen monitoring mode
- Multiple camera support
- Integrated with sensor alerts

## ⚙️ System Settings

### Profile Management
- Update personal information
- Change password
- Configure notification preferences
- Upload profile photo

### Notification Settings
- Email notifications
- WhatsApp alerts (Admin only)
- Custom alert thresholds
- Emergency contact configuration

## 🔧 Troubleshooting

### Common Issues

**Cannot Login**
1. Check username and password
2. Ensure account is active
3. Contact administrator if issues persist

**No Real-time Data**
1. Check MQTT connection status
2. Verify sensor connectivity  
3. Check network connection
4. Contact technical support

**CCTV Not Loading**
1. Check camera IP configuration
2. Verify network connectivity
3. Ensure camera is powered on
4. Contact system administrator

### Getting Help
- Contact system administrator
- Check system logs (Developer/Admin only)
- Submit support ticket through the system

## 📞 Support

For technical support or questions:
- Email: support@company.com
- Phone: +1-xxx-xxx-xxxx
- Internal Help Desk: Extension 1234
`;
    }

    generateDeveloperGuide(analysis) {
        const { overview, backend, frontend } = analysis;
        
        return `# Developer Guide - IoT Containment Monitoring System

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- .NET 9 SDK
- Visual Studio Code or Visual Studio
- Git
- SQLite Browser (optional)

### Environment Setup

\`\`\`bash
# Clone repository
git clone <repository-url>
cd NewContainment

# Frontend setup
cd Frontend
npm install
cp .env.example .env.local
npm run dev

# Backend setup (new terminal)
cd Backend
dotnet restore
dotnet run
\`\`\`

### Environment Variables

**Frontend (.env.local):**
\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_MQTT_URL=ws://localhost:9001
NEXT_PUBLIC_APP_NAME=IoT Containment System
\`\`\`

**Backend (appsettings.json):**
\`\`\`json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=app.db"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key",
    "ExpiryMinutes": 60
  }
}
\`\`\`

## 🏗️ Project Structure

### Frontend Architecture
\`\`\`
Frontend/
├── app/                    # Next.js 14 App Router
│   ├── auth/              # Authentication pages
│   ├── dashboard-overview/ # Main dashboard
│   ├── management/        # Admin management
│   ├── monitoring/        # Real-time monitoring
│   └── access-control/    # Developer mode features
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── custom/           # Custom components
├── contexts/             # React Context providers
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configurations
└── styles/              # Global styles
\`\`\`

### Backend Architecture
\`\`\`
Backend/
├── Controllers/          # API Controllers
├── Models/              # Entity models  
├── Services/            # Business logic
├── Data/               # Entity Framework context
├── Migrations/         # Database migrations
└── Middleware/         # Custom middleware
\`\`\`

## 📋 Development Standards

### Code Style
- Use TypeScript for all React components
- Follow ESLint configuration
- Use Prettier for formatting
- C# follows .NET conventions

### Git Workflow
1. Create feature branch from main
2. Make changes with clear commit messages
3. Create pull request
4. Code review required
5. Merge to main

### Testing
\`\`\`bash
# Frontend tests
cd Frontend
npm run test

# Backend tests  
cd Backend
dotnet test
\`\`\`

## 🔌 API Development

### Creating New Controllers

\`\`\`csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExampleController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(new { success = true, data = [] });
    }
}
\`\`\`

### Adding Database Models

\`\`\`csharp
public class ExampleModel
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
}
\`\`\`

### Database Migrations
\`\`\`bash
cd Backend
dotnet ef migrations add MigrationName
dotnet ef database update
\`\`\`

## 🎨 Frontend Development

### Creating New Pages
\`\`\`typescript
// app/example/page.tsx
"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ExamplePage() {
  useAuthGuard(); // Protect page
  
  return (
    <div>
      <h1>Example Page</h1>
    </div>
  );
}
\`\`\`

### Custom Hooks
\`\`\`typescript
// hooks/useExample.ts
export function useExample() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Logic here
  }, []);
  
  return { data };
}
\`\`\`

### State Management
- Use React Context for global state
- Custom hooks for component logic
- Local state with useState for component-specific data

## 🔒 Security Considerations

### Authentication
- JWT tokens with secure expiry
- Refresh token mechanism
- Role-based access control

### Authorization
- Route-level protection
- Component-level guards  
- API endpoint authorization

### Data Validation
- Frontend form validation
- Backend model validation
- SQL injection prevention
- XSS protection

## 📊 MQTT Integration

### Client Setup
\`\`\`typescript
const client = mqtt.connect(MQTT_URL, {
  clientId: \`client_\${Date.now()}\`,
  username: 'username',
  password: 'password'
});
\`\`\`

### Topic Structure
- \`sensors/{deviceId}/data\` - Sensor data
- \`devices/{deviceId}/status\` - Device status
- \`system/alerts\` - System alerts

## 🚀 Deployment

### Production Build
\`\`\`bash
# Frontend
cd Frontend
npm run build
npm run start

# Backend
cd Backend  
dotnet publish -c Release
\`\`\`

### Docker Deployment
\`\`\`dockerfile
# Dockerfile example
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY . .
EXPOSE 80
ENTRYPOINT ["dotnet", "Backend.dll"]
\`\`\`

## 📈 Performance Optimization

### Frontend
- Code splitting with dynamic imports
- Image optimization
- Bundle analysis
- Caching strategies

### Backend  
- Entity Framework optimization
- Async/await patterns
- Connection pooling
- Caching with Redis (if needed)

## 🔧 Debugging

### Frontend Debugging
- React Developer Tools
- Chrome DevTools
- Console logging
- Network tab for API calls

### Backend Debugging
- Visual Studio debugger
- Logging with ILogger
- Application Insights (production)
- SQL profiling

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [.NET 9 Documentation](https://docs.microsoft.com/dotnet)
- [Entity Framework Core](https://docs.microsoft.com/ef/core)
- [MQTT.js Documentation](https://github.com/mqttjs/MQTT.js)
`;
    }

    generateFeatureSpecification(analysis) {
        const { features, apiEndpoints } = analysis;
        
        return `# Feature Specification Document

## 📋 Document Information

**Project:** IoT Containment Monitoring System  
**Version:** ${analysis.overview.version}
**Date:** ${new Date().toISOString().split('T')[0]}
**Status:** Active Development

## 🎯 System Overview

The IoT Containment Monitoring System is a comprehensive solution for real-time monitoring and management of containment environments with integrated sensor networks, CCTV surveillance, and access control systems.

## 🔧 Core Features

${features.map((feature, index) => `
### ${index + 1}. ${feature.name}

**Description:** ${feature.description}

**Components:**
${feature.pages ? `- **Frontend Pages:** ${feature.pages.length} page(s)` : ''}
${feature.controllers ? `- **Backend Controllers:** ${feature.controllers.length} controller(s)` : ''}

**Functional Requirements:**
${this.generateFunctionalRequirements(feature)}

**Technical Specifications:**
${this.generateTechnicalSpecs(feature)}

**User Stories:**
${this.generateUserStories(feature)}

**Acceptance Criteria:**
${this.generateAcceptanceCriteria(feature)}

---
`).join('')}

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
${this.generateDatabaseSchema(analysis.database.models)}

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
`;
    }

    // Helper methods for template generation
    groupEndpointsByController(endpoints) {
        const grouped = {};
        
        endpoints.forEach(endpoint => {
            // Extract controller name from path or use a default
            const controllerMatch = endpoint.path?.match(/^\/api\/([^\/]+)/);
            const controller = controllerMatch ? controllerMatch[1] : 'General';
            
            if (!grouped[controller]) {
                grouped[controller] = [];
            }
            
            grouped[controller].push(endpoint);
        });
        
        return grouped;
    }

    getFeatureAccessLevel(feature) {
        if (feature.name.includes('Developer') || feature.name.includes('Access Control')) {
            return 'Developer/Admin only';
        } else if (feature.name.includes('Admin') || feature.name.includes('Management')) {
            return 'Admin only';
        }
        return 'All authenticated users';
    }

    getFeatureNavigation(feature) {
        const pages = feature.pages || [];
        if (pages.length > 0) {
            return pages.map(page => page.url).join(', ');
        }
        return 'N/A';
    }

    generateFeatureInstructions(feature) {
        const instructions = {
            'Authentication': '1. Navigate to login page\n2. Enter credentials\n3. Access granted based on role',
            'Dashboard': '1. View system overview\n2. Monitor real-time metrics\n3. Check alert status',
            'Monitoring': '1. Access sensor dashboard\n2. View live data feeds\n3. Set alert thresholds',
            'Management': '1. Navigate to admin panel\n2. Configure system settings\n3. Manage users and devices',
            'Access Control': '1. Enable developer mode\n2. Configure biometric devices\n3. Monitor access logs'
        };
        
        return instructions[feature.name] || '1. Navigate to feature\n2. Follow on-screen instructions\n3. Configure as needed';
    }

    generateFunctionalRequirements(feature) {
        return `- User authentication and authorization
- Real-time data processing and display  
- Configuration management interface
- Data validation and error handling
- Notification and alert management`;
    }

    generateTechnicalSpecs(feature) {
        return `- Frontend: Next.js 14 with TypeScript
- Backend: .NET 9 Web API
- Database: SQLite with Entity Framework
- Real-time: MQTT and WebSocket connections
- Security: JWT authentication with role-based access`;
    }

    generateUserStories(feature) {
        return `- As a user, I want to access ${feature.name.toLowerCase()} functionality
- As an admin, I want to configure ${feature.name.toLowerCase()} settings  
- As a developer, I want to monitor ${feature.name.toLowerCase()} performance`;
    }

    generateAcceptanceCriteria(feature) {
        return `- [ ] Feature is accessible to appropriate user roles
- [ ] All functionality works as expected
- [ ] Error handling is implemented
- [ ] Performance meets requirements
- [ ] Security controls are in place`;
    }

    generateDatabaseSchema(models) {
        if (!models || models.length === 0) {
            return 'Database schema analysis not available';
        }
        
        return models.map(model => `
**${model.name}**
${model.properties ? model.properties.map(prop => `- ${prop.name}: ${prop.type}${prop.isRequired ? ' (Required)' : ''}${prop.isKey ? ' (Key)' : ''}`).join('\n') : 'Properties not analyzed'}
`).join('\n');
    }

    async generateReadme(analysis, outputDir) {
        const content = `# ${analysis.overview.projectName}

${analysis.overview.description}

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- .NET 9 SDK
- SQLite

### Installation
\`\`\`bash
# Clone repository
git clone <repository-url>

# Frontend setup
cd Frontend
npm install
npm run dev

# Backend setup
cd Backend
dotnet restore
dotnet run
\`\`\`

## 📚 Documentation

- [System Overview](./output/system-overview.md)
- [API Documentation](./output/api-documentation.md)  
- [User Guide](./output/user-guide.md)
- [Developer Guide](./output/developer-guide.md)

## 🎯 Features

${analysis.features.map(f => `- **${f.name}:** ${f.description}`).join('\n')}

## 🔧 Technologies

- Frontend: ${analysis.overview.technologies.frontend.framework}
- Backend: ${analysis.overview.technologies.backend.framework}
- Database: ${analysis.overview.technologies.backend.database}

## 📄 License

MIT License - see LICENSE file for details
`;

        await fs.writeFile(path.join(outputDir, 'README.md'), content, 'utf8');
        console.log('✅ Generated: README.md');
    }

    async generateChangelog(analysis, outputDir) {
        const content = `# Changelog

All notable changes to the IoT Containment Monitoring System will be documented in this file.

## [${analysis.overview.version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Complete system documentation generation
- Comprehensive feature analysis
- API documentation with examples
- User and developer guides
- Security documentation

### Features Implemented
${analysis.features.map(f => `- ${f.name}: ${f.description}`).join('\n')}

### Technical Improvements
- Modern Next.js 14 architecture
- .NET 9 backend implementation
- Real-time MQTT integration
- Role-based security system
- Dynamic menu management

### Documentation
- Automated documentation generation
- Code analysis and feature extraction
- Multiple output formats
- Comprehensive user guides
`;

        await fs.writeFile(path.join(outputDir, 'CHANGELOG.md'), content, 'utf8');
        console.log('✅ Generated: CHANGELOG.md');
    }

    generateSecurityDocumentation(analysis) {
        return `# Security Documentation

## 🔐 Security Overview

The IoT Containment Monitoring System implements comprehensive security measures to protect data, user access, and system integrity.

## 🛡️ Authentication & Authorization

### JWT Authentication
- Secure token-based authentication
- Configurable token expiration
- Automatic token refresh mechanism
- Secure token storage and transmission

### Role-Based Access Control (RBAC)
- **User (Level 1):** Basic monitoring access
- **Developer (Level 2):** Advanced features and access control
- **Admin (Level 3):** Full system administration

### Session Management
- Secure session handling
- Automatic logout on inactivity
- Cross-tab session synchronization
- Session invalidation on logout

## 🔒 Data Security

### Encryption
- HTTPS for all web communications
- WSS for WebSocket connections
- Database connection encryption
- Secure credential storage

### Input Validation
- Frontend form validation
- Backend model validation
- SQL injection prevention
- XSS protection mechanisms
- CSRF protection

### Data Privacy
- Personal data protection
- Secure file upload handling
- Data retention policies
- Privacy by design principles

## 🚨 Security Monitoring

### Access Logging
- User authentication logs
- API access logging
- Failed login attempt tracking
- Suspicious activity detection

### Alert System
- Security breach notifications
- Unauthorized access attempts
- System anomaly detection
- Real-time security monitoring

## 🔧 Developer Mode Security

### Enhanced Protection
- Additional password requirement
- Time-limited access (5 minutes)
- Elevated privilege monitoring
- Secure feature isolation

### Biometric Integration
- ZKTeco device integration
- Secure biometric data handling
- Access control monitoring
- Audit trail maintenance

## 📋 Security Policies

### Password Requirements
- Minimum 8 characters
- Complexity requirements
- Regular password updates
- Password history tracking

### Access Control
- Principle of least privilege
- Regular access reviews
- Role-based permissions
- Automatic privilege expiration

## 🔍 Security Testing

### Vulnerability Assessment
- Regular security scans
- Penetration testing
- Code security reviews
- Dependency vulnerability checks

### Security Protocols
- Incident response procedures
- Security update processes
- Data breach protocols
- Recovery procedures

## 📊 Compliance

### Standards Adherence
- OWASP security guidelines
- Industry best practices
- Data protection regulations
- Security framework compliance

### Audit Requirements
- Regular security audits
- Compliance reporting
- Security documentation
- Risk assessment procedures
`;
    }

    generateDeploymentGuide(analysis) {
        return `# Deployment Guide

## 🚀 Deployment Overview

This guide covers the deployment process for the IoT Containment Monitoring System in various environments.

## 📋 Prerequisites

### System Requirements
- **OS:** Windows Server 2019+, Ubuntu 20.04+, or CentOS 8+
- **CPU:** Minimum 2 cores, Recommended 4+ cores
- **RAM:** Minimum 4GB, Recommended 8GB+
- **Storage:** Minimum 20GB, Recommended 50GB+
- **Network:** Stable internet connection, MQTT broker access

### Software Dependencies
- .NET 9 Runtime
- Node.js 18+ Runtime
- SQLite (included)
- IIS or Nginx (for hosting)
- SSL Certificate (for HTTPS)

## 🛠️ Development Deployment

### Local Development
\`\`\`bash
# Start backend
cd Backend
dotnet run

# Start frontend (new terminal)
cd Frontend  
npm run dev
\`\`\`

### Docker Development
\`\`\`yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./Frontend
    ports:
      - "3000:3000"
  backend:
    build: ./Backend
    ports:
      - "5000:80"
    volumes:
      - ./data:/app/data
\`\`\`

## 🏭 Production Deployment

### Windows Server (IIS)

1. **Prepare Server**
\`\`\`powershell
# Install IIS and .NET 9
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ASPNET47
# Install .NET 9 Hosting Bundle
\`\`\`

2. **Deploy Backend**
\`\`\`bash
cd Backend
dotnet publish -c Release -o ./publish
# Copy publish folder to IIS wwwroot
\`\`\`

3. **Deploy Frontend** 
\`\`\`bash
cd Frontend
npm run build
npm run export
# Copy out folder to IIS static site
\`\`\`

### Linux Server (Nginx)

1. **Server Setup**
\`\`\`bash
# Install .NET 9
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y aspnetcore-runtime-9.0

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt-get install nginx
\`\`\`

2. **Configure Nginx**
\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

## 🐳 Docker Deployment

### Dockerfile - Backend
\`\`\`dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY publish/ .
EXPOSE 80
ENTRYPOINT ["dotnet", "Backend.dll"]
\`\`\`

### Dockerfile - Frontend
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

### Production Docker Compose
\`\`\`yaml
version: '3.8'
services:
  frontend:
    build: 
      context: ./Frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
      
  backend:
    build: ./Backend
    ports:
      - "5000:80"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
\`\`\`

## ☁️ Cloud Deployment

### Azure App Service
\`\`\`bash
# Install Azure CLI
# Login to Azure
az login

# Create resource group
az group create --name IoTMonitoring --location "East US"

# Create app service plan
az appservice plan create --name IoTMonitoringPlan --resource-group IoTMonitoring --sku B1

# Create web app for backend
az webapp create --resource-group IoTMonitoring --plan IoTMonitoringPlan --name iot-monitoring-api --runtime "DOTNETCORE|9.0"

# Create web app for frontend  
az webapp create --resource-group IoTMonitoring --plan IoTMonitoringPlan --name iot-monitoring-web --runtime "NODE|18-lts"
\`\`\`

### AWS Elastic Beanstalk
\`\`\`bash
# Install EB CLI
pip install awsebcli

# Initialize application
eb init iot-monitoring

# Create environment
eb create production

# Deploy
eb deploy
\`\`\`

## 🔧 Configuration

### Environment Variables

**Production Backend (appsettings.Production.json):**
\`\`\`json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=/app/data/production.db"
  },
  "JwtSettings": {
    "SecretKey": "your-production-secret-key",
    "ExpiryMinutes": 60
  },
  "MqttSettings": {
    "BrokerUrl": "your-mqtt-broker",
    "Username": "mqtt-user",
    "Password": "mqtt-password"
  }
}
\`\`\`

**Production Frontend (.env.production):**
\`\`\`
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_MQTT_URL=wss://your-mqtt-broker:9001
NEXT_PUBLIC_APP_NAME=IoT Containment System
\`\`\`

## 📊 Monitoring & Logging

### Application Monitoring
\`\`\`bash
# Install monitoring tools
npm install -g pm2

# Start with PM2
pm2 start npm --name "iot-frontend" -- start
pm2 start "dotnet Backend.dll" --name "iot-backend"

# Monitor processes
pm2 monit
\`\`\`

### Log Configuration
\`\`\`json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    },
    "File": {
      "Path": "/app/logs/app-.log",
      "RollingInterval": "Day"
    }
  }
}
\`\`\`

## 🔄 CI/CD Pipeline

### GitHub Actions
\`\`\`yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: '9.0.x'
        
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Build and Deploy
      run: |
        # Build backend
        cd Backend
        dotnet publish -c Release
        
        # Build frontend
        cd ../Frontend
        npm ci
        npm run build
        
        # Deploy to server
        # Add deployment scripts here
\`\`\`

## 🔒 Security Considerations

### SSL/TLS Configuration
- Install SSL certificates
- Configure HTTPS redirects
- Enable HSTS headers
- Use secure headers

### Firewall Settings
- Open ports 80, 443 for web traffic
- Open MQTT broker ports as needed
- Restrict database access
- Enable fail2ban for SSH protection

## 📋 Post-Deployment Checklist

- [ ] Backend API is accessible
- [ ] Frontend loads correctly
- [ ] Database connection works
- [ ] MQTT connectivity established
- [ ] SSL certificates installed
- [ ] User authentication functional
- [ ] Real-time features working
- [ ] Monitoring systems active
- [ ] Backup procedures in place
- [ ] Log rotation configured

## 🆘 Troubleshooting

### Common Issues
- **503 Service Unavailable:** Check .NET runtime installation
- **Connection refused:** Verify firewall and port settings
- **Database errors:** Check file permissions and path
- **MQTT connection issues:** Verify broker configuration
- **SSL certificate errors:** Check certificate validity and configuration

### Support Resources
- Check application logs
- Review system event logs  
- Monitor resource usage
- Contact technical support team
`;
    }

    generateArchitectureDocument(analysis) {
        return `# System Architecture Document

## 📋 Document Overview

**Project:** ${analysis.overview.projectName}
**Version:** ${analysis.overview.version}  
**Date:** ${new Date().toISOString().split('T')[0]}
**Author:** System Architecture Team

## 🎯 Architecture Vision

The IoT Containment Monitoring System follows a modern, scalable architecture pattern with clear separation of concerns, real-time capabilities, and robust security implementations.

## 🏗️ High-Level Architecture

\`\`\`
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
\`\`\`

## 🎨 Frontend Architecture

### Technology Stack
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript for type safety
- **Styling:** Tailwind CSS + CSS-in-JS
- **UI Components:** Radix UI + shadcn/ui
- **State Management:** React Context + Custom Hooks
- **Real-time:** MQTT.js for sensor data, WebSockets for notifications

### Component Architecture
\`\`\`
components/
├── ui/                     # Base UI components (buttons, inputs, etc.)
├── layout/                 # Layout components (sidebar, header, etc.)  
├── forms/                  # Form components with validation
├── charts/                 # Data visualization components
├── real-time/             # Real-time data display components
└── domain-specific/       # Feature-specific components
\`\`\`

### State Management Pattern
\`\`\`typescript
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
\`\`\`

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
\`\`\`
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
\`\`\`

### API Design Patterns
- **RESTful Design:** Resource-based endpoints
- **Standard HTTP Methods:** GET, POST, PUT, DELETE, PATCH
- **Consistent Response Format:** Standardized JSON responses
- **Error Handling:** Comprehensive error responses
- **Versioning:** API version management

## 🗃️ Database Architecture

### Entity Relationship Model
\`\`\`
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
\`\`\`

### Data Flow Architecture
1. **Sensor Data Collection:** IoT devices → MQTT → Backend → Database
2. **Real-time Updates:** Database → Backend → WebSocket → Frontend
3. **User Interactions:** Frontend → API → Business Logic → Database
4. **Notifications:** Event Triggers → Notification Service → External APIs

## 🔄 Real-time Communication

### MQTT Architecture
\`\`\`
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
\`\`\`

### WebSocket Communication
- **Real-time Updates:** Live sensor data streaming
- **User Notifications:** System alerts and messages
- **System Status:** Device online/offline status
- **Cross-tab Sync:** Multi-tab application state sync

## 🔐 Security Architecture

### Authentication Flow
\`\`\`
1. User Login ──► Validate Credentials ──► Generate JWT Token
2. Client Request ──► Token Validation ──► Authorize Access
3. Token Refresh ──► Validate Refresh Token ──► Issue New Token
4. Logout ──► Invalidate Token ──► Clear Session
\`\`\`

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
\`\`\`
Raw Sensor Data ──► Validation ──► Transformation ──► Aggregation ──► Storage
        │                                                      │
        └──► Real-time Display                                │
                                                              │
Historical Data ◄── Analytics ◄── Reporting ◄── Query Layer ◄┘
\`\`\`

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
\`\`\`
Code Commit ──► Build ──► Test ──► Security Scan ──► Deploy
     │                                               │
     └── Feature Branch ──► PR Review ──► Merge ────┘
\`\`\`

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
`;
    }
}

module.exports = TemplateGenerator;