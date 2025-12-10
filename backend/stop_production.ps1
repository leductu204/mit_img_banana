# Stop production server on Windows
# stop_production.ps1

if (Test-Path "app.pid") {
    $appPid = Get-Content "app.pid"
    Write-Host "Stopping backend (PID: $appPid)..."
    Stop-Process -Id $appPid -Force -ErrorAction SilentlyContinue
    Remove-Item "app.pid"
    Write-Host "Backend stopped"
} else {
    Write-Host "No PID file found. Backend may not be running."
}
