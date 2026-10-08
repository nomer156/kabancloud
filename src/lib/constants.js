export const SECTIONS = [
  { id: 'АР', name: 'АР (Архитектура)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
  { id: 'КР', name: 'КР (Конструкции)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
  { id: 'ОВ', name: 'ОВ (Отопление/Вент)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' },
  { id: 'ВК', name: 'ВК (Водоснабжение)', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' },
  { id: 'ЭОМ', name: 'ЭОМ (Электрика)', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' },
  { id: 'ГП', name: 'ГП (Генплан)', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)' },
  { id: 'ППО', name: 'ППО (Полоса отвода)', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.3)' },
  { id: 'ПОС', name: 'ПОС (Орг. стройки)', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', border: 'rgba(100, 116, 139, 0.3)' }
];

export const COLUMNS = [
  { id: 'backlog', title: 'Очередь / Бэклог', subtitle: 'В планах к разработке', color: '#64748b' },
  { id: 'in_progress', title: 'В работе', subtitle: 'Текущие задачи отдела', color: '#3b82f6' },
  { id: 'review', title: 'На проверке (ГИП)', subtitle: 'Нормоконтроль и согласование', color: '#f59e0b' },
  { id: 'done', title: 'Готово / Выдано', subtitle: 'Выпущено заказчику / экспертизе', color: '#10b981' }
];

export const PRIORITIES = [
  { id: 'urgent', name: 'Срочно / Горит', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
  { id: 'medium', name: 'Обычный', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
  { id: 'low', name: 'Низкий', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' }
];

export const INITIAL_MEMBERS = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    full_name: 'Алексей Смирнов',
    role: 'ГИП (Главный инженер)',
    initials: 'АС',
    avatar_color: '#3b82f6',
    specialty: 'ГИП'
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    full_name: 'Мария Воронова',
    role: 'Ведущий архитектор',
    initials: 'МВ',
    avatar_color: '#10b981',
    specialty: 'АР'
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    full_name: 'Дмитрий Ковалёв',
    role: 'Инженер-конструктор',
    initials: 'ДК',
    avatar_color: '#6366f1',
    specialty: 'КР'
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    full_name: 'Елена Васильева',
    role: 'Инженер ОВ (Отопление/Вент)',
    initials: 'ЕВ',
    avatar_color: '#f59e0b',
    specialty: 'ОВ'
  },
  {
    id: 'a5555555-5555-5555-5555-555555555555',
    full_name: 'Сергей Морозов',
    role: 'Инженер ВК (Водопровод/Канализация)',
    initials: 'СМ',
    avatar_color: '#06b6d4',
    specialty: 'ВК'
  },
  {
    id: 'a6666666-6666-6666-6666-666666666666',
    full_name: 'Антон Кузнецов',
    role: 'Инженер ЭОМ (Электроснабжение)',
    initials: 'АК',
    avatar_color: '#8b5cf6',
    specialty: 'ЭОМ'
  }
];

export const INITIAL_PROJECTS = [
  'ЖК «Северный парк»',
  'БЦ «Атлант»',
  'Школа на 825 мест',
  'Технопарк «Восток»'
];

export const INITIAL_TASKS = [
  {
    id: 'task-1',
    title: 'Согласовать планировки типового этажа с заказчиком',
    project_code: 'ЖК «Северный парк»',
    section: 'АР',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'a2222222-2222-2222-2222-222222222222',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\server\\projects\\Северный_Парк\\АР\\Планы_типовые.rvt',
    description: 'Учесть замечания по расположению лифтовых холлов, эвакуационных выходов и мусоропровода.',
    checklist: [
      { id: 'c1', text: 'Внести правки по входным тамбурам', done: true },
      { id: 'c2', text: 'Экспортировать в PDF альбом планировок', done: true },
      { id: 'c3', text: 'Отправить на проверку ГИПу', done: false }
    ],
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'task-2',
    title: 'Расчет и армирование фундаментной плиты секции 2',
    project_code: 'ЖК «Северный парк»',
    section: 'КР',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'a3333333-3333-3333-3333-333333333333',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\server\\projects\\Северный_Парк\\КР\\Расчет_Лира.lir',
    description: 'Сверить нагрузки с геологическим отчетом по скважинам 14-18. Коэффициент надежности по грунту 1.2.',
    checklist: [
      { id: 'c1', text: 'Сбор нагрузок от колонн и пилонов', done: true },
      { id: 'c2', text: 'Расчет в Лира-САПР', done: true },
      { id: 'c3', text: 'Оформить спецификацию арматуры А500С', done: false }
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'task-3',
    title: 'Трассировка магистральных воздуховодов в подвале',
    project_code: 'БЦ «Атлант»',
    section: 'ОВ',
    status: 'backlog',
    priority: 'medium',
    assignee_id: 'a4444444-4444-4444-4444-444444444444',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\server\\projects\\Атлант\\ОВ\\Схема_Вент.dwg',
    description: 'Увязать габариты прямоугольных коробов с кабельными лотками ЭОМ и балками КР.',
    checklist: [
      { id: 'c1', text: 'Запросить точки ввода у ВК и ЭОМ', done: false },
      { id: 'c2', text: 'План разводки по осям 1-12', done: false },
      { id: 'c3', text: 'Сечения в стесненных местах', done: false }
    ],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'task-4',
    title: 'Финальная проверка комплекта АР перед экспертизой',
    project_code: 'Школа на 825 мест',
    section: 'АР',
    status: 'review',
    priority: 'urgent',
    assignee_id: 'a1111111-1111-1111-1111-111111111111',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\server\\projects\\Школа_825\\Выдача_v2.pdf',
    description: 'Нормоконтроль спецификаций дверей, витражей, ведомостей отделки и доступности для МГН.',
    checklist: [
      { id: 'c1', text: 'Проверить штампы и подписи разработчиков', done: true },
      { id: 'c2', text: 'Сверить спецификацию окон со смежниками', done: true },
      { id: 'c3', text: 'Подписать титульный лист', done: false }
    ],
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'task-5',
    title: 'Выпуск рабочей документации ВК по водомерному узлу',
    project_code: 'Школа на 825 мест',
    section: 'ВК',
    status: 'done',
    priority: 'low',
    assignee_id: 'a5555555-5555-5555-5555-555555555555',
    due_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\server\\projects\\Школа_825\\ВК\\Водомерный_узел_final.pdf',
    description: 'Согласовано с городским водоканалом, все замечания от 12 числа устранены.',
    checklist: [
      { id: 'c1', text: 'Спецификация счетчиков и задвижек', done: true },
      { id: 'c2', text: 'Получена подпись Водоканала', done: true }
    ],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'task-6',
    title: 'Расчет электрических нагрузок и кабельных трасс ВРУ',
    project_code: 'Технопарк «Восток»',
    section: 'ЭОМ',
    status: 'backlog',
    priority: 'medium',
    assignee_id: 'a6666666-6666-6666-6666-666666666666',
    due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\server\\projects\\Технопарк\\ЭОМ\\Расчет_Нагрузок.xlsx',
    description: 'Определить категорию надежности электроснабжения для серверных помещений и лабораторий.',
    checklist: [
      { id: 'c1', text: 'Запросить мощности технологического оборудования', done: false },
      { id: 'c2', text: 'Расчет коэффициента спроса', done: false }
    ],
    created_at: new Date().toISOString()
  }
];
