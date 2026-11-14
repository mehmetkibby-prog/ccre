import { it, expect } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serveStatic } from '../packages/server/src/http.ts';

it('statik: tür, ETag/304 ve Range/206', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  fs.mkdirSync(path.join(dir, 'poster')); fs.writeFileSync(path.join(dir, 'poster', 'a.mp4'), Buffer.alloc(5000, 7)); fs.writeFileSync(path.join(dir, 'index.html'), '<html>');
  const srv = http.createServer((q, r) => { if (!serveStatic(dir, new URL(q.url!, 'http://x').pathname, r, q.headers, q.method)) { r.writeHead(404); r.end(); } });
  await new Promise<void>((ok) => srv.listen(0, ok));
  const port = (srv.address() as any).port, u = `http://127.0.0.1:${port}/poster/a.mp4`;
  const a = await fetch(u); expect(a.status).toBe(200); expect(a.headers.get('content-type')).toBe('video/mp4'); expect(a.headers.get('cache-control')).toContain('max-age=3600'); await a.arrayBuffer();
  const b = await fetch(u, { headers: { 'if-none-match': a.headers.get('etag')! } }); expect(b.status).toBe(304);
  const c = await fetch(u, { headers: { range: 'bytes=100-199' } }); expect(c.status).toBe(206); expect(c.headers.get('content-range')).toBe('bytes 100-199/5000'); expect((await c.arrayBuffer()).byteLength).toBe(100);
  const d = await fetch(u, { headers: { range: 'bytes=4900-' } }); expect((await d.arrayBuffer()).byteLength).toBe(100);
  const e = await fetch(`http://127.0.0.1:${port}/giris`); expect(e.headers.get('content-type')).toContain('text/html'); expect(e.headers.get('cache-control')).toBe('no-cache'); await e.text();
  srv.close();
});
