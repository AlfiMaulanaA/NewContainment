#!/bin/bash

# NewContainment IoT System - Dummy Sensor Service Setup
# Description: Create and activate systemd service for dummy_sensor.py
# Author: Claude Code Assistant
# Usage:
#   sudo ./setup-dummy-sensor.sh       - Setup and start dummy sensor service
#   sudo ./setup-dummy-sensor.sh status - Check service status
#   sudo ./setup-dummy-sensor.sh stop   - Stop dummy sensor service
#   sudo ./setup-dummy-sensor.sh logs   - Show service logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DUMMY_SENSOR_FILE="$PROJECT_ROOT/dummy_sensor.py"
SERVICE_NAME="dummy-sensor.service"
LOG_FILE="/var/log/containment_dummy_sensor.log"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Log function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - SUCCESS: $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: $1" >> "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - INFO: $1" >> "$LOG_FILE"
}

# Function to check root privileges
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Function to check if Python 3 is installed
check_python() {
    log "Checking Python 3 installation..."
    if ! command_exists python3; then
        log "Installing Python 3..."
        apt-get update -y >> "$LOG_FILE" 2>&1
        apt-get install -y python3 python3-pip >> "$LOG_FILE" 2>&1
        log_success "Python 3 installed successfully"
    else
        PYTHON_VERSION=$(python3 --version 2>&1)
        log_success "$PYTHON_VERSION is available"
    fi
}

# Function to install Python dependencies
install_dependencies() {
    log "Installing Python dependencies (paho-mqtt)..."
    if ! python3 -c "import paho.mqtt.client" 2>/dev/null; then
        python3 -m pip install paho-mqtt >> "$LOG_FILE" 2>&1
        log_success "paho-mqtt library installed successfully"
    else
        log_success "paho-mqtt library is already installed"
    fi
}

# Function to check if dummy_sensor.py exists
check_sensor_file() {
    log "Checking dummy_sensor.py file..."
    if [ ! -f "$DUMMY_SENSOR_FILE" ]; then
        log_error "dummy_sensor.py not found at: $DUMMY_SENSOR_FILE"
        exit 1
    fi

    # Test if the file is executable and valid Python
    if ! python3 -m py_compile "$DUMMY_SENSOR_FILE" 2>/dev/null; then
        log_error "dummy_sensor.py contains syntax errors"
        exit 1
    fi

    log_success "dummy_sensor.py is valid and executable"
}

# Function to check MQTT broker availability
check_mqtt_broker() {
    log "Checking MQTT broker availability..."

    # Check if MQTT broker is running on localhost:1883
    if command_exists nc || command_exists ncat; then
        if nc -z localhost 1883 2>/dev/null || ncat -z localhost 1883 2>/dev/null; then
            log_success "MQTT broker is accessible on localhost:1883"
            return 0
        fi
    fi

    # Alternative check with timeout
    if timeout 5 bash -c "</dev/tcp/localhost/1883" 2>/dev/null; then
        log_success "MQTT broker is accessible on localhost:1883"
        return 0
    fi

    log_warning "MQTT broker not detected on localhost:1883"
    log_warning "Please ensure Mosquitto or another MQTT broker is running"
    log_warning "Service may still start but will fail to connect"
    return 1
}

# Function to create systemd service file
create_service() {
    log "Creating systemd service file for dummy sensor..."

    # Ensure the log file exists and has correct permissions
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"

    # Create the service file
    cat > "/etc/systemd/system/$SERVICE_NAME" << EOF
[Unit]
Description=NewContainment Dummy Sensor Data Generator
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/bin/python3 $DUMMY_SENSOR_FILE
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=dummy-sensor
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

    log_success "Systemd service file created at /etc/systemd/system/$SERVICE_NAME"
}

# Function to enable and start the service
enable_service() {
    log "Enabling and starting dummy sensor service..."

    # Reload systemd daemon
    systemctl daemon-reload

    # Enable the service
    systemctl enable "$SERVICE_NAME"

    # Start the service
    systemctl start "$SERVICE_NAME"
    sleep 3

    # Check if service started successfully
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Dummy sensor service started successfully"
    else
        log_error "Dummy sensor service failed to start"
        log "Checking service status..."
        systemctl status "$SERVICE_NAME" --no-pager -l
        return 1
    fi
}

