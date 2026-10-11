import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  User, 
  Layers, 
  Briefcase, 
  FolderGit2, 
  CheckSquare, 
  MessageSquare, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Flame, 
  Building2, 
  AlertCircle,
  Save,
  Send,
  History
} from 'lucide-react';
import { PRIORITIES, WORK_TYPES } from '../lib/constants';
import { playSound } from '../lib/sound';
import confetti from 'canvas-confetti';

const MONTHS_SHORT = [
  'янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня',
  'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'
];

function getDeadlineBadge(dueDate, isDone = false) {
  if (!dueDate || isDone) return null;
  const target = new Date(dueDate);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = targetMidnight.getTime() - nowMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      type: 'overdue',
      text: `Просрочено на ${overdueDays} дн.`,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)'
    };
  }

  if (diffDays === 0) {
    return {
      type: 'today',
      text: 'Срок: Сегодня',
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.12)',
      border: 'rgba(249, 115, 22, 0.3)'
    };
  }

  if (diffDays === 1) {
    return {
      type: 'tomorrow',
      text: 'Срок: Завтра',
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.12)',
      border: 'rgba(249, 115, 22, 0.3)'
    };
  }

  const day = target.getDate();
  const monthName = MONTHS_SHORT[target.getMonth()];
  return {
    type: 'upcoming',
    text: `До ${day} ${monthName}`,
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.1)',
    border: 'rgba(2, 132, 199, 0.25)'
  };
}

function calculateTotalMinutes(worklogs) {
  if (!worklogs || !Array.isArray(worklogs)) return 0;
  return worklogs.reduce((total, wl) => {
    if (!wl.time) return total;
    const str = String(wl.time).trim();
    if (str.includes(':')) {
      const [hh, mm] = str.split(':');
      return total + (parseInt(hh, 10) || 0) * 60 + (parseInt(mm, 10) || 0);
    }
    const dec = parseFloat(str) || 0;
    return total + Math.round(dec * 60);
  }, 0);
}

