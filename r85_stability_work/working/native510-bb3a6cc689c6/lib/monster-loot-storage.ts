import {withUpgradeMaterialDrops} from './monster-loot';
import {progressionSettings} from './progression-runtime.mjs';
import { db, getGameSettings } from "@/lib/game-world";
import {
  LOOT_SOURCE_DEFINITIONS,
  withEvolutionScrolls,
  buildDefaultLootProfile,
  directLootProfile,
  extractSimpleLootChances,
  isLootSourceKey,
  parseStoredLootProfile,
  withLegacyHelmetDrops,
  normalizeOpenWorldLootProfile,
  serializeLootProfile,
  validateLiveLootProfile,
  validateLootProfile,
  withoutForbiddenLootResources,
  withSimpleLootChances,
  upgradeEquipmentDropProfile,
  equipmentDropChancePpm,
  withEquipmentDropChance,
  type LegacyLootSettings,
  type LootProfileRecord,
  type LootGroup,
  type LootTemplateRecord,
  type LootSourceKey,
} from "@/lib/monster-loot";

type LootProfilePointerRow = {
  source_key: string;
  active_revision: number;
  latest_revision: number;
  updated_at: number;
  profile_json: string | null;
};

export class LootProfileRevisionConflictError extends Error {
  readonly code = "loot_profile_revision_conflict";

  constructor(
    readonly sourceKey: LootSourceKey,
    readonly expectedRevision: number,
    readonly currentRevision: number,
  ) {
    super("Ganimet profili başka bir yönetici tarafından değiştirildi. Güncel veriyi yükleyip tekrar deneyin.");
    this.name = "LootProfileRevisionConflictError";
  }
}

export class LootProfileValidationError extends Error {
  readonly code = "loot_profile_validation_error";

  constructor(readonly errors: string[]) {
    super(errors[0] ?? "Ganimet profili geçersiz.");
    this.name = "LootProfileValidationError";
  }
}

export class LootTemplateRevisionConflictError extends Error {
  readonly code = "loot_template_revision_conflict";

  constructor(
    readonly expectedRevision: number,
    readonly currentRevision: number,
  ) {
    const reason = currentRevision > 0
      ? `Şablon başka bir yönetici tarafından değiştirildi (beklenen v${expectedRevision}, canlı v${currentRevision}).`
      : "Şablon başka bir yönetici tarafından silindi.";
    super(`${reason} Hiçbir canlı profil değiştirilmedi; veriyi yenileyip tekrar deneyin.`);
    this.name = "LootTemplateRevisionConflictError";
  }
}

export type LootTemplateTargetConflict = {
  sourceKey: LootSourceKey;
  expectedRevision: number;
  currentRevision: number;
  historyChanged?: boolean;
};

export class LootTemplateTargetConflictError extends Error {
  readonly code = "loot_template_target_conflict";

  constructor(readonly conflicts: LootTemplateTargetConflict[]) {
    const preview = conflicts.slice(0, 3).map((conflict) => {
      const label = LOOT_SOURCE_DEFINITIONS.find((entry) => entry.key === conflict.sourceKey)?.label ?? conflict.sourceKey;
      if (conflict.historyChanged && conflict.expectedRevision === conflict.currentRevision) {
        return `${label} (r${conflict.currentRevision}; profil geçmişi yeniden değişti)`;
      }
      return `${label} (beklenen r${conflict.expectedRevision}, canlı r${conflict.currentRevision})`;
    }).join("; ");
    const remainder = conflicts.length > 3 ? ` ve ${conflicts.length - 3} hedef daha` : "";
    super(`Seçilen canlı profiller değişti: ${preview}${remainder}. Hiçbir hedef güncellenmedi; veriyi yenileyip tekrar deneyin.`);
    this.name = "LootTemplateTargetConflictError";
  }
}

