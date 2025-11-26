@echo off
echo Starting FastAPI Backend...
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
