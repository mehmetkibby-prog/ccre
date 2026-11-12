import {demand} from '../core511/contract.mjs';
// Called only on the exclusively flocked CURRENT DB, after all 511 owners have
// drained and exited and native signed maintenance startup has been verified.
// No backup restore, currency write, reward replay or schema downgrade occurs.
export async function reconcileFourthChannelRollback(host){
 demand(host.stopped()&&host.nativeRealmStartup?.ready,'rollback_stopped_signed_host');
 const policy=host.nativeRealmStartup.runtime.maintenance.policy;
 demand(policy?.phase==='maintenance'&&policy.deadlineMs<=Date.now(),'rollback_maintenance_required');
 return host.database.atomic(sql=>{
  demand(host.stopped()&&host.nativeRealmStartup.runtime.maintenance.policy===policy,'rollback_state_changed');
  for(const table of ['kernel511_admissions'])demand(sql.prepare('SELECT COUNT(*) n FROM '+table).get().n===0,'rollback_pending_'+table);
  // kernel511_transfers is a completed-transfer receipt log, not a queue.
  // Preserve it; unresolved work lives in the owner state/transfer fields.
  demand(sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_owners WHERE state='draining' OR transfer_id IS NOT NULL OR target_channel IS NOT NULL").get().n===0,'rollback_unresolved_transfer');
  // Online flags survive process exit; DatabaseHost.prepareWriter uses this
  // same inode-flock witness before retiring them. Every511 child inherits
  // that lock, so it cannot be acquired until the last holder has exited.
  host.assertOpen();demand(host.handle&&host.fileIdentity&&!host.core&&!host.children.size,'rollback_exclusive_host');
  for(const table of ['kernel511_channel_processes','kernel511_system_owners'])sql.prepare('UPDATE '+table+' SET online=0 WHERE online=1').run();
  demand(sql.prepare('SELECT COUNT(*) n FROM game_presence WHERE expires_at_ms>?').get(Date.now()).n===0,'rollback_live_presence_including_gm');
  const moved=sql.prepare('SELECT id FROM players WHERE channel=4 ORDER BY id').all().map(r=>r.id);
  const result={maintenanceRevision:policy.revision,players:moved.length,routing:{},restoredDatabase:false};
  // Stopped simulations retain their native dungeon/world/reward rows. Retire
  // only their 511 leases so no old epoch can become authoritative on upgrade.
  sql.exec("UPDATE kernel511_channel_owners SET state='released',epoch=epoch+1,release_sequence=sequence,transfer_id=NULL,target_channel=NULL WHERE state!='released'; DELETE FROM kernel511_simulations;");
  sql.prepare('UPDATE players SET channel=1,last_seen=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1 WHERE channel=4').run();
  for(const table of ['market_shops','world_drops','guild_war_returns','arena_queue']){
   if(!sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(table))continue;
   if(!sql.prepare('PRAGMA table_info('+table+')').all().some(c=>c.name==='channel'))continue;
   result.routing[table]=sql.prepare('UPDATE '+table+' SET channel=1 WHERE channel=4').run().changes;
  }
  // Preserve the user's25 ceiling even if the old build switches process mode.
  sql.prepare('UPDATE game_settings SET channel_capacity=25 WHERE id=1 AND channel_capacity!=25').run();
  sql.prepare('INSERT INTO channel_capacity_modes(mode,capacity) VALUES(0,25),(1,25) ON CONFLICT(mode) DO UPDATE SET capacity=excluded.capacity WHERE capacity!=25').run();
  return result;
 });
}
