@echo off
rem ============================================================================
rem  Builds the Google Play Store Android App Bundle (.aab) for Fajr Academy.
rem
rem  Usage:   npm run build:aab      (or double-click this file)
rem  Output:  dist\FajrAcademy-<version>.aab
rem ============================================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"

if not exist "%PROJECT_DIR%\node_modules\expo\package.json" (
  echo Dependencies are missing. Run:  npm install --legacy-peer-deps
  exit /b 1
)

if not exist "%PROJECT_DIR%\android\gradlew.bat" (
  echo [prep] Generating the native Android project...
  call npx expo prebuild --platform android --no-install
  if errorlevel 1 exit /b 1
)

if not exist "%PROJECT_DIR%\android\local.properties" (
  if defined ANDROID_HOME (
    set "SDK=%ANDROID_HOME:\=\\%"
    set "SDK=!SDK::=\:!"
    echo sdk.dir=!SDK!> "%PROJECT_DIR%\android\local.properties"
  )
)

echo [build] Building Google Play Release App Bundle (.aab)...
cd /d "%PROJECT_DIR%\android"
call .\gradlew.bat bundleRelease --console=plain %*
set BUILD_RESULT=%ERRORLEVEL%
cd /d "%PROJECT_DIR%"

if not %BUILD_RESULT%==0 (
  echo.
  echo Build failed with error code %BUILD_RESULT%.
  exit /b %BUILD_RESULT%
)

for /f "usebackq delims=" %%V in (`node -p "require('./app.json').expo.version"`) do set "APP_VERSION=%%V"
if not exist "%PROJECT_DIR%\dist" mkdir "%PROJECT_DIR%\dist"
copy /y "%PROJECT_DIR%\android\app\build\outputs\bundle\release\app-release.aab" "%PROJECT_DIR%\dist\FajrAcademy-%APP_VERSION%.aab" >nul

echo.
echo ================================================================
echo BUILD SUCCESSFUL
echo Google Play Bundle: %PROJECT_DIR%\dist\FajrAcademy-%APP_VERSION%.aab
echo ================================================================
exit /b 0

