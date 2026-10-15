import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  Check, 
  AlertCircle, 
  Trash2, 
  ArrowRight, 
  Layers, 
  User, 
  Calendar,
  Building
} from 'lucide-react';
import { playSound } from '../lib/sound';
import confetti from 'canvas-confetti';

/**
 * Parses raw copied table text (from ERP, 1C, Excel, or Telegram/chat)
 */
function parseErpTableText(rawText, sections = [], teamMembers = []) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.trim().split(/\r?\n/);
  const parsedRows = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip header line if detected
    const lowerTrimmed = trimmed.toLowerCase();
    if (
      lowerTrimmed.startsWith('id') &&
      (lowerTrimmed.includes('контрагент') || lowerTrimmed.includes('адрес') || lowerTrimmed.includes('среда'))
    ) {
      continue;
    }

    let id = '';
    let contractor = '';
    let address = '';
    let contactInfo = '';
    let medium = '';
    let services = '';
    let statusText = '';
    let createdBy = '';
    let assigneeText = '';
    let examDate = '';
    let examKsDate = '';

    // 1. Try splitting by Tab (\t)
    let cells = trimmed.split('\t');

    // 2. If fewer than 4 cells, try splitting by 2+ spaces
    if (cells.length < 4) {
      cells = trimmed.split(/\s{2,}/);
    }

    // 3. If we have at least 4 cells, parse by tabular positions
    if (cells.length >= 4) {
      cells = cells.map(c => c.trim());

      id = (cells[0] || '').replace(/[^0-9]/g, '');

      // Smart heuristic: if cell 1 looks like an address (has "д.", "ул", "г.", "просп" etc.), then contractor is empty
      if (cells[1] && (/д\.|ул|г\.|просп|пер\.|шоссе|мкр|дом/i.test(cells[1]) || !cells[2])) {
        address = cells[1];
        contactInfo = cells[2] || '';
        medium = cells[3] || '';
        services = cells[4] || '';
        statusText = cells[5] || '';
        createdBy = cells[6] || '';
        for (let i = 7; i < cells.length; i++) {
          const val = cells[i];
          if (/\d{2}\.\d{2}\.\d{4}/.test(val)) {
            if (!examDate) examDate = val;
            else if (!examKsDate) examKsDate = val;
          }
        }
      } else {
        contractor = cells[1] || '';
        address = cells[2] || cells[1] || '';
        contactInfo = cells[3] || '';
        medium = cells[4] || '';
        services = cells[5] || '';
        statusText = cells[6] || '';
        createdBy = cells[7] || '';
        assigneeText = cells[11] || '';
        examDate = cells[12] || '';
        examKsDate = cells[13] || '';
      }
    } else {
      // 4. Fallback: Parse single-spaced line (e.g. copied from Telegram or chat)
      const idMatch = trimmed.match(/^(\d{4,15})\s+(.*)$/);
      if (idMatch) {
        id = idMatch[1];
        const rest = idMatch[2].trim();

        // Extract contact info (phone number e.g. +7 (777) 777-77-77;)
        const phoneMatch = rest.match(/(\+?[78][\d\s\-\(\)]{8,22};?)/);
        let afterAddress = rest;

        if (phoneMatch) {
          contactInfo = phoneMatch[1].trim();
          const phoneIdx = rest.indexOf(phoneMatch[1]);
          address = rest.slice(0, phoneIdx).trim();
          afterAddress = rest.slice(phoneIdx + phoneMatch[1].length).trim();
        } else {
          // If no phone, look for medium keyword
          const medIdx = rest.search(/(?:^|\s)(Оптика|Медь|Радио|ВОЛС|UTP)(?:\s|$)/i);
          if (medIdx > 0) {
            address = rest.slice(0, medIdx).trim();
            afterAddress = rest.slice(medIdx).trim();
          } else {
            address = rest;
            afterAddress = '';
          }
        }

        // Extract dates (dd.mm.yyyy)
        const dateRegex = /(\d{2}\.\d{2}\.\d{4}(?:\s+\d{2})?)/g;
        const matchedDates = [];
        let dMatch;
        while ((dMatch = dateRegex.exec(afterAddress)) !== null) {
          matchedDates.push(dMatch[1].trim());
        }
        if (matchedDates.length >= 2) {
          examDate = matchedDates[0];
          examKsDate = matchedDates[matchedDates.length - 1];
        } else if (matchedDates.length === 1) {
          examKsDate = matchedDates[0];
        }

        // Extract medium
        const medMatch = afterAddress.match(/(?:^|\s)(Оптика|Медь|Радио|ВОЛС|UTP)(?:\s|$)/i);
        if (medMatch) medium = medMatch[1].trim();

        // Extract services
        const servMatch = afterAddress.match(/(?:^|\s)(Интернет|КТВ|ВН|СВН|Телефония|Телевидение|Видеонаблюдение|Wi-Fi|WiFi)(?:\s|$)/i);
        if (servMatch) services = servMatch[1].trim();

        // Extract status
        const stMatch = afterAddress.match(/(?:^|\s)(Принят|В работе|Назначен|Новый|Отложен|Выполнен|Завершен|Отменен)(?:\s|$)/i);
        if (stMatch) statusText = stMatch[1].trim();
      } else {
        // Line doesn't start with ID - use as general address/task
        address = trimmed;
      }
    }

    // Determine target section / mark based on medium or services
    let chosenSection = sections[0]?.id || 'ВДН';
    const mediumLower = (medium + ' ' + services).toLowerCase();
    if (mediumLower.includes('оптик') || mediumLower.includes('волс')) {
      const volsSec = sections.find(s => s.id === 'ВОЛС' || s.id === 'ОДРС' || s.id === 'ЧС');
      if (volsSec) chosenSection = volsSec.id;
    } else if (mediumLower.includes('вид') || mediumLower.includes('вн') || mediumLower.includes('камер') || mediumLower.includes('свн')) {
      const vdnSec = sections.find(s => s.id === 'ВДН' || s.id === 'СВН');
      if (vdnSec) chosenSection = vdnSec.id;
    } else if (mediumLower.includes('мкд') || mediumLower.includes('мкж') || mediumLower.includes('дом') || mediumLower.includes('скуд')) {
      const mkdSec = sections.find(s => s.id === 'МКЖ' || s.id === 'СКУД');
      if (mkdSec) chosenSection = mkdSec.id;
    }

    // Format due date (e.g. "01.01.2026" or "01.01.2026 00" -> "2026-01-01")
    let formattedDueDate = '';
    const dateMatch = (examKsDate || examDate || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dateMatch) {
      formattedDueDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // Match assignee
    let matchedAssigneeId = '';
    if (assigneeText) {
      const lowerAss = assigneeText.toLowerCase();
      const found = teamMembers.find(m => 
        lowerAss.includes(m.full_name.toLowerCase()) || 
        m.full_name.toLowerCase().includes(lowerAss) ||
        (m.initials && lowerAss.includes(m.initials.toLowerCase()))
      );
      if (found) matchedAssigneeId = found.id;
    }

    // Clean title: prefer address, optionally with services/contractor
    let title = '';
    if (address) {
      if (contractor) {
        title = `${contractor} • ${address}`;
      } else if (services) {
        title = `${address} (${services})`;
      } else {
        title = address;
      }
    } else {
      title = `Заявка ERP #${id || Date.now()}`;
    }

    // Build structured description (keep only items not already in separate dedicated fields)
    const descParts = [];
    if (contractor) descParts.push(`Контрагент: ${contractor}`);
    if (contactInfo) descParts.push(`Контакты: ${contactInfo}`);
    if (medium) descParts.push(`Среда передачи: ${medium}`);
    if (services) descParts.push(`Услуги: ${services}`);
    if (createdBy) descParts.push(`Кем создан: ${createdBy}`);

    const cleanErpId = id.replace(/[^0-9]/g, '');

    parsedRows.push({
      tempId: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      selected: true,
      erp_task_number: cleanErpId,
      erp_project_id: cleanErpId,
      title: title,
      address: address,
      section: chosenSection,
      assignee_id: matchedAssigneeId,
      due_date: formattedDueDate,
      description: descParts.join('\n'),
      priority: 'medium',
      region: '11' // default: АО "Уфанет" г.Москва
    });
  }

  return parsedRows;
}

