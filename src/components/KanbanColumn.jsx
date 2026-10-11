import React, { useState } from 'react';
import { Plus, Inbox } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { playSound } from '../lib/sound';

export function KanbanColumn({
  column,
  tasks,
  teamMembers,
  sections,
  onEditTask,
  onQuickAddTask,
  onDropTask
}) {
  const [isDragOver, setIsDragOver] = useState(false);

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
          onClick={() => {
            playSound('click');
            onQuickAddTask(column.id);
          }}
          title={`Добавить задачу в «${column.title}»`}
        >
          <Plus size={14} />
        </button>
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
