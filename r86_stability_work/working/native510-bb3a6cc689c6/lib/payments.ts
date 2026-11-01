import {SUPPORT_VENDOR_LINKS} from "@/lib/premium-catalog.mjs";
import { env } from "cloudflare:workers";
import { db, nowSeconds } from "@/lib/game-world";
import { sha256 } from "@/lib/game-auth";

export type PaymentProvider = "paytr" | "shopier";

export const SUPPORT_PACK = {
  // Stable product identity: existing E-PINs and pending orders keep their grants.
  code: "destek-paketi-100-v1",
  name: "Yaşam Çekirdeği Destek Paketi",
  amountKurus: 40_000,
  currency: "TRY",
  durationSeconds: 5 * 24 * 60 * 60,
  xpMultiplier: 1.5,
  dropMultiplier: 1.5,
  includesWings: true,
  termsVersion: "destek-paketi-v2-400tl-5gun",
} as const;

export const SONTEKLIF_LISTING_URL = SUPPORT_VENDOR_LINKS.sonteklif;

export const PAYMENT_CONSENT_TEXT = "Ön bilgilendirme ve mesafeli satış koşullarını okudum; dijital ürünlerin hemen teslim edilmesini istiyor ve teslimatla cayma hakkımı kaybedeceğimi kabul ediyorum.";

function configured(name: string) {
  return String((env as unknown as Record<string, unknown>)[name] ?? "").trim().length > 0;
}

export function paymentProviderAvailability() {
  const legalReady = Boolean(paymentTermsUrl());
  return {
    paytr: legalReady && configured("PAYTR_MERCHANT_ID") && configured("PAYTR_MERCHANT_KEY") && configured("PAYTR_MERCHANT_SALT"),
    shopier: legalReady && configured("SHOPIER_PAT") && configured("SHOPIER_WEBHOOK_TOKEN"),
  };
}

export function paymentEnv(name: string) {
  return String((env as unknown as Record<string, unknown>)[name] ?? "").trim();
}

