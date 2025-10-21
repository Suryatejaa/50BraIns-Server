Write-Host "Starting User Service..." -ForegroundColor Cyan
Set-Location -Path "services/user-service"
npm run dev
