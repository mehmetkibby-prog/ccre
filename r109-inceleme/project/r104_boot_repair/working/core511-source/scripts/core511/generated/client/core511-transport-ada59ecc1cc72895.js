// ../../../../../../core511-tower-r18/lab/core511-698-ee1f1e5c-20261015/native510-bb3a6cc689c6/lib/world-push-frame.mjs
var WORLD_PUSH_MAX_FRAME_BYTES = 2 * 1024 * 1024;

// ../../../../../../core511-tower-r18/lab/core511-698-ee1f1e5c-20261015/native510-bb3a6cc689c6/lib/world-push.mjs
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

// adventure-maps.mjs
var ADVENTURE_ACTIONS = Object.freeze(["adventure_tower_enter", "adventure_next", "adventure_leave", "adventure_mist_enter", "adventure_chest", "adventure_tower_chest", "adventure_refine"]);
var ADVENTURE_BOUNDS = Object.freeze({ width: 1600, height: 1100 });
var ADVENTURE_ENTRY = Object.freeze({ x: 800, y: 940 });

// generated/action-names.mjs
var NATIVE_ACTIONS = Object.freeze([...ADVENTURE_ACTIONS, "claim_rewards", "donate", "respawn", "collect", "use_potion", "guardian_dash", "start_fishing", "fishing_input", "finish_fishing", "cancel_fishing", "sell_fish", "arena_join_queue", "arena_cancel_queue", "arena_ack_result", "invite_party", "reject_party", "accept_party", "kick_party", "leave_party", "travel_event", "travel_dragon", "travel_rune_v2", "travel_rune", "travel_ancient", "travel_afk", "travel_market", "travel_forest", "travel_frozen", "travel_fishing", "travel_sanctum", "travel_sinsi", "travel_war", "travel_black"]);

// movement-prediction.mjs
var point = (p) => ({ x: p.x, y: p.y });
var finitePoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var revision = (p) => p?.positionRevision ?? p?.position_revision;
var OwnPrediction = class {
  constructor() {
    this.clear();
    this.serial = 0;
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
  bind(row, scope, at) {
    if (!finitePoint(row) || !Number.isSafeInteger(revision(row))) return false;
    if (this.scope !== scope || !this.authority) {
      this.clear();
      this.scope = scope;
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
      const entry = { id: ++this.serial, seconds: dt, integrate, from, to: point(to) };
      this.pending.push(entry);
      this.predicted = point(to);
    }
    this.lastAt = at;
    return this.position(at);
  }
  batch() {
    if (this.flight || !this.authority || !this.pending.length) return null;
    const path = [[this.authority.x, this.authority.y]];
    let seconds = 0, through = 0;
    for (const row of this.pending) {
      if (seconds + row.seconds > 0.350001 || path.length >= 64) break;
      path.push([row.to.x, row.to.y]);
      seconds += row.seconds;
      through = row.id;
    }
    if (!through) return null;
    const [x, y] = path.at(-1);
    return { through, seconds, target: { x, y }, payload: { action: "move", x, y, area: this.authority.area, path, basePositionRevision: this.authority.revision } };
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
    const scope = JSON.stringify([world.world?.cycle, world.channel, world.area, world.arenaMatch?.id]);
    if (scope !== this.scope) {
      this.clear();
      this.scope = scope;
    }
    const keep = /* @__PURE__ */ new Set();
    for (const type of ["players", "monsters"]) for (const row of world[type] ?? []) {
      if (type === "players" && row.id === this.ownId) continue;
      if (!finitePoint(row)) continue;
      const key = type + ":" + row.id, epoch = JSON.stringify([row.area, row.spawn_round ?? 0, row.respawn_at_ms ?? 0]), old = this.rows.get(key);
      keep.add(key);
      if (!old || old.epoch !== epoch || distance(old.samples.at(-1), row) > 420) {
        this.rows.set(key, { epoch, samples: [{ ...point(row), at }], intervals: [], cursor: at, displayedAt: at });
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

// client-transport.mjs
var CLIENT_PROTOCOL = "coreoflife-kernel-v1";
var QUEUED_MOVEMENT = "queued-movement-v1";
var ORDERED_MOVEMENT = "ordered-movement-v2";
var mayPipelineMovement = (payload) => payload?.action === "attack" && Number(payload.ability ?? 0) === 0 || ["claim_rewards", "collect"].includes(payload?.action);
var hot = /* @__PURE__ */ new Set([...NATIVE_ACTIONS, "move", "attack", "pvp_attack", "cast_support456", "heartbeat"]);
var response = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
var failure = (code, status = 503) => Object.assign(Error(code), { code, status });
var Core511Transport = class {
  constructor({ fetch, WebSocket, origin, headers, now = () => performance.now(), notify = () => {
  } }) {
    Object.assign(this, { fetch, WebSocket, origin, headers, now, notify });
    this.entrySelected = false;
    this.listeners = /* @__PURE__ */ new Set();
    this.interpolation = new BufferedInterpolation();
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
    this.notify(kind, value);
    for (const f of this.listeners) f(kind, value);
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
    this.queuedMovement = false;
    this.orderedMovement = false;
    for (const row of this.pendingInputs()) clearTimeout(row.retryTimer);
    clearTimeout(this.reconnectTimer);
    const generation = ++this.connection, old = this.ws;
    this.ready = false;
    this.cursor = null;
    this.world = null;
    this.dungeon = null;
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
        if (current2()) socket.send(JSON.stringify({ type: "auth", ticket: ticket.ticket, capabilities: [QUEUED_MOVEMENT, ORDERED_MOVEMENT] }));
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
    const shown = this.prediction.advance(seconds, integrate, at), batch = this.prediction.batch();
    if (batch && this.movementEligible(at)) this.sendMovement(batch.payload, at, batch);
    return shown;
  }
  suspendPrediction() {
    this.prediction.cancel(this.now());
  }
  resetMovement() {
    this.movementIntent = null;
    this.prediction?.clear();
  }
  movementEligible(at, queuedTurn = false) {
    if (this.disposed || this.halted || this.movementSuspended || !this.ready || this.ws?.readyState !== 1 || this.movementBehind || at < (this.movementCooldownUntil ?? 0) || at - (this.lastMove ?? -Infinity) < 200) return false;
    if (this.active) return this.queuedMovement && !this.active.movement && (this.active.queued === true || this.orderedMovement && this.active.dependsOn === void 0) && !this.active.pipelineUsed && mayPipelineMovement(this.active.payload);
    return !this.queue.length || queuedTurn && (this.lastScheduledKind !== "movement" || this.orderedMovement && mayPipelineMovement(this.queue[0]?.payload));
  }
  sendMovement(payload, at, batch = null, queuedTurn = false) {
    if (!this.movementEligible(at, queuedTurn) || payload?.action !== "move") return false;
    const input = structuredClone(payload), primary = this.active;
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
  moveFrame({ x = 0, y = 0, scope = null } = {}, buildPayload) {
    const at = this.now(), length = Math.hypot(x, y);
    if (!Number.isFinite(length) || length <= 0 || this.disposed || this.halted || this.movementSuspended || !this.ready || this.ws?.readyState !== 1 || at < (this.movementCooldownUntil ?? 0)) {
      this.resetMovement();
      return false;
    }
    const key = JSON.stringify(scope), old = this.movementIntent, direction = { x: x / length, y: y / length }, gap = old ? at - old.at : 0;
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
