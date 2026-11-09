@echo off
title AKE Rice Website Server
echo ===================================================
echo Starting AKE Rice Local Server on http://localhost:8000
echo ===================================================
timeout /t 1 >nul
start "" "http://localhost:8000"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
