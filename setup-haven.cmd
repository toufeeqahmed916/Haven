@echo off
setlocal
cd /d "%~dp0"
set "FALLBACK_PNPM=C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
where pnpm >nul 2>nul
if %errorlevel%==0 (
  pnpm install
  goto :done
)
if exist "%FALLBACK_PNPM%" (
  call "%FALLBACK_PNPM%" --store-dir "%~dp0.pnpm-store" install
  goto :done
)
where corepack >nul 2>nul
if %errorlevel%==0 (
  set "COREPACK_HOME=%LOCALAPPDATA%\HavenCorepack"
  corepack pnpm --store-dir "%~dp0.pnpm-store" install
  goto :done
)
echo ERROR: pnpm and Corepack were not found. Install Node.js LTS, then run this file again.
exit /b 1
:done
if errorlevel 1 exit /b %errorlevel%
echo.
echo Haven dependencies are ready.
echo Next: create .env, then use start-citizen.cmd, start-admin.cmd, or start-api.cmd.
endlocal
