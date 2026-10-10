import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wifi, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  Monitor, 
  Server,
  Lock
} from 'lucide-react';
import { fetchServerInfo, fetchAllTasks, fetchProjectsList, fetchTeamMembers } from '../lib/api';
import { playSound } from '../lib/sound';

export function NetworkModal({ isOpen, onClose }) {
  const [serverInfo, setServerInfo] = useState({ hostname: '...', ips: [], port: 3000, status: 'checking' });
  const [copiedIp, setCopiedIp] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchServerInfo().then((info) => {
        setServerInfo(info);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentHost = window.location.hostname;
  const currentPort = window.location.port || '3000';
  const defaultUrl = `http://${currentHost === 'localhost' ? (serverInfo.ips[0] || 'localhost') : currentHost}:${currentPort}`;

  const handleCopy = (url, key) => {
    navigator.clipboard.writeText(url);
    setCopiedIp(key);
    playSound('click');
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleExportBackup = async () => {
    const [tasks, members, projects] = await Promise.all([
      fetchAllTasks(),
      fetchTeamMembers(),
      fetchProjectsList()
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      company: 'УФАНЕТ',
      projects,
      members,
      tasks
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ufanet_kaban_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 102, 0, 0.2)' }}>
          <div className="modal-title">
            <Wifi size={20} style={{ color: 'var(--accent-orange)' }} />
            <span>Сеть отдела Уфанет (Доступ для коллег)</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Status banner */}
          <div
            style={{
              padding: '0.9rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 102, 0, 0.08)',
              border: '1px solid rgba(255, 102, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent-orange)' }}>
              <Server size={18} />
              <span>Автономный сервер в локальной сети Уфанет</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Все данные хранятся на этом рабочем компьютере в папке <code>./data/ufanet_db.json</code>.
              Внешний интернет и сторонние облака не используются — полная конфиденциальность.
            </p>
          </div>

          {/* Links for colleagues */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Ссылки для отправки 5 коллегам из отдела:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {serverInfo.ips.length > 0 ? (
                serverInfo.ips.map((ip, idx) => {
                  const fullUrl = `http://${ip}:${serverInfo.port || 3000}`;
                  const isCopied = copiedIp === `ip-${idx}`;

                  return (
                    <div
                      key={ip}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.85rem',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.84rem'
                      }}
                    >
                      <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{fullUrl}</span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => handleCopy(fullUrl, `ip-${idx}`)}
                      >
                        {isCopied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Скопировано!' : 'Скопировать'}</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem'
                  }}
                >
                  <span style={{ color: 'var(--accent-orange)' }}>{defaultUrl}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => handleCopy(defaultUrl, 'default')}
                  >
                    {copiedIp === 'default' ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                    <span>{copiedIp === 'default' ? 'Скопировано!' : 'Скопировать'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Win + L info */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}
          >
            <Lock size={20} style={{ color: 'var(--accent-orange)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>
              <b style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>
                Политика безопасности (Win + L):
              </b>
              Когда вы блокируете ПК клавишами <b>Win + L</b>, этот сервер <b>продолжает работать</b> в фоне и отдавать задачи коллегам. Главное — в параметрах электропитания Windows отключить «Спящий режим» системного блока (гасить только экран).
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginRight: 'auto', fontSize: '0.78rem' }}
            onClick={handleExportBackup}
            title="Скачать резервную копию базы данных JSON"
          >
            <Download size={14} />
            <span>Резервная копия базы (JSON)</span>
          </button>

          <button type="button" className="btn btn-primary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
