import {BASIC_ATTACK_INPUT_BUFFER_MS} from './combat-stats.ts';

// Mobile input owns one strike per pointerdown, never a held/repeating action.
// The pointer is only used to cancel an interrupted gesture; it cannot block
// a later fresh press if a browser omitted the previous release event.
export function createTapAttack(input: {
  allowed: () => boolean;
  blocked: () => boolean;
  prepare: () => boolean | void;
  target: () => string | null;
  scope: () => string;
  readyAt: () => number;
  attack: (buffered: boolean) => void | Promise<void>;
  released: (pointer: number) => void;
}) {
  type Tap = {target: string; scope: string; deadline: number};
  let pointer: number | null = null;
  let queued: Tap | null = null;
  const pending = new Set<object>();
  let pipelineReadyAt: number | null = null;
  const release = () => {
    const previous = pointer;
    pointer = null;
    if (previous !== null) input.released(previous);
  };
  const stop = () => { queued = null; release(); };
  const dispatch = (now: number, buffered: boolean) => {
    const ready = input.readyAt();
    if (pending.size >= 2 || (pending.size &&
      (pipelineReadyAt === null || ready < pipelineReadyAt || now < pipelineReadyAt))) return false;
    queued = null;
    const flight = {};
    pending.add(flight);
    pipelineReadyAt = null;
    try {
      const result = input.attack(buffered);
      const reserved = input.readyAt();
      if (Number.isFinite(reserved) && reserved > Math.max(now, ready)) pipelineReadyAt = reserved;
      // A late response only frees capacity. It cannot cancel/replay a new tap.
      const settled = () => { pending.delete(flight); };
      Promise.resolve(result).then(settled, settled);
    } catch { pending.delete(flight); }
    return true;
  };
  return {
    pointer: () => pointer,
    stop,
    release,
    start(id: number, now: number) {
      pointer = id;
      if (!input.allowed() || input.blocked() || input.prepare() === false) { stop(); return; }
      const deadline = input.readyAt();
      queued = null;
      if (deadline <= now && dispatch(now, false)) return;
      const target = input.target();
      if (target && deadline - now <= BASIC_ATTACK_INPUT_BUFFER_MS) {
        queued = {target, scope: input.scope(), deadline: Math.max(now, deadline)};
      }
    },
    tick(now: number) {
      const tap = queued;
      if (!tap) return;
      if (now > tap.deadline + 100 || !input.allowed() || input.blocked()
        || input.target() !== tap.target || input.scope() !== tap.scope
        || input.readyAt() > tap.deadline) { stop(); return; }
      if (now >= tap.deadline) dispatch(now, true);
    },
  };
}
