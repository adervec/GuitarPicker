@echo off
rem GuitarPicker launcher: starts the local server and opens the app.
rem If a server is already running on 8080, the extra one exits and the
rem browser just opens the running instance.
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  start "GuitarPicker server" /min cmd /c "node serve.mjs 8080"
) else (
  start "GuitarPicker server" /min powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
)
start "" http://localhost:8080/
