// ==============================================================================
// УФАНЕТ • API Клиент корпоративной канбан-доски
// Поддержка LAN-сервера + оффлайн-фолбэка для Vercel / мобильных устройств
// ==============================================================================

const API_BASE = window.location.port === '5173' ? 'http://localhost:3000' : '';

const STORAGE_KEY_TASKS = 'ufanet_local_tasks_v3';
const STORAGE_KEY_MEMBERS = 'ufanet_local_members_v3';
const STORAGE_KEY_PROJECTS = 'ufanet_local_projects_v3';
const STORAGE_KEY_SECTIONS = 'ufanet_local_sections_v3';
const STORAGE_KEY_COLUMNS = 'ufanet_local_columns_v3';
const STORAGE_KEY_DEPTS = 'ufanet_local_departments_v1';
const STORAGE_KEY_NOTIFS = 'ufanet_local_notifications_v1';
const STORAGE_KEY_CHATS = 'ufanet_local_chats_v1';
const STORAGE_KEY_CUSTOM_IP = 'ufanet_custom_lan_ip';
const STORAGE_KEY_AUTH_USER_ID = 'kaban_current_user_id';

import { 
  INITIAL_MEMBERS, 
  INITIAL_PROJECTS, 
  INITIAL_TASKS, 
  DEFAULT_SECTIONS, 
  DEFAULT_COLUMNS, 
  DEPARTMENTS 
} from './constants';

export const INITIAL_DEPARTMENTS = DEPARTMENTS;

// ------------------------------------------------------------------------------
// LOCAL STORAGE HELPERS
// ------------------------------------------------------------------------------
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

export function getCurrentUserId() {
  return localStorage.getItem(STORAGE_KEY_AUTH_USER_ID) || '';
}

export function setCurrentUserId(userId) {
  if (userId) localStorage.setItem(STORAGE_KEY_AUTH_USER_ID, userId);
  else localStorage.removeItem(STORAGE_KEY_AUTH_USER_ID);
}

export function getAuthHeaders(extra = {}) {
  const userId = getCurrentUserId();
  const headers = { ...extra };
  if (userId) {
    headers['x-user-id'] = userId;
    headers['authorization'] = `Bearer ${userId}`;
  }
  return headers;
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

// ------------------------------------------------------------------------------
// AUTHENTICATION API (ZERO-PASSWORD)
// ------------------------------------------------------------------------------
export async function fetchAuthMembers() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/members`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_MEMBERS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
}

export async function loginUser(memberId) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user?.id) {
        setCurrentUserId(data.user.id);
      }
      return data.user;
    }
  } catch {}

  // Local fallback
  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const found = members.find((m) => m.id === memberId);
  if (found) {
    setCurrentUserId(found.id);
  }
  return found || null;
}

export async function registerUser({ full_name, department_id, role, avatar_color, initials, specialty }) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, department_id, role, avatar_color, initials, specialty })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user?.id) {
        setCurrentUserId(data.user.id);
      }
      return data.user;
    }
  } catch {}

  // Local fallback
  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  let computedInitials = initials?.trim();
  if (!computedInitials) {
    const parts = full_name.trim().split(/\s+/);
    computedInitials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : full_name.slice(0, 2).toUpperCase();
  }

  const id = `uf-${Date.now()}`;
  const newUser = {
    id,
    full_name: full_name.trim(),
    department_id: department_id || 'dept-design',
    role: role?.trim() || 'Инженер',
    initials: computedInitials,
    avatar_color: avatar_color || '#ff6600',
    specialty: specialty?.trim() || ''
  };

  const updated = [...members, newUser];
  setLocalData(STORAGE_KEY_MEMBERS, updated);
  setCurrentUserId(id);
  return newUser;
}

export async function checkAuthSession() {
  const userId = getCurrentUserId();
  if (!userId) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return data.user || null;
    }
  } catch {}

  // Local fallback
  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  return members.find((m) => m.id === userId) || null;
}

export function logoutUser() {
  setCurrentUserId(null);
}

// ------------------------------------------------------------------------------
// SERVER INFO API
// ------------------------------------------------------------------------------
export async function fetchServerInfo() {
  try {
    const res = await fetch(`${API_BASE}/api/server-info`);
    if (res.ok) return await res.json();
  } catch {}
  return { status: 'offline', ips: [], httpPort: 3000, httpsPort: 3443, httpsEnabled: false };
}

// ------------------------------------------------------------------------------
// TASKS API
// ------------------------------------------------------------------------------
export async function fetchAllTasks() {
  try {
    const res = await fetch(`${API_BASE}/api/tasks`);
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_TASKS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
}

export async function saveTask(task) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(task)
    });
    if (res.ok) return await res.json();
  } catch {}

  // Local fallback
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tasks: tasksList })
    });
    if (res.ok) {
      const data = await res.json();
      return data.tasks || [];
    }
  } catch {}

  // Local fallback
  const tasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const created = tasksList.map((t, i) => ({
    ...t,
    id: t.id || `task-uf-${Date.now()}-${i}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  setLocalData(STORAGE_KEY_TASKS, [...created, ...tasks]);
  return created;
}

