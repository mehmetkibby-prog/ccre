// Tarayıcı (başsız Chromium) içinde çalışır: FBX/GLB karakter + animasyon dosyalarını tek GLB'ye birleştirir.
// scripts/import-characters.mjs tarafından yüklenir; doğrudan çalıştırılmaz.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const gltfLoader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');
gltfLoader.setDRACOLoader(draco);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

/** Mixamo önekleri (mixamorig:, mixamorig1: …) ve Blender "Armature|" önekleri atılır; tüm dosyalar aynı adları kullanır. */
const norm = (n) => n.replace(/^mixamorig\d*/i, '').replace(/^Armature[|_]/, '');

async function load(url) {
  if (/\.fbx$/i.test(url)) {
    const g = await new FBXLoader().loadAsync(url);
    return { scene: g, clips: g.animations ?? [] };
  }
  const g = await gltfLoader.loadAsync(url);
  return { scene: g.scene, clips: g.animations ?? [] };
}

function skinnedVerts(scene) {
  let n = 0;
  scene.traverse((o) => { if (o.isSkinnedMesh) n += o.geometry.attributes.position.count; });
  return n;
}

function findHips(scene) {
  let hips = null, rootBone = null;
  scene.traverse((o) => {
    if (!o.isBone) return;
    if (!hips && /(^|[^a-z])(hips|pelvis)$/i.test(o.name)) hips = o;
    if (!rootBone && !(o.parent && o.parent.isBone)) rootBone = o;
  });
  return hips ?? rootBone;
}

function toStandard(m) {
  if (m.isMeshStandardMaterial) return m;
  const s = new THREE.MeshStandardMaterial({
    name: m.name, color: m.color ? m.color.clone() : new THREE.Color(1, 1, 1), map: m.map ?? null,
    normalMap: m.normalMap ?? null, emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0, 0, 0),
    emissiveMap: m.emissiveMap ?? null, alphaMap: m.alphaMap ?? null, transparent: !!m.transparent,
    opacity: m.opacity ?? 1, alphaTest: m.alphaTest ?? 0, side: m.side ?? THREE.FrontSide, roughness: 0.82, metalness: 0,
  });
  // FBX dokulu malzemelerde renk çoğu zaman 0.8 griye ayarlı gelir; dokuyu karartmasın
  if (s.map && s.color.r > 0.5 && Math.abs(s.color.r - s.color.g) < 0.02 && Math.abs(s.color.r - s.color.b) < 0.02) s.color.setRGB(1, 1, 1);
  return s;
}

/** Kök hareketini (ileri kayma) atar, kalça yüksekliğini temel karaktere ölçekler, iskelette olmayan izleri siler. */
function fixClip(clip, nodes, hipsName, baseRest, animRest) {
  const r = animRest && Math.abs(animRest.y) > 1e-4 && baseRest ? baseRest.y / animRest.y : 1;
  const tracks = [];
  for (const t of clip.tracks) {
    const i = t.name.lastIndexOf('.');
    const node = t.name.slice(0, i), prop = t.name.slice(i + 1);
    if (!nodes.has(node) || prop === 'scale') continue;
    if (prop === 'position') {
      if (node !== hipsName) continue;
      const v = t.values, tm = t.times, n = tm.length;
      if (n > 0 && baseRest && animRest) {
        const t0 = tm[0], tN = tm[n - 1] || 1, x0 = v[0], z0 = v[2], xN = v[(n - 1) * 3], zN = v[(n - 1) * 3 + 2];
        for (let k = 0; k < n; k++) {
          const f = tN > t0 ? (tm[k] - t0) / (tN - t0) : 0;
          const dx = v[k * 3] - (x0 + (xN - x0) * f), dz = v[k * 3 + 2] - (z0 + (zN - z0) * f);
          v[k * 3] = baseRest.x + (x0 - animRest.x + dx) * r;
          v[k * 3 + 1] = baseRest.y + (v[k * 3 + 1] - animRest.y) * r;
          v[k * 3 + 2] = baseRest.z + (z0 - animRest.z + dz) * r;
        }
      }
    }
    tracks.push(t);
  }
  clip.tracks = tracks;
  clip.resetDuration();
  return clip;
}

