import React, { useState, useEffect } from 'react';
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
  Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SECTIONS, PRIORITIES, COLUMNS } from '../lib/constants';
import { playSound } from '../lib/sound';

export function TaskModal({
  isOpen,
  onClose,
  taskToEdit,
  initialStatus = 'backlog',
  teamMembers,
  projects,
  onSaveTask,
  onDeleteTask
}) {
  const [title, setTitle] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [newProjectInput, setNewProjectInput] = useState('');
  const [section, setSection] = useState('АР');
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [networkLink, setNetworkLink] = useState('');
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state when modal opens or editing task changes
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setProjectCode(taskToEdit.project_code || '');
      setSection(taskToEdit.section || 'АР');
      setStatus(taskToEdit.status || 'backlog');
      setPriority(taskToEdit.priority || 'medium');
      setAssigneeId(taskToEdit.assignee_id || '');
      setDueDate(taskToEdit.due_date || '');
      setNetworkLink(taskToEdit.network_link || '');
      setDescription(taskToEdit.description || '');
      setChecklist(Array.isArray(taskToEdit.checklist) ? [...taskToEdit.checklist] : []);
    } else {
      setTitle('');
      setProjectCode(projects[0] || 'ЖК «Северный парк»');
      setSection('АР');
      setStatus(initialStatus || 'backlog');
      setPriority('medium');
      setAssigneeId(teamMembers[0]?.id || '');
      setDueDate('');
      setNetworkLink('');
      setDescription('');
      setChecklist([]);
    }
    setNewChecklistText('');
    setNewProjectInput('');
    setErrorMsg('');
  }, [taskToEdit, isOpen, initialStatus, projects, teamMembers]);

  if (!isOpen) return null;

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

    // If all items are checked, shoot confetti
    if (updated.length > 0 && updated.every((item) => item.done)) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  // Delete checklist item
  const handleDeleteChecklistItem = (id) => {
    setChecklist(checklist.filter((item) => item.id !== id));
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
      checklist
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Layers size={20} style={{ color: 'var(--accent-blue)' }} />
            <span>{taskToEdit ? 'Редактирование задачи' : 'Создать задачу проектировщика'}</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
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

            {/* Title */}
            <div className="form-group">
              <label className="form-label">
                Название задачи / Выпуск чертежей *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Например: Согласовать трассировку ОВ с конструктором КР"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Project & Section Row */}
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
                {/* Optional custom project */}
                <input
                  type="text"
                  className="form-input"
                  style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}
                  placeholder="Или введите новый объект..."
                  value={newProjectInput}
                  onChange={(e) => setNewProjectInput(e.target.value)}
                />
              </div>

              {/* Section */}
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
                  {SECTIONS.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee & Status Row */}
            <div className="form-row">
              {/* Assignee */}
              <div className="form-group">
                <label className="form-label">
                  <User size={13} />
                  <span>Исполнитель (из 6 инженеров)</span>
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
                  {COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Due Date Row */}
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

            {/* Network Link / Folder */}
            <div className="form-group">
              <label className="form-label">
                <FolderGit2 size={13} />
                <span>Путь к сетевой папке / BIM-модели / Серверу</span>
              </label>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                placeholder="\\server\projects\ЖК_Северный\АР\Планы.rvt или ссылка на диск"
                value={networkLink}
                onChange={(e) => setNetworkLink(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Описание / Заметки к выдаче</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Дополнительные комментарии, замечания ГИПа, исходные данные..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Interactive Checklist */}
            <div className="form-group">
              <label className="form-label">
                <CheckSquare size={13} />
                <span>Чек-лист согласований и подзадач</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.5rem' }}>
                {checklist.map((item) => (
                  <div key={item.id} className="checklist-item-row">
                    <input
                      type="checkbox"
                      className="checklist-checkbox"
                      checked={item.done}
                      onChange={() => handleToggleChecklistItem(item.id)}
                    />
                    <span className={`checklist-text ${item.done ? 'done' : ''}`}>
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add checklist input */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                  placeholder="Добавить пункт (нажмите Enter)..."
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
                  style={{ padding: '0.45rem 0.8rem' }}
                  onClick={handleAddChecklistItem}
                >
                  <Plus size={14} />
                  <span>Добавить</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pinned Footer Actions */}
          <div className="modal-footer">
            {taskToEdit && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: 'var(--accent-rose)', marginRight: 'auto' }}
                onClick={handleDelete}
              >
                <Trash2 size={15} />
                <span>Удалить</span>
              </button>
            )}

            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>

            <button type="submit" className="btn btn-primary">
              {taskToEdit ? 'Сохранить изменения' : 'Создать карточку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
