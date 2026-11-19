/**
 * Statik (iskeletsiz) Meshy modelini oyuna hazırlar: gereksizleri ayıklar, dokuyu küçültüp sıkıştırır (JPEG/WebP yerine
 * tarayıcı uyumu için JPEG), geometriyi meshopt ile sıkıştırır. Hafif kalsın diye isteğe bağlı üçgen sınırı.
 *   node scripts/pack-prop.mjs <girdi.glb> <çıktı.glb> [doku=512] [üçgen]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const [inp, out, texArg, triArg] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
const size = Number(texArg ?? 512);
const tris = () => doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
console.log('üçgen (önce):', Math.round(tris()));
const fns = [dedup(), prune(), weld()];
if (triArg) { const r = Math.min(1, Number(triArg) / Math.max(1, tris())); if (r < 1) fns.push(simplify({ simplifier: MeshoptSimplifier, ratio: r, error: 0.002 })); }
await doc.transform(...fns, textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [size, size], quality: 82 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
console.log('üçgen (sonra):', Math.round(tris()));
await io.write(out, doc);
