#!/bin/bash
# Stop script for Frontend

if [ -f frontend_app.pid ]; then
    PID=$(cat frontend_app.pid)
    echo "Stopping Frontend (PID $PID)..."
    kill $PID 2>/dev/null || true
    rm frontend_app.pid
    echo "Frontend stopped."
else
    echo "No PID file found (frontend_app.pid). Is the frontend running?"
fi
