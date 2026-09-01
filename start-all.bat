@echo off
echo ========================================================
echo   GeM AI Bid Compliance Verification Platform
echo ========================================================
echo Launching Backend (FastAPI - Port 8000)...
start "GeM Backend API" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

echo Waiting 2 seconds for backend to initialize...
timeout /t 2 /nobreak >nul

echo Launching Frontend (React + Vite - Port 5173)...
start "GeM Frontend UI" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo Platform successfully launched!
echo - Frontend Dashboard: http://localhost:5173
echo - Backend Swagger Docs: http://localhost:8000/docs
echo ========================================================
pause
