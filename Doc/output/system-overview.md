# IoT Containment Monitoring System - System Overview

## 📋 Project Information

**Version:** 0.1.0  
**Description:** Full-stack IoT monitoring system with real-time sensor data and CCTV integration  
**Generated:** 2025-09-03

## 🏗️ Architecture Overview

### Technology Stack

#### Frontend
- **Framework:** Next.js 14
- **Language:** TypeScript  
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + shadcn/ui
- **State Management:** React Context + Custom Hooks
- **Real-time Communication:** MQTT.js

#### Backend  
- **Framework:** .NET 9
- **Language:** C#
- **Database:** SQLite + Entity Framework Core
- **Authentication:** JWT
- **Real-time Communication:** MQTTnet
- **API:** ASP.NET Core Web API

## 🎯 Core Features

### Frontend
Frontend functionality

**Pages:** 39 | **Controllers:** 0

## 📦 Dependencies

### Frontend Dependencies
- @hookform/resolvers
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toast
- @radix-ui/react-toggle
- @radix-ui/react-tooltip
- @types/better-sqlite3
- @types/mqtt
- @types/node
- @types/react
- @types/react-dom
- autoprefixer
- axios
- better-sqlite3
- chart.js
- class-variance-authority
- clsx
- cmdk
- cookies-next
- date-fns
- dotenv
- express
- fs
- hls.js
- lucide-react
- mqtt
- next
- next-themes
- paho-mqtt
- react
- react-chartjs-2
- react-day-picker
- react-dom
- react-flatpickr
- react-hook-form
- react-icons
- recharts
- sonner
- sweetalert2
- sweetalert2-react-content
- tailwind-merge
- tailwindcss
- tailwindcss-animate
- three
- typescript
- uuid
- xlsx
- zod

### Backend Dependencies  
- DotNetEnv
- FFMpegCore
- Microsoft.AspNetCore.Authentication.JwtBearer
- Microsoft.AspNetCore.OpenApi
- Microsoft.EntityFrameworkCore.Design
- Microsoft.EntityFrameworkCore.Sqlite
- MQTTnet
- Swashbuckle.AspNetCore
- System.Diagnostics.PerformanceCounter

## 🔄 Data Flow

```
Frontend (Next.js) ←→ Backend API (.NET 9) ←→ SQLite Database
                    ↕
              MQTT Broker ←→ IoT Sensors
                    ↕  
               CCTV Cameras
```

## 🏢 System Architecture

```
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
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- .NET 9 SDK
- SQLite

### Development Setup
```bash
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
```

### Production Build
```bash
# Frontend build
cd Frontend
npm run build

# Backend build
cd Backend
dotnet publish -c Release
```

## 📊 System Statistics

- **Total Pages:** 39
- **Total API Endpoints:** 209
- **Total Controllers:** 30
- **Total Models:** 21
- **Database Tables:** 21
- **Features:** 1
