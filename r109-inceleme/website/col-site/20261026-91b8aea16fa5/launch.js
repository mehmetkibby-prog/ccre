(() => {
  'use strict';
  const all = selector => [...document.querySelectorAll(selector)];
  const planned = Date.parse('2026-10-30T20:00:00+03:00');
  const entry = 'https://r1.coreoflife.net/api/realm/begin';
  const registration = 'https://accounts.coreoflife.net/on-kayit';
  let launchAt = planned, serverAt = Date.now(), verifiedServerAt = 0, measuredAt = performance.now();
  let request = null, nextCheck = null, state = null, known = false, errors = 0;
  const initialLabels = new Map(all('[data-launch-action]').map(link => [link, link.querySelector('[data-launch-label]')?.textContent || 'Ön kayıt ol']));
  const timestamp = value => typeof value === 'number' ? value : (typeof value === 'string' && /^\d{12,}$/.test(value) ? Number(value) : Date.parse(value));
  const now = () => serverAt + performance.now() - measuredAt;
  function status(message) {
    for (const node of all('[data-launch-status]')) {
      node.hidden = !message;
      if (node.textContent !== message) node.textContent = message;
    }
  }
  function render() {
    const open = known && state?.canPlay === true && state?.phase === 'open' && verifiedServerAt >= planned && now() >= launchAt;
    const remaining = Math.max(0, Math.ceil((launchAt - now()) / 1000));
    const parts = {days: Math.floor(remaining / 86400), hours: Math.floor(remaining / 3600) % 24, minutes: Math.floor(remaining / 60) % 60, seconds: remaining % 60};
    for (const key of Object.keys(parts)) for (const node of all(`[data-count="${key}"]`)) node.textContent = String(parts[key]).padStart(2, '0');
    for (const node of all('[data-countdown]')) node.hidden = open;
    for (const node of all('[data-before-launch]')) node.hidden = open;
    for (const node of all('[data-after-launch]')) node.hidden = !open;
    for (const node of all('[data-launch-heading]')) node.textContent = open ? 'KAPILAR AÇILDI' : state?.phase === 'maintenance' ? 'AÇILIŞ DURUMU' : 'BÜYÜK AÇILIŞA KALAN';
    for (const node of all('[data-launch-note]')) node.textContent = open ? 'Core of Life seni bekliyor. Ön kayıt hesabınla giriş yapabilir veya yeni hesap oluşturabilirsin.' : 'Türkiye saati · Ön kaydını tamamla, açılışta aynı hesabınla katıl.';
    for (const [link, label] of initialLabels) {
      link.href = open ? entry : registration;
      const text = link.querySelector('[data-launch-label]');
      if (text) text.textContent = open ? 'Oyuna gir' : label;
    }
    for (const link of all('[data-game-entry]')) link.href = entry;
    for (const panel of all('[data-launch-panel]')) panel.classList.toggle('is-open', open);
    if (known && !open && remaining === 0 && !request && !nextCheck) schedule(0);
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
        const data = await response.json(), serverTime = timestamp(data.serverTime), opening = timestamp(data.publicOpeningAt ?? data.opensAt);
        if (!Number.isFinite(serverTime) || !['waiting', 'open', 'maintenance'].includes(data.phase) || typeof data.canPlay !== 'boolean') throw new Error('launch_invalid');
        measuredAt = performance.now();
        verifiedServerAt = serverTime;
        serverAt = serverTime + Math.min(2000, (measuredAt - started) / 2);
        if (Number.isFinite(opening) && opening > 0) launchAt = Math.max(planned, opening);
        state = data; known = true; errors = 0;
        const date = new Date(launchAt);
        for (const node of all('[data-launch-date]')) {
          node.dateTime = date.toISOString();
          node.textContent = new Intl.DateTimeFormat('tr-TR', {day: 'numeric', month: 'long', weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul'}).format(date);
        }
        status(data.phase === 'maintenance' ? 'Oyun şu anda bakımda. Açılış durumu burada otomatik güncellenir.' : !data.canPlay && now() >= launchAt ? 'Açılış durumu kontrol ediliyor. Giriş hazır olduğunda düğme burada görünecek.' : '');
        window.colLaunch.state = data;
        window.dispatchEvent(new CustomEvent('col:launch', {detail: data}));
        const left = launchAt - now();
        schedule(data.phase === 'waiting' && left > 0 ? Math.min(60000, Math.max(250, left + 80)) : !data.canPlay && left <= 0 ? 10000 : 60000);
      } catch {
        errors += 1;
        known = false;
        window.colLaunch.state = null;
        status('Açılış bilgisine şu anda ulaşılamıyor. Bağlantı gelince otomatik güncellenecek.');
        window.dispatchEvent(new CustomEvent('col:launch-error'));
        schedule(Math.min(60000, 10000 * errors));
      } finally {
        clearTimeout(timeout);
        request = null;
        render();
      }
    })();
    return request;
  }
  window.colLaunch = {state: null, refresh};
  document.addEventListener('visibilitychange', () => {if (!document.hidden) {render(); void refresh();}});
  window.addEventListener('online', () => {void refresh();});
  // Only the text counter ticks locally; network status is checked once per minute
  // while visible, and once at the opening boundary. Server canPlay decides access.
  setInterval(() => {if (!document.hidden) render();}, 1000);
  render(); void refresh();
})();
