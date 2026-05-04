@echo off
REM register_reminder_task.bat — Register daily reminder engine trigger
REM Run once as Administrator.

set PYTHON=python
set SCRIPT=%~dp0tools\reminder_engine.py

schtasks /create ^
  /tn "AktivAsiaAA_Reminders" ^
  /tr "\"%PYTHON%\" \"%SCRIPT%\"" ^
  /sc daily ^
  /st 08:00 ^
  /ru SYSTEM ^
  /f

if %errorlevel% equ 0 (
    echo [OK] Task "AktivAsiaAA_Reminders" registered - runs daily at 08:00.
) else (
    echo [FAIL] Task registration failed. Run as Administrator.
)
