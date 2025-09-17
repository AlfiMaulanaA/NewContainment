#!/bin/bash

# IoT Containment System - GitHub Pull and Deploy Script
# This script pulls latest code from GitHub, builds frontend/backend, and restarts services

set -e

REPO_URL="https://github.com/AlfiMaulanaA/NewContainment.git"
PROJECT_DIR="/opt/NewContainment"
CURRENT_DIR=$(pwd)
LOG_FILE="/var/log/containment_deploy.log"
BACKUP_DIR="/opt/containment_backups/$(date +%Y%m%d_%H%M%S)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  IoT Containment Deployment Script${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    log_message "SUCCESS: $1"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    log_message "ERROR: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    log_message "WARNING: $1"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
    log_message "INFO: $1"
}

check_dependencies() {
    print_info "Checking dependencies..."

    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install git first."
        exit 1
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "NPM is not installed. Please install Node.js and NPM first."
        exit 1
    fi

    # Check if dotnet is installed
    if ! command -v dotnet &> /dev/null; then
        print_error ".NET is not installed. Please install .NET first."
        exit 1
    fi

    # Check if pm2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 is not installed. Installing PM2..."
        npm install -g pm2 >> "$LOG_FILE" 2>&1
        print_success "PM2 installed successfully"
    fi

    print_success "All dependencies are available"
}

create_backup() {
    print_info "Creating backup of current installation..."

    if [[ -d "$PROJECT_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        cp -r "$PROJECT_DIR" "$BACKUP_DIR/" >> "$LOG_FILE" 2>&1
        print_success "Backup created at: $BACKUP_DIR"
    else
        print_warning "No existing installation found to backup"
    fi
}

stop_services() {
    print_info "Stopping services..."

    # Stop PM2 processes
    pm2 stop all || print_warning "No PM2 processes to stop"

    # Stop backend service if running as systemd service
    if systemctl is-active --quiet containment-backend 2>/dev/null; then
        sudo systemctl stop containment-backend
        print_success "Backend service stopped"
    fi

    print_success "Services stopped"
}

pull_from_github() {
    print_info "Pulling latest code from GitHub..."

    if [[ -d "$PROJECT_DIR" ]]; then
        cd "$PROJECT_DIR"

        # Stash any local changes
        git stash push -m "Auto-stash before deployment $(date)" >> "$LOG_FILE" 2>&1 || true

        # Reset to clean state
        git reset --hard HEAD >> "$LOG_FILE" 2>&1

        # Pull latest changes
        git pull origin main >> "$LOG_FILE" 2>&1

        print_success "Code pulled from GitHub successfully"
    else
        print_info "Cloning repository for the first time..."
        mkdir -p "$(dirname "$PROJECT_DIR")"
        git clone "$REPO_URL" "$PROJECT_DIR" >> "$LOG_FILE" 2>&1
        cd "$PROJECT_DIR"
        print_success "Repository cloned successfully"
    fi
}

build_frontend() {
    print_info "Building frontend..."

    cd "$PROJECT_DIR/Frontend"

    # Install dependencies
    print_info "Installing frontend dependencies..."
    npm install >> "$LOG_FILE" 2>&1

    # Run linting
    print_info "Running frontend linting..."
    npm run lint >> "$LOG_FILE" 2>&1 || print_warning "Linting completed with warnings"

    # Build frontend
    print_info "Building frontend for production..."
    npm run build >> "$LOG_FILE" 2>&1

    print_success "Frontend built successfully"
}

build_backend() {
    print_info "Building backend..."

    cd "$PROJECT_DIR/Backend"

    # Restore packages
    print_info "Restoring backend packages..."
    dotnet restore >> "$LOG_FILE" 2>&1

    # Build backend
    print_info "Building backend..."
    dotnet build --configuration Release >> "$LOG_FILE" 2>&1

    # Run database migrations
    print_info "Running database migrations..."
    dotnet ef database update >> "$LOG_FILE" 2>&1 || print_warning "No migrations to apply"

    print_success "Backend built successfully"
}

start_frontend() {
    print_info "Starting frontend with PM2..."

    cd "$PROJECT_DIR/Frontend"

    # Create PM2 ecosystem file if it doesn't exist
    if [[ ! -f "ecosystem.config.js" ]]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'containment-frontend',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/containment-frontend-error.log',
    out_file: '/var/log/pm2/containment-frontend-out.log',
    log_file: '/var/log/pm2/containment-frontend-combined.log',
    time: true
  }]
};
EOF
    fi

    # Start or restart frontend with PM2
    pm2 delete containment-frontend 2>/dev/null || true
    pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1
    pm2 save >> "$LOG_FILE" 2>&1

    print_success "Frontend started with PM2"
}

