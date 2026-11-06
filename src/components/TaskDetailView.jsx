import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  History,
  MapPin,
  Building,
  Sliders,
  Globe,
  Folder,
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  Tag,
  Play,
  Square,
  Sparkles,
  Link2,
  Users
} from 'lucide-react';
import { 
  PRIORITIES, 
  WORK_TYPES,
  PROJECT_INTERNAL_CUSTOMERS,
  PROJECT_REGIONS,
  WORK_GROUPS,
  WORK_ITEMS,
  KST_OPTIONS,
  KIZM_OPTIONS,
  KSL_OPTIONS,
  DEPARTMENTS,
  DEFAULT_STICKERS,
  formatPathEnd
} from '../lib/constants';
import { playSound } from '../lib/sound';
import { renderWithMentions, extractMentionTargets, MentionAutocompleteDropdown } from '../lib/mentions';
import { openFolderInExplorer, uploadTaskFile, addProjectItem, deleteProjectItem } from '../lib/api';
import confetti from 'canvas-confetti';
import { SmartMemberPicker } from './SmartMemberPicker';

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
  allTasks = [],
  teamMembers = [],
  projects = [],
  sections = [],
  columns = [],
  departments = DEPARTMENTS,
  currentUser,
  onSaveTask,
  onDeleteTask,
  onBack,
  onNotifyMention
}) {
  // Main fields state
  const [departmentId, setDepartmentId] = useState(task?.department_id || 'dept-design');
  const [title, setTitle] = useState(task?.title || '');
  const [projectCode, setProjectCode] = useState(task?.project_code || '');
  const [section, setSection] = useState(task?.section || 'ВДН');
  const [status, setStatus] = useState(task?.status || 'backlog');
  const [displayId, setDisplayId] = useState(task?.display_id || '');
  const [participantIds, setParticipantIds] = useState(() => Array.isArray(task?.participant_ids) ? task.participant_ids : []);
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [networkLink, setNetworkLink] = useState(task?.network_link || '');
  const [description, setDescription] = useState(task?.description || '');
  const [checklist, setChecklist] = useState(task?.checklist || []);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('');
  const [isSubtaskDropOver, setIsSubtaskDropOver] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Hierarchical child subtasks
  const childTasks = useMemo(() => {
    if (!Array.isArray(allTasks) || allTasks.length === 0 || !task?.id) return [];
    return allTasks.filter((t) => t.parent_task_id === task.id);
  }, [allTasks, task?.id]);

  // YouGile Mirrors / Зеркалирование задачи в другие отделы
  const [mirroredDepartments, setMirroredDepartments] = useState(() => 
    Array.isArray(task?.mirrored_departments) ? [...task.mirrored_departments] : []
  );

  // ERP & Timesheet fields
  const [erpProjectId, setErpProjectId] = useState(task?.erp_project_id || task?.erp_task_number || '');
  const [erpTaskNumber, setErpTaskNumber] = useState(task?.erp_task_number || task?.erp_project_id || '');
  const [houseId, setHouseId] = useState(task?.house_id || '');
  const [address, setAddress] = useState(task?.address || '');
  const [internalCustomer, setInternalCustomer] = useState(task?.internal_customer || '17');
  const [region, setRegion] = useState(task?.region || '11');
  const [workGroup, setWorkGroup] = useState(task?.work_group || '22');
  const [workItem, setWorkItem] = useState(task?.work_item || '118');
  const [projectCipher, setProjectCipher] = useState(task?.project_cipher || '');
  const [projectCodeVal, setProjectCodeVal] = useState(task?.project_code_val || '');
  const [projectManager, setProjectManager] = useState(task?.project_manager || '');
  const [quantity, setQuantity] = useState(task?.quantity || '1');
  const [kst, setKst] = useState(task?.kst || '1');
  const [kizm, setKizm] = useState(task?.kizm || '1');
  const [ksl, setKsl] = useState(task?.ksl || '1');
  const [kvyp, setKvyp] = useState(task?.kvyp || '1.00');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectNameInput, setNewProjectNameInput] = useState('');

  // Mentions autocomplete popups
  const [mentionQuery, setMentionQuery] = useState(null);
  const commentInputRef = useRef(null);
  const [titleMentionQuery, setTitleMentionQuery] = useState(null);
  const titleInputRef = useRef(null);
  const [descMentionQuery, setDescMentionQuery] = useState(null);
  const descInputRef = useRef(null);

  // Bottom Tabs: 'comments' | 'erp' (comments default as requested)
  const [activeBottomTab, setActiveBottomTab] = useState('comments');

  // Worklogs (Журнал времени)
  const [worklogs, setWorklogs] = useState(() => Array.isArray(task?.worklogs) ? task.worklogs : []);
  const [wlDate, setWlDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [wlHours, setWlHours] = useState('04');
  const [wlMinutes, setWlMinutes] = useState('00');
  const [wlComment, setWlComment] = useState('');

  // Attachments (Материалы и файлы проекта)
  const [attachments, setAttachments] = useState(() => Array.isArray(task?.attachments) ? task.attachments : []);
  const [isUploading, setIsUploading] = useState(false);

  // Comments (Комментарии)
  const [comments, setComments] = useState(() => Array.isArray(task?.comments) ? task.comments : []);
  const [newCommentText, setNewCommentText] = useState('');

  // YouGile Stickers / Метки
  const [stickers, setStickers] = useState(() => Array.isArray(task?.stickers) ? task.stickers : []);

  // YouGile Live Stopwatch / Секундомер
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  const formatStopwatch = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleSticker = (stId) => {
    playSound('click');
    const next = stickers.includes(stId)
      ? stickers.filter((id) => id !== stId)
      : [...stickers, stId];
    setStickers(next);
    handleSaveAll({ stickers: next });
  };

  const handleToggleStopwatch = () => {
    if (!isStopwatchRunning) {
      setIsStopwatchRunning(true);
      playSound('click');
    } else {
      setIsStopwatchRunning(false);
      playSound('success');
      if (stopwatchSeconds >= 5) {
        const mins = Math.max(1, Math.round(stopwatchSeconds / 60));
        const hh = String(Math.floor(mins / 60)).padStart(2, '0');
        const mm = String(mins % 60).padStart(2, '0');
        const timeFormatted = `${hh}:${mm}`;
        const newEntry = {
          id: `wl-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          hours: timeFormatted,
          comment: `Списано по секундомеру Доски (${stopwatchSeconds} сек)`
        };
        const nextWorklogs = [newEntry, ...worklogs];
        setWorklogs(nextWorklogs);

        // Push system event into comments
        const sysEntry = {
          id: `sys-${Date.now()}`,
          is_system: true,
          text: `⏱️ ${currentUser?.full_name || 'Инженер'} списал ${timeFormatted} ч. по секундомеру`,
          created_at: new Date().toISOString()
        };
        const nextComments = [sysEntry, ...comments];
        setComments(nextComments);
        handleSaveAll({ worklogs: nextWorklogs, comments: nextComments });
        setStopwatchSeconds(0);
      }
    }
  };

  // Feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedErpString, setCopiedErpString] = useState(false);

  // Quick preset helper
  const handleSetPresetTime = (hh, mm) => {
    setWlHours(String(hh).padStart(2, '0'));
    setWlMinutes(String(mm).padStart(2, '0'));
    playSound('click');
  };

  // Open Network folder in Windows Explorer
  const handleOpenFolder = async () => {
    if (!networkLink || !networkLink.trim()) return;
    try {
      await openFolderInExplorer(networkLink.trim());
    } catch (err) {
      alert(err.message || 'Ошибка открытия сетевой папки');
    }
  };

  // Upload file attachment
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const newFiles = [];
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
        newFiles.push(savedFile);
      }
      const updatedAttachments = [...attachments, ...newFiles];
      setAttachments(updatedAttachments);
      handleSaveAll({ attachments: updatedAttachments });
      playSound('success');
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Не удалось загрузить файл: ' + err.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Delete attachment
  const handleDeleteAttachment = (fileId) => {
    const updated = attachments.filter((a) => a.id !== fileId);
    setAttachments(updated);
    handleSaveAll({ attachments: updated });
    playSound('click');
  };

  // Sync ONLY if task ID changes (prevents background saves/re-renders from overwriting user typing)
  const currentLoadedTaskIdRef = useRef(null);
  useEffect(() => {
    if (task && task.id !== currentLoadedTaskIdRef.current) {
      currentLoadedTaskIdRef.current = task.id;
      setDepartmentId(task.department_id || 'dept-design');
      setDisplayId(task.display_id || '');
      setParticipantIds(Array.isArray(task.participant_ids) ? task.participant_ids : []);
      setTitle(task.title || '');
      setProjectCode(task.project_code || '');
      setSection(task.section || 'ВДН');
      setStatus(task.status || 'backlog');
      setPriority(task.priority || 'medium');
      setAssigneeId(task.assignee_id || '');
      setDueDate(task.due_date || '');
      setNetworkLink(task.network_link || '');
      setDescription(task.description || '');
      setChecklist(Array.isArray(task.checklist) ? task.checklist : []);
      setAttachments(Array.isArray(task.attachments) ? task.attachments : []);
      setErpProjectId(task.erp_project_id || task.erp_task_number || '');
      setErpTaskNumber(task.erp_task_number || task.erp_project_id || '');
      setHouseId(task.house_id || '');
      setAddress(task.address || '');
      setInternalCustomer(task.internal_customer || '17');
      setRegion(task.region || '11');
      setWorkGroup(task.work_group || '22');
      setWorkItem(task.work_item || '118');
      setProjectCipher(task.project_cipher || '');
      setProjectCodeVal(task.project_code_val || '');
      setProjectManager(task.project_manager || '');
      setQuantity(task.quantity || '1');
      setKst(task.kst || '1');
      setKizm(task.kizm || '1');
      setKsl(task.ksl || '1');
      setKvyp(task.kvyp || '1.00');
      setWorklogs(Array.isArray(task.worklogs) ? task.worklogs : []);
      setComments(Array.isArray(task.comments) ? task.comments : []);
    }
  }, [task?.id]);

  // Close on Escape key (navigate back to board)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onBack) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

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

  const handleAddNewProject = async () => {
    const val = newProjectNameInput.trim();
    if (!val) return;
    await addProjectItem(val);
    setProjectCode(val);
    handleSaveAll({ project_code: val });
    setIsAddingProject(false);
    setNewProjectNameInput('');
    playSound('success');
  };

  const handleDeleteCurrentProject = async () => {
    if (!projectCode) return;
    if (window.confirm(`Удалить проект "${projectCode}" из списка доступных?`)) {
      await deleteProjectItem(projectCode);
      const remaining = projects.filter((p) => p !== projectCode);
      const nextProj = remaining[0] || '';
      setProjectCode(nextProj);
      handleSaveAll({ project_code: nextProj });
      playSound('trash');
    }
  };

  // Open ProjectPay with prefilled parameters (Tampermonkey userscript compatible)
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
    if (totalHoursString && totalHoursString.includes(':')) {
      const parts = totalHoursString.split(':');
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
    playSound('success');
  };

  // Handle mention typing in comment input
  const handleCommentTextChange = (e) => {
    const val = e.target.value;
    setNewCommentText(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([а-яА-ЯёЁa-zA-Z0-9_\-]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (member) => {
    if (!commentInputRef.current) return;
    const cursor = commentInputRef.current.selectionStart || newCommentText.length;
    const textBeforeCursor = newCommentText.slice(0, cursor);
    const textAfterCursor = newCommentText.slice(cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    const insertText = member.isAll ? '@все ' : `@${member.full_name} `;
    const nextVal = textBeforeCursor.slice(0, atIndex) + insertText + textAfterCursor;
    setNewCommentText(nextVal);
    setMentionQuery(null);

    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        const nextCursor = atIndex + insertText.length;
        commentInputRef.current.setSelectionRange(nextCursor, nextCursor);
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
    handleSaveAll({ title: nextVal });

    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        const nextCursor = atIndex + insertText.length;
        titleInputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 50);
  };

  // Mentions in Description
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
    handleSaveAll({ description: nextVal });

    setTimeout(() => {
      if (descInputRef.current) {
        descInputRef.current.focus();
        const nextCursor = atIndex + insertText.length;
        descInputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 50);
  };

  // Add comment with @mention notification support
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

    // Notify mentioned colleagues
    const mentionTargets = extractMentionTargets(newCommentText, teamMembers);
    if (mentionTargets.length > 0 && onNotifyMention) {
      onNotifyMention({
        taskId: task.id,
        taskTitle: title || task.title,
        fromUserId: currentUser?.id || null,
        fromUserName: currentUser?.full_name || 'Инженер',
        fromUserAvatar: currentUser?.avatar_color || '#ff6600',
        text: newCommentText.trim(),
        targetUserIds: mentionTargets
      });
    }

    setNewCommentText('');
    setMentionQuery(null);
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

  // Add checklist item with optional subtask assignee
  const handleAddChecklistItem = (e) => {
    e?.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem = {
      id: `check-${Date.now()}`,
      text: newChecklistText.trim(),
      assignee_id: newSubtaskAssignee || null,
      done: false
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistText('');
    setNewSubtaskAssignee('');
    playSound('click');
    handleSaveAll({ checklist: updated });
  };

  const handleCreateChildSubtask = async (e) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim() || !task?.id) return;
    const subtaskPayload = {
      title: newSubtaskTitle.trim(),
      status: 'in_progress',
      department_id: task.department_id || 'dept-design',
      assignee_id: newSubtaskAssignee || null,
      parent_task_id: task.id,
      priority: task.priority || 'medium',
      work_type: task.work_type || 'ВН',
      project_id: task.project_id || null,
      section_id: task.section_id || null,
      description: `Подзадача для задачи #${task.display_id || task.id}`
    };
    if (onSaveTask) {
      await onSaveTask(subtaskPayload);
      playSound('success');
      setNewSubtaskTitle('');
      setNewSubtaskAssignee('');
    }
  };

  // Save all task updates
  const handleSaveAll = (extraOverrides = {}) => {
    const finalHours = extraOverrides.hours_spent !== undefined 
      ? extraOverrides.hours_spent 
      : (worklogs.length > 0 ? minutesToTimeString(totalMinutes) : task.hours_spent);

    const updatedTask = {
      ...task,
      department_id: extraOverrides.department_id !== undefined ? extraOverrides.department_id : departmentId,
      display_id: extraOverrides.display_id !== undefined ? extraOverrides.display_id : (displayId || task.display_id || ''),
      participant_ids: extraOverrides.participant_ids !== undefined ? extraOverrides.participant_ids : participantIds,
      title: extraOverrides.title !== undefined ? extraOverrides.title.trim() : title.trim(),
      address: extraOverrides.address !== undefined ? (extraOverrides.address ? extraOverrides.address.trim() : null) : (address.trim() || null),
      project_code: extraOverrides.project_code !== undefined ? extraOverrides.project_code : projectCode,
      section: extraOverrides.section !== undefined ? extraOverrides.section : section,
      status: extraOverrides.status !== undefined ? extraOverrides.status : status,
      priority: extraOverrides.priority !== undefined ? extraOverrides.priority : priority,
      assignee_id: extraOverrides.assignee_id !== undefined ? extraOverrides.assignee_id : (assigneeId || null),
      due_date: extraOverrides.due_date !== undefined ? extraOverrides.due_date : (dueDate || null),
      network_link: extraOverrides.network_link !== undefined ? (extraOverrides.network_link ? extraOverrides.network_link.trim() : null) : (networkLink.trim() || null),
      description: extraOverrides.description !== undefined ? (extraOverrides.description ? extraOverrides.description.trim() : null) : (description.trim() || null),
      checklist: extraOverrides.checklist !== undefined ? extraOverrides.checklist : checklist,
      attachments: extraOverrides.attachments !== undefined ? extraOverrides.attachments : attachments,
      erp_project_id: extraOverrides.erp_project_id !== undefined ? (extraOverrides.erp_project_id ? extraOverrides.erp_project_id.trim() : null) : (erpProjectId.trim() || null),
      erp_task_number: extraOverrides.erp_task_number !== undefined ? (extraOverrides.erp_task_number ? extraOverrides.erp_task_number.trim() : null) : (erpTaskNumber.trim() || null),
      house_id: extraOverrides.house_id !== undefined ? (extraOverrides.house_id ? extraOverrides.house_id.trim() : null) : (houseId.trim() || null),
      hours_spent: finalHours,
      stickers: extraOverrides.stickers !== undefined ? extraOverrides.stickers : stickers,
      mirrored_departments: extraOverrides.mirrored_departments !== undefined ? extraOverrides.mirrored_departments : mirroredDepartments,
      worklogs: extraOverrides.worklogs !== undefined ? extraOverrides.worklogs : worklogs,
      comments: extraOverrides.comments !== undefined ? extraOverrides.comments : comments,

      // ProjectPay & ERP
      internal_customer: extraOverrides.internal_customer !== undefined ? extraOverrides.internal_customer : internalCustomer,
      region: extraOverrides.region !== undefined ? extraOverrides.region : region,
      work_group: extraOverrides.work_group !== undefined ? extraOverrides.work_group : workGroup,
      work_item: extraOverrides.work_item !== undefined ? extraOverrides.work_item : workItem,
      project_cipher: extraOverrides.project_cipher !== undefined ? (extraOverrides.project_cipher ? extraOverrides.project_cipher.trim() : null) : (projectCipher.trim() || null),
      project_code_val: extraOverrides.project_code_val !== undefined ? (extraOverrides.project_code_val ? extraOverrides.project_code_val.trim() : null) : (projectCodeVal.trim() || null),
      project_manager: extraOverrides.project_manager !== undefined ? (extraOverrides.project_manager ? extraOverrides.project_manager.trim() : null) : (projectManager.trim() || null),
      quantity: extraOverrides.quantity !== undefined ? extraOverrides.quantity : (quantity || '1'),
      kst: extraOverrides.kst !== undefined ? extraOverrides.kst : kst,
      kizm: extraOverrides.kizm !== undefined ? extraOverrides.kizm : kizm,
      ksl: extraOverrides.ksl !== undefined ? extraOverrides.ksl : ksl,
      kvyp: extraOverrides.kvyp !== undefined ? extraOverrides.kvyp : kvyp,
      ...extraOverrides
    };

    onSaveTask(updatedTask);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    // If title or description has mentions, notify them
    if (onNotifyMention && (extraOverrides.title || extraOverrides.description)) {
      const targets = [
        ...extractMentionTargets(updatedTask.title, teamMembers),
        ...extractMentionTargets(updatedTask.description, teamMembers)
      ];
      const uniqueTargets = [...new Set(targets)];
      if (uniqueTargets.length > 0) {
        onNotifyMention({
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          fromUserId: currentUser?.id || null,
          fromUserName: currentUser?.full_name || 'Инженер',
          fromUserAvatar: currentUser?.avatar_color || '#ff6600',
          text: extraOverrides.description || extraOverrides.title || updatedTask.title,
          targetUserIds: uniqueTargets
        });
      }
    }
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

  const priorityMeta = PRIORITIES.find((p) => p.id === priority) || PRIORITIES[1];
  const currentColumn = columns.find((c) => c.id === status) || columns[0];
  const assignee = teamMembers.find((m) => m.id === assigneeId);
  const deadlineBadge = getDeadlineBadge(dueDate, status === 'done');
  const doneChecklist = checklist.filter((i) => i.done).length;
  const totalChecklist = checklist.length;
  const checklistPercent = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

  const handleCopyErpString = () => {
    const parts = [
      erpProjectId ? `Проект: ${erpProjectId}` : '',
      erpTaskNumber ? `Задача: ${erpTaskNumber}` : '',
      houseId ? `Дом: ${houseId}` : '',
      `Время: ${totalHoursString}`,
      projectCipher ? `Шифр: ${projectCipher}` : ''
    ].filter(Boolean);
    const line = parts.join(' | ');
    if (line) {
      navigator.clipboard.writeText(line);
      setCopiedErpString(true);
      playSound('success');
      setTimeout(() => setCopiedErpString(false), 2000);
    }
  };

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
            <span>Доска проектирования</span>
            <span>/</span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: sectionMeta.bg,
                color: sectionMeta.color,
                border: `1px solid ${sectionMeta.border}`
              }}
            >
              {sectionMeta.id}
            </span>
            <span>/</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{projectCode || 'Без объекта'}</span>
            
            {priority === 'urgent' && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '4px'
                }}
              >
                🔥 Срочно!
              </span>
            )}
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
            style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem', fontWeight: 700 }}
          >
            <Save size={15} />
            <span>Сохранить</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout: Left (Main Content) vs Right (Metadata Sidebar) */}
      <div style={{ flex: 1, maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '1.5rem' }}>
        
        {/* ================= LEFT MAIN COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Title Box */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Название задачи / Выпуск чертежей
              </label>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                Введите <strong style={{ color: 'var(--accent-orange)' }}>@ФИО</strong> для упоминания
              </span>
            </div>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={() => handleSaveAll({ title })}
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
            {titleMentionQuery !== null && (
              <MentionAutocompleteDropdown
                query={titleMentionQuery}
                teamMembers={teamMembers}
                onSelect={handleSelectTitleMention}
                position={{ top: '100%', left: 0, marginTop: '4px' }}
              />
            )}

            {/* YouGile Stickers Bar */}
            <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Tag size={13} style={{ color: 'var(--accent-orange)' }} />
                  <span>Стикеры задачи</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Кликните для выбора</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {DEFAULT_STICKERS.map((st) => {
                  const isSelected = stickers.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleSticker(st.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 800 : 600,
                        border: isSelected ? `2px solid ${st.color}` : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? st.bg : 'var(--bg-tertiary)',
                        color: isSelected ? st.color : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: isSelected ? `0 0 8px ${st.color}40` : undefined,
                        transition: 'all 0.15s ease'
                      }}
                      title={`Стикер: ${st.name}`}
                    >
                      <span>{st.name}</span>
                      {isSelected && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>

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
                <span 
                  style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}
                  title={`Папка: ${networkLink}\n(Клик — скопировать путь, Перейти — открыть в Проводнике)`}
                >
                  {formatPathEnd(networkLink, 48)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-mini-action"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                  title="Скопировать полный путь к папке"
                >
                  {copiedLink ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                  <span>{copiedLink ? 'Скопировано!' : 'Копировать'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenFolder}
                  className="btn-mini-action"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--accent-orange)', fontWeight: 700 }}
                  title="Открыть в Проводнике Windows (Win10 / Win11)"
                >
                  <ExternalLink size={12} />
                  <span>Перейти</span>
                </button>
              </div>
            )}
          </div>

          {/* Address & Yandex Minimap Widget */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={13} style={{ color: 'var(--accent-orange)' }} />
                <span>Адрес объекта / Точка на карте</span>
              </label>

              {address && (
                <a
                  href={`https://yandex.ru/maps/?text=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-mini-action"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ff6600', textDecoration: 'none', fontSize: '0.72rem', fontWeight: 600 }}
                >
                  <ExternalLink size={12} />
                  <span>Открыть в Яндекс.Картах ↗</span>
                </a>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="д. Деревня, Улица д. 1 / г. Уфа, ул. Ленина, д. 5..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => handleSaveAll({ address })}
                style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              />
            </div>

            {/* Interactive Yandex Minimap widget iframe */}
            {address && (
              <div
                style={{
                  height: '180px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-tertiary)',
                  position: 'relative'
                }}
              >
                <iframe
                  title="Yandex Minimap"
                  src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(address)}&z=16`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allowFullScreen={true}
                  style={{ border: 0, display: 'block' }}
                />
              </div>
            )}
          </div>

          {/* Description & Notes */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileSpreadsheet size={14} style={{ color: 'var(--accent-orange)' }} />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Описание проекта / Исходные данные
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginLeft: '6px' }}>
                  (введите <strong style={{ color: 'var(--accent-orange)' }}>@ФИО</strong> для упоминания)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleSaveAll({ description })}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', gap: '4px' }}
                title="Сохранить описание проекта"
              >
                <Save size={12} />
                <span>Сохранить ТЗ</span>
              </button>
            </div>
            <textarea
              ref={descInputRef}
              className="form-textarea"
              rows={4}
              value={description}
              onChange={handleDescChange}
              onBlur={() => handleSaveAll({ description })}
              placeholder="Дополнительные примечания, технические условия, заметки к чертежам... Введите @ для упоминания..."
              style={{ width: '100%', minHeight: '90px', boxSizing: 'border-box' }}
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

          {/* Attachments (Материалы и файлы проекта) */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                <Paperclip size={16} style={{ color: 'var(--accent-orange)' }} />
                <span>Материалы и файлы проекта ({attachments.length})</span>
              </div>
              <label 
                className="btn btn-secondary" 
                style={{ fontSize: '0.74rem', padding: '0.3rem 0.65rem', cursor: isUploading ? 'wait' : 'pointer', gap: '5px', margin: 0 }}
              >
                {isUploading ? <Loader2 size={13} className="spin" /> : <UploadCloud size={13} />}
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
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
                📎 Нет прикрепленных файлов. Поддерживаются фото с выезда, PDF, Visio (.vsd, .vsdx), чертежи DWG/DXF, документы Word/Excel.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
                {attachments.map((file) => (
                  <div 
                    key={file.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      background: 'var(--bg-card)',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      gap: '8px'
                    }}
                  >
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                      title={`Скачать / открыть ${file.name}`}
                    >
                      {file.type?.startsWith('image/') ? (
                        <ImageIcon size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
                      ) : (
                        <FileText size={16} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {(file.size / 1024).toFixed(0)} КБ {file.uploaded_by ? `• ${file.uploaded_by}` : ''}
                        </span>
                      </div>
                    </a>
                    <button 
                      type="button" 
                      className="btn-icon btn-icon-danger" 
                      style={{ width: 22, height: 22, padding: 0, flexShrink: 0 }}
                      onClick={() => handleDeleteAttachment(file.id)}
                      title="Удалить файл"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hierarchical Subtasks Column (Dropzone, No Checkboxes) */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={16} style={{ color: 'var(--accent-orange)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Колонка подзадач ({childTasks.filter(c => c.status === 'done').length}/{childTasks.length})</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                перетащите задачу с доски для вложения
              </span>
            </div>

            {/* Drop Zone & Child List */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSubtaskDropOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSubtaskDropOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSubtaskDropOver(false);
                const droppedId = e.dataTransfer.getData('text/plain');
                if (droppedId && droppedId !== task.id) {
                  const droppedTask = allTasks.find(t => t.id === droppedId);
                  if (droppedTask && onSaveTask) {
                    onSaveTask({ ...droppedTask, parent_task_id: task.id });
                    playSound('success');
                  }
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                borderRadius: '8px',
                minHeight: '80px',
                background: isSubtaskDropOver ? 'rgba(255, 102, 0, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                border: isSubtaskDropOver ? '2px dashed var(--accent-orange)' : '1px dashed rgba(255, 102, 0, 0.3)',
                marginBottom: '0.85rem',
                transition: 'all 0.15s ease'
              }}
            >
              {childTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                  В этой задаче пока нет подзадач. Перетащите сюда задачу с доски или создайте форму ниже.
                </div>
              ) : (
                childTasks.map((child) => {
                  const childAssignee = teamMembers.find((m) => m.id === child.assignee_id);
                  const isDone = child.status === 'done';
                  return (
                    <div
                      key={child.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('text/plain', child.id);
                        e.dataTransfer.setData('application/kaban-subtask', 'true');
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onMouseDown={(e) => {
                        if (e.button === 1) { // Колесико мыши (средний клик)
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(`#task/${child.id}`, '_blank');
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-tertiary, #1c2233)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'grab'
                      }}
                      title="Перетащите подзадачу в колонку доски, чтобы выложить её наружу. Колёсико мыши — в новой вкладке."
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ color: 'var(--accent-orange)', fontWeight: 800, fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                          #{child.display_id || child.id?.slice(-4)}
                        </span>
                        <span style={{
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          color: isDone ? 'var(--text-muted)' : 'var(--text-main)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {child.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {/* Status switcher button */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = child.status === 'done' ? 'in_progress' : child.status === 'in_progress' ? 'done' : 'in_progress';
                            onSaveTask({ ...child, status: nextStatus });
                            playSound(nextStatus === 'done' ? 'success' : 'click');
                          }}
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 700,
                            background: isDone ? 'rgba(16, 185, 129, 0.2)' : child.status === 'in_progress' ? 'rgba(255, 102, 0, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                            color: isDone ? '#10b981' : child.status === 'in_progress' ? '#ff8800' : 'var(--text-muted)'
                          }}
                          title="Кликните для переключения статуса подзадачи"
                        >
                          {isDone ? 'Готово' : child.status === 'in_progress' ? 'В работе' : 'Очередь'}
                        </button>

                        {/* Smart Member Picker for Subtask */}
                        <SmartMemberPicker
                          compact={true}
                          value={child.assignee_id || ''}
                          onChange={(newId) => {
                            onSaveTask({ ...child, assignee_id: newId || null });
                            playSound('click');
                          }}
                          teamMembers={teamMembers}
                          departments={departments}
                          placeholder="Назначить..."
                        />

                        <button
                          type="button"
                          onClick={() => {
                            window.location.hash = `#task/${child.id}`;
                          }}
                          className="btn-icon"
                          style={{ width: 22, height: 22, padding: 0 }}
                          title="Открыть подзадачу (Колёсико — в новой вкладке)"
                        >
                          <ExternalLink size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSaveTask({ ...child, parent_task_id: null });
                            playSound('click');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: '1px 4px',
                            fontSize: '0.75rem'
                          }}
                          title="Открепить подзадачу"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Create Subtask Form */}
            <form onSubmit={handleCreateChildSubtask} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.85rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="+ Добавить подзадачу (например: согласовать ввод с ТСЖ)..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                style={{ flex: 1, fontSize: '0.8rem' }}
              />
              <SmartMemberPicker
                compact={true}
                value={newSubtaskAssignee}
                onChange={setNewSubtaskAssignee}
                teamMembers={teamMembers}
                departments={departments}
                placeholder="Исполнитель..."
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                <Plus size={14} />
                <span>Добавить</span>
              </button>
            </form>
            </div>

            {/* YouGile Mirrors / Зеркалирование задачи в смежные отделы */}
            <div style={{ background: 'rgba(0, 0, 0, 0.08)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link2 size={13} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontWeight: 700 }}>Зеркалирование в отделы:</span>
                </label>
                <span style={{ fontSize: '0.67rem', color: 'var(--text-dim)' }}>
                  Отразить на досках смежных служб
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {DEPARTMENTS.filter(d => d.id !== departmentId).map((dept) => {
                  const isMirrored = mirroredDepartments.includes(dept.id);
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => {
                        const next = isMirrored
                          ? mirroredDepartments.filter(id => id !== dept.id)
                          : [...mirroredDepartments, dept.id];
                        setMirroredDepartments(next);
                        handleSaveAll({ mirrored_departments: next });
                        playSound('click');
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                        borderRadius: '5px',
                        border: isMirrored ? '1.5px solid #8b5cf6' : '1px solid var(--border-subtle)',
                        background: isMirrored ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-card)',
                        color: isMirrored ? '#a78bfa' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: isMirrored ? 700 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{isMirrored ? '🔗' : '+'}</span>
                      <span>{dept.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          {/* ================= JIRA-STYLE BOTTOM TABS ================= */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* Tabs Header: 1. Комментарии (default), 2. Данные для ERP и ЗП (содержит Worklog) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', padding: '0.35rem 0.5rem' }}>
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
                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '10px', marginLeft: '4px' }}>
                  {totalHoursString} ч.
                </span>
              </button>
            </div>

            {/* TAB 1: COMMENTS (Комментарии - активны сразу по умолчанию) */}
            {activeBottomTab === 'comments' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* New comment input */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                  <textarea
                    ref={commentInputRef}
                    className="form-textarea"
                    rows={3}
                    placeholder="Написать комментарий или замечание к проекту... Введите @ чтобы упомянуть сотрудника..."
                    value={newCommentText}
                    onChange={handleCommentTextChange}
                  />

                  {/* Mentions popup autocomplete */}
                  {mentionQuery !== null && (
                    <MentionAutocompleteDropdown
                      query={mentionQuery}
                      teamMembers={teamMembers}
                      onSelect={handleSelectMention}
                      position={{ bottom: '100%', left: 0 }}
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      💡 Подсказка: введите <strong style={{ color: 'var(--accent-orange)' }}>@ФИО</strong> или <strong style={{ color: 'var(--accent-orange)' }}>@все</strong>, чтобы пришло уведомление
                    </span>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}>
                      <Send size={13} />
                      <span>Отправить комментарий</span>
                    </button>
                  </div>
                </form>

                {/* Comments list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {comments.map((comm) => (
                    comm.is_system ? (
                      <div
                        key={comm.id}
                        style={{
                          background: 'rgba(255, 102, 0, 0.08)',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          borderLeft: '3px solid var(--accent-orange)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.76rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={13} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
                          <span>{comm.text}</span>
                        </div>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                          {new Date(comm.created_at).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
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

                        <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', paddingLeft: '1.75rem', lineHeight: 1.45 }}>
                          {renderWithMentions(comm.text, teamMembers)}
                        </div>
                      </div>
                    )
                  ))}

                  {comments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      Комментариев пока нет. Вы можете оставить замечание или упомянуть коллегу через @.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ERP & ЗП (Включая Worklog, списание времени и ProjectPay) */}
            {activeBottomTab === 'erp' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Header bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-orange)' }}>
                      <FileSpreadsheet size={16} />
                      <span>Параметры заявки, трудозатраты & Расчетная часть ProjectPay</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Списание часов и данные для автоматического расчета табеля ЗП Уфанет
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleOpenInProjectPay}
                      style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.85rem' }}
                      title="Открыть форму на сайте ProjectPay с автозаполнением"
                    >
                      <ExternalLink size={13} />
                      <span>⚡ Заполнить в ProjectPay ↗</span>
                    </button>
                  </div>
                </div>

                {/* БЛОК А: УЧЕТ ВРЕМЕНИ / ЖУРНАЛ РАБОТЫ (WORKLOG) */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.9rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} style={{ color: 'var(--accent-orange)' }} />
                      <span>Журнал работы и списание времени (Worklog)</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>
                      Итого за все дни: {totalHoursString} ч.
                    </div>
                  </div>

                  {/* YouGile Live Stopwatch / Секундомер */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-tertiary)',
                      padding: '0.65rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: isStopwatchRunning ? '1.5px solid #10b981' : '1px solid var(--border-subtle)',
                      boxShadow: isStopwatchRunning ? '0 0 14px rgba(16, 185, 129, 0.25)' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={18} style={{ color: isStopwatchRunning ? '#10b981' : 'var(--accent-orange)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: isStopwatchRunning ? '#10b981' : 'var(--text-main)', letterSpacing: '0.04em' }}>
                        {formatStopwatch(stopwatchSeconds)}
                      </span>
                      {isStopwatchRunning && (
                        <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                          Идёт учёт времени...
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`btn ${isStopwatchRunning ? 'btn-danger' : 'btn-secondary'}`}
                      style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', gap: '6px' }}
                      onClick={handleToggleStopwatch}
                    >
                      {isStopwatchRunning ? (
                        <>
                          <Square size={13} />
                          <span>Стоп и списать</span>
                        </>
                      ) : (
                        <>
                          <Play size={13} style={{ color: '#10b981' }} />
                          <span>Запустить секундомер</span>
                        </>
                      )}
                    </button>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
                      {/* Date with 'Today' button */}
                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                          Дата списания:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="date"
                            className="form-input"
                            value={wlDate}
                            onChange={(e) => setWlDate(e.target.value)}
                            style={{ width: '140px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent-orange)', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setWlDate(new Date().toISOString().split('T')[0]);
                              playSound('click');
                            }}
                          >
                            Сегодня
                          </button>
                        </div>
                      </div>

                      {/* Time with fixed colon */}
                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                          Время (ЧЧ:ММ):
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0 0.5rem', height: '34px' }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            value={wlHours}
                            onChange={(e) => setWlHours(e.target.value.replace(/[^0-9]/g, ''))}
                            style={{ width: '36px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, background: 'transparent', border: 'none', color: 'var(--accent-orange)', fontSize: '0.9rem' }}
                            placeholder="04"
                          />
                          <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--accent-orange)' }}>:</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            value={wlMinutes}
                            onChange={(e) => setWlMinutes(e.target.value.replace(/[^0-9]/g, ''))}
                            style={{ width: '34px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, background: 'transparent', border: 'none', color: 'var(--accent-orange)', fontSize: '0.9rem' }}
                            placeholder="00"
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '3px', fontWeight: 600 }}>ч:м</span>
                        </div>
                      </div>

                      {/* Activity / Comment */}
                      <div style={{ minWidth: '160px' }}>
                        <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                          Что делалось (примечание):
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Например: Трассировка в Visio, схема ODF..."
                          value={wlComment}
                          onChange={(e) => setWlComment(e.target.value)}
                          style={{ padding: '0.4rem 0.65rem', height: '34px' }}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ height: '34px', padding: '0 0.9rem', fontSize: '0.8rem', fontWeight: 700 }}>
                        <Plus size={14} />
                        <span>Записать</span>
                      </button>
                    </div>

                    {/* Fast Quick-Presets */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Быстрая подстановка:</span>
                      {[
                        { label: '+30 мин', h: '00', m: '30' },
                        { label: '+1 ч', h: '01', m: '00' },
                        { label: '+2 ч', h: '02', m: '00' },
                        { label: '+4 ч (полдня)', h: '04', m: '00' },
                        { label: '8 ч (день)', h: '08', m: '00' }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="btn-mini-action"
                          style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '4px' }}
                          onClick={() => handleSetPresetTime(preset.h, preset.m)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </form>

                  {/* Worklog entries list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {worklogs.map((wl) => (
                      <div
                        key={wl.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.75rem',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            📅 {wl.date}
                          </span>
                          <span style={{ fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                            ⏱ {wl.time} ч.
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                            {wl.comment || <i style={{ color: 'var(--text-dim)' }}>Без примечания</i>}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {wl.user_name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteWorklog(wl.id)}
                            className="btn-icon btn-icon-danger"
                            style={{ width: 20, height: 20, padding: 0 }}
                            title="Удалить запись списания"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {worklogs.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        В этой задаче пока нет записей о списанном времени. Заполните форму выше, чтобы зафиксировать работу.
                      </div>
                    )}
                  </div>
                </div>

                {/* БЛОК 1: ИНФОРМАЦИЯ О ЗАЯВКЕ ERP */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.9rem'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={14} style={{ color: 'var(--accent-orange)' }} />
                    <span>1. Информация о заявке ERP</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Номер задачи / заявки ERP *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={erpTaskNumber}
                        onChange={(e) => setErpTaskNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        onBlur={() => handleSaveAll({ erp_task_number: erpTaskNumber })}
                        placeholder="Например: 123456789"
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-orange)' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>ID проекта в ERP</label>
                      <input
                        type="text"
                        className="form-input"
                        value={erpProjectId}
                        onChange={(e) => setErpProjectId(e.target.value)}
                        onBlur={() => handleSaveAll({ erp_project_id: erpProjectId })}
                        placeholder="24.102.04912.001923"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Шифр проекта</label>
                      <input
                        type="text"
                        className="form-input"
                        value={projectCipher}
                        onChange={(e) => setProjectCipher(e.target.value)}
                        onBlur={() => handleSaveAll({ project_cipher: projectCipher })}
                        placeholder="01-2026-ВОЛС"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Код проекта (не обязателен)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={projectCodeVal}
                        onChange={(e) => setProjectCodeVal(e.target.value)}
                        onBlur={() => handleSaveAll({ project_code_val: projectCodeVal })}
                        placeholder="PRJ-UF-09"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Внутренний заказчик *</label>
                      <select
                        className="form-select"
                        value={internalCustomer}
                        onChange={(e) => {
                          setInternalCustomer(e.target.value);
                          handleSaveAll({ internal_customer: e.target.value });
                        }}
                      >
                        {PROJECT_INTERNAL_CUSTOMERS.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Регион *</label>
                      <select
                        className="form-select"
                        value={region}
                        onChange={(e) => {
                          setRegion(e.target.value);
                          handleSaveAll({ region: e.target.value });
                        }}
                      >
                        {PROJECT_REGIONS.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Руководитель проекта (не обязательно)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={projectManager}
                      onChange={(e) => setProjectManager(e.target.value)}
                      onBlur={() => handleSaveAll({ project_manager: projectManager })}
                      placeholder="ФИО руководителя"
                    />
                  </div>
                </div>

                {/* БЛОК 2: РАСЧЕТНАЯ ЧАСТЬ ЗП (PROJECTPAY) */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(255,102,0,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.9rem'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-orange)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sliders size={14} />
                      <span>2. Расчетная часть ЗП (ProjectPay)</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Коэффициенты и объемы</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Группа работ *</label>
                      <select
                        className="form-select"
                        value={workGroup}
                        onChange={(e) => {
                          const nextGroup = e.target.value;
                          setWorkGroup(nextGroup);
                          const firstValidItem = WORK_ITEMS.find(item => item.groupId === nextGroup);
                          const nextItem = firstValidItem ? firstValidItem.id : workItem;
                          if (firstValidItem) setWorkItem(firstValidItem.id);
                          handleSaveAll({ work_group: nextGroup, work_item: nextItem });
                        }}
                      >
                        {WORK_GROUPS.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Вид работы *</label>
                      <select
                        className="form-select"
                        value={workItem}
                        onChange={(e) => {
                          setWorkItem(e.target.value);
                          handleSaveAll({ work_item: e.target.value });
                        }}
                      >
                        {WORK_ITEMS.filter((i) => !workGroup || i.groupId === workGroup).map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Количество работ</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        onBlur={() => handleSaveAll({ quantity })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Т факт (все дни)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={totalHoursString}
                        disabled
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-orange)' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Коэф. выплат (квып)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={kvyp}
                        onChange={(e) => setKvyp(e.target.value)}
                        onBlur={() => handleSaveAll({ kvyp })}
                        placeholder="1.00"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Кст (Стадия)</label>
                      <select
                        className="form-select"
                        value={kst}
                        onChange={(e) => {
                          setKst(e.target.value);
                          handleSaveAll({ kst: e.target.value });
                        }}
                      >
                        {KST_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Кизм (Изменения)</label>
                      <select
                        className="form-select"
                        value={kizm}
                        onChange={(e) => {
                          setKizm(e.target.value);
                          handleSaveAll({ kizm: e.target.value });
                        }}
                      >
                        {KIZM_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Кслож (Сложность)</label>
                      <select
                        className="form-select"
                        value={ksl}
                        onChange={(e) => {
                          setKsl(e.target.value);
                          handleSaveAll({ ksl: e.target.value });
                        }}
                      >
                        {KSL_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDEBAR ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Параметры задачи</span>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)', fontWeight: 800 }}>🏷️ {task.display_id || task.id}</span>
            </div>

            {/* Status (Column) with colored dot */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0 }}>Статус (Этап)</label>
                {currentColumn && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: `${currentColumn.color || '#ff6600'}22`,
                      color: currentColumn.color || '#ff6600',
                      border: `1px solid ${currentColumn.color || '#ff6600'}55`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: currentColumn.color || '#ff6600' }} />
                    {currentColumn.title}
                  </span>
                )}
              </div>
              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  handleSaveAll({ status: e.target.value });
                }}
                style={{ fontWeight: 600 }}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee with colored avatar */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  <User size={13} />
                  <span>Исполнитель</span>
                </label>
                {assignee && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: assignee.avatar_color || 'var(--accent-orange)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span
                      style={{
                        width: 17,
                        height: 17,
                        borderRadius: '50%',
                        background: assignee.avatar_color || 'var(--accent-orange)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6rem',
                        fontWeight: 800
                      }}
                    >
                      {assignee.initials || 'ИН'}
                    </span>
                    {assignee.full_name?.split(' ')[0]}
                  </span>
                )}
              </div>
              <SmartMemberPicker
                value={assigneeId}
                onChange={(newId) => {
                  setAssigneeId(newId);
                  handleSaveAll({ assignee_id: newId || null });
                }}
                teamMembers={teamMembers}
                departments={departments}
                placeholder="-- Не назначен --"
              />
            </div>

            {/* Соисполнители / Участники из других отделов */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={13} style={{ color: '#8b5cf6' }} />
                  <span>Соисполнители (все отделы)</span>
                </label>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  {participantIds.length} выбрано
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  maxHeight: '105px',
                  overflowY: 'auto',
                  padding: '6px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {teamMembers.map((m) => {
                  const isSelected = participantIds.includes(m.id);
                  const dMeta = DEPARTMENTS.find((d) => d.id === m.department_id) || DEPARTMENTS[0];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const next = isSelected ? participantIds.filter((id) => id !== m.id) : [...participantIds, m.id];
                        setParticipantIds(next);
                        handleSaveAll({ participant_ids: next });
                        playSound('click');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(139, 92, 246, 0.22)' : 'transparent',
                        color: isSelected ? '#c4b5fd' : 'var(--text-muted)',
                        fontSize: '0.72rem',
                        fontWeight: isSelected ? 800 : 500,
                        cursor: 'pointer'
                      }}
                      title={`${m.full_name} (${dMeta.name})`}
                    >
                      <span>{dMeta.icon}</span>
                      <span>{m.full_name}</span>
                      {isSelected && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section / Mark with vivid badge */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  <Layers size={13} />
                  <span>Раздел (Марка)</span>
                </label>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: sectionMeta.bg,
                    color: sectionMeta.color,
                    border: `1px solid ${sectionMeta.border}`
                  }}
                >
                  {sectionMeta.id}
                </span>
              </div>
              <select
                className="form-select"
                value={section}
                onChange={(e) => {
                  setSection(e.target.value);
                  handleSaveAll({ section: e.target.value });
                }}
                style={{ fontWeight: 600 }}
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name || sec.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority with fire / flame indicator */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  <Flame size={13} style={{ color: priorityMeta?.color }} />
                  <span>Приоритет</span>
                </label>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: priorityMeta?.bg,
                    color: priorityMeta?.color,
                    border: `1px solid ${priorityMeta?.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {priority === 'urgent' && <span>🔥</span>}
                  {priorityMeta?.name}
                </span>
              </div>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  handleSaveAll({ priority: e.target.value });
                }}
                style={{ fontWeight: 600, color: priorityMeta?.color }}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Briefcase size={13} />
                  <span>Объект / Проект *</span>
                </label>
                {!isAddingProject && (
                  <button
                    type="button"
                    className="as-link"
                    onClick={() => setIsAddingProject(true)}
                    style={{ fontSize: '0.74rem', color: 'var(--accent-orange)', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Plus size={12} />
                    <span>+ Добавить</span>
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
                    onChange={(e) => {
                      setProjectCode(e.target.value);
                      handleSaveAll({ project_code: e.target.value });
                    }}
                    style={{ flex: 1 }}
                  >
                    {projectCode && !projects.includes(projectCode) && (
                      <option value={projectCode}>{projectCode}</option>
                    )}
                    {projects.map((proj) => (
                      <option key={proj} value={proj}>
                        {proj}
                      </option>
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

            {/* Network Link input */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FolderGit2 size={13} />
                  <span>Сетевая папка</span>
                </label>
                {networkLink && (
                  <button
                    type="button"
                    onClick={handleOpenFolder}
                    className="as-link"
                    style={{ fontSize: '0.72rem', color: 'var(--accent-orange)', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    title="Открыть в Проводнике Windows"
                  >
                    <Folder size={11} />
                    <span>В Проводнике</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={networkLink}
                  onChange={(e) => setNetworkLink(e.target.value)}
                  onBlur={() => handleSaveAll({ network_link: networkLink })}
                  placeholder="\\ufanet-server\projects\..."
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', flex: 1 }}
                />
                {networkLink && (
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCopyLink}
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.74rem' }}
                      title="Скопировать путь к папке"
                    >
                      {copiedLink ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleOpenFolder}
                      style={{ padding: '0.3rem 0.55rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}
                      title="Открыть в Проводнике Windows (Win10 / Win11)"
                    >
                      <ExternalLink size={12} />
                      <span>Перейти</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Save All + Safe Inline Delete */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveAll()}
                style={{ width: '100%', justifyContent: 'center', padding: '0.6rem 1rem' }}
              >
                <Save size={16} />
                <span>Сохранить всё</span>
              </button>

              {showDeleteConfirm ? (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    animation: 'fadeIn 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem' }}>
                    <AlertCircle size={16} />
                    <span>Удалить задачу навсегда?</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    Все списания времени, комментарии и чек-листы будут удалены.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '0.45rem', fontSize: '0.78rem', fontWeight: 700 }}
                      onClick={() => {
                        onDeleteTask(task.id);
                        playSound('click');
                        onBack();
                      }}
                    >
                      <Trash2 size={13} /> Да, удалить
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--accent-rose)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={14} />
                  <span>Удалить задачу</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
