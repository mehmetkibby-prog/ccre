// Sparse cleanup uses the SAME shared grant/flush/finish protocol as gameplay.
// No source-incarnation fence, proof bypass, global reset or timeout takeover.
const fail=code=>Object.assign(Error(code),{code});
const key=(name,keys)=>name+'\u001e'+keys.join('\u001f');
function selected(r,ids,rounds){return r.name==='monsters'?ids.has(r.keys[0]):r.name==='monster_participants'?ids.has(r.keys[0]):r.name==='boss_participants'?rounds.has(r.keys[0]):false;}
export function forgetSharedOwned(db,{ids,rounds},canonical=false){
 const runtime=db.loadlabSharedRuntime,shared=db.sharedCombat;if(!shared)return;
 const selectedIds=new Set(ids),selectedRounds=new Set(rounds),combat=db.combat,changes=[];
 for(const id of selectedIds)if(db.sqlite.prepare('SELECT 1 FROM main.monsters WHERE id=?').get(id))throw fail('shared_monster_still_exists');
 for(const [name,t]of combat.tables)for(const [id,e]of t.records){if(!selected({name,keys:e.keys},selectedIds,selectedRounds))continue;
  if(combat.dirty.has(name+'\u001e'+id))throw fail('shared_owned_dirty_after_drain');
  t.remove.run(...e.keys);t.records.delete(id);t.recent.add(id);changes.push({name,id});if(name==='monster_participants')combat.indexPending(id,{keys:e.keys,dirtyAt:0});
 }
 for(const k of shared.imported){const [name,id]=k.split('\u001e');if(selected({name,keys:id.split('\u001f').map((v,i)=>name==='boss_participants'&&i===0?Number(v):v)},selectedIds,selectedRounds))shared.imported.delete(k);}
 for(const id of selectedIds)shared.monsters.delete(id);shared.rounds=new Set([...shared.monsters.values()].filter(r=>r.is_boss).map(r=>r.spawn_round));
 if(canonical){if(!runtime?.state)throw fail('shared_canonical_unavailable');for(const [k,r]of runtime.state.records)if(selected(r,selectedIds,selectedRounds)){if(r.dirty)throw fail('shared_canonical_dirty_after_drain');runtime.state.records.delete(k);}for(const id of selectedIds)runtime.state.pendingKeys.delete(id);}
 if(changes.length)combat.publish(changes);for(const {name,id}of changes)combat.tables.get(name).recent.delete(id);
}
export function installSharedLoadLabControl({rpc,db,registry}){
 let hold=null;
 const revoked=runId=>{const run=registry.snapshot().runs.find(r=>r.id===runId);if(registry.active(runId)||run&&run.status!=='revoked')throw fail('revoke_before_shared_cleanup');};
 rpc.handlers.loadlabSharedSynchronize=async({runId})=>{
  if(db.channel!==1||!db.loadlabSharedRuntime?.state||!registry.snapshot().runs.some(r=>r.id===runId)||hold)throw fail('shared_sync_not_available');
  const rows=db.sqlite.prepare('SELECT id FROM main.monsters WHERE channel=0 AND loadlab_run_id=?').all(runId);
  for(const r of rows){if(registry.monsterRun(r.id)!==runId)throw fail('unowned_shared_sync');db.loadlabSharedRuntime.state.pendingKeys.add(r.id);}
  // Native finish fans out and awaits all current replica ACKs. This installs
  // newly provisioned shared targets before any bot's first action.
  await db.sharedCombat.flush();return {ok:true,runId,synchronized:rows.length};
 };
 rpc.handlers.loadlabSharedFreeze=async({runId,ids,rounds,token})=>{
  revoked(runId);if(db.channel!==1||!db.loadlabSharedRuntime?.state||hold||!Array.isArray(ids)||ids.length>225||!Array.isArray(rounds)||rounds.length>230400||!token)throw fail('shared_cleanup_not_available');
  const journal=db.sqlite.prepare("SELECT * FROM main.loadlab_cleanup_shared_v1 WHERE run_id=? AND token=?").get(runId,token);
  const deletedIds=new Set(journal?.status==='deleted'?JSON.parse(journal.ids_json):[]);
  for(const id of ids){const r=db.sqlite.prepare('SELECT loadlab_run_id,channel FROM main.monsters WHERE id=?').get(id);if(registry.monsterRun(id)!==runId||r&&(r.loadlab_run_id!==runId||r.channel!==0)||!r&&!deletedIds.has(id))throw fail('unowned_shared_cleanup_target');}
  const ledger=db.sqlite.prepare('SELECT boss_round FROM main.loadlab_boss_rounds_v1 WHERE run_id=?');const allowed=new Set(ledger.all(runId).map(r=>r.boss_round));if(rounds.some(r=>!allowed.has(r)))throw fail('unowned_shared_cleanup_round');
  let release,resolveReady,rejectReady;const released=new Promise(resolve=>release=resolve),ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const current={runId,ids,rounds,token,release};hold=current;
  current.work=db.sharedCombat.run(async()=>{
   await db.remote([]); // FULL writer ACK for native pending shared HP/records.
   // The authority still holds its pre-flush grant snapshot until finish.
   // Update only the owned canonical rows from the flushed exported records.
   const state=db.loadlabSharedRuntime.state;
   for(const r of db.sharedCombat.export())if(selected(r,new Set(ids),new Set(rounds))){const k=key(r.name,r.keys);if(state.records.has(k))state.records.set(k,structuredClone(r));}
   resolveReady({ok:true,runId,frozen:true});const mode=await released;
   if(mode==='deleted')forgetSharedOwned(db,{ids,rounds},true);
   return {ok:true};
  });
  current.work.catch(error=>{rejectReady(error);}).finally(()=>{if(hold===current)hold=null;});
  return ready;
 };
 rpc.handlers.loadlabSharedReplicaForget=({runId,ids,rounds})=>{
  revoked(runId);for(const id of ids)if(registry.monsterRun(id)!==runId)throw fail('unowned_shared_forget');
  // Owner has the normal exclusive grant. Replicas must not await their tail:
  // an unrelated real request may legitimately be queued behind that grant.
  forgetSharedOwned(db,{ids,rounds},false);return {ok:true};
 };
 rpc.handlers.loadlabSharedRelease=async({runId,token,deleted=false})=>{
  const h=hold;if(!h||h.runId!==runId||h.token!==token)throw fail('shared_cleanup_fence_mismatch');
  h.release(deleted?'deleted':'cancelled');await h.work;return {ok:true,runId,released:true};
 };
}
