# Force Railpack Auto-Detection by temporarily hiding Dockerfiles
Write-Host "Temporarily renaming Dockerfiles to force Railpack..." -ForegroundColor Cyan

$dockerfiles = @(
    "api-gateway\Dockerfile",
    "services\auth-service\Dockerfile", 
    "services\gig-service\Dockerfile",
    "services\websocket-gateway\Dockerfile"
)

foreach ($dockerfile in $dockerfiles) {
    if (Test-Path $dockerfile) {
        $backup = $dockerfile + ".backup"
        Rename-Item $dockerfile $backup
        Write-Host "   Renamed: $dockerfile -> $backup" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Dockerfiles renamed. Now Railway should use Railpack auto-detection." -ForegroundColor Yellow
Write-Host "After successful deployment, we can restore them if needed." -ForegroundColor Gray