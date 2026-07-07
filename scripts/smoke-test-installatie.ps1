# Smoke-test installatie (plan fase 3) — 3a, 3b, 3c
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

$version = (Get-Content (Join-Path $root "package.json") | ConvertFrom-Json).version
$installer = Join-Path $root "release\electron-dist\WeegStation-Setup-$version.exe"

if (-not (Test-Path $installer)) {
  Write-Host "✗ Installer niet gevonden: $installer" -ForegroundColor Red
  exit 1
}

function Test-Installatie {
  param(
    [string]$Label,
    [string]$InstallDir,
    [switch]$StartApp
  )

  Write-Host "`n=== $Label ===" -ForegroundColor Cyan
  if (Test-Path $InstallDir) {
    Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

  $proc = Start-Process -FilePath $installer -ArgumentList "/S", "/D=$InstallDir" -Wait -PassThru
  if ($proc.ExitCode -ne 0) {
    Write-Host "✗ Installer exit code: $($proc.ExitCode)" -ForegroundColor Red
    return $false
  }

  $exe = Join-Path $InstallDir "WeegStation.exe"
  $checks = @(
    $exe,
    (Join-Path $InstallDir "resources\splash.html"),
    (Join-Path $InstallDir "resources\app.asar")
  )
  $indexUnpacked = Join-Path $InstallDir "resources\app.asar.unpacked\dist\index.html"
  $indexInAsar = Test-Path (Join-Path $InstallDir "resources\app.asar")

  foreach ($c in $checks) {
    $ok = Test-Path $c
    Write-Host ("  [{0}] {1}" -f $(if ($ok) { "OK" } else { "FAIL" }), $c)
    if (-not $ok) { return $false }
  }

  $hasIndex = Test-Path $indexUnpacked
  Write-Host ("  [{0}] index.html (unpacked): {1}" -f $(if ($hasIndex) { "OK" } else { "WARN" }), $indexUnpacked)
  if (-not $hasIndex -and -not $indexInAsar) {
    Write-Host "✗ Geen index.html en geen app.asar" -ForegroundColor Red
    return $false
  }

  if ($StartApp -and (Test-Path $exe)) {
    $logDir = Join-Path $env:APPDATA "weegstation-app\logs"
    if (Test-Path $logDir) { Remove-Item "$logDir\main.log" -Force -ErrorAction SilentlyContinue }
    $app = Start-Process -FilePath $exe -PassThru
    Start-Sleep -Seconds 8
    if (-not $app.HasExited) { Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue }
    $logFile = Join-Path $logDir "main.log"
    if (Test-Path $logFile) {
      $log = Get-Content $logFile -Raw
      $started = $log -match "ready-to-show|did-finish-load|Hoofdvenster aangemaakt"
      Write-Host ("  App start log: {0}" -f $(if ($started) { "OK" } else { "FAIL" }))
      if (-not $started) { return $false }
    } else {
      Write-Host "  App start log: FAIL (geen main.log)" -ForegroundColor Red
      return $false
    }
  }

  Write-Host "✓ $Label geslaagd" -ForegroundColor Green
  return $true
}

$ok3a = Test-Installatie -Label "Test 3a: user-install (LocalAppData-achtig)" `
  -InstallDir "$env:LOCALAPPDATA\WeegStation-SmokeTest3a" -StartApp

$ok3b = Test-Installatie -Label "Test 3b: Program Files-achtig pad" `
  -InstallDir "${env:ProgramFiles}\WeegStation-SmokeTest3b" -StartApp

Write-Host "`n=== Test 3c: corrupt exe ===" -ForegroundColor Cyan
$corruptDir = Join-Path $root "release\_smoke-corrupt"
New-Item -ItemType Directory -Path $corruptDir -Force | Out-Null
$corruptExe = Join-Path $corruptDir "WeegStation-Setup-$version-corrupt.exe"
Copy-Item $installer $corruptExe
$truncateBytes = 917206
$fs = [System.IO.File]::OpenWrite($corruptExe)
$fs.SetLength($fs.Length - $truncateBytes)
$fs.Close()
Write-Host "  Corrupt exe: $((Get-Item $corruptExe).Length) bytes (-$truncateBytes)"

$corruptProc = Start-Process -FilePath $corruptExe -ArgumentList "/S" -Wait -PassThru -ErrorAction SilentlyContinue
$ok3c = $corruptProc.ExitCode -ne 0
Write-Host ("  Installer faalde zoals verwacht: {0} (exit {1})" -f $(if ($ok3c) { "OK" } else { "FAIL" }), $corruptProc.ExitCode)

Write-Host "`n=== Resultaat ===" -ForegroundColor Yellow
Write-Host "  3a: $(if ($ok3a) { 'PASS' } else { 'FAIL' })"
Write-Host "  3b: $(if ($ok3b) { 'PASS' } else { 'FAIL' })"
Write-Host "  3c: $(if ($ok3c) { 'PASS' } else { 'FAIL' })"

# Opruimen test-installaties
@(
  "$env:LOCALAPPDATA\WeegStation-SmokeTest3a",
  "${env:ProgramFiles}\WeegStation-SmokeTest3b",
  $corruptDir
) | ForEach-Object {
  if (Test-Path $_) { Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue }
}

if ($ok3a -and $ok3b -and $ok3c) {
  Write-Host "`n✓ Alle smoke-tests geslaagd`n" -ForegroundColor Green
  exit 0
}
Write-Host "`n✗ Smoke-tests mislukt`n" -ForegroundColor Red
exit 1
