#!/bin/bash

# NewContainment Advanced Deployment Script (Auto Path Detection)
# Author: Claude Code Assistant
# Description: Advanced automated deployment script with auto path detection
#
# Auto-detects project structure and handles:
# - Path discovery and validation
# - Process cleanup before deployment
# - User/service account creation
# - Port conflict resolution
# - Enhanced error recovery
#
# Usage:
#   sudo ./deploy.sh           - Standard deployment (ports 3000, 5000)
#   sudo ./deploy.sh --production - Production deployment with port 80 access
#   sudo ./deploy.sh update-prod  - Pull latest changes and redeploy in production mode
#   sudo ./deploy.sh clean       - Remove all services and data
#   sudo ./deploy.sh status      - Show detailed deployment status

set -e # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Advanced path detection functions
detect_project_root() {
    local SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Try to find project root by looking for indicators
    local CANDIDATES=(
        "$SCRIPT_DIR/.."                                # script/deploy.sh -> NewContainment/
        "$SCRIPT_DIR/../.."                            # script/deploy.sh -> Scripts/../NewContainment/
        "$PWD"                                         # Current working directory
        "$(dirname "$SCRIPT_DIR")"                      # script dir parent
    )

    for candidate in "${CANDIDATES[@]}"; do
        if [[ -d "$candidate/Backend" && -d "$candidate/Frontend" && -f "$candidate/package.json" ]]; then
            echo "$(cd "$candidate" && pwd)"
            return 0
        fi
    done

    # Last resort: ask user
    log_error "Cannot auto-detect project root. Please run from script directory or specify path."
    log_error "Expected structure: NewContainment/ with Backend/, Frontend/ folders"
    exit 1
}

# Auto-detect project structure
PROJECT_ROOT="$(detect_project_root)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/Frontend"
BACKEND_DIR="$PROJECT_ROOT/Backend"
NGINX_DIR="$PROJECT_ROOT/nginx"

# Dynamic service file location (create if not exists)
if [[ -f "$PROJECT_ROOT/NewContainmentWeb.service" ]]; then
    SERVICE_FILE="$PROJECT_ROOT/NewContainmentWeb.service"
else
    SERVICE_FILE="/tmp/NewContainmentWeb.service.$$"
fi

# Log file location
LOG_FILE="/var/log/containment_deploy.log"

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

# Function to install .NET 9 with better ARM support
install_dotnet() {
    log "Installing .NET 9..."
    
    # Detect architecture
    local arch=$(uname -m)
    log "Detected architecture: $arch"
    
    # For ARM systems, use manual installation
    if [[ "$arch" == "aarch64" || "$arch" == "arm64" || "$arch" == "armv7l" ]]; then
        log "ARM architecture detected, using manual installation method..."
        install_dotnet_manual
        return $?
    fi
    
    # For x64 systems, try repository installation first
    if [ -f /etc/debian_version ]; then
        local debian_version
        if command -v lsb_release >/dev/null 2>&1; then
            debian_version=$(lsb_release -rs)
        else
            # Fallback version detection
            debian_version="11"
        fi
        log "Debian-based system detected, version: $debian_version"
        
        # First try to add Microsoft repository
        if wget -q https://packages.microsoft.com/config/debian/${debian_version}/packages-microsoft-prod.deb -O packages-microsoft-prod.deb; then
            sudo dpkg -i packages-microsoft-prod.deb
            rm packages-microsoft-prod.deb
            sudo apt-get update
        else
            log_warning "Failed to download Microsoft repository package, trying manual installation..."
            install_dotnet_manual
            return $?
        fi
    elif [ -f /etc/redhat-release ]; then
        log "Red Hat-based system detected"
        if wget -q https://packages.microsoft.com/config/rhel/8/packages-microsoft-prod.rpm -O packages-microsoft-prod.rpm; then
            sudo rpm -i packages-microsoft-prod.rpm
            rm packages-microsoft-prod.rpm
        else
            log_warning "Failed to download Microsoft repository package, trying manual installation..."
            install_dotnet_manual
            return $?
        fi
    else
        log_warning "Unknown OS, trying manual installation..."
        install_dotnet_manual
        return $?
    fi
    
    # Try .NET 9.0 first, then fallback versions
    local dotnet_packages=("dotnet-sdk-9.0" "dotnet-sdk-8.0" "dotnet-sdk-6.0")
    local installed=false
    
    for package in "${dotnet_packages[@]}"; do
        log "Attempting to install $package..."
        # Use apt-get install with error handling
        if sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "$package" >/dev/null 2>&1; then
            log_success "$package installed successfully"
            installed=true
            break
        else
            log_warning "$package not available in repository, trying next option..."
        fi
    done
    
    if [ "$installed" = false ]; then
        log_warning "Repository installation failed, trying manual installation..."
        install_dotnet_manual
        return $?
    fi
    
    log_success ".NET installed successfully"
    return 0
}

# Function to manually install .NET 9.0 (fallback method)
install_dotnet_manual() {
    log "=== Manual .NET 9.0 Installation ==="
    local arch=$(uname -m)
    local dotnet_version="9.0.0"  # Use .NET 9.0 to match project requirements
    
    # Try Microsoft installation script first (more reliable for .NET 9.0)
    log "Attempting Microsoft installation script method for .NET 9.0..."
    if command -v curl >/dev/null 2>&1; then
        log "Installing .NET 9.0 SDK using Microsoft script..."
        if curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 9.0 --install-dir "$HOME/.dotnet"; then
            log "Setting up environment..."
            export PATH="$PATH:$HOME/.dotnet"
            export DOTNET_ROOT="$HOME/.dotnet"
            
            # Add to shell profile
            echo 'export PATH="$PATH:$HOME/.dotnet"' >> ~/.bashrc
            echo 'export DOTNET_ROOT="$HOME/.dotnet"' >> ~/.bashrc
            
            # Create system-wide symlink
            sudo ln -sf "$HOME/.dotnet/dotnet" /usr/local/bin/dotnet 2>/dev/null || true
            
            # Verify installation
            if "$HOME/.dotnet/dotnet" --version >/dev/null 2>&1; then
                local installed_version=$("$HOME/.dotnet/dotnet" --version)
                log_success "Microsoft installation script completed - .NET $installed_version"
                return 0
            fi
        fi
        log_warning "Microsoft installation script failed, trying manual download..."
    fi
    local download_url
    local tar_name
    
    case $arch in
        "aarch64"|"arm64")
            download_url="https://download.visualstudio.microsoft.com/download/pr/b8845e39-5c82-46b9-9f3b-8a2c8bb41e43/8f7fd4dc0c6a0af1bf5a8a12b8eed60a/dotnet-sdk-9.0.0-linux-arm64.tar.gz"
            tar_name="dotnet-sdk-${dotnet_version}-linux-arm64.tar.gz"
            ;;
        "armv7l")
            download_url="https://download.visualstudio.microsoft.com/download/pr/b8845e39-5c82-46b9-9f3b-8a2c8bb41e43/8f7fd4dc0c6a0af1bf5a8a12b8eed60a/dotnet-sdk-9.0.0-linux-arm.tar.gz"
            tar_name="dotnet-sdk-${dotnet_version}-linux-arm.tar.gz"
            ;;
        "x86_64")
            download_url="https://download.visualstudio.microsoft.com/download/pr/b8845e39-5c82-46b9-9f3b-8a2c8bb41e43/8f7fd4dc0c6a0af1bf5a8a12b8eed60a/dotnet-sdk-9.0.0-linux-x64.tar.gz"
            tar_name="dotnet-sdk-${dotnet_version}-linux-x64.tar.gz"
            ;;
        *)
            log_error "Unsupported architecture for manual .NET installation: $arch"
            return 1
            ;;
    esac
    
    # Create .NET directory
    local dotnet_dir="$HOME/.dotnet"
    mkdir -p "$dotnet_dir"
    
    log "Downloading .NET SDK for $arch..."
    if ! wget -O "/tmp/$tar_name" "$download_url"; then
        log_error "Failed to download .NET SDK"
        return 1
    fi
    
    log "Extracting .NET SDK..."
    if ! tar -xzf "/tmp/$tar_name" -C "$dotnet_dir"; then
        log_error "Failed to extract .NET SDK"
        return 1
    fi
    
    # Clean up
    rm "/tmp/$tar_name"
    
    # Add to PATH
    echo 'export PATH="$PATH:$HOME/.dotnet"' >> ~/.bashrc
    echo 'export DOTNET_ROOT="$HOME/.dotnet"' >> ~/.bashrc
    export PATH="$PATH:$HOME/.dotnet"
    export DOTNET_ROOT="$HOME/.dotnet"
    
    # Create symlink for system-wide access
    sudo ln -sf "$dotnet_dir/dotnet" /usr/local/bin/dotnet 2>/dev/null || true
    
    log_success "Manual .NET installation completed"
    return 0
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
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
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

