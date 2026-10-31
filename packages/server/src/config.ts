import os from 'node:os';
const env = process.env;
const num = (k: string, d: number) => (env[k] ? Number(env[k]) : d);

export const config = {
  port: num('PORT', 8080),
  host: env.HOST ?? '0.0.0.0',
  databaseUrl: env.DATABASE_URL ?? 'postgres://col:col_dev_pw@127.0.0.1:5432/coreoflife',
  /** Kanal = ayrı worker thread = ayrı CPU çekirdeği. 8 çekirdekte 6 kanal + ana thread + DB önerilir. */
  channels: num('CHANNELS', Math.max(2, Math.min(6, os.cpus().length - 2))),
  channelCapacity: num('CHANNEL_CAPACITY', 120),
  realmCapacity: num('REALM_CAPACITY', 720),
  /** Aynı ekranda tam hızda gösterilen azami oyuncu; fazlası seyrek güncellenir. */
  aoiMaxPlayers: num('AOI_MAX_PLAYERS', 48),
  saveIntervalMs: num('SAVE_INTERVAL_MS', 15_000),
  sessionDays: num('SESSION_DAYS', 30),
  devMode: env.NODE_ENV !== 'production',
  staticDir: env.STATIC_DIR ?? new URL('../../client/dist', import.meta.url).pathname.replace(/\/$/, ''),
  /** Yalnız ayrı test ortamı: IP başına giriş/kayıt sınırlarını kapatır. Canlıda asla açma. */
  loadTestMode: env.LOADTEST === '1',
  wsMaxBuffered: num('WS_MAX_BUFFERED', 256 * 1024),
};
export type Config = typeof config;
