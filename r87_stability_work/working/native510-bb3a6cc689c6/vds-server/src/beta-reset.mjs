import {randomUUID} from 'node:crypto';
import {mkdirSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

export const BETA_RESET_CONFIRMATION = 'BETA İÇİN TÜM OYUNCULARI SİL';
// Configuration and payment/audit receipts remain intact. No source database access.
const KEEP = new Set(['daily_monster_reward_state477','daily_monster_rewards477','progression_settings','guild_village_settings','dragon_settings','launch_email_settings','launch_email_preferences','launch_email_outbox','launch_settings','launch_access','premium_shop_settings','admin_audit_events','blocked_words','combat_settings','economy_settings','game_settings',
 'loot_profile_versions','loot_profiles','loot_templates','monster_combat_config','monster_combat_profiles',
 'payment_orders','payment_events','support_pack_grants','epin_batches','epin_codes',
 'monsters','resource_nodes','__appgarden_migrations','d1_migrations','dungeon_settings','app_release_migrations','level_balance_updates','__drizzle_migrations']);
export const RESET_TABLES = [
 'solo_daily_entries','solo_entry_receipts','solo_key_crafts',
 'guild_castle_receipts','guild_castle_guests','guild_castle_contributions','guild_castles',
 'dragon_drop_payloads','dragon_defeat_receipts',
 'community_claims','community_progress','community_contributions','community_kills','community_runs','community_audit',
 'storage_receipts','starter_admin_grants','prereg_rewards','item_link_receipts','bot_challenges','bot_due','premium_listings','premium_receipts','crystal_chest_openings','dungeon_event_claims',
 'guild_war_locks','guild_war_returns','guild_wars','guild_ledger','guild_invites','guild_essence_rewards','guild_monster_claims',
 // Deferred FKs let the guild be removed before its protected leader membership.
 'guild_banners','guilds','guild_members','closed_guild_ledger','closed_guilds',
 'dungeon_members','dungeon_runs','dungeon_rewards','dungeon_crafts','dungeon_materials','dungeon_wings',
 'auth_sessions','auth_tokens','game_presence','auth_rate_limits','account_security_state','anti_cheat_event_buckets','security_sanctions',
 'arena_announcements','arena_kill_claims','arena_match_players','arena_matches','arena_queue','arena_reward_claims',
 'black_loot_attempts','black_loot_chests','blacksmith_upgrades','boss_encounters','boss_defeats','boss_participants','boss_reward_claims',
 'character_names','combat_events','direct_message_dismissals','fishing_sessions','guardian_reward_claims',
 'market_listing_receipts','market_listings','market_settlements','market_shops','messages',
 'monster_participants','monster_xp_claims','normal_defeats','normal_reward_claims','parties','party_invites','party_members',
 'player_onboarding','player_items','player_storage_items','player_pets','player_stones','pve_engagements','pvp_reward_cooldowns',
 'sinsi_defeats','sinsi_reward_claims','support_messages','support_tickets','war_kill_claims','world_drops','players'
];
export function createBetaResetService({database,backupRoot,adminEmail='',adminUserId='',onCommitted=()=>{},now=Date.now}) {
 const sql=database.sqlite;let challenge=null;
 const names=()=>new Set(sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r=>r.name));
 function inspect(){
  database.assertAvailable();
  const tables=names(),known=new Set([...KEEP,...RESET_TABLES,'accounts','world_state']);
  const unknown=[...tables].filter(t=>!known.has(t));
  if(unknown.length)throw new Error('Yeni veri tabloları için sıfırlama kapsamı kontrol edilmeli: '+unknown.join(', '));
  const admins=sql.prepare('SELECT id FROM accounts WHERE id=? OR lower(email_normalized)=?').all(adminUserId,adminEmail.toLowerCase()).map(r=>r.id);
  const count=t=>tables.has(t)?Number(sql.prepare(`SELECT COUNT(*) n FROM "${t}"`).get().n):0;
  return {tables,admins,accounts:count('accounts')-admins.length,players:count('players'),items:count('player_items')+count('player_storage_items')};
 }
 return {
  preview(actor){const info=inspect();challenge={token:randomUUID(),actor,expiresAt:now()+300000};return {...challenge,actor:undefined,accounts:info.accounts,players:info.players,items:info.items,preservedAdminAccounts:info.admins.length};},
  execute(actor,{token,confirmation}={}){
   if(!challenge||challenge.actor!==actor||challenge.token!==token||challenge.expiresAt<now()||confirmation!==BETA_RESET_CONFIRMATION)throw new Error('Sıfırlama onayı geçersiz veya süresi dolmuş. Önizlemeyi yeniden aç.');
   const info=inspect();challenge=null;
   mkdirSync(backupRoot,{recursive:true,mode:0o700});
   const backupName=`before-beta-reset-${now()}-${randomUUID()}.sqlite`,backupFile=join(backupRoot,backupName);
   // Synchronous snapshot prevents request/clock writes between backup and reset.
   sql.prepare('VACUUM INTO ?').run(backupFile);chmodSync(backupFile,0o600);
   const check=new DatabaseSync(backupFile,{readOnly:true});
   try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Yedek doğrulanamadı. Hiçbir hesap silinmedi.');}finally{check.close();}
   sql.exec('BEGIN IMMEDIATE; PRAGMA defer_foreign_keys=ON;');
   try{
    for(const table of RESET_TABLES)if(info.tables.has(table)){if(table==='guilds')sql.exec('UPDATE guilds SET treasury=0');sql.exec(`DELETE FROM "${table}"`);}
    if(info.admins.length)sql.prepare(`DELETE FROM accounts WHERE id NOT IN (${info.admins.map(()=>'?').join(',')})`).run(...info.admins);
    else sql.exec('DELETE FROM accounts');
    sql.prepare('UPDATE world_state SET health=100, cycle=cycle+1, reset_at=0, updated_at=?, guardian_reward_at=? WHERE id=1').run(Math.floor(now()/1000),Math.floor(now()/1000)+3600);
    // E-Pin batches and every code remain unchanged, including redemption history.
    sql.prepare('INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) VALUES(?,?,?,?,?,?)').run(randomUUID(),actor,'beta_reset','',JSON.stringify({accounts:info.accounts,players:info.players,items:info.items,backupName}),now());
    if(sql.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Veri bütünlüğü kontrolü başarısız. Silme işlemi geri alındı.');
    sql.exec('COMMIT');
   }catch(error){sql.exec('ROLLBACK');throw error;}
   // Block any pre-reset in-flight request until the supervised process restarts.
   database.maintenance=true;
   onCommitted();
   return {ok:true,accounts:info.accounts,players:info.players,items:info.items,backupName,restarting:true};
  }
 };
}
