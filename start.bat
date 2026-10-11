@echo off
setlocal
title Binance Futures Scalper Pro Dashboard
cd /d "%~dp0"
echo =====================================================================
echo           BINANCE FUTURES SCALPER PRO - TRADING BOT
echo =====================================================================
echo [*] Starting dashboard at http://127.0.0.1:8000 ...
echo [*] Trading stays paused until you click Start.
echo.
python "%~dp0start.py"
if errorlevel 1 echo [ERROR] Startup failed. Check the error above.
pause
endlocal
