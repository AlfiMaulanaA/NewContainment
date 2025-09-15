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
    git pull --rebase origin main

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

    # Clear NuGet caches to remove Windows paths
    log "Clearing NuGet caches..."
    dotnet nuget locals global-packages --clear 2>/dev/null || true
    dotnet nuget locals temp --clear 2>/dev/null || true
    dotnet nuget locals plugins-cache --clear 2>/dev/null || true

    # Create temporary NuGet.Config to override Windows paths
    cat > nuget.config << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
    <packageSources>
        <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    </packageSources>
    <config>
        <add key="globalPackagesFolder" value="~/.nuget/packages" />
    </config>
    <fallbackPackageFolders>
        <clear />
    </fallbackPackageFolders>
</configuration>
EOF

    # Clean and build
    dotnet clean -c Release || true

    log "Restoring packages for $target_arch..."
    if ! dotnet restore -r $target_arch --no-cache --force; then
        log_error "Package restore failed"
        log "Frontend is still running, but backend update failed"
        return 1
    fi

    log "Publishing backend..."
    if ! dotnet publish -c Release -r $target_arch --self-contained false --no-restore -o publish; then
        log_error "Backend publish failed"
        log "Frontend is still running, but backend update failed"
        return 1
    fi

    chmod +x publish/Backend 2>/dev/null || true

    # Only proceed with backend setup if build succeeded
    if [ -f "publish/Backend.dll" ]; then
        # Setup database with EF tools
        log "Setting up database..."
        export PATH="$PATH:$HOME/.dotnet/tools"

        if ! command -v dotnet-ef >/dev/null 2>&1; then
            dotnet tool install --global dotnet-ef
            export PATH="$HOME/.dotnet/tools:$PATH"
        fi

        dotnet ef database update --no-build || log "Migration warning - continuing..."

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