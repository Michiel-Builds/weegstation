@echo off
cd /d "%~dp0"
title Controle Weegserver-map

echo.
echo ========================================
echo   Controle Weegserver-map
echo ========================================
echo.
echo Map: %~dp0
echo.

set FOUT=0

if exist "%~dp0server.cjs" (echo [OK] server.cjs) else (echo [X] server.cjs ONTBREEKT & set FOUT=1)
if exist "%~dp0monitor.html" (echo [OK] monitor.html) else (echo [X] monitor.html ONTBREEKT & set FOUT=1)
if exist "%~dp0test-com-poort.mjs" (echo [OK] test-com-poort.mjs) else (echo [X] test-com-poort.mjs ONTBREEKT & set FOUT=1)
if exist "%~dp0package.json" (echo [OK] package.json) else (echo [X] package.json ONTBREEKT & set FOUT=1)
if exist "%~dp0node_modules\serialport" (echo [OK] node_modules) else (echo [!] node_modules ontbreekt — npm install nodig)
if exist "%~dp0.env" (echo [OK] .env) else (echo [!] .env ontbreekt — maak-env.bat)

echo.
if "%FOUT%"=="1" (
  echo Niet alle bestanden aanwezig.
  echo Pak Weegserver.zip opnieuw uit naar deze map.
) else (
  echo Map ziet er compleet uit.
  echo Na verplaatsen: npm install als node_modules ontbreekt.
)

echo.
pause
