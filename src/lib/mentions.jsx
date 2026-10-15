import React, { useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';

/**
 * Parses text and replaces @Name or @все with interactive Discord/Telegram-style mention tags
 */
export function renderWithMentions(text, teamMembers = [], onMentionClick) {
  if (!text) return null;
  const str = String(text);

  // Pattern matches @Word Word (up to 3 words) or @Word
  // We match against team members' names and "@все"
  const tokens = [];
  let remaining = str;
  let keyIdx = 0;

  // Build list of valid mention triggers
  const allTriggers = [
    { label: '@все', name: 'Все (отдел)', color: '#ff6600', isAll: true },
    { label: '@all', name: 'Все (отдел)', color: '#ff6600', isAll: true },
    ...teamMembers.map((m) => ({
      label: `@${m.full_name}`,
      name: m.full_name,
      color: m.avatar_color || '#ff6600',
      initials: m.initials,
      member: m
    })),
    // Also support @First_Name
    ...teamMembers.map((m) => ({
      label: `@${m.full_name.split(' ')[0]}`,
      name: m.full_name,
      color: m.avatar_color || '#ff6600',
      initials: m.initials,
      member: m
    }))
  ];

  // Sort by trigger length descending so longest matches take precedence
  allTriggers.sort((a, b) => b.label.length - a.label.length);

  // Regex that captures @anything until punctuation or space
  const mentionRegex = /@([а-яА-ЯёЁa-zA-Z0-9_\-]+(?:\s+[а-яА-ЯёЁa-zA-Z0-9_\-]+)?)/g;

  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(str)) !== null) {
    const matchStart = match.index;
    const matchEnd = mentionRegex.lastIndex;
    const matchedText = match[0];

    // Push preceding regular text
    if (matchStart > lastIndex) {
      tokens.push(<span key={`txt-${keyIdx++}`}>{str.slice(lastIndex, matchStart)}</span>);
    }

    // Check if matchedText matches any trigger (case-insensitive)
    const lowerMatch = matchedText.toLowerCase();
    const matchedTrigger = allTriggers.find(
      (t) => t.label.toLowerCase() === lowerMatch || lowerMatch.startsWith(t.label.toLowerCase())
    );

    if (matchedTrigger) {
      const chipColor = matchedTrigger.color || 'var(--accent-orange)';
      tokens.push(
        <span
          key={`chip-${keyIdx++}`}
          onClick={(e) => {
            if (onMentionClick && matchedTrigger.member) {
              e.stopPropagation();
              onMentionClick(matchedTrigger.member);
            }
          }}
          title={matchedTrigger.isAll ? 'Уведомление для всего отдела' : `Сотрудник: ${matchedTrigger.name}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: `${chipColor}22`,
            color: chipColor,
            border: `1px solid ${chipColor}44`,
            borderRadius: '4px',
            padding: '1px 5px',
            margin: '0 2px',
            fontWeight: 700,
            fontSize: '0.85em',
            lineHeight: 1.2,
            cursor: onMentionClick ? 'pointer' : 'default',
            userSelect: 'none',
            transition: 'all 0.15s ease'
          }}
          className="mention-chip-hover"
        >
          <span style={{ opacity: 0.85 }}>@</span>
          <span>{matchedTrigger.isAll ? 'все' : (matchedTrigger.member?.full_name || matchedTrigger.name)}</span>
        </span>
      );
    } else {
      // Just normal text that had @
      tokens.push(<span key={`at-${keyIdx++}`}>{matchedText}</span>);
    }

    lastIndex = matchEnd;
  }

  // Push remaining text
  if (lastIndex < str.length) {
    tokens.push(<span key={`txt-${keyIdx++}`}>{str.slice(lastIndex)}</span>);
  }

  return tokens.length > 0 ? tokens : str;
}

/**
 * Extracts target member IDs from a text containing @mentions
 */
export function extractMentionTargets(text, teamMembers = []) {
  if (!text) return [];
  const lower = text.toLowerCase();

  // If @все or @all mentioned, return all member IDs
  if (lower.includes('@все') || lower.includes('@all')) {
    return teamMembers.map((m) => m.id);
  }

  const targets = [];
  for (const m of teamMembers) {
    const fullNameAt = `@${m.full_name.toLowerCase()}`;
    const firstNameAt = `@${m.full_name.split(' ')[0].toLowerCase()}`;
    const initialsAt = `@${(m.initials || '').toLowerCase()}`;

    if (lower.includes(fullNameAt) || lower.includes(firstNameAt) || (m.initials && lower.includes(initialsAt))) {
      targets.push(m.id);
    }
  }

  return [...new Set(targets)];
}

/**
 * Autocomplete Popup dropdown component for @mentions
 */
export function MentionAutocompleteDropdown({
  query = '',
  teamMembers = [],
  onSelect,
  position = { top: '100%', left: 0, marginTop: '4px' }
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const q = (query || '').toLowerCase().trim();

  // Filter team members by query
  const filtered = teamMembers.filter((m) => {
    if (!q) return true;
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.initials?.toLowerCase().includes(q)
    );
  });

  const allOption = { id: '__all__', full_name: 'Все (весь отдел)', role: 'Уведомить всех сотрудников', isAll: true };
  const items = q === '' || 'все'.includes(q) || 'all'.includes(q) ? [allOption, ...filtered] : filtered;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (items.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (items[selectedIndex]) {
          e.preventDefault();
          onSelect(items[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [items, selectedIndex, onSelect]);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10050,
        background: 'var(--bg-modal, #1e293b)',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.55)',
        width: '280px',
        maxHeight: '230px',
        overflowY: 'auto',
        padding: '4px',
        animation: 'fadeIn 0.15s ease',
        ...position
      }}
      className="mention-dropdown-menu"
    >
      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim, #94a3b8)', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Упомянуть сотрудника (@)
      </div>
      {items.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={item.id}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: isSelected ? 'rgba(255, 102, 0, 0.2)' : 'transparent',
              border: isSelected ? '1px solid rgba(255, 102, 0, 0.4)' : '1px solid transparent',
              transition: 'background 0.1s ease'
            }}
          >
            {item.isAll ? (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--accent-orange, #ff6600)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 800
                }}
              >
                <Users size={12} />
              </div>
            ) : (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: item.avatar_color || '#ff6600',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}
              >
                {item.initials || 'УФ'}
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #f8fafc)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.full_name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim, #94a3b8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.role}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
