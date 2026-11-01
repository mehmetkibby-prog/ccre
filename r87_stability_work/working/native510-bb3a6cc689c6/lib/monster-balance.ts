import {ANCIENT_FAMILIES} from "./expansion65.mjs";
import { env } from "cloudflare:workers";

export const MONSTER_BALANCE_HP_MIN = 1;
export const MONSTER_BALANCE_HP_MAX = 10_000_000;
export const MONSTER_BALANCE_DAMAGE_MIN = 1;
export const MONSTER_BALANCE_DAMAGE_MAX = 1_000_000;

export type MonsterBalanceArea = "forest" | "frozen" | "black" | "ancient" | "afk";
export type MonsterBalanceFamily = "golge" | "curuk" | "yutan";
export type MonsterBalanceVariant = "normal" | "agresif" | "katil";
type BlackSlot = `slot${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
export type MonsterBalanceKey = `${"forest" | "frozen"}.${MonsterBalanceFamily}.${MonsterBalanceVariant}` | `black.${BlackSlot}.katil` | `${"ancient" | "afk"}.${MonsterBalanceFamily}.normal`;

export type MonsterBalanceProfile = {
  key: MonsterBalanceKey;
  area: MonsterBalanceArea;
  family: MonsterBalanceFamily | BlackSlot;
  variant: MonsterBalanceVariant;
  label: string;
  maxHp: number;
  hitDamage: number;
  updatedAt: number;
};

export type MonsterBalanceSnapshot = {
  revision: number;
  profiles: MonsterBalanceProfile[];
};

const AREAS: readonly ("forest" | "frozen")[] = ["forest", "frozen"];
const FAMILIES: readonly MonsterBalanceFamily[] = ["golge", "curuk", "yutan"];
const VARIANTS: readonly MonsterBalanceVariant[] = ["normal", "agresif", "katil"];

const FAMILY_LABELS: Record<"forest" | "frozen", Record<MonsterBalanceFamily, string>> = {
  forest: { golge: "Gölge Kurdu", curuk: "Çürük Muhafız", yutan: "Öz Yutan" },
  frozen: { golge: "Kırağı Vaşağı", curuk: "Buzkök Golemi", yutan: "Tipi Kâhini" },
};
const VARIANT_LABELS: Record<MonsterBalanceVariant, string> = {
  normal: "Normal",
  agresif: "Agresif",
  katil: "Katil",
};

const FOREST_DEFAULTS: Record<MonsterBalanceFamily, Record<MonsterBalanceVariant, readonly [number, number]>> = {
  golge: { normal: [220, 3], agresif: [374, 5], katil: [583, 6] },
  curuk: { normal: [340, 6], agresif: [578, 9], katil: [901, 13] },
  yutan: { normal: [480, 8], agresif: [816, 12], katil: [1272, 16] },
};

// The one-time runtime initializer copies the effective live Forest curve into
// a distinct Frozen namespace. That keeps rollout behaviour unchanged while
// allowing both areas to diverge on the very first admin save.
const FROZEN_DEFAULTS: Record<MonsterBalanceFamily, Record<MonsterBalanceVariant, readonly [number, number]>> = FOREST_DEFAULTS;

const REGULAR_BALANCE_DEFINITIONS = AREAS.flatMap((area) => FAMILIES.flatMap((family) => VARIANTS.map((variant) => {
  const defaults = area === "forest" ? FOREST_DEFAULTS[family][variant] : FROZEN_DEFAULTS[family][variant];
  return {
    key: `${area}.${family}.${variant}` as MonsterBalanceKey,
    area,
    family,
    variant,
    label: `${FAMILY_LABELS[area][family]} · ${VARIANT_LABELS[variant]}`,
    maxHp: defaults[0],
    hitDamage: defaults[1],
    updatedAt: 0,
  } satisfies MonsterBalanceProfile;
}))) as readonly MonsterBalanceProfile[];

const BLACK_FAMILIES: readonly MonsterBalanceFamily[] = ["golge", "curuk", "yutan", "golge", "curuk", "yutan", "golge", "curuk"];
const BLACK_NAMES = ["Obsidyen Akrep", "Kumtaşı Golemi", "Mezar Muhafızı", "Kül Çakalı"];
export const MONSTER_BALANCE_DEFINITIONS: readonly MonsterBalanceProfile[] = [
  ...REGULAR_BALANCE_DEFINITIONS,
  ...([['golge','Yosun Boynuz',460,8],['curuk','Kristal Kabuk',650,12],['yutan','Yaprak Ruhu',540,10]] as const).map(([family,label,maxHp,hitDamage]):MonsterBalanceProfile=>({key:`afk.${family}.normal`,area:'afk',family,variant:'normal',label,maxHp,hitDamage,updatedAt:0})),
  ...ANCIENT_FAMILIES.map((m):MonsterBalanceProfile=>({key:`ancient.${m.family}.normal` as MonsterBalanceKey,area:"ancient",family:m.family as MonsterBalanceFamily,variant:"normal",label:m.name,maxHp:m.hp,hitDamage:m.damage,updatedAt:0})),
  ...BLACK_FAMILIES.map((family, index): MonsterBalanceProfile => ({
    key: `black.slot${index + 1}.katil` as MonsterBalanceKey,
    area: "black", family: `slot${index + 1}` as BlackSlot, variant: "katil",
    label: `${index + 1}. ${BLACK_NAMES[index % 4]} · Katil`,
    maxHp: 750, hitDamage: FOREST_DEFAULTS[family].katil[1], updatedAt: 0,
  })),
];

const DEFINITION_BY_KEY = new Map<MonsterBalanceKey, MonsterBalanceProfile>(
  MONSTER_BALANCE_DEFINITIONS.map((profile) => [profile.key, profile]),
);

type LegacyMonsterBalanceSettings = {
  shadow_wolf_hp: number;
  rotten_guardian_hp: number;
  essence_devourer_hp: number;
  aggressive_variant_hp_scale: number;
  killer_variant_hp_scale: number;
  regular_monster_damage_scale: number;
  normal_variant_damage_scale: number;
  aggressive_variant_damage_scale: number;
  killer_variant_damage_scale: number;
};

const LEGACY_DAMAGE_DEFAULTS: Record<MonsterBalanceFamily, number> = { golge: 7, curuk: 14, yutan: 18 };
const LEGACY_HP_SETTING: Record<MonsterBalanceFamily, keyof LegacyMonsterBalanceSettings> = {
  golge: "shadow_wolf_hp",
  curuk: "rotten_guardian_hp",
  yutan: "essence_devourer_hp",
};
const LEGACY_HP_SCALE_SETTING: Record<Exclude<MonsterBalanceVariant, "normal">, keyof LegacyMonsterBalanceSettings> = {
  agresif: "aggressive_variant_hp_scale",
  katil: "killer_variant_hp_scale",
};
const LEGACY_DAMAGE_SCALE_SETTING: Record<MonsterBalanceVariant, keyof LegacyMonsterBalanceSettings> = {
  normal: "normal_variant_damage_scale",
  agresif: "aggressive_variant_damage_scale",
  katil: "killer_variant_damage_scale",
};
const LEGACY_SETTING_DEFAULTS: LegacyMonsterBalanceSettings = {
  shadow_wolf_hp: 220,
  rotten_guardian_hp: 340,
  essence_devourer_hp: 480,
  aggressive_variant_hp_scale: 1.7,
  killer_variant_hp_scale: 2.65,
  regular_monster_damage_scale: .45,
  normal_variant_damage_scale: 1,
  aggressive_variant_damage_scale: 1.45,
  killer_variant_damage_scale: 2,
};

function legacySetting(settings: Partial<LegacyMonsterBalanceSettings> | null, key: keyof LegacyMonsterBalanceSettings) {
  const value = Number(settings?.[key]);
  return Number.isFinite(value) ? value : LEGACY_SETTING_DEFAULTS[key];
}

function legacyProfileValues(settings: Partial<LegacyMonsterBalanceSettings> | null, definition: MonsterBalanceProfile) {
  if(definition.area === "ancient" || definition.area === "afk")return {maxHp:definition.maxHp,hitDamage:definition.hitDamage};
  const family = definition.area === "black" ? BLACK_FAMILIES[Number(definition.family.slice(4)) - 1] : definition.family as MonsterBalanceFamily;
  const hpBase = legacySetting(settings, LEGACY_HP_SETTING[family]);
  const hpScale = definition.variant === "normal" ? 1 : legacySetting(settings, LEGACY_HP_SCALE_SETTING[definition.variant]);
  const variantDamageScale = legacySetting(settings, LEGACY_DAMAGE_SCALE_SETTING[definition.variant]);
  const regularDamageScale = legacySetting(settings, "regular_monster_damage_scale");
  return {
    maxHp: Math.min(MONSTER_BALANCE_HP_MAX, Math.max(MONSTER_BALANCE_HP_MIN, definition.area === "black" ? 750 : Math.round(hpBase * hpScale))),
    hitDamage: Math.min(MONSTER_BALANCE_DAMAGE_MAX, Math.max(MONSTER_BALANCE_DAMAGE_MIN,
      Math.round(Math.round(LEGACY_DAMAGE_DEFAULTS[family] * variantDamageScale) * regularDamageScale))),
  };
}

let balanceInitialized = false;


export async function ensureMonsterBalanceInitialized() {
  if (balanceInitialized) return;
  const database = env.DB;
  if (!database) return;
  const promise = (async () => {
    const [configResult, profileResult] = await database.batch([
      database.prepare("SELECT id FROM monster_combat_config WHERE id = 1"),
      database.prepare("SELECT profile_key FROM all_monster_combat_profiles"),
    ]);
    const storedKeys = new Set((profileResult.results as Array<{ profile_key?: unknown }>)
      .flatMap((row) => isMonsterBalanceKey(row.profile_key) ? [row.profile_key] : []));
    const hasConfig = Boolean(configResult.results[0]);
    const missing = MONSTER_BALANCE_DEFINITIONS.filter((definition) => !storedKeys.has(definition.key));
    if (!hasConfig || missing.length) {
      const settings = missing.length ? await database.prepare(
        `SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp,
                aggressive_variant_hp_scale, killer_variant_hp_scale,
                regular_monster_damage_scale, normal_variant_damage_scale,
                aggressive_variant_damage_scale, killer_variant_damage_scale
         FROM game_settings WHERE id = 1`,
      ).first<Partial<LegacyMonsterBalanceSettings>>() : null;
      await database.batch([
        database.prepare("INSERT OR IGNORE INTO monster_combat_config (id, revision, update_token, updated_at) VALUES (1, 0, '', 0)"),
        ...missing.map((definition) => {
          const values = legacyProfileValues(settings, definition);
          return database.prepare(
            `INSERT OR IGNORE INTO ${definition.area === "afk" ? "afk_monster_combat_profiles" : definition.area === "ancient" ? "ancient_monster_combat_profiles" : "monster_combat_profiles"}
               (profile_key, area, family, variant, max_hp, hit_damage, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
          ).bind(definition.key, definition.area, definition.family, definition.variant, values.maxHp, values.hitDamage);
        }),
      ]);
    }
    balanceInitialized = true;
  })();
  await promise;
}

