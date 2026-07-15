@echo off
chcp 65001 >nul
cd /d "%~dp0"
title COM-poorten

echo.
echo ========================================
echo   Beschikbare COM-poorten
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo FOUT: Node.js is niet geinstalleerd.
  pause
  exit /b 1
)

if not exist "node_modules\serialport" (
  echo Dependencies installeren ^(eenmalig^)...
  call npm install --omit=dev
  if errorlevel 1 (
    echo npm install mislukt.
    pause
    exit /b 1
  )
)

node lijst-com-poorten.mjs
echo.
pause
