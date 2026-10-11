import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Check, AlertCircle, Edit2, RotateCcw } from 'lucide-react';
import { playSound } from '../lib/sound';

const PRESET_COLORS = [
  '#ff6600', '#0284c7', '#10b981', '#8b5cf6', 
  '#f59e0b', '#ec4899', '#6366f1', '#06b6d4',
  '#ef4444', '#84cc16', '#14b8a6', '#64748b'
];

export function SectionsModal({ isOpen, onClose, sections = [], onSaveSections }) {
  const [items, setItems] = useState(() => sections);
  const [renamesMap, setRenamesMap] = useState({}); // { oldId: newId }
  
  // New section form state
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#ff6600');
  
  // Edit existing section state
  const [editingId, setEditingId] = useState(null); // id of item being edited
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#ff6600');
  
  const [errorMsg, setErrorMsg] = useState('');

  // Sync with prop when opened
  React.useEffect(() => {
    if (isOpen) {
      setItems(sections || []);
      setRenamesMap({});
      setEditingId(null);
      setNewId('');
      setNewName('');
      setErrorMsg('');
    }
  }, [isOpen, sections]);

  if (!isOpen) return null;

  // Add a brand-new section
  const handleAdd = (e) => {
    e.preventDefault();
    const cleanId = newId.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('Введите краткий код раздела (например: ККС, ВДН)');
      return;
    }
    if (items.some((i) => i.id === cleanId)) {
      setErrorMsg(`Раздел с кодом «${cleanId}» уже существует`);
      return;
    }

    const fullName = newName.trim() ? `${cleanId} (${newName.trim()})` : cleanId;
    const newItem = {
      id: cleanId,
      name: fullName,
      color: newColor,
      bg: `${newColor}26`,
      border: `${newColor}59`
    };

    setItems([...items, newItem]);
    setNewId('');
    setNewName('');
    setErrorMsg('');
    playSound('click');
  };

  // Start editing an existing section
  const handleStartEdit = (sec) => {
    setEditingId(sec.id);
    setEditId(sec.id);
    // Strip redundant leading code from name if present for cleaner editing
    const rawName = sec.name.replace(new RegExp(`^${sec.id}\\s*\\((.*)\\)$`, 'i'), '$1');
    setEditName(rawName !== sec.id ? rawName : sec.name);
    setEditColor(sec.color || '#ff6600');
    setErrorMsg('');
    playSound('click');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setErrorMsg('');
    playSound('click');
  };

  // Apply edits to existing section
  const handleApplyEdit = (originalId) => {
    const cleanId = editId.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('Код раздела не может быть пустым');
      return;
    }
    
    // Check if new code conflicts with another section
    if (cleanId !== originalId && items.some((i) => i.id === cleanId)) {
      setErrorMsg(`Раздел с кодом «${cleanId}» уже существует`);
      return;
    }

    const fullName = editName.trim() ? `${cleanId} (${editName.trim()})` : cleanId;
    
    // If ID changed, record the rename mapping
    if (cleanId !== originalId) {
      setRenamesMap((prev) => ({
        ...prev,
        [originalId]: cleanId
      }));
    }

    const updated = items.map((item) => {
      if (item.id === originalId) {
        return {
          id: cleanId,
          name: fullName,
          color: editColor,
          bg: `${editColor}26`,
          border: `${editColor}59`
        };
      }
      return item;
    });

    setItems(updated);
    setEditingId(null);
    setErrorMsg('');
    playSound('click');
  };

  // Delete section
  const handleDelete = (id) => {
    if (items.length <= 1) {
      setErrorMsg('Нельзя удалить последний оставшийся раздел');
      return;
    }
    setItems(items.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
    playSound('click');
  };

  // Save all changes
  const handleSaveAll = () => {
    onSaveSections(items, renamesMap);
    playSound('success');
    onClose();
  };

  // Prevent accidental close when selecting text
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
            <Layers size={20} style={{ color: 'var(--accent-orange)' }} />
            <span>Управление разделами проекта (марками)</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Марки проектных разделов Уфанет (ВДН, МКЖ, ЧС, ККС...). Вы можете добавлять новые, 
            <b> редактировать существующие</b> (название, код, цвет) или удалять неиспользуемые.
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

          {/* Form to add new section */}
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
              <span>Добавить новый раздел:</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Код: ККС"
                value={newId}
                onChange={(e) => setNewId(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Расшифровка: Кабельная канализация связи"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            {/* Color picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '0.3rem' }}>Цвет:</span>
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
                <span>Добавить</span>
              </button>
            </div>
          </form>

          {/* Current Sections List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Существующие разделы и марки ({items.length}):
            </div>

            {items.map((sec) => {
              const isEditing = editingId === sec.id;

              if (isEditing) {
                return (
                  <div
                    key={sec.id}
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
                        Редактирование раздела: {sec.id}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: `${editColor}26`,
                          color: editColor,
                          border: `1px solid ${editColor}59`
                        }}
                      >
                        Предпросмотр: {editId || '...'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>
                          Код марки:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={editId}
                          onChange={(e) => setEditId(e.target.value.toUpperCase())}
                          style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>
                          Расшифровка / Название:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
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
                          onClick={() => handleApplyEdit(sec.id)}
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
                  key={sec.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: sec.bg || `${sec.color}26`,
                        color: sec.color,
                        border: `1px solid ${sec.border || `${sec.color}59`}`
                      }}
                    >
                      {sec.id}
                    </span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-main)' }}>
                      {sec.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(sec)}
                      className="btn-mini-action"
                      style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}
                      title="Редактировать название, код или цвет раздела"
                    >
                      <Edit2 size={13} />
                      <span>Изменить</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(sec.id)}
                      className="btn-icon"
                      style={{ width: 26, height: 26, color: 'var(--text-dim)' }}
                      title="Удалить раздел"
                    >
                      <Trash2 size={14} />
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
            Сохранить разделы
          </button>
        </div>
      </div>
    </div>
  );
}
