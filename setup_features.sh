#!/bin/bash

# IoT Containment System - Feature Setup Script
# This script installs ZKTeco PyZK library and Shinobi NVR on Debian/Raspberry Pi

set -e

LOG_FILE="/var/log/containment_setup.log"
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
    echo -e "${BLUE}  IoT Containment System Setup${NC}"
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

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_os() {
    if [[ ! -f /etc/debian_version ]]; then
        print_error "This script is designed for Debian-based systems (Debian/Ubuntu/Raspberry Pi OS)"
        exit 1
    fi
    print_success "Debian-based system detected"
}

update_system() {
    print_info "Updating system packages..."
    apt-get update -y >> "$LOG_FILE" 2>&1
    apt-get upgrade -y >> "$LOG_FILE" 2>&1
    print_success "System updated successfully"
}

install_dependencies() {
    print_info "Installing base dependencies..."
    apt-get install -y \
        curl \
        wget \
        git \
        python3 \
        python3-pip \
        python3-dev \
        build-essential \
        pkg-config \
        libffi-dev \
        libssl-dev \
        nodejs \
        npm >> "$LOG_FILE" 2>&1
    print_success "Base dependencies installed"
}

install_pyzk() {
    print_info "Installing PyZK library for ZKTeco access control..."

    # Install Python dependencies
    pip3 install --upgrade pip >> "$LOG_FILE" 2>&1

    # Clone PyZK repository
    cd /opt
    if [[ -d "pyzk" ]]; then
        print_warning "PyZK directory already exists, removing..."
        rm -rf pyzk
    fi

    git clone https://github.com/fananimi/pyzk.git >> "$LOG_FILE" 2>&1
    cd pyzk

    # Install PyZK
    pip3 install -r requirements.txt >> "$LOG_FILE" 2>&1
    pip3 install . >> "$LOG_FILE" 2>&1

    # Create systemd service for PyZK integration
    cat > /etc/systemd/system/pyzk-service.service << EOF
[Unit]
Description=PyZK Access Control Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pyzk
ExecStart=/usr/bin/python3 -m pyzk.example
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable pyzk-service

    print_success "PyZK library installed successfully"
    print_info "PyZK service created but not started (configure devices first)"
}

install_shinobi() {
    print_info "Installing Shinobi NVR..."

    # Install Node.js dependencies for Shinobi
    apt-get install -y \
        ffmpeg \
        mariadb-server \
        mariadb-client >> "$LOG_FILE" 2>&1

    # Secure MariaDB installation
    systemctl start mariadb
    systemctl enable mariadb

    # Download and run Shinobi installer
    print_info "Running Shinobi installer..."
    cd /opt

    # Download installer
    curl -s https://cdn.shinobi.video/installers/shinobi-install.sh > shinobi-install.sh
    chmod +x shinobi-install.sh

    # Run installer with automatic answers for Raspberry Pi
    print_warning "Running Shinobi installer (this may take several minutes)..."
    echo -e "1\ny\ny\ny\n" | ./shinobi-install.sh >> "$LOG_FILE" 2>&1

    # Configure Shinobi service
    systemctl enable shinobi
    systemctl start shinobi

    # Create configuration backup
    if [[ -f /home/Shinobi/conf.json ]]; then
        cp /home/Shinobi/conf.json /home/Shinobi/conf.json.backup
    fi

    print_success "Shinobi NVR installed successfully"
    print_info "Shinobi is running on port 8080"
    print_info "Access superuser panel at: http://$(hostname -I | awk '{print $1}'):8080/super"
    print_info "Default superuser: admin@shinobi.video / admin"
    print_warning "Remember to change default credentials!"
}

create_integration_service() {
    print_info "Creating integration service for containment system..."

    cat > /etc/systemd/system/containment-integration.service << EOF
[Unit]
Description=IoT Containment Integration Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/containment
ExecStart=/usr/bin/python3 /opt/containment/integration_service.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

    # Create integration directory and basic service
    mkdir -p /opt/containment
    cat > /opt/containment/integration_service.py << 'EOF'
#!/usr/bin/env python3
"""
IoT Containment Integration Service
Manages PyZK and Shinobi integration
"""

import time
import logging
import json
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/containment_integration.log'),
        logging.StreamHandler()
    ]
)

