@echo off
chcp 65001 >nul
cd /d "%~dp0"
title WeegStation — .env aanmaken

echo.
echo ========================================
echo   .env aanmaken (geen Kladblok nodig)
echo ========================================
echo.

if exist ".env" (
  echo .env bestaat al in deze map.
  type .env
  echo.
  pause
  exit /b 0
)

if exist "env.txt" (
  ren "env.txt" ".env"
  echo OK: env.txt hernoemd naar .env
  goto klaar
)

if exist ".env.txt" (
  ren ".env.txt" ".env"
  echo OK: .env.txt hernoemd naar .env
  goto klaar
)

if exist "weegbrug.env" (
  copy /Y "weegbrug.env" ".env" >nul
  echo OK: weegbrug.env gekopieerd naar .env
  goto klaar
)

if exist "config.example.env" (
  copy /Y "config.example.env" ".env" >nul
  echo .env aangemaakt van config.example.env
  echo Vul WEEGSERVER_KEY in en start opnieuw.
  pause
  exit /b 1
)

echo FOUT: geen weegbrug.env of config.example.env gevonden.
pause
exit /b 1

:klaar
echo.
echo Inhoud .env:
type .env
echo.
echo Klaar — start nu start-weegserver.bat
echo.
pause
