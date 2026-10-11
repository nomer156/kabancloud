import React, { useState } from 'react';
import { X, Users, Edit2, Check, Plus, Trash2, Palette, AlertCircle } from 'lucide-react';
import { playSound } from '../lib/sound';

const PRESET_COLORS = [
  { name: 'Оранжевый Уфанет', hex: '#ff6600' },
  { name: 'Небесно-синий', hex: '#0284c7' },
  { name: 'Изумрудный', hex: '#10b981' },
  { name: 'Фиолетовый', hex: '#8b5cf6' },
  { name: 'Янтарный', hex: '#f59e0b' },
  { name: 'Малиновый', hex: '#ec4899' },
  { name: 'Бирюзовый', hex: '#06b6d4' },
  { name: 'Индиго', hex: '#6366f1' },
  { name: 'Красный', hex: '#ef4444' },
  { name: 'Сланцевый', hex: '#64748b' }
];

export function TeamModal({ 
  isOpen, 
  onClose, 
  teamMembers, 
  onUpdateMember, 
  onDeleteMember 
}) {
  const [editingId, setEditingId] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [initialsInput, setInitialsInput] = useState('');
  const [colorInput, setColorInput] = useState('#ff6600');
  
  // Adding new member state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Инженер-проектировщик');
  const [newInitials, setNewInitials] = useState('');
  const [newColor, setNewColor] = useState('#0284c7');

  // Deletion confirm
  const [deletingId, setDeletingId] = useState(null);

  if (!isOpen) return null;

  const generateInitials = (name) => {
    if (!name) return 'ИН';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleStartEdit = (member) => {
    setEditingId(member.id);
    setNameInput(member.full_name || '');
    setRoleInput(member.role || 'Инженер-проектировщик');
    setInitialsInput(member.initials || generateInitials(member.full_name));
    setColorInput(member.avatar_color || '#ff6600');
    setIsAddingNew(false);
    setDeletingId(null);
    playSound('click');
  };

  const handleSaveEdit = (member) => {
    if (!nameInput.trim()) return;
    const finalInitials = initialsInput.trim() ? initialsInput.trim().toUpperCase() : generateInitials(nameInput);

    onUpdateMember({
      ...member,
      full_name: nameInput.trim(),
      role: roleInput.trim(),
      initials: finalInitials,
      avatar_color: colorInput
    });
    setEditingId(null);
    playSound('success');
  };

  const handleCreateNewMember = (e) => {
    e?.preventDefault();
    if (!newName.trim()) return;

    const finalInitials = newInitials.trim() ? newInitials.trim().toUpperCase() : generateInitials(newName);
    const newMember = {
      id: `uf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      full_name: newName.trim(),
      role: newRole.trim() || 'Инженер-проектировщик',
      initials: finalInitials,
      avatar_color: newColor
    };

    onUpdateMember(newMember);
    setIsAddingNew(false);
    setNewName('');
    setNewInitials('');
    playSound('success');
  };

  const handleDelete = (id) => {
    if (teamMembers.length <= 1) {
      alert('В отделе должен оставаться хотя бы один проектировщик.');
      return;
    }
    if (typeof onDeleteMember === 'function') {
      onDeleteMember(id);
      setDeletingId(null);
      playSound('click');
    }
  };

  // Safe overlay click
  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Users size={20} style={{ color: 'var(--accent-orange)' }} />
            <span>Состав отдела проектирования Уфанет</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Настройка профилей, должностей, инициалов и фирменных цветов инженеров.
            </p>
            {!isAddingNew && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                onClick={() => {
                  setIsAddingNew(true);
                  setEditingId(null);
                  playSound('click');
                }}
              >
                <Plus size={14} />
                <span>Добавить проектировщика</span>
              </button>
            )}
          </div>

          {/* Form for adding new member */}
          {isAddingNew && (
            <form
              onSubmit={handleCreateNewMember}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-orange)',
                borderRadius: 'var(--radius-md)',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} />
                <span>Новый проектировщик / ГИП</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">ФИО инженера *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Например: Иван Петров"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newInitials) setNewInitials(generateInitials(e.target.value));
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Должность / Роль</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Инженер-проектировщик"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Инициалы</label>
                  <input
                    type="text"
                    className="form-input"
                    maxLength={3}
                    placeholder="ИП"
                    value={newInitials}
                    onChange={(e) => setNewInitials(e.target.value.toUpperCase())}
                    style={{ textAlign: 'center', fontWeight: 800 }}
                  />
                </div>
              </div>

              {/* Color Picker for new member */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Palette size={13} />
                    <span>Цвет аватара:</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: newColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.62rem', fontWeight: 800 }}>
                      {newInitials || 'НП'}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>{newColor}</span>
                  </div>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((pc) => (
                    <button
                      key={pc.hex}
                      type="button"
                      title={pc.name}
                      onClick={() => setNewColor(pc.hex)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: pc.hex,
                        border: newColor === pc.hex ? '2px solid #fff' : '2px solid transparent',
                        boxShadow: newColor === pc.hex ? `0 0 0 2px ${pc.hex}` : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{ width: 28, height: 28, borderRadius: '4px', cursor: 'pointer', padding: 0, border: 'none', background: 'transparent' }}
                    title="Выбрать свой уникальный оттенок"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.3rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddingNew(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={14} />
                  <span>Создать профиль</span>
                </button>
              </div>
            </form>
          )}

          {/* Members list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {teamMembers.map((member) => {
              const isEditing = editingId === member.id;
              const isDeleting = deletingId === member.id;

              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: isEditing ? '1px solid var(--accent-orange)' : '1px solid var(--border-subtle)',
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    {/* Avatar Preview */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        backgroundColor: isEditing ? colorInput : (member.avatar_color || '#ff6600'),
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      {isEditing ? (initialsInput || member.initials) : member.initials}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {member.full_name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {member.avatar_color}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {member.role || 'Инженер-проектировщик'}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ width: 32, height: 32 }}
                            onClick={() => handleStartEdit(member)}
                            title="Настроить цвет, имя, должность и инициалы"
                          >
                            <Edit2 size={14} />
                          </button>

                          {onDeleteMember && teamMembers.length > 1 && (
                            <button
                              type="button"
                              className="btn-icon btn-icon-danger"
                              style={{ width: 32, height: 32 }}
                              onClick={() => setDeletingId(member.id)}
                              title="Удалить сотрудника"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline delete confirmation */}
                  {isDeleting && (
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertCircle size={14} />
                        <span>Удалить проектировщика {member.full_name}?</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem' }}
                          onClick={() => setDeletingId(null)}
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', background: '#ef4444', color: '#fff', border: 'none' }}
                          onClick={() => handleDelete(member.id)}
                        >
                          Да, удалить
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Editing Panel */}
                  {isEditing && (
                    <div
                      style={{
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '0.65rem' }}>
                        <div className="form-group">
                          <label className="form-label">ФИО сотрудника</label>
                          <input
                            type="text"
                            className="form-input"
                            value={nameInput}
                            onChange={(e) => {
                              setNameInput(e.target.value);
                              setInitialsInput(generateInitials(e.target.value));
                            }}
                            placeholder="ФИО сотрудника"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Должность / Роль</label>
                          <input
                            type="text"
                            className="form-input"
                            value={roleInput}
                            onChange={(e) => setRoleInput(e.target.value)}
                            placeholder="Должность"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Инициалы</label>
                          <input
                            type="text"
                            className="form-input"
                            maxLength={3}
                            value={initialsInput}
                            onChange={(e) => setInitialsInput(e.target.value.toUpperCase())}
                            style={{ textAlign: 'center', fontWeight: 800 }}
                          />
                        </div>
                      </div>

                      {/* Full Color Palette Picker */}
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Palette size={13} style={{ color: 'var(--accent-orange)' }} />
                            <span>Настроить цвет аватара:</span>
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: colorInput, fontWeight: 700 }}>
                            {colorInput}
                          </span>
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {PRESET_COLORS.map((pc) => (
                            <button
                              key={pc.hex}
                              type="button"
                              title={pc.name}
                              onClick={() => setColorInput(pc.hex)}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                backgroundColor: pc.hex,
                                border: colorInput === pc.hex ? '2px solid #fff' : '2px solid transparent',
                                boxShadow: colorInput === pc.hex ? `0 0 0 2px ${pc.hex}` : 'none',
                                cursor: 'pointer',
                                padding: 0,
                                transform: colorInput === pc.hex ? 'scale(1.15)' : 'none',
                                transition: 'transform 0.15s ease'
                              }}
                            />
                          ))}

                          {/* Custom Color Input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                            <input
                              type="color"
                              value={colorInput}
                              onChange={(e) => setColorInput(e.target.value)}
                              style={{ width: 28, height: 28, borderRadius: '4px', cursor: 'pointer', padding: 0, border: 'none', background: 'transparent' }}
                              title="Выбрать свой цвет"
                            />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Свой цвет</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => setEditingId(null)}
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', fontWeight: 700 }}
                          onClick={() => handleSaveEdit(member)}
                        >
                          <Check size={14} />
                          <span>Сохранить профиль</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
