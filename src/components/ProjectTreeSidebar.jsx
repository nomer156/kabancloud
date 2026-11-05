import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  BarChart2,
  FileText,
  User,
  Zap,
  Link2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Layers,
  Sparkles,
  Plus,
  Building,
  CheckCircle2
} from 'lucide-react';
import { playSound } from '../lib/sound';

export function ProjectTreeSidebar({
  projects = [],
  tasks = [],
  activeView = 'board',
  onChangeView,
  selectedProject = null,
  onSelectProject,
  selectedAssigneeId = null,
  onSelectAssignee,
  currentUser = null,
  activeDepartmentId = 'dept-design',
  onAddNewProject
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('kaban_tree_sidebar_collapsed') === 'true';
  });

  const [expandedFolders, setExpandedFolders] = useState(() => {
    const initial = {};
    if (projects.length > 0) {
      initial[projects[0]] = true;
    }
    return initial;
  });

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('kaban_tree_sidebar_collapsed', String(next));
    playSound('click');
  };

  const toggleFolder = (projName, e) => {
    if (e) e.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [projName]: !prev[projName]
    }));
  };

  // Task statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const myTasks = currentUser ? tasks.filter((t) => t.assignee_id === currentUser.id).length : 0;
    const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;
    const mirrored = tasks.filter((t) => Array.isArray(t.mirrored_departments) && t.mirrored_departments.length > 0).length;

    // Per-project task counts
    const projectCounts = {};
    projects.forEach((p) => {
      projectCounts[p] = tasks.filter((t) => (t.project_code === p || t.project_cipher === p)).length;
    });

    return { total, myTasks, urgent, mirrored, projectCounts };
  }, [tasks, projects, currentUser]);

  const handleCreateProjectSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    if (onAddNewProject) {
      await onAddNewProject(trimmed);
    }
    setNewProjectName('');
    setIsAddingProject(false);
    playSound('success');
  };

  // Generate consistent color hash for project folders
  const getProjectColor = (name) => {
    const colors = ['#ff6600', '#0284c7', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <aside
      className={`yougile-tree-sidebar ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        width: isCollapsed ? '52px' : '230px',
        minWidth: isCollapsed ? '52px' : '230px',
        maxWidth: isCollapsed ? '52px' : '230px',
        height: '100%',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s ease',
        userSelect: 'none',
        zIndex: 10,
        overflow: 'hidden'
      }}
    >
      {/* 1. Header / Workspace Branding */}
      <div
        style={{
          padding: isCollapsed ? '0.65rem 0' : '0.65rem 0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: '44px',
          background: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '6px',
                background: 'linear-gradient(135deg, var(--accent-orange), #ff8800)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.72rem',
                flexShrink: 0
              }}
            >
              УФ
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                YouGile • Проекты
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                Уфанет Москва
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Развернуть дерево проектов' : 'Свернуть боковую панель'}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* 2. Scrollable Body: Views + Shortcuts + Project Tree */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isCollapsed ? '0.4rem 0' : '0.5rem 0.45rem' }}>
        {/* Section A: Views (Board / Gantt / Report) */}
        {!isCollapsed && (
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.3rem 0.5rem 0.2rem' }}>
            Режимы
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '0.6rem' }}>
          <button
            type="button"
            onClick={() => { onChangeView('board'); playSound('click'); }}
            title="Канбан-доска задач"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isCollapsed ? '0.5rem 0' : '0.4rem 0.6rem',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              background: activeView === 'board' ? 'rgba(255, 102, 0, 0.12)' : 'transparent',
              color: activeView === 'board' ? 'var(--accent-orange)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: activeView === 'board' ? 700 : 500,
              fontSize: '0.78rem',
              width: '100%'
            }}
          >
            <LayoutGrid size={15} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>Канбан-доска</span>}
          </button>

          <button
            type="button"
            onClick={() => { onChangeView('gantt'); playSound('click'); }}
            title="Диаграмма Ганта (Таймлайн)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isCollapsed ? '0.5rem 0' : '0.4rem 0.6rem',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              background: activeView === 'gantt' ? 'rgba(2, 132, 199, 0.14)' : 'transparent',
              color: activeView === 'gantt' ? '#0284c7' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: activeView === 'gantt' ? 700 : 500,
              fontSize: '0.78rem',
              width: '100%'
            }}
          >
            <BarChart2 size={15} style={{ flexShrink: 0, transform: 'rotate(90deg)' }} />
            {!isCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Диаграмма Ганта</span>
                <span style={{ fontSize: '0.58rem', background: 'rgba(2, 132, 199, 0.2)', color: '#0284c7', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                  GANTT
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => { onChangeView('report'); playSound('click'); }}
            title="Табель выработки часов"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isCollapsed ? '0.5rem 0' : '0.4rem 0.6rem',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              background: activeView === 'report' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              color: activeView === 'report' ? '#10b981' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: activeView === 'report' ? 700 : 500,
              fontSize: '0.78rem',
              width: '100%'
            }}
          >
            <FileText size={15} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>Табель (ЗП)</span>}
          </button>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.35rem 0' }} />

        {/* Section B: Personal Shortcuts («Моё») */}
        {!isCollapsed && (
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.3rem 0.5rem 0.2rem' }}>
            Быстрые фильтры
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '0.6rem' }}>
          {/* 1. All Tasks */}
          <button
            type="button"
            onClick={() => {
              if (onSelectAssignee) onSelectAssignee(null);
              if (onSelectProject) onSelectProject(null);
              playSound('click');
            }}
            title="Все задачи филиала"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              padding: isCollapsed ? '0.5rem 0' : '0.35rem 0.6rem',
              background: !selectedAssigneeId && !selectedProject ? 'var(--bg-hover)' : 'transparent',
              color: !selectedAssigneeId && !selectedProject ? 'var(--text-main)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} style={{ color: 'var(--accent-orange)' }} />
              {!isCollapsed && <span>Все задачи</span>}
            </div>
            {!isCollapsed && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', background: 'var(--bg-base)', padding: '1px 5px', borderRadius: '10px' }}>
                {stats.total}
              </span>
            )}
          </button>

          {/* 2. My Tasks */}
          {currentUser && (
            <button
              type="button"
              onClick={() => {
                if (onSelectAssignee) {
                  onSelectAssignee(selectedAssigneeId === currentUser.id ? null : currentUser.id);
                }
                playSound('click');
              }}
              title="Мои персональные задачи"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '0.5rem 0' : '0.35rem 0.6rem',
                background: selectedAssigneeId === currentUser.id ? 'rgba(255, 102, 0, 0.15)' : 'transparent',
                color: selectedAssigneeId === currentUser.id ? 'var(--accent-orange)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                width: '100%',
                fontWeight: selectedAssigneeId === currentUser.id ? 700 : 500
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} style={{ color: selectedAssigneeId === currentUser.id ? 'var(--accent-orange)' : 'inherit' }} />
                {!isCollapsed && <span>Мои задачи</span>}
              </div>
              {!isCollapsed && stats.myTasks > 0 && (
                <span style={{ fontSize: '0.68rem', color: '#fff', background: 'var(--accent-orange)', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                  {stats.myTasks}
                </span>
              )}
            </button>
          )}

          {/* 3. Urgent / Blocker tasks */}
          {stats.urgent > 0 && (
            <button
              type="button"
              onClick={() => {
                if (onSelectProject) onSelectProject(null);
                playSound('click');
              }}
              title="Срочные / горящие задачи"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '0.5rem 0' : '0.35rem 0.6rem',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={14} style={{ color: '#ef4444' }} />
                {!isCollapsed && <span>Срочные</span>}
              </div>
              {!isCollapsed && (
                <span style={{ fontSize: '0.68rem', color: '#fff', background: '#ef4444', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                  {stats.urgent}
                </span>
              )}
            </button>
          )}

          {/* 4. Mirrored Tasks */}
          {stats.mirrored > 0 && (
            <button
              type="button"
              onClick={() => {
                playSound('click');
              }}
              title="Зеркальные задачи смежных отделов"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '0.5rem 0' : '0.35rem 0.6rem',
                background: 'rgba(139, 92, 246, 0.08)',
                color: '#8b5cf6',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={14} style={{ color: '#8b5cf6' }} />
                {!isCollapsed && <span>Зеркала</span>}
              </div>
              {!isCollapsed && (
                <span style={{ fontSize: '0.68rem', color: '#fff', background: '#8b5cf6', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                  {stats.mirrored}
                </span>
              )}
            </button>
          )}
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.35rem 0' }} />

        {/* Section C: Projects and Folders Tree (YouGile Core Architecture) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isCollapsed ? '0.3rem 0' : '0.3rem 0.5rem 0.2rem' }}>
          {!isCollapsed && (
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Проекты ({projects.length})
            </div>
          )}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsAddingProject(!isAddingProject)}
              title="Добавить новый проект"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-orange)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Add Project Inline Form */}
        {!isCollapsed && isAddingProject && (
          <form onSubmit={handleCreateProjectSubmit} style={{ padding: '0.3rem 0.4rem 0.5rem', display: 'flex', gap: '4px' }}>
            <input
              type="text"
              autoFocus
              className="form-input"
              placeholder="Название проекта..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', height: 28 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0 0.5rem', height: 28, fontSize: '0.75rem' }}
            >
              ✓
            </button>
          </form>
        )}

        {/* Projects Tree List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {projects.map((proj) => {
            const isSelected = selectedProject === proj;
            const isExpanded = Boolean(expandedFolders[proj]);
            const taskCount = stats.projectCounts[proj] || 0;
            const projColor = getProjectColor(proj);

            return (
              <div key={proj} style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  onClick={() => {
                    if (onSelectProject) {
                      onSelectProject(isSelected ? null : proj);
                    }
                    playSound('click');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    padding: isCollapsed ? '0.45rem 0' : '0.35rem 0.45rem',
                    background: isSelected ? 'rgba(255, 102, 0, 0.12)' : 'transparent',
                    color: isSelected ? 'var(--accent-orange)' : 'var(--text-muted)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontWeight: isSelected ? 700 : 500,
                    width: '100%',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    {!isCollapsed && (
                      <span
                        onClick={(e) => toggleFolder(proj, e)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--text-dim)',
                          padding: '2px',
                          cursor: 'pointer'
                        }}
                      >
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </span>
                    )}

                    <span style={{ color: projColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                    </span>

                    {!isCollapsed && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                        {proj}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: taskCount > 0 ? (isSelected ? 'var(--accent-orange)' : 'var(--text-dim)') : 'transparent',
                        background: taskCount > 0 ? 'var(--bg-base)' : 'transparent',
                        padding: '1px 5px',
                        borderRadius: '8px',
                        flexShrink: 0
                      }}
                    >
                      {taskCount}
                    </span>
                  )}
                </div>

                {/* Sub-boards inside project folder when expanded */}
                {!isCollapsed && isExpanded && (
                  <div style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1px', margin: '2px 0 4px' }}>
                    <div
                      onClick={() => {
                        if (onSelectProject) onSelectProject(proj);
                        onChangeView('board');
                        playSound('click');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        color: isSelected && activeView === 'board' ? 'var(--accent-orange)' : 'var(--text-dim)',
                        padding: '0.25rem 0.4rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: isSelected && activeView === 'board' ? 700 : 400
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = isSelected && activeView === 'board' ? 'var(--accent-orange)' : 'var(--text-dim)'; }}
                    >
                      <LayoutGrid size={12} />
                      <span>Канбан-доска</span>
                    </div>

                    <div
                      onClick={() => {
                        if (onSelectProject) onSelectProject(proj);
                        onChangeView('gantt');
                        playSound('click');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        color: isSelected && activeView === 'gantt' ? '#0284c7' : 'var(--text-dim)',
                        padding: '0.25rem 0.4rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: isSelected && activeView === 'gantt' ? 700 : 400
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = isSelected && activeView === 'gantt' ? '#0284c7' : 'var(--text-dim)'; }}
                    >
                      <BarChart2 size={12} style={{ transform: 'rotate(90deg)' }} />
                      <span>Диаграмма Ганта</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
