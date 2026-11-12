// Shared wire limits; no credentials or database authority live in the browser.
export const MOVEMENT_PROTOCOL = 'durable-movement-v1';
export const MOVEMENT_STREAM_PATH = '/internal/movement-stream';
export const MOVEMENT_BATCH_LIMIT = 32;
export const MOVEMENT_FRAME_LIMIT = 196608;

export function movementPayload(value) {
  if (!value || typeof value !== 'object' || !Number.isFinite(value.x) || !Number.isFinite(value.y)
    || typeof value.area !== 'string' || value.area.length > 96
    || !Number.isSafeInteger(value.basePositionRevision) || value.basePositionRevision < 0
    || !Array.isArray(value.path) || value.path.length < 1 || value.path.length > 64
    || value.path.some(point => !Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite))) return null;
  const result = {x:value.x,y:value.y,area:value.area,path:value.path,basePositionRevision:value.basePositionRevision};
  if (value.motionStreamId !== undefined || value.motionSequence !== undefined) {
    if (typeof value.motionStreamId !== 'string' || !/^[A-Za-z0-9-]{16,80}$/.test(value.motionStreamId)
      || !Number.isSafeInteger(value.motionSequence) || value.motionSequence < 1) return null;
    result.motionStreamId=value.motionStreamId;result.motionSequence=value.motionSequence;
  }
  return result;
}
