@echo off
REM NewContainment Development Update Script
REM Author: Claude Code Assistant
REM Description: Pull updates, rebuild backend, and restart development server

setlocal EnableDelayedExpansion

REM Colors for output
set "RED=[31m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "NC=[0m"

REM Project paths
set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%Backend"
set "FRONTEND_DIR=%PROJECT_ROOT%Frontend"

echo %BLUE%=== NewContainment Development Update Script ===%NC%
echo %BLUE%Project Root: %PROJECT_ROOT%%NC%
echo.

:main
    call :log "Starting development update process..."
    
    REM Step 1: Pull latest changes
    call :pull_updates
    if !ERRORLEVEL! neq 0 (
        call :log_error "Failed to pull updates"
        goto :error_exit
    )
    
    REM Step 2: Update backend
    call :update_backend
    if !ERRORLEVEL! neq 0 (
        call :log_error "Failed to update backend"
        goto :error_exit
    )
    
    REM Step 3: Update frontend (optional)
    call :update_frontend
    if !ERRORLEVEL! neq 0 (
        call :log_warning "Frontend update had issues, but continuing..."
    )
    
    call :log_success "Development update completed successfully!"
    echo.
    call :show_status
    goto :end

:pull_updates
    call :log "=== Pulling Latest Changes ==="
    
    REM Check for uncommitted changes
    git status --porcelain > nul 2>&1
    for /f %%i in ('git status --porcelain ^| find /c /v ""') do set "CHANGES=%%i"
    
    if !CHANGES! gtr 0 (
        call :log_warning "Uncommitted changes detected. Stashing them..."
        git stash push -m "Auto-stash before update on %DATE% %TIME%"
        if !ERRORLEVEL! neq 0 (
            call :log_error "Failed to stash changes"
            exit /b 1
        )
        set "STASHED=1"
    ) else (
        set "STASHED=0"
    )
    
    REM Pull latest changes
    call :log "Pulling from origin main..."
    git pull origin main
    if !ERRORLEVEL! neq 0 (
        call :log_error "Git pull failed"
        if !STASHED! equ 1 (
            call :log "Restoring stashed changes..."
            git stash pop
        )
        exit /b 1
    )
    
    REM Restore stashed changes if any
    if !STASHED! equ 1 (
        call :log "Restoring stashed changes..."
        git stash pop
        if !ERRORLEVEL! neq 0 (
            call :log_warning "Failed to restore stashed changes. Check manually."
        )
    )
    
    call :log_success "Git pull completed"
    exit /b 0

:update_backend
    call :log "=== Updating Backend ==="
    
    if not exist "%BACKEND_DIR%" (
        call :log_error "Backend directory not found: %BACKEND_DIR%"
        exit /b 1
    )
    
    cd /d "%BACKEND_DIR%"
    
    REM Stop any running backend processes
    call :log "Stopping running backend processes..."
    taskkill /F /IM Backend.exe /T >nul 2>&1
    taskkill /F /IM dotnet.exe /T >nul 2>&1
    
    REM Clean previous builds
    call :log "Cleaning previous builds..."
    if exist "bin" rmdir /S /Q "bin"
    if exist "obj" rmdir /S /Q "obj"
    if exist "publish" rmdir /S /Q "publish"
    
    REM Restore packages
    call :log "Restoring packages..."
    dotnet restore
    if !ERRORLEVEL! neq 0 (
        call :log_error "Failed to restore packages"
        exit /b 1
    )
    
    REM Build the project
    call :log "Building backend..."
    dotnet build -c Release
    if !ERRORLEVEL! neq 0 (
        call :log_error "Backend build failed"
        exit /b 1
    )
    
    REM Publish for development (optional)
    call :log "Publishing backend..."
    dotnet publish -c Release -o publish
    if !ERRORLEVEL! neq 0 (
        call :log_error "Backend publish failed"
        exit /b 1
    )
    
    call :log_success "Backend updated successfully"
    cd /d "%PROJECT_ROOT%"
    exit /b 0

:update_frontend
    call :log "=== Updating Frontend ==="
    
    if not exist "%FRONTEND_DIR%" (
        call :log_error "Frontend directory not found: %FRONTEND_DIR%"
        exit /b 1
    )
    
    cd /d "%FRONTEND_DIR%"
    
    REM Check if package.json was updated
    git diff HEAD~1 package.json >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        call :log "Package.json changed. Updating dependencies..."
        npm install
        if !ERRORLEVEL! neq 0 (
            call :log_warning "Failed to install frontend dependencies"
            cd /d "%PROJECT_ROOT%"
            exit /b 1
        )
    ) else (
        call :log "No package.json changes detected"
    )
    
    REM Build frontend if needed
    call :log "Building frontend..."
    npm run build
    if !ERRORLEVEL! neq 0 (
        call :log_warning "Frontend build failed"
        cd /d "%PROJECT_ROOT%"
        exit /b 1
    )
    
    call :log_success "Frontend updated successfully"
    cd /d "%PROJECT_ROOT%"
    exit /b 0

:show_status
    call :log "=== Development Status ==="
    echo.
    call :log "Git Status:"
    git status --short
    echo.
    call :log "Backend Status:"
    if exist "%BACKEND_DIR%\publish\Backend.exe" (
        echo   %GREEN%✓ Backend published successfully%NC%
    ) else (
        echo   %RED%✗ Backend publish not found%NC%
    )
    echo.
    call :log "Frontend Status:"
    if exist "%FRONTEND_DIR%\.next" (
        echo   %GREEN%✓ Frontend built successfully%NC%
    ) else (
        echo   %RED%✗ Frontend build not found%NC%
    )
    echo.
    call :log_success "You can now start the development servers:"
    echo   Backend: cd Backend ^&^& dotnet run
    echo   Frontend: cd Frontend ^&^& npm run dev
    exit /b 0

:log
    echo %BLUE%[%TIME%]%NC% %1
    exit /b 0

:log_success
    echo %GREEN%[SUCCESS]%NC% %1
    exit /b 0

:log_error
    echo %RED%[ERROR]%NC% %1
    exit /b 0

:log_warning
    echo %YELLOW%[WARNING]%NC% %1
    exit /b 0

:error_exit
    call :log_error "Update process failed. Please check the errors above."
    pause
    exit /b 1

:end
    call :log_success "Update completed! Press any key to exit."
    pause >nul
    exit /b 0