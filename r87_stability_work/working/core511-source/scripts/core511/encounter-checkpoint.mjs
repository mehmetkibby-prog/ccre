import {quarantineDrainR531} from './r531-options.mjs';
import {actorFrameConflict} from './actor-frame-rejection.mjs';
import {rewardIdleCostR54} from './r54-options.mjs';
import {r35Options} from './r35-options.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';
import {monotonicEncounter,normalizeEncounterPlan,diagnoseEncounterClock} from './encounter-clock.mjs';
export const ENCOUNTER_FIELDS=Object.freeze(['player_id','monster_id','spawn_round','next_hit_at_ms','expires_at_ms','hit_sequence','updated_at_ms','last_skill_at_ms','attackers489']);
const copy=row=>row?Object.fromEntries(ENCOUNTER_FIELDS.map(k=>[k,row[k]])):null;
const equal=(a,b)=>!a||!b?a===b:ENCOUNTER_FIELDS.every(k=>a[k]===b[k]);
const clockOnly=(a,b)=>Boolean(a&&b)&&ENCOUNTER_FIELDS.every(k=>k==='updated_at_ms'||a[k]===b[k])&&[a.updated_at_ms,b.updated_at_ms].every(n=>Number.isSafeInteger(n)&&n>=0);

// Original pve row shape only. This joins the player's position/HP checkpoint
// transaction and cannot grant currency, items, XP or change monster health.
export function writeEncounterCheckpoint(sqlite,{base,current,transitions=[]},context){
 const saved=prepareCached477(sqlite,'SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor)??null;
 const metadataDrift=!equal(saved,base)&&r35Options.encounterSoft&&clockOnly(saved,base);
 if(!(equal(saved,base)||metadataDrift))throw actorFrameConflict('encounter_snapshot_conflict',context,sqlite);
 demand(Array.isArray(transitions),'encounter_transitions');
 for(const step of transitions)demand(step&&Object.keys(step).length===2&&Object.hasOwn(step,'before')&&Object.hasOwn(step,'after')&&((step.before===null&&step.after)||(step.before&&step.after===null)),'encounter_transition');
 for(const row of [base,current,...transitions.flatMap(step=>[step.before,step.after])])if(row){
  demand(Object.keys(row).length===ENCOUNTER_FIELDS.length&&ENCOUNTER_FIELDS.every(k=>Object.hasOwn(row,k))&&row.player_id===context.actor,'encounter_columns');
  demand(typeof row.monster_id==='string'&&row.monster_id.length>0&&row.monster_id.length<=256,'encounter_monster_id');
  for(const field of ENCOUNTER_FIELDS.filter(k=>!['player_id','monster_id','attackers489'].includes(k)))demand(Number.isSafeInteger(row[field])&&row[field]>=0,'encounter_numbers');
  demand(typeof row.attackers489==='string'&&row.attackers489.length<=32768,'encounter_json_size');
  const entries=JSON.parse(row.attackers489);demand(entries&&typeof entries==='object'&&!Array.isArray(entries)&&Object.keys(entries).length<=32,'encounter_limit');
  for(const [id,value]of Object.entries(entries)){
   demand(value&&id===value.monster_id&&id.length>0&&id.length<=256&&['spawn_round','next_hit_at_ms','last_skill_at_ms'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=0),'encounter_entry');
  }
 }
 if(metadataDrift){const stamp=Math.max(saved.updated_at_ms,base.updated_at_ms);diagnoseEncounterClock({actor:context.actor,reason:'timestamp_only_base',from:base.updated_at_ms,to:stamp});base={...base,updated_at_ms:stamp};}
 // V510 deletes the row when its final attacker leaves. A later INSERT starts
 // hit_sequence at zero. Keep those lifecycle boundaries across a five-second
 // checkpoint; monotonicity still applies WITHIN every encounter, not across
 // a proven DELETE/INSERT. The enclosing actor/epoch/sequence and base CAS are
 // unchanged, and the whole replay remains one durable transaction.
 ({current,transitions}=normalizeEncounterPlan({base,current,transitions},diagnoseEncounterClock));
 const advances=(previous,next)=>!previous||next.updated_at_ms>=previous.updated_at_ms&&next.hit_sequence>=previous.hit_sequence;
 let previous=base,lastTime=base?.updated_at_ms??0;
 for(const step of transitions){
  if(step.before){demand(previous&&advances(previous,step.before),'encounter_revision_regression');lastTime=step.before.updated_at_ms;previous=null;}
  else{demand(previous===null&&step.after.hit_sequence===0&&step.after.updated_at_ms>=lastTime,'encounter_restart_invalid');previous=step.after;lastTime=previous.updated_at_ms;}
 }
 demand(!current||advances(previous,current),'encounter_revision_regression');
 if(transitions.length)demand(Boolean(current)===Boolean(previous),'encounter_lifecycle_incomplete');
 if(equal(base,current)&&!transitions.length)return copy(saved);
 if(current){
  const p=prepareCached477(sqlite,'SELECT area,channel,hp FROM players WHERE id=?').get(context.actor);demand(p&&p.hp>0,'encounter_player_dead');
  // Old entries may refer to a previous spawn; they must not be converted into
  // an attack in a different area/channel by a stale or malformed checkpoint.
  const ids=new Set([current.monster_id,...Object.keys(JSON.parse(current.attackers489))]);
  if(rewardIdleCostR54){
   const rows=prepareCached477(sqlite,'SELECT id,area,channel FROM monsters WHERE id IN(SELECT value FROM json_each(?))').all(JSON.stringify([...ids])),found=new Map(rows.map(m=>[m.id,m]));
   for(const id of ids){const m=found.get(id);demand(m&&m.area===p.area&&(m.channel===0||m.channel===p.channel),'encounter_scope');}
  }else for(const id of ids){const m=prepareCached477(sqlite,'SELECT area,channel FROM monsters WHERE id=?').get(id);demand(m&&m.area===p.area&&(m.channel===0||m.channel===p.channel),'encounter_scope');}
  if(transitions.some(step=>step.after===null))prepareCached477(sqlite,'DELETE FROM pve_engagements WHERE player_id=?').run(context.actor);
  const keys=ENCOUNTER_FIELDS;prepareCached477(sqlite,'INSERT INTO pve_engagements ('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+') ON CONFLICT(player_id) DO UPDATE SET '+keys.slice(1).map(k=>k+'=excluded.'+k).join(',')).run(...keys.map(k=>current[k]));
 }else prepareCached477(sqlite,'DELETE FROM pve_engagements WHERE player_id=?').run(context.actor);
 return copy(current);
}

export class EncounterCheckpoints {
 constructor(read,write=null){demand(typeof read==='function','encounter_reader_missing');this.read=read;this.write=write;this.bases=new Map();this.transitions=new Map();}
 hydrate(id,row){this.bases.set(id,copy(row));this.transitions.set(id,[]);}
 hydrateCommitted(id,row){this.hydrate(id,quarantineDrainR531?this.read(id):row);}
 observe(id,before,after){if(this.bases.has(id)&&Boolean(before)!==Boolean(after))this.transitions.get(id).push(Object.freeze({before:copy(before),after:copy(after)}));}
 snapshot(id){demand(this.bases.has(id),'encounter_not_hydrated');const transitions=this.transitions.get(id);return {base:this.bases.get(id),current:copy(this.read(id)),...(transitions.length?{transitions:transitions.slice()}: {})};}
 changed(id){const value=this.snapshot(id);return Boolean(value.transitions?.length)||!equal(value.base,value.current);}
 acknowledged(id,snapshot,saved){const expected=normalizeEncounterPlan(snapshot).current,ackMatches=equal(expected,saved)||r35Options.encounterSoft&&clockOnly(expected,saved)&&saved.updated_at_ms>=expected.updated_at_ms;demand(equal(this.bases.get(id),snapshot.base)&&ackMatches,'encounter_ack_mismatch');const pending=this.transitions.get(id),sent=snapshot.transitions??[];demand(sent.every((step,i)=>step===pending[i]),'encounter_transition_ack_mismatch');pending.splice(0,sent.length);this.bases.set(id,copy(saved));const live=this.read(id),next=monotonicEncounter(saved,live);if(next!==live)this.write?.(id,next);}
 forget(id){this.bases.delete(id);this.transitions.delete(id);}
}

// Private native-operation overlays can clear and rearm before committing.
// Preserve only those boundaries plus the final rows; aborted plans publish
// nothing. Reusing the map does not mutate an already returned snapshot.
export class EncounterChanges extends Map {
 constructor(read){super();this.read=read;this.boundaries=[];}
 set(id,row){const before=this.has(id)?this.get(id):this.read(id);row=monotonicEncounter(before,row);if(Boolean(before)!==Boolean(row)){if(before)this.boundaries.push([id,before]);this.boundaries.push([id,row]);}return super.set(id,row);}
 snapshot(){return [...this.boundaries,...this];}
 clear(){super.clear();this.boundaries.length=0;}
}
