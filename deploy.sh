#!/bin/bash

# NewContainment Deployment Script
# Author: Claude Code Assistant
# Description: Automated deployment script for NewContainment IoT System

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
SERVICE_FILE="$PROJECT_ROOT/NewContainmentWeb.service"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js installation
check_nodejs() {
    log "Checking Node.js installation..."
    if command_exists node && command_exists npm; then
        NODE_VERSION=$(node --version)
        NPM_VERSION=$(npm --version)
        log_success "Node.js $NODE_VERSION and npm $NPM_VERSION are installed"
        return 0
    else
        log_error "Node.js or npm not found"
        return 1
    fi
}

# Function to install Node.js
install_nodejs() {
    log "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log_success "Node.js installed successfully"
}

# Function to check .NET 9 installation
check_dotnet() {
    log "Checking .NET 9 installation..."
    if command_exists dotnet; then
        DOTNET_VERSION=$(dotnet --version)
        if [[ $DOTNET_VERSION == 9.* ]]; then
            log_success ".NET $DOTNET_VERSION is installed"
            return 0
        else
            log_warning ".NET version $DOTNET_VERSION found, but .NET 9 required"
            return 1
        fi
    else
        log_error ".NET not found"
        return 1
    fi
}

# Function to install .NET 9
install_dotnet() {
    log "Installing .NET 9..."
    wget https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
    sudo dpkg -i packages-microsoft-prod.deb
    rm packages-microsoft-prod.deb
    sudo apt-get update
    sudo apt-get install -y dotnet-sdk-9.0
    log_success ".NET 9 installed successfully"
}

# Function to check Nginx installation
check_nginx() {
    log "Checking Nginx installation..."
    if command_exists nginx; then
        NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9.]*')
        log_success "Nginx $NGINX_VERSION is installed"
        return 0
    else
        log_error "Nginx not found"
        return 1
    fi
}

# Function to install Nginx
install_nginx() {
    log "Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    log_success "Nginx installed and started successfully"
}

# Function to check PM2 installation
check_pm2() {
    log "Checking PM2 installation..."
    if command_exists pm2; then
        PM2_VERSION=$(pm2 --version)
        log_success "PM2 $PM2_VERSION is installed"
        return 0
    else
        log_error "PM2 not found"
        return 1
    fi
}

# Function to install PM2
install_pm2() {
    log "Installing PM2..."
    sudo npm install -g pm2
    # Setup PM2 startup script
    pm2 startup
    log_success "PM2 installed successfully"
}

# Function to check all dependencies
check_dependencies() {
    log "=== Checking Dependencies ==="
    
    local missing_deps=()
    
    if ! check_nodejs; then
        missing_deps+=("nodejs")
    fi
    
    if ! check_dotnet; then
        missing_deps+=("dotnet")
    fi
    
    if ! check_nginx; then
        missing_deps+=("nginx")
    fi
    
    if ! check_pm2; then
        missing_deps+=("pm2")
    fi
    
    if [ ${#missing_deps[@]} -eq 0 ]; then
        log_success "All dependencies are installed"
        return 0
    else
        log_warning "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
}

# Function to install missing dependencies
install_dependencies() {
    log "=== Installing Missing Dependencies ==="
    
    # Update package list
    sudo apt-get update
    
    if ! check_nodejs; then
        install_nodejs
    fi
    
    if ! check_dotnet; then
        install_dotnet
    fi
    
    if ! check_nginx; then
        install_nginx
    fi
    
    if ! check_pm2; then
        install_pm2
    fi
}

# Function to build and deploy frontend
deploy_frontend() {
    log "=== Deploying Frontend ==="
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    cd "$FRONTEND_DIR"
    
    log "Installing frontend dependencies..."
    npm install
    
    log "Building frontend..."
    npm run build
    
    log "Stopping existing PM2 processes..."
    pm2 delete newcontainment-frontend 2>/dev/null || true
    
    log "Starting frontend with PM2..."
    pm2 start npm --name "newcontainment-frontend" -- start
    pm2 save
    
    log_success "Frontend deployed successfully"
}

# Function to build and deploy backend
deploy_backend() {
    log "=== Deploying Backend ==="
    
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    cd "$BACKEND_DIR"
    
    log "Building backend for Linux..."
    dotnet publish -c Release -r linux-x64 --self-contained true -o publish
    
    log "Setting executable permissions..."
    chmod +x publish/Backend
    
    log_success "Backend built successfully"
}

# Function to install systemd service
install_systemd_service() {
    log "=== Installing Systemd Service ==="
    
    if [ ! -f "$SERVICE_FILE" ]; then
        create_systemd_service
    fi
    
    log "Using existing service file: $SERVICE_FILE"
    log "Service configuration:"
    echo "$(grep -E '^(Description|ExecStart|WorkingDirectory)=' "$SERVICE_FILE" | sed 's/^/  /')"
    
    log "Copying service file to systemd..."
    sudo cp "$SERVICE_FILE" /etc/systemd/system/
    
    log "Reloading systemd daemon..."
    sudo systemctl daemon-reload
    
    log "Enabling NewContainmentWeb service..."
    sudo systemctl enable NewContainmentWeb.service
    
    log_success "Systemd service installed successfully"
}

# Function to create default systemd service file
create_systemd_service() {
    log_error "Service file not found: $SERVICE_FILE"
    log_error "Please ensure NewContainmentWeb.service file exists in the project root"
    log "Expected service file should contain:"
    echo "  [Unit]"
    echo "  Description=Containment service"
    echo "  After=network.target"
    echo "  ..."
    exit 1
}

# Function to start services
start_services() {
    log "=== Starting Services ==="
    
    log "Starting NewContainmentWeb backend service..."
    sudo systemctl start NewContainmentWeb.service
    
    log "Checking service status..."
    sudo systemctl status NewContainmentWeb.service --no-pager
    
    log_success "Services started successfully"
}

# Function to show deployment status
show_status() {
    log "=== Deployment Status ==="
    
    echo ""
    log "Frontend Status (PM2):"
    pm2 list
    
    echo ""
    log "Backend Status (Systemd):"
    sudo systemctl status NewContainmentWeb.service --no-pager
    
    echo ""
    log "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:5000"
    echo "  Backend Swagger: http://localhost:5000/swagger"
    
    echo ""
    log_success "Deployment completed successfully!"
}

# Main deployment function
main() {
    log "=== NewContainment Deployment Script ==="
    log "Project Root: $PROJECT_ROOT"
    
    # Step 1: Check and install dependencies
    if ! check_dependencies; then
        log "Installing missing dependencies..."
        install_dependencies
        
        # Verify installation
        if ! check_dependencies; then
            log_error "Failed to install all dependencies. Please check manually."
            exit 1
        fi
    fi
    
    # Step 2: Deploy frontend
    deploy_frontend
    
    # Step 3: Deploy backend  
    deploy_backend
    
    # Step 4: Install systemd service
    install_systemd_service
    
    # Step 5: Start services
    start_services
    
    # Step 6: Show status
    show_status
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi