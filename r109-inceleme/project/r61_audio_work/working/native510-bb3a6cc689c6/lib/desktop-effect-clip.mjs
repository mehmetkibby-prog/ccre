// Chromium may allocate shadow/filter work over the current canvas clip even
// for a tiny primitive. Bound each decorative effect, not the whole actor.
// The caller owns save/restore. A separate Path2D preserves the current path;
// integer device bounds retain fractional geometry and original compositing.
export function clipDesktopEffect(ctx,x,y,width,height,maxBlur) {
  if(typeof Path2D==='undefined') return false;
  const m=ctx.getTransform();
  const filter=ctx.filter||'none';
  if(![m.a,m.b,m.c,m.d,m.e,m.f,x,y,width,height,maxBlur,ctx.shadowBlur,ctx.shadowOffsetX,ctx.shadowOffsetY].every(Number.isFinite)
    || width<=0 || height<=0 || maxBlur<0
    || (filter!=='none'&&!/^(?:(?:saturate|brightness|contrast)\([\d.]+\)\s*)+$/.test(filter))) return false;
  const px=m.a*x+m.c*y+m.e,py=m.b*x+m.d*y+m.f;
  const ax=m.a*width,ay=m.b*width,bx=m.c*height,by=m.d*height;
  const pad=Math.ceil(3*Math.max(maxBlur,ctx.shadowBlur)+2);
  const left=Math.floor(Math.min(px,px+ax,px+bx,px+ax+bx)+Math.min(0,ctx.shadowOffsetX)-pad);
  const top=Math.floor(Math.min(py,py+ay,py+by,py+ay+by)+Math.min(0,ctx.shadowOffsetY)-pad);
  const right=Math.ceil(Math.max(px,px+ax,px+bx,px+ax+bx)+Math.max(0,ctx.shadowOffsetX)+pad);
  const bottom=Math.ceil(Math.max(py,py+ay,py+by,py+ay+by)+Math.max(0,ctx.shadowOffsetY)+pad);
  const path=new Path2D();path.rect(left,top,right-left,bottom-top);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clip(path);
  ctx.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);
  return true;
}
