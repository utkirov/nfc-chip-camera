(() => {
  const cfg = window.FEROMON;
  const P = window.FeromonPricing;
  const $ = id => document.getElementById(id);
  const MAX_FILE = 10 * 1024 * 1024;

  const params = new URLSearchParams(location.search);
  const startQty = Math.min(cfg.maxQty, Math.max(1, +params.get('qty') || 1));
  const startInstall = params.get('install') === '1';

  const newCamera = () => ({
    label: '',
    design: cfg.designs[0].id,
    photos: [null, null, null],       // File
    mode: 'new',                      // new | link | copy
    profile: { title: '', role: '', tg: '', ig: '', phone: '', site: '', url: '' },
    install: startInstall,
  });

  const state = { cameras: Array.from({ length: startQty }, newCamera) };
  const camerasEl = $('cameras');
  const tpl = $('cameraTpl');

  // ---------- Рендер одной карточки ----------
  function mountCamera(cam, idx) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.cam-num').textContent = idx + 1;
    node.querySelector('.install-price').textContent = '+' + P.fmt(cfg.installPrice);

    const label = node.querySelector('.cam-label');
    label.value = cam.label;
    label.oninput = () => { cam.label = label.value; };

    // Дизайны
    const designsEl = node.querySelector('.designs');
    designsEl.innerHTML = cfg.designs.map(d => `
      <button type="button" data-id="${d.id}" title="${d.name}"
        class="design-swatch relative aspect-square rounded-lg ${d.id === cam.design ? 'selected' : ''}"
        style="background:linear-gradient(135deg,${d.from},${d.to})">
        ${d.top ? '<span class="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-gold border-2 border-ink"></span>' : ''}
        <span class="sr-only">${d.name}</span>
      </button>`).join('');
    const designName = document.createElement('p');
    designName.className = 'text-xs text-white/45 mt-2 col-span-5';
    const setDesignName = () => {
      const d = cfg.designs.find(x => x.id === cam.design);
      designName.textContent = `Выбран: ${d.name}${d.top ? ' · хит продаж' : ''}`;
    };
    setDesignName();
    designsEl.appendChild(designName);
    designsEl.onclick = e => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      cam.design = b.dataset.id;
      designsEl.querySelectorAll('.design-swatch').forEach(s => s.classList.toggle('selected', s === b));
      setDesignName();
      renderSummary();
    };

    // Фото
    const photosEl = node.querySelector('.photos');
    cam.photos.forEach((file, i) => {
      const slot = document.createElement('label');
      slot.className = 'photo-slot';
      slot.innerHTML = `
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" class="sr-only">
        <span class="slot-hint text-center text-xs text-white/40"><span class="block text-2xl text-white/30">+</span>Фото ${i + 1}</span>
        <button type="button" class="remove hidden absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 text-sm" aria-label="Удалить">✕</button>`;
      const input = slot.querySelector('input');
      const removeBtn = slot.querySelector('.remove');
      const show = f => {
        if (slot.dataset.url) URL.revokeObjectURL(slot.dataset.url);
        if (f) {
          slot.dataset.url = URL.createObjectURL(f);
          slot.style.backgroundImage = `url("${slot.dataset.url}")`;
        } else {
          delete slot.dataset.url;
          slot.style.backgroundImage = '';
        }
        slot.classList.toggle('filled', !!f);
        removeBtn.classList.toggle('hidden', !f);
      };
      show(file);
      input.onchange = () => {
        const f = input.files[0];
        if (!f) return;
        if (f.size > MAX_FILE) { alert('Файл больше 10 МБ'); input.value = ''; return; }
        cam.photos[i] = f;
        show(f);
        renderSummary();
      };
      removeBtn.onclick = e => {
        e.preventDefault();
        cam.photos[i] = null;
        input.value = '';
        show(null);
        renderSummary();
      };
      photosEl.appendChild(slot);
    });

    // Режим NFC-профиля
    const radios = node.querySelectorAll('.nfc-mode');
    radios.forEach(r => { r.name = `mode-${idx}`; r.checked = r.value === cam.mode; });
    if (idx === 0) node.querySelector('.copy-opt').remove();
    const applyMode = () => {
      node.querySelector('.mode-new').classList.toggle('hidden', cam.mode !== 'new');
      node.querySelector('.mode-link').classList.toggle('hidden', cam.mode !== 'link');
      node.querySelector('.mode-copy').classList.toggle('hidden', cam.mode !== 'copy');
    };
    node.querySelectorAll('.nfc-mode').forEach(r => r.onchange = () => { cam.mode = r.value; applyMode(); });
    applyMode();

    node.querySelectorAll('[data-f]').forEach(inp => {
      inp.value = cam.profile[inp.dataset.f];
      inp.oninput = () => { cam.profile[inp.dataset.f] = inp.value.trim(); inp.classList.remove('invalid'); };
    });

    const inst = node.querySelector('.cam-install');
    inst.checked = cam.install;
    inst.onchange = () => { cam.install = inst.checked; renderSummary(); };

    return node;
  }

  function renderCameras() {
    camerasEl.innerHTML = '';
    state.cameras.forEach((c, i) => camerasEl.appendChild(mountCamera(c, i)));
    $('qtyVal').textContent = state.cameras.length;
    $('qtyMinus').disabled = state.cameras.length <= 1;
    $('qtyPlus').disabled = state.cameras.length >= cfg.maxQty;
    renderSummary();
  }

  // ---------- Сводка и цены ----------
  function totals() {
    const q = state.cameras.length;
    return P.calc(q, { installCount: state.cameras.filter(c => c.install).length });
  }

  function renderSummary() {
    const r = totals();
    const rows = state.cameras.map((c, i) => {
      const d = cfg.designs.find(x => x.id === c.design);
      const n = c.photos.filter(Boolean).length;
      return `<li class="flex items-center gap-3">
        <span class="w-7 h-7 rounded-md shrink-0" style="background:linear-gradient(135deg,${d.from},${d.to})"></span>
        <span class="flex-1 truncate">${i + 1}. ${escapeHtml(c.label) || d.name}</span>
        <span class="text-xs ${n === 3 ? 'text-verified' : 'text-white/40'}">${n}/3 фото</span></li>`;
    }).join('');

    $('summary').innerHTML = `
      <ul class="space-y-2.5 text-sm">${rows}</ul>
      <dl class="mt-5 pt-5 border-t border-white/10 space-y-2 text-sm">
        <div class="flex justify-between"><dt class="text-white/50">Тариф</dt><dd>${r.tier.label}${r.tier.discount ? ` <span class="text-verified">−${r.tier.discount}%</span>` : ''}</dd></div>
        <div class="flex justify-between"><dt class="text-white/50">Метки ${r.qty} × ${P.fmt(r.unit)}</dt><dd>${P.fmt(r.chips)}</dd></div>
        <div class="flex justify-between"><dt class="text-white/50">Установка</dt><dd>${r.install ? P.fmt(r.install) : '—'}</dd></div>
        ${r.savings ? `<div class="flex justify-between text-verified"><dt>Выгода</dt><dd>−${P.fmt(r.savings)}</dd></div>` : ''}
      </dl>
      <div class="mt-5 pt-5 border-t border-white/10 flex justify-between items-end">
        <span class="text-white/50">Итого</span><span class="font-display text-2xl">${P.fmt(r.total)}</span>
      </div>
      ${nextTierHint(r)}`;

    $('mQty').textContent = r.qty;
    $('mTier').textContent = r.tier.discount ? `−${r.tier.discount}%` : r.tier.label;
    $('mTotal').textContent = P.fmt(r.total);
  }

  function nextTierHint(r) {
    const next = cfg.tiers.find(t => t.min > r.qty);
    if (!next) return '';
    const add = next.min - r.qty;
    return `<p class="mt-4 text-xs text-gold/80 bg-gold/5 border border-gold/20 rounded-xl p-3">
      Добавьте ещё ${add} шт — скидка вырастет до ${next.discount}%</p>`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // ---------- Количество ----------
  $('qtyPlus').onclick = () => {
    if (state.cameras.length >= cfg.maxQty) return;
    state.cameras.push(newCamera());
    renderCameras();
  };
  $('qtyMinus').onclick = () => {
    if (state.cameras.length <= 1) return;
    state.cameras.pop();
    // если первая камера осталась одна — «копирование» больше не на что ссылаться
    renderCameras();
  };

  // ---------- Валидация и отправка ----------
  function validateCameras() {
    const errors = [];
    state.cameras.forEach((c, i) => {
      const card = camerasEl.children[i];
      if (c.photos.filter(Boolean).length < 3) errors.push(`Камера ${i + 1}: загрузите 3 фото`);
      if (c.mode === 'new' && !c.profile.title) {
        errors.push(`Камера ${i + 1}: укажите имя для визитки`);
        card.querySelector('[data-f="title"]').classList.add('invalid');
      }
      if (c.mode === 'link' && !/^https?:\/\/\S+$/.test(c.profile.url)) {
        errors.push(`Камера ${i + 1}: вставьте корректную ссылку на профиль`);
        card.querySelector('[data-f="url"]').classList.add('invalid');
      }
    });
    return errors;
  }

  const form = $('orderForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const errors = validateCameras();
    const phoneDigits = (fd.get('phone') || '').replace(/\D/g, '');

    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    if (!fd.get('name').trim()) { errors.push('Укажите имя'); form.elements.name.classList.add('invalid'); }
    if (phoneDigits.length < 9) { errors.push('Укажите телефон'); form.elements.phone.classList.add('invalid'); }
    if (!fd.get('consent')) errors.push('Подтвердите согласие на обработку данных');

    const errEl = $('formError');
    if (errors.length) {
      errEl.innerHTML = errors.map(escapeHtml).join('<br>');
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const r = totals();
    const order = {
      id: 'FR-' + Date.now().toString(36).toUpperCase().slice(-6),
      createdAt: new Date().toISOString(),
      customer: Object.fromEntries(['name', 'phone', 'telegram', 'city', 'delivery', 'comment'].map(k => [k, fd.get(k)])),
      cameras: state.cameras.map(c => ({
        label: c.label, design: c.design, mode: c.mode, install: c.install,
        profile: c.mode === 'copy' ? null : c.profile,
        photos: c.photos.map(f => f && f.name),
      })),
      pricing: { tier: r.tier.label, discount: r.tier.discount, unit: r.unit, install: r.install, total: r.total },
    };

    // TODO(backend): отправить multipart (order JSON + файлы) на POST /api/orders
    console.info('Feromon order', order);

    $('orderId').textContent = order.id;
    const modal = $('successModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });

  renderCameras();
})();
