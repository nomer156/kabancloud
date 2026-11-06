import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Edit2, 
  Check, 
  Plus, 
  Trash2, 
  Palette, 
  AlertCircle, 
  Building2, 
  Crown, 
  ShieldCheck, 
  Monitor, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { playSound } from '../lib/sound';
import { DEPARTMENTS } from '../lib/constants';

const PRESET_COLORS = [
  { name: 'Оранжевый Уфанет', hex: '#ff6600' },
  { name: 'Янтарный', hex: '#ff8800' },
  { name: 'Лазурный', hex: '#00a3ff' },
  { name: 'Небесно-синий', hex: '#0284c7' },
  { name: 'Изумрудный', hex: '#10b981' },
  { name: 'Мятный', hex: '#059669' },
  { name: 'Фиолетовый', hex: '#8b5cf6' },
  { name: 'Пурпурный', hex: '#a855f7' },
  { name: 'Малиновый', hex: '#ec4899' },
  { name: 'Розовый', hex: '#f43f5e' },
  { name: 'Бирюзовый', hex: '#06b6d4' },
  { name: 'Индиго', hex: '#6366f1' },
  { name: 'Золотистый', hex: '#f59e0b' },
  { name: 'Рубиновый', hex: '#ef4444' },
  { name: 'Тёмно-серый', hex: '#475569' },
  { name: 'Сланцевый', hex: '#64748b' }
];

