// Mobile heat protection keeps text independent of the scene's pixel budget.
// Only this canvas instance is intercepted; offscreen artwork and PC are untouched.
export function createMobileTextLayer(scene: CanvasRenderingContext2D, canvas: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')) {
  const text = canvas.getContext('2d');
  if (!text) return null;
  const fill = scene.fillText, stroke = scene.strokeText;
  let active = false, ratio = 1;
  const stamps = new Map<string,{canvas:HTMLCanvasElement;x:number;y:number;width:number;height:number}>();
  let stampPixels = 0;
  const paint = (outlined: boolean, value: string, x: number, y: number, maxWidth?: number) => {
    if (!active) {
      const original = outlined ? stroke : fill;
      if (maxWidth === undefined) original.call(scene, value, x, y);
      else original.call(scene, value, x, y, maxWidth);
      return;
    }
    const m = scene.getTransform();
    text.setTransform(m.a * ratio, m.b * ratio, m.c * ratio, m.d * ratio, m.e * ratio, m.f * ratio);
    text.font = scene.font;
    text.textAlign = scene.textAlign;
    text.textBaseline = scene.textBaseline;
    text.direction = scene.direction;
    text.globalAlpha = scene.globalAlpha;
    text.fillStyle = scene.fillStyle;
    text.strokeStyle = scene.strokeStyle;
    text.lineWidth = scene.lineWidth;
    text.lineJoin = scene.lineJoin;
    text.miterLimit = scene.miterLimit;
    // A small, static outline survives dark backgrounds without a blurred glow.
    text.shadowBlur = 0;
    text.globalCompositeOperation = 'source-over';
    const color = outlined ? scene.strokeStyle : scene.fillStyle;
    // Repeated names are rasterized once, not typeset on every animation frame.
    // Rare gradient/max-width labels keep the browser's exact text semantics.
    if (maxWidth === undefined && typeof color === 'string') {
      const scale = Math.max(.5, Math.min(4, Math.ceil(Math.hypot(m.a,m.b) * ratio * 4) / 4));
      const key = JSON.stringify([value,scene.font,scene.textAlign,scene.textBaseline,scene.direction,color,outlined,outlined?scene.lineWidth:0,scene.lineJoin,scale]);
      let stamp = stamps.get(key);
      if (!stamp) {
        const metrics = scene.measureText(value);
        const padding = (outlined ? scene.lineWidth / 2 : 0) + 2;
        const left = -metrics.actualBoundingBoxLeft-padding, top = -metrics.actualBoundingBoxAscent-padding;
        const w = Math.ceil((metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight+padding*2)*scale);
        const h = Math.ceil((metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent+padding*2)*scale);
        if (Number.isFinite(w*h) && w>0 && h>0 && w*h<=160_000) {
          const bitmap = createCanvas(); bitmap.width=w; bitmap.height=h;
          const g=bitmap.getContext('2d');
          if(g) {
            g.setTransform(scale,0,0,scale,-left*scale,-top*scale);
            g.font=scene.font;g.textAlign=scene.textAlign;g.textBaseline=scene.textBaseline;g.direction=scene.direction;
            g.fillStyle=scene.fillStyle;g.strokeStyle=scene.strokeStyle;g.lineWidth=scene.lineWidth;g.lineJoin=scene.lineJoin;g.miterLimit=scene.miterLimit;
            if(outlined)g.strokeText(value,0,0);else g.fillText(value,0,0);
            while(stamps.size>=512 || stampPixels+w*h>2_000_000) {
              const oldest=stamps.keys().next().value;if(oldest===undefined)break;
              const removed=stamps.get(oldest)!;stampPixels-=removed.canvas.width*removed.canvas.height;stamps.delete(oldest);
            }
            stamp={canvas:bitmap,x:left,y:top,width:w/scale,height:h/scale};
            stamps.set(key,stamp);stampPixels+=w*h;
          }
        }
      } else {stamps.delete(key);stamps.set(key,stamp);}
      if(stamp){text.drawImage(stamp.canvas,x+stamp.x,y+stamp.y,stamp.width,stamp.height);return;}
    }
    const method = outlined ? text.strokeText : text.fillText;
    if (maxWidth === undefined) method.call(text, value, x, y);
    else method.call(text, value, x, y, maxWidth);
  };
  scene.fillText = (value, x, y, maxWidth) => paint(false, value, x, y, maxWidth);
  scene.strokeText = (value, x, y, maxWidth) => paint(true, value, x, y, maxWidth);
  return {
    begin(enabled: boolean, width: number, height: number, deviceRatio: number, sceneRatio: number) {
      active = enabled;
      canvas.hidden = !enabled;
      if (!enabled) {
        // Release the high-resolution backing store when the option is off.
        if (canvas.width !== 1 || canvas.height !== 1) { canvas.width = 1; canvas.height = 1; }
        stamps.clear();stampPixels=0;
        return;
      }
      // Text alone can stay sharp without redrawing the whole world at this DPR.
      const dpr = Math.max(1, Math.min(deviceRatio || 1, 2.5, Math.sqrt(3_000_000 / Math.max(1, width * height))));
      const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ratio = dpr / sceneRatio;
      text.setTransform(1, 0, 0, 1, 0, 0);
      text.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.opacity = '1';
    },
    fade(opacity: number) { if (active) canvas.style.opacity = String(Math.max(0, Math.min(1, opacity))); },
    dispose() { scene.fillText = fill; scene.strokeText = stroke; stamps.clear();stampPixels=0;canvas.hidden = true; canvas.width = 1; canvas.height = 1; },
  };
}
