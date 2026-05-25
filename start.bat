@echo off
echo ========================================================
echo       AI QA Engineering Platform - Setup ^& Start
echo ========================================================
echo.

echo 1. Installing Backend Dependencies...
cd backend
call npm install
cd ..

echo.
echo 2. Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

echo.
echo 3. Installing Automation Dependencies...
cd automation
call npm install
cd ..

echo.
echo Setup Complete! 
echo.
echo To run the platform locally in development mode (using SQLite fallback):
echo   - Open a terminal and run: cd backend ^&^& npm run dev
echo   - Open another terminal and run: cd frontend ^&^& npm run dev
echo.
echo To run the platform using Docker (with MySQL DB):
echo   - Run: docker-compose up --build
echo.
pause
