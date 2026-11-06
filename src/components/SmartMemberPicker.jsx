import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, User, X, Check, ChevronDown } from 'lucide-react';
import { DEPARTMENTS } from '../lib/constants';

/**
 * Smart Employee Search & Select Component
 * Replaces clunky native <select> with a searchable, avatar-rich dropdown.
 */
export function SmartMemberPicker({
  value, // member.id or null
  onChange, // (memberId) => void
  teamMembers = [],
  departments = DEPARTMENTS,
  placeholder = 'Назначить исполнителя...',
  compact = false,
  allowClear = true,
  disabled = false,
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const deptsList = Array.isArray(departments) && departments.length > 0 ? departments : DEPARTMENTS;

  // Selected member object
  const selectedMember = useMemo(() => {
    if (!value) return null;
    return teamMembers.find((m) => m.id === value || m.username === value) || null;
  }, [value, teamMembers]);

  // Selected member's department
  const selectedDept = useMemo(() => {
    if (!selectedMember) return null;
    return deptsList.find((d) => d.id === selectedMember.department_id) || deptsList[0];
  }, [selectedMember, deptsList]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKey, true);
    }
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen]);

  // Filtered list based on search query
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return teamMembers;

    return teamMembers.filter((m) => {
      const name = (m.full_name || '').toLowerCase();
      const user = (m.username || '').toLowerCase();
      const role = (m.role || '').toLowerCase();
      const dept = (deptsList.find((d) => d.id === m.department_id)?.name || '').toLowerCase();
      return name.includes(q) || user.includes(q) || role.includes(q) || dept.includes(q);
    });
  }, [searchQuery, teamMembers, deptsList]);

  const handleSelect = (memberId) => {
    onChange(memberId);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: compact ? 'auto' : '100%',
        ...style
      }}
    >
      {/* Trigger Button */}
      {compact ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: selectedMember
              ? (selectedMember.avatar_color ? `${selectedMember.avatar_color}22` : 'rgba(255, 102, 0, 0.15)')
              : 'rgba(255, 255, 255, 0.06)',
            border: selectedMember
              ? `1px solid ${selectedMember.avatar_color || 'var(--accent-orange)'}55`
              : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
            color: selectedMember ? '#ffffff' : 'var(--text-muted, #94a3b8)',
            fontSize: '0.74rem',
            fontWeight: selectedMember ? 700 : 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          title={selectedMember ? `Исполнитель: ${selectedMember.full_name}` : placeholder}
        >
          {selectedMember ? (
            <>
              <div
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: '50%',
                  background: selectedMember.avatar_color || '#ff6600',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {selectedMember.initials || selectedMember.full_name?.[0] || 'У'}
              </div>
              <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedMember.full_name?.split(' ')[0]}
              </span>
            </>
          ) : (
            <>
              <User size={12} style={{ color: 'var(--text-dim)' }} />
              <span>{placeholder}</span>
            </>
          )}
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>
      ) : (
        <div
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className="form-input"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: '#1a2234',
            border: isOpen ? '1px solid var(--accent-orange)' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
            padding: '0.45rem 0.75rem',
            borderRadius: '8px',
            minHeight: '38px',
            transition: 'all 0.15s ease'
          }}
        >
          {selectedMember ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: selectedMember.avatar_color || '#ff6600',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {selectedMember.initials || selectedMember.full_name?.[0] || 'У'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedMember.full_name}
                </span>
                <span style={{ fontSize: '0.66rem', color: selectedDept?.color || 'var(--text-dim)' }}>
                  {selectedDept?.icon} {selectedDept?.name} • {selectedMember.role || 'Сотрудник'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <User size={15} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: '0.82rem' }}>{placeholder}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {allowClear && selectedMember && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px'
                }}
                title="Снять исполнителя"
              >
                <X size={13} />
              </button>
            )}
            <ChevronDown size={14} style={{ color: 'var(--text-dim)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </div>
        </div>
      )}

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: compact ? 'auto' : 0,
            minWidth: compact ? '260px' : '100%',
            maxWidth: '360px',
            zIndex: 10050,
            background: '#141824',
            border: '1px solid rgba(255, 102, 0, 0.4)',
            borderRadius: '10px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7)',
            padding: '6px',
            animation: 'fadeIn 0.12s ease'
          }}
        >
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.35rem 0.6rem',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
              marginBottom: '6px'
            }}
          >
            <Search size={13} style={{ color: 'var(--accent-orange)' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по ФИО, должности, отделу..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.78rem',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Unassign / Clear Option */}
          {allowClear && (
            <div
              onClick={() => handleSelect('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.76rem',
                color: !value ? 'var(--accent-orange)' : 'var(--text-muted)',
                background: !value ? 'rgba(255, 102, 0, 0.12)' : 'transparent',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '4px'
              }}
            >
              <User size={13} style={{ opacity: 0.6 }} />
              <span style={{ fontWeight: !value ? 700 : 500 }}>— Без исполнителя —</span>
              {!value && <Check size={12} style={{ marginLeft: 'auto' }} />}
            </div>
          )}

          {/* Members List */}
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                Сотрудников не найдено
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = member.id === value;
                const dept = deptsList.find((d) => d.id === member.department_id) || deptsList[0];
                return (
                  <div
                    key={member.id}
                    onClick={() => handleSelect(member.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(255, 102, 0, 0.2)' : 'transparent',
                      border: isSelected ? '1px solid rgba(255, 102, 0, 0.4)' : '1px solid transparent',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: member.avatar_color || '#ff6600',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      {member.initials || member.full_name?.[0] || 'У'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: 1.2 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 800 : 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.full_name}
                      </span>
                      <span style={{ fontSize: '0.64rem', color: dept?.color || 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dept?.icon} {dept?.name} • {member.role || 'Инженер'}
                      </span>
                    </div>

                    {isSelected && <Check size={13} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
