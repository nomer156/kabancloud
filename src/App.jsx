import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { COLUMNS, DEFAULT_COLUMNS, DEPARTMENTS, DEFAULT_PERMISSIONS, hasPermission } from './lib/constants';
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

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('kaban_theme') || 'dark');

  // Navigation view: 'board' | 'report'
  const [activeView, setActiveView] = useState('board');

  // Hash routing for Jira full page view: #task/:id
  const [detailTaskId, setDetailTaskId] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#task/')) {
      return window.location.hash.replace('#task/', '');
    }
    return null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.startsWith('#task/')) {
        const id = window.location.hash.replace('#task/', '');
        setDetailTaskId(id);
      } else {
        setDetailTaskId(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // App data state
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [columns, setColumns] = useState(() => DEFAULT_COLUMNS || COLUMNS);
  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [activeDepartmentId, setActiveDepartmentId] = useState(() => localStorage.getItem('kaban_active_department') || 'all');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('kaban_current_user');
      if (raw) return JSON.parse(raw);
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAccessRequestsModalOpen, setIsAccessRequestsModalOpen] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);

  // Notifications state
  const [notifications, setNotifications] = useState([]);

  // Toast feedback
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, icon = '✓') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
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

      setTasks(loadedTasks || []);
      setTeamMembers(loadedMembers || []);
      setProjects(loadedProjects || []);
      setSections(loadedSections || []);
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
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadData, showToast]);

  const handleSelectCurrentUser = (user) => {
    if (!user) return;
    setCurrentUser(user);
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
    setCurrentUser(null);
    playSound('click');
    showToast('Вы вышли из профиля', '👋');
  };

  // Active task for full-page Jira view
  const activeDetailTask = useMemo(() => {
    if (!detailTaskId) return null;
    return tasks.find((t) => String(t.id) === String(detailTaskId)) || null;
  }, [detailTaskId, tasks]);

  // Find member selected in filter
  const selectedFilterMember = useMemo(() => {
    if (selectedAssigneeId) return teamMembers.find((m) => m.id === selectedAssigneeId) || null;
    return null;
  }, [selectedAssigneeId, teamMembers]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 0. Department filter (includes cross-department collaborative tasks)
      if (activeDepartmentId && activeDepartmentId !== 'all') {
        const taskDept = task.department_id || 'dept-design';
        const isParticipant = Array.isArray(task.participant_ids) && currentUser && task.participant_ids.includes(currentUser.id) && (currentUser.department_id === activeDepartmentId);
        const isAssignee = currentUser && task.assignee_id === currentUser.id && (currentUser.department_id === activeDepartmentId);
        if (taskDept !== activeDepartmentId && !isParticipant && !isAssignee) {
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

      // 4. Project filter
      if (selectedProject && task.project_code !== selectedProject) {
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
  }, [tasks, activeDepartmentId, selectedAssigneeId, selectedSection, selectedProject, searchQuery]);

  // Handle Drag & Drop move
  const handleDropTask = async (taskId, newStatus) => {
    if (!hasPermission(currentUser, 'can_move_task', permissionsMatrix)) {
      showToast('У вашего уровня доступа нет прав на перемещение карточек', '🔒');
      return;
    }
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

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
      await updateTaskStatus(taskId, newStatus);
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

    const isEditing = Boolean(taskData.id);
    if (isEditing) {
      setTasks((prev) => prev.map((t) => (t.id === taskData.id ? { ...t, ...taskData } : t)));
      showToast('Карточка успешно сохранена');
    } else {
      const tempId = `temp-${Date.now()}`;
      setTasks((prev) => [{ ...taskData, id: tempId }, ...prev]);
      showToast('Новая задача создана');
    }

    try {
      const saved = await saveTask(taskData);
      setTasks((prev) => {
        const withoutTemp = prev.filter((t) => !t.id.startsWith('temp-'));
        const index = withoutTemp.findIndex((t) => t.id === saved.id);
        if (index >= 0) {
          const next = [...withoutTemp];
          next[index] = saved;
          return next;
        }
        return [saved, ...withoutTemp];
      });
    } catch (e) {
      console.error('Ошибка сохранения задачи:', e);
    }
  };

  // YouGile Inline Task Creation in any Column
  const handleInlineCreateTask = async (columnId, title) => {
    if (!title || !title.trim()) return;
    if (!hasPermission(currentUser, 'can_create_task', permissionsMatrix)) {
      showToast('У вашего уровня доступа нет прав на создание задач', '🔒');
      return;
    }
    const dept = activeDepartmentId !== 'all' ? activeDepartmentId : (currentUser?.department_id || 'dept-design');
    const newTask = {
      id: `task-uf-${Date.now()}`,
      title: title.trim(),
      status: columnId,
      priority: 'medium',
      department_id: dept,
      assignee_id: currentUser?.id || null,
      section: sections[0]?.id || 'ВДН',
      project_code: projects[0] || 'ЖК «Агидель»',
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
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Задача удалена', '🗑️');
    try {
      await deleteTask(taskId);
    } catch (e) {
      console.error('Ошибка удаления задачи:', e);
    }
  };

  // Update team member
  const handleUpdateMember = async (member) => {
    const updated = await saveTeamMember(member);
    setTeamMembers(updated);
    if (currentUser?.id === member.id) {
      setCurrentUser(member);
    }
    showToast('Профиль сотрудника обновлен');
  };

  // Delete team member
  const handleDeleteMember = async (memberId) => {
    const updated = await deleteTeamMember(memberId);
    setTeamMembers(updated);
    if (currentUser?.id === memberId) {
      setCurrentUser(updated[0] || null);
    }
    if (selectedAssigneeId === memberId) {
      setSelectedAssigneeId(null);
    }
    showToast('Сотрудник удален');
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
      const updated = await saveTeamMember(updatedProfile);
      setTeamMembers(updated);
      if (currentUser?.id === updatedProfile.id) {
        setCurrentUser(updatedProfile);
        saveCurrentUserLocally(updatedProfile);
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
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (task) {
      window.location.hash = `#task/${taskId}`;
      setDetailTaskId(taskId);
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

  // Edit task
  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setInitialModalStatus(task.status);
    setIsTaskModalOpen(true);
  };

  // If not logged in and loading is complete: show standalone Auth screen (no reading without auth)
  if (!loading && !currentUser) {
    return (
      <div className="app-layout">
        <AuthModal
          isOpen={true}
          teamMembers={teamMembers}
          departments={departments}
          currentUser={currentUser}
          onSelectUser={handleSelectCurrentUser}
          isStandalonePage={true}
        />
        {/* Toast Feedback */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <span>{t.icon}</span>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-root-shell" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Left Column: Full Main Workspace */}
      <div className="app-main-workspace" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Detail Task Page (Jira view in new tab or direct link) */}
      {detailTaskId ? (
        activeDetailTask ? (
          <TaskDetailView
            task={activeDetailTask}
            teamMembers={teamMembers}
            projects={projects}
            sections={sections}
            columns={columns}
            currentUser={currentUser}
            onSaveTask={handleSaveTask}
            onDeleteTask={(id) => {
              handleDeleteTask(id);
              window.location.hash = '';
              setDetailTaskId(null);
            }}
            onBack={() => {
              window.location.hash = '';
              setDetailTaskId(null);
            }}
            onNotifyMention={handleNotifyMention}
          />
        ) : (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--text-primary)' }}>
              {loading ? 'Загрузка данных задачи...' : 'Задача не найдена или была удалена'}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
              {loading ? 'Пожалуйста, подождите...' : `ID: ${detailTaskId}`}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                window.location.hash = '';
                setDetailTaskId(null);
              }}
            >
              Вернуться на доску
            </button>
          </div>
        )
      ) : (
        <>
          {/* Top Navigation Header */}
          <Header
            tasks={tasks}
            teamMembers={teamMembers}
            currentUser={currentUser}
            onSelectCurrentUser={handleSelectCurrentUser}
            onLogout={handleLogout}
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

          {/* YouGile Department Switcher Bar */}
          <DepartmentBar
            departments={departments}
            activeDepartmentId={activeDepartmentId}
            onSelectDepartment={(id) => {
              setActiveDepartmentId(id);
              localStorage.setItem('kaban_active_department', id);
            }}
            tasks={tasks}
          />

          {/* Filter and Search Bar */}
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

          {/* Main Workspace View: Board vs Monthly Report */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
            {activeView === 'board' ? (
              <main className="board-container" style={{ flex: 1, minWidth: 0, overflowX: 'auto', display: 'flex' }}>
                {columns.map((col) => {
                  const colTasks = filteredTasks.filter((t) => t.status === col.id);

                  return (
                    <KanbanColumn
                      key={col.id}
                      column={col}
                      tasks={colTasks}
                      teamMembers={teamMembers}
                      sections={sections}
                      onEditTask={handleEditTask}
                      onQuickAddTask={handleQuickAdd}
                      onInlineCreateTask={handleInlineCreateTask}
                      onShareToChat={handleShareTaskToChat}
                      onDropTask={handleDropTask}
                    />
                  );
                })}
              </main>
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
          </div>
        </>
      )}

            </div>

      {/* Right Column: Full-Height Docked Chat Sidebar (Stretches from very bottom to very top of screen 100vh!) */}
      <ChatSidebar
        currentUser={currentUser}
        departments={departments}
        tasks={tasks}
        teamMembers={teamMembers}
        onOpenTask={(id) => {
          window.location.hash = '#task/' + id;
        }}
        preQuotedTask={chatPreQuotedTask}
        onClearPreQuotedTask={() => setChatPreQuotedTask(null)}
        isOpen={isChatSidebarOpen}
        onToggleOpen={(open) => {
          setIsChatSidebarOpen(open);
          localStorage.setItem('kaban_chat_open', String(open));
        }}
      />

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
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onNotifyMention={handleNotifyMention}
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
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        teamMembers={teamMembers}
        departments={departments}
        currentUser={currentUser}
        onSelectUser={handleSelectCurrentUser}
        isStandalonePage={false}
      />

      {/* Toast Feedback */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.icon}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
