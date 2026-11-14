/**
 * Nesne Market müziği: WebAudio ile üretilen, müzik kutusu tadında hafif bir döngü (dosya indirmez).
 * Market açılınca başlar, kapanınca yumuşakça susar. Ses seviyesi ayarlardaki müzik seviyesine bağlı.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer = 0;
let step = 0;
let nextT = 0;
const BPM = 92, EIGHTH = 60 / BPM / 2;
// Do majör pentatonik, iki dörtlük cümle (0 = sus)
const MEL = [72, 76, 79, 81, 79, 76, 74, 0, 72, 74, 76, 79, 76, 74, 72, 0, 76, 79, 81, 84, 81, 79, 76, 74, 72, 74, 76, 74, 72, 0, 67, 0];
const BASS = [48, 0, 55, 0, 52, 0, 55, 0, 45, 0, 52, 0, 50, 0, 55, 0];
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function bell(t: number, note: number, vol: number) {
  if (!ctx || !master) return;
  for (const [mul, g0] of [[1, 1], [2, 0.32], [3.01, 0.12]] as const) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = mul === 1 ? 'triangle' : 'sine';
    o.frequency.value = hz(note) * mul;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * g0, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1 / mul);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.2);
  }
}
function pad(t: number, note: number, vol: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = hz(note);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + EIGHTH * 3.6);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + EIGHTH * 4);
}
function schedule() {
  if (!ctx) return;
  while (nextT < ctx.currentTime + 0.25) {
    const m = MEL[step % MEL.length];
    if (m) bell(nextT, m, 0.16);
    if (step % 2 === 0) { const b = BASS[(step / 2) % BASS.length]; if (b) pad(nextT, b, 0.12); }
    if (step % 8 === 6) bell(nextT + EIGHTH * 0.5, MEL[(step + 3) % MEL.length] + 12 || 84, 0.05); // ufak pırıltı
    nextT += EIGHTH; step++;
  }
}
export function startMallMusic(volume: number) {
  if (volume <= 0) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    master?.disconnect();
    master = ctx.createGain();
    // hafif yankı: geciktirilmiş, azalan kopya
    const delay = ctx.createDelay(); delay.delayTime.value = EIGHTH * 1.5;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    master.connect(ctx.destination); master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(ctx.destination);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(Math.min(1, volume) * 0.55, ctx.currentTime + 0.8);
    step = 0; nextT = ctx.currentTime + 0.1;
    window.clearInterval(timer);
    timer = window.setInterval(schedule, 60);
    schedule();
  } catch { /* ses yok */ }
}
export function stopMallMusic() {
  window.clearInterval(timer); timer = 0;
  if (ctx && master) { const m = master; m.gain.cancelScheduledValues(ctx.currentTime); m.gain.setValueAtTime(m.gain.value, ctx.currentTime); m.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4); setTimeout(() => m.disconnect(), 500); master = null; }
}
