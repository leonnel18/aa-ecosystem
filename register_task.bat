@echo off
REM Registers aa-ecosystem pipeline as a weekly Windows Scheduled Task
REM Runs every Monday at 07:00 AM

set TASK_NAME=AktivAsia_Pipeline
set PROJECT_DIR=%~dp0
set PYTHON_CMD=python "%PROJECT_DIR%tools\orchestrator.py"

echo Registering scheduled task: %TASK_NAME%
schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "%PYTHON_CMD%" ^
  /sc weekly ^
  /d MON ^
  /st 07:00 ^
  /f

if %ERRORLEVEL% == 0 (
    echo [PASS] Task registered successfully.
    echo        Name: %TASK_NAME%
    echo        Schedule: Every Monday at 07:00 AM
) else (
    echo [FAIL] Task registration failed. Run as Administrator if needed.
)
pause