function safeRevision(value: unknown) {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

function safeTimestamp(value: unknown) {
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp >= 0 ? timestamp : 0;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordFromRow(sourceKey: LootSourceKey, settings: LegacyLootSettings, row?: LootProfilePointerRow | null): LootProfileRecord {
  const activeRevision = safeRevision(row?.active_revision);
  const parsed = activeRevision > 0 ? parseStoredLootProfile(sourceKey, row?.profile_json) : null;
  const stored = parsed ? normalizeOpenWorldLootProfile(parsed) : null;
  const live = stored ? validateLiveLootProfile(sourceKey, withoutForbiddenLootResources(stored)) : null;
  return {
    sourceKey,
    revision: activeRevision,
    customized: activeRevision > 0,
    updatedAt: safeTimestamp(row?.updated_at),
    // A missing/corrupt immutable version never turns drops into zero. The
    // last live-compatible defaults remain available until an admin resaves.
    profile: withUpgradeMaterialDrops(withLegacyHelmetDrops(directLootProfile(withEvolutionScrolls(live?.ok ? live.profile : buildDefaultLootProfile(sourceKey, settings),buildDefaultLootProfile(sourceKey, settings)))),progressionSettings().materials),
  };
}

async function settingsOrCurrent(settings?: LegacyLootSettings) {
  return settings ?? await getGameSettings();
}

async function loadPointer(sourceKey: LootSourceKey) {
  return db().prepare(
    `SELECT pointer.source_key, pointer.active_revision, pointer.latest_revision, pointer.updated_at,
       version.profile_json
     FROM loot_profiles pointer
     LEFT JOIN loot_profile_versions version
       ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision
     WHERE pointer.source_key = ?`,
  ).bind(sourceKey).first<LootProfilePointerRow>();
}

export async function loadLootProfile(sourceKey: LootSourceKey, settings?: LegacyLootSettings): Promise<LootProfileRecord> {
  if (!isLootSourceKey(sourceKey)) throw new LootProfileValidationError(["Bilinmeyen canavar veya boss profili."]);
  const [legacySettings, row] = await Promise.all([settingsOrCurrent(settings), loadPointer(sourceKey)]);
  return recordFromRow(sourceKey, legacySettings, row);
}

export async function loadAllLootProfiles(settings?: LegacyLootSettings): Promise<LootProfileRecord[]> {
  const [legacySettings, rows] = await Promise.all([
    settingsOrCurrent(settings),
    db().prepare(
      `SELECT pointer.source_key, pointer.active_revision, pointer.latest_revision, pointer.updated_at,
         version.profile_json
       FROM loot_profiles pointer
       LEFT JOIN loot_profile_versions version
         ON version.source_key = pointer.source_key AND version.revision = pointer.active_revision`,
    ).all<LootProfilePointerRow>(),
  ]);
  const typedRows = rows.results as LootProfilePointerRow[];
  const byKey = new Map<LootSourceKey, LootProfilePointerRow>(
    typedRows.filter((row) => isLootSourceKey(row.source_key)).map((row) => [row.source_key as LootSourceKey, row]),
  );
  return LOOT_SOURCE_DEFINITIONS.map(({ key }) => recordFromRow(key, legacySettings, byKey.get(key)));
}

function statementChanges(result: unknown) {
  if (!result || typeof result !== "object") return 0;
  const meta = (result as { meta?: { changes?: unknown } }).meta;
  return Math.max(0, Math.floor(Number(meta?.changes ?? 0)));
}

function normalizedExpectedRevision(expectedRevision: number | undefined, currentRevision: number) {
  if (expectedRevision === undefined) return currentRevision;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new LootProfileValidationError(["expectedRevision: Geçerli bir profil sürümü gönderilmelidir."]);
  }
  return expectedRevision;
}

export async function saveLootProfile(
  sourceKey: LootSourceKey,
  input: unknown,
  now: number,
  expectedRevision?: number,
): Promise<LootProfileRecord> {
  if (!isLootSourceKey(sourceKey)) throw new LootProfileValidationError(["Bilinmeyen canavar veya boss profili."]);
  const structural = validateLootProfile(sourceKey, input);
  const validated = structural.ok
    ? validateLiveLootProfile(sourceKey, withoutForbiddenLootResources(structural.profile))
    : structural;
  if (!validated.ok) throw new LootProfileValidationError(validated.errors);
  const updatedAt = safeTimestamp(now);
  if (updatedAt <= 0) throw new LootProfileValidationError(["Güncelleme zamanı geçersiz."]);

  const database = db();
  const current = await loadPointer(sourceKey);
  const currentRevision = safeRevision(current?.active_revision);
  const currentLatestRevision = safeRevision(current?.latest_revision);
  const expected = normalizedExpectedRevision(expectedRevision, currentRevision);
  if (expected !== currentRevision) throw new LootProfileRevisionConflictError(sourceKey, expected, currentRevision);
  if (currentLatestRevision >= Number.MAX_SAFE_INTEGER - 1) throw new Error("Ganimet profilinin sürüm sınırına ulaşıldı.");

  const nextRevision = currentLatestRevision + 1;
  validated.profile = directLootProfile(validated.profile);
  const profileJson = serializeLootProfile(validated.profile);
  const results = await database.batch([
    database.prepare(
      `INSERT INTO loot_profile_versions (source_key, revision, profile_json, created_at)
       SELECT ?, ?, ?, ?
       WHERE COALESCE((SELECT active_revision FROM loot_profiles WHERE source_key = ?), 0) = ?
         AND COALESCE((SELECT latest_revision FROM loot_profiles WHERE source_key = ?), 0) = ?`,
    ).bind(sourceKey, nextRevision, profileJson, updatedAt, sourceKey, currentRevision, sourceKey, currentLatestRevision),
    database.prepare(
      `INSERT INTO loot_profiles (source_key, active_revision, latest_revision, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(source_key) DO UPDATE SET
         active_revision = excluded.active_revision,
         latest_revision = excluded.latest_revision,
         updated_at = excluded.updated_at
       WHERE loot_profiles.active_revision = ? AND loot_profiles.latest_revision = ?`,
    ).bind(sourceKey, nextRevision, nextRevision, updatedAt, currentRevision, currentLatestRevision),
  ]);
  if (statementChanges(results[0]) !== 1 || statementChanges(results[1]) !== 1) {
    const latest = await loadPointer(sourceKey);
    throw new LootProfileRevisionConflictError(sourceKey, expected, safeRevision(latest?.active_revision));
  }
  return {
    sourceKey,
    revision: nextRevision,
    customized: true,
    updatedAt,
    profile: validated.profile,
  };
}

export async function resetLootProfile(
  sourceKey: LootSourceKey,
  settings?: LegacyLootSettings,
  expectedRevision?: number,
): Promise<LootProfileRecord> {
  if (!isLootSourceKey(sourceKey)) throw new LootProfileValidationError(["Bilinmeyen canavar veya boss profili."]);
  const database = db();
  const [legacySettings, current] = await Promise.all([settingsOrCurrent(settings), loadPointer(sourceKey)]);
  const currentRevision = safeRevision(current?.active_revision);
  const currentLatestRevision = safeRevision(current?.latest_revision);
  const expected = normalizedExpectedRevision(expectedRevision, currentRevision);
  if (expected !== currentRevision) throw new LootProfileRevisionConflictError(sourceKey, expected, currentRevision);
  if (currentRevision === 0) return recordFromRow(sourceKey, legacySettings, current);

  const updatedAt = Math.floor(Date.now() / 1000);
  const result = await database.prepare(
    `UPDATE loot_profiles SET active_revision = 0, updated_at = ?
     WHERE source_key = ? AND active_revision = ? AND latest_revision = ?`,
  ).bind(updatedAt, sourceKey, currentRevision, currentLatestRevision).run();
  if (statementChanges(result) !== 1) {
    const latest = await loadPointer(sourceKey);
    throw new LootProfileRevisionConflictError(sourceKey, expected, safeRevision(latest?.active_revision));
  }
  return {
    sourceKey,
    revision: 0,
    customized: false,
    updatedAt,
    profile: directLootProfile(buildDefaultLootProfile(sourceKey, legacySettings)),
  };
}

type LootTemplateRow = {
  id: string;
  name: string;
  revision: number;
  groups_json: string;
  updated_at: number;
};

function templateId(value: unknown) {
  return typeof value === "string" && /^ltt_[a-f0-9]{32}$/.test(value) ? value : "";
}

function templateName(value: unknown) {
  const name = typeof value === "string" ? value.trim().replace(/[\r\n\t]+/g, " ") : "";
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/u.test(name)) {
    throw new LootProfileValidationError(["Şablon adı 1 ile 80 karakter arasında olmalıdır."]);
  }
  return name;
}

