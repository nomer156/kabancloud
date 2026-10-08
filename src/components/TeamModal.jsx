import React, { useState } from 'react';
import { X, Users, Edit2, Check, UserPlus } from 'lucide-react';
import { playSound } from '../lib/sound';

export function TeamModal({ isOpen, onClose, teamMembers, onUpdateMember }) {
  const [editingId, setEditingId] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (member) => {
    setEditingId(member.id);
    setNameInput(member.full_name);
    setRoleInput(member.role);
    playSound('click');
  };

  const handleSaveEdit = (member) => {
    if (!nameInput.trim()) return;
    const parts = nameInput.trim().split(' ');
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : nameInput.slice(0, 2).toUpperCase();

    onUpdateMember({
      ...member,
      full_name: nameInput.trim(),
      role: roleInput.trim(),
      initials
    });
    setEditingId(null);
    playSound('success');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Users size={20} style={{ color: 'var(--accent-blue)' }} />
            <span>Состав отдела проектирования (6 участников)</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Здесь представлены все инженеры и архитекторы отдела. Вы можете отредактировать ФИО или должность.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {teamMembers.map((member) => {
              const isEditing = editingId === member.id;

              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: member.avatar_color,
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {member.initials}
                  </div>

                  {/* Info / Editing */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="ФИО инженера"
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                          value={roleInput}
                          onChange={(e) => setRoleInput(e.target.value)}
                          placeholder="Должность / раздел"
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {member.full_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {member.role}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Edit action */}
                  <div>
                    {isEditing ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
                        onClick={() => handleSaveEdit(member)}
                      >
                        <Check size={14} />
                        <span>Готово</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: 30, height: 30 }}
                        onClick={() => handleStartEdit(member)}
                        title="Редактировать сотрудника"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
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
