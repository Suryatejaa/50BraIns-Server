@echo off
echo Stopping WebSocket Gateway Service...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting WebSocket Gateway Service...
npm run dev
