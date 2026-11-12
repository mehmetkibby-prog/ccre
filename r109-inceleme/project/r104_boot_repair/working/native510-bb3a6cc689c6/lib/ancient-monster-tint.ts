// Chrome rasterizes hue/sepia canvas filters on every draw. The ancient map
// shares the desert animation atlas, so bake each visible frame once instead.
const filters = [
  "hue-rotate(316deg) saturate(1.18)",
  "hue-rotate(65deg) saturate(.74)",
  "grayscale(.5) sepia(.35)",
] as const;

const tintedFrames = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

export function ancientMonsterTintCrop(
  image: HTMLImageElement,
  species: number,
  sx: number,
  sy: number,
  width: number,
  height: number,
): HTMLCanvasElement | null {
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) return null;
  let frames = tintedFrames.get(image);
  if (!frames) {
    frames = new Map();
    tintedFrames.set(image, frames);
  }
  const key = `${species}:${sx}:${sy}:${width}:${height}`;
  const cached = frames.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.filter = filters[Math.max(0, Math.min(2, species))];
    ctx.drawImage(image, sx, sy, width, height, 0, 0, width, height);
    ctx.filter = "none";
  } catch {
    return null;
  }
  frames.set(key, canvas);
  return canvas;
}
