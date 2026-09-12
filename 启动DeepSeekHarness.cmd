@echo off
title DeepSeek Harness Launcher
set "URL=http://127.0.0.1:3080"
set "HARNESS_DIR=C:\Users\27242\AppData\Local\npm-cache\_npx\1e7f6d9597241db0"
set "BIN=%HARNESS_DIR%\node_modules\@deepseek-ai\dsh\lib\bin.js"
if exist "F:\nodejs\node.exe" set "NODE_EXE=F:\nodejs\node.exe"
if "%NODE_EXE%"=="" set "NODE_EXE=node"

echo.
echo  ============================================
echo    DeepSeek Harness Launcher
echo  ============================================
echo.

if exist "%BIN%" goto :check
echo [ERROR] Harness not found: %BIN%
echo If the cache was cleaned, reinstall with: npx -y @deepseek-ai/dsh web
pause
exit /b 1

:check
echo [1/3] Checking whether the service is already running...
"%NODE_EXE%" -e "fetch('http://127.0.0.1:3080').then(function(){process.exit(0)}).catch(function(){process.exit(1)})"
if not errorlevel 1 goto :open

echo [2/3] Starting DeepSeek Harness...
pushd "%HARNESS_DIR%"
start "DeepSeek Harness" /min cmd /k ""%NODE_EXE%" "%BIN%" web"
popd

echo [3/3] Waiting for the service (up to 90s)...
set /a n=0

:wait
ping -n 2 127.0.0.1 >nul
"%NODE_EXE%" -e "fetch('http://127.0.0.1:3080').then(function(){process.exit(0)}).catch(function(){process.exit(1)})"
if not errorlevel 1 goto :open
set /a n+=1
if %n% lss 60 goto :wait

echo [ERROR] Timed out waiting for the service.
echo Check the minimized "DeepSeek Harness" window, or run manually:
echo   "%NODE_EXE%" "%BIN%" web
pause
exit /b 1

:open
echo [DONE] Service ready. Opening %URL% in your browser...
start "" "%URL%"
exit /b 0
