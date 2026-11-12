(() => {
  'use strict';
  const q = selector => document.querySelector(selector);
  const fields = q('#settings-fields'), form = q('#settings-form'), opening = q('#opening');
  const names = {closed: 'Elle kapalı · Ön kayıt', scheduled: 'Otomatik açılış', open: 'Oyun açık', maintenance: 'Bakım modu'};
  let saved = null, busy = false, csrf = '', serverOffset = 0;
  const mode = () => form.elements.mode.value;
  const dateValue = value => Number.isSafeInteger(value) && value > 0 && value < 4102444800000 ? new Date(value + 10800000).toISOString().slice(0, 16) : '';
  function openingTime(value) {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return NaN;
    const time = Date.parse(value + ':00+03:00');
    return dateValue(time) === value ? time : NaN;
  }
  function say(message) {q('#message').textContent = message;}
  function selection() {
    const scheduled = mode() === 'scheduled';
    q('#opening-field').hidden = !scheduled;
    opening.required = scheduled;
    opening.disabled = !scheduled;
    q('#save').disabled = !saved || (mode() !== 'maintenance' && saved.panel511.canOpen !== true);
    countdown();
  }
  function countdown() {
    if (mode() !== 'scheduled') return;
    const target = openingTime(opening.value);
    if (!Number.isFinite(target)) {q('#countdown').textContent = 'Açılış tarihini ve saatini seç.'; return;}
    const left = Math.max(0, Math.ceil((target - Date.now() - serverOffset) / 1000));
    q('#countdown').textContent = left ? 'Açılışa: ' + Math.floor(left / 86400) + ' gün ' + [Math.floor(left / 3600) % 24, Math.floor(left / 60) % 60, left % 60].map(n => String(n).padStart(2, '0')).join(':') : 'Bu saat geldi veya geçti. Otomatik açılış olarak kaydedersen giriş hemen açılır.';
  }
  async function request(url, body) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      const cookie = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith('__Host-yasam-csrf='))?.slice('__Host-yasam-csrf='.length) || '';
      const response = await fetch(url, {method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: {Accept: 'application/json', ...(body ? {'Content-Type': 'application/json', 'x-csrf-token': csrf || decodeURIComponent(cookie)} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || data.message || 'Yönetici oturumu doğrulanamadı. Yönetici girişini kullan.');
      return data;
    } finally {clearTimeout(timer);}
  }
  function accept(data) {
    if (!data.settings || !Object.hasOwn(names, data.settings.mode) || !Number.isSafeInteger(data.settings.revision) || !data.panel511) throw Error('Oyun durumu doğrulanamadı. Durumu yenile.');
    saved = data;
    if (Number.isFinite(data.status?.serverTime)) serverOffset = data.status.serverTime - Date.now();
    const settings = data.settings, panel = data.panel511;
    const currentMode = settings.enabled === 0 && settings.mode !== 'maintenance' ? 'open' : settings.mode;
    form.elements.mode.value = currentMode;
    for (const option of form.elements.mode) option.disabled = option.value !== 'maintenance' && panel.canOpen !== true;
    opening.value = dateValue(settings.public_opens_at);
    q('#maintenance-text').value = settings.maintenance_text || '';
    q('#state').textContent = panel.confirmedOpen ? 'Oyun açık · doğrulandı' : names[currentMode];
    q('#detail').textContent = 'Kaydedilen seçim: ' + names[currentMode] + ' · Revizyon: ' + settings.revision;
    q('#reason').textContent = panel.reason || (currentMode === 'closed' ? 'Ön kayıt açık. Oyuncu girişi sen açana kadar kapalı.' : currentMode === 'scheduled' ? 'Geri sayım kaydedilen Türkiye saatini kullanır.' : currentMode === 'maintenance' ? 'Sunucunun bakım kuralları uygulanıyor.' : panel.confirmedOpen ? 'Oyuncu girişi ve dünya işlemleri açık.' : 'Açılış henüz doğrulanmadı. Durumu yenile.');
    fields.disabled = busy;
    selection();
  }
  async function refresh() {
    const data = await request('/api/admin/launch');
    accept(data);
  }
  form.addEventListener('change', () => {selection(); say('Değişiklikler henüz kaydedilmedi.');});
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !saved || !form.reportValidity()) return;
    const selected = mode(), at = openingTime(opening.value);
    if (selected === 'scheduled' && !Number.isFinite(at)) {say('Geçerli bir Türkiye tarihi ve saati seç.'); opening.focus(); return;}
    // The native service remains the single writer. Its revision and readiness
    // checks also cover manual closed and scheduled modes.
    const settings = {...saved.settings, enabled: 1, mode: selected, maintenance_text: q('#maintenance-text').value, ...(selected === 'scheduled' ? {public_opens_at: at} : {})};
    busy = true; fields.disabled = true; q('#refresh').disabled = true; say('Oyun durumu kaydediliyor…');
    try {
      const result = await request('/api/admin/launch', {action: 'save', settings});
      accept(result);
      say(result.settings.mode !== selected ? 'Sunucu farklı bir durum bildirdi. Yukarıdaki güncel durumu kontrol et.' : selected === 'open' && !result.panel511.confirmedOpen ? 'Açılış henüz doğrulanmadı. Güncel durumu kontrol et.' : 'Oyun durumu kaydedildi.');
    } catch (error) {
      // A lost response may follow a successful write. Never replay the POST.
      say((error.name === 'AbortError' ? 'Yanıt süresi doldu.' : error.message) + ' Güncel durum yeniden okunuyor.');
      try {await refresh(); say('Son işlem yanıtı doğrulanamadı. Yukarıda sunucuda kayıtlı olan güncel durum gösteriliyor; kontrol ederek devam et.');}
      catch {saved = null; say('İşlem sonucu doğrulanamadı. Durumu yenile; aynı işlemi otomatik tekrarlamadık.');}
    } finally {busy = false; fields.disabled = !saved; q('#refresh').disabled = false;}
  });
  q('#refresh').addEventListener('click', async () => {
    if (busy) return;
    busy = true; fields.disabled = true; q('#refresh').disabled = true;
    try {await refresh(); say('Güncel oyun durumu yüklendi.');}
    catch (error) {saved = null; say(error.message);}
    finally {busy = false; fields.disabled = !saved; q('#refresh').disabled = false;}
  });
  setInterval(() => {if (!document.hidden) countdown();}, 1000);
  void (async () => {
    const me = await request('/api/auth/me');
    csrf = typeof me.csrfToken === 'string' ? me.csrfToken : '';
    await refresh();
  })().catch(error => {saved = null; fields.disabled = true; q('#state').textContent = 'Yönetici girişi gerekli'; say(error.message);});
})();
