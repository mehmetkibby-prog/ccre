import {createHmac,randomBytes,randomFillSync} from 'node:crypto';
import {r35Options} from './r35-options.mjs';
import {demand} from './contract.mjs';
const emptyBlock=Buffer.alloc(0);
const seedPool=Buffer.alloc(8192);let seedOffset=seedPool.length;

// Seeds are created by the trusted channel, never accepted from a game client.
// A durable operation carries its seed so replay uses exactly the same rolls.
// Integer rejection sampling preserves crypto.randomInt's uniform distribution.
export class OperationRandom {
 constructor(seed=OperationRandom.seed()){
  demand(typeof seed==='string'&&/^[a-f0-9]{64}$/.test(seed),'invalid_operation_seed');
  this.seed=seed;this.key=Buffer.from(seed,'hex');this.block=emptyBlock;this.offset=0;this.counter=0;
 }
 word(){
  // Consume the EXACT same four little-endian stream bytes without creating
  // a4-byte Buffer per roll. Arbitrary public bytes() calls can straddle blocks.
  if(this.offset===this.block.length){this.block=createHmac('sha256',this.key).update('core511:'+this.counter++).digest();this.offset=0;}
  if(this.offset+4<=this.block.length){const value=this.block.readUInt32LE(this.offset);this.offset+=4;return value;}
  let value=0;for(let i=0;i<4;i++){if(this.offset===this.block.length){this.block=createHmac('sha256',this.key).update('core511:'+this.counter++).digest();this.offset=0;}value|=this.block[this.offset++]<<(8*i);}return value>>>0;
 }
 static seed(){if(!r35Options.channelMicro)return randomBytes(32).toString('hex');if(seedOffset===seedPool.length){randomFillSync(seedPool);seedOffset=0;}const seed=seedPool.toString('hex',seedOffset,seedOffset+32);seedOffset+=32;return seed;}
 bytes(length){
  const output=Buffer.allocUnsafe(length);let n=0;
  while(n<length){
   if(this.offset===this.block.length){this.block=createHmac('sha256',this.key).update('core511:'+this.counter++).digest();this.offset=0;}
   const take=Math.min(length-n,this.block.length-this.offset);this.block.copy(output,n,this.offset,this.offset+take);n+=take;this.offset+=take;
  }
  return output;
 }
 integer(min,max){
  if(max===undefined){max=min;min=0;}
  demand(Number.isSafeInteger(min)&&Number.isSafeInteger(max)&&max>min&&max-min<=2**32,'invalid_random_range');
  const span=max-min,limit=Math.floor(2**32/span)*span;let value;
  do{value=this.word();}while(value>=limit);
  return min+value%span;
 }
 roll(){return this.integer(1000000)/1000000;}
 uuid(){const b=this.bytes(16);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=b.toString('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
}
