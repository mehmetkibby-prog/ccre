import { store } from './store.ts';

/**
 * Prosedürel ses: WebAudio ile anlık sentezlenen efektler ve bölge ambiyansı.
 * Tarayıcı otomatik ses engeli: ilk kullanıcı etkileşimine kadar bağlam askıda kalır.
 */
class Sfx {
  ctx: AudioContext | null = null;
  master!: GainNode; sfxGain!: GainNode; musicGain!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private ambient: { stop: () => void } | null = null;
  private zone = 'village';
  private last = new Map<string, number>();
  /** çağrı başına ses çarpanı (uzaktaki oyuncular kısık duyulur) */
  private k = 1;

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().then(() => this.startMusic()); else this.startMusic(); return; }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
      const n = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, n, n);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolume();
      this.startAmbient();
      if (this.ctx.state === 'running') this.startMusic(); else this.ctx.resume().then(() => this.startMusic());
    } catch { this.ctx = null; }
  }
  applyVolume() {
    if (!this.ctx) return;
    const s = store.get().settings;
    this.sfxGain.gain.value = s.sfx * 0.6;
    this.musicGain.gain.value = s.music * 0.35;
    if (this.music && !this.music.paused) { window.clearInterval(this.musicFade); this.music.volume = this.musicVol(); }
  }
  setZone(z: string) { if (z === this.zone) return; this.zone = z; if (this.ctx) this.startAmbient(); }

  // ───── harita müziği (akışla çalınır; ses seviyesi Ayarlar → Müzik) ─────
  private music: HTMLAudioElement | null = null;
  private musicUrl = '';
  private musicFade = 0;
  private ducked = false;
  /** Haritanın müziği; müziği olmayan haritada (ya da menüde) yavaşça susar. */
  setMusic(map: string | null) {
    const url = map === 'bazaar' ? (import.meta.env.BASE_URL ?? './') + 'sounds/bazaar.mp3' : '';
    if (url === this.musicUrl) return;
    this.musicUrl = url;
    const old = this.music; this.music = null;
    if (old) this.fadeTo(old, 0, 900, () => { old.pause(); old.src = ''; });
    if (!url) return;
    const a = new Audio(url); a.loop = true; a.preload = 'auto'; a.volume = 0;
    this.music = a;
    this.startMusic();
  }
  /** Nesne Market açıkken köy müziği kısılır (marketin kendi ezgisi çalar). */
  duckMusic(on: boolean) { this.ducked = on; this.applyVolume(); }
  private musicVol() { const v = store.get().settings.music; return this.ducked ? 0 : Math.min(1, v * 0.55); }
  private startMusic() {
    const a = this.music;
    if (!a || !this.ctx || this.ctx.state !== 'running') return; // ilk dokunuştan sonra unlock() yeniden dener
    if (!a.paused) return;
    a.play().then(() => this.fadeTo(a, this.musicVol(), 1600)).catch(() => { /* tarayıcı izin vermedi: sonraki dokunuşta */ });
  }
  private fadeTo(a: HTMLAudioElement, to: number, ms: number, done?: () => void) {
    const from = a.volume, t0 = performance.now();
    if (a === this.music) window.clearInterval(this.musicFade);
    const id = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { window.clearInterval(id); done?.(); }
    }, 50);
    if (a === this.music) this.musicFade = id;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0) {
    const c = this.ctx!; const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * this.k), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.05);
  }
  private noise(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', delay = 0, slide = 0) {
    const c = this.ctx!; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 1;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(Math.max(0.0002, vol * this.k), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  /** Yumuşak ayak darbesi: kısa ama tıklamasız yükselen (6 ms) süzgeçli gürültü. */
  private foot(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType, delay = 0) {
    const c = this.ctx!; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = c.createGain(); const v = Math.max(0.0002, vol * this.k);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxGain); s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
  }
  /**
   * Ayak sesi (animasyonda ayak yere değdiği anda çalınır): zemine göre boğuk bir basış + yüzey dokusu
   * (çimen hışırtısı, taşta kısa tık, karda gıcırtı, tahtada tok ses). Her adım biraz farklı; yumuşak, sürekli
   * duyulunca rahatsız etmeyecek düzeyde. k: uzaklık çarpanı (diğer oyuncular).
   */
  step(surface: 'grass' | 'stone' | 'dirt' | 'sand' | 'wood' | 'snow' | 'hoof', k = 1) {
    if (!this.ctx || this.ctx.state !== 'running' || k < 0.04 || store.get().settings.sfx <= 0) return;
    const v = 0.8 + Math.random() * 0.3, pr = 0.88 + Math.random() * 0.24;
    this.k = k;
    switch (surface) {
      case 'grass': this.foot(0.11, 420 * pr, 0.7, 0.2 * v, 'lowpass'); this.foot(0.09, 2500 * pr, 0.9, 0.045 * v, 'bandpass', 0.008); break;
      case 'stone': this.foot(0.07, 380 * pr, 0.8, 0.2 * v, 'lowpass'); this.foot(0.035, 2700 * pr, 2.5, 0.06 * v, 'bandpass'); break;
      case 'dirt': this.foot(0.1, 300 * pr, 0.7, 0.24 * v, 'lowpass'); this.foot(0.06, 1400 * pr, 1, 0.03 * v, 'bandpass', 0.01); break;
      case 'sand': this.foot(0.13, 1300 * pr, 0.6, 0.06 * v, 'bandpass'); this.foot(0.09, 320 * pr, 0.7, 0.13 * v, 'lowpass'); break;
      case 'wood': this.foot(0.09, 260 * pr, 1.2, 0.22 * v, 'lowpass'); this.tone(150 * pr, 0.07, 'sine', 0.05 * v, 0.7); break;
      case 'snow': this.foot(0.14, 700 * pr, 0.6, 0.12 * v, 'lowpass'); this.foot(0.11, 2600 * pr, 0.8, 0.04 * v, 'bandpass', 0.015); break;
      // nal: tok bir "tak" + kısa yankı
      case 'hoof': this.foot(0.05, 260 * pr, 0.8, 0.22 * v, 'lowpass'); this.foot(0.04, 1500 * pr, 2.2, 0.08 * v, 'bandpass'); this.tone(230 * pr, 0.05, 'triangle', 0.035 * v, 0.8); break;
    }
    this.k = 1;
  }

  play(name: string, k = 1) {
    if (!this.ctx || this.ctx.state !== 'running' || k < 0.04 || store.get().settings.sfx <= 0) return;
    const now = performance.now();
    if (now - (this.last.get(name) ?? 0) < 45) return;
    this.last.set(name, now);
    this.k = Math.min(1, k);
    try { this.playRaw(name); } finally { this.k = 1; }
  }
  private playRaw(name: string) {
    switch (name) {
      case 'swing': this.noise(0.18, 1800, 1.2, 0.35, 'bandpass', 0, 0.4); break;
      case 'hit': this.noise(0.08, 900, 1, 0.5, 'lowpass'); this.tone(140, 0.09, 'triangle', 0.25, 0.6); break;
      case 'crit': this.noise(0.14, 1400, 1, 0.6, 'lowpass'); this.tone(220, 0.16, 'square', 0.12, 0.5); this.tone(880, 0.12, 'sine', 0.1, 1.5, 0.02); break;
      case 'bow': this.tone(320, 0.12, 'triangle', 0.18, 0.5); this.noise(0.12, 3000, 2, 0.15, 'highpass'); break;
      case 'magic': this.tone(660, 0.25, 'sine', 0.15, 1.8); this.tone(990, 0.2, 'sine', 0.08, 1.4, 0.03); break;
      case 'skill': this.tone(440, 0.3, 'sawtooth', 0.08, 2); this.noise(0.3, 1200, 3, 0.2, 'bandpass', 0, 3); break;
      case 'boom': this.noise(0.5, 400, 0.7, 0.7, 'lowpass', 0, 0.3); this.tone(80, 0.4, 'sine', 0.4, 0.5); break;
      // köpek havlaması: iki kısa "hav" (kısık; sık değil, ara sıra)
      case 'bark': for (const dl of [0, 0.2]) { this.tone(420, 0.09, 'sawtooth', 0.07, 0.55, dl); this.noise(0.08, 900, 1.4, 0.12, 'bandpass', dl, 0.6); } break;
      // ── beceri sesleri ──
      case 'chain': for (let i = 0; i < 6; i++) this.noise(0.05, 3800 + i * 300, 6, 0.16, 'bandpass', i * 0.035); this.tone(1250, 0.25, 'triangle', 0.06, 0.6); break;
      case 'charge': this.noise(0.35, 500, 0.8, 0.35, 'bandpass', 0, 4); this.tone(110, 0.3, 'sawtooth', 0.06, 1.8); break;
      case 'impact': this.noise(0.7, 300, 0.7, 0.85, 'lowpass', 0, 0.25); this.tone(55, 0.6, 'sine', 0.55, 0.45); this.noise(0.12, 2600, 1, 0.35, 'bandpass'); this.noise(0.5, 900, 0.6, 0.18, 'lowpass', 0.08, 0.4); break;
      case 'shield': this.tone(294, 0.55, 'triangle', 0.12, 2); this.tone(588, 0.6, 'sine', 0.08, 1.5, 0.05); this.noise(0.6, 5000, 2, 0.06, 'highpass', 0.05); break;
      case 'holy': [392, 587, 784].forEach((f, i) => this.tone(f, 0.9, 'triangle', 0.07, 1.02, i * 0.05)); this.noise(0.9, 6000, 3, 0.05, 'highpass'); break;
      case 'volley': for (let i = 0; i < 4; i++) { this.tone(300 + i * 30, 0.1, 'triangle', 0.12, 0.5, i * 0.06); this.noise(0.1, 3200, 2, 0.1, 'highpass', i * 0.06); } this.noise(0.6, 1800, 0.8, 0.12, 'bandpass', 0.15, 0.4); break;
      case 'pierce': this.tone(340, 0.12, 'triangle', 0.18, 0.45); this.noise(0.3, 900, 1.5, 0.3, 'bandpass', 0, 5); break;
      case 'beam': this.tone(220, 0.55, 'sawtooth', 0.07, 3); this.tone(880, 0.5, 'sine', 0.09, 1.5, 0.04); this.noise(0.5, 2500, 1.2, 0.15, 'bandpass', 0, 2.5); break;
      case 'vine': this.noise(0.6, 260, 0.9, 0.5, 'lowpass', 0, 0.5); this.tone(85, 0.5, 'sawtooth', 0.06, 1.6); for (let i = 0; i < 4; i++) this.noise(0.05, 1500, 3, 0.12, 'bandpass', 0.05 + i * 0.07); break;
      case 'arcane': this.tone(330, 0.45, 'sine', 0.13, 3); this.tone(495, 0.4, 'sine', 0.08, 2.4, 0.04); this.noise(0.4, 3000, 4, 0.08, 'bandpass', 0, 2); break;
      case 'frost': this.noise(0.4, 6000, 1.2, 0.12, 'highpass', 0, 0.6); [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.05, 1, i * 0.05)); break;
      case 'shatter': for (let i = 0; i < 7; i++) this.noise(0.07, 4500 + Math.random() * 3000, 4, 0.16, 'bandpass', i * 0.03); this.tone(2400, 0.3, 'sine', 0.05, 0.8); this.noise(0.4, 400, 0.7, 0.3, 'lowpass'); break;
      case 'explode': this.noise(1.0, 500, 0.6, 0.9, 'lowpass', 0, 0.2); this.tone(48, 0.8, 'sine', 0.6, 0.4); this.tone(660, 0.5, 'sine', 0.08, 0.3); this.noise(0.25, 3000, 1, 0.25, 'bandpass'); break;
      case 'heal': [523, 659, 784].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.1, 1, i * 0.06)); break;
      // iksir içme: cam şişenin hafif tıkırtısı, iki yumuşak yudum (aşağı kayan boğuk gürültü + alçak "gulp"), sonda tek kabarcık
      case 'drink':
        this.tone(2350, 0.05, 'sine', 0.035, 0.92);
        for (const [dl, pf] of [[0.07, 1], [0.24, 0.9]] as const) {
          this.noise(0.11, 520 * pf, 1.1, 0.16, 'lowpass', dl, 0.55);
          this.tone(210 * pf, 0.1, 'sine', 0.12, 0.6, dl + 0.01);
        }
        this.tone(900, 0.06, 'sine', 0.025, 1.6, 0.42);
        break;
      case 'kill': this.tone(300, 0.2, 'triangle', 0.15, 0.4); break;
      case 'loot': this.tone(1046, 0.12, 'sine', 0.12); this.tone(1568, 0.16, 'sine', 0.1, 1, 0.05); break;
      case 'drop': this.tone(784, 0.25, 'triangle', 0.12, 1.2); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.14, 1, i * 0.09)); break;
      case 'teleport': this.tone(220, 0.6, 'sine', 0.15, 4); this.noise(0.6, 2000, 4, 0.15, 'bandpass', 0, 2); break;
      case 'death': this.tone(220, 0.9, 'sawtooth', 0.12, 0.3); break;
      case 'ui': this.tone(880, 0.06, 'sine', 0.08); break;
      case 'error': this.tone(180, 0.15, 'square', 0.06); break;
    }
  }

  /** Bölge ambiyansı: rüzgâr/kuşlar/su (sentez). */
  private startAmbient() {
    this.ambient?.stop();
    const c = this.ctx!; const out = c.createGain(); out.gain.value = 0.0; out.connect(this.musicGain);
    out.gain.linearRampToValueAtTime(1, c.currentTime + 2);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    const z = this.zone;
    f.frequency.value = z === 'frozen' ? 900 : z === 'black' ? 250 : z === 'lake' ? 600 : 400;
    const g = c.createGain(); g.gain.value = z === 'frozen' ? 0.18 : z === 'lake' ? 0.14 : 0.08;
    s.connect(f).connect(g).connect(out); s.start();
    let timer = 0 as unknown as number;
    if (z === 'forest' || z === 'village' || z === 'lake') {
      const chirp = () => {
        if (!this.ctx) return;
        const t = c.currentTime; const base = 2200 + Math.random() * 1600;
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
          const o = c.createOscillator(), gg = c.createGain();
          o.frequency.setValueAtTime(base, t + i * 0.12); o.frequency.exponentialRampToValueAtTime(base * 1.4, t + i * 0.12 + 0.07);
          gg.gain.setValueAtTime(0.0001, t + i * 0.12); gg.gain.exponentialRampToValueAtTime(0.025, t + i * 0.12 + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.09);
          o.connect(gg).connect(out); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.12);
        }
        timer = window.setTimeout(chirp, 2500 + Math.random() * 6000);
      };
      timer = window.setTimeout(chirp, 1500);
    }
    this.ambient = { stop: () => { clearTimeout(timer); out.gain.linearRampToValueAtTime(0, c.currentTime + 0.8); setTimeout(() => { try { s.stop(); } catch { /* */ } out.disconnect(); }, 900); } };
  }
}
export const sfx = new Sfx();
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => sfx.unlock(), { once: false, passive: true });
store.subscribe(() => sfx.applyVolume());
