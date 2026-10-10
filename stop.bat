@echo off
chcp 65001 > nul
title Уфанет • Остановка сервера

echo Остановка контейнеров Docker (если запущены)...
docker compose down 2>nul

echo Остановка процессов Node server.js...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Уфанет*" 2>nul

echo Готово. Сервер остановлен.
timeout /t 2 >nul
