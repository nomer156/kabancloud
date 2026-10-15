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
  ExternalLink,
  MapPin,
  Send,
  Building,
  Globe,
  Sliders,
  Check,
  Sparkles,
  Folder,
  Paperclip,
  UploadCloud,
  Copy,
  FileText,
  Image as ImageIcon,
  Loader2,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  PRIORITIES, 
  COLUMNS, 
  PROJECT_INTERNAL_CUSTOMERS, 
  PROJECT_REGIONS, 
  WORK_GROUPS, 
  WORK_ITEMS, 
  KST_OPTIONS, 
  KIZM_OPTIONS, 
  KSL_OPTIONS 
} from '../lib/constants';
import { playSound } from '../lib/sound';
import { MentionAutocompleteDropdown, extractMentionTargets, renderWithMentions } from '../lib/mentions';
import { openFolderInExplorer, uploadTaskFile, addProjectItem, deleteProjectItem } from '../lib/api';

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
  currentUser,
  onSaveTask,
  onDeleteTask,
  onNotifyMention
}) {
  // 1. Оперативные рабочие поля (Левая карточка)
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  
  // Mentions autocomplete for title and description
  const [titleMentionQuery, setTitleMentionQuery] = useState(null);
  const titleInputRef = useRef(null);
  const [descMentionQuery, setDescMentionQuery] = useState(null);
  const descInputRef = useRef(null);

  // Комментарии и обсуждение
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentMentionQuery, setCommentMentionQuery] = useState(null);
  const commentInputRef = useRef(null);

  // Feedback states
  const [copiedLink, setCopiedLink] = useState(false);

  // Учет времени / журнал работы
  const [worklogs, setWorklogs] = useState([]);
  const [wlDate, setWlDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wlHours, setWlHours] = useState('04');
  const [wlMinutes, setWlMinutes] = useState('00');
  const [wlComment, setWlComment] = useState('');

  // Прикрепленные файлы и материалы
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // 2. Паспортные настройки & ЗП (Правая карточка)
  const [section, setSection] = useState('ВДН');
  const [projectCode, setProjectCode] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectNameInput, setNewProjectNameInput] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [networkLink, setNetworkLink] = useState('');

  // ProjectPay & ERP
  const [internalCustomer, setInternalCustomer] = useState('17'); // МКД
  const [region, setRegion] = useState('11');                   // АО "Уфанет" Москва
  const [workGroup, setWorkGroup] = useState('22');             // ВОЛС
  const [workItem, setWorkItem] = useState('118');               // ВОЛС: РД
  const [erpProjectId, setErpProjectId] = useState('');
  const [erpTaskNumber, setErpTaskNumber] = useState('');
  const [projectCipher, setProjectCipher] = useState('');
  const [projectCodeVal, setProjectCodeVal] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [kst, setKst] = useState('1');
  const [kizm, setKizm] = useState('1');
  const [ksl, setKsl] = useState('1');
  const [kvyp, setKvyp] = useState('1.00');

  const [errorMsg, setErrorMsg] = useState('');
  const modalBodyRef = useRef(null);

  // Sync state when modal opens or editing task changes
  useEffect(() => {
    if (!isOpen) return;

    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setAddress(taskToEdit.address || '');
      setDescription(taskToEdit.description || '');
      setChecklist(Array.isArray(taskToEdit.checklist) ? [...taskToEdit.checklist] : []);
      setWorklogs(Array.isArray(taskToEdit.worklogs) ? [...taskToEdit.worklogs] : []);
      setAttachments(Array.isArray(taskToEdit.attachments) ? [...taskToEdit.attachments] : []);
      setComments(Array.isArray(taskToEdit.comments) ? [...taskToEdit.comments] : []);

      setSection(taskToEdit.section || (sections[0]?.id || 'ВДН'));
      setProjectCode(taskToEdit.project_code || (projects[0] || ''));
      setStatus(taskToEdit.status || 'backlog');
      setPriority(taskToEdit.priority || 'medium');
      setAssigneeId(taskToEdit.assignee_id || '');
      setDueDate(taskToEdit.due_date || '');
      setNetworkLink(taskToEdit.network_link || '');

      setInternalCustomer(taskToEdit.internal_customer || '17');
      setRegion(taskToEdit.region || '11');
      setWorkGroup(taskToEdit.work_group || '22');
      setWorkItem(taskToEdit.work_item || '118');
      setErpProjectId(taskToEdit.erp_project_id || taskToEdit.erp_task_number || '');
      setErpTaskNumber(taskToEdit.erp_task_number || taskToEdit.erp_project_id || '');
      setProjectCipher(taskToEdit.project_cipher || '');
      setProjectCodeVal(taskToEdit.project_code_val || '');
      setProjectManager(taskToEdit.project_manager || '');
      setQuantity(taskToEdit.quantity || '1');
      setKst(taskToEdit.kst || '1');
      setKizm(taskToEdit.kizm || '1');
      setKsl(taskToEdit.ksl || '1');
      setKvyp(taskToEdit.kvyp || '1.00');
    } else {
      setTitle('');
      setAddress('');
      setDescription('');
      setChecklist([]);
      setWorklogs([]);
      setAttachments([]);
      setComments([]);

      setSection(sections[0]?.id || 'ВДН');
      setProjectCode(projects[0] || '');
      setStatus(initialStatus || 'backlog');
      setPriority('medium');
      setAssigneeId(teamMembers[0]?.id || '');
      setDueDate('');
      setNetworkLink('');

      setInternalCustomer('17');
      setRegion('11');
      setWorkGroup('22');
      setWorkItem('118');
      setErpProjectId('');
      setErpTaskNumber('');
      setProjectCipher('');
      setProjectCodeVal('');
      setProjectManager('');
      setQuantity('1');
      setKst('1');
      setKizm('1');
      setKsl('1');
      setKvyp('1.00');
    }
    setNewChecklistText('');
    setNewProjectNameInput('');
    setNewCommentText('');
    setTitleMentionQuery(null);
    setDescMentionQuery(null);
    setCommentMentionQuery(null);
    setErrorMsg('');
  }, [isOpen, taskToEdit]);

  if (!isOpen) return null;

  // Filter available work items based on selected work group
  const filteredWorkItems = WORK_ITEMS.filter((wi) => wi.groupId === workGroup);

  // Compute total hours from worklogs
  const totalMinutesFromWorklogs = worklogs.reduce((acc, entry) => {
    const raw = String(entry.hours || '').trim();
    if (raw.includes(':')) {
      const [h, m] = raw.split(':').map((n) => parseInt(n, 10) || 0);
      return acc + (h * 60 + m);
    }
    const num = parseFloat(raw);
    return acc + (isNaN(num) ? 0 : Math.round(num * 60));
  }, 0);

  const totalCalculatedHours = totalMinutesFromWorklogs > 0
    ? `${String(Math.floor(totalMinutesFromWorklogs / 60)).padStart(2, '0')}:${String(totalMinutesFromWorklogs % 60).padStart(2, '0')}`
    : (taskToEdit?.hours_spent || '00:00');

  // Add worklog entry
  const handleAddWorklog = (e) => {
    e?.preventDefault();
    const h = parseInt(wlHours, 10) || 0;
    const m = parseInt(wlMinutes, 10) || 0;
    if (h === 0 && m === 0) return;

    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const newEntry = {
      id: `wl-${Date.now()}`,
      date: wlDate,
      hours: timeStr,
      comment: wlComment.trim(),
      created_at: new Date().toISOString()
    };

    setWorklogs([newEntry, ...worklogs]);
    setWlComment('');
    playSound('click');
  };

  const handleDeleteWorklog = (id) => {
    setWorklogs(worklogs.filter((w) => w.id !== id));
    playSound('click');
  };

  // Checklist handlers
  const handleAddChecklist = (e) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem = {
      id: `c-${Date.now()}`,
      text: newChecklistText.trim(),
      done: false
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistText('');
    playSound('click');
  };

  const handleToggleChecklist = (id) => {
    setChecklist(
      checklist.map((item) => {
        if (item.id === id) {
          const next = !item.done;
          if (next) playSound('success');
          return { ...item, done: next };
        }
        return item;
      })
    );
  };

  const handleDeleteChecklist = (id) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleAddNewProject = async () => {
    const val = newProjectNameInput.trim();
    if (!val) return;
    await addProjectItem(val);
    setProjectCode(val);
    setIsAddingProject(false);
    setNewProjectNameInput('');
    playSound('success');
  };

  const handleDeleteCurrentProject = async () => {
    if (!projectCode) return;
    if (window.confirm(`Удалить проект "${projectCode}" из списка доступных?`)) {
      await deleteProjectItem(projectCode);
      const remaining = projects.filter((p) => p !== projectCode);
      setProjectCode(remaining[0] || '');
      playSound('trash');
    }
  };

  // Quick Open in ProjectPay (tampermonkey script compatible)
  const handleOpenInProjectPay = () => {
    const selectedCust = PROJECT_INTERNAL_CUSTOMERS.find((c) => String(c.id) === String(internalCustomer));
    const selectedReg = PROJECT_REGIONS.find((r) => String(r.id) === String(region));
    const selectedGrp = WORK_GROUPS.find((g) => String(g.id) === String(workGroup));
    const selectedItem = WORK_ITEMS.find((w) => String(w.id) === String(workItem));
    const selectedKst = KST_OPTIONS.find((k) => String(k.id) === String(kst));
    const selectedKizm = KIZM_OPTIONS.find((k) => String(k.id) === String(kizm));
    const selectedKsl = KSL_OPTIONS.find((k) => String(k.id) === String(ksl));

    let hoursStr = '04';
    let minsStr = '00';
    if (totalCalculatedHours && totalCalculatedHours.includes(':')) {
      const parts = totalCalculatedHours.split(':');
      hoursStr = parts[0].padStart(2, '0');
      minsStr = (parts[1] || '00').padStart(2, '0');
    }

    const payload = {
      customer: internalCustomer || '17',
      customer_name: selectedCust?.name || 'ОПОХ Уфанет',
      region: region || '1',
      region_name: selectedReg?.name || 'Уфа',
      work_group: workGroup || '22',
      work_group_name: selectedGrp?.name || 'ВОЛС',
      work_item: workItem || '118',
      work_item_name: selectedItem?.name || 'ВОЛС: Разработка рабочей документации строительства ВОЛС',
      kst: kst || '1',
      kst_name: selectedKst?.name || 'Полный комплект',
      kizm: kizm || '1',
      kizm_name: selectedKizm?.name || 'Вновь проектируемый',
      ksl: ksl || '1',
      ksl_name: selectedKsl?.name || 'Стандартное',
      kvyp: kvyp || '1.00',
      erp_number: erpProjectId || erpTaskNumber || '',
      tfact: `${hoursStr}:${minsStr}:00`,
      tfact_h: hoursStr,
      tfact_m: minsStr,
      project_cipher: projectCipher || '',
      project_code_val: projectCodeVal || projectCode || '',
      quantity: quantity || '1',
      project_name: title || '',
      note: description || ''
    };
    const hash = encodeURIComponent(JSON.stringify(payload));
    window.open(`https://pp.core.ufanet.ru/works/new#kaban=${hash}`, '_blank');
  };

  const handleCopyLink = () => {
    if (!networkLink.trim()) return;
    navigator.clipboard.writeText(networkLink.trim());
    setCopiedLink(true);
    playSound('click');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Open Network folder in Windows Explorer
  const handleOpenFolder = async () => {
    if (!networkLink.trim()) return;
    try {
      await openFolderInExplorer(networkLink.trim());
      playSound('click');
    } catch (err) {
      alert(err.message || 'Ошибка открытия папки');
    }
  };

  // Attachments upload and delete
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        const reader = new FileReader();
        const dataBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const savedFile = await uploadTaskFile({
          name: file.name,
          type: file.type,
          size: file.size,
          dataBase64,
          uploadedBy: currentUser?.full_name || 'Инженер'
        });
        setAttachments((prev) => [...prev, savedFile]);
      }
      playSound('success');
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Не удалось загрузить файл: ' + err.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteAttachment = (fileId) => {
    setAttachments((prev) => prev.filter((a) => a.id !== fileId));
    playSound('click');
  };

  const handleDescChange = (e) => {
    const val = e.target.value;
    setDescription(val);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([а-яА-ЯёЁa-zA-Z0-9_\-]*)$/);
    if (atMatch) {
      setDescMentionQuery(atMatch[1]);
    } else {
      setDescMentionQuery(null);
    }
  };

  const handleSelectDescMention = (member) => {
    if (!descInputRef.current) return;
    const cursor = descInputRef.current.selectionStart || description.length;
    const textBeforeCursor = description.slice(0, cursor);
    const textAfterCursor = description.slice(cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    const insertText = member.isAll ? '@все ' : `@${member.full_name} `;
    const nextVal = textBeforeCursor.slice(0, atIndex) + insertText + textAfterCursor;
    setDescription(nextVal);
    setDescMentionQuery(null);

    setTimeout(() => {
      if (descInputRef.current) {
        descInputRef.current.focus();
        const nextCursor = atIndex + insertText.length;
        descInputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 50);
  };

  // Mentions in Title
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([а-яА-ЯёЁa-zA-Z0-9_\-]*)$/);
    if (atMatch) {
      setTitleMentionQuery(atMatch[1]);
    } else {
      setTitleMentionQuery(null);
    }
  };

  const handleSelectTitleMention = (member) => {
    if (!titleInputRef.current) return;
    const cursor = titleInputRef.current.selectionStart || title.length;
    const textBeforeCursor = title.slice(0, cursor);
    const textAfterCursor = title.slice(cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    const insertText = member.isAll ? '@все ' : `@${member.full_name} `;
    const nextVal = textBeforeCursor.slice(0, atIndex) + insertText + textAfterCursor;
    setTitle(nextVal);
    setTitleMentionQuery(null);

    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        const nextCursor = atIndex + insertText.length;
        titleInputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 50);
  };

  // Mentions in Comments
  const handleCommentChange = (e) => {
    const val = e.target.value;
    setNewCommentText(val);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([а-яА-ЯёЁa-zA-Z0-9_\-]*)$/);
    if (atMatch) {
      setCommentMentionQuery(atMatch[1]);
    } else {
      setCommentMentionQuery(null);
    }
  };

  const handleSelectCommentMention = (member) => {
    if (!commentInputRef.current) return;
    const cursor = commentInputRef.current.selectionStart || newCommentText.length;
    const textBeforeCursor = newCommentText.slice(0, cursor);
    const textAfterCursor = newCommentText.slice(cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    const insertText = member.isAll ? '@все ' : `@${member.full_name} `;
    const nextVal = textBeforeCursor.slice(0, atIndex) + insertText + textAfterCursor;
    setNewCommentText(nextVal);
    setCommentMentionQuery(null);

    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        const nextCursor = atIndex + insertText.length;
        commentInputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 50);
  };

  // Add new comment
  const handleAddComment = (e) => {
    e?.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      text: newCommentText.trim(),
      user_name: currentUser?.full_name || 'Инженер',
      user_id: currentUser?.id || null,
      user_initials: currentUser?.initials || 'УФ',
      avatar_color: currentUser?.avatar_color || '#ff6600',
      created_at: new Date().toISOString()
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    setNewCommentText('');
    setCommentMentionQuery(null);
    playSound('click');

    // Notify mentioned colleagues in comment
    const mentionTargets = extractMentionTargets(newComment.text, teamMembers);
    if (mentionTargets.length > 0 && onNotifyMention) {
      onNotifyMention({
        taskId: taskToEdit?.id,
        taskTitle: title.trim() || 'Задача',
        fromUserId: currentUser?.id || null,
        fromUserName: currentUser?.full_name || 'Инженер',
        fromUserAvatar: currentUser?.avatar_color || '#ff6600',
        text: newComment.text,
        targetUserIds: mentionTargets
      });
    }
  };

  const handleDeleteComment = (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    playSound('click');
  };

  // Save Task
  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Пожалуйста, введите название задачи');
      return;
    }

    const finalProject = newProjectNameInput.trim() ? newProjectNameInput.trim() : projectCode;

    const taskData = {
      ...(taskToEdit || {}),
      id: taskToEdit?.id,
      title: title.trim(),
      address: address.trim() || null,
      project_code: finalProject,
      section,
      status,
      priority,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      network_link: networkLink.trim() || null,
      description: description.trim() || null,
      checklist,
      worklogs,
      attachments,
      hours_spent: totalCalculatedHours,

      // ProjectPay & ERP fields
      internal_customer: internalCustomer,
      region,
      work_group: workGroup,
      work_item: workItem,
      erp_project_id: (erpProjectId || erpTaskNumber || '').trim() || null,
      erp_task_number: (erpTaskNumber || erpProjectId || '').trim() || null,
      project_cipher: projectCipher.trim() || null,
      project_code_val: projectCodeVal.trim() || null,
      project_manager: projectManager.trim() || null,
      quantity: quantity || '1',
      kst,
      kizm,
      ksl,
      kvyp,
      comments: comments || []
    };

    onSaveTask(taskData);
    playSound('success');

    // Notify mentioned colleagues in title or description if any
    const titleTargets = extractMentionTargets(title, teamMembers);
    const descTargets = extractMentionTargets(description, teamMembers);
    const combinedTargets = [...new Set([...titleTargets, ...descTargets])];
    if (combinedTargets.length > 0 && onNotifyMention) {
      onNotifyMention({
        taskId: taskData.id,
        taskTitle: title.trim(),
        fromUserId: currentUser?.id || null,
        fromUserName: currentUser?.full_name || 'Инженер',
        fromUserAvatar: currentUser?.avatar_color || '#ff6600',
        text: description.trim() || title.trim(),
        targetUserIds: combinedTargets
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (taskToEdit && window.confirm('Удалить эту задачу?')) {
      onDeleteTask(taskToEdit.id);
      playSound('click');
      onClose();
    }
  };

  // Safe overlay click
  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '1240px', 
          width: '92vw', 
          maxHeight: '94vh', 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
        }} 
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header: Dynamic Task Title */}
        <div className="modal-header" style={{ padding: '0.9rem 1.4rem' }}>
          <div className="modal-title" style={{ flex: 1, minWidth: 0, gap: '0.65rem' }}>
            <Layers size={20} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
            <span style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              fontSize: '1.05rem', 
              fontWeight: 800 
            }}>
              {title.trim() ? title : 'Новая задача проектировщика'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {taskToEdit && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem', gap: '5px' }}
                title="Развернуть задачу на отдельной вкладке (Jira-вид)"
                onClick={() => {
                  window.open(`/#task/${taskToEdit.id}`, '_blank');
                  onClose();
                }}
              >
                <ExternalLink size={14} />
                <span>На весь экран</span>
              </button>
            )}

            <button type="button" className="btn-icon" onClick={onClose} title="Закрыть">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Two-Column Form Body */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div 
            className="modal-body" 
            ref={modalBodyRef} 
            style={{ 
              overflowY: 'auto', 
              flex: 1, 
              padding: '1.25rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: '1.15fr 1fr',
              gap: '1.5rem',
              alignItems: 'start'
            }}
          >
            {errorMsg && (
              <div
                style={{
                  gridColumn: '1 / -1',
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

            {/* ============================================================ */}
            {/* ЛЕВАЯ КАРТОЧКА: Оперативная работа над задачей */}
            {/* ============================================================ */}
            <div 
              style={{ 
                background: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: 'var(--radius-md)', 
                padding: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                  <Building size={16} style={{ color: 'var(--accent-orange)' }} />
                  <span>Оперативная работа & ТЗ</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ежедневные действия</span>
              </div>

              {/* 1. Название задачи */}
              <div className="form-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Название задачи / Выпуск РД *</label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Введите <strong style={{ color: 'var(--accent-orange)' }}>@ФИО</strong> для упоминания
                  </span>
                </div>
                <input
                  ref={titleInputRef}
                  type="text"
                  className="form-input"
                  placeholder="Например: Трассировка магистрального кабеля 96 ОВ"
                  value={title}
                  onChange={handleTitleChange}
                  required
                />
                {titleMentionQuery !== null && (
                  <MentionAutocompleteDropdown
                    query={titleMentionQuery}
                    teamMembers={teamMembers}
                    onSelect={handleSelectTitleMention}
                    position={{ top: '100%', left: 0, marginTop: '4px' }}
                  />
                )}
              </div>

              {/* 2. Адрес объекта + Яндекс Карты */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={13} style={{ color: 'var(--accent-orange)' }} />
                    <span>Адрес объекта / Строительства:</span>
                  </label>
                  {address.trim() && (
                    <a
                      href={`https://yandex.ru/maps/?text=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="as-link"
                      style={{ fontSize: '0.74rem', color: 'var(--accent-orange)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      title="Открыть адрес на Яндекс.Картах"
                    >
                      <span>Открыть в Яндекс.Картах</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Например: г. Уфа, ул. Ленина, 5 или г. Оренбург, пр. Победы, 12"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                {/* Интерактивная миникарта */}
                {address.trim() && (
                  <div 
                    style={{ 
                      marginTop: '0.5rem', 
                      borderRadius: 'var(--radius-sm)', 
                      overflow: 'hidden', 
                      border: '1px solid var(--border-subtle)',
                      position: 'relative',
                      height: '130px',
                      background: 'var(--bg-card)'
                    }}
                  >
                    <iframe
                      title="Миникарта Яндекс"
                      src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(address)}&z=16`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      loading="lazy"
                    />
                    <a
                      href={`https://yandex.ru/maps/?text=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: '#fff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backdropFilter: 'blur(4px)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <ExternalLink size={10} />
                      <span>Развернуть карту</span>
                    </a>
                  </div>
                )}
              </div>

              {/* 3. Описание задачи */}
              <div className="form-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Техническое задание / Примечания</label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Введите <strong style={{ color: 'var(--accent-orange)' }}>@ФИО</strong> для упоминания
                  </span>
                </div>
                <textarea
                  ref={descInputRef}
                  className="form-textarea"
                  rows={3}
                  placeholder="Опишите ключевые моменты проекта, согласования, номера опор... Введите @ для упоминания..."
                  value={description}
                  onChange={handleDescChange}
                />

                {descMentionQuery !== null && (
                  <MentionAutocompleteDropdown
                    query={descMentionQuery}
                    teamMembers={teamMembers}
                    onSelect={handleSelectDescMention}
                    position={{ top: '100%', left: 0, marginTop: '4px' }}
                  />
                )}
              </div>

              {/* 4. Чек-листы */}
              <div className="form-group">
                <label className="form-label">Чек-лист этапов разработки</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.6rem' }}>
                  {checklist.map((item) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        background: 'var(--bg-card)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => handleToggleChecklist(item.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent-orange)' }}
                      />
                      <span style={{ 
                        flex: 1, 
                        fontSize: '0.82rem', 
                        textDecoration: item.done ? 'line-through' : 'none',
                        color: item.done ? 'var(--text-dim)' : 'var(--text-main)'
                      }}>
                        {item.text}
                      </span>
                      <button 
                        type="button" 
                        className="btn-icon btn-icon-danger" 
                        style={{ width: 22, height: 22, padding: 0 }}
                        onClick={() => handleDeleteChecklist(item.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Добавить подзадачу / этап..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklist(e); }}
                    style={{ fontSize: '0.8rem' }}
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleAddChecklist} style={{ padding: '0.35rem 0.65rem' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* 5. Комментарии и замечания */}
              <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MessageSquare size={13} style={{ color: 'var(--accent-orange)' }} />
                    <span style={{ fontWeight: 700 }}>Комментарии и замечания ({comments.length}):</span>
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Введите <strong style={{ color: 'var(--accent-orange)' }}>@ФИО</strong> для упоминания
                  </span>
                </div>

                {/* Поле добавления комментария */}
                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                  <textarea
                    ref={commentInputRef}
                    className="form-textarea"
                    rows={2}
                    placeholder="Написать комментарий... Введите @ чтобы упомянуть коллегу..."
                    value={newCommentText}
                    onChange={handleCommentChange}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem', width: '100%' }}
                  />

                  {commentMentionQuery !== null && (
                    <MentionAutocompleteDropdown
                      query={commentMentionQuery}
                      teamMembers={teamMembers}
                      onSelect={handleSelectCommentMention}
                      position={{ top: '100%', left: 0, marginTop: '4px' }}
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAddComment}
                      disabled={!newCommentText.trim()}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem', gap: '4px' }}
                    >
                      <Send size={12} />
                      <span>Отправить</span>
                    </button>
                  </div>
                </div>

                {/* Список комментариев */}
                {comments.length > 0 ? (
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {comments.map((comm) => (
                      <div
                        key={comm.id}
                        style={{
                          background: 'var(--bg-tertiary)',
                          padding: '0.5rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                backgroundColor: comm.avatar_color || '#ff6600',
                                color: 'white',
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {comm.user_initials || 'УФ'}
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {comm.user_name}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                              {new Date(comm.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDeleteComment(comm.id)}
                            style={{ width: 18, height: 18, padding: 0 }}
                            title="Удалить комментарий"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.4, paddingLeft: '24px' }}>
                          {renderWithMentions(comm.text, teamMembers)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.4rem 0' }}>
                    Пока нет комментариев к этой задаче
                  </div>
                )}
              </div>

              {/* 6. Учет времени (Журнал трудозатрат) */}
              <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} style={{ color: 'var(--accent-orange)' }} />
                    <span style={{ fontWeight: 700 }}>Учет времени (для ЗП):</span>
                  </label>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)', fontWeight: 800 }}>
                    Итого: {totalCalculatedHours} ч.
                  </span>
                </div>

                {/* Форма добавления строки времени */}
                <div style={{ display: 'grid', gridTemplateColumns: '115px 75px 1fr auto', gap: '0.45rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={wlDate}
                    onChange={(e) => setWlDate(e.target.value)}
                    style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={`${wlHours}:${wlMinutes}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(':')) {
                        const [h, m] = val.split(':');
                        setWlHours(h);
                        setWlMinutes(m);
                      }
                    }}
                    placeholder="04:00"
                    style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={wlComment}
                    onChange={(e) => setWlComment(e.target.value)}
                    placeholder="Что сделано..."
                    style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleAddWorklog}
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                    title="Записать часы"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* История записей времени */}
                {worklogs.length > 0 && (
                  <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {worklogs.map((w) => (
                      <div 
                        key={w.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          fontSize: '0.72rem',
                          background: 'var(--bg-tertiary)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)' }}>{w.date}</span>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>{w.hours} ч.</span>
                        <span style={{ flex: 1, margin: '0 8px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.comment || 'Работа над проектом'}
                        </span>
                        <button 
                          type="button" 
                          className="btn-icon btn-icon-danger" 
                          style={{ width: 18, height: 18, padding: 0 }}
                          onClick={() => handleDeleteWorklog(w.id)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Материалы и файлы проекта */}
              <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Paperclip size={13} style={{ color: 'var(--accent-orange)' }} />
                    <span style={{ fontWeight: 700 }}>Файлы и материалы ({attachments.length}):</span>
                  </label>
                  <label 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', cursor: isUploading ? 'wait' : 'pointer', gap: '4px', margin: 0 }}
                  >
                    {isUploading ? <Loader2 size={12} className="spin" /> : <UploadCloud size={12} />}
                    <span>{isUploading ? 'Загрузка...' : '+ Прикрепить файл'}</span>
                    <input 
                      type="file" 
                      multiple 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload} 
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {attachments.length === 0 ? (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.6rem 0' }}>
                    Нет прикрепленных файлов (поддерживаются фото выезда, PDF, Visio .vsd/.vsdx, DWG, схемы)
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '120px', overflowY: 'auto' }}>
                    {attachments.map((file) => (
                      <div 
                        key={file.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          fontSize: '0.74rem',
                          background: 'var(--bg-tertiary)',
                          padding: '0.3rem 0.55rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                          title={`Скачать / открыть ${file.name}`}
                        >
                          {file.type?.startsWith('image/') ? <ImageIcon size={13} style={{ color: '#38bdf8', flexShrink: 0 }} /> : <FileText size={13} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            ({(file.size / 1024).toFixed(0)} КБ)
                          </span>
                        </a>
                        <button 
                          type="button" 
                          className="btn-icon btn-icon-danger" 
                          style={{ width: 20, height: 20, padding: 0, marginLeft: '6px' }}
                          onClick={() => handleDeleteAttachment(file.id)}
                          title="Удалить файл"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* ПРАВАЯ КАРТОЧКА: Паспорт проекта & Настройки для ЗП (ProjectPay) */}
            {/* ============================================================ */}
            <div 
              style={{ 
                background: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: 'var(--radius-md)', 
                padding: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-orange)' }}>
                  <Briefcase size={16} />
                  <span>Паспорт проекта & ProjectPay</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Настраивается 1 раз</span>
              </div>

              {/* Марка / Раздел проекта */}
              <div className="form-group">
                <label className="form-label">Раздел проекта (Марка) *</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSection(sec.id)}
                      style={{
                        padding: '0.28rem 0.55rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: section === sec.id ? `2px solid ${sec.color}` : '1px solid var(--border-subtle)',
                        backgroundColor: section === sec.id ? sec.bg : 'var(--bg-card)',
                        color: section === sec.id ? sec.color : 'var(--text-muted)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {sec.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Название проекта / Комплекс */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Проект / Комплекс *</label>
                  {!isAddingProject && (
                    <button
                      type="button"
                      className="as-link"
                      onClick={() => setIsAddingProject(true)}
                      style={{ fontSize: '0.74rem', color: 'var(--accent-orange)', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Plus size={12} />
                      <span>+ Добавить проект</span>
                    </button>
                  )}
                </div>

                {isAddingProject ? (
                  <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Название нового проекта / ЖК"
                      value={newProjectNameInput}
                      onChange={(e) => setNewProjectNameInput(e.target.value)}
                      autoFocus
                      style={{ flex: 1, fontSize: '0.82rem' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewProject();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAddNewProject}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem', whiteSpace: 'nowrap' }}
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsAddingProject(false)}
                      style={{ padding: '0.35rem 0.55rem', fontSize: '0.74rem' }}
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <select
                      className="form-select"
                      value={projectCode}
                      onChange={(e) => setProjectCode(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      {projectCode && !projects.includes(projectCode) && (
                        <option value={projectCode}>{projectCode}</option>
                      )}
                      {projects.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {projectCode && (
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        onClick={handleDeleteCurrentProject}
                        title={`Удалить проект "${projectCode}" из списка`}
                        style={{ width: 34, height: 34, flexShrink: 0 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Исполнитель (Проектировщик) и Срок сдачи */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label">Исполнитель</label>
                  <select
                    className="form-select"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Не назначен</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name} ({m.initials})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Срок сдачи (Дедлайн)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Статус и Приоритет */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label">Статус задачи</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Приоритет</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Сетевая папка / путь к чертежам */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Folder size={13} style={{ color: 'var(--accent-orange)' }} />
                    <span>Сетевая папка / путь к чертежу:</span>
                  </label>
                  {networkLink.trim() && (
                    <button
                      type="button"
                      onClick={handleOpenFolder}
                      className="as-link"
                      style={{ fontSize: '0.74rem', color: 'var(--accent-orange)', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Открыть сетевую папку в Проводнике Windows (Win10 / Win11)"
                    >
                      <Folder size={12} />
                      <span>В Проводнике</span>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="\\ufanet-server\projects\Объект или E:\kaban2"
                    value={networkLink}
                    onChange={(e) => setNetworkLink(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', flex: 1 }}
                  />
                  {networkLink.trim() && (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCopyLink}
                        style={{ padding: '0.35rem 0.55rem', fontSize: '0.74rem', gap: '4px' }}
                        title="Скопировать путь к папке"
                      >
                        {copiedLink ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                        <span>{copiedLink ? 'Скопировано' : 'Копировать'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenFolder}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem', gap: '4px', fontWeight: 700 }}
                        title="Открыть папку в Проводнике Windows (Win10 / Win11)"
                      >
                        <ExternalLink size={12} />
                        <span>Перейти</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* РАСЧЕТНАЯ ЧАСТЬ ЗП (PROJECTPAY) */}
              {/* ------------------------------------------------------------ */}
              <div 
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid rgba(255, 102, 0, 0.35)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sliders size={13} />
                    <span>Расчетные параметры ProjectPay:</span>
                  </span>
                  
                  {/* Кнопка быстрой отправки в ProjectPay */}
                  <button
                    type="button"
                    onClick={handleOpenInProjectPay}
                    className="btn btn-primary"
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', gap: '4px' }}
                    title="Открыть страницу ProjectPay с уже подготовленными данными"
                  >
                    <Send size={11} />
                    <span>Заполнить в ProjectPay ↗</span>
                  </button>
                </div>

                {/* Внутренний заказчик & Регион */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Внутр. заказчик *</label>
                    <select
                      className="form-select"
                      value={internalCustomer}
                      onChange={(e) => setInternalCustomer(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                    >
                      {PROJECT_INTERNAL_CUSTOMERS.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Регион *</label>
                    <select
                      className="form-select"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                    >
                      {PROJECT_REGIONS.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Группа работ */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Группа работ *</label>
                  <select
                    className="form-select"
                    value={workGroup}
                    onChange={(e) => {
                      setWorkGroup(e.target.value);
                      const matching = WORK_ITEMS.filter((w) => w.groupId === e.target.value);
                      if (matching.length > 0) setWorkItem(matching[0].id);
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  >
                    {WORK_GROUPS.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Вид работ */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Вид работ *</label>
                  <select
                    className="form-select"
                    value={workItem}
                    onChange={(e) => setWorkItem(e.target.value)}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  >
                    {filteredWorkItems.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* ERP Номер, Шифр, Коэф. */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>ERP Номер / ID</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="123456789"
                      value={erpProjectId || erpTaskNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setErpProjectId(val);
                        setErpTaskNumber(val);
                      }}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Шифр проекта</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Шифр документа"
                      value={projectCipher}
                      onChange={(e) => setProjectCipher(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                    />
                  </div>
                </div>

                {/* Коэффициенты: Кст, Кизм, Кслож */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.45rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.68rem' }}>Кст (стадия)</label>
                    <select
                      className="form-select"
                      value={kst}
                      onChange={(e) => setKst(e.target.value)}
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.35rem' }}
                    >
                      {KST_OPTIONS.map((k) => (
                        <option key={k.id} value={k.id}>{k.name.split('(')[0]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.68rem' }}>Кизм (изм.)</label>
                    <select
                      className="form-select"
                      value={kizm}
                      onChange={(e) => setKizm(e.target.value)}
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.35rem' }}
                    >
                      {KIZM_OPTIONS.map((k) => (
                        <option key={k.id} value={k.id}>{k.name.split('(')[0]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.68rem' }}>Кслож (сложн.)</label>
                    <select
                      className="form-select"
                      value={ksl}
                      onChange={(e) => setKsl(e.target.value)}
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.35rem' }}
                    >
                      {KSL_OPTIONS.map((k) => (
                        <option key={k.id} value={k.id}>{k.name.split('(')[0]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ padding: '0.85rem 1.5rem', background: 'var(--bg-modal)' }}>
            <div>
              {taskToEdit && onDeleteTask && (
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  onClick={handleDelete}
                >
                  <Trash2 size={14} />
                  <span>Удалить задачу</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Отмена
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                <Check size={16} />
                <span>{taskToEdit ? 'Сохранить изменения' : 'Создать задачу'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
