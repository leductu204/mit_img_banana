#!/bin/bash
##########################################################
# VPS Chrome Quick Fix Script
# Run this to fix common Chrome issues on VPS
##########################################################

echo "=========================================="
echo "  VPS Chrome Quick Fix"
echo "=========================================="

# 1. Kill all Chrome processes
echo ""
echo "[1/5] Killing zombie Chrome processes..."
pkill -9 chrome 2>/dev/null
pkill -9 chromedriver 2>/dev/null
echo "  ✓ Done"

# 2. Set DISPLAY
echo ""
echo "[2/5] Setting DISPLAY..."
export DISPLAY=:0
echo "  ✓ DISPLAY=$DISPLAY"

# 3. Install/update Chrome
echo ""
echo "[3/5] Checking Chrome installation..."
if command -v google-chrome &> /dev/null; then
    echo "  ✓ Chrome already installed: $(google-chrome --version)"
else
    echo "  → Installing Chrome..."
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo dpkg -i google-chrome-stable_current_amd64.deb
    sudo apt-get install -f -y
    rm google-chrome-stable_current_amd64.deb
    echo "  ✓ Chrome installed"
fi

# 4. Install Python dependencies
echo ""
echo "[4/5] Installing Python dependencies..."
pip install -q selenium undetected-chromedriver
echo "  ✓ Dependencies installed"

# 5. Test Chrome
echo ""
echo "[5/5] Testing Chrome..."
google-chrome --no-sandbox --disable-gpu --headless=new --version
if [ $? -eq 0 ]; then
    echo "  ✓ Chrome test passed!"
else
    echo "  ✗ Chrome test failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "  ✓ Quick fix completed!"
echo "=========================================="
echo ""
echo "Now run: python diagnose_chrome_vps.py"
echo ""
