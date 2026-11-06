import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  X, 
  Clock, 
  Play, 
  Square, 
  Archive, 
  ArchiveRestore, 
  CheckSquare, 
  Tag, 
  FileText, 
  FolderOpen, 
  Link2, 
  User, 
  ChevronRight, 
  ChevronDown,
  AlertTriangle, 
  Sparkles, 
  Plus, 
  Trash2, 
  Calendar, 
  Check, 
  CornerDownRight,
  ExternalLink,
  Layers,
  Building2,
  HardDrive,
  Download,
  ZoomIn,
  ZoomOut,
  DollarSign,
  Navigation,
  Car,
  Gauge,
  Users,
  Eye,
  HelpCircle,
  Folder
} from 'lucide-react';
import { DEPARTMENTS, DEFAULT_STICKERS, PRIORITIES, KST_OPTIONS, KIZM_OPTIONS, KSL_OPTIONS } from '../lib/constants';
import { playSound } from '../lib/sound';
import { openFolderInExplorer, uploadTaskFile, createNotification } from '../lib/api';
import { renderWithMentions, MentionAutocompleteDropdown, extractMentionTargets } from '../lib/mentions';

export function TaskChatPanel({
  task,
  columns = [],
  teamMembers = [],
  departments = DEPARTMENTS,
  sections = [],
  currentUser,
  activeDepartmentId,
  activeStopwatchTaskId,
  onToggleStopwatch,
  stopwatchElapsedSec = 0,
  formatStopwatchTime,
  onSaveTask,
  onClose,
  showToast,
  allTasks = [],
  onSelectTask
}) {
  const deptsList = Array.isArray(departments) && departments.length > 0 ? departments : DEPARTMENTS;
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'properties' | 'subtasks' | 'files'
  
  // Local editable draft of task
  const [currentTask, setCurrentTask] = useState(task);
  const [commentInput, setCommentInput] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [taskQuery, setTaskQuery] = useState(null);
  const chatInputRef = useRef(null);

  // Searchable Assignee & Observers Combobox state (scales to 300+ members)
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [observerSearchQuery, setObserverSearchQuery] = useState('');
  const [isObserverDropdownOpen, setIsObserverDropdownOpen] = useState(false);

  // Drag and drop state for files tab
  const [isFilesDropOver, setIsFilesDropOver] = useState(false);

  // Hierarchical Subtasks & Nesting state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('');
  const [isSubtaskDropOver, setIsSubtaskDropOver] = useState(false);
  const [showNestModal, setShowNestModal] = useState(false);
  const [nestSearchQuery, setNestSearchQuery] = useState('');

  // Payroll (Salary Autofill) Modal State
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollStep, setPayrollStep] = useState('form'); // 'form' | 'confirm'
  const [payrollWorkType, setPayrollWorkType] = useState('Проектирование');
  const [payrollCipher, setPayrollCipher] = useState('');
  const [payrollCustomer, setPayrollCustomer] = useState('Внутренний заказчик Уфанет');
  const [payrollKst, setPayrollKst] = useState('1');
  const [payrollKizm, setPayrollKizm] = useState('1');
  const [payrollKsl, setPayrollKsl] = useState('1');

  // PDF Viewer & File state
  const [activePdfFile, setActivePdfFile] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(4);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [folderOpening, setFolderOpening] = useState(false);

  // Child subtasks from allTasks
  const childTasks = useMemo(() => {
    if (!Array.isArray(allTasks) || allTasks.length === 0 || !currentTask?.id) return [];
    return allTasks.filter((t) => t.parent_task_id === currentTask.id);
  }, [allTasks, currentTask?.id]);

  // Parent task if nested
  const parentTask = useMemo(() => {
    if (!currentTask?.parent_task_id || !Array.isArray(allTasks)) return null;
    return allTasks.find((t) => t.id === currentTask.parent_task_id) || null;
  }, [allTasks, currentTask?.parent_task_id]);

  const chatEndRef = useRef(null);

  // Sync draft whenever task changes
  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  // Auto scroll chat to bottom when messages update
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTask?.comments, activeTab]);

  if (!currentTask) return null;

  const isStopwatchActive = activeStopwatchTaskId === currentTask.id;
  const isArchived = Boolean(currentTask.is_archived);

  // Helper to commit updates
  const commitTaskUpdate = (updates) => {
    const updated = {
      ...currentTask,
      ...updates,
      updated_at: new Date().toISOString()
    };
    setCurrentTask(updated);
    if (onSaveTask) {
      onSaveTask(updated);
    }
  };

  // Toggle Sticker
  const handleToggleSticker = (stickerId) => {
    const existing = Array.isArray(currentTask.stickers) ? currentTask.stickers : [];
    let nextStickers = [];
    let action = '';
    if (existing.includes(stickerId)) {
      nextStickers = existing.filter((s) => s !== stickerId);
      action = 'снят';
    } else {
      nextStickers = [...existing, stickerId];
      action = 'добавлен';
    }

    const stMeta = DEFAULT_STICKERS.find((s) => s.id === stickerId);
    playSound('click');
    if (showToast) showToast(`Стикер «${stMeta?.name || stickerId}» ${action}`, '🏷️');

    // Add audit comment to task chat
    const auditComment = {
      id: `audit-${Date.now()}`,
      user_id: currentUser?.id || 'system',
      user_name: currentUser?.full_name || 'Система',
      text: `${action === 'добавлен' ? '🏷️ Добавлен стикер' : 'Снят стикер'}: ${stMeta?.icon || ''} ${stMeta?.name || stickerId}`,
      created_at: new Date().toISOString(),
      is_system: true
    };

    commitTaskUpdate({
      stickers: nextStickers,
      comments: [...(currentTask.comments || []), auditComment]
    });
  };

  // Send comment in task chat
  const handleSendComment = (e) => {
    e?.preventDefault();
    const text = commentInput.trim();
    if (!text) return;

    const newComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: currentUser?.id || 'unknown',
      user_name: currentUser?.full_name || 'Инженер',
      avatar_color: currentUser?.avatar_color || '#ff6600',
      text,
      created_at: new Date().toISOString()
    };

    const updatedComments = [...(currentTask.comments || []), newComment];
    setCommentInput('');
    playSound('success');

    commitTaskUpdate({ comments: updatedComments });

    // Send notifications for mentions & task assignee
    const mentionTargets = extractMentionTargets(text, teamMembers);
    if (mentionTargets.length > 0) {
      if (onNotifyMention) {
        onNotifyMention({
          type: 'mention',
          targetUserIds: mentionTargets,
          fromUserId: currentUser?.id,
          fromUserName: currentUser?.full_name,
          taskId: currentTask.id,
          taskTitle: currentTask.title,
          text
        });
      } else {
        createNotification({
          type: 'mention',
          targetUserIds: mentionTargets,
          fromUserId: currentUser?.id,
          fromUserName: currentUser?.full_name,
          taskId: currentTask.id,
          taskTitle: currentTask.title,
          text
        });
      }
    }

    if (currentTask.assignee_id && currentTask.assignee_id !== currentUser?.id && !mentionTargets.includes(currentTask.assignee_id)) {
      createNotification({
        type: 'comment',
        targetUserIds: [currentTask.assignee_id],
        fromUserId: currentUser?.id,
        fromUserName: currentUser?.full_name,
        taskId: currentTask.id,
        taskTitle: currentTask.title,
        text: `${currentUser?.full_name || 'Коллега'} оставил(а) комментарий: "${text.slice(0, 80)}"`
      });
    }
  };

  // Add new child subtask (real hierarchical task)
  const handleAddSubtask = (e) => {
    e?.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title || !currentTask?.id) return;

    if (onSaveTask) {
      onSaveTask({
        title,
        status: 'in_progress',
        department_id: currentTask.department_id || 'dept-design',
        assignee_id: newSubtaskAssignee || null,
        parent_task_id: currentTask.id,
        priority: currentTask.priority || 'medium',
        work_type: currentTask.work_type || 'ВН',
        project_id: currentTask.project_id || null,
        section_id: currentTask.section_id || null,
        description: `Подзадача для карточки #${currentTask.display_id || currentTask.id}`
      });
      playSound('success');
      setNewSubtaskTitle('');
      setNewSubtaskAssignee('');
      if (showToast) showToast('Подзадача создана и вложена в колонку', '↳');
    }
  };

  // Delete subtask
  const handleDeleteSubtask = (idx) => {
    const checklist = (currentTask.checklist || []).filter((_, i) => i !== idx);
    playSound('click');
    commitTaskUpdate({ checklist });
  };

  // Update subtask assignee
  const handleUpdateSubtaskAssignee = (idx, assigneeId) => {
    const checklist = Array.isArray(currentTask.checklist) ? [...currentTask.checklist] : [];
    if (!checklist[idx]) return;

    checklist[idx] = {
      ...checklist[idx],
      assignee_id: assigneeId || null
    };

    commitTaskUpdate({ checklist });
  };

  // Toggle Archive (root tasks only)
  const handleToggleArchive = () => {
    if (currentTask.parent_task_id) {
      if (showToast) showToast('Архивация выполняется только для главной задачи (архивирует всё дерево подзадач)', '🔒');
      return;
    }

    const nextArchived = !isArchived;
    playSound('click');

    const auditComment = {
      id: `audit-${Date.now()}`,
      user_id: currentUser?.id || 'system',
      user_name: currentUser?.full_name || 'Система',
      text: nextArchived ? '📦 Задача перемещена в архив' : '↩ Задача восстановлена из архива',
      created_at: new Date().toISOString(),
      is_system: true
    };

    commitTaskUpdate({
      is_archived: nextArchived,
      archived_at: nextArchived ? new Date().toISOString() : null,
      comments: [...(currentTask.comments || []), auditComment]
    });

    if (showToast) {
      showToast(nextArchived ? 'Задача и её подзадачи перемещены в архив' : 'Задача восстановлена из архива', '📦');
    }
  };

  // Open Network Folder in Windows Explorer (handles web links, local PC and remote headless Linux VM)
  const handleOpenFolder = async (customPath) => {
    const rawPath = customPath || currentTask.network_path || currentTask.project_path || currentTask.network_link;
    if (!rawPath || !rawPath.trim()) return;
    const cleanPath = rawPath.trim();

    // 0. If it's a web URL, open directly in browser
    if (/^https?:\/\//i.test(cleanPath)) {
      window.open(cleanPath, '_blank', 'noopener,noreferrer');
      return;
    }

    // 1. Copy to clipboard
    try {
      await navigator.clipboard.writeText(cleanPath);
    } catch {}

    setFolderOpening(true);
    try {
      const res = await openFolderInExplorer(cleanPath);
      if (res?.isRemote || !res?.success) {
        playSound('success');
        if (showToast) {
          showToast(`📁 Путь скопирован! Нажмите Win+R -> Ctrl+V -> Enter для перехода в Проводнике`, '📁');
        }
      } else {
        playSound('success');
        if (showToast) showToast('Папка проекта открыта в Проводнике Windows', '📁');
      }
    } catch (err) {
      if (showToast) {
        showToast(`📁 Путь скопирован! Нажмите Win+R -> Ctrl+V -> Enter`, '📁');
      }
    } finally {
      setFolderOpening(false);
    }
  };

  // Launch Salary Autofill (Immediate flow: opens PP in new tab and prompts for confirmation)
  const handleOpenPayrollModal = () => {
    const cipher = currentTask.project_cipher || currentTask.erp_project_id || currentTask.display_id || '';
    const customer = currentTask.internal_customer || 'Уфанет Москва';
    const workType = currentTask.requires_site_visit ? 'Выезд на объект' : 'Проектирование';
    setPayrollCipher(cipher);
    setPayrollCustomer(customer);
    setPayrollWorkType(workType);

    const payload = {
      user_id: currentUser?.id,
      user_name: currentUser?.full_name,
      project_cipher: cipher,
      internal_customer: customer,
      work_type: workType,
      kst: payrollKst,
      kizm: payrollKizm,
      ksl: payrollKsl,
      task_id: currentTask.id,
      task_title: currentTask.title
    };
    const hash = encodeURIComponent(JSON.stringify(payload));
    window.open(`https://pp.core.ufanet.ru/works/new#kaban=${hash}`, '_blank');
    setPayrollStep('confirm');
    setShowPayrollModal(true);
    playSound('click');
  };

  const handleLaunchPayrollSystem = () => {
    const payload = {
      user_id: currentUser?.id,
      user_name: currentUser?.full_name,
      project_cipher: payrollCipher,
      internal_customer: payrollCustomer,
      work_type: payrollWorkType,
      kst: payrollKst,
      kizm: payrollKizm,
      ksl: payrollKsl,
      task_id: currentTask.id,
      task_title: currentTask.title
    };
    const hash = encodeURIComponent(JSON.stringify(payload));
    window.open(`https://pp.core.ufanet.ru/works/new#kaban=${hash}`, '_blank');
    setPayrollStep('confirm');
    playSound('click');
  };

  const handleConfirmPayrollSaved = () => {
    const existing = Array.isArray(currentTask.payroll_records) ? currentTask.payroll_records : [];
    // Duplicate check: same employee + same work type on this task
    const isDup = existing.some(
      (r) => r.user_id === currentUser?.id && r.work_type === payrollWorkType
    );

    if (isDup) {
      if (showToast) showToast(`Отчет по виду «${payrollWorkType}» уже сохранен в этой задаче для вас!`, '⚠️');
      setShowPayrollModal(false);
      return;
    }

    const newRecord = {
      id: `pay-${Date.now()}`,
      user_id: currentUser?.id || 'unknown',
      user_name: currentUser?.full_name || 'Инженер',
      work_type: payrollWorkType,
      cipher: payrollCipher,
      date: new Date().toISOString()
    };

    const auditComment = {
      id: `audit-${Date.now()}`,
      user_id: currentUser?.id || 'system',
      user_name: currentUser?.full_name || 'Система',
      text: `💰 Зафиксирован отчет ЗП: ${payrollWorkType} (${currentUser?.full_name || 'Инженер'})`,
      created_at: new Date().toISOString(),
      is_system: true
    };

    commitTaskUpdate({
      payroll_records: [...existing, newRecord],
      comments: [...(currentTask.comments || []), auditComment]
    });

    setShowPayrollModal(false);
    playSound('success');
    if (showToast) showToast('Отчет ЗП успешно прикреплен к задаче!', '💰');
  };

  // Toggle Mirrored Department
  const handleToggleMirroredDept = (deptId) => {
    const mirrors = Array.isArray(currentTask.mirrored_departments) ? [...currentTask.mirrored_departments] : [];
    let nextMirrors = [];
    if (mirrors.includes(deptId)) {
      nextMirrors = mirrors.filter((id) => id !== deptId);
    } else {
      nextMirrors = [...mirrors, deptId];
    }
    playSound('click');
    commitTaskUpdate({ mirrored_departments: nextMirrors });
  };

  // Subtasks completion %
  const subtasks = Array.isArray(currentTask.checklist) ? currentTask.checklist : [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtasksPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const currentColumn = (Array.isArray(columns) && columns.find((c) => c.id === currentTask.status)) || columns?.[0] || { id: 'backlog', title: 'Очередь', color: '#64748b' };
  const currentAssignee = Array.isArray(teamMembers) ? teamMembers.find((m) => m.id === currentTask.assignee_id) : null;
  const currentDept = deptsList.find((d) => d.id === currentTask.department_id) || deptsList[0] || { id: 'dept-design', name: 'Отдел', color: '#ff6600', icon: '🏢' };

  return (
    <aside
      className="task-chat-panel"
      style={{
        width: '490px',
        minWidth: '420px',
        maxWidth: '560px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary, #131d2e)',
        borderLeft: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
        boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.35)',
        zIndex: 40,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 1. TOP HEADER */}
      <div style={{
        padding: '0.85rem 1rem 0.65rem 1rem',
        borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%)'
      }}>
        {/* Top Badges & Actions Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '0.45rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'rgba(255, 102, 0, 0.15)',
              color: '#ff6600',
              fontFamily: 'var(--font-mono, monospace)',
              border: '1px solid rgba(255, 102, 0, 0.3)'
            }}>
              {currentTask.display_id || currentTask.id}
            </span>

            {currentTask.project_cipher && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                #{currentTask.project_cipher}
              </span>
            )}

            {isArchived && (
              <span style={{
                padding: '1px 6px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                background: 'rgba(100, 116, 139, 0.25)',
                color: '#94a3b8',
                border: '1px solid rgba(100, 116, 139, 0.4)'
              }}>
                📦 В архиве
              </span>
            )}
          </div>

          {/* Quick Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {/* Stopwatch Button */}
            <button
              type="button"
              onClick={() => onToggleStopwatch && onToggleStopwatch(currentTask.id)}
              title={isStopwatchActive ? 'Остановить секундомер' : 'Запустить секундомер'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: isStopwatchActive ? '1px solid #10b981' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                background: isStopwatchActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: isStopwatchActive ? '#10b981' : 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              {isStopwatchActive ? <Square size={12} fill="#10b981" /> : <Play size={12} />}
              <span>{isStopwatchActive ? (formatStopwatchTime ? formatStopwatchTime(stopwatchElapsedSec) : `${stopwatchElapsedSec}с`) : 'Таймер'}</span>
            </button>

            {/* Salary Autofill Button */}
            <button
              type="button"
              onClick={handleOpenPayrollModal}
              title="Автозаполнение ЗП (pp.core.ufanet.ru)"
              style={{
                background: Array.isArray(currentTask.payroll_records) && currentTask.payroll_records.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 102, 0, 0.15)',
                border: Array.isArray(currentTask.payroll_records) && currentTask.payroll_records.length > 0 ? '1px solid #10b981' : '1px solid #ff6600',
                color: Array.isArray(currentTask.payroll_records) && currentTask.payroll_records.length > 0 ? '#10b981' : '#ff8800',
                cursor: 'pointer',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <DollarSign size={13} />
              <span>ЗП</span>
              {Array.isArray(currentTask.payroll_records) && currentTask.payroll_records.length > 0 && (
                <span style={{ fontSize: '0.62rem', background: '#10b981', color: '#fff', padding: '0 4px', borderRadius: '6px' }}>
                  {currentTask.payroll_records.length}
                </span>
              )}
            </button>

            {/* Archive Toggle */}
            <button
              type="button"
              onClick={handleToggleArchive}
              title={currentTask.parent_task_id ? 'Подзадача архивируется вместе с главной задачей' : (isArchived ? 'Восстановить из архива' : 'Переместить в архив')}
              style={{
                background: 'none',
                border: 'none',
                color: isArchived ? '#10b981' : 'var(--text-muted, #94a3b8)',
                cursor: currentTask.parent_task_id ? 'not-allowed' : 'pointer',
                opacity: currentTask.parent_task_id ? 0.4 : 1,
                padding: '5px',
                borderRadius: '6px'
              }}
            >
              {isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>

            {/* Close Task Panel Button */}
            <button
              type="button"
              onClick={onClose}
              title="Закрыть панель задачи (вернуться в чат отдела)"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '6px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Parent Task Breadcrumb (if nested subtask) */}
        {parentTask && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255, 102, 0, 0.1)', border: '1px solid rgba(255, 102, 0, 0.25)', marginBottom: '0.45rem', fontSize: '0.72rem' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: onSelectTask ? 'pointer' : 'default', color: '#ff8800', fontWeight: 700 }}
              onClick={() => onSelectTask && onSelectTask(parentTask)}
              title="Перейти к родительской задаче"
            >
              <span>↳ Подзадача в:</span>
              <span style={{ textDecoration: 'underline' }}>{parentTask.title}</span>
            </div>
            <button
              type="button"
              onClick={handleUnnest}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.68rem', padding: '1px 4px' }}
              title="Открепить и сделать самостоятельной корневой задачей"
            >
              ✕ Сделать главной
            </button>
          </div>
        )}

        {/* Task Title (Click opens task in new browser tab) */}
        <h2 style={{
          fontSize: '0.98rem',
          fontWeight: 800,
          margin: '0 0 0.5rem 0',
          lineHeight: 1.35
        }}>
          <a
            href={`/#task/${encodeURIComponent(currentTask.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Открыть задачу в новой вкладке браузера"
            style={{
              color: 'var(--text-primary, #fff)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff6600';
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-primary, #fff)';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            <span>{currentTask.title}</span>
            <ExternalLink size={13} style={{ opacity: 0.65, flexShrink: 0 }} />
          </a>
        </h2>

        {/* Quick Stickers Bar (Feature 1: 1-click toggle) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '0.2rem' }}>
          {DEFAULT_STICKERS.map((st) => {
            const hasSticker = (currentTask.stickers || []).includes(st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleToggleSticker(st.id)}
                title={hasSticker ? `Снять стикер: ${st.name}` : `Добавить стикер: ${st.name}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 6px',
                  borderRadius: '5px',
                  fontSize: '0.68rem',
                  fontWeight: hasSticker ? 700 : 500,
                  border: hasSticker ? `1.5px solid ${st.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                  background: hasSticker ? `${st.color}25` : 'rgba(255, 255, 255, 0.02)',
                  color: hasSticker ? '#fff' : 'var(--text-dim, #64748b)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{st.icon}</span>
                <span>{st.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. NAVIGATION TABS (Чат, Инфо и ТЗ, Подзадачи, Файлы и PDF) */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
        background: 'rgba(0, 0, 0, 0.15)',
        padding: '0 0.5rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '0.6rem 0.3rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '2.5px solid #ff6600' : '2.5px solid transparent',
            color: activeTab === 'chat' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
            fontSize: '0.78rem',
            fontWeight: activeTab === 'chat' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <MessageSquare size={14} />
          <span>Чат</span>
          {(currentTask.comments?.length || 0) > 0 && (
            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: '8px' }}>
              {currentTask.comments.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          style={{
            flex: 1,
            padding: '0.6rem 0.3rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'properties' ? '2.5px solid #ff6600' : '2.5px solid transparent',
            color: activeTab === 'properties' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
            fontSize: '0.78rem',
            fontWeight: activeTab === 'properties' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Layers size={14} />
          <span>Инфо и ТЗ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subtasks')}
          style={{
            flex: 1,
            padding: '0.6rem 0.3rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'subtasks' ? '2.5px solid #ff6600' : '2.5px solid transparent',
            color: activeTab === 'subtasks' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
            fontSize: '0.78rem',
            fontWeight: activeTab === 'subtasks' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <CheckSquare size={14} />
          <span>Подзадачи</span>
          {(childTasks.length > 0 || (currentTask.checklist?.length || 0) > 0) && (
            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 102, 0, 0.2)', color: '#ff8800', padding: '1px 5px', borderRadius: '8px', fontWeight: 800 }}>
              {childTasks.length > 0 ? childTasks.length : currentTask.checklist?.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('files')}
          style={{
            flex: 1,
            padding: '0.6rem 0.3rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'files' ? '2.5px solid #ff6600' : '2.5px solid transparent',
            color: activeTab === 'files' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
            fontSize: '0.78rem',
            fontWeight: activeTab === 'files' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <FileText size={14} />
          <span>Файлы & PDF</span>
          {(currentTask.files?.length || 0) > 0 && (
            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: '8px' }}>
              {currentTask.files.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. TAB BODIES */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* TAB 1: CHAT & AUDIT EVENTS */}
        {activeTab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages Thread */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(!currentTask.comments || currentTask.comments.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim, #64748b)' }}>
                  <MessageSquare size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.82rem', margin: 0 }}>В задаче пока нет сообщений</p>
                  <p style={{ fontSize: '0.72rem', margin: '4px 0 0 0' }}>Начните обсуждение ниже — коллегам придёт уведомление</p>
                </div>
              ) : (
                currentTask.comments.map((comm) => {
                  if (comm.is_system) {
                    return (
                      <div
                        key={comm.id}
                        style={{
                          alignSelf: 'center',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          fontSize: '0.7rem',
                          color: 'var(--text-muted, #94a3b8)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{comm.text}</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-dim, #64748b)' }}>
                          {comm.created_at ? new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  }

                  const isMe = comm.user_id === currentUser?.id;
                  return (
                    <div
                      key={comm.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '85%'
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim, #64748b)', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                        {comm.user_name} • {comm.created_at ? new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                      <div
                        style={{
                          padding: '0.6rem 0.85rem',
                          borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          background: isMe ? 'linear-gradient(135deg, #ff6600, #ff8800)' : 'var(--bg-tertiary, #1c2638)',
                          color: '#fff',
                          fontSize: '0.82rem',
                          lineHeight: 1.45,
                          boxShadow: isMe ? '0 3px 10px rgba(255, 102, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
                          wordBreak: 'break-word'
                        }}
                      >
                        {renderWithMentions(comm.text)}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form at bottom with Mentions Popup */}
            <div style={{ position: 'relative' }}>
              {mentionQuery !== null && (
                <div style={{ position: 'absolute', bottom: '100%', left: '12px', right: '12px', zIndex: 10050, marginBottom: '8px' }}>
                  <MentionAutocompleteDropdown
                    query={mentionQuery}
                    teamMembers={teamMembers}
                    position={{ position: 'relative', width: '100%', bottom: 'auto' }}
                    onSelect={(member) => {
                      const rep = member.isAll ? '@все ' : `@${member.full_name} `;
                      setCommentInput((prev) => prev.replace(/@([a-zA-Zа-яА-ЯёЁ0-9_]*)$/, rep));
                      setMentionQuery(null);
                      chatInputRef.current?.focus();
                    }}
                  />
                </div>
              )}

              {taskQuery !== null && (
                <div style={{ position: 'absolute', bottom: '100%', left: '12px', right: '12px', zIndex: 10050, marginBottom: '8px', background: 'var(--bg-card, #1c2233)', border: '1px solid var(--border-subtle)', borderRadius: '8px', maxHeight: '160px', overflowY: 'auto', padding: '4px', boxShadow: 'var(--shadow-lg)' }}>
                  {allTasks.filter(t => (t.title || '').toLowerCase().includes(taskQuery.toLowerCase()) || (t.display_id || '').toLowerCase().includes(taskQuery.toLowerCase())).slice(0, 5).map(t => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setCommentInput(prev => prev.replace(/#([a-zA-Zа-яА-ЯёЁ0-9_.-]*)$/, `#${t.display_id || t.id} `));
                        setTaskQuery(null);
                        chatInputRef.current?.focus();
                      }}
                      style={{ padding: '6px 8px', fontSize: '0.74rem', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 102, 0, 0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontWeight: 800, color: '#ff8800' }}>#{t.display_id || t.id}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={handleSendComment}
                style={{
                  padding: '0.65rem 0.75rem 0.35rem 0.75rem',
                  borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  background: 'var(--bg-secondary, #141824)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}
              >
                <input
                  ref={chatInputRef}
                  type="text"
                  value={commentInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCommentInput(val);
                    const atMatch = val.match(/@([a-zA-Zа-яА-ЯёЁ0-9_]*)$/);
                    setMentionQuery(atMatch ? atMatch[1] : null);
                    const hashMatch = val.match(/#([a-zA-Zа-яА-ЯёЁ0-9_.-]*)$/);
                    setTaskQuery(hashMatch ? hashMatch[1] : null);
                  }}
                  placeholder="Написать в чат задачи... (@ для коллег, # для задач)"
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.16))',
                    background: 'var(--bg-card, #1c2233)',
                    color: 'var(--text-main, #f8fafc)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    background: commentInput.trim() ? 'linear-gradient(135deg, #ff6600, #ff8800)' : 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#fff',
                    cursor: commentInput.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={15} />
                </button>
              </form>

              {/* Quick Mention & Task Tag Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '0 0.75rem 0.6rem 0.75rem',
                  background: 'var(--bg-secondary, #141824)'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCommentInput(prev => (prev ? `${prev.trimEnd()} @` : '@'));
                    setMentionQuery('');
                    setTimeout(() => chatInputRef.current?.focus(), 50);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 102, 0, 0.12)',
                    border: '1px solid rgba(255, 102, 0, 0.35)',
                    color: '#ff8800',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 102, 0, 0.22)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 102, 0, 0.12)';
                  }}
                  title="Быстро упомянуть коллегу в чате"
                >
                  <span>@</span>
                  <span>Упомянуть</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCommentInput(prev => (prev ? `${prev.trimEnd()} #` : '#'));
                    setTaskQuery('');
                    setTimeout(() => chatInputRef.current?.focus(), 50);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.22)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                  }}
                  title="Привязать задачу по номеру или шифру"
                >
                  <span>#</span>
                  <span>Привязать задачу</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROPERTIES & METADATA */}
        {activeTab === 'properties' && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Status / Column Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                Этап (Колонка):
              </label>
              <select
                value={currentTask.status}
                onChange={(e) => commitTaskUpdate({ status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: '#1a2638',
                  color: '#fff',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Assignee Searchable Combobox (scales to 300+ employees) */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                Ответственный исполнитель:
              </label>

              {(() => {
                const currentAssignee = teamMembers.find(m => m.id === currentTask.assignee_id);
                return (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
                        border: isAssigneeDropdownOpen ? '1.5px solid #ff6600' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                        background: '#1a2638',
                        cursor: 'pointer'
                      }}
                      onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                    >
                      {currentAssignee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: currentAssignee.avatar_color || '#ff6600',
                              color: '#fff',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {currentAssignee.initials || currentAssignee.full_name?.[0]}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {currentAssignee.full_name}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                              {currentAssignee.role} {deptsList.find(d => d.id === currentAssignee.department_id) ? `• ${deptsList.find(d => d.id === currentAssignee.department_id).name}` : ''}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          Не назначен (кликните для поиска исполнителя)
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {currentAssignee && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              commitTaskUpdate({ assignee_id: null });
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px 4px', fontSize: '0.8rem' }}
                            title="Снять назначение"
                          >
                            ✕
                          </button>
                        )}
                        <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} />
                      </div>
                    </div>

                    {isAssigneeDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          marginTop: '4px',
                          background: 'var(--bg-modal, #182234)',
                          border: '1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.18))',
                          borderRadius: '8px',
                          boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <input
                          type="text"
                          autoFocus
                          value={assigneeSearchQuery}
                          onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                          placeholder="Поиск по имени, фамилии или отделу..."
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 102, 0, 0.5)',
                            background: 'rgba(0, 0, 0, 0.35)',
                            color: '#fff',
                            fontSize: '0.78rem',
                            outline: 'none'
                          }}
                        />
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div
                            onClick={() => {
                              commitTaskUpdate({ assignee_id: null });
                              setIsAssigneeDropdownOpen(false);
                              setAssigneeSearchQuery('');
                            }}
                            style={{
                              padding: '5px 8px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              color: 'var(--text-dim)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            ✕ Без ответственного
                          </div>
                          {teamMembers
                            .filter((m) => {
                              if (!assigneeSearchQuery.trim()) return true;
                              const q = assigneeSearchQuery.toLowerCase().trim();
                              const d = deptsList.find(dep => dep.id === m.department_id);
                              return (
                                m.full_name?.toLowerCase().includes(q) ||
                                m.role?.toLowerCase().includes(q) ||
                                d?.name?.toLowerCase().includes(q)
                              );
                            })
                            .slice(0, 30)
                            .map((m) => {
                              const d = deptsList.find(dep => dep.id === m.department_id);
                              return (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    commitTaskUpdate({ assignee_id: m.id });
                                    setIsAssigneeDropdownOpen(false);
                                    setAssigneeSearchQuery('');
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    background: currentTask.assignee_id === m.id ? 'rgba(255, 102, 0, 0.15)' : 'transparent'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 102, 0, 0.12)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = currentTask.assignee_id === m.id ? 'rgba(255, 102, 0, 0.15)' : 'transparent'}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: m.avatar_color || '#ff6600', color: '#fff', fontSize: '0.58rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {m.initials || m.full_name?.[0]}
                                    </div>
                                    <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>{m.full_name}</span>
                                  </div>
                                  <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                                    {m.role} {d ? `• ${d.name}` : ''}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                Основной отдел:
              </label>
              <select
                value={currentTask.department_id || 'dept-design'}
                onChange={(e) => commitTaskUpdate({ department_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: '#1a2638',
                  color: '#fff',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {deptsList.map((d) => (
                  <option key={d.id} value={d.id} style={{ backgroundColor: '#1a2234', color: '#ffffff' }}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                Срок выполнения (Дедлайн):
              </label>
              <input
                type="date"
                value={currentTask.deadline || ''}
                onChange={(e) => commitTaskUpdate({ deadline: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: '#1a2638',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            {/* Mirrors Multi-Select */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
                  Зеркалирование в отделы:
                </label>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-dim, #64748b)' }}>
                  Отобразить на досках
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {deptsList.filter((d) => d.id !== currentTask.department_id).map((dept) => {
                  const isMirrored = (currentTask.mirrored_departments || []).includes(dept.id);
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => handleToggleMirroredDept(dept.id)}
                      style={{
                        padding: '4px 9px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        border: isMirrored ? '1.5px solid #8b5cf6' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                        background: isMirrored ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: isMirrored ? '#c4b5fd' : 'var(--text-muted, #94a3b8)',
                        cursor: 'pointer',
                        fontWeight: isMirrored ? 700 : 500
                      }}
                    >
                      <span>{isMirrored ? '🔗 ' : ''}{dept.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Object Address & Site Visit Calculation */}
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 102, 0, 0.06)', border: '1px solid rgba(255, 102, 0, 0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#ff8800', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(currentTask.requires_site_visit)}
                    onChange={(e) => commitTaskUpdate({ requires_site_visit: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: '#ff6600', cursor: 'pointer' }}
                  />
                  <span>🚗 Требует выезд на объект (Топливная карта ГСМ)</span>
                </label>
              </div>

              {currentTask.requires_site_visit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    value={currentTask.address || ''}
                    onChange={(e) => commitTaskUpdate({ address: e.target.value })}
                    placeholder="Адрес объекта (например: г. Москва, ул. Арбат, 24)"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                      background: 'var(--bg-card, #1c2233)',
                      color: '#fff',
                      fontSize: '0.78rem'
                    }}
                  />
                  {currentTask.address && (
                    <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                      <Car size={13} />
                      <span>
                        От БЦ «Телеграф», г. Одинцово: ~{42} км туда-обратно (~3.6 л АИ-95 спишется в профиль при завершении)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Network Folder Link */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
                  📁 Сетевая папка / путь к чертежу:
                </label>
                {(currentTask.network_path || currentTask.project_path || currentTask.network_link) && (
                  <button
                    type="button"
                    onClick={() => handleOpenFolder()}
                    style={{ background: 'none', border: 'none', color: '#ff8800', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <FolderOpen size={12} />
                    <span>В Проводнике</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={currentTask.network_path || currentTask.network_link || currentTask.project_path || ''}
                  onChange={(e) => commitTaskUpdate({ network_path: e.target.value, network_link: e.target.value })}
                  placeholder="E:\kaban2 или \\ufanet-server\projects\Объект"
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    background: '#1a2638',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono, monospace)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleOpenFolder()}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.74rem', fontWeight: 700, flexShrink: 0 }}
                  title="Открыть папку проекта в Проводнике Windows (Win10/11)"
                >
                  <FolderOpen size={13} />
                  <span>Перейти</span>
                </button>
              </div>
            </div>

            {/* Observers / Watchers (participant_ids) - Scalable for 300+ members */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
                  👥 Следящие / Ожидающие передачи ({(currentTask.participant_ids || []).length}):
                </label>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-dim, #64748b)' }}>
                  Уведомлять об изменениях
                </span>
              </div>

              {/* Selected Observers Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
                {(currentTask.participant_ids || []).map((pid) => {
                  const m = teamMembers.find(mem => mem.id === pid);
                  if (!m) return null;
                  return (
                    <span
                      key={m.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(139, 92, 246, 0.18)',
                        border: '1px solid rgba(139, 92, 246, 0.35)',
                        color: '#c4b5fd',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: m.avatar_color || '#8b5cf6', color: '#fff', fontSize: '0.52rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.initials || m.full_name?.[0]}
                      </span>
                      <span>{m.full_name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (currentTask.participant_ids || []).filter(id => id !== m.id);
                          commitTaskUpdate({ participant_ids: next });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c4b5fd',
                          cursor: 'pointer',
                          padding: '0 2px',
                          fontSize: '0.75rem',
                          lineHeight: 1
                        }}
                        title="Удалить из следящих"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Search input for adding new observer */}
              <input
                type="text"
                value={observerSearchQuery}
                onFocus={() => setIsObserverDropdownOpen(true)}
                onChange={(e) => {
                  setObserverSearchQuery(e.target.value);
                  setIsObserverDropdownOpen(true);
                }}
                placeholder="+ Добавить следящего (поиск по имени, фамилии или отделу)..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: isObserverDropdownOpen ? '1.5px solid #8b5cf6' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: '#1a2638',
                  color: '#fff',
                  fontSize: '0.76rem',
                  outline: 'none'
                }}
              />

              {isObserverDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    marginTop: '4px',
                    background: 'var(--bg-modal, #182234)',
                    border: '1.5px solid rgba(139, 92, 246, 0.4)',
                    borderRadius: '8px',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
                    padding: '6px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px', fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                    <span>Выберите сотрудника для добавления в следящие:</span>
                    <button type="button" onClick={() => setIsObserverDropdownOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
                  </div>
                  {teamMembers
                    .filter(m => !(currentTask.participant_ids || []).includes(m.id))
                    .filter(m => {
                      if (!observerSearchQuery.trim()) return true;
                      const q = observerSearchQuery.toLowerCase().trim();
                      const d = deptsList.find(dep => dep.id === m.department_id);
                      return (
                        m.full_name?.toLowerCase().includes(q) ||
                        m.role?.toLowerCase().includes(q) ||
                        d?.name?.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 30)
                    .map((m) => {
                      const d = deptsList.find(dep => dep.id === m.department_id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            const cur = currentTask.participant_ids || [];
                            commitTaskUpdate({ participant_ids: [...cur, m.id] });
                            setObserverSearchQuery('');
                            setIsObserverDropdownOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: m.avatar_color || '#8b5cf6', color: '#fff', fontSize: '0.58rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {m.initials || m.full_name?.[0]}
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>{m.full_name}</span>
                          </div>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            {m.role} {d ? `• ${d.name}` : ''}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Salary (ProjectPay) Section */}
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: '#10b981' }}>
                  <DollarSign size={15} />
                  <span>Расчет заработной платы (ProjectPay)</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPayrollModal}
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                >
                  💰 Автозаполнение ЗП
                </button>
              </div>

              {Array.isArray(currentTask.payroll_records) && currentTask.payroll_records.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Внесенные отчеты ЗП по задаче:</div>
                  {currentTask.payroll_records.map((r) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', borderRadius: '5px', background: 'rgba(255,255,255,0.04)', fontSize: '0.72rem' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>✓ {r.work_type} ({r.user_name})</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description / ТЗ */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                📝 Техническое задание и описание задачи:
              </label>
              <textarea
                rows={8}
                value={currentTask.description || ''}
                onChange={(e) => commitTaskUpdate({ description: e.target.value })}
                placeholder="Подробное ТЗ, технические требования, примечания к чертежу..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 3: SUBTASKS (КОЛОНКА ВЛОЖЕННЫХ ПОДЗАДАЧ С DRAG-AND-DROP) */}
        {activeTab === 'subtasks' && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header & Nesting Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} style={{ color: '#ff6600' }} />
                <span>Колонка подзадач ({childTasks.filter(c => c.status === 'done').length}/{childTasks.length}):</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNestModal(true)}
                style={{ background: 'none', border: 'none', color: '#ff8800', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700 }}
                title="Сделать эту задачу подзадачей другой задачи"
              >
                ↳ Вложить в другую задачу...
              </button>
            </div>

            {/* Subtasks Column & Drag-and-Drop Dropzone */}
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
                if (droppedId && droppedId !== currentTask.id) {
                  const droppedTask = allTasks.find(t => t.id === droppedId);
                  if (droppedTask && onSaveTask) {
                    onSaveTask({ ...droppedTask, parent_task_id: currentTask.id });
                    playSound('success');
                    if (showToast) showToast(`Задача #${droppedTask.display_id || droppedTask.title} теперь подзадача этой карточки!`, '↳');
                  }
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '0.85rem',
                borderRadius: '10px',
                minHeight: '140px',
                background: isSubtaskDropOver ? 'rgba(255, 102, 0, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                border: isSubtaskDropOver ? '2px dashed #ff6600' : '1px dashed rgba(255, 102, 0, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📥 Зона перетаскивания (Dropzone)
                </span>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                  Перетащите сюда карточку с доски
                </span>
              </div>

              {childTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <Layers size={24} style={{ color: 'var(--accent-orange)', opacity: 0.5, margin: '0 auto 6px auto', display: 'block' }} />
                  <div>У этой задачи пока нет вложенных подзадач.</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Перетащите сюда любую задачу с доски мышью (Drag & Drop) или создайте новую форму внизу
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {childTasks.map((child) => {
                    const childAssignee = teamMembers.find(m => m.id === child.assignee_id);
                    const isDone = child.status === 'done';
                    return (
                      <div
                        key={child.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: 'var(--bg-card, #1e293b)',
                          border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.25)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <span style={{ color: 'var(--accent-orange)', fontWeight: 800, fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                            #{child.display_id || child.id?.slice(-4)}
                          </span>
                          <span
                            onClick={() => onSelectTask && onSelectTask(child)}
                            style={{
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              color: isDone ? 'var(--text-muted)' : '#fff',
                              textDecoration: isDone ? 'line-through' : 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer'
                            }}
                            title="Открыть подзадачу для редактирования"
                          >
                            {child.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {/* Status Selector Dropdown */}
                          <select
                            value={child.status || 'backlog'}
                            onChange={(e) => {
                              if (onSaveTask) {
                                onSaveTask({ ...child, status: e.target.value });
                                playSound(e.target.value === 'done' ? 'success' : 'click');
                              }
                            }}
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              background: '#1a2234',
                              color: isDone ? '#10b981' : child.status === 'in_progress' ? '#ff8800' : '#f8fafc',
                              border: '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              colorScheme: 'dark'
                            }}
                          >
                            {columns.map((col) => (
                              <option key={col.id} value={col.id} style={{ backgroundColor: '#1a2234', color: '#ffffff' }}>
                                {col.title}
                              </option>
                            ))}
                          </select>

                          {/* Assignee Avatar / Selector */}
                          <select
                            value={child.assignee_id || ''}
                            onChange={(e) => {
                              if (onSaveTask) {
                                onSaveTask({ ...child, assignee_id: e.target.value || null });
                                playSound('click');
                              }
                            }}
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              background: '#1a2234',
                              color: '#f8fafc',
                              border: '1px solid var(--border-subtle)',
                              maxWidth: '100px',
                              colorScheme: 'dark'
                            }}
                            title={childAssignee ? `Исполнитель: ${childAssignee.full_name}` : 'Назначить исполнителя'}
                          >
                            <option value="" style={{ backgroundColor: '#1a2234', color: '#94a3b8' }}>👤 Без исп.</option>
                            {teamMembers.map((m) => (
                              <option key={m.id} value={m.id} style={{ backgroundColor: '#1a2234', color: '#ffffff' }}>
                                {m.full_name?.split(/\s+/)[0]}
                              </option>
                            ))}
                          </select>

                          {/* Open Subtask Button */}
                          <button
                            type="button"
                            onClick={() => onSelectTask && onSelectTask(child)}
                            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px 4px', fontSize: '0.78rem' }}
                            title="Открыть эту подзадачу"
                          >
                            <ExternalLink size={13} />
                          </button>

                          {/* Detach / Unlink Subtask */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onSaveTask) {
                                onSaveTask({ ...child, parent_task_id: null });
                                playSound('click');
                                if (showToast) showToast(`Подзадача «${child.title}» откреплена и вынесена на доску`, '✓');
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px 4px', fontSize: '0.8rem' }}
                            title="Открепить подзадачу (сделать обычной самостоятельной задачей на доске)"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form to Create Child Subtask */}
            <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="+ Название новой подзадачи..."
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#fff',
                  fontSize: '0.8rem'
                }}
              />
              <select
                value={newSubtaskAssignee}
                onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                style={{
                  padding: '0.55rem 0.6rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: '#1a2638',
                  color: '#fff',
                  fontSize: '0.76rem',
                  maxWidth: '130px',
                  colorScheme: 'dark'
                }}
              >
                <option value="" style={{ backgroundColor: '#1a2234', color: '#94a3b8' }}>Исполнитель...</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id} style={{ backgroundColor: '#1a2234', color: '#ffffff' }}>{m.full_name?.split(/\s+/)[0]}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim()}
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}
              >
                <Plus size={14} />
                <span>Создать</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: FILES & INLINE PDF VIEWER WITH ACTIVE DRAG-AND-DROP */}
        {activeTab === 'files' && (
          <div
            onDragOver={(e) => {
              if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                setIsFilesDropOver(true);
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFilesDropOver(false);
            }}
            onDrop={async (e) => {
              if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                setIsFilesDropOver(false);
                setUploadingFile(true);
                try {
                  const newFiles = [...(currentTask.files || [])];
                  for (const file of e.dataTransfer.files) {
                    const uploaded = await uploadTaskFile(file, currentUser?.full_name || 'Инженер');
                    newFiles.push(uploaded);
                  }
                  commitTaskUpdate({ files: newFiles });
                  playSound('success');
                  if (showToast) showToast('Чертежи и файлы успешно загружены в задачу', '📎');
                } catch (err) {
                  if (showToast) showToast('Ошибка при загрузке файлов', '⚠️');
                } finally {
                  setUploadingFile(false);
                }
              }
            }}
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              minHeight: '100%',
              background: isFilesDropOver ? 'rgba(255, 102, 0, 0.05)' : 'transparent',
              outline: isFilesDropOver ? '2px dashed #ff6600' : 'none',
              borderRadius: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            {/* Upload Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc' }}>
                Прикрепленные файлы и чертежи ({currentTask.files?.length || 0}):
              </div>
              <label
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.74rem', fontWeight: 700, cursor: uploadingFile ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <input
                  type="file"
                  multiple
                  onChange={async (e) => {
                    if (!e.target.files || e.target.files.length === 0) return;
                    setUploadingFile(true);
                    try {
                      const newFiles = [...(currentTask.files || [])];
                      for (const file of e.target.files) {
                        const uploaded = await uploadTaskFile(file, currentUser?.full_name || 'Инженер');
                        newFiles.push(uploaded);
                      }
                      commitTaskUpdate({ files: newFiles });
                      playSound('success');
                      if (showToast) showToast('Файлы успешно загружены', '📎');
                    } catch (err) {
                      if (showToast) showToast('Ошибка загрузки файла', '⚠️');
                    } finally {
                      setUploadingFile(false);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <Paperclip size={13} />
                <span>{uploadingFile ? 'Загрузка...' : '+ Прикрепить файл'}</span>
              </label>
            </div>

            {/* Files List / Active Drop Zone */}
            {(!currentTask.files || currentTask.files.length === 0) ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1.5rem',
                  color: isFilesDropOver ? '#ff8800' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  background: isFilesDropOver ? 'rgba(255, 102, 0, 0.12)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  border: isFilesDropOver ? '2px dashed #ff6600' : '1.5px dashed var(--border-subtle)',
                  boxShadow: isFilesDropOver ? '0 0 20px rgba(255, 102, 0, 0.3)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Paperclip size={28} style={{ color: isFilesDropOver ? '#ff6600' : 'var(--text-dim)', opacity: 0.8 }} />
                <div style={{ fontWeight: 700, color: isFilesDropOver ? '#fff' : 'inherit' }}>
                  {isFilesDropOver ? 'Отпустите файлы для прикрепления к задаче' : 'Нет прикрепленных файлов'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  Перетащите сюда чертежи в формате PDF или DWG из Проводника Windows, либо нажмите «+ Прикрепить файл» выше
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {currentTask.files.map((file, idx) => {
                  const isPdf = (file.name || '').toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
                  return (
                    <div
                      key={file.id || idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary, #0f172a)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <FileText size={18} style={{ color: isPdf ? '#ef4444' : '#ff6600', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {file.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                            {file.size ? `${Math.round(file.size / 1024)} КБ` : ''} • {file.uploaded_by || 'Инженер'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {isPdf && (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePdfFile(file);
                              setPdfPage(1);
                              setPdfZoom(100);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', gap: '4px' }}
                            title="Открыть встроенный просмотрщик PDF"
                          >
                            <Eye size={12} />
                            <span>Просмотр PDF</span>
                          </button>
                        )}
                        {file.url && (
                          <a
                            href={file.url}
                            download={file.name}
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Download size={12} />
                            <span>Скачать</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Interactive Inline Multi-Page PDF Viewer */}
            {activePdfFile && (
              <div style={{ marginTop: '0.75rem', background: '#0b1120', border: '1.5px solid rgba(255, 102, 0, 0.4)', borderRadius: '12px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: '#ff6600' }}>
                    <FileText size={16} />
                    <span>{activePdfFile.name}</span>
                  </div>

                  {/* PDF Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Zoom */}
                    <button
                      type="button"
                      onClick={() => setPdfZoom(z => Math.max(50, z - 15))}
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px' }}
                      title="Уменьшить"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{pdfZoom}%</span>
                    <button
                      type="button"
                      onClick={() => setPdfZoom(z => Math.min(200, z + 15))}
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px' }}
                      title="Увеличить"
                    >
                      <ZoomIn size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePdfFile(null)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px' }}
                      title="Закрыть просмотрщик"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* PDF Page Canvas Placeholder */}
                <div style={{ width: '100%', height: '360px', background: '#1e293b', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {activePdfFile.url ? (
                    <iframe
                      src={`${activePdfFile.url}#page=${pdfPage}&zoom=${pdfZoom}`}
                      title={activePdfFile.name}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      <FileText size={48} style={{ color: '#ef4444', margin: '0 auto 0.75rem', opacity: 0.6 }} />
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>Лист {pdfPage} • Проектная документация</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>Уфанет • Чертеж марки {currentTask.section || 'ВОЛС'}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Salary Autofill Modal (pp.core.ufanet.ru) */}
      {showPayrollModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) e.currentTarget.dataset.overlayClick = 'true';
          }}
          onMouseUp={(e) => {
            if (e.currentTarget.dataset.overlayClick === 'true' && e.target === e.currentTarget) {
              setShowPayrollModal(false);
            }
            e.currentTarget.dataset.overlayClick = 'false';
          }}
        >
          <div
            style={{
              background: 'var(--bg-modal, #141824)',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '16px',
              padding: '1.4rem',
              maxWidth: '480px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} style={{ color: '#10b981' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>Автозаполнение ЗП (ProjectPay)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <HelpCircle size={26} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>Вы сохранили отчет в системе ЗП?</h4>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  Система ProjectPay открыта в новой вкладке. После сохранения формы подтвердите начисление, чтобы прикрепить отметку к задаче.
                </p>
              </div>

              {/* Work Type Selection (handles multi-stage projects & site visits) */}
              <div style={{ textAlign: 'left', background: 'rgba(255, 255, 255, 0.03)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Вид работы для начисления ЗП:
                </label>
                <select
                  value={payrollWorkType}
                  onChange={(e) => setPayrollWorkType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card, #1c2233)',
                    color: '#fff',
                    fontSize: '0.78rem'
                  }}
                >
                  <option value="Проектирование">Проектирование (РД / ВОЛС)</option>
                  <option value="Выезд на объект">Выезд на объект / Обследование</option>
                  <option value="Согласование">Согласование проектной документации</option>
                </select>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  {currentTask.requires_site_visit
                    ? '💡 У задачи включен выезд: можно внести отчет и по Проектированию, и по Выезду.'
                    : '💡 Допускается сохранение отчетов разными исполнителями.'}
                </div>
              </div>

              {/* Already saved records on this task */}
              {(currentTask.payroll_records || []).length > 0 && (
                <div style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>Ранее зафиксированные отчеты:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px' }}>
                    {currentTask.payroll_records.map((r, i) => (
                      <div key={r.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '4px' }}>
                        <span>✓ {r.work_type} • {r.user_name}</span>
                        <span style={{ color: 'var(--text-dim)' }}>{new Date(r.date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPayrollModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.78rem' }}
                >
                  ✕ Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayrollSaved}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.78rem', fontWeight: 800, background: '#10b981', border: 'none' }}
                >
                  ✓ Да, отчет сохранен в ЗП
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nest Into Parent Task Modal */}
      {showNestModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) e.currentTarget.dataset.overlayClick = 'true';
          }}
          onMouseUp={(e) => {
            if (e.currentTarget.dataset.overlayClick === 'true' && e.target === e.currentTarget) {
              setShowNestModal(false);
            }
            e.currentTarget.dataset.overlayClick = 'false';
          }}
        >
          <div style={{ background: 'var(--bg-modal, #141824)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '1.25rem', maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                <Layers size={16} style={{ color: '#ff6600' }} />
                <span>Сделать подзадачей</span>
              </div>
              <button type="button" onClick={() => setShowNestModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Выберите главную задачу, в которую будет вложена текущая карточка «{currentTask.title}»:
            </p>

            <input
              type="text"
              value={nestSearchQuery}
              onChange={e => setNestSearchQuery(e.target.value)}
              placeholder="Поиск родительской задачи..."
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: '#fff', fontSize: '0.8rem' }}
            />

            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {allTasks
                .filter(t => t.id !== currentTask.id && t.parent_task_id !== currentTask.id)
                .filter(t => (t.title || '').toLowerCase().includes(nestSearchQuery.toLowerCase()) || (t.display_id || '').toLowerCase().includes(nestSearchQuery.toLowerCase()))
                .slice(0, 10)
                .map(t => (
                  <div
                    key={t.id}
                    onClick={() => {
                      commitTaskUpdate({ parent_task_id: t.id });
                      setShowNestModal(false);
                      playSound('success');
                      if (showToast) showToast(`Задача вложена в «${t.display_id || t.title}»`, '↳');
                    }}
                    style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 102, 0, 0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  >
                    <span style={{ fontWeight: 600, color: '#fff' }}>{t.title}</span>
                    <span style={{ color: '#ff8800', fontWeight: 800 }}>#{t.display_id || t.id}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
