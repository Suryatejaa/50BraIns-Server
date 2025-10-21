#!/bin/bash
# Prisma Generate Script - Regenerate Prisma clients for all services
# This script updates all Prisma clients after schema changes

echo "🔧 Starting Prisma client generation for all services..."
echo "================================================="

# Array of service directories
services=(
    "auth-service"
    "user-service"
    "gig-service"
    "clan-service"
    "credit-service"
    "notification-service"
    "reputation-service"
    "work-history-service"
    "social-media-service"
)

# Counter for tracking progress
total_services=${#services[@]}
current_service=0
failed_services=()

# Function to generate Prisma client for a service
generate_prisma_client() {
    local service=$1
    local service_path="services/$service"
    
    echo ""
    echo "[$((current_service + 1))/$total_services] 🔄 Generating Prisma client for $service..."
    
    if [ ! -d "$service_path" ]; then
        echo "❌ Service directory not found: $service_path"
        failed_services+=("$service - Directory not found")
        return 1
    fi
    
    if [ ! -f "$service_path/prisma/schema.prisma" ]; then
        echo "❌ Schema file not found: $service_path/prisma/schema.prisma"
        failed_services+=("$service - Schema file not found")
        return 1
    fi
    
    # Change to service directory and run prisma generate
    cd "$service_path" || {
        echo "❌ Failed to change to directory: $service_path"
        failed_services+=("$service - Directory access failed")
        return 1
    }
    
    if npx prisma generate > /dev/null 2>&1; then
        echo "✅ Successfully generated Prisma client for $service"
    else
        echo "❌ Failed to generate Prisma client for $service"
        failed_services+=("$service - Generation failed")
        cd - > /dev/null
        return 1
    fi
    
    # Return to root directory
    cd - > /dev/null
    return 0
}

# Main execution
echo "Starting Prisma client generation..."
echo ""

for service in "${services[@]}"; do
    generate_prisma_client "$service"
    ((current_service++))
done

echo ""
echo "================================================="
echo "🎉 Prisma client generation completed!"
echo ""

# Summary
successful=$((total_services - ${#failed_services[@]}))
echo "📊 Summary:"
echo "  ✅ Successful: $successful/$total_services services"
echo "  ❌ Failed: ${#failed_services[@]}/$total_services services"

if [ ${#failed_services[@]} -gt 0 ]; then
    echo ""
    echo "❌ Failed services:"
    for failure in "${failed_services[@]}"; do
        echo "  - $failure"
    done
    echo ""
    echo "💡 Please check the errors above and run the script again for failed services."
    exit 1
else
    echo ""
    echo "🎉 All Prisma clients generated successfully!"
    echo "🚀 Your services are ready to connect to Supabase!"
fi