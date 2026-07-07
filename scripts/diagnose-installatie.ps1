# WeegStation installatie-diagnose — plak output in support-chat
Write-Host "=== WeegStation diagnose ===" -ForegroundColor Cyan
Write-Host "Datum: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Gebruiker: $env:USERNAME"
Write-Host "OS: $([System.Environment]::OSVersion.VersionString)"
Write-Host "64-bit: $([Environment]::Is64BitOperatingSystem)"
Write-Host ""

$paden = @(
  "$env:LOCALAPPDATA\Programs\WeegStation",
  "${env:ProgramFiles}\WeegStation",
  "${env:ProgramFiles(x86)}\WeegStation"
)

Write-Host "=== Installatie-locaties ===" -ForegroundColor Yellow
$gevonden = $null
foreach ($p in $paden) {
  $exe = Join-Path $p "WeegStation.exe"
  $ok = Test-Path $exe
  Write-Host ("  [{0}] {1}" -f $(if ($ok) { "OK" } else { "--" }), $exe)
  if ($ok) { $gevonden = $p }
}

if (-not $gevonden) {
  Write-Host ""
  Write-Host "GEEN INSTALLATIE GEVONDEN" -ForegroundColor Red
  Write-Host "Installeer eerst WeegStation-Setup.exe (niet alleen downloaden)"
  exit 1
}

Write-Host ""
Write-Host "=== Actieve installatie: $gevonden ===" -ForegroundColor Yellow

$res = Join-Path $gevonden "resources"
$yml = Join-Path $res "app-update.yml"
if (Test-Path $yml) {
  Write-Host "Versie-info (app-update.yml):"
  Get-Content $yml | ForEach-Object { Write-Host "  $_" }
}

$checks = @(
  @{ Label = "index.html (unpacked)"; Path = Join-Path $res "app.asar.unpacked\dist\index.html" },
  @{ Label = "preload.js (unpacked)"; Path = Join-Path $res "app.asar.unpacked\preload.js" },
  @{ Label = "splash.html"; Path = Join-Path $res "splash.html" },
  @{ Label = "app.asar"; Path = Join-Path $res "app.asar" }
)

Write-Host ""
Write-Host "=== Bestanden ===" -ForegroundColor Yellow
foreach ($c in $checks) {
  $exists = Test-Path $c.Path
  $size = if ($exists) { (Get-Item $c.Path).Length } else { 0 }
  Write-Host ("  [{0}] {1} ({2:N0} bytes)" -f $(if ($exists) { "OK" } else { "MISSING" }), $c.Label, $size)
}

Write-Host ""
Write-Host "=== Download-check (verwacht ~224 MB) ===" -ForegroundColor Yellow
Get-ChildItem "$env:USERPROFILE\Downloads\WeegStation*.exe" -ErrorAction SilentlyContinue |
  Select-Object Name, Length, LastWriteTime |
  Format-Table -AutoSize

$log = "$env:APPDATA\weegstation-app\logs\main.log"
Write-Host ""
Write-Host "=== Log (laatste 25 regels) ===" -ForegroundColor Yellow
if (Test-Path $log) {
  Get-Content $log -Tail 25
} else {
  Write-Host "  Geen log gevonden: $log"
}

Write-Host ""
Write-Host "=== Klaar ===" -ForegroundColor Green
