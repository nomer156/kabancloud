import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Calendar, 
  FolderGit2, 
  CheckSquare, 
  User, 
  Layers, 
  AlertCircle,
  Briefcase,
  Clock,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Home,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PRIORITIES, COLUMNS, WORK_TYPES } from '../lib/constants';
import { playSound } from '../lib/sound';

function normalizeToTimeFormat(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (str.includes(':')) return str;
  const num = parseFloat(str);
  if (isNaN(num)) return str;
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function TaskModal({
  isOpen,
  onClose,
  taskToEdit,
  initialStatus = 'backlog',
  teamMembers = [],
  projects = [],
  sections = [],
  columns = [],
  onSaveTask,
  onDeleteTask
}) {
  const [title, setTitle] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [newProjectInput, setNewProjectInput] = useState('');
  const [section, setSection] = useState('ВДН');
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [networkLink, setNetworkLink] = useState('');
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // ERP & Timesheet fields (located at the bottom of the form)
  const [erpProjectId, setErpProjectId] = useState('');
  const [erpTaskNumber, setErpTaskNumber] = useState('');
  const [houseId, setHouseId] = useState('');
  
  // Time state: hours and minutes with fixed ':'
  const [hoursPart, setHoursPart] = useState('');
  const [minutesPart, setMinutesPart] = useState('');
  const [workType, setWorkType] = useState(WORK_TYPES[0]);
  const [isErpAccordionOpen, setIsErpAccordionOpen] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  
  const minutesInputRef = useRef(null);
  const hoursInputRef = useRef(null);
  const accordionRef = useRef(null);
  const modalBodyRef = useRef(null);

  // Sync state when modal opens or editing task changes
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setProjectCode(taskToEdit.project_code || '');
      setSection(taskToEdit.section || (sections[0]?.id || 'ВДН'));
      setStatus(taskToEdit.status || 'backlog');
      setPriority(taskToEdit.priority || 'medium');
      setAssigneeId(taskToEdit.assignee_id || '');
      setDueDate(taskToEdit.due_date || '');
      setNetworkLink(taskToEdit.network_link || '');
      setDescription(taskToEdit.description || '');
      setChecklist(Array.isArray(taskToEdit.checklist) ? [...taskToEdit.checklist] : []);

      // ERP fields
      setErpProjectId(taskToEdit.erp_project_id || '');
      setErpTaskNumber(taskToEdit.erp_task_number || '');
      setHouseId(taskToEdit.house_id || '');
      
      const normalizedTime = normalizeToTimeFormat(taskToEdit.hours_spent);
      if (normalizedTime && normalizedTime.includes(':')) {
        const [hh, mm] = normalizedTime.split(':');
        setHoursPart(hh || '');
        setMinutesPart(mm || '');
      } else {
        setHoursPart('');
        setMinutesPart('');
      }

      setWorkType(taskToEdit.work_type || WORK_TYPES[0]);
      setIsErpAccordionOpen(Boolean(taskToEdit.erp_project_id || taskToEdit.hours_spent));
    } else {
      setTitle('');
      setProjectCode(projects[0] || 'ЖК «Агидель»');
      setSection(sections[0]?.id || 'ВДН');
      setStatus(initialStatus || 'backlog');
      setPriority('medium');
      setAssigneeId(teamMembers[0]?.id || '');
      setDueDate('');
      setNetworkLink('');
      setDescription('');
      setChecklist([]);

      setErpProjectId('');
      setErpTaskNumber('');
      setHouseId('');
      setHoursPart('');
      setMinutesPart('');
      setWorkType(WORK_TYPES[0]);
      setIsErpAccordionOpen(false);
    }
    setNewChecklistText('');
    setNewProjectInput('');
    setErrorMsg('');
  }, [taskToEdit, isOpen, initialStatus, projects, teamMembers, sections]);

  if (!isOpen) return null;

  // Toggle Accordion and scroll into view smoothly
  const handleToggleAccordion = () => {
    const nextState = !isErpAccordionOpen;
    setIsErpAccordionOpen(nextState);
    playSound('click');
    if (nextState) {
      setTimeout(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTo({
            top: modalBodyRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
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
    setChecklist([...checklist, newItem]);
    setNewChecklistText('');
    playSound('click');
  };

  // Toggle checklist item
  const handleToggleChecklistItem = (id) => {
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

    if (updated.length > 0 && updated.every((item) => item.done)) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
  };

  // Delete checklist item
  const handleDeleteChecklistItem = (id) => {
    setChecklist(checklist.filter((item) => item.id !== id));
    playSound('click');
  };

  // Handle Hours input (XX)
  const handleHoursChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 3) {
      setHoursPart(val);
      // Auto-jump to minutes after 2 digits
      if (val.length === 2 && minutesInputRef.current) {
        minutesInputRef.current.focus();
        minutesInputRef.current.select();
      }
    }
  };

  // Handle Minutes input (XX, max 59)
  const handleMinutesChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 2) {
      const num = parseInt(val, 10);
      if (isNaN(num) || num <= 59) {
        setMinutesPart(val);
      }
    }
  };

  const handleMinutesKeyDown = (e) => {
    // If Backspace pressed in empty minutes, jump back to hours
    if (e.key === 'Backspace' && !minutesPart && hoursInputRef.current) {
      hoursInputRef.current.focus();
    }
  };

  // Quick preset time helpers
  const handleSetQuickTime = (hh, mm) => {
    setHoursPart(hh);
    setMinutesPart(mm);
    playSound('click');
  };

  // Submit form
  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Пожалуйста, введите название задачи');
      return;
    }

    const finalProject = newProjectInput.trim() ? newProjectInput.trim() : projectCode;

    // Format hours: XX:XX
    let finalHoursSpent = null;
    if (hoursPart.trim() || minutesPart.trim()) {
      const hh = hoursPart.trim() ? hoursPart.trim().padStart(2, '0') : '00';
      const mm = minutesPart.trim() ? minutesPart.trim().padStart(2, '0') : '00';
      finalHoursSpent = `${hh}:${mm}`;
    }

    const taskData = {
      ...(taskToEdit ? { id: taskToEdit.id, created_at: taskToEdit.created_at } : {}),
      title: title.trim(),
      project_code: finalProject,
      section,
      status,
      priority,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      network_link: networkLink.trim() || null,
      description: description.trim() || null,
      checklist,
      // ERP & Salary fields
      erp_project_id: erpProjectId.trim() || null,
      erp_task_number: erpTaskNumber.trim() || null,
      house_id: houseId.trim() || null,
      hours_spent: finalHoursSpent,
      work_type: workType || null
    };

    onSaveTask(taskData);
    playSound('success');
    onClose();
  };

  const handleDelete = () => {
    if (taskToEdit && window.confirm('Удалить эту задачу?')) {
      onDeleteTask(taskToEdit.id);
      playSound('click');
      onClose();
    }
  };

  // Prevent accidental close when selecting text with mouse
  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formattedTimePreview = (hoursPart || minutesPart)
    ? `${hoursPart.padStart(2, '0') || '00'}:${minutesPart.padStart(2, '0') || '00'}`
    : '';

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '680px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} 
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Layers size={20} style={{ color: 'var(--accent-orange)' }} />
            <span>{taskToEdit ? 'Редактирование задачи' : 'Создать задачу проектировщика'}</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" ref={modalBodyRef} style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--accent-rose)',
                  fontSize: '0.82rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Title */}
            <div className="form-group">
              <label className="form-label">
                Название задачи / Выпуск чертежей *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Например: Трассировка оптического кабеля 96 ОВ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* 2. Project & Section Row */}
            <div className="form-row">
              {/* Project / Object */}
              <div className="form-group">
                <label className="form-label">
                  <Briefcase size={13} />
                  <span>Объект / Проект</span>
                </label>
                <select
                  className="form-select"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                >
                  {projects.map((proj) => (
                    <option key={proj} value={proj}>
                      {proj}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-input"
                  style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}
                  placeholder="Или введите новый объект..."
                  value={newProjectInput}
                  onChange={(e) => setNewProjectInput(e.target.value)}
                />
              </div>

              {/* Section (Dynamic Sections) */}
              <div className="form-group">
                <label className="form-label">
                  <Layers size={13} />
                  <span>Раздел проекта (Марка)</span>
                </label>
                <select
                  className="form-select"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name || sec.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Assignee & Status Row */}
            <div className="form-row">
              {/* Assignee */}
              <div className="form-group">
                <label className="form-label">
                  <User size={13} />
                  <span>Исполнитель</span>
                </label>
                <select
                  className="form-select"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">-- Не назначен --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Статус (Колонка)</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {(columns && columns.length > 0 ? columns : COLUMNS).map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Priority & Due Date Row */}
            <div className="form-row">
              {/* Priority */}
              <div className="form-group">
                <label className="form-label">Приоритет</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={13} />
                  <span>Срок сдачи (Дедлайн)</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* 5. Network Link / Folder */}
            <div className="form-group">
              <label className="form-label">
                <FolderGit2 size={13} />
                <span>Сетевая папка / путь к чертежам</span>
              </label>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                placeholder="\\ufanet-server\projects\Одинцово\ОДРС\Схема.dwg"
                value={networkLink}
                onChange={(e) => setNetworkLink(e.target.value)}
              />
            </div>

            {/* 6. Description / Notes */}
            <div className="form-group">
              <label className="form-label">Описание / Заметки к выдаче</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Дополнительные комментарии, исходные данные по проекту..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 7. Interactive Checklist */}
            <div className="form-group">
              <label className="form-label">
                <CheckSquare size={13} />
                <span>Чек-лист этапов и подзадач</span>
              </label>

              {checklist.length > 0 && (
                <div className="checklist-items-list" style={{ marginBottom: '0.5rem' }}>
                  {checklist.map((item) => (
                    <div key={item.id} className="checklist-item-row">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className="checklist-checkbox"
                        id={`modal-check-${item.id}`}
                      />
                      <label
                        htmlFor={`modal-check-${item.id}`}
                        className={`checklist-text ${item.done ? 'done' : ''}`}
                      >
                        {item.text}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="btn-icon btn-icon-danger"
                        style={{ marginLeft: 'auto', width: 22, height: 22, padding: 0 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Добавить подзадачу (например: запросить ТУ на прокладку)..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddChecklistItem}
                  style={{ flexShrink: 0 }}
                >
                  <Plus size={14} />
                  <span>Добавить</span>
                </button>
              </div>
            </div>

            {/* =========================================================================
                8. ERP & TIMESHEET BLOCK (ПЕРЕНЕСЁН В САМЫЙ НИЗ И РАСКРЫВАЕТСЯ ПОЛНОСТЬЮ)
               ========================================================================= */}
            <div
              ref={accordionRef}
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)',
                marginTop: '0.5rem',
                boxShadow: isErpAccordionOpen ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <button
                type="button"
                onClick={handleToggleAccordion}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileSpreadsheet size={17} style={{ color: 'var(--accent-orange)' }} />
                  <span>Данные для ERP и учета табеля ЗП</span>
                  {erpProjectId || hoursPart ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', background: 'rgba(255, 102, 0, 0.12)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                      ✓ Заполнено {formattedTimePreview ? `(${formattedTimePreview} ч.)` : ''}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {isErpAccordionOpen ? '(нажмите, чтобы скрыть)' : '(нажмите, чтобы заполнить)'}
                    </span>
                  )}
                </div>
                {isErpAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isErpAccordionOpen && (
                <div 
                  style={{ 
                    padding: '1rem', 
                    borderTop: '1px solid var(--border-subtle)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1rem',
                    background: 'var(--bg-secondary)',
                    borderBottomLeftRadius: 'var(--radius-md)',
                    borderBottomRightRadius: 'var(--radius-md)'
                  }}
                >
                  {/* Row 1: ERP Project ID & Task Number */}
                  <div className="form-row">
                    {/* ID проекта в ERP: свободный формат с точками */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        ID проекта в ERP
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Например: 24.102.04912.001923"
                        value={erpProjectId}
                        onChange={(e) => setErpProjectId(e.target.value)}
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Формат: ХХ.ХХХ.ХХХХХ... (любая длина)
                      </span>
                    </div>

                    {/* Номер задачи из ERP: 123456789 */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Номер задачи из ERP
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Например: 123456789"
                        value={erpTaskNumber}
                        onChange={(e) => setErpTaskNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Числовой номер заявки в ERP
                      </span>
                    </div>
                  </div>

                  {/* Row 2: ID дома & Затраченные часы (XX:XX) */}
                  <div className="form-row">
                    {/* ID дома: 111213 */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        <Home size={13} />
                        <span>ID дома</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Например: 111213"
                        value={houseId}
                        onChange={(e) => setHouseId(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Числовой идентификатор дома
                      </span>
                    </div>

                    {/* Затраченные часы: формат XX:XX с зафиксированным ":" */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        <Clock size={13} style={{ color: 'var(--accent-orange)' }} />
                        <span>Затраченное время (ЧЧ:ММ)</span>
                      </label>

                      {/* Fixed colon Time Control */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0 0.4rem' }}>
                          <input
                            ref={hoursInputRef}
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            placeholder="08"
                            value={hoursPart}
                            onChange={handleHoursChange}
                            style={{
                              width: '42px',
                              textAlign: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              fontSize: '1rem',
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              padding: '0.4rem 0',
                              color: 'var(--accent-orange)'
                            }}
                            title="Часы (например: 08)"
                          />
                          <span style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--accent-orange)', userSelect: 'none', padding: '0 2px' }}>
                            :
                          </span>
                          <input
                            ref={minutesInputRef}
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            placeholder="00"
                            value={minutesPart}
                            onChange={handleMinutesChange}
                            onKeyDown={handleMinutesKeyDown}
                            style={{
                              width: '38px',
                              textAlign: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              fontSize: '1rem',
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              padding: '0.4rem 0',
                              color: 'var(--accent-orange)'
                            }}
                            title="Минуты (00 - 59)"
                          />
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.2rem' }}>
                          ч:мин
                        </span>

                        {/* Quick Presets */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                          <button
                            type="button"
                            className="btn-mini-action"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            onClick={() => handleSetQuickTime('08', '00')}
                            title="8 часов (полный рабочий день)"
                          >
                            8:00
                          </button>
                          <button
                            type="button"
                            className="btn-mini-action"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            onClick={() => handleSetQuickTime('04', '00')}
                            title="4 часа (полдня)"
                          >
                            4:00
                          </button>
                          <button
                            type="button"
                            className="btn-mini-action"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            onClick={() => handleSetQuickTime('01', '30')}
                            title="1 час 30 минут"
                          >
                            1:30
                          </button>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Формат XX:XX (Часы и минуты с фиксированным двоеточием)
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Work Type */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Тип работы для табеля ЗП</label>
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
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {taskToEdit ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: 'var(--accent-rose)' }}
                onClick={handleDelete}
              >
                <Trash2 size={15} />
                <span>Удалить</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Отмена
              </button>
              <button type="submit" className="btn btn-primary">
                {taskToEdit ? 'Сохранить изменения' : 'Создать задачу'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
