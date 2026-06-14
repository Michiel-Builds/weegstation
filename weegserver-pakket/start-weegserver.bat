@echo off

title WeegStation — Weegserver

cd /d "%~dp0"

echo.

if not exist ".env" (
  echo  FOUT: .env ontbreekt.
  echo  Kopieer config.example.env naar .env en vul WEEGSERVER_KEY in.
  echo  Dezelfde sleutel als in WeegStation op kantoor-PC.
  echo.
  pause
  exit /b 1
)

echo  WeegStation — Weegserver
echo  Sluit dit venster niet tijdens het werken.
echo.

if not exist "node_modules\" (
  echo  Eerste keer: dependencies installeren...
  call npm install --omit=dev
  echo.
)

node server.cjs
echo.
pause
