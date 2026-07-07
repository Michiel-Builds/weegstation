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
  if exist "env.txt" ren "env.txt" ".env"
  if exist ".env.txt" ren ".env.txt" ".env"
  if not exist ".env" if exist "weegbrug.env" copy /Y "weegbrug.env" ".env" >nul
  if not exist ".env" if exist "config.example.env" copy /Y "config.example.env" ".env" >nul
)

if not exist ".env" (
  echo FOUT: .env ontbreekt.
  echo.
  echo Dubbelklik eerst: maak-env.bat
  echo   ^(maakt .env zonder Kladblok — geen .txt probleem^)
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
