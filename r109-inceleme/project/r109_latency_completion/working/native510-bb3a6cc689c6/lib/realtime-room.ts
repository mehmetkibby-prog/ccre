import { env } from "cloudflare:workers";
import {
  hasRealtimeSigningKey,
  realtimeHttpOrigin,
  signedRealtimeRequest,
} from "@/lib/realtime-signing";

export type RealtimeArea = `guild_village_${number}` | `guild_hall_${string}` | "forest" | "frozen" | "bazaar" | "fishing" | "sanctum" | "dragon" | "sinsi" | "war" | "arena" | "black" | "ancient" | "afk";

export type RealtimeRoomTarget = {
  channel: number;
  area: string;
  arenaMatchId?: string;
};

type RealtimeBindings = {
  GAME_ROOMS?: DurableObjectNamespace;
};

export function hasDurableRealtimeTransport() {
  return Boolean((env as unknown as RealtimeBindings).GAME_ROOMS);
}

function safeArenaMatchId(value: string | undefined) {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : "";
}

export function realtimeRoomName(cycle: number, channel: number, area: string, arenaMatchId?: string) {
  const safeCycle = Math.max(1, Math.floor(Number(cycle) || 1));
  const safeChannel = Math.max(1, Math.floor(Number(channel) || 1));
  const safeArea = /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area) ? area : "forest";
  const arenaScope = safeArea === "arena" ? `:match:${safeArenaMatchId(arenaMatchId) || "invalid"}` : "";
  return `cycle:${safeCycle}:channel:${safeChannel}:area:${safeArea}${arenaScope}`;
}

async function publishDurableRoomEvent(
  cycle: number,
  channel: number,
  area: string,
  event: Record<string, unknown>,
  arenaMatchId?: string,
) {
  const namespace = (env as unknown as RealtimeBindings).GAME_ROOMS;
  if (!namespace) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 350);
  try {
    if (area === "arena" && !safeArenaMatchId(arenaMatchId)) return false;
    const id = namespace.idFromName(realtimeRoomName(cycle, channel, area, arenaMatchId));
    const response = await namespace.get(id).fetch("https://game-room.internal/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...event, serverAt: Number(event.serverAt) || Date.now() }),
      signal: controller.signal,
    });
    return response.ok;
  } catch (error) {
    console.warn("Realtime room broadcast failed; HTTP reconciliation remains active.", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

type NativeRealtimeBatch = { send(origin: string, pathname: string, body: string, sign: (pathname: string, body: string) => Promise<Record<string, string>>): Promise<{ ok: boolean; status: number; json(): Promise<unknown> } | null> | null };
type NativeRealtimePost = (origin: string, pathname: string, headers: Record<string, string>, body: string, timeoutMs: number) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }> | null;
// A transient slow request must not silence unrelated movement/combat for 5s.
// Delivery runs in waitUntil; this budget does not block the player's HTTP ACK.
// Movement is superseded by the next position revision. Essential results retry
// once with a new signature/nonce and the same eventId for receiver deduplication.
async function deliverDedicatedEvent(pathname: string, body: string, retry: boolean, requireVisibility = false) {
  for (let attempt = 0; attempt < (retry ? 2 : 1); attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);
    try {
      const native = env as unknown as { CORE_REALTIME_POST?: NativeRealtimePost; CORE_REALTIME_BATCH?: NativeRealtimeBatch };
      // VDS: events from the same few milliseconds share one signed request
      // (null = old realtime service or unbatchable event: single request).
      const batched = native.CORE_REALTIME_BATCH ? await native.CORE_REALTIME_BATCH.send(realtimeHttpOrigin(), pathname, body, signedRealtimeRequest) : null;
      const response = batched ?? await (async () => {
        const headers = await signedRealtimeRequest(pathname, body);
        // VDS loopback: keep-alive node:http instead of fetch(); same request.
        return (native.CORE_REALTIME_POST && await native.CORE_REALTIME_POST(realtimeHttpOrigin(), pathname, headers, body, 1_500)) || await fetch(`${realtimeHttpOrigin()}${pathname}`, {
          method: "POST",
          headers: { "content-type": "application/json", ...headers },
          body,
          signal: controller.signal,
        });
      })();
      if (response.ok) return !requireVisibility || (await response.json() as { visibilityProtocol?: string }).visibilityProtocol === "gm-visibility-v1";
      if (response.status < 500 && response.status !== 429) {
        console.warn("Dedicated realtime delivery rejected", response.status);
        return false;
      }
    } catch { /* Retry this event only; never disable the whole transport. */ }
    finally { clearTimeout(timeout); }
  }
  console.warn("Dedicated realtime event delivery failed after bounded attempts.");
  return false;
}

async function publishDedicatedRoomEvent(
  cycle: number,
  channel: number,
  area: string,
  event: Record<string, unknown>,
  arenaMatchId?: string,
  combatAudit?: unknown,
) {
  if (!hasRealtimeSigningKey()) return false;
  const pathname = "/internal/broadcast";
  const body = JSON.stringify({
    v: 1,
    ...(combatAudit ? { combatAudit } : {}),
    room: {
      cycle: Math.max(1, Math.floor(Number(cycle) || 1)),
      channel: Math.max(1, Math.floor(Number(channel) || 1)),
      area: /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area) ? area : "forest",
      ...(area === "arena" ? { arenaMatchId: safeArenaMatchId(arenaMatchId) } : {}),
    },
    event: { ...event, serverAt: Number(event.serverAt) || Date.now() },
  });
  return deliverDedicatedEvent(pathname, body, event.type !== "move", event.type === "gm_visibility");
}

