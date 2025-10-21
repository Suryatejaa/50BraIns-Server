#!/bin/bash
# Fix Prisma client generation issues across all services

echo "🔧 Fixing Prisma client generation issues..."

services=("auth-service" "user-service" "gig-service" "clan-service" "credit-service" "notification-service" "reputation-service" "work-history-service" "social-media-service")

for service in "${services[@]}"; do
    echo "📦 Processing $service..."
    
    if [ -d "services/$service" ]; then
        cd "services/$service"
        
        echo "  - Uninstalling old Prisma packages..."
        npm uninstall prisma @prisma/client --silent
        
        echo "  - Installing latest Prisma packages..."
        npm install prisma@latest @prisma/client@latest --silent
        
        echo "  - Generating Prisma client..."
        npx prisma generate
        
        cd "../.."
        echo "  ✅ $service completed"
    else
        echo "  ⚠️  $service directory not found"
    fi
done

echo "🎉 All services have been processed!"