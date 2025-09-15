#!/bin/bash

# Quick Production Update Script
# Usage: sudo ./quick-update.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/Frontend"
BACKEND_DIR="$PROJECT_ROOT/Backend"

main() {
    log "=== Quick Production Update ==="

    # Pull latest changes
    log "Pulling latest changes..."
    git stash push -m "Auto-stash $(date)" 2>/dev/null || true

    # Handle untracked files that might conflict
    log "Handling potential file conflicts..."
    if [ -f "quick-update.sh" ] && ! git ls-files --error-unmatch quick-update.sh >/dev/null 2>&1; then
        log "Moving untracked quick-update.sh to backup..."
        mv quick-update.sh quick-update.sh.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    fi

    # Pull with proper conflict resolution
    if ! git pull --rebase origin main; then
        log_error "Git pull failed. Trying with merge strategy..."
        git rebase --abort 2>/dev/null || true
        git pull --no-rebase origin main
    fi

    # Restore execution permissions if needed
    chmod +x quick-update.sh 2>/dev/null || true

    # Stop services
    log "Stopping services..."
    pm2 delete newcontainment-frontend 2>/dev/null || true
    sudo systemctl stop NewContainmentWeb.service 2>/dev/null || true

    # Build frontend
    log "Building frontend..."
    cd "$FRONTEND_DIR"
    npm install --omit=dev
    npm run build

    # Start frontend
    log "Starting frontend..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: "newcontainment-frontend",
    script: "npm",
    args: "start",
    env: { NODE_ENV: "production", PORT: 3000, HOST: "0.0.0.0" },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G"
  }]
};
EOF
    pm2 start ecosystem.config.js
    pm2 save

    # Build backend
    log "Building backend..."
    cd "$BACKEND_DIR"

    # Detect architecture
    arch=$(uname -m)
    case $arch in
        x86_64) target_arch="linux-x64" ;;
        aarch64|arm64) target_arch="linux-arm64" ;;
        armv7l) target_arch="linux-arm" ;;
        *) target_arch="linux-x64" ;;
    esac

    # Fix NuGet configuration for Linux
    log "Fixing NuGet configuration for Linux..."
    export NUGET_PACKAGES="$HOME/.nuget/packages"
    export NUGET_FALLBACK_PACKAGES=""
    export NUGET_HTTP_CACHE_PATH="$HOME/.local/share/NuGet/v3-cache"

    # Create directories if they don't exist
    mkdir -p "$NUGET_PACKAGES"
    mkdir -p "$HOME/.local/share/NuGet/v3-cache"

    # Clear ALL NuGet caches and remove Windows-specific configs
    log "Clearing NuGet caches and Windows configs..."
    dotnet nuget locals all --clear 2>/dev/null || true

    # Remove any existing NuGet.Config files that might have Windows paths
    rm -f nuget.config NuGet.Config 2>/dev/null || true
    rm -f "$HOME/.nuget/NuGet/NuGet.Config" 2>/dev/null || true

    # Create clean NuGet.Config with Linux-only paths
    cat > NuGet.Config << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
    <packageSources>
        <clear />
        <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    </packageSources>
    <packageRestore>
        <add key="enabled" value="True" />
        <add key="automatic" value="True" />
    </packageRestore>
    <config>
        <add key="globalPackagesFolder" value="/root/.nuget/packages" />
        <add key="repositoryPath" value="./packages" />
    </config>
    <fallbackPackageFolders>
        <clear />
    </fallbackPackageFolders>
    <packageManagement>
        <add key="format" value="1" />
        <add key="disabled" value="False" />
    </packageManagement>