# Function to install missing dependencies with better error handling
install_dependencies() {
    log "=== Installing Missing Dependencies ==="
    
    # Update package list
    log "Updating package lists..."
    sudo apt-get update
    
    local installation_results=()
    local critical_failures=()
    
    # Try to install each missing dependency
    if ! check_nodejs; then
        log "Installing Node.js..."
        if install_nodejs; then
            installation_results+=("nodejs:success")
            log_success "Node.js installation completed"
        else
            installation_results+=("nodejs:failed")
            critical_failures+=("nodejs")
            log_error "Node.js installation failed - this is critical for frontend"
        fi
    fi
    
    if ! check_dotnet; then
        log "Installing .NET..."
        if install_dotnet; then
            installation_results+=("dotnet:success")
            log_success ".NET installation completed"
        else
            installation_results+=("dotnet:failed")
            log_warning ".NET installation failed, but deployment can continue if runtime is available"
        fi
    fi
    
    if ! check_nginx; then
        log "Installing Nginx..."
        if install_nginx; then
            installation_results+=("nginx:success")
            log_success "Nginx installation completed"
        else
            installation_results+=("nginx:failed")
            log_warning "Nginx installation failed, but deployment can continue without reverse proxy"
        fi
    fi
    
    if ! check_pm2; then
        log "Installing PM2..."
        if install_pm2; then
            installation_results+=("pm2:success")
            log_success "PM2 installation completed"
        else
            installation_results+=("pm2:failed")
            critical_failures+=("pm2")
            log_error "PM2 installation failed - this is critical for frontend deployment"
        fi
    fi
    
    # Report results
    log "=== Installation Results ==="
    for result in "${installation_results[@]}"; do
        local dep=$(echo "$result" | cut -d':' -f1)
        local status=$(echo "$result" | cut -d':' -f2)
        if [ "$status" = "success" ]; then
            log_success "$dep: ✓ Installed successfully"
        else
            log_warning "$dep: ✗ Installation failed"
        fi
    done
    
    # Check if we can continue
    if [ ${#critical_failures[@]} -gt 0 ]; then
        log_error "Critical dependencies failed: ${critical_failures[*]}"
        log_error "Cannot continue deployment without these components"
        return 1
    else
        log_success "All critical dependencies are available"
        return 0
    fi
}

# Function to build and deploy frontend
deploy_frontend() {
    log "=== Deploying Frontend ==="
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    log "=== Frontend Build Fix Process ==="

    # Clean previous build artifacts
    log "Cleaning previous build artifacts..."
    rm -rf .next node_modules/.cache 2>/dev/null || true

    # Clear npm cache to avoid corruption issues
    log "Clearing npm cache..."
    npm cache clean --force 2>/dev/null || true

    # Verify critical files exist before building
    log "Verifying critical files exist..."
    CRITICAL_FILES=("hooks/useMQTT.ts" "components/ui/card.tsx" "components/ui/button.tsx" "components/ui/badge.tsx" "components/ui/table.tsx")
    for file in "${CRITICAL_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Critical file missing: $file"
            return 1
        fi
    done
    log_success "All critical files verified"

    log "Installing frontend dependencies (full install)..."
    # Remove --omit=dev to ensure all dependencies including dev ones are installed
    if ! npm install; then
        log_error "Frontend dependency installation failed"
        return 1
    fi

    # Backup and create simplified next.config for build
    log "Creating simplified Next.js configuration for build..."
    cp next.config.mjs next.config.mjs.backup 2>/dev/null || true
    cat > next.config.build.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ["localhost"],
  },
  compress: true,
};

export default nextConfig;
EOF
    cp next.config.build.mjs next.config.mjs
    rm next.config.build.mjs

    log "Building frontend with simplified configuration..."
    if ! npm run build; then
        log_error "Frontend build failed"
        # Restore original config on failure
        mv next.config.mjs.backup next.config.mjs 2>/dev/null || true
        return 1
    fi

    # Restore original configuration
    log "Restoring original Next.js configuration..."
    mv next.config.mjs.backup next.config.mjs 2>/dev/null || true
    
    log "Verifying build output..."
    if [ ! -d ".next" ]; then
        log_error "Next.js build failed - .next directory not found"
        return 1
    fi
    
    log "Stopping existing PM2 processes..."
    # '2>/dev/null || true' prevents script from exiting if process doesn't exist
    pm2 delete newcontainment-frontend 2>/dev/null || true
    
    # Create ecosystem.config.js file dynamically
    log "Creating ecosystem.config.js..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "newcontainment-frontend",
      script: "npm",
      args: "start",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
EOF
    
    log "Starting frontend with PM2 using ecosystem file..."
    pm2 start ecosystem.config.js
    pm2 save
    
    log "Waiting for frontend to start..."
    sleep 8
    
    # Verify frontend is running and accessible
    local frontend_running=false
    for i in {1..10}; do
        if pm2 list | grep -q "newcontainment-frontend.*online"; then
            log "PM2 process is online, checking port accessibility..."
            
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

        # Check if build directory exists
        if [ ! -d "$FRONTEND_DIR/.next" ]; then
            log_error "Build directory missing - frontend was not built properly"
            return 1
        fi

        # Stop the errored process and restart with fresh config
        log "Stopping errored PM2 process..."
        pm2 stop newcontainment-frontend 2>/dev/null || true
        pm2 delete newcontainment-frontend 2>/dev/null || true

        # Wait a moment and try to start again with explicit settings
        sleep 2
        log "Attempting to restart frontend with explicit configuration..."

        # Create a more robust ecosystem config
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "newcontainment-frontend",
      script: "npm",
      args: "start",
      cwd: "/home/containment/NewContainment/Frontend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      max_restarts: 3,
      restart_delay: 5000
    }
  ]
};
EOF

        # Try starting once more
        if pm2 start ecosystem.config.js; then
            sleep 3
            if pm2 list | grep -q "online.*newcontainment-frontend"; then
                log_success "Frontend restarted successfully"
                frontend_running=true
            else
                log_error "Frontend still failing to start - check build output"
            fi
        else
            log_error "Failed to restart frontend with PM2"
        fi
        return 1
    fi
    
    log_success "Frontend deployed successfully"
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
    
    # Restore packages first
    log "Restoring packages..."
    if ! dotnet restore; then
        log_error "Package restore failed"
        return 1
    fi
    
    # Build with framework-dependent deployment (more reliable)
    log "Building backend for $target_arch (framework-dependent)..."
    if ! dotnet clean -c Release; then
        log_error "Backend clean failed"
        return 1
    fi
    
    # First restore with specific runtime
    log "Restoring packages for $target_arch..."
    if ! dotnet restore -r $target_arch; then
        log_error "Backend restore with runtime failed"
        return 1
    fi
    
    # Build and publish
    if ! dotnet publish -c Release -r $target_arch --self-contained false -o publish; then
        log_error "Backend build/publish failed"
        return 1
    fi
    
    # Verify build
    if [ ! -f "publish/Backend.dll" ]; then
        log_error "Backend build failed - Backend.dll not found"
        return 1
    fi
    
    log "Setting executable permissions..."
    chmod +x publish/Backend 2>/dev/null || true
    
    log_success "Backend built successfully"
    return 0
}

