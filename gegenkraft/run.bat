@echo off
REM ============================================================
REM Gegenkraft - One-Click Google Sheet Generator (Windows)
REM ============================================================
REM Run this from the justout-hub\gegenkraft\ folder.
REM Prerequisites: Python 3, pip install google-api-python-client google-auth
REM ============================================================

echo.
echo ========================================
echo   GEGENKRAFT SHEET GENERATOR
echo ========================================
echo.

pip install google-api-python-client google-auth google-auth-httplib2 >nul 2>&1

python generate_gegenkraft_sheet.py --start-date 2026-03-30 --days 30

echo.
pause
