import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { playSound } from '../lib/sound';

const PRESET_COLORS = [
  '#ff6600', '#0284c7', '#10b981', '#8b5cf6', 
  '#f59e0b', '#ec4899', '#6366f1', '#06b6d4',
  '#ef4444', '#84cc16', '#14b8a6', '#64748b'
];

export function SectionsModal({ isOpen, onClose, sections, onSaveSections }) {
  const [items, setItems] = useState(() => sections);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#ff6600');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync with prop when opened
  React.useEffect(() => {
    if (isOpen) {
      setItems(sections);
      setNewId('');
      setNewName('');
      setErrorMsg('');
    }
  }, [isOpen, sections]);

  if (!isOpen) return null;

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
      bg: `${newColor}26`, // ~15% opacity
      border: `${newColor}59` // ~35% opacity
    };

    const updated = [...items, newItem];
    setItems(updated);
    setNewId('');
    setNewName('');
    setErrorMsg('');
    playSound('click');
  };

  const handleDelete = (id) => {
    if (items.length <= 1) {
      setErrorMsg('Нельзя удалить последний оставшийся раздел');
      return;
    }
    setItems(items.filter((i) => i.id !== id));
    playSound('click');
  };

  const handleSaveAll = () => {
    onSaveSections(items);
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
      <div className="modal-content" style={{ maxWidth: '580px' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Layers size={20} style={{ color: 'var(--accent-orange)' }} />
            <span>Управление разделами проекта (марками)</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Здесь настраиваются марки проектных разделов отдела Уфанет (ВДН, МКЖ, ЧС, ККС...).
            Вы можете добавлять новые марки, менять их цвета и удалять лишние.
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
            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Добавить новый раздел:</div>

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
                <span>Добавить марку</span>
              </button>
            </div>
          </form>

          {/* Current Sections List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '260px', overflowY: 'auto' }}>
            {items.map((sec) => (
              <div
                key={sec.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.85rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
                  <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-main)' }}>
                    {sec.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(sec.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title="Удалить раздел"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
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