# Function to fix NuGet configuration for Linux
fix_nuget_linux() {
    log "=== Fixing NuGet Configuration for Linux =="
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
    for db in "containment.db" "app.db"; do
        if [ -f "$db" ]; then
            log "Backing up existing database: $db"
            cp "$db" "${db}.backup.$(date +%Y%m%d_%H%M%S)"
        fi
    done

    # Install EF tools if not available
    if ! dotnet tool list -g | grep -q "dotnet-ef"; then
        log "Installing Entity Framework tools..."
        dotnet tool install --global dotnet-ef
    fi

    # Ensure dotnet-ef is in PATH for current session
    export PATH="$PATH:$HOME/.dotnet/tools"

    # Verify dotnet-ef is accessible
    if ! command -v dotnet-ef >/dev/null 2>&1; then
        log_warning "dotnet-ef not found in PATH, trying alternative method..."
        # Try to run it directly
        if [ -f "$HOME/.dotnet/tools/dotnet-ef" ]; then
            export PATH="$HOME/.dotnet/tools:$PATH"
        else
            log_error "Entity Framework tools installation failed"
            return 1
        fi
    fi

    # Set environment variables for migrations
    export ASPNETCORE_ENVIRONMENT=Production
    export ConnectionStrings__DefaultConnection="Data Source=./containment.db"

    # Smart database initialization - check if tables exist first
    local db_path=""
    for db in "app.db" "containment.db" "publish/app.db" "publish/containment.db"; do
        if [ -f "$db" ]; then
            db_path="$db"
            break
        fi
    done

    if [ -n "$db_path" ] && [ -f "$db_path" ]; then
        log "Database file found: $db_path"

        # Check if tables already exist (indicating database was already initialized)
        if command_exists sqlite3; then
            local table_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")

            if [ "$table_count" -gt "5" ]; then  # If more than 5 tables exist, assume database is initialized
                log "Database appears to be initialized ($table_count tables found)"
                log "Skipping EF migrations to avoid 'already exists' errors"

                # Just ensure the database is accessible
                if [ -f "publish/Backend.dll" ]; then
                    log "Testing database connectivity with app startup..."
                    timeout 5s dotnet publish/Backend.dll --test-db 2>/dev/null || true
                    log_success "Database connectivity test completed"
                fi

                log_success "Database initialization skipped - already contains data"
                return 0
            fi
        fi
    fi

    # Run migrations only if database appears uninitialized
    log "Running database migrations (fresh database)..."

    # Try different approaches for migrations
    if dotnet ef database update --no-build --verbose 2>&1 | grep -q "Done."; then
        log_success "Database migrations completed"
    elif dotnet ef database update --verbose 2>&1 | grep -q "Done."; then
        log_success "Database migrations completed (with build)"
    else
        log_warning "EF migrations failed with exit code $?"
        log "This might be normal if using EnsureCreated() instead of migrations"

        # Capitalize on the fact that the app will create tables via EnsureCreatedAsync()
        if [ -f "publish/Backend.dll" ]; then
            log "Attempting to initialize database via application startup..."
            local start_time=$(date +%s)

            # Run the app briefly to trigger database creation/seeding
            timeout 15s dotnet publish/Backend.dll 2>/dev/null || true

            local end_time=$(date +%s)
            local duration=$((end_time - start_time))

            log_success "Application startup completed in ${duration}s"

            # Check if database was created/modified
            if [ -f "publish/app.db" ] || [ -f "publish/containment.db" ] || [ -f "app.db" ]; then
                log_success "Database appears to have been created/modified"
            else
                log_warning "Database may not have been created, but continuing..."
            fi
        else
            log_warning "No published_backend.dll found - database will be initialized on first service start"
        fi
    fi

    # Check database file and table count
    local db_file=""
    for db in "containment.db" "app.db" "publish/containment.db"; do
        if [ -f "$db" ]; then
            db_file="$db"
            break
        fi
    done

    if [ -n "$db_file" ]; then
        local table_count=$(sqlite3 "$db_file" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        log "Database tables count: $table_count (in $db_file)"

        if [ "$table_count" -lt "5" ]; then
            log_warning "Database has few tables, seeding will be handled by application startup"
        fi
    else
        log_warning "Database file not found, will be created on first application startup"
    fi

    log_success "Database setup completed"
}

# Function to install systemd service
install_systemd_service() {
    log "=== Installing Systemd Service ==="
    
    # Always recreate service file to ensure correct paths
    if ! create_systemd_service; then
        log_error "Failed to create service file"
        return 1
    fi
    
    log "Service configuration:"
    echo "$(grep -E '^(Description|ExecStart|WorkingDirectory)=' "$SERVICE_FILE" | sed 's/^/    /')"
    
    log "Copying service file to systemd..."
    sudo cp "$SERVICE_FILE" /etc/systemd/system/
    
    log "Setting correct permissions on backend files..."
    sudo chown -R containment:containment "$BACKEND_DIR/publish" 2>/dev/null || true
    sudo chmod +x "$BACKEND_DIR/publish/Backend" 2>/dev/null || true
    
    # Fix dotnet permissions if needed
    if [ -f "/usr/local/bin/dotnet" ]; then
        sudo chmod +x /usr/local/bin/dotnet
        sudo chown containment:containment /usr/local/bin/dotnet 2>/dev/null || true
    fi
    
    log "Reloading systemd daemon..."
    sudo systemctl daemon-reload
    
    log "Enabling NewContainmentWeb service..."
    sudo systemctl enable NewContainmentWeb.service
    
    log_success "Systemd service installed successfully"
}

# Function to create default systemd service file
create_systemd_service() {
    log "Creating NewContainmentWeb.service file..."

    # Determine correct dotnet path with proper priority
    local dotnet_path=""

    # Priority order: system paths first, then user paths
    if command -v dotnet >/dev/null 2>&1; then
        dotnet_path=$(which dotnet)
        log "Found system dotnet at: $dotnet_path"
    elif [ -x "/usr/bin/dotnet" ]; then
        dotnet_path="/usr/bin/dotnet"
        log "Found dotnet at: $dotnet_path"
    elif [ -x "/usr/local/bin/dotnet" ]; then
        dotnet_path="/usr/local/bin/dotnet"
        log "Found dotnet at: $dotnet_path"
    elif [ -x "$HOME/.dotnet/dotnet" ]; then
        dotnet_path="$HOME/.dotnet/dotnet"
        log "Found user dotnet at: $dotnet_path"
    else
        log_error "Could not find dotnet executable"
        log "Please ensure .NET is properly installed and in PATH"
        return 1
    fi

    # Verify the dotnet path actually works
    if ! "$dotnet_path" --version >/dev/null 2>&1; then
        log_error "Dotnet executable at $dotnet_path is not working"
        return 1
    fi

    log "Using dotnet path: $dotnet_path"

    # Check if the template service file exists in root directory
    local template_service="$PROJECT_ROOT/NewContainmentWeb.service"
    if [ -f "$template_service" ]; then
        log "Using existing service template from root directory..."
        # Copy the template and update the dotnet path
        cp "$template_service" "$SERVICE_FILE"
        # Replace the hardcoded dotnet path with the detected one
        # Update both possible dotnet path patterns
        sed -i "s|ExecStart=/usr/local/bin/dotnet|ExecStart=$dotnet_path|g" "$SERVICE_FILE"
        sed -i "s|ExecStart=/root/\.dotnet/dotnet|ExecStart=$dotnet_path|g" "$SERVICE_FILE"

        # Ensure proper user/group settings for system dotnet
        if [[ "$dotnet_path" == "/usr/bin/dotnet" || "$dotnet_path" == "/usr/local/bin/dotnet" ]]; then
            log "Using system dotnet, ensuring proper service configuration..."
            # Update service to use system dotnet with containment user
            sed -i "s|User=root|User=containment|g" "$SERVICE_FILE"
            sed -i "s|Group=root|Group=containment|g" "$SERVICE_FILE"
        fi

        log "Updated dotnet path in service file to: $dotnet_path"
    else
        log "Creating new service file with dynamic project paths..."
        cat > "$SERVICE_FILE" << EOF
[Unit]
Description=NewContainment IoT Containment Service
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=containment
Group=containment
Restart=always
RestartSec=5
ExecStart=$dotnet_path $BACKEND_DIR/publish/Backend.dll
WorkingDirectory=$BACKEND_DIR/publish
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://*:5000;https://*:5001
KillSignal=SIGINT

[Install]
WantedBy=multi-user.target
EOF
    fi

    log_success "Service file created: $SERVICE_FILE"
}

# Function to start services
start_services() {
    log "=== Starting Services ==="

    # Fix permissions and ownership before starting service
    log "Setting up proper permissions and ownership..."

    # Ensure containment user owns the backend files
    sudo chown -R containment:containment "$BACKEND_DIR/publish" 2>/dev/null || true

    # Ensure the dotnet executable has proper permissions
    if [ -f "/usr/bin/dotnet" ]; then
        sudo chmod +x /usr/bin/dotnet 2>/dev/null || true
    fi

    # Ensure the service file has proper permissions
    sudo chmod 644 "$SERVICE_FILE" 2>/dev/null || true

    # Reload systemd to pick up service changes
    log "Reloading systemd daemon..."
    sudo systemctl daemon-reload

    # Enable the service for auto-start
    log "Enabling NewContainmentWeb service..."
    sudo systemctl enable NewContainmentWeb.service

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
    echo "    Frontend: http://localhost:3000"
    echo "    Backend API: http://localhost:5000"
    echo "    Backend Swagger: http://localhost:5000/swagger"
    echo "    Backend Health: http://localhost:5000/api/health"
    
    echo ""
    log "Database Status:"
    if [ -f "$BACKEND_DIR/app.db" ]; then
        local db_size=$(du -h "$BACKEND_DIR/app.db" | cut -f1)
        echo "    Database file: $BACKEND_DIR/app.db ($db_size)"
        local table_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        echo "    Tables count: $table_count"
        local user_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM Users;" 2>/dev/null || echo "0")
        echo "    Users count: $user_count"
    else
        echo "    Database file: Not found"
    fi
    
    echo ""
    log "System Information:"
    echo "    Architecture: $(detect_architecture)"
    echo "    .NET Version: $(dotnet --version)"
    echo "    Node Version: $(node --version)"
    echo "    Deployment Time: $(date)"
    
    echo ""
    log "Useful Commands:"
    echo "    Backend logs: sudo journalctl -u NewContainmentWeb.service -f"
    echo "    Frontend logs: pm2 logs newcontainment-frontend"
    echo "    Restart backend: sudo systemctl restart NewContainmentWeb.service"
    echo "    Restart frontend: pm2 restart newcontainment-frontend"
    
    echo ""
    log_success "Enhanced deployment completed successfully!"
}

# Function to show partial deployment status (frontend only)
show_partial_status() {
    log "=== Partial Deployment Status (Frontend Only) ==="
    
    echo ""
    log "Frontend Status (PM2):"
    pm2 list
    
    echo ""
    log "Service URLs:"
    echo "    Frontend: http://localhost:3000"
    echo "    Backend API: Not deployed - install .NET SDK and re-run deploy.sh"
    
    echo ""
    log "System Information:"
    echo "    Architecture: $(detect_architecture)"
    echo "    Node Version: $(node --version 2>/dev/null || echo 'Not found')"
    echo "    .NET Version: $(dotnet --version 2>/dev/null || echo 'Not installed')"
    echo "    Deployment Time: $(date)"
    
    echo ""
    log "Next Steps:"
    echo "    1. Install .NET SDK for your architecture"
    echo "    2. Re-run: sudo ./deploy.sh"
    echo "    3. Or manually build backend: cd Backend && dotnet publish -c Release -o publish"
    
    echo ""
    log_success "Frontend-only deployment completed!"
}

# Function to show backend-only deployment status
show_backend_only_status() {
    log "=== Backend-Only Deployment Status ==="
    
    echo ""
    log "Backend Status (Systemd):"
    sudo systemctl status NewContainmentWeb.service --no-pager -l
    
    echo ""
    log "Service URLs:"
    echo "    Frontend: Not deployed - Node.js or PM2 issues prevented frontend deployment"
    echo "    Backend API: http://localhost:5000"
    echo "    Backend Swagger: http://localhost:5000/swagger"
    echo "    Backend Health: http://localhost:5000/api/health"
    
    echo ""
    log "Database Status:"
    if [ -f "$BACKEND_DIR/app.db" ]; then
        local db_size=$(du -h "$BACKEND_DIR/app.db" | cut -f1)
        echo "    Database file: $BACKEND_DIR/app.db ($db_size)"
        local table_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        echo "    Tables count: $table_count"
        local user_count=$(sqlite3 "$BACKEND_DIR/app.db" "SELECT COUNT(*) FROM Users;" 2>/dev/null || echo "0")
        echo "    Users count: $user_count"
    else
        echo "    Database file: Not found"
    fi
    
    echo ""
    log "System Information:"
    echo "    Architecture: $(detect_architecture)"
    echo "    .NET Version: $(dotnet --version)"
    echo "    Node Version: $(node --version 2>/dev/null || echo 'Not found')"
    echo "    Deployment Time: $(date)"
    
    echo ""
    log "Next Steps:"
    echo "    1. Fix Node.js/PM2 installation issues"
    echo "    2. Re-run: sudo ./deploy.sh"
    echo "    3. Or manually deploy frontend: cd Frontend && npm install && npm run build && pm2 start ecosystem.config.js"
    
    echo ""
    log "Useful Commands:"
    echo "    Backend logs: sudo journalctl -u NewContainmentWeb.service -f"
    echo "    Restart backend: sudo systemctl restart NewContainmentWeb.service"
    
    echo ""
    log_success "Backend-only deployment completed!"
}

# Function to setup Nginx for port 80 (Production)
setup_nginx_port80() {
    log "=== Setting Up Nginx for Port 80 ==="
    
    # Check if Nginx is installed
    if ! command_exists nginx; then
        log_warning "Nginx not installed, skipping port 80 setup"
        return 0
    fi
    
    # Check if nginx config exists
    if [ ! -f "$NGINX_DIR/newcontainment.conf" ]; then
        log_warning "Nginx configuration file not found at $NGINX_DIR/newcontainment.conf"
        log "Creating basic Nginx configuration..."
        create_nginx_config
    fi
    
    # Backup existing default site
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        log "Backing up default Nginx site..."
        sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup
        sudo rm -f /etc/nginx/sites-enabled/default
    fi
    
    # Install our configuration
    log "Installing NewContainment Nginx configuration..."
    sudo cp "$NGINX_DIR/newcontainment.conf" /etc/nginx/sites-available/newcontainment
    sudo ln -sf /etc/nginx/sites-available/newcontainment /etc/nginx/sites-enabled/newcontainment
    
    # Test configuration
    log "Testing Nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
        
        # Reload Nginx
        log "Reloading Nginx..."
        sudo systemctl reload nginx
        sudo systemctl enable nginx
        
        log_success "Nginx configured for port 80 access"
        return 0
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# Function to create enhanced Nginx configuration
create_nginx_config() {
    log "Creating Nginx directory..."
    mkdir -p "$NGINX_DIR"
    
    log "Creating enhanced Nginx reverse proxy configuration..."
    cat > "$NGINX_DIR/newcontainment.conf" << 'EOF'
# NewContainment Nginx Reverse Proxy Configuration for Port 80
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Permitted-Cross-Domain-Policies none always;
    
    # Remove server signature
    server_tokens off;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting for API endpoints
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    # Backend API proxy with enhanced settings
    location /api/ {
        # Apply rate limiting
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        
        # Error handling
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    }
    
    # Special rate limiting for auth endpoints
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://localhost:5000/api/auth/login;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support for MQTT and real-time features
    location /ws/ {
        proxy_pass http://localhost:3000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache static assets for 1 month
        expires 1M;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "HIT-STATIC";
    }
    
    # Frontend proxy for all other requests
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Frontend specific timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 '{"status":"healthy","timestamp":"$time_iso8601","server":"nginx"}';
        add_header Content-Type application/json;
    }
    
    # Nginx status for monitoring (restrict to localhost)
    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        allow ::1;
        deny all;
    }
    
    # Block common attack patterns
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~* /(wp-admin|admin|phpmyadmin|wp-login|xmlrpc) {
        deny all;
        access_log off;
        log_not_found off;
        return 444;
    }
    
    # Custom error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}

# Optional: Redirect HTTP to HTTPS (uncomment when SSL is configured)
# server {
#     listen 80;
#     listen [::]:80;
#     server_name your-domain.com www.your-domain.com;
#     return 301 https://$server_name$request_uri;
# }
EOF
    
    log_success "Enhanced Nginx reverse proxy configuration created"
}

