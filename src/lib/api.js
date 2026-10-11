// Клиент локального API для работы в корпоративной сети Уфанет

const API_BASE = window.location.port === '5173' ? 'http://localhost:3000' : '';

const STORAGE_KEY_TASKS = 'ufanet_local_tasks_v3';
const STORAGE_KEY_MEMBERS = 'ufanet_local_members_v3';
const STORAGE_KEY_PROJECTS = 'ufanet_local_projects_v3';
const STORAGE_KEY_SECTIONS = 'ufanet_local_sections_v3';
const STORAGE_KEY_CUSTOM_IP = 'ufanet_custom_lan_ip';

import { INITIAL_MEMBERS, INITIAL_PROJECTS, INITIAL_TASKS, DEFAULT_SECTIONS } from './constants';

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
      eventSource.close();
    }
  };
}
