/*
 * Feromon — мок-хранилище.
 * Пока нет сервера, «база данных» живёт в localStorage браузера.
 * Админка и страница проверки открываются с одного домена и видят одни и те же данные.
 * В продакшене этот файл заменяется вызовами API (fetch('/api/...')).
 */
(function () {
  const KEY = 'feromon.db.v1';

  const now = Date.now();
  const day = 864e5;
  const iso = t => new Date(t).toISOString();

  const seed = () => ({
    settings: {
      shopName: 'Feromon Camera',
      phone: '+998 90 123 45 67',
      telegram: 'feromon_camera',
      instagram: 'feromon.camera',
      address: 'Ташкент, ул. Амира Темура, 15',
      domain: 'check.feromon.uz',
    },
    cameras: [
      {
        id: 'FC-0001', brand: 'Canon', model: 'EOS 5D Mark IV', serial: '032021004521',
        type: 'Зеркальная', condition: 'used', shutter: 18400,
        kit: ['Body', 'Canon EF 24-105mm f/4L IS II', 'Аккумулятор LP-E6N ×2', 'Зарядка', 'Ремень'],
        description: 'Полнокадровая зеркалка в отличном состоянии. Матрица чистая, прошивка актуальная.',
        photos: ['shared/img/cameras/canon-5d4-1.webp', 'shared/img/cameras/canon-5d4-2.webp', 'shared/img/cameras/canon-5d4-3.webp'],
        status: 'sold', soldAt: iso(now - 40 * day), warrantyMonths: 6,
        chip: { uid: '04A1B2C3D4E5F6', counter: 14, boundAt: iso(now - 45 * day) },
        createdAt: iso(now - 50 * day),
      },
      {
        id: 'FC-0002', brand: 'Sony', model: 'Alpha a58', serial: '3845120',
        type: 'Зеркальная (SLT)', condition: 'used', shutter: 9200,
        kit: ['Body', 'Sony DT 18-55mm', 'Аккумулятор', 'Зарядка'],
        description: 'Отличная камера для старта. Полный комплект, без царапин на экране.',
        photos: ['shared/img/cameras/sony-a58-1.webp', 'shared/img/cameras/sony-a58-3.webp'],
        status: 'active', soldAt: null, warrantyMonths: 3,
        chip: { uid: '04B7C1D2E3F405', counter: 3, boundAt: iso(now - 10 * day) },
        createdAt: iso(now - 12 * day),
      },
      {
        id: 'FC-0003', brand: 'Nikon', model: 'D3100', serial: '6021784',
        type: 'Зеркальная', condition: 'used', shutter: 21000,
        kit: ['Body', 'AF-S 18-55mm VR', 'Аккумулятор EN-EL14', 'Сумка'],
        description: 'Надёжная зеркалка, идеально для обучения.',
        photos: ['shared/img/cameras/nikon-d3100-1.webp', 'shared/img/cameras/nikon-d3100-3.webp'],
        status: 'sold', soldAt: iso(now - 200 * day), warrantyMonths: 3,
        chip: { uid: '04C9E0A1B2C3D4', counter: 27, boundAt: iso(now - 210 * day) },
        createdAt: iso(now - 215 * day),
      },
      {
        id: 'FC-0004', brand: 'Fujifilm', model: 'X100', serial: '1AB09234',
        type: 'Компактная', condition: 'new', shutter: 120,
        kit: ['Body', 'Бленда', 'Аккумулятор', 'Коробка и документы'],
        description: 'Легендарный компакт с фиксированным объективом 23mm f/2. Как новый.',
        photos: ['shared/img/cameras/fuji-x100-1.webp'],
        status: 'active', soldAt: null, warrantyMonths: 12,
        chip: { uid: '04D2F3A4B5C6D7', counter: 1, boundAt: iso(now - 3 * day) },
        createdAt: iso(now - 4 * day),
      },
      {
        id: 'FC-0005', brand: 'Canon', model: 'EOS 7D', serial: '0480105512',
        type: 'Зеркальная', condition: 'used', shutter: 54000,
        kit: ['Body', 'EF-S 15-85mm', 'Батарейный блок BG-E7'],
        description: 'Камера заблокирована владельцем: заявлена как украденная.',
        photos: ['shared/img/cameras/canon-7d-1.webp'],
        status: 'blocked', soldAt: iso(now - 90 * day), warrantyMonths: 6,
        chip: { uid: '04E5A6B7C8D9E0', counter: 8, boundAt: iso(now - 95 * day) },
        createdAt: iso(now - 96 * day),
      },
      {
        id: 'FC-0006', brand: 'Sony', model: 'NEX-5N', serial: '5093311',
        type: 'Беззеркальная', condition: 'used', shutter: 6300,
        kit: ['Body', 'E 18-55mm', 'Вспышка'],
        description: 'Компактная беззеркалка. Чип ещё не привязан.',
        photos: ['shared/img/cameras/sony-nex-1.webp'],
        status: 'draft', soldAt: null, warrantyMonths: 3,
        chip: null,
        createdAt: iso(now - 1 * day),
      },
      {
        id: 'FC-0007', brand: 'Leica', model: 'III (1936)', serial: '186724',
        type: 'Дальномер, плёнка', condition: 'vintage', shutter: null,
        kit: ['Body', 'Elmar 50mm f/3.5', 'Кожаный кофр'],
        description: 'Коллекционный экземпляр. Шторки и дальномер обслужены в 2025 году.',
        photos: ['shared/img/cameras/leica-3-1.webp'],
        status: 'active', soldAt: null, warrantyMonths: 0,
        chip: { uid: '04F1A2B3C4D5E6', counter: 5, boundAt: iso(now - 20 * day) },
        createdAt: iso(now - 22 * day),
      },
      {
        id: 'FC-0008', brand: 'Pentax', model: 'K-5', serial: '4118270',
        type: 'Зеркальная', condition: 'used', shutter: 31000,
        kit: ['Body', 'smc DA 18-55mm WR'],
        description: 'Защищённый от погоды корпус, магниевый сплав.',
        photos: ['shared/img/cameras/pentax-k5-1.webp'],
        status: 'active', soldAt: null, warrantyMonths: 3,
        chip: { uid: '0409B8A7C6D5E4', counter: 2, boundAt: iso(now - 6 * day) },
        createdAt: iso(now - 7 * day),
      },
    ],
    scans: seedScans(now, day),
  });

  function seedScans(now, day) {
    const cities = ['Ташкент', 'Ташкент', 'Ташкент', 'Самарканд', 'Бухара', 'Наманган', 'Андижан', 'Фергана'];
    const devices = ['iPhone', 'iPhone', 'Android', 'Android', 'Android'];
    const plan = [
      ['FC-0001', 'original'], ['FC-0003', 'original'], ['FC-0002', 'original'], ['FC-0001', 'replay'],
      ['FC-0004', 'original'], ['FC-0005', 'blocked'], ['FC-0003', 'clone'], ['FC-0007', 'original'],
      ['FC-0001', 'original'], ['FC-0008', 'original'], ['FC-0002', 'unsigned'], ['FC-0003', 'original'],
      ['FC-0001', 'original'], ['FC-0007', 'original'], ['FC-0005', 'blocked'], ['FC-0002', 'original'],
    ];
    return plan.map(([cameraId, result], i) => ({
      id: 's' + (i + 1),
      cameraId, result,
      at: new Date(now - (i * 0.37 + Math.random() * 0.2) * day).toISOString(),
      city: cities[i % cities.length],
      device: devices[i % devices.length],
    }));
  }

  const Store = {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* приватный режим — работаем на seed */ }
      const db = seed();
      this.save(db);
      return db;
    },
    save(db) {
      try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
      catch (e) { console.warn('localStorage недоступен или переполнен', e); return false; }
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) {}
      return this.load();
    },
    nextCameraId(db) {
      const max = db.cameras.reduce((m, c) => Math.max(m, +c.id.split('-')[1] || 0), 0);
      return 'FC-' + String(max + 1).padStart(4, '0');
    },
    camera(db, id) {
      return db.cameras.find(c => c.id.toUpperCase() === String(id || '').toUpperCase());
    },
    /* путь к фото: относительный от корня сайта или data:URL из админки */
    img(path, root) {
      return /^(data:|https?:|blob:)/.test(path) ? path : (root ?? '../') + path;
    },
  };

  /* ---------- Справочники для UI ---------- */
  const STATUS = {
    draft:   { label: 'Черновик',     cls: 'bg-white/10 text-white/70' },
    active:  { label: 'В продаже',    cls: 'bg-sky-400/15 text-sky-300' },
    sold:    { label: 'Продана',      cls: 'bg-verified/15 text-verified' },
    blocked: { label: 'Заблокирована', cls: 'bg-red-500/15 text-red-300' },
  };
  const CONDITION = { new: 'Новая', used: 'Б/у', vintage: 'Винтаж' };
  const RESULT = {
    original: { label: 'Оригинал',          cls: 'bg-verified/15 text-verified' },
    replay:   { label: 'Повтор ссылки',     cls: 'bg-amber-400/15 text-amber-300' },
    clone:    { label: 'Подделка',          cls: 'bg-red-500/15 text-red-300' },
    unsigned: { label: 'Без подписи',       cls: 'bg-white/10 text-white/60' },
    blocked:  { label: 'Заблокирована',     cls: 'bg-red-500/15 text-red-300' },
    notfound: { label: 'Не найдена',        cls: 'bg-white/10 text-white/60' },
  };

  window.FeromonStore = Store;
  window.FeromonDict = { STATUS, CONDITION, RESULT };
})();
