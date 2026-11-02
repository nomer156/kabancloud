// ==============================================================================
// УФАНЕТ • API Клиент корпоративной канбан-доски KabanCloud
// Поддержка облачного сервера (Vercel / VPS) + надежного локального фолбэка
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
const STORAGE_KEY_AUTH_USER_ID = 'kaban_current_user_id';
const STORAGE_KEY_PERMISSIONS = 'kaban_role_permissions';

import { 
  INITIAL_MEMBERS, 
  INITIAL_PROJECTS, 
  INITIAL_TASKS, 
  DEFAULT_SECTIONS, 
  DEFAULT_COLUMNS, 
  DEPARTMENTS,
  generateTaskDisplayId
} from './constants';

export const INITIAL_DEPARTMENTS = DEPARTMENTS;

// Safe parser to distinguish real JSON API responses from Vercel SPA HTML rewrites
async function safeParseJson(res) {
  if (!res || !res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

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
  const workstation = typeof localStorage !== 'undefined' ? localStorage.getItem('kaban_workstation') : '';
  const headers = { ...extra };
  if (userId) {
    headers['x-user-id'] = userId;
    headers['authorization'] = `Bearer ${userId}`;
  }
  if (workstation) {
    headers['x-workstation'] = workstation;
  }
  return headers;
}

// ------------------------------------------------------------------------------
// AUTHENTICATION API (ZERO-PASSWORD + WORKSTATION PC + ADMIN)
// ------------------------------------------------------------------------------
export function getSavedCurrentUser() {
  try {
    const raw = localStorage.getItem('kaban_current_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveCurrentUserLocally(user) {
  if (!user) {
    localStorage.removeItem('kaban_current_user');
    localStorage.removeItem(STORAGE_KEY_AUTH_USER_ID);
    return;
  }
  try {
    localStorage.setItem('kaban_current_user', JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_AUTH_USER_ID, user.id);
    if (user.workstation_id) {
      localStorage.setItem('kaban_workstation', user.workstation_id);
    }
  } catch {}
}

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

export async function loginUser(param) {
  const payload = typeof param === 'string' ? { memberId: param } : (param || {});
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        saveCurrentUserLocally(data.user);
        const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
        const idx = members.findIndex((m) => m.id === data.user.id);
        if (idx >= 0) members[idx] = data.user;
        else members.unshift(data.user);
        setLocalData(STORAGE_KEY_MEMBERS, members);
      }
      return data.user;
    }
  } catch {}

  // Local fallback
  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  let found = null;
  if (payload.username === 'admin' || payload.memberId === 'admin' || payload.memberId === 'uf-admin-root') {
    found = members.find((m) => m.full_name?.toLowerCase() === 'admin' || m.id === 'uf-admin-root');
  } else if (payload.memberId) {
    found = members.find((m) => m.id === payload.memberId || m.full_name?.toLowerCase() === payload.memberId.toLowerCase());
  } else if (payload.workstation) {
    const norm = payload.workstation.trim().toLowerCase();
    found = members.find((m) => m.workstation_id?.toLowerCase() === norm);
  }

  if (found) {
    saveCurrentUserLocally(found);
  }
  return found || null;
}

export async function bindWorkstation(memberId, workstation) {
  const norm = workstation.trim().toLowerCase();
  try {
    const res = await fetch(`${API_BASE}/api/auth/bind-workstation`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ memberId, workstation: norm })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) saveCurrentUserLocally(data.user);
      return data.user;
    }
  } catch {}

  // Local fallback
  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const m = members.find((x) => x.id === memberId);
  if (m) {
    m.workstation_id = norm;
    setLocalData(STORAGE_KEY_MEMBERS, members);
    saveCurrentUserLocally(m);
    return m;
  }
  return null;
}

export async function registerUser({ full_name, department_id, role, role_level, avatar_color, initials, specialty, workstation_id }) {
  const payload = { 
    full_name, 
    department_id: department_id || 'dept-design', 
    role: role || 'Инженер', 
    role_level: role_level || 6,
    avatar_color: avatar_color || '#ff6600', 
    initials, 
    specialty,
    workstation_id: (workstation_id || '').trim().toLowerCase()
  };

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        saveCurrentUserLocally(data.user);
        const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
        setLocalData(STORAGE_KEY_MEMBERS, [data.user, ...members]);
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
    department_id: payload.department_id,
    role: payload.role,
    role_level: payload.role_level,
    initials: computedInitials,
    avatar_color: payload.avatar_color,
    specialty: payload.specialty || '',
    workstation_id: payload.workstation_id
  };

  const updated = [newUser, ...members];
  setLocalData(STORAGE_KEY_MEMBERS, updated);
  saveCurrentUserLocally(newUser);
  return newUser;
}

