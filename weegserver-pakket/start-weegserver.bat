@echo off
cd /d "%~dp0"
title WeegStation Weegserver

echo.
echo ========================================
echo   WeegStation Weegserver
echo ========================================
echo.

if not exist "server.cjs" (
  echo FOUT: server.cjs niet gevonden in deze map.
  echo.
  echo Pak Weegserver.zip volledig uit naar bijv. C:\WeegStation\Weegserver\
  echo Start daarna start-weegserver.bat vanuit DIE map.
  goto einde
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
  goto einde
)

set "WEEGSERVER_KEY="
set "WEEGBRUG_COM="
for /f "usebackq tokens=1,* delims==" %%A in (`findstr /b /i "WEEGSERVER_KEY=" ".env" 2^>nul`) do set "WEEGSERVER_KEY=%%B"
for /f "usebackq tokens=1,* delims==" %%A in (`findstr /b /i "WEEGBRUG_COM=" ".env" 2^>nul`) do set "WEEGBRUG_COM=%%B"

if not defined WEEGSERVER_KEY (
  echo FOUT: WEEGSERVER_KEY ontbreekt in .env
  echo Vul de sleutel van de kantoor-PC in en start opnieuw.
  goto einde
)

if defined WEEGBRUG_COM (
  echo COM-poort weegbrug: %WEEGBRUG_COM% ^(uit .env^)
) else (
  echo COM-poort weegbrug: COM5 ^(standaard^)
)
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo FOUT: Node.js is niet geinstalleerd.
  echo Installeer Node.js LTS van https://nodejs.org
  goto einde
)

if not exist "node_modules" (
  echo Eerste keer: dependencies installeren...
  call npm install --omit=dev
  if errorlevel 1 (
    echo npm install mislukt.
    goto einde
  )
)

echo Server starten... ^(dit venster open laten^)
echo Monitor opent automatisch in de browser.
echo Handmatig: http://127.0.0.1:3000/monitor
echo.

if exist "%~dp0open-monitor-na-start.bat" (
  start /b "" "%~dp0open-monitor-na-start.bat"
) else (
  start /b "" "%~dp0open-monitor.bat"
)

node server.cjs
if errorlevel 1 (
  echo.
  echo FOUT: server gestopt met een fout.
  echo Controleer WEEGSERVER_KEY en of poort 3000 vrij is.
)

:einde
echo.
pause
