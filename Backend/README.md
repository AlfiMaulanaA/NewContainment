# Backend API - IoT Management System

ASP.NET Core Web API dengan authentication JWT, role management, dan MQTT integration.

## Features

- **User Management**: CRUD operations dengan role-based access (User, Admin, Developer)
- **JWT Authentication**: Login/logout dengan token-based security
- **MQTT Integration**: Publish/subscribe untuk IoT communication
- **Environment Variables**: Konfigurasi melalui .env file
- **SQLite Database**: Lightweight database dengan auto-migration
- **API Documentation**: Swagger UI untuk testing endpoints

## Quick Start

1. **Setup Environment**

   ```bash
   cp .env.example .env
   # Edit .env sesuai konfigurasi
   ```

2. **Run Application**

   ```bash
   dotnet run --launch-profile http
   ```

3. **Access API**
   - API Base URL: `http://localhost:5001`
   - Swagger UI: `http://localhost:5001/swagger`

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/logout` - Logout (requires token)
- `GET /api/auth/me` - Get current user info

### User Management

- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user (soft delete)

### MQTT (All endpoints require authentication)

- `GET /api/mqtt/status` - Check MQTT connection status
- `POST /api/mqtt/connect` - Connect to MQTT broker
- `POST /api/mqtt/disconnect` - Disconnect from MQTT broker
- `POST /api/mqtt/publish` - Publish message to topic
- `POST /api/mqtt/subscribe` - Subscribe to topic
- `POST /api/mqtt/unsubscribe` - Unsubscribe from topic
- `POST /api/mqtt/test` - Test MQTT functionality

## Default Users

| Email             | Password    | Role      |
| ----------------- | ----------- | --------- |
| admin@example.com | password123 | Admin     |
| dev@example.com   | password123 | Developer |
| user@example.com  | password123 | User      |

## Environment Variables

See `.env.example` for all available configuration options:

- Database connection
- JWT settings (secret, issuer, audience)
- MQTT broker configuration
- Application URLs and environment

## Technology Stack

- **.NET 8**: Framework
- **Entity Framework Core**: ORM dengan SQLite
- **JWT Bearer**: Authentication
- **MQTTnet**: MQTT client library
- **Swagger/OpenAPI**: API documentation
- **DotNetEnv**: Environment variables support

## Development

```bash
# Install dependencies
dotnet restore

# Run in development mode
dotnet run --launch-profile http

# Build project
dotnet build

# Generate HTTPS certificate (optional)
dotnet dev-certs https --trust
```
