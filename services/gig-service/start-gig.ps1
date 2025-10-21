#!/usr/bin/env powershell
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Gig Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "d:\project\50brains\50BraIns-Server\services\gig-service"

Write-Host "Checking environment..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting gig service on port 4004..." -ForegroundColor Green
Write-Host ""
Write-Host "Available endpoints:" -ForegroundColor Cyan
Write-Host "- Health Check: http://localhost:4004/health" -ForegroundColor White
Write-Host "- API Root: http://localhost:4004/" -ForegroundColor White
Write-Host "- Create Gig: POST http://localhost:4004/gigs" -ForegroundColor White
Write-Host "- Browse Gigs: GET http://localhost:4004/gigs" -ForegroundColor White
Write-Host "- My Posted Gigs: GET http://localhost:4004/my/posted" -ForegroundColor White
Write-Host "- My Applications: GET http://localhost:4004/my/applications" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow
Write-Host ""

npm start
