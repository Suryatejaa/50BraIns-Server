# Push all Prisma schemas to Supabase
# This script will create all tables with prefixed names

$services = @(
    "gig-service",
    "clan-service", 
    "credit-service",
    "notification-service",
    "reputation-service",
    "work-history-service",
    "social-media-service"
)

Write-Host "Pushing Prisma schemas to Supabase..." -ForegroundColor Green
Write-Host ("=" * 50)

foreach ($service in $services) {
    Write-Host "`nProcessing $service..." -ForegroundColor Yellow
    
    if (Test-Path "services/$service") {
        Set-Location "services/$service"
        
        try {
            $output = npx prisma db push 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully pushed schema for $service" -ForegroundColor Green
            } else {
                Write-Host "Failed to push schema for $service" -ForegroundColor Red
                Write-Host $output -ForegroundColor Red
            }
        } catch {
            Write-Host "Error pushing schema for ${service}: $_" -ForegroundColor Red
        }
        
        Set-Location "../.."
    } else {
        Write-Host "Service directory not found: services/$service" -ForegroundColor Red
    }
}

Write-Host ("`n" + ("=" * 50))
Write-Host "Schema push completed!" -ForegroundColor Green
Write-Host "All services should now have their tables created in Supabase." -ForegroundColor Cyan