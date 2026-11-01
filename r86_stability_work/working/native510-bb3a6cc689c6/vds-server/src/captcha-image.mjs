import {randomInt} from 'node:crypto';
import {deflateSync} from 'node:zlib';

// Normalized pen strokes, not a browser/OS font. The renderer needs no font files.
const paths = [
 [[[0.5,0],[0.06,0.01],[0.04,0.35],[0.04,0.51]],[[0.04,0.51],[0.04,0.93],[0.28,1],[0.52,1]],[[0.52,1],[0.98,0.99],[0.98,0.67],[0.97,0.47]],[[0.97,0.47],[0.97,0.05],[0.75,0],[0.5,0]]],
 [[[0.14,0.23],[0.4,0.07],[0.53,0.01],[0.56,0]],[[0.56,0],[0.56,0.33],[0.56,0.7],[0.56,1]],[[0.15,1],[0.4,1],[0.65,1],[0.94,1]]],
 [[[0.04,0.21],[0.11,-0.07],[0.83,-0.07],[0.95,0.19]],[[0.95,0.19],[1.06,0.47],[0.26,0.76],[0.02,0.99]],[[0.02,0.99],[0.28,0.99],[0.66,0.99],[0.98,0.99]]],
 [[[0.04,0.08],[0.33,-0.08],[1.01,0.02],[0.91,0.27]],[[0.91,0.27],[0.86,0.48],[0.65,0.48],[0.41,0.48]],[[0.41,0.48],[0.98,0.39],[1.12,0.9],[0.75,0.98]],[[0.75,0.98],[0.5,1.07],[0.18,0.97],[0.04,0.91]]],
 [[[0.8,0],[0.5,0.15],[0.23,0.43],[0.01,0.65]],[[0.01,0.65],[0.37,0.65],[0.69,0.65],[1,0.65]],[[0.8,0],[0.8,0.38],[0.8,0.72],[0.8,1]]],
 [[[0.96,0],[0.66,0],[0.33,0],[0.11,0]],[[0.11,0],[0.09,0.13],[0.06,0.32],[0.04,0.47]],[[0.04,0.47],[0.47,0.33],[0.88,0.37],[0.95,0.62]],[[0.95,0.62],[1.11,1.03],[0.4,1.11],[0.04,0.92]]],
 [[[0.88,0.07],[0.31,-0.2],[0.01,0.42],[0.05,0.71]],[[0.05,0.71],[0.14,1.19],[0.89,1.03],[0.96,0.74]],[[0.96,0.74],[1.02,0.4],[0.39,0.35],[0.05,0.62]]],
 [[[0.02,0],[0.33,0],[0.67,0],[0.99,0]],[[0.99,0],[0.69,0.27],[0.42,0.62],[0.32,1]]],
 [[[0.5,0],[0.02,0],[0.01,0.31],[0.23,0.42]],[[0.23,0.42],[0.4,0.49],[0.99,0.6],[0.95,0.79]],[[0.95,0.79],[0.94,1.04],[0.07,1.14],[0.04,0.78]],[[0.04,0.78],[0.03,0.58],[0.64,0.46],[0.82,0.36]],[[0.82,0.36],[1.1,0.2],[0.91,0],[0.5,0]]],
 [[[0.94,0.37],[0.65,0.65],[0.08,0.61],[0.04,0.29]],[[0.04,0.29],[-0.03,-0.03],[0.78,-0.1],[0.93,0.22]],[[0.93,0.22],[1.12,0.63],[0.57,1.1],[0.16,0.96]]]
];
const rnd=(min,max)=>min+randomInt(1_000_000)/1_000_000*(max-min);
function crc(b){let c=0xffffffff;for(const n of b){c^=n;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);}
export function captchaPng(answer){
 if(!/^\d{6}$/.test(answer)) throw new TypeError('Expected six digits');
 const w=252,h=88,scale=2,sw=w*scale,sh=h*scale;
 const pixels=new Uint8Array(sw*sh*3);
 const phase=rnd(0,Math.PI*2),phase2=rnd(0,Math.PI*2),phase3=rnd(0,Math.PI*2);
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
   const i=(y*sw+x)*3,grain=((x*13+y*17)%7)-3,shade=Math.round(239+Math.sin(x/30+phase)*5+Math.sin(y/24+phase2)*4+grain);
   pixels[i]=shade;pixels[i+1]=Math.min(255,shade+3);pixels[i+2]=Math.min(255,shade+5);
 }
 const dab=(x,y,r,color)=>{
   x*=scale;y*=scale;r*=scale;
   const minX=Math.max(0,Math.floor(x-r)),maxX=Math.min(sw-1,Math.ceil(x+r)),minY=Math.max(0,Math.floor(y-r)),maxY=Math.min(sh-1,Math.ceil(y+r));
   for(let dy=minY;dy<=maxY;dy++)for(let dx=minX;dx<=maxX;dx++)if((dx-x)**2+(dy-y)**2<=r*r){const i=(dy*sw+dx)*3;pixels[i]=color[0];pixels[i+1]=color[1];pixels[i+2]=color[2];}
 };
 // A few thin, continuous curves can cross glyphs without masking digit counters.
 const interference=(color,thickness)=>{
   const baseline=rnd(22,68),amplitude=rnd(5,12),wave=rnd(18,43),offset=rnd(0,7);
   for(let x=3;x<w-3;x+=0.4)dab(x,baseline+Math.sin(x/wave+offset)*amplitude,thickness,color);
 };
 for(let i=0;i<4;i++)interference([randomInt(120,170),randomInt(130,180),randomInt(135,185)],rnd(.35,.6));
 [...answer].forEach((digit,k)=>{
   const width=rnd(20,25),height=rnd(36,44),centerX=25+k*40+rnd(-3,3),centerY=44+rnd(-7,7),angle=rnd(-.20,.20),shear=rnd(-.12,.12),stroke=rnd(1.65,2.1);
   const ink=[randomInt(25,65),randomInt(35,75),randomInt(40,80)];
   const cos=Math.cos(angle),sin=Math.sin(angle);
   const transform=(u,v)=>{
     const px=(u-.5)*width+(v-.5)*height*shear,py=(v-.5)*height;
     const x=centerX+px*cos-py*sin,y=centerY+px*sin+py*cos;
     return [x+Math.sin(y/14+phase)*1.9+Math.sin(x/25+phase2)*1.1,y+Math.sin(x/19+phase3)*1.5];
   };
   for(const curve of paths[+digit])for(let step=0;step<=70;step++){
     const t=step/70,q=1-t;
     const u=q*q*q*curve[0][0]+3*q*q*t*curve[1][0]+3*q*t*t*curve[2][0]+t*t*t*curve[3][0];
     const v=q*q*q*curve[0][1]+3*q*q*t*curve[1][1]+3*q*t*t*curve[2][1]+t*t*t*curve[3][1];
     const [x,y]=transform(u,v);dab(x,y,stroke,ink);
   }
 });
 for(let i=0;i<2;i++)interference([randomInt(80,115),randomInt(90,125),randomInt(95,130)],rnd(.35,.55));
 const raw=Buffer.alloc((w*3+1)*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++){
   let sum=0;for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++)sum+=pixels[((y*scale+sy)*sw+x*scale+sx)*3+c];
   raw[y*(w*3+1)+1+x*3+c]=Math.round(sum/(scale*scale));
 }
 const head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw,{level:3})),chunk('IEND',Buffer.alloc(0))]);
}
