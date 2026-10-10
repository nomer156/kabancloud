// Константы и конфигурация для отдела проектирования компании УФАНЕТ

export const SECTIONS = [
  { id: 'ВОЛС', name: 'ВОЛС (Волоконно-оптические линии)', color: '#ff6600', bg: 'rgba(255, 102, 0, 0.15)', border: 'rgba(255, 102, 0, 0.35)' },
  { id: 'СКС', name: 'СКС / ЛВС (Кабельные сети)', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: 'rgba(2, 132, 199, 0.35)' },
  { id: 'СКУД', name: 'СКУД (Контроль доступа / домофоны)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' },
  { id: 'ВН', name: 'ВН (Видеонаблюдение / камеры)', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)' },
  { id: 'ЭОМ', name: 'ЭОМ (Электроснабжение узлов связи)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' },
  { id: 'АС', name: 'АС (Архитектурно-строительные узлы)', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)' },
  { id: 'КР', name: 'КР (Конструкции / мачты / опоры)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)' },
  { id: 'ГП', name: 'ГП (Генплан / трассы в грунте)', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.35)' }
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
    role: 'Руководитель группы / ГИП',
    initials: 'АС',
    avatar_color: '#ff6600',
    specialty: 'ГИП'
  },
  {
    id: 'uf-22222222-2222-2222-2222-222222222222',
    full_name: 'Мария Воронова',
    role: 'Ведущий инженер ВОЛС',
    initials: 'МВ',
    avatar_color: '#ff8800',
    specialty: 'ВОЛС'
  },
  {
    id: 'uf-33333333-3333-3333-3333-333333333333',
    full_name: 'Дмитрий Ковалёв',
    role: 'Инженер СКС и передачи данных',
    initials: 'ДК',
    avatar_color: '#0284c7',
    specialty: 'СКС'
  },
  {
    id: 'uf-44444444-4444-4444-4444-444444444444',
    full_name: 'Елена Васильева',
    role: 'Инженер видеонаблюдения и СКУД',
    initials: 'ЕВ',
    avatar_color: '#10b981',
    specialty: 'ВН'
  },
  {
    id: 'uf-55555555-5555-5555-5555-555555555555',
    full_name: 'Сергей Морозов',
    role: 'Инженер Умный дом / IoT',
    initials: 'СМ',
    avatar_color: '#f59e0b',
    specialty: 'IoT'
  },
  {
    id: 'uf-66666666-6666-6666-6666-666666666666',
    full_name: 'Антон Кузнецов',
    role: 'Системный архитектор / IT-инфраструктура',
    initials: 'АК',
    avatar_color: '#8b5cf6',
    specialty: 'IT'
  }
];

export const INITIAL_PROJECTS = [
  'ВОЛС: Модернизация Юг',
  'СКС и Wi-Fi: Технопарк',
  'Видеонаблюдение: ЖК «Северный»',
  'Умный дом: Квартал 4',
  'Дата-центр: Стойка 12'
];

export const INITIAL_TASKS = [
  {
    id: 'task-uf-1',
    title: 'Трассировка магистрального оптического кабеля (96 ОВ)',
    project_code: 'ВОЛС: Модернизация Юг',
    section: 'ВОЛС',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'uf-22222222-2222-2222-2222-222222222222',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\ВОЛС_Юг\\Трасса_96ОВ.dwg',
    description: 'Согласовать проход кабеля через кабельную канализацию и опоры городского освещения. Подготовить схему разварки оптических муфт МТОК.',
    checklist: [
      { id: 'c1', text: 'Запросить ТУ на прокладку по опорам', done: true },
      { id: 'c2', text: 'Разработать план кроссовой коммутации ODF', done: true },
      { id: 'c3', text: 'Согласовать спецификацию оптических муфт', done: false }
    ],
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'task-uf-2',
    title: 'Проект СКС и схемы коммутационных шкафов 42U',
    project_code: 'СКС и Wi-Fi: Технопарк',
    section: 'СКС',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'uf-33333333-3333-3333-3333-333333333333',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Технопарк\\СКС_Шкафы.vsd',
    description: 'Категория 6A (10G). Расчет тепловыделения активного оборудования, ИБП 6кВА и системы охлаждения серверной комнаты.',
    checklist: [
      { id: 'c1', text: 'План размещения рабочих мест (320 портов RJ45)', done: true },
      { id: 'c2', text: 'Спецификация патч-панелей и органайзеров', done: true },
      { id: 'c3', text: 'Схема заземления телекоммуникационных стоек', done: false }
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'task-uf-3',
    title: 'Расстановка IP-камер 4К и домофонных панелей СКУД',
    project_code: 'Видеонаблюдение: ЖК «Северный»',
    section: 'ВН',
    status: 'backlog',
    priority: 'medium',
    assignee_id: 'uf-44444444-4444-4444-4444-444444444444',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Северный\\План_Камер.dwg',
    description: 'Охват входных групп, лифтовых холлов, въездных шлагбаумов и подземного паркинга. Расчет архива 30 дней (H.265+).',
    checklist: [
      { id: 'c1', text: 'Определить углы обзора и мертвые зоны', done: false },
      { id: 'c2', text: 'Подбор PoE-коммутаторов с запасом мощности', done: false }
    ],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'task-uf-4',
    title: 'Финальная проверка комплекта РД перед выдачей в монтаж',
    project_code: 'Умный дом: Квартал 4',
    section: 'СКУД',
    status: 'review',
    priority: 'urgent',
    assignee_id: 'uf-11111111-1111-1111-1111-111111111111',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Квартал4\\РД_Выпуск_Уфанет.pdf',
    description: 'Нормоконтроль спецификаций контроллеров Умного дома, электрозамков, считывателей BLE и датчиков протечки.',
    checklist: [
      { id: 'c1', text: 'Проверить кабельный журнал', done: true },
      { id: 'c2', text: 'Сверить ТУ с городскими сетями', done: true },
      { id: 'c3', text: 'Подписать титульные листы ГИПа', done: false }
    ],
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'task-uf-5',
    title: 'Выпуск рабочей документации ЭОМ узла связи',
    project_code: 'Дата-центр: Стойка 12',
    section: 'ЭОМ',
    status: 'done',
    priority: 'low',
    assignee_id: 'uf-55555555-5555-5555-5555-555555555555',
    due_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Датацентр\\ЭОМ_Стойка12_final.pdf',
    description: 'Узел принят службой эксплуатации Уфанет, кабельные трассы и щиты АВР согласованы.',
    checklist: [
      { id: 'c1', text: 'Однолинейная расчетная схема', done: true },
      { id: 'c2', text: 'Согласование службы эксплуатации', done: true }
    ],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];
