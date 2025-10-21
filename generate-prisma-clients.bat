@echo off
REM Prisma Generate Script - Windows Batch Version
REM Regenerate Prisma clients for all services after schema changes

echo Starting Prisma client generation for all services...
echo =================================================

set total_services=9
set current_service=0
set failed_count=0
set success_count=0

call :process_service auth-service
call :process_service user-service  
call :process_service gig-service
call :process_service clan-service
call :process_service credit-service
call :process_service notification-service
call :process_service reputation-service
call :process_service work-history-service
call :process_service social-media-service

echo.
echo =================================================
echo Prisma client generation completed!
echo.

REM Summary
echo Summary:
echo   Successful: %success_count%/%total_services% services
echo   Failed: %failed_count%/%total_services% services

if %failed_count% gtr 0 (
    echo.
    echo Some services failed to generate Prisma clients.
    echo Please check the errors above and run the script again.
    echo You can also run 'npx prisma generate' manually in each service directory.
    exit /b 1
) else (
    echo.
    echo All Prisma clients generated successfully!
    echo Your services are ready to connect to Supabase!
    echo.
    echo Next steps:
    echo 1. Run the Supabase SQL script to create tables
    echo 2. Update your .env files with Supabase connection strings
    echo 3. Test your services with the new database setup
)

exit /b 0

:process_service
set /a current_service+=1
set service_name=%1

echo.
echo [%current_service%/%total_services%] Generating Prisma client for %service_name%...

REM Check if service directory exists
if not exist "services\%service_name%" (
    echo Service directory not found: services\%service_name%
    set /a failed_count+=1
    goto :eof
)

REM Check if schema file exists
if not exist "services\%service_name%\prisma\schema.prisma" (
    echo Schema file not found: services\%service_name%\prisma\schema.prisma
    set /a failed_count+=1
    goto :eof
)

REM Save current directory and change to service directory
pushd "services\%service_name%"

REM Run prisma generate
npx prisma generate >nul 2>&1

if %errorlevel% equ 0 (
    echo Successfully generated Prisma client for %service_name%
    set /a success_count+=1
) else (
    echo Failed to generate Prisma client for %service_name%
    set /a failed_count+=1
)

REM Return to original directory
popd

goto :eof