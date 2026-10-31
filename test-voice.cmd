@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo Haven voice-only test
  echo.
  echo 1. Record a short message with Windows Sound Recorder.
  echo 2. Drag the saved audio file onto test-voice.cmd.
  echo.
  echo Or run:
  echo test-voice.cmd "C:\path\recording.m4a"
  pause
  exit /b 1
)

if not exist ".env" (
  echo VOICE TEST FAILED
  echo Root .env file was not found.
  pause
  exit /b 1
)

if not exist "apps\api\node_modules\tsx\dist\cli.mjs" (
  echo VOICE TEST FAILED
  echo Backend dependencies are missing. Run setup-haven.cmd first.
  pause
  exit /b 1
)

node apps\api\node_modules\tsx\dist\cli.mjs scripts\test-voice-intake.ts "%~1"
set "HAVEN_VOICE_EXIT=%errorlevel%"
echo.
pause
exit /b %HAVEN_VOICE_EXIT%
