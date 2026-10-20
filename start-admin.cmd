@echo off
setlocal
cd /d "%~dp0apps\admin"
if not exist "..\..\.env" (
  echo.
  echo ERROR: C:\Users\Admin\Desktop\Haven\.env is missing.
  echo Copy .env.example to .env and add your Supabase URL and anon key.
  echo.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo.
  echo ERROR: Dependencies are missing. Run setup-haven.cmd first.
  echo.
  pause
  exit /b 1
)
echo Starting Haven admin dashboard at http://127.0.0.1:5174/login
node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5174
endlocal
