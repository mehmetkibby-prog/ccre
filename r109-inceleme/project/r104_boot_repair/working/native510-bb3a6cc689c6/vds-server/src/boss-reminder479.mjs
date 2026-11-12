// One small, shared snapshot, fetched only when the reminder is opened/refreshed.
// No simulation tick, writer operation, channel RPC or background timer is added.
const sprite = (image, rows) => Object.freeze({backgroundImage:`url(${image})`,backgroundSize:`600% ${rows*100}%`,backgroundPosition:'0% 0%',backgroundRepeat:'no-repeat'});
const dragonImage='/game/dragon-motion-v450.webp',stoneImage='/game/black-stone-boss-motion-v476.webp';
const catalog = Object.freeze([
 ['dunya-bosu-1','sanctum',0,'Dünya Bossu Meydanı','/game/world-boss.webp'],
 ['dragon-world-1','dragon',0,'Külkanat Krateri',dragonImage,sprite(dragonImage,4)],
 ['frozen-boss-1','frozen',0,'Donmuş Çam Geçidi','/game/ayaz-tahti-boss.webp'],
 ...[1,2,3].map(channel=>[`rune-v2-boss-c${channel}-1`,'rune_v2',channel,'Karanlık Rün Sahili','/game/rune-v2-feral-boss-v483.webp']),
 ['ancient-boss-1','ancient',0,'Kadim Kök Vadisi','/game/kadim-kok-muhafizi-v341.webp'],
 ...[1,2,3].map(channel=>[`frozen-water-c${channel}`,'frozen',channel,'Donmuş Çam Geçidi','/game/buzgolu-semenderi.webp']),
 ...[1,2,3].map(channel=>[`stone-boss-black-c${channel}`,'black',channel,'Kara Bölge',stoneImage,sprite(stoneImage,3)]),
].map(Object.freeze));
export const BOSS_REMINDER_IDS479=Object.freeze(catalog.map(row=>row[0]));
const cache=new WeakMap();
const headers=Object.freeze({'Cache-Control':'private, no-store'});
export const BOSS_REMINDER_QUERY479=`SELECT m.id,m.name,m.area,m.channel,m.hp,m.respawn_at,
 CASE
  WHEN m.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1') THEN COALESCE(json_extract((SELECT config_json FROM rune_v2_settings WHERE id=1),'$.enabled'),0)
  WHEN m.id='dragon-world-1' THEN COALESCE(json_extract(d.config_json,'$.enabled'),0)
  WHEN m.id='frozen-boss-1' THEN COALESCE(c.frozen_zone_enabled,0)*COALESCE(c.frozen_boss_enabled,0)
  WHEN m.id='ancient-boss-1' THEN COALESCE(c.ancient_boss_enabled,0)
  WHEN m.id IN ('frozen-water-c1','frozen-water-c2','frozen-water-c3') THEN COALESCE(c.frozen_zone_enabled,0)*COALESCE(c.frozen_water_enabled,0)
  WHEN m.id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') THEN COALESCE(c.black_stone_boss_enabled,0)
  ELSE 1 END AS enabled
 FROM main.monsters m
 LEFT JOIN main.combat_settings c ON c.id=1
 LEFT JOIN main.dragon_settings d ON d.id=1
 WHERE m.id IN (${BOSS_REMINDER_IDS479.map(()=>'?').join(',')})`;
const deny=(code,message,status=403)=>Object.assign(Error(message),{code,status,bossReminder479:true});
function snapshot(db){
 let entry=cache.get(db);
 if(!entry){
  entry={entitlement:db.prepare('SELECT boss_reminder_until,loadlab_run_id FROM main.players WHERE id=? AND account_id=?'),bosses:db.prepare(BOSS_REMINDER_QUERY479),at:-Infinity,rows:null};
  cache.set(db,entry);
 }
 return entry;
}
export function readBossReminder479(db,auth,now=Date.now()){
 if(!auth?.player?.id||!auth.account?.id)throw deny('character_required','Karakter gerekli.',409);
 if(!db?.prepare)throw deny('boss_reminder_unavailable','Boss bilgisi şu an alınamıyor.',503);
 const entry=snapshot(db);
 // Entitlement and cohort are never cached: expiry, reset, logout/security and
 // ownership remain authoritative even while other players reuse the snapshot.
 const player=entry.entitlement.get(auth.player.id,auth.account.id);
 if(!player)throw deny('character_required','Karakter gerekli.',409);
 if(player.loadlab_run_id)throw deny('loadlab_action_forbidden','Test hesabı bu nesneyi kullanamaz.');
 const expiresAtMs=Number(player.boss_reminder_until);
 if(!Number.isSafeInteger(expiresAtMs)||expiresAtMs<=now)throw deny('boss_reminder_expired','Boss Hatırlatıcı aktif değil. Nesne Market’ten alıp çantandan kullanabilirsin.');
 if(!entry.rows||now<entry.at||now-entry.at>=1000){
  const rows=entry.bosses.all(...BOSS_REMINDER_IDS479),byId=new Map(rows.map(row=>[row.id,row]));
  entry.rows=Object.freeze(catalog.flatMap(([id,area,channel,areaLabel,image,imageStyle])=>{
   const row=byId.get(id);
   // Fixed identity whitelist excludes test clones, event summons and private
   // dungeon bosses. A crossed channel/area never becomes misleading UI data.
   if(!row||row.area!==area||row.channel!==channel)return [];
   const enabled=Number(row.enabled)===1,alive=enabled&&Number(row.hp)>0;
   const seconds=Number(row.respawn_at),spawnAtMs=enabled&&!alive&&Number.isSafeInteger(seconds)&&seconds>0&&Number.isSafeInteger(seconds*1000)?seconds*1000:null;
   return [Object.freeze({id,name:String(row.name),areaLabel,channel,alive,enabled,spawnAtMs,image,...(imageStyle?{imageStyle}: {})})];
  }));
  entry.at=now;
 }
 return {serverTimeMs:now,snapshotAtMs:entry.at,expiresAtMs,bosses:entry.rows};
}
export function bossReminderResponse479(db,auth,now=Date.now()){
 try{return Response.json(readBossReminder479(db,auth,now),{headers});}
 catch(error){if(!error?.bossReminder479)throw error;return Response.json({code:error.code,error:error.message},{status:error.status,headers});}
}