export function isMonsterBalanceKey(value: unknown): value is MonsterBalanceKey {
  return typeof value === "string" && DEFINITION_BY_KEY.has(value as MonsterBalanceKey);
}

export function monsterBalanceKeyFor(monster: {
  id: string;
  area: string;
  variant: string;
  summoned?: number;
  is_boss?: number;
  is_stone?: number;
}): MonsterBalanceKey | null {
  if (monster.summoned || monster.is_boss || monster.is_stone) return null;
  if (monster.area === "black") {
    const slot = /^(?:golge|curuk|yutan)(?:-pack[23])?-black-c[1-3]-([1-8])$/.exec(monster.id)?.[1];
    return slot && monster.variant === "katil" ? `black.slot${slot}.katil` as MonsterBalanceKey : null;
  }
  if (monster.area !== "ancient" && monster.area !== "afk" && monster.area !== "forest" && monster.area !== "frozen") return null;
  const family: MonsterBalanceFamily | null = monster.id.startsWith("golge-") ? "golge"
    : monster.id.startsWith("curuk-") ? "curuk"
      : monster.id.startsWith("yutan-") ? "yutan" : null;
  const variant: MonsterBalanceVariant | null = monster.variant === "normal" || monster.variant === "agresif" || monster.variant === "katil"
    ? monster.variant : null;
  if(monster.area === "ancient")return family && variant === "normal" ? `ancient.${family}.normal` : null;
  if(monster.area === "afk")return family && variant === "normal" ? `afk.${family}.normal` : null;
  return family && variant ? `${monster.area}.${family}.${variant}` : null;
}

