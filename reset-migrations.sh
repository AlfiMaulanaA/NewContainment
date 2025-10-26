#!/bin/bash

# Script to reset Entity Framework migrations and database
# Usage: ./reset-migrations.sh

set -e  # Exit on any error

echo "=== Reset Entity Framework Migrations and Database ==="
echo

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if dotnet is installed
if ! command_exists dotnet; then
    echo "Error: dotnet CLI is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Backend/Backend.csproj" ]; then
    echo "Error: Backend/Backend.csproj not found. Please run this script from the project root directory."
    exit 1
fi

echo "Step 1: Removing existing migration files..."
if [ -d "Backend/Migrations" ]; then
    # Keep the directory but remove all migration files
    find Backend/Migrations -name "*.cs" -type f -delete
    echo "✓ Migration files removed"
else
    echo "No Migrations directory found"
fi

echo
echo "Step 2: Removing existing database files..."
# Remove SQLite database files
if [ -f "Backend/app.db" ]; then
    rm -f Backend/app.db Backend/app.db-shm Backend/app.db-wal
    echo "✓ Database files removed"
else
    echo "No database files found"
fi

echo
echo "Step 3: Adding new initial migration..."
cd Backend
if dotnet ef migrations add Initial --verbose; then
    echo "✓ Initial migration created successfully"
else
    echo "✗ Failed to create initial migration"
    exit 1
fi

echo
echo "Step 4: Updating database..."
if dotnet ef database update --verbose; then
    echo "✓ Database updated successfully"
else
    echo "✗ Failed to update database"
    exit 1
fi

cd ..
echo
echo "=== Reset Complete ==="
echo "All migrations and database have been reset and recreated."
echo
echo "Note: You may need to run the application to seed initial data if required."
