// Üretim derlemesi: ana süreç ve kanal worker'ı ayrı ESM paketleri (dist/main.js, dist/channel.js).
import { build } from 'esbuild';
import fs from 'node:fs';
const common = { bundle: true, platform: 'node', target: 'node22', format: 'esm', sourcemap: true, external: ['pg', 'ws', 'pg-native'], banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" }, alias: { '@col/shared': '../shared/src/index.ts' }, logLevel: 'info' };
await build({ ...common, entryPoints: ['src/main.ts'], outfile: 'dist/main.js' });
await build({ ...common, entryPoints: ['src/worker/channel.ts'], outfile: 'dist/channel.js' });
fs.mkdirSync('dist/migrations', { recursive: true });
for (const f of fs.readdirSync('src/db/migrations')) fs.copyFileSync('src/db/migrations/' + f, 'dist/migrations/' + f);
