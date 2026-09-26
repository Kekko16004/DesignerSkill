@echo off
setlocal EnableExtensions
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-variant-studio.ps1" %*
exit /b %ERRORLEVEL%
