import type { SpritePainter } from './mobile-sprite-cache';
import { createDesktopAffineSpritePainter } from './desktop-affine-sprite.mjs';

// Desktop keeps every effect and the actual backing-store resolution. Only the
// expensive, invariant atlas/filter/shadow raster is reused; pose and glints
// still animate on every presented frame. Rotation/reflection do not change an
// isotropic shadow. Animated affine poses use a bounded device-space surface.
export function createDesktopSpritePainter(
  texture: (key: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) => HTMLCanvasElement | null,
  createCanvas?: () => HTMLCanvasElement,
): SpritePainter {
  const paintAffine=createDesktopAffineSpritePainter(createCanvas,1_048_576,texture);
  return (ctx, image, sx, sy, sw, sh, x, y, width, height) => {
    const m = ctx.getTransform();
    const rawScale = Math.hypot(m.a, m.b), otherScale = Math.hypot(m.c, m.d);
    if (!image.complete || !image.naturalWidth || !image.naturalHeight || !(rawScale > 0)) return false;
    if (Math.abs(rawScale - otherScale) > 1e-8
      || Math.abs(m.a * m.c + m.b * m.d) > 1e-8
      || ctx.shadowOffsetX || ctx.shadowOffsetY)
      return paintAffine(ctx,image,sx,sy,sw,sh,x,y,width,height,m);
    // Ignore floating-point rotation noise, not actual resolution changes.
    const scale = Math.round(rawScale * 1e8) / 1e8;
    const blur = ctx.shadowBlur, pad = Math.ceil(blur * 3 + 2);
    const w = Math.ceil(width * scale) + pad * 2;
    const h = Math.ceil(height * scale) + pad * 2;
    const filter = ctx.filter || 'none';
    // Arbitrary CSS filters may extend outside our shadow padding.
    if (filter !== 'none' && !/^(?:(?:saturate|brightness|contrast)\([\d.]+\)\s*)+$/.test(filter)) return false;
    const alpha = ctx.globalAlpha;
    const composite = ctx.globalCompositeOperation;
    if (composite !== "source-over" && composite !== "lighter") return false;
    const key = [image.src, image.naturalWidth, image.naturalHeight, sx, sy, sw, sh,
      width, height, scale, blur, ctx.shadowColor, filter, alpha, composite, ctx.imageSmoothingEnabled, ctx.imageSmoothingQuality].join(':');
    const bitmap = texture(key, w, h, g => {
      g.setTransform(scale, 0, 0, scale, pad, pad);
      g.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
      g.imageSmoothingQuality = ctx.imageSmoothingQuality;
      g.filter = filter;
      g.shadowBlur = blur; g.shadowColor = ctx.shadowColor;
      g.globalAlpha = alpha; g.globalCompositeOperation = composite;
      g.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
    });
    if (!bitmap) return false;
    ctx.save();
    ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
    ctx.drawImage(bitmap, x - pad / scale, y - pad / scale, w / scale, h / scale);
    ctx.restore();
    return true;
  };
}
