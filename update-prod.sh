#!/bin/bash

# Quick Production Update Script
# Description: Pull updates and build directly without extensive checks

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/Frontend"
BACKEND_DIR="$PROJECT_ROOT/Backend"
SERVICE_NAME="NewContainmentWeb.service"

# Log function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if service exists
service_exists() {
    systemctl list-unit-files | grep -q "^$SERVICE_NAME"
}

# Function to check if PM2 process exists
pm2_process_exists() {
    pm2 list | grep -q "$1" 2>/dev/null
}

# Function to handle git conflicts intelligently
handle_git_conflicts() {
    log "=== Handling Git Conflicts ==="
    
    # Backup current deploy.sh if it exists and was modified
    if [[ -f "deploy.sh" ]] && [[ -n $(git status --porcelain deploy.sh) ]]; then
        log "Backing up modified deploy.sh..."
        cp deploy.sh deploy.sh.local.backup
        log "Backup saved as deploy.sh.local.backup"
    fi
    
    # Backup any local configuration files
    if [[ -f "appsettings.Local.json" ]]; then
        cp appsettings.Local.json appsettings.Local.json.backup
    fi
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "Uncommitted changes detected:"
        git status --short
        
        # For production updates, we want to keep upstream changes
        log "Stashing local changes and forcing upstream merge..."
        git stash push -m "Auto-stash production local changes $(date)" --include-untracked
        STASHED=1
        
        # Hard reset to ensure clean state
        git reset --hard HEAD
    else
        STASHED=0
    fi
    
    return 0
}

# Function to pull latest changes
pull_updates() {
    log "=== Pulling Latest Changes ==="
    
    # Handle conflicts first
    handle_git_conflicts
    
    # Fetch latest changes
    log "Fetching from origin..."
    if ! git fetch origin main; then
        log_error "Git fetch failed"
        return 1
    fi
    
    # Check if there are updates
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || git rev-parse origin/main)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        log "Already up to date"
        return 0
    fi
    
    # Pull with rebase to avoid merge commits
    log "Pulling latest changes with rebase..."
    if ! git pull --rebase origin main; then
        log_error "Git pull failed. Attempting reset..."
        
        # If rebase fails, force update (this is production)
        log_warning "Force updating to match remote (production override)..."
        git reset --hard origin/main
        
        if [ $? -eq 0 ]; then
            log_success "Successfully updated to latest version"
        else
            log_error "Failed to update repository"
            return 1
        fi
    fi
    
    # Restore any critical local configurations
    if [[ -f "deploy.sh.local.backup" ]]; then
        log "Local deploy.sh modifications detected. Manual review may be needed."
        echo "  Backup: deploy.sh.local.backup"
        echo "  Current: deploy.sh"
        echo "  Use 'diff deploy.sh.local.backup deploy.sh' to compare"
    fi
    
    log_success "Git pull completed"
    return 0
}

# Function to fix NuGet configuration for Linux
fix_nuget_linux() {
    log "=== Fixing NuGet Configuration for Linux ==="
    cd "$BACKEND_DIR"
    
    # Clear NuGet caches to remove Windows paths
    log "Clearing NuGet caches..."
    dotnet nuget locals global-packages --clear 2>/dev/null || true
    dotnet nuget locals temp --clear 2>/dev/null || true
    dotnet nuget locals plugins-cache --clear 2>/dev/null || true
    
    # Set Linux-specific NuGet environment variables
    log "Setting Linux NuGet environment..."
    export NUGET_PACKAGES="$HOME/.nuget/packages"
    export NUGET_FALLBACK_PACKAGES=""
    export NUGET_HTTP_CACHE_PATH="$HOME/.local/share/NuGet/v3-cache"
    
    # Create directories if they don't exist
    mkdir -p "$NUGET_PACKAGES"
    mkdir -p "$HOME/.local/share/NuGet/v3-cache"
    
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

    log_success "NuGet Linux configuration applied"
    cd "$PROJECT_ROOT"
}

# Function to detect system architecture
detect_architecture() {
    local arch=$(uname -m)
    case $arch in
        x86_64)
            echo "linux-x64"
            ;;
        aarch64|arm64)
            echo "linux-arm64"
            ;;
        armv7l)
            echo "linux-arm"
            ;;
        *)
            log_error "Unsupported architecture: $arch"
            echo "linux-x64"  # fallback
            ;;
    esac
}

