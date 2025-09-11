#!/bin/bash

# NewContainment Production Update Script
# Author: Claude Code Assistant  
# Description: Pull updates, rebuild, and restart production server

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

# Function to update backend
update_backend() {
    log "=== Updating Backend ==="
    
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
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
    
    # Restore packages
    log "Restoring packages..."
    if ! dotnet restore; then
        log_error "Failed to restore packages"
        return 1
    fi
    
    # Build and publish with correct architecture
    log "Building and publishing backend..."
    dotnet clean -c Release
    if ! dotnet publish -c Release -r $target_arch --no-self-contained -o publish; then
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
    log "=== Restarting Services ==="
    
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
            else
                log_warning "Backend health check failed, but service is running"
            fi
        else
            log_error "Backend service failed to start"
            sudo journalctl -u "$SERVICE_NAME" --no-pager -n 20
            return 1
        fi
    else
        log_warning "Backend service not found. Please install it first using deploy.sh"
    fi
    
    # Start frontend PM2 process
    cd "$FRONTEND_DIR"
    if pm2_process_exists "newcontainment-frontend"; then
        log "Restarting frontend PM2 process..."
        pm2 restart newcontainment-frontend
    else
        log "Starting new frontend PM2 process..."
        pm2 start npm --name "newcontainment-frontend" -- start -- --port 3000
    fi
    
    # Save PM2 configuration
    pm2 save
    
    # Wait for frontend to start
    sleep 3
    
    # Frontend health check
    log "Performing frontend health check..."
    local frontend_ready=false
    for i in {1..10}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            frontend_ready=true
            break
        fi
        sleep 2
    done
    
    if [ "$frontend_ready" = true ]; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed"
    fi
    
    log_success "Services restarted successfully"
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
    
    local errors=0
    
    # Check if running as correct user
    if [[ "$USER" != "containment" ]] && [[ "$USER" != "root" ]]; then
        log_warning "Not running as expected user (containment). Current user: $USER"
    fi
    
    # Check required commands
    for cmd in git dotnet npm pm2; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_error "Required command not found: $cmd"
            errors=$((errors + 1))
        fi
    done
    
    # Check write permissions
    if [ ! -w "$PROJECT_ROOT" ]; then
        log_error "No write permission to project directory"
        errors=$((errors + 1))
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "Environment verification passed"
        return 0
    else
        log_error "Environment verification failed with $errors errors"
        return 1
    fi
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
    
    # Step 2: Update backend
    if ! update_backend; then
        log_error "Failed to update backend"
        exit 1
    fi
    
    # Step 3: Update frontend
    if ! update_frontend; then
        log_error "Failed to update frontend"
        exit 1
    fi
    
    # Step 4: Restart services
    if ! restart_services; then
        log_error "Failed to restart services"
        exit 1
    fi
    
    # Step 5: Show status
    show_status
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi