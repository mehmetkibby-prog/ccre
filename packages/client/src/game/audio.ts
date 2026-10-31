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

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
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
    } catch { this.ctx = null; }
  }
  applyVolume() {
    if (!this.ctx) return;
    const s = store.get().settings;
    this.sfxGain.gain.value = s.sfx * 0.6;
    this.musicGain.gain.value = s.music * 0.35;
  }
  setZone(z: string) { if (z === this.zone) return; this.zone = z; if (this.ctx) this.startAmbient(); }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0) {
    const c = this.ctx!; const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.05);
  }
  private noise(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', delay = 0, slide = 0) {
    const c = this.ctx!; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 1;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  play(name: string) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last.get(name) ?? 0) < 45) return;
    this.last.set(name, now);
    switch (name) {
      case 'swing': this.noise(0.18, 1800, 1.2, 0.35, 'bandpass', 0, 0.4); break;
      case 'hit': this.noise(0.08, 900, 1, 0.5, 'lowpass'); this.tone(140, 0.09, 'triangle', 0.25, 0.6); break;
      case 'crit': this.noise(0.14, 1400, 1, 0.6, 'lowpass'); this.tone(220, 0.16, 'square', 0.12, 0.5); this.tone(880, 0.12, 'sine', 0.1, 1.5, 0.02); break;
      case 'bow': this.tone(320, 0.12, 'triangle', 0.18, 0.5); this.noise(0.12, 3000, 2, 0.15, 'highpass'); break;
      case 'magic': this.tone(660, 0.25, 'sine', 0.15, 1.8); this.tone(990, 0.2, 'sine', 0.08, 1.4, 0.03); break;
      case 'skill': this.tone(440, 0.3, 'sawtooth', 0.08, 2); this.noise(0.3, 1200, 3, 0.2, 'bandpass', 0, 3); break;
      case 'boom': this.noise(0.5, 400, 0.7, 0.7, 'lowpass', 0, 0.3); this.tone(80, 0.4, 'sine', 0.4, 0.5); break;
      case 'heal': [523, 659, 784].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.1, 1, i * 0.06)); break;
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
