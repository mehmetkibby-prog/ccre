import { TUNING } from '../tuning.ts';
export type ClassId = 'guardian' | 'hunter' | 'arcanist';
export const CLASS_IDS: ClassId[] = ['guardian', 'hunter', 'arcanist'];

export type SkillKind = 'melee' | 'projectile' | 'pull' | 'dash' | 'aoe' | 'heal' | 'buff' | 'root';
export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  kind: SkillKind;
  unlock: number; // açılma seviyesi
  cooldownMs: number;
  range: number;
  mult: number; // saldırı çarpanı
  radius?: number; // alan
  stunMs?: number;
  rootMs?: number;
  healPct?: number;
  dmgReducePct?: number;
  durationMs?: number;
  maxTargets?: number;
  spec?: string; // uzmanlık dalı
  /** alan becerisi oyuncunun kendi çevresine (hedefe değil) */
  selfCenter?: boolean;
  /**
   * Kullanınca oyuncuya 3 sn'lik sınıf güçlendirmesi: iron = alınan hasar −v%, wind = saldırı hızı +v% ve koşu +v2%,
   * leech = verdiği hasarın v%'i can olarak döner. Değer beceri seviyesi başına +per artar.
   */
  buff?: { k: 'iron' | 'wind' | 'leech'; ms: number; v: number; v2?: number; per: number };
  /** zamanlama çubuğu: yeşil bölgede basılırsa QTE_MULT kat hasar */
  qte?: boolean;
  /** sersemletme/sabitleme yalnız ana hedefe (çevreye sıçrayan hasar kontrol etkisi taşımaz) */
  ccMain?: boolean;
  /** atıştan sonra hedefin tersine bu kadar (sunucu birimi) geri sıçrar */
  leapBack?: number;
  /** ana hedeften sonra en yakın n düşmana zincirlenir (r: sıçrama yarıçapı, mul: zincir hasar çarpanı) */
  chain?: { n: number; r: number; mul: number };
}

/** Beceri yuvaları: 0 düz vuruş, 1 Sv.5, 2 Sv.30, 3 uzmanlık, 4 Sv.7 (çubuklu), 5 Sv.1 başlangıç becerisi */
export const SKILL_SLOTS = 6;
/** Sv.1 becerisi istemciye bu numarayla gider; zincirin her sıçrayışı ayrı bir CAST_CHAIN_HOP olayıdır */
export const CAST_FIRST = 7, CAST_CHAIN_HOP = 8;

/** Zamanlama çubuğu: ibre QTE_SWEEP_MS'de soldan sağa geçer; yeşil bölge QTE_W genişliğinde, yeri her atışta değişir. */
export const QTE_SWEEP_MS = 1000;
export const QTE_W = 0.2;
export const QTE_MULT = 1.5;
/** sunucuda ağ dalgalanması payı (çubuğun oranı olarak, iki yanda) */
export const QTE_TOL = 0.06;
/** n. atışın yeşil bölgesi [başlangıç, bitiş] (0..1): sunucu ve istemci aynı formülü kullanır */
export function qteZone(n: number, charId: number): [number, number] {
  const r = Math.sin((n + 1) * 78.233 + charId * 12.9898) * 43758.5453;
  const z0 = 0.4 + 0.36 * (r - Math.floor(r));
  return [z0, z0 + QTE_W];
}
/** Beceri güçlendirmesinin bu seviyedeki değerleri */
export function skillBuffVal(sk: SkillDef, lvl: number) {
  const b = sk.buff; if (!b) return null;
  const up = b.per * Math.max(0, lvl - 1);
  return { k: b.k, ms: b.ms, v: b.v + up, v2: (b.v2 ?? 0) + (b.v2 ? up : 0) };
}

