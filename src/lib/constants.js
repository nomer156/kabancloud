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

// ==============================================================================
// СПРАВОЧНИКИ PROJECTPAY (УФАНЕТ)
// ==============================================================================

export const PROJECT_INTERNAL_CUSTOMERS = [
  { id: '17', name: 'МКД', desc: 'Новое строительство МКД, расчеты строительства' },
  { id: '18', name: 'ЧС', desc: 'Новое строительство ЧС, расчеты строительства' },
  { id: '1', name: 'ОПЮЛ', desc: 'Работы связанные с ЮЛ' },
  { id: '2', name: 'ОПФЛ', desc: 'Работы с физ лицами' },
  { id: '13', name: 'Развитие сетей', desc: 'Развитие и модернизация сетей для нужд компании' },
  { id: '6', name: 'Синтег', desc: 'Проектирование по договорам системной интеграции' },
  { id: '15', name: 'Подрядные работы', desc: 'Проектирование по договорам подряда (кроме СИНТЕГ)' },
  { id: '9', name: 'ОПОХ Уфанет', desc: 'Проектирование для нужд Уфанет (новых офисов, переездов)' },
  { id: '12', name: 'Внутренние процессы', desc: 'Обучения внутри службы, совещания, развитие службы' },
  { id: '5', name: 'Отдел внешних продаж', desc: 'Работы по заявкам от отдела экспорта и дистрибуции' },
  { id: '4', name: 'Переустройство сетей', desc: 'Переустройство сетей по требованию третьей стороны' },
  { id: '8', name: 'Аварийные работы (РСС/ЦУС)', desc: 'Аварийные работы' },
  { id: '7', name: 'Администрация', desc: 'Задачи от администрации' },
  { id: '16', name: 'Не проектирование', desc: 'Социальные акции, мероприятия, обучение ТБ, ПБ' }
];

export const PROJECT_REGIONS = [
  { id: '1', name: 'АО "Уфанет" Уфа' },
  { id: '9', name: 'АО "Уфанет" Казань' },
  { id: '2', name: 'АО "Уфанет" Оренбург' },
  { id: '4', name: 'АО "Уфанет" Нефтекамск' },
  { id: '5', name: 'АО "Уфанет" Стерлитамак' },
  { id: '6', name: 'АО "Уфанет" Салават' },
  { id: '7', name: 'АО "Уфанет" Ишимбай' },
  { id: '8', name: 'АО "Уфанет" Октябрьский' },
  { id: '3', name: 'АО "Уфанет" Орск' },
  { id: '10', name: 'АО "Уфанет" Нижний Новгород' },
  { id: '12', name: 'АО "Уфанет" Йошкар-Ола' },
  { id: '11', name: 'АО "Уфанет" Москва' },
  { id: '13', name: 'ООО "Связьоптикстрой"' },
  { id: '14', name: 'ООО "Связьстройсервис"' },
  { id: '15', name: 'Фирма Мир' }
];

export const WORK_GROUPS = [
  { id: '22', name: 'ВОЛС' },
  { id: '12', name: 'СКС, ЛВС, ТЛФ, КТВ' },
  { id: '14', name: 'СКУД' },
  { id: '13', name: 'СВН, БСПД' },
  { id: '2', name: 'ДРС сети связи' },
  { id: '4', name: 'ДРС домофон' },
  { id: '3', name: 'ДРС ЭС' },
  { id: '6', name: 'ЧС/Опоры' },
  { id: '5', name: 'Кабельная канализация' },
  { id: '1', name: 'Инженерные обследования' },
  { id: '23', name: 'Инженерное оборудование и сети (ИОС)' },
  { id: '24', name: 'Промышленное и гражданское строительство (ПГС)' },
  { id: '15', name: 'ОС, ПС, СОУЭ' },
  { id: '16', name: 'Проектные работы ОПСС' },
  { id: '8', name: 'ЭС ВЛ по опорам' },
  { id: '9', name: 'ЭС освещение' },
  { id: '10', name: 'ЭС розеточная сеть' },
  { id: '11', name: 'ЭС типового ЦК' },
  { id: '17', name: 'Сметные работы (ЛСР, ОСР, ССР)' },
  { id: '18', name: 'Сметные работы (Акты, справки, журналы)' },
  { id: '19', name: 'Сметные работы (Прочее)' },
  { id: '41', name: 'ТУ ВОЛС ОС' },
  { id: '42', name: 'ТУ ВОЛС АП' },
  { id: '43', name: 'ТУ ВОЛС прочее' },
  { id: '7', name: 'РКН' },
  { id: '21', name: 'Другие виды работ' }
];

