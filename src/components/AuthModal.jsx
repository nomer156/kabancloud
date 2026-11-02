import React, { useState, useMemo, useEffect } from 'react';
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
  Briefcase,
  Monitor,
  Crown
} from 'lucide-react';
import { DEPARTMENTS } from '../lib/constants';
import { playSound } from '../lib/sound';
import { loginUser, registerUser, bindWorkstation, saveCurrentUserLocally } from '../lib/api';
import confetti from 'canvas-confetti';

const PRESET_COLORS = [
  '#ff6600', '#ff8800', '#f59e0b', '#10b981',
  '#0284c7', '#00a3ff', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#ef4444',
  '#06b6d4', '#059669', '#475569', '#64748b'
];

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

  // Workstation PC state
  const [pcInput, setPcInput] = useState(() => {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem('kaban_workstation') : '') || '';
  });
  const [rememberPc, setRememberPc] = useState(true);
  const [pcStatusMsg, setPcStatusMsg] = useState('');

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regDeptId, setRegDeptId] = useState('dept-design');
  const [regRole, setRegRole] = useState('Инженер-проектировщик');
  const [regLevel, setRegLevel] = useState(8);
  const [regColor, setRegColor] = useState('#ff6600');
  const [regInitials, setRegInitials] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regWorkstation, setRegWorkstation] = useState('');
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

  // Find admin member (Hook must remain unconditional before any return)
  const adminMember = useMemo(() => {
    return teamMembers.find(m => m.full_name?.toLowerCase() === 'admin' || m.id === 'uf-admin-root') || {
      id: 'uf-admin-root',
      full_name: 'admin',
      role: 'Главный администратор системы',
      role_level: 10,
      initials: 'AD',
      avatar_color: '#ef4444',
      department_id: 'dept-design',
      workstation_id: 'vlxproject00'
    };
  }, [teamMembers]);

  // Filter members for simplified 1-click login (Hook must remain unconditional before any return)
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
        const pcMatch = m.workstation_id?.toLowerCase().includes(q);
        // Also support typing just the number like "04" or "4"
        const numMatch = q.match(/^\d+$/) && m.workstation_id?.toLowerCase().includes(`vlxproject${q.padStart(2, '0')}`);
        if (!nameMatch && !roleMatch && !specMatch && !pcMatch && !numMatch) return false;
      }
      return true;
    });
  }, [teamMembers, selectedDeptFilter, searchQuery]);

  if (!isOpen) return null;

  const canClose = Boolean(currentUser) && !isStandalonePage;

  // Handle 1-click login
  const handleQuickLogin = async (member) => {
    try {
      const loggedIn = await loginUser(member.id);
      const userToUse = loggedIn || member;

      // If PC name is entered or remember is checked, store workstation
      if (pcInput.trim() && rememberPc) {
        const rawPc = pcInput.trim().toLowerCase();
        const normPc = rawPc.startsWith('vlxproject') 
          ? rawPc 
          : (rawPc.match(/^\d+$/) ? `vlxproject${rawPc.padStart(2, '0')}` : rawPc);
        localStorage.setItem('kaban_workstation', normPc);
        userToUse.workstation_id = normPc;
        bindWorkstation(userToUse.id, normPc).catch(() => {});
      }

      saveCurrentUserLocally(userToUse);
      onSelectUser(userToUse);
      playSound('success');
      if (onClose) onClose();
    } catch {
      saveCurrentUserLocally(member);
      onSelectUser(member);
      if (onClose) onClose();
    }
  };

  // Handle Login by Workstation PC name (e.g. vlxproject04 or 04)
  const handleLoginByPc = async (e) => {
    if (e) e.preventDefault();
    if (!pcInput.trim()) return;

    const raw = pcInput.trim().toLowerCase();
    const normPc = raw.startsWith('vlxproject') 
      ? raw 
      : (raw.match(/^\d+$/) ? `vlxproject${raw.padStart(2, '0')}` : raw);

    // Look for member mapped to this workstation
    const matched = teamMembers.find(m => m.workstation_id?.toLowerCase() === normPc);
    if (matched) {
      if (rememberPc) {
        localStorage.setItem('kaban_workstation', normPc);
      }
      handleQuickLogin(matched);
      return;
    }

    // Try logging in via backend API
    try {
      const logged = await loginUser({ workstation: normPc });
      if (logged) {
        if (rememberPc) {
          localStorage.setItem('kaban_workstation', normPc);
        }
        onSelectUser(logged);
        playSound('success');
        if (onClose) onClose();
        return;
      }
    } catch {}

    setPcStatusMsg(`ПК «${normPc}» пока не привязан к сотруднику. Выберите ваш профиль ниже для привязки:`);
    setSearchQuery('');
  };

  // Handle registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regFullName.trim()) return;

    setSubmitting(true);
    try {
      let normPc = (regWorkstation.trim() || pcInput.trim()).toLowerCase();
      if (normPc && !normPc.startsWith('vlxproject') && /^\d+$/.test(normPc)) {
        normPc = `vlxproject${normPc.padStart(2, '0')}`;
      }

      const newUser = await registerUser({
        full_name: regFullName.trim(),
        department_id: regDeptId,
        role: regRole.trim() || 'Инженер',
        role_level: Number(regLevel) || 8,
        avatar_color: regColor,
        initials: computedInitials,
        specialty: regSpecialty.trim(),
        workstation_id: normPc
      });

      if (normPc && rememberPc) {
        localStorage.setItem('kaban_workstation', normPc);
      }

      saveCurrentUserLocally(newUser);
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

  return (
    <div
      className={isStandalonePage ? 'auth-page-container' : 'modal-overlay'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        minHeight: '100vh',
        background: isStandalonePage ? 'var(--bg-primary, #0d1017)' : 'rgba(0, 0, 0, 0.75)',
        backdropFilter: isStandalonePage ? 'none' : 'blur(8px)'
      }}
    >
      <div
        className="modal-content auth-card"
        style={{
          maxWidth: '680px',
          width: '95vw',
          padding: '1.75rem 2rem',
          borderRadius: 'var(--radius-xl, 20px)',
          background: 'var(--bg-modal, #141824)',
          border: '1px solid var(--border-subtle, #334155)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          position: 'relative',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
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
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,102,0,0.2) 0%, rgba(255,102,0,0.05) 100%)',
              border: '2px solid var(--accent-orange, #ff6600)',
              color: 'var(--accent-orange, #ff6600)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.6rem',
              boxShadow: '0 0 24px rgba(255,102,0,0.3)'
            }}
          >
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: 'var(--text-main, #f8fafc)' }}>
            KabanCloud • Вход в систему
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
            АО «Уфанет» • Выберите ваш профиль или войдите по имени ПК
          </p>
        </div>

        {/* Modern Tabs: 1-Click Login vs Register */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.4rem',
            background: 'var(--bg-secondary, #0b1120)',
            padding: '4px',
            borderRadius: 'var(--radius-md, 10px)',
            border: '1px solid var(--border-subtle, #334155)',
            marginBottom: '1.1rem'
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
            Упрощённый вход (1 клик)
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

        {/* TAB 1: SIMPLIFIED LOGIN */}
        {activeTab === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Quick Admin Access Button */}
            <button
              type="button"
              onClick={() => handleQuickLogin(adminMember)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(255, 102, 0, 0.15) 100%)',
                border: '1.5px solid rgba(239, 68, 68, 0.45)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Вход с правами Администратора (10 уровень)"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    background: '#ef4444',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900
                  }}
                >
                  <Crown size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc' }}>
                    Войти как admin
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>
                    Главный администратор • Полный доступ ко всем функциям и матрице прав (Ур. 10)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: 700, color: '#fca5a5' }}>
                <span>Войти</span>
                <ArrowRight size={14} />
              </div>
            </button>

            {/* Moscow Branch Notice Banner */}
            <div
              style={{
                padding: '0.65rem 0.85rem',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(2, 132, 199, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md, 10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.15rem' }}>📍</span>
                <div>
                  <div style={{ fontSize: '0.79rem', fontWeight: 700, color: '#34d399' }}>
                    Московский филиал АО «Уфанет» • Открытый доступ
                  </div>
                  <div style={{ fontSize: '0.71rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Никаких скрытых паролей и рулетки! Выберите ваш профиль ниже для входа в 1 клик:
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {teamMembers.length} сотрудников
              </span>
            </div>

            {/* Department Filter Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
              <button
                type="button"
                onClick={() => setSelectedDeptFilter('all')}
                style={{
                  padding: '0.28rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedDeptFilter === 'all' ? 'var(--accent-orange)' : 'var(--bg-secondary)',
                  color: selectedDeptFilter === 'all' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Все ({teamMembers.length})
              </button>

              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDeptFilter(d.id)}
                  style={{
                    padding: '0.28rem 0.65rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedDeptFilter === d.id ? d.color : 'var(--bg-secondary)',
                    color: selectedDeptFilter === d.id ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {d.icon} {d.name}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #64748b)' }} />
              <input
                type="text"
                placeholder="Поиск по имени, должности, специальности или ПК..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  paddingLeft: '2.4rem',
                  paddingTop: '0.55rem',
                  paddingBottom: '0.55rem',
                  fontSize: '0.86rem',
                  background: 'var(--bg-secondary, #0f172a)'
                }}
              />
            </div>

            {/* Employee Cards Grid / List (Visible immediately without barrier) */}
            <div
              style={{
                maxHeight: '340px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0.55rem',
                paddingRight: '2px'
              }}
            >
              {filteredMembers.map((member) => {
                const deptMeta = departments.find((d) => d.id === member.department_id) || departments[0];
                const level = Number(member.role_level) || 6;
                const levelBadge = level >= 10 ? '👑 ГИП / Нач. (10)' : level >= 8 ? '⭐ Ведущий (8)' : level >= 6 ? '⚡ Инженер (6)' : '👤 Стажер';

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
                      gap: '0.65rem',
                      padding: '0.65rem 0.8rem',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `2px solid ${member.avatar_color || '#ff6600'}`,
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: member.avatar_color || '#ff6600',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            flexShrink: 0
                          }}
                        >
                          {member.initials || 'УФ'}
                        </div>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.full_name}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {member.role || deptMeta.name}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              padding: '1px 5px',
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
                                padding: '1px 4px',
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
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: level >= 10 ? 'rgba(239,68,68,0.2)' : level >= 8 ? 'rgba(245,158,11,0.2)' : 'rgba(2,132,199,0.2)',
                          color: level >= 10 ? '#ef4444' : level >= 8 ? '#f59e0b' : '#38bdf8'
                        }}
                      >
                        {levelBadge}
                      </span>
                      <ArrowRight size={13} style={{ color: 'var(--accent-orange)', opacity: 0.8 }} />
                    </div>
                  </button>
                );
              })}

              {filteredMembers.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)' }}>
                  Сотрудников не найдено. Вы можете зарегистрировать новый профиль на соседней вкладке.
                </div>
              )}
            </div>

            {/* Optional Quick Login by Workstation PC */}
            <form
              onSubmit={handleLoginByPc}
              style={{
                marginTop: '0.2rem',
                padding: '0.65rem 0.85rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--border-subtle, #334155)',
                borderRadius: 'var(--radius-md, 10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim, #94a3b8)' }}>
                  <Monitor size={14} />
                  <span>Или быстрый вход по номеру ПК (если привязан):</span>
                </div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberPc}
                    onChange={(e) => setRememberPc(e.target.checked)}
                    style={{ accentColor: 'var(--accent-orange)' }}
                  />
                  <span>Запомнить ПК</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Номер ПК (например: 04 или vlxproject04)..."
                  value={pcInput}
                  onChange={(e) => {
                    setPcInput(e.target.value);
                    setPcStatusMsg('');
                  }}
                  className="form-input"
                  style={{
                    flex: 1,
                    background: 'var(--bg-secondary, #0f172a)',
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.65rem',
                    fontFamily: 'var(--font-mono, monospace)'
                  }}
                />

                <button
                  type="submit"
                  disabled={!pcInput.trim()}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.74rem',
                    fontWeight: 700
                  }}
                >
                  Войти по ПК
                </button>
              </div>

              {pcStatusMsg && (
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>
                  ⚠️ {pcStatusMsg}
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                ФИО сотрудника: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Иванов Иван Иванович"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                required
                className="form-input"
                style={{ width: '100%', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                  Отдел компании:
                </label>
                <select
                  value={regDeptId}
                  onChange={(e) => setRegDeptId(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.fullName || d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                  Уровень доступа (роль):
                </label>
                <select
                  value={regLevel}
                  onChange={(e) => setRegLevel(Number(e.target.value))}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                >
                  <option value={10}>Уровень 10 (Начальник / ГИП)</option>
                  <option value={8}>Уровень 8 (Ведущий инженер / Старший)</option>
                  <option value={6}>Уровень 6 (Инженер / Специалист)</option>
                  <option value={3}>Уровень 3 (Младший / Стажер)</option>
                  <option value={1}>Уровень 1 (Наблюдатель)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                  Должность:
                </label>
                <input
                  type="text"
                  placeholder="Инженер ВОЛС"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                  Имя ПК (рабочее место):
                </label>
                <input
                  type="text"
                  placeholder="vlxproject04 или 04"
                  value={regWorkstation}
                  onChange={(e) => setRegWorkstation(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.84rem', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem', display: 'block' }}>
                Цвет аватара:
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setRegColor(col)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: col,
                      border: regColor === col ? '2px solid #fff' : 'none',
                      cursor: 'pointer',
                      transform: regColor === col ? 'scale(1.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !regFullName.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.88rem',
                fontWeight: 800,
                marginTop: '0.4rem',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Check size={16} />
              <span>{submitting ? 'Создание профиля...' : 'Зарегистрироваться и войти'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
