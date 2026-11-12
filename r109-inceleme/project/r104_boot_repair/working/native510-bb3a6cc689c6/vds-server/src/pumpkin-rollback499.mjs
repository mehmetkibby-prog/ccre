// Cold rollback only. The caller must prove every realm service is stopped.
// Paid expiry and receipts remain on the current DB; no player snapshot restore.
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL} from 'node:url';import path from 'node:path';
export const PUMPKIN_BASE499='becf363abf0c74c8e0d5ee0ea132fedbb61b2805188ce7cef97018d6992a87f7';
export function rollbackPumpkin499(db,{refreshHp}={}){
 if(db.isTransaction||db.prepare('PRAGMA synchronous').get().synchronous!==2||typeof refreshHp!=='function')throw Error('Cold FULL pumpkin rollback required');
 const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(r=>r.name));if(!columns.has('pumpkin_until499')&&!columns.has('pumpkin_enabled499'))return {changed:false,players:0,rooms:0};
 if(!columns.has('pumpkin_until499')||!columns.has('pumpkin_enabled499'))throw Error('Incomplete pumpkin schema');
 db.exec('BEGIN IMMEDIATE');try{
  const owners=db.prepare('SELECT id FROM players WHERE pumpkin_enabled499=1').all();
  for(const {id}of owners){db.prepare('UPDATE players SET pumpkin_enabled499=0 WHERE id=? AND pumpkin_enabled499=1').run(id);const result=refreshHp(id);if(result&&typeof result.then==='function')throw Error('Synchronous HP rollback required');}
  let rooms=0;
  for(const row of db.prepare("SELECT id,state FROM dungeon_runs WHERE status IN ('ready','active','portal','wipe','complete')").all()){
   const run=JSON.parse(row.state);let changed=false;
   for(const member of run.members??[]){const stats=member.stats;if(!stats?.pumpkinActive499)continue;
    if(!Number.isFinite(stats.pumpkinAttackBonus499)||stats.pumpkinAttackBonus499<0||!Number.isSafeInteger(stats.pumpkinHpBonus499)||stats.pumpkinHpBonus499<0)throw Error('Unproven dungeon pumpkin delta');
    stats.attack=Math.max(0,stats.attack-stats.pumpkinAttackBonus499);stats.maxHp=Math.max(1,stats.maxHp-stats.pumpkinHpBonus499);stats.monsterPower=Math.max(0,(stats.monsterPower??0)-10);member.maxHp=stats.maxHp;member.hp=Math.min(member.hp,member.maxHp);
    stats.pumpkinActive499=false;stats.pumpkinAttackBonus499=0;stats.pumpkinHpBonus499=0;stats.pumpkinRevision499=0;stats.combatRevision=0;
    const buff=member.appearance?.premiumBuff;if(buff?.pumpkin){buff.pumpkin=false;buff.attack=Math.max(0,(buff.attack??0)-20);buff.hp=Math.max(0,(buff.hp??0)-1000);buff.monsters=0;}
    changed=true;
   }
   if(changed){db.prepare('UPDATE dungeon_runs SET state=? WHERE id=?').run(JSON.stringify(run),row.id);rooms++;}
  }
  db.exec('COMMIT');return {changed:owners.length>0||rooms>0,players:owners.length,rooms};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
export async function reconcilePumpkinRollback499(release,realms){
 const bytes=await readFile(path.join(release,'realm-package-manifest.json'));if(createHash('sha256').update(bytes).digest('hex')!==PUMPKIN_BASE499)return {matched:false};
 const load=name=>import(pathToFileURL(path.join(release,'vds-server/src',name)).href);
 const [{verifyRealmPackage},{verifyNativeBuild}]=await Promise.all([load('realm-package-integrity.mjs'),load('native-build-integrity.mjs')]);await verifyRealmPackage(release);await verifyNativeBuild(path.join(release,'dist-vds'));
 const [{PremiumEngine},{createRanks},{createStatus},{createRunes},{createGuildSkill}]=await Promise.all(['premium-engine.mjs','ranks.mjs','status.mjs','runes.mjs','guild-skill.mjs'].map(load));
 const keys=['__colEquipmentSets','__colRanks','__colStatus','__colRunes','__colGuildSkill'],prior=new Map(keys.map(k=>[k,{exists:Object.hasOwn(globalThis,k),value:globalThis[k]}])),results=[];
 try{for(const realm of realms){const db=new DatabaseSync(realm.database);try{db.exec('PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');globalThis.__colEquipmentSets=true;globalThis.__colRanks=createRanks(db);globalThis.__colStatus=createStatus(db);globalThis.__colRunes=createRunes(db);globalThis.__colGuildSkill=createGuildSkill(db);const premium=new PremiumEngine(db);results.push({realm:realm.id,...rollbackPumpkin499(db,{refreshHp:id=>premium.refreshHp(id)})});}finally{db.close();}}}finally{for(const[k,p]of prior){if(p.exists)globalThis[k]=p.value;else delete globalThis[k];}}
 return {matched:true,results};
}
