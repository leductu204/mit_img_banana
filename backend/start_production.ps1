# Production startup script for Windows
# start_production.ps1

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Stop old process if running
if (Test-Path "app.pid") {
    $appPid = Get-Content "app.pid"
    Stop-Process -Id $appPid -Force -ErrorAction SilentlyContinue
    Remove-Item "app.pid"
}

# Start server in background
$process = Start-Process -FilePath "uvicorn" `
    -ArgumentList "app.main:app", `
                  "--host", "0.0.0.0", `
                  "--port", "8000", `
                  "--workers", "4", `
                  "--log-level", "info" `
    -RedirectStandardOutput "logs\app.log" `
    -RedirectStandardError "logs\error.log" `
    -PassThru `
    -WindowStyle Hidden

# Save PID
$process.Id | Out-File "app.pid"

Write-Host "Backend started with PID $($process.Id)"
Write-Host "Logs: Get-Content logs\app.log -Wait"
