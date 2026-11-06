// ==UserScript==
// @name         Уфанет • Автозаполнение ProjectPay из KabanCloud
// @namespace    https://doska.odn.ufanet.ru/
// @version      3.0.0
// @description  Мгновенно заполняет форму «Новая работа» в ProjectPay (pp.core.ufanet.ru) по данным из карточки Kaban
// @author       Ufanet Design Team
// @match        https://pp.core.ufanet.ru/works/new*
// @match        http://pp.core.ufanet.ru/works/new*
// @match        https://pp.ufanet.ru/works/new*
// @match        http://pp.ufanet.ru/works/new*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  console.log('[Kaban -> ProjectPay] Скрипт автозаполнения активирован');

  function getPayload() {
    // 1. Попытка извлечь из URL hash (#kaban=...)
    try {
      const hash = window.location.hash || '';
      if (hash.includes('kaban=')) {
        const raw = hash.split('kaban=')[1];
        if (raw) {
          const decoded = decodeURIComponent(raw);
          return JSON.parse(decoded);
        }
      }
    } catch (e) {
      console.warn('[Kaban PP] Ошибка парсинга hash:', e);
    }

    // 2. Попытка извлечь из localStorage
    try {
      const raw = localStorage.getItem('kaban_pp_payload');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}

    return null;
  }

  function setNativeValue(element, value) {
    if (!element) return;
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function fillSelect(selectId, targetValue, targetText = '') {
    const el = document.getElementById(selectId);
    if (!el) return false;

    let matched = false;
    // Поиск по value
    if (targetValue) {
      for (const opt of el.options) {
        if (String(opt.value) === String(targetValue)) {
          el.value = opt.value;
          matched = true;
          break;
        }
      }
    }

    // Поиск по тексту, если по value не совпало
    if (!matched && targetText) {
      const lower = targetText.toLowerCase();
      for (const opt of el.options) {
        if (opt.text.toLowerCase().includes(lower)) {
          el.value = opt.value;
          matched = true;
          break;
        }
      }
    }

    setNativeValue(el, el.value);

    // Также обновляем AntD если компонент смонтирован
    try {
      const antdSelect = el.closest('.ant-select') || document.querySelector(`[data-field-id="${selectId}"]`);
      if (antdSelect) {
        const event = new MouseEvent('click', { bubbles: true });
        antdSelect.dispatchEvent(event);
      }
    } catch {}

    return matched;
  }

  function fillInput(inputId, val) {
    if (val === undefined || val === null) return;
    const el = document.getElementById(inputId);
    if (el) {
      setNativeValue(el, String(val));
    }
  }

  function applyAutofill(data) {
    if (!data) return;

    console.log('[Kaban PP] Заполняем поля ProjectPay:', data);

    // 1. Селекты Django / AntD
    fillSelect('id_project_internal_customer', data.customer, data.customer_name);
    fillSelect('id_region', data.region, data.region_name);
    fillSelect('id_work_group', data.work_group, data.work_group_name);
    fillSelect('id_work_item', data.work_item, data.work_item_name);
    fillSelect('id_kst', data.kst, data.kst_name);
    fillSelect('id_kizm', data.kizm, data.kizm_name);
    fillSelect('id_ksl', data.ksl, data.ksl_name);

    // 2. Скрытые и служебные поля формы
    fillInput('id_project_cipher', data.project_cipher || data.project_code_val);
    fillInput('id_erp_number', data.erp_number);
    fillInput('id_quantity', data.quantity || '1');
    fillInput('id_kvyp', data.kvyp || '1.00');
    fillInput('id_tfact', data.tfact || '04:00:00');
    fillInput('id_note', data.note || data.project_name);
    fillInput('id_project_title', data.project_name || data.title);

    // 3. Строки ежедневника (Diary lines)
    fillInput('id_diary_lines-0-tfact', data.tfact || '04:00');
    fillInput('id_diary_lines-0-object_part', data.project_cipher || data.project_name);
    fillInput('id_diary_lines-0-description', data.note || data.project_name || 'Выполнение проектных работ');

    // 4. Показываем красивый баннер успеха
    showSuccessBanner(data);
  }

  function showSuccessBanner(data) {
    let banner = document.getElementById('kaban-pp-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'kaban-pp-banner';
      banner.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        z-index: 999999;
        background: #0f172a;
        border: 2px solid #ff6600;
        border-radius: 12px;
        padding: 12px 18px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: kabanFadeIn 0.3s ease;
      `;
      document.body.appendChild(banner);
    }

    banner.innerHTML = `
      <span style="font-size: 20px;">⚡</span>
      <div>
        <div style="font-weight: 800; color: #ff6600;">Уфанет • Данные из KabanCloud загружены!</div>
        <div style="color: #94a3b8; font-size: 11px;">Шифр: <strong>${data.project_cipher || '—'}</strong> | ERP: <strong>${data.erp_number || '—'}</strong> | Время: <strong>${data.tfact || '—'}</strong></div>
      </div>
      <button id="kaban-refill-btn" style="
        background: #ff6600;
        border: none;
        color: #fff;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
      ">Перезаполнить</button>
      <button id="kaban-close-btn" style="
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 14px;
      ">✕</button>
    `;

    document.getElementById('kaban-refill-btn')?.addEventListener('click', () => applyAutofill(data));
    document.getElementById('kaban-close-btn')?.addEventListener('click', () => banner.remove());

    setTimeout(() => {
      banner.remove();
    }, 15000);
  }

  // Запуск при старте страницы с повтором через 500мс для AntD
  const payload = getPayload();
  if (payload) {
    // Первое заполнение сразу
    applyAutofill(payload);
    // Второе заполнение после инициализации AntD
    setTimeout(() => applyAutofill(payload), 600);
    setTimeout(() => applyAutofill(payload), 1500);
  }
})();
