# IoT Containment Monitoring System

This is a full-stack IoT monitoring system with .NET 9 backend and Next.js frontend for containment and sensor monitoring.

## Project Structure

- **Backend/**: .NET 9 Web API with Entity Framework Core, MQTT, and JWT authentication
- **Frontend/**: Next.js 14 application with TypeScript, Tailwind CSS, and real-time MQTT communication

## Development Commands

### Frontend (Next.js)
```bash
cd Frontend
npm run dev          # Start development server on port 3000
npm run build        # Production build
npm run lint         # Run ESLint
npm run start        # Start production server
```

### Backend (.NET 9)
```bash
cd Backend
dotnet run           # Start development server
dotnet build         # Build the project
dotnet test          # Run tests
```

## Key Technologies

- **Backend**: .NET 9, Entity Framework Core, SQLite, MQTTnet, JWT Authentication
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, MQTT.js, Radix UI
- **Real-time**: MQTT for sensor data communication
- **Database**: SQLite with Entity Framework migrations

## Features

- User authentication and management
- Real-time sensor monitoring via MQTT
- CCTV integration
- Device and containment management
- Maintenance scheduling and notifications
- WhatsApp integration for alerts