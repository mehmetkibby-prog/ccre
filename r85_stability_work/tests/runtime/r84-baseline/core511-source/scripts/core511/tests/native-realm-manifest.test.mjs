import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateRealmManifest,publicRealmCatalog} from '../generated/native-realm-manifest.mjs';
import {PROTOCOL} from '../contract.mjs';
import {hash} from './helpers.mjs';
const row=(id,base,core=false)=>({id,name:id,status:'open',registrationOpen:true,channels:core?4:3,initialChannelCapacity:core?25:15,...(core?{coreProtocol:PROTOCOL}:{}),origin:`https://${id}.invalid`,realtimeOrigin:`https://rt-${id}.invalid`,dataRoot:'/srv/'+id,database:'/srv/'+id+'/current.sqlite',dbIdentity:base===4000?'4e3ff06f-453b-40b2-afbd-272d76ab3391':'84c6d0a1-d442-4a4a-aacd-abf79226a490',ports:{proxy:base,app:base+1,realtime:base+2,dungeon:base+3,voice:base+4,...(core?{channels:[base+5,base+6,base+7,base+8]}:{})}});
const config=()=>({version:1,phase:'416b',primaryRealmId:'new',accountsDatabase:'/srv/accounts.sqlite',authOrigin:'https://accounts.invalid',authPort:3900,realms:[row('new',4000,true),row('old',4100)]});
test('native catalog supports explicit CORE511 four by25 and preserves legacy realm capacity without leaking private metadata',()=>{
 const m=validateRealmManifest(config()),now=Date.now(),health=new Map(m.realms.map(r=>[r.id,{realmId:r.id,dbIdentity:r.dbIdentity,sampledAtMs:now,ready:true,channelCapacity:r.initialChannelCapacity,channels:r.id==='new'?[1,2,3,4]:[2,3,4],protocol:r.coreProtocol}]));
 let list=publicRealmCatalog(m,health,now);assert.equal(list[0].capacity,100);assert.equal(list[0].online,10);assert.equal(list[1].capacity,45);assert.equal(list[1].online,9);assert(!JSON.stringify(list).includes('sqlite'));assert(!JSON.stringify(list).includes('4005'));
 const h=health.get('new');h.protocol='obsolete';assert.equal(publicRealmCatalog(m,health,now)[0].status,'unavailable');h.protocol=PROTOCOL;h.channels=[25,25,25,25];assert.equal(publicRealmCatalog(m,health,now)[0].status,'full');h.channels=[25,25,25,24];assert.equal(publicRealmCatalog(m,health,now)[0].status,'open');h.channels=[1,1,1];assert.equal(publicRealmCatalog(m,health,now)[0].status,'unavailable');
});
test('manifest rejects implicit four channels, wrong capacity, duplicate listeners and legacy extra listeners',()=>{
 for(const mutate of [m=>delete m.realms[0].coreProtocol,m=>m.realms[0].coreProtocol='unknown',m=>m.realms[0].initialChannelCapacity=30,m=>m.realms[0].ports.channels[0]=4101,m=>m.realms[0].ports.channels[1]=4005,m=>m.realms[0].ports.channels.pop(),m=>m.realms[1].ports.channels=[4200,4201,4202,4203]]){const m=config();mutate(m);assert.throws(()=>validateRealmManifest(m));}
});
test('native manifest changes are reversible to the pinned original source',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/native-realm-manifest-proof.json',import.meta.url))),generated=fs.readFileSync(new URL('../generated/native-realm-manifest.mjs',import.meta.url),'utf8');assert.equal(hash(generated),proof.generatedSha256);let source=generated;for(const e of proof.edits.toReversed()){assert.equal(source.split(e.replacement).length,2);source=source.replace(e.replacement,e.original);}assert.equal(hash(source),proof.sourceSha256);
});