export function monsterBalanceProfile(
  snapshot: MonsterBalanceSnapshot,
  monster: { id: string; area: string; variant: string; summoned?: number; is_boss?: number; is_stone?: number },
) {
  const key = monsterBalanceKeyFor(monster);
  return key ? snapshot.profiles.find((profile) => profile.key === key) ?? DEFINITION_BY_KEY.get(key) ?? null : null;
}

export function monsterBalanceProfileByKey(snapshot: MonsterBalanceSnapshot, key: MonsterBalanceKey) {
  return snapshot.profiles.find((profile) => profile.key === key) ?? DEFINITION_BY_KEY.get(key)!;
}

type StoredProfile = {
  profile_key: string;
  area: string;
  family: string;
  variant: string;
  max_hp: number;
  hit_damage: number;
  updated_at: number;
};

function normalizedSnapshot(revisionValue: unknown, rows: StoredProfile[]): MonsterBalanceSnapshot {
  const revision = Number(revisionValue);
  const byKey = new Map(rows.filter((row) => isMonsterBalanceKey(row.profile_key)
    && row.profile_key === `${row.area}.${row.family}.${row.variant}`).map((row) => [row.profile_key as MonsterBalanceKey, row]));
  return {
    revision: Number.isSafeInteger(revision) && revision >= 0 ? revision : 0,
    profiles: MONSTER_BALANCE_DEFINITIONS.map((definition) => {
      const row = byKey.get(definition.key);
      const maxHp = Number(row?.max_hp);
      const hitDamage = Number(row?.hit_damage);
      return {
        ...definition,
        maxHp: Number.isSafeInteger(maxHp) && maxHp >= MONSTER_BALANCE_HP_MIN && maxHp <= MONSTER_BALANCE_HP_MAX ? maxHp : definition.maxHp,
        hitDamage: Number.isSafeInteger(hitDamage) && hitDamage >= MONSTER_BALANCE_DAMAGE_MIN && hitDamage <= MONSTER_BALANCE_DAMAGE_MAX ? hitDamage : definition.hitDamage,
        updatedAt: Math.max(0, Math.floor(Number(row?.updated_at) || 0)),
      };
    }),
  };
}

