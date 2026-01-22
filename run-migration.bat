@echo off
echo ========================================
echo LocalStorage to PostgreSQL Migration
echo ========================================
echo.

REM Check if export file exists
if not exist "localstorage-export.json" (
    echo ERROR: localstorage-export.json not found!
    echo.
    echo Please:
    echo 1. Open export-localstorage.html in your browser
    echo 2. Click "Export All Data"
    echo 3. Click "Download JSON File"
    echo 4. Make sure the file is in this folder
    echo.
    pause
    exit /b 1
)

echo Found export file!
echo.
echo Starting migration...
echo.

REM Check if .env exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create .env file with your DATABASE_URL
    echo.
    pause
    exit /b 1
)

REM Run migration
node migrate-localstorage-to-db.js

echo.
echo ========================================
echo Migration complete!
echo ========================================
echo.
pause