export function TeamModal({ 
  isOpen, 
  onClose, 
  teamMembers, 
  currentUser,
  departments = DEPARTMENTS,
  onUpdateMember, 
  onDeleteMember,
  onVerifyMember,
  initialEditingId = null,
  showToast
}) {
  const [editingId, setEditingId] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [deptInput, setDeptInput] = useState('dept-design');
  const [roleInput, setRoleInput] = useState('');
  const [levelInput, setLevelInput] = useState(6);
  const [workstationInput, setWorkstationInput] = useState('');
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [initialsInput, setInitialsInput] = useState('');
  const [colorInput, setColorInput] = useState('#ff6600');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  
  // Department filter
  const [activeDeptFilter, setActiveDeptFilter] = useState('all');

  // Adding new member state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('dept-design');
  const [newRole, setNewRole] = useState('Инженер-проектировщик');
  const [newLevel, setNewLevel] = useState(6);
  const [newWorkstation, setNewWorkstation] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('ВОЛС');
  const [newInitials, setNewInitials] = useState('');
  const [newColor, setNewColor] = useState('#0284c7');

  // Deletion confirm
  const [deletingId, setDeletingId] = useState(null);

  React.useEffect(() => {
    if (isOpen && initialEditingId) {
      const target = teamMembers.find((m) => m.id === initialEditingId);
      if (target) {
        handleStartEdit(target);
      }
    }
  }, [isOpen, initialEditingId, teamMembers]);

  if (!isOpen) return null;

  const isAdmin = (Number(currentUser?.role_level) || 0) >= 10 || currentUser?.full_name?.toLowerCase() === 'admin' || currentUser?.username?.toLowerCase() === 'sanya';
  const isChiefOrAdmin = isAdmin || (Number(currentUser?.role_level) || 0) >= 8;

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
    setDeptInput(member.department_id || 'dept-design');
    setRoleInput(member.role || 'Инженер-проектировщик');
    setLevelInput(Number(member.role_level) || 6);
    setWorkstationInput(member.workstation_id || '');
    setSpecialtyInput(member.specialty || '');
    setInitialsInput(member.initials || generateInitials(member.full_name));
    setColorInput(member.avatar_color || '#ff6600');
    setPhoneInput(member.phone || '');
    setEmailInput(member.email || '');
    setIsAddingNew(false);
    setDeletingId(null);
    playSound('click');
  };

  const handleSaveEdit = (member) => {
    if (!nameInput.trim()) return;
    const finalInitials = initialsInput.trim() ? initialsInput.trim().toUpperCase() : generateInitials(nameInput);

    let normPc = workstationInput.trim().toLowerCase();
    if (normPc && !normPc.startsWith('vlxproject')) {
      normPc = `vlxproject${normPc.padStart(2, '0')}`;
    }

    onUpdateMember({
      ...member,
      full_name: nameInput.trim(),
      department_id: deptInput,
      role: roleInput.trim(),
      role_level: Number(levelInput) || 6,
      workstation_id: normPc,
      specialty: specialtyInput.trim(),
      initials: finalInitials,
      avatar_color: colorInput,
      phone: phoneInput.trim(),
      email: emailInput.trim()
    });
    setEditingId(null);
    playSound('success');
  };

  const handleCreateNewMember = (e) => {
    e?.preventDefault();
    if (!newName.trim()) return;

    let normPc = newWorkstation.trim().toLowerCase();
    if (normPc && !normPc.startsWith('vlxproject')) {
      normPc = `vlxproject${normPc.padStart(2, '0')}`;
    }

    const finalInitials = newInitials.trim() ? newInitials.trim().toUpperCase() : generateInitials(newName);
    const newMember = {
      id: `uf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      full_name: newName.trim(),
      department_id: newDept,
      role: newRole.trim() || 'Инженер-проектировщик',
      role_level: Number(newLevel) || 6,
      workstation_id: normPc,
      specialty: newSpecialty.trim(),
      initials: finalInitials,
      avatar_color: newColor,
      is_verified: true
    };

    onUpdateMember(newMember);
    setIsAddingNew(false);
    setNewName('');
    setNewInitials('');
    setNewWorkstation('');
    playSound('success');
  };

  const handleDelete = (id) => {
    if (!isAdmin) {
      alert('Удалять сотрудников может только главный администратор Sanya.');
      return;
    }
    if (teamMembers.length <= 1) {
      alert('В системе должен оставаться хотя бы один сотрудник.');
      return;
    }
    if (typeof onDeleteMember === 'function') {
      onDeleteMember(id);
      setDeletingId(null);
      playSound('click');
    }
  };

  const handleToggleVerify = (member) => {
    const nextState = !member.is_verified;
    if (onVerifyMember) {
      onVerifyMember(member.id, nextState);
    } else {
      onUpdateMember({ ...member, is_verified: nextState });
    }
    playSound('success');
    if (showToast) {
      showToast(nextState ? `Сотрудник подтверждён: ${member.full_name}` : `Подтверждение снято: ${member.full_name}`, nextState ? '✓' : '⚠️');
    }
  };

  const filteredMembers = teamMembers.filter((m) => {
    if (activeDeptFilter === 'all') return true;
    return (m.department_id || 'dept-design') === activeDeptFilter;
  });

  return (
    <div 
      className="modal-overlay" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.dataset.overlayClick = 'true';
      }}
      onMouseUp={(e) => {
        if (e.currentTarget.dataset.overlayClick === 'true' && e.target === e.currentTarget && onClose) {
          onClose();
        }
        e.currentTarget.dataset.overlayClick = 'false';
      }}
    >
      <div 
        className="modal-content" 
        style={{ maxWidth: '780px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Users size={20} style={{ color: 'var(--accent-orange)' }} />
            <span>Сотрудники компании • Управление ролями и подтверждение</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Department Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', padding: '0.65rem 1.4rem', background: 'var(--bg-tertiary, #1c2233)', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
          <button
            type="button"
            onClick={() => setActiveDeptFilter('all')}
            style={{
              padding: '0.3rem 0.7rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: activeDeptFilter === 'all' ? 'var(--accent-orange)' : 'var(--bg-secondary)',
              color: activeDeptFilter === 'all' ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            Все отделы ({teamMembers.length})
          </button>

          {departments.map((d) => {
            const count = teamMembers.filter((m) => (m.department_id || 'dept-design') === d.id).length;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveDeptFilter(d.id)}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  background: activeDeptFilter === d.id ? d.color : 'var(--bg-secondary)',
                  color: activeDeptFilter === d.id ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {d.icon} {d.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Начальники отделов (Ур. 10) подтверждают сотрудников, назначают уровни прав и привязывают рабочие ПК.
            </p>
            {!isAddingNew && isChiefOrAdmin && (
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
                <span>Добавить сотрудника</span>
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
                gap: '0.85rem',
                marginTop: '0.75rem'
              }}
            >
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} />
                <span>Новый сотрудник</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">ФИО сотрудника *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Иван Петров"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newInitials) setNewInitials(generateInitials(e.target.value));
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Отдел</label>
                  <select
                    className="form-input"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Должность</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Инженер"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Уровень прав</label>
                  <select
                    className="form-input"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                  >
                    <option value={10}>👑 Ур. 10 — Начальник отдела / Полный доступ</option>
                    <option value={8}>⭐ Ур. 8 — Ведущий специалист</option>
                    <option value={6}>⚡ Ур. 6 — Инженер</option>
                    <option value={3}>👤 Ур. 3 — Младший инженер / Стажёр</option>
                    <option value={1}>👁️ Ур. 1 — Только просмотр</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ПК (vlxproject..)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="vlxproject04"
                    value={newWorkstation}
                    onChange={(e) => setNewWorkstation(e.target.value)}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddingNew(false)}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={14} />
                  <span>Добавить</span>
                </button>
              </div>
            </form>
          )}

          {/* Members List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.85rem' }}>
            {filteredMembers.map((member) => {
              const isEditing = editingId === member.id;
              const isDeleting = deletingId === member.id;
              const deptMeta = (Array.isArray(departments) && departments.find((d) => d.id === member.department_id)) || departments?.[0] || { id: 'dept-design', name: 'Отдел', color: '#ff6600', icon: '🏢' };
              const level = Number(member.role_level) || 6;
              const isVerified = member.is_verified !== false;

              return (
                <div
                  key={member.id}
                  style={{
                    background: 'var(--bg-secondary, #0f172a)',
                    border: '1px solid var(--border-subtle, #334155)',
                    borderRadius: 'var(--radius-md, 10px)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      {/* Avatar preview */}
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `2px solid ${member.avatar_color || '#ff6600'}`
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            backgroundColor: member.avatar_color || '#ff6600',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            flexShrink: 0
                          }}
                        >
                          {member.initials || 'ИН'}
                        </div>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                            {member.full_name}
                          </span>

                          <span
                            style={{
                              fontSize: '0.64rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: `${deptMeta.color}22`,
                              color: deptMeta.color,
                              fontWeight: 700
                            }}
                          >
                            {deptMeta.icon} {deptMeta.name}
                          </span>

                          {member.workstation_id && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(2, 132, 199, 0.15)',
                                color: '#38bdf8',
                                fontFamily: 'monospace',
                                fontWeight: 700
                              }}
                            >
                              💻 {member.workstation_id}
                            </span>
                          )}

                          {/* Verification badge */}
                          {isVerified ? (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <CheckCircle2 size={10} />
                              <span>Подтверждён</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Clock size={10} />
                              <span>Ожидает проверки</span>
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {member.role || deptMeta.name} • Уровень {level}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {/* Chief confirmation toggle */}
                      {isChiefOrAdmin && (
                        <button
                          type="button"
                          onClick={() => handleToggleVerify(member)}
                          className={`btn ${isVerified ? 'btn-secondary' : 'btn-primary'}`}
                          style={{
                            padding: '0.28rem 0.65rem',
                            fontSize: '0.72rem',
                            gap: '4px'
                          }}
                          title={isVerified ? 'Снять подтверждение' : 'Подтвердить сотрудника отдела'}
                        >
                          <Check size={12} />
                          <span>{isVerified ? 'Подтверждён' : 'Подтвердить'}</span>
                        </button>
                      )}

                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ width: 30, height: 30 }}
                            onClick={() => handleStartEdit(member)}
                            title="Редактировать сотрудника"
                          >
                            <Edit2 size={13} />
                          </button>

                          {isChiefOrAdmin && onDeleteMember && teamMembers.length > 1 && (
                            <button
                              type="button"
                              className="btn-icon btn-icon-danger"
                              style={{ width: 30, height: 30 }}
                              onClick={() => setDeletingId(member.id)}
                              title="Удалить сотрудника"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Deletion confirmation */}
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
                        <span>Удалить сотрудника {member.full_name}?</span>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                        <div className="form-group">
                          <label className="form-label">ФИО сотрудника *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={nameInput}
                            onChange={(e) => {
                              setNameInput(e.target.value);
                              setInitialsInput(generateInitials(e.target.value));
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Отдел</label>
                          <select
                            className="form-input"
                            value={deptInput}
                            onChange={(e) => setDeptInput(e.target.value)}
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Должность</label>
                          <input
                            type="text"
                            className="form-input"
                            value={roleInput}
                            onChange={(e) => setRoleInput(e.target.value)}
                          />
                        </div>

                        {isChiefOrAdmin && (
                          <div className="form-group">
                            <label className="form-label">Уровень доступа (роль)</label>
                            <select
                              className="form-input"
                              value={levelInput}
                              onChange={(e) => setLevelInput(e.target.value)}
                            >
                              <option value={10}>👑 Ур. 10 — Начальник / Полный доступ</option>
                              <option value={8}>⭐ Ур. 8 — Ведущий специалист</option>
                              <option value={6}>⚡ Ур. 6 — Инженер</option>
                              <option value={3}>👤 Ур. 3 — Младший специалист / Стажёр</option>
                              <option value={1}>👁️ Ур. 1 — Только просмотр</option>
                            </select>
                          </div>
                        )}

                        <div className="form-group">
                          <label className="form-label">Рабочий ПК</label>
                          <input
                            type="text"
                            className="form-input"
                            value={workstationInput}
                            onChange={(e) => setWorkstationInput(e.target.value)}
                            placeholder="vlxproject04"
                            style={{ fontFamily: 'monospace' }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Специализация</label>
                          <input
                            type="text"
                            className="form-input"
                            value={specialtyInput}
                            onChange={(e) => setSpecialtyInput(e.target.value)}
                            placeholder="ВОЛС, СКС..."
                          />
                        </div>
                      </div>

                      {/* Color Palette */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Цвет:</span>
                        {PRESET_COLORS.map((pc) => (
                          <button
                            key={pc.hex}
                            type="button"
                            title={pc.name}
                            onClick={() => setColorInput(pc.hex)}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              backgroundColor: pc.hex,
                              border: colorInput.toLowerCase() === pc.hex.toLowerCase() ? '2px solid #fff' : 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          />
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
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
                          <span>Сохранить</span>
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
