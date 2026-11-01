// Mobile-only soft lights: rasterize once and reuse instead of constructing and
// filling a large radial gradient on every frame. Bound memory across map swaps.
export function createMobileLightCache(createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")) {
  const textures = new Map<string, HTMLCanvasElement>();
  return (rgb: string, primary: boolean) => {
    const key = `${rgb}:${primary}`;
    const cached = textures.get(key);
    if (cached) return cached;
    const canvas = createCanvas();
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const glow = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
    glow.addColorStop(0, `rgba(${rgb},${primary ? .16 : .095})`);
    glow.addColorStop(.42, `rgba(${rgb},${primary ? .065 : .035})`);
    glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 128, 128);
    if (textures.size >= 24) textures.delete(textures.keys().next().value!);
    textures.set(key, canvas);
    return canvas;
  };
}
