import {BASIC_ATTACK_INPUT_BUFFER_MS} from './combat-stats.ts';

// Driven by the existing game RAF. No interval, catch-up burst or queued repeat.
export function createHeldAttack(input: {
  target?: () => string | null;
  scope?: () => string;
  bufferTaps?: boolean;
  tapAllowed?: () => boolean;
  prepare?: () => boolean | void;
  // Mobile can keep walking with a held button and acquire only a nearby target.
  prepareEachAttack?: boolean;
  allowed: () => boolean;
  blocked: () => boolean;
  readyAt: () => number;
  attack: (bufferedTap?: boolean) => void | Promise<void>;
  released: (pointer: number) => void;
}) {
  let pointer: number | null = null;
  let target: string | null = null;
  let targetCaptured = false;
  let generation = 0;
  let activeScope = '';
  let nextAttempt = 0;
  // A normal next strike must not wait for the previous HTTP response. Keep
  // this bounded, including across rapid release/repress, when the network stalls.
  const pending = new Set<object>();
  let pipelineReadyAt: number | null = null;
  type Tap = { target: string; scope: string; deadline: number; pressedAt: number };
  let tapCandidate: Tap | null = null;
  let queuedTap: Tap | null = null;
  const stop = () => {
    const previous = pointer;
    pointer = null;
    generation++;
    target = null; targetCaptured = false;
    nextAttempt = 0;
    tapCandidate = null; queuedTap = null;
    if (previous !== null) input.released(previous);
  };
  const dispatch = (now: number, readyAt: number, bufferedTap = false) => {
    if (pending.size >= 2) return false;
    // Only a cast which synchronously reserved its real combat cooldown may
    // overlap a pending response. A no-op/out-of-range attempt cannot do so.
    if (pending.size && (pipelineReadyAt === null || readyAt < pipelineReadyAt || now < pipelineReadyAt)) return false;
    const flight = {};
    pending.add(flight);
    pipelineReadyAt = null;
    tapCandidate = null; queuedTap = null;
    try {
      const ownGeneration = generation;
      const result = input.attack(bufferedTap);
      const reservedUntil = input.readyAt();
      const cadenceReserved = Number.isFinite(reservedUntil) && reservedUntil > Math.max(readyAt, now);
      if (cadenceReserved) pipelineReadyAt = reservedUntil;
      // Target selection happens synchronously inside the cast, before its request.
      if (input.target && !targetCaptured && pointer !== null) { target = input.target(); targetCaptured = true; if (!target) stop(); }
      const settled = () => {
        pending.delete(flight);
        // A freed slot is available on the next RAF, still behind the cooldown.
        if (cadenceReserved && pointer !== null) nextAttempt = 0;
      };
      Promise.resolve(result).then(settled, () => { settled(); if (generation === ownGeneration) stop(); });
    } catch { pending.delete(flight); stop(); }
    return true;
  };
  const tick = (now: number) => {
    if (pointer === null) {
      const tap = queuedTap;
      if (!tap) return;
      // A released short tap owns exactly one near-deadline strike, never a
      // repeat or a new target. Suspended frames/network stalls cannot replay it.
      if (now > tap.deadline + 100 || !(input.tapAllowed ?? input.allowed)() || input.blocked()
        || input.target?.() !== tap.target || (input.scope?.() ?? '') !== tap.scope
        || input.readyAt() > tap.deadline) { stop(); return; }
      if (now >= tap.deadline && now >= input.readyAt()) dispatch(now, input.readyAt(), true);
      return;
    }
    if (!input.allowed()) { stop(); return; }
    if (input.scope && input.scope() !== activeScope) { stop(); return; }
    if (!input.prepareEachAttack && targetCaptured && input.target && (!target || input.target() !== target)) { stop(); return; }
    if (now < nextAttempt) return;
    // Check overlays even while the last request is pending.
    nextAttempt = now + 80;
    if (input.blocked()) { stop(); return; }
    const readyAt = input.readyAt();
    if (now < readyAt) { nextAttempt = Math.min(nextAttempt, readyAt); return; }
    if (input.prepareEachAttack) {
      if (input.prepare?.() === false) return;
      target = input.target?.() ?? null; targetCaptured = !!target;
    }
    dispatch(now, readyAt);
  };
  const release = (now: number) => {
    if (pointer === null) return;
    const tap = tapCandidate;
    const shortTap = tap && now >= tap.pressedAt && now - tap.pressedAt <= 180 && now <= tap.deadline + 100;
    stop();
    if (shortTap) queuedTap = tap;
  };
  return {
    pointer: () => pointer,
    stop,
    release,
    tick,
    start(id: number, now: number) {
      if (pointer !== null) return;
      generation++;
      pointer = id;
      activeScope = input.scope?.() ?? '';
      nextAttempt = 0;
      queuedTap = null; tapCandidate = null;
      if (!input.allowed() || input.blocked()) { stop(); return; }
      if (input.prepare?.() === false && !input.prepareEachAttack) { stop(); return; }
      const deadline = input.readyAt(), selected = input.target?.();
      // Bind the fresh intent before waiting for a cooldown. A target which
      // dies before the first strike cannot turn this press into a new hunt.
      if (selected) { target = selected; targetCaptured = true; }
      if (input.bufferTaps && selected && deadline > now && deadline - now <= BASIC_ATTACK_INPUT_BUFFER_MS) {
        tapCandidate = { target: selected, scope: input.scope?.() ?? '', deadline, pressedAt: now };
      }
      tick(now);
    },
  };
}
