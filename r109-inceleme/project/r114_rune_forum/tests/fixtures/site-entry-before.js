(() => {
  'use strict';
  const all = selector => [...document.querySelectorAll(selector)];
  const entry = 'https://accounts.coreoflife.net/?servers=1&intent=login';
  const registration = 'https://accounts.coreoflife.net/?servers=1&intent=register';
  const nativePortal = 'https://accounts.coreoflife.net/?native=1';
  const isPreregPage = document.body.classList.contains('prereg-page');
  const isOpen = data => !!data && data.showLanding === false && data.canPlay === true && ['normal', 'open'].includes(data.phase);
  const isPrereg = data => !!data && data.showLanding === true && data.registrationOpen === true && ['waiting', 'ended'].includes(data.phase);
  const timestamp = value => typeof value === 'number' ? value : NaN;
  let launchAt = 0, serverAt = 0, measuredAt = performance.now();
  let request = null, nextCheck = null, state = null, known = false, errors = 0, redirecting = false;
  const now = () => serverAt + performance.now() - measuredAt;
  const timed = () => known && state.enabled === true && state.mode === 'scheduled' && state.phase === 'waiting' && launchAt > 0;
  function status(message) {
    for (const node of all('[data-launch-status]')) {
      node.hidden = !message;
      if (node.textContent !== message) node.textContent = message;
    }
    const gate = document.querySelector('[data-prereg-gate-message]');
    if (gate) gate.textContent = message || 'Oyun durumu kontrol ediliyor…';
  }
  function render() {
    const open = known && isOpen(state), prereg = known && isPrereg(state), countdown = timed();
    const remaining = Math.max(0, Math.ceil((launchAt - now()) / 1000));
    const parts = {days: Math.floor(remaining / 86400), hours: Math.floor(remaining / 3600) % 24, minutes: Math.floor(remaining / 60) % 60, seconds: remaining % 60};
    for (const key of Object.keys(parts)) for (const node of all(`[data-count="${key}"]`)) node.textContent = known ? String(parts[key]).padStart(2, '0') : '—';
    for (const node of all('[data-countdown], [data-launch-date], [data-scheduled-launch]')) node.hidden = !countdown;
    for (const node of all('[data-before-launch]')) node.hidden = open;
    for (const node of all('[data-after-launch]')) node.hidden = !open;
    const heading = !known ? 'EFSANE · OYUN DURUMU' : open ? 'MACERAYA KATIL' : state.phase === 'maintenance' ? 'BAKIM' : countdown ? 'BÜYÜK AÇILIŞA KALAN' : prereg ? 'ÖN KAYIT AÇIK' : 'OYUN DURUMU';
    const note = !known ? 'Güncel oyun durumu yükleniyor.' : open ? 'Hesabınla giriş yapabilir veya yeni hesap oluşturabilirsin.' : state.phase === 'maintenance' ? (state.maintenanceText || 'Kısa bir mola. Giriş yeniden açıldığında buradan devam edebilirsin.') : countdown ? 'Türkiye saati · Ön kaydını tamamla, açılışta aynı hesabınla katıl.' : 'Ön kaydını tamamla. Oyun açıldığında aynı hesabınla giriş yap.';
    for (const node of all('[data-launch-heading]')) node.textContent = 'CORE EFSANE · ' + heading;
    for (const node of all('[data-launch-note]')) node.textContent = note;
    for (const link of all('[data-launch-action]')) {
      link.href = link.dataset.entryIntent === 'register' ? registration : entry;
      const text = link.querySelector('[data-launch-label]');
      if (text) text.textContent = link.dataset.entryIntent === 'register' ? 'Kayıt ol' : 'Oyuna giriş yap';
    }
    for (const link of all('[data-game-entry]')) link.href = entry;
    for (const panel of all('[data-launch-panel]')) panel.classList.toggle('is-open', open);
    if (countdown) {
      const date = new Date(launchAt);
      for (const node of all('[data-launch-date]')) {
        node.dateTime = date.toISOString();
        node.textContent = new Intl.DateTimeFormat('tr-TR', {day: 'numeric', month: 'long', weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul'}).format(date);
      }
    }
    if (isPreregPage) {
      document.body.classList.toggle('prereg-active', prereg);
      const gate = document.querySelector('[data-prereg-gate]');
      if (gate) gate.hidden = prereg;
      if (known && !prereg && !redirecting) {
        redirecting = true;
        const message = document.querySelector('[data-prereg-gate-message]');
        if (message) message.textContent = 'Hesap sayfasına yönlendiriliyorsun…';
        // A root request with a query uses the unchanged native account portal.
        // It preserves login, registration, maintenance, and early-access rules.
        location.replace('/?native=1');
      }
    }
  }
  function schedule(delay) {
    clearTimeout(nextCheck);
    nextCheck = setTimeout(() => {nextCheck = null; if (!document.hidden) void refresh();}, delay);
  }
  async function refresh() {
    if (request) return request;
    request = (async () => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
      const started = performance.now();
      try {
        const response = await fetch('/api/site-launch', {credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: {Accept: 'application/json'}});
        if (!response.ok) throw new Error('launch_unavailable');
        const data = await response.json(), serverTime = timestamp(data.serverTime);
        const opening = timestamp(data.publicOpeningAt) > 0 ? timestamp(data.publicOpeningAt) : timestamp(data.opensAt);
        if (!Number.isFinite(serverTime) || !['normal', 'waiting', 'open', 'ended', 'maintenance'].includes(data.phase) || typeof data.canPlay !== 'boolean' || typeof data.showLanding !== 'boolean' || typeof data.registrationOpen !== 'boolean') throw new Error('launch_invalid');
        measuredAt = performance.now();
        serverAt = serverTime + Math.min(2000, (measuredAt - started) / 2);
        launchAt = Number.isFinite(opening) && opening > 0 && opening < 4102444800000 ? opening : 0;
        state = data; known = true; errors = 0;
        status(timed() && now() >= launchAt ? 'Açılış durumu kontrol ediliyor. Giriş hazır olduğunda düğme burada görünecek.' : '');
        window.colLaunch.state = data;
        render();
        window.dispatchEvent(new CustomEvent('col:launch', {detail: data}));
        const left = launchAt - now();
        schedule(timed() ? left > 0 ? Math.min(60000, Math.max(250, left + 80)) : 10000 : 60000);
      } catch {
        errors += 1; known = false;
        window.colLaunch.state = null;
        status('Oyun durumuna şu anda ulaşılamıyor. Yeniden deneyebilirsin.');
        window.dispatchEvent(new CustomEvent('col:launch-error'));
        schedule(Math.min(60000, 10000 * errors));
      } finally {
        clearTimeout(timeout); request = null; render();
      }
    })();
    return request;
  }
  window.colLaunch = {state: null, refresh, isOpen, isPrereg};
  for (const button of all('[data-launch-retry]')) button.addEventListener('click', () => {void refresh();});
  document.addEventListener('visibilitychange', () => {if (!document.hidden) {render(); void refresh();}});
  window.addEventListener('online', () => {void refresh();});
  // Clock text is local. Visible pages refresh policy once a minute and at a
  // scheduled opening; a manual closed state never opens from the counter.
  setInterval(() => {if (!document.hidden && timed()) render();}, 1000);
  render(); void refresh();
})();
