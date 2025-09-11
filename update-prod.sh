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

# Function to pull latest changes
pull_updates() {
    log "=== Pulling Latest Changes ==="
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "Uncommitted changes detected. Stashing them..."
        git stash push -m "Auto-stash before update on $(date)"
        STASHED=1
    else
        STASHED=0
    fi
    
    # Pull latest changes
    log "Pulling from origin main..."
    if ! git pull origin main; then
        log_error "Git pull failed"
        if [[ $STASHED -eq 1 ]]; then
            log "Restoring stashed changes..."
            git stash pop
        fi
        return 1
    fi
    
    # Restore stashed changes if any
    if [[ $STASHED -eq 1 ]]; then
        log "Restoring stashed changes..."
        if ! git stash pop; then
            log_warning "Failed to restore stashed changes. Check manually."
        fi
    fi
    
    log_success "Git pull completed"
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
    
    # Fix ownership issues
    log "Fixing ownership issues..."
    sudo chown -R $(whoami):$(whoami) . || log_warning "Could not change ownership"
    
    # Clean previous builds
    log "Cleaning previous builds..."
    rm -rf bin obj publish
    
    # Restore packages
    log "Restoring packages..."
    if ! dotnet restore; then
        log_error "Failed to restore packages"
        return 1
    fi
    
    # Build and publish
    log "Building and publishing backend..."
    if ! dotnet publish -c Release -r linux-x64 --self-contained true -o publish; then
        log_error "Backend publish failed"
        return 1
    fi
    
    # Set executable permissions
    log "Setting executable permissions..."
    chmod +x publish/Backend
    
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
        sleep 3
        
        if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
            log_success "Backend service started successfully"
        else
            log_error "Backend service failed to start"
            sudo systemctl status "$SERVICE_NAME" --no-pager
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
    
    log_success "Services restarted successfully"
    cd "$PROJECT_ROOT"
    return 0
}

# Function to show status
show_status() {
    log "=== Production Status ==="
    
    echo ""
    log "Git Status:"
    git status --short
    
    echo ""
    log "Backend Service Status:"
    if service_exists; then
        sudo systemctl status "$SERVICE_NAME" --no-pager | head -10
    else
        echo "  Service not installed"
    fi
    
    echo ""
    log "Frontend PM2 Status:"
    pm2 list | grep -E "(App name|newcontainment-frontend)" || echo "  No PM2 processes found"
    
    echo ""
    log "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:5000"
    echo "  Backend Swagger: http://localhost:5000/swagger"
    
    echo ""
    log_success "Production update completed!"
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