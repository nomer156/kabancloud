// ==============================================================================
// УФАНЕТ • Конфигурация PM2 для автономного VPS сервера KabanCloud
// ==============================================================================

module.exports = {
  apps: [
    {
      name: 'kabancloud',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HTTPS_PORT: 3443
      },
      error_file: 'data/logs/pm2-error.log',
      out_file: 'data/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
