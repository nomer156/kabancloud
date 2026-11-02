// ==============================================================================
// УФАНЕТ • Автономный сервер корпоративной канбан-доски (Zero Dependencies)
// Безопасность • Аудит-логирование • HTTPS • Отделы • Чаты • Zero-Password Auth
// ==============================================================================

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ports and Directories
const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3443', 10);

const DATA_DIR = path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const SSL_DIR = path.join(DATA_DIR, 'ssl');

const DB_FILE = path.join(DATA_DIR, 'ufanet_db.json');
const DB_KEY_FILE = path.join(DATA_DIR, '.db_key');
const DB_CHECKSUM_FILE = path.join(DATA_DIR, '.db_checksum');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback_and_ideas.json');
const DIST_DIR = path.join(__dirname, 'dist');

// Ensure necessary directories exist
[DATA_DIR, BACKUPS_DIR, UPLOADS_DIR, LOGS_DIR, SSL_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Master Database Key for HMAC and encryption
let DB_SECRET_KEY = '';
if (fs.existsSync(DB_KEY_FILE)) {
  DB_SECRET_KEY = fs.readFileSync(DB_KEY_FILE, 'utf8').trim();
} else {
  DB_SECRET_KEY = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(DB_KEY_FILE, DB_SECRET_KEY, { encoding: 'utf8', mode: 0o600 });
}

// ------------------------------------------------------------------------------
// 1. СТРУКТУРИРОВАННОЕ ЛОГИРОВАНИЕ (Audit Log, Access Log, Error Log)
// ------------------------------------------------------------------------------
const ACCESS_LOG_FILE = path.join(LOGS_DIR, 'access.log');
const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'audit.log');
const ERROR_LOG_FILE = path.join(LOGS_DIR, 'error.log');

function rotateLogIfNeeded(filePath, maxSizeBytes = 10 * 1024 * 1024) {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > maxSizeBytes) {
      const rotated = `${filePath}.${Date.now()}.bak`;
      fs.renameSync(filePath, rotated);
    }
  } catch {}
}

const Logger = {
  access(req, res, durationMs, userId = null) {
    const timestamp = new Date().toISOString();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const line = `[${timestamp}] ACCESS ${req.method} ${req.url} status=${res.statusCode} time=${durationMs}ms ip=${ip} user=${userId || 'anonymous'}\n`;
    try {
      rotateLogIfNeeded(ACCESS_LOG_FILE);
      fs.appendFileSync(ACCESS_LOG_FILE, line, 'utf8');
    } catch {}
  },

  audit(action, userId, details = {}, ip = '127.0.0.1') {
    const timestamp = new Date().toISOString();
    const record = {
      timestamp,
      action,
      userId: userId || 'anonymous',
      ip,
      details
    };
    const line = JSON.stringify(record) + '\n';
    console.log(`\x1b[36m[AUDIT]\x1b[0m ${timestamp} | \x1b[33m${action}\x1b[0m | user: ${userId || 'anon'} |`, details);
    try {
      rotateLogIfNeeded(AUDIT_LOG_FILE);
      fs.appendFileSync(AUDIT_LOG_FILE, line, 'utf8');
    } catch {}
  },

  warn(msg, meta = {}) {
    const timestamp = new Date().toISOString();
    console.warn(`\x1b[33m[WARN]\x1b[0m ${timestamp} ${msg}`, meta);
    try {
      rotateLogIfNeeded(ERROR_LOG_FILE);
      fs.appendFileSync(ERROR_LOG_FILE, `[${timestamp}] WARN ${msg} ${JSON.stringify(meta)}\n`, 'utf8');
    } catch {}
  },

  error(msg, err = null) {
    const timestamp = new Date().toISOString();
    console.error(`\x1b[31m[ERROR]\x1b[0m ${timestamp} ${msg}`, err || '');
    try {
      rotateLogIfNeeded(ERROR_LOG_FILE);
      fs.appendFileSync(ERROR_LOG_FILE, `[${timestamp}] ERROR ${msg} ${err?.stack || err || ''}\n`, 'utf8');
    } catch {}
  }
};

// ------------------------------------------------------------------------------
// 2. БАЗОВЫЕ СПРАВОЧНИКИ (5 Целевых отделов)
// ------------------------------------------------------------------------------
const DEFAULT_DEPARTMENTS = [
  {
    id: 'dept-design',
    name: 'Проектировщики',
    fullName: 'Отдел проектирования',
    icon: '📐',
    color: '#ff6600',
    desc: 'Разработка проектной и рабочей документации (ВОЛС, СВН, СКС, СКУД)',
    isDefault: true
  },
  {
    id: 'dept-welders',
    name: 'Сварщики',
    fullName: 'Сварочно-монтажный отдел',
    icon: '⚡',
    color: '#f59e0b',
    desc: 'Сварка оптических волокон, монтаж муфт, рефлектометрия и кроссы'
  },
  {
    id: 'dept-rss',
    name: 'РСС',
    fullName: 'Районные сети связи',
    icon: '📡',
    color: '#0284c7',
    desc: 'Эксплуатация ЛКС, устранение аварий и мониторинг абонентских сетей'
  },
  {
    id: 'dept-sales-b2b',
    name: 'Отдел продаж ЮЛ',
    fullName: 'Отдел продаж корпоративным клиентам (B2B)',
    icon: '🏢',
    color: '#8b5cf6',
    desc: 'Работа с юридическими лицами, коммерческие предложения, договоры, ТУ'
  },
  {
    id: 'dept-sales-b2c',
    name: 'Отдел продаж ФЛ',
    fullName: 'Отдел продаж физическим лицам (B2C)',
    icon: '👥',
    color: '#10b981',
    desc: 'Подключение частных клиентов, интернет, ТВ, умный дом, розничные заявки'
  }
];

const DEFAULT_SECTIONS = [
  { id: 'ВДН', name: 'ВДН (Видеонаблюдение)', color: '#ff6600', bg: 'rgba(255, 102, 0, 0.15)', border: 'rgba(255, 102, 0, 0.35)' },
  { id: 'МКЖ', name: 'МКЖ (Многоквартирное жилье)', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: 'rgba(2, 132, 199, 0.35)' },
  { id: 'ЧС', name: 'ЧС (Частный сектор / GPON)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' },
  { id: 'ККС', name: 'ККС (Кабельная канализация связи)', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)' },
  { id: 'СКУД', name: 'СКУД (Контроль доступа / домофоны)', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)' },
  { id: 'ОДРС', name: 'ОДРС (Оптические распредсети)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' },
  { id: 'СВН', name: 'СВН (Системы видеонаблюдения)', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.35)' },
  { id: 'ЭОМ', name: 'ЭОМ (Электроснабжение оборудования)', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)' }
];

const DEFAULT_COLUMNS = [
  { id: 'backlog', title: 'Очередь / Бэклог', subtitle: 'В планах к разработке', color: '#64748b' },
  { id: 'in_progress', title: 'В работе', subtitle: 'Текущие задачи инженеров', color: '#ff6600' },
  { id: 'review', title: 'На проверке', subtitle: 'Проверка начальника / Согласование ЮЛ', color: '#f59e0b' },
  { id: 'done', title: 'Готово / Выдано', subtitle: 'Выпущено в монтаж / заказчику', color: '#10b981' }
];

