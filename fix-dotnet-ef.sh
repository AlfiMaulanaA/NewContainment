#!/bin/bash

# Fix dotnet-ef tools issue
# Usage: sudo ./fix-dotnet-ef.sh

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

main() {
    log "=== Fixing dotnet-ef Tools Issue ==="

    # Remove existing broken tools
    log "Removing existing dotnet-ef tools..."
    dotnet tool uninstall --global dotnet-ef 2>/dev/null || true
    rm -rf ~/.dotnet/tools/dotnet-ef* 2>/dev/null || true

    # Set proper environment variables
    log "Setting up .NET environment..."
    export DOTNET_ROOT="/usr/share/dotnet"
    export PATH="$PATH:$DOTNET_ROOT:$DOTNET_ROOT/tools:$HOME/.dotnet/tools"
    export DOTNET_CLI_TELEMETRY_OPTOUT=1
    export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

    # Install EF tools with specific runtime
    log "Installing Entity Framework tools for ARM64..."
    dotnet tool install --global dotnet-ef --version 9.0.10 --no-cache --verbosity normal

    # Verify installation
    log "Verifying dotnet-ef installation..."
    if command -v dotnet-ef >/dev/null 2>&1; then
        log_success "dotnet-ef is now available"
        dotnet ef --version
    else
        log_error "dotnet-ef still not accessible, trying alternative..."

        # Alternative: create a wrapper script
        log "Creating dotnet-ef wrapper script..."
        cat > /usr/local/bin/dotnet-ef << 'EOF'
#!/bin/bash
export DOTNET_ROOT="/usr/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"
exec "$HOME/.dotnet/tools/dotnet-ef" "$@"
EOF
        chmod +x /usr/local/bin/dotnet-ef

        if command -v dotnet-ef >/dev/null 2>&1; then
            log_success "dotnet-ef wrapper created successfully"
        else
            log_error "Failed to create working dotnet-ef"
        fi
    fi

    # Test database migration in Backend directory
    if [ -d "Backend" ]; then
        log "Testing database migration..."
        cd Backend

        if dotnet ef database update --no-build 2>/dev/null; then
            log_success "Database migration test successful"
        elif dotnet ef database update 2>/dev/null; then
            log_success "Database migration successful with restore"
        else
            log_error "Database migration test failed"
            log "You may need to run migrations manually from Backend directory"
        fi

        cd ..
    fi

    log_success "dotnet-ef fix completed!"
    log "You can now run: sudo ./quick-update.sh"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi