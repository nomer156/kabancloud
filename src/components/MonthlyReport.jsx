import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Download, 
  Printer, 
  User, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  Copy,
  FolderOpen,
  Edit3,
  Users,
  Check,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { playSound } from '../lib/sound';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function parseHoursToDecimal(val) {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(':')) {
    const [hh, mm] = str.split(':');
    const h = parseFloat(hh) || 0;
    const m = (parseFloat(mm) || 0) / 60;
    return Math.round((h + m) * 100) / 100;
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

function formatHoursDisplay(val) {
  if (!val) return '—';
  const str = String(val).trim();
  return `${str} ч.`;
}

function formatTotalHoursSummary(decimalHours) {
  const rounded = Math.round(decimalHours * 100) / 100;
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  if (m === 0) return `${h} ч.`;
  return `${rounded} ч. (${h} ч. ${m} мин.)`;
}

export function MonthlyReport({
  tasks = [],
  teamMembers = [],
  sections = [],
  selectedAssigneeId = null,
  selectedMember = null,
  onSelectAssignee,
  onEditTask,
  theme
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewAllTime, setViewAllTime] = useState(false);
  const [copiedPayroll, setCopiedPayroll] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 - 11

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    playSound('click');
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    playSound('click');
  };

  const handleResetToCurrentMonth = () => {
    setCurrentDate(new Date());
    setViewAllTime(false);
    playSound('click');
  };

  // Filter tasks for this month and assignee
  const reportTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Assignee filter if specific member selected
      if (selectedAssigneeId && task.assignee_id !== selectedAssigneeId) {
        return false;
      }

      // If view all time is enabled, don't filter by date
      if (viewAllTime) return true;

      // 2. Date match: match either due_date, updated_at, or created_at
      const rawDate = task.due_date || task.updated_at || task.created_at;
      if (!rawDate) return true;

      const taskDate = new Date(rawDate);
      if (isNaN(taskDate.getTime())) return true;

      return taskDate.getFullYear() === currentYear && taskDate.getMonth() === currentMonth;
    });
  }, [tasks, selectedAssigneeId, currentYear, currentMonth, viewAllTime]);

  // Aggregate stats
  const totalTasks = reportTasks.length;
  const doneTasks = reportTasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = reportTasks.filter((t) => t.status === 'in_progress').length;
  const reviewTasks = reportTasks.filter((t) => t.status === 'review').length;
  const backlogTasks = reportTasks.filter((t) => t.status === 'backlog').length;

  const totalHours = reportTasks.reduce((sum, t) => {
    return sum + parseHoursToDecimal(t.hours_spent);
  }, 0);

  const missingHoursCount = reportTasks.filter((t) => !t.hours_spent || parseHoursToDecimal(t.hours_spent) === 0).length;
  const missingErpCount = reportTasks.filter((t) => !t.erp_project_id && !t.erp_task_number).length;
  const completionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Breakdown by section / mark (ВДН, МКЖ, etc.)
  const sectionBreakdown = useMemo(() => {
    const map = {};
    reportTasks.forEach((t) => {
      const s = t.section || 'Другое';
      if (!map[s]) {
        map[s] = { count: 0, hours: 0 };
      }
      map[s].count += 1;
      const h = parseHoursToDecimal(t.hours_spent);
      if (h > 0) map[s].hours += h;
    });
    return Object.entries(map).sort((a, b) => b[1].hours - a[1].hours);
  }, [reportTasks]);

  // Breakdown by employee (for whole department view)
  const employeeBreakdown = useMemo(() => {
    return teamMembers.map((member) => {
      const memberTasks = reportTasks.filter((t) => t.assignee_id === member.id);
      const mDone = memberTasks.filter((t) => t.status === 'done').length;
      const mInProgress = memberTasks.filter((t) => t.status === 'in_progress' || t.status === 'review').length;
      const mHours = memberTasks.reduce((sum, t) => {
        return sum + parseHoursToDecimal(t.hours_spent);
      }, 0);

      return {
        member,
        tasksCount: memberTasks.length,
        doneCount: mDone,
        inProgressCount: mInProgress,
        hours: Math.round(mHours * 10) / 10
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [teamMembers, reportTasks]);

  // Export to CSV for Excel / Payroll
  const handleExportCSV = () => {
    const headers = [
      'ID ERP',
      'Номер задачи ERP',
      'Название задачи (ЧТО)',
      'Объект / Проект (ГДЕ)',
      'ID Дома (ГДЕ)',
      'Сетевой путь (ГДЕ)',
      'Раздел / Марка (КАК)',
      'Вид работы (КАК)',
      'Исполнитель',
      'Срок / Дедлайн (КОГДА)',
      'Затрачено часов (КАК ДОЛГО)',
      'Статус'
    ];

    const rows = reportTasks.map((t) => {
      const member = teamMembers.find((m) => m.id === t.assignee_id);
      const statusTitle = t.status === 'done' ? 'Готово' : t.status === 'in_progress' ? 'В работе' : t.status === 'review' ? 'На проверке' : 'Бэклог';

      return [
        `"${t.erp_project_id || ''}"`,
        `"${t.erp_task_number || ''}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.project_code || '').replace(/"/g, '""')}"`,
        `"${t.house_id || ''}"`,
        `"${(t.network_link || '').replace(/"/g, '""')}"`,
        `"${t.section || ''}"`,
        `"${t.work_type || ''}"`,
        `"${member ? member.full_name : 'Не назначен'}"`,
        `"${t.due_date || ''}"`,
        `"${t.hours_spent || '0'}"`,
        `"${statusTitle}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const targetLabel = selectedMember ? selectedMember.full_name.replace(/\s+/g, '_') : 'Отдел_проектирования';
    a.download = `Табель_Уфанет_${targetLabel}_${MONTH_NAMES[currentMonth]}_${currentYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  // Copy quick payroll text block
  const handleCopyPayrollText = () => {
    const lines = reportTasks.map((t, idx) => {
      const erp = t.erp_project_id ? `[ERP: ${t.erp_project_id}${t.erp_task_number ? ` / №${t.erp_task_number}` : ''}] ` : '';
      const obj = t.project_code ? `${t.project_code}${t.house_id ? ` (д. ${t.house_id})` : ''} — ` : '';
      const sec = t.section ? `[${t.section}] ` : '';
      const wt = t.work_type ? `(${t.work_type}) ` : '';
      const hrs = t.hours_spent ? `— ${t.hours_spent} ч.` : '— (часы не указаны)';
      return `${idx + 1}. ${erp}${sec}${obj}${t.title} ${wt}${hrs}`;
    });

    const headerText = selectedMember 
      ? `Отчёт по ЗП: ${selectedMember.full_name} (${MONTH_NAMES[currentMonth]} ${currentYear})\nИтого часов: ${totalHours} ч.\n\n`
      : `Сводный отчёт отдела проектирования (${MONTH_NAMES[currentMonth]} ${currentYear})\nИтого часов: ${totalHours} ч.\n\n`;

    const fullText = headerText + lines.join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedPayroll(true);
    playSound('success');
    setTimeout(() => setCopiedPayroll(false), 2500);
  };

  const handlePrint = () => {
    playSound('click');
    window.print();
  };

  const handleCopyNetworkLink = (link, e) => {
    e.stopPropagation();
    if (!link) return;
    navigator.clipboard.writeText(link);
    playSound('click');
  };

  return (
    <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      {/* Top Controls & Switcher Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.25rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Title & Scope Indicator */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Calendar size={22} style={{ color: 'var(--accent-orange)' }} />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Ежемесячный отчёт проектирования
              </h2>
              <span className="brand-badge">Уфанет</span>
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedMember ? (
                <span>
                  Индивидуальный табель: <b style={{ color: 'var(--accent-orange)' }}>{selectedMember.full_name}</b> ({selectedMember.role || 'инженер'})
                </span>
              ) : (
                <span>
                  Сводный табель: <b style={{ color: 'var(--text-main)' }}>Весь отдел проектирования</b> ({teamMembers.length} инженеров)
                </span>
              )}
            </div>
          </div>

          {/* Month Switcher & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Month Switcher */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--bg-tertiary)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                className="btn-mini-action"
                onClick={handlePrevMonth}
                disabled={viewAllTime}
                title="Предыдущий месяц"
                style={{ opacity: viewAllTime ? 0.4 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '0.88rem', fontWeight: 700, minWidth: '135px', textAlign: 'center', color: viewAllTime ? 'var(--text-dim)' : 'var(--text-main)' }}>
                {viewAllTime ? 'Все месяцы' : `${MONTH_NAMES[currentMonth]} ${currentYear}`}
              </span>

              <button
                type="button"
                className="btn-mini-action"
                onClick={handleNextMonth}
                disabled={viewAllTime}
                title="Следующий месяц"
                style={{ opacity: viewAllTime ? 0.4 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Reset to current month or Toggle All Time */}
            <button
              type="button"
              className={`btn ${viewAllTime ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => {
                setViewAllTime(!viewAllTime);
                playSound('click');
              }}
              title="Переключить между текущим месяцем и общим списком"
            >
              <span>{viewAllTime ? 'По месяцам' : 'За всё время'}</span>
            </button>

            {/* Quick copy text for payroll website */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopyPayrollText}
              title="Скопировать готовый текстовый список для вбивания на сайт ЗП"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
            >
              {copiedPayroll ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              <span>{copiedPayroll ? 'Скопировано!' : 'Копировать для ЗП'}</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              title="Экспортировать в CSV для Excel и бухгалтерии"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
            >
              <Download size={14} />
              <span>Экспорт в Excel</span>
            </button>

            {/* Print */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrint}
              title="Печать отчёта или сохранение в PDF"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
            >
              <Printer size={14} />
              <span>Печать</span>
            </button>
          </div>
        </div>

        {/* Quick Employee Switcher Pills right in the report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Сотрудник:
          </span>

          <button
            type="button"
            className={`btn ${!selectedAssigneeId ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.78rem', borderRadius: 'var(--radius-full)' }}
            onClick={() => onSelectAssignee && onSelectAssignee(null)}
          >
            <Users size={13} />
            <span>Весь отдел ({teamMembers.length})</span>
          </button>

          {teamMembers.map((member) => {
            const isSelected = selectedAssigneeId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-full)',
                  borderColor: isSelected ? 'var(--accent-orange)' : undefined
                }}
                onClick={() => onSelectAssignee && onSelectAssignee(isSelected ? null : member.id)}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: member.avatar_color,
                    color: 'white',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {member.initials}
                </span>
                <span>{member.full_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards: Кратко и понятно */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* Total hours */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '1.1rem 1.25rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Трудозатраты (ЗП)
            </span>
            <Clock size={18} style={{ color: 'var(--accent-orange)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-orange)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            {Math.round(totalHours * 10) / 10} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>ч.</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {missingHoursCount > 0 ? (
              <span style={{ color: '#f59e0b' }}>⚠️ В {missingHoursCount} задачах не проставлены часы</span>
            ) : (
              <span>Часы заполнены по всем проектам</span>
            )}
          </div>
        </div>

        {/* Done / Handed off to mounting */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '1.1rem 1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Выполнено / Выдано
            </span>
            <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.35rem' }}>
            {doneTasks} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>({completionPercent}%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Завершённая документация
          </div>
        </div>

        {/* In progress / Under review */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '1.1rem 1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              В разработке / Проверка
            </span>
            <Clock size={18} style={{ color: '#00a3e0' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00a3e0', marginTop: '0.35rem' }}>
            {inProgressTasks + reviewTasks}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {inProgressTasks} в работе • {reviewTasks} на проверке ГИПа
          </div>
        </div>

        {/* Total Tasks Count */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '1.1rem 1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Всего проектов в отчёте
            </span>
            <FileSpreadsheet size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.35rem' }}>
            {totalTasks}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {missingErpCount > 0 ? (
              <span style={{ color: '#f59e0b' }}>⚠️ {missingErpCount} без привязки к ERP</span>
            ) : (
              <span>Все привязаны к кодам ERP</span>
            )}
          </div>
        </div>
      </div>

      {/* If "Все" is selected: Department breakdown by engineer */}
      {!selectedAssigneeId && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '0.9rem 1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              fontWeight: 700,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-tertiary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} style={{ color: 'var(--accent-orange)' }} />
              <span>Сводка по инженерам отдела</span>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Нажмите на строку или кнопку, чтобы открыть персональный табель
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.7rem 1.25rem' }}>Сотрудник</th>
                  <th style={{ padding: '0.7rem 1rem' }}>Должность / Направление</th>
                  <th style={{ padding: '0.7rem 1rem' }}>Всего задач</th>
                  <th style={{ padding: '0.7rem 1rem' }}>Выполнено</th>
                  <th style={{ padding: '0.7rem 1rem' }}>В работе</th>
                  <th style={{ padding: '0.7rem 1rem' }}>Отработано часов</th>
                  <th style={{ padding: '0.7rem 1.25rem', textAlign: 'right' }}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {employeeBreakdown.map(({ member, tasksCount, doneCount, inProgressCount, hours }) => (
                  <tr
                    key={member.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onClick={() => onSelectAssignee && onSelectAssignee(member.id)}
                    className="report-row-hover"
                  >
                    <td style={{ padding: '0.8rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: member.avatar_color,
                            color: 'white',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {member.initials}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{member.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)' }}>
                      {member.role || 'инженер'} {member.specialty ? `• ${member.specialty}` : ''}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>{tasksCount}</td>
                    <td style={{ padding: '0.8rem 1rem', color: '#10b981', fontWeight: 600 }}>{doneCount}</td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--accent-orange)', fontWeight: 600 }}>{inProgressCount}</td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-orange)', fontSize: '0.95rem' }}>
                        {hours} ч.
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1.25rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectAssignee) onSelectAssignee(member.id);
                        }}
                      >
                        Открыть отчёт →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Tasks Table: ЧТО, ГДЕ, КАК, КОГДА, КАК ДОЛГО */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Table title bar */}
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-tertiary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={16} style={{ color: 'var(--accent-orange)' }} />
            <span>
              {selectedMember 
                ? `Реестр проектов: ${selectedMember.full_name}`
                : 'Сводный реестр всех проектов отдела'}
            </span>
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Задач: <b>{reportTasks.length}</b> • Итого часов: <b style={{ color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>{Math.round(totalHours * 10) / 10} ч.</b>
          </span>
        </div>

        {/* Tasks Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr
                style={{
                  background: 'var(--bg-secondary)',
                  borderBottom: '2px solid var(--border-subtle)',
                  color: 'var(--text-dim)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                <th style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>ЧТО</div>
                  <div>Задача и ERP</div>
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>ГДЕ</div>
                  <div>Объект и размещение</div>
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>КАК</div>
                  <div>Марка и вид работ</div>
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>КТО</div>
                  <div>Исполнитель</div>
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>КОГДА</div>
                  <div>Срок сдачи</div>
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>КАК ДОЛГО</div>
                  <div>Часы для ЗП</div>
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>РЕЗУЛЬТАТ</div>
                  <div>Статус</div>
                </th>
                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', width: '40px' }}>
                  ✏️
                </th>
              </tr>
            </thead>
            <tbody>
              {reportTasks.map((task) => {
                const member = teamMembers.find((m) => m.id === task.assignee_id);
                const sectionMeta = sections.find((s) => s.id === task.section) || {
                  id: task.section || 'ВДН',
                  color: '#ff6600',
                  bg: 'rgba(255, 102, 0, 0.15)',
                  border: 'rgba(255, 102, 0, 0.35)'
                };

                let statusBadge = { title: 'Бэклог', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
                if (task.status === 'in_progress') statusBadge = { title: 'В работе', color: '#ff6600', bg: 'rgba(255, 102, 0, 0.15)' };
                if (task.status === 'review') statusBadge = { title: 'На проверке', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
                if (task.status === 'done') statusBadge = { title: 'Готово', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };

                return (
                  <tr
                    key={task.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s ease',
                      cursor: onEditTask ? 'pointer' : 'default'
                    }}
                    onClick={() => onEditTask && onEditTask(task)}
                    className="report-row-hover"
                  >
                    {/* ЧТО: Задача и ERP */}
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        {task.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {task.erp_project_id ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontFamily: 'var(--font-mono)',
                              background: 'rgba(255, 102, 0, 0.12)',
                              color: 'var(--accent-orange)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 102, 0, 0.28)',
                              fontWeight: 700
                            }}
                          >
                            ERP: {task.erp_project_id}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                            ERP не указан
                          </span>
                        )}

                        {task.erp_task_number && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontFamily: 'var(--font-mono)',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text-muted)',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            № {task.erp_task_number}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ГДЕ: Объект, Дом, Сеть */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                        {task.project_code || '—'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {task.house_id && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Building2 size={12} /> д. {task.house_id}
                          </span>
                        )}

                        {task.network_link && (
                          <button
                            type="button"
                            className="btn-mini-action"
                            style={{ padding: '1px 5px', fontSize: '0.68rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            onClick={(e) => handleCopyNetworkLink(task.network_link, e)}
                            title={`Скопировать сетевой путь: ${task.network_link}`}
                          >
                            <FolderOpen size={11} />
                            <span>Сеть</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* КАК: Марка и вид работ */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: '4px',
                            backgroundColor: sectionMeta.bg,
                            color: sectionMeta.color,
                            border: `1px solid ${sectionMeta.border}`
                          }}
                        >
                          {sectionMeta.id}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {task.work_type || 'Рабочая документация'}
                      </div>
                    </td>

                    {/* КТО: Исполнитель */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {member ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              backgroundColor: member.avatar_color,
                              color: 'white',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {member.initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{member.full_name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{member.role || 'инженер'}</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Не назначен</span>
                      )}
                    </td>

                    {/* КОГДА: Срок */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {task.due_date ? (
                        <span style={{ color: task.status !== 'done' && new Date(task.due_date) < new Date() ? '#ef4444' : 'inherit' }}>
                          {task.due_date}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>

                    {/* КАК ДОЛГО: Часы для ЗП */}
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      {task.hours_spent ? (
                        <span style={{ fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                          {task.hours_spent} ч.
                        </span>
                      ) : (
                        <span style={{ color: '#f59e0b', fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>
                          Не указано
                        </span>
                      )}
                    </td>

                    {/* РЕЗУЛЬТАТ: Статус */}
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color
                        }}
                      >
                        {statusBadge.title}
                      </span>
                    </td>

                    {/* Кнопка быстрого редактирования */}
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: 26, height: 26 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditTask) onEditTask(task);
                        }}
                        title="Редактировать карточку (изменить часы, статус, ERP)"
                      >
                        <Edit3 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {reportTasks.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-dim)' }}>
                    <AlertCircle size={32} style={{ opacity: 0.3, marginBottom: '0.6rem' }} />
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>За данный период задач не найдено</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                      Попробуйте переключить месяц или нажать кнопку «За всё время»
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
