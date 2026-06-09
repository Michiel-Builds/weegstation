@echo off
title Bulters Weegsysteem — Weegserver
cd /d "%~dp0"
echo.
echo  Bulters Weegsysteem — Weegserver
echo  Sluit dit venster niet tijdens het werken.
echo.
if not exist "node_modules\" (
  echo  EERSTE KEER: even wachten, dependencies worden geinstalleerd...
  call npm install --omit=dev
  echo.
)
node server.cjs
echo.
pause
