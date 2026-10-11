// Константы и конфигурация для отдела проектирования компании УФАНЕТ

export const DEFAULT_SECTIONS = [
  { id: 'ВДН', name: 'ВДН (Видеонаблюдение)', color: '#ff6600', bg: 'rgba(255, 102, 0, 0.15)', border: 'rgba(255, 102, 0, 0.35)' },
  { id: 'МКЖ', name: 'МКЖ (Многоквартирное жилье)', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: 'rgba(2, 132, 199, 0.35)' },
  { id: 'ЧС', name: 'ЧС (Частный сектор / GPON)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' },
  { id: 'ККС', name: 'ККС (Кабельная канализация связи)', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)' },
  { id: 'СКУД', name: 'СКУД (Контроль доступа / домофоны)', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)' },
  { id: 'ОДРС', name: 'ОДРС (Оптические распредсети)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' },
  { id: 'СВН', name: 'СВН (Системы видеонаблюдения)', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.35)' },
  { id: 'ЭОМ', name: 'ЭОМ (Электроснабжение оборудования)', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)' }
];

export const WORK_TYPES = [
  'Разработка проектной документации',
  'Рабочая документация (РД)',
  'Обследование объекта / выезд',
  'Согласование трассы со смежниками',
  'Устранение замечаний / корректировка',
  'Выпуск в печать и монтаж',
  'Нормоконтроль ГИПа'
];

export const COLUMNS = [
  { id: 'backlog', title: 'Очередь / Бэклог', subtitle: 'В планах к разработке', color: '#64748b' },
  { id: 'in_progress', title: 'В работе', subtitle: 'Текущие задачи инженеров', color: '#ff6600' },
  { id: 'review', title: 'На проверке (ГИП)', subtitle: 'Нормоконтроль и согласование', color: '#f59e0b' },
  { id: 'done', title: 'Готово / Выдано', subtitle: 'Выпущено в монтаж / заказчику', color: '#10b981' }
];