# Function to handle database updates
handle_database_updates() {
    log "=== Handling Database Updates ==="
    cd "$BACKEND_DIR"
    
    # Backup existing database
    if [ -f "app.db" ]; then
        local backup_name="app.db.backup.$(date +%Y%m%d_%H%M%S)"
        log "Backing up database to $backup_name..."
        cp app.db "$backup_name"
    fi
    
    # Check if migrations need to be run
    if git diff HEAD~1 --name-only | grep -E "(Migrations/|Models/|Data/)" > /dev/null; then
        log "Database-related changes detected. Running migrations..."
        
        # Install EF tools if not available
        if ! dotnet tool list -g | grep -q "dotnet-ef"; then
            log "Installing Entity Framework tools..."
            dotnet tool install --global dotnet-ef
        fi
        
        # Run migrations
        if dotnet ef database update --no-build; then
            log_success "Database migrations completed"
        else
            log_warning "Database migrations failed, but continuing..."
        fi
    else
        log "No database changes detected"
    fi
    
    cd "$PROJECT_ROOT"
    return 0
}

# Function to check if .NET is available
check_dotnet() {
    if command -v dotnet >/dev/null 2>&1; then
        local dotnet_version=$(dotnet --version)
        log_success ".NET $dotnet_version is available"
        return 0
    else
        log_error ".NET SDK not found"
        return 1
    fi
}

# Function to check if Node.js and npm are available
check_nodejs() {
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        local node_version=$(node --version)
        local npm_version=$(npm --version)
        log_success "Node.js $node_version and npm $npm_version are available"
        return 0
    else
        log_error "Node.js or npm not found"
        return 1
    fi
}

# Function to update backend
update_backend() {
    log "=== Updating Backend ==="
    
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        return 1
    fi
    
    # Check if .NET is available
    if ! check_dotnet; then
        log_warning "Skipping backend update - .NET SDK not available"
        log "To update backend later:"
        log "1. Install .NET SDK"
        log "2. Re-run this script"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Stop backend service if running
    if service_exists; then
        log "Stopping backend service..."
        sudo systemctl stop "$SERVICE_NAME" || log_warning "Service was not running"
    fi
    
    # Handle database updates before building
    handle_database_updates
    
    # Fix ownership issues
    log "Fixing ownership issues..."
    sudo chown -R $(whoami):$(whoami) . 2>/dev/null || log_warning "Could not change ownership"
    
    # Clean previous builds (but preserve database)
    log "Cleaning previous builds..."
    rm -rf bin obj
    if [ -d "publish" ]; then
        # Preserve database file during clean
        if [ -f "publish/app.db" ]; then
            mv publish/app.db app.db.temp
        fi
        rm -rf publish
        if [ -f "app.db.temp" ]; then
            mkdir -p publish
            mv app.db.temp publish/app.db
        fi
    fi
    
    # Detect target architecture
    local target_arch=$(detect_architecture)
    log "Building for architecture: $target_arch"
    
    # Fix NuGet configuration before building
    fix_nuget_linux
    
    # Restore packages with Linux configuration
    log "Restoring packages with Linux configuration..."
    if ! dotnet restore --no-cache --force; then
        log_error "Package restore failed"
        return 1
    fi
    
    # Build and publish with correct architecture
    log "Building and publishing backend..."
    dotnet clean -c Release
    if ! dotnet publish -c Release -r $target_arch --no-self-contained --no-restore -o publish; then
        log_error "Backend publish failed"
        return 1
    fi
    
    # Set executable permissions
    log "Setting executable permissions..."
    chmod +x publish/Backend 2>/dev/null || true
    
    # Ensure database is in the right place
    if [ -f "app.db" ] && [ ! -f "publish/app.db" ]; then
        log "Moving database to publish directory..."
        cp app.db publish/
    fi
    
    log_success "Backend updated successfully"
    cd "$PROJECT_ROOT"
    return 0
}

# Function to update frontend
update_frontend() {
    log "=== Updating Frontend ==="
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        return 1
    fi
    
    # Check if Node.js is available
    if ! check_nodejs; then
        log_warning "Skipping frontend update - Node.js/npm not available"
        log "To update frontend later:"
        log "1. Install Node.js and npm"
        log "2. Re-run this script"
        return 1
    fi
    
    # Check if PM2 is available
    if ! command -v pm2 >/dev/null 2>&1; then
        log_warning "PM2 not found - required for frontend deployment"
        log "Install PM2: npm install -g pm2"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Stop PM2 process if running
    if pm2_process_exists "newcontainment-frontend"; then
        log "Stopping frontend PM2 process..."
        pm2 stop newcontainment-frontend || log_warning "PM2 process was not running"
    fi
    
    # Check if package.json was updated
    if git diff HEAD~1 --name-only | grep -q "package.json"; then
        log "Package.json changed. Updating dependencies..."
        if ! npm install; then
            log_warning "Failed to install frontend dependencies"
            cd "$PROJECT_ROOT"
            return 1
        fi
    else
        log "No package.json changes detected"
    fi
    
    # Build frontend
    log "Building frontend..."
    if ! npm run build; then
        log_warning "Frontend build failed"
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    log_success "Frontend updated successfully"
    cd "$PROJECT_ROOT"
    return 0
}

