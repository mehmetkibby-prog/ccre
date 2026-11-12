// Only character/monster names use this treatment. UI, damage and other text keep their styles.
export function drawNameLabel(ctx:CanvasRenderingContext2D,name:string,x:number,y:number){
 const transform=ctx.getTransform();
 // The canvas backing scale is removed by the caller's CSS/device ratio.
 const backing=ctx.canvas.width/Math.max(1,ctx.canvas.clientWidth||ctx.canvas.width);
 const zoom=Math.max(.1,Math.hypot(transform.a,transform.b)/backing);
 const size=Math.max(12,Math.min(72,11/zoom));
 ctx.font=`600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
 ctx.save();ctx.shadowBlur=0;ctx.strokeStyle='rgba(3,10,7,.94)';ctx.lineWidth=2.5/zoom;ctx.lineJoin='round';
 ctx.strokeText(name,x,y);ctx.fillText(name,x,y);ctx.restore();
}
