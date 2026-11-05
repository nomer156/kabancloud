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
  { id: 'backlog', title: 'Очередь / Бэклог', subtitle: 'В планах к разработке', color: '#64748b', wip_limit: 0 },
  { id: 'in_progress', title: 'В работе', subtitle: 'Текущие задачи инженеров', color: '#ff6600', wip_limit: 8 },
  { id: 'review', title: 'На проверке', subtitle: 'Проверка начальника / Согласование ЮЛ', color: '#f59e0b', wip_limit: 5 },
  { id: 'done', title: 'Готово / Выдано', subtitle: 'Выпущено в монтаж / заказчику', color: '#10b981', wip_limit: 0 }
];

export const COLUMNS = DEFAULT_COLUMNS;

// Стикеры и метки YouGile
export const DEFAULT_STICKERS = [
  { id: 'urgent', name: '🔥 Срочно', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
  { id: 'bug', name: '🐛 Замечание / Брак', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.4)' },
  { id: 'feature', name: '💡 Новое ТЗ', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
  { id: 'waiting', name: '⏳ Согласование', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
  { id: 'wip', name: '⚡ В монтаже', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
  { id: 'blocked', name: '⛔ Блокер / Стоп', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.4)' }
];

export const PRIORITIES = [
  { id: 'urgent', name: 'Срочно / Горит', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' },
  { id: 'medium', name: 'Обычный', color: '#ff7700', bg: 'rgba(255, 119, 0, 0.15)', border: 'rgba(255, 119, 0, 0.35)' },
  { id: 'low', name: 'Низкий', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' }
];

export const INITIAL_MEMBERS = [
  // 0. Главный Администратор (Admin)
  {
    id: 'uf-admin-root',
    full_name: 'admin',
    department_id: 'dept-design',
    role: 'Главный администратор системы',
    role_level: 10,
    initials: 'AD',
    avatar_color: '#ef4444',
    specialty: 'Администрирование (Полный доступ)',
    workstation_id: 'vlxproject00'
  },

  // 1. Проектировщики
  {
    id: 'uf-11111111-1111-1111-1111-111111111111',
    full_name: 'Алексей Смирнов',
    department_id: 'dept-design',
    role: 'Начальник отдела проектирования / ГИП',
    role_level: 10,
    initials: 'АС',
    avatar_color: '#ff6600',
    specialty: 'ГИП',
    workstation_id: 'vlxproject01'
  },
  {
    id: 'uf-22222222-2222-2222-2222-222222222222',
    full_name: 'Мария Воронова',
    department_id: 'dept-design',
    role: 'Ведущий инженер ВОЛС',
    role_level: 8,
    initials: 'МВ',
    avatar_color: '#ff8800',
    specialty: 'ВОЛС',
    workstation_id: 'vlxproject02'
  },
  {
    id: 'uf-33333333-3333-3333-3333-333333333333',
    full_name: 'Дмитрий Ковалёв',
    department_id: 'dept-design',
    role: 'Инженер СКС и передачи данных',
    role_level: 6,
    initials: 'ДК',
    avatar_color: '#0284c7',
    specialty: 'СКС',
    workstation_id: 'vlxproject03'
  },
  {
    id: 'uf-44444444-4444-4444-4444-444444444444',
    full_name: 'Елена Васильева',
    department_id: 'dept-design',
    role: 'Инженер видеонаблюдения и СКУД',
    role_level: 6,
    initials: 'ЕВ',
    avatar_color: '#10b981',
    specialty: 'ВН',
    workstation_id: 'vlxproject04'
  },

  // 2. Сварщики
  {
    id: 'uf-weld-1',
    full_name: 'Ильдар Басыров',
    department_id: 'dept-welders',
    role: 'Бригадир сварщиков ВОЛС',
    role_level: 10,
    initials: 'ИБ',
    avatar_color: '#f59e0b',
    specialty: 'Муфты МТОК',
    workstation_id: 'vlxproject05'
  },
  {
    id: 'uf-weld-2',
    full_name: 'Руслан Хабибов',
    department_id: 'dept-welders',
    role: 'Мастер-сварщик оптических линий',
    role_level: 8,
    initials: 'РХ',
    avatar_color: '#d97706',
    specialty: 'Сварка ОВ',
    workstation_id: 'vlxproject06'
  },
  {
    id: 'uf-weld-3',
    full_name: 'Артур Гареев',
    department_id: 'dept-welders',
    role: 'Инженер-рефлектометрист',
    role_level: 6,
    initials: 'АГ',
    avatar_color: '#f97316',
    specialty: 'Рефлектометрия',
    workstation_id: 'vlxproject07'
  },

  // 3. РСС
  {
    id: 'uf-rss-1',
    full_name: 'Михаил Ахметов',
    department_id: 'dept-rss',
    role: 'Начальник участка РСС',
    role_level: 10,
    initials: 'МА',
    avatar_color: '#0284c7',
    specialty: 'ЛКС / Эксплуатация',
    workstation_id: 'vlxproject08'
  },
  {
    id: 'uf-rss-2',
    full_name: 'Денис Фёдоров',
    department_id: 'dept-rss',
    role: 'Инженер эксплуатации сетей связи',
    role_level: 8,
    initials: 'ДФ',
    avatar_color: '#0ea5e9',
    specialty: 'Аварийная служба',
    workstation_id: 'vlxproject09'
  },
  {
    id: 'uf-rss-3',
    full_name: 'Салават Зарипов',
    department_id: 'dept-rss',
    role: 'Мастер ЛКС РСС',
    role_level: 6,
    initials: 'СЗ',
    avatar_color: '#38bdf8',
    specialty: 'Линейные сооружения',
    workstation_id: 'vlxproject10'
  },

  // 4. Отдел продаж ЮЛ (B2B)
  {
    id: 'uf-salesb2b-1',
    full_name: 'Ольга Кузнецова',
    department_id: 'dept-sales-b2b',
    role: 'Руководитель группы корпоративных продаж',
    role_level: 10,
    initials: 'ОК',
    avatar_color: '#8b5cf6',
    specialty: 'B2B Клиенты',
    workstation_id: 'vlxproject11'
  },
  {
    id: 'uf-salesb2b-2',
    full_name: 'Тимур Насыров',
    department_id: 'dept-sales-b2b',
    role: 'Ведущий менеджер корпоративного отдела',
    role_level: 8,
    initials: 'ТН',
    avatar_color: '#a855f7',
    specialty: 'Договоры ЮЛ',
    workstation_id: 'vlxproject12'
  },

  // 5. Отдел продаж ФЛ (B2C)
  {
    id: 'uf-salesb2c-1',
    full_name: 'Алина Яковлева',
    department_id: 'dept-sales-b2c',
    role: 'Старший менеджер розничных продаж',
    role_level: 10,
    initials: 'АЯ',
    avatar_color: '#10b981',
    specialty: 'B2C Клиенты',
    workstation_id: 'vlxproject13'
  },
  {
    id: 'uf-salesb2c-2',
    full_name: 'Вадим Мусин',
    department_id: 'dept-sales-b2c',
    role: 'Менеджер по подключению МКД и ЧС',
    role_level: 6,
    initials: 'ВМ',
    avatar_color: '#059669',
    specialty: 'Подключения GPON',
    workstation_id: 'vlxproject14'
  }
];

export const INITIAL_PROJECTS = [
  'ЖК «Агидель»',
  'мкр. Затон (Север)',
  'Технопарк Уфа',
  'Квартал 4 (Центр)',
  'ТЦ «Планета»'
];

// Чистый список задач для боевого использования филиалом (без тестового мусора)
export const INITIAL_TASKS = [];

// ==============================================================================
// УРОВНИ ДОСТУПА И СИСТЕМА ПРАВ (1..10)
// ==============================================================================
export const ROLE_LEVELS = [
  { level: 10, name: 'Начальник отдела / ГИП', desc: 'Полный доступ, управление правами, настройками и структурой', badgeColor: '#ef4444' },
  { level: 8, name: 'Ведущий инженер / Старший специалист', desc: 'Создание/редактирование любых задач, согласование, управление разделами', badgeColor: '#f97316' },
  { level: 6, name: 'Инженер / Специалист', desc: 'Ведение своих задач, комментирование, отметка подзадач, чат', badgeColor: '#0284c7' },
  { level: 3, name: 'Младший специалист / Стажёр', desc: 'Просмотр задач, выполнение назначенных подзадач, чат', badgeColor: '#10b981' },
  { level: 1, name: 'Наблюдатель / Гость', desc: 'Только чтение без права изменений и отправки сообщений', badgeColor: '#64748b' }
];

export const PERMISSION_DEFINITIONS = [
  { key: 'can_manage_roles', name: 'Управление уровнями доступа и правами', minLevel: 10 },
  { key: 'can_manage_board_settings', name: 'Настройки доски и отделов', minLevel: 10 },
  { key: 'can_manage_columns', name: 'Управление этапами (колонками)', minLevel: 10 },
  { key: 'can_manage_sections', name: 'Управление марками и разделами проектов', minLevel: 8 },
  { key: 'can_create_task', name: 'Создание новых задач', minLevel: 6 },
  { key: 'can_edit_all_tasks', name: 'Редактирование любых задач отдела', minLevel: 8 },
  { key: 'can_edit_own_tasks', name: 'Редактирование собственных задач', minLevel: 6 },
  { key: 'can_delete_task', name: 'Удаление задач с доски', minLevel: 8 },
  { key: 'can_move_task', name: 'Перемещение карточек по колонкам', minLevel: 6 },
  { key: 'can_assign_members', name: 'Назначение ответственных инженеров', minLevel: 8 },
  { key: 'can_chat', name: 'Отправка сообщений в чат отдела', minLevel: 3 },
  { key: 'can_export_import', name: 'Импорт из ERP и выгрузка отчетов', minLevel: 8 }
];

export const DEFAULT_PERMISSIONS = {
  10: {
    can_manage_roles: true,
    can_manage_board_settings: true,
    can_manage_columns: true,
    can_manage_sections: true,
    can_create_task: true,
    can_edit_all_tasks: true,
    can_edit_own_tasks: true,
    can_delete_task: true,
    can_move_task: true,
    can_assign_members: true,
    can_chat: true,
    can_export_import: true
  },
  8: {
    can_manage_roles: false,
    can_manage_board_settings: false,
    can_manage_columns: false,
    can_manage_sections: true,
    can_create_task: true,
    can_edit_all_tasks: true,
    can_edit_own_tasks: true,
    can_delete_task: true,
    can_move_task: true,
    can_assign_members: true,
    can_chat: true,
    can_export_import: true
  },
  6: {
    can_manage_roles: false,
    can_manage_board_settings: false,
    can_manage_columns: false,
    can_manage_sections: false,
    can_create_task: true,
    can_edit_all_tasks: false,
    can_edit_own_tasks: true,
    can_delete_task: false,
    can_move_task: true,
    can_assign_members: false,
    can_chat: true,
    can_export_import: false
  },
  3: {
    can_manage_roles: false,
    can_manage_board_settings: false,
    can_manage_columns: false,
    can_manage_sections: false,
    can_create_task: false,
    can_edit_all_tasks: false,
    can_edit_own_tasks: false,
    can_delete_task: false,
    can_move_task: false,
    can_assign_members: false,
    can_chat: true,
    can_export_import: false
  },
  1: {
    can_manage_roles: false,
    can_manage_board_settings: false,
    can_manage_columns: false,
    can_manage_sections: false,
    can_create_task: false,
    can_edit_all_tasks: false,
    can_edit_own_tasks: false,
    can_delete_task: false,
    can_move_task: false,
    can_assign_members: false,
    can_chat: false,
    can_export_import: false
  }
};

export function hasPermission(user, permKey, customPermissions = null) {
  if (!user) return false;
  const level = Number(user.role_level) || 6;
  if (level >= 10) return true;

  const matrix = customPermissions || DEFAULT_PERMISSIONS;
  const userPerms = matrix[level];
  if (userPerms && typeof userPerms[permKey] === 'boolean') {
    return userPerms[permKey];
  }
  const def = PERMISSION_DEFINITIONS.find((p) => p.key === permKey);
  if (def) return level >= def.minLevel;
  return false;
}

// Очистка и получение лаконичного шифра проекта без пробелов, кавычек и спецсимволов
export function cleanProjectCipher(val) {
  if (!val) return '';
  let str = String(val).trim();
  // Убираем русские и английские кавычки « », " ", ' ', ` `
  str = str.replace(/[«»"'`]/g, '');
  // Убираем типовые приставки: "ЖК ", "мкр. ", "ТЦ ", "ТРЦ ", "АО ", "ООО "
  str = str.replace(/^(жк|мкр\.?|тц|трц|ао|ооо|зао)\s+/i, '');
  // Убираем текст в скобках, например "(Север)", "(Центр)"
  str = str.replace(/\s*\([^)]*\)/g, '');
  // Заменяем пробелы, слэши, подчеркивания на одиночный дефис
  str = str.replace(/[\s_—–/.]+/g, '-');
  // Убираем любые недопустимые для URL символы
  str = str.replace(/[^A-Za-zА-Яа-я0-9\-]/g, '');
  // Срезаем дефисы по краям
  str = str.replace(/^-+|-+$/g, '');
  return str.toUpperCase().trim();
}

// Генерация чистого ID задачи: [МАРКА/РАЗДЕЛ].[ШИФР ПРОЕКТА] (например: ВДН.АГИДЕЛЬ или ВДН.ПР-2026-01)
export function generateTaskDisplayId(section = 'ВДН', projectCode = '', existingList = []) {
  const sec = (section || 'УФ').trim().toUpperCase().replace(/[^A-ZА-Я0-9]/gi, '') || 'УФ';
  const cipher = cleanProjectCipher(projectCode);
  const base = cipher ? `${sec}.${cipher}` : `${sec}.БШ`;

  if (!Array.isArray(existingList) || existingList.length === 0) {
    return base;
  }

  const cleanBase = base.toLowerCase();
  const exists = existingList.some(
    (t) => String(t.id || '').toLowerCase() === cleanBase || String(t.display_id || '').toLowerCase() === cleanBase
  );
  if (!exists) {
    return base;
  }

  let counter = 2;
  while (
    existingList.some(
      (t) => String(t.id || '').toLowerCase() === `${cleanBase}-${counter}` ||
             String(t.display_id || '').toLowerCase() === `${cleanBase}-${counter}`
    )
  ) {
    counter++;
  }
  return `${base}-${counter}`;
}

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
