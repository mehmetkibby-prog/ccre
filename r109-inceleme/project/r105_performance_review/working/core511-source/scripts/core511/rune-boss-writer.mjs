import {createRuneBossRules} from './generated/rune-boss-rules.mjs';
import {createRetaliationRules} from './generated/retaliation-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand,validChannel} from './contract.mjs';
const fields=['id','spawn_round','session','seq','next_basic_at_ms','next_wave_at_ms','phase','cast_id','starts_at_ms','impact_at_ms','expires_at_ms','x','y','wave_damage','channel'];
const same=(a,b)=>a===null||b===null?a===b:fields.every(k=>Object.is(a[k],b[k]));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const plain=row=>row?{...row}:null;
export function checkpointRuneState(sql,{base,current},channel){
 const id='rune-v2-boss-c'+channel+'-1',saved=sql.prepare('SELECT * FROM rune_v2_boss_state484 WHERE id=?').get(id)??null;
 demand(same(saved,base),'rune_state_conflict');if(same(base,current))return;
 demand(base&&current&&current.id===id&&current.channel===channel&&Object.keys(current).length===fields.length&&fields.every(k=>Object.hasOwn(current,k)),'rune_state_checkpoint_scope');
 const mutable=new Set(['seq','next_basic_at_ms','phase']);for(const key of fields)if(!mutable.has(key))demand(Object.is(base[key],current[key]),'rune_state_checkpoint_fields');
 demand(Number.isSafeInteger(current.seq)&&current.seq>base.seq&&Number.isSafeInteger(current.next_basic_at_ms)&&current.next_basic_at_ms>=base.next_basic_at_ms&&['idle','impact'].includes(current.phase),'rune_state_checkpoint_invalid');
 sql.prepare('UPDATE rune_v2_boss_state484 SET seq=?,next_basic_at_ms=?,phase=? WHERE id=?').run(current.seq,current.next_basic_at_ms,current.phase,id);
}
export function createRuneBossHandler({services,authority,clock=Date.now}){
 demand(services?.sql&&authority,'rune_writer_dependencies');
 return (sql,payload,context)=>{
  const channel=context.peer.channel,id='rune-v2-boss-c'+channel+'-1';demand(sql.isTransaction&&validChannel(channel)&&payload?.session===context.peer.incarnation&&Number.isSafeInteger(payload.nowMs)&&payload.nowMs>0&&payload.nowMs<=clock()+5000&&payload.cycle===sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,'rune_writer_scope');
  demand(Array.isArray(payload.actors)&&payload.actors.length<=25&&new Set(payload.actors.map(a=>a.id)).size===payload.actors.length&&Array.isArray(payload.frames),'rune_writer_actors');
  for(const actor of payload.actors){const owner=authority.assertSimulated(sql,context.peer,actor.id,actor.epoch,{allowDraining:true});demand(owner.sequence===actor.sequence,'rune_writer_actor_sequence');}
  const monster=sql.prepare('SELECT * FROM monsters WHERE id=?').get(id);demand(monster&&Object.keys(monster).every(k=>Object.is(monster[k],payload.monster?.[k])),'rune_writer_monster_conflict');
  const settings={...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()};demand(equal(settings,payload.settings),'rune_writer_settings_conflict');
  const rng=new OperationRandom(payload.seed),rules=createRuneBossRules({globals:services.globals,uuid:()=>rng.uuid()}),combat=createRetaliationRules({globals:services.globals,now:()=>payload.nowMs,random:()=>rng.roll(),fourChannels:true}),db={...nativeAtomicStatements(sql),channel,owners:new Set(payload.actors.map(a=>a.id))};
  const actual=rules.readPlayers(db,payload.actors.map(a=>a.id),channel),expected=new Map(payload.frames.map(row=>[row.id,row]));demand(actual.length===expected.size&&actual.every(row=>{const snapshot=expected.get(row.id);return snapshot&&Object.keys(row).every(k=>k==='last_seen'||Object.is(row[k],snapshot[k]));}),'rune_writer_player_conflict');
  const rows=new Map(payload.actors.map(a=>[a.id,sql.prepare('SELECT * FROM players WHERE id=?').get(a.id)]));db.worldLoop={enabled:true,activePlayers:db.owners,player:id=>rows.get(id),monster:target=>target===id?monster:null};
  demand(Array.isArray(payload.cache)&&payload.cache.length<=1,'rune_writer_cache');for(const [key,state]of payload.cache)demand(key===id&&state.id===id&&state.session===payload.session&&state.seq===payload.state.current?.seq&&fields.every(k=>k==='phase'||Object.is(state[k],payload.state.current[k]))&&(state.phase===payload.state.current.phase||state.phase==='idle'&&payload.state.current.phase==='impact'),'rune_writer_cache_conflict');
  checkpointRuneState(sql,payload.state,channel);const state={session:payload.session,states:new Map(payload.cache)},events=[];
  services.run(payload,()=>{if(payload.mode==='late_cancel'){const current=state.states.get(id);demand(current?.phase==='telegraph'&&clock()>current.impact_at_ms-500,'rune_not_late');rules.cancelNative(db,state,current,clock(),combat.pveAttackCadenceMs(monster));}else{demand(payload.mode==='step','rune_writer_mode');rules.runNative(db,state,{settings,damage:combat.runeBossDamage,cadence:combat.pveAttackCadenceMs,position:combat.monsterCombatPosition,publish:event=>events.push(event),nowMs:payload.nowMs,clock});}});
  return {state:plain(sql.prepare('SELECT * FROM rune_v2_boss_state484 WHERE id=?').get(id)),cache:[...state.states],views:[...rules.views],events,players:payload.actors.map(a=>plain(sql.prepare('SELECT * FROM players WHERE id=?').get(a.id)))};
 };
}
