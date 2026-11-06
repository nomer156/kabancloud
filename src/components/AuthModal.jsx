import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Monitor, 
  Building2, 
  Briefcase, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  X,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { DEPARTMENTS } from '../lib/constants';
import { playSound } from '../lib/sound';
import { loginUser, registerUser, saveCurrentUserLocally } from '../lib/api';

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
  
  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  // Register Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regDeptId, setRegDeptId] = useState(departments[0]?.id || 'dept-design');
  const [regRole, setRegRole] = useState('Инженер-проектировщик');
  const [regWorkstation, setRegWorkstation] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');

  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter autocomplete suggestions based on loginIdentifier
  const filteredSuggestions = useMemo(() => {
    const q = loginIdentifier.trim().toLowerCase();
    if (!q) return [];
    const qWords = q.split(/\s+/).filter(Boolean);

    return teamMembers
      .filter((m) => {
        if (!m) return false;
        const fn = (m.full_name || '').toLowerCase();
        const un = (m.username || '').toLowerCase();
        const pc = (m.workstation_id || '').toLowerCase();
        const role = (m.role || '').toLowerCase();

        if (fn.includes(q) || un.includes(q) || pc.includes(q) || role.includes(q)) return true;
        if (qWords.length > 0 && qWords.every(qw => fn.includes(qw) || role.includes(qw) || pc.includes(qw))) return true;
        return false;
      })
      .slice(0, 6);
  }, [loginIdentifier, teamMembers]);

  if (!isOpen) return null;

  // Handle direct Admin quick login (Sanya / Nomer1)
  const handleAdminQuickLogin = async () => {
    setIsSubmitting(true);
    setLoginError('');
    try {
      const adminUser = {
        id: 'uf-admin-sanya',
        username: 'sanya',
        full_name: 'Александр Никитин (Администратор)',
        department_id: 'dept-design',
        role: 'Главный администратор системы',
        role_level: 10,
        initials: 'АН',
        avatar_color: '#ff6600',
        specialty: 'Полный доступ (Администратор)',
        workstation_id: 'vlxproject00',
        status: 'active'
      };
      
      const res = await loginUser({
        username: 'sanya',
        password: 'Nomer1'
      }).catch(() => null);

      const userToUse = (res && res.user) ? res.user : adminUser;
      saveCurrentUserLocally(userToUse);
      onSelectUser(userToUse);
      playSound('success');
      if (onClose) onClose();
    } catch {
      // Local fallback
      const adminUser = {
        id: 'uf-admin-sanya',
        username: 'sanya',
        full_name: 'Александр Никитин (Администратор)',
        department_id: 'dept-design',
        role: 'Главный администратор системы',
        role_level: 10,
        initials: 'АН',
        avatar_color: '#ff6600',
        specialty: 'Полный доступ (Администратор)',
        workstation_id: 'vlxproject00',
        status: 'active'
      };
      saveCurrentUserLocally(adminUser);
      onSelectUser(adminUser);
      playSound('success');
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Login Submission
  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginError('');
    setPendingNotice(false);
    setIsSuggestionsOpen(false);

    const normId = loginIdentifier.trim();
    const pass = loginPassword.trim();

    if (!normId) {
      setLoginError('Введите имя, фамилию, логин или номер ПК');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Direct Admin Fast Path: Sanya / Nomer1
      if (
        (normId.toLowerCase() === 'sanya' || normId.toLowerCase() === 'саня' || normId.toLowerCase() === 'александр никитин') &&
        (pass === 'Nomer1' || pass === 'nomer1' || pass === 'sanya')
      ) {
        await handleAdminQuickLogin();
        return;
      }

      // Check if user is trying to login as Sanya with wrong password
      if (normId.toLowerCase() === 'sanya' && pass !== 'Nomer1') {
        setLoginError('Неверный пароль администратора Sanya');
        playSound('error');
        setIsSubmitting(false);
        return;
      }

      // 2. Standard Login via API
      let res = null;
      try {
        res = await loginUser({
          username: normId,
          memberId: normId,
          workstation: normId,
          password: pass
        });
      } catch (err) {
        console.warn('API login failed, checking teamMembers fallback:', err);
      }

      // 3. Fallback to local members lookup if needed
      if (!res?.user) {
        const cleanQuery = normId.toLowerCase();
        const found = teamMembers.find((m) => {
          if (!m) return false;
          if (m.id === normId) return true;
          if (m.username?.toLowerCase() === cleanQuery) return true;
          const fn = (m.full_name || '').toLowerCase().trim();
          if (fn === cleanQuery) return true;
          const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
          const nameWords = fn.split(/\s+/).filter(Boolean);
          if (queryWords.length > 0 && queryWords.every(qw => nameWords.some(nw => nw === qw || nw.startsWith(qw)))) return true;
          if (nameWords.some(nw => nw === cleanQuery)) return true;
          if (/^\d+$/.test(cleanQuery) && m.workstation_id?.toLowerCase().endsWith(cleanQuery.padStart(2, '0'))) return true;
          return false;
        });

        if (found) {
          if (found.status === 'pending') {
            setPendingNotice(true);
            setIsSubmitting(false);
            return;
          }
          // Verify password if set on member
          if (found.password && found.password !== pass) {
            setLoginError('Неверный пароль сотрудника');
            playSound('error');
            setIsSubmitting(false);
            return;
          }
          res = { success: true, user: found };
        }
      }

      if (res?.user) {
        if (res.user.status === 'pending') {
          setPendingNotice(true);
        } else {
          saveCurrentUserLocally(res.user);
          onSelectUser(res.user);
          playSound('success');
          if (onClose) onClose();
        }
      } else {
        setLoginError(res?.error || 'Сотрудник не найден. Проверьте правильность ФИО или пароля.');
        playSound('error');
      }
    } catch (err) {
      setLoginError(err.message || 'Ошибка входа. Проверьте данные.');
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Registration Submission
  const handleRegister = async (e) => {
    e?.preventDefault();
    setRegError('');

    const fName = firstName.trim();
    const lName = lastName.trim();

    if (!fName || !lName) {
      setRegError('Укажите имя и фамилию');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setRegError('Пароль должен содержать минимум 4 символа');
      return;
    }

    const fullName = `${fName} ${lName}`;
    const initials = `${fName[0]}${lName[0]}`.toUpperCase();

    let normPc = regWorkstation.trim().toLowerCase();
    if (normPc && /^\d+$/.test(normPc)) {
      normPc = `vlproject${normPc.padStart(2, '0')}`;
    }

    setIsSubmitting(true);
    try {
      const newMemberData = {
        full_name: fullName,
        initials,
        department_id: regDeptId,
        role: regRole?.trim() || 'Инженер (Ур. 1)',
        role_level: 1, // Default Level 1 until promoted by Chief or Admin
        password: regPassword,
        workstation_id: normPc,
        status: 'active', // Active immediately so user can log in without friction!
        avatar_color: '#ff6600'
      };

      const res = await registerUser(newMemberData);
      const registeredUser = res?.user || newMemberData;
      saveCurrentUserLocally(registeredUser);
      onSelectUser(registeredUser);
      setRegSuccess(true);
      playSound('success');
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
    } catch (err) {
      // Local optimistic fallback
      const fallbackUser = {
        id: `uf-${Date.now()}`,
        full_name: fullName,
        initials,
        department_id: regDeptId,
        role: regRole?.trim() || 'Инженер-проектировщик',
        role_level: 6,
        password: regPassword,
        workstation_id: normPc,
        status: 'active',
        avatar_color: '#ff6600'
      };
      saveCurrentUserLocally(fallbackUser);
      onSelectUser(fallbackUser);
      setRegSuccess(true);
      playSound('success');
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDeptName = departments.find((d) => d.id === regDeptId)?.name || 'Выбранный отдел';

  const overlayMouseDownRef = useRef(false);
  const handleOverlayMouseDown = (e) => {
    overlayMouseDownRef.current = (e.target === e.currentTarget);
  };
  const handleOverlayMouseUp = (e) => {
    if (overlayMouseDownRef.current && e.target === e.currentTarget && !isStandalonePage && onClose) {
      onClose();
    }
    overlayMouseDownRef.current = false;
  };

  return (
    <div 
      className="modal-overlay" 
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      <div 
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-card, #131d2e)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(255, 102, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.1rem 1.4rem',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(255, 102, 0, 0.1) 0%, transparent 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff6600, #ff8800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(255, 102, 0, 0.35)'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                Уфанет • Доска
              </h2>
              <p style={{ fontSize: '0.74rem', margin: 0, color: 'var(--text-muted, #94a3b8)' }}>
                Вход и регистрация сотрудников
              </p>
            </div>
          </div>

          {!isStandalonePage && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          padding: '0.4rem 1.4rem 0',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setLoginError(''); }}
            style={{
              flex: 1,
              padding: '0.65rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'login' ? '2.5px solid #ff6600' : '2.5px solid transparent',
              color: activeTab === 'login' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
              fontWeight: activeTab === 'login' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Вход в систему
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setRegError(''); }}
            style={{
              flex: 1,
              padding: '0.65rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'register' ? '2.5px solid #ff6600' : '2.5px solid transparent',
              color: activeTab === 'register' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
              fontWeight: activeTab === 'register' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Новый сотрудник
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem 1.4rem', maxHeight: '72vh', overflowY: 'auto' }}>
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Quick Admin Login Pill */}
              <div
                onClick={handleAdminQuickLogin}
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(255, 102, 0, 0.15), rgba(255, 136, 0, 0.08))',
                  border: '1px solid rgba(255, 102, 0, 0.35)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ff6600'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 102, 0, 0.35)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>👑</span>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ff8800' }}>
                      Войти как Администратор
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Александр Никитин (логин: Sanya, пароль: Nomer1)
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#ff6600', fontWeight: 700 }}>Вход ➔</span>
              </div>

              {loginError && (
                <div style={{
                  padding: '0.7rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}

              {pendingNotice && (
                <div style={{
                  padding: '0.8rem',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <AlertCircle size={15} />
                    <span>Заявка ожидает подтверждения</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#fde68a' }}>
                    Ваша учётная запись направлена на согласование начальнику отдела. Доступ откроется сразу после подтверждения.
                  </p>
                </div>
              )}

              {/* Identifier Input with Autocomplete */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Сотрудник (ФИО, логин или номер ПК):
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={15} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      setIsSuggestionsOpen(true);
                    }}
                    onFocus={() => setIsSuggestionsOpen(true)}
                    placeholder="Начните вводить: Никитин, Смирнов или 04..."
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '0.62rem 0.75rem 0.62rem 2.1rem',
                      borderRadius: '9px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.84rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {isSuggestionsOpen && filteredSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#1a2234',
                      border: '1px solid rgba(255, 102, 0, 0.4)',
                      borderRadius: '10px',
                      boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
                      maxHeight: '210px',
                      overflowY: 'auto',
                      zIndex: 100,
                      padding: '4px'
                    }}
                  >
                    {filteredSuggestions.map((m) => {
                      const dept = (Array.isArray(departments) && departments.find(d => d.id === m.department_id)) || departments?.[0] || { id: 'dept-design', name: 'Отдел', color: '#ff6600', icon: '🏢' };
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setLoginIdentifier(m.full_name);
                            setIsSuggestionsOpen(false);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            transition: 'background 0.1s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 102, 0, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: m.avatar_color || '#ff6600',
                              color: '#fff',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {m.initials || m.full_name?.[0] || 'У'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.full_name}
                              </div>
                              <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                                {m.role} {m.workstation_id ? `• ПК: ${m.workstation_id}` : ''}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', flexShrink: 0 }}>
                            {dept?.name ? dept.name.replace('Отдел ', '') : 'Уфанет'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Пароль:
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Введите ваш пароль"
                    style={{
                      width: '100%',
                      padding: '0.62rem 2.2rem 0.62rem 2.1rem',
                      borderRadius: '9px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.84rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '0.3rem',
                  padding: '0.72rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ff6600, #ff8800)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(255, 102, 0, 0.35)',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                <span>{isSubmitting ? 'Проверка...' : 'Войти в систему'}</span>
                <ArrowRight size={16} />
              </button>

              <div style={{
                marginTop: '0.2rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.7rem',
                color: '#94a3b8',
                lineHeight: 1.45
              }}>
                💡 <strong>Совет:</strong> можно войти по номеру компьютера (например, <code>vlproject04</code> или <code>04</code>).
              </div>
            </form>
          ) : regSuccess ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                Добро пожаловать в Доску!
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Аккаунт успешно создан и активирован. Вы вошли под учётной записью: <strong>{firstName} {lastName}</strong> ({selectedDeptName}).
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {regError && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={15} />
                  <span>{regError}</span>
                </div>
              )}

              {/* First & Last Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                    Имя *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Иван"
                    required
                    style={{
                      width: '100%',
                      padding: '0.58rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                    Фамилия *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Иванов"
                    required
                    style={{
                      width: '100%',
                      padding: '0.58rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                  Отдел (Подразделение) *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Building2 size={15} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                  <select
                    value={regDeptId}
                    onChange={(e) => setRegDeptId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.58rem 0.75rem 0.58rem 2.1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: '#1a2234',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} style={{ background: '#1a2234', color: '#fff' }}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role / Job Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                  Должность *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Briefcase size={15} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                  <input
                    type="text"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    placeholder="Инженер-проектировщик ВОЛС"
                    required
                    style={{
                      width: '100%',
                      padding: '0.58rem 0.75rem 0.58rem 2.1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Workstation PC */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                  Рабочий ПК (опционально)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Monitor size={15} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                  <input
                    type="text"
                    value={regWorkstation}
                    onChange={(e) => setRegWorkstation(e.target.value)}
                    placeholder="vlproject04 или просто 04"
                    style={{
                      width: '100%',
                      padding: '0.58rem 0.75rem 0.58rem 2.1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                  Пароль для входа *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Минимум 4 символа"
                    required
                    style={{
                      width: '100%',
                      padding: '0.58rem 2.2rem 0.58rem 2.1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '0.3rem',
                  padding: '0.7rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ff6600, #ff8800)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                <span>{isSubmitting ? 'Создание...' : 'Зарегистрироваться и войти'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
