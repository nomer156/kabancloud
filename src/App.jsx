import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { COLUMNS } from './lib/constants';
import { 
  fetchAllTasks, 
  saveTask, 
  deleteTask, 
  updateTaskStatus, 
  fetchTeamMembers, 
  saveTeamMember, 
  fetchProjectsList, 
  addProjectItem, 
  subscribeToRealtimeChanges
} from './lib/api';
import { playSound } from './lib/sound';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KanbanColumn } from './components/KanbanColumn';
import { TaskModal } from './components/TaskModal';
import { NetworkModal } from './components/NetworkModal';
import { TeamModal } from './components/TeamModal';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('kaban_theme') || 'dark');

  // App data state
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(null);
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [initialModalStatus, setInitialModalStatus] = useState('backlog');
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

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
      const [loadedTasks, loadedMembers, loadedProjects] = await Promise.all([
        fetchAllTasks(),
        fetchTeamMembers(),
        fetchProjectsList()
      ]);

      setTasks(loadedTasks || []);
      setTeamMembers(loadedMembers || []);
      setProjects(loadedProjects || []);

      // Restore current user or set default
      const savedUserId = localStorage.getItem('kaban_current_user_id');
      const found = loadedMembers?.find((m) => m.id === savedUserId);
      if (found) {
        setCurrentUser(found);
      } else if (loadedMembers && loadedMembers.length > 0) {
        setCurrentUser(loadedMembers[0]);
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to Server-Sent Events (SSE) Realtime updates from colleagues on the LAN!
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
        showToast('Задача обновлена коллегой (LAN)', '⚡');
      } else if (event.type === 'TASK_DELETED') {
        setTasks((prev) => prev.filter((t) => t.id !== event.payload.id));
      } else if (event.type === 'MEMBERS_UPDATED') {
        setTeamMembers(event.payload);
      } else if (event.type === 'PROJECTS_UPDATED') {
        setProjects(event.payload);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadData, showToast]);

  const handleSelectCurrentUser = (user) => {
    setCurrentUser(user);
    if (user?.id) localStorage.setItem('kaban_current_user_id', user.id);
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. My tasks filter
      if (onlyMyTasks && currentUser) {
        if (task.assignee_id !== currentUser.id) return false;
      }

      // 2. Assignee filter
      if (selectedAssigneeId && task.assignee_id !== selectedAssigneeId) {
        return false;
      }

      // 3. Section filter
      if (selectedSection && task.section !== selectedSection) {
        return false;
      }

      // 4. Project filter
      if (selectedProject && task.project_code !== selectedProject) {
        return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        const projectMatch = task.project_code?.toLowerCase().includes(q);
        const linkMatch = task.network_link?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !projectMatch && !linkMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, onlyMyTasks, currentUser, selectedAssigneeId, selectedSection, selectedProject, searchQuery]);

  // Handle Drag & Drop move
  const handleDropTask = async (taskId, newStatus) => {
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
    showToast('Профиль инженера обновлен');
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedAssigneeId(null);
    setOnlyMyTasks(false);
    setSelectedSection(null);
    setSelectedProject(null);
    setSearchQuery('');
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

  return (
    <div className="app-layout">
      {/* Top Navigation Header */}
      <Header
        tasks={tasks}
        teamMembers={teamMembers}
        currentUser={currentUser}
        onSelectCurrentUser={handleSelectCurrentUser}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenNewTask={() => handleQuickAdd('backlog')}
        onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        teamMembers={teamMembers}
        projects={projects}
        selectedAssigneeId={selectedAssigneeId}
        onSelectAssignee={setSelectedAssigneeId}
        onlyMyTasks={onlyMyTasks}
        onToggleOnlyMyTasks={() => setOnlyMyTasks((prev) => !prev)}
        selectedSection={selectedSection}
        onSelectSection={setSelectedSection}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onResetFilters={handleResetFilters}
      />

      {/* 4 Kanban Columns Board */}
      <main className="board-container">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={colTasks}
              teamMembers={teamMembers}
              onEditTask={handleEditTask}
              onMoveColumn={handleDropTask}
              onDeleteTask={handleDeleteTask}
              onQuickAddTask={handleQuickAdd}
              onDropTask={handleDropTask}
            />
          );
        })}
      </main>

      {/* Task Creation / Editing Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        initialStatus={initialModalStatus}
        teamMembers={teamMembers}
        projects={projects}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Local LAN Network Modal */}
      <NetworkModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
      />

      {/* Team 6 Members Modal */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        teamMembers={teamMembers}
        onUpdateMember={handleUpdateMember}
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
