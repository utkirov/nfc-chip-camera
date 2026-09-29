(() => {
  const S = window.CameraCheckStore;
  const V = window.CameraCheckVerify;
  const { STATUS, CONDITION } = window.CameraCheckDict;
  const app = document.getElementById('app');
  document.getElementById('year').textContent = new Date().getFullYear();

  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmtDate = d => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtDateTime = d => new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const maskSerial = s => s.length <= 4 ? s : s.slice(0, 2) + '•'.repeat(Math.max(2, s.length - 6)) + s.slice(-4);

  const ICON = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    warn: '<path d="M12 8v5M12 16.5v.5"/><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    x: '<path d="M7 7l10 10M17 7 7 17"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    tap: '<path d="M6 8.5a8 8 0 0 1 0 7M9.5 6a12 12 0 0 1 0 12M13 4a16 16 0 0 1 0 16"/>',
    q: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  };
  const svg = (name, cls) => `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

  /* Как выглядит каждый результат проверки */
  const RESULT_VIEW = {
    original: {
      tone: 'ok', color: 'text-verified', ring: 'border-verified/60 bg-verified/10 shadow-[0_0_60px_rgba(61,255,162,.35)]', icon: 'check',
      title: 'Оригинал', sub: 'CAMERA CHECK VERIFIED',
      text: 'Метка подлинная и привязана именно к этой камере.',
      showFull: true,
    },
    replay: {
      tone: 'warn', color: 'text-amber-300', ring: 'border-amber-300/60 bg-amber-300/10', icon: 'tap',
      title: 'Приложите телефон ещё раз', sub: 'ССЫЛКА УЖЕ ИСПОЛЬЗОВАНА',
      text: 'Эта ссылка открывалась раньше, поэтому она не подтверждает подлинность. Коснитесь телефоном метки на камере: каждое касание создаёт новую проверку.',
      showFull: true,
    },
    unsigned: {
      tone: 'warn', color: 'text-white/70', ring: 'border-white/30 bg-white/5', icon: 'q',
      title: 'Подлинность не проверена', sub: 'ОТКРЫТО БЕЗ МЕТКИ',
      text: 'Страница открыта по ссылке или по ID, а не касанием метки. Данные камеры показаны для справки. Чтобы подтвердить оригинал, приложите телефон к камере.',
      showFull: true,
    },
    clone: {
      tone: 'bad', color: 'text-red-400', ring: 'border-red-400/60 bg-red-500/10 shadow-[0_0_60px_rgba(248,113,113,.3)]', icon: 'x',
      title: 'Метка не прошла проверку', sub: 'ВОЗМОЖНА ПОДДЕЛКА',
      text: 'Эта метка не совпадает с зарегистрированной для камеры. Не покупайте камеру, пока не свяжетесь с нами для проверки.',
      showFull: false,
    },
    blocked: {
      tone: 'bad', color: 'text-red-400', ring: 'border-red-400/60 bg-red-500/10', icon: 'lock',
      title: 'Камера заблокирована', sub: 'ЧИСЛИТСЯ В РОЗЫСКЕ',
      text: 'Владелец заявил о краже или утере этой камеры. Если вам её предлагают купить, пожалуйста, свяжитесь с нами.',
      showFull: false,
    },
    notfound: {
      tone: 'bad', color: 'text-white/70', ring: 'border-white/30 bg-white/5', icon: 'q',
      title: 'Метка не зарегистрирована', sub: 'НЕТ В БАЗЕ CAMERA CHECK',
      text: 'Такой камеры нет в нашей базе. Проверьте ID или свяжитесь с продавцом.',
      showFull: false,
    },
  };

  /* ---------- Главный экран без параметров ---------- */
  function renderHome() {
    app.innerHTML = `
      <section class="pt-12 text-center fade-up">
        <div class="relative w-28 h-28 mx-auto text-gold">
          <span class="ring"></span><span class="ring"></span>
          <div class="absolute inset-6 rounded-full bg-gold/10 border border-gold/40 grid place-items-center">${svg('tap', 'w-7 h-7')}</div>
        </div>
        <h1 class="font-display text-2xl mt-10 leading-tight">Приложите телефон<br>к метке на камере</h1>
        <p class="text-white/55 mt-4 text-sm">Мы проверим, что камера оригинальная, и покажем её данные: фото, серийный номер, комплектацию и гарантию.</p>
      </section>

      <ol class="mt-10 space-y-3">
        ${[
          ['Найдите метку', 'Значок Camera Check на корпусе камеры'],
          ['Приложите телефон', 'iPhone XS и новее или Android с включённым NFC'],
          ['Получите результат', '«Оригинал» и паспорт камеры за 1 секунду'],
        ].map(([t, d], i) => `
          <li class="card p-4 flex items-center gap-4">
            <span class="font-display text-lg text-gold w-8 text-center">${i + 1}</span>
            <div><p class="font-medium">${t}</p><p class="text-sm text-white/45">${d}</p></div>
          </li>`).join('')}
      </ol>

      <form id="idForm" class="card p-5 mt-8">
        <label for="camId" class="text-sm text-white/60">Нет NFC? Введите ID камеры</label>
        <div class="flex gap-2 mt-2">
          <input id="camId" class="fr-input uppercase" placeholder="CC-0001" autocomplete="off" autocapitalize="characters">
          <button class="btn btn-gold shrink-0">Найти</button>
        </div>
        <p class="text-xs text-white/35 mt-2">Поиск по ID показывает данные, но не подтверждает подлинность.</p>
      </form>`;

    document.getElementById('idForm').onsubmit = e => {
      e.preventDefault();
      const id = document.getElementById('camId').value.trim().toUpperCase();
      if (id) location.search = '?c=' + encodeURIComponent(id);
    };
  }

  /* ---------- Результат ---------- */
  function renderResult({ result, camera, scanNo }, settings) {
    const v = RESULT_VIEW[result];
    const checkedAt = fmtDateTime(new Date());

    app.innerHTML = `
      <section class="pt-10 text-center">
        <div class="pop w-24 h-24 mx-auto rounded-full border-2 grid place-items-center ${v.ring} ${v.color}">
          ${svg(v.icon, 'w-11 h-11')}
        </div>
        <h1 class="fade-up font-display text-[26px] leading-tight mt-6 ${v.color}">${v.title}</h1>
        <p class="fade-up text-[11px] tracking-[.22em] text-white/40 mt-2">${v.sub}</p>
        <p class="fade-up text-sm text-white/60 mt-4 max-w-sm mx-auto">${v.text}</p>
        ${result === 'original' ? `
          <p class="fade-up inline-flex items-center gap-2 mt-5 text-xs text-white/45 border border-white/10 rounded-full px-3 py-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-verified"></span>Проверка №${scanNo} · ${checkedAt}
          </p>` : ''}
      </section>

      ${camera ? cameraBlock(camera, v, result) : ''}
      ${contactsBlock(settings, v.tone === 'bad')}
      ${howItWorks()}
    `;

    const gallery = document.getElementById('gallery');
    if (gallery) {
      const dots = [...document.querySelectorAll('[data-dot]')];
      gallery.addEventListener('scroll', () => {
        const i = Math.round(gallery.scrollLeft / gallery.clientWidth);
        dots.forEach((d, j) => d.classList.toggle('!bg-white', i === j));
      }, { passive: true });
    }
  }

  function cameraBlock(c, v, result) {
    const status = STATUS[c.status];
    const photos = c.photos.length ? c.photos : [];
    const gallery = `
      <div class="relative mt-8 rounded-3xl border border-white/10 overflow-hidden spotlight ${v.tone}">
        <div id="gallery" class="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
          ${photos.map(p => `
            <div class="snap-center shrink-0 w-full aspect-[4/3] grid place-items-center p-8">
              <img src="${esc(S.img(p))}" alt="${esc(c.brand + ' ' + c.model)}" class="max-h-full max-w-full object-contain cam-shadow ${v.tone === 'bad' ? 'dim' : ''}" loading="lazy">
            </div>`).join('')}
        </div>
        ${photos.length > 1 ? `<div class="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          ${photos.map((_, i) => `<span data-dot class="w-1.5 h-1.5 rounded-full bg-white/25 ${i === 0 ? '!bg-white' : ''}"></span>`).join('')}</div>` : ''}
        <span class="absolute top-3 left-3 text-[11px] font-mono px-2 py-1 rounded-md bg-black/50 border border-white/10">${esc(c.id)}</span>
      </div>`;

    const head = `
      <div class="mt-5 flex items-start justify-between gap-3">
        <div>
          <p class="text-sm text-white/45">${esc(c.brand)}</p>
          <h2 class="font-display text-2xl leading-tight">${esc(c.model)}</h2>
        </div>
        ${v.showFull ? `<span class="shrink-0 text-xs px-2.5 py-1 rounded-full ${status.cls}">${status.label}</span>` : ''}
      </div>`;

    if (!v.showFull) {
      return `${gallery}${head}
        <dl class="card mt-5 divide-y divide-white/5 text-sm">
          ${row('Серийный номер', `<span class="font-mono">${esc(maskSerial(c.serial))}</span>`)}
        </dl>`;
    }

    return `${gallery}${head}
      ${c.description ? `<p class="mt-3 text-sm text-white/60">${esc(c.description)}</p>` : ''}

      <dl class="card mt-5 divide-y divide-white/5 text-sm">
        ${row('Серийный номер', `<span class="font-mono">${esc(maskSerial(c.serial))}</span>`)}
        ${row('Тип', esc(c.type))}
        ${row('Состояние', esc(CONDITION[c.condition] || c.condition))}
        ${c.shutter != null ? row('Пробег затвора', new Intl.NumberFormat('ru-RU').format(c.shutter) + ' кадров') : ''}
        ${c.chip ? row('Метка привязана', fmtDate(c.chip.boundAt)) : ''}
      </dl>

      ${c.kit?.length ? `
        <div class="mt-5">
          <p class="text-xs uppercase tracking-widest text-white/40 mb-2">Комплектация</p>
          <div class="flex flex-wrap gap-2">${c.kit.map(k => `<span class="text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10">${esc(k)}</span>`).join('')}</div>
        </div>` : ''}

      ${warrantyBlock(c)}`;
  }

  const row = (k, val) => `<div class="flex justify-between gap-4 px-4 py-3"><dt class="text-white/45">${k}</dt><dd class="text-right">${val}</dd></div>`;

  function warrantyBlock(c) {
    if (!c.warrantyMonths) return '';
    if (!c.soldAt) {
      return `<div class="card p-4 mt-5 flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 grid place-items-center text-gold">🛡️</span>
        <div class="text-sm"><p class="font-medium">Гарантия ${c.warrantyMonths} мес.</p><p class="text-white/45">Начнётся с даты покупки</p></div></div>`;
    }
    const start = new Date(c.soldAt);
    const end = new Date(start); end.setMonth(end.getMonth() + c.warrantyMonths);
    const total = end - start, left = end - Date.now();
    const pct = Math.max(0, Math.min(100, (left / total) * 100));
    const daysLeft = Math.ceil(left / 864e5);
    const active = left > 0;
    return `
      <div class="card p-4 mt-5">
        <div class="flex items-center justify-between text-sm">
          <p class="font-medium">Гарантия магазина</p>
          <p class="${active ? 'text-verified' : 'text-white/40'}">${active ? `осталось ${daysLeft} дн.` : 'истекла'}</p>
        </div>
        <div class="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden"><div class="h-full rounded-full ${active ? 'bg-verified' : 'bg-white/20'}" style="width:${pct}%"></div></div>
        <div class="mt-2 flex justify-between text-xs text-white/40"><span>Куплена ${fmtDate(start)}</span><span>до ${fmtDate(end)}</span></div>
      </div>`;
  }

  function contactsBlock(s, alert) {
    return `
      <section class="mt-8">
        <p class="text-xs uppercase tracking-widest text-white/40 mb-3">${alert ? 'Сообщить нам' : 'Продавец'}</p>
        <div class="card p-4">
          <p class="font-semibold">${esc(s.shopName)}</p>
          <p class="text-sm text-white/45">${esc(s.address)}</p>
          <div class="grid grid-cols-2 gap-2 mt-4">
            <a href="https://t.me/${esc(s.telegram)}" target="_blank" rel="noopener" class="btn btn-gold col-span-2 !py-3.5">Написать в Telegram</a>
            <a href="tel:${esc(s.phone.replace(/\s/g, ''))}" class="btn btn-ghost !py-3">Позвонить</a>
            <a href="https://instagram.com/${esc(s.instagram)}" target="_blank" rel="noopener" class="btn btn-ghost !py-3">Instagram</a>
          </div>
        </div>
      </section>`;
  }

  function howItWorks() {
    return `
      <details class="card p-4 mt-5 group">
        <summary class="cursor-pointer list-none flex justify-between items-center text-sm font-medium">
          Как работает проверка?<span class="text-gold group-open:rotate-45 transition text-lg">+</span>
        </summary>
        <p class="mt-3 text-sm text-white/55">В каждую камеру встроен NFC-чип с уникальным заводским номером. При каждом касании чип передаёт этот номер и счётчик касаний. Мы сверяем их с базой: номер должен совпадать с привязанным к камере, а счётчик — быть новым. Поэтому скопированная ссылка или переписанная метка не пройдут проверку.</p>
      </details>`;
  }

  /* ---------- Старт ---------- */
  const params = new URLSearchParams(location.search);
  const id = params.get('c');
  if (!id) { renderHome(); return; }

  const checking = document.getElementById('checking');
  checking.classList.remove('hidden');
  const db = S.load();
  const res = V.verify(db, { id, m: params.get('m') });

  // Ссылку с m= не чистим: если её обновить или переслать другу,
  // счётчик уже будет использован и проверка честно покажет «повтор».

  setTimeout(() => {
    renderResult(res, db.settings);
    checking.classList.add('hidden');
    if (res.result === 'original' && navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
  }, 1100);
})();