# Function to restart services
restart_services() {
    restart_services_selective true true
}

# Function to check PM2 status
check_pm2_status() {
    local process_name="$1"
    if pm2 list 2>/dev/null | grep -q "$process_name"; then
        if pm2 list 2>/dev/null | grep -q "$process_name.*online"; then
            log_success "PM2 process '$process_name' is running"
            return 0
        elif pm2 list 2>/dev/null | grep -q "$process_name.*stopped"; then
            log_warning "PM2 process '$process_name' is stopped"
            return 1
        else
            log_warning "PM2 process '$process_name' is in unknown state"
            return 2
        fi
    else
        log_warning "PM2 process '$process_name' not found"
        return 3
    fi
}

# Function to start or restart PM2 process
manage_pm2_process() {
    local process_name="$1"
    local action="$2"  # start, restart, or stop
    
    case $action in
        "start")
            if check_pm2_status "$process_name"; then
                log "PM2 process '$process_name' is already running"
                return 0
            else
                log "Starting PM2 process '$process_name'..."
                if pm2 start "$process_name" 2>/dev/null; then
                    log_success "PM2 process '$process_name' started"
                    return 0
                else
                    log_error "Failed to start PM2 process '$process_name'"
                    return 1
                fi
            fi
            ;;
        "restart")
            log "Restarting PM2 process '$process_name'..."
            if pm2 restart "$process_name" 2>/dev/null; then
                log_success "PM2 process '$process_name' restarted"
                return 0
            else
                log_error "Failed to restart PM2 process '$process_name'"
                return 1
            fi
            ;;
        "stop")
            log "Stopping PM2 process '$process_name'..."
            if pm2 stop "$process_name" 2>/dev/null; then
                log_success "PM2 process '$process_name' stopped"
                return 0
            else
                log_error "Failed to stop PM2 process '$process_name'"
                return 1
            fi
            ;;
        *)
            log_error "Invalid PM2 action: $action"
            return 1
            ;;
    esac
}

# Function to restart services selectively
restart_services_selective() {
    local backend_updated=$1
    local frontend_updated=$2
    
    log "=== Restarting Services ==="
    log "Backend updated: $backend_updated"
    log "Frontend updated: $frontend_updated"
    
    local services_restarted=false
    
    # Restart backend only if it was updated
    if [ "$backend_updated" = true ]; then
        restart_backend_service
        if [ $? -eq 0 ]; then
            services_restarted=true
        fi
    else
        log "Skipping backend service restart - not updated"
        # Still check if backend service is running
        if systemctl is-enabled --quiet NewContainmentWeb.service 2>/dev/null; then
            if ! systemctl is-active --quiet NewContainmentWeb.service; then
                log_warning "Backend service is not running, starting it..."
                sudo systemctl start NewContainmentWeb.service
            fi
        fi
    fi
    
    # Restart frontend only if it was updated
    if [ "$frontend_updated" = true ]; then
        restart_frontend_service
        if [ $? -eq 0 ]; then
            services_restarted=true
        fi
    else
        log "Skipping frontend service restart - not updated"
        # Still check if frontend PM2 process is running
        if ! check_pm2_status "newcontainment-frontend"; then
            log_warning "Frontend PM2 process not running properly, attempting to start..."
            manage_pm2_process "newcontainment-frontend" "start"
        fi
    fi
    
    if [ "$services_restarted" = true ]; then
        log_success "Services restarted successfully"
        return 0
    else
        log_warning "No services were restarted, but status checked"
        return 0  # Don't fail if services are already running
    fi
}

# Function to restart backend service
restart_backend_service() {
    log "Restarting backend service..."
    
    # Start backend service
    if service_exists; then
        log "Starting backend service..."
        sudo systemctl start "$SERVICE_NAME"
        sleep 5
        
        if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
            log_success "Backend service started successfully"
            
            # Health check
            log "Performing backend health check..."
            local backend_ready=false
            for i in {1..15}; do
                if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
                    backend_ready=true
                    break
                fi
                sleep 2
            done
            
            if [ "$backend_ready" = true ]; then
                log_success "Backend health check passed"
                return 0
            else
                log_warning "Backend health check failed, but service is running"
                return 1
            fi
        else
            log_error "Backend service failed to start"
            sudo journalctl -u "$SERVICE_NAME" --no-pager -n 20
            return 1
        fi
    else
        log_warning "Backend service not found. Please install it first using deploy.sh"
        return 1
    fi
}

