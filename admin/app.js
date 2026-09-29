(() => {
  const S = window.CameraCheckStore;
  const V = window.CameraCheckVerify;
  const { STATUS, CONDITION, RESULT } = window.CameraCheckDict;
  const $ = id => document.getElementById(id);

  let db = S.load();
  const save = () => { if (!S.save(db)) toast('Не удалось сохранить: переполнено хранилище браузера (уменьшите число фото)'); };

  /* ---------- утилиты ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmtDate = d => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const fmtDT = d => new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const ago = d => {
    const m = Math.round((Date.now() - new Date(d)) / 6e4);
    if (m < 1) return 'только что';
    if (m < 60) return m + ' мин назад';
    if (m < 1440) return Math.round(m / 60) + ' ч назад';
    return Math.round(m / 1440) + ' дн назад';
  };
  const badge = (d) => `<span class="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${d.cls}">${d.label}</span>`;
  const thumb = (c, size = 'w-14 h-14') => `
    <span class="${size} shrink-0 rounded-xl spotlight border border-white/10 grid place-items-center p-1.5">
      ${c.photos[0] ? `<img src="${esc(S.img(c.photos[0]))}" alt="" class="max-w-full max-h-full object-contain">` : '<span class="text-white/20 text-xs">нет фото</span>'}
    </span>`;
  const verifyBase = () => new URL('../verify/', location.href).href;
  const chipUrl = c => `https://${db.settings.domain}/?c=${c.id}&m=`;

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function openModal(html) {
    $('modalBody').innerHTML = html;
    $('modal').classList.remove('hidden');
    $('modal').classList.add('flex');
  }
  function closeModal() {
    $('modal').classList.add('hidden');
    $('modal').classList.remove('flex');
    if (nfcAbort) { nfcAbort.abort(); nfcAbort = null; }
  }
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });

  /* ---------- авторизация (мок) ---------- */
  const AUTH_KEY = 'cameracheck.admin.session';
  const isAuthed = () => { try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return true; } };

  $('loginForm').onsubmit = e => {
    e.preventDefault();
    const f = e.target.elements;
    // TODO(backend): POST /api/auth/login, httpOnly-cookie сессии
    if (f.login.value.trim() === 'admin' && f.password.value === 'camcheck') {
      try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (err) {}
      boot();
    } else {
      $('loginError').classList.remove('hidden');
    }
  };
  document.querySelectorAll('[data-logout]').forEach(b => b.onclick = () => {
    try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
    location.hash = '';
    boot();
  });

  /* ---------- навигация ---------- */
  const NAV = [
    { href: '#/', key: 'dash', label: 'Обзор', icon: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>' },
    { href: '#/cameras', key: 'cameras', label: 'Камеры', icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>' },
    { href: '#/scans', key: 'scans', label: 'Сканы', icon: '<path d="M6 8.5a8 8 0 0 1 0 7M9.5 6a12 12 0 0 1 0 12M13 4a16 16 0 0 1 0 16"/>' },
    { href: '#/settings', key: 'settings', label: 'Настройки', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14.1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>' },
  ];
  const icon = (p, cls = 'w-5 h-5') => `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

  function renderNav(active) {
    $('sideNav').innerHTML = NAV.map(n => `
      <a href="${n.href}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl ${active === n.key ? 'bg-gold/10 text-gold' : 'text-white/60 hover:bg-white/5 hover:text-white'}">
        ${icon(n.icon, 'w-[18px] h-[18px]')}${n.label}</a>`).join('');
    $('tabNav').innerHTML = NAV.map(n => `
      <a href="${n.href}" class="flex flex-col items-center gap-1 py-2.5 ${active === n.key ? 'text-gold' : 'text-white/50'}">
        ${icon(n.icon)}${n.label}</a>`).join('');
  }

  function route() {
    if (!isAuthed()) return;
    db = S.load();
    const [, section, arg] = (location.hash || '#/').split('/');
    window.scrollTo(0, 0);
    if (section === 'cameras') { renderNav('cameras'); viewCameras(); }
    else if (section === 'camera') { renderNav('cameras'); viewCamera(decodeURIComponent(arg || 'new')); }
    else if (section === 'scans') { renderNav('scans'); viewScans(); }
    else if (section === 'settings') { renderNav('settings'); viewSettings(); }
    else { renderNav('dash'); viewDashboard(); }
  }
  window.addEventListener('hashchange', route);

  const pageHead = (title, sub, actions = '') => `
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div><h1 class="font-display text-2xl">${title}</h1>${sub ? `<p class="text-sm text-white/45 mt-1">${sub}</p>` : ''}</div>
      ${actions ? `<div class="flex gap-2 flex-wrap">${actions}</div>` : ''}
    </div>`;

  /* ================= ОБЗОР ================= */
  function viewDashboard() {
    const cams = db.cameras;
    const week = Date.now() - 7 * 864e5;
    const weekScans = db.scans.filter(s => new Date(s.at) > week);
    const alerts = db.scans.filter(s => s.result === 'clone' || s.result === 'blocked').slice(0, 5);
    const noChip = cams.filter(c => !c.chip);
    const stat = (label, value, hint, cls = '') => `
      <div class="card p-5"><p class="text-xs text-white/45">${label}</p>
      <p class="font-display text-3xl mt-2 ${cls}">${value}</p><p class="text-xs text-white/35 mt-1">${hint}</p></div>`;

    $('view').innerHTML = `
      ${pageHead('Обзор', 'Состояние базы камер и проверок', `<a href="#/camera/new" class="btn btn-gold">+ Добавить камеру</a>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${stat('Камер в базе', cams.length, `${noChip.length} без чипа`)}
        ${stat('В продаже', cams.filter(c => c.status === 'active').length, 'со статусом «В продаже»', 'text-sky-300')}
        ${stat('Продано', cams.filter(c => c.status === 'sold').length, 'с активной меткой', 'text-verified')}
        ${stat('Проверок за 7 дней', weekScans.length, `${weekScans.filter(s => s.result === 'original').length} подтверждено`, 'text-gold')}
      </div>

      <div class="grid lg:grid-cols-5 gap-4 mt-4">
        <section class="card p-5 lg:col-span-3">
          <div class="flex justify-between items-center"><h2 class="font-semibold">Последние проверки</h2><a href="#/scans" class="text-sm text-gold">Все →</a></div>
          <ul class="mt-4 divide-y divide-white/5">${db.scans.slice(0, 7).map(scanRow).join('')}</ul>
        </section>

        <div class="lg:col-span-2 space-y-4">
          <section class="card p-5 ${alerts.length ? 'border-red-400/25' : ''}">
            <h2 class="font-semibold flex items-center gap-2">${alerts.length ? '<span class="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>' : ''}Тревоги</h2>
            ${alerts.length ? `<ul class="mt-3 space-y-2">${alerts.map(s => {
              const c = S.camera(db, s.cameraId);
              return `<li><a href="#/camera/${esc(s.cameraId)}" class="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/5 hover:bg-red-500/10">
                <span class="text-sm"><b>${esc(c ? c.brand + ' ' + c.model : s.cameraId)}</b><span class="block text-xs text-white/45">${esc(s.city)} · ${ago(s.at)}</span></span>
                ${badge(RESULT[s.result])}</a></li>`;
            }).join('')}</ul>` : '<p class="text-sm text-white/45 mt-2">Подозрительных проверок нет.</p>'}
          </section>

          <section class="card p-5">
            <h2 class="font-semibold">Ждут привязки чипа</h2>
            ${noChip.length ? `<ul class="mt-3 space-y-2">${noChip.map(c => `
              <li><a href="#/camera/${esc(c.id)}" class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                ${thumb(c, 'w-11 h-11')}<span class="text-sm flex-1"><b>${esc(c.brand)} ${esc(c.model)}</b><span class="block text-xs text-white/45 font-mono">${esc(c.id)}</span></span>
                <span class="text-xs text-gold">Привязать →</span></a></li>`).join('')}</ul>`
              : '<p class="text-sm text-white/45 mt-2">Все камеры с чипами.</p>'}
          </section>
        </div>
      </div>`;
  }

  function scanRow(s) {
    const c = S.camera(db, s.cameraId);
    return `<li class="py-3 flex items-center gap-3">
      ${c ? thumb(c, 'w-10 h-10') : ''}
      <div class="flex-1 min-w-0 text-sm">
        <a href="#/camera/${esc(s.cameraId)}" class="font-medium hover:text-gold truncate block">${esc(c ? c.brand + ' ' + c.model : s.cameraId)}</a>
        <p class="text-xs text-white/40">${esc(s.cameraId)} · ${esc(s.city)} · ${esc(s.device)}</p>
      </div>
      <div class="text-right shrink-0">${badge(RESULT[s.result])}<p class="text-[11px] text-white/35 mt-1">${ago(s.at)}</p></div>
    </li>`;
  }

  /* ================= СПИСОК КАМЕР ================= */
  let camFilter = { q: '', status: 'all' };

  function viewCameras() {
    $('view').innerHTML = `
      ${pageHead('Камеры', `${db.cameras.length} в базе`, `<a href="#/camera/new" class="btn btn-gold">+ Добавить камеру</a>`)}
      <div class="flex flex-col md:flex-row gap-3 mb-4">
        <input id="camQ" class="fr-input md:max-w-xs" placeholder="Поиск: модель, серийник, ID" value="${esc(camFilter.q)}">
        <div id="camStatus" class="flex gap-2 overflow-x-auto no-scrollbar">
          ${[['all', 'Все'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => `
            <button data-s="${k}" class="shrink-0 px-3.5 py-2 rounded-full text-sm border ${camFilter.status === k ? 'border-gold text-gold bg-gold/10' : 'border-white/10 text-white/60 hover:bg-white/5'}">${l}</button>`).join('')}
        </div>
      </div>
      <div id="camList"></div>`;

    $('camQ').oninput = e => { camFilter.q = e.target.value; renderCamList(); };
    $('camStatus').onclick = e => {
      const b = e.target.closest('[data-s]');
      if (!b) return;
      camFilter.status = b.dataset.s;
      viewCameras();
    };
    renderCamList();
  }

  function renderCamList() {
    const q = camFilter.q.trim().toLowerCase();
    const list = db.cameras.filter(c =>
      (camFilter.status === 'all' || c.status === camFilter.status) &&
      (!q || [c.id, c.brand, c.model, c.serial].join(' ').toLowerCase().includes(q)));
    const scans = id => db.scans.filter(s => s.cameraId === id).length;

    if (!list.length) { $('camList').innerHTML = '<div class="card p-10 text-center text-white/45">Ничего не найдено</div>'; return; }

    $('camList').innerHTML = `
      <div class="hidden md:block card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="text-left text-xs text-white/40 border-b border-white/5">
            <tr><th class="p-4 font-normal">Камера</th><th class="p-4 font-normal">Серийный №</th><th class="p-4 font-normal">Статус</th><th class="p-4 font-normal">Чип</th><th class="p-4 font-normal text-right">Проверок</th></tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            ${list.map(c => `
              <tr class="hover:bg-white/[.03] cursor-pointer" onclick="location.hash='#/camera/${esc(c.id)}'">
                <td class="p-4"><div class="flex items-center gap-3">${thumb(c)}<div><p class="font-medium">${esc(c.brand)} ${esc(c.model)}</p><p class="text-xs text-white/40 font-mono">${esc(c.id)}</p></div></div></td>
                <td class="p-4 font-mono text-white/70">${esc(c.serial)}</td>
                <td class="p-4">${badge(STATUS[c.status])}</td>
                <td class="p-4">${c.chip ? `<span class="font-mono text-xs text-white/60">${esc(c.chip.uid)}</span>` : '<span class="text-xs text-gold">не привязан</span>'}</td>
                <td class="p-4 text-right text-white/60">${scans(c.id)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="md:hidden space-y-2">
        ${list.map(c => `
          <a href="#/camera/${esc(c.id)}" class="card p-3 flex items-center gap-3">
            ${thumb(c)}
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">${esc(c.brand)} ${esc(c.model)}</p>
              <p class="text-xs text-white/40 font-mono">${esc(c.id)} · ${esc(c.serial)}</p>
              <div class="mt-1.5 flex items-center gap-2">${badge(STATUS[c.status])}${c.chip ? '' : '<span class="text-[11px] text-gold">без чипа</span>'}</div>
            </div>
            <span class="text-white/30">›</span>
          </a>`).join('')}
      </div>`;
  }

  /* ================= КАРТОЧКА КАМЕРЫ ================= */
  let draft = null;   // рабочая копия редактируемой камеры

  function viewCamera(id) {
    const isNew = id === 'new';
    const existing = isNew ? null : S.camera(db, id);
    if (!isNew && !existing) { $('view').innerHTML = '<div class="card p-10 text-center text-white/45">Камера не найдена. <a href="#/cameras" class="text-gold">К списку</a></div>'; return; }

    draft = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: S.nextCameraId(db), brand: '', model: '', serial: '', type: 'Беззеркальная', condition: 'used', shutter: null,
      kit: ['Body'], description: '', photos: [], status: 'draft', soldAt: null, warrantyMonths: 3, chip: null,
      createdAt: new Date().toISOString(),
    };
    const c = draft;
    const scans = db.scans.filter(s => s.cameraId === c.id);

    $('view').innerHTML = `
      <a href="#/cameras" class="text-sm text-white/50 hover:text-white">← Камеры</a>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 mb-6">
        <div>
          <h1 class="font-display text-2xl">${isNew ? 'Новая камера' : esc(c.brand + ' ' + c.model)}</h1>
          <p class="text-sm text-white/45 mt-1"><span class="font-mono">${esc(c.id)}</span> · ${isNew ? 'ещё не сохранена' : 'добавлена ' + fmtDate(c.createdAt)}</p>
        </div>
        <div class="flex gap-2">
          ${isNew ? '' : `<a href="${verifyBase()}?c=${encodeURIComponent(c.id)}" target="_blank" class="btn btn-ghost">Открыть страницу ↗</a>`}
          <button id="saveBtn" class="btn btn-gold">Сохранить</button>
        </div>
      </div>

      <div class="grid lg:grid-cols-[1fr_340px] gap-5">
        <form id="camForm" class="space-y-5" onsubmit="return false">
          <section class="card p-5">
            <h2 class="font-semibold">Фото аппарата</h2>
            <p class="text-xs text-white/40 mt-1">Первое фото — главное. Лучше всего PNG без фона. Файлы сжимаются до 900px.</p>
            <div id="photos" class="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4"></div>
          </section>

          <section class="card p-5 grid sm:grid-cols-2 gap-4">
            <h2 class="font-semibold sm:col-span-2">Основное</h2>
            ${field('Бренд *', `<input name="brand" class="fr-input" value="${esc(c.brand)}" placeholder="Canon" required>`)}
            ${field('Модель *', `<input name="model" class="fr-input" value="${esc(c.model)}" placeholder="EOS R6 Mark II" required>`)}
            ${field('Серийный номер *', `<input name="serial" class="fr-input font-mono" value="${esc(c.serial)}" required>`)}
            ${field('Тип', `<select name="type" class="fr-input">${['Беззеркальная', 'Зеркальная', 'Зеркальная (SLT)', 'Компактная', 'Дальномер, плёнка', 'Экшн-камера', 'Видеокамера'].map(t => `<option ${t === c.type ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
            ${field('Состояние', `<select name="condition" class="fr-input">${Object.entries(CONDITION).map(([k, l]) => `<option value="${k}" ${k === c.condition ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
            ${field('Пробег затвора', `<input name="shutter" type="number" min="0" inputmode="numeric" class="fr-input" value="${c.shutter ?? ''}" placeholder="кадров">`)}
            ${field('Комплектация', `<textarea name="kit" rows="4" class="fr-input" placeholder="По одному пункту в строке">${esc(c.kit.join('\n'))}</textarea>`, 'sm:col-span-2')}
            ${field('Описание для покупателя', `<textarea name="description" rows="3" class="fr-input">${esc(c.description)}</textarea>`, 'sm:col-span-2')}
          </section>

          <section class="card p-5 grid sm:grid-cols-3 gap-4">
            <h2 class="font-semibold sm:col-span-3">Продажа и гарантия</h2>
            ${field('Статус', `<select name="status" class="fr-input">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === c.status ? 'selected' : ''}>${v.label}</option>`).join('')}</select>`)}
            ${field('Дата продажи', `<input name="soldAt" type="date" class="fr-input" value="${c.soldAt ? c.soldAt.slice(0, 10) : ''}">`)}
            ${field('Гарантия, мес.', `<input name="warrantyMonths" type="number" min="0" max="60" class="fr-input" value="${c.warrantyMonths}">`)}
            <p class="sm:col-span-3 text-xs text-white/40">«Черновик» не виден покупателям. «Заблокирована» — покупатель увидит предупреждение о краже.</p>
          </section>

          ${isNew ? '' : `<button type="button" id="deleteBtn" class="btn btn-danger">Удалить камеру</button>`}
        </form>

        <aside class="space-y-5">
          ${chipCard(c, isNew)}
          <section class="card p-5">
            <h2 class="font-semibold">Проверки <span class="text-white/40 font-normal">${scans.length}</span></h2>
            ${scans.length ? `<ul class="mt-3 space-y-2">${scans.slice(0, 6).map(s => `
              <li class="flex items-center justify-between text-sm"><span class="text-white/55">${fmtDT(s.at)} · ${esc(s.city)}</span>${badge(RESULT[s.result])}</li>`).join('')}</ul>`
              : '<p class="text-sm text-white/45 mt-2">Метку ещё не сканировали.</p>'}
          </section>
        </aside>
      </div>`;

    renderPhotos();
    bindCameraForm(isNew);
  }

  const field = (label, control, cls = '') => `<label class="block ${cls}"><span class="text-sm text-white/55">${label}</span><div class="mt-1.5">${control}</div></label>`;

  function chipCard(c, isNew) {
    if (!c.chip) {
      return `<section class="card p-5 border-gold/30">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 grid place-items-center text-gold">${icon(NAV[2].icon)}</span>
          <div><h2 class="font-semibold">NFC-чип</h2><p class="text-xs text-white/45">Не привязан</p></div>
        </div>
        <p class="text-sm text-white/55 mt-4">Привяжите метку, чтобы покупатели могли проверять камеру касанием телефона.</p>
        <button id="bindBtn" class="btn btn-gold w-full mt-4" ${isNew ? 'disabled title="Сначала сохраните камеру"' : ''}>Привязать чип</button>
        ${isNew ? '<p class="text-xs text-white/40 mt-2 text-center">Сначала сохраните камеру</p>' : ''}
      </section>`;
    }
    return `<section class="card p-5">
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-verified/10 border border-verified/30 grid place-items-center text-verified">${icon(NAV[2].icon)}</span>
        <div><h2 class="font-semibold">NFC-чип</h2><p class="text-xs text-verified">Привязан ${fmtDate(c.chip.boundAt)}</p></div>
      </div>
      <dl class="mt-4 text-sm space-y-2">
        <div class="flex justify-between"><dt class="text-white/45">UID</dt><dd class="font-mono">${esc(c.chip.uid)}</dd></div>
        <div class="flex justify-between"><dt class="text-white/45">Счётчик касаний</dt><dd class="font-mono">${c.chip.counter}</dd></div>
      </dl>
      <p class="text-xs text-white/40 mt-4">Ссылка в чипе:</p>
      <p class="font-mono text-[11px] break-all bg-black/30 border border-white/10 rounded-lg p-2 mt-1">${esc(chipUrl(c))}<span class="text-gold">UIDxCNT</span></p>

      <p class="text-xs text-white/40 mt-5 mb-2">Симулятор касаний (демо)</p>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <button type="button" data-sim="original" class="btn btn-ghost !px-2 !py-2 text-verified">✓ Касание</button>
        <button type="button" data-sim="replay" class="btn btn-ghost !px-2 !py-2 text-amber-300">↺ Старая ссылка</button>
        <button type="button" data-sim="clone" class="btn btn-ghost !px-2 !py-2 text-red-300">✕ Клон метки</button>
        <button type="button" data-sim="unsigned" class="btn btn-ghost !px-2 !py-2 text-white/60">? Без метки</button>
      </div>
      <button id="unbindBtn" class="w-full text-xs text-white/40 hover:text-red-300 mt-4">Отвязать чип</button>
    </section>`;
  }

  function renderPhotos() {
    const el = $('photos');
    el.innerHTML = draft.photos.map((p, i) => `
      <div class="relative aspect-square rounded-xl spotlight border ${i === 0 ? 'border-gold/50' : 'border-white/10'} grid place-items-center p-2 group">
        <img src="${esc(S.img(p))}" alt="" class="max-w-full max-h-full object-contain">
        ${i === 0 ? '<span class="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gold text-ink font-semibold">Главное</span>'
          : `<button type="button" data-main="${i}" class="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/60 opacity-100 lg:opacity-0 group-hover:opacity-100">Сделать главным</button>`}
        <button type="button" data-del="${i}" class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-xs" aria-label="Удалить">✕</button>
      </div>`).join('') + (draft.photos.length < 8 ? `
      <label class="aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-gold grid place-items-center cursor-pointer text-center text-xs text-white/40">
        <input id="photoInput" type="file" accept="image/*" multiple class="sr-only">
        <span><span class="block text-2xl text-white/30">+</span>Добавить</span>
      </label>` : '');

    el.onclick = e => {
      const del = e.target.closest('[data-del]'), main = e.target.closest('[data-main]');
      if (del) { draft.photos.splice(+del.dataset.del, 1); renderPhotos(); }
      if (main) { const [p] = draft.photos.splice(+main.dataset.main, 1); draft.photos.unshift(p); renderPhotos(); }
    };
    const input = $('photoInput');
    if (input) input.onchange = async () => {
      for (const f of [...input.files].slice(0, 8 - draft.photos.length)) {
        try { draft.photos.push(await fileToWebp(f)); } catch (err) { toast('Не удалось прочитать ' + f.name); }
      }
      renderPhotos();
    };
  }

  // Сжатие в WebP с сохранением прозрачности. TODO(backend): загрузка в хранилище, в базе только URL.
  function fileToWebp(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(img.src);
        resolve(cv.toDataURL('image/webp', 0.82));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function readForm() {
    const f = $('camForm').elements;
    const d = draft;
    d.brand = f.brand.value.trim();
    d.model = f.model.value.trim();
    d.serial = f.serial.value.trim();
    d.type = f.type.value;
    d.condition = f.condition.value;
    d.shutter = f.shutter.value === '' ? null : Math.max(0, parseInt(f.shutter.value, 10));
    d.kit = f.kit.value.split('\n').map(s => s.trim()).filter(Boolean);
    d.description = f.description.value.trim();
    d.status = f.status.value;
    d.soldAt = f.soldAt.value ? new Date(f.soldAt.value).toISOString() : null;
    d.warrantyMonths = Math.max(0, parseInt(f.warrantyMonths.value, 10) || 0);
  }

  function bindCameraForm(isNew) {
    $('saveBtn').onclick = () => {
      readForm();
      const d = draft;
      const missing = ['brand', 'model', 'serial'].filter(k => !d[k]);
      $('camForm').querySelectorAll('[required]').forEach(i => i.classList.toggle('!border-red-400', missing.includes(i.name)));
      if (missing.length) return toast('Заполните бренд, модель и серийный номер');
      const dupe = db.cameras.find(c => c.id !== d.id && c.serial === d.serial && c.brand.toLowerCase() === d.brand.toLowerCase());
      if (dupe) return toast(`Такой серийный номер уже есть у ${dupe.id}`);
      if (d.status === 'sold' && !d.soldAt) d.soldAt = new Date().toISOString();

      // TODO(backend): POST/PUT /api/cameras
      const i = db.cameras.findIndex(c => c.id === d.id);
      if (i >= 0) db.cameras[i] = d; else db.cameras.unshift(d);
      save();
      toast(isNew ? 'Камера создана' : 'Сохранено');
      if (isNew) location.hash = '#/camera/' + d.id; else viewCamera(d.id);
    };

    const del = $('deleteBtn');
    if (del) del.onclick = () => {
      openModal(`<div class="p-6">
        <h3 class="font-display text-lg">Удалить ${esc(draft.id)}?</h3>
        <p class="text-sm text-white/55 mt-2">Метка этой камеры перестанет работать, покупатели увидят «Метка не зарегистрирована». Журнал проверок сохранится.</p>
        <div class="flex gap-2 justify-end mt-6"><button data-close class="btn btn-ghost">Отмена</button><button id="confirmDel" class="btn btn-danger">Удалить</button></div></div>`);
      $('confirmDel').onclick = () => {
        db.cameras = db.cameras.filter(c => c.id !== draft.id);
        save(); closeModal(); toast('Камера удалена'); location.hash = '#/cameras';
      };
    };

    // Симулятор: ссылку считаем в момент клика, чтобы счётчик был актуальным
    document.querySelectorAll('[data-sim]').forEach(b => b.onclick = () => {
      const fresh = S.camera(S.load(), draft.id);
      window.open(V.demoLinks(fresh, verifyBase())[b.dataset.sim], '_blank');
    });

    const bind = $('bindBtn');
    if (bind && !isNew) bind.onclick = () => bindWizard(draft);
    const unbind = $('unbindBtn');
    if (unbind) unbind.onclick = () => {
      openModal(`<div class="p-6">
        <h3 class="font-display text-lg">Отвязать чип?</h3>
        <p class="text-sm text-white/55 mt-2">Старая метка перестанет подтверждать подлинность этой камеры (покупатели увидят «Метка не прошла проверку»). Используйте при замене чипа.</p>
        <div class="flex gap-2 justify-end mt-6"><button data-close class="btn btn-ghost">Отмена</button><button id="confirmUnbind" class="btn btn-danger">Отвязать</button></div></div>`);
      $('confirmUnbind').onclick = () => {
        const cam = S.camera(db, draft.id);
        cam.chip = null;
        save(); closeModal(); toast('Чип отвязан'); viewCamera(cam.id);
      };
    };
  }

  /* ---------- Мастер привязки чипа ---------- */
  let nfcAbort = null;
  const hasWebNfc = 'NDEFReader' in window;

  function bindWizard(cam) {
    const url = chipUrl(cam);
    let uid = '';

    const step = (n, title, body) => `
      <div class="flex gap-4">
        <span class="w-7 h-7 shrink-0 rounded-full bg-gold/15 text-gold text-sm font-semibold grid place-items-center">${n}</span>
        <div class="flex-1 min-w-0 pb-6"><p class="font-medium">${title}</p><div class="text-sm text-white/55 mt-1.5">${body}</div></div>
      </div>`;

    openModal(`
      <div class="p-6">
        <div class="flex justify-between items-start">
          <div><h3 class="font-display text-lg">Привязка чипа</h3><p class="text-sm text-white/45 mt-1">${esc(cam.brand)} ${esc(cam.model)} · <span class="font-mono">${esc(cam.id)}</span></p></div>
          <button data-close class="w-8 h-8 rounded-full hover:bg-white/10">✕</button>
        </div>

        <div class="mt-6">
          ${step(1, 'Запишите ссылку в чип', `
            Приложение <b class="text-white/80">NXP TagWriter</b> (бесплатно, Android/iOS) → Write → New dataset → Link. Вставьте ссылку:
            <div class="flex gap-2 mt-2"><code class="flex-1 font-mono text-[11px] break-all bg-black/30 border border-white/10 rounded-lg p-2 text-white/80">${esc(url)}</code>
            <button type="button" id="copyUrl" class="btn btn-ghost !px-3 !py-2 text-xs shrink-0">Копировать</button></div>
            <p class="mt-2">В «Advanced settings» включите <b class="text-white/80">UID mirror</b> и <b class="text-white/80">Counter mirror</b>, затем запишите и включите <b class="text-white/80">защиту паролем</b>.</p>`)}
          ${step(2, 'Считайте UID чипа', `
            ${hasWebNfc
              ? `<button type="button" id="scanUid" class="btn btn-gold !py-2 mt-1">Считать этим телефоном</button><p id="scanHint" class="text-xs mt-2 text-white/40"></p>`
              : `<p class="text-xs text-white/40">Автосчитывание работает в Chrome на Android. Здесь введите UID вручную: его показывает TagWriter (14 символов).</p>`}
            <div class="flex gap-2 mt-3">
              <input id="uidInput" class="fr-input font-mono uppercase !py-2" maxlength="20" placeholder="04A1B2C3D4E5F6">
              <button type="button" id="genUid" class="btn btn-ghost !px-3 !py-2 text-xs shrink-0" title="Для демо">Тест-UID</button>
            </div>
            <p id="uidErr" class="hidden text-xs text-red-400 mt-1.5">UID — 14 шестнадцатеричных символов (7 байт)</p>`)}
          ${step(3, 'Сохраните привязку', 'После сохранения первое касание телефоном покажет «Оригинал».')}
        </div>

        <button id="doBind" class="btn btn-gold w-full !py-3">Привязать чип к ${esc(cam.id)}</button>
      </div>`);

    $('copyUrl').onclick = () => navigator.clipboard?.writeText(url).then(() => toast('Ссылка скопирована'), () => toast('Скопируйте вручную'));
    $('genUid').onclick = () => {
      $('uidInput').value = '04' + [...crypto.getRandomValues(new Uint8Array(6))].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    };

    const scanBtn = $('scanUid');
    if (scanBtn) scanBtn.onclick = async () => {
      try {
        nfcAbort = new AbortController();
        const reader = new NDEFReader();
        await reader.scan({ signal: nfcAbort.signal });
        $('scanHint').textContent = 'Приложите телефон к чипу…';
        reader.onreading = ev => {
          $('uidInput').value = ev.serialNumber.replace(/:/g, '').toUpperCase();
          $('scanHint').textContent = 'UID считан ✓';
          nfcAbort.abort(); nfcAbort = null;
        };
      } catch (err) { $('scanHint').textContent = 'Не удалось запустить NFC: ' + err.message; }
    };

    $('doBind').onclick = () => {
      uid = $('uidInput').value.replace(/[^0-9a-f]/gi, '').toUpperCase();
      if (!/^[0-9A-F]{14}$/.test(uid)) { $('uidErr').classList.remove('hidden'); return; }
      const taken = db.cameras.find(c => c.chip && c.chip.uid === uid && c.id !== cam.id);
      if (taken) { $('uidErr').textContent = `Этот чип уже привязан к ${taken.id}`; $('uidErr').classList.remove('hidden'); return; }

      // TODO(backend): POST /api/cameras/:id/chip
      const target = S.camera(db, cam.id);
      target.chip = { uid, counter: 0, boundAt: new Date().toISOString() };
      if (target.status === 'draft') target.status = 'active';
      save(); closeModal(); toast('Чип привязан'); viewCamera(target.id);
    };
  }

  /* ================= ЖУРНАЛ ПРОВЕРОК ================= */
  let scanFilter = 'all';
  function viewScans() {
    const list = db.scans.filter(s => scanFilter === 'all' || s.result === scanFilter);
    $('view').innerHTML = `
      ${pageHead('Журнал проверок', 'Каждое касание метки и каждый заход на страницу камеры')}
      <div id="scanTabs" class="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        ${[['all', 'Все'], ...Object.entries(RESULT).map(([k, v]) => [k, v.label])].map(([k, l]) => `
          <button data-r="${k}" class="shrink-0 px-3.5 py-2 rounded-full text-sm border ${scanFilter === k ? 'border-gold text-gold bg-gold/10' : 'border-white/10 text-white/60 hover:bg-white/5'}">
            ${l} <span class="text-white/35">${k === 'all' ? db.scans.length : db.scans.filter(s => s.result === k).length}</span></button>`).join('')}
      </div>
      <div class="card px-4">${list.length ? `<ul class="divide-y divide-white/5">${list.map(scanRow).join('')}</ul>` : '<p class="py-10 text-center text-white/45">Нет записей</p>'}</div>
      <div class="card p-5 mt-4 text-sm text-white/55 grid sm:grid-cols-2 gap-3">
        <p><span class="text-verified">Оригинал</span> — касание подлинной метки, счётчик новый.</p>
        <p><span class="text-amber-300">Повтор ссылки</span> — открыли старую сохранённую ссылку.</p>
        <p><span class="text-red-300">Подделка</span> — ссылка записана на чужой чип (UID не совпал).</p>
        <p><span class="text-white/70">Без подписи</span> — страницу открыли по ID, без касания.</p>
      </div>`;
    $('scanTabs').onclick = e => { const b = e.target.closest('[data-r]'); if (b) { scanFilter = b.dataset.r; viewScans(); } };
  }

  /* ================= НАСТРОЙКИ ================= */
  function viewSettings() {
    const s = db.settings;
    $('view').innerHTML = `
      ${pageHead('Настройки', 'Контакты показываются покупателям на странице проверки')}
      <form id="setForm" class="card p-5 grid sm:grid-cols-2 gap-4 max-w-3xl">
        ${field('Название магазина', `<input name="shopName" class="fr-input" value="${esc(s.shopName)}">`)}
        ${field('Телефон', `<input name="phone" class="fr-input" value="${esc(s.phone)}">`)}
        ${field('Telegram (без @)', `<input name="telegram" class="fr-input" value="${esc(s.telegram)}">`)}
        ${field('Instagram (без @)', `<input name="instagram" class="fr-input" value="${esc(s.instagram)}">`)}
        ${field('Адрес', `<input name="address" class="fr-input" value="${esc(s.address)}">`, 'sm:col-span-2')}
        ${field('Домен сайта проверки', `<input name="domain" class="fr-input font-mono" value="${esc(s.domain)}">`, 'sm:col-span-2')}
        <div class="sm:col-span-2"><button class="btn btn-gold">Сохранить</button></div>
      </form>
      <section class="card p-5 mt-5 max-w-3xl">
        <h2 class="font-semibold">Демо-данные</h2>
        <p class="text-sm text-white/55 mt-1">Сейчас данные хранятся в этом браузере. Сброс вернёт 8 тестовых камер и журнал.</p>
        <button id="resetBtn" class="btn btn-danger mt-4">Сбросить демо-данные</button>
      </section>`;

    $('setForm').onsubmit = e => {
      e.preventDefault();
      const f = e.target.elements;
      ['shopName', 'phone', 'telegram', 'instagram', 'address', 'domain'].forEach(k => { db.settings[k] = f[k].value.trim().replace(/^@/, ''); });
      save(); toast('Настройки сохранены');
    };
    $('resetBtn').onclick = () => { db = S.reset(); toast('Данные сброшены'); route(); };
  }

  /* ---------- старт ---------- */
  function boot() {
    const authed = isAuthed();
    $('login').classList.toggle('hidden', authed);
    $('shell').classList.toggle('hidden', !authed);
    if (authed) route();
  }
  boot();
})();
