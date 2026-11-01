import {GUILD_CASTLE_COST,GUILD_DECOR,GUILD_PLOTS,GUILD_VILLAGE_ENTRY,GUILD_HALL_ENTRY,guildArea,villageArea,hallArea} from '../../lib/guild-village.mjs';
export function ensureGuildVillageSchema(db){db.exec(`
 CREATE TABLE IF NOT EXISTS guild_village_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),revision INTEGER NOT NULL DEFAULT 1);
 INSERT OR IGNORE INTO guild_village_settings(id) VALUES(1);
 CREATE TABLE IF NOT EXISTS guild_castles(guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,district INTEGER NOT NULL CHECK(district BETWEEN 1 AND 9999),slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 8),purchased_by TEXT NOT NULL,purchased_at INTEGER NOT NULL,decor_level INTEGER NOT NULL DEFAULT 0 CHECK(decor_level BETWEEN 0 AND 3),decor_essence INTEGER NOT NULL DEFAULT 0 CHECK(decor_essence>=0),UNIQUE(district,slot));
 CREATE TABLE IF NOT EXISTS guild_castle_contributions(guild_id TEXT NOT NULL REFERENCES guild_castles(guild_id) ON DELETE CASCADE,player_id TEXT NOT NULL,essence INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,player_id));
 CREATE TABLE IF NOT EXISTS guild_castle_guests(guild_id TEXT NOT NULL REFERENCES guild_castles(guild_id) ON DELETE CASCADE,player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,invited_by TEXT NOT NULL,expires_at INTEGER NOT NULL,PRIMARY KEY(guild_id,player_id));
 CREATE INDEX IF NOT EXISTS guild_castle_guest_player ON guild_castle_guests(player_id,expires_at);
 CREATE TABLE IF NOT EXISTS guild_castle_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,payload TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 `);}
