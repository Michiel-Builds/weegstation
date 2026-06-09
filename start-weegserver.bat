@echo off
title Bulters Weegsysteem — Weegserver
cd /d "%~dp0"
echo.
echo  Bulters Weegsysteem — Weegserver (Bilanciai COM5, 4800 7E1)
echo  Sluit dit venster niet — gewicht gaat naar de kantoor-PC via het lokale netwerk.
echo.
node server.cjs
echo.
pause