function templateNameKey(name: string) {
  return name.normalize("NFKC").toLocaleLowerCase("tr-TR");
}

function validatedTemplateGroups(input: unknown, liveSourceKey?: unknown): LootGroup[] {
  const sourceKey = isLootSourceKey(liveSourceKey) ? liveSourceKey : LOOT_SOURCE_DEFINITIONS[0].key;
  const candidate = { version: 1, key: sourceKey, groups: input };
  const result = liveSourceKey === undefined
    ? validateLootProfile(sourceKey, candidate)
    : isLootSourceKey(liveSourceKey)
      ? validateLiveLootProfile(sourceKey, candidate)
      : { ok: false as const, errors: ["Şablonun kaynak profili geçersiz."] };
  if (!result.ok) throw new LootProfileValidationError(result.errors);
  if (!result.profile.groups.length) throw new LootProfileValidationError(["Şablonda en az bir ganimet grubu olmalıdır."]);
  return (liveSourceKey === undefined ? result.profile : upgradeEquipmentDropProfile(result.profile)).groups;
}

function recordFromTemplateRow(row: LootTemplateRow): LootTemplateRecord | null {
  try {
    const id = templateId(row.id);
    const name = templateName(row.name);
    const revision = safeRevision(row.revision);
    if (!id || revision < 1) return null;
    const parsed = JSON.parse(row.groups_json) as unknown;
    return {
      id,
      name,
      revision,
      updatedAt: safeTimestamp(row.updated_at),
      groups: validatedTemplateGroups(parsed),
    };
  } catch {
    return null;
  }
}

