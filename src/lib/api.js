// Клиент локального API для работы в корпоративной сети Уфанет

const API_BASE = window.location.port === '5173' ? 'http://localhost:3000' : '';

const STORAGE_KEY_TASKS = 'ufanet_local_tasks_v3';
const STORAGE_KEY_MEMBERS = 'ufanet_local_members_v3';
const STORAGE_KEY_PROJECTS = 'ufanet_local_projects_v3';
const STORAGE_KEY_SECTIONS = 'ufanet_local_sections_v3';
const STORAGE_KEY_COLUMNS = 'ufanet_local_columns_v3';
const STORAGE_KEY_CUSTOM_IP = 'ufanet_custom_lan_ip';

import { INITIAL_MEMBERS, INITIAL_PROJECTS, INITIAL_TASKS, DEFAULT_SECTIONS, DEFAULT_COLUMNS } from './constants';

function getLocalData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

function setLocalData(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function getCustomLanIp() {
  return localStorage.getItem(STORAGE_KEY_CUSTOM_IP) || '';
}

export function setCustomLanIp(ip) {
  if (ip && ip.trim()) {
    localStorage.setItem(STORAGE_KEY_CUSTOM_IP, ip.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_IP);
  }
}

export async function fetchServerInfo() {
  try {
    const res = await fetch(`${API_BASE}/api/server-info`);
    if (res.ok) return await res.json();
  } catch (err) {
    return { status: 'offline', ips: [], port: 3000 };
  }
  return { status: 'offline', ips: [], port: 3000 };
}

export async function fetchAllTasks() {
  try {
    const res = await fetch(`${API_BASE}/api/tasks`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_TASKS, data);
      return data;
    }
  } catch (err) {
    console.warn('Сервер недоступен, загружаю локальный кеш:', err.message);
  }
  return getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
}

export async function saveTask(task) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Сервер недоступен, сохраняю в локальный кеш:', err.message);
  }

  const tasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const id = task.id || `task-uf-${Date.now()}`;
  const prepared = { ...task, id, updated_at: new Date().toISOString() };
  const idx = tasks.findIndex((t) => t.id === id);
  let updated;
  if (idx >= 0) {
    updated = [...tasks];
    updated[idx] = prepared;
  } else {
    updated = [prepared, ...tasks];
  }
  setLocalData(STORAGE_KEY_TASKS, updated);
  return prepared;
}

export async function bulkCreateTasks(tasksList) {
  if (!Array.isArray(tasksList) || tasksList.length === 0) return [];

  try {
    const res = await fetch(`${API_BASE}/api/tasks/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: tasksList })
    });
    if (res.ok) {
      const data = await res.json();
      const existing = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
      const combined = [...data, ...existing];
      setLocalData(STORAGE_KEY_TASKS, combined);
      return data;
    }
  } catch (err) {
    console.warn('Сервер недоступен, сохраняю задачи в локальный кеш:', err.message);
  }

  const existing = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const prepared = tasksList.map((t, idx) => ({
    ...t,
    id: t.id || `task-local-${Date.now()}-${idx}`,
    updated_at: new Date().toISOString(),
    created_at: t.created_at || new Date().toISOString()
  }));
  setLocalData(STORAGE_KEY_TASKS, [...prepared, ...existing]);
  return prepared;
}

export async function updateTaskStatus(taskId, status) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Сервер недоступен, обновляю статус локально:', err.message);
  }

  const tasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const updated = tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
  setLocalData(STORAGE_KEY_TASKS, updated);
  return updated.find((t) => t.id === taskId);
}

export async function deleteTask(taskId) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'DELETE'
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('Сервер недоступен, удаляю локально:', err.message);
  }

  const tasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const filtered = tasks.filter((t) => t.id !== taskId);
  setLocalData(STORAGE_KEY_TASKS, filtered);
  return true;
}

export async function fetchTeamMembers() {
  try {
    const res = await fetch(`${API_BASE}/api/members`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_MEMBERS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
}

export async function saveTeamMember(member) {
  try {
    const res = await fetch(`${API_BASE}/api/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member)
    });
    if (res.ok) return await res.json();
  } catch {}

  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const idx = members.findIndex((m) => m.id === member.id);
  let updated;
  if (idx >= 0) {
    updated = [...members];
    updated[idx] = member;
  } else {
    updated = [...members, member];
  }
  setLocalData(STORAGE_KEY_MEMBERS, updated);
  return updated;
}

