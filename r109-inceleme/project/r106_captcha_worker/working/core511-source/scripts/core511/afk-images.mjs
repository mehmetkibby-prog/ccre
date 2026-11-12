import {randomBytes,randomInt} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {AFK_RGBA_POOL} from './generated/afk-icon-pool.mjs';
export const AFK_IMAGE_TYPES=Object.freeze(['sword','shield','potion','bow']);
export const AFK_TARGET_LABELS=Object.freeze({sword:'KILICI',shield:'KALKANI',potion:'İKSİRİ',bow:'YAYI'});
export const AFK_IMAGE_SIZE=96;
const size=AFK_IMAGE_SIZE,stride=size*4,signature=Buffer.from([137,80,78,71,13,10,26,10]);
const pool=Object.fromEntries(AFK_IMAGE_TYPES.map(type=>[type,AFK_RGBA_POOL[type].map(value=>Buffer.from(value,'base64'))]));
const crcTable=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[i]=c;}
function chunk(type,data){const out=Buffer.allocUnsafe(data.length+12);out.writeUInt32BE(data.length,0);out.write(type,4,4,'ascii');data.copy(out,8);let crc=0xffffffff;for(let i=4;i<out.length-4;i++)crc=crcTable[(crc^out[i])&255]^(crc>>>8);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
const header=chunk('IHDR',ihdr),end=chunk('IEND',Buffer.alloc(0));
const clamp=n=>n<0?0:n>255?255:n;
// No source filename/type/seed/answer is encoded. Stored deflate blocks give
// EXACTLY equal byte lengths for every image, without PNG metadata chunks.
export function encodeAfkPng(pixels){
 const scan=Buffer.allocUnsafe((stride+1)*size);for(let y=0;y<size;y++){const at=y*(stride+1);scan[at]=0;pixels.copy(scan,at+1,y*stride,(y+1)*stride);}
 return Buffer.concat([signature,header,chunk('IDAT',deflateSync(scan,{level:0})),end]);
}
export function afkImageBytes(type){
 const models=pool[type];if(!models)return null;
 const source=models[randomInt(models.length)],seed=randomBytes(16);
 let a=seed.readUInt32LE(0),b=seed.readUInt32LE(4),c0=seed.readUInt32LE(8),d=seed.readUInt32LE(12);if(!(a|b|c0|d))d=1;
 const rand=()=>{const result=(a+d)>>>0,t=b<<9;c0^=a;d^=b;b^=c0;a^=d;c0^=t;d=d<<11|d>>>21;return result/4294967296;};
 // Independent 128-bit CSPRNG seed per image. Never use/expose the public
 // nonce as a seed. The fast PRNG supplies decoration, never answers.
 const angle=(rand()*40-20)*Math.PI/180,scale=.8+rand()*.35,cos=Math.cos(angle)/scale,sin=Math.sin(angle)/scale,tx=(rand()-.5)*6,ty=(rand()-.5)*6;
 const hue=(rand()*50-25)*Math.PI/180,c=Math.cos(hue),s=Math.sin(hue),bright=.94+rand()*.12,contrast=.94+rand()*.12;
 const m=[.213+c*.787-s*.213,.715-c*.715-s*.715,.072-c*.072+s*.928,.213-c*.213+s*.143,.715+c*.285+s*.140,.072-c*.072-s*.283,.213-c*.213-s*.787,.715-c*.715+s*.715,.072+c*.928+s*.072];
 const bg=[14+rand()*18,23+rand()*20,22+rand()*20],tilt=rand()*Math.PI*2,bx=Math.cos(tilt),by=Math.sin(tilt),pattern=rand()*8+7,phase=rand()*pattern,light=rand()*6+3;
 const pixels=Buffer.allocUnsafe(size*stride);
 for(let y=0,at=0;y<size;y++)for(let x=0;x<size;x++,at+=4){
  const dx=x-47.5-tx,dy=y-47.5-ty,sx=cos*dx+sin*dy+47.5,sy=-sin*dx+cos*dy+47.5;
  const noise=(rand()-.5)*4,gradient=(x*bx+y*by)/96*light,lines=((x+y+phase)%pattern)<1?1.6:0;
  let br=bg[0]+gradient+noise+lines,bg2=bg[1]+gradient+noise+lines,bb=bg[2]+gradient+noise+lines;
  if(sx>=0&&sy>=0&&sx<95&&sy<95){
   const ix=sx|0,iy=sy|0,fx=sx-ix,fy=sy-iy,i=iy*stride+ix*4,w0=(1-fx)*(1-fy),w1=fx*(1-fy),w2=(1-fx)*fy,w3=fx*fy;
   const r=source[i]*w0+source[i+4]*w1+source[i+stride]*w2+source[i+stride+4]*w3,g=source[i+1]*w0+source[i+5]*w1+source[i+stride+1]*w2+source[i+stride+5]*w3,b=source[i+2]*w0+source[i+6]*w1+source[i+stride+2]*w2+source[i+stride+6]*w3;
   const a=(source[i+3]*w0+source[i+7]*w1+source[i+stride+3]*w2+source[i+stride+7]*w3)/255,rest=1-a;
   br=br*rest+clamp(((r*m[0]+g*m[1]+b*m[2]-128)*contrast+128)*bright+noise)*a;
   bg2=bg2*rest+clamp(((r*m[3]+g*m[4]+b*m[5]-128)*contrast+128)*bright+noise)*a;
   bb=bb*rest+clamp(((r*m[6]+g*m[7]+b*m[8]-128)*contrast+128)*bright+noise)*a;
  }
  pixels[at]=clamp(br);pixels[at+1]=clamp(bg2);pixels[at+2]=clamp(bb);pixels[at+3]=255;
 }
 return encodeAfkPng(pixels);
}