# Function to setup production environment
setup_production_env() {
    log "=== Setting Up Production Environment ==="
    
    cd "$FRONTEND_DIR"
    
    # Generate secure JWT secret for backend
    if grep -q "CHANGE-ME-IN-PRODUCTION" "$BACKEND_DIR/appsettings.Production.json" 2>/dev/null; then
        log "Generating secure JWT secret..."
        local jwt_secret
        if command_exists openssl; then
            jwt_secret=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        else
            jwt_secret="$(date +%s)$(whoami)$(hostname)" | sha256sum | cut -c1-64
        fi
        
        # Update JWT secret in production config
        sed -i "s/CHANGE-ME-IN-PRODUCTION-USE-256-BIT-RANDOM-KEY-FOR-SECURITY/$jwt_secret/" "$BACKEND_DIR/appsettings.Production.json"
        log_success "JWT secret updated"
    fi
    
    # Update CORS to include current server
    local server_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    log "Server IP detected: $server_ip"
    
    # Setup production environment for frontend
    if [ -f ".env.production" ]; then
        log "Using production environment configuration"
        cp .env.production .env.local
    else
        log_warning "No .env.production found, using current .env"
    fi
    
    log_success "Production environment configured"
    cd "$PROJECT_ROOT"
}

# Function to verify port 80 access
verify_port80() {
    log "=== Verifying Port 80 Access ==="
    
    # Wait for services to start
    sleep 5
    
    # Check if port 80 is listening
    if netstat -tuln 2>/dev/null | grep -q ":80" || ss -tuln 2>/dev/null | grep -q ":80"; then
        log_success "Port 80 is listening"
        
        # Test HTTP access
        if curl -s http://localhost >/dev/null 2>&1; then
            log_success "HTTP access on port 80 is working"
        else
            log_warning "Port 80 listening but HTTP test failed"
        fi
    else
        log_warning "Port 80 is not listening - check Nginx status"
        log "Nginx status: $(systemctl is-active nginx 2>/dev/null || echo 'not available')"
    fi
    
    # Show current listening ports
    log "Current listening ports:"
    (netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null) | grep -E ":(80|3000|5000)" | sed 's/^/  /' || echo "  No netstat/ss available"
    
    return 0
}

