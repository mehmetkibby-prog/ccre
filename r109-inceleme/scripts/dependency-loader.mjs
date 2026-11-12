// Dependency resolution only. Never transforms or rewrites production code.
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
const require = createRequire(new URL('../package.json', import.meta.url));
export async function resolve(specifier, context, nextResolve) {
  const known = [
    ['/tmp/core511-build-deps/node_modules/ws/wrapper.mjs', 'ws'],
    ['/tmp/core511-build-deps/node_modules/ws', 'ws'],
    ['/tmp/core511-build-deps/node_modules/eslint-scope', 'eslint-scope'],
    ['/tmp/col-perf-r11-dependencies/node_modules/acorn/dist/acorn.mjs', 'acorn'],
    ['/workspace/ccre/r60_mount_work/tooling/node_modules/esbuild/lib/main.js', 'esbuild'],
    ['/workspace/ccre/r60_mount_work/tooling/node_modules/playwright/index.mjs', 'playwright']
  ];
  // Channel processes import their WebSocket module as a file:// URL of the
  // original absolute path; match both spellings of the same relocated file.
  let plain = specifier;
  if (specifier.startsWith('file://')) { try { plain = fileURLToPath(specifier); } catch {} }
  const replacement = known.find(([old]) => old === plain)?.[1];
  if (replacement) {
    if (replacement === 'ws') return { url: new URL('../node_modules/ws/wrapper.mjs', import.meta.url).href, shortCircuit: true };
    if (replacement === 'playwright') return { url: new URL('../node_modules/playwright/index.mjs', import.meta.url).href, shortCircuit: true };
    return { url: pathToFileURL(require.resolve(replacement)).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
