export const FORGE_MATERIAL491='forge_ember491';
export const FORGE_MATERIAL_INFO491=Object.freeze({label:'Kor Mührü',image:'../game/forge-ember-v491',note:'Tüm canavarlardan kazanılabilen artı basma malzemesi. Demirci Haso’da kullanılır; pazarda satılabilir.'});
let cachedRaw491,cachedDrop491;
// The existing settings cache carries this mirror. No database lookup/timer
// is added to an attack; malformed or absent settings fail closed.
export function forgeDropSnapshot491(settings){
 const raw=typeof settings==='string'?settings:settings?.events_json??'';
 if(raw===cachedRaw491)return cachedDrop491;
 let drop=null;try{const c=JSON.parse(raw||'{}').enhancement491Drop;if(c?.enabled===true&&Number.isSafeInteger(c.revision)&&c.revision>0&&Number.isFinite(c.dropPercent)&&c.dropPercent>0&&c.dropPercent<=100&&Math.abs(c.dropPercent*100-Math.round(c.dropPercent*100))<1e-7)drop=Object.freeze({v:1,revision:c.revision,rate:Math.round(c.dropPercent*100)});}catch{}
 cachedRaw491=raw;cachedDrop491=drop;return drop;
}
export function forgeDefeatSnapshot491(settings,target){
 if(typeof target?.events_snapshot==='string'){try{const x=JSON.parse(target.events_snapshot).forge491;return x?.v===1&&Number.isSafeInteger(x.revision)&&x.revision>0&&Number.isInteger(x.rate)&&x.rate>0&&x.rate<=10000?x:null;}catch{return null;}}
 return forgeDropSnapshot491(settings);
}
export function forgeDropSql491(rate){
 if(!Number.isInteger(rate)||rate<1||rate>10000)throw Error('Invalid forge drop rate');
 const roll=rate===10000?'1':`CASE WHEN ((random() & 2147483647)%10000)<${rate} THEN 1 ELSE 0 END`;
 return `WITH forge_earned491 AS MATERIALIZED (
  SELECT c.player_id,${roll} AS amount
  FROM monster_xp_claims c JOIN players p ON p.id=c.player_id WHERE c.claim_token=?
  AND p.loadlab_run_id='' AND NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.id=p.id OR e.account_id=p.account_id)
  AND NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 a WHERE a.account_id=p.account_id)
 ) INSERT INTO dungeon_materials(player_id,kind,amount)
 SELECT player_id,'forge_ember491',amount FROM forge_earned491 WHERE amount>0
 ON CONFLICT(player_id,kind) DO UPDATE SET amount=MIN(1000000000,dungeon_materials.amount+excluded.amount)`;
}
export function forgeDropStatements491(database,settings,target,monsterId,token,isTestMonster){
 // V496: AFK rewards are XP + essence only, including deferred old snapshots.
 // Match the existing AFK reward branch; never use the player's current area.
 if(target?.area==='afk'||target?.monster_area==='afk'||(typeof monsterId==='string'&&monsterId.includes('-afk-')))return [];
 const s=forgeDefeatSnapshot491(settings,target);if(!s||isTestMonster?.(monsterId))return [];
 return [database.prepare(forgeDropSql491(s.rate)).bind(token)];
}
// Dungeon kills already execute inside the same durable transaction that saves
// enemy HP/death and the run state. Restoring a failed transaction restores both.
export function grantDungeonForge491(db,settings,playerId,killCount,random=Math.random){
 const s=forgeDropSnapshot491(settings);if(!s||!Number.isSafeInteger(killCount)||killCount<=0)return 0;
 if(!db.isTransaction)throw Error('Dungeon forge grants require a durable transaction');
 const player=db.prepare(`SELECT p.id FROM players p WHERE p.id=? AND p.loadlab_run_id=''
  AND NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.id=p.id OR e.account_id=p.account_id)
  AND NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 a WHERE a.account_id=p.account_id)`).get(playerId);
 if(!player)return 0;let amount=0;
 for(let i=0;i<killCount;i++){if(s.rate===10000){amount++;continue;}const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw Error('Invalid forge drop random');if(r*10000<s.rate)amount++;}
 if(amount)db.prepare("INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,'forge_ember491',?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=MIN(1000000000,dungeon_materials.amount+excluded.amount)").run(playerId,amount);
 return amount;
}
