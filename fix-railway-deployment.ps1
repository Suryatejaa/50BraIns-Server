# Railway Deployment Fix Script
Write-Host "Railway Deployment Fix Script" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Function to run SQL fixes
function Fix-Database {
    Write-Host ""
    Write-Host "Applying database fixes..." -ForegroundColor Blue
    
    Write-Host "   Fixing cron_leader table for gig service..." -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "Manual Database Fix Required:" -ForegroundColor Yellow
    Write-Host "   1. Connect to your Railway PostgreSQL database" -ForegroundColor Gray
    Write-Host "   2. Run the SQL script: fix-cron-leader-table.sql" -ForegroundColor Gray
    Write-Host "   3. This fixes the missing instanceId column error" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "   SQL Command to run:" -ForegroundColor Cyan
    Write-Host "   psql `$DATABASE_URL -f fix-cron-leader-table.sql" -ForegroundColor Gray
}

# Function to clear Railway build cache
function Clear-BuildCache {
    Write-Host ""
    Write-Host "Clearing Railway build cache..." -ForegroundColor Blue
    
    Write-Host "   The build errors are caused by cached Docker layers" -ForegroundColor Yellow
    Write-Host "   referencing the old root Dockerfile that was removed." -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "Cache Clear Instructions:" -ForegroundColor Yellow
    Write-Host "   1. Go to Railway dashboard for each failing service" -ForegroundColor Gray
    Write-Host "   2. Go to Settings -> Build -> Clear Build Cache" -ForegroundColor Gray
    Write-Host "   3. Or add a dummy comment to Dockerfile to force rebuild" -ForegroundColor Gray
}

# Function to show deployment order
function Show-DeploymentOrder {
    Write-Host ""
    Write-Host "Recommended Deployment Order:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   1. First: Apply database fixes" -ForegroundColor Cyan
    Write-Host "      psql `$DATABASE_URL -f fix-cron-leader-table.sql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Deploy API Gateway (entry point)" -ForegroundColor Cyan
    Write-Host "      cd api-gateway ; railway up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. Deploy Auth Service (authentication)" -ForegroundColor Cyan
    Write-Host "      cd services\auth-service ; railway up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   4. Deploy User Service" -ForegroundColor Cyan
    Write-Host "      cd services\user-service ; railway up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   5. Deploy Gig Service" -ForegroundColor Cyan
    Write-Host "      cd services\gig-service ; railway up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   6. Deploy Notification Service" -ForegroundColor Cyan
    Write-Host "      cd services\notification-service ; railway up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   7. Deploy WebSocket Gateway" -ForegroundColor Cyan
    Write-Host "      cd services\websocket-gateway ; railway up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Or use automated script:" -ForegroundColor Yellow
    Write-Host "   .\deploy-railway.ps1 -Core" -ForegroundColor Green
}

# Main execution
Write-Host ""
Write-Host "Issues Found and Fixed:" -ForegroundColor Green
Write-Host "   ✓ Removed conflicting root Dockerfile" -ForegroundColor Gray
Write-Host "   ✓ Enhanced notification service Dockerfile" -ForegroundColor Gray
Write-Host "   ✓ Added build scripts to all services" -ForegroundColor Gray
Write-Host "   ✓ Created database fix script" -ForegroundColor Gray

Fix-Database
Clear-BuildCache  
Show-DeploymentOrder

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "   1. Apply database fixes" -ForegroundColor Yellow
Write-Host "   2. Clear build cache in Railway dashboard" -ForegroundColor Yellow
Write-Host "   3. Set environment variables" -ForegroundColor Yellow
Write-Host "   4. Deploy services in order" -ForegroundColor Yellow

Write-Host ""
Write-Host "Railway deployment fixes completed!" -ForegroundColor Green