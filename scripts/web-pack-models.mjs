/**
 * GLB modelleri .glb sunmayan barındırıcılar (ör. test sayfası) için glTF JSON + JPG/PNG dokulara çevirir.
 * Geometri/animasyon tamponu JSON içine base64 olarak gömülür (meshopt sıkıştırması korunur), dokular ayrı dosya kalır.
 * models.json içindeki url'ler yeni dosyalara çevrilir. Üretimde (nginx) GLB olduğu gibi kullanılır.
 *
 * Kullanım: node scripts/web-pack-models.mjs <models klasörü>
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const dir = path.resolve(process.argv[2] ?? 'packages/client/dist-offline/models');
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const manPath = path.join(dir, 'models.json');
const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));

for (const [id, entry] of Object.entries(man)) {
  if (!entry.url?.endsWith('.glb')) continue;
  const src = path.join(dir, entry.url);
  const doc = await io.read(src);
  doc.getRoot().listTextures().forEach((t, i) => t.setURI(`${id}_${i}.${t.getMimeType() === 'image/png' ? 'png' : 'jpg'}`));
  doc.getRoot().listBuffers().forEach((b, i) => b.setURI(`${id}_${i}.bin`));
  const { json, resources } = await io.writeJSON(doc);
  for (const b of json.buffers ?? []) {
    const data = b.uri ? resources[b.uri] : undefined;
    // meshopt "fallback" tamponunun verisi yoktur (yalnız uzunluk); adresi silinir
    if (!data) { delete b.uri; continue; }
    b.uri = 'data:application/octet-stream;base64,' + Buffer.from(data).toString('base64');
  }
  for (const im of json.images ?? []) fs.writeFileSync(path.join(dir, im.uri), resources[im.uri]);
  const out = `${id}.gltf.json`;
  fs.writeFileSync(path.join(dir, out), JSON.stringify(json));
  fs.rmSync(src);
  entry.url = out;
  console.log(id.padEnd(9), (fs.statSync(path.join(dir, out)).size / 1024).toFixed(0) + ' KB +', (json.images ?? []).length, 'doku');
}
fs.writeFileSync(manPath, JSON.stringify(man, null, 2) + '\n');