let cached: { value: MonsterBalanceSnapshot; expiresAt: number } | null = null;

let cacheGeneration = 0;

export function invalidateMonsterBalanceCache() {
  cacheGeneration += 1;
  cached = null;
}

export async function getMonsterBalance(fresh = false): Promise<MonsterBalanceSnapshot> {
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.value;
  const generation = cacheGeneration;
  const promise = (async () => {
    const database = env.DB;
    if (!database) return normalizedSnapshot(0, []);
    await ensureMonsterBalanceInitialized();
    // Revision and rows form one CAS snapshot; read them in one D1 batch so an
    // admin write cannot be observed halfway between the two SELECTs.
    const [config, profiles] = await database.batch([
      database.prepare("SELECT revision FROM monster_combat_config WHERE id = 1"),
      database.prepare("SELECT profile_key, area, family, variant, max_hp, hit_damage, updated_at FROM all_monster_combat_profiles"),
    ]);
    const value = normalizedSnapshot((config.results[0] as { revision?: unknown } | undefined)?.revision, profiles.results as StoredProfile[]);
    // A read that started before an admin save must not repopulate the cache
    // after that save invalidated it.
    if (generation === cacheGeneration) cached = { value, expiresAt: Date.now() + 5_000 };
    return value;
  })();
  return await promise;
}

