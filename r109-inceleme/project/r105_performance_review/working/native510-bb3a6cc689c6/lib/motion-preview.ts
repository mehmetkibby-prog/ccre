export const MOTION_SEND_FPS = 30;
export const MOTION_PROTOCOL = "validated-motion-v1";
export type MotionWatermark = { sequence: number; streamId: string; serverAt: number; retiredStreams?: string[]; checkpointFloors?: Record<string, number> };
export type MotionPreview = MotionWatermark & { x: number; y: number; hpRevision: number; expiresAt: number; presentationAt?: number };

export function readMotionPreview(message: Record<string, unknown>, previous: MotionWatermark | undefined, now: number): MotionPreview | null {
  const x = Number(message.x), y = Number(message.y), sequence = Number(message.sequence), serverAt = Number(message.serverAt);
  const streamId = typeof message.streamId === "string" ? message.streamId : "";
  const hpRevision = Number(message.hpRevision);
  if (message.protocol !== MOTION_PROTOCOL || !/^[A-Za-z0-9-]{16,80}$/.test(streamId)
    || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(serverAt)
    || !Number.isSafeInteger(sequence) || sequence < 1 || !Number.isSafeInteger(hpRevision) || hpRevision < 0) return null;
  if (previous && (sequence <= (previous.checkpointFloors?.[streamId] ?? 0) || previous.retiredStreams?.includes(streamId)
    || (previous.streamId === streamId ? sequence <= previous.sequence : serverAt <= previous.serverAt))) return null;
  const retiredStreams = previous && previous.streamId !== streamId
    ? [...(previous.retiredStreams ?? []), previous.streamId].slice(-8) : previous?.retiredStreams;
  const presentationAt = typeof message.presentationAt === "number" && Number.isFinite(message.presentationAt)
    && message.presentationAt >= serverAt - 1000 && message.presentationAt <= serverAt + 250 ? message.presentationAt : undefined;
  return { x, y, sequence, streamId, serverAt, hpRevision, retiredStreams,
    ...(presentationAt === undefined ? {} : { presentationAt }),
    checkpointFloors: previous?.checkpointFloors, expiresAt: now + 1500 };
}

// Keep this watermark after a preview expires or is covered by a checkpoint:
// the second transport can deliver an older frame after the first one confirms it.
export function advanceMotionCheckpoint(previous: MotionWatermark | undefined, message: Record<string, unknown>): MotionWatermark | undefined {
  // Only VDS frames select a new stream. Worker timestamps are from another clock.
  // Snapshot acknowledgements need no coordinates. Requiring x/y here silently
  // discarded their sequence floors and let late previews rewind a stopped peer.
  const streamId = message.motionStreamId;
  const sequence = message.motionSequence;
  if (typeof streamId !== "string" || !/^[A-Za-z0-9-]{16,80}$/.test(streamId)
    || !Number.isSafeInteger(sequence) || Number(sequence) < 1) return previous;
  const checked = { streamId, sequence: Number(sequence), serverAt: 0 };
  const checkpointFloors = { ...previous?.checkpointFloors,
    [checked.streamId]: Math.max(previous?.checkpointFloors?.[checked.streamId] ?? 0, checked.sequence) };
  const keys = Object.keys(checkpointFloors);
  for (const key of keys.slice(0, Math.max(0, keys.length - 16))) delete checkpointFloors[key];
  const current = previous ?? checked;
  const retiredStreams = previous && previous.streamId !== streamId && !previous.retiredStreams?.includes(streamId)
    ? [...new Set([...(previous.retiredStreams ?? []), previous.streamId])].slice(-8) : previous?.retiredStreams;
  return { ...current, checkpointFloors, retiredStreams,
    sequence: current.streamId === checked.streamId ? Math.max(current.sequence, checked.sequence) : current.sequence };
}

export function checkpointCoversPreview(preview: MotionPreview, message: Record<string, unknown>) {
  if (message.motionStreamId === preview.streamId) return Number(message.motionSequence) >= preview.sequence;
  // A newer canonical checkpoint can arrive before the new stream's first frame.
  return typeof message.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(message.motionStreamId)
    && !preview.retiredStreams?.includes(message.motionStreamId)
    && Number.isSafeInteger(message.motionSequence) && Number(message.motionSequence) >= 1;
}
