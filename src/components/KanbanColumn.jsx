import React, { useState, useRef } from 'react';
import { Plus, Inbox, X, ArrowRight, Sparkles } from 'lucide-react';
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
  onShareToChat
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const inputRef = useRef(null);

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

  return (
    <div
      className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="column-header">
        <div className="column-title-group">
          <div
            className="column-color-indicator"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="column-title">{column.title}</h3>
          <span className="column-count">{tasks.length}</span>
        </div>

        <button
          type="button"
          className="btn-mini-action"
          onClick={handleStartInline}
          title={`Добавить задачу в «${column.title}» (YouGile)`}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Inline Quick Add Form (YouGile style) */}
      {isAddingInline && (
        <div
          style={{
            margin: '0.5rem 0.65rem 0.75rem 0.65rem',
            padding: '0.65rem 0.75rem',
            background: 'var(--bg-card, #1c2233)',
            border: '1.5px solid var(--accent-orange, #ff6600)',
            borderRadius: 'var(--radius-md, 10px)',
            boxShadow: '0 4px 16px rgba(255, 102, 0, 0.2)'
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
      )}

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
          />
        ))}

        {tasks.length === 0 && !isAddingInline && (
          <div className="column-empty-state">
            <Inbox size={24} style={{ opacity: 0.3 }} />
            <span>В этой колонке нет задач</span>
          </div>
        )}

        {/* YouGile Column Bottom Quick Add Button */}
        {!isAddingInline && (
          <button
            type="button"
            onClick={handleStartInline}
            className="column-add-task-btn"
            style={{
              width: '100%',
              margin: '0.45rem 0',
              padding: '0.6rem 0.8rem',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px dashed var(--border-subtle, rgba(255,255,255,0.12))',
              background: 'transparent',
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
              e.currentTarget.style.background = 'rgba(255, 102, 0, 0.08)';
              e.currentTarget.style.color = 'var(--accent-orange, #ff6600)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255,255,255,0.12))';
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted, #94a3b8)';
            }}
          >
            <Plus size={15} />
            <span>Добавить задачу</span>
          </button>
        )}
      </div>
    </div>
  );
}
