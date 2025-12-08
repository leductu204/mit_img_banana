# Setup script for backend (Windows PowerShell)

Write-Host "🚀 Setting up Backend..." -ForegroundColor Green
Write-Host ""

# Check Python version
Write-Host "📌 Checking Python version..." -ForegroundColor Cyan
python --version

# Create virtual environment if not exists
if (-not (Test-Path ".venv")) {
    Write-Host ""
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

# Activate virtual environment
Write-Host ""
Write-Host "🔌 Activating virtual environment..." -ForegroundColor Cyan
.\.venv\Scripts\Activate.ps1

# Upgrade pip
Write-Host ""
Write-Host "⬆️  Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install dependencies
Write-Host ""
Write-Host "📥 Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

# Check dependencies
Write-Host ""
Write-Host "🔍 Verifying installation..." -ForegroundColor Cyan
python check_dependencies.py

# Create .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "📝 Creating .env file from example..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env file with your credentials" -ForegroundColor Yellow
}

# Create database directory
Write-Host ""
Write-Host "📁 Creating database directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path database | Out-Null

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env file with your credentials"
Write-Host "2. Run: uvicorn app.main:app --reload"