function b64(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * files: [{ url, name, shared }] — shared=true olanlar ortak animasyon klasöründen gelir.
 * opts: { tex, keep(clipName) → bool listesi Node tarafında süzülür }
 */
window.convertChar = async ({ files, tex }) => {
  const log = [];
  const items = [];
  for (const f of files) {
    try { items.push({ ...f, ...(await load(f.url)) }); } catch (e) { log.push('yüklenemedi: ' + f.name + ' — ' + (e?.message ?? e)); }
  }
  for (const it of items) {
    it.scene.traverse((o) => { o.name = norm(o.name); });
    for (const c of it.clips) for (const t of c.tracks) { const i = t.name.lastIndexOf('.'); t.name = norm(t.name.slice(0, i)) + t.name.slice(i); }
    it.verts = skinnedVerts(it.scene);
  }
  const own = items.filter((i) => !i.shared && i.verts > 0);
  if (!own.length) throw new Error('Kaplamalı (skin) karakter dosyası bulunamadı. Mixamo’dan en az bir dosyayı "With Skin" indirin.');
  const base = own.find((i) => /model|skin|karakter|character|t-?pose|base/i.test(i.name)) ?? own.sort((a, b) => b.verts - a.verts)[0];
  const scene = base.scene;

  // yalnız temel karakterin ağları kalır; materyaller glTF uyumlu hale gelir
  const drop = [];
  scene.traverse((o) => {
    if (o.isLight || o.isCamera) drop.push(o);
    if (o.isMesh) {
      o.material = Array.isArray(o.material) ? o.material.map(toStandard) : toStandard(o.material);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        const alpha = m.transparent || m.alphaTest > 0 || !!m.alphaMap;
        for (const k of ['map', 'emissiveMap']) if (m[k]) m[k].userData.mimeType = alpha && k === 'map' ? 'image/png' : 'image/jpeg';
        if (m.normalMap) m.normalMap.userData.mimeType = 'image/jpeg';
      }
    }
  });
  drop.forEach((o) => o.parent?.remove(o));

  const nodes = new Set();
  scene.traverse((o) => { if (o.name) nodes.add(o.name); });
  const hips = findHips(scene);
  if (!hips) throw new Error('İskelette kalça (Hips) kemiği bulunamadı.');
  const baseRest = hips.position.clone();

  const clips = [];
  const used = new Set();
  for (const it of items) {
    const ah = findHips(it.scene);
    const animRest = ah ? ah.position.clone() : null;
    const live = it.clips.filter((c) => c.tracks.length);
    live.forEach((c, ci) => {
      // Mixamo klipleri "mixamo.com", Blender/Maya dışa aktarımları "Take 001" gibi anlamsız adlar taşır: dosya adını kullan
      const generic = !c.name || /^(mixamo\.com|take ?\d*|animation|default|armature.*action)$/i.test(c.name);
      let name = live.length === 1 || generic ? it.name + (live.length > 1 && generic && ci ? '_' + ci : '') : c.name;
      if (used.has(name)) { if (it.shared) return; name = name + '_' + ci; }
      used.add(name);
      const fixed = fixClip(c.clone(), nodes, ah ? ah.name : hips.name, baseRest, animRest);
      fixed.name = name;
      if (fixed.tracks.length) clips.push({ clip: fixed, shared: !!it.shared });
      else log.push('iskelete uymayan animasyon atlandı: ' + name);
    });
  }

  // T-pozunda boy ölçümü (bilgi amaçlı)
  scene.updateMatrixWorld(true);
  // Yön: oyun modellerin +Z'ye baktığını varsayar. Sol/sağ kemiklerden "ileri" yönü bulunur.
  let yaw = 0;
  const bone = (re) => { let b = null; scene.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
  for (const part of ['UpLeg', 'Arm', 'Shoulder', 'Hand', 'Foot']) {
    const L = bone(new RegExp('^(left|l)[_ .-]?' + part + '$', 'i')), R = bone(new RegExp('^(right|r)[_ .-]?' + part + '$', 'i'));
    if (!L || !R) continue;
    const side = L.getWorldPosition(new THREE.Vector3()).sub(R.getWorldPosition(new THREE.Vector3()));
    side.y = 0;
    if (side.lengthSq() < 1e-8) continue;
    const fwd = new THREE.Vector3().crossVectors(side, new THREE.Vector3(0, 1, 0));
    yaw = Math.round(-Math.atan2(fwd.x, fwd.z) / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(yaw) < 1e-6) yaw = 0;
    break;
  }
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());

  return {
    base: base.name, verts: base.verts, size: size.toArray(), yaw,
    clips: clips.map((c) => ({ name: c.clip.name, shared: c.shared, duration: c.clip.duration })),
    // GLB üretimi ayrı çağrıda yapılır; hangi kliplerin kalacağına Node tarafı karar verir
    _export: async (keep) => {
      const exporter = new GLTFExporter();
      const anims = clips.filter((c) => keep.includes(c.clip.name)).map((c) => c.clip);
      const buf = await exporter.parseAsync(scene, { binary: true, animations: anims, maxTextureSize: tex, onlyVisible: true });
      return b64(buf);
    },
    log,
  };
};

// Playwright işlev döndüremediği için son sonuç pencerede saklanır
window.prepareChar = async (args) => {
  const r = await window.convertChar(args);
  window.__last = r;
  const { _export, ...info } = r;
  return info;
};
window.exportChar = async (keep) => window.__last._export(keep);
window.__ready = true;