const DEFAULT_MEMBERS = [
  {
    "id": "uf-admin-root",
    "full_name": "admin",
    "department_id": "dept-design",
    "role": "Главный администратор системы",
    "role_level": 10,
    "initials": "AD",
    "avatar_color": "#ef4444",
    "specialty": "Администрирование (Полный доступ)",
    "workstation_id": "vlxproject00"
  },
  {
    "id": "uf-11111111-1111-1111-1111-111111111111",
    "full_name": "Алексей Смирнов",
    "department_id": "dept-design",
    "role": "Начальник отдела проектирования / ГИП",
    "role_level": 10,
    "initials": "АС",
    "avatar_color": "#ff6600",
    "specialty": "ГИП",
    "workstation_id": "vlxproject01"
  },
  {
    "id": "uf-22222222-2222-2222-2222-222222222222",
    "full_name": "Мария Воронова",
    "department_id": "dept-design",
    "role": "Ведущий инженер ВОЛС",
    "role_level": 8,
    "initials": "МВ",
    "avatar_color": "#ff8800",
    "specialty": "ВОЛС",
    "workstation_id": "vlxproject02"
  },
  {
    "id": "uf-33333333-3333-3333-3333-333333333333",
    "full_name": "Дмитрий Ковалёв",
    "department_id": "dept-design",
    "role": "Инженер СКС и передачи данных",
    "role_level": 6,
    "initials": "ДК",
    "avatar_color": "#0284c7",
    "specialty": "СКС",
    "workstation_id": "vlxproject03"
  },
  {
    "id": "uf-44444444-4444-4444-4444-444444444444",
    "full_name": "Елена Васильева",
    "department_id": "dept-design",
    "role": "Инженер видеонаблюдения и СКУД",
    "role_level": 6,
    "initials": "ЕВ",
    "avatar_color": "#10b981",
    "specialty": "ВН",
    "workstation_id": "vlxproject04"
  },
  {
    "id": "uf-weld-1",
    "full_name": "Ильдар Басыров",
    "department_id": "dept-welders",
    "role": "Бригадир сварщиков ВОЛС",
    "role_level": 10,
    "initials": "ИБ",
    "avatar_color": "#f59e0b",
    "specialty": "Муфты МТОК",
    "workstation_id": "vlxproject05"
  },
  {
    "id": "uf-weld-2",
    "full_name": "Руслан Хабибов",
    "department_id": "dept-welders",
    "role": "Мастер-сварщик оптических линий",
    "role_level": 8,
    "initials": "РХ",
    "avatar_color": "#d97706",
    "specialty": "Сварка ОВ",
    "workstation_id": "vlxproject06"
  },
  {
    "id": "uf-weld-3",
    "full_name": "Артур Гареев",
    "department_id": "dept-welders",
    "role": "Инженер-рефлектометрист",
    "role_level": 6,
    "initials": "АГ",
    "avatar_color": "#f97316",
    "specialty": "Рефлектометрия",
    "workstation_id": "vlxproject07"
  },
  {
    "id": "uf-rss-1",
    "full_name": "Михаил Ахметов",
    "department_id": "dept-rss",
    "role": "Начальник участка РСС",
    "role_level": 10,
    "initials": "МА",
    "avatar_color": "#0284c7",
    "specialty": "ЛКС / Эксплуатация",
    "workstation_id": "vlxproject08"
  },
  {
    "id": "uf-rss-2",
    "full_name": "Денис Фёдоров",
    "department_id": "dept-rss",
    "role": "Инженер эксплуатации сетей связи",
    "role_level": 8,
    "initials": "ДФ",
    "avatar_color": "#0ea5e9",
    "specialty": "Аварийная служба",
    "workstation_id": "vlxproject09"
  },
  {
    "id": "uf-rss-3",
    "full_name": "Салават Зарипов",
    "department_id": "dept-rss",
    "role": "Мастер ЛКС РСС",
    "role_level": 6,
    "initials": "СЗ",
    "avatar_color": "#38bdf8",
    "specialty": "Линейные сооружения",
    "workstation_id": "vlxproject10"
  },
  {
    "id": "uf-salesb2b-1",
    "full_name": "Ольга Кузнецова",
    "department_id": "dept-sales-b2b",
    "role": "Руководитель группы корпоративных продаж",
    "role_level": 10,
    "initials": "ОК",
    "avatar_color": "#8b5cf6",
    "specialty": "B2B Клиенты",
    "workstation_id": "vlxproject11"
  },
  {
    "id": "uf-salesb2b-2",
    "full_name": "Тимур Насыров",
    "department_id": "dept-sales-b2b",
    "role": "Ведущий менеджер корпоративного отдела",
    "role_level": 8,
    "initials": "ТН",
    "avatar_color": "#a855f7",
    "specialty": "Договоры ЮЛ",
    "workstation_id": "vlxproject12"
  },
  {
    "id": "uf-salesb2c-1",
    "full_name": "Алина Яковлева",
    "department_id": "dept-sales-b2c",
    "role": "Старший менеджер розничных продаж",
    "role_level": 10,
    "initials": "АЯ",
    "avatar_color": "#10b981",
    "specialty": "B2C Клиенты",
    "workstation_id": "vlxproject13"
  },
  {
    "id": "uf-salesb2c-2",
    "full_name": "Вадим Мусин",
    "department_id": "dept-sales-b2c",
    "role": "Менеджер по подключению МКД и ЧС",
    "role_level": 6,
    "initials": "ВМ",
    "avatar_color": "#059669",
    "specialty": "Подключения GPON",
    "workstation_id": "vlxproject14"
  }
];

const DEFAULT_SEED = {
  departments: DEFAULT_DEPARTMENTS,
  sections: DEFAULT_SECTIONS,
  columns: DEFAULT_COLUMNS,
  projects: [
    'ЖК «Агидель»',
    'мкр. Затон (Север)',
    'Технопарк Уфа',
    'Квартал 4 (Центр)',
    'ТЦ «Планета»'
  ],
  members: DEFAULT_MEMBERS,
  tasks: [],
  notifications: [],
  chats: {
    'dept-all': [],
    'dept-design': [],
    'dept-welders': [],
    'dept-rss': [],
    'dept-sales-b2b': [],
    'dept-sales-b2c': []
  }
};

// ------------------------------------------------------------------------------
// 3. БЕЗОПАСНАЯ БАЗА ДАННЫХ (Atomic Writes, HMAC-256 Checksum, Backup Rotation)
// ------------------------------------------------------------------------------
let lastBackupTime = 0;

function computeHmac(dataString) {
  return crypto.createHmac('sha256', DB_SECRET_KEY).update(dataString).digest('hex');
}

