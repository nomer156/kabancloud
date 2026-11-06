import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Check, 
  XCircle, 
  Clock, 
  Monitor, 
  Building2, 
  User, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { DEPARTMENTS } from '../lib/constants';
import { playSound } from '../lib/sound';

export function AccessRequestsModal({
  isOpen,
  onClose,
  requests = [],
  teamMembers = [],
  departments = DEPARTMENTS,
  onApproveRequest,
  onRejectRequest,
  showToast
}) {
  const [filter, setFilter] = useState('pending'); // 'pending' | 'all'
  const [processingId, setProcessingId] = useState(null);

  if (!isOpen) return null;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const filteredRequests = requests.filter((r) => {
    if (filter === 'pending') return r.status === 'pending';
    return true;
  });

  const handleApprove = async (reqItem) => {
    setProcessingId(reqItem.id);
    try {
      if (onApproveRequest) {
        await onApproveRequest(reqItem.id);
      }
      playSound('success');
      if (showToast) showToast(`Права начальника отдела (Ур. 10) выданы: ${reqItem.user_name}`, '👑');
    } catch (err) {
      console.error('Ошибка одобрения:', err);
      if (showToast) showToast('Не удалось одобрить заявку', '⚠️');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reqItem) => {
    setProcessingId(reqItem.id);
    try {
      if (onRejectRequest) {
        await onRejectRequest(reqItem.id);
      }
      playSound('click');
      if (showToast) showToast(`Заявка отклонена: ${reqItem.user_name}`, '✕');
    } catch (err) {
      console.error('Ошибка отклонения:', err);
      if (showToast) showToast('Не удалось отклонить заявку', '⚠️');
    } finally {
      setProcessingId(null);
    }
  };

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
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-modal, #141824)',
          borderRadius: 'var(--radius-xl, 18px)',
          border: '1px solid var(--border-subtle, #334155)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, #0f172a)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Crown size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #f8fafc)' }}>
                  Заявки на права начальника отдела (Ур. 10)
                </h2>
                {pendingCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: '#ef4444',
                      color: '#fff'
                    }}
                  >
                    +{pendingCount}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
                Рассмотрение запросов сотрудников на управление отделами и назначение ролей
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-icon"
            onMouseDown={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.dataset.overlayClick = 'true';
      }}
      onMouseUp={(e) => {
        if (e.currentTarget.dataset.overlayClick === 'true' && e.target === e.currentTarget && onClose) {
          onClose();
        }
        e.currentTarget.dataset.overlayClick = 'false';
      }}
            title="Закрыть"
            style={{ width: 32, height: 32 }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '0.65rem 1.4rem',
            background: 'var(--bg-tertiary, #1c2233)',
            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))'
          }}
        >
          <button
            type="button"
            onClick={() => setFilter('pending')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: filter === 'pending' ? 'var(--accent-orange, #ff6600)' : 'transparent',
              color: filter === 'pending' ? '#fff' : 'var(--text-muted, #94a3b8)',
              cursor: 'pointer'
            }}
          >
            Ожидают решения ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: filter === 'all' ? 'var(--accent-orange, #ff6600)' : 'transparent',
              color: filter === 'all' ? '#fff' : 'var(--text-muted, #94a3b8)',
              cursor: 'pointer'
            }}
          >
            Все заявки ({requests.length})
          </button>
        </div>

        {/* Requests List */}
        <div
          style={{
            padding: '1.2rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            flex: 1
          }}
        >
          {filteredRequests.map((reqItem) => {
            const dept = (Array.isArray(departments) && departments.find((d) => d.id === reqItem.department_id)) || departments?.[0] || { id: 'dept-design', name: 'Отдел', color: '#ff6600', icon: '🏢' };
            const member = teamMembers.find((m) => m.id === reqItem.user_id);
            const isPending = reqItem.status === 'pending';
            const isApproved = reqItem.status === 'approved';
            const isProcessing = processingId === reqItem.id;

            return (
              <div
                key={reqItem.id}
                style={{
                  background: 'var(--bg-secondary, #0f172a)',
                  border: isPending
                    ? '1.5px solid rgba(239, 68, 68, 0.45)'
                    : '1px solid var(--border-subtle, #334155)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: isPending ? '0 4px 15px rgba(239, 68, 68, 0.1)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: member?.avatar_color || '#ff6600',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}
                    >
                      {member?.initials || reqItem.user_name.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                        {reqItem.user_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.67rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: `${dept.color}22`,
                            color: dept.color,
                            fontWeight: 700
                          }}
                        >
                          {dept.icon} {dept.name}
                        </span>

                        {reqItem.workstation_id && (
                          <span
                            style={{
                              fontSize: '0.67rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(2, 132, 199, 0.15)',
                              color: '#38bdf8',
                              fontFamily: 'monospace',
                              fontWeight: 700
                            }}
                          >
                            💻 {reqItem.workstation_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#f59e0b',
                          fontWeight: 700
                        }}
                      >
                        <Clock size={12} />
                        <span>На рассмотрении</span>
                      </span>
                    ) : isApproved ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          fontWeight: 700
                        }}
                      >
                        <Check size={12} />
                        <span>Одобрено • Ур. 10 выдан</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          fontWeight: 700
                        }}
                      >
                        <XCircle size={12} />
                        <span>Отклонено</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Note */}
                {reqItem.note && (
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted, #94a3b8)',
                      background: 'var(--bg-tertiary, #1c2233)',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--accent-orange, #ff6600)'
                    }}
                  >
                    💬 «{reqItem.note}»
                  </div>
                )}

                {/* Footer / Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Дата заявки: {new Date(reqItem.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    {reqItem.reviewed_by && ` • Рассмотрел: ${reqItem.reviewed_by}`}
                  </div>

                  {isPending && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(reqItem)}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.76rem',
                          color: 'var(--accent-rose, #ef4444)'
                        }}
                      >
                        <XCircle size={13} />
                        <span>Отклонить</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(reqItem)}
                        className="btn"
                        style={{
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                        }}
                      >
                        <Check size={13} strokeWidth={2.5} />
                        <span>{isProcessing ? 'Применение...' : 'Одобрить (выдать Ур. 10)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredRequests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
              <Crown size={32} style={{ opacity: 0.3, marginBottom: '0.6rem' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Заявок на доступ нет</div>
              <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                {filter === 'pending'
                  ? 'Все поступившие заявки сотрудников уже рассмотрены.'
                  : 'Заявки на получение прав начальника отдела пока не поступали.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
