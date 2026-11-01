import {detectF971b, f971bInnerLayout} from './f971b-layout.ts';
type VisibleViewport = { width: number; height: number; scale: number; offsetLeft: number; offsetTop: number };

// Text entry follows the visible rectangle, independently of the unscaled game
// canvas. Rejecting a zoomed or briefly mismatched width is safe for the canvas,
// but would leave a focused chat composer underneath the software keyboard.
export function chatViewport(layoutWidth: number, layoutHeight: number, visible?: VisibleViewport | null) {
  const width = Math.max(1, layoutWidth), height = Math.max(1, layoutHeight);
  const finite = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const w = Math.max(1, Math.min(width, finite(visible?.width, width) || width));
  const h = Math.max(1, Math.min(height, finite(visible?.height, height) || height));
  return {
    width: w, height: h,
    left: Math.max(0, Math.min(width - w, finite(visible?.offsetLeft, 0))),
    top: Math.max(0, Math.min(height - h, finite(visible?.offsetTop, 0))),
  };
}

export function gameViewport(layoutWidth: number, layoutHeight: number, visible?: VisibleViewport | null) {
  const width = Math.max(1, layoutWidth), height = Math.max(1, layoutHeight);
  const scale = Math.max(1, Number(visible?.scale) || 1);
  // Fold transitions can briefly report the old screen through visualViewport.
  // Never mix that width with the new layout height. Keyboard resizing is safe
  // once both viewports agree on width; page zoom keeps the unscaled game plane.
  const usable = visible && scale <= 1.01 && visible.height > 0 && Math.abs(visible.width - width) <= 2;
  return {
    width: Math.round(width), height: Math.round(usable ? Math.min(height, visible.height) : height),
    // This plane uses the full layout width, so shifting it by a stale visual
    // offset would expose a blank left strip and clip the right edge. Insets
    // belong to the HUD controls, not the world canvas.
    left: 0,
    // Keep real keyboard panning, but never move a full-height plane offscreen.
    top: usable ? Math.round(Math.max(0, Math.min(Number(visible.offsetTop) || 0, height - Math.min(height, visible.height)))) : 0,
    scale,
  };
}

export function installGameViewport(onPortrait: (portrait: boolean) => void) {
  let frame = 0, settle = 0, folded = 0;
  let targetModel = false, disposed = false;
  const viewport = window.visualViewport;
  const pointer = window.matchMedia('(pointer: coarse)');
  let layout: {width:number;height:number;orientation:string} | undefined;
  const update = () => {
    const active = document.activeElement as HTMLElement | null;
    document.documentElement.toggleAttribute('data-col-typing', pointer.matches && !!active?.closest?.('.chat-panel,.whisper-window'));
    const editing = !!active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName));
    const orientation = `${window.screen.orientation?.type ?? ''}:${window.screen.orientation?.angle ?? ''}`;
    // Android can resize innerHeight as well as visualViewport for the keyboard.
    // Preserve the physical layout while typing; real rotation/folding still
    // changes the orientation token or width and is applied immediately.
    if (!layout || !editing || Math.abs(window.innerWidth-layout.width)>2 || orientation!==layout.orientation) {
      layout = {width:window.innerWidth,height:window.innerHeight,orientation};
    }
    const fullscreen = !!(document.fullscreenElement || (document as Document & {webkitFullscreenElement?: Element}).webkitFullscreenElement);
    // On this model Chrome can retain the pre-fullscreen visual height even
    // when its width already matches. Keep keyboard and pinch-zoom behavior.
    const visible = targetModel && fullscreen && !editing && (viewport?.scale ?? 1) <= 1.01 ? null : viewport;
    const v = gameViewport(window.innerWidth, window.innerHeight, visible);
    const style = document.documentElement.style;
    for (const [key, value] of Object.entries({width:v.width,height:v.height,left:v.left,top:v.top})) {
      style.setProperty(`--game-viewport-${key}`, `${value}px`);
    }
    const chat = chatViewport(layout.width, layout.height, viewport ?? {
      width: window.innerWidth, height: window.innerHeight, scale: 1, offsetLeft: 0, offsetTop: 0,
    });
    for (const [key, value] of Object.entries(chat)) style.setProperty(`--chat-viewport-${key}`, `${value}px`);
    style.setProperty('--game-page-scale', String(v.scale));
    if (targetModel) document.documentElement.setAttribute('data-col-f971b',
      f971bInnerLayout(true, pointer.matches, layout.width, layout.height) ? 'inner' : 'cover');
    // A keyboard must not be mistaken for a phone orientation change.
    onPortrait(pointer.matches && layout.height > layout.width);
  };
  const schedule = () => {
    cancelAnimationFrame(frame); window.clearTimeout(settle); window.clearTimeout(folded);
    update(); frame = requestAnimationFrame(update);
    settle = window.setTimeout(update, 180);
    folded = window.setTimeout(update, 500);
  };
  schedule();
  void detectF971b(window.navigator ?? {}).then(target => {
    if (!disposed && target) { targetModel = true; schedule(); }
  });
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('orientationchange', schedule);
  document.addEventListener('fullscreenchange', schedule);
  document.addEventListener('webkitfullscreenchange', schedule);
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  viewport?.addEventListener('scrollend', schedule);
  window.screen.orientation?.addEventListener('change', schedule);
  pointer.addEventListener('change', schedule);
  return () => {
    disposed = true;
    if (targetModel) document.documentElement.removeAttribute('data-col-f971b');
    cancelAnimationFrame(frame); window.clearTimeout(settle); window.clearTimeout(folded);
    document.documentElement.removeAttribute('data-col-typing');
    for (const key of ['width','height','left','top']) document.documentElement.style.removeProperty?.(`--chat-viewport-${key}`);
    document.removeEventListener('focusin', schedule);
    document.removeEventListener('focusout', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('pageshow', schedule);
    document.removeEventListener('visibilitychange', schedule);
    window.removeEventListener('orientationchange', schedule);
    document.removeEventListener('fullscreenchange', schedule);
    document.removeEventListener('webkitfullscreenchange', schedule);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    viewport?.removeEventListener('scrollend', schedule);
    window.screen.orientation?.removeEventListener('change', schedule);
    pointer.removeEventListener('change', schedule);
  };
}
