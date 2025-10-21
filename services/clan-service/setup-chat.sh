#!/bin/bash

echo "🏛️ Setting up Clan Chat Service..."
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/clan_service"

# RabbitMQ Configuration (optional)
RABBITMQ_URL="amqp://admin:admin123@localhost:5672"
RABBITMQ_EXCHANGE="brains_events"

# Service Configuration
PORT=4003
NODE_ENV="development"
LOG_LEVEL="INFO"
EOF
    echo "✅ .env template created. Please update with your actual values."
else
    echo "✅ .env file found"
fi

# Check if database is accessible
echo "🔍 Checking database connection..."
if command -v psql &> /dev/null; then
    # Try to connect to database (this will fail if not configured, but that's okay)
    echo "ℹ️  PostgreSQL client found. Please ensure your database is running and accessible."
else
    echo "ℹ️  PostgreSQL client not found. Please ensure your database is running and accessible."
fi

# Check if RabbitMQ is accessible
echo "🐰 Checking RabbitMQ connection..."
if command -v rabbitmqctl &> /dev/null; then
    echo "ℹ️  RabbitMQ client found. Please ensure your RabbitMQ server is running."
else
    echo "ℹ️  RabbitMQ client not found. Please ensure your RabbitMQ server is running."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your database and RabbitMQ credentials"
echo "2. Run database migrations: npm run db:migrate"
echo "3. Start the service: npm start"
echo "4. Test the chat: Open test-websocket.html in your browser"
echo ""
echo "Service will be available at:"
echo "  HTTP: http://localhost:4003"
echo "  WebSocket: ws://localhost:4003/ws"
echo "  Health: http://localhost:4003/health"
echo "  WebSocket Health: http://localhost:4003/health/websocket"
echo ""
echo "Happy chatting! 🚀"