export class MonsterBalanceRevisionConflictError extends Error {
  readonly code = "monster_balance_revision_conflict";
  constructor(readonly currentRevision: number) {
    super("Canavar dengesi başka bir yönetici ekranında değiştirildi. Canlı veriyi yenileyip tekrar dene.");
    this.name = "MonsterBalanceRevisionConflictError";
  }
}

export class MonsterBalanceValidationError extends Error {
  readonly code = "monster_balance_validation_error";
  constructor(readonly errors: string[]) {
    super(errors[0] ?? "Canavar dengesi geçersiz.");
    this.name = "MonsterBalanceValidationError";
  }
}

export type MonsterBalancePatch = Pick<MonsterBalanceProfile, "key"> & Partial<Pick<MonsterBalanceProfile, "maxHp" | "hitDamage">>;

export function validateMonsterBalancePatches(value: unknown): MonsterBalancePatch[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MONSTER_BALANCE_DEFINITIONS.length) {
    throw new MonsterBalanceValidationError([`En az bir, en fazla ${MONSTER_BALANCE_DEFINITIONS.length} canavar satırı gönderilmelidir.`]);
  }
  const errors: string[] = [];
  const keys = new Set<MonsterBalanceKey>();
  const patches: MonsterBalancePatch[] = [];
  value.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") { errors.push(`${index + 1}. satır geçersiz.`); return; }
    const input = raw as Record<string, unknown>;
    if (!isMonsterBalanceKey(input.key)) { errors.push(`${index + 1}. satırın canavar kimliği geçersiz.`); return; }
    if (keys.has(input.key)) { errors.push(`${input.key}: Aynı satır iki kez gönderilemez.`); return; }
    keys.add(input.key);
    const hasMaxHp = Object.prototype.hasOwnProperty.call(input, "maxHp");
    const hasHitDamage = Object.prototype.hasOwnProperty.call(input, "hitDamage");
    if (!hasMaxHp && !hasHitDamage) {
      errors.push(`${DEFINITION_BY_KEY.get(input.key)!.label}: Can veya hasardan en az biri gönderilmeli.`);
      return;
    }
    const maxHp = input.maxHp;
    const hitDamage = input.hitDamage;
    let valid = true;
    if (hasMaxHp && (typeof maxHp !== "number" || !Number.isSafeInteger(maxHp) || maxHp < MONSTER_BALANCE_HP_MIN || maxHp > MONSTER_BALANCE_HP_MAX)) {
      errors.push(`${DEFINITION_BY_KEY.get(input.key)!.label}: Can 1 ile 10.000.000 arasında tam sayı olmalı.`);
      valid = false;
    }
    if (hasHitDamage && (typeof hitDamage !== "number" || !Number.isSafeInteger(hitDamage) || hitDamage < MONSTER_BALANCE_DAMAGE_MIN || hitDamage > MONSTER_BALANCE_DAMAGE_MAX)) {
      errors.push(`${DEFINITION_BY_KEY.get(input.key)!.label}: Hasar 1 ile 1.000.000 arasında tam sayı olmalı.`);
      valid = false;
    }
    if (valid) {
      patches.push({
        key: input.key,
        ...(hasMaxHp ? { maxHp: maxHp as number } : {}),
        ...(hasHitDamage ? { hitDamage: hitDamage as number } : {}),
      });
    }
  });
  if (errors.length) throw new MonsterBalanceValidationError(errors.slice(0, 18));
  return patches;
}

function statementChanges(result: unknown) {
  return Math.max(0, Math.floor(Number((result as { meta?: { changes?: unknown } } | null)?.meta?.changes ?? 0)));
}

