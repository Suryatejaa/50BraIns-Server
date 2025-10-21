# Fix all services with URL-encoded password
Write-Host "🔧 Fixing DATABASE_URL in all services with URL-encoded password..." -ForegroundColor Green

$services = @(
    "auth-service",
    "user-service", 
    "clan-service",
    "credit-service",
    "notification-service",
    "social-media-service",
    "work-history-service",
    "reputation-service"
)

$SUPABASE_DB_URL = "postgresql://postgres.qicmqmstnpzunoomyxhu:MSvz7VNg9jz18iY4@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

foreach ($service in $services) {
    $servicePath = "services\$service"
    $envFile = "$servicePath\.env"
    
    if (Test-Path $envFile) {
        Write-Host "  🔄 Updating $service..." -ForegroundColor Cyan
        
        # Read current .env file
        $content = Get-Content $envFile
        
        # Replace DATABASE_URL line with proper quoting
        $updatedContent = $content | ForEach-Object {
            if ($_ -match "^DATABASE_URL=") {
                "DATABASE_URL=`"$SUPABASE_DB_URL`""
            } else {
                $_
            }
        }
        
        # Write back to file
        $updatedContent | Set-Content $envFile
        Write-Host "  ✅ Updated $service" -ForegroundColor Green
        
        # Generate Prisma client
        Push-Location $servicePath
        try {
            Write-Host "    Generating Prisma client..." -ForegroundColor Gray
            npx prisma generate 2>$null
            Write-Host "    ✅ Prisma client generated" -ForegroundColor Green
        } catch {
            Write-Host "    ❌ Failed to generate Prisma client" -ForegroundColor Red
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "  ⚠️  No .env file found for $service" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "All services updated!" -ForegroundColor Green
Write-Host "You can now test each service with: npx prisma db push" -ForegroundColor Yellow