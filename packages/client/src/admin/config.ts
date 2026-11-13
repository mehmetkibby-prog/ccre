/**
 * Yönetim ayarlarının paylaşılan kaydı (claude.ai Artifact veritabanı).
 * Herkes `config/game` belgesini okur, yalnız düzenleme yetkisi olan (sahip/Editör) yazar.
 * Son ayar bu cihazda da saklanır: oyun açılırken veritabanını beklemeden aynı ayarla başlar.
 */
import { applyTuning, sanitizeTuning, TUNING, type GameTuning } from '@col/shared';
import { onTuningChanged } from '../offline/local.ts';

const LS = 'col_tuning_v1';
type Listener = (t: GameTuning) => void;
const listeners = new Set<Listener>();
export const configState = { ready: false, canEdit: false, error: '', live: false };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
let db: Db = null;

function apply(raw: unknown) {
  const prev = { density: { ...TUNING.density }, bots: TUNING.bots, spawns: structuredClone(TUNING.spawns) };
  applyTuning(raw);
  onTuningChanged(prev);
  listeners.forEach((f) => f(TUNING));
}
// açılışta önbellekten (dünya kurulmadan önce)
try { const c = localStorage.getItem(LS); if (c) applyTuning(JSON.parse(c)); } catch { /* depolama kapalı olabilir */ }

/** Sunucudan gelen ayar (açılışta /api/tuning, oyunda 'tuning' mesajı): uygula ve dinleyicilere bildir. */
export function applyRemoteTuning(raw: unknown) { applyTuning(raw); listeners.forEach((f) => f(TUNING)); }

export function onConfig(f: Listener) { listeners.add(f); return () => { listeners.delete(f); }; }

let started = false;
export async function startConfigSync() {
  if (started) return; started = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claude = (window as any).claude;
  if (!claude?.use) { configState.ready = true; listeners.forEach((f) => f(TUNING)); return; }
  const [d, user] = await Promise.all([claude.use('db').catch(() => null), claude.use('user').catch(() => null)]);
  db = d;
  try { configState.canEdit = !!(await user?.canEdit()); } catch { configState.canEdit = false; }
  if (!db) { configState.ready = true; listeners.forEach((f) => f(TUNING)); return; }
  const timer = window.setTimeout(() => { if (!configState.ready) { configState.ready = true; configState.error = 'Ayarlara şu an ulaşılamıyor; son bilinen ayarlar kullanılıyor.'; listeners.forEach((f) => f(TUNING)); } }, 10_000);
  db.doc('config/game').onSnapshot((snap: { exists: boolean; data(): unknown; metadata: { fromCache: boolean } }) => {
    if (!snap.metadata.fromCache) { window.clearTimeout(timer); configState.error = ''; configState.live = true; }
    configState.ready = true;
    const data = snap.exists ? snap.data() : {};
    try { localStorage.setItem(LS, JSON.stringify(sanitizeTuning(data))); } catch { /* yok say */ }
    apply(data);
  }, (e: { code: string }) => { window.clearTimeout(timer); configState.ready = true; configState.error = e.code === 'revoked' ? '' : 'Ayar bağlantısı kesildi; son bilinen ayarlar kullanılıyor.'; listeners.forEach((f) => f(TUNING)); });
}

/** Yalnız düzenleme yetkisi olanlar; veritabanı reddederse hata fırlatır. */
export async function saveConfig(t: GameTuning) {
  if (!db) throw new Error('Paylaşılan ayar kaydına bu görünümden ulaşılamıyor.');
  const clean = sanitizeTuning(t);
  try { await db.doc('config/game').set(clean as unknown as Record<string, unknown>); }
  catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'invalid_argument') { configState.canEdit = false; throw new Error('Bu ayarları değiştirme yetkin yok.'); }
    if (code === 'unavailable') { await new Promise((r) => setTimeout(r, 400 + Math.random() * 600)); await db.doc('config/game').set(clean as unknown as Record<string, unknown>); return; }
    throw new Error('Kaydedilemedi: ' + ((e as Error).message ?? code));
  }
}
