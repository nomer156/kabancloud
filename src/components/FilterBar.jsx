import React from 'react';
import { Search, X, Filter, UserCheck, Briefcase } from 'lucide-react';
import { SECTIONS } from '../lib/constants';
import { playSound } from '../lib/sound';

export function FilterBar({
  teamMembers,
  projects,
  selectedAssigneeId,
  onSelectAssignee,
  onlyMyTasks,
  onToggleOnlyMyTasks,
  selectedSection,
  onSelectSection,
  selectedProject,
  onSelectProject,
  searchQuery,
  onSearchChange,
  onResetFilters
}) {
  const isAnyFilterActive = Boolean(
    selectedAssigneeId ||
    onlyMyTasks ||
    selectedSection ||
    selectedProject ||
    searchQuery.trim()
  );

  return (
    <div className="filter-bar">
      {/* Left: Quick Views & Team Avatars */}
      <div className="filter-group">
        {/* Toggle My Tasks */}
        <button
          type="button"
          className={`btn ${onlyMyTasks ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
          onClick={() => {
            playSound('click');
            onToggleOnlyMyTasks();
          }}
          title="Показать только задачи, назначенные на текущего пользователя"
        >
          <UserCheck size={14} />
          <span>Мои задачи</span>
        </button>

        {/* Team Avatars Bar */}
        <div className="team-filter-list" title="Фильтр по инженеру">
          <button
            type="button"
            className={`team-avatar-all ${!selectedAssigneeId && !onlyMyTasks ? 'selected' : ''}`}
            onClick={() => {
              playSound('click');
              onSelectAssignee(null);
            }}
          >
            Все (6)
          </button>
          {teamMembers.map((member) => {
            const isSelected = selectedAssigneeId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                className={`team-avatar-btn ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: member.avatar_color }}
                onClick={() => {
                  playSound('click');
                  onSelectAssignee(isSelected ? null : member.id);
                }}
                title={`${member.full_name} (${member.role})`}
              >
                {member.initials}
              </button>
            );
          })}
        </div>

        {/* Sections Pills */}
        <div className="section-pills">
          <button
            type="button"
            className={`section-pill-btn ${!selectedSection ? 'active' : ''}`}
            onClick={() => {
              playSound('click');
              onSelectSection(null);
            }}
          >
            Все разделы
          </button>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className={`section-pill-btn ${selectedSection === sec.id ? 'active' : ''}`}
              style={
                selectedSection === sec.id
                  ? { backgroundColor: sec.bg, color: sec.color, borderColor: sec.color }
                  : {}
              }
              onClick={() => {
                playSound('click');
                onSelectSection(selectedSection === sec.id ? null : sec.id);
              }}
            >
              {sec.id}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Project selector & Search */}
      <div className="filter-group">
        {/* Project Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Briefcase size={14} style={{ color: 'var(--text-dim)' }} />
          <select
            className="form-select"
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', minWidth: '150px' }}
            value={selectedProject || ''}
            onChange={(e) => {
              playSound('click');
              onSelectProject(e.target.value || null);
            }}
          >
            <option value="">Все объекты / проекты</option>
            {projects.map((proj) => (
              <option key={proj} value={proj}>
                {proj}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по задаче, шифру..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Reset Button */}
        {isAnyFilterActive && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.38rem 0.65rem', fontSize: '0.75rem', color: 'var(--accent-rose)' }}
            onClick={() => {
              playSound('click');
              onResetFilters();
            }}
            title="Сбросить все фильтры"
          >
            <X size={13} />
            <span>Сброс</span>
          </button>
        )}
      </div>
    </div>
  );
}
