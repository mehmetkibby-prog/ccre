import {GROUP_RULES} from "./group-entry-rules.mjs";
import {GUILD_WAR_TIMEOUT_SQL} from "../vds-server/src/guild-schema.mjs";
import type { db } from './game-world';
type Database = ReturnType<typeof db>;
const baseReadyPlayer=`p.last_seen>=? AND p.hp>0 AND p.area!='arena' AND p.arena_match_id='' AND p.combat_lock_until_ms<=? AND NOT EXISTS(SELECT 1 FROM pve_engagements e WHERE e.player_id=p.id) AND NOT EXISTS(SELECT 1 FROM dungeon_members d WHERE d.player_id=p.id)`;
export const GUILD_MONSTER_KILL_SQL = `INSERT OR IGNORE INTO guild_monster_claims(world_cycle,monster_id,spawn_round,guild_id)
 SELECT (SELECT cycle FROM world_state WHERE id=1),monster.id,monster.spawn_round,member.guild_id FROM monsters monster JOIN guild_members member ON member.player_id=?
 WHERE monster.id=? AND monster.spawn_round=? AND monster.hp>0 AND monster.hp<=? AND monster.is_stone=0`;
export async function expireGuildWars(database:Database, now=Date.now()) {
 await database.prepare(GUILD_WAR_TIMEOUT_SQL).bind(now,now,now).run();
}
export async function guildSnapshot(database:Database,playerId:string,details=true,includeContributions=true) {
 const now=Math.floor(Date.now()/1000);
 const guild=await database.prepare(`SELECT g.*,m.can_invite FROM guild_members m JOIN guilds g ON g.id=m.guild_id WHERE m.player_id=?`).bind(playerId).first();
 const gid=String(guild?.id??'');
 const warQuery=()=>database.prepare(`SELECT a.*,w.challenger,w.defender,
 EXISTS(SELECT 1 FROM arena_match_players ap JOIN players p ON p.id=ap.player_id WHERE ap.match_id=a.id AND p.id=? AND (a.status='waiting' OR p.arena_match_id=a.id)) AS joined,
    (SELECT COUNT(*) FROM arena_match_players ap WHERE ap.match_id=a.id AND ap.team=1) AS approved_a,
    (SELECT COUNT(*) FROM arena_match_players ap WHERE ap.match_id=a.id AND ap.team=2) AS approved_b
 FROM guild_war_locks l JOIN guild_wars w ON w.id=l.war_id JOIN arena_matches a ON a.id=w.id
 WHERE l.guild_id=? AND w.status='active' AND a.status IN ('waiting','countdown','active') AND a.starts_at_ms+CASE WHEN a.status='waiting' THEN 0 ELSE 600000 END>?`)
 .bind(playerId,gid,Date.now());
 if(!details){
 const [invites,challenges,war]=await database.batch([
 database.prepare(`SELECT i.id,i.expires_at,g.name,g.tax_rate,p.name AS sender FROM guild_invites i JOIN guilds g ON g.id=i.guild_id JOIN players p ON p.id=i.sender_id WHERE i.recipient_id=? AND i.expires_at>? ORDER BY i.expires_at DESC LIMIT 10`).bind(playerId,now),
 database.prepare(`SELECT w.id,g.name FROM guild_wars w JOIN guilds g ON g.id=w.challenger JOIN guilds mine ON mine.id=w.defender WHERE mine.leader_id=? AND w.status='pending' AND w.expires_at>? ORDER BY w.created_at DESC LIMIT 10`).bind(playerId,now),
 warQuery(),
 ]);return {guild,invites:invites.results,challenges:challenges.results,members:[],war:war.results[0]??null,ledger:[],contributions:[],rankings:{monsters:[],wins:[]},settings:null,serverTime:now};
 }
 const [members,invites,challenges,war,contributions,monsters,wins,settings]=await database.batch([
 database.prepare(`SELECT p.id,p.name,p.level,p.role,p.last_seen,m.can_invite FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=? ORDER BY m.joined_at,p.id`).bind(gid),
 database.prepare(`SELECT i.id,i.expires_at,g.name,g.tax_rate,p.name AS sender FROM guild_invites i JOIN guilds g ON g.id=i.guild_id JOIN players p ON p.id=i.sender_id WHERE i.recipient_id=? AND i.expires_at>? ORDER BY i.expires_at DESC LIMIT 10`).bind(playerId,now),
 database.prepare(`SELECT w.id,g.name FROM guild_wars w JOIN guilds g ON g.id=w.challenger JOIN guilds mine ON mine.id=w.defender WHERE mine.leader_id=? AND w.status='pending' AND w.expires_at>? ORDER BY w.created_at DESC LIMIT 10`).bind(playerId,now),
 warQuery(),
 // Derive lifetime contributions from the existing durable ledger. Withdrawals
 // are excluded; leaving/rejoining cannot erase or duplicate a contribution.
 // Only the visible treasury tab requests this aggregate, never the HUD poll.
 database.prepare(`WITH totals AS (
   SELECT player_id,SUM(amount) AS total FROM guild_ledger WHERE guild_id=? AND kind='tax' GROUP BY player_id
 ), current_members AS (SELECT player_id FROM guild_members WHERE guild_id=?),
 participants AS (SELECT player_id FROM totals UNION SELECT player_id FROM current_members)
 SELECT u.player_id,COALESCE(p.name,'Eski oyuncu') AS name,COALESCE(t.total,0) AS total,
 CASE WHEN m.player_id IS NULL THEN 0 ELSE 1 END AS is_member
 FROM participants u LEFT JOIN players p ON p.id=u.player_id LEFT JOIN totals t ON t.player_id=u.player_id
 LEFT JOIN current_members m ON m.player_id=u.player_id ORDER BY total DESC,name,u.player_id`)
 .bind(includeContributions?gid:'',includeContributions?gid:''),
 database.prepare(`SELECT g.id,g.name,g.monster_kills,g.wars_won,(SELECT COUNT(*) FROM guild_members WHERE guild_id=g.id) AS members FROM guilds g WHERE ? ORDER BY monster_kills DESC,g.created_at,g.id LIMIT 50`).bind(details?1:0),
 database.prepare(`SELECT g.id,g.name,g.monster_kills,g.wars_won,(SELECT COUNT(*) FROM guild_members WHERE guild_id=g.id) AS members FROM guilds g WHERE ? ORDER BY wars_won DESC,g.created_at,g.id LIMIT 50`).bind(details?1:0),
 database.prepare('SELECT guild_create_level,guild_create_gems FROM economy_settings WHERE id=1'),
 ]);
 return {guild,members:members.results,invites:invites.results,challenges:challenges.results,war:war.results[0]??null,ledger:[],contributions:contributions.results,rankings:{monsters:monsters.results,wins:wins.results},settings:settings.results[0],serverTime:now};
}
const authorized=`EXISTS(SELECT 1 FROM guilds g WHERE g.id=guild_members.guild_id AND g.leader_id=?)`;
export async function guildAction(database:Database,playerId:string,input:Record<string,unknown>,rules=GROUP_RULES) {
 const now=Math.floor(Date.now()/1000), nowMs=Date.now();
 const target=typeof input.target==='string'?input.target.slice(0,100):'';
 const id=typeof input.id==='string'?input.id.slice(0,100):'';
 const requestId=typeof input.requestId==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId)?input.requestId:'';
 const success=(row:unknown,message:string)=>{if(!row)throw new Error('İşlem uygulanamadı. Yetkini, daveti ve güncel durumu kontrol et.');return {ok:true,message};};
 switch(input.action){
 case 'create': {
  const name=typeof input.name==='string'?input.name.normalize('NFKC').trim().replace(/\s+/g,' '):'';
  if(!/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,23}$/u.test(name))throw new Error('Lonca adı 3–24 harf veya rakam olmalı.');
  const result=await database.prepare('INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,?) RETURNING id').bind(crypto.randomUUID(),name,name.toLocaleLowerCase('tr-TR'),playerId,now).first();
  return success(result,'Loncan kuruldu. Birlikte bir efsane yazın!');
 }
 case 'invite': {
  const row=await database.prepare(`INSERT INTO guild_invites(id,guild_id,sender_id,recipient_id,expires_at)
  SELECT ?,m.guild_id,?,?,? FROM guild_members m JOIN guilds g ON g.id=m.guild_id JOIN players p ON p.id=?
  WHERE m.player_id=? AND (m.can_invite=1 OR g.leader_id=?) AND p.last_seen>=? AND p.id!=?
  AND NOT EXISTS(SELECT 1 FROM guild_members WHERE player_id=p.id) AND NOT EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=g.id)
  AND (SELECT COUNT(*) FROM guild_members WHERE guild_id=g.id)<40
  ON CONFLICT(guild_id,recipient_id) DO UPDATE SET sender_id=excluded.sender_id,expires_at=excluded.expires_at RETURNING id`)
  .bind(crypto.randomUUID(),playerId,target,now+120,target,playerId,playerId,now-30,playerId).first();
  return success(row,'Lonca daveti gönderildi. Davet 2 dakika geçerli.');
 }
 case 'accept': {
  const r=await database.batch([
   database.prepare(`INSERT INTO guild_members(player_id,guild_id,can_invite,joined_at)
    SELECT ?,i.guild_id,0,? FROM guild_invites i JOIN guild_members sender ON sender.player_id=i.sender_id AND sender.guild_id=i.guild_id JOIN guilds g ON g.id=i.guild_id
    WHERE i.id=? AND i.recipient_id=? AND i.expires_at>? AND (sender.can_invite=1 OR g.leader_id=i.sender_id) RETURNING player_id`).bind(playerId,now,id,playerId,now),
   database.prepare('DELETE FROM guild_invites WHERE recipient_id=? AND EXISTS(SELECT 1 FROM guild_members WHERE player_id=?)').bind(playerId,playerId),
  ]);return success(r[0].results[0],'Loncaya katıldın.');
 }
 case 'decline': await database.prepare('DELETE FROM guild_invites WHERE id=? AND recipient_id=?').bind(id,playerId).run();return {ok:true,message:'Davet reddedildi.'};
 case 'leave':return success(await database.prepare('DELETE FROM guild_members WHERE player_id=? RETURNING player_id').bind(playerId).first(),'Loncadan ayrıldın.');
 case 'disband': {
  if(!id||typeof input.name!=='string')throw new Error('Kapatmak için lonca adını doğrula.');
  const result=await database.batch([
   database.prepare(`SELECT player_id FROM guild_members WHERE guild_id IN(SELECT id FROM guilds WHERE id=? AND leader_id=? AND name=?)`).bind(id,playerId,input.name),
   database.prepare('DELETE FROM guilds WHERE id=? AND leader_id=? AND name=? RETURNING id').bind(id,playerId,input.name),
  ]);
  return {...success(result[1].results[0],'Lonca kapatıldı. Üyelerin karakterleri ve eşyaları korundu.'),notifyPlayerIds:result[0].results.map((r:Record<string,unknown>)=>r.player_id)};
 }
 case 'kick':return success(await database.prepare(`DELETE FROM guild_members WHERE player_id=? AND ${authorized} RETURNING player_id`).bind(target,playerId).first(),'Oyuncu loncadan çıkarıldı.');
 case 'permission':return success(await database.prepare(`UPDATE guild_members SET can_invite=? WHERE player_id=? AND ${authorized} RETURNING player_id`).bind(input.enabled===true?1:0,target,playerId).first(),'Davet yetkisi güncellendi.');
 case 'transfer':return success(await database.prepare(`UPDATE guilds SET leader_id=? WHERE leader_id=? AND EXISTS(SELECT 1 FROM guild_members WHERE player_id=? AND guild_id=guilds.id) AND NOT EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=guilds.id) RETURNING id`).bind(target,playerId,target).first(),'Başkanlık devredildi.');
 case 'tax': {
  const rate=Number(input.rate);if(!Number.isInteger(rate)||rate<0||rate>50)throw new Error('Vergi %0–50 arası tam sayı olmalı.');
  return success(await database.prepare('UPDATE guilds SET tax_rate=? WHERE leader_id=? RETURNING id').bind(rate,playerId).first(),'Lonca öz vergisi güncellendi.');
 }
 case 'withdraw': {
  const amount=Number(input.amount);if(!requestId||!Number.isSafeInteger(amount)||amount<1||amount>9e12)throw new Error('Geçerli bir öz miktarı gir.');
  if(await database.prepare('SELECT id FROM closed_guild_ledger WHERE id=?').bind('withdraw:'+playerId+':'+requestId).first())return {ok:true,message:'Bu çekim isteği daha önce işlendi; tekrar ödeme yapılmadı.'};
  const row=await database.prepare(`INSERT INTO guild_ledger(id,guild_id,player_id,kind,amount,created_at) SELECT ?,id,?,'withdraw',?,? FROM guilds WHERE leader_id=? AND NOT EXISTS(SELECT 1 FROM guild_ledger WHERE id=?) AND NOT EXISTS(SELECT 1 FROM closed_guild_ledger WHERE id=?) ON CONFLICT(id) DO NOTHING RETURNING id`).bind('withdraw:'+playerId+':'+requestId,playerId,amount,now,playerId,'withdraw:'+playerId+':'+requestId,'withdraw:'+playerId+':'+requestId).first();
  if(!row&&!await database.prepare('SELECT id FROM guild_ledger WHERE id=? AND player_id=?').bind('withdraw:'+playerId+':'+requestId,playerId).first())throw new Error('Kasa çekimi için başkan yetkisi gerekiyor.');
  return {ok:true,message:row?'Öz güvenle karakterine aktarıldı.':'Bu çekim isteği daha önce işlendi; tekrar ödeme yapılmadı.'};
 }
 case 'challenge': {
  const row=await database.prepare(`INSERT INTO guild_wars(id,challenger,defender,expires_at,created_at)
  SELECT ?,a.id,b.id,?,? FROM guilds a,guilds b WHERE a.leader_id=? AND b.id=? AND a.id!=b.id
  AND (SELECT COUNT(*) FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=a.id AND ${baseReadyPlayer})>=${rules.guildMin}
  AND (SELECT COUNT(*) FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=b.id AND ${baseReadyPlayer})>=${rules.guildMin}
  AND EXISTS(SELECT 1 FROM players p WHERE p.id=a.leader_id AND ${baseReadyPlayer})
  AND EXISTS(SELECT 1 FROM players p WHERE p.id=b.leader_id AND ${baseReadyPlayer})
  AND NOT EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id IN(a.id,b.id))
  AND NOT EXISTS(SELECT 1 FROM guild_wars WHERE ((challenger=a.id AND defender=b.id) OR (challenger=b.id AND defender=a.id)) AND created_at>?) RETURNING id`)
  .bind('guild-'+crypto.randomUUID(),now+120,now,playerId,target,now-30,nowMs,now-30,nowMs,now-30,nowMs,now-30,nowMs,now-1200).first();
  return success(row,'Savaş isteği karşı başkana gönderildi. Her loncadan en az iki oyuncu katılımını onayladığında savaş başlayacak.');
 }
 case 'war_decline':return success(await database.prepare(`UPDATE guild_wars SET status='declined' WHERE id=? AND status='pending' AND defender IN(SELECT id FROM guilds WHERE leader_id=?) RETURNING id`).bind(id,playerId).first(),'Savaş isteği reddedildi.');
 case 'war_accept':return startGuildWar(database,playerId,id,nowMs,rules);
 case 'war_join':return joinGuildWar(database,playerId,id,nowMs,rules);
 default:throw new Error('Geçersiz lonca işlemi.');
 }
}
// Waiting rosters contain voluntary approvals only. The unique kickoff token
// gates the entire transition; repeated clicks cannot heal or teleport anyone.
function guildKickoffStatements(database:Database,playerId:string,id:string,nowMs:number,rules=GROUP_RULES) {
 const now=Math.floor(nowMs/1000),token=crypto.randomUUID();
 const gate=`EXISTS(SELECT 1 FROM guild_wars WHERE id=? AND start_token=? AND status='active')`;
 const readyApproval=(team:1|2)=>`SELECT COUNT(*) FROM arena_match_players ap JOIN players p ON p.id=ap.player_id
  JOIN guild_members m ON m.player_id=p.id WHERE ap.match_id=guild_wars.id AND ap.team=${team}
  AND m.guild_id=guild_wars.${team===1?'challenger':'defender'} AND ${baseReadyPlayer}`;
 return [
  database.prepare(`UPDATE guild_wars SET start_token=? WHERE id=? AND status='active'
   AND EXISTS(SELECT 1 FROM arena_matches a JOIN world_state s ON s.id=1 WHERE a.id=guild_wars.id
    AND a.status='waiting' AND a.starts_at_ms>? AND a.world_cycle=s.cycle AND s.reset_at=0)
   AND EXISTS(SELECT 1 FROM arena_match_players ap JOIN players p ON p.id=ap.player_id
    WHERE ap.match_id=guild_wars.id AND p.id=? AND ${baseReadyPlayer})
   AND (SELECT COUNT(*) FROM arena_match_players WHERE match_id=guild_wars.id)<=30
   AND (${readyApproval(1)})>=${rules.guildMin} AND (${readyApproval(2)})>=${rules.guildMin}
   AND (SELECT COUNT(*) FROM players occupied WHERE occupied.last_seen>=unixepoch()-30
    AND (occupied.channel=(SELECT channel FROM arena_matches WHERE id=guild_wars.id)
     OR occupied.id IN(SELECT ap.player_id FROM arena_match_players ap JOIN players p ON p.id=ap.player_id
      WHERE ap.match_id=guild_wars.id AND ${baseReadyPlayer})))
      <=(SELECT MAX(1,MIN(30,channel_capacity)) FROM game_settings WHERE id=1)
   AND NOT EXISTS(SELECT 1 FROM guilds g WHERE g.id IN(guild_wars.challenger,guild_wars.defender)
    AND NOT EXISTS(SELECT 1 FROM arena_match_players ap JOIN players p ON p.id=ap.player_id
     WHERE ap.match_id=guild_wars.id AND p.id=g.leader_id AND ${baseReadyPlayer})) RETURNING id`)
   .bind(token,id,nowMs,playerId,now-30,nowMs,now-30,nowMs,now-30,nowMs,now-30,nowMs,now-30,nowMs),
  // Remove stale approvals before seating. Those members retain normal late entry.
  database.prepare(`DELETE FROM arena_match_players WHERE match_id=? AND ${gate}
   AND NOT EXISTS(SELECT 1 FROM players p WHERE p.id=arena_match_players.player_id AND ${baseReadyPlayer})`)
   .bind(id,id,token,now-30,nowMs),
  database.prepare(`UPDATE arena_match_players SET slot=(SELECT COUNT(*) FROM arena_match_players other
   WHERE other.match_id=arena_match_players.match_id AND other.team=arena_match_players.team
    AND (other.joined_at_ms<arena_match_players.joined_at_ms OR
     (other.joined_at_ms=arena_match_players.joined_at_ms AND other.player_id<arena_match_players.player_id)))
   WHERE match_id=? AND ${gate}`).bind(id,id,token),
  database.prepare(`UPDATE arena_matches SET status='countdown',starts_at_ms=?,updated_at_ms=?
   WHERE id=? AND status='waiting' AND ${gate}`).bind(nowMs+10000,nowMs,id,id,token),
  database.prepare(`INSERT INTO guild_war_returns SELECT ?,p.id,p.channel FROM players p
   JOIN arena_match_players ap ON ap.player_id=p.id AND ap.match_id=? WHERE ${gate}`).bind(id,id,id,token),
  database.prepare(`DELETE FROM arena_queue WHERE player_id IN(SELECT player_id FROM arena_match_players WHERE match_id=?) AND ${gate}`).bind(id,id,token),
  database.prepare(`DELETE FROM fishing_sessions WHERE player_id IN(SELECT player_id FROM arena_match_players WHERE match_id=?) AND ${gate}`).bind(id,id,token),
  database.prepare(`UPDATE players SET area='arena',arena_match_id=?,channel=(SELECT channel FROM arena_matches WHERE id=?),
   x=(SELECT CASE team WHEN 1 THEN 450+(slot/8)*60 ELSE 1950-(slot/8)*60 END FROM arena_match_players WHERE match_id=? AND player_id=players.id),
   y=(SELECT 400+(slot%8)*100 FROM arena_match_players WHERE match_id=? AND player_id=players.id),
   hp=max_hp,hp_revision=hp_revision+1,respawn_at_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0, attack_four_at=0, special_guard_until_ms=0,
   movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,
   realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0,root_until_ms=0,stun_until_ms=0
   WHERE id IN(SELECT player_id FROM arena_match_players WHERE match_id=?) AND ${gate}`).bind(id,id,id,id,nowMs,id,id,token),
 ];
}
export async function joinGuildWar(database:Database,playerId:string,id:string,nowMs=Date.now(),rules=GROUP_RULES) {
 const entry=crypto.randomUUID(),now=Math.floor(nowMs/1000);
 const inserted=`EXISTS(SELECT 1 FROM arena_match_players WHERE id=? AND match_id IN(
  SELECT id FROM arena_matches WHERE status IN ('countdown','active')))`;
 const statements=[
  database.prepare(`INSERT INTO arena_match_players(id,match_id,player_id,team,slot,joined_at_ms)
   SELECT ?,w.id,p.id,CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END,
   COALESCE((SELECT MAX(slot) FROM arena_match_players WHERE match_id=w.id AND team=CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END),-1)+1,?
   FROM guild_members m JOIN players p ON p.id=m.player_id JOIN guild_war_locks l ON l.guild_id=m.guild_id
   JOIN guild_wars w ON w.id=l.war_id JOIN arena_matches a ON a.id=w.id JOIN world_state s ON s.id=1
   WHERE p.id=? AND w.id=? AND m.guild_id IN(w.challenger,w.defender) AND w.status='active'
   AND a.status IN ('waiting','countdown','active')
   AND (SELECT COUNT(*) FROM arena_match_players WHERE match_id=w.id)<30
   AND (SELECT COUNT(*) FROM arena_match_players WHERE match_id=w.id
     AND team=CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END)<${30-rules.guildMin}
   AND (a.status='waiting' OR p.channel=a.channel OR
     (SELECT COUNT(*) FROM players occupied WHERE occupied.channel=a.channel AND occupied.last_seen>=unixepoch()-30)
       <(SELECT MAX(1,MIN(30,channel_capacity)) FROM game_settings WHERE id=1))
   AND a.starts_at_ms+CASE WHEN a.status='waiting' THEN 0 ELSE 600000 END>?
   AND a.world_cycle=s.cycle AND s.reset_at=0 AND ${baseReadyPlayer}
   ON CONFLICT(match_id,player_id) DO NOTHING RETURNING player_id`).bind(entry,nowMs,playerId,id,nowMs,now-30,nowMs),
  database.prepare(`INSERT INTO guild_war_returns SELECT ?,id,channel FROM players WHERE id=? AND ${inserted}`).bind(id,playerId,entry),
  database.prepare(`DELETE FROM arena_queue WHERE player_id=? AND ${inserted}`).bind(playerId,entry),
  database.prepare(`DELETE FROM fishing_sessions WHERE player_id=? AND ${inserted}`).bind(playerId,entry),
  // Keep the existing wide spawn layout, including already-running legacy 1v1s.
  // team_size is layout metadata; admission enforces the shared 30-player ceiling.
  database.prepare(`UPDATE arena_matches SET team_size=40,mode='5v5' WHERE id=? AND ${inserted}`).bind(id,entry),
  database.prepare(`UPDATE players SET area='arena',arena_match_id=?,channel=(SELECT channel FROM arena_matches WHERE id=?),
   x=(SELECT CASE team WHEN 1 THEN 450+(slot/8)*60 ELSE 1950-(slot/8)*60 END FROM arena_match_players WHERE id=?),
   y=(SELECT 400+(slot%8)*100 FROM arena_match_players WHERE id=?),
   hp=max_hp,hp_revision=hp_revision+1,respawn_at_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0, attack_four_at=0, special_guard_until_ms=0,
   movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,
   realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0,root_until_ms=0,stun_until_ms=0
   WHERE id=? AND ${inserted}`).bind(id,id,entry,entry,nowMs,playerId,entry),
 ];
 const results=await database.batch([...statements,...guildKickoffStatements(database,playerId,id,nowMs,rules)]);
 const started=results[statements.length].results.length>0;
 const existing=await database.prepare(`SELECT a.status FROM players p JOIN arena_match_players ap ON ap.player_id=p.id
  JOIN arena_matches a ON a.id=ap.match_id JOIN guild_wars w ON w.id=a.id JOIN guild_members m ON m.player_id=p.id
  WHERE p.id=? AND a.id=? AND w.status='active' AND m.guild_id IN(w.challenger,w.defender)
   AND a.status IN ('waiting','countdown','active')
   AND a.starts_at_ms+CASE WHEN a.status='waiting' THEN 0 ELSE 600000 END>?
   AND ((a.status='waiting' AND ${baseReadyPlayer}) OR p.arena_match_id=a.id)`)
  .bind(playerId,id,nowMs,now-30,nowMs).first<{status:string}>();
 if(existing)return {ok:true,started,message:started?'Her loncadan en az iki oyuncu hazır! Savaş 10 saniye sonra başlıyor.':existing.status==='waiting'
  ?'Katılımın onaylandı. Her loncadan en az iki hazır oyuncu ve savaş kanalında yeterli yer bekleniyor.'
  :results[0].results.length?'Lonca savaşına katıldın.':'Zaten bu lonca savaşındasın.'};
 throw new Error('Katılamadın. Savaş odasında ve kanalında yer olmalı (en fazla 30 oyuncu). Savaş devam etmeli ve bu iki loncadan birinin üyesi olmalısın. Canlı, çevrimiçi, çatışma ve zindan dışında tekrar dene.');
}
export async function startGuildWar(database:Database,playerId:string,id:string,nowMs:number,rules=GROUP_RULES){
 const now=Math.floor(nowMs/1000),token=crypto.randomUUID();
 const leaderReady=baseReadyPlayer+" AND p.id=(SELECT leader_id FROM guilds WHERE id=m.guild_id)";
 const results=await database.batch([
  database.prepare(`UPDATE guild_wars SET status='active',start_token=? WHERE id=? AND status='pending' AND expires_at>?
   AND defender IN(SELECT id FROM guilds WHERE leader_id=?)
   AND NOT EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id IN(guild_wars.challenger,guild_wars.defender))
   AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND reset_at=0)
   AND (SELECT COUNT(*) FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=guild_wars.challenger AND ${baseReadyPlayer})>=${rules.guildMin}
   AND (SELECT COUNT(*) FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=guild_wars.defender AND ${baseReadyPlayer})>=${rules.guildMin}
   AND EXISTS(SELECT 1 FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=guild_wars.challenger AND ${leaderReady})
   AND EXISTS(SELECT 1 FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=guild_wars.defender AND ${leaderReady}) RETURNING id`)
   .bind(token,id,now,playerId,now-30,nowMs,now-30,nowMs,now-30,nowMs,now-30,nowMs),
  database.prepare(`INSERT INTO guild_war_locks SELECT challenger,id FROM guild_wars WHERE id=? AND start_token=?
   UNION ALL SELECT defender,id FROM guild_wars WHERE id=? AND start_token=?`).bind(id,token,id,token),
  database.prepare(`INSERT INTO arena_matches(id,world_cycle,channel,mode,status,team_size,kill_target,team_a_name,team_b_name,reward_gems,starts_at_ms,created_at_ms,updated_at_ms)
   SELECT w.id,s.cycle,p.channel,'5v5','waiting',40,50,a.name,b.name,0,?,?,?
   FROM guild_wars w JOIN guilds a ON a.id=w.challenger JOIN guilds b ON b.id=w.defender
   JOIN players p ON p.id=? JOIN world_state s ON s.id=1 WHERE w.id=? AND w.start_token=?`)
   .bind(nowMs+120000,nowMs,nowMs,playerId,id,token),
  database.prepare(`INSERT INTO arena_match_players(id,match_id,player_id,team,slot,joined_at_ms)
   SELECT ?||':'||p.id,?,p.id,CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END,0,?
   FROM guild_members m JOIN players p ON p.id=m.player_id JOIN guild_wars w ON m.guild_id IN(w.challenger,w.defender)
   WHERE w.id=? AND w.start_token=? AND ${leaderReady}`).bind(id,id,nowMs,id,token,now-30,nowMs),
 ]);
 if(!results[0].results[0])throw new Error('Her loncada başkan dahil en az iki çevrimiçi, canlı, çatışma ve zindan dışında oyuncu olmalı. Davet süresini de kontrol et.');
 return {ok:true,started:false,message:'Katılım onayları bekleniyor. Her loncadan başkan dahil en az iki hazır oyuncu onayladığında savaş 10 saniye sonra başlayacak. Onay süresi 2 dakika.'};
}
