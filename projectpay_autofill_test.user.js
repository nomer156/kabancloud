// ==UserScript==
// @name         ProjectPay (Уфанет) • Автозаполнение из Kaban2 (Тест v2.0)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Автозаполнение полей ProjectPay (Уфанет) из Kaban2 для инженеров-проектировщиков
// @author       Kaban2
// @match        https://pp.core.ufanet.ru/works/*
// @match        https://pp.core.ufanet.ru/works/new*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[ProjectPay Autofill v2] Скрипт загружен на странице', window.location.href);

    // 1. Плавающая панель управления
    const panel = document.createElement('div');
    panel.id = 'kaban-autofill-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        background: #0f172a;
        color: #ffffff;
        border: 2px solid #ff6600;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        max-width: 340px;
    `;

    panel.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <strong style="color:#ff6600; font-size:14px;">🟧 Kaban2 • ProjectPay Автозаполнение</strong>
            <button id="btn-close-kaban-panel" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px;">✕</button>
        </div>
        <p style="margin:0 0 12px 0; color:#cbd5e1; font-size:12px; line-height:1.4;">
            Нажмите кнопку ниже для автоматического заполнения полей React / Ant Design и формы Django.
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
            ">
                ⚡ Заполнить данные (Тест)
            </button>
            <div id="kaban-status-log" style="font-size:11px; color:#10b981; min-height:16px; line-height: 1.3;"></div>
        </div>
    `;

    document.body.appendChild(panel);
    document.getElementById('btn-close-kaban-panel').onclick = () => panel.remove();

    // 2. Универсальные методы установки значений в React (Input + Select)
    function setNativeInputValue(element, value) {
        if (!element) return false;
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
    }

    function setNativeSelectValue(element, value) {
        if (!element) return false;
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
    }

    // 3. Выбор опции в Ant Design (клик по селектору и клик по опции в выпадающем списке)
    async function selectAntdOption(selectContainer, targetText) {
        if (!selectContainer) return false;
        try {
            // Кликаем по селектору для открытия списка
            const selector = selectContainer.querySelector('.ant-select-selector') || selectContainer;
            selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            selector.click();

            // Ждем появления выпадающего списка в DOM
            await new Promise(r => setTimeout(r, 200));

            const options = document.querySelectorAll('.ant-select-item-option, .ant-select-dropdown [role="option"]');
            for (const opt of options) {
                const text = (opt.textContent || opt.innerText || '').toLowerCase();
                if (text.includes(targetText.toLowerCase())) {
                    opt.scrollIntoView({ block: 'nearest' });
                    opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    opt.click();
                    return true;
                }
            }
        } catch (e) {
            console.warn('[ProjectPay Autofill] Ошибка выбора в AntD:', e);
        }
        return false;
    }

    // 4. Основная функция автозаполнения
    async function fillForm(data) {
        const statusEl = document.getElementById('kaban-status-log');
        if (statusEl) {
            statusEl.style.color = '#38bdf8';
            statusEl.innerText = 'Заполняем поля формы...';
        }

        let filled = 0;

        // Поля с ID (Django форма)
        const idMap = {
            'id_project_internal_customer': data.customer || '17',
            'id_region': data.region || '1',
            'id_work_group': data.work_group || '22',
            'id_work_item': data.work_item || '118',
            'id_kst': data.kst || '1',
            'id_kizm': data.kizm || '1',
            'id_ksl': data.ksl || '1',
            'id_erp_number': data.erp_number || '123456789',
            'id_diary_lines-0-tfact': data.tfact || '04:30:00'
        };

        for (const [id, val] of Object.entries(idMap)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'SELECT') {
                    setNativeSelectValue(el, val);
                    filled++;
                } else if (el.tagName === 'INPUT') {
                    setNativeInputValue(el, val);
                    filled++;
                }
            }
        }

        // Заполнение Ant Design инпутов (ERP и время)
        const antdInputs = document.querySelectorAll('.ant-input, .ant-picker-input input, input[type="text"]');
        antdInputs.forEach(input => {
            const id = (input.id || '').toLowerCase();
            const ph = (input.placeholder || '').toLowerCase();
            const name = (input.name || '').toLowerCase();

            if (id.includes('erp') || ph.includes('erp') || name.includes('erp')) {
                setNativeInputValue(input, data.erp_number || '123456789');
                filled++;
            }
            if (id.includes('tfact') || id.includes('fact') || ph.includes('ч:м') || ph.includes('время')) {
                setNativeInputValue(input, data.tfact || '04:30');
                filled++;
            }
        });

        // Заполнение Ant Design выпадающих списков по лейблам
        const formItems = document.querySelectorAll('.ant-form-item');
        for (const item of formItems) {
            const labelText = (item.querySelector('.ant-form-item-label, label')?.textContent || '').toLowerCase();
            const antdSelect = item.querySelector('.ant-select');

            if (!antdSelect) continue;

            if (labelText.includes('заказчик') || labelText.includes('клиент')) {
                await selectAntdOption(antdSelect, 'МКД');
                filled++;
            } else if (labelText.includes('регион') || labelText.includes('город')) {
                await selectAntdOption(antdSelect, 'Уфа');
                filled++;
            } else if (labelText.includes('группа') || labelText.includes('направление')) {
                await selectAntdOption(antdSelect, 'ВОЛС');
                filled++;
            } else if (labelText.includes('вид работ') || labelText.includes('работа')) {
                await selectAntdOption(antdSelect, 'Разработка рабочей документации');
                filled++;
            } else if (labelText.includes('кст') || labelText.includes('стади')) {
                await selectAntdOption(antdSelect, 'Полный комплект');
                filled++;
            } else if (labelText.includes('кизм') || labelText.includes('изменен')) {
                await selectAntdOption(antdSelect, 'Вновь проектируемый');
                filled++;
            } else if (labelText.includes('ксл') || labelText.includes('сложност')) {
                await selectAntdOption(antdSelect, 'Стандартное');
                filled++;
            }
        }

        if (statusEl) {
            statusEl.style.color = '#10b981';
            statusEl.innerText = `Готово! Успешно обработано элементов: ${filled}.`;
        }
        console.log(`[ProjectPay Autofill v2] Заполнено элементов: ${filled}`);
    }

    // Слушатель кнопки "Заполнить"
    document.getElementById('btn-test-fill').onclick = () => {
        fillForm({
            customer: '17',
            region: '1',
            work_group: '22',
            work_item: '118',
            kst: '1',
            kizm: '1',
            ksl: '1',
            erp_number: '123456789',
            tfact: '04:30'
        });
    };

    // Авто-заполнение, если страница открыта из Kaban2 с хэшем или параметрами
    window.addEventListener('load', () => {
        if (window.location.search || window.location.hash) {
            try {
                let params = {};
                if (window.location.search) {
                    const sp = new URLSearchParams(window.location.search);
                    sp.forEach((v, k) => { params[k] = v; });
                }
                if (window.location.hash && window.location.hash.includes('kaban=')) {
                    const rawHash = window.location.hash.split('kaban=')[1];
                    const decoded = JSON.parse(decodeURIComponent(rawHash));
                    params = { ...params, ...decoded };
                }

                if (Object.keys(params).length > 0) {
                    console.log('[ProjectPay Autofill v2] Обнаружены данные из Kaban2, запускаем автозаполнение:', params);
                    setTimeout(() => fillForm(params), 600);
                }
            } catch (err) {
                console.warn('[ProjectPay Autofill v2] Ошибка разбора параметров из Kaban2:', err);
            }
        }
    });

})();
