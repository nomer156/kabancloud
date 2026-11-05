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
  HardDrive
} from 'lucide-react';
import { DEPARTMENTS, DEFAULT_STICKERS, PRIORITIES } from '../lib/constants';
import { playSound } from '../lib/sound';
import { openFolderInExplorer } from '../lib/api';

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
  showToast
}) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'properties' | 'subtasks' | 'description'
  
  // Local editable draft of task
  const [currentTask, setCurrentTask] = useState(task);
  const [commentInput, setCommentInput] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('');
  const [folderOpening, setFolderOpening] = useState(false);

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
  };

  // Toggle subtask checkbox
  const handleToggleSubtask = (idx) => {
    const checklist = Array.isArray(currentTask.checklist) ? [...currentTask.checklist] : [];
    if (!checklist[idx]) return;

    checklist[idx] = {
      ...checklist[idx],
      completed: !checklist[idx].completed
    };

    playSound('click');
    commitTaskUpdate({ checklist });
  };

  // Add new subtask
  const handleAddSubtask = (e) => {
    e?.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title) return;

    const newItem = {
      id: `sub-${Date.now()}`,
      text: title,
      completed: false,
      assignee_id: newSubtaskAssignee || null
    };

    const checklist = [...(Array.isArray(currentTask.checklist) ? currentTask.checklist : []), newItem];
    setNewSubtaskTitle('');
    setNewSubtaskAssignee('');
    playSound('click');

    commitTaskUpdate({ checklist });
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

  // Toggle Archive
  const handleToggleArchive = () => {
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
      showToast(nextArchived ? 'Задача перемещена в архив' : 'Задача восстановлена из архива', '📦');
    }
  };

  // Open Network Folder in Windows Explorer
  const handleOpenFolder = async () => {
    const path = currentTask.network_path || currentTask.project_path;
    if (!path) return;

    setFolderOpening(true);
    try {
      const res = await openFolderInExplorer(path);
      if (res?.success) {
        playSound('success');
        if (showToast) showToast('Папка проекта открыта в Проводнике Windows', '📁');
      } else {
        alert(res?.error || 'Не удалось открыть папку проекта');
      }
    } catch (err) {
      alert(`Ошибка открытия папки: ${err.message}`);
    } finally {
      setFolderOpening(false);
    }
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

  const currentColumn = columns.find((c) => c.id === currentTask.status) || columns[0];
  const currentAssignee = teamMembers.find((m) => m.id === currentTask.assignee_id);
  const currentDept = departments.find((d) => d.id === currentTask.department_id) || departments[0];

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

            {/* Archive Toggle */}
            <button
              type="button"
              onClick={handleToggleArchive}
              title={isArchived ? 'Восстановить из архива' : 'Переместить в архив'}
              style={{
                background: 'none',
                border: 'none',
                color: isArchived ? '#10b981' : 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
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

        {/* Task Title */}
        <h2 style={{
          fontSize: '0.98rem',
          fontWeight: 800,
          margin: '0 0 0.5rem 0',
          color: 'var(--text-primary, #fff)',
          lineHeight: 1.35
        }}>
          {currentTask.title}
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

      {/* 2. NAVIGATION TABS (Чат, Инфо, Подзадачи, Описание) */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
        background: 'rgba(0, 0, 0, 0.15)',
        padding: '0 0.5rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '0.6rem 0.4rem',
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
            gap: '5px'
          }}
        >
          <MessageSquare size={14} />
          <span>Чат задачи</span>
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
            padding: '0.6rem 0.4rem',
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
            gap: '5px'
          }}
        >
          <Layers size={14} />
          <span>Инфо</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subtasks')}
          style={{
            flex: 1,
            padding: '0.6rem 0.4rem',
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
            gap: '5px'
          }}
        >
          <CheckSquare size={14} />
          <span>Подзадачи</span>
          {subtasks.length > 0 && (
            <span style={{ fontSize: '0.65rem', background: completedSubtasks === subtasks.length ? '#10b981' : 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: '8px', color: '#fff' }}>
              {completedSubtasks}/{subtasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('description')}
          style={{
            flex: 1,
            padding: '0.6rem 0.4rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'description' ? '2.5px solid #ff6600' : '2.5px solid transparent',
            color: activeTab === 'description' ? '#ff6600' : 'var(--text-muted, #94a3b8)',
            fontSize: '0.78rem',
            fontWeight: activeTab === 'description' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <FileText size={14} />
          <span>Описание</span>
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
                        {comm.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form at bottom */}
            <form
              onSubmit={handleSendComment}
              style={{
                padding: '0.75rem',
                borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                background: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}
            >
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Написать в чат задачи..."
                style={{
                  flex: 1,
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                style={{
                  padding: '0.6rem 0.9rem',
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

            {/* Assignee Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                Ответственный исполнитель:
              </label>
              <select
                value={currentTask.assignee_id || ''}
                onChange={(e) => commitTaskUpdate({ assignee_id: e.target.value || null })}
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
                <option value="">Не назначен</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
                ))}
              </select>
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
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
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
                {departments.filter((d) => d.id !== currentTask.department_id).map((dept) => {
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

            {/* Network Folder Link */}
            {(currentTask.network_path || currentTask.project_path) && (
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
                  <HardDrive size={15} />
                  <span>Сетевая папка проекта</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#cbd5e1', wordBreak: 'break-all' }}>
                  {currentTask.network_path || currentTask.project_path}
                </div>
                <button
                  type="button"
                  onClick={handleOpenFolder}
                  disabled={folderOpening}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#0284c7',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: folderOpening ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <FolderOpen size={13} />
                  <span>{folderOpening ? 'Открываем...' : 'Открыть в проводнике Windows'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUBTASKS (ЧЕК-ЛИСТ С ИСПОЛНИТЕЛЯМИ) */}
        {activeTab === 'subtasks' && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                <span>Прогресс выполнения чек-листа:</span>
                <span>{completedSubtasks} из {subtasks.length} ({subtasksPercent}%)</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${subtasksPercent}%`, height: '100%', background: subtasksPercent === 100 ? '#10b981' : '#ff6600', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Subtasks List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {subtasks.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim, #64748b)', margin: '1rem 0', textAlign: 'center' }}>
                  Чек-лист пуст. Добавьте подзадачи ниже.
                </p>
              ) : (
                subtasks.map((item, idx) => {
                  const assignedMember = teamMembers.find((m) => m.id === item.assignee_id);
                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: '0.55rem 0.65rem',
                        borderRadius: '8px',
                        background: item.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: item.completed ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(item.completed)}
                          onChange={() => handleToggleSubtask(idx)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ff6600' }}
                        />
                        <span style={{
                          fontSize: '0.8rem',
                          color: item.completed ? 'var(--text-dim, #64748b)' : '#fff',
                          textDecoration: item.completed ? 'line-through' : 'none',
                          wordBreak: 'break-word'
                        }}>
                          {item.text}
                        </span>
                      </div>

                      {/* Subtask Assignee Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                          value={item.assignee_id || ''}
                          onChange={(e) => handleUpdateSubtaskAssignee(idx, e.target.value)}
                          title="Назначить исполнителя подзадачи"
                          style={{
                            padding: '2px 6px',
                            borderRadius: '5px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: '#162032',
                            color: assignedMember ? '#ff8800' : 'var(--text-dim, #64748b)',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            maxWidth: '120px'
                          }}
                        >
                          <option value="">Без исп.</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(idx)}
                          title="Удалить пункт"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim, #64748b)',
                            cursor: 'pointer',
                            padding: '3px',
                            borderRadius: '4px'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSubtask} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Новый пункт чек-листа..."
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={newSubtaskAssignee}
                  onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.6rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    background: '#1a2638',
                    color: '#fff',
                    fontSize: '0.74rem'
                  }}
                >
                  <option value="">Исполнитель подзадачи...</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ff6600, #ff8800)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: newSubtaskTitle.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} />
                  <span>Добавить</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: DESCRIPTION & ATTACHMENTS */}
        {activeTab === 'description' && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
              Техническое задание и описание:
            </label>
            <textarea
              rows={12}
              value={currentTask.description || ''}
              onChange={(e) => commitTaskUpdate({ description: e.target.value })}
              placeholder="Подробное ТЗ, перечень требований, контакты заказчика..."
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
        )}
      </div>
    </aside>
  );
}
