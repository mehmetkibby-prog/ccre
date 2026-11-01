const presses = new WeakMap<EventTarget, {source: "pointer" | "touch"; at: number; paired: boolean}>();

// A physical touch can emit both event families. Accept whichever arrives
// first, and consume only its companion event, not the next quick press.
// No pointer ownership/hold or timer is introduced by this fallback.
export function claimCombatTouchPress(target: EventTarget, source: "pointer" | "touch", at: number) {
  const previous = presses.get(target);
  if (previous && !previous.paired && previous.source !== source && at >= previous.at && at - previous.at <= 80) {
    previous.paired = true;
    return false;
  }
  presses.set(target, {source, at, paired: false});
  return true;
}
