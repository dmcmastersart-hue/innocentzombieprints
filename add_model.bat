@echo off
title InnocentZombie Model Catalog Importer
echo ==============================================================
echo       InnocentZombie 3D Printing Model Catalog Importer
echo ==============================================================
echo.
echo Launching Cults3D importer utility...
echo.

python "%~dp0add_cults_model.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] An error occurred during the import process.
    echo Please ensure Python is installed and check your internet connection.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Press any key to close...
pause > nul
