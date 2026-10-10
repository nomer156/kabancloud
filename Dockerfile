# УФАНЕТ • Dockerfile локального сервера
FROM node:22-alpine

WORKDIR /app

# Копируем готовый билд, сервер и начальные данные
COPY package.json ./
COPY server.js ./
COPY dist ./dist
COPY data ./data

EXPOSE 3000

# Запуск сервера
CMD ["node", "server.js"]
