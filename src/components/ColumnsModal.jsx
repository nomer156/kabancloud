import React, { useState } from 'react';
import { X, Kanban, Plus, Trash2, Check, AlertCircle, Edit2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { playSound } from '../lib/sound';
import { DEFAULT_COLUMNS } from '../lib/constants';

const PRESET_COLORS = [
  '#64748b', '#ff6600', '#f59e0b', '#10b981', 
  '#0284c7', '#8b5cf6', '#ec4899', '#06b6d4',
  '#ef4444', '#84cc16', '#6366f1', '#14b8a6'
];

export function ColumnsModal({ isOpen, onClose, columns = [], onSaveColumns, tasks = [] }) {
  const [items, setItems] = useState(() => columns);
  const [renamesMap, setRenamesMap] = useState({}); // { oldId: newId }
  
  // Add new column form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newColor, setNewColor] = useState('#ff6600');
  
  // Edit existing column state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editColor, setEditColor] = useState('#ff6600');
  
  const [errorMsg, setErrorMsg] = useState('');

  // Sync with prop when opened
  React.useEffect(() => {
    if (isOpen) {
      setItems(columns.length > 0 ? columns : DEFAULT_COLUMNS);
      setRenamesMap({});
      setEditingId(null);
      setNewTitle('');
      setNewSubtitle('');
      setErrorMsg('');
    }
  }, [isOpen, columns]);

  if (!isOpen) return null;

  // Add new column
  const handleAdd = (e) => {
    e.preventDefault();
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) {
      setErrorMsg('Введите название новой колонки');
      return;
    }

    const generatedId = `col-${Date.now()}`;
    const newCol = {
      id: generatedId,
      title: cleanTitle,
      subtitle: newSubtitle.trim() || 'Пользовательский этап',
      color: newColor
    };

    setItems([...items, newCol]);
    setNewTitle('');
    setNewSubtitle('');
    setErrorMsg('');
    playSound('click');
  };

  // Start editing
  const handleStartEdit = (col) => {
    setEditingId(col.id);
    setEditTitle(col.title);
    setEditSubtitle(col.subtitle || '');
    setEditColor(col.color || '#ff6600');
    setErrorMsg('');
    playSound('click');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setErrorMsg('');
    playSound('click');
  };

  // Apply edits
  const handleApplyEdit = (originalId) => {
    const cleanTitle = editTitle.trim();
    if (!cleanTitle) {
      setErrorMsg('Название колонки не может быть пустым');
      return;
    }

    const updated = items.map((col) => {
      if (col.id === originalId) {
        return {
          ...col,
          title: cleanTitle,
          subtitle: editSubtitle.trim() || col.subtitle,
          color: editColor
        };
      }
      return col;
    });

    setItems(updated);
    setEditingId(null);
    setErrorMsg('');
    playSound('click');
  };

  // Move column Up
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const copy = [...items];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setItems(copy);
    playSound('click');
  };

  // Move column Down
  const handleMoveDown = (index) => {
    if (index === items.length - 1) return;
    const copy = [...items];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setItems(copy);
    playSound('click');
  };

  // Delete column
  const handleDelete = (colId) => {
    if (items.length <= 2) {
      setErrorMsg('На доске должно оставаться как минимум 2 колонки');
      return;
    }

    const tasksInCol = tasks.filter((t) => t.status === colId).length;
    if (tasksInCol > 0) {
      if (!window.confirm(`В этой колонке находится ${tasksInCol} задач(и). Они будут перемещены в первую колонку доски. Удалить колонку?`)) {
        return;
      }
    }

    const targetFallbackCol = items.find((c) => c.id !== colId)?.id || 'backlog';
    setRenamesMap((prev) => ({
      ...prev,
      [colId]: targetFallbackCol
    }));

    setItems(items.filter((c) => c.id !== colId));
    if (editingId === colId) setEditingId(null);
    playSound('click');
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Сбросить структуру колонок к стандартным (Очередь, В работе, На проверке, Готово)?')) {
      setItems(DEFAULT_COLUMNS);
      setEditingId(null);
      setErrorMsg('');
      playSound('click');
    }
  };

  // Save all
  const handleSaveAll = () => {
    onSaveColumns(items, renamesMap);
    playSound('success');
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayClick}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Kanban size={20} style={{ color: 'var(--accent-orange)' }} />
            <span>Управление колонками доски (этапами разработки)</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Настройте этапы прохождения проектов отдела. Вы можете переименовывать колонки, 
            менять их цвет, менять порядок следования (стрелками) и добавлять новые этапы 
            (например: <i>Согласование ЮЛ</i>, <i>Печать чертежей</i>).
          </p>

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--accent-rose)',
                fontSize: '0.82rem',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form to add new column */}
          <form
            onSubmit={handleAdd}
            style={{
              padding: '0.85rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={14} style={{ color: 'var(--accent-orange)' }} />
              <span>Добавить новый этап / колонку:</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Название (например: Согласование с ЮЛ)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Подзаголовок (например: Клиентское согласование)"
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
              />
            </div>

            {/* Color picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '0.3rem' }}>Цвет индикатора:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: newColor === c ? '2px solid white' : '1px solid transparent',
                    boxShadow: newColor === c ? '0 0 0 2px var(--accent-orange)' : 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                />
              ))}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginLeft: 'auto', padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
              >
                <Plus size={14} />
                <span>Добавить колонку</span>
              </button>
            </div>
          </form>

          {/* Current Columns List with Reordering & Inline Editing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Колонки на доске ({items.length}):
              </span>
              <button
                type="button"
                className="btn-mini-action"
                style={{ fontSize: '0.74rem', padding: '2px 7px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handleResetDefaults}
                title="Сбросить структуру колонок к стандартным 4 колонкам Уфанет"
              >
                <RotateCcw size={12} />
                <span>Сброс по умолчанию</span>
              </button>
            </div>

            {items.map((col, index) => {
              const isEditing = editingId === col.id;
              const countTasksInCol = tasks.filter((t) => t.status === col.id).length;

              if (isEditing) {
                return (
                  <div
                    key={col.id}
                    style={{
                      padding: '0.85rem',
                      background: 'var(--bg-secondary)',
                      border: '2px solid var(--accent-orange)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-orange)' }}>
                        Редактирование колонки #{index + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: editColor }} />
                        <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>{editTitle || 'Безымянная'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>
                          Название колонки:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>
                          Подзаголовок (описание):
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={editSubtitle}
                          onChange={(e) => setEditSubtitle(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '0.3rem' }}>Цвет:</span>
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: c,
                            border: editColor === c ? '2px solid white' : '1px solid transparent',
                            boxShadow: editColor === c ? '0 0 0 2px var(--accent-orange)' : 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                      ))}

                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem' }}
                          onClick={handleCancelEdit}
                        >
                          <X size={13} />
                          <span>Отмена</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                          onClick={() => handleApplyEdit(col.id)}
                        >
                          <Check size={13} />
                          <span>Применить</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={col.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Order indicator */}
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', minWidth: '16px' }}>
                      {index + 1}.
                    </span>

                    {/* Color dot */}
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '4px',
                        backgroundColor: col.color,
                        flexShrink: 0
                      }}
                    />

                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{col.title}</span>
                        {countTasksInCol > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '4px' }}>
                            {countTasksInCol} задач
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {col.subtitle || '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {/* Reorder Up / Down */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      className="btn-icon"
                      style={{ width: 24, height: 24, opacity: index === 0 ? 0.3 : 1 }}
                      title="Переместить левее"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => handleMoveDown(index)}
                      className="btn-icon"
                      style={{ width: 24, height: 24, opacity: index === items.length - 1 ? 0.3 : 1 }}
                      title="Переместить правее"
                    >
                      <ArrowDown size={13} />
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(col)}
                      className="btn-mini-action"
                      style={{ padding: '3px 7px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}
                      title="Редактировать название или цвет колонки"
                    >
                      <Edit2 size={12} />
                      <span>Изменить</span>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(col.id)}
                      className="btn-icon"
                      style={{ width: 26, height: 26, color: 'var(--text-dim)' }}
                      title="Удалить колонку"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveAll}>
            Сохранить колонки
          </button>
        </div>
      </div>
    </div>
  );
}
