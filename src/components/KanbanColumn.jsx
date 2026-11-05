import React, { useState, useRef } from 'react';
import { Plus, Inbox, X, ArrowRight, ChevronLeft, ChevronRight, AlertTriangle, Palette } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { playSound } from '../lib/sound';

export function KanbanColumn({
  column,
  tasks,
  teamMembers,
  sections,
  onEditTask,
  onQuickAddTask,
  onInlineCreateTask,
  onDropTask,
  onShareToChat,
  activeDepartmentId,
  activeStopwatchTaskId,
  onToggleStopwatch,
  currentUser,
  onUpdateColumn,
  allTasks = [],
  onSaveTask
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(`kaban_col_collapsed_${column.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title || '');
  const [editWip, setEditWip] = useState(column.wip_limit || 0);
  const [editColor, setEditColor] = useState(column.color || '#ff6600');
  const inputRef = useRef(null);

  const canEditColumn = Boolean(
    currentUser && (
      currentUser.role_level >= 10 ||
      currentUser.username?.toLowerCase() === 'sanya' ||
      currentUser.full_name?.toLowerCase() === 'admin' ||
      (currentUser.role_level >= 8 && currentUser.department_id === activeDepartmentId)
    )
  );

  const wipLimit = column.wip_limit || 0;
  const isOverWip = wipLimit > 0 && tasks.length > wipLimit;

  const handleSaveColumnSettings = (e) => {
    e?.preventDefault();
    if (onUpdateColumn) {
      onUpdateColumn(column.id, {
        title: editTitle.trim() || column.title,
        wip_limit: Math.max(0, parseInt(editWip, 10) || 0),
        color: editColor
      });
    }
    setIsEditingSettings(false);
    playSound('success');
  };

  const handleToggleCollapse = () => {
    playSound('click');
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`kaban_col_collapsed_${column.id}`, String(next));
      } catch {}
      return next;
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDropTask(taskId, column.id);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    playSound('click');
  };

  const handleStartInline = () => {
    setIsAddingInline(true);
    setInlineTitle('');
    playSound('click');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCancelInline = () => {
    setIsAddingInline(false);
    setInlineTitle('');
  };

  const handleSubmitInline = (e) => {
    if (e) e.preventDefault();
    if (!inlineTitle.trim()) return;

    if (onInlineCreateTask) {
      onInlineCreateTask(column.id, inlineTitle.trim());
    } else if (onQuickAddTask) {
      onQuickAddTask(column.id, inlineTitle.trim());
    }

    setInlineTitle('');
    playSound('success');
    // Keep input open for rapid creation of multiple tasks!
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitInline();
    } else if (e.key === 'Escape') {
      handleCancelInline();
    }
  };

  // ================= COLLAPSED VIEW (YouGile Slim Vertical Rail) =================
  if (isCollapsed) {
    return (
      <div
        className={`kanban-column collapsed ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleToggleCollapse}
        title={`Развернуть колонку «${column.title}» (${tasks.length} задач${wipLimit ? `, лимит ${wipLimit}` : ''})`}
        style={{
          width: '44px',
          minWidth: '44px',
          maxWidth: '44px',
          padding: '0.75rem 0.35rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          background: 'var(--bg-secondary)',
          border: isDragOver ? '2px dashed var(--accent-orange)' : (isOverWip ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)'),
          borderRadius: 'var(--radius-lg)',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          gap: '0.65rem',
          height: '100%',
          boxShadow: isOverWip ? '0 0 10px rgba(239, 68, 68, 0.25)' : undefined
        }}
      >
        <button
          type="button"
          className="btn-mini-action"
          style={{ width: 26, height: 26, padding: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleCollapse();
          }}
          title="Развернуть колонку"
        >
          <ChevronRight size={14} />
        </button>

        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: column.color,
            boxShadow: `0 0 8px ${column.color}`
          }}
        />

        <span
          className="column-count"
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            background: isOverWip ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            color: isOverWip ? '#ef4444' : 'var(--text-main)',
            border: isOverWip ? '1px solid rgba(239, 68, 68, 0.45)' : undefined,
            padding: '2px 6px',
            borderRadius: '10px'
          }}
        >
          {tasks.length}
        </span>

        <div
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: isOverWip ? '#ef4444' : 'var(--text-muted)',
            letterSpacing: '0.04em',
            marginTop: 'auto',
            marginBottom: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {column.title}
        </div>
      </div>
    );
  }

  // ================= EXPANDED VIEW (Standard Column with YouGile Enhancements) =================
  return (
    <div
      className={`kanban-column ${isDragOver ? 'drag-over' : ''} ${isOverWip ? 'column-wip-warning' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: `linear-gradient(180deg, ${column.color || '#ff6600'}15 0%, var(--bg-secondary) 320px, var(--bg-secondary) 100%)`,
        border: `1.5px solid ${column.color || '#ff6600'}38`,
        boxShadow: `0 8px 24px -10px ${column.color || '#ff6600'}22`,
        ...(isOverWip ? { borderColor: 'rgba(239, 68, 68, 0.65)', boxShadow: '0 0 16px rgba(239, 68, 68, 0.25)' } : {})
      }}
    >
      {/* Top Accent Color Line */}
      <div style={{ height: '3.5px', background: column.color || '#ff6600', borderRadius: '4px 4px 0 0', margin: '-0.75rem -0.75rem 0.6rem -0.75rem' }} />

      {/* Column Header */}
      <div className="column-header">
        <div className="column-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
          <div
            className="column-color-indicator"
            style={{ backgroundColor: column.color || '#ff6600' }}
          />
          <h3 className="column-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {column.title}
          </h3>

          {/* WIP Limit & Task Counter */}
          {wipLimit > 0 ? (
            <span
              className="column-count"
              style={{
                background: isOverWip ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: isOverWip ? '#ef4444' : 'var(--text-main)',
                border: isOverWip ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}
              title={isOverWip ? `ВНИМАНИЕ: Превышен лимит WIP! ${tasks.length} из ${wipLimit} макс.` : `Лимит WIP: максимум ${wipLimit} задач в работе`}
            >
              {isOverWip && <AlertTriangle size={11} />}
              <span>{tasks.length}/{wipLimit}</span>
            </span>
          ) : (
            <span className="column-count">{tasks.length}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {canEditColumn && (
            <button
              type="button"
              className="btn-mini-action"
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              title="Настроить цвет и лимиты этапа"
            >
              <Palette size={13} style={{ color: column.color || 'var(--accent-orange)' }} />
            </button>
          )}

          <button
            type="button"
            className="btn-mini-action"
            onClick={handleStartInline}
            title={`Добавить задачу в «${column.title}»`}
          >
            <Plus size={14} />
          </button>

          <button
            type="button"
            className="btn-mini-action"
            onClick={handleToggleCollapse}
            title="Свернуть колонку в компактный вид"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Column Settings Popover for Admin / Dept Head */}
      {isEditingSettings && (
        <form
          onSubmit={handleSaveColumnSettings}
          style={{
            margin: '0.4rem 0.65rem 0.6rem',
            padding: '0.75rem',
            background: 'var(--bg-tertiary, #1a2234)',
            border: `1.5px solid ${editColor}`,
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fff' }}>Настройка колонки</span>
            <button
              type="button"
              onClick={() => setIsEditingSettings(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>
              Название этапа:
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="form-input"
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>
              Лимит задач (WIP): 0 = без лимита
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={editWip}
              onChange={(e) => setEditWip(e.target.value)}
              className="form-input"
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              Цвет колонки:
            </label>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {['#64748b', '#0284c7', '#ff6600', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: editColor === c ? '2px solid #fff' : '1px solid transparent',
                    boxShadow: editColor === c ? '0 0 0 2px var(--accent-orange)' : 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: 4 }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.74rem' }}
            >
              Сохранить
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditingSettings(false)}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.74rem' }}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Top Action Area: Inline Form or Top "+ Добавить задачу" Button */}
      <div style={{ padding: '0.45rem 0.65rem 0.25rem 0.65rem' }}>
        {isAddingInline ? (
          /* Inline Quick Add Form (At the TOP of column) */
          <div
            style={{
              padding: '0.65rem 0.75rem',
              background: 'var(--bg-card, #1c2233)',
              border: '1.5px solid var(--accent-orange, #ff6600)',
              borderRadius: 'var(--radius-md, 10px)',
              boxShadow: '0 4px 16px rgba(255, 102, 0, 0.25)',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <textarea
              ref={inputRef}
              rows={2}
              placeholder="Что нужно сделать? Введите название и нажмите Enter..."
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main, #f8fafc)',
                fontSize: '0.84rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSubmitInline}
                  disabled={!inlineTitle.trim()}
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem', gap: '4px' }}
                >
                  <span>Добавить</span>
                  <ArrowRight size={12} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCancelInline();
                    onQuickAddTask(column.id);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                  title="Открыть полную карточку с подробными параметрами"
                >
                  Развернуть ↗
                </button>
              </div>

              <button
                type="button"
                onClick={handleCancelInline}
                className="btn-icon"
                style={{ width: 24, height: 24, padding: 0 }}
                title="Отмена (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* YouGile Column TOP "+ Добавить задачу" Button */
          <button
            type="button"
            onClick={handleStartInline}
            className="column-add-task-top-btn"
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px dashed var(--border-subtle, rgba(255,255,255,0.15))',
              background: 'rgba(255, 255, 255, 0.02)',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-orange, #ff6600)';
              e.currentTarget.style.background = 'rgba(255, 102, 0, 0.1)';
              e.currentTarget.style.color = 'var(--accent-orange, #ff6600)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255,255,255,0.15))';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.color = 'var(--text-muted, #94a3b8)';
            }}
            title="Быстро создать задачу в начале колонки"
          >
            <Plus size={15} style={{ color: 'var(--accent-orange, #ff6600)' }} />
            <span>Добавить задачу</span>
          </button>
        )}
      </div>

      {/* Cards List */}
      <div className="column-cards-list">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            teamMembers={teamMembers}
            sections={sections}
            onEdit={onEditTask}
            onDragStart={handleDragStart}
            onShareToChat={onShareToChat}
            activeDepartmentId={activeDepartmentId}
            activeStopwatchTaskId={activeStopwatchTaskId}
            onToggleStopwatch={onToggleStopwatch}
            allTasks={allTasks}
            currentUser={currentUser}
            onSaveTask={onSaveTask}
          />
        ))}

        {tasks.length === 0 && (
          <div className="column-empty-state">
            <Inbox size={24} style={{ opacity: 0.3 }} />
            <span>В этой колонке нет задач</span>
          </div>
        )}
      </div>
    </div>
  );
}
