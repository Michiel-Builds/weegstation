@echo off
cd /d "%~dp0"
title WeegStation Monitor
call "%~dp0open-browser-monitor.bat"
echo Monitor geopend: http://127.0.0.1:3000/monitor
echo Server moet draaien via start-weegserver.bat
timeout /t 4 /nobreak >nul
