import React from 'react';
import { DEPARTMENTS } from '../lib/constants';
import { playSound } from '../lib/sound';
import { MessageSquare, Layers, Globe } from 'lucide-react';

export function DepartmentBar({
  departments = DEPARTMENTS,
  activeDepartmentId = 'all',
  onSelectDepartment,
  tasks = [],
  onOpenChat
}) {
  const totalTasksCount = tasks.length;

  return (
    <div
      className="department-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.45rem 1.25rem',
        background: 'var(--bg-secondary, #141824)',
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        gap: '0.75rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}
    >
      {/* Left: Department Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-dim, #64748b)',
            marginRight: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          <Layers size={13} style={{ color: 'var(--accent-orange, #ff6600)' }} />
          <span>Отдел:</span>
        </span>

        {/* All Departments Pill */}
        <button
          type="button"
          onClick={() => {
            playSound('click');
            onSelectDepartment('all');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.4rem 0.8rem',
            borderRadius: 'var(--radius-md, 8px)',
            border: activeDepartmentId === 'all' ? '1.5px solid var(--accent-orange, #ff6600)' : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            background: activeDepartmentId === 'all' ? 'rgba(255, 102, 0, 0.16)' : 'var(--bg-tertiary, #1c2233)',
            color: activeDepartmentId === 'all' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            fontWeight: activeDepartmentId === 'all' ? 800 : 600,
            fontSize: '0.78rem',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
        >
          <Globe size={14} style={{ color: activeDepartmentId === 'all' ? 'var(--accent-orange, #ff6600)' : 'inherit' }} />
          <span>Все отделы</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '10px',
              background: activeDepartmentId === 'all' ? 'var(--accent-orange, #ff6600)' : 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800
            }}
          >
            {totalTasksCount}
          </span>
        </button>

        {/* Specific Departments Pills */}
        {departments.map((dept) => {
          const isSelected = activeDepartmentId === dept.id;
          const deptTasksCount = tasks.filter((t) => (t.department_id || 'dept-design') === dept.id).length;

          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => {
                playSound('click');
                onSelectDepartment(dept.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-md, 8px)',
                border: isSelected ? `1.5px solid ${dept.color}` : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                background: isSelected ? `${dept.color}22` : 'var(--bg-tertiary, #1c2233)',
                color: isSelected ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                fontWeight: isSelected ? 800 : 600,
                fontSize: '0.78rem',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              title={dept.desc}
            >
              <span>{dept.icon}</span>
              <span>{dept.name}</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isSelected ? dept.color : 'rgba(255,255,255,0.08)',
                  color: isSelected ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}
              >
                {deptTasksCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Department Chat Shortcut */}
      {onOpenChat && (
        <button
          type="button"
          onClick={() => {
            playSound('click');
            onOpenChat();
          }}
          className="btn btn-secondary"
          style={{
            padding: '0.38rem 0.75rem',
            fontSize: '0.76rem',
            gap: '6px',
            flexShrink: 0,
            border: '1px solid var(--accent-orange, #ff6600)33'
          }}
          title="Открыть корпоративный чат отдела (YouGile Chat)"
        >
          <MessageSquare size={14} style={{ color: 'var(--accent-orange, #ff6600)' }} />
          <span>Чат отдела</span>
        </button>
      )}
    </div>
  );
}
