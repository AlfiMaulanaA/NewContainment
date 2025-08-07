@echo off
echo ===========================================
echo IoT Frontend - Production Server
echo ===========================================

REM Check if out directory exists
if not exist "out" (
    echo Error: out directory not found!
    echo Please run build-production.bat first.
    echo.
    pause
    exit /b 1
)

REM Check if http-server is installed globally
where http-server >nul 2>nul
if errorlevel 1 (
    echo Installing http-server globally...
    npm install -g http-server
)

echo Starting production frontend server...
echo Frontend will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

REM Serve the out directory on port 3000
cd out
http-server -p 3000 -c-1 --cors

echo.
echo Server stopped.
pause