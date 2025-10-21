@echo off
REM Fix Prisma client generation issues across all services

echo 🔧 Fixing Prisma client generation issues...

set services=auth-service user-service gig-service clan-service credit-service notification-service reputation-service work-history-service social-media-service

for %%s in (%services%) do (
    echo 📦 Processing %%s...
    
    if exist "services\%%s" (
        cd "services\%%s"
        
        echo   - Uninstalling old Prisma packages...
        npm uninstall prisma @prisma/client >nul 2>&1
        
        echo   - Installing latest Prisma packages...
        npm install prisma@latest @prisma/client@latest >nul 2>&1
        
        echo   - Generating Prisma client...
        npx prisma generate
        
        cd "..\..\"
        echo   ✅ %%s completed
    ) else (
        echo   ⚠️  %%s directory not found
    )
)

echo 🎉 All services have been processed!
pause