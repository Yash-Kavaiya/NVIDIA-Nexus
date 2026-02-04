@echo off
REM NVIDIA Nexus - Start All Services
REM This script starts both backend and frontend servers

echo.
echo ====================================================================
echo   NVIDIA NEXUS - Starting All Services
echo ====================================================================
echo.

REM Check if we're in the correct directory
if not exist "backend" (
    echo ERROR: backend directory not found!
    echo Please run this script from the NVIDIA-Nexus root directory.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: frontend directory not found!
    echo Please run this script from the NVIDIA-Nexus root directory.
    pause
    exit /b 1
)

REM Start Backend Server
echo [1/2] Starting Backend Server...
echo.
start "NVIDIA Nexus - Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo     Backend server starting at http://localhost:8000
echo     A new window has opened for the backend.
echo.

REM Wait a bit for backend to initialize
echo     Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start Frontend Server
echo [2/2] Starting Frontend Server...
echo.
start "NVIDIA Nexus - Frontend" cmd /k "cd frontend && npm run dev"
echo     Frontend server starting at http://localhost:3000
echo     A new window has opened for the frontend.
echo.

echo ====================================================================
echo   Services Started Successfully!
echo ====================================================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
echo   Wait about 10 seconds for frontend to fully start,
echo   then open Chrome and navigate to: http://localhost:3000
echo.
echo   To test the chat:
echo   1. Click "Chat" in the sidebar
echo   2. Look for placeholder "Ask me anything..."
echo   3. Type a message and press Enter
echo.
echo   Press any key to run automated tests (optional)...
pause >nul

REM Run automated tests
echo.
echo Running automated tests...
python test_chat.py

echo.
echo Press any key to exit...
pause >nul
