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
  Crown,
  ArrowLeft,
  User,
  CheckCheck
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
  // Main tabs: 'channels' | 'direct' (Личные сообщения)
  const [chatTab, setChatTab] = useState('channels');
  const [selectedChatDeptId, setSelectedChatDeptId] = useState(() => currentUser?.department_id || 'dept-all');
  const [activeDmUser, setActiveDmUser] = useState(null);
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  // Determine active conversation thread ID
  const activeThreadId = useMemo(() => {
    if (chatTab === 'direct' && activeDmUser && currentUser) {
      return `dm-${[currentUser.id, activeDmUser.id].sort().join('-')}`;
    }
    return selectedChatDeptId || 'dept-all';
  }, [chatTab, activeDmUser, currentUser, selectedChatDeptId]);

  // Active channel metadata
  const deptMeta = useMemo(() => {
    if (selectedChatDeptId === 'dept-all') {
      return { id: 'dept-all', name: 'Все отделы (Общий чат)', icon: '🌐', color: '#ff6600' };
    }
    return departments.find((d) => d.id === selectedChatDeptId) || departments[0];
  }, [selectedChatDeptId, departments]);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [quotedTask, setQuotedTask] = useState(preQuotedTask);
  const [sending, setSending] = useState(false);

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

  // Load chat messages for the active thread
  const loadMessages = async () => {
    if (!activeThreadId) return;
    try {
      const data = await fetchChatMessages(activeThreadId);
      setMessages(data || []);
      setTimeout(scrollToBottom, 50);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadMessages();
    }
  }, [activeThreadId, currentUser?.id]);

  useEffect(() => {
    const unsub = subscribeToRealtimeChanges((event) => {
      if (event.type === 'NEW_CHAT_MESSAGE') {
        const { departmentId, message } = event.payload || {};
        if (departmentId === activeThreadId && message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          setTimeout(scrollToBottom, 50);
        }
      }
    });
    return unsub;
  }, [activeThreadId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Autocomplete suggestions: ALL Moscow branch employees across all departments!
  const mentionSuggestions = useMemo(() => {
    if (autocompleteType !== 'mention') return [];
    const q = autocompleteQuery.toLowerCase().trim();
    const list = [
      { id: '__all__', full_name: 'все', role: 'Оповестить всех сотрудников', avatar_color: '#ef4444', initials: 'ВС', dept_name: 'Все отделы' },
      ...teamMembers.map(m => {
        const d = departments.find(dep => dep.id === m.department_id);
        return {
          ...m,
          dept_name: d?.name || 'Отдел'
        };
      })
    ];
    if (!q) return list.slice(0, 8);
    return list
      .filter((m) => m.full_name?.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q) || m.dept_name?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [autocompleteType, autocompleteQuery, teamMembers, departments]);

  // Autocomplete task suggestions
  const taskSuggestions = useMemo(() => {
    if (autocompleteType !== 'task') return [];
    const q = autocompleteQuery.toLowerCase().trim();
    if (!q) return tasks.slice(0, 8);
    return tasks
      .filter((t) => {
        const titleMatch = t.title?.toLowerCase().includes(q);
        const idMatch = t.display_id?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q);
        const projMatch = t.project_code?.toLowerCase().includes(q);
        return titleMatch || idMatch || projMatch;
      })
      .slice(0, 8);
  }, [autocompleteType, autocompleteQuery, tasks]);

  // Colleague list for Direct Messages (ЛС)
  const filteredDMMembers = useMemo(() => {
    const others = teamMembers.filter((m) => m.id !== currentUser?.id);
    if (!dmSearchQuery.trim()) return others;
    const q = dmSearchQuery.toLowerCase().trim();
    return others.filter((m) => {
      const nameMatch = m.full_name?.toLowerCase().includes(q);
      const roleMatch = m.role?.toLowerCase().includes(q);
      const specMatch = m.specialty?.toLowerCase().includes(q);
      const pcMatch = m.workstation_id?.toLowerCase().includes(q);
      const d = departments.find(dep => dep.id === m.department_id);
      const deptMatch = d?.name?.toLowerCase().includes(q);
      return nameMatch || roleMatch || specMatch || pcMatch || deptMatch;
    });
  }, [teamMembers, currentUser, dmSearchQuery, departments]);

  // Handle textarea input and trigger autocomplete
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);

    const mentionMatch = textBeforeCursor.match(/@([a-zA-Zа-яА-Я0-9_.-]*)$/);
    if (mentionMatch) {
      setAutocompleteType('mention');
      setAutocompleteQuery(mentionMatch[1]);
      setSelectedIndex(0);
      return;
    }

    const taskMatch = textBeforeCursor.match(/#([a-zA-Zа-яА-Я0-9_.-]*)$/);
    if (taskMatch) {
      setAutocompleteType('task');
      setAutocompleteQuery(taskMatch[1]);
      setSelectedIndex(0);
      return;
    }

    setAutocompleteType(null);
  };

  const insertMention = (member) => {
    const cursorPos = textareaRef.current?.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPos);
    const textAfterCursor = inputText.slice(cursorPos);

    const newBefore = textBeforeCursor.replace(/@([a-zA-Zа-яА-Я0-9_.-]*)$/, `@${member.full_name} `);
    setInputText(newBefore + textAfterCursor);
    setAutocompleteType(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = newBefore.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 10);
  };

  const insertTaskTag = (task) => {
    const cursorPos = textareaRef.current?.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPos);
    const textAfterCursor = inputText.slice(cursorPos);

    const displayTag = task.display_id || task.id;
    const newBefore = textBeforeCursor.replace(/#([a-zA-Zа-яА-Я0-9_.-]*)$/, `#[${displayTag}: ${task.title}] `);
    setInputText(newBefore + textAfterCursor);
    setAutocompleteType(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = newBefore.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 10);
  };

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
      const newMsg = await sendChatMessage(activeThreadId, {
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

  // Middle-click navigation helper
  const handleMiddleClickTask = (e, targetId) => {
    if (e.button === 1) { // Middle click / mouse wheel
      e.preventDefault();
      e.stopPropagation();
      window.open(`/#task/${encodeURIComponent(targetId)}`, '_blank');
    }
  };

  // Format message text with interactive mentions & task tags
  const renderMessageContent = (text) => {
    if (!text) return null;

    const parts = text.split(/(#\[[^\]]+\]|#[A-ZА-Я0-9_.-]+|@[A-ZА-Яa-zа-я0-9_.\s]+)/g);

    return parts.map((part, index) => {
      // 1. Task tag with title: #[СВН.25261: Название]
      const bracketMatch = part.match(/^#\[([^:]+):\s*(.+)\]$/);
      if (bracketMatch) {
        const idCode = bracketMatch[1].trim();
        const title = bracketMatch[2].trim();
        const cleanCode = idCode.toLowerCase();
        const matchedTask = tasks.find(
          (t) => String(t.display_id || '').toLowerCase().trim() === cleanCode ||
                 String(t.id || '').toLowerCase().trim() === cleanCode
        );
        const resolvedId = matchedTask?.id || idCode;

        return (
          <span
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.ctrlKey || e.metaKey) {
                window.open(`/#task/${encodeURIComponent(resolvedId)}`, '_blank');
              } else {
                onOpenTask && onOpenTask(resolvedId);
              }
            }}
            onAuxClick={(e) => handleMiddleClickTask(e, resolvedId)}
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
              maxWidth: '260px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: 'none'
            }}
            title={`Открыть задачу ${idCode} (Колёсиком мыши — в новой вкладке)`}
          >
            <span>🏷️ {idCode}</span>
            <span style={{ color: 'var(--text-main, #f8fafc)', fontWeight: 500 }}>{title}</span>
          </span>
        );
      }

      // 2. Simple task tag: #СВН.25261 or #task-uf-...
      const simpleMatch = part.match(/^#([A-ZА-Я0-9_.-]+)$/);
      if (simpleMatch) {
        const idCode = simpleMatch[1];
        const cleanCode = idCode.toLowerCase().trim();
        const matchedTask = tasks.find(
          (t) => String(t.display_id || '').toLowerCase().trim() === cleanCode ||
                 String(t.id || '').toLowerCase().trim() === cleanCode
        );
        const resolvedId = matchedTask?.id || idCode;

        return (
          <span
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.ctrlKey || e.metaKey) {
                window.open(`/#task/${encodeURIComponent(resolvedId)}`, '_blank');
              } else {
                onOpenTask && onOpenTask(resolvedId);
              }
            }}
            onAuxClick={(e) => handleMiddleClickTask(e, resolvedId)}
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
              verticalAlign: 'middle',
              textDecoration: 'none'
            }}
            title={`Открыть задачу ${idCode} (Колёсиком мыши — в новой вкладке)`}
          >
            <span>📌 {idCode}</span>
          </span>
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
          zIndex: 30,
          height: '100%'
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
          title="Развернуть панель чата и ЛС"
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
          <span>ЧАТ И ЛС ({teamMembers.length})</span>
          <MessageSquare size={13} style={{ color: 'var(--accent-orange)' }} />
        </div>
      </aside>
    );
  }

  // Expanded Right Sidebar (2x wider: min(620px, 45vw))
  return (
    <aside
      className="chat-sidebar"
      style={{
        width: 'min(620px, 45vw)',
        minWidth: '440px',
        maxWidth: '680px',
        background: 'var(--bg-secondary, #141824)',
        borderLeft: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        position: 'relative',
        zIndex: 30
      }}
    >
      {/* 1. Top Mode Switcher Bar: [ Каналы отделов ] | [ ЛС • Личные сообщения ] */}
      <div
        style={{
          padding: '0.65rem 0.85rem',
          background: 'var(--bg-tertiary, #1c2233)',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary, #0f172a)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => {
              setChatTab('channels');
              playSound('click');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: chatTab === 'channels' ? 'var(--accent-orange)' : 'transparent',
              color: chatTab === 'channels' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Layers size={13} />
            <span>Каналы отделов</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChatTab('direct');
              playSound('click');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: chatTab === 'direct' ? 'var(--accent-orange)' : 'transparent',
              color: chatTab === 'direct' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Users size={13} />
            <span>ЛС • Личные ({teamMembers.filter(m => m.id !== currentUser?.id).length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onToggleOpen && onToggleOpen(false)}
          className="btn-icon"
          style={{ width: 26, height: 26, padding: 0 }}
          title="Свернуть панель чата"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 2. Sub-Header: Depends on Active Mode */}
      {chatTab === 'channels' ? (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-secondary, #141824)',
            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                fontSize: '0.95rem',
                flexShrink: 0
              }}
            >
              {deptMeta.icon}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={selectedChatDeptId}
                  onChange={(e) => {
                    setSelectedChatDeptId(e.target.value);
                    playSound('click');
                  }}
                  style={{
                    background: 'var(--bg-tertiary, #1c2233)',
                    color: 'var(--text-main, #f8fafc)',
                    border: '1px solid rgba(255, 102, 0, 0.45)',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="dept-all">🌐 Все отделы (Общий чат компании)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.64rem', color: '#10b981', fontWeight: 700 }}>● онлайн</span>
              </div>
            </div>
          </div>

          <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            Канал филиала
          </span>
        </div>
      ) : activeDmUser ? (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-secondary, #141824)',
            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setActiveDmUser(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                padding: '3px 7px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Назад к списку коллег"
            >
              <ArrowLeft size={13} />
              <span>Все диалоги</span>
            </button>

            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: activeDmUser.avatar_color || '#ff6600',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.74rem',
                flexShrink: 0
              }}
            >
              {activeDmUser.initials || 'УФ'}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeDmUser.full_name}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeDmUser.role || 'Инженер'}
              </div>
            </div>
          </div>

          {activeDmUser.workstation_id && (
            <span style={{ fontSize: '0.64rem', padding: '2px 5px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
              💻 {activeDmUser.workstation_id}
            </span>
          )}
        </div>
      ) : null}

      {/* 3. Main Body: Either Colleague Directory (when in direct mode with no user selected) OR Message Feed */}
      {chatTab === 'direct' && !activeDmUser ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Colleague Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Поиск коллеги по имени, должности, специальности..."
              value={dmSearchQuery}
              onChange={(e) => setDmSearchQuery(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '2.2rem',
                paddingTop: '0.45rem',
                paddingBottom: '0.45rem',
                fontSize: '0.8rem',
                background: 'var(--bg-tertiary, #0f172a)'
              }}
            />
          </div>

          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Сотрудники филиала (Москва) • Выберите для начала диалога:
          </div>

          {/* Colleague List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {filteredDMMembers.map((member) => {
              const dept = departments.find((d) => d.id === member.department_id) || departments[0];

              return (
                <div
                  key={member.id}
                  onClick={() => {
                    setActiveDmUser(member);
                    playSound('click');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary, #1c2233)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = member.avatar_color || '#ff6600';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: member.avatar_color || '#ff6600',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        flexShrink: 0
                      }}
                    >
                      {member.initials || 'УФ'}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.full_name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.role || 'Инженер'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.64rem', padding: '1px 5px', borderRadius: '4px', background: `${dept.color}22`, color: dept.color, fontWeight: 700 }}>
                      {dept.icon} {dept.name}
                    </span>
                    {member.workstation_id && (
                      <span style={{ fontSize: '0.62rem', padding: '1px 4px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                        {member.workstation_id}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredDMMembers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                Коллег по запросу «{dmSearchQuery}» не найдено
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Chat Feed (for active channel or active DM) */
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
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-dim, #64748b)' }}>
              <MessageSquare size={32} style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)' }}>В чате пока тихо</div>
              <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>
                {chatTab === 'direct' 
                  ? `Напишите личное сообщение коллеге ${activeDmUser?.full_name}!`
                  : `Обсуждайте рабочие вопросы, используйте @коллега для тега или #задача для ссылки на чертёж!`}
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
                    <span style={{ fontWeight: 800, color: isMe ? 'var(--accent-orange)' : (msg.user_color || 'var(--accent-orange)') }}>
                      {isMe ? 'Вы' : msg.user_name}
                    </span>
                    <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    style={{
                      maxWidth: '88%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                      background: isMe 
                        ? 'linear-gradient(135deg, rgba(255, 102, 0, 0.22) 0%, rgba(255, 102, 0, 0.12) 100%)' 
                        : 'var(--bg-card, #1c2233)',
                      color: 'var(--text-main, #f8fafc)',
                      border: isMe 
                        ? '1px solid rgba(255, 102, 0, 0.38)' 
                        : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                      boxShadow: isMe 
                        ? '0 3px 10px rgba(255, 102, 0, 0.15)' 
                        : '0 2px 6px rgba(0,0,0,0.25)',
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      wordBreak: 'break-word'
                    }}
                  >
                    {/* Quoted Task Card (if present) with middle click support */}
                    {msg.quoted_task && (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.ctrlKey || e.metaKey) {
                            window.open(`/#task/${encodeURIComponent(msg.quoted_task.id)}`, '_blank');
                          } else {
                            onOpenTask && onOpenTask(msg.quoted_task.id);
                          }
                        }}
                        onAuxClick={(e) => handleMiddleClickTask(e, msg.quoted_task.id)}
                        style={{
                          display: 'block',
                          color: 'inherit',
                          marginBottom: '0.45rem',
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: isMe ? 'rgba(0,0,0,0.25)' : 'rgba(255,102,0,0.1)',
                          borderLeft: '3px solid var(--accent-orange)',
                          cursor: 'pointer'
                        }}
                        title="Открыть задачу (Колёсиком мыши — в новой вкладке)"
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
                      </span>
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
      )}

      {/* 4. Pre-Quoted Task Banner (if task shared from card) */}
      {quotedTask && (chatTab === 'channels' || activeDmUser) && (
        <div
          style={{
            padding: '0.45rem 0.75rem',
            background: 'rgba(255, 102, 0, 0.12)',
            borderTop: '1px solid rgba(255, 102, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, fontSize: '0.74rem' }}>
            <CornerDownRight size={14} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, color: 'var(--accent-orange)', flexShrink: 0 }}>
              {quotedTask.display_id || quotedTask.id}:
            </span>
            <span style={{ color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {quotedTask.title}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setQuotedTask(null);
              if (onClearPreQuotedTask) onClearPreQuotedTask();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 0
            }}
            title="Открепить задачу"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 5. Autocomplete Dropdown Popup */}
      {autocompleteType && (chatTab === 'channels' || activeDmUser) && (
        <div
          style={{
            position: 'absolute',
            bottom: '100px',
            left: '12px',
            right: '12px',
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'var(--bg-tertiary, #1c2233)',
            border: '1.5px solid var(--accent-orange, #ff6600)',
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            zIndex: 60,
            padding: '4px'
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
            {autocompleteType === 'mention' ? '👥 Упомянуть коллегу (Московский филиал):' : '🏷️ Привязать задачу:'}
          </div>

          {autocompleteType === 'mention' ? (
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
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: selectedIndex === idx ? 'rgba(255, 102, 0, 0.2)' : 'transparent',
                  border: 'none',
                  color: 'var(--text-main, #f8fafc)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: m.avatar_color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  {m.initials}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {m.full_name}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                    {m.role} {m.dept_name ? `• ${m.dept_name}` : ''}
                  </div>
                </div>
              </button>
            ))
          ) : (
            taskSuggestions.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => insertTaskTag(t)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: selectedIndex === idx ? 'rgba(255, 102, 0, 0.2)' : 'transparent',
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

      {/* 6. Input Bar (Only visible when active in a channel or active in a DM) */}
      {(chatTab === 'channels' || activeDmUser) && (
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
              placeholder={chatTab === 'direct' ? `Написать в ЛС ${activeDmUser?.full_name}... (@ для коллег, # для задач)` : `Написать в чат... (@ для коллег, # для задач)`}
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
      )}
    </aside>
  );
}
