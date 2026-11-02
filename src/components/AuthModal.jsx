import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  X, 
  Building2, 
  User, 
  Search, 
  Sparkles, 
  Check, 
  ArrowRight,
  Palette,
  Briefcase
} from 'lucide-react';
import { DEPARTMENTS } from '../lib/constants';
import { playSound } from '../lib/sound';
import { loginUser, registerUser } from '../lib/api';
import confetti from 'canvas-confetti';

const PRESET_COLORS = [
  '#ff6600', '#ff8800', '#f59e0b', '#10b981',
  '#0284c7', '#00a3ff', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#ef4444',
  '#06b6d4', '#059669', '#475569', '#64748b'
];

const DEPARTMENT_ROLES_SUGGESTIONS = {
  'dept-design': ['ГИП', 'Ведущий инженер ВОЛС', 'Инженер СКС и ЛВС', 'Инженер СВН и СКУД', 'Инженер-проектировщик', 'Нормоконтролер'],
  'dept-welders': ['Бригадир сварщиков ВОЛС', 'Мастер-сварщик оптических линий', 'Инженер-рефлектометрист', 'Монтажник ВОЛС', 'Кабельщик-спайщик'],
  'dept-rss': ['Начальник участка РСС', 'Инженер эксплуатации сетей связи', 'Мастер ЛКС РСС', 'Специалист аварийной службы', 'Линейный монтер'],
  'dept-sales-b2b': ['Руководитель направления B2B', 'Ведущий менеджер корпоративного отдела', 'Менеджер по работе с ключевыми клиентами', 'Инженер предпродажной подготовки'],
  'dept-sales-b2c': ['Старший менеджер розничных продаж', 'Менеджер по подключению МКД и ЧС', 'Специалист абонентского отдела', 'Менеджер прямых продаж']
};