export function ImportModal({
  isOpen,
  onClose,
  sections = [],
  teamMembers = [],
  onImportTasks
}) {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsed, setIsParsed] = useState(false);

  if (!isOpen) return null;

  const handleParse = () => {
    if (!rawText.trim()) return;
    const rows = parseErpTableText(rawText, sections, teamMembers);
    setParsedRows(rows);
    setIsParsed(true);
    playSound('click');
  };

  const handleToggleRow = (tempId) => {
    setParsedRows(prev => prev.map(r => r.tempId === tempId ? { ...r, selected: !r.selected } : r));
  };

  const handleToggleAll = (val) => {
    setParsedRows(prev => prev.map(r => ({ ...r, selected: val })));
  };

  const handleUpdateField = (tempId, field, val) => {
    setParsedRows(prev => prev.map(r => r.tempId === tempId ? { ...r, [field]: val } : r));
  };

  const handleDeleteRow = (tempId) => {
    setParsedRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  const handleExecuteImport = () => {
    const selected = parsedRows.filter(r => r.selected);
    if (selected.length === 0) return;

    onImportTasks(selected);
    playSound('success');
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 }
    });
    onClose();
  };

  const handlePasteDemo = () => {
    const sample = `123456789\t\tд. Деревня, Улица д. 1\t+7 (777) 777-77-77;\tОптика\tИнтернет\tПринят\tФ И О\t\t\t\t\t01.01.2026 00\t01.01.2026\tПринять на себя`;
    setRawText(sample);
  };

  const selectedCount = parsedRows.filter(r => r.selected).length;

  return (
    <div 
      className="modal-overlay" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 1000 }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1050px',
          width: '95%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: 'var(--bg-modal, #111827)',
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.65)'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(255,102,0,0.15)', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={19} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Быстрый импорт задач из ERP / Excel
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Скопируйте таблицу из ERP или Excel и вставьте сюда для пакетного создания задач
              </div>
            </div>
          </div>

          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {!isParsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Вставьте скопированные строки таблицы (Ctrl + V):
                </label>
                <button
                  type="button"
                  className="btn-mini-action"
                  onClick={handlePasteDemo}
                  style={{ fontSize: '0.72rem' }}
                >
                  Вставить тестовый пример
                </button>
              </div>

              <textarea
                className="form-textarea"
                rows={9}
                placeholder="Вставьте сюда скопированные строки из таблицы ERP (ID, Адрес, Контакты, Среда передачи, Сроки...)"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', whiteSpace: 'pre' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Поддерживается табличный формат ERP: ID, Адрес, Среда, Услуги, Срок обследования КС...
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleParse}
                  disabled={!rawText.trim()}
                  style={{ padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  <ArrowRight size={16} />
                  <span>Разобрать таблицу</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsParsed(false)}
                    style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
                  >
                    ← Назад к тексту
                  </button>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Найдено задач: {parsedRows.length} (выбрано: {selectedCount})
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleToggleAll(true)}
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                  >
                    Выбрать все
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleToggleAll(false)}
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                  >
                    Снять выбор
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div 
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  overflowX: 'auto',
                  maxHeight: '420px',
                  background: 'var(--bg-card)'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '0.55rem 0.65rem', width: 32 }}></th>
                      <th style={{ padding: '0.55rem 0.65rem' }}>ERP ID</th>
                      <th style={{ padding: '0.55rem 0.65rem', minWidth: '220px' }}>Адрес / Название задачи</th>
                      <th style={{ padding: '0.55rem 0.65rem', minWidth: '110px' }}>Раздел</th>
                      <th style={{ padding: '0.55rem 0.65rem', minWidth: '150px' }}>Исполнитель</th>
                      <th style={{ padding: '0.55rem 0.65rem', minWidth: '120px' }}>Дедлайн</th>
                      <th style={{ padding: '0.55rem 0.65rem', width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row) => (
                      <tr 
                        key={row.tempId}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          opacity: row.selected ? 1 : 0.45,
                          background: row.selected ? 'transparent' : 'rgba(0,0,0,0.1)'
                        }}
                      >
                        <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => handleToggleRow(row.tempId)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-orange)' }}>
                          {row.erp_task_number || '—'}
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={row.title}
                            onChange={(e) => handleUpdateField(row.tempId, 'title', e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                          />
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem' }}>
                          <select
                            className="form-select"
                            value={row.section}
                            onChange={(e) => handleUpdateField(row.tempId, 'section', e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                          >
                            {sections.map(s => (
                              <option key={s.id} value={s.id}>{s.id}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem' }}>
                          <select
                            className="form-select"
                            value={row.assignee_id}
                            onChange={(e) => handleUpdateField(row.tempId, 'assignee_id', e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                          >
                            <option value="">Не назначен</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem' }}>
                          <input
                            type="date"
                            className="form-input"
                            value={row.due_date}
                            onChange={(e) => handleUpdateField(row.tempId, 'due_date', e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                          />
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDeleteRow(row.tempId)}
                            style={{ width: 24, height: 24, padding: 0 }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          style={{
            padding: '0.9rem 1.4rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)'
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>

          {isParsed && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExecuteImport}
              disabled={selectedCount === 0}
              style={{ padding: '0.55rem 1.35rem', fontWeight: 800, fontSize: '0.85rem' }}
            >
              <Check size={16} />
              <span>Создать {selectedCount} задач в Бэклоге</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
