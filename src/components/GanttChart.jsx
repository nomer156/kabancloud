import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { playSound } from '../lib/sound';

export function GanttChart({
  tasks = [],
  allTasks = [],
  teamMembers = [],
  sections = [],
  onEditTask,
  onSaveTask,
  onQuickAddTask
}) {
  const [timeUnit, setTimeUnit] = useState('days'); // 'days' | 'weeks'
  const [centerDate, setCenterDate] = useState(() => new Date());
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [draggingTask, setDraggingTask] = useState(null);
  const scrollContainerRef = useRef(null);

  // Hierarchically sort tasks so child subtasks are indented beneath root tasks
  const displayTasks = useMemo(() => {
    const list = [];
    const rootTasks = tasks.filter((t) => !t.parent_task_id);
    const childTasksMap = new Map();
    tasks.forEach((t) => {
      if (t.parent_task_id) {
        if (!childTasksMap.has(t.parent_task_id)) childTasksMap.set(t.parent_task_id, []);
        childTasksMap.get(t.parent_task_id).push(t);
      }
    });

    rootTasks.forEach((parent) => {
      list.push({ ...parent, isChild: false, depth: 0 });
      const children = childTasksMap.get(parent.id) || [];
      children.forEach((child) => {
        list.push({ ...child, isChild: true, depth: 1, parentTitle: parent.title });
      });
    });

    // Add any orphaned child tasks whose parents aren't in current filter
    tasks.forEach((t) => {
      if (t.parent_task_id && !rootTasks.some((r) => r.id === t.parent_task_id)) {
        list.push({ ...t, isChild: true, depth: 0 });
      }
    });

    return list;
  }, [tasks]);

  const handleBarMouseDown = (e, task, mode) => {
    e.stopPropagation();
    e.preventDefault();
    let startDate = task.created_at ? new Date(task.created_at) : new Date();
    if (isNaN(startDate.getTime())) startDate = new Date();
    let endDate = task.due_date ? new Date(task.due_date) : null;
    if (!endDate || isNaN(endDate.getTime())) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 5);
    }

    setDraggingTask({
      task,
      mode,
      startX: e.clientX,
      originalStartMs: startDate.getTime(),
      originalEndMs: endDate.getTime()
    });
  };

  useEffect(() => {
    if (!draggingTask) return;

    const handleMouseUp = (e) => {
      const dayPixelWidth = 44;
      const deltaPx = e.clientX - draggingTask.startX;
      const deltaDays = Math.round(deltaPx / dayPixelWidth);

      if (deltaDays !== 0 && onSaveTask) {
        const msPerDay = 86400000;
        let newStartMs = draggingTask.originalStartMs;
        let newEndMs = draggingTask.originalEndMs;

        if (draggingTask.mode === 'move') {
          newStartMs += deltaDays * msPerDay;
          newEndMs += deltaDays * msPerDay;
        } else if (draggingTask.mode === 'resize') {
          newEndMs = Math.max(newStartMs + msPerDay, newEndMs + deltaDays * msPerDay);
        }

        const newStartDate = new Date(newStartMs).toISOString().split('T')[0];
        const newEndDate = new Date(newEndMs).toISOString().split('T')[0];

        onSaveTask({
          ...draggingTask.task,
          created_at: newStartDate,
          due_date: newEndDate
        });
        playSound('click');
      }

      setDraggingTask(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTask, onSaveTask]);

  // Time window: 28 days around centerDate
  const daysRange = useMemo(() => {
    const days = [];
    const start = new Date(centerDate);
    start.setDate(start.getDate() - 7); // 7 days in past, 21 days in future
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [centerDate]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const minDate = daysRange[0];
  const maxDate = daysRange[daysRange.length - 1];
  const totalDays = daysRange.length;

  const navigateDays = (delta) => {
    setCenterDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
    playSound('click');
  };

  const resetToToday = () => {
    setCenterDate(new Date());
    playSound('click');
  };

  // Calculate pixel/percentage offset and width for task bar
  const getTaskBarMetrics = (task) => {
    let startDate = task.created_at ? new Date(task.created_at) : new Date();
    if (isNaN(startDate.getTime())) startDate = new Date();

    let endDate = task.due_date ? new Date(task.due_date) : null;
    if (!endDate || isNaN(endDate.getTime())) {
      // Default duration: 5 days from start
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 5);
    }

    // Clip to visible window
    const windowStartMs = minDate.getTime();
    const windowEndMs = maxDate.getTime() + 86400000;
    const windowDurationMs = windowEndMs - windowStartMs;

    const taskStartMs = Math.max(startDate.getTime(), windowStartMs);
    const taskEndMs = Math.min(endDate.getTime() + 86400000, windowEndMs);

    if (taskEndMs < windowStartMs || taskStartMs > windowEndMs) {
      return null; // Task is outside the visible timeline
    }

    const leftPercent = ((taskStartMs - windowStartMs) / windowDurationMs) * 100;
    const widthPercent = Math.max(2.5, ((taskEndMs - taskStartMs) / windowDurationMs) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      isStartClipped: startDate.getTime() < windowStartMs,
      isEndClipped: endDate.getTime() > windowEndMs,
      startDate,
      endDate
    };
  };

  const formatDayHeader = (date) => {
    const daysRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return {
      dayNum: date.getDate(),
      dayName: daysRu[date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: date.toISOString().split('T')[0] === todayStr
    };
  };

  return (
    <div
      className="gantt-view-container"
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        overflow: 'hidden'
      }}
    >
      {/* 1. Gantt Toolbar */}
      <div
        style={{
          padding: '0.6rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} style={{ color: 'var(--accent-orange)' }} />
            Диаграмма Ганта
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'var(--bg-base)', padding: '2px 8px', borderRadius: '12px' }}>
            {tasks.length} задач на таймлайне
          </span>
        </div>

        {/* Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigateDays(-7)}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
          >
            <ChevronLeft size={14} />
            <span>-7 дн</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetToToday}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
          >
            Сегодня
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigateDays(7)}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
          >
            <span>+7 дн</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 2. Main Gantt Workspace: Left Task Column + Right Timeline Grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Left: Task Headers Column (Fixed width 320px) */}
        <div
          style={{
            width: '320px',
            minWidth: '320px',
            maxWidth: '320px',
            height: '100%',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 3
          }}
        >
          {/* Header row */}
          <div
            style={{
              height: '48px',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '0 0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: 'rgba(0, 0, 0, 0.04)'
            }}
          >
            <span>Задача / Объект</span>
            <span>Исполнитель</span>
          </div>

          {/* Task rows list */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {displayTasks.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                Нет задач, соответствующих текущим фильтрам
              </div>
            ) : (
              displayTasks.map((task) => {
                const assignee = teamMembers.find((m) => m.id === task.assignee_id);
                const isHovered = hoveredTaskId === task.id;
                const isDone = task.status === 'done';

                const subtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0 ? task.subtasks : (Array.isArray(task.checklist) ? task.checklist : []);
                const doneCount = subtasks.filter((s) => s.done).length;

                return (
                  <div
                    key={task.id}
                    onClick={() => { if (onEditTask) onEditTask(task); }}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    style={{
                      height: '42px',
                      borderBottom: '1px solid var(--border-subtle)',
                      padding: '0 0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isHovered ? 'var(--bg-hover)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, paddingLeft: task.depth > 0 ? '16px' : '0' }}>
                      {task.depth > 0 && <span style={{ color: 'var(--accent-orange)', fontSize: '0.75rem', fontWeight: 800 }}>↳</span>}
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: isDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 102, 0, 0.15)',
                          color: isDone ? '#10b981' : 'var(--accent-orange)',
                          flexShrink: 0
                        }}
                      >
                        {task.display_id || task.id.slice(0, 8)}
                      </span>

                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: isDone ? 'var(--text-dim)' : 'var(--text-main)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={task.title}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, paddingLeft: '8px' }}>
                      {subtasks.length > 0 && (
                        <span style={{ fontSize: '0.65rem', color: doneCount === subtasks.length ? '#10b981' : 'var(--text-dim)' }}>
                          {doneCount}/{subtasks.length}
                        </span>
                      )}

                      {assignee ? (
                        <span
                          title={assignee.full_name}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: assignee.avatar_color || 'var(--accent-orange)',
                            color: '#fff',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {assignee.initials || assignee.full_name.slice(0, 2).toUpperCase()}
                        </span>
                      ) : (
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-base)', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                          <User size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Timeline Grid Canvas (Scrollable horizontally) */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            overflowX: 'auto',
            overflowY: 'auto',
            position: 'relative',
            background: 'var(--bg-base)'
          }}
        >
          {/* Timeline Header Row (Days of the week) */}
          <div
            style={{
              height: '48px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              position: 'sticky',
              top: 0,
              background: 'var(--bg-card)',
              zIndex: 2,
              minWidth: `${totalDays * 44}px`
            }}
          >
            {daysRange.map((day, idx) => {
              const meta = formatDayHeader(day);
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    minWidth: '44px',
                    borderRight: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: meta.isToday
                      ? 'rgba(255, 102, 0, 0.12)'
                      : meta.isWeekend
                      ? 'rgba(0, 0, 0, 0.08)'
                      : 'transparent',
                    color: meta.isToday ? 'var(--accent-orange)' : meta.isWeekend ? 'var(--text-dim)' : 'var(--text-muted)'
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{meta.dayName}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: meta.isToday ? 800 : 700 }}>{meta.dayNum}</span>
                </div>
              );
            })}
          </div>

          {/* Timeline Body: Task Bars */}
          <div style={{ position: 'relative', minWidth: `${totalDays * 44}px` }}>
            {/* Background grid vertical day lines */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                pointerEvents: 'none',
                height: `${displayTasks.length * 42}px`
              }}
            >
              {daysRange.map((day, idx) => {
                const meta = formatDayHeader(day);
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      minWidth: '44px',
                      borderRight: '1px solid var(--border-subtle)',
                      background: meta.isToday
                        ? 'rgba(255, 102, 0, 0.04)'
                        : meta.isWeekend
                        ? 'rgba(0, 0, 0, 0.02)'
                        : 'transparent',
                      position: 'relative'
                    }}
                  >
                    {/* Vertical line indicator for Today */}
                    {meta.isToday && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: '50%',
                          width: '2px',
                          background: 'var(--accent-orange)',
                          zIndex: 1
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Task rows and bars */}
            {displayTasks.map((task) => {
              const metrics = getTaskBarMetrics(task);
              const isHovered = hoveredTaskId === task.id;
              const isDone = task.status === 'done';

              const subtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0 ? task.subtasks : (Array.isArray(task.checklist) ? task.checklist : []);
              const totalSub = subtasks.length;
              const doneSub = subtasks.filter((s) => s.done).length;
              const percent = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : (isDone ? 100 : 0);

              const barColor = isDone
                ? '#10b981'
                : task.priority === 'urgent'
                ? '#ef4444'
                : 'var(--accent-orange)';

              return (
                <div
                  key={task.id}
                  style={{
                    height: '42px',
                    borderBottom: '1px solid var(--border-subtle)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    background: isHovered ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                  }}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                >
                  {metrics && (
                    <div
                      onClick={() => { if (onEditTask) onEditTask(task); }}
                      onMouseDown={(e) => handleBarMouseDown(e, task, 'move')}
                      title={`${task.display_id || ''}: ${task.title} (Потяните для переноса дат или правый край для изменения срока)`}
                      style={{
                        position: 'absolute',
                        left: metrics.left,
                        width: metrics.width,
                        height: '24px',
                        background: 'var(--bg-card)',
                        border: `1.5px solid ${barColor}`,
                        borderRadius: '6px',
                        cursor: 'grab',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 6px',
                        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.15)',
                        zIndex: 2,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        transform: isHovered ? 'scaleY(1.08)' : 'none'
                      }}
                    >
                      {/* Progress fill inside bar */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: `${percent}%`,
                          background: barColor,
                          opacity: 0.35,
                          pointerEvents: 'none'
                        }}
                      />

                      <div
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          width: 'calc(100% - 10px)'
                        }}
                      >
                        <span style={{ color: barColor }}>{task.display_id}</span>
                        <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{task.title}</span>
                      </div>

                      {/* Right edge drag resize handle */}
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, task, 'resize')}
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bottom: 0,
                          width: '10px',
                          cursor: 'ew-resize',
                          background: 'rgba(255, 255, 255, 0.2)',
                          borderLeft: '1px solid rgba(0, 0, 0, 0.2)',
                          zIndex: 10
                        }}
                        title="Потяните для изменения срока"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