# Function to stop the service
stop_service() {
    log "Stopping dummy sensor service..."

    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME"
        log_success "Dummy sensor service stopped"
    else
        log_warning "Dummy sensor service is not running"
    fi
}

# Function to show service status
show_service_status() {
    log "=== Dummy Sensor Service Status ==="
    echo ""

    if systemctl list-unit-files | grep -q "^$SERVICE_NAME"; then
        echo "Service Status:"
        systemctl status "$SERVICE_NAME" --no-pager -l
        echo ""

        echo "Service Logs (last 10 lines):"
        if [ -f "$LOG_FILE" ]; then
            tail -n 10 "$LOG_FILE" | sed 's/^/  /'
        else
            echo "  No log file found at $LOG_FILE"
        fi
        echo ""

        echo "Process Information:"
        if pgrep -f "dummy_sensor.py" >/dev/null; then
            ps aux | grep dummy_sensor.py | grep -v grep | sed 's/^/  /'
        else
            echo "  No dummy_sensor.py process running"
        fi
    else
        echo "Service not installed"
    fi

    echo ""
    log_info "Service file location: /etc/systemd/system/$SERVICE_NAME"
    log_info "Python script location: $DUMMY_SENSOR_FILE"
    log_info "Log file location: $LOG_FILE"
}

# Function to show service logs
show_logs() {
    log "=== Dummy Sensor Service Logs ==="
    echo ""

    if [ -f "$LOG_FILE" ]; then
        echo "Log file: $LOG_FILE"
        echo ""

        # Show the last 50 lines
        tail -n 50 "$LOG_FILE"

        echo ""
        log "To follow live logs: tail -f $LOG_FILE"
        log "To show full log history: cat $LOG_FILE"
    else
        echo "No log file found at $LOG_FILE"
        echo "Service may not have been started yet"
    fi
}

# Function to cleanup (remove service)
cleanup_service() {
    log "Cleaning up dummy sensor service..."

    # Stop service if running
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME"
    fi

    # Disable service
    if systemctl list-unit-files | grep -q "^$SERVICE_NAME"; then
        systemctl disable "$SERVICE_NAME"
    fi

    # Remove service file
    if [ -f "/etc/systemd/system/$SERVICE_NAME" ]; then
        rm -f "/etc/systemd/system/$SERVICE_NAME"
        systemctl daemon-reload
        log_success "Service file removed"
    fi

    log_success "Cleanup completed"
}

# Main function
main() {
    log "=== NewContainment Dummy Sensor Service Setup ==="
    log "Project Root: $PROJECT_ROOT"
    log "Dummy Sensor File: $DUMMY_SENSOR_FILE"
    echo ""

    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"

    # Parse command line arguments
    case "${1:-setup}" in
        "setup")
            check_root
            check_sensor_file
            check_python
            install_dependencies
            check_mqtt_broker
            create_service
            enable_service
            show_service_status
            log_success "Dummy sensor service setup completed successfully!"
            ;;
        "status")
            show_service_status
            ;;
        "start")
            check_root
            systemctl start "$SERVICE_NAME"
            log_success "Dummy sensor service started"
            show_service_status
            ;;
        "stop")
            check_root
            stop_service
            ;;
        "restart")
            check_root
            systemctl restart "$SERVICE_NAME"
            log_success "Dummy sensor service restarted"
            show_service_status
            ;;
        "logs")
            show_logs
            ;;
        "cleanup")
            check_root
            cleanup_service
            show_service_status
            ;;
        "check")
            check_sensor_file
            check_python
            check_mqtt_broker
            install_dependencies
            log_success "All prerequisites checked and installed"
            ;;
        *)
            echo "Usage: $0 {setup|status|start|stop|restart|logs|cleanup|check}"
            echo ""
            echo "Commands:"
            echo "  setup   - Install and start dummy sensor service (default)"
            echo "  status  - Show service status and process information"
            echo "  start   - Start the dummy sensor service"
            echo "  stop    - Stop the dummy sensor service"
            echo "  restart - Restart the dummy sensor service"
            echo "  logs    - Show service logs"
            echo "  cleanup - Remove and disable service"
            echo "  check   - Verify prerequisites without installing service"
            echo ""
            echo "Example:"
            echo "  sudo ./setup-dummy-sensor.sh setup    # Full installation"
            echo "  sudo ./setup-dummy-sensor.sh status   # Check status"
            echo "  sudo ./setup-dummy-sensor.sh logs     # View logs"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"
