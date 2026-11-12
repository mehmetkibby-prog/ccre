// R49: reversible native motion validator extension; walking stays byte-exact.
import {acceptMotion as acceptNativeMotion} from '../../../native510-bb3a6cc689c6/realtime-server/src/motion.mjs';
import {runeWalkableSegment} from '../../../native510-bb3a6cc689c6/realtime-server/src/rune-map.mjs';
import {forestCoreSegment} from "../../../native510-bb3a6cc689c6/realtime-server/src/forest-core.mjs";
import {ancientCoreSegment,insideAncientCore} from "../../../native510-bb3a6cc689c6/realtime-server/src/ancient-core.mjs";
export const MOTION_PROTOCOL = "validated-motion-v1";

// Presentation timing never grants movement budget: acceptMotion below validates
// coordinates, collision and speed using receipt time before calling this helper.
function presentationTime(player, clientAt, now) {
  const clock = player.motionPresentationClock;
  if (clock?.disabled) return undefined;
  if (typeof clientAt !== "number" || !Number.isFinite(clientAt) || clientAt < 0 || clientAt > 1e12) {
    if (clock) player.motionPresentationClock = { disabled: true };
    return undefined;
  }
  if (!clock) {
    player.motionPresentationClock = { clientOrigin: clientAt, serverOrigin: now, lastClientAt: clientAt };
    return now;
  }
  const mapped = clock.serverOrigin + clientAt - clock.clientOrigin;
  if (clientAt <= clock.lastClientAt || mapped < now - 1000 || mapped > now + 250) {
    // A broken source clock falls back once until reconnect. Never switch
    // clock domains on every packet or reject otherwise legal movement.
    player.motionPresentationClock = { disabled: true };
    return undefined;
  }
  clock.lastClientAt = clientAt;
  return mapped;
}

// Only call after an authenticated, newer D1 checkpoint has been accepted.
// A delayed checkpoint may pass a preview that stopped at the anchor limit.
// Rebase that covered preview, never a newer preview or a different connection.
export function reconcileMotionCheckpoint(player, event, now) {
  const sequence = event.motionSequence;
  if (event.motionStreamId !== player.connectionId
    || !Number.isSafeInteger(sequence) || sequence < 1
    || sequence < (player.motionSequence ?? 0)) return;
  const previous = player.motion;
  if (previous && sequence < previous.sequence) return;
  player.motionSequence = sequence;
  player.motion = {
    x: player.x, y: player.y, sequence, at: now,
    debt: Math.max(0, (previous?.debt ?? 0) - Math.max(0, now - (previous?.at ?? now))),
  };
}

// Presentation coordinates are separate from the database-authoritative x/y.
// Authentication, collision, rate and speed checks precede every broadcast.
export function acceptMountMotion(player, payload, now, walkable, speedMultiplier = 1) {
  if(speedMultiplier!==1.25)return acceptNativeMotion(player,payload,now,walkable);
  const sequence = Number(payload.sequence), x = Number(payload.x), y = Number(payload.y);
  if (player.hp <= 0 || now < (player.rootUntilMs ?? 0) || payload.streamId !== player.connectionId
    || !Number.isSafeInteger(sequence) || sequence < 1 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (!Number.isSafeInteger(payload.hpRevision) || payload.hpRevision < (player.motionHpFloor ?? 0)
    || sequence <= (player.motionSequence ?? 0)) return null;
  const previous = player.motion;
  if (previous && sequence <= previous.sequence) return null;
  const fromX = previous?.x ?? player.x, fromY = previous?.y ?? player.y;
  const distance = Math.hypot(x - fromX, y - fromY);
  const speed = (player.role === "avci" ? 265 : 239) * 1.07 * speedMultiplier;
  const elapsed = previous ? Math.max(0, Math.min(1000, now - previous.at)) : 520;
  const debt = Math.max(0, (previous?.debt ?? 0) + distance / speed * 1000 - elapsed);
  // Anchor previews to the last persisted position. Dropping HTTP checkpoints
  // cannot let a client roam the map while its actual character stands still.
  if (debt > 180 || distance > speed * 1.2 || Math.hypot(x - player.x, y - player.y) > speed * 1.84) return null;
  if((player.area==='rune'||player.area==='rune_v2')&&!runeWalkableSegment(fromX,fromY,x,y))return null;
  if(player.area === "forest" && !forestCoreSegment(fromX,fromY,x,y))return null;
  if(player.area === "ancient" && !ancientCoreSegment(fromX,fromY,x,y))return null;
  const steps = Math.max(1, Math.ceil(distance / 12));
  for (let i = 0; i <= steps; i++) {
    const sampleX=fromX+(x-fromX)*i/steps,sampleY=fromY+(y-fromY)*i/steps;
    // Players who stood at the future Core before the rollout can walk out.
    if(player.area==="ancient" && insideAncientCore(fromX,fromY) && insideAncientCore(sampleX,sampleY))continue;
    if (!walkable(player.area, sampleX, sampleY)) return null;
  }
  const presentationAt = presentationTime(player, payload.clientAt, now);
  player.motion = { x, y, sequence, at: now, debt };
  player.motionSequence = sequence;
  return { type: "motion_preview", protocol: MOTION_PROTOCOL, playerId: player.playerId,
    streamId: player.connectionId, sequence, x, y, hpRevision: player.hpRevision ?? 0, serverAt: now,
    ...(presentationAt === undefined ? {} : { presentationAt }),
    cycle: player.cycle, channel: player.channel, area: player.area, arenaMatchId: player.arenaMatchId || "" };
}

export function presentationPosition(player, now) {
  return player.hp > 0 && player.motion && now - player.motion.at < 500 ? player.motion : player;
}