export async function loadLootTemplates(): Promise<LootTemplateRecord[]> {
  const rows = await db().prepare(
    "SELECT id, name, revision, groups_json, updated_at FROM loot_templates ORDER BY updated_at DESC, name ASC",
  ).all<LootTemplateRow>();
  return (rows.results as LootTemplateRow[]).map(recordFromTemplateRow).filter((entry): entry is LootTemplateRecord => Boolean(entry));
}

export async function saveLootTemplate(input: {
  id?: unknown;
  name?: unknown;
  groups?: unknown;
  sourceKey?: unknown;
  expectedRevision?: unknown;
}, now: number): Promise<LootTemplateRecord> {
  const database = db();
  const id = templateId(input.id);
  if (input.id !== undefined && input.id !== null && !id) {
    throw new LootProfileValidationError(["Güncellenecek ganimet şablonunun kimliği geçersiz."]);
  }
  const name = templateName(input.name);
  const groups = validatedTemplateGroups(input.groups, input.sourceKey);
  const groupsJson = JSON.stringify(groups);
  const updatedAt = safeTimestamp(now);
  if (updatedAt <= 0) throw new LootProfileValidationError(["Şablonun güncelleme zamanı geçersiz."]);
  if (id) {
    const expected = input.expectedRevision;
    if (typeof expected !== "number" || !Number.isSafeInteger(expected) || expected < 1) {
      throw new LootProfileValidationError(["Şablon sürümü geçersiz."]);
    }
    try {
      const result = await database.prepare(
        `UPDATE loot_templates SET name = ?, name_key = ?, groups_json = ?, revision = revision + 1, updated_at = ?
         WHERE id = ? AND revision = ? RETURNING id, name, revision, groups_json, updated_at`,
      ).bind(name, templateNameKey(name), groupsJson, updatedAt, id, expected).first<LootTemplateRow>();
      if (!result) {
        const current = await database.prepare("SELECT revision FROM loot_templates WHERE id = ?")
          .bind(id).first<{ revision: number }>();
        throw new LootTemplateRevisionConflictError(expected, safeRevision(current?.revision));
      }
      return recordFromTemplateRow(result)!;
    } catch (error) {
      if (String(error).toLowerCase().includes("unique")) throw new LootProfileValidationError(["Bu adla bir ganimet şablonu zaten var."]);
      throw error;
    }
  }
  const createdId = `ltt_${crypto.randomUUID().replaceAll("-", "")}`;
  try {
    const row = await database.prepare(
      `INSERT INTO loot_templates (id, name, name_key, revision, groups_json, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?) RETURNING id, name, revision, groups_json, updated_at`,
    ).bind(createdId, name, templateNameKey(name), groupsJson, updatedAt, updatedAt).first<LootTemplateRow>();
    if (!row) throw new Error("Ganimet şablonu kaydedilemedi.");
    return recordFromTemplateRow(row)!;
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new LootProfileValidationError(["Bu adla bir ganimet şablonu zaten var."]);
    throw error;
  }
}

