@echo off
cd /d "c:\Users\Rimuru\Desktop\github\leonnel18\aa-ecosystem"
echo [%DATE% %TIME%] Running pipeline... >> "%~dp0deploy_portal.log" 2>&1
python tools/orchestrator.py >> "%~dp0deploy_portal.log" 2>&1
if %ERRORLEVEL% neq 0 (
    echo [%DATE% %TIME%] Pipeline FAILED with error %ERRORLEVEL%, aborting deploy. >> "%~dp0deploy_portal.log" 2>&1
    exit /b %ERRORLEVEL%
)
echo [%DATE% %TIME%] Pipeline complete. Deploying portal... >> "%~dp0deploy_portal.log" 2>&1
"C:\Program Files\nodejs\npx.cmd" wrangler pages deploy portal --project-name aktivasia-portal --commit-dirty=true >> "%~dp0deploy_portal.log" 2>&1
echo [%DATE% %TIME%] Deploy complete. >> "%~dp0deploy_portal.log" 2>&1