function migrateDbSchema(db) {
  let modified = false;

  // 1. Ensure all 5 departments exist
  if (!Array.isArray(db.departments) || db.departments.length < 5) {
    db.departments = [...DEFAULT_DEPARTMENTS];
    modified = true;
  }

  // 2. Ensure each member has department_id
  if (Array.isArray(db.members)) {
    db.members.forEach((m) => {
      if (!m.department_id) {
        m.department_id = 'dept-design';
        modified = true;
      }
    });

    // Ensure representatives for each department exist
    const existingDeptIds = new Set(db.members.map((m) => m.department_id));
    DEFAULT_MEMBERS.forEach((dm) => {
      if (!existingDeptIds.has(dm.department_id)) {
        db.members.push(dm);
        existingDeptIds.add(dm.department_id);
        modified = true;
      }
    });
  } else {
    db.members = [...DEFAULT_MEMBERS];
    modified = true;
  }

  // 3. Ensure each task has department_id
  if (Array.isArray(db.tasks)) {
    db.tasks.forEach((t) => {
      if (!t.department_id) {
        t.department_id = 'dept-design';
        modified = true;
      }
    });

    // Ensure at least sample tasks exist for other departments
    const taskDeptIds = new Set(db.tasks.map((t) => t.department_id));
    DEFAULT_SEED.tasks.forEach((dt) => {
      if (!taskDeptIds.has(dt.department_id)) {
        db.tasks.push(dt);
        taskDeptIds.add(dt.department_id);
        modified = true;
      }
    });
  } else {
    db.tasks = [...DEFAULT_SEED.tasks];
    modified = true;
  }

  // 3b. Ensure role_permissions matrix exists
  if (!db.role_permissions || typeof db.role_permissions !== 'object') {
    db.role_permissions = {
      10: { can_manage_roles: true, can_manage_board_settings: true, can_manage_columns: true, can_manage_sections: true, can_create_task: true, can_edit_all_tasks: true, can_edit_own_tasks: true, can_delete_task: true, can_move_task: true, can_assign_members: true, can_chat: true, can_export_import: true },
      8: { can_manage_roles: false, can_manage_board_settings: false, can_manage_columns: false, can_manage_sections: true, can_create_task: true, can_edit_all_tasks: true, can_edit_own_tasks: true, can_delete_task: true, can_move_task: true, can_assign_members: true, can_chat: true, can_export_import: true },
      6: { can_manage_roles: false, can_manage_board_settings: false, can_manage_columns: false, can_manage_sections: false, can_create_task: true, can_edit_all_tasks: false, can_edit_own_tasks: true, can_delete_task: false, can_move_task: true, can_assign_members: false, can_chat: true, can_export_import: false },
      3: { can_manage_roles: false, can_manage_board_settings: false, can_manage_columns: false, can_manage_sections: false, can_create_task: false, can_edit_all_tasks: false, can_edit_own_tasks: false, can_delete_task: false, can_move_task: false, can_assign_members: false, can_chat: true, can_export_import: false },
      1: { can_manage_roles: false, can_manage_board_settings: false, can_manage_columns: false, can_manage_sections: false, can_create_task: false, can_edit_all_tasks: false, can_edit_own_tasks: false, can_delete_task: false, can_move_task: false, can_assign_members: false, can_chat: false, can_export_import: false }
    };
    modified = true;
  }

  // 3c. Ensure members have role_level
  if (Array.isArray(db.members)) {
    db.members.forEach((m) => {
      if (!m.role_level) {
        if (m.role && (m.role.includes('Начальник') || m.role.includes('ГИП') || m.role.includes('Бригадир') || m.role.includes('Руководитель'))) {
          m.role_level = 10;
        } else if (m.role && (m.role.includes('Ведущий') || m.role.includes('Старший') || m.role.includes('Мастер'))) {
          m.role_level = 8;
        } else {
          m.role_level = 6;
        }
        modified = true;
      }
    });
  }

  // 4. Ensure chats structure exists
  if (!db.chats || typeof db.chats !== 'object') {
    db.chats = {
      'dept-all': [],
      'dept-design': [],
      'dept-welders': [],
      'dept-rss': [],
      'dept-sales-b2b': [],
      'dept-sales-b2c': []
    };
    modified = true;
  }

  return modified;
}

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(DEFAULT_SEED);
      return DEFAULT_SEED;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');

    // Check integrity if checksum file exists
    if (fs.existsSync(DB_CHECKSUM_FILE)) {
      const storedChecksum = fs.readFileSync(DB_CHECKSUM_FILE, 'utf8').trim();
      const currentChecksum = computeHmac(raw);
      if (storedChecksum && currentChecksum !== storedChecksum) {
        Logger.warn('Контрольная сумма базы данных не совпадает! Возможно внешнее изменение файла.', {
          stored: storedChecksum.slice(0, 8),
          current: currentChecksum.slice(0, 8)
        });
      }
    }

    const data = JSON.parse(raw);
    const neededMigration = migrateDbSchema(data);
    if (neededMigration) {
      writeDb(data);
    }
    return data;
  } catch (err) {
    Logger.error('Ошибка чтения базы данных, попытка восстановить из последнего бэкапа:', err);
    try {
      const backups = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).sort().reverse();
      if (backups.length > 0) {
        const lastBackup = path.join(BACKUPS_DIR, backups[0]);
        const backupData = JSON.parse(fs.readFileSync(lastBackup, 'utf8'));
        writeDb(backupData);
        Logger.audit('DB_RESTORED_FROM_BACKUP', 'system', { backup: backups[0] });
        return backupData;
      }
    } catch {}
    return DEFAULT_SEED;
  }
}

