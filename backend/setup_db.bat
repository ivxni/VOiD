@echo off
echo ================================
echo   VOiD - Database Setup
echo ================================
echo.

set "PSQL=C:\Program Files\PostgreSQL\18\bin\psql.exe"

if not exist "%PSQL%" (
    echo ERROR: psql.exe not found at %PSQL%
    echo Please edit this file and set the correct path.
    pause
    exit /b 1
)

echo Found PostgreSQL 18
echo.
set /p PGPASSWORD="Enter your PostgreSQL 'postgres' password: "
echo.

"%PSQL%" -U postgres -c "CREATE DATABASE void_db;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Database "void_db" created!
) else (
    echo.
    echo NOTE: If it says "already exists" that is fine.
)

echo.
echo Now make sure your .env has the correct password:
echo DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/void_db
echo.
pause
