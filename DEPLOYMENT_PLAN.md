# План внедрения канбан-доски KabanCloud (УФАНЕТ)
Хостинг на инфраструктуре сайта ЗП (pp.core.ufanet.ru)

Документ описывает архитектуру и пошаговый план размещения корпоративной канбан-доски на том же сервере/инфраструктуре, где функционирует зарплатный сервис `pp.core.ufanet.ru`.

---

## 1. Сравнение вариантов развертывания

### Вариант 1 (Рекомендуемый): Отдельный поддомен `kaban.core.ufanet.ru` (или `board.core.ufanet.ru`)
* **Преимущества**:
  * **Изолированный роутинг**: статика и API канбана (`/api/*`) не конфликтуют с путями зарплатного сайта.
  * **Стабильный Server-Sent Events (SSE)**: постоянное соединение для реалтайм-обновлений не блокирует worker-процессы PHP/Python сайта ЗП.
  * **Безопасность куки**: раздельные контексты безопасности для авторизационных сессий.
  * **Независимый жизненный цикл**: обновление версий, деплой и перезапуск канбан-доски происходят с нулевым простоем (zero-downtime) и не затрагивают работу сайта ЗП.
  * **Переход в 1 клик**: в шапку сайта ЗП встраивается кнопка-ссылка `<a href="https://kaban.core.ufanet.ru" target="_blank">📋 Канбан отделов</a>`.

### Вариант 2: Поддиректория сайта ЗП `pp.core.ufanet.ru/board/`
* **Особенности**:
  * Требуется настройка `base: '/board/'` в `vite.config.js`.
  * Требуются rewrite-правила в Nginx для проксирования `/board/` и `/board/api/`.
  * Плюс: единый домен и возможность прямого чтения общих cookie сайта ЗП.

---

## 2. Конфигурация Nginx для сервера Уфанет (Reverse Proxy)

Пример готового конфигурационного файла Nginx с поддержкой SSL и SSE:

```nginx
# /etc/nginx/sites-available/kaban.core.ufanet.ru.conf

# 1. Редирект с HTTP на защищенный HTTPS
server {
    listen 80;
    server_name kaban.core.ufanet.ru;
    return 301 https://$host$request_uri;
}

# 2. Основной виртуальный хост HTTPS
server {
    listen 443 ssl http2;
    server_name kaban.core.ufanet.ru;

    # SSL сертификаты Уфанет (*.core.ufanet.ru)
    ssl_certificate /etc/ssl/certs/ufanet_wildcard.crt;
    ssl_certificate_key /etc/ssl/private/ufanet_wildcard.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Статический продакшн билд фронтенда (React/Vite)
    location / {
        root /var/www/kabancloud/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options SAMEORIGIN;
    }

    # Проксирование API запросов на Node.js бэкенд
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # Критические настройки для реалтайма Server-Sent Events (SSE /api/events)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_set_header Connection '';
        chunked_transfer_encoding on;
    }

    # Защита от прямого скачивания баз данных, сертификатов и ключей
    location ~* \.(json|log|key|pfx|env|db_key)$ {
        deny all;
        return 404;
    }
}
```

---

## 3. Схема взаимодействия сессий и Single Sign-On (SSO)

Для бесшовного перехода между сайтом ЗП и канбан-доской реализована гибридная схема:
1. **SSO через Cookie/URL**:
   * При переходе с сайта ЗП ссылка может содержать безопасный токен сотрудника `https://kaban.core.ufanet.ru/?sso_token=...` или считываться общая корпоративная cookie `ufanet_user_id`.
   * Система автоматически определяет сотрудника и авторизует без запроса.
2. **Скрытый вход (Privacy Mode)**:
   * Если сотрудник открывает сайт впервые или на стороннем устройстве, список коллег скрыт.
   * Отображается поле поиска: после ввода первых 2-х букв фамилии/имени предлагается подтверждение своего профиля.

---

## 4. Пошаговые команды для развертывания на сервере

```bash
# 1. Сборка продакшн сборки на рабочей машине
npm run build

# 2. Клонирование / доставка файлов на сервер
# Файлы: dist/, server.js, package.json
rsync -avz dist/ server.js package.json user@pp.core.ufanet.ru:/var/www/kabancloud/

# 3. Установка и запуск службы автозапуска через PM2
cd /var/www/kabancloud
npm install --omit=dev
pm2 start server.js --name "kabancloud"
pm2 save
pm2 startup

# 4. Проверка работы службы
pm2 status
curl -k http://127.0.0.1:3000/api/tasks
```
