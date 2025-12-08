#!/bin/bash

echo "================================"
echo "Server Diagnostic Script"
echo "================================"
echo ""

echo "1. Checking if backend is running..."
ps aux | grep uvicorn | grep -v grep
echo ""

echo "2. Checking PM2 status..."
pm2 status
echo ""

echo "3. Checking port 8000..."
netstat -tlnp | grep 8000 || ss -tlnp | grep 8000
echo ""

echo "4. Testing backend locally..."
curl -s http://localhost:8000/health || echo "Backend not responding on localhost:8000"
echo ""

echo "5. Checking Nginx status..."
sudo systemctl status nginx --no-pager || echo "Nginx not installed/running"
echo ""

echo "6. Checking Nginx configuration..."
sudo nginx -t 2>&1 || echo "Nginx config has errors"
echo ""

echo "7. Checking .env file..."
if [ -f "backend/.env" ]; then
    echo "✓ backend/.env exists"
    echo "Environment variables set:"
    grep -E "^(GOOGLE_|FRONTEND_URL|CORS_ORIGINS)" backend/.env | sed 's/=.*/=***/'
else
    echo "✗ backend/.env NOT FOUND"
fi
echo ""

echo "8. Checking firewall..."
sudo ufw status || echo "UFW not active"
echo ""

echo "================================"
echo "Diagnostic Complete"
echo "================================"
