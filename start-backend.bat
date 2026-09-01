@echo off
echo ========================================================
echo Starting GeM AI Compliance Backend on http://localhost:8000
echo ========================================================
cd backend
python -m uvicorn main:app --reload --port 8000
