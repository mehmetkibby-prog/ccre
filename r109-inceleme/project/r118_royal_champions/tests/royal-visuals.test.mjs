import test from 'node:test';
import assert from 'node:assert/strict';
import {ROYAL_MEDIA_R118,royalItemIconR118,drawRoyalArmorFxR118,drawRoyalWeaponFxR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-visuals-r118.mjs';
function context(){
 const stack=[];const c={draws:0,saves:0,restores:0,globalAlpha:.93,filter:'initial',shadowBlur:2,globalCompositeOperation:'source-over',fillStyle:'',strokeStyle:'',lineWidth:3,
 save(){this.saves++;stack.push([this.globalAlpha,this.filter,this.shadowBlur,this.globalCompositeOperation,this.strokeStyle,this.lineWidth]);},
 restore(){this.restores++;[this.globalAlpha,this.filter,this.shadowBlur,this.globalCompositeOperation,this.strokeStyle,this.lineWidth]=stack.pop();},
 drawImage(){this.draws++;},createRadialGradient(){return {addColorStop(){}};},fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},ellipse(){}};return c;
}
test('all royal icons and four monster assets are immutable WebP URLs, ordinary materials stay unmodified',()=>{
 assert.equal(Object.keys(ROYAL_MEDIA_R118.icons).length,9);
 for(const url of [ROYAL_MEDIA_R118.map,ROYAL_MEDIA_R118.hero,ROYAL_MEDIA_R118.weapons,ROYAL_MEDIA_R118.armor,...Object.values(ROYAL_MEDIA_R118.icons),...Object.values(ROYAL_MEDIA_R118.monsters)])assert.match(url,/-r118-[a-f0-9]{16}\.webp$/);
 assert.equal(Object.keys(ROYAL_MEDIA_R118.monsters).length,4);
 assert.equal(royalItemIconR118('weapon','avci'),ROYAL_MEDIA_R118.icons.weapon_avci);
 assert.equal(royalItemIconR118('emerald_dust'),ROYAL_MEDIA_R118.icons.emerald_dust);
 assert.equal(royalItemIconR118('gems'),null);
});
test('50 visible royal players share a bounded atlas and draw budget without leaking canvas state',()=>{
 const prior=globalThis.document;let canvases=0;
 globalThis.document={createElement(name){assert.equal(name,'canvas');canvases++;return {getContext(){return context();}};}};
 try{
  const ctx=context();
  for(let i=0;i<50;i++){
   drawRoyalArmorFxR118(ctx,i*10,100,1000,1,i===49);
   drawRoyalWeaponFxR118(ctx,i*10,20,30,100,1000,1,'muhafiz',i===49);
  }
  assert.ok(ctx.draws<=96,`shared frame exceeded budget ${ctx.draws}`);
  assert.equal(canvases,1);assert.equal(ctx.saves,ctx.restores);
  assert.equal(ctx.globalAlpha,.93);assert.equal(ctx.filter,'initial');assert.equal(ctx.shadowBlur,2);assert.equal(ctx.globalCompositeOperation,'source-over');
  const before=ctx.draws;drawRoyalArmorFxR118(ctx,0,100,1100,1,true);assert.ok(ctx.draws>before,'new frame resets budget');
  const low=context();for(let i=0;i<50;i++){drawRoyalArmorFxR118(low,0,100,1250,.5,i===49);drawRoyalWeaponFxR118(low,0,0,30,100,1250,.5,'muhafiz',i===49);}assert.ok(low.draws<=48,'reduced quality has separate half-size shared budget');
  const old=ctx.draws;drawRoyalArmorFxR118(ctx,0,100,1200,0,true);drawRoyalArmorFxR118(ctx,NaN,100,1200,1,true);drawRoyalWeaponFxR118(ctx,0,0,-1,10,1200,1);assert.equal(ctx.draws,old);
 }finally{globalThis.document=prior;}
});
