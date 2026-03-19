@echo off
cd /d "%~dp0"
echo [%DATE% %TIME%] Running aa-ecosystem pipeline...
python tools/orchestrator.py %*
echo [%DATE% %TIME%] Done.
pause