export async function deleteTeamMember(memberId) {
  try {
    const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
      method: 'DELETE'
    });
    if (res.ok) return await res.json();
  } catch {}

  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const updated = members.filter((m) => m.id !== memberId);
  setLocalData(STORAGE_KEY_MEMBERS, updated);
  return updated;
}

export async function fetchProjectsList() {
  try {
    const res = await fetch(`${API_BASE}/api/projects`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_PROJECTS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_PROJECTS, INITIAL_PROJECTS);
}

export async function addProjectItem(projectName) {
  const trimmed = projectName.trim();
  if (!trimmed) return fetchProjectsList();

  try {
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed })
    });
    if (res.ok) return await res.json();
  } catch {}

  const projects = getLocalData(STORAGE_KEY_PROJECTS, INITIAL_PROJECTS);
  if (!projects.includes(trimmed)) {
    const updated = [trimmed, ...projects];
    setLocalData(STORAGE_KEY_PROJECTS, updated);
    return updated;
  }
  return projects;
}

export async function deleteProjectItem(projectName) {
  const trimmed = (projectName || '').trim();
  if (!trimmed) return fetchProjectsList();

  try {
    const res = await fetch(`${API_BASE}/api/projects/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed })
    });
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_PROJECTS, data);
      return data;
    }
  } catch {}

  const projects = getLocalData(STORAGE_KEY_PROJECTS, INITIAL_PROJECTS);
  const updated = projects.filter((p) => p !== trimmed);
  setLocalData(STORAGE_KEY_PROJECTS, updated);
  return updated;
}

export async function fetchSectionsList() {
  try {
    const res = await fetch(`${API_BASE}/api/sections`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_SECTIONS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_SECTIONS, DEFAULT_SECTIONS);
}

export async function saveSectionsList(sections) {
  try {
    const res = await fetch(`${API_BASE}/api/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sections)
    });
    if (res.ok) return await res.json();
  } catch {}

  setLocalData(STORAGE_KEY_SECTIONS, sections);
  return sections;
}

export async function fetchColumnsList() {
  try {
    const res = await fetch(`${API_BASE}/api/columns`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_COLUMNS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_COLUMNS, DEFAULT_COLUMNS);
}

export async function saveColumnsList(columns) {
  try {
    const res = await fetch(`${API_BASE}/api/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(columns)
    });
    if (res.ok) return await res.json();
  } catch {}

  setLocalData(STORAGE_KEY_COLUMNS, columns);
  return columns;
}

// Notifications API
const STORAGE_KEY_NOTIFS = 'ufanet_local_notifs_v3';

export async function fetchNotifications() {
  try {
    const res = await fetch(`${API_BASE}/api/notifications`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_NOTIFS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_NOTIFS, []);
}

export async function createNotification(notif) {
  try {
    const res = await fetch(`${API_BASE}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif)
    });
    if (res.ok) return await res.json();
  } catch {}

  const current = getLocalData(STORAGE_KEY_NOTIFS, []);
  const created = {
    ...notif,
    id: notif.id || `notif-${Date.now()}`,
    createdAt: notif.createdAt || new Date().toISOString(),
    read: false
  };
  setLocalData(STORAGE_KEY_NOTIFS, [created, ...current]);
  return created;
}

export async function markNotificationRead(id) {
  try {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PATCH' });
  } catch {}
  const current = getLocalData(STORAGE_KEY_NOTIFS, []);
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  setLocalData(STORAGE_KEY_NOTIFS, updated);
  return updated;
}