function minutesToTimeString(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function TaskDetailView({
  task,
  teamMembers = [],
  projects = [],
  sections = [],
  columns = [],
  currentUser,
  onSaveTask,
  onDeleteTask,
  onBack
}) {
  // Main fields state
  const [title, setTitle] = useState(task?.title || '');
  const [projectCode, setProjectCode] = useState(task?.project_code || '');
  const [section, setSection] = useState(task?.section || 'ВДН');
  const [status, setStatus] = useState(task?.status || 'backlog');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [networkLink, setNetworkLink] = useState(task?.network_link || '');
  const [description, setDescription] = useState(task?.description || '');
  const [checklist, setChecklist] = useState(task?.checklist || []);
  const [newChecklistText, setNewChecklistText] = useState('');

  // ERP & Timesheet fields
  const [erpProjectId, setErpProjectId] = useState(task?.erp_project_id || '');
  const [erpTaskNumber, setErpTaskNumber] = useState(task?.erp_task_number || '');
  const [houseId, setHouseId] = useState(task?.house_id || '');
  const [workType, setWorkType] = useState(task?.work_type || WORK_TYPES[0]);

  // Jira-style Bottom Tabs: 'worklog' | 'comments' | 'erp'
  const [activeBottomTab, setActiveBottomTab] = useState('worklog');

  // Worklogs (Журнал времени)
  const [worklogs, setWorklogs] = useState(() => Array.isArray(task?.worklogs) ? task.worklogs : []);
  const [wlDate, setWlDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wlHours, setWlHours] = useState('04');
  const [wlMinutes, setWlMinutes] = useState('00');
  const [wlComment, setWlComment] = useState('');

  // Comments (Комментарии)
  const [comments, setComments] = useState(() => Array.isArray(task?.comments) ? task.comments : []);
  const [newCommentText, setNewCommentText] = useState('');

  // Feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync if task prop changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setProjectCode(task.project_code || '');
      setSection(task.section || 'ВДН');
      setStatus(task.status || 'backlog');
      setPriority(task.priority || 'medium');
      setAssigneeId(task.assignee_id || '');
      setDueDate(task.due_date || '');
      setNetworkLink(task.network_link || '');
      setDescription(task.description || '');
      setChecklist(task.checklist || []);
      setErpProjectId(task.erp_project_id || '');
      setErpTaskNumber(task.erp_task_number || '');
      setHouseId(task.house_id || '');
      setWorkType(task.work_type || WORK_TYPES[0]);
      setWorklogs(Array.isArray(task.worklogs) ? task.worklogs : []);
      setComments(Array.isArray(task.comments) ? task.comments : []);
    }
  }, [task]);

  if (!task) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertCircle size={36} style={{ color: 'var(--accent-orange)', marginBottom: '1rem' }} />
        <h2>Задача не найдена</h2>
        <button type="button" className="btn btn-primary" onClick={onBack} style={{ marginTop: '1rem' }}>
          Вернуться к доске
        </button>
      </div>
    );
  }

  // Worklog total calculation
  const totalMinutes = calculateTotalMinutes(worklogs);
  const totalHoursString = totalMinutes > 0 ? minutesToTimeString(totalMinutes) : (task.hours_spent || '00:00');

  // Add worklog entry
  const handleAddWorklog = (e) => {
    e?.preventDefault();
    const hh = wlHours.trim().padStart(2, '0') || '00';
    const mm = wlMinutes.trim().padStart(2, '0') || '00';
    const timeFormatted = `${hh}:${mm}`;

    if (hh === '00' && mm === '00') {
      alert('Пожалуйста, укажите время списания больше 0 минут');
      return;
    }

    const newEntry = {
      id: `wl-${Date.now()}`,
      date: wlDate,
      time: timeFormatted,
      comment: wlComment.trim(),
      user_id: currentUser?.id || null,
      user_name: currentUser?.full_name || 'Инженер',
      created_at: new Date().toISOString()
    };

    const updatedWorklogs = [newEntry, ...worklogs];
    setWorklogs(updatedWorklogs);
    setWlComment('');
    playSound('success');

    // Automatically recalculate hours_spent for ERP
    const nextTotalMinutes = calculateTotalMinutes(updatedWorklogs);
    const nextTotalStr = minutesToTimeString(nextTotalMinutes);

    // Save immediately
    handleSaveAll({
      worklogs: updatedWorklogs,
      hours_spent: nextTotalStr
    });
  };

  // Delete worklog entry
  const handleDeleteWorklog = (wlId) => {
    const updated = worklogs.filter((w) => w.id !== wlId);
    setWorklogs(updated);
    playSound('click');

    const nextTotalMinutes = calculateTotalMinutes(updated);
    const nextTotalStr = minutesToTimeString(nextTotalMinutes);

    handleSaveAll({
      worklogs: updated,
      hours_spent: nextTotalStr
    });
  };

  // Add comment
  const handleAddComment = (e) => {
    e?.preventDefault();
    if (!newCommentText.trim()) return;

    const newComm = {
      id: `comm-${Date.now()}`,
      text: newCommentText.trim(),
      user_id: currentUser?.id || null,
      user_name: currentUser?.full_name || 'Инженер',
      user_initials: currentUser?.initials || 'УФ',
      avatar_color: currentUser?.avatar_color || '#ff6600',
      created_at: new Date().toISOString()
    };

    const updated = [newComm, ...comments];
    setComments(updated);
    setNewCommentText('');
    playSound('success');

    handleSaveAll({ comments: updated });
  };

  // Delete comment
  const handleDeleteComment = (commId) => {
    const updated = comments.filter((c) => c.id !== commId);
    setComments(updated);
    playSound('click');
    handleSaveAll({ comments: updated });
  };

  // Toggle checklist
  const handleToggleChecklist = (id) => {
    const updated = checklist.map((item) => {
      if (item.id === id) {
        const nextDone = !item.done;
        if (nextDone) playSound('success');
        else playSound('click');
        return { ...item, done: nextDone };
      }
      return item;
    });
    setChecklist(updated);
    if (updated.length > 0 && updated.every((i) => i.done)) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
    handleSaveAll({ checklist: updated });
  };

  // Add checklist item
  const handleAddChecklistItem = (e) => {
    e?.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem = {
      id: `check-${Date.now()}`,
      text: newChecklistText.trim(),
      done: false
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistText('');
    playSound('click');
    handleSaveAll({ checklist: updated });
  };

  // Save all task updates
  const handleSaveAll = (extraOverrides = {}) => {
    const finalHours = extraOverrides.hours_spent !== undefined 
      ? extraOverrides.hours_spent 
      : (worklogs.length > 0 ? minutesToTimeString(totalMinutes) : task.hours_spent);

    const updatedTask = {
      ...task,
      title: title.trim(),
      project_code: projectCode,
      section,
      status,
      priority,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      network_link: networkLink.trim() || null,
      description: description.trim() || null,
      checklist: extraOverrides.checklist || checklist,
      erp_project_id: erpProjectId.trim() || null,
      erp_task_number: erpTaskNumber.trim() || null,
      house_id: houseId.trim() || null,
      work_type: workType || null,
      hours_spent: finalHours,
      worklogs: extraOverrides.worklogs || worklogs,
      comments: extraOverrides.comments || comments,
      ...extraOverrides
    };

    onSaveTask(updatedTask);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCopyLink = () => {
    if (networkLink) {
      navigator.clipboard.writeText(networkLink);
      setCopiedLink(true);
      playSound('click');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const sectionMeta = sections.find((s) => s.id === section) || {
    id: section,
    color: '#ff6600',
    bg: 'rgba(255, 102, 0, 0.15)',
    border: 'rgba(255, 102, 0, 0.35)'
  };

  const assignee = teamMembers.find((m) => m.id === assigneeId);
  const deadlineBadge = getDeadlineBadge(dueDate, status === 'done');
  const doneChecklist = checklist.filter((i) => i.done).length;
  const totalChecklist = checklist.length;
  const checklistPercent = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header / Breadcrumb Bar */}
      <header
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Вернуться к доске"
          >
            <ArrowLeft size={15} />
            <span>К доске</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            <span>Уфанет Проект</span>
            <span>/</span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '4px',
                backgroundColor: sectionMeta.bg,
                color: sectionMeta.color,
                border: `1px solid ${sectionMeta.border}`
              }}
            >
              {sectionMeta.id}
            </span>
            <span>/</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{projectCode}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {savedSuccess && (
            <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <Check size={14} /> Сохранено
            </span>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveAll()}
            style={{ padding: '0.4rem 0.95rem', fontSize: '0.8rem' }}
          >
            <Save size={15} />
            <span>Сохранить</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout: Left (Main Content) vs Right (Metadata Sidebar) */}
      <div style={{ flex: 1, maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem' }}>
        
        {/* ================= LEFT MAIN COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Title Box */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Название задачи / Выпуск чертежей
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1.3rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                marginTop: '0.25rem'
              }}
              placeholder="Введите название проекта..."
            />

            {/* Network Link Bar */}
            {networkLink && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.85rem',
                  padding: '0.4rem 0.65rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-subtle)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <FolderGit2 size={15} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                  {networkLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-mini-action"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                >
                  {copiedLink ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                  <span>{copiedLink ? 'Скопировано!' : 'Копировать путь'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Description & Notes */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Описание проекта / Исходные данные
            </label>
            <textarea
              className="form-textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Дополнительные примечания, технические условия, заметки к чертежам..."
              style={{ marginTop: '0.4rem' }}
            />
          </div>

          {/* Interactive Checklist */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckSquare size={16} style={{ color: 'var(--accent-orange)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Этапы разработки (Чек-лист)</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {doneChecklist} из {totalChecklist} ({checklistPercent}%)
              </span>
            </div>

            {totalChecklist > 0 && (
              <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.85rem' }}>
                <div style={{ height: '100%', width: `${checklistPercent}%`, background: 'var(--accent-orange)', transition: 'width 0.25s ease' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
              {checklist.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.45rem 0.65rem',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleToggleChecklist(item.id)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent-orange)' }}
                  />
                  <span style={{ flex: 1, fontSize: '0.84rem', textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-dim)' : 'var(--text-main)' }}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = checklist.filter((i) => i.id !== item.id);
                      setChecklist(updated);
                      handleSaveAll({ checklist: updated });
                    }}
                    className="btn-icon btn-icon-danger"
                    style={{ width: 22, height: 22, padding: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Добавить этап (например: согласовать ввод с ТСЖ)..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleAddChecklistItem}>
                <Plus size={14} />
                <span>Добавить</span>
              </button>
            </div>
          </div>

          {/* ================= JIRA-STYLE BOTTOM TABS ================= */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', padding: '0.35rem 0.5rem' }}>
              <button
                type="button"
                className={`btn ${activeBottomTab === 'worklog' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', border: 'none' }}
                onClick={() => {
                  setActiveBottomTab('worklog');
                  playSound('click');
                }}
              >
                <Clock size={14} />
                <span>Журнал работы (Worklog)</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '10px', marginLeft: '4px' }}>
                  {totalHoursString} ч.
                </span>
              </button>

              <button
                type="button"
                className={`btn ${activeBottomTab === 'comments' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', border: 'none' }}
                onClick={() => {
                  setActiveBottomTab('comments');
                  playSound('click');
                }}
              >
                <MessageSquare size={14} />
                <span>Комментарии ({comments.length})</span>
              </button>

              <button
                type="button"
                className={`btn ${activeBottomTab === 'erp' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', border: 'none' }}
                onClick={() => {
                  setActiveBottomTab('erp');
                  playSound('click');
                }}
              >
                <FileSpreadsheet size={14} />
                <span>Данные для ERP и ЗП</span>
              </button>
            </div>

            {/* Tab 1: WORKLOG (Журнал времени как в Jira) */}
            {activeBottomTab === 'worklog' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Списывайте трудозатраты по дням. Итоговые часы автоматически суммируются для табеля ЗП.
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>
                    Итого за все дни: {totalHoursString} ч.
                  </div>
                </div>

                {/* Log Work Input Form */}
                <form
                  onSubmit={handleAddWorklog}
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={14} style={{ color: 'var(--accent-orange)' }} />
                    <span>Записать время работы:</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 160px 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
                    {/* Date with 'Today' button */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                        Дата списания:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="date"
                          className="form-input"
                          value={wlDate}
                          onChange={(e) => setWlDate(e.target.value)}
                          style={{ width: '135px' }}
                        />
                        <button
                          type="button"
                          className="btn-mini-action"
                          style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                          onClick={() => setWlDate(new Date().toISOString().split('T')[0])}
                        >
                          Сегодня
                        </button>
                      </div>
                    </div>

                    {/* Time with fixed colon */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                        Время (ЧЧ:ММ):
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0 0.4rem' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={3}
                          value={wlHours}
                          onChange={(e) => setWlHours(e.target.value.replace(/[^0-9]/g, ''))}
                          style={{ width: '38px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, background: 'transparent', border: 'none', color: 'var(--accent-orange)', padding: '0.35rem 0' }}
                          placeholder="04"
                        />
                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--accent-orange)' }}>:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={wlMinutes}
                          onChange={(e) => setWlMinutes(e.target.value.replace(/[^0-9]/g, ''))}
                          style={{ width: '36px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, background: 'transparent', border: 'none', color: 'var(--accent-orange)', padding: '0.35rem 0' }}
                          placeholder="00"
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>ч:м</span>
                      </div>
                    </div>

                    {/* Activity / Comment */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                        Что делалось (примечание):
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Например: Трассировка в Visio, составление СП..."
                        value={wlComment}
                        onChange={(e) => setWlComment(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}>
                      <Plus size={14} />
                      <span>Записать</span>
                    </button>
                  </div>
                </form>

                {/* Worklog entries list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {worklogs.map((wl) => (
                    <div
                      key={wl.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          📅 {wl.date}
                        </span>
                        <span style={{ fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                          ⏱ {wl.time} ч.
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                          {wl.comment || <i style={{ color: 'var(--text-dim)' }}>Без примечания</i>}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                          {wl.user_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteWorklog(wl.id)}
                          className="btn-icon btn-icon-danger"
                          style={{ width: 22, height: 22, padding: 0 }}
                          title="Удалить запись списания"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {worklogs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      В этой задаче пока нет записей о списанном времени. Заполните форму выше, чтобы зафиксировать работу.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: COMMENTS (Комментарии) */}
            {activeBottomTab === 'comments' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* New comment input */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Написать комментарий или замечание к проекту..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}>
                      <Send size={13} />
                      <span>Отправить комментарий</span>
                    </button>
                  </div>
                </form>

                {/* Comments list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {comments.map((comm) => (
                    <div
                      key={comm.id}
                      style={{
                        padding: '0.75rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              backgroundColor: comm.avatar_color || '#ff6600',
                              color: 'white',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {comm.user_initials || 'УФ'}
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{comm.user_name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            {new Date(comm.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comm.id)}
                          className="btn-icon btn-icon-danger"
                          style={{ width: 22, height: 22, padding: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', paddingLeft: '1.75rem' }}>
                        {comm.text}
                      </div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      Комментариев пока нет. Вы можете оставить замечание или комментарий по ходу проекта.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: ERP & TIMESHEET (Данные для ЗП) */}
            {activeBottomTab === 'erp' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>ID проекта в ERP</label>
                    <input
                      type="text"
                      className="form-input"
                      value={erpProjectId}
                      onChange={(e) => setErpProjectId(e.target.value)}
                      placeholder="Например: 24.102.04912.001923"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Номер задачи из ERP</label>
                    <input
                      type="text"
                      className="form-input"
                      value={erpTaskNumber}
                      onChange={(e) => setErpTaskNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Например: 123456789"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      <Building2 size={13} />
                      <span>ID дома (числовой)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={houseId}
                      onChange={(e) => setHouseId(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Например: 111213"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Вид работы для табеля</label>
                    <select
                      className="form-select"
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                    >
                      {WORK_TYPES.map((wt) => (
                        <option key={wt} value={wt}>
                          {wt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>Итоговое списанное время для табеля ЗП:</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Рассчитывается автоматически из журнала списаний (Worklog)</div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>
                    {totalHoursString} ч.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDEBAR ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              Параметры задачи
            </div>

            {/* Status (Column) */}
            <div className="form-group">
              <label className="form-label">Статус (Этап)</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  handleSaveAll({ status: e.target.value });
                }}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="form-group">
              <label className="form-label">
                <User size={13} />
                <span>Исполнитель</span>
              </label>
              <select
                className="form-select"
                value={assigneeId}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                  handleSaveAll({ assignee_id: e.target.value || null });
                }}
              >
                <option value="">-- Не назначен --</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Section / Mark */}
            <div className="form-group">
              <label className="form-label">
                <Layers size={13} />
                <span>Раздел (Марка)</span>
              </label>
              <select
                className="form-select"
                value={section}
                onChange={(e) => {
                  setSection(e.target.value);
                  handleSaveAll({ section: e.target.value });
                }}
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name || sec.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="form-group">
              <label className="form-label">Приоритет</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  handleSaveAll({ priority: e.target.value });
                }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date with Traffic Light Badge */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  <Calendar size={13} />
                  <span>Срок сдачи (Дедлайн)</span>
                </label>
                {deadlineBadge && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: deadlineBadge.color,
                      backgroundColor: deadlineBadge.bg,
                      border: `1px solid ${deadlineBadge.border}`,
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {deadlineBadge.text}
                  </span>
                )}
              </div>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleSaveAll({ due_date: e.target.value });
                }}
              />
            </div>

            {/* Project / Object */}
            <div className="form-group">
              <label className="form-label">
                <Briefcase size={13} />
                <span>Объект / Проект</span>
              </label>
              <select
                className="form-select"
                value={projectCode}
                onChange={(e) => {
                  setProjectCode(e.target.value);
                  handleSaveAll({ project_code: e.target.value });
                }}
              >
                {projects.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            </div>

            {/* Network Link input */}
            <div className="form-group">
              <label className="form-label">
                <FolderGit2 size={13} />
                <span>Сетевая папка</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={networkLink}
                onChange={(e) => setNetworkLink(e.target.value)}
                placeholder="\\ufanet-server\projects\..."
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}
              />
            </div>

            {/* Actions */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveAll()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Save size={15} />
                <span>Сохранить всё</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', color: 'var(--accent-rose)' }}
                onClick={() => {
                  if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
                    onDeleteTask(task.id);
                    onBack();
                  }
                }}
              >
                <Trash2 size={14} />
                <span>Удалить задачу</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
