import React, { useState } from 'react';
import { ShieldCheck, X, Building2, CheckCircle2 } from 'lucide-react';
import { playSound } from '../lib/sound';

export function AuthModal({
  isOpen,
  onClose,
  teamMembers = [],
  departments = [],
  currentUser,
  onSelectUser,
  isStandalonePage = false
}) {
  const defaultDepts = [
    { id: 'dept-design', name: 'Отдел проектирования', color: '#ff6600' },
    { id: 'dept-maintenance', name: 'Служба эксплуатации', color: '#0284c7' },
    { id: 'dept-install', name: 'Монтажный отдел', color: '#10b981' }
  ];

  const activeDepartments = departments.length > 0 ? departments : defaultDepts;
  const [selectedDeptId, setSelectedDeptId] = useState('dept-design');

  if (!isOpen) return null;

  const handleQuickLogin = (member) => {
    onSelectUser(member);
    playSound('success');
    if (onClose) onClose();
  };

  const canClose = Boolean(currentUser) && !isStandalonePage;
  const isDesignDept = selectedDeptId === 'dept-design';

  const content = (
    <div
      className="modal-content auth-card"
      style={{
        maxWidth: '520px',
        width: '92vw',
        padding: '2.2rem 2rem',
        borderRadius: 'var(--radius-xl, 16px)',
        background: 'var(--bg-modal, #1e293b)',
        border: '1px solid var(--border-subtle, #334155)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
        position: 'relative'
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
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,102,0,0.2) 0%, rgba(255,102,0,0.05) 100%)',
            border: '2px solid var(--accent-orange, #ff6600)',
            color: 'var(--accent-orange, #ff6600)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.85rem',
            boxShadow: '0 0 20px rgba(255,102,0,0.25)'
          }}
        >
          <ShieldCheck size={30} strokeWidth={2.2} />
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-main, #f8fafc)' }}>
          Вход в систему Kaban2
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
          АО «Уфанет» • Корпоративная экосистема
        </p>
      </div>

      {/* 1. Выбор отдела (Quick Department Switcher) */}
      <div style={{ marginBottom: '1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
          <Building2 size={13} style={{ color: 'var(--accent-orange, #ff6600)' }} />
          <span>Выберите подразделение:</span>
        </div>
        <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {activeDepartments.map((dept) => {
            const isSelected = dept.id === selectedDeptId;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => {
                  setSelectedDeptId(dept.id);
                  playSound('click');
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.65rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: isSelected ? `2px solid ${dept.color || 'var(--accent-orange, #ff6600)'}` : '1px solid var(--border-subtle, #334155)',
                  background: isSelected ? 'rgba(255, 102, 0, 0.12)' : 'var(--bg-secondary, #0f172a)',
                  color: isSelected ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: dept.color || '#ff6600'
                  }}
                />
                <span>{dept.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Быстрый вход в 1 клик по карточке сотрудника */}
      {isDesignDept ? (
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Нажмите на свой профиль для мгновенного входа:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
            {teamMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleQuickLogin(member)}
                className="engineer-login-chip"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  padding: '0.75rem 0.85rem',
                  background: 'var(--bg-secondary, #0f172a)',
                  border: '1px solid var(--border-subtle, #334155)',
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-main, #f8fafc)',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = member.avatar_color || '#ff6600';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 16px ${member.avatar_color || '#ff6600'}22`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle, #334155)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: member.avatar_color || '#ff6600',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    flexShrink: 0
                  }}
                >
                  {member.initials || 'УФ'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.full_name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.role}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '2rem 1.5rem',
            textAlign: 'center',
            background: 'var(--bg-secondary, #0f172a)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px dashed var(--border-subtle, #334155)'
          }}
        >
          <Building2 size={36} style={{ color: 'var(--text-dim, #64748b)', margin: '0 auto 0.75rem auto', opacity: 0.6 }} />
          <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.92rem', color: 'var(--text-main, #f8fafc)' }}>
            Подразделение подключено
          </h4>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
            Инженеры этого отдела будут добавлены администратором в следующих релизах.<br />
            Пожалуйста, переключитесь на <b>«Отдел проектирования»</b>.
          </p>
        </div>
      )}

      {/* Footer info */}
      <div style={{ marginTop: '1.4rem', textAlign: 'center', fontSize: '0.74rem', color: 'var(--text-dim, #64748b)' }}>
        🔒 Локальная корпоративная авторизация • Без паролей • Внутренняя сеть Уфанет
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
        backgroundColor: 'rgba(10, 15, 29, 0.85)'
      }}
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {content}
    </div>
  );
}
