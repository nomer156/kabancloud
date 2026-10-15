// ==UserScript==
// @name         ProjectPay (Уфанет) • Автозаполнение из Kaban2 (v3.0 Финал)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Автозаполнение ВСЕХ полей ProjectPay (Уфанет) из Kaban2: Название, Шифр, Код, Регион, Вид работ, Часы Тфакт, ERP, Коэфф., Примечание
// @author       Kaban2
// @match        https://pp.core.ufanet.ru/works/*
// @match        https://pp.core.ufanet.ru/works/new*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Kaban2 -> ProjectPay v3.0] Скрипт инициализирован на странице', window.location.href);

    // Вспомогательная пауза
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Установка значения в нативный Input с вызовом React-событий
    function setNativeInputValue(element, value) {
        if (!element) return false;
        try {
            element.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (nativeSetter) {
                nativeSetter.call(element, value);
            } else {
                element.value = value;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            return true;
        } catch (e) {
            console.warn('[ProjectPay Autofill] Ошибка установки значения input:', e);
            return false;
        }
    }

    // Установка значения в нативный TextArea
    function setNativeTextareaValue(element, value) {
        if (!element) return false;
        try {
            element.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
            if (nativeSetter) {
                nativeSetter.call(element, value);
            } else {
                element.value = value;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            return true;
        } catch (e) {
            console.warn('[ProjectPay Autofill] Ошибка установки значения textarea:', e);
            return false;
        }
    }

    // Установка значения в нативный Select (Django форма)
    function setNativeSelectValue(element, value) {
        if (!element) return false;
        try {
            element.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
            if (nativeSetter) {
                nativeSetter.call(element, value);
            } else {
                element.value = value;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            return true;
        } catch (e) {
            return false;
        }
    }

    // Интеллектуальный выбор опции в выпадающем списке Ant Design
    async function selectAntdOption(selectContainer, candidates) {
        if (!selectContainer) return false;
        if (!Array.isArray(candidates)) candidates = [candidates];
        candidates = candidates.filter(Boolean).map(c => String(c).trim().toLowerCase());
        if (candidates.length === 0) return false;

        try {
            // Кликаем по селектору для открытия списка
            const selector = selectContainer.querySelector('.ant-select-selector') || selectContainer;
            selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            selector.click();

            // Даем Ant Design время отрендерить выпадающий портал
            await sleep(220);

            // Ищем видимый дропдаун (портал на уровне document.body)
            const dropdowns = Array.from(document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'));
            const activeDropdown = dropdowns[dropdowns.length - 1] || document.querySelector('.ant-select-dropdown');
            if (!activeDropdown) {
                console.warn('[ProjectPay Autofill] Не найден контейнер .ant-select-dropdown');
                return false;
            }

            const options = Array.from(activeDropdown.querySelectorAll('.ant-select-item-option, [role="option"]'));
            
            // 1. Сначала ищем точное совпадение
            let matched = null;
            for (const cand of candidates) {
                matched = options.find(opt => {
                    const text = (opt.textContent || opt.innerText || '').trim().toLowerCase();
                    return text === cand;
                });
                if (matched) break;
            }

            // 2. Если точного нет, ищем частичное совпадение
            if (!matched) {
                for (const cand of candidates) {
                    matched = options.find(opt => {
                        const text = (opt.textContent || opt.innerText || '').trim().toLowerCase();
                        return text.includes(cand);
                    });
                    if (matched) break;
                }
            }

            if (matched) {
                matched.scrollIntoView({ block: 'nearest' });
                matched.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                matched.click();
                await sleep(150);
                return true;
            } else {
                console.warn('[ProjectPay Autofill] Не найдена подходящая опция для:', candidates);
                // Закрываем дропдаун повторным кликом или Esc
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }
        } catch (err) {
            console.warn('[ProjectPay Autofill] Исключение при выборе AntD опции:', err);
        }
        return false;
    }

    // Основная функция полного автозаполнения всех полей
    async function fillForm(data) {
        if (!data) return;
        console.log('[Kaban2 -> ProjectPay v3.0] Запуск автозаполнения данными:', data);
        const statusEl = document.getElementById('kaban-status-log');
        if (statusEl) {
            statusEl.style.color = '#38bdf8';
            statusEl.innerText = '⏳ Заполняем поля Ant Design и Django...';
        }

        let filledCount = 0;

        // -------------------------------------------------------------
        // ЧАСТЬ 1: Заполнение Ant Design (React) полей внутри формы
        // -------------------------------------------------------------
        const formItems = Array.from(document.querySelectorAll('.ant-form-item'));

        // Часы и минуты для Тфакт
        let hours = data.tfact_h || '04';
        let mins = data.tfact_m || '00';
        if (data.tfact && data.tfact.includes(':')) {
            const parts = data.tfact.split(':');
            hours = parts[0];
            mins = parts[1] || '00';
        }

        // 1. Текстовые поля, числовые инпуты и примечания
        for (const item of formItems) {
            const label = (item.querySelector('.ant-form-item-label label')?.textContent || item.querySelector('label')?.textContent || '').trim().toLowerCase();
            const input = item.querySelector('input');
            const textarea = item.querySelector('textarea');

            // Название проекта
            if (label.includes('название') || label.includes('проект')) {
                if (input && (data.project_name || data.title)) {
                    setNativeInputValue(input, data.project_name || data.title);
                    filledCount++;
                }
            }
            // Шифр проекта
            else if (label.includes('шифр')) {
                if (input && data.project_cipher) {
                    setNativeInputValue(input, data.project_cipher);
                    filledCount++;
                }
            }
            // Код проекта
            else if (label.includes('код проекта') || (label.includes('код') && !label.includes('штрих'))) {
                if (input && (data.project_code_val || data.project_code)) {
                    setNativeInputValue(input, data.project_code_val || data.project_code);
                    filledCount++;
                }
            }
            // ERP номер
            else if (label.includes('erp')) {
                if (input && data.erp_number) {
                    setNativeInputValue(input, data.erp_number);
                    filledCount++;
                }
            }
            // Количество (X)
            else if (label.includes('количеств')) {
                if (input && data.quantity) {
                    setNativeInputValue(input, data.quantity);
                    filledCount++;
                }
            }
            // Квып
            else if (label.includes('квып')) {
                if (input && data.kvyp) {
                    setNativeInputValue(input, data.kvyp);
                    filledCount++;
                }
            }
            // Тфакт (два инпута: Часы и Минуты!)
            else if (label.includes('тфакт') || label.includes('факт')) {
                const timeInputs = item.querySelectorAll('input');
                if (timeInputs.length >= 2) {
                    // Первый инпут - часы, второй - минуты
                    setNativeInputValue(timeInputs[0], hours);
                    setNativeInputValue(timeInputs[1], mins);
                    filledCount += 2;
                } else if (timeInputs.length === 1) {
                    setNativeInputValue(timeInputs[0], `${hours}:${mins}`);
                    filledCount++;
                }
            }
            // Примечание
            else if (label.includes('примечан') || label.includes('описани')) {
                const targetArea = textarea || input;
                if (targetArea && (data.note || data.description)) {
                    setNativeTextareaValue(targetArea, data.note || data.description);
                    filledCount++;
                }
            }
        }

        // 2. Выпадающие списки Ant Design (строго в правильном порядке зависимостей!)
        const findSelectByLabel = (keyword) => {
            for (const item of formItems) {
                const label = (item.querySelector('.ant-form-item-label label')?.textContent || item.querySelector('label')?.textContent || '').trim().toLowerCase();
                if (label.includes(keyword)) {
                    const sel = item.querySelector('.ant-select');
                    if (sel) return sel;
                }
            }
            return null;
        };

        // Шаг 2.1: Внутренний заказчик
        const custSelect = findSelectByLabel('заказчик');
        if (custSelect) {
            const ok = await selectAntdOption(custSelect, [data.customer_name, 'ОПОХ Уфанет', 'МКД', data.customer]);
            if (ok) filledCount++;
        }

        // Шаг 2.2: Регион (Направление по региону)
        const regSelect = findSelectByLabel('регион');
        if (regSelect) {
            const regCandidates = [
                data.region_name,
                `АО "Уфанет" ${data.region_name || 'Москва'}`,
                'АО "Уфанет" Москва',
                'Москва',
                data.region || '11'
            ];
            const ok = await selectAntdOption(regSelect, regCandidates);
            if (ok) filledCount++;
        }

        // Шаг 2.3: Группа работ (например, "ВОЛС")
        const groupSelect = findSelectByLabel('группа');
        if (groupSelect) {
            const ok = await selectAntdOption(groupSelect, [data.work_group_name, 'ВОЛС', data.work_group]);
            if (ok) filledCount++;
            // ВАЖНО: ждем 400мс, пока React обновит опции следующего списка "Вид работ"!
            await sleep(400);
        }

        // Шаг 2.4: Вид работ (зависит от Группы работ!)
        const itemSelect = findSelectByLabel('вид работ') || findSelectByLabel('вид');
        if (itemSelect) {
            const itemCandidates = [
                data.work_item_name,
                'ВОЛС: Разработка рабочей документации строительства ВОЛС',
                'Разработка рабочей документации',
                data.work_item
            ];
            const ok = await selectAntdOption(itemSelect, itemCandidates);
            if (ok) filledCount++;
        }

        // Шаг 2.5: Кст (стадия)
        const kstSelect = findSelectByLabel('кст') || findSelectByLabel('стади');
        if (kstSelect) {
            const ok = await selectAntdOption(kstSelect, [data.kst_name, 'Полный комплект', '1']);
            if (ok) filledCount++;
        }

        // Шаг 2.6: Кизм (изменение)
        const kizmSelect = findSelectByLabel('кизм') || findSelectByLabel('изменен');
        if (kizmSelect) {
            const ok = await selectAntdOption(kizmSelect, [data.kizm_name, 'Вновь проектируемый', '1']);
            if (ok) filledCount++;
        }

        // Шаг 2.7: Ксл (сложность)
        const kslSelect = findSelectByLabel('ксл') || findSelectByLabel('сложност');
        if (kslSelect) {
            const ok = await selectAntdOption(kslSelect, [data.ksl_name, 'Стандартное', '1']);
            if (ok) filledCount++;
        }

        // -------------------------------------------------------------
        // ЧАСТЬ 2: Заполнение серверной Django формы (Fallback)
        // -------------------------------------------------------------
        const djangoMap = {
            'id_project_title': data.project_name || data.title || '',
            'id_project_cipher': data.project_cipher || '',
            'id_project_code': data.project_code_val || data.project_code || '',
            'id_project_internal_customer': data.customer || '17',
            'id_region': data.region || '1',
            'id_work_group': data.work_group || '22',
            'id_work_item': data.work_item || '118',
            'id_quantity': data.quantity || '1',
            'id_kvyp': data.kvyp || '1.00',
            'id_kst': data.kst || '1',
            'id_kizm': data.kizm || '1',
            'id_ksl': data.ksl || '1',
            'id_erp_number': data.erp_number || '',
            'id_tfact': `${hours}:${mins}:00`,
            'id_diary_lines-0-tfact': `${hours}:${mins}:00`,
            'id_note': data.note || data.description || ''
        };

        for (const [id, val] of Object.entries(djangoMap)) {
            if (!val) continue;
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'SELECT') {
                    setNativeSelectValue(el, val);
                } else if (el.tagName === 'INPUT') {
                    setNativeInputValue(el, val);
                } else if (el.tagName === 'TEXTAREA') {
                    setNativeTextareaValue(el, val);
                }
                filledCount++;
            }
        }

        // Финальный статус в панель
        if (statusEl) {
            statusEl.style.color = '#10b981';
            statusEl.innerText = `✅ Успешно заполнено полей: ${filledCount}. Проверьте форму перед сохранением!`;
        }
        console.log(`[Kaban2 -> ProjectPay v3.0] Завершено! Успешно обработано полей: ${filledCount}`);
    }

    // -------------------------------------------------------------
    // ЧАСТЬ 3: Плавающая панель управления Tampermonkey
    // -------------------------------------------------------------
    function renderControlPanel() {
        if (document.getElementById('kaban-autofill-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'kaban-autofill-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            background: #0f172a;
            color: #ffffff;
            border: 2px solid #ff6600;
            border-radius: 14px;
            padding: 16px;
            box-shadow: 0 12px 35px rgba(0,0,0,0.6);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            max-width: 360px;
            line-height: 1.4;
        `;

        panel.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <strong style="color:#ff6600; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <span>🟧</span> Kaban2 • Автозаполнение ЗП (v3.0)
                </strong>
                <button id="btn-close-kaban-panel" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px; padding:0 4px;" title="Закрыть">✕</button>
            </div>
            <p style="margin:0 0 12px 0; color:#cbd5e1; font-size:12px;">
                Заполняет все поля React/Ant Design (Название, Шифр, Код, Регион, ВОЛС, РД, Тфакт, ERP, Коэфф., Примечание) и форму Django.
            </p>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <button id="btn-test-fill" style="
                    background: #ff6600;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 9px 14px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 13px;
                    box-shadow: 0 3px 10px rgba(255,102,0,0.3);
                ">
                    ⚡ Заполнить данные из Kaban2
                </button>
                <div id="kaban-status-log" style="font-size:11px; color:#94a3b8; min-height:16px;">Ожидание команды...</div>
            </div>
        `;

        document.body.appendChild(panel);
        document.getElementById('btn-close-kaban-panel').onclick = () => panel.remove();

        // Тестовый клик по кнопке (берет данные из хэша или дефолтные)
        document.getElementById('btn-test-fill').onclick = () => {
            const data = extractParamsFromUrl() || {
                project_name: 'Трассировка магистрального оптического кабеля (96 ОВ)',
                project_cipher: '01-2026-ВОЛС',
                project_code_val: 'ВОЛС_Юг',
                customer: '17',
                customer_name: 'ОПОХ Уфанет',
                region: '1',
                region_name: 'Уфа',
                work_group: '22',
                work_group_name: 'ВОЛС',
                work_item: '118',
                work_item_name: 'ВОЛС: Разработка рабочей документации строительства ВОЛС',
                kst: '1',
                kst_name: 'Полный комплект',
                kizm: '1',
                kizm_name: 'Вновь проектируемый',
                ksl: '1',
                ksl_name: 'Стандартное',
                kvyp: '1.00',
                erp_number: '123456789',
                quantity: '1',
                tfact_h: '04',
                tfact_m: '30',
                tfact: '04:30:00',
                note: 'Разработан полный комплект рабочей документации трассы ВОЛС (96 ОВ).'
            };
            fillForm(data);
        };
    }

    // Извлечение параметров из URL search или hash #kaban=...
    function extractParamsFromUrl() {
        let params = {};
        try {
            if (window.location.search) {
                const sp = new URLSearchParams(window.location.search);
                sp.forEach((v, k) => { params[k] = v; });
            }
            if (window.location.hash && window.location.hash.includes('kaban=')) {
                const rawHash = window.location.hash.split('kaban=')[1];
                const decoded = JSON.parse(decodeURIComponent(rawHash));
                params = { ...params, ...decoded };
            }
        } catch (e) {
            console.warn('[ProjectPay Autofill] Ошибка парсинга URL:', e);
        }
        return Object.keys(params).length > 0 ? params : null;
    }

    // Автозапуск при загрузке страницы
    function init() {
        renderControlPanel();
        const incomingData = extractParamsFromUrl();
        if (incomingData) {
            console.log('[Kaban2 -> ProjectPay v3.0] Обнаружен хэш с данными из Kaban2, запускаем автозаполнение через 700мс...', incomingData);
            setTimeout(() => {
                fillForm(incomingData);
            }, 750);
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Экспорт функции в глобальную область на случай прямого вызова через консоль F12
    window.kabanAutofill = fillForm;
})();