export function createGuildVillage(db,{now=Date.now,dungeonLocked=()=>false}={}){
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}};
 const settings=()=>db.prepare('SELECT * FROM guild_village_settings WHERE id=1').get();
 const player=id=>db.prepare('SELECT * FROM players WHERE id=?').get(id);
 const guild=id=>db.prepare('SELECT g.* FROM guild_members m JOIN guilds g ON g.id=m.guild_id WHERE m.player_id=?').get(id);
 const castle=id=>db.prepare('SELECT c.*,g.name,g.leader_id,g.wars_won,g.monster_kills,g.created_at FROM guild_castles c JOIN guilds g ON g.id=c.guild_id WHERE c.guild_id=?').get(id);
 const allowed=(id,gid)=>!!db.prepare(`SELECT 1 FROM guild_castles c WHERE c.guild_id=? AND (EXISTS(SELECT 1 FROM guild_members m WHERE m.guild_id=c.guild_id AND m.player_id=?) OR EXISTS(SELECT 1 FROM guild_castle_guests v WHERE v.guild_id=c.guild_id AND v.player_id=? AND v.expires_at>?))`).get(gid,id,id,Math.floor(now()/1000));
 const available=p=>!!p&&(!!settings().enabled||p.is_gm===1);
 const ready=p=>{if(!p||p.hp<=0||p.arena_match_id||p.combat_lock_until_ms>now()||p.root_until_ms>now()||p.stun_until_ms>now()||dungeonLocked(p.id)||db.prepare('SELECT 1 FROM pve_engagements WHERE player_id=? AND expires_at_ms>?').get(p.id,now())||db.prepare('SELECT 1 FROM arena_queue WHERE player_id=?').get(p.id))throw Error('Önce savaştan, arena sırasından veya zindandan ayrıl.');};
 function travel(p,area,point){ready(p);db.prepare(`UPDATE players SET area=?,x=?,y=?,last_seen=?,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=?`).run(area,point.x,point.y,Math.floor(now()/1000),now(),p.id);return {ok:true,area,...point,message:guildArea(area)?.kind==='hall'?'Lonca salonuna hoş geldin.':'Lonca Köyü’ne hoş geldin.'};}
 function repair(id){const p=player(id),a=guildArea(p?.area);if(!a)return null;
  if(available(p)&&(a.kind!=='hall'||allowed(id,a.guildId)))return null;
  const destination=available(p)?villageArea(1):'bazaar',point=destination==='bazaar'?{x:1200,y:920}:GUILD_VILLAGE_ENTRY;
  db.prepare(`UPDATE players SET area=?,x=?,y=?,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0,movement_debt_ms=0,movement_checked_at_ms=?,hp_revision=hp_revision+1 WHERE id=?`).run(destination,point.x,point.y,now(),id);
  return {oldArea:p.area,channel:p.channel,playerId:id,area:destination,...point,hp:p.hp,maxHp:p.max_hp,hpRevision:p.hp_revision+1};
 }
 return {
 settings,repair,allowed,
 repairAll(){return db.prepare("SELECT id FROM players WHERE area GLOB 'guild_*'").all().map(p=>repair(p.id)).filter(Boolean);},
 deadline(id,area){const a=guildArea(area);if(a?.kind!=='hall')return Infinity;if(!allowed(id,a.guildId))return 0;return db.prepare('SELECT 1 FROM guild_members WHERE player_id=? AND guild_id=?').get(id,a.guildId)?Infinity:(db.prepare('SELECT expires_at FROM guild_castle_guests WHERE player_id=? AND guild_id=?').get(id,a.guildId)?.expires_at??0)*1000;},
 save(enabled,revision){if(typeof enabled!=='boolean')throw Error('Açılış ayarı geçersiz.');return tx(()=>{if(!db.prepare('UPDATE guild_village_settings SET enabled=?,revision=revision+1 WHERE id=1 AND revision=?').run(Number(enabled),revision).changes)throw Error('Ayar değişti. Paneli yenile.');return settings();});},
 snapshot(id,district){const p=player(id),g=guild(id),room=guildArea(p?.area),own=g?castle(g.id):null;
  district=district===undefined&&room?.kind==='village'?room.district:Math.max(1,Math.min(9999,Math.floor(Number(district)||own?.district||1)));
  const current=room?.kind==='hall'?castle(room.guildId):null,home=current??own;
  const maxDistrict=Math.min(9999,(db.prepare('SELECT COALESCE(MAX(district),0) n FROM guild_castles').get().n||1)+1);
  return {enabled:!!settings().enabled,available:available(p),serverTime:Math.floor(now()/1000),district,maxDistrict,cost:GUILD_CASTLE_COST,decor:GUILD_DECOR,
   guild:g?{id:g.id,name:g.name,leader:g.leader_id===id}:null,ownCastle:own??null,currentHall:current??null,
   wallet:p?{pearls:p.pearls,gems:p.gems,essence:p.essence}:null,
   plots:available(p)?GUILD_PLOTS.map(plot=>({...plot,castle:db.prepare('SELECT c.guild_id,c.decor_level,g.name FROM guild_castles c JOIN guilds g ON g.id=c.guild_id WHERE district=? AND slot=?').get(district,plot.slot)??null})):[],
   invitations:db.prepare('SELECT v.guild_id,v.expires_at,g.name FROM guild_castle_guests v JOIN guilds g ON g.id=v.guild_id WHERE v.player_id=? AND v.expires_at>?').all(id,Math.floor(now()/1000)),
   guests:own&&g?.leader_id===id?db.prepare('SELECT v.player_id,v.expires_at,p.name FROM guild_castle_guests v JOIN players p ON p.id=v.player_id WHERE v.guild_id=? AND v.expires_at>?').all(g.id,Math.floor(now()/1000)):[],
   contributions:home&&allowed(id,home.guild_id)?db.prepare('SELECT c.player_id,c.essence,p.name FROM guild_castle_contributions c LEFT JOIN players p ON p.id=c.player_id WHERE c.guild_id=? ORDER BY c.essence DESC LIMIT 40').all(home.guild_id):[],
  };
 },
 act(id,body){return tx(()=>{
  const p=player(id),g=guild(id),action=body.action;if(!available(p))throw Error('Lonca Köyü şu anda yönetici ön izlemesinde.');
  if(action==='village'){const district=Number(body.district??1),max=Math.min(9999,(db.prepare('SELECT COALESCE(MAX(district),0) n FROM guild_castles').get().n||1)+1);if(!Number.isInteger(district)||district<1||district>max)throw Error('Ada bölgesi geçersiz.');return travel(p,villageArea(district),GUILD_VILLAGE_ENTRY);}
  if(action==='hall'){const gid=String(body.guildId??g?.id??'');if(!allowed(id,gid))throw Error('Bu salon için lonca üyeliği veya geçerli misafir daveti gerekiyor.');return travel(p,hallArea(gid),GUILD_HALL_ENTRY);}
  if(!g)throw Error('Önce bir loncaya katıl.');
  const own=castle(g.id),leader=g.leader_id===id;
  if(['buy','invite','revoke','upgrade'].includes(action)&&!leader)throw Error('Bu işlemi yalnız lonca lideri yapabilir.');
  if(!['buy','donate','upgrade','invite','revoke'].includes(action))throw Error('İşlem geçersiz.');
  if(typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId))throw Error('İşlem kimliği geçersiz.');
  const payload=JSON.stringify({guild:g.id,action,slot:body.slot,district:body.district,amount:body.amount,target:body.target,level:body.level});
  const receipt=db.prepare('SELECT * FROM guild_castle_receipts WHERE player_id=? AND request_id=?').get(id,body.requestId);
  if(receipt){if(receipt.payload!==payload)throw Error('İşlem kimliği başka istekte kullanıldı.');return JSON.parse(receipt.result);}
  let message='';
  if(action==='buy'){
   if(own)throw Error('Loncanın zaten bir şatosu var.');ready(p);const room=guildArea(p.area),slot=Number(body.slot),district=Number(body.district);
   if(room?.kind!=='village'||district!==room.district||!GUILD_PLOTS.some(p=>p.slot===slot))throw Error('Satın almak için seçtiğin ada bölgesine git.');
   if(db.prepare('SELECT 1 FROM guild_castles WHERE district=? AND slot=?').get(district,slot))throw Error('Bu şato başka bir lonca tarafından alınmış.');
   const {pearls,gems,essence}=GUILD_CASTLE_COST;
   if(!db.prepare('UPDATE players SET pearls=pearls-?,gems=gems-?,essence=essence-? WHERE id=? AND pearls>=? AND gems>=? AND essence>=?').run(pearls,gems,essence,id,pearls,gems,essence).changes)throw Error('50 inci, 50.000 mücevher ve 2.000 öz gerekiyor.');
   db.prepare('INSERT INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,?,?,?,?)').run(g.id,district,slot,id,Math.floor(now()/1000));message='Şato loncanın oldu. Üyeler Lonca → Şatom bölümünden salona girebilir.';
  }else{
   if(!own)throw Error('Önce loncanız bir şato almalı.');
   if(action==='donate'){
    const amount=Number(body.amount),remaining=GUILD_DECOR.reduce((n,d)=>n+d.essence,0)-GUILD_DECOR.filter(d=>d.level<=own.decor_level).reduce((n,d)=>n+d.essence,0)-own.decor_essence;
    if(!Number.isSafeInteger(amount)||amount<1||amount>remaining)throw Error(`En fazla ${Math.max(0,remaining)} öz katkısı yapabilirsin.`);
    if(!db.prepare('UPDATE players SET essence=essence-? WHERE id=? AND essence>=?').run(amount,id,amount).changes)throw Error('Yeterli özün yok.');
    db.prepare('UPDATE guild_castles SET decor_essence=decor_essence+? WHERE guild_id=?').run(amount,g.id);
    db.prepare('INSERT INTO guild_castle_contributions(guild_id,player_id,essence) VALUES(?,?,?) ON CONFLICT(guild_id,player_id) DO UPDATE SET essence=essence+excluded.essence').run(g.id,id,amount);message='Katkın şatonun görsel gelişim kasasına eklendi.';
   }else if(action==='upgrade'){
    const next=GUILD_DECOR.find(d=>d.level===own.decor_level+1);if(!next||body.level!==next.level)throw Error('Geliştirme seviyesi değişti.');
    if(own.decor_essence<next.essence)throw Error('Görsel gelişim kasasında yeterli öz yok.');
    db.prepare('UPDATE guild_castles SET decor_level=decor_level+1,decor_essence=decor_essence-? WHERE guild_id=?').run(next.essence,g.id);message=next.name+' açıldı. Savaş gücü değişmez.';
   }else if(action==='invite'){
    const target=db.prepare('SELECT id FROM players WHERE name=? COLLATE NOCASE').get(String(body.target??'').trim());if(!target||target.id===id)throw Error('Davet edilecek oyuncuyu bulamadım.');
    if(db.prepare('SELECT 1 FROM guild_members WHERE player_id=? AND guild_id=?').get(target.id,g.id))throw Error('Bu oyuncu zaten loncanın üyesi; davetsiz girebilir.');
    if(db.prepare('SELECT COUNT(*) n FROM guild_castle_guests WHERE guild_id=? AND expires_at>?').get(g.id,Math.floor(now()/1000)).n>=10&&!db.prepare('SELECT 1 FROM guild_castle_guests WHERE guild_id=? AND player_id=? AND expires_at>?').get(g.id,target.id,Math.floor(now()/1000)))throw Error('Aynı anda en fazla 10 misafir daveti açık olabilir.');
    db.prepare('INSERT INTO guild_castle_guests(guild_id,player_id,invited_by,expires_at) VALUES(?,?,?,?) ON CONFLICT(guild_id,player_id) DO UPDATE SET invited_by=excluded.invited_by,expires_at=excluded.expires_at').run(g.id,target.id,id,Math.floor(now()/1000)+1800);message='30 dakikalık misafir daveti hazır. Oyuncu Lonca → Şatom bölümünden katılabilir.';
   }else{db.prepare('DELETE FROM guild_castle_guests WHERE guild_id=? AND player_id=?').run(g.id,String(body.target??''));message='Misafir daveti kaldırıldı.';}
  }
  const result={ok:true,message};db.prepare('INSERT INTO guild_castle_receipts VALUES(?,?,?,?,?,?)').run(id,body.requestId,action,payload,JSON.stringify(result),Math.floor(now()/1000));return result;
 });}
 };
}