export async function deleteLootTemplate(value: unknown, expectedRevisionValue: unknown) {
  const id = templateId(value);
  if (!id) throw new LootProfileValidationError(["Silinecek ganimet şablonu geçersiz."]);
  const expectedRevision = expectedRevisionValue;
  if (typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new LootProfileValidationError(["Silinecek şablonun sürümü geçersiz."]);
  }
  const database = db();
  const result = await database.prepare("DELETE FROM loot_templates WHERE id = ? AND revision = ?")
    .bind(id, expectedRevision).run();
  if (statementChanges(result) !== 1) {
    const current = await database.prepare("SELECT revision FROM loot_templates WHERE id = ?")
      .bind(id).first<{ revision: number }>();
    throw new LootTemplateRevisionConflictError(expectedRevision, safeRevision(current?.revision));
  }
}

type LootTemplateApplyTarget = {
  sourceKey: LootSourceKey;
  expectedRevision: number;
};

type LoadedLootTemplateTarget = LootTemplateApplyTarget & {
  activeRevision: number;
  latestRevision: number;
};

function validatedTemplateTargets(value: unknown): LootTemplateApplyTarget[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > LOOT_SOURCE_DEFINITIONS.length) {
    throw new LootProfileValidationError([`Şablon için 1 ile ${LOOT_SOURCE_DEFINITIONS.length} arasında hedef seçmelisiniz.`]);
  }
  const targets: LootTemplateApplyTarget[] = [];
  const seen = new Set<LootSourceKey>();
  value.forEach((entry, index) => {
    if (!isObjectRecord(entry) || !isLootSourceKey(entry.sourceKey)) {
      throw new LootProfileValidationError([`targets[${index}]: Bilinmeyen canavar veya boss profili.`]);
    }
    const expectedRevision = entry.expectedRevision;
    if (typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new LootProfileValidationError([`targets[${index}]: Geçerli bir canlı profil sürümü gönderilmelidir.`]);
    }
    if (seen.has(entry.sourceKey)) {
      throw new LootProfileValidationError([`targets[${index}]: Aynı hedef birden fazla kez seçilemez.`]);
    }
    seen.add(entry.sourceKey);
    targets.push({ sourceKey: entry.sourceKey, expectedRevision });
  });
  return targets;
}

async function loadTemplateTargetStates(targets: LootTemplateApplyTarget[]): Promise<LoadedLootTemplateTarget[]> {
  const placeholders = targets.map(() => "?").join(", ");
  const result = await db().prepare(
    `SELECT source_key, active_revision, latest_revision, updated_at, NULL AS profile_json
     FROM loot_profiles WHERE source_key IN (${placeholders})`,
  ).bind(...targets.map((target) => target.sourceKey)).all<LootProfilePointerRow>();
  const bySource = new Map((result.results as LootProfilePointerRow[]).map((row) => [row.source_key, row]));
  return targets.map((target) => {
    const row = bySource.get(target.sourceKey);
    return {
      ...target,
      activeRevision: safeRevision(row?.active_revision),
      latestRevision: safeRevision(row?.latest_revision),
    };
  });
}