# Function to restart frontend service
restart_frontend_service() {
    log "Restarting frontend service..."
    
    # Start frontend PM2 process
    cd "$FRONTEND_DIR"
    
    log "Stopping existing PM2 processes..."
    pm2 delete newcontainment-frontend 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    
    # Create PM2 ecosystem file for better control
    log "Creating PM2 configuration..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'newcontainment-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      error_file: '/var/log/pm2/newcontainment-frontend-error.log',
      out_file: '/var/log/pm2/newcontainment-frontend-out.log',
      log_file: '/var/log/pm2/newcontainment-frontend.log',
      time: true
    }
  ]
};
EOF
    
    # Ensure log directory exists
    sudo mkdir -p /var/log/pm2
    sudo chown $(whoami):$(whoami) /var/log/pm2 2>/dev/null || true
    
    log "Starting frontend with PM2 using ecosystem config..."
    pm2 start ecosystem.config.js
    pm2 save
    
    log "Waiting for frontend to start..."
    sleep 8
    
    # Verify frontend is running and accessible
    local frontend_running=false
    for i in {1..10}; do
        if pm2 list | grep -q "newcontainment-frontend.*online"; then
            log "PM2 process is online, checking port accessibility..."
            
            # Check if port 3000 is actually listening
            if netstat -tuln | grep -q ":3000"; then
                log_success "Frontend is accessible on port 3000"
                frontend_running=true
                break
            else
                log_warning "Port 3000 not listening yet, waiting..."
            fi
        fi
        sleep 2
    done
    
    if [ "$frontend_running" = false ]; then
        log_error "Frontend failed to start properly"
        log "PM2 Status:"
        pm2 list
        log "PM2 Logs:"
        pm2 logs newcontainment-frontend --lines 20
        log "Port Status:"
        netstat -tuln | grep ":3000" || log "Port 3000 not listening"
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    log_success "Frontend service restarted successfully"
    cd "$PROJECT_ROOT"
    return 0
}

# Function to show status
show_status() {
    log "=== Production Update Status ==="
    
    echo ""
    log "Git Information:"
    echo "  Current commit: $(git rev-parse --short HEAD)"
    echo "  Current branch: $(git branch --show-current)"
    echo "  Last commit: $(git log -1 --format='%h - %s (%ar)')"
    
    local status_output=$(git status --short)
    if [[ -n "$status_output" ]]; then
        echo "  Uncommitted changes:"
        git status --short | sed 's/^/    /'
    else
        echo "  Working directory: Clean"
    fi
    
    echo ""
    log "Backend Service Status:"
    if service_exists; then
        if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
            echo "  Status: ✓ Running"
            echo "  Started: $(systemctl show "$SERVICE_NAME" --property=ActiveEnterTimestamp --value)"
        else
            echo "  Status: ✗ Not running"
        fi
        echo "  Logs: sudo journalctl -u $SERVICE_NAME -f"
    else
        echo "  Status: ✗ Service not installed"
    fi
    
    echo ""
    log "Frontend PM2 Status:"
    if pm2_process_exists "newcontainment-frontend"; then
        pm2 describe newcontainment-frontend | grep -E "(status|uptime|memory|cpu)" | sed 's/^/  /'
    else
        echo "  Status: ✗ Not running"
    fi
    echo "  Logs: pm2 logs newcontainment-frontend"
    
    echo ""
    log "Database Status:"
    if [ -f "$BACKEND_DIR/app.db" ]; then
        local db_size=$(du -h "$BACKEND_DIR/app.db" | cut -f1)
        echo "  Database file: $BACKEND_DIR/app.db ($db_size)"
        if command -v sqlite3 >/dev/null 2>&1; then
            local table_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
            local user_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM Users;" 2>/dev/null || echo "0")
            echo "  Tables: $table_count | Users: $user_count"
        fi
    elif [ -f "$BACKEND_DIR/publish/app.db" ]; then
        local db_size=$(du -h "$BACKEND_DIR/publish/app.db" | cut -f1)
        echo "  Database file: $BACKEND_DIR/publish/app.db ($db_size)"
    else
        echo "  Database: ✗ Not found"
    fi
    
    echo ""
    log "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:5000"
    echo "  Backend Swagger: http://localhost:5000/swagger"
    echo "  Backend Health: http://localhost:5000/api/health"
    
    echo ""
    log "System Information:"
    echo "  Architecture: $(detect_architecture)"
    echo "  Update time: $(date)"
    echo "  Uptime: $(uptime -p)"
    
    echo ""
    log "Useful Commands:"
    echo "  Restart backend: sudo systemctl restart $SERVICE_NAME"
    echo "  Restart frontend: pm2 restart newcontainment-frontend"
    echo "  View all logs: sudo journalctl -u $SERVICE_NAME -f & pm2 logs newcontainment-frontend"
    echo "  Re-run full deploy: sudo ./deploy.sh"
    
    echo ""
    if [[ -f "deploy.sh.local.backup" ]]; then
        log_warning "Local modifications were found and backed up:"
        echo "  • deploy.sh.local.backup contains your local changes"
        echo "  • Current deploy.sh contains upstream changes"
        echo "  • Review differences: diff deploy.sh.local.backup deploy.sh"
        echo "  • Merge manually if needed"
    fi
    
    echo ""
    log_success "Production update completed successfully!"
}