export async function checkAuthSession() {
  let workstationParam = null;
  if (typeof window !== 'undefined' && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const ssoId = params.get('sso_id') || params.get('user_id') || params.get('sso_token') || params.get('uid');
    const pcParam = params.get('pc') || params.get('workstation') || params.get('device');
    if (ssoId) {
      setCurrentUserId(ssoId);
    }
    if (pcParam) {
      workstationParam = pcParam.toLowerCase().startsWith('vlxproject') ? pcParam.toLowerCase() : `vlxproject${pcParam.padStart(2, '0').toLowerCase()}`;
      localStorage.setItem('kaban_workstation', workstationParam);
    }
    if (ssoId || pcParam) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  // 1. Check cached user object in localStorage
  const cachedUser = getSavedCurrentUser();
  if (cachedUser) {
    return cachedUser;
  }

  // 2. Check workstation in localStorage
  const savedPc = workstationParam || (typeof localStorage !== 'undefined' ? localStorage.getItem('kaban_workstation') : null);
  if (savedPc) {
    const userByPc = await loginUser({ workstation: savedPc });
    if (userByPc) return userByPc;
  }

  // 3. Check corporate cookie
  if (typeof document !== 'undefined' && document.cookie) {
    const cookieMatch = document.cookie.match(/(?:pp_user_id|ufanet_user_id|salary_user_id)=([^;]+)/);
    if (cookieMatch && !getCurrentUserId()) {
      setCurrentUserId(decodeURIComponent(cookieMatch[1]));
    }
    const pcCookieMatch = document.cookie.match(/kaban_pc=([^;]+)/);
    if (pcCookieMatch && !savedPc) {
      const pcVal = decodeURIComponent(pcCookieMatch[1]);
      const userByCookiePc = await loginUser({ workstation: pcVal });
      if (userByCookiePc) return userByCookiePc;
    }
  }

  const userId = getCurrentUserId();
  if (!userId) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        saveCurrentUserLocally(data.user);
        return data.user;
      }
    }
  } catch {}

  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const found = members.find((m) => m.id === userId);
  if (found) {
    saveCurrentUserLocally(found);
  }
  return found || null;
}

export function logoutUser() {
  saveCurrentUserLocally(null);
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
// TASKS API (BULLETPROOF PERSISTENCE & MERGING)
// ------------------------------------------------------------------------------
export async function fetchAllTasks() {
  const localTasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  try {
    const res = await fetch(`${API_BASE}/api/tasks`);
    const serverTasks = await safeParseJson(res);
    if (Array.isArray(serverTasks)) {
      // Merge: keep local tasks that aren't on server yet, or update with newer server version
      const serverMap = new Map(serverTasks.map((t) => [String(t.id), t]));
      const localOnly = localTasks.filter((lt) => !serverMap.has(String(lt.id)));
      const merged = [...serverTasks, ...localOnly];
      setLocalData(STORAGE_KEY_TASKS, merged);
      return merged;
    }
  } catch {}
  return localTasks;
}

export async function saveTask(task) {
  const genId = typeof generateTaskDisplayId === 'function' ? generateTaskDisplayId(task.section) : `${task.section || 'УФ'}.${Math.floor(10000 + Math.random() * 90000)}`;
  const displayId = task.display_id || genId;
  const id = task.id || `task-uf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const taskToSave = {
    ...task,
    id,
    display_id: displayId,
    participant_ids: Array.isArray(task.participant_ids) ? task.participant_ids : [],
    updated_at: new Date().toISOString()
  };

  // 1. Immediately persist to localStorage first so it's NEVER lost
  const localTasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const idx = localTasks.findIndex((t) => String(t.id) === String(id));
  let updatedLocal;
  if (idx >= 0) {
    updatedLocal = [...localTasks];
    updatedLocal[idx] = taskToSave;
  } else {
    updatedLocal = [taskToSave, ...localTasks];
  }
  setLocalData(STORAGE_KEY_TASKS, updatedLocal);

  // 2. Sync to server in background
  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(taskToSave)
    });
    const saved = await safeParseJson(res);
    if (saved && saved.id) {
      const freshIndex = updatedLocal.findIndex((t) => String(t.id) === String(saved.id));
      if (freshIndex >= 0) {
        updatedLocal[freshIndex] = saved;
      } else {
        updatedLocal.unshift(saved);
      }
      setLocalData(STORAGE_KEY_TASKS, updatedLocal);
      return saved;
    }
  } catch {}

  return taskToSave;
}

export async function bulkCreateTasks(tasksList) {
  if (!Array.isArray(tasksList) || tasksList.length === 0) return [];

  const localTasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const created = tasksList.map((t, i) => ({
    ...t,
    id: t.id || `task-uf-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  setLocalData(STORAGE_KEY_TASKS, [...created, ...localTasks]);

  try {
    const res = await fetch(`${API_BASE}/api/tasks/bulk`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tasks: tasksList })
    });
    const data = await safeParseJson(res);
    if (data && data.tasks) {
      return data.tasks;
    }
  } catch {}

  return created;
}