/** Beceri kademesinin çarpanı: her kademe +%4 (hasar ve iyileştirme). formulas.ts'deki skillDamageMult ile aynı. */
const lvlMult = (lvl: number) => 1 + 0.04 * Math.max(0, lvl - 1);
/** Türkçe ondalık (en çok 2 basamak): 1.3 → "1,3", 12.48 → "12,48" */
export const trNum = (n: number) => (Math.round(n * 100) / 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
/** Kademeye göre hasar çarpanı (0: hasar vermeyen beceri) */
export const skillMultAt = (sk: SkillDef, lvl: number) => (sk.mult > 0 ? sk.mult * lvlMult(lvl) : 0);
/** Kademeye göre can yenileme yüzdesi (Çelik İrade, Yaşam Dalgası); bir ondalığa yuvarlı */
export const skillHealPct = (sk: SkillDef, lvl: number) => (sk.healPct ? Math.round(sk.healPct * lvlMult(lvl) * 10) / 10 : 0);
/**
 * Açıklama metni, becerinin şu anki kademesine göre: metindeki hasar çarpanı, can yenileme ve güçlendirme yüzdeleri
 * geliştirildikçe güncel değeri gösterir (ör. Sv. 3 Kalkan Darbesi: "1,3× hasar" yerine "1,4× hasar").
 */
export function skillDesc(sk: SkillDef, lvl: number): string {
  let d = sk.desc;
  if (lvl <= 1) return d;
  if (sk.mult > 0) d = d.replace(trNum(sk.mult) + '×', trNum(skillMultAt(sk, lvl)) + '×');
  if (sk.healPct) d = d.replace('%' + sk.healPct, '%' + trNum(skillHealPct(sk, lvl)));
  const b = skillBuffVal(sk, lvl);
  if (b && sk.buff) { d = d.replace('%' + sk.buff.v, '%' + b.v); if (sk.buff.v2) d = d.replace('%' + sk.buff.v2, '%' + b.v2); }
  return d;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  weapon: 'sword' | 'bow' | 'staff';
  desc: string;
  baseHp: number; hpPerLevel: number;
  baseAtk: number; atkPerLevel: number;
  baseDef: number; defPerLevel: number;
  speed: number;
  range: number;
  skills: [SkillDef, SkillDef, SkillDef]; // temel saldırı + 2 beceri
  /** Sv. 7 alan becerisi (sırası 4): zamanlama çubuklu, 3 sn sınıf güçlendirmesi verir */
  extra: SkillDef;
  /** Sv. 1 başlangıç becerisi (sırası 5): düz vuruştan biraz güçlü, Sv. 5 becerisinden zayıf; küçük bir hüner taşır */
  first: SkillDef;
  specs: [SpecDef, SpecDef];
}
export interface SpecDef { id: string; name: string; skill: SkillDef }

const BASE_MULT = 1.03 * 1.07;

export const CLASSES: Record<ClassId, ClassDef> = {
  guardian: {
    id: 'guardian', name: 'Muhafız', weapon: 'sword',
    desc: 'Kalkanı ve kılıcıyla ön safta durur. Düşmanı çeker, üstüne atılır, sersemletir.',
    baseHp: 300, hpPerLevel: 0, baseAtk: 15, atkPerLevel: 0, baseDef: 12, defPerLevel: 0,
    speed: 225 * BASE_MULT, range: 85,
    skills: [
      { id: 'g_basic', name: 'Kılıç Darbesi', desc: 'Yakın mesafe kılıç vuruşu.', kind: 'melee', unlock: 1, cooldownMs: 650, range: 85, mult: 1 },
      { id: 'g_pull', name: 'Zincir Çekişi', desc: 'Hedefi yanına çeker ve hasar verir.', kind: 'pull', unlock: 5, cooldownMs: 10_000, range: 720, mult: 1.6 },
      { id: 'g_dash', name: 'Kalkan Hücumu', desc: 'Hedefe atılır, çevresine hasar verip sersemletir.', kind: 'dash', unlock: 30, cooldownMs: 12_000, range: 600, mult: 2.0, radius: 160, stunMs: 1500, maxTargets: 6 },
    ],
    first: { id: 'g_bash', name: 'Kalkan Darbesi', desc: 'Kalkanınla hedefin yüzüne çarparsın: 1,3× hasar ve 0,7 sn sersemletme (yalnız ana hedef).', kind: 'melee', unlock: 1, cooldownMs: 8000, range: 150, mult: 1.3, stunMs: 700, ccMain: true },
    extra: { id: 'g_quake', name: 'Yer Sarsan', desc: 'Kılıcını toprağa saplar: çevresindeki düşmanlara 1,8× sarsıntı hasarı. 3 sn Demir Deri: aldığın hasar %30 azalır.', kind: 'aoe', unlock: 7, cooldownMs: 14_000, range: 0, mult: 1.8, radius: 200, maxTargets: 6, selfCenter: true, qte: true, buff: { k: 'iron', ms: 3000, v: 30, per: 1 } },
    specs: [
      { id: 'steel', name: 'Çelik Muhafız', skill: { id: 'g_steel', name: 'Çelik İrade', desc: 'Canının %12\'sini yeniler, 6 sn %20 hasar azaltır.', kind: 'buff', unlock: 30, cooldownMs: 24_000, range: 0, mult: 0, healPct: 12, dmgReducePct: 20, durationMs: 6000, spec: 'steel' } },
      { id: 'judgement', name: 'Hüküm Savaşçısı', skill: { id: 'g_judge', name: 'Hüküm Darbesi', desc: 'Önündeki alana 2,2× ağır darbe.', kind: 'aoe', unlock: 30, cooldownMs: 18_000, range: 220, mult: 2.2, radius: 170, maxTargets: 8, spec: 'judgement' } },
    ],
  },
  hunter: {
    id: 'hunter', name: 'Avcı', weapon: 'bow',
    desc: 'Uzaktan ok yağdırır. Hızlıdır, kritik vuruşları ölümcüldür.',
    baseHp: 300, hpPerLevel: 0, baseAtk: 15, atkPerLevel: 0, baseDef: 5, defPerLevel: 0,
    speed: 250 * BASE_MULT, range: 470,
    skills: [
      { id: 'h_basic', name: 'Ok Atışı', desc: 'Tek hedefe ok.', kind: 'projectile', unlock: 1, cooldownMs: 650, range: 470, mult: 1 },
      { id: 'h_multi', name: 'Yelpaze Atış', desc: 'Hedef çevresine ok yağmuru.', kind: 'aoe', unlock: 5, cooldownMs: 10_000, range: 470, mult: 1.5, radius: 150, maxTargets: 5 },
      { id: 'h_pierce', name: 'Delici Ok', desc: 'Güçlü delici atış, kısa süre sabitler.', kind: 'root', unlock: 30, cooldownMs: 12_000, range: 520, mult: 2.1, rootMs: 1500 },
    ],
    first: { id: 'h_leap', name: 'Geri Sıçrayış', desc: 'Hedefe ok bırakıp geriye takla atarsın: 1,25× hasar, 3,5 m uzaklaşırsın. Yakına gelen düşmandan kaçmak için.', kind: 'projectile', unlock: 1, cooldownMs: 9000, range: 470, mult: 1.25, leapBack: 140 },
    extra: { id: 'h_storm', name: 'Fırtına Oku', desc: 'Göğe bir ok salar, hedef alana rüzgâr okları yağar: 1,8× hasar. 3 sn Rüzgâr Adımı: saldırı hızın +%30, koşun +%25.', kind: 'aoe', unlock: 7, cooldownMs: 14_000, range: 470, mult: 1.8, radius: 170, maxTargets: 6, qte: true, buff: { k: 'wind', ms: 3000, v: 30, v2: 25, per: 1 } },
    specs: [
      { id: 'marksman', name: 'Keskin Nişancı', skill: { id: 'h_dawn', name: 'Şafak Oku', desc: '2,2× ışık oku.', kind: 'projectile', unlock: 30, cooldownMs: 18_000, range: 560, mult: 2.2, spec: 'marksman' } },
      { id: 'tracker', name: 'İz Sürücü', skill: { id: 'h_root', name: 'Kök Oku', desc: '1,5× hasar ve 1,8 sn kök.', kind: 'root', unlock: 30, cooldownMs: 20_000, range: 520, mult: 1.5, rootMs: 1800, spec: 'tracker' } },
    ],
  },
  arcanist: {
    id: 'arcanist', name: 'Arkanist', weapon: 'staff',
    desc: 'Yaşam Özü\'nü büyüye dönüştürür. Alan hasarı ve iyileştirme ustası.',
    baseHp: 300, hpPerLevel: 0, baseAtk: 15, atkPerLevel: 0, baseDef: 5, defPerLevel: 0,
    speed: 225 * BASE_MULT, range: 440,
    skills: [
      { id: 'a_basic', name: 'Öz Kıvılcımı', desc: 'Tek hedefe büyü küresi.', kind: 'projectile', unlock: 1, cooldownMs: 650, range: 440, mult: 1 },
      { id: 'a_nova', name: 'Öz Halkası', desc: 'Hedef alanda patlayan halka.', kind: 'aoe', unlock: 5, cooldownMs: 10_000, range: 440, mult: 1.7, radius: 170, maxTargets: 6 },
      { id: 'a_frost', name: 'Kırağı Mührü', desc: 'Dondurucu mühür, hedefi sabitler.', kind: 'root', unlock: 30, cooldownMs: 12_000, range: 440, mult: 1.9, rootMs: 1600, radius: 120, maxTargets: 4 },
    ],
    first: { id: 'a_chain', name: 'Öz Zinciri', desc: 'Hedefe mor bir öz şimşeği atarsın: 1,2× hasar, ardından yakındaki 2 düşmana 0,8× ile sıçrar.', kind: 'projectile', unlock: 1, cooldownMs: 8000, range: 440, mult: 1.2, chain: { n: 2, r: 220, mul: 0.8 } },
    extra: { id: 'a_vortex', name: 'Öz Girdabı', desc: 'Hedef alanda öz girdabı açar: düşmanları merkeze çeker, 1,8× hasar verir. 3 sn Öz Emilimi: verdiğin hasarın %25\'i can olarak döner.', kind: 'aoe', unlock: 7, cooldownMs: 14_000, range: 440, mult: 1.8, radius: 180, maxTargets: 6, qte: true, buff: { k: 'leech', ms: 3000, v: 25, per: 1 } },
    specs: [
      { id: 'destroyer', name: 'Öz Yıkıcısı', skill: { id: 'a_burst', name: 'Öz Patlaması', desc: '2,1× alan patlaması.', kind: 'aoe', unlock: 30, cooldownMs: 18_000, range: 440, mult: 2.1, radius: 190, maxTargets: 8, spec: 'destroyer' } },
      { id: 'weaver', name: 'Yaşam Dokuyucusu', skill: { id: 'a_wave', name: 'Yaşam Dalgası', desc: 'Kendini ve 320 birimdeki 4 grup üyesini %20 iyileştirir.', kind: 'heal', unlock: 30, cooldownMs: 24_000, range: 320, mult: 0, healPct: 20, maxTargets: 5, spec: 'weaver' } },
    ],
  },
};

export function classSkill(cls: ClassId, idx: number, spec?: string | null): SkillDef | null {
  const c = CLASSES[cls];
  // açılma seviyesi yönetimden (Seviye sekmesi → Beceriler): düz vuruş hep Sv. 1, uzmanlık becerisi uzmanlık seviyesinde
  if (idx === 0) return c.skills[0];
  if (idx > 0 && idx < 3) { const sk = c.skills[idx]; const u = TUNING.skillUnlock?.[sk.id]; return u !== undefined && u !== sk.unlock ? { ...sk, unlock: u } : sk; }
  if (idx === 5) { const sk = c.first; const u = TUNING.skillUnlock?.[sk.id]; return u !== undefined && u !== sk.unlock ? { ...sk, unlock: u } : sk; }
  if (idx === 4) { const sk = c.extra; const u = TUNING.skillUnlock?.[sk.id]; return u !== undefined && u !== sk.unlock ? { ...sk, unlock: u } : sk; }
  if (idx === 3 && spec) { const sk = c.specs.find((s) => s.id === spec)?.skill; return sk ? { ...sk, unlock: TUNING.specLevel ?? sk.unlock } : null; }
  return null;
}
