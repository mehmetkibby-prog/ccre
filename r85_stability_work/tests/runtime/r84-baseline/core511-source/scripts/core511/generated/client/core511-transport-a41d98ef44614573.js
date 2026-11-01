import {RemoteMovement as RemoteMovementR43} from './core511-r44-remote-e805b5dbafb81553.js';
import {readR40Options as readReconnectOptionsR40} from './core511-r40-9f5f284069ff5cd9.js';
// r34-work/working/native510-bb3a6cc689c6/lib/world-push-frame.mjs
var WORLD_PUSH_MAX_FRAME_BYTES = 2 * 1024 * 1024;

// r34-work/working/native510-bb3a6cc689c6/lib/world-push.mjs
var WORLD_ROW_KEYS = { inventory: "id", storageItems: "id", shops: "id", listings: "id", chat: "id", regionalMessages: "id", directMessages: "id", stones: "kind", pets: "kind", dungeonMaterials: "kind" };
var WORLD_ENTITY_KEYS = ["players", "monsters", "drops", "combatEvents"];
function applyWorldDelta(previous, delta) {
  const next = { ...previous, ...delta.fields, serverTime: delta.serverTime, snapshotAtMs: delta.snapshotAtMs };
  for (const [key, change] of Object.entries(delta.entities ?? {})) {
    if (!WORLD_ENTITY_KEYS.includes(key) && !Object.hasOwn(WORLD_ROW_KEYS, key)) throw Error("Unknown world entity");
    const idKey = WORLD_ROW_KEYS[key] ?? "id";
    const rows = new Map((previous[key] ?? []).map((row) => [String(row[idKey]), row]));
    for (const id of change.remove ?? []) rows.delete(String(id));
    for (const patch of change.upsert ?? []) rows.set(String(patch[idKey]), { ...rows.get(String(patch[idKey])), ...patch });
    next[key] = change.order ? change.order.map((id) => rows.get(String(id))).filter(Boolean) : [...rows.values()];
  }
  return next;
}

// r34-work/working/core511-source/scripts/core511/mist-loot-actions.mjs
var MIST_LOOT_ACTIONS = Object.freeze(["adventure_loot_begin", "adventure_loot_finish", "adventure_loot_cancel"]);

// r34-work/working/core511-source/scripts/core511/adventure-maps.mjs
var ADVENTURE_ACTIONS = Object.freeze([...MIST_LOOT_ACTIONS, "adventure_tower_enter", "adventure_next", "adventure_leave", "adventure_mist_enter", "adventure_chest", "adventure_tower_chest", "adventure_refine"]);
var ADVENTURE_BOUNDS = Object.freeze({ width: 1600, height: 1100 });
var ADVENTURE_ENTRY = Object.freeze({ x: 800, y: 940 });
var MIST_BOUNDS = Object.freeze({ width: 2400, height: 1600 });
var MIST_ENTRY = Object.freeze({ x: 1171.875, y: 1359.375 });

// r34-work/working/core511-source/scripts/core511/belt-model.mjs
var make = (variant, name, attack, hp, experiencePercent, strongPlayers) => Object.freeze({ id: variant, variant, kind: "belt", name, image: "/game/belt-" + variant + "-r31.webp", attack, hp, experiencePercent, strongPlayers });
var BELTS_R31 = Object.freeze({
  wisdom: make("wisdom", "Bilgelik Kemeri", 50, 0, 20, 0),
  sovereign: make("sovereign", "H\xFCk\xFCmdar Kemeri", 0, 1500, 0, 10)
});
var ingredient = (kind, name, amount, image) => Object.freeze({ kind, name, label: name, amount, image });
var BELT_RECIPE_R31 = Object.freeze([
  ingredient("forge_ember491", "Kor M\xFChr\xFC", 100, "/game/forge-ember-v491.webp"),
  ingredient("tower_seal_shard", "Kadim Kat M\xFChr\xFC", 100, null),
  ingredient("tower_chain_ore", "Ruh Zinciri Halkas\u0131", 100, null),
  ingredient("tower_mourning_essence", "Sinsi Ta\u015F \xC7ekirde\u011Fi", 100, null),
  ingredient("tower_azrail_seal", "Matem \u0130pe\u011Fi", 50, null),
  ingredient("tower_azrail_hook", "Azrail Kancas\u0131", 10, null)
]);
var BELT_ACTIONS_R31 = Object.freeze(["craft_belt_r31", "equip_belt_r31", "unequip_belt_r31"]);
var BELT_PAKIZE_R31 = Object.freeze({ name: "Zanaat Ustas\u0131 Pakize", area: "bazaar", x: 1070, y: 390, reach: 245 });

// r34-work/working/core511-source/scripts/core511/generated/action-names.mjs
var NATIVE_ACTIONS = Object.freeze([...ADVENTURE_ACTIONS, ...BELT_ACTIONS_R31, "bulk_exchange_essence", "claim_rewards", "donate", "respawn", "collect", "use_potion", "guardian_dash", "start_fishing", "fishing_input", "finish_fishing", "cancel_fishing", "sell_fish", "arena_join_queue", "arena_cancel_queue", "arena_ack_result", "invite_party", "reject_party", "accept_party", "kick_party", "leave_party", "travel_event", "travel_dragon", "travel_rune_v2", "travel_rune", "travel_ancient", "travel_afk", "travel_market", "travel_forest", "travel_frozen", "travel_fishing", "travel_sanctum", "travel_sinsi", "travel_war", "travel_black"]);