export async function saveMonsterBalance(
  value: unknown,
  expectedRevision: unknown,
  adminIdentity: string,
  now: number,
): Promise<void> {
  const patches = validateMonsterBalancePatches(value);
  if (typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new MonsterBalanceValidationError(["Canavar dengesi revizyonu geçersiz."]);
  }
  const expected = expectedRevision;
  const database = env.DB;
  if (!database) throw new Error("Dünya veritabanı bağlı değil.");
  await ensureMonsterBalanceInitialized();
  const current = await database.prepare("SELECT revision FROM monster_combat_config WHERE id = 1").first<{ revision: number }>();
  const currentRevision = Math.max(0, Math.floor(Number(current?.revision) || 0));
  if (currentRevision !== expected) throw new MonsterBalanceRevisionConflictError(currentRevision);
  const token = crypto.randomUUID();
  const nextRevision = expected + 1;
  const statements = [
    database.prepare(
      "UPDATE monster_combat_config SET revision = ?, update_token = ?, updated_at = ? WHERE id = 1 AND revision = ?",
    ).bind(nextRevision, token, now, expected),
  ];
  for (const patch of patches) {
    const definition = DEFINITION_BY_KEY.get(patch.key)!;
    const table = definition.area === "afk" ? "afk_monster_combat_profiles" : definition.area === "ancient" ? "ancient_monster_combat_profiles" : "monster_combat_profiles";
    const hasMaxHp = patch.maxHp !== undefined;
    const hasHitDamage = patch.hitDamage !== undefined;
    statements.push(database.prepare(
      `INSERT INTO ${table} (profile_key, area, family, variant, max_hp, hit_damage, updated_at)
       SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (
         SELECT 1 FROM monster_combat_config WHERE id = 1 AND revision = ? AND update_token = ?
       )
       ON CONFLICT(profile_key) DO UPDATE SET
         max_hp = CASE WHEN ? = 1 THEN excluded.max_hp ELSE ${table}.max_hp END,
         hit_damage = CASE WHEN ? = 1 THEN excluded.hit_damage ELSE ${table}.hit_damage END,
         updated_at = excluded.updated_at
       WHERE EXISTS (SELECT 1 FROM monster_combat_config WHERE id = 1 AND revision = ? AND update_token = ?)`,
    ).bind(
      patch.key, definition.area, definition.family, definition.variant,
      patch.maxHp ?? definition.maxHp, patch.hitDamage ?? definition.hitDamage, now,
      nextRevision, token, hasMaxHp ? 1 : 0, hasHitDamage ? 1 : 0, nextRevision, token,
    ));
    if (hasMaxHp) {
      statements.push(database.prepare(
        `UPDATE monsters SET
           hp = CASE WHEN hp > 0 THEN MIN(?, MAX(1, CAST(ROUND(hp * 1.0 * ? / MAX(1, max_hp)) AS INTEGER))) ELSE hp END,
           max_hp = ?
         WHERE area = ? AND is_boss = 0 AND is_stone = 0 AND summoned = 0 AND id LIKE ? AND variant = ?
           AND EXISTS (SELECT 1 FROM monster_combat_config WHERE id = 1 AND revision = ? AND update_token = ?)`,
      ).bind(patch.maxHp, patch.maxHp, patch.maxHp, definition.area, definition.area === "black" ? `%-black-c%-${definition.family.slice(4)}` : `${definition.family}-%`, definition.variant, nextRevision, token));
    }
  }
  statements.push(database.prepare(
    `INSERT INTO admin_audit_events (id, admin_account_id, action, target_account_id, detail_json, created_at_ms)
     SELECT ?, ?, 'save_monster_balance', '', ?, ?
     WHERE EXISTS (SELECT 1 FROM monster_combat_config WHERE id = 1 AND revision = ? AND update_token = ?)`,
  ).bind(crypto.randomUUID(), adminIdentity.slice(0, 160), JSON.stringify({ revision: nextRevision, profiles: patches }), now * 1000, nextRevision, token));
  const results = await database.batch(statements);
  if (statementChanges(results[0]) !== 1) {
    const latest = await database.prepare("SELECT revision FROM monster_combat_config WHERE id = 1").first<{ revision: number }>();
    throw new MonsterBalanceRevisionConflictError(Math.max(0, Math.floor(Number(latest?.revision) || 0)));
  }
  invalidateMonsterBalanceCache();
}
