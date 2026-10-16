@echo off
title MK Whiteboard
if exist "%~dp0app-win32-x64\MK Whiteboard.exe" (
  cd /d "%~dp0app-win32-x64"
  start "" "MK Whiteboard.exe"
) else (
  echo Launching MK Whiteboard via Electron...
  cd /d "%~dp0"
  npm start
)
exit