export async function updateTaskStatus(taskId, status) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status })
    });
    if (res.ok) return await res.json();
  } catch {}

  // Local fallback
  const tasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const updated = tasks.map((t) => {
    if (t.id === taskId) {
      const completed_at = status === 'done' ? (t.completed_at || new Date().toISOString()) : t.completed_at;
      return { ...t, status, completed_at, updated_at: new Date().toISOString() };
    }
    return t;
  });
  setLocalData(STORAGE_KEY_TASKS, updated);
  return updated.find((t) => t.id === taskId);
}

export async function deleteTask(taskId) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) return true;
  } catch {}

  // Local fallback
  const tasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const updated = tasks.filter((t) => t.id !== taskId);
  setLocalData(STORAGE_KEY_TASKS, updated);
  return true;
}

// ------------------------------------------------------------------------------
// TEAM MEMBERS API
// ------------------------------------------------------------------------------
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(member)
    });
    if (res.ok) return await res.json();
  } catch {}

  // Local fallback
  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const id = member.id || `uf-${Date.now()}`;
  const prepared = { ...member, id };
  const idx = members.findIndex((m) => m.id === id);
  let updated;
  if (idx >= 0) {
    updated = [...members];
    updated[idx] = prepared;
  } else {
    updated = [...members, prepared];
  }
  setLocalData(STORAGE_KEY_MEMBERS, updated);
  return prepared;
}

export async function deleteTeamMember(memberId) {
  try {
    const res = await fetch(`${API_BASE}/api/members/${memberId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) return true;
  } catch {}

  // Local fallback
  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const updated = members.filter((m) => m.id !== memberId);
  setLocalData(STORAGE_KEY_MEMBERS, updated);
  return true;
}

// ------------------------------------------------------------------------------
// PROJECTS, SECTIONS, COLUMNS
// ------------------------------------------------------------------------------
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

export async function addProjectItem(name) {
  try {
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name })
    });
    if (res.ok) return await res.json();
  } catch {}

  // Local fallback
  const projects = getLocalData(STORAGE_KEY_PROJECTS, INITIAL_PROJECTS);
  if (!projects.includes(name)) {
    const updated = [...projects, name];
    setLocalData(STORAGE_KEY_PROJECTS, updated);
    return updated;
  }
  return projects;
}

export async function deleteProjectItem(name) {
  const projects = getLocalData(STORAGE_KEY_PROJECTS, INITIAL_PROJECTS);
  const updated = projects.filter((p) => p !== name);
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(columns)
    });
    if (res.ok) return await res.json();
  } catch {}
  setLocalData(STORAGE_KEY_COLUMNS, columns);
  return columns;
}

// ------------------------------------------------------------------------------
// DEPARTMENTS API
// ------------------------------------------------------------------------------
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(dept)
    });
    if (res.ok) return await res.json();
  } catch {}

  const current = getLocalData(STORAGE_KEY_DEPTS, INITIAL_DEPARTMENTS);
  const idx = current.findIndex((d) => d.id === dept.id);
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
    const res = await fetch(`${API_BASE}/api/departments/${encodeURIComponent(deptId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) return await res.json();
  } catch {}

  const current = getLocalData(STORAGE_KEY_DEPTS, INITIAL_DEPARTMENTS);
  const updated = current.filter((d) => d.id !== deptId);
  setLocalData(STORAGE_KEY_DEPTS, updated);
  return updated;
}

// ------------------------------------------------------------------------------
// DEPARTMENT CHATS (YOUGILE CHAT FEATURE)
// ------------------------------------------------------------------------------
export async function fetchChatMessages(departmentId = 'dept-all') {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(departmentId)}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) return await res.json();
  } catch {}

  const chats = getLocalData(STORAGE_KEY_CHATS, {});
  return chats[departmentId] || [];
}

