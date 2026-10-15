import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wifi, 
  Copy, 
  Check, 
  Download, 
  Server,
  Lock,
  Edit2
} from 'lucide-react';
import { fetchServerInfo, fetchAllTasks, fetchProjectsList, fetchTeamMembers, getCustomLanIp, setCustomLanIp } from '../lib/api';
import { playSound } from '../lib/sound';

export function NetworkModal({ isOpen, onClose }) {
  const [serverInfo, setServerInfo] = useState({ hostname: '...', ips: [], port: 3000, status: 'checking' });
  const [copiedKey, setCopiedKey] = useState(null);
  const [customIpInput, setCustomIpInput] = useState('');
  const [savedCustomIp, setSavedCustomIp] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedIp = getCustomLanIp();
      setSavedCustomIp(storedIp);
      setCustomIpInput(storedIp);
      fetchServerInfo().then((info) => {
        setServerInfo(info);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentHost = window.location.hostname;
  const currentPort = window.location.port || '3000';

  // Primary URL for colleagues: either custom IP or first detected IP or currentHost
  const effectiveIp = savedCustomIp || (serverInfo.ips && serverInfo.ips.length > 0 ? serverInfo.ips[0] : currentHost);
  const effectiveUrl = `http://${effectiveIp}:${serverInfo.port || currentPort}`;

  const handleCopy = (url, key) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    playSound('click');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveCustomIp = (e) => {
    e.preventDefault();
    const clean = customIpInput.trim();
    setCustomLanIp(clean);
    setSavedCustomIp(clean);
    playSound('success');
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
      department: 'Отдел проектирования',
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

  // Safe overlay click
  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
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

          {/* Primary Recommended Link for colleagues */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-main)' }}>
              Основная ссылка для коллег из отдела:
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--accent-orange)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.92rem'
              }}
            >
              <span style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>{effectiveUrl}</span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                onClick={() => handleCopy(effectiveUrl, 'primary')}
              >
                {copiedKey === 'primary' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey === 'primary' ? 'Скопировано!' : 'Скопировать ссылку'}</span>
              </button>
            </div>
          </div>

          {/* Manual IP input option */}
          <form
            onSubmit={handleSaveCustomIp}
            style={{
              padding: '0.85rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
              <Edit2 size={13} style={{ color: 'var(--accent-orange)' }} />
              <span>Указать рабочий IP вручную (при необходимости):</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                placeholder="Например: 192.168.1.45 или сетевое имя ПК"
                value={customIpInput}
                onChange={(e) => setCustomIpInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem' }}>
                Сохранить
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Если оставить пустым — адрес будет определяться автоматически.
            </div>
          </form>

          {/* Detected Network Adapters List */}
          {serverInfo.ips && serverInfo.ips.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Все обнаруженные сетевые адаптеры компьютера:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {serverInfo.ips.map((ip, idx) => {
                  const url = `http://${ip}:${serverInfo.port || 3000}`;
                  return (
                    <div
                      key={ip}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.65rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>{url}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(url, `ip-${idx}`)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
                        title="Скопировать этот IP"
                      >
                        {copiedKey === `ip-${idx}` ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ProjectPay Userscript Download / Install Section */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'rgba(255, 102, 0, 0.08)',
              border: '1px solid rgba(255, 102, 0, 0.35)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.84rem', color: 'var(--accent-orange)' }}>
                <span>⚡</span>
                <span>Скрипт автозаполнения ЗП в ProjectPay (v3.0):</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                Для Tampermonkey
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
              Автоматически проставляет все поля: Название проекта, Шифр, Код, Регион (Уфа), Группу (ВОЛС), Вид работ (РД), Время Тфакт (ч:м), ERP номер, Коэффициенты и Примечание.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <a
                href="/projectpay_autofill.user.js"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', gap: '5px', textDecoration: 'none' }}
                title="Установить скрипт в расширение Tampermonkey браузера"
              >
                <Download size={13} />
                <span>Установить скрипт (v3.0)</span>
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', gap: '5px' }}
                onClick={() => {
                  fetch('/projectpay_autofill.user.js')
                    .then(r => r.text())
                    .then(code => {
                      navigator.clipboard.writeText(code);
                      handleCopy('', 'script-code');
                    });
                }}
                title="Скопировать код скрипта для вставки в консоль F12 или Tampermonkey"
              >
                {copiedKey === 'script-code' ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                <span>{copiedKey === 'script-code' ? 'Код скопирован!' : 'Скопировать код'}</span>
              </button>
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
            <Lock size={18} style={{ color: 'var(--accent-orange)', flexShrink: 0, marginTop: '2px' }} />
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
