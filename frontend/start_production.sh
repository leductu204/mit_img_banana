#!/bin/bash
# Production startup script with log rotation

# Create logs directory
mkdir -p logs

# Stop old process if running
if [ -f frontend_app.pid ]; then
    kill $(cat frontend_app.pid) 2>/dev/null || true
    rm frontend_app.pid
fi

# Start with nohup, redirect logs to file, run in background
# Assumes 'npm start' runs 'next start' on default port 3000
nohup npm start \
    > logs/frontend.log 2>&1 &

# Save PID
echo $! > frontend_app.pid

echo "Frontend started with PID $(cat frontend_app.pid)"
echo "Logs: tail -f logs/frontend.log"
