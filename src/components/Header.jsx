import React, { useState } from 'react';
import { 
  Network, 
  Plus, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Wifi, 
  Users, 
  Flame, 
  CheckCircle2, 
  Clock, 
  ChevronDown,
  Kanban,
  FileBarChart,
  Layers,
  Edit2,
  Bell,
  FileSpreadsheet,
  Trash2,
  Check,
  LogOut,
  Settings
} from 'lucide-react';
import { playSound, isSoundEnabled, setSoundEnabled } from '../lib/sound';
import { renderWithMentions } from '../lib/mentions';

export function Header({
  tasks,
  teamMembers,
  currentUser,
  onSelectCurrentUser,
  theme,
  onToggleTheme,
  onOpenNewTask,
  onOpenNetworkModal,
  onOpenTeamModal,
  onOpenSectionsModal,
  onOpenColumnsModal,
  onOpenImportModal,
  onOpenSettingsModal,
  activeView,
  onSelectView,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onDeleteNotification,
  onOpenTaskFromNotification,
  onLogout
}) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Compute live statistics
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  const handleToggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    setSoundEnabled(nextVal);
    if (nextVal) playSound('click');
  };

  return (
    <header className="app-header">
      {/* Left: Brand & Main Navigation Tabs */}
      <div className="brand-section">
        <div className="brand-logo" title="Уфанет • Отдел проектирования">
          <Network size={22} strokeWidth={2.4} />
        </div>
        <div>
          <div className="brand-title">
            <span className="brand-accent">Уфанет</span>
            <span>Проект</span>
            <span className="brand-badge">Отдел проектирования</span>
          </div>
          <div className="brand-subtitle">
            Корпоративная доска • Локальная сеть
          </div>
        </div>

        {/* View Switcher: Kanban Board vs Monthly Report */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginLeft: '1.25rem',
            padding: '0.2rem',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <button
            type="button"
            className={`btn ${activeView === 'board' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', border: 'none' }}
            onClick={() => {
              playSound('click');
              onSelectView('board');
            }}
          >
            <Kanban size={14} />
            <span>Доска задач</span>
          </button>

          <button
            type="button"
            className={`btn ${activeView === 'report' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', border: 'none' }}
            onClick={() => {
              playSound('click');
              onSelectView('report');
            }}
          >
            <FileBarChart size={14} />
            <span>Ежемесячный отчёт</span>
          </button>
        </div>
      </div>

      {/* Middle: Stats bar */}
      <div className="header-stats" title="Сводка по задачам">
        <div className="stat-item">
          <span>Всего:</span>
          <span className="stat-value">{totalCount}</span>
        </div>
        <div style={{ color: 'var(--border-subtle)' }}>•</div>
        <div className="stat-item" style={{ color: 'var(--accent-orange)' }}>
          <Clock size={13} />
          <span>В работе:</span>
          <span className="stat-value">{inProgressCount}</span>
        </div>
        <div style={{ color: 'var(--border-subtle)' }}>•</div>
        <div className="stat-item" style={{ color: '#f59e0b' }}>
          <span>Проверка:</span>
          <span className="stat-value">{reviewCount}</span>
        </div>
        <div style={{ color: 'var(--border-subtle)' }}>•</div>
        <div className="stat-item" style={{ color: '#10b981' }}>
          <CheckCircle2 size={13} />
          <span>Готово:</span>
          <span className="stat-value">{doneCount}</span>
        </div>
        {urgentCount > 0 && (
          <>
            <div style={{ color: 'var(--border-subtle)' }}>•</div>
            <div className="stat-item stat-urgent" title="Срочные задачи">
              <Flame size={14} />
              <span>Горят:</span>
              <span className="stat-value">{urgentCount}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="header-actions">
        {/* User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div 
            className="user-switcher"
            style={{ 
              cursor: 'default', 
              background: 'var(--bg-tertiary)', 
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem'
            }}
            title={`Авторизован: ${currentUser?.full_name || 'Инженер'} (${currentUser?.role || 'Отдел проектирования'})`}
          >
            <div 
              className="user-avatar-badge" 
              style={{ 
                backgroundColor: currentUser?.avatar_color || '#ff6600', 
                width: 26, 
                height: 26, 
                fontSize: '0.72rem',
                fontWeight: 800
              }}
            >
              {currentUser?.initials || 'Я'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {currentUser ? currentUser.full_name : 'Инженер'}
              </span>
              <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                {currentUser?.role || 'Отдел проектирования'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              playSound('click');
              if (onLogout) onLogout();
            }}
            title="Выйти из текущего профиля (сменить пользователя)"
            style={{ padding: '0.38rem 0.7rem', fontSize: '0.76rem', gap: '5px' }}
          >
            <LogOut size={13} style={{ color: 'var(--accent-rose, #ef4444)' }} />
            <span>Выйти</span>
          </button>
        </div>

        {/* Notifications & Mentions Center (Bell Icon) */}
        <div style={{ position: 'relative' }}>
          {(() => {
            // Strictly filter notifications: only those where currentUser was mentioned OR which currentUser authored
            const userNotifications = notifications.filter((notif) => {
              if (!currentUser?.id) return false;
              const isTargeted = (Array.isArray(notif.targetUserIds) && notif.targetUserIds.includes(currentUser.id)) ||
                notif.targetUserId === currentUser.id ||
                (Array.isArray(notif.targetUserIds) && notif.targetUserIds.includes('__all__'));
              const isAuthor = (notif.fromUserId && notif.fromUserId === currentUser.id) ||
                (notif.fromUserName && notif.fromUserName === currentUser.full_name);
              return isTargeted || isAuthor;
            });

            // Unread badge only counts unread notifications targeted to the current user
            const unreadCount = userNotifications.filter(n => {
              if (n.read) return false;
              const isTargeted = (Array.isArray(n.targetUserIds) && n.targetUserIds.includes(currentUser?.id)) ||
                n.targetUserId === currentUser?.id ||
                (Array.isArray(n.targetUserIds) && n.targetUserIds.includes('__all__'));
              return isTargeted;
            }).length;
            return (
              <>
                <button
                  type="button"
                  className="btn-icon"
                  style={{
                    position: 'relative',
                    color: unreadCount > 0 ? 'var(--accent-orange)' : 'var(--text-muted)'
                  }}
                  onClick={() => {
                    setNotifDropdownOpen(!notifDropdownOpen);
                    playSound('click');
                  }}
                  title={unreadCount > 0 ? `Упоминания и уведомления: ${unreadCount} непрочитанных` : 'Уведомления и упоминания'}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        minWidth: '17px',
                        height: '17px',
                        borderRadius: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.7)',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: 'var(--bg-modal, #1e293b)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 12px 35px rgba(0,0,0,0.5)',
                      width: '360px',
                      maxHeight: '440px',
                      display: 'flex',
                      flexDirection: 'column',
                      zIndex: 100,
                      animation: 'fadeIn 0.15s ease'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-secondary)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                        <Bell size={15} style={{ color: 'var(--accent-orange)' }} />
                        <span>Упоминания и уведомления</span>
                        {unreadCount > 0 && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>
                            +{unreadCount}
                          </span>
                        )}
                      </div>

                      {userNotifications.length > 0 && (
                        <button
                          type="button"
                          className="btn-mini-action"
                          onClick={() => {
                            if (onMarkAllNotificationsRead) onMarkAllNotificationsRead();
                            playSound('click');
                          }}
                          style={{ fontSize: '0.7rem', gap: '4px' }}
                        >
                          <Check size={12} />
                          <span>Прочитать все</span>
                        </button>
                      )}
                    </div>

                    {/* Notifications list */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {userNotifications.map((notif) => {
                        const isTargetedToMe = currentUser?.id && (
                          (Array.isArray(notif.targetUserIds) && notif.targetUserIds.includes(currentUser.id)) ||
                          notif.targetUserId === currentUser.id ||
                          (Array.isArray(notif.targetUserIds) && notif.targetUserIds.includes('__all__'))
                        );

                        const isAuthor = (notif.fromUserId && notif.fromUserId === currentUser?.id) ||
                          (notif.fromUserName && notif.fromUserName === currentUser?.full_name);

                        let targetLabel = 'уведомление';
                        if (isTargetedToMe && !isAuthor) {
                          targetLabel = 'упомянул(а) вас';
                        } else if (isTargetedToMe && isAuthor) {
                          targetLabel = 'вы упомянули себя';
                        } else if (isAuthor) {
                          const names = Array.isArray(notif.targetUserIds) && notif.targetUserIds.length > 0
                            ? notif.targetUserIds.map(id => teamMembers.find(m => m.id === id)?.full_name || id)
                                .filter(Boolean)
                                .join(', ')
                            : '';
                          targetLabel = names ? `вы упомянули @${names}` : 'исходящее упоминание';
                        }

                        const isUnreadForMe = !notif.read && isTargetedToMe;

                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (onMarkNotificationRead) onMarkNotificationRead(notif.id);
                              if (onOpenTaskFromNotification) onOpenTaskFromNotification(notif.taskId);
                              setNotifDropdownOpen(false);
                              playSound('click');
                            }}
                            style={{
                              padding: '0.65rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              background: isUnreadForMe ? 'rgba(255, 102, 0, 0.12)' : 'var(--bg-card)',
                              border: isUnreadForMe ? '1px solid rgba(255, 102, 0, 0.35)' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.3rem',
                              transition: 'all 0.15s ease'
                            }}
                            className="notif-item-hover"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: notif.fromUserAvatar || '#ff6600',
                                    color: '#fff',
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {notif.fromUserName ? notif.fromUserName.substring(0, 2).toUpperCase() : 'УФ'}
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  {notif.fromUserName || 'Коллега'}
                                </span>
                                <span style={{ 
                                  fontSize: '0.68rem', 
                                  color: isTargetedToMe ? 'var(--accent-orange)' : 'var(--text-dim)',
                                  fontWeight: isTargetedToMe ? 700 : 400
                                }}>
                                  {targetLabel}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isUnreadForMe && (
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff6600' }} />
                                )}
                              <button
                                type="button"
                                className="btn-icon btn-icon-danger"
                                style={{ width: 18, height: 18, padding: 0, opacity: 0.6 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onDeleteNotification) onDeleteNotification(notif.id);
                                }}
                                title="Удалить уведомление"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--accent-orange)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            📌 {notif.taskTitle || 'Задача'}
                          </div>

                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.35, maxHeight: '38px', overflow: 'hidden' }}>
                            {renderWithMentions(notif.text, teamMembers)}
                          </div>

                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'flex-end' }}>
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : ''}
                          </div>
                        </div>
                      );
                    })}

                      {userNotifications.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                          <Bell size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                          <div>Уведомлений пока нет</div>
                          <div style={{ fontSize: '0.72rem', marginTop: '4px', opacity: 0.7 }}>
                            Когда коллеги упомянут вас через @ФИО в комментариях, они появятся здесь.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Local Network IP status badge */}
        <button 
          type="button"
          className="status-pill lan"
          onClick={() => {
            playSound('click');
            onOpenNetworkModal();
          }}
          title="Локальная сеть отдела — ссылка для коллег"
        >
          <div className="pulse-dot" />
          <Wifi size={13} />
          <span>Локальная сеть (LAN)</span>
        </button>

        {/* Sections Management Button */}
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            playSound('click');
            onOpenSectionsModal();
          }}
          title="Управление разделами проекта (ВДН, ККС, МКЖ...)"
        >
          <Layers size={17} />
        </button>

        {/* Columns Management Button */}
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            playSound('click');
            onOpenColumnsModal();
          }}
          title="Управление колонками доски (этапами разработки)"
        >
          <Kanban size={17} />
        </button>


        {/* Settings & Departments / Feedback Modal Button */}
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            playSound('click');
            if (onOpenSettingsModal) onOpenSettingsModal();
          }}
          title="Настройки: отделы компании и обратная связь / пожелания"
        >
          <Settings size={17} />
        </button>

        {/* Sound toggle */}
        <button
          type="button"
          className="btn-icon"
          onClick={handleToggleSound}
          title={soundOn ? 'Звук включен' : 'Звук выключен'}
        >
          {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            playSound('click');
            onToggleTheme();
          }}
          title={theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Import from ERP / Excel Button */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            playSound('click');
            if (onOpenImportModal) onOpenImportModal();
          }}
          title="Быстрый импорт задач из ERP или Excel"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', gap: '5px' }}
        >
          <FileSpreadsheet size={15} style={{ color: 'var(--accent-orange)' }} />
          <span>Импорт из ERP</span>
        </button>

        {/* Primary New Task button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            playSound('click');
            onOpenNewTask();
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Новая задача</span>
        </button>
      </div>
    </header>
  );
}
