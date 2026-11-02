import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Paperclip, 
  ExternalLink, 
  Layers, 
  CornerDownRight, 
  Sparkles,
  Search
} from 'lucide-react';
import { DEPARTMENTS } from '../lib/constants';
import { fetchChatMessages, sendChatMessage } from '../lib/api';
import { playSound } from '../lib/sound';

export function DepartmentChatModal({
  isOpen,
  onClose,
  currentUser,
  activeDepartmentId = 'dept-design',
  departments = DEPARTMENTS,
  tasks = [],
  onOpenTask,
  preQuotedTask = null
}) {
  const [currentDept, setCurrentDept] = useState(activeDepartmentId === 'all' ? 'dept-design' : activeDepartmentId);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [quotedTask, setQuotedTask] = useState(preQuotedTask);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeDepartmentId && activeDepartmentId !== 'all') {
      setCurrentDept(activeDepartmentId);
    }
  }, [activeDepartmentId]);

  useEffect(() => {
    if (preQuotedTask) {
      setQuotedTask(preQuotedTask);
    }
  }, [preQuotedTask]);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, currentDept]);

  const loadMessages = async () => {
    try {
      const data = await fetchChatMessages(currentDept);
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Ошибка загрузки сообщений чата:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !quotedTask) return;

    setSending(true);
    const textToSend = inputText.trim();
    const taskToQuote = quotedTask;

    setInputText('');
    setQuotedTask(null);

    try {
      const sent = await sendChatMessage(currentDept, {
        text: textToSend,
        quoted_task: taskToQuote ? {
          id: taskToQuote.id,
          title: taskToQuote.title,
          department_id: taskToQuote.department_id,
          status: taskToQuote.status,
          priority: taskToQuote.priority
        } : null
      });

      setMessages((prev) => [...prev, sent]);
      playSound('message');
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredTasksForPicker = tasks.filter((t) => {
    if (!taskSearch.trim()) return true;
    const q = taskSearch.toLowerCase().trim();
    return t.title?.toLowerCase().includes(q) || t.project_code?.toLowerCase().includes(q);
  }).slice(0, 15);

  const currentDeptMeta = departments.find((d) => d.id === currentDept) || departments[0];

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 1050,
        backgroundColor: 'rgba(10, 15, 29, 0.85)',
        backdropFilter: 'blur(8px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '720px',
          width: '94vw',
          height: '84vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 'var(--radius-xl, 20px)',
          background: 'var(--bg-modal, #141824)',
          border: '1px solid var(--border-subtle, #334155)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden'
        }}
      >
        {/* Chat Top Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-secondary, #0f172a)',
            borderBottom: '1px solid var(--border-subtle, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: `${currentDeptMeta.color}22`,
                border: `1.5px solid ${currentDeptMeta.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              {currentDeptMeta.icon}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Чат: {currentDeptMeta.name}</span>
                <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: `${currentDeptMeta.color}33`, color: currentDeptMeta.color, fontWeight: 700 }}>
                  Корпоративный чат
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)' }}>
                {currentDeptMeta.desc}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            style={{ position: 'static' }}
            title="Закрыть чат"
          >
            <X size={18} />
          </button>
        </div>

        {/* Department Switcher Tabs in Chat */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            padding: '0.5rem 1.25rem',
            background: 'var(--bg-tertiary, #1c2233)',
            borderBottom: '1px solid var(--border-subtle, #334155)',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {departments.map((dept) => {
            const isSelected = currentDept === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => {
                  setCurrentDept(dept.id);
                  playSound('click');
                }}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border: isSelected ? `1.5px solid ${dept.color}` : '1px solid var(--border-subtle, #334155)',
                  background: isSelected ? `${dept.color}22` : 'var(--bg-secondary, #0f172a)',
                  color: isSelected ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{dept.icon}</span>
                <span>{dept.name}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'var(--bg-primary, #0b1120)'
          }}
        >
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim, #64748b)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{currentDeptMeta.icon}</div>
              <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-main, #f8fafc)' }}>
                В чате отдела «{currentDeptMeta.name}» пока нет сообщений
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                Обсуждайте рабочие вопросы и цитируйте задачи прямо в сообщениях!
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '0.65rem',
                  alignItems: 'flex-start',
                  maxWidth: '85%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  flexDirection: isMe ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: msg.user_color || '#ff6600',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    flexShrink: 0
                  }}
                  title={`${msg.user_name} (${msg.user_role || 'Сотрудник'})`}
                >
                  {msg.user_initials || 'СО'}
                </div>

                {/* Message Body */}
                <div
                  style={{
                    background: isMe ? 'rgba(255, 102, 0, 0.16)' : 'var(--bg-secondary, #141824)',
                    border: isMe ? '1px solid rgba(255, 102, 0, 0.35)' : '1px solid var(--border-subtle, #334155)',
                    borderRadius: 'var(--radius-md, 12px)',
                    padding: '0.65rem 0.85rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
                      {msg.user_name}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim, #64748b)' }}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {/* Quoted Task Card in Message (YouGile Quoting) */}
                  {msg.quoted_task && (
                    <div
                      onClick={() => {
                        if (onOpenTask) onOpenTask(msg.quoted_task.id);
                      }}
                      style={{
                        margin: '0.35rem 0 0.55rem 0',
                        padding: '0.5rem 0.65rem',
                        background: 'rgba(0,0,0,0.3)',
                        borderLeft: '3px solid var(--accent-orange, #ff6600)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                      title="Кликните чтобы открыть задачу"
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-orange, #ff6600)', fontWeight: 700, textTransform: 'uppercase' }}>
                          📌 Цитируемая задача
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.quoted_task.title}
                        </div>
                      </div>
                      <ExternalLink size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                    </div>
                  )}

                  <div style={{ fontSize: '0.84rem', color: 'var(--text-main, #f8fafc)', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Task Quoting Preview in Input */}
        {quotedTask && (
          <div
            style={{
              padding: '0.45rem 1rem',
              background: 'rgba(255,102,0,0.1)',
              borderTop: '1px solid var(--accent-orange, #ff6600)44',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <CornerDownRight size={13} style={{ color: 'var(--accent-orange, #ff6600)', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: 'var(--accent-orange, #ff6600)' }}>Цитата задачи:</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main, #f8fafc)' }}>
                {quotedTask.title}
              </span>
            </div>
            <button
              type="button"
              className="btn-icon"
              style={{ width: 20, height: 20, padding: 0 }}
              onClick={() => setQuotedTask(null)}
              title="Удалить цитату"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Task Picker Dropdown */}
        {showTaskPicker && (
          <div
            style={{
              padding: '0.75rem',
              background: 'var(--bg-secondary, #0f172a)',
              borderTop: '1px solid var(--border-subtle, #334155)',
              maxHeight: '200px',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
              <Search size={14} style={{ color: 'var(--text-dim, #64748b)' }} />
              <input
                type="text"
                placeholder="Поиск задачи для цитирования..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="form-input"
                style={{ width: '100%', fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
                autoFocus
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowTaskPicker(false)}
                style={{ width: 22, height: 22, padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredTasksForPicker.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setQuotedTask(t);
                    setShowTaskPicker(false);
                    playSound('click');
                  }}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    background: 'var(--bg-tertiary, #1c2233)',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,102,0,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary, #1c2233)'; }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim, #64748b)', flexShrink: 0 }}>
                    {t.project_code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary, #0f172a)',
            borderTop: '1px solid var(--border-subtle, #334155)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}
        >
          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowTaskPicker(!showTaskPicker)}
            title="Прикрепить цитату задачи к сообщению"
            style={{ width: 34, height: 34, color: quotedTask ? 'var(--accent-orange, #ff6600)' : 'var(--text-muted, #94a3b8)' }}
          >
            <Paperclip size={17} />
          </button>

          <input
            type="text"
            placeholder={`Сообщение в отдел «${currentDeptMeta.name}»... (Enter для отправки)`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="form-input"
            style={{ flex: 1, fontSize: '0.84rem' }}
          />

          <button
            type="submit"
            disabled={sending || (!inputText.trim() && !quotedTask)}
            className="btn btn-primary"
            style={{ padding: '0.55rem 0.85rem', gap: '5px' }}
          >
            <Send size={15} />
            <span>Отправить</span>
          </button>
        </form>
      </div>
    </div>
  );
}