export const WORK_ITEMS = [
  // ВОЛС
  { id: '118', groupId: '22', name: 'ВОЛС: Разработка рабочей документации строительства ВОЛС' },
  { id: '119', groupId: '22', name: 'ВОЛС: Расчета стоимости строительства ВОЛС' },
  { id: '144', groupId: '22', name: 'ВОЛС: Прочие работы кат. 1' },
  { id: '145', groupId: '22', name: 'ВОЛС: Прочие работы кат. 2' },
  { id: '146', groupId: '22', name: 'ВОЛС: Прочие работы кат. 3' },
  { id: '315', groupId: '22', name: 'ВОЛС: Работа по договорной цене' },

  // СКС, ЛВС, ТЛФ, КТВ
  { id: '56', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: РД (1-5 портов)' },
  { id: '57', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: РД (6-24 портов)' },
  { id: '58', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: РД (25-100 портов)' },
  { id: '59', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: РД (101-300 портов)' },
  { id: '60', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: Расчет стоимости строительства' },
  { id: '135', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: Прочие работы кат. 1' },
  { id: '136', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: Прочие работы кат. 2' },
  { id: '137', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: Прочие работы кат. 3' },
  { id: '312', groupId: '12', name: 'СКС, ЛВС, ТЛФ, КТВ: Работа по договорной цене' },

  // СКУД
  { id: '66', groupId: '14', name: 'СКУД: РД (1-3 точек прохода)' },
  { id: '67', groupId: '14', name: 'СКУД: РД (4-20 точек прохода)' },
  { id: '68', groupId: '14', name: 'СКУД: РД (1 шлагбаум/ ворота/турникет)' },
  { id: '69', groupId: '14', name: 'СКУД: Расчет стоимости строительства (1-3 точек)' },
  { id: '70', groupId: '14', name: 'СКУД: Расчет стоимости строительства (4-100 точек)' },
  { id: '141', groupId: '14', name: 'СКУД: Прочие работы кат. 1' },
  { id: '142', groupId: '14', name: 'СКУД: Прочие работы кат. 2' },
  { id: '143', groupId: '14', name: 'СКУД: Прочие работы кат. 3' },
  { id: '314', groupId: '14', name: 'СКУД: Работа по договорной цене' },

  // СВН, БСПД
  { id: '61', groupId: '13', name: 'СВН, БСПД: РД (1-10 портов)' },
  { id: '62', groupId: '13', name: 'СВН, БСПД: РД (11-30 портов)' },
  { id: '63', groupId: '13', name: 'СВН, БСПД: РД (31-100 портов)' },
  { id: '64', groupId: '13', name: 'СВН, БСПД: РД (101-300 портов)' },
  { id: '65', groupId: '13', name: 'СВН, БСПД: Расчет стоимости строительства' },
  { id: '132', groupId: '13', name: 'СВН, БСПД: Прочие работы кат. 1' },
  { id: '133', groupId: '13', name: 'СВН, БСПД: Прочие работы кат. 2' },
  { id: '134', groupId: '13', name: 'СВН, БСПД: Прочие работы кат. 3' },
  { id: '311', groupId: '13', name: 'СВН, БСПД: Работа по договорной цене' },

  // ДРС сети связи
  { id: '12', groupId: '2', name: 'ДРС сети связи: РД от 1 до 10 этажей' },
  { id: '13', groupId: '2', name: 'ДРС сети связи: РД от 11 до 40 этажей' },
  { id: '14', groupId: '2', name: 'ДРС сети связи: РД от 41 до 100 этажей' },
  { id: '15', groupId: '2', name: 'ДРС сети связи: Расчет строительства от 1 до 10 этажей' },
  { id: '16', groupId: '2', name: 'ДРС сети связи: Расчет строительства от 11 до 40 этажей' },
  { id: '17', groupId: '2', name: 'ДРС сети связи: Расчет строительства от 41 до 100 этажей' },
  { id: '30', groupId: '2', name: 'ДРС сети связи: Схемы для согласования на размещение оборудования' },
  { id: '38', groupId: '2', name: 'ДРС сети связи: Схема расчета уровней оптических сигналов ТВ' },
  { id: '126', groupId: '2', name: 'ДРС сети связи: Прочие работы кат. 1' },
  { id: '127', groupId: '2', name: 'ДРС сети связи: Прочие работы кат. 2' },
  { id: '128', groupId: '2', name: 'ДРС сети связи: Прочие работы кат. 3' },

  // ДРС домофон
  { id: '22', groupId: '4', name: 'ДРС домофон: РД от 1 до 3 точек прохода' },
  { id: '23', groupId: '4', name: 'ДРС домофон: РД от 4 до 10 точек прохода' },
  { id: '272', groupId: '4', name: 'ДРС домофон: РД от 4 до 40 точек прохода' },
  { id: '24', groupId: '4', name: 'ДРС домофон: Расчет строительства от 1 до 3 точек' },
  { id: '25', groupId: '4', name: 'ДРС домофон: Расчет строительства от 4 до 10 точек' },
  { id: '273', groupId: '4', name: 'ДРС домофон: Расчет строительства от 4 до 40 точек' },

  // ЧС / Опоры
  { id: '32', groupId: '6', name: 'ЧС/Опоры: Обследование с отбивкой опор для сетей PON' },
  { id: '33', groupId: '6', name: 'ЧС/Опоры: Сети связи распределительных сетей в частном секторе' },
  { id: '34', groupId: '6', name: 'ЧС/Опоры: Заполнение csv-файла' },
  { id: '35', groupId: '6', name: 'ЧС/Опоры: ШОРирование населенного пункта' },
  { id: '36', groupId: '6', name: 'ЧС/Опоры: Расчет нагрузок кабеля на опоры Типовой' },
  { id: '37', groupId: '6', name: 'ЧС/Опоры: Расчет нагрузок на каждую опору, с профилем' },
  { id: '31', groupId: '6', name: 'ЧС/Опоры: Схемы для согласования на размещение на опорах' },
  { id: '277', groupId: '6', name: 'ЧС/Опоры: Установка опор (типовая)' },
  { id: '278', groupId: '6', name: 'ЧС/Опоры: Установка опор (с топосъемкой)' },

  // Кабельная канализация
  { id: '26', groupId: '5', name: 'Кабельная канализация: РД с профилем перехода от 1 до 3 переходов' },
  { id: '27', groupId: '5', name: 'Кабельная канализация: РД с профилем перехода от 4 до 10 переходов' },
  { id: '28', groupId: '5', name: 'Кабельная канализация: РД без профиля перехода от 1 до 3 переходов' },
  { id: '29', groupId: '5', name: 'Кабельная канализация: РД без профиля перехода от 4 до 10 переходов' },

  // ТУ ВОЛС ОС
  { id: '283', groupId: '41', name: 'ТУ ВОЛС ОС: Визио: Внесение ИД в оптические схемы' },
  { id: '294', groupId: '41', name: 'ТУ ВОЛС ОС: Визио: Задание на сварку ОВ (подключение контрагента)' },
  { id: '295', groupId: '41', name: 'ТУ ВОЛС ОС: Визио: Задание на сварку ОВ (прочее)' },
  { id: '281', groupId: '41', name: 'ТУ ВОЛС ОС: Внесение ИД в схемы Ингео (модернизация)' },
  { id: '282', groupId: '41', name: 'ТУ ВОЛС ОС: Внесение ИД в схемы Ингео (новое строительство)' },
  { id: '302', groupId: '41', name: 'ТУ ВОЛС ОС: Отрисовка схемы квартала в Ингео (1-400 связей)' },
  { id: '303', groupId: '41', name: 'ТУ ВОЛС ОС: Отрисовка схемы квартала в Ингео (401-800 связей)' },

  // Другие виды работ
  { id: '114', groupId: '21', name: 'Другие виды работ: Выезд для решения вопросов по сетям с УК, ТСЖ' },
  { id: '113', groupId: '21', name: 'Другие виды работ: "Вызов представителя" решено по телефону' },
  { id: '112', groupId: '21', name: 'Другие виды работ: "Вызов представителя" с выездом на место' },
  { id: '121', groupId: '21', name: 'Другие виды работ: Оформление РД и ПД согласно норм и правил' },
  { id: '111', groupId: '21', name: 'Другие виды работ: Рассмотрение и согласование проектов сторонних организаций' },
  { id: '108', groupId: '21', name: 'Другие виды работ: Прочие работы кат. 1' },
  { id: '109', groupId: '21', name: 'Другие виды работ: Прочие работы кат. 2' },
  { id: '110', groupId: '21', name: 'Другие виды работ: Прочие работы кат. 3' },
  { id: '122', groupId: '21', name: 'Другие виды работ: Работа по договорной цене' }
];

export const KST_OPTIONS = [
  { id: '1', name: 'Полный комплект проекта (Кст=1.00)', value: 1.00 },
  { id: '2', name: 'Неполный комплект (ДРС/ЧС) (Кст=0.45)', value: 0.45 },
  { id: '3', name: 'Неполный комплект (Инж. обследования) (Кст=0.75)', value: 0.75 },
  { id: '4', name: 'ПД на отдельно стоящие объекты (ДРС/ЧС) (Кст=1.35)', value: 1.35 }
];

export const KIZM_OPTIONS = [
  { id: '1', name: 'Вновь проектируемый объект (Кизм=1.00)', value: 1.00 },
  { id: '2', name: 'Существенные изменения (менялась топология) (Кизм=0.75)', value: 0.75 },
  { id: '3', name: 'Несущественные изменения (без изменений) (Кизм=0.25)', value: 0.25 }
];

export const KSL_OPTIONS = [
  { id: '1', name: 'Стандартное оборудование, освоенные решения (Кслож=1.00)', value: 1.00 },
  { id: '2', name: 'Нестандартное оборудование (Кслож=1.10)', value: 1.10 },
  { id: '3', name: 'Наружные сети связи в кабельной канализации (Кслож=1.20)', value: 1.20 }
];


export const DEPARTMENTS = [
  {
    id: 'dept-design',
    name: 'Проектировщики',
    fullName: 'Отдел проектирования',
    icon: '📐',
    color: '#ff6600',
    desc: 'Разработка проектной и рабочей документации (ВОЛС, СВН, СКС, СКУД)'
  },
  {
    id: 'dept-welders',
    name: 'Сварщики',
    fullName: 'Сварочно-монтажный отдел',
    icon: '⚡',
    color: '#f59e0b',
    desc: 'Сварка оптических волокон, муфты, кроссы, монтаж трасс ВОЛС'
  },
  {
    id: 'dept-rss',
    name: 'РСС',
    fullName: 'Районные сети связи',
    icon: '📡',
    color: '#0284c7',
    desc: 'Эксплуатация ЛКС, устранение аварий и мониторинг абонентских сетей'
  },
  {
    id: 'dept-sales-b2b',
    name: 'Отдел продаж ЮЛ',
    fullName: 'Отдел продаж корпоративным клиентам (B2B)',
    icon: '🏢',
    color: '#8b5cf6',
    desc: 'Работа с юридическими лицами, коммерческие предложения, договоры, ТУ'
  },
  {
    id: 'dept-sales-b2c',
    name: 'Отдел продаж ФЛ',
    fullName: 'Отдел продаж физическим лицам (B2C)',
    icon: '👥',
    color: '#10b981',
    desc: 'Подключение частных клиентов, интернет, ТВ, умный дом, розничные заявки'
  }
];

export const DEFAULT_COLUMNS = [
  { id: 'backlog', title: 'Очередь / Бэклог', subtitle: 'В планах к разработке', color: '#64748b' },
  { id: 'in_progress', title: 'В работе', subtitle: 'Текущие задачи инженеров', color: '#ff6600' },
  { id: 'review', title: 'На проверке', subtitle: 'Проверка начальника / Согласование ЮЛ', color: '#f59e0b' },
  { id: 'done', title: 'Готово / Выдано', subtitle: 'Выпущено в монтаж / заказчику', color: '#10b981' }
];

export const COLUMNS = DEFAULT_COLUMNS;

export const PRIORITIES = [
  { id: 'urgent', name: 'Срочно / Горит', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' },
  { id: 'medium', name: 'Обычный', color: '#ff7700', bg: 'rgba(255, 119, 0, 0.15)', border: 'rgba(255, 119, 0, 0.35)' },
  { id: 'low', name: 'Низкий', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' }
];

export const INITIAL_MEMBERS = [
  // 1. Проектировщики
  {
    id: 'uf-11111111-1111-1111-1111-111111111111',
    full_name: 'Алексей Смирнов',
    department_id: 'dept-design',
    role: 'Начальник отдела проектирования / ГИП',
    initials: 'АС',
    avatar_color: '#ff6600',
    specialty: 'ГИП'
  },
  {
    id: 'uf-22222222-2222-2222-2222-222222222222',
    full_name: 'Мария Воронова',
    department_id: 'dept-design',
    role: 'Ведущий инженер ВОЛС',
    initials: 'МВ',
    avatar_color: '#ff8800',
    specialty: 'ВОЛС'
  },
  {
    id: 'uf-33333333-3333-3333-3333-333333333333',
    full_name: 'Дмитрий Ковалёв',
    department_id: 'dept-design',
    role: 'Инженер СКС и передачи данных',
    initials: 'ДК',
    avatar_color: '#0284c7',
    specialty: 'СКС'
  },
  {
    id: 'uf-44444444-4444-4444-4444-444444444444',
    full_name: 'Елена Васильева',
    department_id: 'dept-design',
    role: 'Инженер видеонаблюдения и СКУД',
    initials: 'ЕВ',
    avatar_color: '#10b981',
    specialty: 'ВН'
  },

  // 2. Сварщики
  {
    id: 'uf-weld-1',
    full_name: 'Ильдар Басыров',
    department_id: 'dept-welders',
    role: 'Бригадир сварщиков ВОЛС',
    initials: 'ИБ',
    avatar_color: '#f59e0b',
    specialty: 'Муфты МТОК'
  },
  {
    id: 'uf-weld-2',
    full_name: 'Руслан Хабибов',
    department_id: 'dept-welders',
    role: 'Мастер-сварщик оптических линий',
    initials: 'РХ',
    avatar_color: '#d97706',
    specialty: 'Сварка ОВ'
  },
  {
    id: 'uf-weld-3',
    full_name: 'Артур Гареев',
    department_id: 'dept-welders',
    role: 'Инженер-рефлектометрист',
    initials: 'АГ',
    avatar_color: '#f97316',
    specialty: 'Рефлектометрия'
  },

  // 3. РСС
  {
    id: 'uf-rss-1',
    full_name: 'Михаил Ахметов',
    department_id: 'dept-rss',
    role: 'Начальник участка РСС',
    initials: 'МА',
    avatar_color: '#0284c7',
    specialty: 'ЛКС / Эксплуатация'
  },
  {
    id: 'uf-rss-2',
    full_name: 'Денис Фёдоров',
    department_id: 'dept-rss',
    role: 'Инженер эксплуатации сетей связи',
    initials: 'ДФ',
    avatar_color: '#0ea5e9',
    specialty: 'Аварийная служба'
  },
  {
    id: 'uf-rss-3',
    full_name: 'Салават Зарипов',
    department_id: 'dept-rss',
    role: 'Мастер ЛКС РСС',
    initials: 'СЗ',
    avatar_color: '#38bdf8',
    specialty: 'Линейные сооружения'
  },

  // 4. Отдел продаж ЮЛ (B2B)
  {
    id: 'uf-salesb2b-1',
    full_name: 'Ольга Кузнецова',
    department_id: 'dept-sales-b2b',
    role: 'Руководитель группы корпоративных продаж',
    initials: 'ОК',
    avatar_color: '#8b5cf6',
    specialty: 'B2B Клиенты'
  },
  {
    id: 'uf-salesb2b-2',
    full_name: 'Тимур Насыров',
    department_id: 'dept-sales-b2b',
    role: 'Ведущий менеджер корпоративного отдела',
    initials: 'ТН',
    avatar_color: '#a855f7',
    specialty: 'Договоры ЮЛ'
  },

  // 5. Отдел продаж ФЛ (B2C)
  {
    id: 'uf-salesb2c-1',
    full_name: 'Алина Яковлева',
    department_id: 'dept-sales-b2c',
    role: 'Старший менеджер розничных продаж',
    initials: 'АЯ',
    avatar_color: '#10b981',
    specialty: 'B2C Клиенты'
  },
  {
    id: 'uf-salesb2c-2',
    full_name: 'Вадим Мусин',
    department_id: 'dept-sales-b2c',
    role: 'Менеджер по подключению МКД и ЧС',
    initials: 'ВМ',
    avatar_color: '#059669',
    specialty: 'Подключения GPON'
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
  // 1. Проектировщики
  {
    id: 'task-uf-1',
    title: 'Трассировка кабельной канализации связи ККС',
    department_id: 'dept-design',
    project_code: 'мкр. Затон (Север)',
    section: 'ККС',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'uf-22222222-2222-2222-2222-222222222222',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Затон\\Трасса_ККС.dwg',
    description: 'Согласовать проход 4-отверстной трубы с городскими коммуникациями (водоканал, теплосети).',
    checklist: [
      { id: 'c1', text: 'Запросить топосъемку 1:500', done: true, assignee_id: 'uf-22222222-2222-2222-2222-222222222222' },
      { id: 'c2', text: 'План расстановки колодцев ККС-2 и ККС-3', done: true, assignee_id: 'uf-22222222-2222-2222-2222-222222222222' },
      { id: 'c3', text: 'Согласовать пересечения с водопроводом', done: false, assignee_id: 'uf-11111111-1111-1111-1111-111111111111' }
    ],
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
    department_id: 'dept-design',
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
    department_id: 'dept-design',
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

  // 2. Сварщики
  {
    id: 'task-uf-w1',
    title: 'Монтаж оптической муфты МТОК и сварка 48 ОВ на магистрали',
    department_id: 'dept-welders',
    project_code: 'мкр. Затон (Север)',
    section: 'ККС',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'uf-weld-1',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    network_link: '\\\\ufanet-server\\projects\\Сварка\\Затон_МТОК_12.dwg',
    description: 'Разварка распределительного кабеля в колодце ККС №14. Контроль коэффициента затухания на 1310/1550 нм.',
    checklist: [
      { id: 'cw1', text: 'Вскрытие и вентиляция колодца ККС', done: true },
      { id: 'cw2', text: 'Сварка 48 ОВ в кассетах муфты МТОК', done: true },
      { id: 'cw3', text: 'Герметизация муфты термоусадкой', done: false }
    ],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'task-uf-w2',
    title: 'Паспортизация и рефлектометрия волокон ЖК «Северный»',
    department_id: 'dept-welders',
    project_code: 'ЖК «Агидель»',
    section: 'ОДРС',
    status: 'backlog',
    priority: 'medium',
    assignee_id: 'uf-weld-3',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    description: 'Снятие рефлектограмм по трассе от кросса ODF до оптических розеток в подъездах. Составление паспорта трассы.',
    checklist: [
      { id: 'cw4', text: 'Калибровка оптического рефлектометра', done: false },
      { id: 'cw5', text: 'Замеры оптических линий 96 ОВ', done: false }
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },

  // 3. РСС
  {
    id: 'task-uf-r1',
    title: 'Устранение затухания оптического волокна на участке Технопарк',
    department_id: 'dept-rss',
    project_code: 'Технопарк Уфа',
    section: 'ККС',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'uf-rss-2',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    description: 'Аварийная заявка от ЦУС: скачок затухания на волокне №7 (+3.4 дБ). Проверить переходные пигтейлы в кроссе.',
    checklist: [
      { id: 'cr1', text: 'Локализация места повреждения по рефлектометру', done: true },
      { id: 'cr2', text: 'Замена оптического адаптера SC/APC', done: true },
      { id: 'cr3', text: 'Контрольный тест пропускной способности', done: false }
    ],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'task-uf-r2',
    title: 'Плановое ТО шкафов связи и замена резервных АКБ',
    department_id: 'dept-rss',
    project_code: 'Квартал 4 (Центр)',
    section: 'ЭОМ',
    status: 'backlog',
    priority: 'low',
    assignee_id: 'uf-rss-3',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    description: 'Проверка систем охлаждения, чистка фильтров и замена 4 аккумуляторов ИБП 12В 17Ач.',
    checklist: [
      { id: 'cr4', text: 'Осмотр состояния кабельных вводов', done: false },
      { id: 'cr5', text: 'Тест перехода на резервное питание', done: false }
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },

  // 4. Отдел продаж ЮЛ (B2B)
  {
    id: 'task-uf-sb1',
    title: 'Согласование КП на 1 Гбит/с и 16 камер для БЦ «Салават»',
    department_id: 'dept-sales-b2b',
    project_code: 'ТЦ «Планета»',
    section: 'ВДН',
    status: 'review',
    priority: 'urgent',
    assignee_id: 'uf-salesb2b-1',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    description: 'Подготовить расчет окупаемости и договор аренды волокон. Запросить у проектировщиков расчет трассы подключения.',
    checklist: [
      { id: 'csb1', text: 'Запрос ТУ у отдела проектирования', done: true },
      { id: 'csb2', text: 'Формирование коммерческого предложения', done: true },
      { id: 'csb3', text: 'Встреча с генеральным директором БЦ', done: false }
    ],
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'task-uf-sb2',
    title: 'Подготовка договора и ТУ на подключение ТЦ «Планета»',
    department_id: 'dept-sales-b2b',
    project_code: 'ТЦ «Планета»',
    section: 'МКЖ',
    status: 'in_progress',
    priority: 'medium',
    assignee_id: 'uf-salesb2b-2',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    description: 'Организация выделенного оптического ввода для якорных арендаторов.',
    checklist: [
      { id: 'csb4', text: 'Сверка схемы расположения павильонов', done: true },
      { id: 'csb5', text: 'Согласование юридических условий', done: false }
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },

  // 5. Отдел продаж ФЛ (B2C)
  {
    id: 'task-uf-sc1',
    title: 'Сбор предзаказов на GPON в частном секторе (120 коттеджей)',
    department_id: 'dept-sales-b2c',
    project_code: 'мкр. Затон (Север)',
    section: 'ЧС',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'uf-salesb2c-1',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    description: 'Поквартирный/подомовой обход ул. Озерная и Речная. Собрано 74 заявки на интернет + умный домофон.',
    checklist: [
      { id: 'csc1', text: 'Расклейка информационных стендов', done: true },
      { id: 'csc2', text: 'Сбор контактов старших по улицам', done: true },
      { id: 'csc3', text: 'Передача списка домов в проектирование', done: false }
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'task-uf-sc2',
    title: 'Заявка на умную домофонию ТСЖ «Агидель-3» (240 квартир)',
    department_id: 'dept-sales-b2c',
    project_code: 'ЖК «Агидель»',
    section: 'СКУД',
    status: 'review',
    priority: 'medium',
    assignee_id: 'uf-salesb2c-2',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    description: 'Проведено голосование собственников, кворум 78% за замену старых трубок на приложение Уфанет.',
    checklist: [
      { id: 'csc4', text: 'Проверка протокола общего собрания', done: true },
      { id: 'csc5', text: 'Заказ вызывных панелей на склад', done: false }
    ],
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  }
];


// Helper to format long folder paths to show the tail (e.g. "...\Folder\Subfolder")
export function formatPathEnd(path, maxLength = 26) {
  if (!path) return '';
  const str = String(path).trim();
  if (str.length <= maxLength) return str;
  const cutIndex = str.length - (maxLength - 3);
  const slashPos = str.indexOf('\\', cutIndex);
  const fwdPos = str.indexOf('/', cutIndex);
  const bestPos = slashPos !== -1 ? slashPos : fwdPos;
  if (bestPos !== -1 && (bestPos - cutIndex) < 12) {
    return '...\\' + str.slice(bestPos + 1);
  }
  return '...' + str.slice(cutIndex);
}
