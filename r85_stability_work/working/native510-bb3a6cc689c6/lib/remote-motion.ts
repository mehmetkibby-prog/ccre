export type RemoteMotionState<Area extends string = string> = {
  x: number; y: number; targetX: number; targetY: number;
  vx: number; vy: number; sampleAt: number; area: Area; travel: number;
};

// Network callbacks update targets only. The render loop is the sole writer of
// displayed coordinates, so duplicate/stopped packets cannot pull an extrapolated
// character backwards and then push it forward again in the very same frame.
export function updateRemoteMotionTarget(motion: RemoteMotionState, x: number, y: number, now: number) {
  const seconds = Math.max(.035, Math.min(.8, (now - motion.sampleAt) / 1000));
  const dx = x - motion.targetX;
  const dy = y - motion.targetY;
  let vx = dx / seconds;
  let vy = dy / seconds;
  const speed = Math.hypot(vx, vy);
  if (speed > 285) { vx *= 285 / speed; vy *= 285 / speed; }
  const stopped = Math.hypot(dx, dy) < .01;
  motion.vx = stopped ? 0 : motion.vx * .2 + vx * .8;
  motion.vy = stopped ? 0 : motion.vy * .2 + vy * .8;
  motion.targetX = x;
  motion.targetY = y;
  motion.sampleAt = now;
}

export function advanceRemoteMotion(motion: RemoteMotionState, dt: number, livePreview = false, buffered = false) {
  // Integrate a speed-capped exponential exactly. A buffered burst cannot move
  // a character hundreds of units in one paint, and 30/60/120 FPS converge to
  // the same position without extrapolating past a confirmed target.
  const elapsed = Math.max(0, dt);
  const distance = Math.hypot(motion.targetX - motion.x, motion.targetY - motion.y);
  // Validated 30 Hz previews need less trailing than sparse HTTP checkpoints.
  // Keep the same speed cap and never predict beyond a received position.
  const maxSpeed = 600, response = livePreview ? 60 : 32, threshold = maxSpeed / response;
  const linearSeconds = Math.max(0, (distance - threshold) / maxSpeed);
  // Buffered points are already interpolated for this exact paint time. A second
  // exponential filter creates speed ripple at 50 FPS on a 60/90/120 Hz display.
  // Sparse checkpoint fallback keeps its existing easing; both retain the cap.
  const remaining = buffered ? Math.max(0, distance - maxSpeed * elapsed) : elapsed <= linearSeconds
    ? Math.max(0, distance - maxSpeed * elapsed)
    : Math.min(distance, threshold) * Math.exp(-(elapsed - linearSeconds) * response);
  const follow = distance > 0 ? 1 - remaining / distance : 0;
  const oldX = motion.x;
  const oldY = motion.y;
  motion.x += (motion.targetX - motion.x) * follow;
  motion.y += (motion.targetY - motion.y) * follow;
  if (Math.hypot(motion.targetX - motion.x, motion.targetY - motion.y) < .05) {
    motion.x = motion.targetX;
    motion.y = motion.targetY;
  }
  const traveled = Math.hypot(motion.x - oldX, motion.y - oldY);
  motion.travel += traveled;
  return traveled;
}