</configuration>
EOF

    # Also create global NuGet config
    mkdir -p "$HOME/.nuget/NuGet"
    cp NuGet.Config "$HOME/.nuget/NuGet/NuGet.Config"

    # Remove any existing obj/bin directories that might have cached Windows paths
    log "Cleaning build artifacts..."
    rm -rf obj bin 2>/dev/null || true
    find . -name "obj" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "bin" -type d -exec rm -rf {} + 2>/dev/null || true

    # Clean and build
    dotnet clean -c Release || true

    log "Restoring packages for $target_arch..."
    if ! dotnet restore -r $target_arch --no-cache --force --configfile NuGet.Config; then
        log_error "Package restore failed, trying alternative method..."

        # Alternative method: use global tools
        export DOTNET_CLI_TELEMETRY_OPTOUT=1
        export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

        if ! dotnet restore -r $target_arch --no-cache --force --ignore-failed-sources; then
            log_error "Package restore failed completely"
            log "Frontend is still running, but backend update failed"
            return 1
        fi
    fi

    log "Publishing backend..."
    if ! dotnet publish -c Release -r $target_arch --self-contained false --no-restore -o publish --configfile NuGet.Config; then
        log_error "Backend publish failed, trying alternative method..."

        # Try with restore during publish
        if ! dotnet publish -c Release -r $target_arch --self-contained false -o publish --configfile NuGet.Config; then
            log_error "Backend publish failed completely"
            log "Frontend is still running, but backend update failed"
            return 1
        fi
    fi

    chmod +x publish/Backend 2>/dev/null || true

    # Only proceed with backend setup if build succeeded
    if [ -f "publish/Backend.dll" ]; then
        # Setup database with EF tools
        log "Setting up database..."
        export PATH="$PATH:$HOME/.dotnet/tools"
        export DOTNET_ROOT="/usr/share/dotnet"

        # Install EF tools if needed with proper runtime
        if ! command -v dotnet-ef >/dev/null 2>&1; then
            log "Installing Entity Framework tools..."
            dotnet tool install --global dotnet-ef --no-cache
            export PATH="$HOME/.dotnet/tools:$PATH"
        fi

        # Try different approaches for database migration
        log "Running database migrations..."

        # Method 1: Use dotnet ef from the built project
        if dotnet ef database update --no-build 2>/dev/null; then
            log_success "Database migration completed using EF tools"
        # Method 2: Use the built project with restore
        elif dotnet ef database update 2>/dev/null; then
            log_success "Database migration completed with restore"
        # Method 3: Run from published directory
        elif cd publish && dotnet Backend.dll --migrate 2>/dev/null && cd ..; then
            log_success "Database migration completed from published app"
        # Method 4: Check if database exists and skip if migrations not critical
        else
            log_error "Database migration failed, checking database status..."
            if [ -f "ContainmentDb.db" ] || [ -f "../ContainmentDb.db" ] || [ -f "publish/ContainmentDb.db" ]; then
                log "Database file exists, skipping migrations"
            else
                log "Warning: No database found and migration failed"
                log "Backend may not work properly until database is set up"
            fi
        fi

        # Start backend
        log "Starting backend..."
        sudo systemctl daemon-reload
        sudo systemctl start NewContainmentWeb.service
        sudo systemctl enable NewContainmentWeb.service
    else
        log_error "Backend build failed - skipping backend deployment"
        log "Frontend is still running on port 3000"
    fi

    # Wait and verify
    sleep 5

    log "=== Status Check ==="

    local frontend_status="❌ Not running"
    local backend_status="❌ Not running"

    if pm2 list | grep -q "newcontainment-frontend.*online"; then
        frontend_status="✅ Running"
        log_success "Frontend: Running"
    else
        log_error "Frontend: Not running"
    fi

    if sudo systemctl is-active --quiet NewContainmentWeb.service 2>/dev/null; then
        backend_status="✅ Running"
        log_success "Backend: Running"
    else
        log_error "Backend: Not running"
    fi

    server_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

    log "=== Access URLs ==="
    echo "  Frontend ($frontend_status): http://$server_ip:3000"
    echo "  Backend ($backend_status): http://$server_ip:5000"
    echo "  With Nginx: http://$server_ip"

    log "=== Update Summary ==="
    echo "  Git Pull: ✅ Success"
    echo "  Frontend: $frontend_status"
    echo "  Backend: $backend_status"

    if [[ "$frontend_status" == *"Running"* ]]; then
        log_success "Quick update completed! At least frontend is running."
    else
        log_error "Update completed with issues - please check services"
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi