(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const form = $('#registration-form');
  if (!form) return;
  const fields = $('#registration-fields'), submit = $('.registration-submit'), messageBox = $('#registration-message');
  let challenge = null, challengeStarted = 0, loadingChallenge = false, submitting = false;
  let sessionReady = false, launch = window.colLaunch?.state || null, launchReady = !!launch, authenticated = false;
  const open = () => launchReady && launch?.phase === 'open' && launch?.canPlay === true && Number(launch.serverTime) >= Date.parse('2026-10-30T20:00:00+03:00');
  function message(text, error = false, focus = false) {
    messageBox.textContent = text;
    messageBox.classList.toggle('is-error', error);
    if (focus) messageBox.focus();
  }
  function availability() {
    fields.disabled = !sessionReady || !launchReady || launch?.registrationOpen !== true || submitting;
    submit.disabled = fields.disabled || loadingChallenge || !challenge;
    $('#captcha-refresh').disabled = submitting || loadingChallenge;
    $('#registration-submit-label').textContent = submitting ? 'Hesabın oluşturuluyor…' : open() ? 'Hesabımı oluştur' : 'Ön kaydımı tamamla';
    $('[data-register-title]').textContent = open() ? 'Maceraya katıl.' : 'Ön kaydını tamamla.';
    $('[data-register-lead]').textContent = open() ? 'Yeniysen hesabını oluştur. Ön kaydın veya mevcut hesabın varsa doğrudan giriş yapabilirsin.' : 'Hesabını şimdi oluştur. Açılışta aynı kullanıcı adı ve parolanla giriş yap.';
    if (launchReady && launch?.registrationOpen === false && !authenticated) message('Kayıtlar şu anda kapalı. Durum güncellendiğinde form otomatik açılacak.', true);
    if (!launchReady && sessionReady && !authenticated && !submitting) message('Kayıt durumu doğrulanıyor. Bağlantı gelince form otomatik açılacak.', true);
  }
  async function api(path, options = {}) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(path, {credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: {'Content-Type': 'application/json', Accept: 'application/json'}, ...options});
      let data;
      try {data = await response.json();} catch {throw new Error('Sunucuya ulaşılamadı. Biraz sonra yeniden dene.');}
      if (!response.ok) {
        const error = new Error(typeof data.error === 'string' ? data.error : 'İşlem tamamlanamadı. Yeniden dene.');
        error.status = response.status; error.code = data.code;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Bağlantı zaman aşımına uğradı. İnternet bağlantını kontrol edip yeniden dene.');
      if (error instanceof TypeError) throw new Error('Bağlantı kurulamadı. İnternet bağlantını kontrol edip yeniden dene.');
      throw error;
    } finally {clearTimeout(timeout);}
  }
  async function loadChallenge(announce = false) {
    if (loadingChallenge || authenticated) return;
    loadingChallenge = true; challenge = null;
    $('#captcha-image').hidden = true; $('#captcha-placeholder').hidden = false; $('#captcha-placeholder').textContent = 'Kod hazırlanıyor…';
    $('#reg-captcha').value = '';
    availability();
    try {
      const data = await api('/api/auth/challenge', {method: 'POST', body: '{}'});
      if (typeof data.id !== 'string' || !/^[a-f0-9]{48}$/i.test(data.id) || typeof data.image !== 'string' || !data.image.startsWith('data:image/png;base64,') || data.image.length > 250000) throw new Error('Güvenlik kodu alınamadı. Yenile düğmesiyle tekrar dene.');
      $('#captcha-image').src = data.image;
      await $('#captcha-image').decode();
      $('#captcha-image').hidden = false; $('#captcha-placeholder').hidden = true;
      challenge = data.id; challengeStarted = performance.now();
      if (announce) message('Yeni güvenlik kodu hazır. Görseldeki altı rakamı yaz.');
    } catch (error) {
      $('#captcha-placeholder').textContent = 'Kod alınamadı';
      message(error.message, true);
    } finally {loadingChallenge = false; availability();}
  }
  function success(account, newlyRegistered = false) {
    authenticated = true;
    $('#registered-name').textContent = typeof account?.username === 'string' ? account.username : 'Maceracı';
    $('#registered-message').textContent = open() ? ', maceran seni bekliyor. Mevcut hesabınla oyuna katılabilirsin.' : ', maceradaki yerin ayrıldı. Kullanıcı adını ve parolanı sakla; açılışta aynı hesabınla katılacaksın.';
    $('#registration-form-view').hidden = true;
    $('#registration-success').hidden = false;
    if (newlyRegistered) {form.reset(); $('#registration-success').focus();}
  }
  async function initialize() {
    $('#registration-retry').hidden = true;
    message('Güvenli kayıt formu hazırlanıyor…');
    try {
      const session = await api('/api/auth/me');
      sessionReady = true;
      if (session.authenticated === true) {success(session.account); return;}
      await loadChallenge();
      if (challenge) message('Bilgilerini doldurarak hesabını oluşturabilirsin.');
    } catch (error) {
      message(error.message, true);
      $('#registration-retry').hidden = false;
    } finally {availability();}
  }
  $('#registration-retry').addEventListener('click', () => {void initialize();});
  $('#captcha-refresh').addEventListener('click', () => {void loadChallenge(true);});
  $('#password-toggle').addEventListener('click', event => {
    const visible = $('#reg-password').type === 'password';
    $('#reg-password').type = $('#reg-confirm').type = visible ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-pressed', String(visible));
    event.currentTarget.textContent = visible ? 'Parolayı gizle' : 'Parolayı göster';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || fields.disabled) return;
    const username = $('#reg-username').value.trim().normalize('NFKC'), password = $('#reg-password').value;
    if (!/^[\p{L}\p{N}_.-]{3,24}$/u.test(username)) {message('Kullanıcı adı 3–24 karakter olmalı; harf, rakam, nokta, alt çizgi veya kısa çizgi kullan.', true); $('#reg-username').focus(); return;}
    if ([...password].length < 9 || [...password].length > 128) {message('Parola 9–128 karakter arasında olmalı.', true); $('#reg-password').focus(); return;}
    if (password !== $('#reg-confirm').value) {message('Parolalar aynı değil. İki alana da aynı parolayı yaz.', true); $('#reg-confirm').focus(); return;}
    if (!challenge || performance.now() - challengeStarted > 290000) {await loadChallenge(true); $('#reg-captcha').focus(); return;}
    if (!form.reportValidity()) return;
    const body = {username, email: $('#reg-email').value.trim(), password, passwordConfirmation: $('#reg-confirm').value, captchaId: challenge, captchaAnswer: $('#reg-captcha').value, launchEmailConsent: form.elements.launchEmailConsent.checked};
    submitting = true; availability(); message('Hesabın güvenle oluşturuluyor…');
    try {
      const result = await api('/api/auth/register', {method: 'POST', body: JSON.stringify(body)});
      if (result.authenticated !== true) throw new Error('Hesap durumu doğrulanamadı. Sayfayı yenileyerek hesabını kontrol et.');
      success(result.account, true);
      void window.colLaunch?.refresh();
    } catch (error) {
      message(error.message, true, true);
      // Verification codes are single use; never retry account creation automatically.
      await loadChallenge();
    } finally {submitting = false; availability();}
  });
  window.addEventListener('col:launch', event => {
    const wasReady = launchReady;
    launch = event.detail; launchReady = true; availability();
    if (!wasReady && sessionReady && challenge) message('Bilgilerini doldurarak hesabını oluşturabilirsin.');
    if (authenticated) $('#registered-message').textContent = open() ? ', maceran seni bekliyor. Mevcut hesabınla oyuna katılabilirsin.' : ', maceradaki yerin ayrıldı. Açılışta aynı hesabınla katılacaksın.';
  });
  window.addEventListener('col:launch-error', () => {launchReady = false; availability();});
  void initialize();
})();
