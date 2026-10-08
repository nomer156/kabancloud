import React, { useState } from 'react';
import { 
  Calendar, 
  FolderGit2, 
  CheckSquare, 
  ChevronRight, 
  ChevronLeft, 
  Copy, 
  Check, 
  Flame, 
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { SECTIONS, PRIORITIES, COLUMNS } from '../lib/constants';
import { playSound } from '../lib/sound';

export function TaskCard({
  task,
  teamMembers,
  onEdit,
  onMoveColumn,
  onDelete,
  onDragStart
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Find section metadata
  const sectionMeta = SECTIONS.find((s) => s.id === task.section) || {
    id: task.section || 'АР',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.3)'
  };

  // Find priority metadata
  const priorityMeta = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[1];

  // Find assignee
  const assignee = teamMembers.find((m) => m.id === task.assignee_id);

  // Checklist statistics
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const totalChecklist = checklist.length;
  const doneChecklist = checklist.filter((c) => c.done).length;
  const checklistPercent = totalChecklist > 0 ? (doneChecklist / totalChecklist) * 100 : 0;

  // Due date human calculation
  let dueText = null;
  let isOverdue = false;
  let isUrgentDue = false;

  if (task.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      dueText = `Просрочено на ${Math.abs(diffDays)} дн.`;
      isOverdue = true;
    } else if (diffDays === 0) {
      dueText = 'Срок: Сегодня!';
      isUrgentDue = true;
    } else if (diffDays === 1) {
      dueText = 'Срок: Завтра';
      isUrgentDue = true;
    } else {
      dueText = `До ${due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
    }
  }

  // Copy network link
  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (task.network_link) {
      navigator.clipboard.writeText(task.network_link);
      setCopiedLink(true);
      playSound('click');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Column movement helpers
  const currentColumnIndex = COLUMNS.findIndex((c) => c.id === task.status);
  const canMoveLeft = currentColumnIndex > 0;
  const canMoveRight = currentColumnIndex < COLUMNS.length - 1;

  const handleMove = (e, direction) => {
    e.stopPropagation();
    const nextIndex = currentColumnIndex + direction;
    if (nextIndex >= 0 && nextIndex < COLUMNS.length) {
      onMoveColumn(task.id, COLUMNS[nextIndex].id);
    }
  };

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onEdit(task)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Metadata: Section Badge, Project Badge, Priority Indicator */}
      <div className="card-top-meta">
        <div className="card-tags-group">
          {/* Section Tag */}
          <span
            className="badge-section"
            style={{
              backgroundColor: sectionMeta.bg,
              color: sectionMeta.color,
              border: `1px solid ${sectionMeta.border}`
            }}
          >
            {sectionMeta.id}
          </span>

          {/* Project / Object Tag */}
          {task.project_code && (
            <span className="badge-project" title={task.project_code}>
              {task.project_code}
            </span>
          )}
        </div>

        {/* Priority Dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {task.priority === 'urgent' && (
            <Flame size={14} style={{ color: '#ef4444' }} title="Высокий приоритет" />
          )}
          <div
            className="card-priority-dot"
            style={{ backgroundColor: priorityMeta.color }}
            title={`Приоритет: ${priorityMeta.name}`}
          />
        </div>
      </div>

      {/* Title */}
      <div className="card-title">{task.title}</div>

      {/* Description Preview */}
      {task.description && (
        <div className="card-desc-preview">{task.description}</div>
      )}

      {/* Network / Server Link */}
      {task.network_link && (
        <div
          className="card-network-link"
          onClick={handleCopyLink}
          title="Кликните, чтобы скопировать путь к файлу/папке"
        >
          <FolderGit2 size={13} style={{ flexShrink: 0 }} />
          <span className="card-network-text">{task.network_link}</span>
          {copiedLink ? (
            <Check size={12} style={{ color: '#10b981', flexShrink: 0 }} />
          ) : (
            <Copy size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
          )}
        </div>
      )}

      {/* Checklist Progress Bar */}
      {totalChecklist > 0 && (
        <div className="checklist-progress-bar-container">
          <CheckSquare size={13} style={{ color: 'var(--text-muted)' }} />
          <div className="checklist-bar-bg">
            <div
              className="checklist-bar-fill"
              style={{ width: `${checklistPercent}%` }}
            />
          </div>
          <span className="checklist-count-label">
            {doneChecklist}/{totalChecklist}
          </span>
        </div>
      )}

      {/* Footer: Due date + Assignee + Quick Move Actions */}
      <div className="card-footer">
        {/* Due Date */}
        {dueText ? (
          <div
            className={`card-due-badge ${isOverdue || isUrgentDue ? 'urgent' : ''}`}
            title={task.due_date}
          >
            <Calendar size={13} />
            <span>{dueText}</span>
          </div>
        ) : (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Без срока</div>
        )}

        {/* Right side: Quick Move + Assignee */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Quick Column Shift (visible on hover) */}
          {isHovered && (
            <div className="card-quick-actions">
              {canMoveLeft && (
                <button
                  type="button"
                  className="btn-mini-action"
                  onClick={(e) => handleMove(e, -1)}
                  title="Переместить влево"
                >
                  <ChevronLeft size={13} />
                </button>
              )}
              {canMoveRight && (
                <button
                  type="button"
                  className="btn-mini-action"
                  onClick={(e) => handleMove(e, 1)}
                  title="Переместить вправо"
                >
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          )}

          {/* Assignee Avatar */}
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
        </div>
      </div>
    </div>
  );
}
