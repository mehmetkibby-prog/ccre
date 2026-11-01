import { env } from "cloudflare:workers";

const encoder = new TextEncoder();
const KEY_ID = "coreoflife-p256-2026-09";

type RealtimeEnvironment = {
  CORE_RUNTIME?: string;
  REALTIME_SIGNING_PRIVATE_KEY?: string;
  REALTIME_SOCKET_URL?: string;
  REALTIME_HTTP_ORIGIN?: string;
};

let signingKeyPromise: Promise<CryptoKey> | null = null;
type DedicatedHealth = {
  available: boolean;
  supportedAreas: string[];
};

let dedicatedHealthCheck: Promise<DedicatedHealth> | null = null;
let dedicatedHealthCache: DedicatedHealth & { expiresAt: number } = { available: false, supportedAreas: [], expiresAt: 0 };

function environment() {
  return env as unknown as RealtimeEnvironment;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToBytes(value: string) {
  const compact = value.replace(/\s+/g, "");
  if (!compact || compact.length > 8_192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    throw new Error("Realtime signing key is malformed.");
  }
  const binary = atob(compact);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function signingKey() {
  if (signingKeyPromise) return signingKeyPromise;
  const encoded = environment().REALTIME_SIGNING_PRIVATE_KEY;
  if (!encoded) throw new Error("REALTIME_SIGNING_PRIVATE_KEY is not configured.");
  signingKeyPromise = crypto.subtle.importKey(
    "pkcs8",
    base64ToBytes(encoded),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  return signingKeyPromise;
}

type NativeRealtimeCrypto = { sign(value: string): string; digest(body: string): string };
function nativeCrypto() {
  return (env as unknown as { CORE_REALTIME_CRYPTO?: NativeRealtimeCrypto }).CORE_REALTIME_CRYPTO;
}

async function sign(value: string) {
  // VDS: identical ECDSA P-256 / P1363 signature via node:crypto (no WebCrypto job).
  const native = nativeCrypto();
  if (native) return native.sign(value);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    await signingKey(),
    encoder.encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export function hasRealtimeSigningKey() {
  return Boolean(environment().REALTIME_SIGNING_PRIVATE_KEY);
}

export function realtimeSocketUrl() {
  const configured = environment().REALTIME_SOCKET_URL?.trim();
  if (configured && /^wss:\/\/[A-Za-z0-9.-]+(?::\d+)?\/ws$/.test(configured)) return configured;
  return "wss://realtime.coreoflife.net/ws";
}

export function realtimeHttpOrigin() {
  const configured = environment().REALTIME_HTTP_ORIGIN?.trim();
  // Realm processes have isolated realtime ports. Only the trusted native
  // environment may select an exact loopback origin; never accept user URLs.
  if (environment().CORE_RUNTIME === "vds" && configured && /^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(configured) && Number(configured.slice(configured.lastIndexOf(':')+1)) <= 65535) return configured;
  if (configured && /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(configured)) return configured;
  return "https://realtime.coreoflife.net";
}

export async function dedicatedRealtimeReady(requiredArea = "") {
  const now = Date.now();
  const supportsRequiredArea = (status: DedicatedHealth) => status.available
    && (!["frozen","ancient","afk"].includes(requiredArea) || status.supportedAreas.includes(requiredArea));
  if (now < dedicatedHealthCache.expiresAt) return supportsRequiredArea(dedicatedHealthCache);
  if (dedicatedHealthCheck) return supportsRequiredArea(await dedicatedHealthCheck);
  dedicatedHealthCheck = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);
    let available = false;
    let supportedAreas: string[] = [];
    try {
      const response = await fetch(`${realtimeHttpOrigin()}/readyz`, {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = response.ok ? await response.json() as Record<string, unknown> : null;
      available = payload?.ok === true
        && payload.version === "dedicated-v1"
        && payload.protocol === "col-realtime-1";
      supportedAreas = Array.isArray(payload?.supportedAreas)
        ? payload.supportedAreas.filter((area): area is string => typeof area === "string")
        : [];
    } catch { /* Aynı-origin Durable Object ve HTTP uzlaştırması güvenli yedektir. */ }
    finally { clearTimeout(timeout); }
    dedicatedHealthCache = { available, supportedAreas, expiresAt: Date.now() + (available ? 10_000 : 4_000) };
    return { available, supportedAreas };
  })().finally(() => { dedicatedHealthCheck = null; });
  return supportsRequiredArea(await dedicatedHealthCheck);
}

export async function createRealtimeTicket(payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload);
  const encoded = bytesToBase64Url(encoder.encode(serialized));
  const signature = await sign(`COL-TICKET-V1.${encoded}`);
  return `v1.${encoded}.${signature}`;
}

export async function signedRealtimeRequest(pathname: string, serializedBody: string) {
  if (!/^\/[A-Za-z0-9/_-]{1,120}$/.test(pathname)) throw new Error("Invalid realtime request path.");
  const timestamp = String(Math.floor(Date.now() / 1_000));
  const nonce = crypto.randomUUID();
  const native = nativeCrypto();
  const digest = native ? native.digest(serializedBody) : bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(serializedBody))));
  const signature = await sign(`COL-REQUEST-V1\n${KEY_ID}\n${timestamp}\n${nonce}\nPOST\n${pathname}\n${digest}`);
  return {
    "x-col-key-id": KEY_ID,
    "x-col-timestamp": timestamp,
    "x-col-nonce": nonce,
    "x-col-signature": signature,
  };
}
