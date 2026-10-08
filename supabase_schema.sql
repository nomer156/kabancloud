-- ==============================================================================
-- Kaban Pro: Supabase Schema & Initial Data
-- Скопируйте и выполните этот скрипт в Supabase SQL Editor
-- ==============================================================================

-- 1. Таблица профилей участников команды (6 проектировщиков)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  initials TEXT NOT NULL,
  email TEXT,
  avatar_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Таблица проектов / объектов
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'РД',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Таблица задач
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  project_code TEXT,
  section TEXT NOT NULL DEFAULT 'АР', -- АР, КР, ОВ, ВК, ЭОМ, ГП, etc.
  status TEXT NOT NULL DEFAULT 'backlog', -- backlog, in_progress, review, done
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, urgent
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  network_link TEXT,
  description TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Включение Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Политики для анонимного и авторизованного доступа (открытый доступ для внутреннего отдела)
CREATE POLICY "Allow public all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- 5. Включение Realtime для таблицы tasks
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- 6. Заполнение начальными данными команды (6 проектировщиков)
INSERT INTO public.profiles (id, full_name, role, initials, avatar_color)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Алексей Смирнов', 'ГИП (Главный инженер)', 'АС', '#3b82f6'),
  ('a2222222-2222-2222-2222-222222222222', 'Мария Воронова', 'Ведущий архитектор (АР)', 'МВ', '#10b981'),
  ('a3333333-3333-3333-3333-333333333333', 'Дмитрий Ковалёв', 'Инженер-конструктор (КР)', 'ДК', '#6366f1'),
  ('a4444444-4444-4444-4444-444444444444', 'Елена Васильева', 'Инженер ОВ (Отопление и вентиляция)', 'ЕВ', '#f59e0b'),
  ('a5555555-5555-5555-5555-555555555555', 'Сергей Морозов', 'Инженер ВК (Водопровод и канализация)', 'СМ', '#06b6d4'),
  ('a6666666-6666-6666-6666-666666666666', 'Антон Кузнецов', 'Инженер ЭОМ (Электроснабжение)', 'АК', '#8b5cf6')
ON CONFLICT (id) DO NOTHING;

-- 7. Проекты по умолчанию
INSERT INTO public.projects (code, title, stage)
VALUES
  ('ЖК «Северный парк»', 'Жилой комплекс переменной этажности (Корпус 1-3)', 'РД'),
  ('БЦ «Атлант»', 'Административно-деловой центр класса А', 'Стадия П'),
  ('Школа на 825 мест', 'Общеобразовательное учреждение в мкр. Солнечный', 'Экспертиза')
ON CONFLICT (code) DO NOTHING;

-- 8. Пример стартовых задач
INSERT INTO public.tasks (title, project_code, section, status, priority, assignee_id, due_date, network_link, description, checklist)
VALUES
  (
    'Согласовать планировки типового этажа с заказчиком',
    'ЖК «Северный парк»',
    'АР',
    'in_progress',
    'urgent',
    'a2222222-2222-2222-2222-222222222222',
    CURRENT_DATE + INTERVAL '2 day',
    '\\\\server\\projects\\Северный_Парк\\АР\\Планы_типовые.rvt',
    'Учесть замечания по расположению лифтовых холлов и мусоропровода.',
    '[{"id":"c1","text":"Внести правки по тамбурам","done":true},{"id":"c2","text":"Экспортировать в PDF для ГИПа","done":false},{"id":"c3","text":"Отправить в Экспертизу","done":false}]'::jsonb
  ),
  (
    'Расчет фундаментной плиты секции 2',
    'ЖК «Северный парк»',
    'КР',
    'in_progress',
    'urgent',
    'a3333333-3333-3333-3333-333333333333',
    CURRENT_DATE + INTERVAL '4 day',
    '\\\\server\\projects\\Северный_Парк\\КР\\Расчет_Лира.lir',
    'Сверить нагрузки с геодезическими изысканиями по скважинам 14-18.',
    '[{"id":"c1","text":"Сбор нагрузок от колонн","done":true},{"id":"c2","text":"Армирование плиты в Лире","done":true},{"id":"c3","text":"Оформить пояснительную записку","done":false}]'::jsonb
  ),
  (
    'Трассировка магистральных воздуховодов в подвале',
    'БЦ «Атлант»',
    'ОВ',
    'backlog',
    'medium',
    'a4444444-4444-4444-4444-444444444444',
    CURRENT_DATE + INTERVAL '7 day',
    '\\\\server\\projects\\Атлант\\ОВ\\Схема_Вент.dwg',
    'Увязать габариты коробов с кабельными лотками ЭОМ.',
    '[{"id":"c1","text":"Запросить точки ввода у ВК и ЭОМ","done":false},{"id":"c2","text":"План разводки по осям 1-12","done":false}]'::jsonb
  ),
  (
    'Финальная проверка комплекта АР перед выдачей заказчику',
    'Школа на 825 мест',
    'АР',
    'review',
    'urgent',
    'a1111111-1111-1111-1111-111111111111',
    CURRENT_DATE + INTERVAL '1 day',
    '\\\\server\\projects\\Школа_825\\Выдача_v2.pdf',
    'Нормоконтроль спецификаций дверей и ведомостей отделки.',
    '[{"id":"c1","text":"Проверить штампы и подписи","done":true},{"id":"c2","text":"Сверить спецификацию окон","done":true},{"id":"c3","text":"Подписать титульный лист","done":false}]'::jsonb
  ),
  (
    'Выпуск рабочей документации ВК по водомерному узлу',
    'Школа на 825 мест',
    'ВК',
    'done',
    'low',
    'a5555555-5555-5555-5555-555555555555',
    CURRENT_DATE - INTERVAL '1 day',
    '\\\\server\\projects\\Школа_825\\ВК\\Водомерный_узел_final.pdf',
    'Согласовано с городским водоканалом, замечания устранены.',
    '[{"id":"c1","text":"Спецификация счетчиков","done":true},{"id":"c2","text":"Подпись Водоканала","done":true}]'::jsonb
  );
