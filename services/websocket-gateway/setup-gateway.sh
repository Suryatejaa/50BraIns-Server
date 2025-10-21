#!/bin/bash

# WebSocket Gateway Service Setup Script
# This script sets up the WebSocket Gateway service

echo "🚀 Setting up WebSocket Gateway Service..."
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Check if port 4000 is available
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 4000 is already in use. Please free up port 4000 first."
    echo "   You can check what's using it with: lsof -i :4000"
    exit 1
fi

echo "✅ Port 4000 is available"

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create environment file
if [ ! -f .env ]; then
    echo "🔧 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created"
    echo "   Please edit .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

# Check if RabbitMQ is running
echo "🐰 Checking RabbitMQ connection..."
if command -v rabbitmqctl &> /dev/null; then
    if rabbitmqctl status >/dev/null 2>&1; then
        echo "✅ RabbitMQ is running"
    else
        echo "⚠️  RabbitMQ is not running. Please start RabbitMQ first."
        echo "   You can start it with: sudo systemctl start rabbitmq-server"
    fi
else
    echo "⚠️  RabbitMQ is not installed or not in PATH"
    echo "   Please ensure RabbitMQ is running on localhost:5672"
fi

# Check if required services are accessible
echo "🔍 Checking service availability..."

# Check clan service
if curl -s http://localhost:4003/health >/dev/null 2>&1; then
    echo "✅ Clan Service is accessible on port 4003"
else
    echo "⚠️  Clan Service is not accessible on port 4003"
    echo "   Make sure the clan service is running"
fi

# Check notification service
if curl -s http://localhost:4001/health >/dev/null 2>&1; then
    echo "✅ Notification Service is accessible on port 4001"
else
    echo "⚠️  Notification Service is not accessible on port 4001"
    echo "   Make sure the notification service is running"
fi

echo ""
echo "🎉 WebSocket Gateway Service setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Ensure RabbitMQ is running on localhost:5672"
echo "3. Start the service with: npm start"
echo "4. Test with: open test-gateway.html"
echo ""
echo "🔌 Service will be available at:"
echo "   WebSocket: ws://localhost:4000/ws"
echo "   HTTP: http://localhost:4000"
echo "   Health: http://localhost:4000/health"
echo ""
echo "📚 For more information, see README.md"
