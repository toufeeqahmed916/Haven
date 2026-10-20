@echo off
setlocal
cd /d "%~dp0apps\api"
if not exist "..\..\.env" (echo ERROR: Root .env is missing. Follow docs\PHASE_3_BACKEND_GUIDE.md.& pause& exit /b 1)
if not exist "node_modules\tsx\dist\cli.mjs" (echo ERROR: Backend dependencies are missing. Run setup-haven.cmd first.& pause& exit /b 1)
powershell -NoProfile -Command "try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/health' -TimeoutSec 2; if ($health.service -eq 'haven-api') { exit 0 } } catch {}; exit 1" >nul 2>nul
if %errorlevel%==0 (
  echo Haven API is already running at http://127.0.0.1:4000
  echo You do not need to start a second API process.
  exit /b 0
)
netstat -ano | findstr /R /C:"127.0.0.1:4000 .*LISTENING" >nul 2>nul
if %errorlevel%==0 (
  echo ERROR: Port 4000 is being used by another application.
  echo Close that application, then run start-api.cmd again.
  pause
  exit /b 1
)
echo Starting Haven API at http://127.0.0.1:4000
node node_modules\tsx\dist\cli.mjs watch src\server.ts
endlocal
