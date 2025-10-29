#!/bin/bash

# NewContainment Docker Production Deployment Script
# Author: Claude Code Assistant
# Description: Complete Docker-based deployment for NewContainment IoT system
#
# Features:
# - Automated Docker Compose deployment
# - Environment validation and setup
# - Data persistence configuration
# - Health checks and monitoring
# - Rollback capabilities
#
# Usage:
#   ./deploy-docker.sh                 - Standard deployment
#   ./deploy-docker.sh --production    - Production deployment (port 80)
#   ./deploy-docker.sh --testing       - Include dummy sensors for testing
#   ./deploy-docker.sh --build         - Force rebuild all images
#   ./deploy-docker.sh --cleanup       - Clean up containers and volumes
#   ./deploy-docker.sh --status        - Show deployment status
#   ./deploy-docker.sh --logs          - Show all service logs

set -e # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="newcontainment"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/.env"
BACKUP_DIR="$SCRIPT_DIR/backup/$(date +%Y%m%d_%H%M%S)"

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

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    log "Checking Docker installation..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        log_info "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        log_info "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi

    log_success "Docker and Docker Compose are installed"

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker service."
        exit 1
    fi

    log_success "Docker daemon is running"
}

# Setup environment file
setup_environment() {
    log "Setting up environment configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "docker/env/.env.example" ]; then
            log_info "Creating .env file from docker/env/.env.example..."
            cp docker/env/.env.example .env
            log_warning "⚠️  IMPORTANT: Please edit .env file and update security settings!"
            log_warning "   - Change JWT_SECRET"
            log_warning "   - Change MQTT credentials"
            log_warning "   - Review other security settings"
            read -p "Press Enter after updating .env file..."
        else
            log_error "No environment template found. Please create .env file."
            exit 1
        fi
    fi

    log_success "Environment configuration ready"
}

# Backup current deployment
create_backup() {
    log "Creating deployment backup..."

    if [ -d "$SCRIPT_DIR/backup" ]; then
        mkdir -p "$BACKUP_DIR"

        # Backup environment file
        if [ -f "$ENV_FILE" ]; then
            cp "$ENV_FILE" "$BACKUP_DIR/"
        fi

        # Backup Docker volumes data (if accessible)
        if docker volume ls | grep -q "${PROJECT_NAME}"; then
            log_info "Docker volumes detected - manual backup may be needed"
        fi

        log_success "Backup created at: $BACKUP_DIR"
    fi
}

# Pre-deployment validation
validate_deployment() {
    log "Validating deployment configuration..."

    # Check required files
    local required_files=("docker-compose.yml" "Dockerfile.frontend" "Dockerfile.backend")

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done

    # Validate Docker Compose file
    if ! docker-compose -f "$COMPOSE_FILE" config -q; then
        log_error "Docker Compose configuration is invalid"
        exit 1
    fi

    log_success "Deployment configuration validated"
}

# Build Docker images
build_images() {
    local force_build=$1

    if [ "$force_build" = "true" ]; then
        log "Building Docker images (--no-cache)..."
        docker-compose build --no-cache
    else
        log "Building Docker images..."
        docker-compose build
    fi

    log_success "Docker images built successfully"
}

# Deploy services
deploy_services() {
    local testing_mode=$1
    local production_mode=$2

    log "Deploying services..."

    # Set appropriate profile
    if [ "$testing_mode" = "true" ]; then
        log_info "Starting with testing profile (includes dummy sensors)..."
        docker-compose -f "$COMPOSE_FILE" --profile testing up -d
    elif [ "$production_mode" = "true" ]; then
        log_info "Starting production services only..."
        docker-compose -f "$COMPOSE_FILE" up -d nginx frontend backend mosquitto middleware
    else
        log_info "Starting all services..."
        docker-compose -f "$COMPOSE_FILE" up -d
    fi

    log_success "Services deployed successfully"
}

# Health checks
perform_health_checks() {
    log "Performing health checks..."

    local services=("mosquitto" "backend" "frontend" "nginx")
    local failed_services=()

    # Wait for services to start
    log_info "Waiting for services to initialize..."
    sleep 30

    for service in "${services[@]}"; do
        log_info "Checking $service health..."

        case $service in
            "mosquitto")
                # Check MQTT broker
                if timeout 10 bash -c "</dev/tcp/localhost/1883" 2>/dev/null; then
                    log_success "$service is healthy"
                else
                    log_error "$service is not responding"
                    failed_services+=("$service")
                fi
                ;;
            "backend")
                # Check backend API
                if curl -s http://localhost:5000/health > /dev/null 2>&1; then
                    log_success "$service is healthy"
                else
                    log_error "$service is not responding"
                    failed_services+=("$service")
                fi
                ;;
            "frontend")
                # Check frontend
                if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
                    log_success "$service is healthy"
                else
                    log_error "$service is not responding"
                    failed_services+=("$service")
                fi
                ;;
            "nginx")
                # Check nginx reverse proxy
                if curl -s http://localhost/health > /dev/null 2>&1; then
                    log_success "$service is healthy"
                else
                    log_error "$service is not responding"
                    failed_services+=("$service")
                fi
                ;;
        esac
    done

    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All services are healthy!"
    else
        log_error "Some services failed health checks: ${failed_services[*]}"
        show_service_logs "${failed_services[0]}"
        return 1
    fi
}

