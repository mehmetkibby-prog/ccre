// r32-movement-work/working/native510-bb3a6cc689c6/lib/motion-buffer.ts
function freshMotionBuffer(sample) {
  return { samples: [sample], offset: sample.receivedAt - sample.serverAt, streamId: sample.streamId, sourceClock: !!sample.sourceClock };
}
function appendMotionSample(buffer, sample) {
  if (!buffer || buffer.streamId !== sample.streamId || !!buffer.sourceClock !== !!sample.sourceClock || buffer.pendingCanonical && sample.receivedAt >= buffer.pendingCanonical.expiresAt) return freshMotionBuffer(sample);
  const last = buffer.samples.at(-1);
  if (sample.serverAt < last.serverAt) return buffer;
  const gap = sample.receivedAt - last.receivedAt;
  if (gap > 600 || gap > 200 && sample.serverAt - last.serverAt > 200) return freshMotionBuffer(sample);
  if (buffer.pendingCanonical && (sample.sequence ?? 0) > buffer.pendingCanonical.sequence) delete buffer.pendingCanonical;
  buffer.offset = Math.min(buffer.offset, sample.receivedAt - sample.serverAt);
  if (sample.serverAt === last.serverAt) buffer.samples[buffer.samples.length - 1] = sample;
  else buffer.samples.push(sample);
  if (buffer.samples.length > 24) buffer.samples.splice(0, buffer.samples.length - 24);
  if (gap > 0) buffer.arrivalGap = Math.max(gap, (buffer.arrivalGap ?? 1e3 / 30) - gap * 0.01);
  const jitter = buffer.samples.reduce((max, s) => Math.max(max, s.receivedAt - s.serverAt - buffer.offset), 0);
  buffer.playbackDelay = Math.max(80, Math.min(180, Math.max(jitter + 1e3 / 30 + 10, (buffer.arrivalGap ?? 1e3 / 30) + 10)));
  return buffer;
}
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
function reconcileMotionBuffer(buffer, checkpoint, retiredStreams = [], now) {
  if (!buffer?.samples.length) return void 0;
  const last = buffer.samples.at(-1);
  const stream = checkpoint.motionStreamId, sequence = checkpoint.motionSequence;
  if (typeof stream !== "string" || !/^[A-Za-z0-9-]{16,80}$/.test(stream) || !Number.isSafeInteger(sequence) || Number(sequence) < 1) return buffer;
  if (stream !== buffer.streamId && retiredStreams.includes(stream)) return buffer;
  if (stream !== buffer.streamId || !Number.isSafeInteger(last.sequence)) return void 0;
  if (Number(sequence) < last.sequence) return buffer;
  if (sequence === last.sequence && Math.hypot(checkpoint.x - last.x, checkpoint.y - last.y) < 0.01) return buffer;
  if (Number(sequence) > last.sequence && Number.isFinite(now) && now - last.receivedAt <= 600) {
    buffer.pendingCanonical = {
      sequence: Number(sequence),
      x: checkpoint.x,
      y: checkpoint.y,
      expiresAt: Math.min(buffer.pendingCanonical?.expiresAt ?? Infinity, now + 150)
    };
    return buffer;
  }
  return void 0;
}

// r32-movement-work/working/native510-bb3a6cc689c6/lib/motion-preview.ts
var MOTION_SEND_FPS = 30;
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
  const current = previous ?? checked;
  const retiredStreams = previous && previous.streamId !== streamId && !previous.retiredStreams?.includes(streamId) ? [.../* @__PURE__ */ new Set([...previous.retiredStreams ?? [], previous.streamId])].slice(-8) : previous?.retiredStreams;
  return {
    ...current,
    checkpointFloors,
    retiredStreams,
    sequence: current.streamId === checked.streamId ? Math.max(current.sequence, checked.sequence) : current.sequence
  };
}
function checkpointCoversPreview(preview, message) {
  if (message.motionStreamId === preview.streamId) return Number(message.motionSequence) >= preview.sequence;
  return typeof message.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(message.motionStreamId) && !preview.retiredStreams?.includes(message.motionStreamId) && Number.isSafeInteger(message.motionSequence) && Number(message.motionSequence) >= 1;
}

// r32-movement-work/working/native510-bb3a6cc689c6/lib/remote-motion.ts
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
  const distance = Math.hypot(motion.targetX - motion.x, motion.targetY - motion.y);
  const maxSpeed = 600, response = livePreview ? 60 : 32, threshold = maxSpeed / response;
  const linearSeconds = Math.max(0, (distance - threshold) / maxSpeed);
  const remaining = buffered ? Math.max(0, distance - maxSpeed * elapsed) : elapsed <= linearSeconds ? Math.max(0, distance - maxSpeed * elapsed) : Math.min(distance, threshold) * Math.exp(-(elapsed - linearSeconds) * response);
  const follow = distance > 0 ? 1 - remaining / distance : 0;
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
export {
  MOTION_PROTOCOL,
  MOTION_SEND_FPS,
  advanceMotionCheckpoint,
  advanceRemoteMotion,
  appendMotionSample,
  bufferedMotionPosition,
  checkpointCoversPreview,
  readMotionPreview,
  reconcileMotionBuffer,
  updateRemoteMotionTarget
};