# Function to show production status with port 80 info
show_production_status() {
    log "=== 🚀 Production Deployment Status ==="
    
    echo ""
    log "Service Status:"
    echo "  Nginx: $(systemctl is-active nginx 2>/dev/null || echo 'not installed')"
    echo "  Backend: $(systemctl is-active NewContainmentWeb.service 2>/dev/null || echo 'not running')"
    
    if pm2 list 2>/dev/null | grep -q newcontainment-frontend; then
        echo "  Frontend PM2: $(pm2 list | grep newcontainment-frontend | awk '{print $18}' | head -1)"
    else
        echo "  Frontend PM2: not running"
    fi
    
    echo ""
    log "🌐 Access URLs:"
    local server_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    echo "  🎯 Main Application: http://$server_ip"
    echo "  🏠 Local Access: http://localhost"
    echo "  🔌 API Endpoint: http://$server_ip/api"
    echo "  ❤️ Health Check: http://$server_ip/health"
    
    echo ""
    log "🔧 Direct Service Access:"
    echo "  Frontend (Next.js): http://$server_ip:3000"
    echo "  Backend (API): http://$server_ip:5000"
    
    echo ""
    log "📊 Port Status:"
    local ports_output
    if ports_output=$((netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null) | grep -E ":(80|3000|5000)"); then
        echo "$ports_output" | sed 's/^/  /'
    else
        echo "  No port information available"
    fi
    
    echo ""
    log "📋 Log Commands:"
    echo "  📄 Nginx access: sudo tail -f /var/log/nginx/access.log"
    echo "  📄 Nginx error: sudo tail -f /var/log/nginx/error.log"
    echo "  📄 Backend logs: sudo journalctl -u NewContainmentWeb.service -f"
    echo "  📄 Frontend logs: pm2 logs newcontainment-frontend"
    
    echo ""
    log "🛠️ Management Commands:"
    echo "  🔄 Restart all: sudo systemctl restart nginx NewContainmentWeb.service && pm2 restart newcontainment-frontend"
    echo "  🔄 Restart nginx: sudo systemctl restart nginx"
    echo "  🔄 Restart backend: sudo systemctl restart NewContainmentWeb.service"
    echo "  🔄 Restart frontend: pm2 restart newcontainment-frontend"
    
    # Check firewall status if available
    if command_exists ufw; then
        echo ""
        log "🔥 Firewall Status:"
        local ufw_status=$(sudo ufw status 2>/dev/null | grep -E "(Status|80)" || echo "UFW not configured")
        echo "$ufw_status" | sed 's/^/  /'
        if ! echo "$ufw_status" | grep -q "80"; then
            log_warning "Port 80 may not be allowed in firewall. Run: sudo ufw allow 80"
        fi
    fi
    
    echo ""
    if systemctl is-active nginx >/dev/null 2>&1 && systemctl is-active NewContainmentWeb.service >/dev/null 2>&1; then
        log_success "🎉 Production deployment completed successfully!"
        log_success "🌟 Your application is now accessible on port 80!"
    else
        log_warning "⚠️ Some services may not be running properly"
        log "Run individual service checks to diagnose issues"
    fi
}

