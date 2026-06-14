@echo off
title Bulters Weegsysteem — Weegserver
cd /d "%~dp0"
echo.

if not exist ".env" (
  echo  FOUT: .env ontbreekt in deze map.
  echo  Kopieer .env.example naar .env en vul WEEGSERVER_KEY in.
  echo.
  pause
  exit /b 1
)

echo  Bulters Weegsysteem — Weegserver (Bilanciai COM5, 4800 7E1)
echo  Sluit dit venster niet — gewicht gaat naar de kantoor-PC via het lokale netwerk.
echo.
node server.cjs
echo.
pause
