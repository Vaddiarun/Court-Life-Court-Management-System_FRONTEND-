@echo off
cd /d "%~dp0"
title Court Life Frontend
echo ===== Court Life frontend (React + Vite + Tailwind) =====
where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo [1/2] Installing packages (first time only, about 1 minute) ...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)
echo [2/2] Starting the UI on http://localhost:3000  (backend must be running on :8000)
start "" http://localhost:3000
call npm run dev
pause
