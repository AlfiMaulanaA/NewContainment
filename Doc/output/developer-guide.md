# Developer Guide - IoT Containment Monitoring System

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- .NET 9 SDK
- Visual Studio Code or Visual Studio
- Git
- SQLite Browser (optional)

### Environment Setup

```bash
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
```

### Environment Variables

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_MQTT_URL=ws://localhost:9001
NEXT_PUBLIC_APP_NAME=IoT Containment System
```

**Backend (appsettings.json):**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=app.db"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key",
    "ExpiryMinutes": 60
  }
}
```

## 🏗️ Project Structure

### Frontend Architecture
```
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
```

### Backend Architecture
```
Backend/
├── Controllers/          # API Controllers
├── Models/              # Entity models  
├── Services/            # Business logic
├── Data/               # Entity Framework context
├── Migrations/         # Database migrations
└── Middleware/         # Custom middleware
```

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
```bash
# Frontend tests
cd Frontend
npm run test

# Backend tests  
cd Backend
dotnet test
```

## 🔌 API Development

### Creating New Controllers

```csharp
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
```

### Adding Database Models

```csharp
public class ExampleModel
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
}
```

### Database Migrations
```bash
cd Backend
dotnet ef migrations add MigrationName
dotnet ef database update
```

## 🎨 Frontend Development

### Creating New Pages
```typescript
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
```

### Custom Hooks
```typescript
// hooks/useExample.ts
export function useExample() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Logic here
  }, []);
  
  return { data };
}
```

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
```typescript
const client = mqtt.connect(MQTT_URL, {
  clientId: `client_${Date.now()}`,
  username: 'username',
  password: 'password'
});
```

### Topic Structure
- `sensors/{deviceId}/data` - Sensor data
- `devices/{deviceId}/status` - Device status
- `system/alerts` - System alerts

## 🚀 Deployment

### Production Build
```bash
# Frontend
cd Frontend
npm run build
npm run start

# Backend
cd Backend  
dotnet publish -c Release
```

### Docker Deployment
```dockerfile
# Dockerfile example
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY . .
EXPOSE 80
ENTRYPOINT ["dotnet", "Backend.dll"]
```

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