export async function updateTaskStatus(taskId, status) {
  const tasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  let updatedTask = null;
  const updated = tasks.map((t) => {
    if (String(t.id) === String(taskId)) {
      const completed_at = status === 'done' ? (t.completed_at || new Date().toISOString()) : t.completed_at;
      updatedTask = { ...t, status, completed_at, updated_at: new Date().toISOString() };
      return updatedTask;
    }
    return t;
  });
  setLocalData(STORAGE_KEY_TASKS, updated);

  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status })
    });
    const serverResult = await safeParseJson(res);
    if (serverResult) return serverResult;
  } catch {}

  return updatedTask || tasks.find((t) => String(t.id) === String(taskId));
}

export async function deleteTask(taskId) {
  const tasks = getLocalData(STORAGE_KEY_TASKS, INITIAL_TASKS);
  const updated = tasks.filter((t) => String(t.id) !== String(taskId));
  setLocalData(STORAGE_KEY_TASKS, updated);

  try {
    await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch {}
  return true;
}

// ------------------------------------------------------------------------------
// TEAM MEMBERS API
// ------------------------------------------------------------------------------
export async function fetchTeamMembers() {
  const localMembers = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  try {
    const res = await fetch(`${API_BASE}/api/members`);
    const serverMembers = await safeParseJson(res);
    if (Array.isArray(serverMembers) && serverMembers.length > 0) {
      const serverMap = new Map(serverMembers.map((m) => [String(m.id), m]));
      const localOnly = localMembers.filter((lm) => !serverMap.has(String(lm.id)));
      const merged = [...serverMembers, ...localOnly];
      setLocalData(STORAGE_KEY_MEMBERS, merged);
      return merged;
    }
  } catch {}
  return localMembers;
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

export async function verifyTeamMember(memberId, isVerified = true, roleLevel = undefined, role = undefined) {
  try {
    const res = await fetch(`${API_BASE}/api/members/${encodeURIComponent(memberId)}/verify`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ is_verified: isVerified, role_level: roleLevel, role })
    });
    if (res.ok) {
      const data = await res.json();
      return data.member;
    }
  } catch {}

  // Local fallback
  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const m = members.find((x) => x.id === memberId);
  if (m) {
    m.is_verified = isVerified;
    if (roleLevel !== undefined) m.role_level = Number(roleLevel);
    if (role) m.role = role.trim();
    setLocalData(STORAGE_KEY_MEMBERS, members);
    return m;
  }
  return null;
}

// ------------------------------------------------------------------------------
// ACCESS REQUESTS API (LEVEL 10 CHIEF RIGHTS REQUEST & APPROVAL)
// ------------------------------------------------------------------------------
const STORAGE_KEY_ACCESS_REQUESTS = 'kaban_access_requests_v1';

export async function fetchAccessRequests() {
  try {
    const res = await fetch(`${API_BASE}/api/access-requests`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      setLocalData(STORAGE_KEY_ACCESS_REQUESTS, data);
      return data;
    }
  } catch {}
  return getLocalData(STORAGE_KEY_ACCESS_REQUESTS, []);
}

