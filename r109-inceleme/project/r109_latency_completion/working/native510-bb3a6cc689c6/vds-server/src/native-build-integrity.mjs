import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const manifestName = 'native-build-manifest.json';
const required = ['server/index.js', 'server/__vite_rsc_assets_manifest.js', 'server/ssr/index.js'];
const allowed = name => typeof name === 'string' && !name.includes('\\')
  && name.split('/').every(part => part && part !== '.' && part !== '..')
  && (name.startsWith('server/') || name.startsWith('client/assets/'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function filesUnder(root, directory) {
  const files = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const name = directory + '/' + entry.name;
    if (entry.isDirectory()) files.push(...await filesUnder(root, name));
    else if (entry.isFile()) files.push(name);
    else throw new Error('Native build contains a non-regular file: ' + name);
  }
  return files;
}

function checkInventory(files) {
  const names = new Set();
  for (const file of files) {
    if (!allowed(file.path) || names.has(file.path) || !Number.isSafeInteger(file.bytes)
      || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) {
      throw new Error('Invalid native build inventory');
    }
    names.add(file.path);
  }
  for (const name of required) {
    if (!files.some(file => file.path === name && file.bytes > 0)) {
      throw new Error('Incomplete native build: ' + name);
    }
  }
  if (!files.some(file => file.path.startsWith('client/assets/') && file.path.endsWith('.js') && file.bytes > 0)) {
    throw new Error('Incomplete native build: client JavaScript assets');
  }
}

// Called only after all RSC/client/SSR build phases have completed. This file is
// copied unchanged into the archive, so later truncation cannot bless itself.
export async function writeNativeBuildManifest(root) {
  const names = [...await filesUnder(root, 'server'), ...await filesUnder(root, 'client/assets')].sort();
  const files = [];
  for (const name of names) {
    const bytes = await readFile(path.join(root, name));
    files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
  }
  checkInventory(files);
  await writeFile(path.join(root, manifestName), JSON.stringify({ version: 1, files }) + '\n');
  return { files: files.length };
}

export async function verifyNativeBuild(root) {
  const manifest = JSON.parse(await readFile(path.join(root, manifestName), 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error('Invalid native build manifest');
  checkInventory(manifest.files);
  for (const file of manifest.files) {
    const filename = path.join(root, file.path);
    const info = await lstat(filename);
    if (!info.isFile() || info.size !== file.bytes || hash(await readFile(filename)) !== file.sha256) {
      throw new Error('Native build file missing or changed: ' + file.path);
    }
  }
  return { files: manifest.files.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifyNativeBuild(path.resolve(process.argv[2] || 'dist-vds'));
    console.log('Verified native runtime files: ' + result.files);
  } catch (error) {
    console.error('Native build validation failed; existing service was not changed: ' + error.message);
    process.exitCode = 1;
  }
}
