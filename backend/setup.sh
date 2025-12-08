#!/bin/bash
# Setup script for backend

echo "🚀 Setting up Backend..."
echo ""

# Check Python version
echo "📌 Checking Python version..."
python --version

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo ""
    echo "📦 Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
echo ""
echo "🔌 Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip
echo ""
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check dependencies
echo ""
echo "🔍 Verifying installation..."
python check_dependencies.py

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your credentials"
fi

# Create database directory
echo ""
echo "📁 Creating database directory..."
mkdir -p database

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials"
echo "2. Run: uvicorn app.main:app --reload"