export async function requestChiefAccess({ note, requestedRole = 'Начальник отдела (Ур. 10)' } = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/access-requests`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ note, requested_level: 10, requested_role: requestedRole })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}

  // Local fallback
  const cachedUser = getSavedCurrentUser();
  const current = getLocalData(STORAGE_KEY_ACCESS_REQUESTS, []);
  const reqItem = {
    id: `req-${Date.now()}`,
    user_id: cachedUser?.id || 'anon',
    user_name: cachedUser?.full_name || 'Инженер',
    department_id: cachedUser?.department_id || 'dept-design',
    workstation_id: cachedUser?.workstation_id || '',
    requested_level: 10,
    requested_role: requestedRole,
    note: (note || '').trim(),
    status: 'pending',
    created_at: new Date().toISOString()
  };
  setLocalData(STORAGE_KEY_ACCESS_REQUESTS, [reqItem, ...current]);
  return reqItem;
}

export async function approveAccessRequest(requestId) {
  try {
    const res = await fetch(`${API_BASE}/api/access-requests/${encodeURIComponent(requestId)}/approve`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}

  // Local fallback
  const list = getLocalData(STORAGE_KEY_ACCESS_REQUESTS, []);
  const item = list.find((r) => r.id === requestId);
  if (item) {
    item.status = 'approved';
    item.reviewed_at = new Date().toISOString();
    setLocalData(STORAGE_KEY_ACCESS_REQUESTS, list);
    // update member
    const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
    const m = members.find((x) => x.id === item.user_id);
    if (m) {
      m.role_level = 10;
      m.role = item.requested_role || 'Начальник отдела';
      m.is_verified = true;
      setLocalData(STORAGE_KEY_MEMBERS, members);
    }
    return { success: true, request: item, member: m };
  }
  return null;
}

export async function rejectAccessRequest(requestId) {
  try {
    const res = await fetch(`${API_BASE}/api/access-requests/${encodeURIComponent(requestId)}/reject`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' })
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalData(STORAGE_KEY_ACCESS_REQUESTS, []);
  const item = list.find((r) => r.id === requestId);
  if (item) {
    item.status = 'rejected';
    item.reviewed_at = new Date().toISOString();
    setLocalData(STORAGE_KEY_ACCESS_REQUESTS, list);
    return { success: true, request: item };
  }
  return null;
}


// ------------------------------------------------------------------------------
// ROLE PERMISSIONS MATRIX API (LEVEL 10)
// ------------------------------------------------------------------------------
export async function fetchPermissions() {
  try {
    const res = await fetch(`${API_BASE}/api/permissions`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data) {
        setLocalData(STORAGE_KEY_PERMISSIONS, data);
        return data;
      }
    }
  } catch {}
  return getLocalData(STORAGE_KEY_PERMISSIONS, DEFAULT_PERMISSIONS);
}

export async function savePermissions(matrix) {
  try {
    const res = await fetch(`${API_BASE}/api/permissions`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(matrix)
    });
    if (res.ok) {
      const saved = await res.json();
      setLocalData(STORAGE_KEY_PERMISSIONS, saved);
      return saved;
    }
  } catch {}
  setLocalData(STORAGE_KEY_PERMISSIONS, matrix);
  return matrix;
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
// DEPARTMENT CHATS & DIRECT MESSAGES (YOUGILE CHAT FEATURE)
// ------------------------------------------------------------------------------
export async function fetchChatMessages(departmentId = 'dept-all') {
  const chats = getLocalData(STORAGE_KEY_CHATS, {});
  const localList = chats[departmentId] || [];
  try {
    const res = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(departmentId)}`, {
      headers: getAuthHeaders()
    });
    const serverList = await safeParseJson(res);
    if (Array.isArray(serverList)) {
      const serverIds = new Set(serverList.map((m) => m.id));
      const localOnly = localList.filter((lm) => !serverIds.has(lm.id));
      const merged = [...serverList, ...localOnly];
      chats[departmentId] = merged;
      setLocalData(STORAGE_KEY_CHATS, chats);
      return merged;
    }
  } catch {}

  return localList;
}

export async function sendChatMessage(departmentId = 'dept-all', { text, quoted_task }) {
  const chats = getLocalData(STORAGE_KEY_CHATS, {});
  if (!chats[departmentId]) chats[departmentId] = [];

  const members = getLocalData(STORAGE_KEY_MEMBERS, INITIAL_MEMBERS);
  const currentUserId = getCurrentUserId();
  const currentUser = members.find((m) => m.id === currentUserId) || members[0];

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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

  // Immediate local save
  chats[departmentId].push(newMsg);
  if (chats[departmentId].length > 500) {
    chats[departmentId] = chats[departmentId].slice(-500);
  }
  setLocalData(STORAGE_KEY_CHATS, chats);

  try {
    const res = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(departmentId)}`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text, quoted_task })
    });
    const saved = await safeParseJson(res);
    if (saved && saved.id) {
      const idx = chats[departmentId].findIndex((m) => m.id === newMsg.id);
      if (idx >= 0) {
        chats[departmentId][idx] = saved;
      }
      setLocalData(STORAGE_KEY_CHATS, chats);
      return saved;
    }
  } catch {}

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