export const PRIORITIES = [
  { id: 'urgent', name: 'Срочно / Горит', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' },
  { id: 'medium', name: 'Обычный', color: '#ff7700', bg: 'rgba(255, 119, 0, 0.15)', border: 'rgba(255, 119, 0, 0.35)' },
  { id: 'low', name: 'Низкий', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' }
];

export const INITIAL_MEMBERS = [
  {
    id: 'uf-11111111-1111-1111-1111-111111111111',
    full_name: 'Алексей Смирнов',
    role: 'Начальник отдела проектирования',
    initials: 'АС',
    avatar_color: '#ff6600'
  },
  {
    id: 'uf-22222222-2222-2222-2222-222222222222',
    full_name: 'Мария Воронова',
    role: 'Инженер-проектировщик',
    initials: 'МВ',
    avatar_color: '#ff8800'
  },
  {
    id: 'uf-33333333-3333-3333-3333-333333333333',
    full_name: 'Дмитрий Ковалёв',
    role: 'Инженер-проектировщик',
    initials: 'ДК',
    avatar_color: '#0284c7'
  },
  {
    id: 'uf-44444444-4444-4444-4444-444444444444',
    full_name: 'Елена Васильева',
    role: 'Инженер-проектировщик',
    initials: 'ЕВ',
    avatar_color: '#10b981'
  },
  {
    id: 'uf-55555555-5555-5555-5555-555555555555',
    full_name: 'Сергей Морозов',
    role: 'Инженер-проектировщик',
    initials: 'СМ',
    avatar_color: '#f59e0b'
  },
  {
    id: 'uf-66666666-6666-6666-6666-666666666666',
    full_name: 'Антон Кузнецов',
    role: 'Инженер-проектировщик',
    initials: 'АК',
    avatar_color: '#8b5cf6'
  }
];

export const INITIAL_PROJECTS = [
  'ЖК «Агидель»',
  'мкр. Затон (Север)',
  'Технопарк Уфа',
  'Квартал 4 (Центр)',
  'ТЦ «Планета»'
];

export const INITIAL_TASKS = [
  {
    id: 'task-uf-1',
    title: 'Трассировка кабельной канализации связи ККС',
    project_code: 'мкр. Затон (Север)',
    section: 'ККС',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'uf-22222222-2222-2222-2222-222222222222',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Затон\\Трасса_ККС.dwg',
    description: 'Согласовать проход 4-отверстной трубы с городскими коммуникациями (водоканал, теплосети).',
    checklist: [
      { id: 'c1', text: 'Запросить топосъемку 1:500', done: true },
      { id: 'c2', text: 'План расстановки колодцев ККС-2 и ККС-3', done: true },
      { id: 'c3', text: 'Согласовать пересечения с водопроводом', done: false }
    ],
    // ERP & Salary fields
    erp_project_id: 'PRJ-10482',
    erp_task_number: 'TASK-84920',
    house_id: '',
    hours_spent: '14',
    work_type: 'Разработка проектной документации',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'task-uf-2',
    title: 'Проект видеонаблюдения ВДН дворовой территории и паркинга',
    project_code: 'ЖК «Агидель»',
    section: 'ВДН',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'uf-33333333-3333-3333-3333-333333333333',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Агидель\\Схема_Камер.dwg',
    description: 'Охват въездных ворот, детских площадок и подземного паркинга. Расчет архива NVR на 30 дней.',
    checklist: [
      { id: 'c1', text: 'Расстановка 48 IP-камер 4K', done: true },
      { id: 'c2', text: 'Кабельный журнал и расчет PoE-бюджета', done: true },
      { id: 'c3', text: 'Согласование зон обзора с заказчиком', done: false }
    ],
    erp_project_id: 'PRJ-9021',
    erp_task_number: 'TASK-71024',
    house_id: 'ДОМ-44',
    hours_spent: '20',
    work_type: 'Рабочая документация (РД)',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'task-uf-3',
    title: 'Сети связи и умная домофония СКУД МКД',
    project_code: 'ЖК «Агидель»',
    section: 'МКЖ',
    status: 'review',
    priority: 'medium',
    assignee_id: 'uf-44444444-4444-4444-4444-444444444444',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Агидель\\МКЖ_Домофоны.pdf',
    description: 'Интеграция вызывных панелей Уфанет Умный дом на 12 подъездов с распознаванием лиц и приложением.',
    checklist: [
      { id: 'c1', text: 'Схемы стояков связи по секциям', done: true },
      { id: 'c2', text: 'Спецификация оптических кроссов и шкафов', done: true },
      { id: 'c3', text: 'Финальная подпись начальника отдела', done: false }
    ],
    erp_project_id: 'PRJ-9021',
    erp_task_number: 'TASK-71030',
    house_id: 'ДОМ-44',
    hours_spent: '16',
    work_type: 'Выпуск в печать и монтаж',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'task-uf-4',
    title: 'Прокладка оптической распределительной сети ОДРС (GPON)',
    project_code: 'Квартал 4 (Центр)',
    section: 'ОДРС',
    status: 'backlog',
    priority: 'medium',
    assignee_id: 'uf-55555555-5555-5555-5555-555555555555',
    due_date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Квартал4\\Схема_ОДРС.vsd',
    description: 'Расчет оптического бюджета от сплиттеров 1:8 и 1:16 до абонентских розеток.',
    checklist: [
      { id: 'c1', text: 'Трассировка по слаботочным стоякам', done: false },
      { id: 'c2', text: 'Подбор кроссовых боксов', done: false }
    ],
    erp_project_id: '',
    erp_task_number: '',
    house_id: 'ДОМ-12Б',
    hours_spent: '',
    work_type: 'Разработка проектной документации',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'task-uf-5',
    title: 'Электроснабжение телекоммуникационных шкафов ЭОМ',
    project_code: 'Технопарк Уфа',
    section: 'ЭОМ',
    status: 'done',
    priority: 'low',
    assignee_id: 'uf-66666666-6666-6666-6666-666666666666',
    due_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Технопарк\\ЭОМ_Стойки.pdf',
    description: 'Узел принят эксплуатацией. Выделенная линия 1 категории с АВР и ИБП 10 кВА.',
    checklist: [
      { id: 'c1', text: 'Однолинейная схема', done: true },
      { id: 'c2', text: 'Согласование главного энергетика', done: true }
    ],
    erp_project_id: 'PRJ-8810',
    erp_task_number: 'TASK-62100',
    house_id: '',
    hours_spent: '12',
    work_type: 'Выпуск в печать и монтаж',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];
