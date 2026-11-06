#!/usr/bin/env bash
# ==============================================================================
# УФАНЕТ • Автоматическая настройка сервера Debian 13.7 (Trixie)
# Жесткие ограничения: 1 Ядро CPU • 1 ГБ RAM • 8 ГБ Disk
# ==============================================================================

set -euo pipefail

# 0. Определение директории приложения и пользователя
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURRENT_USER="${SUDO_USER:-$(id -un)}"

echo -e "\e[34m[1/7]\e[0m Проверка аппаратных ресурсов сервера..."
echo "Директория приложения: ${APP_DIR}"
echo "Пользователь запуска:  ${CURRENT_USER}"

TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
TOTAL_DISK_GB=$(df -BG / | awk 'NR==2 {print sub(/G/,"",$2)?$2:$2}')
echo "Обнаружено: RAM = ${TOTAL_RAM_MB}MB, DISK = ${TOTAL_DISK_GB}GB"

# 1. Настройка SWAP (1 ГБ) для надежной защиты от OOM Killer на 1 ГБ RAM
if [ $(swapon --show | wc -l) -le 1 ]; then
    echo -e "\e[34m[2/7]\e[0m Создание 1 ГБ SWAP для защиты от OOM Killer..."
    fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi

    # Оптимизация ядра Linux под 1 ГБ RAM:
    # swappiness=10 (использовать swap только при крайней нехватке)
    # vfs_cache_pressure=50 (сохранять кэш файловой системы)
    sysctl vm.swappiness=10
    sysctl vm.vfs_cache_pressure=50
    echo "vm.swappiness=10" > /etc/sysctl.d/99-kaban-memory.conf
    echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.d/99-kaban-memory.conf
fi

# 2. Обновление пакетов и установка минимальных зависимостей (без лишнего мусора)
echo -e "\e[34m[3/7]\e[0m Установка минимальных пакетов (Nginx, Curl, Logrotate)..."
apt-get update -y
apt-get install -y --no-install-recommends curl nginx logrotate ca-certificates git

# 3. Установка чистого Node.js 20 или 22 LTS
if ! command -v node &> /dev/null; then
    echo -e "\e[34m[4/7]\e[0m Установка Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y --no-install-recommends nodejs
    apt-get clean
    rm -rf /var/lib/apt/lists/*
fi

echo "Версия Node.js: $(node -v)"
echo "Версия NPM:     $(npm -v)"

# 4. Проверка и подготовка директорий данных
echo -e "\e[34m[5/7]\e[0m Подготовка структуры данных..."
mkdir -p "${APP_DIR}/data/backups" "${APP_DIR}/data/logs" "${APP_DIR}/data/uploads" "${APP_DIR}/data/ssl"
chown -R "${CURRENT_USER}:${CURRENT_USER}" "${APP_DIR}"

# 5. Настройка Logrotate (гарантия, что логи не забьют 8 ГБ диска)
echo -e "\e[34m[6/7]\e[0m Установка правил ротации логов (лимит < 20 МБ)..."
cat << EOF > /etc/logrotate.d/kaban
${APP_DIR}/data/logs/*.log {
    daily
    missingok
    rotate 4
    compress
    delaycompress
    notifempty
    create 0640 ${CURRENT_USER} ${CURRENT_USER}
    maxsize 5M
}
EOF

# 6. Установка и активация Nginx с HTTPS (SSL)
echo -e "\e[34m[6/7]\e[0m Настройка Nginx и генерация SSL сертификата..."
mkdir -p /etc/ssl/kaban /var/www/html
if [ ! -f /etc/ssl/kaban/doska.crt ]; then
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/ssl/kaban/doska.key \
        -out /etc/ssl/kaban/doska.crt \
        -subj "/C=RU/ST=Bashkortostan/L=Ufa/O=AO Ufanet/OU=Design/CN=doska.odn.ufanet.ru" \
        -addext "subjectAltName=DNS:doska.odn.ufanet.ru,DNS:localhost,IP:188.191.125.10,IP:127.0.0.1" \
        2>/dev/null || true
    chmod 600 /etc/ssl/kaban/doska.key || true
    chmod 644 /etc/ssl/kaban/doska.crt || true
fi

if [ -f "${APP_DIR}/deploy/nginx_debian13.conf" ]; then
    cp -f "${APP_DIR}/deploy/nginx_debian13.conf" /etc/nginx/sites-available/kaban.conf
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/kaban.conf /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx || systemctl restart nginx
fi

# 7. Установка Systemd сервиса kaban.service
echo -e "\e[34m[7/7]\e[0m Установка и запуск системного сервиса kaban.service..."
NODE_BIN=$(command -v node)

cat << EOF > /etc/systemd/system/kaban.service
[Unit]
Description=Ufanet KabanCloud YouGile Engine
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} --max-old-space-size=256 server.js
Restart=always
RestartSec=5
Nice=-5

# Защита памяти для 1 ГБ RAM
MemoryAccounting=true
MemoryMax=350M
MemoryHigh=300M

NoNewPrivileges=true
PrivateTmp=true

Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now kaban.service

# Определение внешнего IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "ВАШ_IP_СЕРВЕРА")

echo -e "\n\e[32m========================================================================\e[0m"
echo -e "\e[32m✔ УФАНЕТ • KabanCloud YouGile Engine успешно запущен на Debian 13.7!\e[0m"
echo -e "------------------------------------------------------------------------"
echo -e "👉  Официальный адрес:   \e[1;36mhttps://doska.odn.ufanet.ru\e[0m"
echo -e "👉  Прямой доступ (IP):  \e[1;36mhttps://${SERVER_IP}\e[0m (или http://${SERVER_IP}:3000)"
echo -e "📊  Статус службы:        systemctl status kaban.service"
echo -e "📝  Живой журнал логов:   journalctl -u kaban.service -f"
echo -e "💾  Свободно на диске:    $(df -h / | awk 'NR==2 {print $4}')"
echo -e "🧠  Использовано памяти:  $(free -h | awk '/^Mem:/{print $3}') из $(free -h | awk '/^Mem:/{print $2}')"
echo -e "\e[32m========================================================================\e[0m\n"
