#!/bin/bash

# IoT Containment System - Documentation Build Script (Bash)
# This script automates the complete documentation build process

set -e  # Exit on any error

# Default values
ENVIRONMENT="development"
SERVE=false
OPEN_BROWSER=false
WATCH=false
CLEAN=false
PORT=8080

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to show usage
show_usage() {
    echo "IoT Containment System - Documentation Builder"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (development|staging|production)"
    echo "  -s, --serve             Start documentation server after build"
    echo "  -o, --open              Open browser after starting server"
    echo "  -w, --watch             Enable file watching for auto-rebuild"
    echo "  -c, --clean             Clean output directory before build"
    echo "  -p, --port PORT         Server port (default: 8080)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Basic build"
    echo "  $0 -s                        # Build and serve"
    echo "  $0 -s -o                     # Build, serve, and open browser"
    echo "  $0 -w -s                     # Build, serve, and watch for changes"
    echo "  $0 -c -e production          # Clean build for production"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--serve)
            SERVE=true
            shift
            ;;
        -o|--open)
            OPEN_BROWSER=true
            shift
            ;;
        -w|--watch)
            WATCH=true
            shift
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOC_DIR="$(dirname "$SCRIPT_DIR")"
GENERATOR_DIR="$DOC_DIR/generator"
OUTPUT_DIR="$DOC_DIR/output"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  IoT Containment - Documentation Builder   ${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

echo -e "${GREEN}📁 Working Directory: $DOC_DIR${NC}"
echo -e "${GREEN}🔧 Generator Directory: $GENERATOR_DIR${NC}"
echo -e "${GREEN}📄 Output Directory: $OUTPUT_DIR${NC}"
echo ""

# Function to check if Node.js is installed
check_nodejs() {
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
        return 0
    else
        echo -e "${RED}❌ Node.js not found${NC}"
        echo -e "${YELLOW}📥 Please install Node.js from https://nodejs.org/${NC}"
        return 1
    fi
}

# Function to install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    cd "$GENERATOR_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing npm packages...${NC}"
        npm install
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to install dependencies${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}Dependencies already installed${NC}"
    fi
}

# Function to clean output directory
clean_output() {
    if [ "$CLEAN" = true ] || [ -d "$OUTPUT_DIR" ]; then
        echo -e "${YELLOW}🧹 Cleaning output directory...${NC}"
        rm -rf "$OUTPUT_DIR"
        mkdir -p "$OUTPUT_DIR"
    fi
}

# Function to generate documentation
build_documentation() {
    echo -e "${BLUE}🚀 Generating documentation...${NC}"
    
    cd "$GENERATOR_DIR"
    
    # Set environment variable
    export NODE_ENV="$ENVIRONMENT"
    
    # Run the generator
    npm run generate
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Documentation generation failed!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Documentation generated successfully!${NC}"
}

# Function to serve documentation
start_server() {
    echo -e "${BLUE}🌐 Starting documentation server...${NC}"
    
    cd "$GENERATOR_DIR"
    
    if [ "$WATCH" = true ]; then
        echo -e "${YELLOW}👀 Starting in watch mode...${NC}"
        npm run watch &
        sleep 2
    fi
    
    # Open browser if requested
    if [ "$OPEN_BROWSER" = true ]; then
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open "http://localhost:$PORT" >/dev/null 2>&1 &
        elif command -v open >/dev/null 2>&1; then
            open "http://localhost:$PORT" >/dev/null 2>&1 &
        else
            echo -e "${YELLOW}⚠️  Could not open browser automatically${NC}"
        fi
    fi
    
    echo -e "${GREEN}📚 Documentation server starting on port $PORT${NC}"
    echo -e "${CYAN}🔗 URL: http://localhost:$PORT${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
    
    # Start the server (this will block)
    export PORT="$PORT"
    npm run serve
}

# Function to show build summary
show_summary() {
    if [ -d "$OUTPUT_DIR" ]; then
        FILE_COUNT=$(find "$OUTPUT_DIR" -type f | wc -l)
        TOTAL_SIZE=$(find "$OUTPUT_DIR" -type f -exec stat -f%z {} \; | awk '{sum+=$1} END {print sum}' 2>/dev/null || find "$OUTPUT_DIR" -type f -printf "%s\n" | awk '{sum+=$1} END {print sum}' 2>/dev/null || echo "0")
        SIZE_KB=$(echo "scale=2; $TOTAL_SIZE / 1024" | bc 2>/dev/null || echo "0")
        
        echo ""
        echo -e "${CYAN}📋 Build Summary:${NC}"
        echo -e "${WHITE}  📁 Output Directory: $OUTPUT_DIR${NC}"
        echo -e "${WHITE}  📄 Files Generated: $FILE_COUNT${NC}"
        echo -e "${WHITE}  💾 Total Size: ${SIZE_KB} KB${NC}"
        echo -e "${WHITE}  🌐 Environment: $ENVIRONMENT${NC}"
        echo ""
        
        echo -e "${GREEN}📂 Generated Files:${NC}"
        find "$OUTPUT_DIR" -maxdepth 1 -type f -exec basename {} \; | while read -r file; do
            echo -e "   • $file"
        done
        echo ""
    fi
}

# Trap function to handle Ctrl+C
cleanup() {
    echo ""
    echo -e "${YELLOW}👋 Shutting down...${NC}"
    # Kill background processes
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution flow
main() {
    # Check prerequisites
    if ! check_nodejs; then
        exit 1
    fi
    
    # Clean if requested
    clean_output
    
    # Install dependencies
    install_dependencies
    
    # Generate documentation
    build_documentation
    
    # Show summary
    show_summary
    
    # Start server if requested
    if [ "$SERVE" = true ]; then
        start_server
    else
        echo -e "${GREEN}✨ Documentation build completed!${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo -e "${WHITE}  • Run with -s to start the documentation server${NC}"
        echo -e "${WHITE}  • Run with -w to enable auto-regeneration${NC}"
        echo -e "${WHITE}  • Check the output directory: $OUTPUT_DIR${NC}"
    fi
}

# Run main function
main "$@"