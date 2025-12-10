# VPS Deployment Guide

## Problem: Terminal becomes unresponsive with many requests

This happens because:
1. All logs output to terminal (buffer overflow)
2. Single worker can't handle concurrent requests
3. Process dies if terminal disconnects
4. No automatic restart on crashes

## Solutions

### OPTION 1: Quick Fix (Immediate)

Run backend in background with log redirection:

```bash
# On your VPS:
cd /path/to/MIT_Img_Video/backend

# Make script executable
chmod +x start_production.sh stop_production.sh

# Start server
./start_production.sh

# View logs
tail -f logs/app.log

# Stop server
./stop_production.sh
```

**Benefits:**
- Runs in background (doesn't freeze terminal)
- Logs to file (no terminal overflow)
- Survives terminal disconnect
- 4 workers for better performance

### OPTION 2: Systemd Service (Recommended)

Best for Ubuntu/Debian VPS with auto-restart:

```bash
# 1. Install gunicorn
pip install gunicorn

# 2. Edit the service file
nano nanoimgapi.service

# Change these lines:
# - User=YOUR_USERNAME          → Your VPS username
# - WorkingDirectory=/path/...  → Full path to backend folder
# - Environment="PATH=/path/... → Full path to your venv/bin

# 3. Create log directory
sudo mkdir -p /var/log/nanoimgapi
sudo chown YOUR_USERNAME:YOUR_USERNAME /var/log/nanoimgapi

# 4. Install service
sudo cp nanoimgapi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nanoimgapi
sudo systemctl start nanoimgapi

# 5. Check status
sudo systemctl status nanoimgapi

# View logs
sudo journalctl -u nanoimgapi -f
```

**Benefits:**
- Auto-restart on crash
- Starts on system boot
- Better resource management
- Professional logging

### Performance Recommendations

**Workers:**
- Formula: `(2 × CPU_cores) + 1`
- 1 CPU = 3 workers
- 2 CPU = 5 workers
- 4 CPU = 9 workers

**Timeouts:**
- Video generation: `--timeout 300` (5 mins)
- Image generation: `--timeout 120` (2 mins)

**Memory:**
- Monitor with: `htop` or `systemctl status nanoimgapi`
- Each worker uses ~100-200MB
- Set limit in systemd: `MemoryMax=2G`

### Common Commands

```bash
# Systemd service
sudo systemctl start nanoimgapi    # Start
sudo systemctl stop nanoimgapi     # Stop
sudo systemctl restart nanoimgapi  # Restart
sudo systemctl status nanoimgapi   # Check status

# Manual background process
./start_production.sh              # Start
./stop_production.sh               # Stop
tail -f logs/app.log              # View logs
```

### Troubleshooting

**Service won't start:**
```bash
# Check logs
sudo journalctl -u nanoimgapi -n 50

# Test manually
cd /path/to/backend
source venv/bin/activate
gunicorn app.main:app --bind 0.0.0.0:8000 --workers 2
```

**High memory usage:**
```bash
# Reduce workers in service file or start script
# Monitor: htop
```

**Still freezing:**
```bash
# Add request limits in main.py (after line 96):
# app.add_middleware(
#     RateLimitMiddleware,
#     max_requests=100,
#     window_seconds=60
# )
```
