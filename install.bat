@echo off
rem skillkit launcher: install.bat [--yes] [--hosts claude,codex] [--only a,b] [--skip a,b] [--dev] [--dry-run]
rem Old flags still work: -Quiet = --yes, -All, -Hosts, -SkipModules.
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
where node >nul 2>&1
if errorlevel 1 call :need_node || exit /b 1
node "%ROOT%installer\install.mjs" install %*
set "CODE=%ERRORLEVEL%"
if not defined SKILLKIT_NO_PAUSE if "%~1"=="" pause
exit /b %CODE%

:need_node
echo.
echo   Node.js 18+ is required (the installer and the skill scripts run on it).
where winget >nul 2>&1 || (echo   Install it from https://nodejs.org and run this file again. & pause & exit /b 1)
choice /c YN /m "  Install Node.js LTS now with winget"
if errorlevel 2 exit /b 1
winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements || exit /b 1
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1 || (echo   Node.js installed: open a new terminal and run this file again. & pause & exit /b 1)
exit /b 0
