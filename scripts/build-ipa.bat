@echo off
rem ============================================================================
rem  Builds the Apple iOS .ipa package for Fajr Academy via EAS Build.
rem
rem  Usage:   npm run build:ipa      (or double-click this file)
rem ============================================================================
setlocal
cd /d "%~dp0.."

echo ================================================================
echo  Fajr Academy - Apple iOS (.ipa) Build
echo ================================================================
echo.

call npx.cmd --yes eas-cli build --platform ios %*

if errorlevel 1 (
  echo.
  echo Build stopped or credentials required.
  exit /b %ERRORLEVEL%
)

exit /b 0