class ContainmentIntegration:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.config = self.load_config()

    def load_config(self):
        try:
            with open('/opt/containment/config.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "pyzk_enabled": True,
                "shinobi_enabled": True,
                "sync_interval": 300
            }

    def run(self):
        self.logger.info("Starting IoT Containment Integration Service")

        while True:
            try:
                self.logger.info("Integration service running...")

                if self.config.get("pyzk_enabled"):
                    self.check_pyzk_status()

                if self.config.get("shinobi_enabled"):
                    self.check_shinobi_status()

                time.sleep(self.config.get("sync_interval", 300))

            except KeyboardInterrupt:
                self.logger.info("Service stopped by user")
                break
            except Exception as e:
                self.logger.error(f"Integration error: {e}")
                time.sleep(60)

    def check_pyzk_status(self):
        # Placeholder for PyZK status check
        self.logger.debug("Checking PyZK status")

    def check_shinobi_status(self):
        # Placeholder for Shinobi status check
        self.logger.debug("Checking Shinobi status")

if __name__ == "__main__":
    service = ContainmentIntegration()
    service.run()
EOF

    chmod +x /opt/containment/integration_service.py

    # Create default config
    cat > /opt/containment/config.json << EOF
{
    "pyzk_enabled": true,
    "shinobi_enabled": true,
    "sync_interval": 300,
    "pyzk_devices": [],
    "shinobi_cameras": []
}
EOF

    systemctl daemon-reload
    systemctl enable containment-integration

    print_success "Integration service created"
}

show_status() {
    print_info "Installation Status:"
    echo ""

    # Check PyZK
    if python3 -c "import pyzk" 2>/dev/null; then
        print_success "PyZK library: Installed"
    else
        print_error "PyZK library: Not installed"
    fi

    # Check Shinobi
    if systemctl is-active --quiet shinobi; then
        print_success "Shinobi NVR: Running"
    elif systemctl is-enabled --quiet shinobi; then
        print_warning "Shinobi NVR: Installed but not running"
    else
        print_error "Shinobi NVR: Not installed"
    fi

    # Check integration service
    if systemctl is-enabled --quiet containment-integration; then
        if systemctl is-active --quiet containment-integration; then
            print_success "Integration service: Running"
        else
            print_warning "Integration service: Installed but not running"
        fi
    else
        print_error "Integration service: Not installed"
    fi

    echo ""
    print_info "System Information:"
    echo "  - IP Address: $(hostname -I | awk '{print $1}')"
    echo "  - Shinobi URL: http://$(hostname -I | awk '{print $1}'):8080"
    echo "  - Log file: $LOG_FILE"
}

show_menu() {
    clear
    print_header
    echo "Please select an installation option:"
    echo ""
    echo "1) Install PyZK (ZKTeco Access Control)"
    echo "2) Install Shinobi NVR (Video Surveillance)"
    echo "3) Install All Features"
    echo "4) Show Installation Status"
    echo "5) Exit"
    echo ""
    read -p "Enter your choice [1-5]: " choice
}

main() {
    # Create log file
    touch "$LOG_FILE"
    log_message "Setup script started"

    check_root
    check_os

    while true; do
        show_menu

        case $choice in
            1)
                print_info "Installing PyZK (ZKTeco Access Control)..."
                update_system
                install_dependencies
                install_pyzk
                create_integration_service
                print_success "PyZK installation completed!"
                ;;
            2)
                print_info "Installing Shinobi NVR..."
                update_system
                install_dependencies
                install_shinobi
                create_integration_service
                print_success "Shinobi NVR installation completed!"
                ;;
            3)
                print_info "Installing all features..."
                update_system
                install_dependencies
                install_pyzk
                install_shinobi
                create_integration_service
                print_success "All features installation completed!"
                ;;
            4)
                show_status
                read -p "Press Enter to continue..."
                ;;
            5)
                print_info "Exiting setup script"
                log_message "Setup script completed"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                sleep 2
                ;;
        esac
    done
}

# Run main function
main