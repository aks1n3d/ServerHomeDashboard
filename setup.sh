#!/bin/bash

# Homelab Dashboard Setup Script
# This script helps set up the dashboard for different scenarios

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Homelab Dashboard Setup Script                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker found${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose found${NC}"

# Create necessary directories
echo ""
echo -e "${BLUE}→ Creating directories...${NC}"
mkdir -p config
mkdir -p frontend
mkdir -p backend
echo -e "${GREEN}✓ Directories created${NC}"

# Check if services.json exists
if [ ! -f config/services.json ]; then
    echo -e "${YELLOW}⚠ services.json not found, creating default...${NC}"
    cat > config/services.json << 'EOF'
[
  {
    "name": "Jellyfin",
    "url": "http://localhost:8096",
    "icon": "jellyfin.svg"
  },
  {
    "name": "Filebrowser",
    "url": "http://localhost:8080",
    "icon": "filebrowser.svg"
  },
  {
    "name": "Pi-hole",
    "url": "http://localhost:8081",
    "icon": "pihole.svg"
  }
]
EOF
    echo -e "${GREEN}✓ Default services.json created${NC}"
else
    echo -e "${GREEN}✓ services.json already exists${NC}"
fi

# Show setup options
echo ""
echo -e "${BLUE}Choose setup option:${NC}"
echo "1) Deploy with Docker Compose (Recommended)"
echo "2) Build Docker image manually"
echo "3) Setup for local development"
echo "4) Show configuration help"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}→ Starting Docker Compose...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✓ Dashboard started!${NC}"
        echo ""
        echo "Access the dashboard at: http://localhost:3395"
        echo ""
        echo "View logs:"
        echo "  docker-compose logs -f dashboard"
        echo ""
        echo "Stop the dashboard:"
        echo "  docker-compose down"
        ;;
    2)
        echo ""
        echo -e "${BLUE}→ Building Docker image...${NC}"
        docker build -t homelab-dashboard:latest .
        echo -e "${GREEN}✓ Image built successfully${NC}"
        echo ""
        echo "Run the image:"
        echo "  docker run -p 3395:3000 \\"
        echo "    -v \$(pwd)/config:/app/config \\"
        echo "    -v /var/run/docker.sock:/var/run/docker.sock \\"
        echo "    homelab-dashboard:latest"
        ;;
    3)
        echo ""
        echo -e "${BLUE}→ Setting up for local development...${NC}"

        # Check if Node.js is installed
        if ! command -v node &> /dev/null; then
            echo -e "${RED}✗ Node.js is not installed${NC}"
            echo "Please install Node.js 18 or later from https://nodejs.org"
            exit 1
        fi

        echo -e "${GREEN}✓ Node.js found ($(node --version))${NC}"

        echo ""
        echo -e "${BLUE}→ Installing dependencies...${NC}"
        npm install
        echo -e "${GREEN}✓ Dependencies installed${NC}"

        echo ""
        echo "Start the development server:"
        echo "  npm start"
        echo ""
        echo "The dashboard will be available at: http://localhost:3000"
        ;;
    4)
        echo ""
        echo -e "${BLUE}Configuration Guide${NC}"
        echo ""
        echo "1. Edit config/services.json to add your services"
        echo ""
        echo "Example service entry:"
        echo "  {"
        echo "    \"name\": \"My Service\","
        echo "    \"url\": \"http://192.168.1.100:8080\","
        echo "    \"icon\": \"service.svg\""
        echo "  }"
        echo ""
        echo "2. Service URLs:"
        echo "   - Use IP addresses for host services"
        echo "   - Use service names for Docker Compose services"
        echo ""
        echo "3. Icons:"
        echo "   - Auto-detected based on service name"
        echo "   - Supports emoji or SVG files"
        echo ""
        echo "4. Health checks:"
        echo "   - Run every 10 seconds automatically"
        echo "   - Services timeout after 5 seconds"
        echo ""
        echo "5. Docker Compose:"
        echo "   - Runs on port 3395 by default"
        echo "   - Mount docker.sock for container stats"
        echo "   - Auto-restarts on failure"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"

