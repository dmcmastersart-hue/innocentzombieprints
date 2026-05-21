@echo off
title InnocentZombie Model Catalog compiler
echo ==============================================================
echo       InnocentZombie 3D Printing Model Catalog Compiler
echo ==============================================================
echo.
echo Reading Excel spreadsheet and compiling database...
echo.

python "%~dp0fetch_google_sheet.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] An error occurred during database compilation.
    echo Please make sure the Excel file is closed and Python is installed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [SUCCESS] Database compiled successfully!
echo Web portal database (data.json) has been refreshed.
echo.
echo Press any key to close...
pause > nul