async function publishDedicatedWorldEvent(
  cycle: number,
  event: Record<string, unknown>,
) {
  if (!hasRealtimeSigningKey()) return false;
  const pathname = "/internal/broadcast-world";
  const safeCycle = Math.max(1, Math.floor(Number(cycle) || 1));
  const body = JSON.stringify({
    v: 1,
    cycle: safeCycle,
    event: { ...event, serverAt: Number(event.serverAt) || Date.now() },
  });
  return deliverDedicatedEvent(pathname, body, true);
}

export async function publishRealtimeRoomEvent(
  cycle: number,
  channel: number,
  area: string,
  event: Record<string, unknown>,
  arenaMatchId?: string,
) {
  if (area === "arena" && !safeArenaMatchId(arenaMatchId)) return false;
  const { __combatAudit: combatAudit, ...publicEvent } = event;
  const [durable, dedicated] = await Promise.all([
    publishDurableRoomEvent(cycle, channel, area, publicEvent, arenaMatchId),
    publishDedicatedRoomEvent(cycle, channel, area, publicEvent, arenaMatchId, combatAudit),
  ]);
  return durable || dedicated;
}

// World chat is visible across every area and channel in the active world cycle.
// The dedicated service can fan it out globally with one signed request. Durable
// Objects are isolated per gameplay room, so the caller supplies the currently
// occupied room scopes and each one receives the same canonical persisted event.
export async function publishRealtimeWorldEvent(
  cycle: number,
  rooms: Iterable<RealtimeRoomTarget>,
  event: Record<string, unknown>,
) {
  const safeCycle = Math.max(1, Math.floor(Number(cycle) || 1));
  const uniqueRooms = new Map<string, RealtimeRoomTarget>();
  for (const room of rooms) {
    const area = /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(room.area) ? room.area : "";
    const channel = Math.max(1, Math.floor(Number(room.channel) || 1));
    const arenaMatchId = area === "arena" ? safeArenaMatchId(room.arenaMatchId) : "";
    if (!area || (area === "arena" && !arenaMatchId)) continue;
    uniqueRooms.set(`${channel}:${area}:${arenaMatchId}`, {
      channel,
      area,
      ...(arenaMatchId ? { arenaMatchId } : {}),
    });
  }
  const deliveries = await Promise.all([
    ...[...uniqueRooms.values()].map((room) => publishDurableRoomEvent(
      safeCycle,
      room.channel,
      room.area,
      event,
      room.arenaMatchId,
    )),
    publishDedicatedWorldEvent(safeCycle, event),
  ]);
  return deliveries.some(Boolean);
}

// Ortak yaratık sonuçları birden çok kanal odasına ulaşmalıdır. Durable Object
// odaları kanal başına ayrı olduğu için her odaya bir kez yollarız; VDS hattına
// ise saldıranın bulunduğu oda için yalnız tek imzalı istek göndeririz. Böylece
// kanal sayısı dedicated yayın kotasını katlamaz.
export async function publishRealtimeRoomEventToChannels(
  cycle: number,
  channels: Iterable<number>,
  area: string,
  event: Record<string, unknown>,
  dedicatedChannel?: number,
) {
  const uniqueChannels = [...new Set([...channels].map((channel) => Math.max(1, Math.floor(Number(channel) || 1))))];
  if (!uniqueChannels.length) return false;
  const safeDedicatedChannel = dedicatedChannel === undefined
    ? null
    : Math.max(1, Math.floor(Number(dedicatedChannel) || 1));
  const deliveries = await Promise.all([
    ...uniqueChannels.map((channel) => publishDurableRoomEvent(cycle, channel, area, event)),
    ...(safeDedicatedChannel !== null && uniqueChannels.includes(safeDedicatedChannel)
      ? [publishDedicatedRoomEvent(cycle, safeDedicatedChannel, area, event)]
      : []),
  ]);
  return deliveries.some(Boolean);
}

// Private events use an explicit recipient list on both transports. They are
// never published to a public room; the persisted chat row remains authoritative.
export async function publishRealtimePlayerEvent(
  cycle: number,
  channel: number,
  area: string,
  audiencePlayerIds: string[],
  event: Record<string, unknown>,
  arenaMatchId?: string,
) {
  const audience = [...new Set(audiencePlayerIds.filter((playerId) => /^[A-Za-z0-9_-]{1,80}$/.test(playerId)))];
  if (!audience.length) return false;
  const [durable, dedicated] = await Promise.all([
    publishDurableRoomEvent(cycle, channel, area, { ...event, audiencePlayerIds: audience }, arenaMatchId),
    hasRealtimeSigningKey() ? deliverDedicatedEvent("/internal/broadcast-players", JSON.stringify({v:1,cycle, audiencePlayerIds:audience,event}), true) : false,
  ]);
  return durable || dedicated;
}

// Guild notices cross map/channel boundaries. Use the authenticated audience
// transport once, plus each occupied fallback room; never the world-chat route.
export async function publishRealtimeGuildEvent(
  cycle: number,
  players: Array<{ id: string; channel: number; area: string; arena_match_id?: string }>,
  event: Record<string, unknown>,
) {
  const audience = [...new Set(players.map(player => player.id))];
  if (!audience.length || audience.length > 80 || event.type !== 'guild_changed') return false;
  const rooms = new Map<string, typeof players[number]>();
  for (const player of players) rooms.set(realtimeRoomName(cycle, player.channel, player.area, player.arena_match_id), player);
  const deliveries = await Promise.all([
    ...[...rooms.values()].map(player => publishDurableRoomEvent(cycle, player.channel, player.area,
      { ...event, audiencePlayerIds: audience }, player.arena_match_id)),
    hasRealtimeSigningKey() ? deliverDedicatedEvent('/internal/broadcast-players', JSON.stringify({
      v: 1, cycle, audiencePlayerIds: audience, event,
    }), true) : false,
  ]);
  return deliveries.some(Boolean);
}
