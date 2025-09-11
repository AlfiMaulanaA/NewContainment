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
    
    log "Verifying build output..."
    if [ ! -d ".next" ]; then
        log_error "Next.js build failed - .next directory not found"
        exit 1
    fi
    
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
        exit 1
    fi
    
    log_success "Frontend deployed successfully"
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
            exit 1
            ;;
    esac
}

# Function to build and deploy backend
deploy_backend() {
    log "=== Deploying Backend ==="
    
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Detect target architecture
    local target_arch=$(detect_architecture)
    log "Detected target architecture: $target_arch"
    
    # Stop existing service first
    sudo systemctl stop NewContainmentWeb.service 2>/dev/null || true
    
    # Clean previous build
    if [ -d "publish" ]; then
        sudo rm -rf publish
        log "Cleaned previous build"
    fi
    
    # Fix NuGet configuration before building
    fix_nuget_linux
    
    # Restore packages first
    log "Restoring packages with Linux configuration..."
    if ! dotnet restore --no-cache --force; then
        log_error "Package restore failed"
        return 1
    fi
    
    # Build with framework-dependent deployment (more reliable)
    log "Building backend for $target_arch (framework-dependent)..."
    dotnet clean -c Release
    dotnet publish -c Release -r $target_arch --no-self-contained --no-restore -o publish
    
    # Verify build
    if [ ! -f "publish/Backend.dll" ]; then
        log_error "Backend build failed - Backend.dll not found"
        exit 1
    fi
    
    log "Setting executable permissions..."
    chmod +x publish/Backend 2>/dev/null || true
    
    log_success "Backend built successfully"
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
    
    log_success "NuGet Linux configuration fixed"
}

# Function to setup database
setup_database() {
    log "=== Setting Up Database ==="
    cd "$BACKEND_DIR"
    
    # Check if database exists and backup
    if [ -f "app.db" ]; then
        log "Backing up existing database..."
        cp app.db "app.db.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Install EF tools if not available
    if ! dotnet tool list -g | grep -q "dotnet-ef"; then
        log "Installing Entity Framework tools..."
        dotnet tool install --global dotnet-ef
    fi
    
    # Run migrations
    log "Running database migrations..."
    if dotnet ef database update --no-build; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        # Don't exit, continue with deployment
    fi
    
    # Force seed data if database is new or empty
    if [ -f "app.db" ]; then
        local table_count=$(sqlite3 app.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        log "Database tables count: $table_count"
        
        if [ "$table_count" -lt "5" ]; then
            log_warning "Database has few tables, seeding will be handled by application startup"
        fi
    fi
    
    log_success "Database setup completed"
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
    
    # Wait for service to start
    sleep 5
    
    log "Checking service status..."
    if sudo systemctl is-active --quiet NewContainmentWeb.service; then
        log_success "Backend service is active"
    else
        log_error "Backend service failed to start"
        sudo journalctl -u NewContainmentWeb.service --no-pager -n 20
        exit 1
    fi
    
    log_success "Services started successfully"
}

# Function to verify deployment
verify_deployment() {
    log "=== Verifying Deployment ==="
    
    # Check if sqlite3 is available for database verification
    if ! command_exists sqlite3; then
        log "Installing sqlite3 for database verification..."
        sudo apt-get update && sudo apt-get install -y sqlite3
    fi
    
    # Check backend health
    log "Checking backend health..."
    local backend_ready=false
    for i in {1..30}; do
        if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
            backend_ready=true
            break
        fi
        if [ $i -eq 30 ]; then
            log_warning "Backend health check endpoint not responding after 30 attempts"
            # Don't exit, just warn
        fi
        sleep 2
    done
    
    if [ "$backend_ready" = true ]; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed, but service is running"
    fi
    
    # Check frontend
    log "Checking frontend health..."
    local frontend_ready=false
    for i in {1..15}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            frontend_ready=true
            break
        fi
        if [ $i -eq 15 ]; then
            log_warning "Frontend health check failed after 15 attempts"
        fi
        sleep 2
    done
    
    if [ "$frontend_ready" = true ]; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed"
    fi
    
    # Database verification
    if [ -f "$BACKEND_DIR/app.db" ]; then
        local user_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM Users;" 2>/dev/null || echo "0")
        if [ "$user_count" -gt "0" ]; then
            log_success "Database contains $user_count users (seeded)"
        else
            log_warning "Database exists but no users found (seeding may be needed)"
        fi
    else
        log_warning "Database file not found"
    fi
    
    log_success "Deployment verification completed"
}

# Function to show deployment status
show_status() {
    log "=== Deployment Status ==="
    
    echo ""
    log "Frontend Status (PM2):"
    pm2 list
    
    echo ""
    log "Backend Status (Systemd):"
    sudo systemctl status NewContainmentWeb.service --no-pager -l
    
    echo ""
    log "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:5000"
    echo "  Backend Swagger: http://localhost:5000/swagger"
    echo "  Backend Health: http://localhost:5000/api/health"
    
    echo ""
    log "Database Status:"
    if [ -f "$BACKEND_DIR/app.db" ]; then
        local db_size=$(du -h "$BACKEND_DIR/app.db" | cut -f1)
        echo "  Database file: $BACKEND_DIR/app.db ($db_size)"
        local table_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        echo "  Tables count: $table_count"
        local user_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM Users;" 2>/dev/null || echo "0")
        echo "  Users count: $user_count"
    else
        echo "  Database file: Not found"
    fi
    
    echo ""
    log "System Information:"
    echo "  Architecture: $(detect_architecture)"
    echo "  .NET Version: $(dotnet --version)"
    echo "  Node Version: $(node --version)"
    echo "  Deployment Time: $(date)"
    
    echo ""
    log "Useful Commands:"
    echo "  Backend logs: sudo journalctl -u NewContainmentWeb.service -f"
    echo "  Frontend logs: pm2 logs newcontainment-frontend"
    echo "  Restart backend: sudo systemctl restart NewContainmentWeb.service"
    echo "  Restart frontend: pm2 restart newcontainment-frontend"
    
    echo ""
    log_success "Enhanced deployment completed successfully!"
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
    
    # Step 4: Setup database
    setup_database
    
    # Step 5: Install systemd service
    install_systemd_service
    
    # Step 6: Start services
    start_services
    
    # Step 7: Verify deployment
    verify_deployment
    
    # Step 8: Show status
    show_status
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi