import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export interface Req { method: string; path: string; query: URLSearchParams; headers: IncomingMessage['headers']; ip: string; body: any; cookies: Record<string, string>; raw: IncomingMessage }
export type Handler = (req: Req, res: ServerResponse) => Promise<unknown> | unknown;
export class HttpError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }

export class Router {
  private routes: { method: string; path: string; h: Handler }[] = [];
  on(method: string, path: string, h: Handler) { this.routes.push({ method, path, h }); }
  get(p: string, h: Handler) { this.on('GET', p, h); }
  post(p: string, h: Handler) { this.on('POST', p, h); }
  find(method: string, p: string) { return this.routes.find((r) => r.method === method && r.path === p); }
}

export function parseCookies(h?: string): Record<string, string> {
  const o: Record<string, string> = {};
  if (!h) return o;
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) o[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return o;
}

export async function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<any> {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'İstek çok büyük')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Geçersiz JSON')); }
    });
    req.on('error', reject);
  });
}

export function json(res: ServerResponse, status: number, data: unknown, headers: Record<string, string> = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(body);
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8',
};
/**
 * Statik dosya: doğru türler, ETag ile 304 (modeller her girişte yeniden inmesin), Range ile 206
 * (iPhone Safari videoyu yalnız parça parça indirebiliyorsa oynatır).
 */
export function serveStatic(dir: string, urlPath: string, res: ServerResponse, headers: IncomingMessage['headers'] = {}, method = 'GET'): boolean {
  if (!fs.existsSync(dir)) return false;
  let p = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(dir, p);
  if (!file.startsWith(dir)) return false;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
  if (!fs.existsSync(file)) return false;
  const st = fs.statSync(file);
  const ext = path.extname(file);
  const rel = path.relative(dir, file).split(path.sep)[0];
  const cache = rel === 'assets' ? 'public, max-age=31536000, immutable'
    : ['models', 'icons', 'poster', 'textures', 'sounds'].includes(rel) ? 'public, max-age=3600, stale-while-revalidate=86400' : 'no-cache';
  const etag = `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const base: Record<string, string> = { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': cache, etag, 'accept-ranges': 'bytes', 'last-modified': st.mtime.toUTCString() };
  if (headers['if-none-match'] === etag) { res.writeHead(304, base); res.end(); return true; }
  const range = typeof headers.range === 'string' ? /^bytes=(\d*)-(\d*)$/.exec(headers.range.trim()) : null;
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
    let end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    if (start >= st.size || start > end) { res.writeHead(416, { ...base, 'content-range': `bytes */${st.size}` }); res.end(); return true; }
    res.writeHead(206, { ...base, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': String(end - start + 1) });
    if (method === 'HEAD') { res.end(); return true; }
    fs.createReadStream(file, { start, end }).pipe(res);
    return true;
  }
  res.writeHead(200, { ...base, 'content-length': String(st.size) });
  if (method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(file).pipe(res);
  return true;
}

/** Basit token bucket hız sınırlayıcı (anahtar başına). */
export class RateLimiter {
  private b = new Map<string, { t: number; at: number }>();
  constructor(private perSec: number, private burst: number) {
    setInterval(() => { const cut = Date.now() - 600_000; for (const [k, v] of this.b) if (v.at < cut) this.b.delete(k); }, 60_000).unref();
  }
  take(key: string, cost = 1): boolean {
    const now = Date.now();
    const e = this.b.get(key) ?? { t: this.burst, at: now };
    e.t = Math.min(this.burst, e.t + ((now - e.at) / 1000) * this.perSec); e.at = now;
    if (e.t < cost) { this.b.set(key, e); return false; }
    e.t -= cost; this.b.set(key, e); return true;
  }
}
