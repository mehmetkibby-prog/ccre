import {COIN_PACKS} from './premium-catalog.mjs';
import { db, nowSeconds } from "@/lib/game-world";
import { sha256 } from "@/lib/game-auth";
import { SUPPORT_PACK } from "@/lib/payments";

const EPIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EPIN_BODY_LENGTH = 16;
export const CORE_COIN_PACK = { code: "core-coins-500-v1", name: "500 Çekirdek Parası", coins: 500, priceTl: 300 } as const;
const SUPPORTED_PRODUCTS = new Set([SUPPORT_PACK.code, ...COIN_PACKS.map(p=>p.code)]);

export function normalizeEpin(value: unknown) {
  if (typeof value !== "string") return "";
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidEpinFormat(value: string) {
  return new RegExp(`^YC[${EPIN_ALPHABET}]{${EPIN_BODY_LENGTH}}$`).test(value);
}

export function generateEpinCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(EPIN_BODY_LENGTH));
  let body = "";
  for (const byte of bytes) body += EPIN_ALPHABET[byte % EPIN_ALPHABET.length];
  return `YC-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}`;
}

export async function hashEpin(code: string) {
  return sha256(`yasam-cekirdegi:epin:v1:${normalizeEpin(code)}`);
}

export async function createEpinBatch(input: { name: string; count: number; validDays: number; productCode?: string }) {
  const database = db();
  const now = nowSeconds();
  const batchId = `epb_${crypto.randomUUID().replaceAll("-", "")}`;
  const name = input.name.trim().replace(/[\r\n\t]+/g, " ").slice(0, 80);
  const count = Math.max(1, Math.min(100, Math.round(input.count)));
  const validDays = Math.max(0, Math.min(3650, Math.round(input.validDays)));
  const expiresAt = validDays > 0 ? now + validDays * 24 * 60 * 60 : 0;
  const productCode = input.productCode && SUPPORTED_PRODUCTS.has(input.productCode) ? input.productCode : SUPPORT_PACK.code;
  const codes: string[] = [];
  const seen = new Set<string>();

  while (codes.length < count) {
    const code = generateEpinCode();
    const normalized = normalizeEpin(code);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      codes.push(code);
    }
  }

  const hashes = await Promise.all(codes.map(hashEpin));
  const statements = [
    database.prepare(
      `INSERT INTO epin_batches (id, name, product_code, code_count, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(batchId, name || "Sonteklif E-PIN", productCode, count, now, expiresAt),
    ...codes.map((code, index) => database.prepare(
      `INSERT INTO epin_codes
        (code_hash, code_hint, batch_id, product_code, status, created_at, expires_at, redeemed_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, 0)`,
    ).bind(hashes[index], `YC-••••-••••-••••-${normalizeEpin(code).slice(-4)}`, batchId, productCode, now, expiresAt)),
  ];
  await database.batch(statements);
  return { batchId, name: name || "Sonteklif E-PIN", codes, expiresAt };
}

export async function revokeEpinBatch(batchId: string) {
  const result = await db().prepare(
    "UPDATE epin_codes SET status = 'revoked' WHERE batch_id = ? AND status = 'active'",
  ).bind(batchId).run();
  return Number(result.meta.changes ?? 0);
}

export async function redeemEpin(input: { code: string; accountId: string; playerId: string }) {
  const normalized = normalizeEpin(input.code);
  if (!isValidEpinFormat(normalized)) throw new Error("E-PIN biçimi geçersiz.");

  const database = db();
  const codeHash = await hashEpin(normalized);
  const now = nowSeconds();
  const record = await database.prepare(
    "SELECT status, product_code, expires_at FROM epin_codes WHERE code_hash = ? LIMIT 1",
  ).bind(codeHash).first<{ status: string; product_code: string; expires_at: number }>();

  if (!record) throw new Error("E-PIN bulunamadı.");
  if (record.status === "redeemed") throw new Error("Bu E-PIN daha önce kullanılmış.");
  if (record.status === "revoked") throw new Error("Bu E-PIN iptal edilmiş.");
  if (!SUPPORTED_PRODUCTS.has(record.product_code)) throw new Error("E-PIN ürünü artık desteklenmiyor.");
  if (record.expires_at > 0 && record.expires_at < now) throw new Error("Bu E-PIN'in kullanım süresi dolmuş.");

  const coinPack = COIN_PACKS.find(p=>p.code===record.product_code);
  const redemptionToken = crypto.randomUUID();
  const results = await database.batch([
    database.prepare(
      `UPDATE epin_codes SET status = 'redeemed', redeemed_at = ?, redeemed_by_account_id = ?,
         redeemed_by_player_id = ?, redemption_token = ?
       WHERE code_hash = ? AND status = 'active' AND (expires_at = 0 OR expires_at >= ?)`,
    ).bind(now, input.accountId, input.playerId, redemptionToken, codeHash, now),
    coinPack ? database.prepare(
      `UPDATE players SET core_coins=core_coins+? WHERE id=? AND account_id=?
       AND EXISTS (SELECT 1 FROM epin_codes WHERE redemption_token=? AND redeemed_by_player_id=?)`,
    ).bind(coinPack.coins, input.playerId, input.accountId, redemptionToken, input.playerId) : database.prepare(
      `UPDATE players SET
         xp_ring_until = MAX(xp_ring_until, ?) + ?,
         drop_charm_until = MAX(drop_charm_until, ?) + ?,
         wings_expires_at_ms = MAX(wings_expires_at_ms, ?) + 1209600000,
         has_wings = 1,
         wings_equipped = 1
       WHERE id = ? AND account_id = ?
         AND EXISTS (SELECT 1 FROM epin_codes WHERE redemption_token = ? AND redeemed_by_player_id = ?)`,
    ).bind(
      now,
      SUPPORT_PACK.durationSeconds,
      now,
      SUPPORT_PACK.durationSeconds,
      now * 1000,
      input.playerId,
      input.accountId,
      redemptionToken,
      input.playerId,
    ),
  ]);

  if (Number(results[0]?.meta?.changes ?? 0) !== 1 || Number(results[1]?.meta?.changes ?? 0) !== 1) {
    const latest = await database.prepare("SELECT status FROM epin_codes WHERE code_hash = ? LIMIT 1")
      .bind(codeHash).first<{ status: string }>();
    if (latest?.status === "redeemed") throw new Error("Bu E-PIN daha önce kullanılmış.");
    throw new Error("E-PIN şu anda kullanılamadı. Lütfen tekrar dene.");
  }

  const player = await database.prepare(
    "SELECT xp_ring_until,drop_charm_until,has_wings,wings_equipped,core_coins FROM players WHERE id=? AND account_id=? LIMIT 1",
  ).bind(input.playerId, input.accountId).first<{ xp_ring_until:number; drop_charm_until:number; has_wings:number; wings_equipped:number; core_coins:number }>();
  return { ...player, productCode: record.product_code, grantedCoins: coinPack?.coins ?? 0 };
}
