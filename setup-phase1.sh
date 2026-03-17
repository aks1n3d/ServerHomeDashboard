#!/bin/bash

# Phase 1 Setup Script for Homelab Dashboard

echo "🚀 Starting Phase 1 Setup..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create database directory if it doesn't exist
mkdir -p backend/db

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start the server: npm start"
echo "2. Access the dashboard: http://localhost:3000"
echo "3. Register a new account or login"
echo ""
echo "🧪 Testing:"
echo "   - Register: curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\"}'"
echo "   - Services: curl http://localhost:3000/api/services"
echo ""

