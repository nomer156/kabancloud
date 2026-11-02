import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  CornerDownRight, 
  ExternalLink, 
  AtSign, 
  Hash, 
  Search,
  Lock,
  Layers,
  Users,
  Crown
} from 'lucide-react';
import { DEPARTMENTS } from '../lib/constants';
import { fetchChatMessages, sendChatMessage, subscribeToRealtimeChanges } from '../lib/api';
import { playSound } from '../lib/sound';

export function ChatSidebar({
  currentUser,
  departments = DEPARTMENTS,
  tasks = [],
  teamMembers = [],
  onOpenTask,
  preQuotedTask = null,
  onClearPreQuotedTask,
  isOpen = true,
  onToggleOpen
}) {
  const isLevel10OrAdmin = (Number(currentUser?.role_level) || 0) >= 10 || currentUser?.full_name?.toLowerCase() === 'admin' || currentUser?.id === 'uf-admin-root';
  const [selectedChatDeptId, setSelectedChatDeptId] = useState(() => currentUser?.department_id || 'dept-design');
  const currentDeptId = isLevel10OrAdmin ? selectedChatDeptId : (currentUser?.department_id || 'dept-design');
  const deptMeta = currentDeptId === 'dept-all'
    ? { id: 'dept-all', name: 'Все отделы (Общий чат)', icon: '🌐', color: '#ff6600' }
    : (departments.find((d) => d.id === currentDeptId) || departments[0]);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [quotedTask, setQuotedTask] = useState(preQuotedTask);
  const [sending, setSending] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Autocomplete state: 'mention' | 'task' | null
  const [autocompleteType, setAutocompleteType] = useState(null);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync pre-quoted task when passed from TaskCard
  useEffect(() => {
    if (preQuotedTask) {
      setQuotedTask(preQuotedTask);
      if (!isOpen && onToggleOpen) {
        onToggleOpen(true);
      }
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [preQuotedTask, isOpen, onToggleOpen]);

  // Load chat messages for the current user's department
  const loadMessages = async () => {
    try {
      const data = await fetchChatMessages(currentDeptId);
      if (data && data.length > 0 && data[0]?.id === 'forbidden') {
        setIsAccessDenied(true);
        setMessages([]);
      } else {
        setIsAccessDenied(false);
        setMessages(data || []);
        setTimeout(scrollToBottom, 50);
      }
    } catch {
      setIsAccessDenied(false);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadMessages();
    }
  }, [currentDeptId, currentUser?.id]);

  useEffect(() => {
    const unsub = subscribeToRealtimeChanges((event) => {
      if (event.type === 'NEW_CHAT_MESSAGE') {
        const { departmentId, message } = event.payload || {};
        if ((departmentId === currentDeptId || currentDeptId === 'dept-all') && message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          setTimeout(scrollToBottom, 50);
        }
      }
    });
    return unsub;
  }, [currentDeptId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Autocomplete suggestions
  const mentionSuggestions = useMemo(() => {
    if (autocompleteType !== 'mention') return [];
    const q = autocompleteQuery.toLowerCase().trim();
    const deptMembers = currentDeptId === 'dept-all'
      ? teamMembers
      : teamMembers.filter((m) => m.department_id === currentDeptId);
    const list = [
      { id: '__all__', full_name: 'все', role: 'Оповестить всех', avatar_color: '#ff6600', initials: 'ВС' },
      ...deptMembers
    ];
    if (!q) return list.slice(0, 6);
    return list.filter((m) => m.full_name.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q)).slice(0, 6);
  }, [autocompleteType, autocompleteQuery, teamMembers, currentDeptId]);

  const taskSuggestions = useMemo(() => {
    if (autocompleteType !== 'task') return [];
    const q = autocompleteQuery.toLowerCase().trim();
    if (!q) return tasks.slice(0, 6);
    return tasks.filter((t) => {
      const displayIdMatch = t.display_id?.toLowerCase().includes(q);
      const titleMatch = t.title?.toLowerCase().includes(q);
      const erpMatch = t.erp_task_number?.toLowerCase().includes(q) || t.erp_project_id?.toLowerCase().includes(q);
      const prjMatch = t.project_code?.toLowerCase().includes(q);
      return displayIdMatch || titleMatch || erpMatch || prjMatch;
    }).slice(0, 6);
  }, [autocompleteType, autocompleteQuery, tasks]);

  // Handle text input and detect @ or #
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);

    const mentionMatch = textBefore.match(/@([a-zа-я0-9_-]*)$/i);
    const taskMatch = textBefore.match(/#([a-zа-я0-9_.-]*)$/i);

    if (mentionMatch) {
      setAutocompleteType('mention');
      setAutocompleteQuery(mentionMatch[1]);
      setSelectedIndex(0);
    } else if (taskMatch) {
      setAutocompleteType('task');
      setAutocompleteQuery(taskMatch[1]);
      setSelectedIndex(0);
    } else {
      setAutocompleteType(null);
      setAutocompleteQuery('');
    }
  };

  // Insert mention into input
  const insertMention = (member) => {
    const cursorPos = textareaRef.current?.selectionStart || inputText.length;
    const textBefore = inputText.slice(0, cursorPos);
    const textAfter = inputText.slice(cursorPos);
    const replacedBefore = textBefore.replace(/@([a-zа-я0-9_-]*)$/i, `@${member.full_name} `);
    setInputText(replacedBefore + textAfter);
    setAutocompleteType(null);
    playSound('click');
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPos = replacedBefore.length;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // Insert task tag into input
  const insertTaskTag = (task) => {
    const cursorPos = textareaRef.current?.selectionStart || inputText.length;
    const textBefore = inputText.slice(0, cursorPos);
    const textAfter = inputText.slice(cursorPos);
    const displayCode = task.display_id || task.id;
    const tag = `#[${displayCode}: ${task.title}] `;
    const replacedBefore = textBefore.replace(/#([a-zа-я0-9_.-]*)$/i, tag);
    setInputText(replacedBefore + textAfter);
    setAutocompleteType(null);
    playSound('click');
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPos = replacedBefore.length;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e) => {
    if (autocompleteType) {
      const list = autocompleteType === 'mention' ? mentionSuggestions : taskSuggestions;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, list.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + list.length) % Math.max(1, list.length));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (list.length > 0) {
          e.preventDefault();
          if (autocompleteType === 'mention') insertMention(list[selectedIndex] || list[0]);
          else insertTaskTag(list[selectedIndex] || list[0]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocompleteType(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim() && !quotedTask) return;
    if (sending) return;

    setSending(true);
    const textToSend = inputText.trim();
    const taskToSend = quotedTask ? {
      id: quotedTask.id,
      display_id: quotedTask.display_id || quotedTask.id,
      title: quotedTask.title,
      status: quotedTask.status,
      section: quotedTask.section,
      project_code: quotedTask.project_code,
      department_id: quotedTask.department_id
    } : null;

    setInputText('');
    setQuotedTask(null);
    if (onClearPreQuotedTask) onClearPreQuotedTask();
    setAutocompleteType(null);

    try {
      const newMsg = await sendChatMessage(currentDeptId, {
        text: textToSend,
        quoted_task: taskToSend
      });

      setMessages((prev) => [...prev, newMsg]);
      playSound('message');
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
    } finally {
      setSending(false);
    }
  };

  // Format message text with mentions & task tags
  const renderMessageContent = (text) => {
    if (!text) return null;

    // Pattern to match #[ID: Title] or #ID or @Name
    const parts = text.split(/(#\[[^\]]+\]|#[A-ZА-Я0-9_.-]+|@[A-ZА-Яa-zа-я0-9_.\s]+)/g);

    return parts.map((part, index) => {
      // 1. Task tag with title: #[СВН.25261: Название]
      const bracketMatch = part.match(/^#\[([^:]+):\s*(.+)\]$/);
      if (bracketMatch) {
        const idCode = bracketMatch[1].trim();
        const title = bracketMatch[2].trim();
        const matchedTask = tasks.find((t) => t.display_id === idCode || t.id === idCode);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onOpenTask && onOpenTask(matchedTask?.id || idCode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              margin: '0 2px',
              borderRadius: '5px',
              background: 'rgba(255, 102, 0, 0.14)',
              border: '1px solid rgba(255, 102, 0, 0.35)',
              color: 'var(--accent-orange, #ff6600)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              verticalAlign: 'middle',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={`Открыть задачу ${idCode} на доске`}
          >
            <span>🏷️ {idCode}</span>
            <span style={{ color: 'var(--text-main, #f8fafc)', fontWeight: 500 }}>{title}</span>
          </button>
        );
      }

      // 2. Simple task tag: #СВН.25261
      const simpleMatch = part.match(/^#([A-ZА-Я0-9_.-]+)$/);
      if (simpleMatch) {
        const idCode = simpleMatch[1];
        const matchedTask = tasks.find((t) => t.display_id === idCode || t.id === idCode);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onOpenTask && onOpenTask(matchedTask?.id || idCode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '1px 6px',
              margin: '0 2px',
              borderRadius: '4px',
              background: 'rgba(2, 132, 199, 0.14)',
              border: '1px solid rgba(2, 132, 199, 0.35)',
              color: '#38bdf8',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              verticalAlign: 'middle'
            }}
            title="Открыть задачу"
          >
            <span>📌 {idCode}</span>
          </button>
        );
      }

      // 3. User mention: @ФИО
      if (part.startsWith('@')) {
        const isAll = part === '@все';
        return (
          <span
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 5px',
              margin: '0 2px',
              borderRadius: '4px',
              background: isAll ? 'rgba(239, 68, 68, 0.16)' : 'rgba(255, 102, 0, 0.14)',
              color: isAll ? '#ef4444' : 'var(--accent-orange, #ff6600)',
              fontWeight: 700,
              fontSize: '0.74rem'
            }}
          >
            {part}
          </span>
        );
      }

      return part;
    });
  };

  // If collapsed: render slim right-edge toggle rail
  if (!isOpen) {
    return (
      <aside
        className="chat-sidebar-collapsed"
        style={{
          width: '38px',
          background: 'var(--bg-secondary, #141824)',
          borderLeft: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0.75rem 0',
          gap: '1rem',
          flexShrink: 0,
          zIndex: 40
        }}
      >
        <button
          type="button"
          onClick={() => onToggleOpen && onToggleOpen(true)}
          style={{
            background: 'rgba(255, 102, 0, 0.12)',
            border: '1px solid rgba(255, 102, 0, 0.3)',
            borderRadius: '8px',
            color: 'var(--accent-orange, #ff6600)',
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title={`Развернуть чат отдела «${deptMeta.name}»`}
        >
          <ChevronLeft size={16} />
        </button>

        <div
          onClick={() => onToggleOpen && onToggleOpen(true)}
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '0.76rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{deptMeta.icon} ЧАТ {deptMeta.name.toUpperCase()}</span>
          <MessageSquare size={13} style={{ color: deptMeta.color }} />
        </div>
      </aside>
    );
  }

  // Expanded Right Sidebar
  return (
    <aside
      className="chat-sidebar"
      style={{
        width: '340px',
        maxWidth: '360px',
        background: 'var(--bg-secondary, #141824)',
        borderLeft: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        position: 'relative',
        zIndex: 40
      }}
    >
      {/* 1. Header */}
      <div
        style={{
          padding: '0.75rem 0.9rem',
          background: 'var(--bg-tertiary, #1c2233)',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '7px',
              background: `${deptMeta.color}22`,
              color: deptMeta.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.95rem'
            }}
          >
            {deptMeta.icon}
          </div>

          <div style={{ minWidth: 0 }}>
            {isLevel10OrAdmin ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <select
                  value={currentDeptId}
                  onChange={(e) => {
                    setSelectedChatDeptId(e.target.value);
                    playSound('click');
                  }}
                  style={{
                    background: 'var(--bg-secondary, #0f172a)',
                    color: 'var(--text-main, #f8fafc)',
                    border: '1.5px solid rgba(255, 102, 0, 0.45)',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '190px'
                  }}
                  title="Администратор / Начальник: переключение чата любого отдела"
                >
                  <option value="dept-all">🌐 Общий (Все отделы)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.64rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Crown size={10} />
                  <span>Полный доступ ко всем чатам</span>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                    Чат: {deptMeta.name}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 700 }}>● онлайн</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim, #64748b)' }}>
                  Канал отдела
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleOpen && onToggleOpen(false)}
          className="btn-icon"
          style={{ width: 26, height: 26, padding: 0 }}
          title="Свернуть чат"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 2. Chat Feed */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        {isAccessDenied ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Lock size={32} style={{ color: '#ef4444', marginBottom: '0.6rem' }} />
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ef4444' }}>Доступ ограничен</div>
            <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
              Просмотр чатов других отделов запрещён политикой безопасности.
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-dim, #64748b)' }}>
            <MessageSquare size={32} style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)' }}>В чате пока тихо</div>
            <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>
              Обсуждайте рабочие вопросы, используйте <b>@коллега</b> для тега или <b>#задача</b> для ссылки на чертёж!
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUser?.id;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  gap: '3px'
                }}
              >
                {/* Author Name and Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: 'var(--text-dim, #64748b)', padding: '0 4px' }}>
                  {!isMe && (
                    <span style={{ fontWeight: 800, color: msg.user_color || 'var(--accent-orange)' }}>
                      {msg.user_name}
                    </span>
                  )}
                  <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    maxWidth: '92%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '12px',
                    background: isMe ? 'var(--accent-orange, #ff6600)' : 'var(--bg-card, #1c2233)',
                    color: isMe ? '#ffffff' : 'var(--text-main, #f8fafc)',
                    border: isMe ? 'none' : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    boxShadow: isMe ? '0 4px 12px rgba(255,102,0,0.25)' : '0 2px 6px rgba(0,0,0,0.2)',
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    wordBreak: 'break-word'
                  }}
                >
                  {/* Quoted Task Card (if present) */}
                  {msg.quoted_task && (
                    <div
                      onClick={() => onOpenTask && onOpenTask(msg.quoted_task.id)}
                      style={{
                        marginBottom: '0.45rem',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '8px',
                        background: isMe ? 'rgba(0,0,0,0.2)' : 'rgba(255,102,0,0.1)',
                        borderLeft: `3px solid ${isMe ? '#ffffff' : 'var(--accent-orange)'}`,
                        cursor: 'pointer'
                      }}
                      title="Кликните, чтобы открыть задачу"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', fontSize: '0.68rem', opacity: 0.9 }}>
                        <span style={{ fontWeight: 800 }}>
                          🏷️ {msg.quoted_task.display_id || msg.quoted_task.id}
                        </span>
                        <ExternalLink size={11} />
                      </div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.quoted_task.title}
                      </div>
                    </div>
                  )}

                  {/* Message Text with interactive tags */}
                  <div>{renderMessageContent(msg.text)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Pre-Quoted Task Banner (above input) */}
      {quotedTask && (
        <div
          style={{
            padding: '0.45rem 0.75rem',
            background: 'var(--bg-tertiary, #1c2233)',
            borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <CornerDownRight size={14} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
            <div style={{ minWidth: 0, fontSize: '0.74rem' }}>
              <span style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>
                {quotedTask.display_id || quotedTask.id}:
              </span>{' '}
              <span style={{ color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {quotedTask.title}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setQuotedTask(null);
              if (onClearPreQuotedTask) onClearPreQuotedTask();
            }}
            className="btn-icon"
            style={{ width: 20, height: 20, padding: 0 }}
            title="Открепить задачу"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 4. Autocomplete Popup (@mention or #task) */}
      {autocompleteType && (
        <div
          style={{
            position: 'absolute',
            bottom: '75px',
            left: '10px',
            right: '10px',
            background: 'var(--bg-modal, #1e293b)',
            border: '1px solid var(--border-subtle, #334155)',
            borderRadius: '10px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '4px',
            zIndex: 100
          }}
        >
          <div style={{ padding: '4px 8px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {autocompleteType === 'mention' ? '👥 Упомянуть коллегу (@):' : '🏷️ Прикрепить задачу (#):'}
          </div>

          {autocompleteType === 'mention' && (
            mentionSuggestions.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: idx === selectedIndex ? 'rgba(255,102,0,0.15)' : 'transparent',
                  border: 'none',
                  color: 'var(--text-main, #f8fafc)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: m.avatar_color || '#ff6600', color: '#fff', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.initials}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{m.full_name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>• {m.role}</div>
              </button>
            ))
          )}

          {autocompleteType === 'task' && (
            taskSuggestions.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => insertTaskTag(t)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: idx === selectedIndex ? 'rgba(255,102,0,0.15)' : 'transparent',
                  border: 'none',
                  color: 'var(--text-main, #f8fafc)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
                    🏷️ {t.display_id || t.id}
                  </span>{' '}
                  <span style={{ fontSize: '0.76rem' }}>{t.title}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* 5. Input Bar */}
      <div
        style={{
          padding: '0.65rem 0.85rem',
          background: 'var(--bg-tertiary, #1c2233)',
          borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder="Напишите в чат... (@ для коллег, # для задач)"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              background: 'var(--bg-secondary, #0f172a)',
              border: '1px solid var(--border-subtle, #334155)',
              borderRadius: '8px',
              color: 'var(--text-main, #f8fafc)',
              fontSize: '0.82rem',
              padding: '0.5rem 2.4rem 0.5rem 0.65rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputText.trim() && !quotedTask}
            style={{
              position: 'absolute',
              right: '6px',
              bottom: '9px',
              width: 28,
              height: 28,
              borderRadius: '6px',
              border: 'none',
              background: (inputText.trim() || quotedTask) ? 'var(--accent-orange, #ff6600)' : 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (inputText.trim() || quotedTask) ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }}
            title="Отправить (Enter)"
          >
            <Send size={13} />
          </button>
        </div>

        {/* Quick Tag Helper Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          <button
            type="button"
            onClick={() => {
              setInputText((prev) => prev + '@');
              setAutocompleteType('mention');
              textareaRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              cursor: 'pointer'
            }}
          >
            <AtSign size={12} />
            <span>Упомянуть</span>
          </button>

          <span>•</span>

          <button
            type="button"
            onClick={() => {
              setInputText((prev) => prev + '#');
              setAutocompleteType('task');
              textareaRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              cursor: 'pointer'
            }}
          >
            <Hash size={12} />
            <span>Привязать задачу</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
