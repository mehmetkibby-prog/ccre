/**
 * Sabit Meshy modelini oyun için paketler: kaynak → doku JPG (en çok N px) + meshopt sıkıştırma (+isteğe bağlı sadeleştirme).
 *   node scripts/pack-static.mjs <girdi.glb> <çıktı.glb> [doku=1024] [oran=1]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const [inp, out, texArg, ratioArg] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
const T = Number(texArg ?? 1024), ratio = Number(ratioArg ?? 1);
const steps = [prune(), dedup(), weld()];
if (ratio < 1) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }));
steps.push(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [T, T], quality: 82 }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await doc.transform(...steps);
let tris = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? 0) / 3;
await io.write(out, doc);
const fs = await import('node:fs');
console.log(out, Math.round(tris), 'üçgen', (fs.statSync(out).size / 1024).toFixed(0), 'KB');