# Function to create backup
create_backup() {
    log "=== Creating Backup ==="
    
    BACKUP_DIR="/tmp/newcontainment-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup current publish directory
    if [ -d "$BACKEND_DIR/publish" ]; then
        log "Backing up current backend..."
        cp -r "$BACKEND_DIR/publish" "$BACKUP_DIR/backend-publish"
    fi
    
    # Backup frontend build
    if [ -d "$FRONTEND_DIR/.next" ]; then
        log "Backing up current frontend..."
        cp -r "$FRONTEND_DIR/.next" "$BACKUP_DIR/frontend-build"
    fi
    
    log "Backup created at: $BACKUP_DIR"
    echo "To restore if needed:"
    echo "  Backend: cp -r $BACKUP_DIR/backend-publish $BACKEND_DIR/publish"
    echo "  Frontend: cp -r $BACKUP_DIR/frontend-build $FRONTEND_DIR/.next"
}

# Function to verify environment
verify_environment() {
    log "=== Verifying Environment ==="
    
    local missing_commands=()
    local error_count=0
    
    # Check if running as correct user
    if [[ "$USER" != "containment" ]] && [[ "$USER" != "root" ]]; then
        log_warning "Not running as expected user (containment). Current user: $USER"
    fi
    
    # Check critical commands (git is always required)
    if ! command -v git >/dev/null 2>&1; then
        log_error "Required command not found: git"
        missing_commands+=("git")
        ((error_count++))
    fi
    
    # Check optional commands but warn if missing
    local optional_commands=("dotnet" "node" "npm" "pm2")
    for cmd in "${optional_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_warning "Optional command not found: $cmd (may limit deployment capabilities)"
        fi
    done
    
    # Check write permissions
    if [ ! -w "$PROJECT_ROOT" ]; then
        log_error "No write permission to project directory"
        ((error_count++))
    fi
    
    if [ $error_count -gt 0 ]; then
        log_error "Environment verification failed with $error_count critical errors"
        log_error "Missing critical commands: ${missing_commands[*]}"
        log_error "Please install missing dependencies and try again"
        return 1
    fi
    
    log_success "Environment verification passed (some optional dependencies may be missing)"
    return 0
}

# Main function
main() {
    log "=== NewContainment Production Update Script ==="
    log "Project Root: $PROJECT_ROOT"
    log "Current User: $USER"
    echo ""
    
    # Verify environment
    if ! verify_environment; then
        log_error "Environment verification failed. Please fix issues and try again."
        exit 1
    fi
    
    # Create backup before update
    create_backup
    
    # Step 1: Pull latest changes
    if ! pull_updates; then
        log_error "Failed to pull updates"
        exit 1
    fi
    
    # Initialize update status flags
    local backend_updated=false
    local frontend_updated=false
    
    # Step 2: Update backend (with error handling)
    if update_backend; then
        backend_updated=true
        log_success "Backend updated successfully"
    else
        log_warning "Backend update failed - continuing with frontend if possible"
    fi
    
    # Step 3: Update frontend (with error handling)
    if update_frontend; then
        frontend_updated=true
        log_success "Frontend updated successfully"
    else
        log_warning "Frontend update failed - continuing with backend if updated"
    fi
    
    # Check if at least one component was updated
    if [ "$backend_updated" = false ] && [ "$frontend_updated" = false ]; then
        log_error "Both backend and frontend updates failed"
        log_error "Please fix the issues and try again"
        exit 1
    fi
    
    # Step 4: Restart services (only restart what was updated)
    if ! restart_services_selective "$backend_updated" "$frontend_updated"; then
        log_error "Failed to restart some services, but update completed"
        log_warning "Please check service status manually"
    fi
    
    # Step 5: Show status
    show_status
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi