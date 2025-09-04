@echo off
echo.
echo ============================================
echo  IoT Containment System - Docs Generator
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

echo.
echo 📦 Installing generator dependencies...
cd generator
if not exist node_modules (
    echo Installing npm packages...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed
)

echo.
echo 🚀 Starting documentation generation...
echo.

REM Run the generator
call npm run generate

if %errorlevel% equ 0 (
    echo.
    echo ✅ Documentation generated successfully!
    echo 📁 Output location: %cd%\..\output
    echo.
    echo 🌐 To view documentation:
    echo    cd output
    echo    npx http-server . -p 8080 -o
    echo.
    echo 📝 Generated files:
    dir /b ..\output\*.md
    echo.
    
    REM Ask if user wants to open the documentation
    set /p open_docs="🔗 Open documentation portal in browser? (y/n): "
    if /i "%open_docs%"=="y" (
        cd ..\output
        start http://localhost:8080
        npx http-server . -p 8080
    )
) else (
    echo ❌ Documentation generation failed!
    echo Check the error messages above
)

echo.
pause