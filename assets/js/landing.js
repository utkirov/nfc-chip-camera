(() => {
  const cfg = window.FEROMON;
  const P = window.FeromonPricing;
  const $ = id => document.getElementById(id);

  $('year').textContent = new Date().getFullYear();

  // ---------- Сетка дизайнов ----------
  $('designGrid').innerHTML = cfg.designs.map(d => `
    <div class="card p-3 reveal">
      <div class="aspect-square rounded-xl grid place-items-center relative"
           style="background:linear-gradient(135deg,${d.from},${d.to})">
        <span class="w-1/2 aspect-square rounded-lg border-2 grid place-items-center"
              style="border-color:${d.ring}66">
          <svg viewBox="0 0 24 24" class="w-1/2" fill="none" stroke="${d.ring}" stroke-width="1.8">
            <path d="M6 8.5a8 8 0 0 1 0 7M9.5 6a12 12 0 0 1 0 12M13 4a16 16 0 0 1 0 16"/></svg>
        </span>
        ${d.top ? '<span class="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold text-ink">ХИТ</span>' : ''}
      </div>
      <p class="mt-3 text-sm font-medium">${d.name}</p>
    </div>`).join('');

  // ---------- Сетка скидок ----------
  $('tierGrid').innerHTML = cfg.tiers.map(t => {
    const unit = Math.round(cfg.basePrice * (1 - t.discount / 100));
    const range = t.min === t.max ? `${t.min} шт` : `${t.min}–${t.max} шт`;
    return `
      <button type="button" class="tier card p-4 text-left transition" data-min="${t.min}">
        <div class="flex items-center gap-2 text-xs text-white/50">
          <span class="tier-dot w-2 h-2 rounded-full bg-white/20"></span>${t.label}
        </div>
        <p class="mt-2 font-display text-lg">${range}</p>
        <p class="text-sm text-white/70 mt-1">${P.fmt(unit)}<span class="text-white/35">/шт</span></p>
        <p class="text-xs mt-2 ${t.discount ? 'text-verified' : 'text-white/35'}">${t.discount ? '−' + t.discount + '%' : 'розница'}</p>
      </button>`;
  }).join('');

  // ---------- Калькулятор ----------
  const qty = $('qty'), install = $('install');
  $('installPrice').textContent = P.fmt(cfg.installPrice);

  function render() {
    const q = +qty.value;
    const r = P.calc(q, { installCount: install.checked ? q : 0 });
    $('qtyOut').textContent = q;
    $('rQty').textContent = q;
    $('rBase').textContent = r.tier.discount ? P.fmt(cfg.basePrice) : '';
    $('rUnit').textContent = P.fmt(r.unit);
    $('rChips').textContent = P.fmt(r.chips);
    $('rInstall').textContent = r.install ? P.fmt(r.install) : '—';
    $('rSave').textContent = r.savings ? '−' + P.fmt(r.savings) : '—';
    $('rTotal').textContent = P.fmt(r.total);
    $('calcCta').href = `order.html?qty=${q}${install.checked ? '&install=1' : ''}`;
    document.querySelectorAll('.tier').forEach(el =>
      el.classList.toggle('active', +el.dataset.min === r.tier.min));
    // заливка трека слайдера
    const pct = (q - 1) / (cfg.maxQty - 1) * 100;
    qty.style.background = `linear-gradient(90deg,#e8b86d ${pct}%,rgba(255,255,255,.1) ${pct}%)`;
  }
  qty.addEventListener('input', render);
  install.addEventListener('change', render);
  document.querySelectorAll('.tier').forEach(el =>
    el.addEventListener('click', () => { qty.value = el.dataset.min; render(); }));
  render();

  // ---------- Появление при скролле ----------
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
