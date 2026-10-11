import React, { useState } from 'react';
import { 
  Calendar, 
  FolderGit2, 
  CheckSquare, 
  Copy, 
  Check, 
  Flame, 
  Clock,
  Briefcase
} from 'lucide-react';
import { PRIORITIES } from '../lib/constants';
import { playSound } from '../lib/sound';

export function TaskCard({
  task,
  teamMembers,
  sections,
  onEdit,
  onDragStart
}) {
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Check if ERP data is missing
  const hasErpData = Boolean(task.erp_project_id || task.erp_task_number || task.hours_spent);
  const showErpWarning = !hasErpData && (task.status === 'in_progress' || task.status === 'review' || task.status === 'done');

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onEdit(task)}
    >
      {/* Top Metadata: Section Tag, Project Tag, Priority Indicator */}
      <div className="card-top-meta" style={{ flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <div className="card-tags-group" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
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

      {/* ERP Info Tags Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
        {task.hours_spent && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: 'var(--accent-orange)',
              background: 'rgba(255, 102, 0, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}
            title="Затрачено времени на задачу"
          >
            <Clock size={11} />
            <span>{task.hours_spent} ч.</span>
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

      {/* Footer: Due date + Assignee (NO arrows!) */}
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
      </div>
    </div>
  );
}
