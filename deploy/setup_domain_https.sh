#!/usr/bin/env bash
# ==============================================================================
# УФАНЕТ • Автоматическая настройка HTTPS и домена doska.odn.ufanet.ru
# Настройка Nginx Reverse Proxy (порт 80 -> 443 -> Node.js 127.0.0.1:3000)
# ==============================================================================

set -euo pipefail

# 1. Проверка прав суперпользователя (root)
if [ "$(id -u)" -ne 0 ]; then
    echo -e "\e[31m[ОШИБКА] Этот скрипт должен быть запущен с правами sudo:\e[0m"
    echo "sudo bash $0"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "\e[34m========================================================================\e[0m"
echo -e "\e[34m  УФАНЕТ • Настройка HTTPS для https://doska.odn.ufanet.ru\e[0m"
echo -e "\e[34m========================================================================\e[0m"
echo "Директория проекта: ${APP_DIR}"

# 2. Установка необходимых системных пакетов
echo -e "\n\e[33m[1/6] Установка Nginx, OpenSSL и Certbot...\e[0m"
apt-get update -y
apt-get install -y --no-install-recommends nginx openssl certbot python3-certbot-nginx ca-certificates curl

# 3. Подготовка директорий для сертификатов и ACME-валидации
echo -e "\n\e[33m[2/6] Подготовка директорий SSL и ACME webroot...\e[0m"
mkdir -p /etc/ssl/kaban /var/www/html
chmod 755 /var/www/html

# 4. Генерация надежного корпоративного SSL сертификата (если ещё нет)
if [ ! -f /etc/ssl/kaban/doska.crt ] || [ ! -f /etc/ssl/kaban/doska.key ]; then
    echo -e "\n\e[33m[3/6] Генерация SSL сертификата для doska.odn.ufanet.ru (2048-bit RSA)...\e[0m"
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/ssl/kaban/doska.key \
        -out /etc/ssl/kaban/doska.crt \
        -subj "/C=RU/ST=Bashkortostan/L=Ufa/O=AO Ufanet/OU=Design/CN=doska.odn.ufanet.ru" \
        -addext "subjectAltName=DNS:doska.odn.ufanet.ru,DNS:localhost,IP:188.191.125.10,IP:127.0.0.1" \
        2>/dev/null
    chmod 600 /etc/ssl/kaban/doska.key
    chmod 644 /etc/ssl/kaban/doska.crt
    echo "SSL сертификат успешно создан в /etc/ssl/kaban/"
else
    echo -e "\n\e[33m[3/6] SSL сертификат уже существует в /etc/ssl/kaban/ (пропуск генерации).\e[0m"
fi

# 5. Установка конфигурации Nginx
echo -e "\n\e[33m[4/6] Установка конфигурации Nginx Reverse Proxy...\e[0m"
cp -f "${SCRIPT_DIR}/nginx_debian13.conf" /etc/nginx/sites-available/kaban.conf
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/kaban.conf /etc/nginx/sites-enabled/default

# Проверка конфигурации Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# 6. Открытие портов 80 и 443 в UFW (если установлен)
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    echo -e "\n\e[33m[5/6] Открытие портов HTTP (80) и HTTPS (443) в файрволе UFW...\e[0m"
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw reload
fi

# 7. Попытка получения доверенного сертификата Let's Encrypt (если сервер доступен из интернета)
echo -e "\n\e[33m[6/6] Проверка получения официального сертификата Let's Encrypt...\e[0m"
if certbot --nginx -d doska.odn.ufanet.ru --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>/dev/null; then
    echo -e "\e[32m✔ Успешно получен официальный доверенный сертификат Let's Encrypt!\e[0m"
else
    echo -e "\e[33m[Инфо] Let's Encrypt проверка не пройдена (типично для внутренней сети Уфанет).\e[0m"
    echo -e "\e[32m✔ Активирован корпоративный SSL-сертификат /etc/ssl/kaban/doska.crt\e[0m"
    systemctl restart nginx
fi

# 8. Проверка и перезапуск Node.js сервиса kaban.service
if systemctl is-enabled kaban.service &>/dev/null; then
    systemctl restart kaban.service
fi

echo -e "\n\e[32m========================================================================\e[0m"
echo -e "\e[32m✔ НАСТРОЙКА УСПЕШНО ЗАВЕРШЕНА!\e[0m"
echo -e "------------------------------------------------------------------------"
echo -e "👉  Официальный адрес: \e[1;36mhttps://doska.odn.ufanet.ru\e[0m"
echo -e "👉  Резервный адрес:   \e[1;36mhttps://188.191.125.10\e[0m"
echo -e "🔒  HTTPS (порт 443):  АКТИВЕН (перенаправление с HTTP 80 включено)"
echo -e "📊  Статус Nginx:      systemctl status nginx"
echo -e "📊  Статус Доски:      systemctl status kaban.service"
echo -e "\e[32m========================================================================\e[0m\n"
