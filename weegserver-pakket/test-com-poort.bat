@echo off
cd /d "%~dp0"
title COM-test weegbrug

echo.
echo ========================================
echo   COM-test weegbrug (30 sec)
echo ========================================
echo.
echo Map: %~dp0
echo.

if not exist "%~dp0test-com-poort.mjs" (
  echo FOUT: test-com-poort.mjs niet gevonden in deze map.
  echo Kopieer de HELE Weegserver-map, niet alleen losse bestanden.
  goto einde
)

where node >nul 2>&1
if errorlevel 1 (
  echo FOUT: Node.js niet gevonden. Installeer van https://nodejs.org
  goto einde
)

if not exist "%~dp0package.json" (
  echo FOUT: package.json ontbreekt in deze map.
  goto einde
)

if not exist "%~dp0node_modules\serialport" (
  echo Dependencies installeren in deze map ^(eenmalig na verplaatsen^)...
  call npm install --omit=dev
  if errorlevel 1 (
    echo npm install mislukt.
    goto einde
  )
)

if "%~1"=="" (
  node "%~dp0test-com-poort.mjs"
) else (
  node "%~dp0test-com-poort.mjs" %1
)

:einde
echo.
pause
