@echo off
echo ========================================
echo   Spotify Mood Recommender - Startup
echo ========================================
echo.

echo Starting Backend Server...
start "Backend" cmd /k "cd /d D:\AI_SLOP\spotify_recommender\backend && npm run dev"
timeout /t 3 /nobreak > nul

echo Starting ML Service...
start "ML Service" cmd /k "cd /d D:\AI_SLOP\spotify_recommender\ml-service && venv\Scripts\activate.bat && python app.py"
timeout /t 2 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd /d D:\AI_SLOP\spotify_recommender\frontend && npm run dev"

echo.
echo ========================================
echo   All services are starting!
echo   
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo   ML Service: http://localhost:5000
echo ========================================
echo.
echo Press any key to close this window...
pause > nul
