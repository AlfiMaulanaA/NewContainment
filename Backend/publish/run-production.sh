#!/bin/bash
echo "==========================================="
echo "IoT Containment Management System"
echo "Production Deployment Script"
echo "==========================================="

# Set environment variables for production
export ASPNETCORE_ENVIRONMENT=Production
export ASPNETCORE_URLS=http://0.0.0.0:5000

echo "Environment: $ASPNETCORE_ENVIRONMENT"
echo "URLs: $ASPNETCORE_URLS"
echo

# Check if the DLL exists
if [ ! -f "Backend.dll" ]; then
    echo "Error: Backend.dll not found!"
    echo "Please run 'dotnet publish' first."
    echo
    exit 1
fi

echo "Starting IoT Backend Server..."
echo "Press Ctrl+C to stop the server"
echo

# Start the application
dotnet Backend.dll

echo
echo "Server stopped."