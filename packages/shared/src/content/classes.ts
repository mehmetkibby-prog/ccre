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
  specs: [SpecDef, SpecDef];
}
export interface SpecDef { id: string; name: string; skill: SkillDef }

const BASE_MULT = 1.03 * 1.07;

export const CLASSES: Record<ClassId, ClassDef> = {
  guardian: {
    id: 'guardian', name: 'Muhafız', weapon: 'sword',
    desc: 'Kalkanı ve kılıcıyla ön safta durur. Düşmanı çeker, üstüne atılır, sersemletir.',
    baseHp: 280, hpPerLevel: 44, baseAtk: 15, atkPerLevel: 3.2, baseDef: 9, defPerLevel: 1.8,
    speed: 225 * BASE_MULT, range: 85,
    skills: [
      { id: 'g_basic', name: 'Kılıç Darbesi', desc: 'Yakın mesafe kılıç vuruşu.', kind: 'melee', unlock: 1, cooldownMs: 650, range: 85, mult: 1 },
      { id: 'g_pull', name: 'Zincir Çekişi', desc: 'Hedefi yanına çeker ve hasar verir.', kind: 'pull', unlock: 5, cooldownMs: 10_000, range: 720, mult: 1.6 },
      { id: 'g_dash', name: 'Kalkan Hücumu', desc: 'Hedefe atılır, çevresine hasar verip sersemletir.', kind: 'dash', unlock: 30, cooldownMs: 12_000, range: 600, mult: 2.0, radius: 160, stunMs: 1500, maxTargets: 6 },
    ],
    specs: [
      { id: 'steel', name: 'Çelik Muhafız', skill: { id: 'g_steel', name: 'Çelik İrade', desc: 'Canının %12\'sini yeniler, 6 sn %20 hasar azaltır.', kind: 'buff', unlock: 30, cooldownMs: 24_000, range: 0, mult: 0, healPct: 12, dmgReducePct: 20, durationMs: 6000, spec: 'steel' } },
      { id: 'judgement', name: 'Hüküm Savaşçısı', skill: { id: 'g_judge', name: 'Hüküm Darbesi', desc: 'Önündeki alana 2,2× ağır darbe.', kind: 'aoe', unlock: 30, cooldownMs: 18_000, range: 220, mult: 2.2, radius: 170, maxTargets: 8, spec: 'judgement' } },
    ],
  },
  hunter: {
    id: 'hunter', name: 'Avcı', weapon: 'bow',
    desc: 'Uzaktan ok yağdırır. Hızlıdır, kritik vuruşları ölümcüldür.',
    baseHp: 220, hpPerLevel: 34, baseAtk: 16, atkPerLevel: 3.5, baseDef: 6, defPerLevel: 1.2,
    speed: 250 * BASE_MULT, range: 470,
    skills: [
      { id: 'h_basic', name: 'Ok Atışı', desc: 'Tek hedefe ok.', kind: 'projectile', unlock: 1, cooldownMs: 650, range: 470, mult: 1 },
      { id: 'h_multi', name: 'Yelpaze Atış', desc: 'Hedef çevresine ok yağmuru.', kind: 'aoe', unlock: 5, cooldownMs: 10_000, range: 470, mult: 1.5, radius: 150, maxTargets: 5 },
      { id: 'h_pierce', name: 'Delici Ok', desc: 'Güçlü delici atış, kısa süre sabitler.', kind: 'root', unlock: 30, cooldownMs: 12_000, range: 520, mult: 2.1, rootMs: 1500 },
    ],
    specs: [
      { id: 'marksman', name: 'Keskin Nişancı', skill: { id: 'h_dawn', name: 'Şafak Oku', desc: '2,2× ışık oku.', kind: 'projectile', unlock: 30, cooldownMs: 18_000, range: 560, mult: 2.2, spec: 'marksman' } },
      { id: 'tracker', name: 'İz Sürücü', skill: { id: 'h_root', name: 'Kök Oku', desc: '1,5× hasar ve 1,8 sn kök.', kind: 'root', unlock: 30, cooldownMs: 20_000, range: 520, mult: 1.5, rootMs: 1800, spec: 'tracker' } },
    ],
  },
  arcanist: {
    id: 'arcanist', name: 'Arkanist', weapon: 'staff',
    desc: 'Yaşam Özü\'nü büyüye dönüştürür. Alan hasarı ve iyileştirme ustası.',
    baseHp: 205, hpPerLevel: 32, baseAtk: 18, atkPerLevel: 3.7, baseDef: 5, defPerLevel: 1.1,
    speed: 225 * BASE_MULT, range: 440,
    skills: [
      { id: 'a_basic', name: 'Öz Kıvılcımı', desc: 'Tek hedefe büyü küresi.', kind: 'projectile', unlock: 1, cooldownMs: 650, range: 440, mult: 1 },
      { id: 'a_nova', name: 'Öz Halkası', desc: 'Hedef alanda patlayan halka.', kind: 'aoe', unlock: 5, cooldownMs: 10_000, range: 440, mult: 1.7, radius: 170, maxTargets: 6 },
      { id: 'a_frost', name: 'Kırağı Mührü', desc: 'Dondurucu mühür, hedefi sabitler.', kind: 'root', unlock: 30, cooldownMs: 12_000, range: 440, mult: 1.9, rootMs: 1600, radius: 120, maxTargets: 4 },
    ],
    specs: [
      { id: 'destroyer', name: 'Öz Yıkıcısı', skill: { id: 'a_burst', name: 'Öz Patlaması', desc: '2,1× alan patlaması.', kind: 'aoe', unlock: 30, cooldownMs: 18_000, range: 440, mult: 2.1, radius: 190, maxTargets: 8, spec: 'destroyer' } },
      { id: 'weaver', name: 'Yaşam Dokuyucusu', skill: { id: 'a_wave', name: 'Yaşam Dalgası', desc: 'Kendini ve 320 birimdeki 4 grup üyesini %20 iyileştirir.', kind: 'heal', unlock: 30, cooldownMs: 24_000, range: 320, mult: 0, healPct: 20, maxTargets: 5, spec: 'weaver' } },
    ],
  },
};

export function classSkill(cls: ClassId, idx: number, spec?: string | null): SkillDef | null {
  const c = CLASSES[cls];
  if (idx >= 0 && idx < 3) return c.skills[idx];
  if (idx === 3 && spec) return c.specs.find((s) => s.id === spec)?.skill ?? null;
  return null;
}
