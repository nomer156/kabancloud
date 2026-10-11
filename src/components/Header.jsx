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
  Layers
} from 'lucide-react';
import { playSound, isSoundEnabled, setSoundEnabled } from '../lib/sound';

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
  activeView,
  onSelectView
}) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
        {/* Current user switch (Кто я сейчас) */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button"
            className="user-switcher"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            title="Переключить текущего пользователя (для просмотра 'Мои задачи')"
          >
            <div 
              className="user-avatar-badge" 
              style={{ backgroundColor: currentUser?.avatar_color || '#ff6600' }}
            >
              {currentUser?.initials || 'Я'}
            </div>
            <span className="user-switcher-label">
              {currentUser ? currentUser.full_name.split(' ')[0] : 'Выбрать'}
            </span>
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </button>

          {userDropdownOpen && (
            <div 
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--bg-modal)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '0.4rem',
                zIndex: 60,
                minWidth: '240px'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', padding: '0.4rem 0.6rem', fontWeight: 600 }}>
                КТО СЕЙЧАС ЗА КОМПЬЮТЕРОМ:
              </div>
              {teamMembers.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelectCurrentUser(m);
                    setUserDropdownOpen(false);
                    playSound('click');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.5rem 0.6rem',
                    background: currentUser?.id === m.id ? 'rgba(255, 102, 0, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div 
                    className="user-avatar-badge" 
                    style={{ backgroundColor: m.avatar_color, width: 24, height: 24, fontSize: '0.68rem' }}
                  >
                    {m.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.full_name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {m.role}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
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

        {/* Team Modal Button */}
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            playSound('click');
            onOpenTeamModal();
          }}
          title="Сотрудники отдела проектирования"
        >
          <Users size={17} />
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