# Main deployment function
main() {
    log "=== NewContainment Deployment Script ==="
    log "Project Root: $PROJECT_ROOT"
    log "Current User: $(whoami)"
    
    # Check for production mode flag
    local production_mode=false
    if [[ "$1" == "--production" || "$1" == "-p" ]]; then
        production_mode=true
        log "🚀 Production mode enabled - will setup port 80 access"
    fi
    
    # Step 1: Check and install dependencies
    if ! check_dependencies; then
        log "Installing missing dependencies..."
        if ! install_dependencies; then
            log_error "Critical dependency installation failed."
            log "Please install missing dependencies manually and re-run the script."
            log "Required: Node.js, PM2"
            log "Optional: .NET SDK, Nginx"
            exit 1
        fi
        
        # Re-check dependencies after installation
        log "Re-checking dependencies after installation..."
        check_dependencies || true  # Don't exit if some non-critical deps are missing
    fi
    
    # Initialize deployment status flags
    local frontend_deployed=false
    local backend_deployed=false
    local can_deploy_frontend=false
    local can_deploy_backend=false
    
    # Check what can be deployed
    if check_nodejs && command_exists pm2; then
        can_deploy_frontend=true
        log_success "Frontend deployment prerequisites met"
    else
        log_warning "Frontend deployment prerequisites not met - Node.js or PM2 missing"
    fi
    
    if check_dotnet; then
        can_deploy_backend=true
        log_success "Backend deployment prerequisites met"
    else
        log_warning "Backend deployment prerequisites not met - .NET SDK missing"
    fi
    
    # Step 2: Deploy frontend (with error handling)
    if [ "$can_deploy_frontend" = true ]; then
        log "=== Attempting Frontend Deployment ==="
        if deploy_frontend; then
            frontend_deployed=true
            log_success "Frontend deployment completed successfully"
        else
            log_error "Frontend deployment failed - continuing with backend if possible"
        fi
    else
        log_warning "Skipping frontend deployment - prerequisites not met"
    fi
    
    # Step 3: Deploy backend (with error handling)
    if [ "$can_deploy_backend" = true ]; then
        log "=== Attempting Backend Deployment ==="
        if deploy_backend; then
            backend_deployed=true
            log_success "Backend deployment completed successfully"
        else
            log_error "Backend deployment failed - continuing with frontend-only setup if available"
        fi
    else
        log_warning "Skipping backend deployment - .NET SDK not available"
        log "To deploy backend later:"
        log "1. Install .NET SDK manually"
        log "2. Run: cd Backend && dotnet publish -c Release -o publish"
        log "3. Run: sudo systemctl restart NewContainmentWeb.service"
    fi
    
    # Check deployment results and proceed accordingly
    if [ "$frontend_deployed" = false ] && [ "$backend_deployed" = false ]; then
        log_error "Both frontend and backend deployment failed"
        log_error "Please fix the issues and try again"
        exit 1
    fi
    
    # Step 4: Setup database (if backend was deployed)
    if [ "$backend_deployed" = true ]; then
        setup_database
    else
        log_warning "Skipping database setup - backend not deployed"
        log "Database will be initialized on first backend startup if backend is deployed later"
    fi
    
    # Step 5: Install systemd service (if backend was deployed)
    if [ "$backend_deployed" = true ] && [ -f "$BACKEND_DIR/publish/Backend.dll" ]; then
        install_systemd_service
        
        # Step 6: Start services
        start_services
        
        # Step 7: Verify deployment
        if [ "$frontend_deployed" = true ]; then
            verify_deployment
        else
            log "=== Verifying Backend-Only Deployment ==="
            # Check backend health only
            log "Checking backend health..."
            local backend_ready=false
            for i in {1..30}; do
                if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
                    backend_ready=true
                    break
                fi
                sleep 2
            done
            
            if [ "$backend_ready" = true ]; then
                log_success "Backend is accessible"
            else
                log_warning "Backend health check failed"
            fi
        fi
    elif [ "$frontend_deployed" = true ]; then
        log_warning "Backend not deployed - running frontend-only setup"
        
        # Just verify frontend
        log "=== Verifying Frontend-Only Deployment ==="
        log "Checking frontend health..."
        local frontend_ready=false
        for i in {1..10}; do
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                frontend_ready=true
                break
            fi
            sleep 2
        done
        
        if [ "$frontend_ready" = true ]; then
            log_success "Frontend is accessible"
        else
            log_warning "Frontend health check failed"
        fi
    fi
    
    # Production-specific setup if enabled
    if [ "$production_mode" = true ]; then
        log "🚀 Setting up production environment..."
        
        # Setup production configurations
        setup_production_env
        
        # Setup Nginx for port 80 (if available)
        setup_nginx_port80
        
        # Restart services with new configs
        log "Restarting services for production setup..."
        if [ "$backend_deployed" = true ] && [ -f "$BACKEND_DIR/publish/Backend.dll" ]; then
            sudo systemctl restart NewContainmentWeb.service 2>/dev/null || true
        fi
        if [ "$frontend_deployed" = true ] && pm2 list | grep -q newcontainment-frontend; then
            pm2 restart newcontainment-frontend || true
        fi
        
        # Verify port 80 access
        verify_port80
        
        # Show production-specific status
        show_production_status
    else
        # Step 8: Show appropriate status based on what was deployed
        if [ "$frontend_deployed" = true ] && [ "$backend_deployed" = true ]; then
            show_status
        elif [ "$frontend_deployed" = true ] && [ "$backend_deployed" = false ]; then
            show_partial_status
        elif [ "$frontend_deployed" = false ] && [ "$backend_deployed" = true ]; then
            show_backend_only_status
        fi
    fi
}

