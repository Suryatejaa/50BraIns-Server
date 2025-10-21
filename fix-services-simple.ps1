Write-Host "Fixing all services..." -ForegroundColor Green

$services = @("auth-service", "user-service", "clan-service", "credit-service", "notification-service", "social-media-service", "work-history-service", "reputation-service")

$SUPABASE_DB_URL = "postgresql://postgres.qicmqmstnpzunoomyxhu:MSvz7VNg9jz18iY4@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

foreach ($service in $services) {
    $servicePath = "services\$service"
    $envFile = "$servicePath\.env"
    
    if (Test-Path $envFile) {
        Write-Host "Updating $service..." -ForegroundColor Cyan
        
        $content = Get-Content $envFile
        $updatedContent = $content | ForEach-Object {
            if ($_ -match "^DATABASE_URL=") {
                "DATABASE_URL=`"$SUPABASE_DB_URL`""
            } else {
                $_
            }
        }
        
        $updatedContent | Set-Content $envFile
        Write-Host "Updated $service" -ForegroundColor Green
    }
}

Write-Host "All services updated!" -ForegroundColor Green