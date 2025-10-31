@echo off
echo =====================================================
echo Regenerating Prisma Client After Database Migration
echo =====================================================

echo.
echo 1. Regenerating Prisma client for auth-service...
cd /d "D:\project\50brains\50BraIns-Server\services\auth-service"
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate auth-service Prisma client
    pause
    exit /b 1
)
echo ✅ Auth-service Prisma client generated

echo.
echo 2. Regenerating Prisma client for user-service...
cd /d "D:\project\50brains\50BraIns-Server\services\user-service"
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate user-service Prisma client
    pause
    exit /b 1
)
echo ✅ User-service Prisma client generated

echo.
echo =====================================================
echo ✅ All Prisma clients regenerated successfully!
echo =====================================================
echo.
echo Next steps:
echo 1. Restart your services
echo 2. Test the profile update endpoints
echo.
pause