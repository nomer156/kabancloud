// ==============================================================================
// УФАНЕТ • Автономный сервер доски проектировщиков (Zero Dependencies)
// Работает в локальной сети на любом ПК (Windows/Linux/Docker)
// ==============================================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exec, spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'ufanet_db.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback_and_ideas.json');
const DIST_DIR = path.join(__dirname, 'dist');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DEFAULT_DEPARTMENTS = [
  { id: 'dept-design', name: 'Отдел проектирования', desc: 'Разработка проектной и рабочей документации (ВОЛС, СВН, СКС, СКУД)', color: '#ff6600', isDefault: true },
  { id: 'dept-maintenance', name: 'Служба эксплуатации', desc: 'Обслуживание и устранение аварий телекоммуникационных сетей', color: '#0284c7' },
  { id: 'dept-install', name: 'Монтажный отдел', desc: 'Строительно-монтажные и пусконаладочные работы на объектах', color: '#10b981' }
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

// Initial seed data if file doesn't exist
const DEFAULT_SEED = {
  departments: DEFAULT_DEPARTMENTS,
  projects: [
    'ВОЛС: Модернизация Юг',
    'СКС и Wi-Fi: Технопарк',
    'Видеонаблюдение: ЖК «Северный»',
    'Умный дом: Квартал 4',
    'Дата-центр: Стойка 12'
  ],
  members: [
    {
      id: 'uf-11111111-1111-1111-1111-111111111111',
      full_name: 'Алексей Смирнов',
      role: 'Руководитель группы / ГИП',
      initials: 'АС',
      avatar_color: '#ff6600',
      specialty: 'ГИП'
    },
    {
      id: 'uf-22222222-2222-2222-2222-222222222222',
      full_name: 'Мария Воронова',
      role: 'Ведущий инженер ВОЛС',
      initials: 'МВ',
      avatar_color: '#ff8800',
      specialty: 'ВОЛС'
    },
    {
      id: 'uf-33333333-3333-3333-3333-333333333333',
      full_name: 'Дмитрий Ковалёв',
      role: 'Инженер СКС и передачи данных',
      initials: 'ДК',
      avatar_color: '#0284c7',
      specialty: 'СКС'
    },
    {
      id: 'uf-44444444-4444-4444-4444-444444444444',
      full_name: 'Елена Васильева',
      role: 'Инженер видеонаблюдения и СКУД',
      initials: 'ЕВ',
      avatar_color: '#10b981',
      specialty: 'ВН'
    },
    {
      id: 'uf-55555555-5555-5555-5555-555555555555',
      full_name: 'Сергей Морозов',
      role: 'Инженер Умный дом / IoT',
      initials: 'СМ',
      avatar_color: '#f59e0b',
      specialty: 'IoT'
    },
    {
      id: 'uf-66666666-6666-6666-6666-666666666666',
      full_name: 'Антон Кузнецов',
      role: 'Системный архитектор / IT-инфраструктура',
      initials: 'АК',
      avatar_color: '#8b5cf6',
      specialty: 'IT'
    }
  ],
  tasks: [
    {
      id: 'task-uf-1',
      title: 'Трассировка магистрального оптического кабеля (96 ОВ)',
      project_code: 'ВОЛС: Модернизация Юг',
      section: 'ВОЛС',
      status: 'in_progress',
      priority: 'urgent',
      assignee_id: 'uf-22222222-2222-2222-2222-222222222222',
      due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      network_link: '\\\\ufanet-server\\projects\\ВОЛС_Юг\\Трасса_96ОВ.dwg',
      description: 'Согласовать проход кабеля через кабельную канализацию и опоры освещения. Подготовить схему разварки муфт МТОК.',
      checklist: [
        { id: 'c1', text: 'Запросить ТУ на прокладку по опорам', done: true },
        { id: 'c2', text: 'Разработать план кроссовой коммутации ODF', done: true },
        { id: 'c3', text: 'Согласовать спецификацию оптических муфт', done: false }
      ],
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'task-uf-2',
      title: 'Проект СКС и схемы коммутационных шкафов 42U',
      project_code: 'СКС и Wi-Fi: Технопарк',
      section: 'СКС',
      status: 'in_progress',
      priority: 'urgent',
      assignee_id: 'uf-33333333-3333-3333-3333-333333333333',
      due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      network_link: '\\\\ufanet-server\\projects\\Технопарк\\СКС_Шкафы.vsd',
      description: 'Категория 6A (10G). Расчет тепловыделения активного оборудования, ИБП 6кВА и системы охлаждения серверной.',
      checklist: [
        { id: 'c1', text: 'План размещения рабочих мест (320 портов RJ45)', done: true },
        { id: 'c2', text: 'Спецификация патч-панелей и органайзеров', done: true },
        { id: 'c3', text: 'Схема заземления телекоммуникационных стоек', done: false }
      ],
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'task-uf-3',
      title: 'Расстановка IP-камер 4К и домофонных панелей СКУД',
      project_code: 'Видеонаблюдение: ЖК «Северный»',
      section: 'ВН',
      status: 'backlog',
      priority: 'medium',
      assignee_id: 'uf-44444444-4444-4444-4444-444444444444',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      network_link: '\\\\ufanet-server\\projects\\Северный\\План_Камер.dwg',
      description: 'Охват входных групп, лифтовых холлов, въездных шлагбаумов и подземного паркинга. Расчет архива 30 дней.',
      checklist: [
        { id: 'c1', text: 'Определить углы обзора и мертвые зоны', done: false },
        { id: 'c2', text: 'Подбор PoE-коммутаторов с запасом мощности', done: false }
      ],
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'task-uf-4',
      title: 'Финальная проверка комплекта РД перед выдачей в монтаж',
      project_code: 'Умный дом: Квартал 4',
      section: 'СКУД',
      status: 'review',
      priority: 'urgent',
      assignee_id: 'uf-11111111-1111-1111-1111-111111111111',
      due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
      network_link: '\\\\ufanet-server\\projects\\Квартал4\\РД_Выпуск_Уфанет.pdf',
      description: 'Нормоконтроль спецификаций контроллеров Умного дома, электрозамков, считывателей BLE и датчиков протечки.',
      checklist: [
        { id: 'c1', text: 'Проверить кабельный журнал', done: true },
        { id: 'c2', text: 'Сверить ТУ с городскими сетями', done: true },
        { id: 'c3', text: 'Подписать титульные листы ГИПа', done: false }
      ],
      created_at: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    {
      id: 'task-uf-5',
      title: 'Выпуск рабочей документации ЭОМ узла связи',
      project_code: 'Дата-центр: Стойка 12',
      section: 'ЭОМ',
      status: 'done',
      priority: 'low',
      assignee_id: 'uf-55555555-5555-5555-5555-555555555555',
      due_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      network_link: '\\\\ufanet-server\\projects\\Датацентр\\ЭОМ_Стойка12_final.pdf',
      description: 'Узел принят службой эксплуатации Уфанет, кабельные трассы и щиты АВР согласованы.',
      checklist: [
        { id: 'c1', text: 'Однолинейная расчетная схема', done: true },
        { id: 'c2', text: 'Согласование службы эксплуатации', done: true }
      ],
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    }
  ]
};

// Database read/write helpers
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_SEED, null, 2), 'utf8');
      return DEFAULT_SEED;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Ошибка чтения базы данных:', err);
    return DEFAULT_SEED;
  }
}