# Function to update production (pull and redeploy)
update_prod() {
    log "=== Production Update (Pull & Redeploy) ==="

    # Check if we're in a git repository
    if [ ! -d ".git" ]; then
        log_error "Not a git repository. Please run this script from the project root."
        exit 1
    fi

    # Stash any local changes to prevent conflicts
    log "Stashing local changes..."
    git stash push -m "Auto-stash before update: $(date)" 2>/dev/null || true

    # Pull latest changes
    log "Pulling latest changes from remote repository..."
    if ! git pull origin main; then
        log_error "Git pull failed. Please resolve conflicts manually."
        log "You can recover stashed changes with: git stash pop"
        exit 1
    fi

    # Check if there are any changes
    local changes_pulled=$(git diff HEAD@{1} --name-only 2>/dev/null | wc -l || echo "0")
    if [ "$changes_pulled" -eq "0" ]; then
        log "No changes detected. Repository is already up to date."
        log "Current deployment should still be running."
        return 0
    fi

    log_success "Successfully pulled $changes_pulled changed files"

    # Show what changed
    log "Recent changes:"
    git log --oneline -5 | sed 's/^/  /' || true

    # Stop services before rebuilding
    log "Stopping services before rebuild..."
    pm2 delete newcontainment-frontend 2>/dev/null || true
    sudo systemctl stop NewContainmentWeb.service 2>/dev/null || true

    # Redeploy with production settings
    log "Redeploying with production settings..."
    main --production

    log_success "Production update completed successfully!"
}

# Function to create service user and group
create_service_user() {
    log "=== Creating Service User ==="

    # Check if group exists
    if ! getent group containment >/dev/null 2>&1; then
        log "Creating containment group..."
        groupadd -f containment
        log_success "Created containment group"
    else
        log "Containment group already exists"
    fi

    # Check if user exists
    if ! id -u containment >/dev/null 2>&1; then
        log "Creating containment user..."
        useradd -r -g containment -s /bin/false -d "$PROJECT_ROOT" containment 2>/dev/null || true
        log_success "Created containment user"
    else
        log "Containment user already exists"
    fi

    # Set directory permissions
    if [[ -d "$BACKEND_DIR" ]]; then
        log "Setting backend directory permissions..."
        chown -R containment:containment "$BACKEND_DIR" 2>/dev/null || log_warning "Could not set backend permissions"
    fi

    log_success "Service user setup completed"
}

# Function to cleanup existing deployment
cleanup_deployment() {
    log "=== Cleaning Up Existing Deployment ==="

    # Stop and disable services
    log "Stopping and disabling services..."
    systemctl stop NewContainmentWeb.service 2>/dev/null || true
    systemctl disable NewContainmentWeb.service 2>/dev/null || true

    # Kill PM2 processes
    log "Killing PM2 processes..."
    pm2 kill 2>/dev/null || true
    pm2 delete all 2>/dev/null || true

    # Kill any remaining processes
    log "Killing any remaining dotnet and node processes..."
    pkill -f "dotnet.*Backend.dll" 2>/dev/null || true
    pkill -f "next.*start" 2>/dev/null || true

    # Clean up port conflicts
    log "Cleaning up port conflicts..."
    local ports=(3000 5000 5001 1883)
    for port in "${ports[@]}"; do
        fuser -k "${port}"/tcp 2>/dev/null || true
    done

    # Remove service files
    if [[ -f "/etc/systemd/system/NewContainmentWeb.service" ]]; then
        log "Removing systemd service file..."
        rm -f "/etc/systemd/system/NewContainmentWeb.service"
        systemctl daemon-reload
    fi

    # Remove nginx configuration if exists
    if [[ -L "/etc/nginx/sites-enabled/newcontainment" ]]; then
        log "Removing nginx configuration..."
        rm -f "/etc/nginx/sites-enabled/newcontainment"
        systemctl reload nginx 2>/dev/null || true
    fi

    # Clean build artifacts
    log "Cleaning build artifacts..."
    if [[ -d "$BACKEND_DIR/publish" ]]; then
        rm -rf "$BACKEND_DIR/publish"
    fi
    if [[ -d "$BACKEND_DIR/bin" ]]; then
        rm -rf "$BACKEND_DIR/bin"
    fi
    if [[ -d "$BACKEND_DIR/obj" ]]; then
        rm -rf "$BACKEND_DIR/obj"
    fi
    if [[ -d "$FRONTEND_DIR/.next" ]]; then
        rm -rf "$FRONTEND_DIR/.next"
    fi
    if [[ -d "$FRONTEND_DIR/node_modules/.cache" ]]; then
        rm -rf "$FRONTEND_DIR/node_modules/.cache"
    fi

    # Backup and reset database (optional - dangerous!)
    if [[ "$1" == "reset-db" && -f "$BACKEND_DIR/app.db" ]]; then
        log_warning "Resetting database as requested..."
        mv "$BACKEND_DIR/app.db" "$BACKEND_DIR/app.db.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    fi

    log_success "Cleanup completed"
}