# Show deployment status
show_deployment_status() {
    log "=== Docker Deployment Status ==="
    echo ""

    # Docker Compose status
    log "Docker Compose Services:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""

    # Container resource usage
    log "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    echo ""

    # Volumes status
    log "Docker Volumes:"
    docker volume ls | grep "$PROJECT_NAME" || echo "No project volumes found"
    echo ""

    # Networks
    log "Docker Networks:"
    docker network ls | grep "$PROJECT_NAME" || echo "No project networks found"
    echo ""

    # Port mappings
    log "Port Mappings:"
    docker-compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Ports}}"
    echo ""

    # Environment info
    log "Environment Information:"
    echo "  - Project Directory: $SCRIPT_DIR"
    echo "  - Docker Compose File: $COMPOSE_FILE"
    echo "  - Environment File: $ENV_FILE"
    echo "  - Backup Directory: $BACKUP_DIR"
    echo ""

    # Access URLs
    log "Access URLs:"
    local server_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    echo "  🌐 Main Application: http://$server_ip"
    echo "  🔧 Admin Panel: http://$server_ip/admin"
    echo "  📊 API Docs: http://$server_ip/api"
    echo "  🚀 Development Ports:"
    echo "    - Frontend: http://$server_ip:3000"
    echo "    - Backend API: http://$server_ip:5000"
    echo "    - MQTT: $server_ip:1883"
    echo "    - MQTT WebSocket: $server_ip:9001"
}

# Show service logs
show_service_logs() {
    local service=$1

    if [ -n "$service" ]; then
        log "=== Logs for service: $service ==="
        docker-compose logs -f --tail=50 "$service"
    else
        log "=== All Service Logs (last 20 lines each) ==="
        docker-compose logs --tail=20
    fi
}

# Clean up deployment
cleanup_deployment() {
    log "Cleaning up Docker deployment..."

    # Stop all services
    docker-compose -f "$COMPOSE_FILE" down

    # Remove containers
    docker-compose -f "$COMPOSE_FILE" rm -f

    # Optional: Remove volumes (with confirmation)
    log_warning "Remove Docker volumes? This will delete all persistent data!"
    read -p "Remove volumes? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        log_info "Volumes removed"
    fi

    # Remove unused images
    log_info "Cleaning up unused Docker images..."
    docker image prune -f

    # Remove unused volumes
    log_info "Cleaning up unused Docker volumes..."
    docker volume prune -f

    log_success "Cleanup completed"
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back to previous deployment..."

    if [ -d "$BACKUP_DIR" ]; then
        # Stop current deployment
        docker-compose down

        # Restore backup
        cp "$BACKUP_DIR/.env" "$ENV_FILE" 2>/dev/null || log_warning "Could not restore .env file"

        # Restart with backup configuration
        docker-compose up -d

        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
        exit 1
    fi
}

# Main deployment function
main() {
    log "=== NewContainment Docker Deployment Script ==="
    echo ""

    # Default flags
    local testing_mode=false
    local production_mode=false
    local build_force=false
    local cleanup_mode=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --testing)
                testing_mode=true
                shift
                ;;
            --production)
                production_mode=true
                shift
                ;;
            --build)
                build_force=true
                shift
                ;;
            --cleanup)
                cleanup_mode=true
                shift
                ;;
            --status)
                show_deployment_status
                exit 0
                ;;
            --logs)
                shift
                show_service_logs "$1"
                exit 0
                ;;
            --rollback)
                rollback_deployment
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 [--testing|--production|--build|--cleanup|--status|--logs [service]|--rollback]"
                exit 1
                ;;
        esac
    done

    # Handle cleanup mode
    if [ "$cleanup_mode" = "true" ]; then
        cleanup_deployment
        exit 0
    fi

    # Validate OS and permissions
    if [[ "$EUID" -ne 0 ]]; then
        log_warning "It is recommended to run with sudo for Docker operations"
    fi

    # Run deployment steps
    check_dependencies
    setup_environment
    create_backup
    validate_deployment

    if [ "$build_force" = "true" ] || [ ! "$(docker images | grep newcontainment)" ]; then
        build_images "$build_force"
    fi

    deploy_services "$testing_mode" "$production_mode"
    perform_health_checks
    show_deployment_status

    log_success ""
    log_success "🎉 Docker deployment completed successfully!"
    log_success ""
    log_success "Next steps:"
    log_success "  1. Access your application at: http://$(hostname -I | awk '{print $1}')"
    log_success "  2. Monitor logs: docker-compose logs -f"
    log_success "  3. Check status: docker-compose ps"
    log_success "  4. Scale services: docker-compose up -d --scale frontend=3"
    log_success ""

    # Show quick commands
    echo -e "${BLUE}Quick Commands:${NC}"
    echo -e "  ${GREEN}Stop services:${NC}  docker-compose down"
    echo -e "  ${GREEN}View logs:${NC}      docker-compose logs -f"
    echo -e "  ${GREEN}Restart:${NC}       docker-compose restart"
    echo -e "  ${GREEN}Update:${NC}        docker-compose pull && docker-compose up -d"
    echo ""
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"
