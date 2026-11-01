// Release events can land outside the joystick after capture is interrupted.
// Observe them in capture phase so another control cannot swallow the release.
export function installJoystickReleaseGuards(
  win: Window, doc: Document, activePointer: () => number | null, release: () => void,
  normalRelease: () => void = release,
) {
  const pointerEnd = (event: PointerEvent) => {
    if (activePointer() === event.pointerId) (event.type === 'pointerup' ? normalRelease : release)();
  };
  const touchesEnd = (event: TouchEvent) => {
    // A second finger may still be holding the joystick: never reset merely
    // because a skill finger lifted. This is a fallback when all touches end.
    if (event.touches.length === 0 && activePointer() !== null) (event.type === 'touchend' ? normalRelease : release)();
  };
  const hidden = () => { if (doc.hidden) release(); };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) win.addEventListener(name, pointerEnd as EventListener, { capture: true });
  for (const name of ['touchend', 'touchcancel']) win.addEventListener(name, touchesEnd as EventListener, { capture: true, passive: true });
  win.addEventListener('blur', release);
  win.addEventListener('pagehide', release);
  doc.addEventListener('visibilitychange', hidden);
  return () => {
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) win.removeEventListener(name, pointerEnd as EventListener, { capture: true });
    for (const name of ['touchend', 'touchcancel']) win.removeEventListener(name, touchesEnd as EventListener, { capture: true });
    win.removeEventListener('blur', release);
    win.removeEventListener('pagehide', release);
    doc.removeEventListener('visibilitychange', hidden);
    release();
  };
}
