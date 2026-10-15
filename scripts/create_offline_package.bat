@echo off
chcp 65001 > nul
title Сборка автономного архива для флешки
cd /d "%~dp0\.."

echo ============================================================
echo   СБОРКА АВТОНОМНОГО АРХИВА KABAN2 ДЛЯ ФЛЕШКИ
echo ============================================================
echo.

echo 1. Сборка React фронтенда...
call npm run build

echo.
echo 2. Упаковка в UFANET_KANBAN_PORTABLE.zip...
powershell -NoProfile -Command ^
  "$dest = '..\UFANET_KANBAN_PORTABLE.zip'; " ^
  "if (Test-Path $dest) { Remove-Item $dest }; " ^
  "$items = Get-ChildItem -Path '.' | Where-Object { $_.Name -ne 'node_modules' -and $_.Name -ne '.git' }; " ^
  "Compress-Archive -Path $items.FullName -DestinationPath $dest -CompressionLevel Optimal; " ^
  "Write-Host '[OK] Архив успешно создан: ' (Resolve-Path $dest)"

echo.
echo ============================================================
echo   ГОТОВО! Скопируйте UFANET_KANBAN_PORTABLE.zip на флешку.
echo ============================================================
pause
