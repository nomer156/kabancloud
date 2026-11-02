// ==============================================================================
// УФАНЕТ • Автономный симулятор агентов (Проектировщики, Сварщики, Монтажники)
// Симуляция тестирования доски согласно регламентам компании АО «Уфанет»
// ==============================================================================

const http = require('http');

const API_HOST = process.env.KABAN_HOST || '127.0.0.1';
const API_PORT = process.env.PORT || 3000;

function apiRequest(method, path, body = null, userId = 'uf-admin-root') {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'authorization': `Bearer ${userId}`,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({ raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runSwarmSimulation() {
  console.log('\n🚀 Запуск агентного тестирования корпоративной доски Уфанет...');
  console.log('------------------------------------------------------------------------');

  // 1. Fetch current members to get their IDs
  const members = await apiRequest('GET', '/api/members');
  const designer = members.find(m => m.department_id === 'dept-design' && m.role_level >= 8) || members[0];
  const welder = members.find(m => m.department_id === 'dept-welders') || members[1];
  const installer = members.find(m => m.department_id === 'dept-rss') || members[2];
  const adminUser = members.find(m => m.full_name?.toLowerCase() === 'admin' || m.role_level >= 10) || members[0];

  console.log(`👤 Агент-Проектировщик: ${designer.full_name} (${designer.role})`);
  console.log(`⚡ Агент-Сварщик:      ${welder.full_name} (${welder.role})`);
  console.log(`🛠️ Агент-Монтажник:    ${installer.full_name} (${installer.role})`);
  console.log(`👑 Агент-ГИП/Админ:     ${adminUser.full_name} (${adminUser.role})`);
  console.log('------------------------------------------------------------------------\n');

  // STEP 1: ПРОЕКТИРОВЩИКИ СОЗДАЮТ ЗАДАЧИ ПО ВЫЕЗДАМ
  console.log('📍 [ЭТАП 1] Проектировщики формируют задачи выездов на объекты...');
  
  // Задача 1: Выезд к ЮЛ (B2B)
  const taskB2B = await apiRequest('POST', '/api/tasks', {
    title: 'Выезд на осмотр к ЮЛ: ТЦ «Планета» (Подключение оптического ввода 10G)',
    description: 'Обследование кабельных вводов в здание, натурный осмотр серверной на 3 этаже, согласование трассы по лоткам с главным инженером ТЦ.',
    status: 'in_progress',
    priority: 'urgent',
    section: 'ВДН',
    project_code: 'ТЦ «Планета»',
    department_id: 'dept-design',
    assignee_id: designer.id,
    participant_ids: [welder.id, installer.id],
    internal_customer: 'ОПЮЛ (Юридические лица)',
    work_type: 'Обследование объекта / выезд',
    subtasks: [
      { id: 'sub-1', title: 'Натурный выезд и фотофиксация кабельного ввода', completed: true },
      { id: 'sub-2', title: 'Согласование кабельной трассы с УК ТЦ «Планета»', completed: true },
      { id: 'sub-3', title: 'Формирование Заявки на сварку волокна (ЗС-2041)', completed: false }
    ],
    comments: [
      {
        id: 'c-1',
        author: designer.full_name,
        author_avatar: designer.avatar_color,
        text: 'Выезд на объект завершен. Трасса согласована без замечаний. Формирую ЗС для бригады сварщиков.',
        created_at: new Date().toISOString()
      }
    ]
  }, designer.id);
  console.log(`✓ Создана задача ЮЛ: [${taskB2B.display_id || taskB2B.id}] ${taskB2B.title}`);
  await sleep(400);

  // Задача 2: Выезд на МКЖД
  const taskMKD = await apiRequest('POST', '/api/tasks', {
    title: 'Обследование МКЖД: ЖК «Агидель» (д. 14, 4 подъезда, Умный дом)',
    description: 'Осмотр существующих стояков слаботочных сетей, подвального ввода и чердака. Проектирование сети IP-домофонии и камер видеонаблюдения.',
    status: 'in_progress',
    priority: 'high',
    section: 'МКЖ',
    project_code: 'ЖК «Агидель»',
    department_id: 'dept-design',
    assignee_id: designer.id,
    participant_ids: [installer.id],
    internal_customer: 'МКД (Многоквартирные дома)',
    work_type: 'Разработка проектной документации',
    subtasks: [
      { id: 'sub-mkd-1', title: 'Осмотр стояков 1-4 подъездов', completed: true },
      { id: 'sub-mkd-2', title: 'Разработка схемы установки 8 IP-камер СВН', completed: false }
    ],
    comments: []
  }, designer.id);
  console.log(`✓ Создана задача МКЖД: [${taskMKD.display_id || taskMKD.id}] ${taskMKD.title}`);
  await sleep(400);

  // Задача 3: Выезд в Частный сектор (ЧС / GPON)
  const taskGPON = await apiRequest('POST', '/api/tasks', {
    title: 'Выезд в ЧС: пос. Нагаево (модернизация GPON, 120 опор ВЛ-0.4кВ)',
    description: 'Натурный осмотр трассы по опорам освещения, проверка габаритов провисания кабеля, определение мест установки сплиттерных шкафов.',
    status: 'backlog',
    priority: 'normal',
    section: 'ЧС',
    project_code: 'Квартал 4 (Центр)',
    department_id: 'dept-design',
    assignee_id: designer.id,
    participant_ids: [welder.id, installer.id],
    internal_customer: 'ЧС (Частный сектор)',
    work_type: 'Обследование объекта / выезд',
    subtasks: [
      { id: 'sub-cs-1', title: 'Осмотр опор №1 - №120 в пос. Нагаево', completed: false }
    ],
    comments: []
  }, designer.id);
  console.log(`✓ Создана задача ЧС: [${taskGPON.display_id || taskGPON.id}] ${taskGPON.title}`);
  await sleep(500);

  // STEP 2: МОНТАЖНИКИ РСС ВЫПОЛНЯЮТ МОНТАЖНЫЕ РАБОТЫ
  console.log('\n🔨 [ЭТАП 2] Монтажники выходят на трассу и монтируют по проектам...');
  const taskMounting = await apiRequest('POST', '/api/tasks', {
    title: `СМР по проекту ${taskB2B.display_id || 'ВДН.2041'}: Прокладка ВОЛС 48 ОВ в ККС`,
    description: `Строительно-монтажные работы строго по проектной трассе от колодца ККС №42 до распределительного узла ТЦ «Планета». Длина трассы: 460 метров.`,
    status: 'in_progress',
    priority: 'urgent',
    section: 'ККС',
    project_code: 'ТЦ «Планета»',
    department_id: 'dept-rss',
    assignee_id: installer.id,
    participant_ids: [designer.id, welder.id],
    internal_customer: 'ОПЮЛ (Юридические лица)',
    work_type: 'Выпуск в печать и монтаж',
    subtasks: [
      { id: 'sub-m-1', title: 'Протяжка кабеля в кабельной канализации (460 м)', completed: true },
      { id: 'sub-m-2', title: 'Заводка кабеля в серверную ТЦ и маркировка', completed: true },
      { id: 'sub-m-3', title: 'Передача кабеля сварщикам по ЗС-2041', completed: true }
    ],
    comments: [
      {
        id: 'c-m1',
        author: installer.full_name,
        author_avatar: installer.avatar_color,
        text: `@${designer.full_name} Монтажные работы по проекту выполнены! Кабель ДПС-48 успешно затянут в ККС, запас в 15 метров уложен в колодце №44. Передаем на сварку бригаде @${welder.full_name}.`,
        created_at: new Date().toISOString()
      }
    ]
  }, installer.id);
  console.log(`✓ Монтажники завершили протяжку: [${taskMounting.display_id || taskMounting.id}] ${taskMounting.title}`);
  await sleep(400);

  // STEP 3: СВАРЩИКИ ВАРЯТ ВОЛОКНО ПО ЗС
  console.log('\n⚡ [ЭТАП 3] Сварщики ВОЛС варят волокно по ЗС и снимают рефлектограммы...');
  const taskWelding = await apiRequest('POST', '/api/tasks', {
    title: `Сварка муфты МТОК-12 по ЗС-2041 (Объект: ТЦ «Планета»)`,
    description: `Сварка 48 оптических волокон кабеля ДПС-48 в оптической муфте МТОК-12 на вводе в ТЦ «Планета». Измерение затуханий оптическим рефлектометром на 1310/1550 нм.`,
    status: 'review',
    priority: 'urgent',
    section: 'ОДРС',
    project_code: 'ТЦ «Планета»',
    department_id: 'dept-welders',
    assignee_id: welder.id,
    participant_ids: [designer.id, installer.id],
    internal_customer: 'ОПЮЛ (Юридические лица)',
    work_type: 'Рабочая документация (РД)',
    subtasks: [
      { id: 'sub-w-1', title: 'Разделка оптического кабеля и подготовка кассеты', completed: true },
      { id: 'sub-w-2', title: 'Прецизионная сварка 48 волокон (затухание < 0.02 дБ)', completed: true },
      { id: 'sub-w-3', title: 'Измерение рефлектометром OTDR и составление паспорта муфты', completed: true }
    ],
    comments: [
      {
        id: 'c-w1',
        author: welder.full_name,
        author_avatar: welder.avatar_color,
        text: `Заявка на сварку ЗС-2041 выполнена в полном объеме! Сварено 48 ОВ в муфте МТОК-12. Максимальное затухание в стыке 0.016 дБ. Рефлектограмма чистая, линия передана на проверку ГИПу @${adminUser.full_name}.`,
        created_at: new Date().toISOString()
      }
    ]
  }, welder.id);
  console.log(`✓ Сварщики сварили муфту по ЗС: [${taskWelding.display_id || taskWelding.id}] ${taskWelding.title}`);
  await sleep(400);

  // STEP 4: ГИП И НАЧАЛЬНИК ПРОВЕРЯЮТ И ПЕРЕВОДЯТ В «ГОТОВО»
  console.log('\n👑 [ЭТАП 4] ГИП принимает работы и переводит задачу в «Готово / Выдано»...');
  await apiRequest('PATCH', `/api/tasks/${taskWelding.id}/status`, { status: 'done' }, adminUser.id);
  await apiRequest('PATCH', `/api/tasks/${taskMounting.id}/status`, { status: 'done' }, adminUser.id);

  // Send a message in company chat
  await apiRequest('POST', '/api/chats/dept-all', {
    text: `🎉 Задача #[${taskWelding.display_id || 'ОДРС.2041'}: Сварка муфты по ЗС-2041] успешно принята ГИПом и переведена в «Готово»! Объект ТЦ «Планета» подключен к оптической сети Уфанет.`,
    quoted_task: {
      id: taskWelding.id,
      display_id: taskWelding.display_id || 'ОДРС.2041',
      title: taskWelding.title,
      status: 'done',
      section: 'ОДРС'
    }
  }, adminUser.id);

  console.log('✓ Задачи успешно проверены, согласованы и переведены в статус «Готово / Выдано»!');
  console.log('✓ Сообщение о готовности отправлено в корпоративный чат компании.');
  console.log('\n🎉 Тестирование доски агентным роем Уфанет завершено на 100%!');
}

runSwarmSimulation().catch(err => {
  console.error('Ошибка симуляции:', err);
  process.exit(1);
});
