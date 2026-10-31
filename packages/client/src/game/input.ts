/** Klavye/fare/dokunma girdisi. Sohbet yazarken veya bir alan odaktayken oyun tuşları tetiklenmez. */
export class Input {
  keys = new Set<string>();
  joy = { x: 0, y: 0, active: false };
  attackHeld = false;
  onKey: (code: string, down: boolean, e: KeyboardEvent) => void = () => {};
  private bound: [EventTarget, string, EventListener][] = [];

  attach() {
    const kd = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (isTyping()) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(ke.code)) ke.preventDefault();
      if (!this.keys.has(ke.code)) { this.keys.add(ke.code); this.onKey(ke.code, true, ke); }
    };
    const ku = (e: Event) => { const ke = e as KeyboardEvent; this.keys.delete(ke.code); this.onKey(ke.code, false, ke); };
    const blur = () => this.reset();
    this.on(window, 'keydown', kd); this.on(window, 'keyup', ku); this.on(window, 'blur', blur);
    this.on(document, 'visibilitychange', blur);
  }
  private on(t: EventTarget, ev: string, fn: EventListener) { t.addEventListener(ev, fn); this.bound.push([t, ev, fn]); }
  detach() { for (const [t, ev, fn] of this.bound) t.removeEventListener(ev, fn); this.bound = []; }
  /** Menü kapanınca/odak kaybolunca takılı kalan tuş olmasın. */
  reset() { this.keys.clear(); this.joy = { x: 0, y: 0, active: false }; this.attackHeld = false; }

  moveVector(): { x: number; y: number } {
    if (isTyping()) return { x: 0, y: 0 };
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (x || y) return { x, y };
    if (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.22) return { x: this.joy.x, y: this.joy.y };
    return { x: 0, y: 0 };
  }
}

export function isTyping(): boolean {
  const a = document.activeElement as HTMLElement | null;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
}
