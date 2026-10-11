@echo off
title Уфанет • Сервер проектирования
cd /d "%~dp0"

echo ============================================================
echo   УФАНЕТ • ЗАПУСК ЛОКАЛЬНОГО СЕРВЕРА
echo ============================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js найден. Запуск сервера...
    start http://localhost:3000
    node server.js
    exit /b
)

where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Docker найден. Запуск контейнера...
    docker compose up -d
    start http://localhost:3000
    exit /b
)

echo [!] ОШИБКА: На компьютере не найдены Node.js или Docker.
echo Установите Node.js с официального сайта: https://nodejs.org
pause
