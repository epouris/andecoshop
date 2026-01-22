@echo off
REM Setup script for Windows to organize files for deployment

echo Setting up project structure...

REM Create public directory if it doesn't exist
if not exist "public" mkdir public

REM Move frontend files to public directory
echo Moving frontend files to public directory...

REM Move HTML files
move *.html public\ 2>nul

REM Move JS directory
if exist "js" (
    move js public\ 2>nul
)

REM Move styles directory
if exist "styles" (
    move styles public\ 2>nul
)

REM Move other assets
move logo.png public\ 2>nul
move *.png public\ 2>nul
move *.jpg public\ 2>nul
move *.jpeg public\ 2>nul
move *.svg public\ 2>nul

echo Setup complete!
echo.
echo Next steps:
echo 1. Install dependencies: npm install
echo 2. Create .env file with your database URL
echo 3. Run: node init-db.js
echo 4. Start server: npm start

pause
