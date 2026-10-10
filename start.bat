@echo off
chcp 65001 > nul
title Уфанет • Сервер проектирования

echo ============================================================
echo   🟧 УФАНЕТ • ЗАПУСК ЛОКАЛЬНОГО СЕРВЕРА
echo ============================================================
echo.

:: Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% == 0 (
    echo [OK] Node.js обнаружен. Запускаем сервер напрямую...
    echo.
    start http://localhost:3000
    node server.js
    goto end
)

:: Если Node.js нет, проверяем Docker
where docker >nul 2>nul
if %errorlevel% == 0 (
    echo [OK] Docker обнаружен. Запускаем в фоновом контейнере...
    docker compose up -d
    echo.
    echo Сервер запущен в контейнере!
    start http://localhost:3000
    goto end
)

echo [!] ОШИБКА: На этом компьютере не найдены ни Node.js, ни Docker.
echo Пожалуйста, установите Node.js (https://nodejs.org) или Docker Desktop.
pause

:end
