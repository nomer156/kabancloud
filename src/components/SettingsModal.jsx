import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Settings, 
  Building2, 
  MessageSquarePlus, 
  Download, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { playSound } from '../lib/sound';
import { fetchDepartments, saveDepartment, deleteDepartment, fetchFeedback, sendFeedback, fetchPermissions, savePermissions } from '../lib/api';
import { ROLE_LEVELS, PERMISSION_DEFINITIONS, DEFAULT_PERMISSIONS, hasPermission } from '../lib/constants';

export function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  showToast
}) {
  // Only system Administrator (Sanya / admin) has access to global company departments and role matrix.
  // Department heads and employees only have access to Feedback & Suggestions.
  const isSuperAdmin = Boolean(
    currentUser?.username?.toLowerCase() === 'sanya' || 
    currentUser?.full_name?.toLowerCase() === 'admin' ||
    currentUser?.id === 'uf-admin-sanya' ||
    (Number(currentUser?.role_level) >= 10 && currentUser?.role?.toLowerCase().includes('администратор'))
  );
  const isAdmin = isSuperAdmin;

  const [activeTab, setActiveTab] = useState('feedback'); // 'feedback' | 'departments' | 'permissions'
  const [permissionsMatrix, setPermissionsMatrix] = useState(DEFAULT_PERMISSIONS);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsSaved, setPermsSaved] = useState(false);
  
  // Departments state
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  // Feedback state
  const [feedbackType, setFeedbackType] = useState('suggestion'); // 'suggestion' | 'bug' | 'feature'
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!isAdmin && (activeTab === 'departments' || activeTab === 'permissions')) {
        setActiveTab('feedback');
      }
      if (isAdmin) {
        loadDepartments();
        loadPerms();
      }
      loadFeedback();
      setFeedbackSuccess(false);
      setPermsSaved(false);
    }
  }, [isOpen, isAdmin]);

  const loadDepartments = async () => {
    try {
      setDeptLoading(true);
      const data = await fetchDepartments();
      setDepartments(data || []);
    } catch (err) {
      console.error('Ошибка загрузки отделов:', err);
    } finally {
      setDeptLoading(false);
    }
  };

  const loadFeedback = async () => {
    try {
      const data = await fetchFeedback();
      setFeedbackList(data || []);
    } catch (err) {
      console.error('Ошибка загрузки списка пожеланий:', err);
    }
  };

  const loadPerms = async () => {
    try {
      const data = await fetchPermissions();
      if (data) setPermissionsMatrix(data);
    } catch {}
  };

  const handleTogglePermission = (lvl, permKey) => {
    if (Number(lvl) >= 10) return; // Level 10 always has full access
    setPermissionsMatrix((prev) => {
      const lvlPerms = prev[lvl] || {};
      return {
        ...prev,
        [lvl]: {
          ...lvlPerms,
          [permKey]: !lvlPerms[permKey]
        }
      };
    });
  };

  const handleSavePerms = async () => {
    setPermsSaving(true);
    try {
      await savePermissions(permissionsMatrix);
      setPermsSaved(true);
      playSound('success');
      if (showToast) showToast('Матрица прав и уровней доступа обновлена!');
      setTimeout(() => setPermsSaved(false), 3000);
    } catch (err) {
      console.error('Ошибка сохранения прав:', err);
    } finally {
      setPermsSaving(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    const id = (newDeptId.trim() || newDeptName.trim())
      .toLowerCase()
      .replace(/[^a-zа-я0-9_-]/gi, '_');

    try {
      const created = await saveDepartment({
        id,
        name: newDeptName.trim(),
        description: 'Смежный отдел'
      });
      setDepartments(prev => [...prev.filter(d => d.id !== created.id), created]);
      setNewDeptName('');
      setNewDeptId('');
      playSound('success');
      if (showToast) showToast(`Отдел «${created.name}» успешно добавлен!`);
    } catch (err) {
      console.error('Ошибка добавления отдела:', err);
      if (showToast) showToast('Не удалось сохранить отдел', '⚠️');
    }
  };

  const handleDeleteDept = async (deptId, deptName) => {
    if (deptId === 'design' || deptId === 'отдел_проектирования') {
      alert('Основной отдел проектирования нельзя удалить!');
      return;
    }
    if (!window.confirm(`Удалить отдел «${deptName}»?`)) return;

    try {
      await deleteDepartment(deptId);
      setDepartments(prev => prev.filter(d => d.id !== deptId));
      playSound('trash');
      if (showToast) showToast(`Отдел «${deptName}» удалён`);
    } catch (err) {
      console.error('Ошибка удаления отдела:', err);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackTitle.trim() || !feedbackMessage.trim()) return;

    setFeedbackSubmitting(true);
    try {
      const payload = {
        type: feedbackType,
        title: feedbackTitle.trim(),
        subject: feedbackTitle.trim(),
        message: feedbackMessage.trim(),
        author: currentUser ? currentUser.full_name : 'Инженер Уфанет',
        authorName: currentUser ? currentUser.full_name : 'Инженер Уфанет',
        authorId: currentUser?.id || null,
        authorRole: currentUser?.role || 'Отдел проектирования'
      };

      await sendFeedback(payload);
      playSound('success');
      setFeedbackSuccess(true);
      setFeedbackTitle('');
      setFeedbackMessage('');
      await loadFeedback();
      if (showToast) showToast('Пожелание сохранено на сервере! Спасибо! 🚀');
    } catch (err) {
      console.error('Ошибка сохранения пожелания:', err);
      if (showToast) showToast('Ошибка сохранения пожелания', '⚠️');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleDownloadFile = () => {
    playSound('click');
    window.open('/api/feedback/export', '_blank');
  };

  const overlayMouseDownRef = useRef(false);
  const handleOverlayMouseDown = (e) => {
    overlayMouseDownRef.current = (e.target === e.currentTarget);
  };
  const handleOverlayMouseUp = (e) => {
    if (overlayMouseDownRef.current && e.target === e.currentTarget && onClose) {
      onClose();
    }
    overlayMouseDownRef.current = false;
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
      style={{ zIndex: 1000 }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '750px',
          width: '95%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: 'var(--bg-modal, #111827)',
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.65)'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div 
              style={{ 
                width: 34, 
                height: 34, 
                borderRadius: '8px', 
                background: 'rgba(255,102,0,0.15)', 
                color: 'var(--accent-orange)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Панель управления и обратная связь
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Настройки отделов компании и журнал пожеланий инженеров
              </div>
            </div>
          </div>

          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-tertiary)'
          }}
        >
          <button
            type="button"
            className={`btn ${activeTab === 'feedback' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', gap: '6px' }}
            onClick={() => {
              setActiveTab('feedback');
              playSound('click');
            }}
          >
            <MessageSquarePlus size={15} />
            <span>Обратная связь и пожелания</span>
            {feedbackList.length > 0 && (
              <span 
                style={{ 
                  background: activeTab === 'feedback' ? 'rgba(0,0,0,0.25)' : 'var(--bg-primary)', 
                  padding: '1px 6px', 
                  borderRadius: '10px', 
                  fontSize: '0.72rem' 
                }}
              >
                {feedbackList.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', gap: '6px' }}
              onClick={() => {
                setActiveTab('departments');
                playSound('click');
              }}
            >
              <Building2 size={15} />
              <span>Отделы компании (архитектура)</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className={`btn ${activeTab === 'permissions' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', gap: '6px' }}
              onClick={() => {
                setActiveTab('permissions');
                playSound('click');
              }}
            >
              <ShieldCheck size={15} />
              <span>Роли и уровни (1..10)</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.4rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeTab === 'feedback' ? (
            /* TAB: FEEDBACK */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Info banner */}
              <div 
                style={{
                  background: 'rgba(255, 102, 0, 0.08)',
                  border: '1px solid rgba(255, 102, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <HelpCircle size={18} style={{ color: 'var(--accent-orange)', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                  <strong>Журнал пожеланий и багов отдела:</strong> Напишите любое предложение по доработке, 
                  удобству или ошибке. Все записи сохраняются на сервере в один общий файл <code>data/feedback_and_ideas.txt</code>, 
                  который вы можете в любой момент выгрузить кнопкой ниже и передать разработчику.
                </div>
              </div>

              {/* Submit Form */}
              <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>
                    Тип обращения:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'suggestion', label: '💡 Пожелание / Идея', color: '#ff6600' },
                      { id: 'bug', label: '🐛 Сообщение об ошибке', color: '#ef4444' },
                      { id: 'feature', label: '⚡ Улучшение интерфейса', color: '#3b82f6' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFeedbackType(type.id)}
                        style={{
                          padding: '0.35rem 0.8rem',
                          borderRadius: '20px',
                          border: feedbackType === type.id ? `2px solid ${type.color}` : '1px solid var(--border-subtle)',
                          background: feedbackType === type.id ? `${type.color}22` : 'var(--bg-secondary)',
                          color: feedbackType === type.id ? 'var(--text-main)' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          fontWeight: feedbackType === type.id ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Тема / Краткая суть:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Например: Добавить горячую клавишу для быстрого сохранения"
                    value={feedbackTitle}
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Подробное описание:
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Опишите, что именно нужно доработать, в каком окне, или как воспроизвести ошибку..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Автор: <strong style={{ color: 'var(--text-main)' }}>{currentUser ? currentUser.full_name : 'Инженер'}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleDownloadFile}
                      title="Выгрузить файл всех пожеланий с сервера"
                      style={{ fontSize: '0.8rem', gap: '6px' }}
                    >
                      <Download size={14} />
                      <span>Скачать файл (.txt)</span>
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={feedbackSubmitting || !feedbackTitle.trim() || !feedbackMessage.trim()}
                      style={{ fontSize: '0.8rem', gap: '6px' }}
                    >
                      <Send size={14} />
                      <span>{feedbackSubmitting ? 'Отправка...' : 'Отправить'}</span>
                    </button>
                  </div>
                </div>

                {feedbackSuccess && (
                  <div 
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      padding: '0.65rem 0.9rem',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Спасибо! Ваше обращение успешно записано в файл на сервере.</span>
                  </div>
                )}
              </form>

              {/* Recent Feedback List (Admin only) */}
              {isAdmin && feedbackList.length > 0 && (
                <div style={{ marginTop: '0.8rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={15} style={{ color: 'var(--accent-orange)' }} />
                    <span>Ранее отправленные пожелания ({feedbackList.length}):</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {feedbackList.slice().reverse().map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '0.65rem 0.85rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {item.title || item.subject}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            {(item.createdAt || item.created_at) ? new Date(item.createdAt || item.created_at).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>
                          {item.message}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', marginTop: '0.3rem' }}>
                          👤 {item.author || item.authorName || 'Инженер'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'permissions' ? (
            /* TAB: PERMISSIONS & ROLE LEVELS (1..10) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header explanation */}
              <div
                style={{
                  background: 'rgba(255, 102, 0, 0.08)',
                  border: '1px solid rgba(255, 102, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <ShieldCheck size={22} style={{ color: 'var(--accent-orange)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Иерархическая матрица прав доступа филиала (1–10 уровни)
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.45 }}>
                    Начальник отдела (10 уровень) имеет полный доступ ко всем функциям и может настраивать разрешения для инженеров, ведущих специалистов и стажеров.
                  </div>
                </div>
              </div>

              {/* Roles levels overview chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem' }}>
                {ROLE_LEVELS.map((rl) => {
                  const isMyLevel = Number(currentUser?.role_level) === rl.level;
                  return (
                    <div
                      key={rl.level}
                      style={{
                        padding: '0.65rem 0.8rem',
                        borderRadius: '8px',
                        background: isMyLevel ? 'rgba(255,102,0,0.12)' : 'var(--bg-secondary)',
                        border: isMyLevel ? '2px solid var(--accent-orange)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: rl.badgeColor, background: `${rl.badgeColor}22`, padding: '1px 6px', borderRadius: '4px' }}>
                          Уровень {rl.level}
                        </span>
                        {isMyLevel && <span style={{ fontSize: '0.66rem', color: 'var(--accent-orange)', fontWeight: 800 }}>Ваш уровень</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        {rl.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                        {rl.desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Permissions matrix table */}
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>Разрешение / Функция</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#ef4444' }}>Ур. 10 (Нач.)</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#f97316' }}>Ур. 8 (Вед.)</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#0284c7' }}>Ур. 6 (Инж.)</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#10b981' }}>Ур. 3 (Стаж.)</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#64748b' }}>Ур. 1 (Гость)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_DEFINITIONS.map((def, idx) => (
                      <tr
                        key={def.key}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '0.5rem 0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {def.name}
                        </td>

                        {[10, 8, 6, 3, 1].map((lvl) => {
                          const isAllowed = lvl === 10 ? true : Boolean(permissionsMatrix[lvl]?.[def.key]);
                          const isChief = Number(currentUser?.role_level) >= 10;
                          return (
                            <td key={lvl} style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isAllowed}
                                disabled={lvl === 10 || !isChief}
                                onChange={() => handleTogglePermission(lvl, def.key)}
                                style={{
                                  cursor: (lvl === 10 || !isChief) ? 'default' : 'pointer',
                                  accentColor: 'var(--accent-orange, #ff6600)',
                                  width: 15,
                                  height: 15
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  {Number(currentUser?.role_level) >= 10 ? (
                    <span style={{ color: '#10b981' }}>✓ Вы начальник отдела: можете изменять флаги матрицы</span>
                  ) : (
                    <span>🔒 Только начальник отдела (10 уровень) может сохранять изменения</span>
                  )}
                </div>

                {Number(currentUser?.role_level) >= 10 && (
                  <button
                    type="button"
                    onClick={handleSavePerms}
                    disabled={permsSaving}
                    className="btn btn-primary"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', gap: '6px' }}
                  >
                    <span>{permsSaving ? 'Сохранение...' : permsSaved ? '✓ Сохранено!' : 'Сохранить матрицу прав'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* TAB: DEPARTMENTS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div 
                style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <Building2 size={18} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                  <strong>Задел на будущее:</strong> Здесь формируется перечень отделов компании (проектирование, 
                  монтажники, эксплуатация, СВН, СКС и др.). В будущих релизах каждый отдел сможет иметь свои колонки, 
                  фильтры и доски, оставаясь в единой базе компании.
                </div>
              </div>

              {/* Add department form */}
              <form 
                onSubmit={handleAddDepartment}
                style={{
                  display: 'flex',
                  gap: '0.65rem',
                  alignItems: 'flex-end',
                  background: 'var(--bg-secondary)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                    Название отдела:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Например: Служба кабельных линий"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                    Код (ID):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="skl"
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '38px', padding: '0 0.9rem', fontSize: '0.8rem', gap: '5px' }}
                >
                  <Plus size={15} />
                  <span>Добавить</span>
                </button>
              </form>

              {/* List of departments */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Существующие отделы:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {departments.map(dept => {
                    const isMain = dept.id === 'design' || dept.id === 'отдел_проектирования';
                    return (
                      <div
                        key={dept.id}
                        style={{
                          padding: '0.65rem 0.9rem',
                          background: 'var(--bg-secondary)',
                          border: isMain ? '1px solid rgba(255,102,0,0.3)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div 
                            style={{ 
                              width: 28, 
                              height: 28, 
                              borderRadius: '6px', 
                              background: isMain ? 'rgba(255,102,0,0.15)' : 'var(--bg-tertiary)',
                              color: isMain ? 'var(--accent-orange)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Building2 size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {dept.name}
                              {isMain && (
                                <span 
                                  style={{ 
                                    marginLeft: '0.5rem', 
                                    fontSize: '0.68rem', 
                                    background: 'rgba(255,102,0,0.15)', 
                                    color: 'var(--accent-orange)', 
                                    padding: '1px 6px', 
                                    borderRadius: '4px',
                                    fontWeight: 700
                                  }}
                                >
                                  Текущий основной
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              Код: {dept.id}
                            </div>
                          </div>
                        </div>

                        {!isMain && (
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDeleteDept(dept.id, dept.name)}
                            title="Удалить отдел"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
