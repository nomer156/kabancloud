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
  Square
} from 'lucide-react';
import { PRIORITIES, DEPARTMENTS, formatPathEnd, DEFAULT_STICKERS } from '../lib/constants';
import { playSound } from '../lib/sound';
import { openFolderInExplorer } from '../lib/api';
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
  onToggleStopwatch
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  // Check if task is running live stopwatch
  const isStopwatchActive = activeStopwatchTaskId === task.id;

  // Check if task is mirrored from another department
  const isMirrored = activeDepartmentId && 
    activeDepartmentId !== 'all' && 
    task.department_id !== activeDepartmentId && 
    Array.isArray(task.mirrored_departments) && 
    task.mirrored_departments.includes(activeDepartmentId);

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

  // Subtasks / Checklist statistics
  const subtasksList = Array.isArray(task.subtasks) && task.subtasks.length > 0 ? task.subtasks : (Array.isArray(task.checklist) ? task.checklist : []);
  const totalSubtasks = subtasksList.length;
  const doneSubtasks = subtasksList.filter((c) => c.done).length;
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

  // Open in new tab (Jira full page view)
  const handleOpenInNewTab = (e) => {
    e.stopPropagation();
    window.open(`/#task/${encodeURIComponent(task.id)}`, '_blank');
  };

  const handleMiddleClick = (e) => {
    if (e.button === 1) { // Middle mouse wheel click!
      e.preventDefault();
      e.stopPropagation();
      window.open(`/#task/${encodeURIComponent(task.id)}`, '_blank');
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

  // Open folder in Windows Explorer
  const handleOpenFolder = async (e) => {
    if (e) e.stopPropagation();
    if (!task.network_link) return;
    try {
      await openFolderInExplorer(task.network_link);
      playSound('click');
    } catch (err) {
      console.warn('Ошибка открытия папки:', err);
    }
  };

  // Check if ERP data is missing
  const hasErpData = Boolean(task.erp_project_id || task.erp_task_number || task.hours_spent);
  const showErpWarning = !hasErpData && (task.status === 'in_progress' || task.status === 'review' || task.status === 'done');

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onEdit(task)}
      onAuxClick={handleMiddleClick}
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

          {/* YouGile Mirror Badge (if mirrored from another department) */}
          {isMirrored && (
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
              <span>Зеркало: {deptMeta.name}</span>
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
              title="Поделиться в чате отдела (YouGile)"
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
                  title={`Стикер YouGile: ${st.name}`}
                >
                  {st.name}
                </span>
              );
            })}
          </div>
        );
      })()}

      {/* Title */}
      <h4
        className="card-title"
        style={{ cursor: 'pointer', margin: '0 0 0.5rem 0' }}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(task);
        }}
      >
        {renderWithMentions(task.title, teamMembers)}
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
          title={`Папка: ${task.network_link}\n(Клик/иконка — скопировать путь, ↗ — открыть в Проводнике)`}
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
              title="Перейти к папке в Проводнике Windows (Win10 / Win11)"
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

      {/* Subtasks Progress Bar (YouGile Subtask Feature) */}
      {totalSubtasks > 0 && (
        <div className="card-checklist-group" style={{ margin: '0.45rem 0' }}>
          <div className="card-checklist-stats" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: doneSubtasks === totalSubtasks ? '#10b981' : 'var(--text-muted)' }}>
              <CheckSquare size={12} style={{ color: doneSubtasks === totalSubtasks ? '#10b981' : 'inherit' }} />
              <span>Подзадачи: {doneSubtasks}/{totalSubtasks}</span>
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: doneSubtasks === totalSubtasks ? '#10b981' : 'var(--text-dim)' }}>
              {Math.round(subtasksPercent)}%
            </span>
          </div>
          <div className="checklist-progress-bar">
            <div
              className="checklist-progress-fill"
              style={{
                width: `${subtasksPercent}%`,
                backgroundColor: doneSubtasks === totalSubtasks ? '#10b981' : 'var(--accent-orange)'
              }}
            />
          </div>
        </div>
      )}

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
              title={`Чат задачи: ${task.comments.length} сообщений (YouGile)`}
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
