import React, { useState } from 'react';
import { 
  Calendar, 
  FolderGit2, 
  CheckSquare, 
  Copy, 
  Check, 
  Flame, 
  Clock,
  Briefcase,
  ExternalLink,
  MapPin,
  MessageSquare,
  Link2,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  UploadCloud
} from 'lucide-react';
import { PRIORITIES, DEPARTMENTS, formatPathEnd, DEFAULT_STICKERS } from '../lib/constants';
import { playSound } from '../lib/sound';
import { openFolderInExplorer, uploadTaskFile } from '../lib/api';
import { renderWithMentions } from '../lib/mentions';

export function TaskCard({
  task,
  teamMembers,
  sections,
  onEdit,
  onDragStart,
  onShareToChat,
  activeDepartmentId,
  activeStopwatchTaskId,
  onToggleStopwatch,
  allTasks = [],
  currentUser,
  onSaveTask,
  onOpenFullModal,
  showToast
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const [isAddingCardSubtask, setIsAddingCardSubtask] = useState(false);
  const [quickSubtaskTitle, setQuickSubtaskTitle] = useState('');
  const [isFileOver, setIsFileOver] = useState(false);

  // Check if task is running live stopwatch
  const isStopwatchActive = activeStopwatchTaskId === task.id;

  // Check if task is mirrored from another department
  const isMirroredTarget = Boolean(
    activeDepartmentId && 
    activeDepartmentId !== 'all' && 
    task.department_id !== activeDepartmentId && 
    Array.isArray(task.mirrored_departments) && 
    task.mirrored_departments.includes(activeDepartmentId)
  );

  const isMirroredSource = Array.isArray(task.mirrored_departments) && task.mirrored_departments.length > 0;
  const isMirrored = isMirroredTarget;

  // Find department metadata
  const deptMeta = DEPARTMENTS.find((d) => d.id === task.department_id) || DEPARTMENTS[0];

  // Find section metadata from dynamic sections
  const sectionMeta = sections?.find((s) => s.id === task.section) || {
    id: task.section || 'ВДН',
    name: task.section || 'ВДН',
    color: '#ff6600',
    bg: 'rgba(255, 102, 0, 0.15)',
    border: 'rgba(255, 102, 0, 0.35)'
  };

  // Find priority metadata
  const priorityMeta = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[1];

  // Find assignee
  const assignee = teamMembers.find((m) => m.id === task.assignee_id);

  // 1. Checklist items (checkboxes on task)
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const totalChecks = checklist.length;
  const doneChecks = checklist.filter((c) => c.done || c.completed).length;

  // 2. Real Hierarchical Subtasks (child tasks in tasks array)
  const childTasks = React.useMemo(() => {
    if (!Array.isArray(allTasks) || allTasks.length === 0) return [];
    return allTasks.filter((t) => t.parent_task_id === task.id);
  }, [allTasks, task.id]);
  const totalChildTasks = childTasks.length;
  const doneChildTasks = childTasks.filter((t) => t.status === 'done').length;

  // Combined for member pills
  const subtasksList = totalChildTasks > 0 ? childTasks : (Array.isArray(task.subtasks) ? task.subtasks : []);
  const totalSubtasks = totalChildTasks > 0 ? totalChildTasks : totalChecks;
  const doneSubtasks = totalChildTasks > 0 ? doneChildTasks : doneChecks;
  const subtasksPercent = totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0;

  // Distinct subtask assignees for YouGile multi-assignee visualization
  const distinctSubtaskMembers = React.useMemo(() => {
    const ids = [...new Set(subtasksList.map((s) => s.assignee_id).filter(Boolean))];
    return ids
      .filter((id) => id !== task.assignee_id)
      .map((id) => teamMembers.find((m) => m.id === id))
      .filter(Boolean);
  }, [subtasksList, task.assignee_id, teamMembers]);

  // Due date human calculation
  let deadlineBadge = null;
  if (task.due_date && task.status !== 'done') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      deadlineBadge = {
        type: 'overdue',
        text: `Просрочено на ${Math.abs(diffDays)} дн.`,
        color: '#ef4444'
      };
    } else if (diffDays === 0) {
      deadlineBadge = {
        type: 'today',
        text: 'Срок: Сегодня',
        color: '#f97316'
      };
    } else if (diffDays === 1) {
      deadlineBadge = {
        type: 'tomorrow',
        text: 'Срок: Завтра',
        color: '#f97316'
      };
    } else {
      const monthNamesShort = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
      deadlineBadge = {
        type: 'normal',
        text: `До ${due.getDate()} ${monthNamesShort[due.getMonth()]}`,
        color: '#38bdf8'
      };
    }
  }

  // Open task in docked task chat & panel
  const handleOpenTask = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onEdit(task);
    window.location.hash = `#task/${encodeURIComponent(task.id)}`;
  };

  const handleMiddleClick = (e) => {
    if (e.button === 1) { // Middle mouse wheel click!
      e.preventDefault();
      e.stopPropagation();
      handleOpenTask(e);
    }
  };

  const handleCardDragOver = (e) => {
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsFileOver(true);
    }
  };

  const handleCardDragLeave = () => {
    setIsFileOver(false);
  };

  const handleCardDrop = async (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsFileOver(false);
      const file = e.dataTransfer.files[0];
      try {
        const uploaded = await uploadTaskFile(file, currentUser?.full_name || 'Инженер');
        const updatedFiles = [...(task.files || []), uploaded];
        if (onSaveTask) {
          onSaveTask({ ...task, files: updatedFiles });
        }
        playSound('success');
      } catch (err) {
        console.error('Ошибка загрузки файла на карточку:', err);
      }
    }
  };

  // Copy network link
  const handleCopyLink = (e) => {
    if (e) e.stopPropagation();
    if (task.network_link) {
      navigator.clipboard.writeText(task.network_link);
      setCopiedLink(true);
      playSound('click');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Open folder in Windows Explorer or open web links directly
  const handleOpenFolder = async (e) => {
    if (e) e.stopPropagation();
    if (!task.network_link) return;
    const cleanPath = task.network_link.trim();
    if (/^https?:\/\//i.test(cleanPath)) {
      window.open(cleanPath, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await navigator.clipboard.writeText(cleanPath);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      playSound('click');
      const res = await openFolderInExplorer(cleanPath);
      if (res?.isRemote || !res?.success) {
        if (showToast) showToast('📁 Путь скопирован! Нажмите Win+R -> Ctrl+V -> Enter', '📁');
      } else {
        if (showToast) showToast('Папка открыта в Проводнике Windows', '📁');
      }
    } catch (err) {
      if (showToast) showToast('📁 Путь скопирован! Нажмите Win+R -> Ctrl+V -> Enter', '📁');
    }
  };

  // External Files Drag & Drop onto this Task Card
  const handleDragOverFiles = (e) => {
    if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsFileOver(true);
    }
  };

  const handleDragLeaveFiles = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileOver(false);
  };

  const handleDropFiles = async (e) => {
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsFileOver(false);
      try {
        const newFiles = [...(task.files || [])];
        for (const file of e.dataTransfer.files) {
          const uploaded = await uploadTaskFile(file, currentUser?.full_name || 'Инженер');
          newFiles.push(uploaded);
        }
        if (onSaveTask) {
          onSaveTask({ ...task, files: newFiles });
        }
        playSound('success');
        if (showToast) showToast(`Файлы добавлены в задачу #${task.display_id || task.id}`, '📎');
      } catch (err) {
        if (showToast) showToast('Ошибка при загрузке файлов', '⚠️');
      }
    }
  };

  // Check if ERP data is missing
  const hasErpData = Boolean(task.erp_project_id || task.erp_task_number || task.hours_spent);
  const showErpWarning = !hasErpData && (task.status === 'in_progress' || task.status === 'review' || task.status === 'done');

  return (
    <div
      className={`task-card ${isFileOver ? 'task-card-file-hover' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onEdit(task)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onOpenFullModal) onOpenFullModal(task);
      }}
      onAuxClick={handleMiddleClick}
      onDragOver={handleDragOverFiles}
      onDragLeave={handleDragLeaveFiles}
      onDrop={handleDropFiles}
      style={{
        outline: isFileOver ? '2.5px dashed #ff6600' : 'none',
        boxShadow: isFileOver ? '0 0 20px rgba(255, 102, 0, 0.45)' : undefined,
        transform: isFileOver ? 'scale(1.02)' : undefined,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, outline 0.15s ease'
      }}
    >
      {/* Top Metadata: Department Badge, Section Tag, Project Tag, Priority Indicator, Actions */}
      <div className="card-top-meta" style={{ flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.55rem' }}>
        <div className="card-tags-group" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
          {/* Smart Task ID (e.g. СВН.25261) */}
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.07)',
              color: 'var(--text-main, #f8fafc)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.14))',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            title={`Уникальный ID задачи: ${task.display_id || task.id} (Колёсико мыши — в новой вкладке)`}
          >
            🏷️ {task.display_id || task.id}
          </span>

          {/* Department Badge (YouGile Department Tag) */}
          <span
            className="badge-dept"
            style={{
              backgroundColor: `${deptMeta.color}18`,
              color: deptMeta.color,
              border: `1px solid ${deptMeta.color}44`,
              fontWeight: 700,
              fontSize: '0.67rem',
              padding: '1px 6px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
            title={`Отдел: ${deptMeta.fullName || deptMeta.name}`}
          >
            <span>{deptMeta.icon}</span>
            <span>{deptMeta.name}</span>
          </span>

          {/* Cross-Department Collaborators badge */}
          {Array.isArray(task.participant_ids) && task.participant_ids.length > 0 && (
            <span
              style={{
                fontSize: '0.67rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#c4b5fd',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 700
              }}
              title={`Соисполнители из других отделов: ${task.participant_ids.map(pid => teamMembers.find(m => m.id === pid)?.full_name).filter(Boolean).join(', ')}`}
            >
              👥 +{task.participant_ids.length} соисп.
            </span>
          )}

          {/* Main Project Section Badge (ВДН, ККС, МКЖ...) */}
          <span
            className="badge-section"
            style={{
              backgroundColor: sectionMeta.bg,
              color: sectionMeta.color,
              border: `1px solid ${sectionMeta.border}`,
              fontWeight: 800
            }}
            title={sectionMeta.name}
          >
            {sectionMeta.id}
          </span>

          {/* Bidirectional Mirror Badges */}
          {isMirroredTarget && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#c4b5fd',
                border: '1px solid rgba(139, 92, 246, 0.45)',
                padding: '1px 6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title={`Зеркальная задача из отдела: ${deptMeta.name}`}
            >
              <Link2 size={10} style={{ color: '#a78bfa' }} />
              <span>Зеркало из: {deptMeta.name}</span>
            </span>
          )}

          {isMirroredSource && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                background: 'rgba(59, 130, 246, 0.18)',
                color: '#93c5fd',
                border: '1px solid rgba(59, 130, 246, 0.45)',
                padding: '1px 6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title={`Зеркалировано в отделы: ${task.mirrored_departments.map((id) => DEPARTMENTS.find((d) => d.id === id)?.name || id).join(', ')}`}
            >
              <Link2 size={10} style={{ color: '#60a5fa' }} />
              <span>Зеркалировано в: {task.mirrored_departments.map((id) => DEPARTMENTS.find((d) => d.id === id)?.name || id).join(', ')}</span>
            </span>
          )}

          {/* Project / Object Tag */}
          {task.project_code && (
            <span className="badge-project" title={task.project_code} style={{ maxWidth: 'none' }}>
              {task.project_code}
            </span>
          )}

          {/* House ID Tag (for СВН / ОДРС) */}
          {task.house_id && (
            <span 
              className="badge-project" 
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', background: 'rgba(255, 102, 0, 0.1)', color: 'var(--accent-orange)' }}
              title={`ID Дома: ${task.house_id}`}
            >
              {task.house_id}
            </span>
          )}
        </div>

        {/* Priority Dot, Chat share button & External Link button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {task.priority === 'urgent' && (
            <Flame size={14} style={{ color: '#ef4444' }} title="Высокий приоритет" />
          )}
          <div
            className="card-priority-dot"
            style={{ backgroundColor: priorityMeta.color }}
            title={`Приоритет: ${priorityMeta.name}`}
          />

          {/* Share to Chat button */}
          {onShareToChat && (
            <button
              type="button"
              className="btn-icon"
              style={{ width: 20, height: 20, padding: 0, opacity: 0.65 }}
              onClick={(e) => {
                e.stopPropagation();
                onShareToChat(task);
              }}
              title="Поделиться в чате отдела"
            >
              <MessageSquare size={12} />
            </button>
          )}

          <button
            type="button"
            className="btn-icon"
            style={{ width: 20, height: 20, padding: 0, opacity: 0.55, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/#task/${encodeURIComponent(task.id)}`, '_blank');
            }}
            title="Открыть задачу в новой вкладке (Jira / колёсиком мыши)"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* YouGile Stickers / Метки */}
      {(() => {
        const stickerList = Array.isArray(task.stickers) ? task.stickers : [];
        if (stickerList.length === 0) return null;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '0.15rem 0 0.4rem 0' }}>
            {stickerList.map((stId) => {
              const st = typeof stId === 'object' ? stId : DEFAULT_STICKERS.find((s) => s.id === stId);
              if (!st) return null;
              return (
                <span
                  key={st.id}
                  style={{
                    fontSize: '0.67rem',
                    fontWeight: 800,
                    padding: '1.5px 6px',
                    borderRadius: '4px',
                    backgroundColor: st.bg || 'rgba(255, 102, 0, 0.15)',
                    color: st.color || 'var(--accent-orange)',
                    border: `1px solid ${st.border || 'rgba(255, 102, 0, 0.35)'}`,
                    lineHeight: 1.2
                  }}
                  title={`Стикер: ${st.name}`}
                >
                  {st.name}
                </span>
              );
            })}
          </div>
        );
      })()}

      {/* Title (Click opens task in new browser tab) */}
      <h4
        className="card-title"
        style={{ margin: '0 0 0.5rem 0' }}
      >
        <a
          href={`/#task/${encodeURIComponent(task.display_id || task.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Открыть задачу в отдельной вкладке (Jira-вид)"
          style={{
            color: 'inherit',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '5px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ff6600';
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'inherit';
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          <span>{renderWithMentions(task.title, teamMembers)}</span>
          <ExternalLink size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
        </a>
      </h4>

      {/* Description Preview */}
      {task.description && (
        <div className="card-desc-preview">{renderWithMentions(task.description, teamMembers)}</div>
      )}

      {/* Network / Server Link */}
      {task.network_link && (
        <div
          className="card-network-link"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'space-between' }}
          onClick={handleCopyLink}
          title={`Папка: ${task.network_link}\n(Клик/иконка — скопировать путь, ↗ — перейти / открыть в Проводнике)`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', minWidth: 0, flex: 1 }}>
            <FolderGit2 size={13} style={{ flexShrink: 0, color: 'var(--accent-orange)' }} />
            <span className="card-network-text" style={{ flex: 1, fontFamily: 'var(--font-mono)' }}>
              {formatPathEnd(task.network_link)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn-icon"
              onClick={handleCopyLink}
              title="Скопировать путь к папке"
              style={{ width: 22, height: 22, padding: 0 }}
            >
              {copiedLink ? (
                <Check size={12} style={{ color: '#10b981' }} />
              ) : (
                <Copy size={12} style={{ opacity: 0.7 }} />
              )}
            </button>

            <button
              type="button"
              className="btn-icon"
              onClick={handleOpenFolder}
              title="Перейти к папке / открыть ссылку"
              style={{ width: 22, height: 22, padding: 0, color: 'var(--accent-orange)' }}
            >
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Object Address with Quick Yandex Maps Link */}
      {task.address && (
        <a
          href={`https://yandex.ru/maps/?text=${encodeURIComponent(task.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="card-network-link"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => e.stopPropagation()}
          title={`Адрес объекта: ${task.address} (Кликните для открытия в Яндекс.Картах)`}
        >
          <MapPin size={13} style={{ flexShrink: 0, color: 'var(--accent-orange)' }} />
          <span className="card-network-text">{task.address}</span>
          <ExternalLink size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
        </a>
      )}

      {/* Real Nested Subtasks Tree (YouGile Tree Feature) */}
      <div style={{ marginTop: '0.45rem', marginBottom: '0.25rem' }}>
        {childTasks.length > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSubtasksExpanded(!isSubtasksExpanded);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              width: '100%',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
              color: doneChildTasks === childTasks.length ? '#10b981' : 'var(--text-main, #f8fafc)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {isSubtasksExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>Вложенные подзадачи ({doneChildTasks}/{childTasks.length})</span>
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim, #64748b)' }}>
              {isSubtasksExpanded ? 'свернуть' : 'развернуть'}
            </span>
          </button>
        ) : isSubtasksExpanded ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#ff8800', fontWeight: 700 }}>↳ Новая подзадача:</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSubtasksExpanded(false);
                setIsAddingCardSubtask(false);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.68rem', cursor: 'pointer' }}
            >
              ✕ скрыть
            </button>
          </div>
        ) : null}

        {isSubtasksExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '5px', paddingLeft: '8px', borderLeft: '2px solid rgba(255, 102, 0, 0.35)' }}>
            {childTasks.map((child) => {
              const childAssignee = teamMembers.find((m) => m.id === child.assignee_id);
              const isChildDone = child.status === 'done';
              return (
                <div
                  key={child.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(child);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary, #0f172a)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px'
                  }}
                  title="Кликните для редактирования подзадачи"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSaveTask) {
                          onSaveTask({ ...child, status: isChildDone ? 'in_progress' : 'done' });
                          playSound(isChildDone ? 'click' : 'success');
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: isChildDone ? '#10b981' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={isChildDone ? 'Отметить невыполненной' : 'Отметить выполненной'}
                    >
                      {isChildDone ? <CheckSquare size={13} style={{ color: '#10b981' }} /> : <Square size={13} />}
                    </button>
                    <span style={{
                      fontWeight: 600,
                      color: isChildDone ? 'var(--text-muted)' : 'var(--text-main)',
                      textDecoration: isChildDone ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {child.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {childAssignee && (
                      <div
                        style={{
                          width: 17,
                          height: 17,
                          borderRadius: '50%',
                          background: childAssignee.avatar_color || '#ff6600',
                          color: '#fff',
                          fontSize: '0.55rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={childAssignee.full_name}
                      >
                        {childAssignee.initials || childAssignee.full_name?.[0]}
                      </div>
                    )}
                    <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', background: isChildDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)', color: isChildDone ? '#10b981' : 'var(--text-dim)' }}>
                      {isChildDone ? 'Готово' : child.status === 'in_progress' ? 'В работе' : 'Бэклог'}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Inline Quick Add Subtask Input */}
            {isAddingCardSubtask ? (
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={quickSubtaskTitle}
                  onChange={(e) => setQuickSubtaskTitle(e.target.value)}
                  placeholder="Название подзадачи..."
                  autoFocus
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && quickSubtaskTitle.trim()) {
                      e.preventDefault();
                      if (onSaveTask) {
                        await onSaveTask({
                          title: quickSubtaskTitle.trim(),
                          parent_task_id: task.id,
                          department_id: task.department_id,
                          section: task.section,
                          status: 'backlog',
                          assignee_id: task.assignee_id || null,
                          created_at: new Date().toISOString()
                        });
                      }
                      setQuickSubtaskTitle('');
                      setIsAddingCardSubtask(false);
                      playSound('success');
                      if (showToast) showToast('Подзадача создана', '↳');
                    } else if (e.key === 'Escape') {
                      setIsAddingCardSubtask(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    borderRadius: '4px',
                    border: '1px solid #ff6600',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.72rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (quickSubtaskTitle.trim() && onSaveTask) {
                      await onSaveTask({
                        title: quickSubtaskTitle.trim(),
                        parent_task_id: task.id,
                        department_id: task.department_id,
                        section: task.section,
                        status: 'backlog',
                        assignee_id: task.assignee_id || null,
                        created_at: new Date().toISOString()
                      });
                      setQuickSubtaskTitle('');
                      setIsAddingCardSubtask(false);
                      playSound('success');
                      if (showToast) showToast('Подзадача создана', '↳');
                    }
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#ff6600',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingCardSubtask(false);
                  }}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingCardSubtask(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff8800',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '2px'
                }}
              >
                <span>+ Добавить подзадачу...</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ERP Meta Tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: '0.2rem 0', flexWrap: 'wrap' }}>
        {/* YouGile Quick Stopwatch Button */}
        {onToggleStopwatch && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStopwatch(task.id);
            }}
            title={isStopwatchActive ? 'Остановить секундомер и записать время' : 'Запустить секундомер по задаче'}
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              border: isStopwatchActive ? '1px solid #10b981' : '1px solid var(--border-subtle)',
              background: isStopwatchActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: isStopwatchActive ? '#10b981' : 'var(--text-dim)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            {isStopwatchActive ? (
              <>
                <Square size={10} style={{ color: '#ef4444' }} fill="#ef4444" />
                <span style={{ color: '#10b981' }}>⏱️ Идёт отсчет... [Стоп]</span>
              </>
            ) : (
              <>
                <Play size={10} style={{ color: 'var(--accent-orange)' }} />
                <span>Секундомер</span>
              </>
            )}
          </button>
        )}

        {task.hours_spent && (
          <span
            style={{
              fontSize: '0.68rem',
              color: 'var(--accent-orange)',
              fontWeight: 700,
              background: 'rgba(255, 102, 0, 0.1)',
              padding: '2px 5px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
            title={`Списано часов: ${task.hours_spent}`}
          >
            <Clock size={10} />
            <span>{task.hours_spent} ч</span>
          </span>
        )}

        {task.erp_project_id && (
          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 5px',
              borderRadius: '4px'
            }}
            title={`ERP ID: ${task.erp_project_id}`}
          >
            #{task.erp_project_id}
          </span>
        )}

        {showErpWarning && (
          <span
            style={{
              fontSize: '0.67rem',
              color: 'var(--text-dim)',
              border: '1px dashed var(--border-subtle)',
              padding: '1px 5px',
              borderRadius: '4px'
            }}
            title="Данные для учета ЗП / ERP еще не заполнены"
          >
            ERP: не заполнено
          </span>
        )}
      </div>

      {/* Footer: Due date + Assignee */}
      <div className="card-footer">
        {/* Due Date Traffic Light Badge */}
        {deadlineBadge ? (
          <div
            className={`card-due-badge ${deadlineBadge.type}`}
            style={{ 
              color: deadlineBadge.color, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.3rem', 
              fontSize: '0.74rem', 
              fontWeight: 600 
            }}
            title={`Дедлайн: ${task.due_date}`}
          >
            <Calendar size={13} style={{ color: deadlineBadge.color }} />
            <span>{deadlineBadge.text}</span>
          </div>
        ) : task.due_date ? (
          <div
            style={{
              fontSize: '0.74rem',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700
            }}
            title={`Сдано / Выдано в монтаж: ${task.due_date}`}
          >
            <Check size={13} style={{ strokeWidth: 2.5 }} />
            <span>
              {(() => {
                const due = new Date(task.due_date);
                if (isNaN(due.getTime())) return task.due_date;
                const mNames = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
                return `${due.getDate()} ${mNames[due.getMonth()]}`;
              })()}
            </span>
          </div>
        ) : task.status === 'done' ? (
          <div
            style={{
              fontSize: '0.74rem',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700
            }}
            title={`Выдано в монтаж: ${task.due_date || task.completed_at || task.updated_at || 'Выполнено'}`}
          >
            <Check size={13} style={{ strokeWidth: 2.5 }} />
            <span>
              {(() => {
                const raw = task.due_date || task.completed_at || task.updated_at || task.created_at;
                const d = raw ? new Date(raw) : new Date();
                if (isNaN(d.getTime())) return raw || 'Выполнено';
                const mNames = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
                return `${d.getDate()} ${mNames[d.getMonth()]}`;
              })()}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Без срока</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Quick Subtask Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSubtasksExpanded(true);
              setIsAddingCardSubtask(true);
            }}
            style={{
              fontSize: '0.66rem',
              color: 'var(--text-dim)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              padding: '1px 5px',
              cursor: 'pointer'
            }}
            title="Добавить вложенную подзадачу"
          >
            + ↳
          </button>

          {/* YouGile Task Comments Count */}
          {Array.isArray(task.comments) && task.comments.length > 0 && (
            <span
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-dim)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 5px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.06)'
              }}
              title={`Чат задачи: ${task.comments.length} сообщений`}
            >
              <MessageSquare size={11} style={{ opacity: 0.7 }} />
              <span>{task.comments.length}</span>
            </span>
          )}

          {/* Assignee Avatar + Name */}
          {assignee ? (
            <div
              className="card-assignee"
              title={`Исполнитель: ${assignee.full_name} (${assignee.role})`}
            >
              <div
                className="assignee-avatar-sm"
                style={{ backgroundColor: assignee.avatar_color }}
              >
                {assignee.initials}
              </div>
              <span className="assignee-name-sm">
                {assignee.full_name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <div
              className="assignee-avatar-sm"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-dim)' }}
              title="Исполнитель не назначен"
            >
              ?
            </div>
          )}

          {/* YouGile Distinct Subtask Assignees Avatars */}
          {distinctSubtaskMembers.slice(0, 2).map((subM) => (
            <div
              key={subM.id}
              className="assignee-avatar-sm"
              style={{
                backgroundColor: subM.avatar_color,
                width: 20,
                height: 20,
                fontSize: '0.58rem',
                marginLeft: '-6px',
                border: '1.5px solid var(--bg-card)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
              title={`Исполнитель этапа: ${subM.full_name}`}
            >
              {subM.initials}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