async function currentTargetConflicts(
  targets: LoadedLootTemplateTarget[],
): Promise<LootTemplateTargetConflict[]> {
  const current = await loadTemplateTargetStates(targets);
  return current.flatMap((target, index) => {
    const expected = targets[index];
    const currentRevision = target.activeRevision;
    const currentLatestRevision = target.latestRevision;
    return currentRevision !== expected.expectedRevision || currentLatestRevision !== expected.latestRevision
      ? [{
          sourceKey: expected.sourceKey,
          expectedRevision: expected.expectedRevision,
          currentRevision,
          historyChanged: currentLatestRevision !== expected.latestRevision,
        }]
      : [];
  });
}

export async function applyLootTemplate(
  value: unknown,
  expectedTemplateRevisionValue: unknown,
  targetsValue: unknown,
  now: number,
  adminIdentity: string,
) {
  const id = templateId(value);
  if (!id) throw new LootProfileValidationError(["Uygulanacak ganimet şablonu geçersiz."]);
  const expectedTemplateRevision = expectedTemplateRevisionValue;
  if (typeof expectedTemplateRevision !== "number" || !Number.isSafeInteger(expectedTemplateRevision) || expectedTemplateRevision < 1) {
    throw new LootProfileValidationError(["Uygulanacak şablonun sürümü geçersiz."]);
  }
  const updatedAt = safeTimestamp(now);
  if (updatedAt <= 0) throw new LootProfileValidationError(["Şablonun uygulanma zamanı geçersiz."]);
  const targets = validatedTemplateTargets(targetsValue);
  const database = db();
  const row = await database.prepare(
    "SELECT id, name, revision, groups_json, updated_at FROM loot_templates WHERE id = ?",
  ).bind(id).first<LootTemplateRow>();
  if (safeRevision(row?.revision) !== expectedTemplateRevision) {
    throw new LootTemplateRevisionConflictError(expectedTemplateRevision, safeRevision(row?.revision));
  }
  const template = row ? recordFromTemplateRow(row) : null;
  if (!template) throw new LootProfileValidationError(["Ganimet şablonu bulunamadı veya bozuk."]);
  const templateProfile = {
    version: 1 as const,
    key: LOOT_SOURCE_DEFINITIONS[0].key,
    label: template.name,
    groups: template.groups,
  };
  const templateGearGroups = template.groups.filter((group) => group.outcomes.some((outcome) => outcome.item.type === "gear"));
  if (templateGearGroups.length !== 1 || templateGearGroups[0].outcomes.some((outcome) => outcome.item.type !== "gear")) {
    throw new LootProfileValidationError(["Bu eski şablon tek ekipman tablosuna güvenle dönüştürülemiyor."]);
  }
  const targetStates = await loadTemplateTargetStates(targets);
  const initialConflicts = targetStates.flatMap((target) => {
    return target.activeRevision !== target.expectedRevision
      ? [{ sourceKey: target.sourceKey, expectedRevision: target.expectedRevision, currentRevision: target.activeRevision }]
      : [];
  });
  if (initialConflicts.length) throw new LootTemplateTargetConflictError(initialConflicts);
  const currentProfiles = new Map((await loadAllLootProfiles()).map((record) => [record.sourceKey, record.profile]));
  const preparedTargets: Array<LoadedLootTemplateTarget & { nextRevision: number; profileJson: string }> = [];
  const auditTargets: Array<{ sourceKey: LootSourceKey; fromRevision: number; toRevision: number }> = [];
  for (const target of targetStates) {
    const { sourceKey, expectedRevision, latestRevision } = target;
    if (latestRevision >= Number.MAX_SAFE_INTEGER - 1) throw new Error("Ganimet profilinin sürüm sınırına ulaşıldı.");
    const currentProfile = currentProfiles.get(sourceKey);
    if (!currentProfile) throw new LootProfileValidationError([`${sourceKey}: Canlı ganimet profili bulunamadı.`]);
    // Şablonlar yalnız ekipman oranlarını taşır. Hedefe ait garanti Öz,
    // Sinsi Taş Tozu ve diğer korumalı kaynak miktarları aynen kalır.
    const targetTemplate = directLootProfile({ ...templateProfile, key: sourceKey });
    const templateChances = extractSimpleLootChances(targetTemplate);
    const mergedProfile = withSimpleLootChances(currentProfile, templateChances);
    const validated = validateLiveLootProfile(sourceKey, mergedProfile);
    if (!validated.ok) throw new LootProfileValidationError(validated.errors);
    const profileJson = serializeLootProfile(validated.profile);
    const nextRevision = latestRevision + 1;
    preparedTargets.push({ ...target, nextRevision, profileJson });
    auditTargets.push({ sourceKey, fromRevision: expectedRevision, toRevision: nextRevision });
  }
  const sourceRows = preparedTargets.map(() => "(?)").join(", ");
  const versionRows = preparedTargets.map(() => "(?, ?, ?, ?)").join(", ");
  const pointerRows = preparedTargets.map(() => "(?, ?, ?)").join(", ");
  // Template ids and revisions are interpolated only after strict allowlist /
  // safe-integer validation. This keeps the worst-case 25-target INSERT at
  // D1's 100-bound-parameter ceiling while every profile JSON remains bound.
  const templateGuard = `EXISTS (SELECT 1 FROM loot_templates WHERE id = '${template.id}' AND revision = ${expectedTemplateRevision})`;
  const statements = [
    database.prepare(
      `WITH requested(source_key) AS (VALUES ${sourceRows})
       INSERT OR IGNORE INTO loot_profiles (source_key, active_revision, latest_revision, updated_at)
       SELECT source_key, 0, 0, ? FROM requested`,
    ).bind(...preparedTargets.map((target) => target.sourceKey), updatedAt),
    database.prepare(
      `WITH requested(source_key, expected_revision, expected_latest, profile_json) AS (VALUES ${versionRows})
       INSERT INTO loot_profile_versions (source_key, revision, profile_json, created_at)
       SELECT
         CASE WHEN pointer.active_revision = requested.expected_revision
           AND pointer.latest_revision = requested.expected_latest
           AND ${templateGuard}
           THEN pointer.source_key ELSE NULL END,
         requested.expected_latest + 1, requested.profile_json, ${updatedAt}
       FROM requested
       LEFT JOIN loot_profiles pointer ON pointer.source_key = requested.source_key`,
    ).bind(...preparedTargets.flatMap((target) => [
      target.sourceKey,
      target.expectedRevision,
      target.latestRevision,
      target.profileJson,
    ])),
    database.prepare(
      `WITH requested(source_key, expected_revision, expected_latest) AS (VALUES ${pointerRows})
       UPDATE loot_profiles SET
         active_revision = latest_revision + 1,
         latest_revision = latest_revision + 1,
         updated_at = ?
       WHERE EXISTS (
         SELECT 1 FROM requested
         WHERE requested.source_key = loot_profiles.source_key
           AND requested.expected_revision = loot_profiles.active_revision
           AND requested.expected_latest = loot_profiles.latest_revision
       )`,
    ).bind(...preparedTargets.flatMap((target) => [
      target.sourceKey,
      target.expectedRevision,
      target.latestRevision,
    ]), updatedAt),
    database.prepare(
    `INSERT INTO admin_audit_events (id, admin_account_id, action, target_account_id, detail_json, created_at_ms)
     VALUES (?, ?, 'apply_loot_template', '', ?, ?)`,
    ).bind(crypto.randomUUID(), adminIdentity.slice(0, 160), JSON.stringify({
      templateId: template.id,
      templateName: template.name,
      templateRevision: template.revision,
      targets: auditTargets,
    }), updatedAt * 1000),
  ];
  try {
    // D1 executes a batch transactionally. The NOT NULL guard in the version
    // insert intentionally aborts that transaction if either the template or
    // any target changes after the reads above, so no target can be half-applied.
    await database.batch(statements);
  } catch (error) {
    const currentTemplate = await database.prepare("SELECT revision FROM loot_templates WHERE id = ?")
      .bind(id).first<{ revision: number }>();
    const currentTemplateRevision = safeRevision(currentTemplate?.revision);
    if (currentTemplateRevision !== expectedTemplateRevision) {
      throw new LootTemplateRevisionConflictError(expectedTemplateRevision, currentTemplateRevision);
    }
    const conflicts = await currentTargetConflicts(targetStates);
    if (conflicts.length) throw new LootTemplateTargetConflictError(conflicts);
    throw error;
  }
  return { template, targets: auditTargets };
}