export function paymentTermsUrl() {
  const value = paymentEnv("PAYMENT_TERMS_URL");
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function safePaymentProvider(value: unknown): PaymentProvider | null {
  return value === "paytr" || value === "shopier" ? value : null;
}

export async function createPaymentOrder(input: {
  accountId: string;
  playerId: string;
  provider: PaymentProvider;
  immediateDeliveryConsent: true;
  amountKurus?:number;
}) {
  if (input.immediateDeliveryConsent !== true) throw new Error("Dijital teslimat onayı gerekli.");
  const now = nowSeconds();
  const id = `YC${crypto.randomUUID().replaceAll("-", "")}`;
  const termsUrl = paymentTermsUrl();
  if (!termsUrl) throw new Error("Ödeme şartları yapılandırılmamış.");
  const termsHash = await sha256(JSON.stringify({
    consentText: PAYMENT_CONSENT_TEXT,
    productCode: SUPPORT_PACK.code,
    termsUrl,
    termsVersion: SUPPORT_PACK.termsVersion,
  }));
  await db().prepare(
    `INSERT INTO payment_orders
      (id, account_id, player_id, provider, product_code, amount_kurus, currency, status,
       consent_at, terms_version, terms_url, terms_hash, created_at, updated_at, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 0)`,
  ).bind(
    id,
    input.accountId,
    input.playerId,
    input.provider,
    SUPPORT_PACK.code,
    input.amountKurus ?? SUPPORT_PACK.amountKurus,
    SUPPORT_PACK.currency,
    now,
    SUPPORT_PACK.termsVersion,
    termsUrl,
    termsHash,
    now,
    now,
  ).run();
  return id;
}

export async function attachPaymentCheckoutId(orderId: string, provider: PaymentProvider, checkoutId: string) {
  const result = await db().prepare(
    `UPDATE payment_orders SET provider_checkout_id = ?, updated_at = ?
     WHERE id = ? AND provider = ? AND status = 'pending' AND provider_checkout_id IS NULL`,
  ).bind(checkoutId, nowSeconds(), orderId, provider).run();
  if (Number(result.meta.changes ?? 0) !== 1) throw new Error("Ödeme siparişi eşleştirilemedi.");
}

export async function findPendingOrderByCheckoutId(provider: PaymentProvider, checkoutId: string) {
  return db().prepare(
    `SELECT id, amount_kurus, currency FROM payment_orders
     WHERE provider = ? AND provider_checkout_id = ? AND status IN ('pending', 'failed') LIMIT 1`,
  ).bind(provider, checkoutId).first<{ id: string; amount_kurus: number; currency: string }>();
}

export async function hmacSha256Base64(key: string, message: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function hmacSha256Hex(key: string, message: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
  return [...signature].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeTextEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function markPaymentSuccessful(input: {
  provider: PaymentProvider;
  orderId: string;
  providerPaymentId: string;
  paidAmountKurus: number;
  eventId: string;
  rawPayload: string;
}) {
  const database = db();
  const order = await database.prepare(
    `SELECT id, player_id, provider, product_code, amount_kurus, currency, status
     FROM payment_orders WHERE id = ? LIMIT 1`,
  ).bind(input.orderId).first<{
    id: string; player_id: string; provider: string; product_code: string;
    amount_kurus: number; currency: string; status: string;
  }>();
  if (!order || order.provider !== input.provider || order.product_code !== SUPPORT_PACK.code) {
    return { accepted: false as const, reason: "unknown_order" as const };
  }
  if (order.amount_kurus !== input.paidAmountKurus || order.currency !== SUPPORT_PACK.currency) {
    return { accepted: false as const, reason: "amount_mismatch" as const };
  }
  if (order.status !== "pending" && order.status !== "failed" && order.status !== "paid") {
    return { accepted: false as const, reason: "terminal_order" as const };
  }

  const now = nowSeconds();
  const eventToken = crypto.randomUUID();
  const payloadHash = await sha256(input.rawPayload);
  const results = await database.batch([
    database.prepare(
      `INSERT OR IGNORE INTO payment_events
        (event_id, order_id, provider, event_token, payload_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(input.eventId, order.id, input.provider, eventToken, payloadHash, now),
    database.prepare(
      `UPDATE payment_orders SET status = 'paid', provider_payment_id = ?, paid_at = ?, updated_at = ?
       WHERE id = ? AND status IN ('pending', 'failed')
         AND EXISTS (SELECT 1 FROM payment_events WHERE event_token = ?)`,
    ).bind(input.providerPaymentId, now, now, order.id, eventToken),
    database.prepare(
      `INSERT OR IGNORE INTO support_pack_grants (order_id, player_id, grant_token, product_code, granted_at)
       SELECT id, player_id, ?, product_code, ? FROM payment_orders
       WHERE id = ? AND status = 'paid'
         AND EXISTS (SELECT 1 FROM payment_events WHERE event_token = ?)`,
    ).bind(eventToken, now, order.id, eventToken),
    database.prepare(
      `UPDATE players SET
         xp_ring_until = MAX(xp_ring_until, ?) + ?,
         drop_charm_until = MAX(drop_charm_until, ?) + ?,
         wings_expires_at_ms = MAX(wings_expires_at_ms, ?) + 604800000,
         has_wings = 1,
         wings_equipped = 1
       WHERE id = ? AND EXISTS (SELECT 1 FROM support_pack_grants WHERE grant_token = ?)`,
    ).bind(now, SUPPORT_PACK.durationSeconds, now, SUPPORT_PACK.durationSeconds, now * 1000, order.player_id, eventToken),
  ]);
  const granted = Number(results.at(-1)?.meta?.changes ?? 0) > 0;
  const confirmed = await database.prepare(
    `SELECT o.status, CASE WHEN g.order_id IS NULL THEN 0 ELSE 1 END AS has_grant
     FROM payment_orders o LEFT JOIN support_pack_grants g ON g.order_id = o.id
     WHERE o.id = ? LIMIT 1`,
  ).bind(order.id).first<{ status: string; has_grant: number }>();
  if (confirmed?.status !== "paid" || confirmed.has_grant !== 1) {
    return { accepted: false as const, reason: "grant_not_confirmed" as const };
  }
  return { accepted: true as const, granted };
}

export async function markPaymentFailed(input: {
  provider: PaymentProvider;
  orderId: string;
  eventId: string;
  rawPayload: string;
}) {
  const now = nowSeconds();
  const eventToken = crypto.randomUUID();
  await db().batch([
    db().prepare(
      `INSERT OR IGNORE INTO payment_events
        (event_id, order_id, provider, event_token, payload_hash, created_at)
       SELECT ?, id, provider, ?, ?, ? FROM payment_orders WHERE id = ? AND provider = ?`,
    ).bind(input.eventId, eventToken, await sha256(input.rawPayload), now, input.orderId, input.provider),
    db().prepare(
      `UPDATE payment_orders SET status = 'failed', updated_at = ?
       WHERE id = ? AND provider = ? AND status = 'pending'
         AND EXISTS (SELECT 1 FROM payment_events WHERE event_token = ?)`,
    ).bind(now, input.orderId, input.provider, eventToken),
  ]);
}
