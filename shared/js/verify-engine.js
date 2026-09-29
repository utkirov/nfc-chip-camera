/*
 * Логика проверки метки («сервер» в мок-режиме).
 *
 * Схема для простого чипа NTAG213/215/216 (без DNA):
 *   В чип записывается ссылка  https://cameracheck.uz/?c=CC-0001&m=
 *   и включается встроенная функция чипа «UID + counter mirror»:
 *   при КАЖДОМ чтении чип сам дописывает в конец ссылки свой заводской UID
 *   и счётчик касаний:  ?m=04A1B2C3D4E5F6x00000F
 *                          └── UID (14) ──┘ └cnt┘ (hex)
 *   После записи чип закрывается паролем (PWD_AUTH), чтобы ссылку нельзя было стереть или подменить.
 *
 * Сервер проверяет:
 *   1. камера существует                       → иначе notfound
 *   2. камера не заблокирована                 → иначе blocked
 *   3. в ссылке есть m=UIDxCOUNTER             → иначе unsigned (ссылку набрали/скопировали вручную)
 *   4. UID совпадает с привязанным к камере   → иначе clone (ссылку записали на чужую метку)
 *   5. счётчик больше последнего увиденного    → иначе replay (открыли старую сохранённую ссылку)
 *   Всё прошло → original, запоминаем новый счётчик.
 */
(function () {
  const MIRROR = /^([0-9A-F]{14})x([0-9A-F]{6})$/i;

  function parseMirror(m) {
    const match = MIRROR.exec(String(m || '').trim());
    if (!match) return null;
    return { uid: match[1].toUpperCase(), counter: parseInt(match[2], 16) };
  }

  function buildMirror(uid, counter) {
    return uid.toUpperCase() + 'x' + counter.toString(16).toUpperCase().padStart(6, '0');
  }

  function guessDevice() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return 'Android';
    return 'Компьютер';
  }

  /**
   * @returns {{result:string, camera?:object, counter?:number, scanNo?:number}}
   */
  function verify(db, { id, m }, { log = true } = {}) {
    const S = window.CameraCheckStore;
    const camera = S.camera(db, id);
    let result;
    let counter;

    if (!camera || camera.status === 'draft') result = 'notfound';
    else if (camera.status === 'blocked') result = 'blocked';
    else {
      const mirror = parseMirror(m);
      if (!mirror) result = 'unsigned';
      else if (!camera.chip || mirror.uid !== camera.chip.uid.toUpperCase()) result = 'clone';
      else if (mirror.counter <= camera.chip.counter) { result = 'replay'; counter = mirror.counter; }
      else {
        result = 'original';
        counter = mirror.counter;
        camera.chip.counter = mirror.counter;
      }
    }

    if (log && camera) {
      db.scans.unshift({
        id: 's' + Date.now(),
        cameraId: camera.id,
        result,
        at: new Date().toISOString(),
        city: 'Ташкент',          // на сервере — по IP
        device: guessDevice(),
      });
      S.save(db);
    }

    const scanNo = camera ? db.scans.filter(s => s.cameraId === camera.id && s.result === 'original').length : 0;
    return { result, camera, counter, scanNo };
  }

  /* Ссылки для симулятора касаний (демо) */
  function demoLinks(camera, base) {
    const url = (m) => `${base}?c=${encodeURIComponent(camera.id)}${m ? '&m=' + m : ''}`;
    const chip = camera.chip;
    return {
      original: chip ? url(buildMirror(chip.uid, chip.counter + 1)) : null,
      replay:   chip ? url(buildMirror(chip.uid, Math.max(0, chip.counter))) : null,
      clone:    url(buildMirror('04FFEEDDCCBBAA', 1)),
      unsigned: url(''),
    };
  }

  window.CameraCheckVerify = { verify, parseMirror, buildMirror, demoLinks };
})();