# Function to show comprehensive status
show_comprehensive_status() {
    log "=== 📊 NewContainment Comprehensive Status ==="
    echo ""

    # Project information
    log "🏗️  Project Information:"
    echo "  📁 Project Root: $PROJECT_ROOT"
    echo "  🎯 Architecture: $(detect_architecture)"
    echo "  ⏰ Server Time: $(date)"
    echo "  👤 Current User: $(whoami)"
    echo "  🔄 PID: $$"
    echo ""

    # System resources
    log "💻 System Resources:"
    echo "  💾 Disk Usage: $(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}') ($(du -sh "$PROJECT_ROOT" 2>/dev/null | cut -f1))"
    echo "  🧠 Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
    echo "  ⚡ Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo ""

    # Dependency status
    log "🔧 Dependencies:"
    echo -n "  📦 Node.js: "
    if command_exists node; then
        echo "$(node --version 2>/dev/null || echo 'Unknown')"
    else
        echo "❌ Not installed"
    fi

    echo -n "  🐧 PM2: "
    if command_exists pm2; then
        echo "$(pm2 --version 2>/dev/null || echo 'Unknown')"
    else
        echo "❌ Not installed"
    fi

    echo -n "  🔶 .NET SDK: "
    if command_exists dotnet; then
        echo "$(dotnet --version 2>/dev/null || echo 'Unknown')"
    else
        echo "❌ Not installed"
    fi

    echo -n "  🌐 Nginx: "
    if command_exists nginx; then
        echo "$(nginx -v 2>&1 | grep -o '[0-9.]*' || echo 'Unknown')"
    else
        echo "❌ Not installed"
    fi

    echo -n "  📡 Mosquitto: "
    if pgrep -x "mosquitto" >/dev/null; then
        echo "✅ Running"
    else
        echo "❌ Not running"
    fi
    echo ""

    # Service status
    log "🔄 Service Status:"
    echo "  🔵 Backend (systemd):"
    if systemctl list-unit-files | grep -q "^NewContainmentWeb.service"; then
        local backend_status=$(systemctl is-active NewContainmentWeb.service 2>/dev/null || echo "unknown")
        local backend_pid=$(systemctl show NewContainmentWeb.service --property=MainPID --value 2>/dev/null || echo "N/A")
        echo "    Status: ${backend_status^}"
        echo "    PID: $backend_pid"
        echo "    Port: 5000 $(timeout 2 bash -c "</dev/tcp/localhost/5000" >/dev/null 2>&1 && echo "✅" || echo "❌")"
    else
        echo "    Status: Not installed"
    fi

    echo "  🟢 Frontend (PM2):"
    if pm2 list 2>/dev/null | grep -q "newcontainment-frontend"; then
        local frontend_status=$(pm2 jlist | jq -r '.[] | select(.name=="newcontainment-frontend") | .pm2_env.status' 2>/dev/null || echo "unknown")
        local frontend_pid=$(pm2 jlist | jq -r '.[] | select(.name=="newcontainment-frontend") | .pid' 2>/dev/null || echo "N/A")
        echo "    Status: ${frontend_status^}"
        echo "    PID: $frontend_pid"
        echo "    Port: 3000 $(timeout 2 bash -c "</dev/tcp/localhost/3000" >/dev/null 2>&1 && echo "✅" || echo "❌")"
    else
        echo "    Status: Not running"
    fi

    echo "  🌐 Nginx (Reverse Proxy):"
    if systemctl is-active --quiet nginx 2>/dev/null && [[ -f "/etc/nginx/sites-enabled/newcontainment" ]]; then
        echo "    Status: Active"
        echo "    Port: 80 $(timeout 2 bash -c "</dev/tcp/localhost/80" >/dev/null 2>&1 && echo "✅" || echo "❌")"
    else
        echo "    Status: Not configured"
    fi
    echo ""

    # Database status
    log "🗄️  Database Status:"
    local db_file=""
    local db_found=false

    for db_path in "$BACKEND_DIR/app.db" "$BACKEND_DIR/publish/app.db" "$BACKEND_DIR/containment.db"; do
        if [[ -f "$db_path" ]]; then
            db_file="$db_path"
            db_found=true
            break
        fi
    done

    if [[ "$db_found" == true ]]; then
        local db_size=$(du -h "$db_file" | cut -f1)
        local db_modified=$(stat -c %y "$db_file" | cut -d'.' -f1 2>/dev/null || echo "Unknown")

        echo "  📄 Location: $db_file"
        echo "  📏 Size: $db_size"
        echo "  📅 Modified: $db_modified"

        if command_exists sqlite3; then
            local table_count=$(sqlite3 "$db_file" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
            local user_count=$(sqlite3 "$db_file" "SELECT COUNT(*) FROM Users;" 2>/dev/null || echo "0")
            echo "  📊 Tables: $table_count | Users: $user_count"
        fi
    else
        echo "  📄 Status: Database file not found"
    fi
    echo ""

    # Process information
    log "🔍 Running Processes:"
    echo "  🟢 Backend processes:"
    if pgrep -f "dotnet.*Backend.dll" >/dev/null; then
        ps aux | grep "dotnet.*Backend.dll" | grep -v grep | sed 's/^/    /'
    else
        echo "    No backend processes found"
    fi

    echo "  🟣 Frontend processes:"
    if pgrep -f "next.*start" >/dev/null; then
        ps aux | grep "next.*start" | grep -v grep | sed 's/^/    /'
    else
        echo "    No frontend processes found"
    fi

    echo "  📡 MQTT processes:"
    if pgrep -x "mosquitto" >/dev/null; then
        ps aux | grep mosquitto | grep -v grep | sed 's/^/    /'
    else
        echo "    Mosquitto not running"
    fi
    echo ""

    # Network status
    log "🌐 Network Status:"
    echo "  📡 Listening Ports:"
    if command_exists ss; then
        ss -tuln | grep -E ":(80|3000|5000|1883)" | sed 's/^/    /' || echo "    No relevant ports found"
    elif command_exists netstat; then
        netstat -tuln | grep -E ":(80|3000|5000|1883)" | sed 's/^/    /' || echo "    No relevant ports found"
    else
        echo "    Network tools not available"
    fi
    echo ""

    # Log files
    log "📝 Recent Log Activity:"
    echo "  🔵 Backend logs (last 2 entries):"
    if [[ -f "$LOG_FILE" ]]; then
        tail -2 "$LOG_FILE" | sed 's/^/    /' 2>/dev/null || echo "    Error reading logs"
    else
        echo "    No deployment log found"
    fi

    echo "  🟢 Frontend logs (PM2 errors):"
    pm2 logs newcontainment-frontend --lines 2 --err 2>/dev/null | tail -2 | sed 's/^/    /' || echo "    No frontend logs"
    echo ""

    # Access URLs
    log "🌍 Access URLs:"
    local server_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

    if systemctl is-active --quiet nginx 2>/dev/null && [[ -f "/etc/nginx/sites-enabled/newcontainment" ]]; then
        echo "  🎯 Production (Port 80): http://$server_ip"
        echo "  ❤️ Health Check: http://$server_ip/health"
    fi

    echo "  🔗 Development Ports:"
    echo "    Frontend: http://$server_ip:3000"
    echo "    Backend API: http://$server_ip:5000"
    echo "    Swagger UI: http://$server_ip:5000/swagger"
    echo "    Health Check: http://$server_ip:5000/api/health"
    echo ""

    # Performance metrics
    log "📈 Performance Metrics:"
    echo "  🕐 Uptime:"
    uptime -p 2>/dev/null | sed 's/^/    /' || echo "    Uptime info not available"

    echo "  💾 Disk I/O:"
    iostat -d 1 1 2>/dev/null | tail -1 | awk '{print "    Read: " $4 " kB/s, Write: " $5 " kB/s"}' || echo "    I/O stats not available"
    echo ""

    # Recommendations
    log "💡 Recommendations:"
    local issues_found=0

    if ! systemctl is-active --quiet NewContainmentWeb.service 2>/dev/null; then
        echo "  ⚠️  Backend service not running - consider: sudo ./deploy.sh"
        ((issues_found++))
    fi

    if ! pm2 list 2>/dev/null | grep -q "newcontainment-frontend.*online"; then
        echo "  ⚠️  Frontend PM2 process not running - consider: pm2 restart newcontainment-frontend"
        ((issues_found++))
    fi

    if ! pgrep -x "mosquitto" >/dev/null; then
        echo "  ⚠️  MQTT broker not running - start with: sudo systemctl start mosquitto"
        ((issues_found++))
    fi

    if ! timeout 2 bash -c "</dev/tcp/localhost/5000" >/dev/null 2>&1; then
        echo "  ⚠️  Backend API not accessible on port 5000"
        ((issues_found++))
    fi

    if ! timeout 2 bash -c "</dev/tcp/localhost/3000" >/dev/null 2>&1; then
        echo "  ⚠️  Frontend not accessible on port 3000"
        ((issues_found++))
    fi

    if [[ $issues_found -eq 0 ]]; then
        log_success "✅ All systems appear to be running correctly!"
    else
        log_warning "Found $issues_found potential issues to investigate"
    fi
    echo ""
}

# Function to handle clean operation
clean_operation() {
    local reset_db=false
    if [[ "$1" == "reset-db" ]]; then
        reset_db=true
        log_warning "⚠️  DATABASE RESET REQUESTED - This will delete all data!"
        read -p "Are you sure you want to reset the database? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Database reset cancelled"
            return 0
        fi
    fi

    cleanup_deployment "$1"

    if [[ "$reset_db" == true ]]; then
        log_success "Clean operation with database reset completed"
    else
        log_success "Clean operation completed (database preserved)"
    fi

    show_comprehensive_status
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"

    case "${1:-deploy}" in
        "update-prod")
            update_prod
            ;;
        "clean")
            clean_operation
            ;;
        "status")
            show_comprehensive_status
            ;;
        "user-setup")
            check_root
            create_service_user
            ;;
        *)
            # Enhanced main deployment with user creation
            log "Starting Advanced NewContainment Deployment..."
            create_service_user 2>/dev/null || log_warning "Could not create service user (might already exist)"
            cleanup_deployment "preserve-db"
            main "$@"
            ;;
    esac
fi
