@echo off
rem One line on purpose: the installer rewrites this folder while it runs, cmd must not read this file again.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" %* & exit /b