start_backend() {
    print_info "Starting backend..."

    cd "$PROJECT_DIR/Backend"

    # Create systemd service if it doesn't exist
    if [[ ! -f "/etc/systemd/system/containment-backend.service" ]]; then
        sudo tee /etc/systemd/system/containment-backend.service > /dev/null << EOF
[Unit]
Description=IoT Containment Backend
After=network.target

[Service]
Type=notify
WorkingDirectory=$PROJECT_DIR/Backend
ExecStart=/usr/bin/dotnet $PROJECT_DIR/Backend/bin/Release/net9.0/Backend.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=containment-backend
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable containment-backend
        print_success "Backend service created"
    fi

    # Start backend service
    sudo systemctl start containment-backend

    # Wait a moment and check if service started successfully
    sleep 3
    if sudo systemctl is-active --quiet containment-backend; then
        print_success "Backend service started successfully"
    else
        print_error "Backend service failed to start"
        sudo systemctl status containment-backend
        exit 1
    fi
}

verify_deployment() {
    print_info "Verifying deployment..."

    # Check frontend
    if pm2 list | grep -q "containment-frontend.*online"; then
        print_success "Frontend is running"
    else
        print_error "Frontend is not running properly"
    fi

    # Check backend
    if sudo systemctl is-active --quiet containment-backend; then
        print_success "Backend is running"
    else
        print_error "Backend is not running properly"
    fi

    # Test frontend endpoint
    sleep 5
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Frontend endpoint is responding"
    else
        print_warning "Frontend endpoint is not responding (this might be normal during startup)"
    fi

    # Test backend endpoint
    if curl -s http://localhost:5000/health > /dev/null; then
        print_success "Backend endpoint is responding"
    else
        print_warning "Backend endpoint is not responding (check if health endpoint exists)"
    fi
}

show_status() {
    print_info "Deployment Status:"
    echo ""

    # PM2 status
    echo "Frontend (PM2) Status:"
    pm2 list | grep containment || echo "No containment processes found"
    echo ""

    # Backend service status
    echo "Backend Service Status:"
    sudo systemctl status containment-backend --no-pager -l || echo "Backend service not found"
    echo ""

    # System info
    print_info "System Information:"
    echo "  - Project Directory: $PROJECT_DIR"
    echo "  - Frontend URL: http://$(hostname -I | awk '{print $1}'):3000"
    echo "  - Backend URL: http://$(hostname -I | awk '{print $1}'):5000"
    echo "  - Deployment Log: $LOG_FILE"
    echo "  - Latest Backup: $BACKUP_DIR"
}

rollback() {
    print_warning "Rolling back to previous version..."

    if [[ -d "$BACKUP_DIR" ]]; then
        stop_services
        rm -rf "$PROJECT_DIR"
        cp -r "$BACKUP_DIR/NewContainment" "$PROJECT_DIR"
        build_frontend
        build_backend
        start_frontend
        start_backend
        print_success "Rollback completed"
    else
        print_error "No backup found for rollback"
        exit 1
    fi
}

cleanup() {
    print_info "Cleaning up..."

    # Clean old backups (keep last 5)
    if [[ -d "/opt/containment_backups" ]]; then
        cd /opt/containment_backups
        ls -t | tail -n +6 | xargs -r rm -rf
        print_success "Old backups cleaned"
    fi

    # Clean npm cache
    npm cache clean --force >> "$LOG_FILE" 2>&1 || true

    print_success "Cleanup completed"
}

main() {
    # Create log file and backup directory
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "/opt/containment_backups"
    touch "$LOG_FILE"

    print_header
    log_message "Deployment script started"

    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            create_backup
            stop_services
            pull_from_github
            build_frontend
            build_backend
            start_frontend
            start_backend
            verify_deployment
            cleanup
            show_status
            print_success "Deployment completed successfully!"
            ;;
        "status")
            show_status
            ;;
        "rollback")
            rollback
            ;;
        "restart")
            print_info "Restarting services..."
            pm2 restart all
            sudo systemctl restart containment-backend
            verify_deployment
            print_success "Services restarted"
            ;;
        "logs")
            echo "Frontend logs (PM2):"
            pm2 logs containment-frontend --lines 20
            echo ""
            echo "Backend logs (systemd):"
            sudo journalctl -u containment-backend --lines 20 --no-pager
            ;;
        *)
            echo "Usage: $0 {deploy|status|rollback|restart|logs}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Pull from GitHub and deploy (default)"
            echo "  status   - Show deployment status"
            echo "  rollback - Rollback to previous version"
            echo "  restart  - Restart services"
            echo "  logs     - Show application logs"
            exit 1
            ;;
    esac

    log_message "Deployment script completed"
}

# Handle script interruption
trap 'print_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"