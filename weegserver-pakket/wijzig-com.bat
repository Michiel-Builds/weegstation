@echo off
cd /d "%~dp0"
title COM-poort wijzigen

echo.
echo ========================================
echo   COM-poort weegbrug wijzigen
echo ========================================
echo.

if not exist ".env" (
  echo FOUT: .env ontbreekt. Dubbelklik eerst maak-env.bat
  pause
  exit /b 1
)

echo Huidige .env:
findstr /b /i "WEEGBRUG_COM=" ".env" 2>nul
if errorlevel 1 echo   ^(geen WEEGBRUG_COM regel — standaard COM5^)
echo.

echo Beschikbare poorten:
if exist "node_modules\serialport" (
  node lijst-com-poorten.mjs
) else (
  echo   ^(draai eerst lijst-com-poorten.bat^)
)
echo.

set /p NIEUWCOM=Typ COM-poort ^(bijv. COM3^): 
if "%NIEUWCOM%"=="" (
  echo Geannuleerd.
  pause
  exit /b 0
)

powershell -NoProfile -Command ^
  "$p='.env'; $c=Get-Content $p -Raw; if ($c -match '(?m)^WEEGBRUG_COM=') { $c=$c -replace '(?m)^WEEGBRUG_COM=.*','WEEGBRUG_COM=%NIEUWCOM%' } else { $c=$c.TrimEnd()+\"`r`nWEEGBRUG_COM=%NIEUWCOM%`r`n\" }; Set-Content $p $c -NoNewline -Encoding ASCII"

echo.
echo Bijgewerkt:
findstr /b /i "WEEGBRUG_COM=" ".env"
echo.
echo Herstart nu start-weegserver.bat ^(CMD sluiten en opnieuw^)
echo.
pause
