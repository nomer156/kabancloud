@echo off
chcp 65001 > nul
title Уфанет • Сервер проектирования
cd /d "%~dp0"

echo ============================================================
echo   УФАНЕТ • ЗАПУСК ЛОКАЛЬНОЙ ДОСКИ ПРОЕКТИРОВАНИЯ
echo ============================================================
echo.

set "NODE_CMD="

if exist "%~dp0bin\node.exe" (
    set "NODE_CMD=%~dp0bin\node.exe"
    echo [OK] Найдена портативная версия Node.js (bin\node.exe)
) else if exist "%~dp0node.exe" (
    set "NODE_CMD=%~dp0node.exe"
    echo [OK] Найдена портативная версия Node.js (node.exe)
) else (
    where node >nul 2>nul
    if %errorlevel% equ 0 (
        set "NODE_CMD=node"
        echo [OK] Node.js найден в системе.
    )
)

if defined NODE_CMD (
    if not exist "dist\index.html" (
        echo [i] dist\index.html не найден. Сборка интерфейса...
        call npm run build
    )

    echo [OK] Запуск сервера на http://localhost:3000 ...
    echo      (Для доступа коллег по локальной сети: http://IP_ЭТОГО_ПК:3000)
    start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
    "%NODE_CMD%" server.js
    exit /b
)

where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Docker найден. Запуск контейнера...
    docker compose up -d
    timeout /t 2 >nul
    start http://localhost:3000
    exit /b
)

echo [!] ОШИБКА: На компьютере не найдены Node.js или Docker.
echo.
echo Варианты решения:
echo 1) Установите Node.js с официального сайта: https://nodejs.org
echo 2) ИЛИ скопируйте файл node.exe в папку проекта (портативный запуск без установки и прав администратора).
echo.
pause
