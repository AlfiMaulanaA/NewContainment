@echo off
echo ===========================================
echo IoT Containment Management System
echo Production Deployment Script
echo ===========================================

REM Set environment variables for production
set ASPNETCORE_ENVIRONMENT=Production
set ASPNETCORE_URLS=http://0.0.0.0:5000

echo Environment: %ASPNETCORE_ENVIRONMENT%
echo URLs: %ASPNETCORE_URLS%
echo.

REM Check if the DLL exists
if not exist "Backend.dll" (
    echo Error: Backend.dll not found!
    echo Please run 'dotnet publish' first.
    echo.
    pause
    exit /b 1
)

echo Starting IoT Backend Server...
echo Press Ctrl+C to stop the server
echo.

REM Start the application
dotnet Backend.dll

echo.
echo Server stopped.
pause