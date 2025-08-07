@echo off
echo ===========================================
echo IoT Containment Management System
echo Production Build Script
echo ===========================================

REM Clean previous builds
echo Cleaning previous builds...
if exist "bin\Release" rmdir /s /q "bin\Release"
if exist "obj\Release" rmdir /s /q "obj\Release"

REM Restore packages
echo Restoring NuGet packages...
dotnet restore

REM Build the application
echo Building application for Production...
dotnet build --configuration Release --no-restore

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

REM Publish the application
echo Publishing application...
dotnet publish --configuration Release --output ./publish --no-build

if errorlevel 1 (
    echo Publish failed!
    pause
    exit /b 1
)

echo.
echo ===========================================
echo Build and Publish completed successfully!
echo ===========================================
echo.
echo Published files are in: ./publish/
echo To run production server:
echo   1. cd publish
echo   2. run-production.bat
echo.

REM Copy production run script to publish folder
copy "run-production.bat" "publish\" >nul 2>&1
copy "run-production.sh" "publish\" >nul 2>&1

echo Production run scripts copied to publish folder.
echo.
pause