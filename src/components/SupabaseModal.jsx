import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle,
  Code
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  setCustomSupabaseCredentials,
  resetDemoData 
} from '../lib/supabase';
import { playSound } from '../lib/sound';

export function SupabaseModal({ isOpen, onClose, onConfigChanged }) {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [key, setKey] = useState(currentCreds.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setCustomSupabaseCredentials(url, key);
    playSound('success');
    setStatusMessage('Настройки сохранены! Перезагрузка данных...');
    setTimeout(() => {
      onConfigChanged();
      onClose();
    }, 600);
  };

  const handleResetDemo = () => {
    if (window.confirm('Сбросить локальные задачи к начальному демонстрационному списку?')) {
      resetDemoData();
      playSound('success');
      onConfigChanged();
      onClose();
    }
  };

  const handleCopySql = () => {
    const sqlScript = `-- Kaban Pro Schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  initials TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  project_code TEXT,
  section TEXT NOT NULL DEFAULT 'АР',
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  network_link TEXT,
  description TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;`;

    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    playSound('click');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={20} style={{ color: 'var(--accent-blue)' }} />
            <span>Подключение Supabase (Realtime БД)</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          {/* Status info banner */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: currentCreds.isConfigured
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${
                currentCreds.isConfigured
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(245, 158, 11, 0.3)'
              }`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              {currentCreds.isConfigured ? (
                <>
                  <Check size={18} style={{ color: '#10b981' }} />
                  <span style={{ color: '#10b981' }}>Подключено к Supabase</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                  <span style={{ color: '#f59e0b' }}>Автономный режим (Demo LocalStorage)</span>
                </>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {currentCreds.isConfigured
                ? 'Задачи синхронизируются в реальном времени между всеми участниками отдела.'
                : 'Приложение сейчас работает с локальной базой данных. Чтобы подключить онлайн-базу для всех 6 проектировщиков, введите ваши URL и anon_key от Supabase.'}
            </p>
          </div>

          {/* Credentials Inputs */}
          <div className="form-group">
            <label className="form-label">Project URL (Supabase API URL)</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Anon / Public API Key</label>
            <input
              type="password"
              className="form-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>

          {statusMessage && (
            <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
              {statusMessage}
            </div>
          )}

          {/* SQL Setup Instruction */}
          <div
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                SQL-структура таблиц для Supabase:
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                onClick={handleCopySql}
              >
                {copiedSql ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                <span>{copiedSql ? 'Скопировано!' : 'Скопировать SQL'}</span>
              </button>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              В корне проекта также сохранен файл <code>supabase_schema.sql</code>. Вставьте его в
              Supabase SQL Editor и нажмите <b>Run</b> для автоматического создания таблиц и 6 инженеров.
            </p>
          </div>

          {/* Footer Controls */}
          <div className="modal-footer" style={{ padding: '0.75rem 0 0 0', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginRight: 'auto', fontSize: '0.75rem' }}
              onClick={handleResetDemo}
            >
              <RefreshCw size={13} />
              <span>Сбросить демо-задачи</span>
            </button>

            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Закрыть
            </button>

            <button type="submit" className="btn btn-primary">
              Сохранить ключи
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
