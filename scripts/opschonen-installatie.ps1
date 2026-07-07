# Voer uit VOOR herinstallatie — verwijdert oude paden en registry-restjes
# Rechtsklik → "Uitvoeren met PowerShell" (administrator aanbevolen)

Write-Host "=== WeegStation installatie opschonen ===" -ForegroundColor Cyan

$paden = @(
  "$env:LOCALAPPDATA\Programs\WeegStation",
  "$env:LOCALAPPDATA\WeegStation-SmokeTest3a",
  "${env:ProgramFiles}\WeegStation",
  "${env:ProgramFiles}\WeegStation-SmokeTest3b",
  "$env:APPDATA\weegstation-app"
)

Write-Host "`n→ Mappen verwijderen..." -ForegroundColor Yellow
foreach ($p in $paden) {
  if (Test-Path $p) {
    try {
      Remove-Item $p -Recurse -Force
      Write-Host "  Verwijderd: $p" -ForegroundColor Green
    } catch {
      Write-Host "  MISLUKT (admin nodig?): $p" -ForegroundColor Red
      Write-Host "    $($_.Exception.Message)"
    }
  } else {
    Write-Host "  -- $p"
  }
}

Write-Host "`n→ Registry opschonen (WeegStation uninstall-keys)..." -ForegroundColor Yellow
$roots = @(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
)
foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem $root -ErrorAction SilentlyContinue | ForEach-Object {
    $props = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
    if ($props.DisplayName -like "*WeegStation*") {
      Write-Host "  Verwijder: $($_.PSPath) ($($props.DisplayName))"
      Remove-Item $_.PSPath -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "`n=== Klaar ===" -ForegroundColor Green
Write-Host "Installeer nu WeegStation-Setup-3.1.8.exe opnieuw."
Write-Host "Verwacht pad: $env:LOCALAPPDATA\Programs\WeegStation"