export function AuthModal({
  isOpen,
  onClose,
  teamMembers = [],
  departments = DEPARTMENTS,
  currentUser,
  onSelectUser,
  isStandalonePage = false
}) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regDeptId, setRegDeptId] = useState('dept-design');
  const [regRole, setRegRole] = useState('Ведущий инженер ВОЛС');
  const [regColor, setRegColor] = useState('#ff6600');
  const [regInitials, setRegInitials] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate initials
  const computedInitials = useMemo(() => {
    if (regInitials.trim()) return regInitials.trim().toUpperCase();
    if (!regFullName.trim()) return 'УФ';
    const parts = regFullName.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return regFullName.slice(0, 2).toUpperCase();
  }, [regFullName, regInitials]);

  if (!isOpen) return null;

  const canClose = Boolean(currentUser) && !isStandalonePage;

  // Filter members for 1-click login
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      if (selectedDeptFilter !== 'all' && m.department_id !== selectedDeptFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = m.full_name?.toLowerCase().includes(q);
        const roleMatch = m.role?.toLowerCase().includes(q);
        const specMatch = m.specialty?.toLowerCase().includes(q);
        if (!nameMatch && !roleMatch && !specMatch) return false;
      }
      return true;
    });
  }, [teamMembers, selectedDeptFilter, searchQuery]);

  // Handle 1-click login
  const handleQuickLogin = async (member) => {
    try {
      const loggedIn = await loginUser(member.id);
      onSelectUser(loggedIn || member);
      playSound('success');
      if (onClose) onClose();
    } catch {
      onSelectUser(member);
      if (onClose) onClose();
    }
  };

  // Handle registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regFullName.trim()) return;

    setSubmitting(true);
    try {
      const newUser = await registerUser({
        full_name: regFullName.trim(),
        department_id: regDeptId,
        role: regRole.trim() || 'Сотрудник',
        avatar_color: regColor,
        initials: computedInitials,
        specialty: regSpecialty.trim()
      });

      onSelectUser(newUser);
      playSound('success');
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 }
      });
      if (onClose) onClose();
    } catch (err) {
      console.error('Ошибка регистрации:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDeptMeta = departments.find((d) => d.id === regDeptId) || departments[0];

  const content = (
    <div
      className="modal-content auth-card"
      style={{
        maxWidth: '560px',
        width: '94vw',
        padding: '2rem 2.2rem',
        borderRadius: 'var(--radius-xl, 20px)',
        background: 'var(--bg-modal, #141824)',
        border: '1px solid var(--border-subtle, #334155)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}
    >
      {canClose && (
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}
          title="Закрыть"
        >
          <X size={18} />
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,102,0,0.2) 0%, rgba(255,102,0,0.05) 100%)',
            border: '2px solid var(--accent-orange, #ff6600)',
            color: 'var(--accent-orange, #ff6600)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            boxShadow: '0 0 24px rgba(255,102,0,0.3)'
          }}
        >
          <ShieldCheck size={28} strokeWidth={2.2} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main, #f8fafc)' }}>
          KabanCloud • Авторизация
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
          АО «Уфанет» • Вход без пароля и выбор отдела
        </p>
      </div>

      {/* Modern Tabs: Login vs Register */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.4rem',
          background: 'var(--bg-secondary, #0b1120)',
          padding: '4px',
          borderRadius: 'var(--radius-md, 10px)',
          border: '1px solid var(--border-subtle, #334155)',
          marginBottom: '1.3rem'
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('login');
            playSound('click');
          }}
          style={{
            padding: '0.55rem 0.8rem',
            borderRadius: 'var(--radius-sm, 6px)',
            border: 'none',
            background: activeTab === 'login' ? 'var(--accent-orange, #ff6600)' : 'transparent',
            color: activeTab === 'login' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Войти в 1 клик
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('register');
            playSound('click');
          }}
          style={{
            padding: '0.55rem 0.8rem',
            borderRadius: 'var(--radius-sm, 6px)',
            border: 'none',
            background: activeTab === 'register' ? 'var(--accent-orange, #ff6600)' : 'transparent',
            color: activeTab === 'register' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={14} />
          <span>Новый сотрудник</span>
        </button>
      </div>

      {/* TAB 1: 1-CLICK LOGIN */}
      {activeTab === 'login' && (
        <div>
          {/* Privacy Search Input (Скрытый вход) */}
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #64748b)' }} />
            <input
              type="text"
              placeholder="Введите ваше имя, фамилию или табельный..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '2.4rem',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem',
                fontSize: '0.9rem',
                background: 'var(--bg-secondary, #0f172a)',
                border: searchQuery.trim().length >= 2 ? '1px solid var(--accent-orange, #ff6600)' : '1px solid var(--border-subtle, #334155)',
                boxShadow: searchQuery.trim().length >= 2 ? '0 0 15px rgba(255,102,0,0.2)' : 'none'
              }}
            />
          </div>

          {/* If search query has less than 2 characters: show privacy placeholder */}
          {searchQuery.trim().length < 2 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1.2rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md, 12px)',
                border: '1px dashed var(--border-subtle, #334155)',
                marginBottom: '0.5rem'
              }}
            >
              <ShieldCheck size={44} style={{ color: 'var(--accent-orange, #ff6600)', opacity: 0.85, marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                Скрытый защищённый вход
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim, #64748b)', maxWidth: '380px', margin: '0.45rem auto 0', lineHeight: 1.5 }}>
                В целях конфиденциальности список сотрудников филиала скрыт. Введите от <b>2-х символов</b> вашей фамилии или имени, чтобы подтвердить вход.
              </p>
            </div>
          ) : (
            /* When 2 or more characters entered: reveal matching profiles */
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingRight: '2px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim, #64748b)', marginBottom: '0.2rem' }}>
                Найдено совпадений: <b>{filteredMembers.length}</b>
              </div>

              {filteredMembers.map((member) => {
                const deptMeta = departments.find((d) => d.id === member.department_id) || departments[0];
                const level = Number(member.role_level) || 6;
                const levelBadge = level >= 10 ? '👑 ГИП / Нач.' : level >= 8 ? '⭐ Ведущий' : level >= 6 ? '⚡ Инженер' : '👤';
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleQuickLogin(member)}
                    className="engineer-login-chip"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.8rem',
                      padding: '0.75rem 0.9rem',
                      background: 'var(--bg-secondary, #0f172a)',
                      border: '1px solid var(--border-subtle, #334155)',
                      borderRadius: 'var(--radius-md, 10px)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--text-main, #f8fafc)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = member.avatar_color || '#ff6600';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 6px 14px ${member.avatar_color || '#ff6600'}22`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle, #334155)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: member.avatar_color || '#ff6600',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          flexShrink: 0
                        }}
                      >
                        {member.initials || 'УФ'}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                            {member.full_name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-muted, #94a3b8)',
                              fontWeight: 700
                            }}
                          >
                            {levelBadge} (Ур.{level})
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.72rem', color: deptMeta.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>{deptMeta.icon}</span>
                            <span>{deptMeta.name}</span>
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>
                            • {member.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-orange, #ff6600)', fontSize: '0.76rem', fontWeight: 700 }}>
                      <span>Войти</span>
                      <ArrowRight size={14} />
                    </div>
                  </button>
                );
              })}

              {filteredMembers.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dim, #64748b)', fontSize: '0.84rem' }}>
                  Сотрудник с именем «{searchQuery}» не найден.
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register');
                        setRegFullName(searchQuery.trim());
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
                    >
                      Зарегистрироваться как новый сотрудник
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FAST REGISTRATION */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegisterSubmit}>
          {/* 1. Full name input */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              ФИО / Имя сотрудника <span style={{ color: 'var(--accent-orange, #ff6600)' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Например: Марат Сафин или Елена К."
              value={regFullName}
              onChange={(e) => setRegFullName(e.target.value)}
              className="form-input"
              style={{ width: '100%', fontSize: '0.86rem', background: 'var(--bg-secondary, #0f172a)' }}
            />
          </div>

          {/* 2. Department selector (5 departments) */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Выберите ваш отдел:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.45rem' }}>
              {departments.map((dept) => {
                const isSelected = regDeptId === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      setRegDeptId(dept.id);
                      // Auto pick role suggestion
                      const suggestions = DEPARTMENT_ROLES_SUGGESTIONS[dept.id] || [];
                      if (suggestions.length > 0) {
                        setRegRole(suggestions[0]);
                      }
                      playSound('click');
                    }}
                    style={{
                      padding: '0.55rem 0.5rem',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: isSelected ? `2px solid ${dept.color}` : '1px solid var(--border-subtle, #334155)',
                      background: isSelected ? `${dept.color}22` : 'var(--bg-secondary, #0f172a)',
                      color: isSelected ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.74rem'
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{dept.icon}</div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Role input with presets */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Должность / Специализация:
            </label>
            <input
              type="text"
              required
              value={regRole}
              onChange={(e) => setRegRole(e.target.value)}
              className="form-input"
              style={{ width: '100%', fontSize: '0.84rem', background: 'var(--bg-secondary, #0f172a)', marginBottom: '0.4rem' }}
            />
            {/* Quick suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {(DEPARTMENT_ROLES_SUGGESTIONS[regDeptId] || []).map((sugg) => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => {
                    setRegRole(sugg);
                    playSound('click');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, #334155)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.68rem',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer'
                  }}
                >
                  + {sugg}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Avatar Color Picker */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Цвет аватара:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
              {PRESET_COLORS.map((c) => {
                const isSelected = regColor.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setRegColor(c)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: c,
                      border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                      boxShadow: isSelected ? `0 0 0 2px ${c}, 0 0 8px ${c}` : 'none',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary, #0f172a)',
              borderRadius: 'var(--radius-md, 10px)',
              border: '1px dashed var(--border-subtle, #334155)',
              marginBottom: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: regColor,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.88rem'
              }}
            >
              {computedInitials}
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>
                {regFullName || 'Ваше имя'}
              </div>
              <div style={{ fontSize: '0.72rem', color: selectedDeptMeta.color, fontWeight: 700 }}>
                {selectedDeptMeta.icon} {selectedDeptMeta.name} • {regRole || 'Должность'}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !regFullName.trim()}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Зарегистрироваться и войти</span>
            <ArrowRight size={16} />
          </button>
        </form>
      )}

      {/* Footer info */}
      <div style={{ marginTop: '1.2rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
        🔒 Без паролей • Сессия сохраняется автоматически • Корпоративная экосистема Уфанет
      </div>
    </div>
  );

  if (isStandalonePage) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main, #0b1120)',
          padding: '1.5rem'
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 1000,
        backgroundColor: 'rgba(10, 15, 29, 0.88)',
        backdropFilter: 'blur(8px)'
      }}
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {content}
    </div>
  );
}