// r34-work/working/core511-source/scripts/core511/movement-prediction.mjs
var point = (p) => ({ x: p.x, y: p.y });
var finitePoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var revision = (p) => p?.positionRevision ?? p?.position_revision;
var OwnPrediction = class {
  constructor() {
    this.clear();
    this.serial = 0;
    this.motionSerial = 0;
  }
  clear() {
    this.authority = null;
    this.predicted = null;
    this.pending = [];
    this.flight = null;
    this.scope = null;
    this.offset = { x: 0, y: 0 };
    this.correctedAt = 0;
    this.lastAt = null;
  }
  bind(row, scope2, at) {
    if (!finitePoint(row) || !Number.isSafeInteger(revision(row))) return false;
    if (this.scope !== scope2 || !this.authority) {
      this.clear();
      this.scope = scope2;
      this.authority = { ...point(row), area: row.area, revision: revision(row) };
      this.predicted = point(row);
      this.lastAt = at;
      return true;
    }
    if (revision(row) > this.authority.revision) {
      this.snap(row, at);
    }
    return true;
  }
  snap(row = this.authority, at = 0) {
    if (!finitePoint(row)) return this.clear();
    this.authority = { ...point(row), area: row.area, revision: revision(row) ?? row.revision };
    this.predicted = point(row);
    this.pending = [];
    this.flight = null;
    this.offset = { x: 0, y: 0 };
    this.correctedAt = at;
  }
  position(at) {
    if (!this.predicted) return null;
    const blend = Math.max(0, 1 - (at - this.correctedAt) / 100);
    return { x: this.predicted.x + this.offset.x * blend, y: this.predicted.y + this.offset.y * blend };
  }
  advance(seconds, integrate, at) {
    if (!this.predicted || typeof integrate !== "function") return this.position(at);
    const pendingSeconds = this.pending.reduce((n, row) => n + row.seconds, 0);
    let remaining = Math.min(0.25, Math.max(0, seconds), Math.max(0, 0.6 - pendingSeconds));
    while (remaining > 1e-7 && this.pending.length < 128) {
      const dt = Math.min(0.05, remaining), from = point(this.predicted), to = integrate(from, dt);
      if (!finitePoint(to)) throw Error("invalid_prediction_point");
      remaining -= dt;
      if (distance(from, to) < 1e-7) continue;
      const entry = { id: ++this.serial, motionSequence: ++this.motionSerial, seconds: dt, integrate, from, to: point(to) };
      this.pending.push(entry);
      this.predicted = point(to);
    }
    this.lastAt = at;
    return this.position(at);
  }
  batch() {
    if (this.flight || !this.authority || !this.pending.length) return null;
    const path = [[this.authority.x, this.authority.y]];
    let seconds = 0, through = 0, motionSequence = 0;
    for (const row of this.pending) {
      if (seconds + row.seconds > 0.350001 || path.length >= 64) break;
      path.push([row.to.x, row.to.y]);
      seconds += row.seconds;
      through = row.id;
      motionSequence = row.motionSequence;
    }
    if (!through) return null;
    const [x, y] = path.at(-1);
    return { through, motionSequence, seconds, target: { x, y }, payload: { action: "move", x, y, area: this.authority.area, path, basePositionRevision: this.authority.revision } };
  }
  sent(sequence, batch) {
    if (this.flight || !Number.isSafeInteger(sequence) || !batch) throw Error("prediction_flight");
    this.flight = { sequence, ...batch };
  }
  notQueued(sequence) {
    if (this.flight?.sequence === sequence) this.flight = null;
  }
  acknowledge(sequence, status, data, at) {
    const flight = this.flight;
    if (!flight || flight.sequence !== sequence) return false;
    this.flight = null;
    if (status >= 400 || data?.ok === false || !finitePoint(data) || !Number.isSafeInteger(revision(data))) {
      this.snap(finitePoint(data) && Number.isSafeInteger(revision(data)) ? data : this.authority, at);
      return true;
    }
    const shown = this.position(at);
    this.pending = this.pending.filter((row) => row.id > flight.through);
    this.authority = { ...point(data), area: data.area ?? this.authority.area, revision: revision(data) };
    let p = point(data);
    for (const row of this.pending) {
      row.from = point(p);
      p = row.integrate(p, row.seconds);
      if (!finitePoint(p)) throw Error("invalid_replayed_point");
      row.to = point(p);
      row.motionSequence = ++this.motionSerial;
    }
    this.predicted = point(p);
    const error = distance(shown, p), relocated = data.area && data.area !== flight.payload.area;
    if (relocated || error > 12) {
      this.offset = { x: 0, y: 0 };
      if (relocated) this.snap(data, at);
    } else this.offset = { x: shown.x - p.x, y: shown.y - p.y };
    this.correctedAt = at;
    return true;
  }
  cancel(at) {
    this.snap(this.authority, at);
  }
};
var BufferedInterpolation = class {
  constructor({ delay = 100 } = {}) {
    this.delay = delay;
    this.rows = /* @__PURE__ */ new Map();
    this.scope = null;
    this.ownId = null;
  }
  accept(world, at) {
    const scope2 = JSON.stringify([world.world?.cycle, world.channel, world.area, world.arenaMatch?.id]);
    if (scope2 !== this.scope) {
      this.clear();
      this.scope = scope2;
    }
    const keep = /* @__PURE__ */ new Set();
    for (const type of ["players", "monsters"]) for (const row of world[type] ?? []) {
      if (type === "players" && row.id === this.ownId) continue;
      if (!finitePoint(row)) continue;
      const key = type + ":" + row.id, epoch2 = JSON.stringify([row.area, row.spawn_round ?? 0, row.respawn_at_ms ?? 0]), old = this.rows.get(key);
      keep.add(key);
      if (!old || old.epoch !== epoch2 || distance(old.samples.at(-1), row) > 420) {
        this.rows.set(key, { epoch: epoch2, samples: [{ ...point(row), at }], intervals: [], cursor: at, displayedAt: at });
        continue;
      }
      const samples = old.samples;
      if (at <= samples.at(-1).at) continue;
      if (distance(samples.at(-1), row) < 1e-7) continue;
      const interval = at - samples.at(-1).at;
      if (interval > 500) {
        old.intervals = [];
        old.cursor = at - this.delay;
        old.displayedAt = at;
        old.samples = [{ ...point(samples.at(-1)), at: old.cursor }, { ...point(row), at }];
        continue;
      }
      old.intervals.push(interval);
      if (old.intervals.length > 6) old.intervals.shift();
      samples.push({ ...point(row), at });
      while (samples.length > 2 && samples[1].at < Math.min(old.cursor, at - this.delay - 300)) samples.shift();
      if (samples.length > 128) samples.splice(0, samples.length - 128);
    }
    for (const key of this.rows.keys()) if (!keep.has(key)) this.rows.delete(key);
  }
  position(type, row, at) {
    const state = this.rows.get(type + ":" + row.id), samples = state?.samples;
    if (!samples?.length) return point(row);
    const delay = Math.max(this.delay, Math.min(300, Math.max(0, ...state.intervals)));
    const desired = Math.min(at - delay, samples.at(-1).at), elapsed = Math.max(0, at - state.displayedAt);
    const target = state.cursor = Math.max(state.cursor, Math.min(desired, state.cursor + elapsed * 1.1));
    state.displayedAt = at;
    if (target <= samples[0].at) return point(samples[0]);
    for (let i = 1; i < samples.length; i++) if (samples[i].at >= target) {
      const a = samples[i - 1], b = samples[i], t = (target - a.at) / (b.at - a.at);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    return point(samples.at(-1));
  }
  clear() {
    this.rows.clear();
    this.scope = null;
  }
};

// r34-work/working/core511-source/scripts/core511/generated/movement-presentation-rules.mjs
function bufferedMotionPosition(buffer, now) {
  if (!buffer?.samples.length) return null;
  const samples = buffer.samples, last = samples.at(-1);
  if (now - last.receivedAt > 600) return null;
  if (buffer.pendingCanonical && now >= buffer.pendingCanonical.expiresAt)
    return { x: buffer.pendingCanonical.x, y: buffer.pendingCanonical.y };
  const desired = now - buffer.offset - (buffer.playbackDelay ?? 80);
  if (buffer.playback === void 0) buffer.playback = Math.min(last.serverAt, desired);
  else if (now > (buffer.playbackAt ?? now)) {
    const elapsed = Math.min(250, now - buffer.playbackAt), normal = buffer.playback + elapsed;
    const correction = Math.max(-elapsed * 0.1, Math.min(elapsed * 0.05, desired - normal));
    buffer.playback = Math.min(last.serverAt, Math.max(buffer.playback, normal + correction));
  }
  buffer.playbackAt = Math.max(buffer.playbackAt ?? now, now);
  const playback = buffer.playback;
  for (let i = 1; i < samples.length; i++) {
    const b = samples[i], a = samples[i - 1];
    if (b.serverAt >= playback) {
      const t = Math.max(0, Math.min(1, (playback - a.serverAt) / Math.max(1, b.serverAt - a.serverAt)));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return { x: last.x, y: last.y };
}
function reconcileMotionBuffer(buffer, checkpoint2, retiredStreams = [], now) {
  if (!buffer?.samples.length) return void 0;
  const last = buffer.samples.at(-1);
  const stream = checkpoint2.motionStreamId, sequence = checkpoint2.motionSequence;
  if (typeof stream !== "string" || !/^[A-Za-z0-9-]{16,80}$/.test(stream) || !Number.isSafeInteger(sequence) || Number(sequence) < 1) return buffer;
  if (stream !== buffer.streamId && retiredStreams.includes(stream)) return buffer;
  if (stream !== buffer.streamId || !Number.isSafeInteger(last.sequence)) return void 0;
  if (Number(sequence) < last.sequence) return buffer;
  if (sequence === last.sequence && Math.hypot(checkpoint2.x - last.x, checkpoint2.y - last.y) < 0.01) return buffer;
  if (Number(sequence) > last.sequence && Number.isFinite(now) && now - last.receivedAt <= 600) {
    buffer.pendingCanonical = {
      sequence: Number(sequence),
      x: checkpoint2.x,
      y: checkpoint2.y,
      expiresAt: Math.min(buffer.pendingCanonical?.expiresAt ?? Infinity, now + 150)
    };
    return buffer;
  }
  return void 0;
}
var MOTION_PROTOCOL = "validated-motion-v1";
function readMotionPreview(message, previous, now) {
  const x = Number(message.x), y = Number(message.y), sequence = Number(message.sequence), serverAt = Number(message.serverAt);
  const streamId = typeof message.streamId === "string" ? message.streamId : "";
  const hpRevision = Number(message.hpRevision);
  if (message.protocol !== MOTION_PROTOCOL || !/^[A-Za-z0-9-]{16,80}$/.test(streamId) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(serverAt) || !Number.isSafeInteger(sequence) || sequence < 1 || !Number.isSafeInteger(hpRevision) || hpRevision < 0) return null;
  if (previous && (sequence <= (previous.checkpointFloors?.[streamId] ?? 0) || previous.retiredStreams?.includes(streamId) || (previous.streamId === streamId ? sequence <= previous.sequence : serverAt <= previous.serverAt))) return null;
  const retiredStreams = previous && previous.streamId !== streamId ? [...previous.retiredStreams ?? [], previous.streamId].slice(-8) : previous?.retiredStreams;
  const presentationAt = typeof message.presentationAt === "number" && Number.isFinite(message.presentationAt) && message.presentationAt >= serverAt - 1e3 && message.presentationAt <= serverAt + 250 ? message.presentationAt : void 0;
  return {
    x,
    y,
    sequence,
    streamId,
    serverAt,
    hpRevision,
    retiredStreams,
    ...presentationAt === void 0 ? {} : { presentationAt },
    checkpointFloors: previous?.checkpointFloors,
    expiresAt: now + 1500
  };
}
function advanceMotionCheckpoint(previous, message) {
  const streamId = message.motionStreamId;
  const sequence = message.motionSequence;
  if (typeof streamId !== "string" || !/^[A-Za-z0-9-]{16,80}$/.test(streamId) || !Number.isSafeInteger(sequence) || Number(sequence) < 1) return previous;
  const checked = { streamId, sequence: Number(sequence), serverAt: 0 };
  const checkpointFloors = {
    ...previous?.checkpointFloors,
    [checked.streamId]: Math.max(previous?.checkpointFloors?.[checked.streamId] ?? 0, checked.sequence)
  };
  const keys = Object.keys(checkpointFloors);
  for (const key of keys.slice(0, Math.max(0, keys.length - 16))) delete checkpointFloors[key];
  const current2 = previous ?? checked;
  const retiredStreams = previous && previous.streamId !== streamId && !previous.retiredStreams?.includes(streamId) ? [.../* @__PURE__ */ new Set([...previous.retiredStreams ?? [], previous.streamId])].slice(-8) : previous?.retiredStreams;
  return {
    ...current2,
    checkpointFloors,
    retiredStreams,
    sequence: current2.streamId === checked.streamId ? Math.max(current2.sequence, checked.sequence) : current2.sequence
  };
}
function updateRemoteMotionTarget(motion, x, y, now) {
  const seconds = Math.max(0.035, Math.min(0.8, (now - motion.sampleAt) / 1e3));
  const dx = x - motion.targetX;
  const dy = y - motion.targetY;
  let vx = dx / seconds;
  let vy = dy / seconds;
  const speed = Math.hypot(vx, vy);
  if (speed > 285) {
    vx *= 285 / speed;
    vy *= 285 / speed;
  }
  const stopped = Math.hypot(dx, dy) < 0.01;
  motion.vx = stopped ? 0 : motion.vx * 0.2 + vx * 0.8;
  motion.vy = stopped ? 0 : motion.vy * 0.2 + vy * 0.8;
  motion.targetX = x;
  motion.targetY = y;
  motion.sampleAt = now;
}
function advanceRemoteMotion(motion, dt, livePreview = false, buffered = false) {
  const elapsed = Math.max(0, dt);
  const distance2 = Math.hypot(motion.targetX - motion.x, motion.targetY - motion.y);
  const maxSpeed = 600, response2 = livePreview ? 60 : 32, threshold = maxSpeed / response2;
  const linearSeconds = Math.max(0, (distance2 - threshold) / maxSpeed);
  const remaining = buffered ? Math.max(0, distance2 - maxSpeed * elapsed) : elapsed <= linearSeconds ? Math.max(0, distance2 - maxSpeed * elapsed) : Math.min(distance2, threshold) * Math.exp(-(elapsed - linearSeconds) * response2);
  const follow = distance2 > 0 ? 1 - remaining / distance2 : 0;
  const oldX = motion.x;
  const oldY = motion.y;
  motion.x += (motion.targetX - motion.x) * follow;
  motion.y += (motion.targetY - motion.y) * follow;
  if (Math.hypot(motion.targetX - motion.x, motion.targetY - motion.y) < 0.05) {
    motion.x = motion.targetX;
    motion.y = motion.targetY;
  }
  const traveled = Math.hypot(motion.x - oldX, motion.y - oldY);
  motion.travel += traveled;
  return traveled;
}

// r34-work/working/core511-source/scripts/core511/remote-movement.mjs
var point2 = (row) => ({ x: row.x, y: row.y });
var finite = (row) => row && Number.isFinite(row.x) && Number.isFinite(row.y);
var revision2 = (row) => Number(row?.positionRevision ?? row?.position_revision ?? -1);
var checkpoint = (row) => ({ x: row.x, y: row.y, motionStreamId: row.motion_stream_id ?? row.motionStreamId, motionSequence: row.motion_sequence ?? row.motionSequence });
var scope = (world) => JSON.stringify([world?.world?.cycle, world?.channel, world?.area, world?.arenaMatch?.id ?? ""]);
var epoch = (row) => JSON.stringify([row.area, row.respawn_at_ms ?? 0, row.hp <= 0]);
function appendMotionSample(buffer, sample) {
  const fresh = () => ({ samples: [sample], offset: sample.receivedAt - sample.serverAt, streamId: sample.streamId, sourceClock: !!sample.sourceClock });
  if (!buffer || buffer.streamId !== sample.streamId || !!buffer.sourceClock !== !!sample.sourceClock || buffer.pendingCanonical && sample.receivedAt >= buffer.pendingCanonical.expiresAt) return fresh();
  const last = buffer.samples.at(-1);
  if (sample.serverAt < last.serverAt) return buffer;
  const gap = sample.receivedAt - last.receivedAt, sourceGap = sample.serverAt - last.serverAt;
  if (gap > 500 || sourceGap > 500) return fresh();
  if (buffer.pendingCanonical && (sample.sequence ?? 0) > buffer.pendingCanonical.sequence) delete buffer.pendingCanonical;
  buffer.offset = Math.min(buffer.offset, sample.receivedAt - sample.serverAt);
  if (sourceGap === 0) buffer.samples[buffer.samples.length - 1] = sample;
  else buffer.samples.push(sample);
  if (buffer.samples.length > 24) buffer.samples.splice(0, buffer.samples.length - 24);
  const gaps = buffer.gaps ??= [];
  if (gap > 0) gaps.push(Math.max(gap, sourceGap));
  if (gaps.length > 8) gaps.shift();
  const jitter = buffer.samples.reduce((max, s) => Math.max(max, s.receivedAt - s.serverAt - buffer.offset), 0);
  buffer.playbackDelay = Math.max(80, Math.min(350, Math.max(jitter + 60, Math.max(0, ...gaps) + 10)));
  return buffer;
}
var RemoteMovement = class {
  constructor() {
    this.rows = /* @__PURE__ */ new Map();
    this.scope = null;
    this.world = null;
    this.ownId = null;
  }
  clear() {
    this.rows.clear();
    this.scope = null;
    this.world = null;
  }
  fresh(row, at) {
    return {
      row,
      revision: revision2(row),
      epoch: epoch(row),
      relocationFloor: -1,
      lastAt: at,
      resumeAfterGap: false,
      authorityBuffer: appendMotionSample(void 0, { ...point2(row), serverAt: at, receivedAt: at, streamId: "authority", sequence: revision2(row) }),
      motion: { ...point2(row), targetX: row.x, targetY: row.y, vx: 0, vy: 0, sampleAt: at, area: row.area, travel: 0 }
    };
  }
  reset(state, row, at) {
    const fresh = this.fresh(row, at);
    fresh.relocationFloor = revision2(row);
    Object.assign(state, fresh, { preview: null, buffer: void 0, watermark: void 0 });
  }
  canonical(state, row, at, { relocated = false } = {}) {
    const rev = revision2(row);
    if (rev < state.revision) return;
    const nextEpoch = epoch(row), c = checkpoint(row), previous = checkpoint(state.row), hasStamp = typeof c.motionStreamId === "string" && c.motionStreamId.length >= 16 && Number.isSafeInteger(c.motionSequence) && c.motionSequence > 0;
    const stampedMove = hasStamp && (c.motionStreamId !== previous.motionStreamId || c.motionSequence > Number(previous.motionSequence ?? 0));
    const retainedStamp = hasStamp && c.motionStreamId === previous.motionStreamId && c.motionSequence <= Number(previous.motionSequence ?? 0);
    if (relocated || nextEpoch !== state.epoch || Math.hypot(row.x - state.row.x, row.y - state.row.y) > 420 || rev > state.revision && (retainedStamp || state.preview && !stampedMove)) {
      this.reset(state, row, at);
      return;
    }
    if (rev > state.revision) {
      state.authorityBuffer = appendMotionSample(state.authorityBuffer, { ...point2(row), serverAt: at, receivedAt: at, streamId: "authority", sequence: rev });
      state.watermark = advanceMotionCheckpoint(state.watermark, c);
      state.buffer = reconcileMotionBuffer(state.buffer, c, state.watermark?.retiredStreams, at);
      if (!state.buffer) state.preview = null;
      state.revision = rev;
    }
    state.row = row;
    state.epoch = nextEpoch;
  }
  accept(world, at) {
    const next = scope(world);
    if (next !== this.scope) {
      this.clear();
      this.scope = next;
    }
    this.world = world;
    const keep = /* @__PURE__ */ new Set();
    for (const row of world.players ?? []) {
      if (row.id === this.ownId || !finite(row)) continue;
      keep.add(row.id);
      const state = this.rows.get(row.id);
      if (state) {
        this.canonical(state, row, at);
        const preview = state.preview, c = checkpoint(state.row);
        if (preview && revision2(row) >= state.revision && Number(world.snapshotAtMs) >= preview.serverAt + 650 && (c.motionStreamId !== preview.streamId || Number(c.motionSequence) < preview.sequence)) state.preview = null, state.buffer = void 0;
      } else this.rows.set(row.id, this.fresh(row, at));
    }
    for (const id of this.rows.keys()) if (!keep.has(id)) this.rows.delete(id);
  }
  inScope(event) {
    const w = this.world;
    return w && event.cycle === w.world?.cycle && event.channel === w.channel && event.area === w.area && (event.arenaMatchId ?? "") === (w.arenaMatch?.id ?? "");
  }
  acceptMotions(events, at) {
    if (!Array.isArray(events) || events.length > 128) return;
    for (const event of events) {
      if (event?.type !== "motion_preview" || !this.inScope(event) || event.playerId === this.ownId) continue;
      const state = this.rows.get(event.playerId);
      if (!state || state.row.hp <= 0 || !Number.isSafeInteger(event.positionRevision) || event.positionRevision < state.relocationFloor) continue;
      const preview = readMotionPreview(event, state.watermark, at);
      if (!preview || preview.hpRevision < Number(state.row.hp_revision ?? 0)) continue;
      state.preview = preview;
      state.watermark = preview;
      const sample = { x: preview.x, y: preview.y, serverAt: preview.presentationAt ?? preview.serverAt, sourceClock: preview.presentationAt !== void 0, receivedAt: at, streamId: preview.streamId, sequence: preview.sequence }, last = state.buffer?.samples.at(-1);
      if (last && sample.streamId === last.streamId && (at - last.receivedAt > 500 || sample.sourceClock && last.sourceClock && sample.serverAt - last.serverAt > 500 && at - last.receivedAt >= 0)) state.buffer = void 0, state.resumeAfterGap = true;
      state.buffer = appendMotionSample(state.buffer, sample);
    }
  }
  control(event, at) {
    if (event?.type !== "guardian_control" || !this.world || event.area !== this.world.area || event.channel !== this.world.channel) return;
    for (const [id, row] of [[event.actorId, event.moved], ...event.targetKind === "player" ? [[event.targetId, event.controlled]] : []]) {
      const state = this.rows.get(id);
      if (!state || !finite(row) || !Number.isSafeInteger(revision2(row)) || revision2(row) < state.revision || Number(row.hp_revision) < Number(state.row.hp_revision ?? 0)) continue;
      this.canonical(state, { ...state.row, ...row }, at, { relocated: true });
    }
  }
  position(type, row, at) {
    if (type !== "players" || !finite(row)) return point2(row);
    const state = this.rows.get(row.id);
    if (!state) return point2(row);
    if (revision2(row) > state.revision || row.hp <= 0 && state.row.hp > 0) this.canonical(state, row, at);
    if (state.resumeAfterGap) {
      const last = state.buffer?.samples.at(-1), pending = state.buffer?.pendingCanonical;
      state.buffer = last ? appendMotionSample(void 0, last) : void 0;
      if (state.buffer && pending) state.buffer.pendingCanonical = pending;
      state.resumeAfterGap = false;
    }
    if (state.buffer?.pendingCanonical && at >= state.buffer.pendingCanonical.expiresAt) {
      state.buffer = void 0;
      state.preview = null;
      state.authorityBuffer = appendMotionSample(void 0, { ...point2(state.row), serverAt: at, receivedAt: at, streamId: "authority", sequence: state.revision });
    }
    const buffered = state.row.hp > 0 ? bufferedMotionPosition(state.buffer, at) : null;
    const live = buffered ?? state.preview;
    const fallback = !live && state.authorityBuffer?.samples.length > 1 ? bufferedMotionPosition(state.authorityBuffer, at) : null;
    const target = live ?? fallback ?? state.row, m = state.motion;
    if (m.targetX !== target.x || m.targetY !== target.y) updateRemoteMotionTarget(m, target.x, target.y, at);
    const elapsed = Math.max(0, Math.min(0.1, (at - state.lastAt) / 1e3));
    state.lastAt = Math.max(state.lastAt, at);
    advanceRemoteMotion(m, elapsed, !!live, !!buffered || !!fallback);
    return point2(m);
  }
};

// r34-work/working/core511-source/scripts/core511/client-transport.mjs
var CLIENT_PROTOCOL = "coreoflife-kernel-v1";
var QUEUED_MOVEMENT = "queued-movement-v1";
var ORDERED_MOVEMENT = "ordered-movement-v2";
var MOTION = "validated-motion-v1";
var mayPipelineMovement = (payload) => payload?.action === "attack" && Number(payload.ability ?? 0) === 0 || ["claim_rewards", "collect"].includes(payload?.action);
var hot = /* @__PURE__ */ new Set([...NATIVE_ACTIONS, "move", "attack", "pvp_attack", "cast_support456", "heartbeat", "afk_answer", "afk_recover"]);
var response = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
var failure = (code, status = 503) => Object.assign(Error(code), { code, status });
var Core511Transport = class {
  constructor({ fetch, WebSocket, origin, headers, now = () => performance.now(), notify = () => {
  } }) {
    Object.assign(this, { fetch, WebSocket, origin, headers, now, notify });
    this.entrySelected = false;
    this.listeners = /* @__PURE__ */ new Set();
    this.interpolation = new RemoteMovementR43();
    this.motionStreamId = null;
    this.motionLast = null;
    this.motionStopped = true;
    this.prediction = new OwnPrediction();
    this.queue = [];
    this.active = null;
    this.ws = null;
    this.epoch = null;
    this.lastAccepted = 0;
    this.connection = 0;
    this.world = null;
    this.dungeon = null;
    this.cursor = null;
    this.seen = /* @__PURE__ */ new Set();
    this.ackIds = /* @__PURE__ */ new Set();
    this.ackPending = null;
    this.disposed = false;
    this.halted = false;
    this.haltFailure = null;
    this.retry = 0;
    this.movementBehind = null;
    this.queuedMovement = false;
    this.orderedMovement = false;
  }
  emit(kind, value) {
    if (this.disposed) return;
    if (kind === "event") this.receiveMovementEvent(value);
    this.notify(kind, value);
    for (const f of this.listeners) f(kind, value);
  }
  // Viewport metadata only; normal movement, ACKs and prediction are untouched.
  motionViewport({ area, width, height }) {
    if (!this.ready || !this.motionStreamId || this.ws?.readyState !== 1 || this.world?.area !== area || ![width, height].every((n) => Number.isFinite(n) && n > 0 && n <= 1e6)) return false;
    const old = this.sentViewport, streamId = this.motionStreamId;
    if (old?.streamId === streamId && old.area === area && old.width >= width && old.height >= height) return false;
    const value = { type: "motion_viewport", streamId, area, width: Math.max(old?.streamId === streamId ? old.width : 0, width), height: Math.max(old?.streamId === streamId ? old.height : 0, height) };
    this.ws.send(JSON.stringify(value));
    this.sentViewport = value;
    return true;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    if (this.world) listener("world", this.view());
    if (this.dungeon) listener("dungeon", this.dungeon);
    listener("status", this.ready ? "online" : "connecting");
    return () => this.listeners.delete(listener);
  }
  view() {
    return this.world ? { ...this.world, worldPush: { enabled: false, revision: 0 } } : null;
  }
  // Preserve the server's actual session decision. A bot challenge is not an
  // expired game instance and must remain visible until verification succeeds.
  assertAvailable() {
    if (this.disposed) throw failure("transport_disposed", 503);
    if (this.halted) {
      const saved = this.haltFailure;
      if (saved) throw Object.assign(failure(saved.code, saved.status), { body: structuredClone(saved.body) });
      throw failure("session_unavailable", 503);
    }
  }
  async endpoint(name, body = {}) {
    if (this.disposed) throw failure("transport_disposed", 503);
    const r = await this.fetch(this.origin + "/api/realtime/core511-" + name, { method: "POST", credentials: "same-origin", headers: this.headers(), body: JSON.stringify({ ...body, protocol: CLIENT_PROTOCOL }) }), value = await r.json();
    if (this.disposed) throw failure("transport_disposed", 503);
    if (!r.ok) {
      const error = Object.assign(failure(value.code ?? "core511_unavailable", r.status), { body: value });
      if (r.status === 401 || value.code === "game_instance_expired" || value.code === "bot_check_required") {
        this.halted = true;
        this.blockedReason = value.code;
        this.haltFailure = { code: error.code, status: error.status, body: structuredClone(value) };
        this.rejectActive("command_outcome_unknown");
        this.rejectQueue("session_unavailable");
        this.ws?.close(1e3, "Session unavailable");
      }
      this.emit("error", { status: r.status, ...value });
      throw error;
    }
    if (value.protocol !== CLIENT_PROTOCOL || ![1, 2, 3, 4].includes(value.channel) || !/^\/game\/channel\/[1-4]$/.test(value.url) || value.url !== "/game/channel/" + value.channel) throw failure("core511_protocol_required", 428);
    return value;
  }
  async ensure(replacementInternal = false) {
    if (!replacementInternal) while (this.replacing) await this.replacing;
    this.assertAvailable();
    if (this.ready) return;
    if (this.connecting) return this.connecting;
    const task = (async () => this.open(await this.endpoint("ticket")))();
    this.connecting = task;
    try {
      await task;
    } finally {
      if (this.connecting === task) this.connecting = null;
    }
  }
  async open(ticket) {
    this.assertAvailable();
    this.resetMovement();
    this.motionStreamId = null;
    this.queuedMovement = false;
    this.orderedMovement = false;
    for (const row of this.pendingInputs()) clearTimeout(row.retryTimer);
    clearTimeout(this.reconnectTimer);
    if (readReconnectOptionsR40().reconnectRecovery) this.reconnectTimer = null;
    const generation = ++this.connection, old = this.ws;
    this.ready = false;
    this.cursor = null;
    this.world = null;
    this.dungeon = null;
    this.afkCheck = void 0;
    this.interpolation.clear();
    this.ackIds.clear();
    this.ackPending = null;
    const url = new URL(ticket.url, this.origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new this.WebSocket(url.href);
    this.ws = socket;
    this.playerId = ticket.playerId ?? this.playerId;
    old?.close(1e3, "Connection replaced");
    return new Promise((resolve, reject) => {
      let completed = false;
      const timer = setTimeout(() => {
        reject(failure("connection_timeout"));
        socket.close();
      }, 1e4), current2 = () => !this.disposed && this.connection === generation && this.ws === socket;
      socket.addEventListener("open", () => {
        if (current2()) socket.send(JSON.stringify({ type: "auth", ticket: ticket.ticket, capabilities: [QUEUED_MOVEMENT, ORDERED_MOVEMENT, MOTION] }));
        else socket.close();
      });
      socket.addEventListener("message", (event) => {
        if (!current2()) return;
        try {
          const p = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
          if (p.type === "ready") {
            if (p.protocol !== CLIENT_PROTOCOL || p.channel !== ticket.channel || p.epoch !== ticket.epoch || !Number.isSafeInteger(p.lastAccepted) || !Number.isSafeInteger(p.lastApplied)) throw failure("ready_protocol");
            if (this.epoch !== null && this.epoch !== p.epoch) {
              this.rejectActive("command_outcome_unknown");
              this.rejectQueue("owner_changed");
            }
            this.epoch = p.epoch;
            this.lastAccepted = p.lastAccepted;
            this.queuedMovement = Array.isArray(p.capabilities) && p.capabilities.includes(QUEUED_MOVEMENT);
            this.orderedMovement = this.queuedMovement && p.capabilities.includes(ORDERED_MOVEMENT);
            this.motionStreamId = p.capabilities?.includes(MOTION) && typeof p.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(p.motionStreamId) ? p.motionStreamId : null;
            this.ready = true;
            this.retry = 0;
            clearTimeout(timer);
            completed = true;
            resolve();
            for (const result of p.results ?? []) this.result(result, false);
            for (const row of this.pendingInputs()) {
              if (row.sequence <= p.lastApplied) this.rejectInput(row, "command_outcome_unknown");
              else if (row.sequence > p.lastAccepted && row.movement) this.rejectInput(row, "movement_cancelled");
              else if (row.sequence > p.lastAccepted && row.dependsOn > p.lastAccepted) this.requeueUnaccepted(row);
              else {
                row.queued = row.sequence <= p.lastAccepted;
                if (!row.queued) delete row.dependsOn;
              }
            }
            for (const row of this.pendingInputs()) if (!row.movement && row.sequence > p.lastAccepted) this.sendInput(row);
            this.emit("status", "online");
            this.pump();
            return;
          }
          if (!this.ready) return;
          if (p.type === "queued") {
            if (!this.queuedMovement || p.protocol !== CLIENT_PROTOCOL || p.epoch !== this.epoch || p.accepted !== true || p.durable !== false || !Number.isSafeInteger(p.sequence)) throw failure("queued_protocol");
            const row = this.pendingInput(p.sequence);
            if (!row) return;
            if (p.kind !== (row.movement ? "movement" : "combat")) throw failure("queued_kind");
            row.queued = true;
            clearTimeout(row.retryTimer);
            if (row.dependentNotQueued) {
              row.pipelineUsed = false;
              delete row.dependentNotQueued;
            }
            this.pump();
          } else if (p.type === "not_queued") {
            if (!this.orderedMovement || p.protocol !== CLIENT_PROTOCOL || p.epoch !== this.epoch || p.durable !== false || p.code !== "dependency_not_queued") throw failure("dependency_protocol");
            const row = this.pendingInput(p.sequence);
            if (!row) return;
            if (row.dependsOn !== p.dependsOn || row.queued) throw failure("dependency_identity");
            const parent = this.pendingInput(p.dependsOn);
            if (parent) parent.dependentNotQueued = true;
            if (row.movement) {
              this.removeInput(row);
              this.prediction.notQueued(row.sequence);
            } else this.requeueUnaccepted(row);
            this.pump();
          } else if (p.type === "frame") {
            if (p.protocol !== CLIENT_PROTOCOL) throw failure("frame_protocol");
            for (const r of p.results ?? []) this.predictionResult(r);
            if (this.world) this.interpolation.acceptMotions(p.motions, this.now());
            if (Object.hasOwn(p, "afkCheck")) this.receiveAfkCheck(p.afkCheck, !p.world);
            if (p.world) this.receiveWorld(p.world);
            if (p.dungeon) {
              this.dungeon = p.dungeon;
              this.emit("dungeon", p.dungeon);
            }
            if (p.adventure) {
              if (this.world) this.world = { ...this.world, adventure511: p.adventure };
              this.emit("adventure", p.adventure);
              this.emit("world", this.view());
            }
            for (const e of p.events ?? []) this.emit("event", e);
            for (const result of p.results ?? []) this.result(result, false);
            this.pump();
          } else if (p.type === "event") {
            if (typeof p.id !== "string" || !/^[a-f0-9]{64}$/.test(p.id)) throw failure("event_identity");
            if (!this.seen.has(p.id)) {
              this.seen.add(p.id);
              if (this.seen.size > 2048) this.seen.delete(this.seen.values().next().value);
              if (p.payload?.event) this.emit("event", p.payload.event);
            }
            if (!this.ackPending?.includes(p.id)) this.ackIds.add(p.id);
            this.acknowledge();
          } else if (p.type === "event_acked") {
            if (this.ackPending && JSON.stringify(p.ids) === JSON.stringify(this.ackPending)) {
              this.ackPending = null;
              this.acknowledge();
            }
          } else if (p.type === "gm_visibility") this.emit("event", p);
          else if (p.type === "retry") {
            this.retryInput(p);
          } else if (p.type === "rejected") {
            const row = this.pendingInput(p.sequence);
            if (!row) return;
            this.prediction.acknowledge(row.sequence, 429, {}, this.now());
            this.removeInput(row);
            row.resolve({ status: 429, body: { code: p.code, error: "\u0130stek s\u0131n\u0131r\u0131; biraz bekle.", retryAfter: p.retryAfter }, headers: { "retry-after": String(p.retryAfter ?? 1) } });
            this.pump();
          }
        } catch (error) {
          this.emit("error", { code: error.code ?? "invalid_server_message" });
          socket.close(1002, "Protocol mismatch");
        }
      });
      socket.addEventListener("error", () => socket.close());
      socket.addEventListener("close", () => {
        clearTimeout(timer);
        if (!completed) reject(failure("connection_closed"));
        if (!current2()) return;
        this.ready = false;
        this.resetMovement();
        this.ackPending = null;
        this.emit("status", "connecting");
        this.scheduleReconnect();
      });
    });
  }
  // Verification is independent of world deltas and never changes movement or input ordering.
  receiveAfkCheck(value, publish = true) {
    this.afkCheck = value;
    if (this.world) {
      this.world = { ...this.world, afkCheck: value };
      if (publish) this.emit("world", this.view());
    }
  }
  scheduleReconnect() {
    if (this.disposed || this.halted || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensure().catch(() => this.scheduleReconnect());
    }, Math.min(4e3, 250 * 2 ** this.retry++));
  }
  receiveWorld(packet) {
    const oldAdventure = this.world?.adventure511, before = this.world && JSON.stringify([this.world.world?.cycle, this.world.channel, this.world.area, this.world.arenaMatch?.id]);
    if (packet.type === "world_snapshot") {
      const c = packet.data?.worldPush;
      if (c?.protocol !== "world-delta-v1" || !Number.isSafeInteger(c.seq)) throw failure("snapshot_protocol");
      this.cursor = { epoch: c.epoch, room: c.room, seq: c.seq };
      this.world = packet.data;
    } else if (packet.type === "world_delta") {
      const c = this.cursor;
      if (c && packet.epoch === c.epoch && packet.room === c.room && packet.seq <= c.seq) return;
      if (!c || packet.protocol !== "world-delta-v1" || packet.epoch !== c.epoch || packet.room !== c.room || packet.seq !== c.seq + 1) throw failure("world_sequence_gap");
      this.world = applyWorldDelta(this.world, packet);
      c.seq = packet.seq;
    } else if (packet.type === "world_reset") {
      this.resetMovement();
      this.ws?.close(1012, "World changed");
      return;
    } else throw failure("world_packet");
    const after = JSON.stringify([this.world.world?.cycle, this.world.channel, this.world.area, this.world.arenaMatch?.id]);
    if (before !== after) this.resetMovement();
    else if (oldAdventure) this.world = { ...this.world, adventure511: oldAdventure };
    this.interpolation.ownId = this.playerId;
    this.interpolation.accept(this.world, this.now());
    const own = this.world.players?.find((p) => p.id === this.playerId);
    if (own) this.prediction.bind(own, this.movementScope(own), this.now());
    if (this.afkCheck !== void 0) this.world = { ...this.world, afkCheck: this.afkCheck };
    this.emit("world", this.view());
  }
  acknowledge() {
    if (!this.ready || this.ws?.readyState !== 1 || this.ackPending || !this.ackIds.size) return;
    this.ackPending = [...this.ackIds].slice(0, 64);
    for (const id of this.ackPending) this.ackIds.delete(id);
    this.ws.send(JSON.stringify({ type: "event_ack", ids: this.ackPending }));
  }
  // movementBehind is the single secondary slot; v2 also permits eligible
  // combat behind movement. It never permits a third outstanding input.
  pendingInputs() {
    return [this.active, this.movementBehind].filter(Boolean);
  }
  pendingInput(sequence) {
    return this.active?.sequence === sequence ? this.active : this.movementBehind?.sequence === sequence ? this.movementBehind : null;
  }
  removeInput(row) {
    clearTimeout(row.retryTimer);
    if (row === this.active) {
      this.active = this.movementBehind;
      this.movementBehind = null;
    } else if (row === this.movementBehind) this.movementBehind = null;
  }
  result(result, scheduleNext = true) {
    this.predictionResult(result);
    const row = this.pendingInput(result.sequence);
    if (!row) return;
    this.lastAccepted = Math.max(this.lastAccepted, result.sequence);
    this.removeInput(row);
    const { type, sequence, status, body, headers, ...value } = result;
    const payload = body ?? value;
    if (payload?.afkCheck) this.receiveAfkCheck(payload.afkCheck);
    row.resolve({ status: status ?? (payload.ok === false ? 409 : 200), body: payload, headers });
    if (scheduleNext) this.pump();
  }
  requeueUnaccepted(row) {
    this.removeInput(row);
    delete row.sequence;
    delete row.dependsOn;
    delete row.queued;
    delete row.pipelineUsed;
    this.queue.unshift(row);
  }
  rejectInput(row, code) {
    this.removeInput(row);
    row.reject(failure(code, 409));
  }
  rejectActive(code) {
    this.prediction.cancel(this.now());
    for (const row of this.pendingInputs()) this.rejectInput(row, code);
    clearTimeout(this.inputTimer);
  }
  rejectQueue(code) {
    for (const row of this.queue.splice(0)) row.reject(failure(code, 409));
  }
  sendInput(row) {
    if (!row || row.queued || !this.ready || this.ws?.readyState !== 1) return;
    if (this.ws.bufferedAmount < 262144) this.ws.send(JSON.stringify({ type: "input", sequence: row.sequence, payload: row.payload, ...row.dependsOn !== void 0 ? { dependsOn: row.dependsOn } : {} }));
    else this.ws.close(1013, "Connection backlog");
  }
  sendActive() {
    this.sendInput(this.active);
  }
  retryInput(packet) {
    const row = this.pendingInput(packet.sequence);
    if (!row) return;
    clearTimeout(row.retryTimer);
    if (row.queued) return;
    delete row.dependsOn;
    if (row.movement) {
      const at = this.now();
      row.retrySince ??= at;
      row.retryCount = (row.retryCount ?? 0) + 1;
      if (this.movementSuspended || !this.prediction.flight || row.retryCount >= 10 || at - row.retrySince >= 2e3) {
        this.rejectInput(row, "movement_cancelled");
        this.pump();
      } else row.retryTimer = setTimeout(() => {
        if (this.pendingInput(row.sequence) !== row) return;
        if (this.movementSuspended || !this.prediction.flight) {
          this.rejectInput(row, "movement_cancelled");
          this.pump();
          return;
        }
        if (this.ready && this.ws?.readyState === 1) {
          this.lastMove = this.now();
          this.sendInput(row);
        }
      }, Math.max(0, 200 - (at - (this.lastMove ?? at))));
    } else row.retryTimer = setTimeout(() => {
      if (this.pendingInput(row.sequence) === row) this.sendInput(row);
    }, 50);
  }
  pump() {
    if (!this.ready) return;
    if (this.active) {
      if (this.orderedMovement && this.active.movement && (this.active.dependsOn === void 0 || this.active.queued) && !this.active.pipelineUsed && !this.movementBehind && mayPipelineMovement(this.queue[0]?.payload)) {
        const primary = this.active, row = this.queue.shift();
        row.sequence = primary.sequence + 1;
        if (!primary.queued) row.dependsOn = primary.sequence;
        primary.pipelineUsed = true;
        this.movementBehind = row;
        this.lastScheduledKind = "command";
        this.sendInput(row);
        return;
      }
      const batch2 = this.prediction.batch();
      if (batch2) this.sendMovement(batch2.payload, this.now(), batch2);
      return;
    }
    if (this.movementBehind || !this.queue.length) return;
    const at = this.now(), pair = this.orderedMovement && mayPipelineMovement(this.queue[0]?.payload), batch = this.lastScheduledKind === "movement" && !pair ? null : this.prediction.batch();
    if (batch && this.sendMovement(batch.payload, at, batch, true)) return;
    this.active = this.queue.shift();
    this.active.sequence = this.lastAccepted + 1;
    this.lastScheduledKind = "command";
    this.sendActive();
  }
  assertCommandScope() {
    if (this.replacing) throw Object.assign(failure("channel_transition_pending", 409), { body: { code: "channel_transition_pending", error: "Kanal de\u011Fi\u015Fimi s\xFCr\xFCyor. Tamamlan\u0131nca tekrar dene." } });
  }
  async command(payload) {
    this.assertCommandScope();
    await this.ensure();
    this.assertCommandScope();
    return this.enqueue(payload);
  }
  enqueue(payload) {
    this.assertAvailable();
    if (this.queue.length >= 32) throw failure("input_backpressure", 429);
    return new Promise((resolve, reject) => {
      this.queue.push({ payload: structuredClone(payload), resolve, reject });
      this.pump();
    });
  }
  async image(replacementInternal = false) {
    await this.ensure(replacementInternal);
    if (this.world) return this.view();
    return new Promise((resolve, reject) => {
      const off = this.subscribe((type, value) => {
        if (type === "world") {
          clearTimeout(timer);
          off();
          resolve(value);
        }
      }), timer = setTimeout(() => {
        off();
        reject(failure("snapshot_timeout"));
      }, 5e3);
    });
  }
  movementScope(own) {
    return JSON.stringify([own.id, this.epoch, this.world?.world?.cycle, this.world?.channel, own.area, own.respawn_at_ms, this.world?.arenaMatch?.id]);
  }
  predictionResult(result) {
    const row = this.pendingInput(result.sequence);
    if (!row?.movement) return;
    const payload = result.body ?? result.data ?? result;
    this.prediction.acknowledge(result.sequence, result.status ?? 200, payload.data ?? payload, this.now());
  }
  receiveMovementEvent(event) {
    const at = this.now();
    this.interpolation.control(event, at);
    if (event?.type !== "guardian_control" || event.area !== this.world?.area || event.channel !== this.world?.channel) return;
    const row = event.actorId === this.playerId ? event.moved : event.targetKind === "player" && event.targetId === this.playerId ? event.controlled : null;
    if (row && Number.isFinite(row.x) && Number.isFinite(row.y) && Number.isSafeInteger(row.position_revision) && row.position_revision > (this.prediction.authority?.revision ?? -1)) {
      this.prediction.snap({ ...row, area: event.area }, at);
      this.motionLast = null;
      this.motionStopped = true;
    }
  }
  previewMotion(own, at, stopped = false) {
    if (!this.motionStreamId || !this.ready || this.ws?.readyState !== 1 || this.disposed || this.halted || this.movementSuspended || own.hp <= 0 || !this.prediction.predicted) return false;
    const point3 = this.prediction.predicted, last = this.motionLast, due = last?.nextAt ?? at;
    const changed = !last || Math.hypot(point3.x - last.x, point3.y - last.y) > 1e-7, final = stopped && !this.motionStopped;
    if (!changed && !final || !final && last && at < due || stopped && !last) return false;
    const sentAt = (last?.sentAt ?? []).filter((time) => at - time < 1e3);
    if (sentAt.length >= (final ? 21 : 20)) return false;
    const endpoint = this.prediction.pending.at(-1);
    let sequence = endpoint?.motionSequence;
    if (final || !Number.isSafeInteger(sequence) || sequence <= (last?.sequence ?? 0)) {
      sequence = ++this.prediction.motionSerial;
      if (endpoint) endpoint.motionSequence = sequence;
    }
    if (this.ws.bufferedAmount >= 262144) return false;
    const world = this.world;
    this.ws.send(JSON.stringify({ type: "motion", protocol: MOTION, streamId: this.motionStreamId, sequence, x: point3.x, y: point3.y, hpRevision: Number(own.hp_revision ?? own.hpRevision ?? 0), basePositionRevision: this.prediction.authority.revision, clientAt: at, stopped: !!stopped, cycle: world?.world?.cycle, channel: world?.channel, area: own.area, arenaMatchId: world?.arenaMatch?.id ?? "" }));
    const nextAt = final ? Math.max(at + 50, due + 50) : at - due >= 50 ? at + 50 : due + 50;
    this.motionLast = { x: point3.x, y: point3.y, at, sequence, nextAt, sentAt: [...sentAt, at] };
    this.motionStopped = !!stopped;
    return true;
  }
  position(type, row, at = this.now()) {
    if (type === "players" && row.id === this.playerId) {
      this.prediction.bind(row, this.movementScope(row), at);
      return this.prediction.position(at) ?? { x: row.x, y: row.y };
    }
    return this.interpolation.position(type, row, at);
  }
  predictFrame({ own, seconds }, integrate) {
    const at = this.now();
    if (!own || !this.ready || this.disposed || this.halted || this.movementSuspended || at < (this.movementCooldownUntil ?? 0)) {
      this.prediction.cancel(at);
      return { x: own?.x ?? 0, y: own?.y ?? 0 };
    }
    this.prediction.bind(own, this.movementScope(own), at);
    const before = this.prediction.predicted && { ...this.prediction.predicted }, shown = this.prediction.advance(seconds, integrate, at);
    this.previewMotion(own, at, before && Math.hypot(this.prediction.predicted.x - before.x, this.prediction.predicted.y - before.y) < 1e-7);
    const batch = this.prediction.batch();
    if (batch && this.movementEligible(at)) this.sendMovement(batch.payload, at, batch);
    return shown;
  }
  suspendPrediction() {
    const at = this.now(), own = this.world?.players.find((p) => p.id === this.playerId);
    this.prediction.cancel(at);
    if (own) this.previewMotion(own, at, true);
  }
  resetMovement() {
    this.movementIntent = null;
    this.prediction?.clear();
    this.motionLast = null;
    this.motionStopped = true;
  }
  movementEligible(at, queuedTurn = false) {
    if (this.disposed || this.halted || this.movementSuspended || !this.ready || this.ws?.readyState !== 1 || this.movementBehind || at < (this.movementCooldownUntil ?? 0) || at - (this.lastMove ?? -Infinity) < 200) return false;
    if (this.active) return this.queuedMovement && !this.active.movement && (this.active.queued === true || this.orderedMovement && this.active.dependsOn === void 0) && !this.active.pipelineUsed && mayPipelineMovement(this.active.payload);
    return !this.queue.length || queuedTurn && (this.lastScheduledKind !== "movement" || this.orderedMovement && mayPipelineMovement(this.queue[0]?.payload));
  }
  sendMovement(payload, at, batch = null, queuedTurn = false) {
    if (!this.movementEligible(at, queuedTurn) || payload?.action !== "move") return false;
    const input = structuredClone(payload), primary = this.active;
    if (this.motionStreamId && batch && Number.isSafeInteger(batch.motionSequence) && batch.motionSequence > 0) {
      input.motionStreamId = this.motionStreamId;
      input.motionSequence = batch.motionSequence;
    }
    this.lastMove = at;
    this.lastScheduledKind = "movement";
    const row = { movement: true, sequence: primary ? primary.sequence + 1 : this.lastAccepted + 1, payload: input, resolve: (result) => {
      const body = result.body ?? {}, detail = body.data ?? body;
      if (batch) this.prediction.acknowledge(row.sequence, result.status ?? 200, detail, this.now());
      if (result.status === 429 || detail.code === "rate_limited") {
        const retry = Number(result.headers?.["retry-after"] ?? detail.retryAfter ?? body.retryAfter ?? 1);
        this.movementCooldownUntil = this.now() + Math.max(1e3, Number.isFinite(retry) ? retry * 1e3 : 1e3);
        this.resetMovement();
      }
    }, reject: (error) => {
      this.resetMovement();
      if (error.code !== "movement_cancelled") this.emit("error", { code: error.code });
    } };
    if (primary) {
      if (this.orderedMovement && !primary.queued) row.dependsOn = primary.sequence;
      primary.pipelineUsed = true;
      this.movementBehind = row;
    } else this.active = row;
    if (batch) this.prediction.sent(row.sequence, batch);
    if (primary) this.sendInput(row);
    else this.sendActive();
    this.pump();
    return true;
  }
  // Accumulate held-input time, never predicted coordinates. The builder sees
  // the latest server position only when the single command slot is available.
  moveFrame({ x = 0, y = 0, scope: scope2 = null } = {}, buildPayload) {
    const at = this.now(), length = Math.hypot(x, y);
    if (!Number.isFinite(length) || length <= 0 || this.disposed || this.halted || this.movementSuspended || !this.ready || this.ws?.readyState !== 1 || at < (this.movementCooldownUntil ?? 0)) {
      this.resetMovement();
      return false;
    }
    const key = JSON.stringify(scope2), old = this.movementIntent, direction = { x: x / length, y: y / length }, gap = old ? at - old.at : 0;
    const reset = !old || old.scope !== key || gap < 0 || gap > 250, delta = reset ? 16 : Math.max(0, gap), turn = old && (old.x * direction.x + old.y * direction.y < 0.85 || Math.abs(old.length - length) > 0.35);
    const pending = Math.min(350, (reset || turn ? 0 : old.pending) + delta);
    this.movementIntent = { ...direction, length, scope: key, at, pending };
    if (!this.movementEligible(at)) return false;
    if (typeof buildPayload !== "function") throw TypeError("movement_payload_builder_required");
    const payload = buildPayload(pending / 1e3);
    this.movementIntent.pending = 0;
    if (!payload) return false;
    return this.sendMovement(payload, at);
  }
  move(payload) {
    return this.sendMovement(payload, this.now());
  }
  async replace(name, payload) {
    if (name === "character" || name === "transfer") {
      if (!Number.isInteger(payload?.channel) || payload.channel < 1 || payload.channel > 4) throw Object.assign(failure("channel_selection_required", 400), { body: { code: "channel_selection_required", error: "Girmek istedi\u011Fin kanal\u0131 se\xE7." } });
      const { channelChoice504, ...selected } = payload;
      payload = selected;
    }
    const prior = this.replacing;
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    this.replacing = gate;
    this.movementSuspended = true;
    try {
      if (prior) await prior;
      this.resetMovement();
      if (name !== "character" || this.ready || this.connecting || this.active || this.movementBehind || this.queue.length) await this.ensureIdle(true);
      const ticket = await this.endpoint(name, payload);
      if ((name === "character" || name === "transfer") && ticket.channel !== payload.channel) throw Object.assign(failure("channel_selection_mismatch", 409), { body: { code: "channel_selection_mismatch", error: "Se\xE7ti\u011Fin kanal do\u011Frulanamad\u0131. L\xFCtfen kanal\u0131n\u0131 yeniden se\xE7." } });
      await this.open(ticket);
      await this.image(true);
      return ticket;
    } finally {
      this.resetMovement();
      if (this.replacing === gate) {
        this.replacing = null;
        this.movementSuspended = false;
      }
      release();
    }
  }
  async ensureIdle(replacementInternal = false) {
    await this.ensure(replacementInternal);
    if (!this.active && !this.movementBehind && !this.queue.length) return;
    await this.enqueue({ action: "heartbeat" });
  }
  async request(url, options, next) {
    const u = new URL(url instanceof Request ? url.url : url, this.origin), method = options?.method ?? "GET";
    let input;
    if (method === "POST") try {
      input = JSON.parse(options.body);
    } catch {
    }
    try {
      if (u.pathname === "/api/world" && !u.searchParams.has("marketShop506")) return response(await this.image());
      if (u.pathname === "/api/action" && input?.action === "join") {
        const ticket = await this.replace("character", input);
        this.entrySelected = true;
        return response({ ...ticket, playerId: this.playerId });
      }
      if (u.pathname === "/api/action" && input?.action === "select_channel") return response(await this.replace("transfer", { channel: input.channel }));
      if (u.pathname === "/api/action" && input?.action === "hurt") {
        await this.image();
        const p = this.world.players.find((p2) => p2.id === this.playerId);
        return response({ ignored: true, hp: p?.hp, hpRevision: p?.hp_revision, respawnAtMs: p?.respawn_at_ms, nextHitInMs: 1e3 });
      }
      if (u.pathname === "/api/action" && hot.has(input?.action)) {
        const r2 = await this.command(input);
        return response(r2.body, r2.status, r2.headers);
      }
      if (u.pathname === "/api/dungeon") {
        if (method === "GET" && this.dungeon?.run) return response(this.dungeon);
        const command = method === "GET" ? { action: "sync" } : input;
        if (command?.action === "stream") return response({ code: "core511_protocol_required" }, 428);
        const r2 = await this.command({ action: "dungeon", command });
        if (r2.body && Object.hasOwn(r2.body, "run")) {
          this.dungeon = r2.body;
          this.emit("dungeon", r2.body);
        }
        return response(r2.body, r2.status, r2.headers);
      }
      const r = await next(url, options);
      if (u.pathname === "/api/auth/logout" && r.ok) this.dispose();
      return r;
    } catch (error) {
      return response(error.body ?? { code: error.code ?? "core511_unavailable", error: error.status === 409 ? "\u0130\u015Flemin sonucu do\u011Frulanamad\u0131. G\xFCncel durumu yenile." : "Ba\u011Flant\u0131 yenileniyor." }, error.status ?? 503);
    }
  }
  dispose() {
    this.disposed = true;
    this.ready = false;
    this.resetMovement();
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.inputTimer);
    this.ws?.close(1e3, "Session ended");
    this.rejectActive("game_instance_expired");
    this.rejectQueue("game_instance_expired");
    this.listeners.clear();
    this.world = null;
    this.dungeon = null;
    this.interpolation.clear();
  }
};
var current = null;
function browserCore(instance) {
  if (!current || current.instance !== instance || current.disposed) {
    current?.dispose();
    const headers = () => {
      const cookies = document.cookie.split(";").map((x) => x.trim()), entry = cookies.find((x) => x.startsWith("__Host-yasam-csrf=")) ?? cookies.find((x) => x.startsWith("yasam-csrf-local="));
      return { "content-type": "application/json", "x-game-instance": instance, "x-csrf-token": entry ? decodeURIComponent(entry.slice(entry.indexOf("=") + 1)) : "" };
    };
    current = new Core511Transport({ fetch: globalThis.fetch.bind(globalThis), WebSocket: globalThis.WebSocket, origin: location.origin, headers, notify: (kind, value) => {
      if (kind !== "error") return;
      if (value.status === 401) window.dispatchEvent(new Event("coreoflife:game-session-ended"));
      if (value.code === "bot_check_required") window.dispatchEvent(new Event("coreoflife:bot-check"));
      if (value.code === "game_instance_expired") window.dispatchEvent(new CustomEvent("coreoflife:instance-ended", { detail: value.error }));
    } });
    current.instance = instance;
  }
  return current;
}
function browserRequest(url, options) {
  const headers = new Headers(options?.headers), pending = browserCore(headers.get("x-game-instance") ?? "").request(url, options, globalThis.fetch.bind(globalThis)), signal = options?.signal;
  if (!signal) return pending;
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Request aborted", "AbortError"));
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
if (typeof window !== "undefined") window.addEventListener("coreoflife:presence-claimed", (event) => {
  const instance = event.detail?.instance;
  if (typeof instance !== "string" || !instance || !current || current.disposed || !current.halted || current.instance !== instance || current.blockedReason === "bot_check_required") return;
  if (current.haltFailure?.status !== 401 && current.blockedReason !== "game_instance_expired") return;
  current.dispose();
  current = null;
});
if (typeof window !== "undefined") window.addEventListener("coreoflife:bot-verified", () => {
  if (current && !current.disposed && current.blockedReason === "bot_check_required") {
    current.halted = false;
    current.blockedReason = null;
    current.haltFailure = null;
    void current.ensure().catch(() => current.scheduleReconnect());
  }
});
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
  if (document.hidden) current?.resetMovement();
});
export {
  CLIENT_PROTOCOL,
  Core511Transport,
  BufferedInterpolation as PositionInterpolation,
  browserCore,
  browserRequest
};
