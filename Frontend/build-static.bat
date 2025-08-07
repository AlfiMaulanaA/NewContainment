@echo off
setlocal enabledelayedexpansion
echo ===========================================
echo IoT Frontend - Static Export Builder
echo ===========================================

REM Get current hostname automatically
for /f "tokens=*" %%i in ('hostname') do set CURRENT_HOSTNAME=%%i

REM Give option to use hostname or custom IP
echo Current hostname: !CURRENT_HOSTNAME!
echo.
echo Choose backend server location:
echo 1. Use current hostname (!CURRENT_HOSTNAME!)
echo 2. Enter custom IP/hostname
echo.
set /p CHOICE="Enter choice (1 or 2, default: 1): "
if "!CHOICE!"=="" set CHOICE=1

if "!CHOICE!"=="1" (
    set SERVER_IP=!CURRENT_HOSTNAME!
    echo Using hostname: !SERVER_IP!
) else (
    set /p SERVER_IP="Enter backend server IP/hostname: "
    if "!SERVER_IP!"=="" set SERVER_IP=localhost
    echo Using custom server: !SERVER_IP!
)

REM Set production environment variables in Windows format
REM Use localhost to trigger dynamic hostname detection
set NODE_ENV=production
set NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
set NEXT_PUBLIC_MQTT_BROKER_URL=ws://localhost:9000

echo Environment Variables Set:
echo NODE_ENV=!NODE_ENV!
echo NEXT_PUBLIC_API_BASE_URL=!NEXT_PUBLIC_API_BASE_URL!
echo NEXT_PUBLIC_MQTT_BROKER_URL=!NEXT_PUBLIC_MQTT_BROKER_URL!
echo.

REM Clean previous builds
echo Cleaning previous builds...
if exist ".next" rmdir /s /q ".next"
if exist "out" rmdir /s /q "out"

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Install cross-env if needed
npm list cross-env >nul 2>&1
if errorlevel 1 (
    echo Installing cross-env for Windows compatibility...
    npm install cross-env
)

REM Clean any previous builds first
echo Cleaning previous builds thoroughly...
if exist ".next" rmdir /s /q ".next" 2>nul
if exist "out" rmdir /s /q "out" 2>nul

REM Build using direct next command
echo Building with Next.js...
echo Running: npx next build
npx next build

if errorlevel 1 (
    echo Direct build failed, trying with cross-env...
    echo Running: npx cross-env NODE_ENV=production next build
    npx cross-env NODE_ENV=production next build
    
    if errorlevel 1 (
        echo All build attempts failed!
        echo.
        echo Please check:
        echo 1. Node.js version (should be 14+)
        echo 2. npm dependencies installed
        echo 3. No TypeScript errors in code
        echo 4. Middleware is disabled for static export
        echo.
        pause
        exit /b 1
    )
)

REM Check if out folder was created
if not exist "out" (
    echo Warning: out folder not found!
    echo This might be a server build instead of static export.
    echo Checking .next folder...
    if exist ".next" (
        echo .next folder exists - server build successful
        echo For static files, the build created server files instead
        echo You can use: npm start or npm run start:prod
    )
    echo.
    pause
    exit /b 1
)

echo.
echo ===========================================
echo SUCCESS: Static Files Generated!
echo ===========================================
echo.
echo Folder: ./out/
echo Files count:
dir /s /b out 2>nul | find /c /v ""
echo.
echo Next steps:
echo 1. Copy 'out' folder to your web server
echo 2. Or test locally with: serve-production.bat
echo.
echo Configuration:
echo - Built with localhost URLs to enable dynamic hostname detection
echo - Frontend will auto-detect hostname when deployed
echo - Dynamic API: http://[hostname]:5000
echo - Dynamic MQTT: ws://[hostname]:9000
echo - Images: Fixed for static export (no more 404 errors)
echo.
pause