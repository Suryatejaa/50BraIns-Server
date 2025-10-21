#!/bin/bash

# Start Notification Service Script
echo "📬 Starting 50BraIns Notification Service..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Check if database is accessible
echo "🔍 Checking database connection..."
if ! npx prisma db push --preview-feature --accept-data-loss 2>/dev/null; then
    echo "⚠️  Database not accessible. Attempting to create..."
    npx prisma migrate dev --name init || {
        echo "❌ Failed to setup database. Please check your DATABASE_URL."
        exit 1
    }
else
    echo "✅ Database connection successful"
fi

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || {
    echo "❌ Migration failed"
    exit 1
}

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Seed database (optional)
if [ "$1" = "--seed" ]; then
    echo "🌱 Seeding database with sample data..."
    npm run prisma:seed
fi

# Start the service
echo "🚀 Starting Notification Service..."
if [ "$NODE_ENV" = "production" ]; then
    npm start
else
    npm run dev
fi
