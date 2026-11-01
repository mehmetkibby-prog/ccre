import {randomUUID} from 'node:crypto';
import {RESET_PLAYER_DEFAULTS495,PERSONAL_STOCK_TABLES495} from './reset-policy495.mjs';

export const PLAYER_RESET_CONFIRMATION495='OYUNCUYU TAMAMEN SIFIRLA';
const PLAYER=/^[a-zA-Z0-9-]{8,64}$/;
const REQUEST=/^[a-zA-Z0-9_-]{16,80}$/;
const DAY_MS=86400000,OFFSET_MS=10800000;
function fail(message){throw Error(message);}
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const defaults=Object.entries(RESET_PLAYER_DEFAULTS495).map(([name,value])=>quote(name)+'='+value).join(',');
const resetSql=`UPDATE players SET ${defaults},hp=?,max_hp=?,x=1200,y=920,area='bazaar',
 hp_revision=hp_revision+1,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,stat_revision=stat_revision+1,
 movement_checked_at_ms=CASE WHEN MAX(last_seen,CAST(movement_checked_at_ms/1000 AS INTEGER),CAST(last_monster_hit_at/1000 AS INTEGER))>=?-30 THEN ? ELSE movement_checked_at_ms END
 WHERE id=?`;

// Constructed only on the coordinator's observed FULL writer. No clock, startup
// cleanup, normal-player action, schema migration or background scan is added.
export function createAdminPlayerReset495(db,{permanent,refreshHp,repairHall,sweepVoice,now=Date.now}={}){
 function receipt(input,actor){
  const row=db.prepare('SELECT admin_account_id,action,target_account_id,detail_json FROM admin_audit_events WHERE id=?').get('reset-player495:'+input.requestId);
  if(!row)return null;
  const detail=JSON.parse(row.detail_json);
  if(row.admin_account_id!==actor||row.action!=='reset_player'||detail.playerId!==input.playerId||detail.confirmation!==PLAYER_RESET_CONFIRMATION495||detail.result?.requestId!==input.requestId)fail('İşlem kimliği başka bir işlemde kullanılmış.');
  return {...detail.result,replayed:true};
 }
 function plan(id){
  const player=db.prepare('SELECT id,account_id,name,role,channel,loadlab_run_id FROM players WHERE id=?').get(id);
  if(!player)fail('Sıfırlanacak oyuncu bulunamadı.');
  if(!player.account_id||!db.prepare('SELECT 1 FROM accounts WHERE id=?').get(player.account_id))fail('Oyuncunun hesap bağlantısı doğrulanamadı; sıfırlama uygulanmadı.');
  if(player.loadlab_run_id||db.prepare('SELECT 1 FROM loadlab_entities_v1 WHERE id=? OR account_id=? LIMIT 1').get(id,player.account_id)||db.prepare('SELECT 1 FROM loadlab_admissions_v1 WHERE account_id=?').get(player.account_id))fail('Test botları kendi güvenli temizlik işlemiyle kaldırılmalı.');
  const owned=db.prepare('SELECT id,leader_id FROM guilds WHERE leader_id=? ORDER BY id').all(id);
  const membership=db.prepare('SELECT guild_id FROM guild_members WHERE player_id=?').get(id)?.guild_id??'';
  const wars=[];for(const g of owned)for(const w of db.prepare("SELECT id FROM guild_wars WHERE (challenger=? OR defender=?) AND status IN('pending','active') ORDER BY id").all(g.id,g.id))if(!wars.includes(w.id))wars.push(w.id);
  wars.sort();
  const ids=new Set([id]);
  for(const g of owned){
   for(const p of db.prepare('SELECT player_id FROM guild_members WHERE guild_id=?').all(g.id))ids.add(p.player_id);
   for(const p of db.prepare('SELECT id FROM players WHERE area=?').all('guild_hall_'+g.id))ids.add(p.id);
  }
  for(const war of wars)for(const p of db.prepare('SELECT id FROM players WHERE arena_match_id=?').all(war))ids.add(p.id);
  const affected=[...ids].sort();
  const trades=db.prepare("SELECT id,a,b FROM player_trades WHERE (a=? OR b=?) AND status IN('invited','open') ORDER BY id").all(id,id);
  for(const trade of trades){ids.add(trade.a);ids.add(trade.b);}
  const held=[...ids].sort().map(key=>db.prepare('SELECT id,channel FROM players WHERE id=?').get(key));
  if(held.some(p=>!p||!Number.isInteger(p.channel)||p.channel<1||p.channel>3))fail('Oyuncu kanal sahipliği doğrulanamadı; sıfırlama uygulanmadı.');
  return {player,owned,membership,wars,trades,held,affected};
 }
 function preflight(p){
  const id=p.player.id;
  if(db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(id))fail('Önce seçilen oyuncuyu zindandan çıkar; sıfırlama uygulanmadı.');
  const arena=db.prepare("SELECT arena_match_id FROM players WHERE id=? AND arena_match_id!=''").get(id)?.arena_match_id;
  if(arena&&!p.wars.includes(arena))fail('Önce seçilen oyuncunun arena karşılaşmasını bitir; sıfırlama uygulanmadı.');
  if(p.membership&&!p.owned.some(g=>g.id===p.membership)&&db.prepare('SELECT 1 FROM guild_war_locks WHERE guild_id=?').get(p.membership))fail('Önce lonca savaşı bitmeli; sıfırlama uygulanmadı.');
  if(db.prepare('SELECT 1 FROM market_settlements WHERE (seller_id=? OR buyer_id=?) AND applied_at_ms<=0 LIMIT 1').get(id,id)||db.prepare('SELECT 1 FROM rune_v2_boss_winner_claims483 WHERE winner_id=? AND applied=0 LIMIT 1').get(id))fail('Tamamlanmamış kalıcı ödül veya alışveriş kaydı var; sıfırlama uygulanmadı.');
 }
 const effects=result=>({result,ejections:[],players:[],cycle:0});
 return {async run(input,actor){
  if(!input||!PLAYER.test(input.playerId??'')||!REQUEST.test(input.requestId??'')||input.confirmation!==PLAYER_RESET_CONFIRMATION495)fail('Oyuncuyu tamamen sıfırlamak için güncel panelde onayı doğrula.');
  if(typeof actor!=='string'||!actor||actor.length>160)fail('Yönetici kimliği geçersiz.');
  if(typeof permanent!=='function'||typeof refreshHp!=='function'||typeof repairHall!=='function')fail('Güncel kalıcı oyun yazıcısı gerekli.');
  const prior=receipt(input,actor);if(prior)return effects(prior);
  const held=plan(input.playerId);preflight(held);
  const output=await permanent(held.held.map(p=>p.id),()=>{
   if(db.isTransaction||db.prepare('PRAGMA synchronous').get().synchronous!==2||db.prepare('PRAGMA foreign_keys').get().foreign_keys!==1)fail('Oyuncu sıfırlaması FULL kalıcı yazıcı gerektirir.');
   db.exec('BEGIN IMMEDIATE');
   try{
    const previous=receipt(input,actor);if(previous){db.exec('COMMIT');return effects(previous);}
    const current=plan(input.playerId);
    if(JSON.stringify(current)!==JSON.stringify(held))fail('Oyuncu, lonca veya takas kapsamı değişti. Aynı işlemi yeniden dene.');
    preflight(current);
    const time=now();if(!Number.isSafeInteger(time)||time<1)fail('Sunucu saati geçersiz.');
    const seconds=Math.floor(time/1000),id=input.playerId;
    const before=db.prepare('SELECT * FROM players WHERE id=?').get(id);
    const settings=db.prepare('SELECT player_max_hp FROM combat_settings WHERE id=1').get();
    const power=db.prepare('SELECT starter_weapon_power FROM game_settings WHERE id=1').get()?.starter_weapon_power;
    if(!Number.isSafeInteger(settings?.player_max_hp)||settings.player_max_hp<1||!Number.isSafeInteger(power)||power<0)fail('Başlangıç karakter ayarları geçersiz.');
    const owned=current.owned.map(g=>({...db.prepare('SELECT * FROM guilds WHERE id=?').get(g.id),castle:db.prepare('SELECT * FROM guild_castles WHERE guild_id=?').get(g.id)??null}));
    const erasedStocks=Object.fromEntries(PERSONAL_STOCK_TABLES495.map(table=>[table,db.prepare(`SELECT COUNT(*) n FROM ${quote(table)} WHERE player_id=?`).get(id).n]));
    const passPurchases=db.prepare('SELECT * FROM battle_pass_purchases WHERE player_id=?').all(id);
    const bank=db.prepare('SELECT gems,paid_gems FROM gem_bank485 WHERE player_id=?').get(id)??null;
    // Advance the existing daily ledger before clearing scores. Consume only
    // this player's pending credits, then include their balance in the reset.
    const today=Math.floor((time+OFFSET_MS)/DAY_MS);
    db.prepare('UPDATE daily_monster_reward_state477 SET active_day=? WHERE id=1 AND enabled=1 AND active_day<?').run(today,today);
    const daily=db.prepare("SELECT * FROM daily_monster_rewards477 WHERE player_id=? AND status='pending' ORDER BY day").all(id);
    for(const reward of daily){
     const balance=db.prepare('UPDATE players SET core_coins=core_coins+? WHERE id=? RETURNING core_coins').get(reward.amount,id);
     if(db.prepare("UPDATE daily_monster_rewards477 SET status='paid',paid_at_ms=?,balance_after=? WHERE day=? AND player_id=? AND status='pending'").run(time,balance.core_coins,reward.day,id).changes!==1)fail('Günlük ödül kaydı değişti.');
    }
    for(const trade of current.trades){
     db.prepare("UPDATE player_trades SET status='cancelled',revision=revision+1,a_ready=0,b_ready=0,a_confirm=0,b_confirm=0 WHERE id=? AND status IN('invited','open')").run(trade.id);
     db.prepare('DELETE FROM player_trade_locks WHERE trade_id=?').run(trade.id);
    }
    for(const war of current.wars){
     db.prepare(`INSERT INTO guild_war_returns(war_id,player_id,channel) SELECT arena_match_id,id,channel FROM players WHERE arena_match_id=?
      ON CONFLICT(war_id,player_id) DO UPDATE SET channel=excluded.channel`).run(war);
     db.prepare("UPDATE arena_matches SET status='cancelled',winner_team=0,finished_at_ms=?,updated_at_ms=? WHERE id=? AND status IN('waiting','countdown','active')").run(time,time,war);
    }
    for(const g of current.owned){
     if(db.prepare('SELECT 1 FROM guild_war_locks WHERE guild_id=?').get(g.id)||db.prepare("SELECT 1 FROM guild_wars WHERE (challenger=? OR defender=?) AND status='active'").get(g.id,g.id))fail('Lonca savaşı güvenle kapatılamadı; sıfırlama uygulanmadı.');
     db.prepare('UPDATE guilds SET treasury=0 WHERE id=?').run(g.id);
     // Existing disband triggers archive finances; castle FKs remove its
     // skill, guest and contribution state. No other guild is deleted.
     db.prepare('DELETE FROM guilds WHERE id=? AND leader_id=?').run(g.id,id);
    }
    db.prepare('DELETE FROM guild_members WHERE player_id=?').run(id);
    db.prepare('DELETE FROM guild_invites WHERE sender_id=? OR recipient_id=?').run(id,id);
    db.prepare('DELETE FROM guild_castle_guests WHERE player_id=?').run(id);
    const ejections=[];
    for(const playerId of current.affected){const event=repairHall(playerId);if(event&&typeof event.then==='function')fail('Senkron salon dönüşü gerekli.');if(event&&playerId!==id)ejections.push(event);}
    // Erase upgrade metadata only for items still owned/escrowed by this
    // player. Completed sales now owned by another player stay untouched.
    db.prepare(`DELETE FROM item_enhancements491 WHERE item_id IN (
     SELECT id FROM player_items WHERE player_id=? UNION SELECT id FROM player_storage_items WHERE player_id=?
     UNION SELECT item_id FROM market_listings WHERE seller_id=?)`).run(id,id,id);
    // blacksmith_upgrades is a unique claim ledger, not inventory. Keep it:
    // a previously upgraded/sold item may now belong to another player.
    for(const table of PERSONAL_STOCK_TABLES495)db.prepare(`DELETE FROM ${quote(table)} WHERE player_id=?`).run(id);
    db.prepare('DELETE FROM dragon_drop_payloads WHERE drop_id IN(SELECT id FROM world_drops WHERE owner_id=?)').run(id);
    db.prepare('DELETE FROM world_drops WHERE owner_id=?').run(id);
    db.prepare('DELETE FROM market_listings WHERE seller_id=?').run(id);
    db.prepare('DELETE FROM market_shops WHERE owner_id=?').run(id);
    db.prepare('DELETE FROM premium_listings WHERE seller_id=?').run(id);
    db.prepare('UPDATE gem_bank485 SET gems=0,paid_gems=0 WHERE player_id=?').run(id);
    // Preserve the immutable claim/transaction ledgers. Only active premium
    // pass entitlement is removed, with its full purchase rows in this audit.
    db.prepare('DELETE FROM battle_pass_purchases WHERE player_id=?').run(id);
    db.prepare('DELETE FROM community_progress WHERE account_id=?').run(before.account_id);
    db.prepare('DELETE FROM arena_match_players WHERE player_id=?').run(id);
    const parties=db.prepare('SELECT id FROM parties WHERE leader_id=? OR id IN(SELECT party_id FROM party_members WHERE player_id=?)').all(id,id);
    db.prepare('DELETE FROM party_invites WHERE recipient_id=? OR sender_id=?').run(id,id);
    db.prepare('DELETE FROM party_members WHERE player_id=?').run(id);
    for(const party of parties){
     const member=db.prepare('SELECT player_id FROM party_members WHERE party_id=? ORDER BY joined_at,player_id LIMIT 1').get(party.id);
     if(member)db.prepare('UPDATE parties SET leader_id=? WHERE id=? AND leader_id=?').run(member.player_id,party.id,id);
     else db.prepare('DELETE FROM parties WHERE id=?').run(party.id);
    }
    // Pending opening chests are consumed administratively, never deleted and
    // regranted on the next world poll. The audit records this forfeiture.
    const opening=db.prepare('SELECT * FROM prereg_rewards WHERE account_id=?').get(before.account_id)??null;
    const manual=db.prepare('SELECT * FROM starter_admin_grants WHERE account_id=? AND player_id=? AND opened_at_ms=0').all(before.account_id,id);
    db.prepare('INSERT INTO prereg_rewards(account_id,player_id,granted_at_ms,opened_at_ms) VALUES(?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET opened_at_ms=CASE WHEN opened_at_ms=0 THEN excluded.opened_at_ms ELSE opened_at_ms END').run(before.account_id,id,time,time);
    db.prepare('UPDATE starter_admin_grants SET opened_at_ms=? WHERE account_id=? AND player_id=? AND opened_at_ms=0').run(time,before.account_id,id);
    // Preserve the old global ownership trigger and cross its protected 1->0
    // edge only inside this one atomic operation. Intermediate 2 never commits.
    db.prepare('UPDATE players SET has_wings=2 WHERE id=? AND has_wings=1').run(id);
    if(db.prepare(resetSql).run(settings.player_max_hp,settings.player_max_hp,seconds,time,id).changes!==1)fail('Oyuncu sıfırlanamadı.');
    db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at) VALUES(?,?,'weapon',?,'white',?,?,'[]',1,?)")
     .run(randomUUID(),id,before.role==='avci'?'Acemi Yayı':before.role==='arkanist'?'Acemi Asası':'Acemi Kılıcı',power,before.role,seconds);
    for(const playerId of current.affected){const result=refreshHp(playerId);if(result&&typeof result.then==='function')fail('Senkron can yenilemesi gerekli.');}
    db.prepare('UPDATE players SET hp=max_hp WHERE id=?').run(id);
    const players=current.held.map(p=>db.prepare('SELECT id,channel,area,arena_match_id,hp,max_hp,hp_revision FROM players WHERE id=?').get(p.id));
    if(players.some((p,i)=>!p||p.channel!==current.held[i].channel))fail('Kanal sahipliği değişecekti; sıfırlama uygulanmadı.');
    const byId=new Map(players.map(p=>[p.id,p]));for(const event of ejections){const p=byId.get(event.playerId);event.hp=p.hp;event.maxHp=p.max_hp;event.hpRevision=p.hp_revision;}
    const result={ok:true,requestId:input.requestId,playerId:id,playerName:before.name,guilds:owned.length,castles:owned.filter(g=>g.castle).length,replayed:false};
    db.prepare("INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) VALUES(?,?,'reset_player',?,?,?)")
     .run('reset-player495:'+input.requestId,actor,before.account_id,JSON.stringify({playerId:id,confirmation:PLAYER_RESET_CONFIRMATION495,result,before,erasedStocks,bank,passPurchases,ownedGuilds:owned,settledBeforeResetDailyRewards:daily,forfeitedOpening:{prior:opening,manual}}),time);
    const cycle=db.prepare('SELECT cycle FROM world_state WHERE id=1').get()?.cycle??1;
    db.exec('COMMIT');return {result,ejections,players:players.map(({id,channel,area,arena_match_id})=>({id,channel,area,arena_match_id})),cycle};
   }catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
  });
  let voiceCleanupPending=false;try{await sweepVoice?.();}catch{voiceCleanupPending=true;}
  return {...output,result:{...output.result,voiceCleanupPending}};
 }};
}
