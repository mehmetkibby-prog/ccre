export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }
import { OFFLINE } from './mode.ts';
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  if (OFFLINE) {
    const { localApi } = await import('./offline/local.ts');
    try { return await localApi(path, body); } catch (e: any) { throw new ApiError(e.status ?? 500, e.message); }
  }
  let r: Response;
  try {
    r = await fetch(path, { method: body !== undefined ? 'POST' : 'GET', headers: body !== undefined ? { 'content-type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  } catch { throw new ApiError(0, 'Sunucuya ulaşılamadı. Bağlantını kontrol et.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, j.error ?? `Hata (${r.status})`);
  return j as T;
}
