#!/usr/bin/env bash

# 50BraIns Railway Deployment Script
# This script helps deploy each microservice to Railway individually

set -e  # Exit on any error

echo "🚀 50BraIns Railway Deployment Script"
echo "======================================"

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_path=$2
    
    echo ""
    echo "📦 Deploying $service_name..."
    echo "   Path: $service_path"
    
    cd "$service_path"
    
    # Check if railway.toml exists
    if [ ! -f "railway.toml" ]; then
        echo "❌ No railway.toml found in $service_path"
        return 1
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        echo "❌ No Dockerfile found in $service_path"
        return 1
    fi
    
    # Deploy to Railway
    echo "   🔧 Deploying $service_name to Railway..."
    railway up
    
    echo "   ✅ $service_name deployed successfully!"
    
    cd - > /dev/null
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   railway login"
    exit 1
fi

echo ""
echo "🔍 Checking Railway authentication..."
railway whoami

echo ""
echo "Select deployment option:"
echo "1. Deploy all services"
echo "2. Deploy specific service"
echo "3. Deploy core services only (gateway, auth, gig, user)"

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🏗️ Deploying all services..."
        
        deploy_service "API Gateway" "api-gateway"
        deploy_service "Auth Service" "services/auth-service"
        deploy_service "Gig Service" "services/gig-service"
        deploy_service "User Service" "services/user-service"
        deploy_service "Notification Service" "services/notification-service"
        deploy_service "WebSocket Gateway" "services/websocket-gateway"
        
        echo ""
        echo "🎉 All services deployed successfully!"
        ;;
    2)
        echo ""
        echo "Available services:"
        echo "1. api-gateway"
        echo "2. auth-service"
        echo "3. gig-service"
        echo "4. user-service"
        echo "5. notification-service"
        echo "6. websocket-gateway"
        
        read -p "Enter service number: " service_num
        
        case $service_num in
            1) deploy_service "API Gateway" "api-gateway" ;;
            2) deploy_service "Auth Service" "services/auth-service" ;;
            3) deploy_service "Gig Service" "services/gig-service" ;;
            4) deploy_service "User Service" "services/user-service" ;;
            5) deploy_service "Notification Service" "services/notification-service" ;;
            6) deploy_service "WebSocket Gateway" "services/websocket-gateway" ;;
            *) echo "❌ Invalid service number" ;;
        esac
        ;;
    3)
        echo ""
        echo "🏗️ Deploying core services..."
        
        deploy_service "API Gateway" "api-gateway"
        deploy_service "Auth Service" "services/auth-service"
        deploy_service "Gig Service" "services/gig-service"
        deploy_service "User Service" "services/user-service"
        
        echo ""
        echo "🎉 Core services deployed successfully!"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Check service logs: railway logs"
echo "   2. Set environment variables: railway variables"
echo "   3. Check service status in Railway dashboard"
echo ""
echo "🔗 Useful commands:"
echo "   railway logs --service <service-name>"
echo "   railway variables set KEY=value --service <service-name>"
echo "   railway status"