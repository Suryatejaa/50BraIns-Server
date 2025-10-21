@echo off
echo.
echo ========================================
echo Starting Gig Service
echo ========================================
echo.

cd /d "d:\project\50brains\50BraIns-Server\services\gig-service"

echo Checking environment...
if not exist ".env" (
    echo ERROR: .env file not found
    pause
    exit /b 1
)

echo Starting gig service on port 4004...
echo.
echo Available endpoints:
echo - Health Check: http://localhost:4004/health
echo - API Root: http://localhost:4004/
echo - Create Gig: POST http://localhost:4004/gigs
echo - Browse Gigs: GET http://localhost:4004/gigs
echo - My Posted Gigs: GET http://localhost:4004/my/posted
echo - My Applications: GET http://localhost:4004/my/applications
echo.
echo Press Ctrl+C to stop the service
echo.

npm start
