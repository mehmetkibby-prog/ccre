/**
 * Hazır 3B modelleri oyuna hazırlar: gereksiz silah/aksesuar düğümlerini ve kullanılmayan
 * animasyonları atar, sıkıştırır (meshopt) ve packages/client/public/models altına yazar.
 * Kaynak: assets-src/ (CC0 KayKit Adventurers, Kay Lousberg).
 * Kullanım: node scripts/build-models.mjs
 */
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const SRC = 'assets-src/kaykit-adventurers/';
const OUT = 'packages/client/public/models/';
const BASE = ['Idle', 'Walking_A', 'Running_A', 'Hit_A', 'Death_A'];

/** id → kaynak, kalacak animasyonlar, silinecek düğümler, durum eşlemesi */
const MODELS = {
  guardian: { src: 'Knight.glb', height: 1.85, anims: [...BASE, '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Horizontal', 'Block_Attack'],
    drop: ['1H_Sword_Offhand', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '2H_Sword'],
    map: { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', attack: '1H_Melee_Attack_Slice_Diagonal', cast: 'Block_Attack', hurt: 'Hit_A', dead: 'Death_A' }, attackClips: ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Horizontal'] },
  hunter: { src: 'Rogue_Hooded.glb', height: 1.8, anims: [...BASE, '2H_Ranged_Shoot', '2H_Ranged_Shooting', '2H_Ranged_Aiming'],
    drop: ['Knife_Offhand', '1H_Crossbow', 'Knife', 'Throwable'],
    map: { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', attack: '2H_Ranged_Shoot', cast: '2H_Ranged_Shooting', hurt: 'Hit_A', dead: 'Death_A' } },
  arcanist: { src: 'Mage.glb', height: 1.85, anims: [...BASE.filter((a) => a !== 'Death_A'), 'Death_B', 'Spellcast_Shoot', 'Spellcast_Long', 'Spellcast_Raise'],
    drop: ['Spellbook', 'Spellbook_open', '1H_Wand'],
    map: { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', attack: 'Spellcast_Shoot', cast: 'Spellcast_Long', hurt: 'Hit_A', dead: 'Death_B' } },
  // NPC'ler: yalnız bekleme animasyonu
  smith: { src: 'Barbarian.glb', height: 1.8, anims: ['Idle'], drop: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '2H_Axe', 'Mug', 'Barbarian_Hat'], map: { idle: 'Idle' } },
  merchant: { src: 'Barbarian.glb', height: 1.78, anims: ['Idle'], drop: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '2H_Axe', '1H_Axe'], map: { idle: 'Idle' } },
  stable: { src: 'Barbarian.glb', height: 1.8, anims: ['Unarmed_Idle'], drop: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '2H_Axe', '1H_Axe', 'Mug'], map: { idle: 'Unarmed_Idle' } },
  keeper: { src: 'Rogue.glb', height: 1.75, anims: ['Unarmed_Idle'], drop: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable'], map: { idle: 'Unarmed_Idle' } },
  fisher: { src: 'Rogue_Hooded.glb', height: 1.75, anims: ['Unarmed_Idle'], drop: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable'], map: { idle: 'Unarmed_Idle' } },
  crafter: { src: 'Mage.glb', height: 1.72, anims: ['Idle'], drop: ['Spellbook', '1H_Wand', '2H_Staff', 'Mage_Hat'], map: { idle: 'Idle' } },
  mage: { src: 'Mage.glb', height: 1.85, anims: ['Idle'], drop: ['Spellbook', 'Spellbook_open', '1H_Wand'], map: { idle: 'Idle' } },
  warden: { src: 'Knight.glb', height: 1.9, anims: ['2H_Melee_Idle'], drop: ['1H_Sword_Offhand', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', 'Badge_Shield', '1H_Sword'], map: { idle: '2H_Melee_Idle' } },
};

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
for (const [id, m] of Object.entries(MODELS)) {
  const doc = await io.read(SRC + m.src);
  const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!m.anims.includes(a.getName())) { a.listChannels().forEach((c) => c.dispose()); a.listSamplers().forEach((s) => s.dispose()); a.dispose(); }
  for (const n of root.listNodes()) if (m.drop.includes(n.getName())) n.dispose();
  await doc.transform(resample(), prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const file = id + '.glb';
  await io.write(OUT + file, doc);
  // KayKit iskeleti ortak: gövde ≈2,2 birim. Boy ölçümü şapka/asa/açık kolları da saydığı için sabit ölçek kullan.
  const hero = ['guardian', 'hunter', 'arcanist'].includes(id);
  manifest[id] = { url: file, height: hero ? 2.0 : 1.95, scale: hero ? 0.9 : 0.86, anims: m.map, ...(m.attackClips ? { attackClips: m.attackClips } : {}) };
  console.log(id.padEnd(9), (fs.statSync(OUT + file).size / 1024).toFixed(0) + ' KB', root.listAnimations().map((a) => a.getName()).join(','));
}
fs.writeFileSync(OUT + 'models.json', JSON.stringify(manifest, null, 2));
fs.writeFileSync(OUT + 'CREDITS.txt', 'Karakter modelleri: KayKit Adventurers Character Pack 1.0 — Kay Lousberg (www.kaylousberg.com), CC0.\n');
console.log('models.json yazıldı');
