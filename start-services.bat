@echo off

echo Starting API Gateway...
cd /d "D:\project\50brains\50BraIns-Server\api-gateway"
start "API Gateway" cmd /k "npm run dev"

echo Starting WebSocket Gateway...
cd /d "D:\project\50brains\50BraIns-Server\services\websocket-gateway"
start "WebSocket Gateway" cmd /k "npm run dev"

echo Starting Auth Service...
cd /d "D:\project\50brains\50BraIns-Server\services\auth-service"
start "Auth Service" cmd /k "npm run dev"

echo Starting User Service...
cd /d "D:\project\50brains\50BraIns-Server\services\user-service"
start "User Service" cmd /k "npm run dev"

@REM echo Starting Credit Service...
@REM cd /d "D:\project\50brains\50BraIns-Server\services\credit-service"
@REM start "Credit Service" cmd /k "npm run dev"

echo Starting Gig Service...
cd /d "D:\project\50brains\50BraIns-Server\services\gig-service"
start "Gig Service" cmd /k "npm run dev"

echo Starting Notification Service...
cd /d "D:\project\50brains\50BraIns-Server\services\notification-service"
start "Notification Service" cmd /k "npm run dev"

@REM echo Starting Clan Service...
@REM cd /d "D:\project\50brains\50BraIns-Server\services\clan-service"
@REM start "Clan Service" cmd /k "npm run dev"

echo Starting Reputation Service...
cd /d "D:\project\50brains\50BraIns-Server\services\reputation-service"
start "Reputation Service" cmd /k "npm run dev"

@REM echo Starting Social-media Service...
@REM cd /d "D:\project\50brains\50BraIns-Server\services\social-media-service"
@REM start "Social-media Service" cmd /k "npm run dev"

echo Starting Work-history Service...
cd /d "D:\project\50brains\50BraIns-Server\services\work-history-service"
start "Work-history Service" cmd /k "npm run dev"

echo Services starting in separate windows...
echo API Gateway: http://localhost:3000
echo WebSocket Gateway: http://localhost:4000
echo Auth Service: http://localhost:4001
echo User Service: http://localhost:4002
echo Gig Service: http://localhost:4004
echo Reputation Service: http://localhost:4006
echo Work-history Service: http://localhost:4007
echo Notification Service: http://localhost:4009
pause
@REM echo Clan Service: http://localhost:4003
@REM echo Credit Service: http://localhost:4005
@REM echo Social-media Service: http://localhost:4008
