// Reuse rasterized decorative light instead of repeatedly running canvas
// filters/shadow blurs. Keep the cache bounded through map/equipment changes.
export function createMobileEffectCache(
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
  pixelLimit = 6_000_000,
) {
  const entries = new Map<string, HTMLCanvasElement>();
  let pixels = 0;
  return (key: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    const cached = entries.get(key);
    if (cached) { entries.delete(key); entries.set(key, cached); return cached; }
    const w = Math.ceil(width), h = Math.ceil(height);
    if (w < 1 || h < 1 || w * h > pixelLimit) return null;
    const canvas = createCanvas(); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return null;
    paint(ctx);
    while (pixels + w * h > pixelLimit || entries.size >= 160) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      const removed = entries.get(oldest)!;
      pixels -= removed.width * removed.height; entries.delete(oldest);
    }
    entries.set(key, canvas); pixels += w * h;
    return canvas;
  };
}
