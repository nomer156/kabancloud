import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Database, 
  Users, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ChevronDown
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
  onOpenSupabaseModal,
  onOpenTeamModal,
  supabaseConfigured
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
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-logo" title="Kaban Pro">
          <Layers size={22} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-title">
            Kaban Pro
            <span className="brand-badge">Отдел проектирования</span>
          </div>
          <div className="brand-subtitle">
            Команда: 6 инженеров • Синхронизация задач
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="header-stats" title="Сводка по проекту">
        <div className="stat-item">
          <span>Всего:</span>
          <span className="stat-value">{totalCount}</span>
        </div>
        <div style={{ color: 'var(--border-subtle)' }}>•</div>
        <div className="stat-item" style={{ color: '#3b82f6' }}>
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

      {/* Header Controls */}
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
              style={{ backgroundColor: currentUser?.avatar_color || '#3b82f6' }}
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
                minWidth: '220px'
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
                    background: currentUser?.id === m.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div 
                    className="user-avatar-badge" 
                    style={{ backgroundColor: m.avatar_color, width: 22, height: 22, fontSize: '0.65rem' }}
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

        {/* Supabase status badge */}
        <button 
          type="button"
          className={`status-pill ${supabaseConfigured ? 'connected' : 'local'}`}
          onClick={() => {
            playSound('click');
            onOpenSupabaseModal();
          }}
          title={supabaseConfigured ? 'Подключено к Supabase (Realtime)' : 'Автономный режим (Demo) — кликните для настройки Supabase'}
        >
          <div className="pulse-dot" />
          <Database size={13} />
          <span>{supabaseConfigured ? 'Supabase' : 'Локально (Demo)'}</span>
        </button>

        {/* Team Modal Button */}
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            playSound('click');
            onOpenTeamModal();
          }}
          title="Список 6 проектировщиков отдела"
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
