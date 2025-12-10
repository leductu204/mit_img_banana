#!/bin/bash
# Production startup script with log rotation

# Create logs directory
mkdir -p logs

# Stop old process if running
if [ -f app.pid ]; then
    kill $(cat app.pid) 2>/dev/null || true
    rm app.pid
fi

# Start with nohup, redirect logs to file, run in background
nohup uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info \
    --access-log \
    > logs/app.log 2>&1 &

# Save PID
echo $! > app.pid

echo "Backend started with PID $(cat app.pid)"
echo "Logs: tail -f logs/app.log"