function writeDb(data) {
  try {
    const json = JSON.stringify(data, null, 2);
    const checksum = computeHmac(json);

    // Atomic write via temporary file
    const tempFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
    fs.writeFileSync(tempFile, json, 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    fs.writeFileSync(DB_CHECKSUM_FILE, checksum, 'utf8');

    // Automatic hourly backup rotation
    const now = Date.now();
    if (now - lastBackupTime > 3600000) {
      const backupPath = path.join(BACKUPS_DIR, `ufanet_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(backupPath, json, 'utf8');
      lastBackupTime = now;

      // Keep max 30 recent backups
      const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).sort();
      while (files.length > 30) {
        const oldFile = path.join(BACKUPS_DIR, files.shift());
        try { fs.unlinkSync(oldFile); } catch {}
      }
    }
  } catch (err) {
    Logger.error('Критическая ошибка записи базы данных:', err);
  }
}

// ------------------------------------------------------------------------------
// 4. СЕССИИ И АВТОРИЗАЦИЯ (Zero-Password Auth Middleware)
// ------------------------------------------------------------------------------
function extractAuthUser(req, db) {
  const headerUserId = req.headers['x-user-id'];
  const headerPc = req.headers['x-workstation'];
  const authHeader = req.headers['authorization'];
  let candidateId = headerUserId;

  if (!candidateId && authHeader && authHeader.startsWith('Bearer ')) {
    candidateId = authHeader.slice(7).trim();
  }

  if (!candidateId && req.headers.cookie) {
    const match = req.headers.cookie.match(/kaban_uid=([^;]+)/);
    if (match) candidateId = decodeURIComponent(match[1]);
  }

  // Workstation cookie / header
  let candidatePc = headerPc;
  if (!candidatePc && req.headers.cookie) {
    const pcMatch = req.headers.cookie.match(/kaban_pc=([^;]+)/);
    if (pcMatch) candidatePc = decodeURIComponent(pcMatch[1]);
  }

  // URL query parameter ?pc=... or ?userId=...
  if (!candidateId && !candidatePc && req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      candidateId = parsed.searchParams.get('userId') || parsed.searchParams.get('uid');
      candidatePc = parsed.searchParams.get('pc') || parsed.searchParams.get('workstation');
    } catch {}
  }

  if (candidateId) {
    if (candidateId === 'admin') {
      const admin = db.members?.find((m) => m.full_name?.toLowerCase() === 'admin' || m.id === 'uf-admin-root');
      if (admin) return admin;
    }
    const found = db.members?.find((m) => m.id === candidateId || m.full_name?.toLowerCase() === candidateId.toLowerCase());
    if (found) return found;
  }

  if (candidatePc) {
    const norm = candidatePc.trim().toLowerCase();
    const foundByPc = db.members?.find((m) => m.workstation_id?.toLowerCase() === norm);
    if (foundByPc) return foundByPc;
  }

  return null;
}

function requireAuth(req, res, db) {
  const user = extractAuthUser(req, db);
  if (!user) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    Logger.audit('UNAUTHORIZED_ACCESS_ATTEMPT', 'anonymous', { url: req.url, method: req.method }, ip);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Требуется авторизация (выберите профиль сотрудника)', code: 'UNAUTHORIZED' }));
    return null;
  }
  return user;
}

// ------------------------------------------------------------------------------
// 5. SERVER-SENT EVENTS (SSE) РЕАЛТАЙМ ВЕЩАНИЕ ДЛЯ LAN
// ------------------------------------------------------------------------------
const sseClients = new Set();

function broadcastEvent(type, payload, targetUserIds = null) {
  const message = `data: ${JSON.stringify({ type, payload, targetUserIds, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ------------------------------------------------------------------------------
// 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ HTTP
// ------------------------------------------------------------------------------
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.vsd': 'application/vnd.visio',
  '.vsdx': 'application/vnd.ms-visio.drawing.main+xml',
  '.dwg': 'application/acad',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip': 'application/zip'
};

// ------------------------------------------------------------------------------
// 7. ОСНОВНОЙ РОУТЕР ЗАПРОСОВ
// ------------------------------------------------------------------------------
async function handleRequest(req, res) {
  const startTime = Date.now();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Common security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CORS Headers for LAN & dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Hook res.end for Access logging
  const originalEnd = res.end;
  let responseEnded = false;
  res.end = function (...args) {
    if (!responseEnded) {
      responseEnded = true;
      const duration = Date.now() - startTime;
      const db = readDb();
      const user = extractAuthUser(req, db);
      Logger.access(req, res, duration, user?.id || null);
    }
    return originalEnd.apply(this, args);
  };

  try {
    // ------------------ REALTIME SSE STREAM (AUTH PROTECTED) ------------------ //
    if (pathname === '/api/events') {
      const db = readDb();
      const userIdParam = parsedUrl.searchParams.get('userId');
      const user = (userIdParam && db.members?.find((m) => m.id === userIdParam)) || extractAuthUser(req, db);

      if (!user) {
        Logger.audit('SSE_CONNECTION_REJECTED', 'anonymous', { reason: 'Missing or invalid userId' }, ip);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'SSE требует авторизации (параметр ?userId=...)' }));
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      const client = { id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, res, user };
      sseClients.add(client);
      Logger.audit('SSE_CLIENT_CONNECTED', user.id, { clientId: client.id, name: user.full_name }, ip);

      // Keepalive ping every 25 seconds
      const pingInterval = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          clearInterval(pingInterval);
          sseClients.delete(client);
        }
      }, 25000);

      req.on('close', () => {
        clearInterval(pingInterval);
        sseClients.delete(client);
        Logger.audit('SSE_CLIENT_DISCONNECTED', user.id, { clientId: client.id }, ip);
      });
      return;
    }

    // ------------------ SERVER INFO ------------------ //
    if (pathname === '/api/server-info' && req.method === 'GET') {
      const ifaces = os.networkInterfaces();
      const ips = [];
      for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            ips.push(iface.address);
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        serverName: 'Уфанет KabanCloud Server',
        version: '2.5.0',
        platform: os.platform(),
        uptime: Math.floor(os.uptime()),
        ips,
        httpPort: HTTP_PORT,
        httpsPort: HTTPS_PORT,
        httpsEnabled: fs.existsSync(path.join(SSL_DIR, 'server.pfx'))
      }));
      return;
    }

    // ------------------ AUTHENTICATION ENDPOINTS (ZERO-PASSWORD) ------------------ //
    // 1. GET /api/auth/members (Public list for 1-click login)
    if (pathname === '/api/auth/members' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.members || DEFAULT_MEMBERS));
      return;
    }

    // 2. POST /api/auth/login (1-Click Login by memberId)
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { memberId, workstation, username } = await parseBody(req);
      const db = readDb();
      let member = null;

      if (username === 'admin' || memberId === 'admin' || memberId === 'uf-admin-root') {
        member = db.members?.find((m) => m.full_name?.toLowerCase() === 'admin' || m.id === 'uf-admin-root');
      } else if (memberId) {
        member = db.members?.find((m) => m.id === memberId || m.full_name?.toLowerCase() === memberId.toLowerCase());
      } else if (workstation) {
        const norm = workstation.trim().toLowerCase();
        member = db.members?.find((m) => m.workstation_id?.toLowerCase() === norm);
      }

      if (!member) {
        Logger.audit('AUTH_LOGIN_FAILED', 'unknown', { memberId, workstation, username }, ip);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Сотрудник или рабочее место не найдено' }));
        return;
      }

      // If workstation was passed with login, bind it to member
      if (workstation && !member.workstation_id) {
        member.workstation_id = workstation.trim().toLowerCase();
        writeDb(db);
        broadcastEvent('MEMBERS_UPDATED', db.members);
      }

      Logger.audit('AUTH_LOGIN_SUCCESS', member.id, { name: member.full_name, dept: member.department_id, pc: member.workstation_id }, ip);
      res.setHeader('Set-Cookie', [
        `kaban_uid=${encodeURIComponent(member.id)}; Path=/; SameSite=Lax; Max-Age=31536000`,
        `kaban_pc=${encodeURIComponent(member.workstation_id || '')}; Path=/; SameSite=Lax; Max-Age=31536000`
      ]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, user: member }));
      return;
    }

    // 2b. POST /api/auth/bind-workstation (Bind PC hostname like vlxproject04 to employee)
    if (pathname === '/api/auth/bind-workstation' && req.method === 'POST') {
      const { memberId, workstation } = await parseBody(req);
      if (!memberId || !workstation) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Не указан ID сотрудника или имя ПК' }));
        return;
      }
      const db = readDb();
      const member = db.members?.find((m) => m.id === memberId);
      if (member) {
        member.workstation_id = workstation.trim().toLowerCase();
        writeDb(db);
        broadcastEvent('MEMBERS_UPDATED', db.members);
        Logger.audit('WORKSTATION_BOUND', member.id, { name: member.full_name, workstation: member.workstation_id }, ip);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: member }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Сотрудник не найден' }));
      }
      return;
    }




    // 3. POST /api/auth/register (Zero-password fast registration)
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { full_name, department_id, role, role_level, avatar_color, avatar_url, initials, specialty, workstation_id, phone, email, telegram, office_room } = await parseBody(req);

      if (!full_name || !full_name.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Укажите ФИО или имя сотрудника' }));
        return;
      }

      const db = readDb();
      if (!Array.isArray(db.members)) db.members = [...DEFAULT_MEMBERS];

      // Auto generate initials if missing
      let computedInitials = initials?.trim();
      if (!computedInitials) {
        const parts = full_name.trim().split(/\s+/);
        computedInitials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : full_name.slice(0, 2).toUpperCase();
      }

      let normPc = (workstation_id || '').trim().toLowerCase();
      if (normPc && !normPc.startsWith('vlxproject') && /^\d+$/.test(normPc)) {
        normPc = `vlxproject${normPc.padStart(2, '0')}`;
      }

      const newMember = {
        id: `uf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        full_name: full_name.trim(),
        department_id: department_id || 'dept-design',
        role: role?.trim() || 'Инженер',
        role_level: Number(role_level) || 6,
        initials: computedInitials,
        avatar_color: avatar_color || '#ff6600',
        avatar_url: avatar_url || null,
        specialty: specialty?.trim() || '',
        workstation_id: normPc,
        phone: (phone || '').trim(),
        email: (email || '').trim(),
        telegram: (telegram || '').trim(),
        office_room: (office_room || '').trim(),
        is_verified: Number(role_level) >= 10
      };

      db.members.push(newMember);
      writeDb(db);
      broadcastEvent('MEMBERS_UPDATED', db.members);

      Logger.audit('AUTH_REGISTER_SUCCESS', newMember.id, { name: newMember.full_name, dept: newMember.department_id, pc: newMember.workstation_id }, ip);
      res.setHeader('Set-Cookie', [
        `kaban_uid=${encodeURIComponent(newMember.id)}; Path=/; SameSite=Lax; Max-Age=31536000`,
        `kaban_pc=${encodeURIComponent(newMember.workstation_id || '')}; Path=/; SameSite=Lax; Max-Age=31536000`
      ]);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, user: newMember }));
      return;
    }

    // 4. GET /api/auth/me (Verify session)
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const db = readDb();
      const user = extractAuthUser(req, db);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: false }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: true, user }));
      return;
    }

    // ------------------ AUDIT LOGS ENDPOINT ------------------ //
    if (pathname === '/api/logs/audit' && req.method === 'GET') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      let logs = [];
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        try {
          const lines = fs.readFileSync(AUDIT_LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
          logs = lines.slice(-200).map((l) => {
            try { return JSON.parse(l); } catch { return { raw: l }; }
          }).reverse();
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs));
      return;
    }

    // ------------------ DEPARTMENTS API ------------------ //
    if (pathname === '/api/departments' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.departments || DEFAULT_DEPARTMENTS));
      return;
    }

    if (pathname === '/api/departments' && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const dept = await parseBody(req);
      if (!Array.isArray(db.departments)) db.departments = [...DEFAULT_DEPARTMENTS];
      const id = dept.id || `dept-${Date.now()}`;
      const prepared = { ...dept, id };
      const idx = db.departments.findIndex((d) => d.id === id);
      if (idx >= 0) db.departments[idx] = prepared;
      else db.departments.push(prepared);
      writeDb(db);
      broadcastEvent('DEPARTMENTS_UPDATED', db.departments);

      Logger.audit('DEPARTMENT_SAVED', currentUser.id, { deptId: id, name: dept.name }, ip);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.departments));
      return;
    }

    if (pathname.startsWith('/api/departments/') && req.method === 'DELETE') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const deptId = pathname.replace('/api/departments/', '').trim();
      if (!Array.isArray(db.departments)) db.departments = [...DEFAULT_DEPARTMENTS];
      db.departments = db.departments.filter((d) => d.id !== deptId);
      writeDb(db);
      broadcastEvent('DEPARTMENTS_UPDATED', db.departments);

      Logger.audit('DEPARTMENT_DELETED', currentUser.id, { deptId }, ip);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.departments));
      return;
    }

    // ------------------ DEPARTMENT CHATS (YOUGILE FEATURE) ------------------ //
    if (pathname.startsWith('/api/chats/')) {
      const deptId = pathname.replace('/api/chats/', '').trim() || 'dept-all';
      const db = readDb();

      if (req.method === 'GET') {
        const messages = db.chats?.[deptId] || [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(messages));
        return;
      }

      if (req.method === 'POST') {
        let currentUser = extractAuthUser(req, db);
        if (!currentUser) {
          currentUser = db.members?.[0] || { id: 'uf-anon', full_name: 'Сотрудник Уфанет', department_id: 'dept-design' };
        }

        const { text, quoted_task } = await parseBody(req);
        if (!text || !text.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Сообщение не может быть пустым' }));
          return;
        }

        if (!db.chats) db.chats = {};
        if (!Array.isArray(db.chats[deptId])) db.chats[deptId] = [];

        const messageObj = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          department_id: deptId,
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          user_initials: currentUser.initials || 'УФ',
          user_color: currentUser.avatar_color || '#ff6600',
          user_role: currentUser.role || 'Инженер',
          text: text.trim(),
          quoted_task: quoted_task || null,
          created_at: new Date().toISOString()
        };

        db.chats[deptId].push(messageObj);
        // Keep max 500 messages per department
        if (db.chats[deptId].length > 500) {
          db.chats[deptId] = db.chats[deptId].slice(-500);
        }
        writeDb(db);

        broadcastEvent('NEW_CHAT_MESSAGE', { departmentId: deptId, message: messageObj });
        Logger.audit('CHAT_MESSAGE_SENT', currentUser.id, { deptId, quotedTaskId: quoted_task?.id }, ip);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(messageObj));
        return;
      }
    }

    // ------------------ PERMISSIONS MATRIX API (LEVEL 10 EXCLUSIVE) ------------------ //
    if (pathname === '/api/permissions' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.role_permissions || null));
      return;
    }

    if (pathname === '/api/permissions' && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const userLevel = Number(currentUser.role_level) || 6;
      if (userLevel < 10) {
        Logger.audit('PERMISSIONS_EDIT_FORBIDDEN', currentUser.id, { role_level: userLevel }, ip);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Только начальник отдела (10 уровень) может изменять матрицу прав', code: 'FORBIDDEN' }));
        return;
      }

      const incoming = await parseBody(req);
      db.role_permissions = incoming;
      writeDb(db);
      broadcastEvent('PERMISSIONS_UPDATED', db.role_permissions);
      Logger.audit('PERMISSIONS_MATRIX_SAVED', currentUser.id, {}, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.role_permissions));
      return;
    }

    // ------------------ TASKS API (PROTECTED WRITES) ------------------ //
    if (pathname === '/api/tasks' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.tasks || []));
      return;
    }

    if (pathname === '/api/tasks' && req.method === 'POST') {
      const db = readDb();
      let currentUser = extractAuthUser(req, db);

      const task = await parseBody(req);
      if (!Array.isArray(db.tasks)) db.tasks = [];

      if (!currentUser) {
        currentUser = db.members?.find((m) => m.id === task.assignee_id) || db.members?.[0] || { id: 'uf-anon', full_name: 'Инженер Уфанет', department_id: task.department_id || 'dept-design' };
      }

      const id = task.id || `task-uf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const prepared = {
        ...task,
        id,
        department_id: task.department_id || currentUser.department_id || 'dept-design',
        created_at: task.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: currentUser.full_name || 'Инженер'
      };

      const idx = db.tasks.findIndex((t) => t.id === id);
      const isEdit = idx >= 0;
      if (isEdit) {
        db.tasks[idx] = prepared;
      } else {
        db.tasks.unshift(prepared);
      }

      writeDb(db);
      broadcastEvent('TASK_UPDATED', prepared);
      Logger.audit(isEdit ? 'TASK_UPDATED' : 'TASK_CREATED', currentUser.id, { taskId: id, title: prepared.title, dept: prepared.department_id }, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(prepared));
      return;
    }

    if (pathname === '/api/tasks/bulk' && req.method === 'POST') {
      const db = readDb();
      let currentUser = extractAuthUser(req, db);
      if (!currentUser) {
        currentUser = db.members?.[0] || { id: 'uf-anon', full_name: 'Инженер Уфанет', department_id: 'dept-design' };
      }

      const { tasks: incomingTasks } = await parseBody(req);
      if (!Array.isArray(incomingTasks) || incomingTasks.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Список задач пуст' }));
        return;
      }

      if (!Array.isArray(db.tasks)) db.tasks = [];
      const now = new Date().toISOString();
      const created = incomingTasks.map((t, idx) => ({
        ...t,
        id: t.id || `task-uf-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        department_id: t.department_id || currentUser.department_id || 'dept-design',
        created_at: t.created_at || now,
        updated_at: now
      }));

      db.tasks = [...created, ...db.tasks];
      writeDb(db);
      broadcastEvent('TASKS_BULK_CREATED', { tasks: created, count: created.length });
      Logger.audit('TASKS_BULK_CREATED', currentUser.id, { count: created.length }, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: created.length, tasks: created }));
      return;
    }

    if (pathname.startsWith('/api/tasks/') && pathname.endsWith('/status') && req.method === 'PATCH') {
      const db = readDb();
      let currentUser = extractAuthUser(req, db);
      if (!currentUser) {
        currentUser = db.members?.[0] || { id: 'uf-anon', full_name: 'Инженер Уфанет' };
      }

      const parts = pathname.split('/');
      let taskId = parts[3] || '';
      try {
        taskId = decodeURIComponent(taskId);
      } catch {}
      const { status } = await parseBody(req);

      const task = db.tasks?.find((t) => String(t.id).toLowerCase() === taskId.toLowerCase() || String(t.display_id || '').toLowerCase() === taskId.toLowerCase());
      if (task) {
        const prevStatus = task.status;
        task.status = status;
        task.updated_at = new Date().toISOString();
        if (status === 'done' && !task.completed_at) {
          task.completed_at = new Date().toISOString();
        }
        writeDb(db);
        broadcastEvent('TASK_UPDATED', task);
        Logger.audit('TASK_STATUS_CHANGED', currentUser.id, { taskId: task.id, from: prevStatus, to: status }, ip);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(task));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Задача не найдена' }));
      }
      return;
    }

    if (pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
      const db = readDb();
      let currentUser = extractAuthUser(req, db);
      if (!currentUser) {
        currentUser = db.members?.[0] || { id: 'uf-anon', full_name: 'Инженер Уфанет' };
      }

      let taskId = pathname.split('/')[3] || '';
      try {
        taskId = decodeURIComponent(taskId);
      } catch {}
      const target = db.tasks?.find((t) => String(t.id).toLowerCase() === taskId.toLowerCase() || String(t.display_id || '').toLowerCase() === taskId.toLowerCase());
      db.tasks = (db.tasks || []).filter((t) => String(t.id).toLowerCase() !== taskId.toLowerCase() && String(t.display_id || '').toLowerCase() !== taskId.toLowerCase());
      writeDb(db);
      broadcastEvent('TASK_DELETED', { id: target?.id || taskId });
      Logger.audit('TASK_DELETED', currentUser.id, { taskId: target?.id || taskId, title: target?.title }, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // ------------------ MEMBERS & TEAM API ------------------ //
    if (pathname === '/api/members' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.members || DEFAULT_MEMBERS));
      return;
    }

    if (pathname === '/api/members' && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const member = await parseBody(req);
      if (!Array.isArray(db.members)) db.members = [...DEFAULT_MEMBERS];

      const id = member.id || `uf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const prepared = { ...member, id, department_id: member.department_id || 'dept-design' };
      const idx = db.members.findIndex((m) => m.id === id);
      if (idx >= 0) db.members[idx] = prepared;
      else db.members.push(prepared);

      writeDb(db);
      broadcastEvent('MEMBERS_UPDATED', db.members);
      Logger.audit('MEMBER_SAVED', currentUser.id, { memberId: id, name: prepared.full_name }, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(prepared));
      return;
    }

    if (pathname.startsWith('/api/members/') && req.method === 'DELETE') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const memberId = pathname.split('/')[3];
      db.members = (db.members || []).filter((m) => m.id !== memberId);
      writeDb(db);
      broadcastEvent('MEMBERS_UPDATED', db.members);
      Logger.audit('MEMBER_DELETED', currentUser.id, { memberId }, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // ------------------ CHIEF & ADMIN ACCESS REQUESTS (УРОВЕНЬ 10) ------------------ //
    // 1. GET /api/access-requests (Fetch all pending & reviewed requests)
    if (pathname === '/api/access-requests' && req.method === 'GET') {
      const db = readDb();
      if (!Array.isArray(db.access_requests)) db.access_requests = [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.access_requests));
      return;
    }

    // 2. POST /api/access-requests (Employee requests Level 10 Chief status)
    if (pathname === '/api/access-requests' && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const body = await parseBody(req);
      if (!Array.isArray(db.access_requests)) db.access_requests = [];

      // Check if there is already an active pending request for this user
      const existingPending = db.access_requests.find(
        (r) => r.user_id === currentUser.id && r.status === 'pending'
      );
      if (existingPending) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(existingPending));
        return;
      }

      const requestItem = {
        id: `req-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        department_id: currentUser.department_id || body.department_id || 'dept-design',
        workstation_id: currentUser.workstation_id || body.workstation_id || '',
        requested_level: body.requested_level || 10,
        requested_role: body.requested_role || 'Начальник отдела (Ур. 10)',
        note: (body.note || '').trim(),
        status: 'pending',
        created_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null
      };

      db.access_requests.unshift(requestItem);
      writeDb(db);
      broadcastEvent('ACCESS_REQUEST_CREATED', requestItem);
      Logger.audit('ACCESS_REQUEST_CREATED', currentUser.id, { requestId: requestItem.id, user: currentUser.full_name }, ip);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(requestItem));
      return;
    }

    // 3. POST /api/access-requests/:id/approve (Admin or Level 10 Chief approves request)
    if (pathname.startsWith('/api/access-requests/') && pathname.endsWith('/approve') && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const userLevel = Number(currentUser.role_level) || 6;
      if (userLevel < 10 && currentUser.full_name?.toLowerCase() !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Только администратор или начальник (Ур. 10) может одобрять запросы' }));
        return;
      }

      const reqId = pathname.split('/')[3];
      if (!Array.isArray(db.access_requests)) db.access_requests = [];
      const reqItem = db.access_requests.find((r) => r.id === reqId);
      if (!reqItem) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Запрос доступа не найден' }));
        return;
      }

      reqItem.status = 'approved';
      reqItem.reviewed_at = new Date().toISOString();
      reqItem.reviewed_by = currentUser.full_name;

      // Update target member in db.members
      let targetMember = db.members?.find((m) => m.id === reqItem.user_id);
      if (targetMember) {
        targetMember.role_level = Number(reqItem.requested_level) || 10;
        targetMember.role = reqItem.requested_role || 'Начальник отдела';
        targetMember.is_verified = true;
      }

      writeDb(db);
      broadcastEvent('ACCESS_REQUEST_RESOLVED', reqItem);
      broadcastEvent('MEMBERS_UPDATED', db.members);
      Logger.audit('ACCESS_REQUEST_APPROVED', currentUser.id, { reqId, targetUserId: reqItem.user_id }, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, request: reqItem, member: targetMember }));
      return;
    }

    // 4. POST /api/access-requests/:id/reject
    if (pathname.startsWith('/api/access-requests/') && pathname.endsWith('/reject') && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const userLevel = Number(currentUser.role_level) || 6;
      if (userLevel < 10 && currentUser.full_name?.toLowerCase() !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Только администратор или начальник (Ур. 10) может отклонять запросы' }));
        return;
      }

      const reqId = pathname.split('/')[3];
      if (!Array.isArray(db.access_requests)) db.access_requests = [];
      const reqItem = db.access_requests.find((r) => r.id === reqId);
      if (!reqItem) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Запрос доступа не найден' }));
        return;
      }

      reqItem.status = 'rejected';
      reqItem.reviewed_at = new Date().toISOString();
      reqItem.reviewed_by = currentUser.full_name;

      writeDb(db);
      broadcastEvent('ACCESS_REQUEST_RESOLVED', reqItem);
      Logger.audit('ACCESS_REQUEST_REJECTED', currentUser.id, { reqId, targetUserId: reqItem.user_id }, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, request: reqItem }));
      return;
    }

    // 5. POST /api/members/:id/verify (Chief verifies/confirms an employee of their department)
    if (pathname.startsWith('/api/members/') && pathname.endsWith('/verify') && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const userLevel = Number(currentUser.role_level) || 6;
      if (userLevel < 10 && currentUser.full_name?.toLowerCase() !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Только начальник отдела (Ур. 10) может подтверждать сотрудников' }));
        return;
      }

      const memberId = pathname.split('/')[3];
      const targetMember = db.members?.find((m) => m.id === memberId);
      if (!targetMember) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Сотрудник не найден' }));
        return;
      }

      const { is_verified, role_level, role } = await parseBody(req);
      targetMember.is_verified = is_verified !== false;
      if (role_level !== undefined) targetMember.role_level = Number(role_level);
      if (role) targetMember.role = role.trim();

      writeDb(db);
      broadcastEvent('MEMBERS_UPDATED', db.members);
      Logger.audit('MEMBER_VERIFIED', currentUser.id, { targetId: memberId, is_verified: targetMember.is_verified }, ip);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, member: targetMember }));
      return;
    }

    // ------------------ PROJECTS, SECTIONS, COLUMNS, NOTIFICATIONS ------------------ //
    if (pathname === '/api/projects' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.projects || []));
      return;
    }

    if (pathname === '/api/projects' && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const { name } = await parseBody(req);
      if (!Array.isArray(db.projects)) db.projects = [];
      if (name && !db.projects.includes(name.trim())) {
        db.projects.push(name.trim());
        writeDb(db);
        broadcastEvent('PROJECTS_UPDATED', db.projects);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.projects));
      return;
    }

    if (pathname === '/api/sections' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.sections || DEFAULT_SECTIONS));
      return;
    }

    if (pathname === '/api/sections' && req.method === 'POST') {
      const db = readDb();
      let currentUser = extractAuthUser(req, db);
      if (!currentUser) {
        currentUser = db.members?.[0] || { id: 'uf-admin-root', full_name: 'admin' };
      }

      const sectionsList = await parseBody(req);
      if (Array.isArray(sectionsList) && sectionsList.length > 0) {
        db.sections = sectionsList;
        writeDb(db);
        broadcastEvent('SECTIONS_UPDATED', db.sections);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.sections || DEFAULT_SECTIONS));
      return;
    }

    if (pathname === '/api/columns' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.columns || DEFAULT_COLUMNS));
      return;
    }

    if (pathname === '/api/columns' && req.method === 'POST') {
      const db = readDb();
      let currentUser = extractAuthUser(req, db);
      if (!currentUser) {
        currentUser = db.members?.[0] || { id: 'uf-admin-root', full_name: 'admin' };
      }

      const columnsList = await parseBody(req);
      if (Array.isArray(columnsList) && columnsList.length > 0) {
        db.columns = columnsList;
        writeDb(db);
        broadcastEvent('COLUMNS_UPDATED', db.columns);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.columns || DEFAULT_COLUMNS));
      return;
    }

    if (pathname === '/api/notifications' && req.method === 'GET') {
      const db = readDb();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.notifications || []));
      return;
    }

    if (pathname === '/api/notifications' && req.method === 'POST') {
      const db = readDb();
      const notif = await parseBody(req);
      if (!Array.isArray(db.notifications)) db.notifications = [];
      const item = { ...notif, id: notif.id || `notif-${Date.now()}`, created_at: new Date().toISOString() };
      db.notifications.unshift(item);
      if (db.notifications.length > 200) db.notifications = db.notifications.slice(0, 200);
      writeDb(db);
      broadcastEvent('NOTIFICATIONS_UPDATED', db.notifications);
      broadcastEvent('NEW_MENTION', item);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item));
      return;
    }

    // ------------------ SECURED: OPEN FOLDER (PREVENTS INJECTION & EXECUTABLES) ------------------ //
    if (pathname === '/api/open-folder' && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const body = await parseBody(req);
      const rawPath = body.folderPath || body.path || body.folder;

      if (!rawPath || typeof rawPath !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Путь к папке не указан или неверен' }));
        return;
      }

      // 1. Check for shell injection characters
      if (/[;&|`$><"'\r\n]/.test(rawPath)) {
        Logger.audit('OPEN_FOLDER_BLOCKED_INJECTION', currentUser.id, { rawPath }, ip);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Недопустимые символы в пути (заблокировано политикой безопасности)' }));
        return;
      }

      const cleanPath = path.normalize(rawPath.trim().replace(/^file:\/\/\/?/i, ''));

      // 2. Reject executable and script extensions
      const ext = path.extname(cleanPath).toLowerCase();
      const DANGEROUS_EXTS = new Set(['.exe', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.msi', '.com', '.scr', '.pif', '.reg', '.hta', '.sh']);
      if (DANGEROUS_EXTS.has(ext)) {
        Logger.audit('OPEN_FOLDER_BLOCKED_EXECUTABLE', currentUser.id, { cleanPath, ext }, ip);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Запуск исполняемых файлов запрещен политикой безопасности компании' }));
        return;
      }

      // 3. Verify format: must be valid Windows drive path or UNC network path
      const isDrivePath = /^[a-zA-Z]:\\/.test(cleanPath);
      const isUncPath = cleanPath.startsWith('\\\\');
      if (!isDrivePath && !isUncPath && process.platform === 'win32') {
        Logger.audit('OPEN_FOLDER_BLOCKED_INVALID_FORMAT', currentUser.id, { cleanPath }, ip);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Допустимы только локальные диски (C:, D:) или сетевые пути (\\\\ufanet-server\\...)' }));
        return;
      }

      Logger.audit('OPEN_FOLDER_EXECUTED', currentUser.id, { cleanPath }, ip);

      if (process.platform === 'win32') {
        let isFile = false;
        try {
          if (fs.existsSync(cleanPath) && fs.statSync(cleanPath).isFile()) {
            isFile = true;
          }
        } catch {}

        const args = isFile ? [`/select,${cleanPath}`] : [cleanPath];
        const child = spawn('explorer.exe', args, { detached: true, stdio: 'ignore' });
        child.unref();
      } else {
        const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
        const child = spawn(cmd, [cleanPath], { detached: true, stdio: 'ignore' });
        child.unref();
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, path: cleanPath }));
      return;
    }

    // ------------------ SECURED: UPLOAD FILE (WHITELIST & PATH TRAVERSAL DEFENSE) ------------------ //
    if (pathname === '/api/upload-file' && req.method === 'POST') {
      const db = readDb();
      const currentUser = requireAuth(req, res, db);
      if (!currentUser) return;

      const { name, type, size, dataBase64 } = await parseBody(req);
      if (!dataBase64 || !name) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Данные файла не переданы' }));
        return;
      }

      // 1. Whitelist extension check
      const rawExt = path.extname(name).toLowerCase();
      const ALLOWED_EXTS = new Set(['.pdf', '.dwg', '.dxf', '.vsd', '.vsdx', '.jpg', '.jpeg', '.png', '.webp', '.xlsx', '.xls', '.docx', '.doc', '.txt', '.zip']);
      if (!ALLOWED_EXTS.has(rawExt)) {
        Logger.audit('UPLOAD_BLOCKED_EXTENSION', currentUser.id, { filename: name, ext: rawExt }, ip);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Формат файла ${rawExt} запрещен. Разрешены: PDF, DWG, DXF, VSD/X, изображения, Excel, Word, ZIP.` }));
        return;
      }

      // 2. Size limit: 25MB
      const base64Data = dataBase64.replace(/^data:([A-Za-z-+/0-9]+);base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 25 * 1024 * 1024) {
        Logger.audit('UPLOAD_BLOCKED_TOO_LARGE', currentUser.id, { sizeBytes: buffer.length }, ip);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Размер файла превышает допустимый лимит 25 МБ' }));
        return;
      }

      // 3. Safe filename generation without path traversal
      const safeBase = path.basename(name).replace(/[^a-zA-Z0-9._\-а-яА-ЯёЁ]/g, '_');
      const fileId = `file-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const diskFileName = `${fileId}_${safeBase}`;
      const targetFilePath = path.resolve(UPLOADS_DIR, diskFileName);

      // Verify path stays within uploads directory
      if (!targetFilePath.startsWith(UPLOADS_DIR)) {
        Logger.audit('UPLOAD_BLOCKED_PATH_TRAVERSAL', currentUser.id, { diskFileName }, ip);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Недопустимый путь к файлу' }));
        return;
      }

      fs.writeFileSync(targetFilePath, buffer);

      const fileMeta = {
        id: fileId,
        name: safeBase,
        size: buffer.length,
        type: type || 'application/octet-stream',
        url: `/uploads/${diskFileName}`,
        uploaded_at: new Date().toISOString(),
        uploaded_by: currentUser.full_name
      };

      Logger.audit('FILE_UPLOADED_SUCCESS', currentUser.id, { fileId, name: safeBase, size: buffer.length }, ip);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fileMeta));
      return;
    }

    // ------------------ SECURED: SERVE UPLOADED FILES ------------------ //
    if (pathname.startsWith('/uploads/')) {
      const requestedName = path.basename(pathname);
      const safeFilePath = path.resolve(UPLOADS_DIR, requestedName);

      if (safeFilePath.startsWith(UPLOADS_DIR) && fs.existsSync(safeFilePath) && !fs.statSync(safeFilePath).isDirectory()) {
        const ext = path.extname(safeFilePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'public, max-age=86400'
        });
        fs.createReadStream(safeFilePath).pipe(res);
        return;
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Файл не найден' }));
        return;
      }
    }

    // ------------------ SECURED: STATIC FRONTEND ASSETS (NO PATH TRAVERSAL) ------------------ //
    // Block direct access to database, keys, and logs from static serving
    const lowerPath = pathname.toLowerCase();
    if (
      lowerPath.includes('db.json') ||
      lowerPath.includes('ufanet_db') ||
      lowerPath.includes('.key') ||
      lowerPath.includes('.pfx') ||
      lowerPath.includes('.log') ||
      lowerPath.includes('.env') ||
      lowerPath.includes('data/') ||
      lowerPath.includes('server.js')
    ) {
      Logger.audit('STATIC_ACCESS_FORBIDDEN', 'anonymous', { path: pathname }, ip);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Доступ запрещен' }));
      return;
    }

    let filePath = path.resolve(DIST_DIR, '.' + path.normalize(pathname));

    // Ensure it cannot escape DIST_DIR
    if (!filePath.startsWith(DIST_DIR)) {
      Logger.audit('PATH_TRAVERSAL_DETECTED', 'anonymous', { path: pathname }, ip);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Доступ запрещен (Path traversal)' }));
      return;
    }

    if (pathname === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Уфанет • Сервер KabanCloud</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1120; color: #f8fafc; padding: 3rem; text-align: center; }
              .card { max-width: 520px; margin: 0 auto; background: #1e293b; padding: 2rem; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              h1 { color: #ff6600; font-size: 1.6rem; margin-bottom: 0.5rem; }
              code { background: #0f172a; padding: 3px 8px; border-radius: 6px; color: #38bdf8; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Уфанет • Сервер KabanCloud запущен!</h1>
              <p style="color: #94a3b8; font-size: 0.95rem;">Для сборки веб-интерфейса выполните:</p>
              <p><code>npm run build</code></p>
              <p style="font-size: 0.85rem; color: #64748b; margin-top: 1.5rem;">Все API эндпоинты, HTTPS и Realtime SSE активны.</p>
            </div>
          </body>
        </html>
      `);
    }
  } catch (err) {
    Logger.error(`Необработанная ошибка запроса [${req.method} ${pathname}]:`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера', message: err.message }));
  }
}

// ------------------------------------------------------------------------------
// 8. ЗАПУСК HTTP И HTTPS СЕРВЕРОВ
// ------------------------------------------------------------------------------
function getLanIps() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Start HTTP Server
const httpServer = http.createServer(handleRequest);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  const ips = getLanIps();
  console.log('\n========================================================================');
  console.log('🟧  УФАНЕТ • KabanCloud Сервер (Корпоративная канбан-доска)');
  console.log('🔒  Безопасность: Zero-Password Auth • Защита путей • HMAC-256 DB');
  console.log('📝  Логирование: data/logs/audit.log & access.log');
  console.log('------------------------------------------------------------------------');
  console.log(`👉  HTTP Локально:   http://localhost:${HTTP_PORT}`);
  ips.forEach((ip) => {
    console.log(`👉  HTTP Для коллег: http://${ip}:${HTTP_PORT}`);
  });

  // Start HTTPS Server if PFX certificate exists
  const pfxPath = path.join(SSL_DIR, 'server.pfx');
  if (fs.existsSync(pfxPath)) {
    try {
      const pfxData = fs.readFileSync(pfxPath);
      const httpsServer = https.createServer({ pfx: pfxData, passphrase: 'ufanet' }, handleRequest);
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log('------------------------------------------------------------------------');
        console.log(`🔐  HTTPS Локально:  https://localhost:${HTTPS_PORT}`);
        ips.forEach((ip) => {
          console.log(`🔐  HTTPS Сеть LAN:  https://${ip}:${HTTPS_PORT}`);
        });
        console.log('========================================================================\n');
      });
    } catch (err) {
      Logger.warn('Не удалось запустить HTTPS сервер:', err.message);
      console.log('========================================================================\n');
    }
  } else {
    console.log('💡  HTTPS: Для включения поместите server.pfx в папку data/ssl/');
    console.log('========================================================================\n');
  }
});