export async function markAllNotificationsRead() {
  try {
    const res = await fetch(`${API_BASE}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_all' })
    });
    if (res.ok) return await res.json();
  } catch {}
  const current = getLocalData(STORAGE_KEY_NOTIFS, []);
  const updated = current.map((n) => ({ ...n, read: true }));
  setLocalData(STORAGE_KEY_NOTIFS, updated);
  return updated;
}

export async function deleteNotification(id) {
  try {
    await fetch(`${API_BASE}/api/notifications/${id}`, { method: 'DELETE' });
  } catch {}
  const current = getLocalData(STORAGE_KEY_NOTIFS, []);
  const updated = current.filter((n) => n.id !== id);
  setLocalData(STORAGE_KEY_NOTIFS, updated);
  return updated;
}

// Server-Sent Events (SSE) Realtime subscription
export function subscribeToRealtimeChanges(onRefresh) {
  let eventSource = null;

  try {
    eventSource = new EventSource(`${API_BASE}/api/events`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onRefresh(payload);
      } catch {}
    };

    eventSource.onerror = () => {};
  } catch (err) {
    console.warn('SSE subscription failed:', err);
  }

  return () => {
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  };
}

// Open folder in Windows Explorer
export async function openFolderInExplorer(folderPath) {
  if (!folderPath) return false;
  try {
    const res = await fetch(`${API_BASE}/api/open-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath })
    });
    if (res.ok) return true;
  } catch {}
  return false;
}

// Upload file attachment (Photo, PDF, Visio, DWG)
export async function uploadTaskFile({ name, type, size, dataBase64, uploadedBy }) {
  try {
    const res = await fetch(`${API_BASE}/api/upload-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, size, dataBase64, uploadedBy })
    });
    if (res.ok) return await res.json();
  } catch {}

  // Fallback to offline / client-stored attachment
  return {
    id: `file-local-${Date.now()}`,
    name,
    size,
    type,
    url: dataBase64, // Keep base64 if server unavailable
    uploaded_at: new Date().toISOString(),
    uploaded_by: uploadedBy || 'Инженер'
  };
}

// -------------------------------------------------------------
// DEPARTMENTS API
// -------------------------------------------------------------
const STORAGE_KEY_DEPTS = 'ufanet_local_departments_v1';
export const INITIAL_DEPARTMENTS = [
  { id: 'dept-design', name: 'Отдел проектирования', desc: 'Разработка проектной и рабочей документации (ВОЛС, СВН, СКС, СКУД)', color: '#ff6600', isDefault: true },
  { id: 'dept-maintenance', name: 'Служба эксплуатации', desc: 'Обслуживание и устранение аварий телекоммуникационных сетей', color: '#0284c7' },
  { id: 'dept-install', name: 'Монтажный отдел', desc: 'Строительно-монтажные и пусконаладочные работы на объектах', color: '#10b981' }
];

export async function fetchDepartments() {
  try {
    const res = await fetch(`${API_BASE}/api/departments`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_DEPTS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_DEPTS, INITIAL_DEPARTMENTS);
}

export async function saveDepartment(dept) {
  try {
    const res = await fetch(`${API_BASE}/api/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dept)
    });
    if (res.ok) return await res.json();
  } catch {}

  const current = getLocalData(STORAGE_KEY_DEPTS, INITIAL_DEPARTMENTS);
  const idx = current.findIndex(d => d.id === dept.id);
  let updated;
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = dept;
  } else {
    updated = [...current, { ...dept, id: dept.id || `dept-${Date.now()}` }];
  }
  setLocalData(STORAGE_KEY_DEPTS, updated);
  return updated;
}

export async function deleteDepartment(deptId) {
  try {
    const res = await fetch(`${API_BASE}/api/departments/${deptId}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {}

  const current = getLocalData(STORAGE_KEY_DEPTS, INITIAL_DEPARTMENTS);
  const updated = current.filter(d => d.id !== deptId);
  setLocalData(STORAGE_KEY_DEPTS, updated);
  return updated;
}

// -------------------------------------------------------------
// FEEDBACK & IDEAS API
// -------------------------------------------------------------
export async function fetchFeedback() {
  try {
    const res = await fetch(`${API_BASE}/api/feedback`);
    if (res.ok) return await res.json();
  } catch {}
  return [];
}

export async function sendFeedback({ authorName, authorId, type, subject, message }) {
  try {
    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, authorId, type, subject, message })
    });
    if (res.ok) return await res.json();
  } catch {}
  return { id: `fb-${Date.now()}`, authorName, type, subject, message, created_at: new Date().toISOString() };
}


