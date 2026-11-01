import {randomUUID} from 'node:crypto';
import {createRewardServices} from '../generated/reward-services.mjs';
import {adminHandlers,adminRequest,nativeAdminSource} from './native-admin-fixture.mjs';
import {patchNativeConfiguration} from '../patch-native-configuration.mjs';
export const configurationSource=patchNativeConfiguration(nativeAdminSource).source;

// Original mechanically extracted factories use the raw sole SQLite handle
// and keep their own native transaction boundaries; no operation-RNG facade.
export function configurationServices(f){
 const g={},m=createRewardServices({globals:g,now:f.clock,fourChannels:true});g.__colEquipmentSets=true;g.__colStatus=m.status.createStatus(f.sql);g.__colRunes=m.runes.createRunes(f.sql);g.__colRanks=m.ranks.createRanks(f.sql);g.__colGuildSkill=m.guildSkill.createGuildSkill(f.sql,{now:f.clock});g.__colPremium=new m.premium.PremiumEngine(f.sql,{now:f.clock});g.__colArenaMarket=m.arena.createArenaMarket(f.sql,{now:f.clock});g.__colDragonBoss=m.dragon.createDragonBoss(f.sql,{now:f.clock});return g;
}
// This isolated database is already natively seeded. The pending production
// host must bind the native warm seed/cache path before serving these routes;
// this fixture does not exercise legacy live seeding or the full admin snapshot.
export function configurationHandlers(f,services,source=configurationSource){return adminHandlers({source,database:f.f.database,services:{...services,ensureWorldSeed:async()=>{},nowSeconds$1:()=>Math.floor(f.clock()/1000)},snapshot:()=>({fixtureSnapshot:true})});}
export const configurationRequest=body=>adminRequest({method:'POST',body});
export async function configurationSnapshot(row,monster=null){
 const request=randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{row.child.off('message',listener);reject(Error('configuration_snapshot_timeout'));},4000),listener=m=>{if(m?.type==='test-configuration-snapshot'&&m.request===request){clearTimeout(timer);row.child.off('message',listener);resolve(m.snapshot);}};row.child.on('message',listener);row.child.send({type:'test-configuration-snapshot',request,monster});});
}