let lastBackupTime = 0;
function writeDb(data) {
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, json, 'utf8');

    // Create periodic backup (every 1 hour or upon large change)
    const now = Date.now();
    if (now - lastBackupTime > 3600000) {
      const backupPath = path.join(BACKUPS_DIR, `ufanet_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(backupPath, json, 'utf8');
      lastBackupTime = now;
    }
  } catch (err) {
    console.error('Ошибка сохранения базы данных:', err);
  }
}

// Ensure initial database exists
readDb();

// Server-Sent Events (SSE) subscribers
const sseClients = new Set();

function broadcastEvent(type, payload) {
  const data = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const res of sseClients) {
    try {
      res.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

// Get Local Network IP addresses
function getLocalIps() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

// MIME types for static assets
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
  '.dxf': 'application/dxf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed'
};

// Request Parser Helper
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // ------------------ API ROUTES ------------------ //

  // 1. Server-Sent Events (Realtime)
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 2. Server Info
  if (pathname === '/api/server-info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      hostname: os.hostname(),
      ips: getLocalIps(),
      port: PORT,
      uptime: Math.round(process.uptime()),
      status: 'online'
    }));
    return;
  }

  // 3. GET /api/tasks
  if (pathname === '/api/tasks' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.tasks || []));
    return;
  }

  // 4. POST /api/tasks (Create or Update)
  if (pathname === '/api/tasks' && req.method === 'POST') {
    const task = await parseBody(req);
    const db = readDb();
    const id = task.id || `task-uf-${Date.now()}`;
    const prepared = {
      ...task,
      id,
      updated_at: new Date().toISOString(),
      created_at: task.created_at || new Date().toISOString()
    };

    const index = db.tasks.findIndex((t) => t.id === id);
    if (index >= 0) {
      db.tasks[index] = prepared;
    } else {
      db.tasks.unshift(prepared);
    }

    writeDb(db);
    broadcastEvent('TASK_UPDATED', prepared);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(prepared));
    return;
  }

  // 4b. POST /api/tasks/bulk (Atomic bulk import from ERP)
  if (pathname === '/api/tasks/bulk' && req.method === 'POST') {
    const { tasks: incomingList } = await parseBody(req);
    const db = readDb();
    const createdList = [];

    if (Array.isArray(incomingList) && incomingList.length > 0) {
      for (const t of incomingList) {
        const id = t.id || `task-erp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const prepared = {
          ...t,
          id,
          updated_at: new Date().toISOString(),
          created_at: t.created_at || new Date().toISOString()
        };
        const index = db.tasks.findIndex((existing) => existing.id === id);
        if (index >= 0) {
          db.tasks[index] = prepared;
        } else {
          db.tasks.unshift(prepared);
        }
        createdList.push(prepared);
      }
      writeDb(db);
      broadcastEvent('TASKS_BULK_CREATED', createdList);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(createdList));
    return;
  }

  // 5. PATCH /api/tasks/:id/status
  if (pathname.startsWith('/api/tasks/') && pathname.endsWith('/status') && req.method === 'PATCH') {
    const parts = pathname.split('/');
    const taskId = parts[3];
    const { status } = await parseBody(req);

    const db = readDb();
    const task = db.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      task.updated_at = new Date().toISOString();
      writeDb(db);
      broadcastEvent('TASK_UPDATED', task);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Задача не найдена' }));
    }
    return;
  }

  // 6. DELETE /api/tasks/:id
  if (pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
    const taskId = pathname.split('/')[3];
    const db = readDb();
    const initialLen = db.tasks.length;
    db.tasks = db.tasks.filter((t) => t.id !== taskId);

    if (db.tasks.length !== initialLen) {
      writeDb(db);
      broadcastEvent('TASK_DELETED', { id: taskId });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 7. GET /api/members
  if (pathname === '/api/members' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.members || []));
    return;
  }

  // 8. POST /api/members
  if (pathname === '/api/members' && req.method === 'POST') {
    const member = await parseBody(req);
    const db = readDb();
    const index = db.members.findIndex((m) => m.id === member.id);
    if (index >= 0) {
      db.members[index] = member;
    } else {
      db.members.push(member);
    }
    writeDb(db);
    broadcastEvent('MEMBERS_UPDATED', db.members);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.members));
    return;
  }

  // 8b. DELETE /api/members/:id
  if (pathname.startsWith('/api/members/') && req.method === 'DELETE') {
    const memberId = pathname.split('/')[3];
    const db = readDb();
    db.members = (db.members || []).filter((m) => m.id !== memberId);
    writeDb(db);
    broadcastEvent('MEMBERS_UPDATED', db.members);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.members));
    return;
  }

  // 9. GET /api/projects
  if (pathname === '/api/projects' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.projects || []));
    return;
  }

  // 10. POST /api/projects
  if (pathname === '/api/projects' && req.method === 'POST') {
    const { name } = await parseBody(req);
    const db = readDb();
    if (name && !db.projects.includes(name.trim())) {
      db.projects.unshift(name.trim());
      writeDb(db);
      broadcastEvent('PROJECTS_UPDATED', db.projects);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.projects));
    return;
  }

  // 10b. POST /api/projects/delete
  if (pathname === '/api/projects/delete' && req.method === 'POST') {
    const { name } = await parseBody(req);
    const db = readDb();
    if (name) {
      db.projects = (db.projects || []).filter((p) => p !== name.trim());
      writeDb(db);
      broadcastEvent('PROJECTS_UPDATED', db.projects);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.projects));
    return;
  }

  // 11. GET /api/sections
  if (pathname === '/api/sections' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.sections || DEFAULT_SECTIONS));
    return;
  }

  // 12. POST /api/sections (Full array save)
  if (pathname === '/api/sections' && req.method === 'POST') {
    const sections = await parseBody(req);
    const db = readDb();
    db.sections = Array.isArray(sections) ? sections : DEFAULT_SECTIONS;
    writeDb(db);
    broadcastEvent('SECTIONS_UPDATED', db.sections);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.sections));
    return;
  }

  // 13. GET /api/columns
  if (pathname === '/api/columns' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.columns || DEFAULT_COLUMNS));
    return;
  }

  // 14. POST /api/columns (Full array save)
  if (pathname === '/api/columns' && req.method === 'POST') {
    const cols = await parseBody(req);
    const db = readDb();
    db.columns = Array.isArray(cols) ? cols : DEFAULT_COLUMNS;
    writeDb(db);
    broadcastEvent('COLUMNS_UPDATED', db.columns);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.columns));
    return;
  }

  // 15. GET /api/notifications
  if (pathname === '/api/notifications' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.notifications || []));
    return;
  }

  // 16. POST /api/notifications (Create notification or mark all read)
  if (pathname === '/api/notifications' && req.method === 'POST') {
    const payload = await parseBody(req);
    const db = readDb();
    if (!Array.isArray(db.notifications)) db.notifications = [];

    if (payload.action === 'read_all') {
      db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
      writeDb(db);
      broadcastEvent('NOTIFICATIONS_UPDATED', db.notifications);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.notifications));
      return;
    }

    const targetUserIds = Array.isArray(payload.targetUserIds) 
      ? payload.targetUserIds 
      : (payload.targetUserId ? [payload.targetUserId] : []);

    // Deduplication check: ignore identical mention within 10 seconds
    const isDuplicate = db.notifications.some(n => 
      n.taskId === payload.taskId && 
      n.text === payload.text && 
      (n.fromUserId === payload.fromUserId || n.fromUserName === payload.fromUserName) &&
      (Date.now() - new Date(n.createdAt).getTime()) < 10000
    );

    if (isDuplicate) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db.notifications[0] || {}));
      return;
    }

    const newNotif = {
      id: payload.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      taskId: payload.taskId,
      taskTitle: payload.taskTitle || 'Задача',
      fromUserId: payload.fromUserId || null,
      fromUserName: payload.fromUserName || 'Коллега',
      fromUserAvatar: payload.fromUserAvatar || '#ff6600',
      text: payload.text || '',
      createdAt: payload.createdAt || new Date().toISOString(),
      read: false,
      targetUserIds: targetUserIds,
      targetUserId: targetUserIds[0] || null
    };

    db.notifications.unshift(newNotif);
    // Keep max 100 recent notifications
    if (db.notifications.length > 100) {
      db.notifications = db.notifications.slice(0, 100);
    }

    writeDb(db);
    broadcastEvent('NOTIFICATIONS_UPDATED', db.notifications);
    broadcastEvent('NEW_MENTION', newNotif);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newNotif));
    return;
  }

  // 17. PATCH /api/notifications/:id/read
  if (pathname.startsWith('/api/notifications/') && pathname.endsWith('/read') && req.method === 'PATCH') {
    const parts = pathname.split('/');
    const notifId = parts[3];
    const db = readDb();
    if (Array.isArray(db.notifications)) {
      const item = db.notifications.find((n) => n.id === notifId);
      if (item) {
        item.read = true;
        writeDb(db);
        broadcastEvent('NOTIFICATIONS_UPDATED', db.notifications);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 18. DELETE /api/notifications/:id
  if (pathname.startsWith('/api/notifications/') && req.method === 'DELETE') {
    const parts = pathname.split('/');
    const notifId = parts[3];
    const db = readDb();
    if (Array.isArray(db.notifications)) {
      db.notifications = db.notifications.filter((n) => n.id !== notifId);
      writeDb(db);
      broadcastEvent('NOTIFICATIONS_UPDATED', db.notifications);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 18b. GET /api/departments
  if (pathname === '/api/departments' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.departments || DEFAULT_DEPARTMENTS));
    return;
  }

  // 18c. POST /api/departments
  if (pathname === '/api/departments' && req.method === 'POST') {
    const dept = await parseBody(req);
    const db = readDb();
    if (!Array.isArray(db.departments)) db.departments = [...DEFAULT_DEPARTMENTS];
    const id = dept.id || `dept-${Date.now()}`;
    const prepared = { ...dept, id };
    const idx = db.departments.findIndex((d) => d.id === id);
    if (idx >= 0) db.departments[idx] = prepared;
    else db.departments.push(prepared);
    writeDb(db);
    broadcastEvent('DEPARTMENTS_UPDATED', db.departments);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.departments));
    return;
  }

  // 18d. DELETE /api/departments/:id
  if (pathname.startsWith('/api/departments/') && req.method === 'DELETE') {
    const deptId = pathname.split('/')[3];
    const db = readDb();
    if (!Array.isArray(db.departments)) db.departments = [...DEFAULT_DEPARTMENTS];
    db.departments = db.departments.filter((d) => d.id !== deptId);
    writeDb(db);
    broadcastEvent('DEPARTMENTS_UPDATED', db.departments);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.departments));
    return;
  }

  // 18e. GET /api/feedback
  if (pathname === '/api/feedback' && req.method === 'GET') {
    let items = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
      try { items = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8')); } catch {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(items));
    return;
  }

  // 18f. POST /api/feedback
  if (pathname === '/api/feedback' && req.method === 'POST') {
    const payload = await parseBody(req);
    let items = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
      try { items = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8')); } catch {}
    }
    const newFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      authorName: payload.authorName || 'Сотрудник',
      authorId: payload.authorId || null,
      type: payload.type || 'пожелание',
      subject: payload.subject || 'Без темы',
      message: payload.message || '',
      created_at: new Date().toISOString()
    };
    items.unshift(newFeedback);
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(items, null, 2), 'utf8');

    // Also write to human-friendly text file
    try {
      const txtPath = path.join(DATA_DIR, 'feedback_and_ideas.txt');
      const txtContent = items.map(f => `[${f.created_at}] [${(f.type || '').toUpperCase()}] ${f.authorName}\nТема: ${f.subject}\nСообщение:\n${f.message}\n${'='.repeat(48)}`).join('\n\n');
      fs.writeFileSync(txtPath, txtContent, 'utf8');
    } catch {}

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newFeedback));
    return;
  }

  // 18g. GET /api/feedback/export
  if (pathname === '/api/feedback/export' && req.method === 'GET') {
    let content = '[]';
    if (fs.existsSync(FEEDBACK_FILE)) {
      content = fs.readFileSync(FEEDBACK_FILE, 'utf8');
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ufanet_feedback_and_ideas.json"'
    });
    res.end(content);
    return;
  }

  // 19. POST /api/open-folder (Open network / local path in Windows Explorer)
  if (pathname === '/api/open-folder' && req.method === 'POST') {
    const body = await parseBody(req);
    const rawPath = body.folderPath || body.path || body.folder;
    if (!rawPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Путь к папке не указан' }));
      return;
    }
    const cleanPath = path.normalize(String(rawPath).trim().replace(/^file:\/\/\/?/i, ''));
    if (process.platform === 'win32') {
      try {
        let isFile = false;
        try {
          if (fs.existsSync(cleanPath) && fs.statSync(cleanPath).isFile()) {
            isFile = true;
          }
        } catch {}

        const args = isFile ? [`/select,${cleanPath}`] : [cleanPath];
        const child = spawn('explorer.exe', args, { detached: true, stdio: 'ignore' });
        child.unref();
      } catch (err) {
        exec(`start "" "${cleanPath}"`, () => {});
      }
    } else {
      const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${cmd} "${cleanPath}"`, () => {});
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, path: cleanPath }));
    return;
  }

  // 20. POST /api/upload-file (Upload field photos, PDF, Visio, DWG)
  if (pathname === '/api/upload-file' && req.method === 'POST') {
    const { name, type, size, dataBase64, uploadedBy } = await parseBody(req);
    if (!dataBase64 || !name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Данные файла не переданы' }));
      return;
    }

    const safeName = path.basename(name).replace(/[^a-zA-Z0-9._\-а-яА-ЯёЁ]/g, '_');
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const diskFileName = `${fileId}_${safeName}`;
    const targetFilePath = path.join(UPLOADS_DIR, diskFileName);

    const base64Data = dataBase64.replace(/^data:([A-Za-z-+/0-9]+);base64,/, '');
    fs.writeFileSync(targetFilePath, Buffer.from(base64Data, 'base64'));

    const fileMeta = {
      id: fileId,
      name: safeName,
      size: size || fs.statSync(targetFilePath).size,
      type: type || 'application/octet-stream',
      url: `/uploads/${diskFileName}`,
      uploaded_at: new Date().toISOString(),
      uploaded_by: uploadedBy || 'Инженер'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fileMeta));
    return;
  }

  // ------------------ STATIC FRONTEND ASSETS & UPLOADS ------------------ //

  // Serve uploaded files
  if (pathname.startsWith('/uploads/')) {
    const uploadFile = path.join(UPLOADS_DIR, path.basename(pathname));
    if (fs.existsSync(uploadFile) && !fs.statSync(uploadFile).isDirectory()) {
      const ext = path.extname(uploadFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(uploadFile).pipe(res);
      return;
    }
  }

  let filePath = path.join(DIST_DIR, pathname);

  // If path is root or directory, serve index.html
  if (pathname === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <head><title>Уфанет • Сервер проектирования</title></head>
        <body style="font-family: sans-serif; background: #0f121b; color: white; padding: 2rem; text-align: center;">
          <h1 style="color: #ff6600;">Уфанет • Локальный сервер запущен!</h1>
          <p>Соберите фронтенд командой: <code>npm run build</code></p>
        </body>
      </html>
    `);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIps();
  console.log('\n' + '═'.repeat(62));
  console.log('   🟧  УФАНЕТ • ДОСКА ПРОЕКТИРОВЩИКОВ (ЛОКАЛЬНЫЙ СЕРВЕР)');
  console.log('═'.repeat(62));
  console.log(`  🚀 На этом ПК:           http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach((ip) => {
      console.log(`  👥 Для коллег в сети:    http://${ip}:${PORT}`);
    });
  } else {
    console.log(`  👥 Для коллег в сети:    http://[IP-компьютера]:${PORT}`);
  }
  console.log(`  💾 База данных:          ${DB_FILE}`);
  console.log('═'.repeat(62) + '\n');
});
