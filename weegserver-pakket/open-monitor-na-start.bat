@echo off
ping -n 3 127.0.0.1 >nul
call "%~dp0open-browser-monitor.bat"
