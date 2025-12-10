#!/bin/bash
# Stop the production server

if [ -f app.pid ]; then
    PID=$(cat app.pid)
    echo "Stopping backend (PID: $PID)..."
    kill $PID
    rm app.pid
    echo "Backend stopped"
else
    echo "No PID file found. Backend may not be running."
fi
