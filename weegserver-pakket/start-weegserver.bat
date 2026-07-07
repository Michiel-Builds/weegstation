@echo off
chcp 65001 >nul
cd /d "%~dp0"
title WeegStation Weegserver

echo.
echo ========================================
echo   WeegStation Weegserver
echo ========================================
echo.

if not exist "server.cjs" (
  echo FOUT: server.cjs niet gevonden in deze map.
  echo Pak Weegserver.zip opnieuw uit.
  pause
  exit /b 1
)

if not exist ".env" (
  echo FOUT: .env ontbreekt.
  echo.
  echo 1. Kopieer config.example.env naar .env
  echo 2. Vul WEEGSERVER_KEY in ^(zelfde als kantoor-PC^)
  echo 3. Start dit bestand opnieuw
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo FOUT: Node.js is niet geinstalleerd.
  echo Download LTS van https://nodejs.org en installeer opnieuw.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Eerste keer: dependencies installeren...
  call npm install --omit=dev
  if errorlevel 1 (
    echo npm install mislukt.
    pause
    exit /b 1
  )
)

echo Server starten... ^(dit venster open laten^)
echo.
node server.cjs
echo.
echo Server gestopt.
pause
