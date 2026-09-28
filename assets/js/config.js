/*
 * Feromon Camera — единая конфигурация цен и дизайнов.
 * Все цены в сумах (UZS). Меняйте значения здесь — лендинг, калькулятор
 * и конструктор заказа подхватят их автоматически.
 */
window.FEROMON = {
  currency: 'сум',

  // Розничная цена одной NFC-метки (чип + профиль-визитка)
  basePrice: 150000,

  // Опциональная установка чипа в корпус камеры (за 1 шт.)
  installPrice: 50000,

  // Максимум в онлайн-конструкторе; больше — оптовый запрос менеджеру
  maxQty: 10,

  // Скидочная сетка: скидка применяется ко всем меткам в заказе
  tiers: [
    { min: 1,  max: 1,  discount: 0,  label: 'Старт' },
    { min: 2,  max: 3,  discount: 10, label: 'Дуо' },
    { min: 4,  max: 5,  discount: 15, label: 'Студия' },
    { min: 6,  max: 9,  discount: 20, label: 'Про' },
    { min: 10, max: 10, discount: 25, label: 'Опт' },
  ],

  // 10 дизайнов; top: true — пять самых популярных
  designs: [
    { id: 'onyx',     name: 'Onyx',      top: true,  from: '#1a1a1d', to: '#3a3a40', ring: '#e8b86d' },
    { id: 'titanium', name: 'Titanium',  top: true,  from: '#6b7280', to: '#d1d5db', ring: '#111827' },
    { id: 'carbon',   name: 'Carbon',    top: true,  from: '#0b0b0c', to: '#26262b', ring: '#9ca3af' },
    { id: 'aurum',    name: 'Aurum',     top: true,  from: '#a8792e', to: '#f3d18a', ring: '#1a1a1d' },
    { id: 'crimson',  name: 'Crimson',   top: true,  from: '#7f1d1d', to: '#ef4444', ring: '#fef2f2' },
    { id: 'arctic',   name: 'Arctic',    top: false, from: '#e5e7eb', to: '#ffffff', ring: '#0f172a' },
    { id: 'olive',    name: 'Olive',     top: false, from: '#3f4a2a', to: '#7c8b52', ring: '#f5f5dc' },
    { id: 'midnight', name: 'Midnight',  top: false, from: '#0f1b3d', to: '#2b4a9b', ring: '#c7d2fe' },
    { id: 'walnut',   name: 'Walnut',    top: false, from: '#4a2f1f', to: '#8b5a3c', ring: '#f5e6d3' },
    { id: 'neon',     name: 'Neon',      top: false, from: '#052e1f', to: '#3dffa2', ring: '#052e1f' },
  ],
};

/* Общая логика расчёта — используется калькулятором и конструктором */
window.FeromonPricing = {
  tierFor(qty) {
    const { tiers } = window.FEROMON;
    return tiers.find(t => qty >= t.min && qty <= t.max) || tiers[tiers.length - 1];
  },

  calc(qty, { installCount = 0 } = {}) {
    const cfg = window.FEROMON;
    const tier = this.tierFor(qty);
    const unit = Math.round(cfg.basePrice * (1 - tier.discount / 100));
    const retail = cfg.basePrice * qty;
    const chips = unit * qty;
    const install = cfg.installPrice * installCount;
    return {
      qty, tier, unit, retail, chips, install,
      savings: retail - chips,
      total: chips + install,
    };
  },

  fmt(n) {
    return new Intl.NumberFormat('ru-RU').format(n) + ' ' + window.FEROMON.currency;
  },
};
