import { createClient } from '@supabase/supabase-js';
import { INITIAL_MEMBERS, INITIAL_PROJECTS, INITIAL_TASKS } from './constants';

const STORAGE_KEY_TASKS = 'kaban_tasks_v1';
const STORAGE_KEY_MEMBERS = 'kaban_members_v1';
const STORAGE_KEY_PROJECTS = 'kaban_projects_v1';
const STORAGE_KEY_URL = 'kaban_custom_supabase_url';
const STORAGE_KEY_KEY = 'kaban_custom_supabase_key';

let supabaseClientInstance = null;

// Initialize Supabase client if configured
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem(STORAGE_KEY_URL);
  const localKey = localStorage.getItem(STORAGE_KEY_KEY);

  const url = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || '';
  const key = (localKey && localKey.trim()) || (envKey && envKey.trim()) || '';

  const isConfigured = Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    !url.includes('your-project-id') &&
    !key.includes('your-anon-public-key')
  );

  return { url, key, isConfigured };
}

export function getSupabaseClient() {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

  if (!supabaseClientInstance) {
    try {
      supabaseClientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseClientInstance;
}

export function setCustomSupabaseCredentials(url, key) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY_KEY);

  supabaseClientInstance = null;
}

// ---------------- LOCAL STORAGE HELPERS ---------------- //

function getLocalTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local tasks:', e);
  }
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(INITIAL_TASKS));
  return INITIAL_TASKS;
}

function setLocalTasks(tasks) {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
}

function getLocalMembers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local members:', e);
  }
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(INITIAL_MEMBERS));
  return INITIAL_MEMBERS;
}

function setLocalMembers(members) {
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
}

function getLocalProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local projects:', e);
  }
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
  return INITIAL_PROJECTS;
}

function setLocalProjects(projects) {
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}

// ---------------- DATA LAYER API ---------------- //

export async function fetchAllTasks() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) return data;
      // If table is empty on supabase, try seeding or return empty
      return data || [];
    } catch (err) {
      console.warn('Supabase fetchTasks failed, falling back to local:', err.message);
    }
  }
  return getLocalTasks();
}

export async function saveTask(task) {
  const client = getSupabaseClient();
  const id = task.id || `task-${Date.now()}`;
  const preparedTask = {
    ...task,
    id,
    updated_at: new Date().toISOString()
  };

  if (client) {
    try {
      const { data, error } = await client
        .from('tasks')
        .upsert(preparedTask)
        .select()
        .single();

      if (error) throw error;
      return data || preparedTask;
    } catch (err) {
      console.warn('Supabase saveTask failed, falling back to local:', err.message);
    }
  }

  // Local fallback
  const tasks = getLocalTasks();
  const index = tasks.findIndex((t) => t.id === id);
  let updatedTasks;
  if (index >= 0) {
    updatedTasks = [...tasks];
    updatedTasks[index] = preparedTask;
  } else {
    updatedTasks = [preparedTask, ...tasks];
  }
  setLocalTasks(updatedTasks);
  return preparedTask;
}

export async function updateTaskStatus(taskId, newStatus) {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase updateTaskStatus failed:', err.message);
    }
  }

  const tasks = getLocalTasks();
  const updatedTasks = tasks.map((t) =>
    t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
  );
  setLocalTasks(updatedTasks);
  return updatedTasks.find((t) => t.id === taskId);
}

export async function deleteTask(taskId) {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase deleteTask failed:', err.message);
    }
  }

  const tasks = getLocalTasks();
  const filtered = tasks.filter((t) => t.id !== taskId);
  setLocalTasks(filtered);
  return true;
}

export async function fetchTeamMembers() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('profiles').select('*');
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase profiles fetch error:', e.message);
    }
  }
  return getLocalMembers();
}

export async function saveTeamMember(member) {
  const members = getLocalMembers();
  const index = members.findIndex((m) => m.id === member.id);
  let updated;
  if (index >= 0) {
    updated = [...members];
    updated[index] = member;
  } else {
    updated = [...members, member];
  }
  setLocalMembers(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('profiles').upsert(member);
    } catch (e) {
      console.warn('Supabase profile save error:', e.message);
    }
  }
  return updated;
}

export async function fetchProjectsList() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('projects').select('code');
      if (!error && data && data.length > 0) {
        return data.map((p) => p.code);
      }
    } catch (e) {
      console.warn('Supabase projects fetch error:', e.message);
    }
  }
  return getLocalProjects();
}

export async function addProjectItem(projectName) {
  const trimmed = projectName.trim();
  if (!trimmed) return getLocalProjects();

  const projects = getLocalProjects();
  if (!projects.includes(trimmed)) {
    const updated = [trimmed, ...projects];
    setLocalProjects(updated);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('projects').upsert({ code: trimmed, title: trimmed });
      } catch (e) {
        console.warn('Supabase project upsert error:', e.message);
      }
    }
    return updated;
  }
  return projects;
}

export function subscribeToRealtimeChanges(onRefresh) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          onRefresh(payload);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

export function resetDemoData() {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(INITIAL_TASKS));
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(INITIAL_MEMBERS));
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
  return { tasks: INITIAL_TASKS, members: INITIAL_MEMBERS, projects: INITIAL_PROJECTS };
}
