import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  COLUMNS, 
  DEFAULT_COLUMNS, 
  DEPARTMENTS, 
  DEFAULT_PERMISSIONS, 
  hasPermission,
  INITIAL_MEMBERS,
  INITIAL_TASKS,
  INITIAL_PROJECTS,
  DEFAULT_SECTIONS,
  generateTaskDisplayId
} from './lib/constants';
import { 
  fetchAllTasks, 
  saveTask, 
  deleteTask, 
  updateTaskStatus, 
  fetchTeamMembers, 
  saveTeamMember, 
  deleteTeamMember,
  fetchProjectsList, 
  addProjectItem, 
  fetchSectionsList,
  saveSectionsList,
  fetchColumnsList,
  saveColumnsList,
  fetchDepartments,
  subscribeToRealtimeChanges,
  fetchNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  bulkCreateTasks,
  logoutUser,
  fetchPermissions,
  fetchAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  verifyTeamMember,
  saveCurrentUserLocally
} from './lib/api';
import { ProfileModal } from './components/ProfileModal';
import { AccessRequestsModal } from './components/AccessRequestsModal';
import { playSound } from './lib/sound';
import { Header } from './components/Header';
import { DepartmentBar } from './components/DepartmentBar';
import { ChatSidebar } from './components/ChatSidebar';
import { FilterBar } from './components/FilterBar';
import { KanbanColumn } from './components/KanbanColumn';
import { TaskModal } from './components/TaskModal';
import { TeamModal } from './components/TeamModal';
import { SectionsModal } from './components/SectionsModal';
import { ColumnsModal } from './components/ColumnsModal';
import { MonthlyReport } from './components/MonthlyReport';
import { TaskDetailView } from './components/TaskDetailView';
import { ImportModal } from './components/ImportModal';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { ProjectTreeSidebar } from './components/ProjectTreeSidebar';
import { GanttChart } from './components/GanttChart';
import { TaskChatPanel } from './components/TaskChatPanel';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('kaban_theme') || 'dark');

  // Navigation view: 'board' | 'gantt' | 'report'
  const [activeView, setActiveView] = useState('board');

  // Active Task in Right Dock (Every Task is a Chat)
  const [activeTaskInPanel, setActiveTaskInPanel] = useState(null);

  // Archive view toggle
  const [isArchiveView, setIsArchiveView] = useState(false);

  // Global Stopwatch State (Live Time Tracking)
  const [activeStopwatchTaskId, setActiveStopwatchTaskId] = useState(() => {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem('kaban_active_stopwatch_task') : null) || null;
  });
  const [stopwatchElapsedSec, setStopwatchElapsedSec] = useState(() => {
    const started = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('kaban_active_stopwatch_start')) : 0;
    if (started && typeof localStorage !== 'undefined' && localStorage.getItem('kaban_active_stopwatch_task')) {
      return Math.max(0, Math.floor((Date.now() - started) / 1000));
    }
    return 0;
  });

  useEffect(() => {
    let interval = null;
    if (activeStopwatchTaskId) {
      interval = setInterval(() => {
        setStopwatchElapsedSec((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeStopwatchTaskId]);

  const formatStopwatchTime = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Robust hash extraction with decodeURIComponent
  const extractTaskIdFromHash = (hash) => {
    if (!hash) return null;
    const match = hash.match(/^#\/?task\/(.+)$/);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]).trim();
      } catch {
        return match[1].trim();
      }
    }
    return null;
  };

  // App data state - initial synchronous fallback ensures no empty screen on refresh or direct new tab opening!
  const [tasks, setTasks] = useState(() => {
    try {
      const raw = localStorage.getItem('ufanet_local_tasks_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_TASKS || [];
  });

  // Resolve task matching loose ID or ciphers
  const resolveTaskFromId = useCallback((rawId) => {
    if (!rawId) return null;
    let cleanId = String(rawId).trim().toLowerCase();
    try {
      cleanId = decodeURIComponent(cleanId);
    } catch {}
    const cleanIdWithoutHash = cleanId.replace(/^#/, '');

    const stripChars = (s) => String(s || '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
    const strippedClean = stripChars(cleanIdWithoutHash);

    const matchTask = (t) => {
      if (!t) return false;
      const tid = String(t.id || '').trim().toLowerCase();
      const tdisp = String(t.display_id || '').trim().toLowerCase();
      if (tid === cleanId || tdisp === cleanId || tid === cleanIdWithoutHash || tdisp === cleanIdWithoutHash) return true;
      if (strippedClean && (stripChars(tid) === strippedClean || stripChars(tdisp) === strippedClean)) return true;
      return false;
    };

    const inState = tasks.find(matchTask);
    if (inState) return inState;

    try {
      const raw = localStorage.getItem('ufanet_local_tasks_v3');
      if (raw) {
        const localList = JSON.parse(raw);
        if (Array.isArray(localList)) {
          const inLocal = localList.find(matchTask);
          if (inLocal) return inLocal;
        }
      }
    } catch {}
    return null;
  }, [tasks]);

  // Standalone task view state (Jira-style full page view for #task/:id)
  const [standaloneTaskId, setStandaloneTaskId] = useState(() => {
    return extractTaskIdFromHash(typeof window !== 'undefined' ? window.location.hash : '');
  });

  useEffect(() => {
    const handleHashChange = () => {
      const rawId = extractTaskIdFromHash(window.location.hash);
      setStandaloneTaskId(rawId);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const standaloneTask = useMemo(() => {
    if (!standaloneTaskId) return null;
    return resolveTaskFromId(standaloneTaskId);
  }, [standaloneTaskId, resolveTaskFromId]);

  const [teamMembers, setTeamMembers] = useState(() => {
    try {
      const raw = localStorage.getItem('ufanet_local_members_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_MEMBERS;
  });
  const [projects, setProjects] = useState(() => {
    try {
      const raw = localStorage.getItem('ufanet_local_projects_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_PROJECTS || [];
  });

  const [sections, setSections] = useState(() => {
    try {
      const raw = localStorage.getItem('ufanet_local_sections_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SECTIONS || [];
  });

  const [columns, setColumns] = useState(() => {
    try {
      const raw = localStorage.getItem('ufanet_local_columns_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_COLUMNS || COLUMNS;
  });

  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [activeDepartmentId, setActiveDepartmentId] = useState(() => localStorage.getItem('kaban_active_department') || 'all');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('kaban_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
    } catch {}
    return null;
  });
  const [permissionsMatrix, setPermissionsMatrix] = useState(DEFAULT_PERMISSIONS);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(() => localStorage.getItem('kaban_chat_open') !== 'false');
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [initialModalStatus, setInitialModalStatus] = useState('backlog');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [isSectionsModalOpen, setIsSectionsModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatPreQuotedTask, setChatPreQuotedTask] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
    try {
      return !localStorage.getItem('kaban_current_user');
    } catch {
      return false;
    }
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAccessRequestsModalOpen, setIsAccessRequestsModalOpen] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);

  // Notifications state
  const [notifications, setNotifications] = useState([]);

  // Toast feedback with deduplication, unique ID, max 4 items, and auto-dismiss
  const [toasts, setToasts] = useState([]);
  const recentToastsRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((msg, icon = '✓') => {
    if (!msg) return;
    const now = Date.now();
    // Clean up stale history
    for (const [key, timestamp] of recentToastsRef.current.entries()) {
      if (now - timestamp > 5000) {
        recentToastsRef.current.delete(key);
      }
    }
    // Prevent duplicate toasts within 3.5 seconds for each unique message
    const lastSeen = recentToastsRef.current.get(msg);
    if (lastSeen && (now - lastSeen) < 3500) {
      return;
    }
    recentToastsRef.current.set(msg, now);

    const id = `${now}-${Math.random().toString(36).slice(2, 7)}`;
    // Keep AT MOST 2 previous toasts + this new one (max 3 total)
    setToasts((prev) => [...prev.filter((t) => t.msg !== msg).slice(-2), { id, msg, icon }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  // Set theme on root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kaban_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedTasks, loadedMembers, loadedProjects, loadedSections, loadedColumns, loadedNotifs, loadedDepts, loadedPerms, loadedReqs] = await Promise.all([
        fetchAllTasks(),
        fetchTeamMembers(),
        fetchProjectsList(),
        fetchSectionsList(),
        fetchColumnsList(),
        fetchNotifications(),
        fetchDepartments(),
        fetchPermissions(),
        fetchAccessRequests()
      ]);

      setTasks(loadedTasks && loadedTasks.length > 0 ? loadedTasks : (prevTasks => prevTasks.length > 0 ? prevTasks : INITIAL_TASKS));
      setTeamMembers(loadedMembers && loadedMembers.length > 0 ? loadedMembers : INITIAL_MEMBERS);
      setProjects(loadedProjects && loadedProjects.length > 0 ? loadedProjects : (prev => prev.length > 0 ? prev : INITIAL_PROJECTS));
      setSections(loadedSections && loadedSections.length > 0 ? loadedSections : (prev => prev.length > 0 ? prev : DEFAULT_SECTIONS));
      setColumns(loadedColumns && loadedColumns.length > 0 ? loadedColumns : DEFAULT_COLUMNS || COLUMNS);
      setNotifications(loadedNotifs || []);
      setDepartments(loadedDepts && loadedDepts.length > 0 ? loadedDepts : DEPARTMENTS);
      if (loadedPerms) setPermissionsMatrix(loadedPerms);
      setAccessRequests(loadedReqs || []);

      // Check Workstation parameter in URL: ?pc=vlxproject04 or ?workstation=...
      let pcFromUrl = null;
      if (typeof window !== 'undefined' && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const rawPc = urlParams.get('pc') || urlParams.get('workstation') || urlParams.get('device');
        if (rawPc) {
          pcFromUrl = rawPc.toLowerCase().startsWith('vlxproject') ? rawPc.toLowerCase() : `vlxproject${rawPc.padStart(2, '0').toLowerCase()}`;
          localStorage.setItem('kaban_workstation', pcFromUrl);
        }
      }

      const activePc = pcFromUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('kaban_workstation') : null);

      // Restore user:
      let matchedUser = null;
      if (activePc) {
        matchedUser = (loadedMembers || []).find((m) => m.workstation_id?.toLowerCase() === activePc.toLowerCase());
      }
      if (!matchedUser) {
        const savedUserId = localStorage.getItem('kaban_current_user_id');
        matchedUser = (loadedMembers || []).find((m) => m.id === savedUserId);
      }
      if (!matchedUser) {
        try {
          const cachedRaw = localStorage.getItem('kaban_current_user');
          if (cachedRaw) matchedUser = JSON.parse(cachedRaw);
        } catch {}
      }

      if (matchedUser) {
        setCurrentUser(matchedUser);
        localStorage.setItem('kaban_current_user', JSON.stringify(matchedUser));
        localStorage.setItem('kaban_current_user_id', matchedUser.id);
        if (matchedUser.department_id && !localStorage.getItem('kaban_active_department')) {
          setActiveDepartmentId(matchedUser.department_id);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    loadData();

    // Subscribe to Server-Sent Events (SSE) Realtime updates from colleagues!
    const unsubscribe = subscribeToRealtimeChanges((event) => {
      if (event.type === 'TASK_UPDATED') {
        setTasks((prev) => {
          const index = prev.findIndex((t) => t.id === event.payload.id);
          if (index >= 0) {
            const copy = [...prev];
            copy[index] = event.payload;
            return copy;
          }
          return [event.payload, ...prev];
        });
        showToast('Задача обновлена коллегой', '⚡');
      } else if (event.type === 'TASK_DELETED') {
        setTasks((prev) => prev.filter((t) => t.id !== event.payload.id));
      } else if (event.type === 'TASKS_BULK_CREATED') {
        const incomingTasks = event.payload?.tasks || [];
        setTasks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newUnique = incomingTasks.filter((t) => !existingIds.has(t.id));
          return [...newUnique, ...prev];
        });
        showToast(`Импортировано ${incomingTasks.length} новых задач`, '⚡');
      } else if (event.type === 'MEMBERS_UPDATED') {
        setTeamMembers(event.payload);
      } else if (event.type === 'PROJECTS_UPDATED') {
        setProjects(event.payload);
      } else if (event.type === 'SECTIONS_UPDATED') {
        setSections(event.payload);
      } else if (event.type === 'COLUMNS_UPDATED') {
        setColumns(event.payload);
      } else if (event.type === 'DEPARTMENTS_UPDATED') {
        setDepartments(event.payload);
      } else if (event.type === 'PERMISSIONS_UPDATED') {
        setPermissionsMatrix(event.payload);
      } else if (event.type === 'ACCESS_REQUEST_CREATED') {
        setAccessRequests((prev) => [event.payload, ...prev]);
        playSound('alert');
        showToast(`👑 Заявка на доступ: ${event.payload?.user_name}`, '👑');
      } else if (event.type === 'ACCESS_REQUEST_RESOLVED') {
        setAccessRequests((prev) =>
          prev.map((r) => (r.id === event.payload?.id ? event.payload : r))
        );
      } else if (event.type === 'NEW_CHAT_MESSAGE') {
        const { message } = event.payload || {};
        if (message && message.user_id !== currentUserRef.current?.id) {
          playSound('message');
          showToast(`💬 Чат: сообщение от ${message.user_name}`, '💬');
        }
      } else if (event.type === 'NOTIFICATIONS_UPDATED') {
        const list = event.payload || [];
        const seen = new Set();
        const deduped = list.filter((n) => {
          if (!n || !n.id || seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
        setNotifications(deduped);
      } else if (event.type === 'NEW_MENTION') {
        const notif = event.payload;
        const targets = notif.targetUserIds || [];
        const me = currentUserRef.current;
        const isForMe = me && (targets.includes(me.id) || notif.targetUserId === me.id);
        const isAll = targets.includes('__all__');
        if (isForMe || isAll) {
          playSound('mention');
          showToast(`🔔 ${isForMe ? 'Вас упомянул(а)' : 'Упоминание @все от'} ${notif.fromUserName || 'коллеги'}!`, '💬');
        }
      }
    }, currentUser?.id);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadData, showToast, currentUser?.id]);

  // Realtime notification sync fallback every 5 seconds
  useEffect(() => {
    const notifInterval = setInterval(async () => {
      try {
        const notifs = await fetchNotifications();
        if (Array.isArray(notifs)) {
          const seen = new Set();
          const deduped = notifs.filter((n) => {
            if (!n || !n.id || seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });
          setNotifications(deduped);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(notifInterval);
  }, []);

  const handleSelectCurrentUser = (user) => {
    if (!user) return;
    setCurrentUser(user);
    setTeamMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === user.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...user };
        return copy;
      }
      return [user, ...prev];
    });
    if (user?.id) {
      localStorage.setItem('kaban_current_user_id', user.id);
      localStorage.setItem('kaban_current_user', JSON.stringify(user));
    }
    if (user?.workstation_id) {
      localStorage.setItem('kaban_workstation', user.workstation_id);
    }
    if (user?.department_id) {
      setActiveDepartmentId(user.department_id);
      localStorage.setItem('kaban_active_department', user.department_id);
    }
    showToast(`Добро пожаловать, ${user.full_name}! 👋`, '🔐');
  };

  const handleLogout = () => {
    logoutUser();
    localStorage.removeItem('kaban_current_user');
    localStorage.removeItem('kaban_current_user_id');
    setCurrentUser(INITIAL_MEMBERS[0]);
    setIsAuthModalOpen(true);
    playSound('click');
    showToast('Выберите профиль сотрудника для входа', '🔐');
  };

  // Global Escape Key Handler to close open modals, side panels, and standalone views
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key !== 'Escape') return;

      if (isTaskModalOpen) {
        setIsTaskModalOpen(false);
        return;
      }
      if (isImportModalOpen) {
        setIsImportModalOpen(false);
        return;
      }
      if (isTeamModalOpen) {
        setIsTeamModalOpen(false);
        return;
      }
      if (isProfileModalOpen) {
        setIsProfileModalOpen(false);
        return;
      }
      if (isAccessRequestsModalOpen) {
        setIsAccessRequestsModalOpen(false);
        return;
      }
      if (isSectionsModalOpen) {
        setIsSectionsModalOpen(false);
        return;
      }
      if (isColumnsModalOpen) {
        setIsColumnsModalOpen(false);
        return;
      }
      if (isSettingsModalOpen) {
        setIsSettingsModalOpen(false);
        return;
      }
      if (isChatModalOpen) {
        setIsChatModalOpen(false);
        return;
      }
      if (standaloneTaskId) {
        setStandaloneTaskId(null);
        window.location.hash = '';
        return;
      }
      if (activeTaskInPanel) {
        setActiveTaskInPanel(null);
        if (window.location.hash.startsWith('#task/')) {
          window.location.hash = '';
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isTaskModalOpen,
    isImportModalOpen,
    isTeamModalOpen,
    isProfileModalOpen,
    isAccessRequestsModalOpen,
    isSectionsModalOpen,
    isColumnsModalOpen,
    isSettingsModalOpen,
    isChatModalOpen,
    standaloneTaskId,
    activeTaskInPanel
  ]);

  // Find member selected in filter
  const selectedFilterMember = useMemo(() => {
    if (selectedAssigneeId) return teamMembers.find((m) => m.id === selectedAssigneeId) || null;
    return null;
  }, [selectedAssigneeId, teamMembers]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // -1. Archive filter (Feature 3)
      if (isArchiveView) {
        if (!task.is_archived) return false;
      } else {
        if (task.is_archived) return false;
      }

      // 0. Department filter (includes cross-department collaborative tasks and department mirrors)
      if (activeDepartmentId && activeDepartmentId !== 'all') {
        const taskDept = task.department_id || 'dept-design';
        const isParticipant = Array.isArray(task.participant_ids) && currentUser && task.participant_ids.includes(currentUser.id) && (currentUser.department_id === activeDepartmentId);
        const isAssignee = currentUser && task.assignee_id === currentUser.id && (currentUser.department_id === activeDepartmentId);
        const isMirrored = Array.isArray(task.mirrored_departments) && task.mirrored_departments.includes(activeDepartmentId);
        if (taskDept !== activeDepartmentId && !isParticipant && !isAssignee && !isMirrored) {
          return false;
        }
      }

      // 1. Assignee filter (handles both individual engineers and "My tasks")
      if (selectedAssigneeId && task.assignee_id !== selectedAssigneeId) {
        return false;
      }

      // 2. Section filter
      if (selectedSection && task.section !== selectedSection) {
        return false;
      }

      // 4. Project filter (matches project_code or project_cipher)
      if (selectedProject && task.project_code !== selectedProject && task.project_cipher !== selectedProject) {
        return false;
      }

      // 5. Search query (matches title, description, project, erp id, network link, address)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        const projectMatch = task.project_code?.toLowerCase().includes(q);
        const linkMatch = task.network_link?.toLowerCase().includes(q);
        const addressMatch = task.address?.toLowerCase().includes(q);
        const erpMatch = task.erp_project_id?.toLowerCase().includes(q) || task.erp_task_number?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !projectMatch && !linkMatch && !addressMatch && !erpMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, activeDepartmentId, selectedAssigneeId, selectedSection, selectedProject, searchQuery, isArchiveView]);

  // Handle Drag & Drop move
  const handleDropTask = async (taskId, newStatus) => {
    if (!hasPermission(currentUser, 'can_move_task', permissionsMatrix)) {
      showToast('У вашего уровня доступа нет прав на перемещение карточек', '🔒');
      return;
    }
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const wasSubtask = Boolean(task.parent_task_id);
    if (task.status === newStatus && !wasSubtask) return;

    // Validation for moving to "ГОТОВО / Выдано": mandatory fields must be filled
    if (newStatus === 'done') {
      const missing = [];
      if (!task.title?.trim()) missing.push('Название задачи');
      if (!task.assignee_id) missing.push('Исполнитель');
      if (!task.department_id) missing.push('Отдел');
      if (!task.section && !task.project_cipher) missing.push('Раздел / Шифр проекта');
      if (!task.due_date && !task.deadline) missing.push('Срок сдачи (Дедлайн)');
      if (!task.payroll_customer && !task.customer) missing.push('Внутр. заказчик ProjectPay');
      if (!task.region) missing.push('Регион ProjectPay');
      if (!task.payroll_work_group && !task.work_group) missing.push('Группа работ ProjectPay');
      if (!task.payroll_work_type && !task.work_type) missing.push('Вид работ ProjectPay');

      if (missing.length > 0) {
        playSound('error');
        showToast(`⚠️ Заполните обязательные поля: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` (+ещё ${missing.length - 3})` : ''}`, '⚠️');
        return;
      }
    }

    const updatedTask = {
      ...task,
      status: newStatus,
      parent_task_id: null // Unlink if it was a subtask, making it a top-level task in this column!
    };

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? updatedTask : t))
    );

    if (wasSubtask) {
      showToast(`Подзадача #${task.display_id || task.title} вынесена на доску в колонку`, '↳');
    }

    if (newStatus === 'done') {
      playSound('success');
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.7 }
      });
      showToast('Задача выпущена в монтаж / завершена! 🎉');
    } else {
      playSound('drop');
    }

    try {
      if (wasSubtask) {
        await saveTask(updatedTask);
      } else {
        await updateTaskStatus(taskId, newStatus);
      }
    } catch (err) {
      console.error('Ошибка обновления статуса:', err);
    }
  };

  // Save task (create or edit)
  const handleSaveTask = async (taskData) => {
    if (taskData.project_code && !projects.includes(taskData.project_code)) {
      const updatedProjects = await addProjectItem(taskData.project_code);
      setProjects(updatedProjects);
    }

    const sec = taskData.section || (sections[0]?.id || 'ВДН');
    const proj = taskData.project_cipher || taskData.project_code || '';
    const cleanInputId = String(taskData.id || '').trim().toLowerCase();
    const isEditing = Boolean(
      taskData.id &&
      !taskData.id.startsWith('temp-') &&
      tasks.some((t) => String(t.id).trim().toLowerCase() === cleanInputId || String(t.display_id || '').trim().toLowerCase() === cleanInputId)
    );
    const taskId = isEditing ? taskData.id : generateTaskDisplayId(sec, proj, tasks);
    const displayId = taskData.display_id || taskId;

    const taskToSave = {
      ...taskData,
      id: taskId,
      display_id: displayId,
      participant_ids: Array.isArray(taskData.participant_ids) ? taskData.participant_ids : [],
      updated_at: new Date().toISOString()
    };

    // Cascade archive / unarchive to all child and descendant tasks (Requirement 10.2)
    const affectedDescendantIds = new Set();
    if (taskData.is_archived !== undefined) {
      const collectDescendants = (parentId) => {
        tasks.filter((t) => t.parent_task_id === parentId).forEach((child) => {
          affectedDescendantIds.add(child.id);
          collectDescendants(child.id);
        });
      };
      collectDescendants(taskId);
    }

    const cleanId = String(taskId).trim().toLowerCase();
    if (isEditing) {
      setTasks((prev) =>
        prev.map((t) => {
          if (affectedDescendantIds.has(t.id)) {
            return { ...t, is_archived: taskData.is_archived, updated_at: new Date().toISOString() };
          }
          if (String(t.id).trim().toLowerCase() === cleanId || String(t.display_id || '').trim().toLowerCase() === cleanId) {
            return { ...t, ...taskToSave };
          }
          return t;
        })
      );
      if (taskData.is_archived !== undefined) {
        showToast(taskData.is_archived ? 'Задача и её подзадачи отправлены в архив' : 'Задача и подзадачи разархивированы', '📦');
      } else {
        showToast('Карточка успешно сохранена');
      }
    } else {
      setTasks((prev) => [taskToSave, ...prev]);
      showToast('Новая задача создана');
    }

    // Sync active task panel if open
    setActiveTaskInPanel((prev) => {
      if (!prev) return null;
      if (String(prev.id).trim().toLowerCase() === cleanId || String(prev.display_id || '').trim().toLowerCase() === cleanId) {
        return { ...prev, ...taskToSave };
      }
      return prev;
    });

    try {
      const saved = await saveTask(taskToSave);
      if (saved && saved.id) {
        setTasks((prev) => {
          const index = prev.findIndex((t) => String(t.id).trim().toLowerCase() === String(saved.id).trim().toLowerCase() || String(t.display_id || '').trim().toLowerCase() === String(saved.id).trim().toLowerCase());
          if (index >= 0) {
            const next = [...prev];
            next[index] = saved;
            return next;
          }
          return [saved, ...prev];
        });

        // Trigger notification if newly assigned to a colleague
        if (saved.assignee_id && saved.assignee_id !== currentUser?.id) {
          const oldTask = tasks.find((t) => t.id === saved.id);
          if (!oldTask || oldTask.assignee_id !== saved.assignee_id) {
            createNotification({
              type: 'assignment',
              targetUserIds: [saved.assignee_id],
              fromUserId: currentUser?.id,
              fromUserName: currentUser?.full_name,
              taskId: saved.id,
              taskTitle: saved.title,
              text: `Вам назначена задача #${saved.display_id || saved.title} (${currentUser?.full_name || 'Администратор'})`
            }).catch(() => {});
          }
        }
      }

      // Persist cascaded archive state for all descendants
      if (affectedDescendantIds.size > 0) {
        affectedDescendantIds.forEach((childId) => {
          const childTask = tasks.find((t) => t.id === childId);
          if (childTask) {
            saveTask({ ...childTask, is_archived: taskData.is_archived }).catch(console.error);
          }
        });
      }
    } catch (e) {
      console.error('Ошибка сохранения задачи:', e);
    }
  };

  // Add new project from Project Tree Sidebar
  const handleAddNewProject = async (projectName) => {
    const trimmed = (projectName || '').trim();
    if (!trimmed) return;
    try {
      const updated = await addProjectItem(trimmed);
      if (Array.isArray(updated)) setProjects(updated);
      setSelectedProject(trimmed);
      showToast(`Проект «${trimmed}» успешно создан`, '📁');
    } catch {
      setProjects((prev) => [...prev, trimmed]);
      setSelectedProject(trimmed);
    }
  };

  // Global Stopwatch Toggle Handler
  const handleToggleStopwatch = (taskId) => {
    if (activeStopwatchTaskId === taskId) {
      const targetTask = tasks.find((t) => t.id === taskId);
      const mins = Math.max(1, Math.round(stopwatchElapsedSec / 60));
      const hours = (mins / 60).toFixed(2);
      playSound('success');

      if (targetTask) {
        const newLog = {
          id: `wl-${Date.now()}`,
          user_id: currentUser?.id || null,
          user_name: currentUser?.full_name || 'Инженер',
          date: new Date().toISOString().split('T')[0],
          hours,
          comment: `Списано по секундомеру Доски (${stopwatchElapsedSec} сек)`
        };
        const currentLogs = Array.isArray(targetTask.worklogs) ? targetTask.worklogs : [];
        const updatedLogs = [newLog, ...currentLogs];
        const newTotalHours = updatedLogs.reduce((acc, l) => acc + (parseFloat(l.hours) || 0), 0).toFixed(2);

        const updatedTask = {
          ...targetTask,
          worklogs: updatedLogs,
          hours_spent: newTotalHours
        };

        handleSaveTask(updatedTask);
        showToast(`Секундомер остановлен: списано ${hours} ч. в ${targetTask.display_id || targetTask.title}`, '⏱️');
      }

      setActiveStopwatchTaskId(null);
      setStopwatchElapsedSec(0);
      try {
        localStorage.removeItem('kaban_active_stopwatch_task');
        localStorage.removeItem('kaban_active_stopwatch_start');
      } catch {}
    } else {
      const now = Date.now();
      setActiveStopwatchTaskId(taskId);
      setStopwatchElapsedSec(0);
      try {
        localStorage.setItem('kaban_active_stopwatch_task', taskId);
        localStorage.setItem('kaban_active_stopwatch_start', String(now));
      } catch {}
      playSound('click');
      const targetTask = tasks.find((t) => t.id === taskId);
      showToast(`Секундомер запущен: ${targetTask?.display_id || ''}`, '⏱️');
    }
  };

  // Inline Task Creation in any Column (auto-mirrors RSS tasks to Design)
  const handleInlineCreateTask = async (columnId, title) => {
    if (!title || !title.trim()) return;
    if (!hasPermission(currentUser, 'can_create_task', permissionsMatrix)) {
      showToast('У вашего уровня доступа нет прав на создание задач', '🔒');
      return;
    }
    const dept = activeDepartmentId !== 'all' ? activeDepartmentId : (currentUser?.department_id || 'dept-design');
    const sec = sections[0]?.id || 'ВДН';
    const proj = projects[0] || 'ЖК «Агидель»';
    const taskId = generateTaskDisplayId(sec, proj, tasks);
    const isRss = dept === 'dept-rss';
    const newTask = {
      id: taskId,
      display_id: taskId,
      title: title.trim(),
      status: columnId,
      priority: 'medium',
      department_id: dept,
      assignee_id: currentUser?.id || null,
      section: sec,
      project_code: proj,
      mirrored_departments: isRss ? ['dept-design'] : [],
      created_at: new Date().toISOString()
    };
    await handleSaveTask(newTask);
  };

  // YouGile Share Task to Chat
  const handleShareTaskToChat = (task) => {
    setChatPreQuotedTask(task);
    setIsChatSidebarOpen(true);
    playSound('click');
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    const cleanId = String(taskId || '').trim().toLowerCase();
    setTasks((prev) => prev.filter((t) => String(t.id).toLowerCase() !== cleanId && String(t.display_id || '').toLowerCase() !== cleanId));
    showToast('Задача удалена', '🗑️');
    try {
      await deleteTask(taskId);
    } catch (e) {
      console.error('Ошибка удаления задачи:', e);
    }
  };

  // Update team member
  const handleUpdateMember = async (member) => {
    try {
      const result = await saveTeamMember(member);
      if (Array.isArray(result)) {
        setTeamMembers(result);
      } else if (result && result.id) {
        setTeamMembers((prev) => {
          const idx = prev.findIndex((m) => m.id === result.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = result;
            return copy;
          }
          return [...prev, result];
        });
      }
      if (currentUser?.id === member.id) {
        const updated = { ...currentUser, ...member };
        setCurrentUser(updated);
        saveCurrentUserLocally(updated);
      }
      showToast('Профиль сотрудника обновлен');
    } catch (e) {
      console.error('Ошибка обновления сотрудника:', e);
    }
  };

  // Delete team member
  const handleDeleteMember = async (memberId) => {
    try {
      const result = await deleteTeamMember(memberId);
      let newMembers;
      if (Array.isArray(result)) {
        newMembers = result;
      } else {
        newMembers = teamMembers.filter((m) => m.id !== memberId);
      }
      setTeamMembers(newMembers);
      if (currentUser?.id === memberId) {
        setCurrentUser(newMembers[0] || null);
      }
      if (selectedAssigneeId === memberId) {
        setSelectedAssigneeId(null);
      }
      showToast('Сотрудник удален');
    } catch (e) {
      console.error('Ошибка удаления сотрудника:', e);
    }
  };

  // Verify team member (Level 10 Chief Rights)
  const handleVerifyMember = async (memberId, isVerified) => {
    try {
      const verified = await verifyTeamMember(memberId, isVerified);
      if (verified) {
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, is_verified: isVerified } : m))
        );
        if (currentUser?.id === memberId) {
          const updatedUser = { ...currentUser, is_verified: isVerified };
          setCurrentUser(updatedUser);
          saveCurrentUserLocally(updatedUser);
        }
      }
    } catch (err) {
      console.error('Ошибка верификации сотрудника:', err);
    }
  };

  // Save profile customization
  const handleSaveProfile = async (updatedProfile) => {
    try {
      const result = await saveTeamMember(updatedProfile);
      if (Array.isArray(result)) {
        setTeamMembers(result);
      } else if (result && result.id) {
        setTeamMembers((prev) => {
          const idx = prev.findIndex((m) => m.id === result.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = result;
            return copy;
          }
          return [...prev, result];
        });
      }
      if (currentUser?.id === updatedProfile.id) {
        const updated = { ...currentUser, ...updatedProfile };
        setCurrentUser(updated);
        saveCurrentUserLocally(updated);
      }
      showToast('Ваш профиль успешно обновлен');
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err);
      showToast('Ошибка при сохранении профиля', '⚠️');
    }
  };

  // Approve chief access request (Level 10)
  const handleApproveAccessRequest = async (requestId) => {
    try {
      const res = await approveAccessRequest(requestId);
      if (res && res.success) {
        setAccessRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
        );
        if (res.member) {
          setTeamMembers((prev) =>
            prev.map((m) => (m.id === res.member.id ? res.member : m))
          );
          if (currentUser?.id === res.member.id) {
            setCurrentUser(res.member);
            saveCurrentUserLocally(res.member);
          }
        }
        showToast('Заявка на доступ одобрена! Роль Ур. 10 присвоена', '👑');
      }
    } catch (err) {
      console.error('Ошибка одобрения заявки на доступ:', err);
      showToast('Ошибка при одобрении заявки', '⚠️');
    }
  };

  // Reject chief access request
  const handleRejectAccessRequest = async (requestId) => {
    try {
      const res = await rejectAccessRequest(requestId);
      if (res && res.success) {
        setAccessRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r))
        );
        showToast('Заявка на доступ отклонена');
      }
    } catch (err) {
      console.error('Ошибка отклонения заявки на доступ:', err);
    }
  };

  // Save sections
  const handleSaveSections = async (updatedSections, renamesMap = {}) => {
    const saved = await saveSectionsList(updatedSections);
    setSections(saved);

    // If any section code was renamed, migrate affected tasks
    if (renamesMap && Object.keys(renamesMap).length > 0) {
      let tasksUpdated = false;
      const newTasks = tasks.map((task) => {
        if (task.section && renamesMap[task.section]) {
          tasksUpdated = true;
          const updatedTask = { ...task, section: renamesMap[task.section] };
          saveTask(updatedTask);
          return updatedTask;
        }
        return task;
      });

      if (tasksUpdated) {
        setTasks(newTasks);
      }

      if (selectedSection && renamesMap[selectedSection]) {
        setSelectedSection(renamesMap[selectedSection]);
      }
    }

    showToast('Список разделов/марок обновлен');
  };

  // Save columns
  const handleSaveColumns = async (updatedColumns, renamesMap = {}) => {
    const saved = await saveColumnsList(updatedColumns);
    setColumns(saved);

    // If any column was renamed or deleted, migrate affected tasks
    if (renamesMap && Object.keys(renamesMap).length > 0) {
      let tasksUpdated = false;
      const newTasks = tasks.map((task) => {
        if (task.status && renamesMap[task.status]) {
          tasksUpdated = true;
          const updatedTask = { ...task, status: renamesMap[task.status] };
          saveTask(updatedTask);
          return updatedTask;
        }
        return task;
      });

      if (tasksUpdated) {
        setTasks(newTasks);
      }
    }

    showToast('Список колонок доски обновлен');
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedAssigneeId(null);
    setSelectedSection(null);
    setSelectedProject(null);
    setSearchQuery('');
  };

  // Mentions notifications handlers
  const handleNotifyMention = async (notifData) => {
    try {
      const created = await createNotification(notifData);
      if (created && created.id) {
        setNotifications((prev) => {
          const filtered = prev.filter((n) => n.id !== created.id);
          return [created, ...filtered];
        });
      }
      playSound('mention');
      showToast('Упоминание отправлено коллегам! 🔔');
    } catch (err) {
      console.error('Ошибка отправки упоминания:', err);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    const updated = await markNotificationRead(id);
    setNotifications(updated);
  };

  const handleMarkAllNotificationsRead = async () => {
    const updated = await markAllNotificationsRead();
    setNotifications(updated);
    showToast('Все уведомления прочитаны', '✓');
  };

  const handleDeleteNotification = async (id) => {
    const updated = await deleteNotification(id);
    setNotifications(updated);
  };

  const handleOpenTaskFromNotification = (taskId) => {
    if (!taskId) return;
    const task = resolveTaskFromId(taskId);
    if (task) {
      window.location.hash = `#task/${encodeURIComponent(task.id)}`;
      setActiveTaskInPanel(task);
      setIsChatSidebarOpen(true);
    }
  };

  // Bulk import from ERP
  const handleImportTasks = async (parsedRows) => {
    if (!parsedRows || parsedRows.length === 0) return;
    try {
      const newTasks = parsedRows.map((row, idx) => {
        const erpVal = row.erp_task_number || row.erp_project_id || null;
        return {
          id: `task-uf-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          title: row.title,
          address: row.address || null,
          section: row.section || (sections[0]?.id || 'ВДН'),
          status: columns[0]?.id || 'backlog',
          priority: row.priority || 'medium',
          assignee_id: row.assignee_id || null,
          due_date: row.due_date || null,
          description: row.description || null,
          erp_task_number: erpVal,
          erp_project_id: erpVal,
          region: row.region || '11',
          internal_customer: '17',
          work_group: '22',
          work_item: '118',
          created_at: new Date().toISOString()
        };
      });

      await bulkCreateTasks(newTasks);

      setTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const uniqueNew = newTasks.filter((t) => !existingIds.has(t.id));
        return [...uniqueNew, ...prev];
      });

      showToast(`Импортировано ${newTasks.length} задач в бэклог! 🎉`);
    } catch (err) {
      console.error('Ошибка импорта задач:', err);
      showToast('Ошибка при импорте задач', '⚠️');
    }
  };

  // Quick add in specific column
  const handleQuickAdd = (status) => {
    setInitialModalStatus(status);
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  // Edit task (switches right panel to task chat & details)
  const handleEditTask = (task) => {
    if (!task) return;
    setActiveTaskInPanel(task);
    setIsChatSidebarOpen(true);
    playSound('click');
  };

  // Update column title, wip_limit, or color
  const handleUpdateColumn = async (columnId, updates) => {
    const updated = columns.map((c) => c.id === columnId ? { ...c, ...updates } : c);
    setColumns(updated);
    try {
      await saveColumnsList(updated);
      showToast('Настройки колонки сохранены', '🎨');
    } catch (err) {
      console.error('Ошибка сохранения колонки:', err);
    }
  };

  const effectiveUser = currentUser || { id: 'guest', full_name: 'Гость (Авторизуйтесь)', role_level: 1, role: 'Гость' };

  // Dedicated Jira-style Standalone Full Page Task View
  if (standaloneTaskId) {
    return (
      <div className="app-root-shell" style={{ width: '100vw', minHeight: '100vh', height: '100vh', overflowY: 'auto', background: 'var(--bg-primary)' }}>
        {standaloneTask ? (
          <TaskDetailView
            task={standaloneTask}
            allTasks={tasks}
            teamMembers={teamMembers}
            projects={projects}
            sections={sections}
            columns={columns}
            departments={departments}
            currentUser={effectiveUser}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onBack={() => {
              window.location.hash = '';
              setStandaloneTaskId(null);
            }}
            onNotifyMention={handleNotifyMention}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-main)', padding: '2rem' }}>
            <div style={{ maxWidth: '480px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '2rem', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.6rem' }}>
                {loading ? 'Загрузка задачи...' : 'Задача не найдена или была удалена'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Шифр / ID: <code style={{ color: '#ff8800' }}>{standaloneTaskId}</code>
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  window.location.hash = '';
                  setStandaloneTaskId(null);
                }}
              >
                ← Вернуться к доске задач
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-root-shell" style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Top Navigation Header (Spans full 100% width across the top) */}
          <Header
            tasks={tasks}
            teamMembers={teamMembers}
            currentUser={effectiveUser}
            onSelectCurrentUser={handleSelectCurrentUser}
            onLogout={handleLogout}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenNewTask={() => handleQuickAdd(columns[0]?.id || 'backlog')}
            onOpenTeamModal={(memberId) => {
              setEditingMemberId(memberId || null);
              setIsTeamModalOpen(true);
            }}
            onOpenSectionsModal={() => setIsSectionsModalOpen(true)}
            onOpenColumnsModal={() => setIsColumnsModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            accessRequests={accessRequests}
            onOpenAccessRequestsModal={() => setIsAccessRequestsModalOpen(true)}
            activeView={activeView}
            onSelectView={setActiveView}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
            onDeleteNotification={handleDeleteNotification}
            onOpenTaskFromNotification={handleOpenTaskFromNotification}
          />

          {/* YouGile Department Switcher Bar (Spans full 100% width) */}
          <DepartmentBar
            departments={departments}
            activeDepartmentId={activeDepartmentId}
            onSelectDepartment={(id) => {
              setActiveDepartmentId(id);
              localStorage.setItem('kaban_active_department', id);
            }}
            tasks={tasks}
          />

          {/* Filter and Search Bar (Spans full 100% width) */}
          <FilterBar
            teamMembers={teamMembers}
            projects={projects}
            sections={sections}
            currentUser={currentUser}
            selectedAssigneeId={selectedAssigneeId}
            onSelectAssignee={setSelectedAssigneeId}
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onResetFilters={handleResetFilters}
            onOpenSectionsModal={() => setIsSectionsModalOpen(true)}
            onOpenTeamModal={(memberId) => {
              setEditingMemberId(memberId || null);
              setIsTeamModalOpen(true);
            }}
            activeDepartmentId={activeDepartmentId}
          />

          {/* Global Live Stopwatch Top Banner */}
          {activeStopwatchTaskId && (
            <div
              style={{
                background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.08))',
                borderBottom: '1.5px solid #10b981',
                padding: '0.4rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#10b981',
                fontSize: '0.8rem',
                fontWeight: 700,
                zIndex: 15
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>⏱️</span>
                <span>Идёт учет времени:</span>
                <span style={{ color: 'var(--text-main)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}>
                  {tasks.find(t => t.id === activeStopwatchTaskId)?.display_id || activeStopwatchTaskId}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.04em' }}>
                  {formatStopwatchTime(stopwatchElapsedSec)}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleToggleStopwatch(activeStopwatchTaskId)}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.74rem' }}
              >
                ⏹ Остановить и списать в табель
              </button>
            </div>
          )}

          {/* Archive Banner (when viewing archived tasks) */}
          {isArchiveView && (
            <div
              style={{
                background: 'rgba(100, 116, 139, 0.15)',
                borderBottom: '1px solid rgba(100, 116, 139, 0.3)',
                padding: '0.45rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: '#cbd5e1',
                zIndex: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>📦</span>
                <span><strong>Архив задач:</strong> Вы просматриваете заархивированные карточки. Они скрыты с основной рабочей доски.</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsArchiveView(false)}
                style={{ padding: '0.2rem 0.65rem', fontSize: '0.72rem' }}
              >
                Вернуться на активную доску
              </button>
            </div>
          )}

          {/* Main Board Workspace Row: Columns Workspace + Chat Sidebar (At Column Level Down to Bottom) */}
          <div className="board-workspace-row" style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%', overflow: 'hidden', position: 'relative' }}>
            {/* Kaban Projects & Folders Tree Navigation Sidebar */}
            <ProjectTreeSidebar
              projects={projects}
              tasks={tasks}
              activeView={activeView}
              onChangeView={setActiveView}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
              selectedAssigneeId={selectedAssigneeId}
              onSelectAssignee={setSelectedAssigneeId}
              currentUser={currentUser}
              activeDepartmentId={activeDepartmentId}
              onAddNewProject={handleAddNewProject}
              isArchiveView={isArchiveView}
              onToggleArchiveView={setIsArchiveView}
            />

            {activeView === 'board' ? (
              <main className="board-container" style={{ flex: 1, minWidth: 0, height: '100%', overflowX: 'auto', display: 'flex' }}>
                {columns.map((col) => {
                  const colTasks = filteredTasks.filter((t) => t.status === col.id && !t.parent_task_id);

                  return (
                    <KanbanColumn
                      key={col.id}
                      column={col}
                      tasks={colTasks}
                      allTasks={tasks}
                      teamMembers={teamMembers}
                      sections={sections}
                      onEditTask={handleEditTask}
                      onSaveTask={handleSaveTask}
                      onQuickAddTask={handleQuickAdd}
                      onInlineCreateTask={handleInlineCreateTask}
                      onShareToChat={handleShareTaskToChat}
                      onDropTask={handleDropTask}
                      activeDepartmentId={activeDepartmentId}
                      activeStopwatchTaskId={activeStopwatchTaskId}
                      onToggleStopwatch={handleToggleStopwatch}
                      currentUser={currentUser}
                      onUpdateColumn={handleUpdateColumn}
                      onOpenFullModal={(task) => {
                        setTaskToEdit(task);
                        setIsTaskModalOpen(true);
                      }}
                    />
                  );
                })}
              </main>
            ) : activeView === 'gantt' ? (
              <GanttChart
                tasks={filteredTasks}
                allTasks={tasks}
                teamMembers={teamMembers}
                sections={sections}
                onEditTask={handleEditTask}
                onSaveTask={handleSaveTask}
                onQuickAddTask={handleQuickAdd}
              />
            ) : (
              <MonthlyReport
                tasks={tasks}
                teamMembers={teamMembers}
                sections={sections}
                selectedAssigneeId={selectedAssigneeId}
                selectedMember={selectedFilterMember}
                onSelectAssignee={setSelectedAssigneeId}
                onEditTask={handleEditTask}
                theme={theme}
              />
            )}

            {/* Right Dock: Task Chat & Details Panel (when task selected) OR Department Chat Sidebar */}
            {activeTaskInPanel ? (
              <TaskChatPanel
                task={activeTaskInPanel}
                allTasks={tasks}
                columns={columns}
                teamMembers={teamMembers}
                departments={departments}
                sections={sections}
                currentUser={currentUser}
                activeDepartmentId={activeDepartmentId}
                activeStopwatchTaskId={activeStopwatchTaskId}
                onToggleStopwatch={handleToggleStopwatch}
                stopwatchElapsedSec={stopwatchElapsedSec}
                formatStopwatchTime={formatStopwatchTime}
                onSaveTask={handleSaveTask}
                onNotifyMention={handleNotifyMention}
                onSelectTask={(child) => setActiveTaskInPanel(child)}
                onClose={() => {
                  setActiveTaskInPanel(null);
                  if (window.location.hash.startsWith('#task/')) {
                    window.location.hash = '';
                  }
                }}
                showToast={showToast}
              />
            ) : (
              <ChatSidebar
                currentUser={currentUser}
                departments={departments}
                tasks={tasks}
                teamMembers={teamMembers}
                onOpenTask={(id) => {
                  const clean = String(id || '').trim();
                  const matched = tasks.find(
                    (t) => String(t.id).toLowerCase() === clean.toLowerCase() ||
                           String(t.display_id || '').toLowerCase() === clean.toLowerCase() ||
                           String(t.display_id || '').toLowerCase() === clean.toLowerCase().replace(/^#/, '')
                  );
                  if (matched) {
                    setActiveTaskInPanel(matched);
                    setIsChatSidebarOpen(true);
                  }
                }}
                preQuotedTask={chatPreQuotedTask}
                onClearPreQuotedTask={() => setChatPreQuotedTask(null)}
                isOpen={isChatSidebarOpen}
                onToggleOpen={(open) => {
                  setIsChatSidebarOpen(open);
                  localStorage.setItem('kaban_chat_open', String(open));
                }}
              />
            )}
          </div>

      {/* Task Creation / Editing Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        initialStatus={initialModalStatus}
        teamMembers={teamMembers}
        projects={projects}
        sections={sections}
        columns={columns}
        currentUser={currentUser}
        allTasks={tasks}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onNotifyMention={handleNotifyMention}
        showToast={showToast}
      />

      {/* Smart Import from ERP/Excel Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        sections={sections}
        teamMembers={teamMembers}
        onImportTasks={handleImportTasks}
      />

      {/* Team Members Modal */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setEditingMemberId(null);
        }}
        teamMembers={teamMembers}
        currentUser={currentUser}
        departments={departments}
        onUpdateMember={handleUpdateMember}
        onDeleteMember={handleDeleteMember}
        onVerifyMember={handleVerifyMember}
        initialEditingId={editingMemberId}
        showToast={showToast}
      />

      {/* User Profile Customization Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        departments={departments}
        onSaveProfile={handleSaveProfile}
        showToast={showToast}
      />

      {/* Access Requests Modal (Level 10 Chief Rights) */}
      <AccessRequestsModal
        isOpen={isAccessRequestsModalOpen}
        onClose={() => setIsAccessRequestsModalOpen(false)}
        requests={accessRequests}
        teamMembers={teamMembers}
        departments={departments}
        onApproveRequest={handleApproveAccessRequest}
        onRejectRequest={handleRejectAccessRequest}
        showToast={showToast}
      />

      {/* Project Sections Management Modal */}
      <SectionsModal
        isOpen={isSectionsModalOpen}
        onClose={() => setIsSectionsModalOpen(false)}
        sections={sections}
        onSaveSections={handleSaveSections}
        currentUser={currentUser}
      />

      {/* Kanban Columns Management Modal */}
      <ColumnsModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={columns}
        onSaveColumns={handleSaveColumns}
        tasks={tasks}
      />

      {/* Settings & Departments & Feedback Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        showToast={showToast}
      />



      {/* Auth Modal (can be opened as dialog to switch profile or re-auth) */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          teamMembers={teamMembers}
          departments={departments}
          currentUser={currentUser}
          onSelectUser={handleSelectCurrentUser}
          isStandalonePage={false}
        />
      )}

      {/* Toast Feedback */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{t.icon}</span>
            <span style={{ flex: 1 }}>{t.msg}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                opacity: 0.6,
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: '0.85rem'
              }}
              title="Закрыть"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
