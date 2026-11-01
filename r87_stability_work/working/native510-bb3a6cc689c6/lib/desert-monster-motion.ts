type Point = {x:number;y:number};
const bounds = [[0,0,645,646],[650,0,604,670],[0,646,650,608],[710,700,544,554]];
const cache = new WeakMap<HTMLImageElement,Map<string,HTMLCanvasElement>>();
// Mesh poses are rasterized once and reused. Rendering remains one image per monster.
function posePoint(x:number,y:number,slot:number,phase:number,mode:string):Point {
  const gait=mode==="walk"?Math.sin(phase*Math.PI*2):0;
  const alternate=mode==="walk"?Math.cos(phase*Math.PI*2):0;
  const breath=Math.sin(phase*Math.PI*2);
  const strike=mode==="attack"?Math.sin(phase*Math.PI):0;
  const side=x<.5?-1:1;
  const lower=Math.max(0,(y-.55)/.45);
  const edge=Math.min(1,Math.abs(x-.5)*3);
  let dx=0,dy=0;
  if(slot===0) {
    const tail=Math.max(0,(.53-y)/.53);
    dx=tail*(breath*.025+strike*.065);
    dy=tail*strike*.055;
    const legs=Math.max(0,y-.4)*edge;
    dx+=legs*Math.sin(phase*Math.PI*2+y*15)*.035*(mode==="walk"?1:0);
    dx+=lower*side*strike*.04;
    dy+=lower*edge*gait*side*.025;
  }else if(slot===1) {
    dx=(1-lower)*gait*.012;
    dy=-(1-lower)*Math.abs(gait)*.012;
    dy+=lower*Math.min(0,gait*side)*.05;
    dy+=edge*Math.max(0,y-.22)*(gait*side*.03-strike*.09);
    dx+=edge*side*strike*.035;
  }else if(slot===2) {
    dx=(1-lower)*(gait*.012-strike*.035);
    dy=lower*Math.min(0,gait*side)*.05;
    const sword=Math.max(0,(.45-x)/.45)*Math.max(0,y-.25);
    dx-=sword*strike*.12;dy-=sword*strike*.1;
    if(x>.58 && y>.4)dx+=Math.sin(phase*Math.PI*2+y*7)*.018;
  }else{
    const leg=lower*Math.min(1,Math.abs(x-.5)*4);
    dx=leg*(x<.5?gait:alternate)*.06;
    dy=leg*Math.min(0,x<.5?gait:alternate)*.05;
    dy-=(1-lower)*Math.abs(gait)*.018;
    const head=Math.max(0,(.5-x)/.5);
    dx-=head*strike*.065;dy+=head*strike*.025;
  }
  if(mode==="idle")dy+=(1-lower)*breath*.006;
  return {x:(x+dx)*136+12,y:(y+dy)*136+12};
}
function triangle(ctx:CanvasRenderingContext2D,img:HTMLImageElement,src:Point[],dst:Point[]) {
  const [a,b,c]=src,[p,q,r]=dst;
  const det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);
  const A=((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/det;
  const C=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/det;
  const B=((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/det;
  const D=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/det;
  const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3;
  const grow=(v:Point)=>{const n=Math.max(1,Math.hypot(v.x-cx,v.y-cy));return {x:v.x+(v.x-cx)/n*.35,y:v.y+(v.y-cy)/n*.35};};
  const [u,v,w]=[p,q,r].map(grow);
  ctx.save();ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);ctx.lineTo(w.x,w.y);ctx.closePath();ctx.clip();
  ctx.transform(A,B,C,D,p.x-A*a.x-C*a.y,p.y-B*a.x-D*a.y);ctx.drawImage(img,0,0);ctx.restore();
}
export function drawDesertMotion(ctx:CanvasRenderingContext2D,atlas:HTMLImageElement,slot:number,x:number,bottom:number,size:number,now:number,travel:number,moving:boolean,attack:number,directionX:number) {
  const mode=attack>0?"attack":moving?"walk":"idle";
  const frames=mode==="walk"?12:8;
  const phase=mode==="attack"?Math.min(.999,attack):mode==="walk"?((travel/(slot===0?66:100))%1):((now/2200+slot*.17)%1);
  const frame=Math.floor(phase*frames),key=`${slot}:${mode}:${frame}`;
  let poses=cache.get(atlas);if(!poses){poses=new Map();cache.set(atlas,poses);}
  let canvas=poses.get(key);
  if(!canvas){
    canvas=document.createElement("canvas");canvas.width=160;canvas.height=160;
    const off=canvas.getContext("2d");if(!off)return;
    const [sx,sy,sw,sh]=bounds[slot],cols=6,rows=8;
    const point=(u:number,v:number)=>({src:{x:sx+u*sw,y:sy+v*sh},dst:posePoint(u,v,slot,frame/(frames-1),mode)});
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const a=point(col/cols,row/rows),b=point((col+1)/cols,row/rows),c=point(col/cols,(row+1)/rows),d=point((col+1)/cols,(row+1)/rows);
      triangle(off,atlas,[a.src,b.src,c.src],[a.dst,b.dst,c.dst]);triangle(off,atlas,[b.src,d.src,c.src],[b.dst,d.dst,c.dst]);
    }
    poses.set(key,canvas);
  }
  const [, ,sw,sh]=bounds[slot],width=size*sw/sh;
  ctx.save();ctx.translate(x,bottom);if(directionX>.15)ctx.scale(-1,1);
  ctx.drawImage(canvas,-width/2-width*12/136,-size-size*12/136,width*160/136,size*160/136);ctx.restore();
}
