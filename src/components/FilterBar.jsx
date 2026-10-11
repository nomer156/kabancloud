import React from 'react';
import { Search, X, UserCheck, Briefcase, Settings2 } from 'lucide-react';
import { playSound } from '../lib/sound';

export function FilterBar({
  teamMembers,
  projects,
  sections,
  currentUser,
  selectedAssigneeId,
  onSelectAssignee,
  selectedSection,
  onSelectSection,
  selectedProject,
  onSelectProject,
  searchQuery,
  onSearchChange,
  onResetFilters,
  onOpenSectionsModal,
  onOpenTeamModal
}) {
  const isMyTasksActive = Boolean(currentUser && selectedAssigneeId === currentUser.id);

  const handleToggleMyTasks = () => {
    playSound('click');
    if (isMyTasksActive) {
      onSelectAssignee(null);
    } else if (currentUser) {
      onSelectAssignee(currentUser.id);
    }
  };

  const isAnyFilterActive = Boolean(
    selectedAssigneeId ||
    selectedSection ||
    selectedProject ||
    searchQuery.trim()
  );

  return (
    <div className="filter-bar">
      {/* Left: Quick Views, Team Avatars & Sections */}
      <div className="filter-group">
        {/* Toggle My Tasks */}
        <button
          type="button"
          className={`btn ${isMyTasksActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
          onClick={handleToggleMyTasks}
          title={currentUser ? `Показать только задачи инженера: ${currentUser.full_name}` : 'Мои задачи'}
        >
          <UserCheck size={14} />
          <span>Мои задачи</span>
        </button>

        {/* Team Avatars Bar */}
        <div className="team-filter-list" title="Фильтр по сотруднику">
          <button
            type="button"
            className={`team-avatar-all ${!selectedAssigneeId ? 'selected' : ''}`}
            onClick={() => {
              playSound('click');
              onSelectAssignee(null);
            }}
          >
            Все отдел
          </button>
          {teamMembers.map((member) => {
            const isSelected = selectedAssigneeId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                className={`team-avatar-btn ${isSelected ? 'selected' : ''}`}
                style={{
                  backgroundColor: member.avatar_color,
                  boxShadow: isSelected ? `0 0 0 3px var(--accent-orange), 0 0 8px rgba(255, 102, 0, 0.45)` : undefined
                }}
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
          {onOpenTeamModal && (
            <button
              type="button"
              className="btn-icon"
              style={{ width: 26, height: 26, padding: 0 }}
              onClick={() => {
                playSound('click');
                onOpenTeamModal();
              }}
              title="Настроить инженеров (цвета, имена, должности)"
            >
              <Settings2 size={13} />
            </button>
          )}
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
            Все марки
          </button>
          {sections.map((sec) => (
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
              title={sec.name}
            >
              {sec.id}
            </button>
          ))}

          {/* Quick configure sections button */}
          <button
            type="button"
            onClick={onOpenSectionsModal}
            className="btn-icon"
            style={{ width: 26, height: 26, padding: 0 }}
            title="Редактировать список марок/разделов"
          >
            <Settings2 size={13} />
          </button>
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
            placeholder="Поиск по задаче, шифру, ERP..."
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
