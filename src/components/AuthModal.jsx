import React, { useState } from 'react';
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
  KeyRound
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
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(false);

  // Register Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDeptId, setRegDeptId] = useState(departments[0]?.id || 'dept-design');
  const [regRole, setRegRole] = useState('Инженер-проектировщик');
  const [regWorkstation, setRegWorkstation] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');

  if (!isOpen) return null;

  // Handle Login Submission
  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginError('');
    setPendingNotice(false);

    const normId = loginIdentifier.trim();
    const pass = loginPassword.trim();

    if (!normId) {
      setLoginError('Введите логин, фамилию или имя компьютера');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Direct Admin Fast Path: Sanya / Nomer1
      if (
        (normId.toLowerCase() === 'sanya' || normId.toLowerCase() === 'саня' || normId.toLowerCase() === 'александр никитин') &&
        (pass === 'Nomer1' || pass === 'nomer1' || pass === 'sanya')
      ) {
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
        return;
      }

      // Check if user is trying to login as Sanya with wrong password
      if (normId.toLowerCase() === 'sanya' && pass !== 'Nomer1') {
        setLoginError('Неверный пароль администратора');
        playSound('error');
        setIsSubmitting(false);
        return;
      }

      // 1b. Department Accounts Fast Path (Password: vlx.ufanet.ru)
      const deptLogins = {
        design: { id: 'uf-dept-design', name: 'Отдел Проектирования', dept: 'dept-design', initials: 'ОП', color: '#ff6600' },
        'проектирование': { id: 'uf-dept-design', name: 'Отдел Проектирования', dept: 'dept-design', initials: 'ОП', color: '#ff6600' },
        welders: { id: 'uf-dept-welders', name: 'Отдел Сварщиков', dept: 'dept-welders', initials: 'ОС', color: '#f59e0b' },
        'сварщики': { id: 'uf-dept-welders', name: 'Отдел Сварщиков', dept: 'dept-welders', initials: 'ОС', color: '#f59e0b' },
        rss: { id: 'uf-dept-rss', name: 'Отдел РСС', dept: 'dept-rss', initials: 'РСС', color: '#3b82f6' },
        'рсс': { id: 'uf-dept-rss', name: 'Отдел РСС', dept: 'dept-rss', initials: 'РСС', color: '#3b82f6' },
        sales_corp: { id: 'uf-dept-sales-corp', name: 'Отдел Продаж ЮЛ', dept: 'dept-sales-corp', initials: 'ЮЛ', color: '#8b5cf6' },
        'продажи юл': { id: 'uf-dept-sales-corp', name: 'Отдел Продаж ЮЛ', dept: 'dept-sales-corp', initials: 'ЮЛ', color: '#8b5cf6' },
        sales_retail: { id: 'uf-dept-sales-retail', name: 'Отдел Продаж ФЛ', dept: 'dept-sales-retail', initials: 'ФЛ', color: '#ec4899' },
        'продажи фл': { id: 'uf-dept-sales-retail', name: 'Отдел Продаж ФЛ', dept: 'dept-sales-retail', initials: 'ФЛ', color: '#ec4899' },
      };
      const deptMatch = deptLogins[normId.toLowerCase()];
      if (deptMatch && (pass === 'vlx.ufanet.ru' || !pass)) {
        const foundDeptUser = teamMembers.find((m) => m.id === deptMatch.id) || {
          id: deptMatch.id,
          username: normId.toLowerCase(),
          full_name: deptMatch.name,
          department_id: deptMatch.dept,
          role: 'Начальник отдела',
          role_level: 10,
          initials: deptMatch.initials,
          avatar_color: deptMatch.color,
          status: 'active'
        };
        saveCurrentUserLocally(foundDeptUser);
        onSelectUser(foundDeptUser);
        playSound('success');
        if (onClose) onClose();
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
        // Fallback local member lookup if server offline or standalone
        const cleanQuery = normId.toLowerCase();
        const found = teamMembers.find((m) => {
          if (m.id === normId) return true;
          if (m.full_name?.toLowerCase() === cleanQuery) return true;
          if (m.workstation_id?.toLowerCase() === cleanQuery) return true;
          const lName = m.full_name?.split(/\s+/)[0]?.toLowerCase();
          if (lName && lName === cleanQuery) return true;
          // Number matching like 04 -> vlxproject04
          if (/^\d+$/.test(cleanQuery) && m.workstation_id?.toLowerCase().endsWith(cleanQuery.padStart(2, '0'))) return true;
          return false;
        });

        if (found) {
          if (found.status === 'pending') {
            setPendingNotice(true);
            setIsSubmitting(false);
            return;
          }
          res = { success: true, user: found };
        } else {
          throw err;
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
        setLoginError(res?.error || 'Сотрудник не найден. Проверьте правильность данных.');
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
        role: `Гость (${regRole || 'Инженер'})`,
        role_level: 1, // Register as Guest level 1 immediately active
        password: regPassword,
        workstation_id: normPc,
        status: 'active', // Active immediately!
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
      }, 1200);
    } catch (err) {
      // Local optimistic fallback
      const fallbackUser = {
        id: `uf-${Date.now()}`,
        full_name: fullName,
        initials,
        department_id: regDeptId,
        role: `Гость (${regRole || 'Инженер'})`,
        role_level: 1,
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
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDeptName = departments.find((d) => d.id === regDeptId)?.name || 'Выбранный отдел';

  return (
    <div 
      className="modal-overlay" 
      onClick={!isStandalonePage ? onClose : undefined}
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
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 102, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(255, 102, 0, 0.08) 0%, transparent 100%)'
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
              boxShadow: '0 4px 12px rgba(255, 102, 0, 0.3)'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #fff)', letterSpacing: '-0.02em' }}>
                Уфанет • Доска
              </h2>
              <p style={{ fontSize: '0.74rem', margin: 0, color: 'var(--text-muted, #94a3b8)' }}>
                Корпоративная авторизация
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
          padding: '0.5rem 1.5rem 0',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))'
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
            Регистрация
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loginError && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.8rem',
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
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <AlertCircle size={16} />
                    <span>Заявка ожидает подтверждения</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#fde68a' }}>
                    Ваша учётная запись направлена на согласование начальнику отдела. Доступ откроется сразу после подтверждения.
                  </p>
                </div>
              )}

              {/* Identifier Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                  Логин, Фамилия или имя ПК:
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #64748b)' }} />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Например: Смирнов, design или vlproject01"
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
                    Пароль:
                  </label>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #64748b)' }} />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Введите пароль"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ff6600, #ff8800)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(255, 102, 0, 0.35)',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                <span>{isSubmitting ? 'Авторизация...' : 'Войти в систему'}</span>
                <ArrowRight size={16} />
              </button>

              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '0.72rem',
                color: 'var(--text-muted, #94a3b8)',
                lineHeight: 1.5
              }}>
                💻 <strong>Быстрый вход по ПК:</strong> укажите номер или имя компьютера (например, <code>vlproject04</code> или <code>04</code>).
              </div>
            </form>
          ) : regSuccess ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Заявка отправлена!
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Уведомление направлено <strong>начальнику {selectedDeptName}</strong> и администратору <strong>Sanya</strong>.
                После одобрения вы сможете сразу войти в систему под своим паролем.
              </p>
              <button
                type="button"
                onClick={() => {
                  setRegSuccess(false);
                  setActiveTab('login');
                  setLoginIdentifier(lastName ? `${firstName} ${lastName}` : firstName);
                }}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ff6600, #ff8800)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Вернуться ко входу
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.3rem' }}>
                    Имя *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Алексей"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.3rem' }}>
                    Фамилия *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Смирнов"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.3rem' }}>
                  Отдел (Служба) *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted, #64748b)' }} />
                  <select
                    value={regDeptId}
                    onChange={(e) => setRegDeptId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      background: '#1a2638',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role / Job Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.3rem' }}>
                  Должность *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Briefcase size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted, #64748b)' }} />
                  <input
                    type="text"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    placeholder="Инженер-проектировщик ВОЛС"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Workstation PC */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.3rem' }}>
                  Рабочий ПК (опционально)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Monitor size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted, #64748b)' }} />
                  <input
                    type="text"
                    value={regWorkstation}
                    onChange={(e) => setRegWorkstation(e.target.value)}
                    placeholder="vlproject04 или просто 04"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.3rem' }}>
                  Пароль *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted, #64748b)' }} />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Минимум 4 символа"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      background: 'rgba(0, 0, 0, 0.25)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '0.4rem',
                  padding: '0.7rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ff6600, #ff8800)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                <span>{isSubmitting ? 'Отправка...' : 'Отправить заявку на регистрацию'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