export async function sendChatMessage(departmentId = 'dept-all', { text, quoted_task }) {
  try {
    const res = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(departmentId)}`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text, quoted_task })
    });
    if (res.ok) return await res.json();
  } catch {}

  // Local fallback
  const chats = getLocalData(STORAGE_KEY_CHATS, {});
  if (!chats[departmentId]) chats[departmentId] = [];

  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const currentUserId = getCurrentUserId();
  const currentUser = members.find((m) => m.id === currentUserId) || members[0];

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    department_id: departmentId,
    user_id: currentUser?.id || 'anon',
    user_name: currentUser?.full_name || 'Сотрудник',
    user_initials: currentUser?.initials || 'СО',
    user_color: currentUser?.avatar_color || '#ff6600',
    user_role: currentUser?.role || 'Инженер',
    text: text.trim(),
    quoted_task: quoted_task || null,
    created_at: new Date().toISOString()
  };

  chats[departmentId].push(newMsg);
  setLocalData(STORAGE_KEY_CHATS, chats);
  return newMsg;
}

// ------------------------------------------------------------------------------
// NOTIFICATIONS API
// ------------------------------------------------------------------------------
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
    await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
    await fetch(`${API_BASE}/api/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch {}
  const current = getLocalData(STORAGE_KEY_NOTIFS, []);
  const updated = current.filter((n) => n.id !== id);
  setLocalData(STORAGE_KEY_NOTIFS, updated);
  return updated;
}

// ------------------------------------------------------------------------------
// REALTIME SSE SUBSCRIPTION (AUTH PROTECTED)
// ------------------------------------------------------------------------------
export function subscribeToRealtimeChanges(onRefresh, explicitUserId = null) {
  let eventSource = null;
  const userId = explicitUserId || getCurrentUserId();

  if (!userId) {
    return () => {};
  }

  try {
    eventSource = new EventSource(`${API_BASE}/api/events?userId=${encodeURIComponent(userId)}`);

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

// ------------------------------------------------------------------------------
// OPEN FOLDER & FILE UPLOAD API
// ------------------------------------------------------------------------------
export async function openFolderInExplorer(folderPath) {
  if (!folderPath) return false;
  try {
    const res = await fetch(`${API_BASE}/api/open-folder`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ folderPath })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Не удалось открыть папку через локальный сервер:', err);
  }
  return false;
}

export async function uploadTaskFile(file, uploadedBy = 'Инженер') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result;
        const res = await fetch(`${API_BASE}/api/upload-file`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            size: file.size,
            dataBase64: base64,
            uploadedBy
          })
        });

        if (res.ok) {
          const uploadedMeta = await res.json();
          resolve(uploadedMeta);
        } else {
          const errData = await res.json().catch(() => ({}));
          reject(new Error(errData.error || 'Ошибка загрузки файла на сервер'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ------------------------------------------------------------------------------
// FEEDBACK & AUDIT LOGS
// ------------------------------------------------------------------------------
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ authorName, authorId, type, subject, message })
    });
    if (res.ok) return await res.json();
  } catch {}
  return { id: `fb-${Date.now()}`, authorName, type, subject, message, created_at: new Date().toISOString() };
}

export async function fetchAuditLogs() {
  try {
    const res = await fetch(`${API_BASE}/api/logs/audit`, {
      headers: getAuthHeaders()
    });
    if (res.ok) return await res.json();
  } catch {}
  return [];
}
