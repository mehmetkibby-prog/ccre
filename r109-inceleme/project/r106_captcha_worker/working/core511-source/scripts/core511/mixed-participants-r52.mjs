import {mixedParticipantFastpathR52} from './r52-options.mjs';
import {mixedParticipantIndexR51} from './r51-options.mjs';
import {mixedParticipantsR51} from './mixed-participants-r51.mjs';

// This index contains only immutable participant rows already owned by the
// ordinary Map. It grants no owner, party, life or resource authority. Current
// monster HP/rounds and all existing planning/DB scope checks still run.
export const MIXED_PARTICIPANT_LIMIT_R52=65536;
export const mixedParticipantMetricsR52={queries:0,indexedQueries:0,fallbacks:0,participantVisits:0,updates:0,disabled:0};
const nativeRow=row=>{
 if(!row||!Object.isFrozen(row))return false;
 const prototype=Object.getPrototypeOf(row);if(prototype!==Object.prototype&&prototype!==null)return false;
 const monster=Object.getOwnPropertyDescriptor(row,'monster_id'),round=Object.getOwnPropertyDescriptor(row,'spawn_round'),player=Object.getOwnPropertyDescriptor(row,'player_id');
 return monster&&Object.hasOwn(monster,'value')&&typeof monster.value==='string'&&round&&Object.hasOwn(round,'value')&&Number.isSafeInteger(round.value)&&player&&Object.hasOwn(player,'value')&&typeof player.value==='string';
};
const nativeMonster=monster=>{
 if(!monster||typeof monster!=='object')return false;
 const id=Object.getOwnPropertyDescriptor(monster,'id'),round=Object.getOwnPropertyDescriptor(monster,'spawn_round'),hp=Object.getOwnPropertyDescriptor(monster,'hp');
 return id&&Object.hasOwn(id,'value')&&typeof id.value==='string'&&round&&Object.hasOwn(round,'value')&&Number.isSafeInteger(round.value)&&hp&&Object.hasOwn(hp,'value')&&typeof hp.value==='number'&&Number.isFinite(hp.value);
};

export class MixedParticipantMapR52 extends Map{
 #lives=new Map();#entries=new Map();#serial=0;#invalid=0;#disabled=false;
 constructor(rows){super();if(rows)for(const [key,row]of rows)this.set(key,row);}
 #disable(){this.#disabled=true;this.#lives.clear();this.#entries.clear();this.#invalid=0;mixedParticipantMetricsR52.disabled++;}
 #remove(key,entry){
  if(!entry.valid){this.#invalid--;return;}
  const row=entry.row,rounds=this.#lives.get(row.monster_id),bucket=rounds.get(row.spawn_round);bucket.delete(key);
  if(!bucket.size)rounds.delete(row.spawn_round);if(!rounds.size)this.#lives.delete(row.monster_id);
 }
 set(key,row){
  const existed=super.has(key),previous=this.#entries.get(key);super.set(key,row);
  if(this.#disabled)return this;
  // Refuse a detected bypass of public Map mutation methods. Production
  // callers use set/delete/clear; oversized history disables until clear().
  if(this.size>MIXED_PARTICIPANT_LIMIT_R52||existed&&!previous||this.#serial>=Number.MAX_SAFE_INTEGER){this.#disable();return this;}
  if(previous?.row===row)return this;
  const valid=nativeRow(row);mixedParticipantMetricsR52.updates++;
  if(previous?.valid&&valid&&previous.row.monster_id===row.monster_id&&previous.row.spawn_round===row.spawn_round){previous.row=row;return this;}
  if(previous&&!previous.valid&&!valid){previous.row=row;return this;}
  if(previous)this.#remove(key,previous);
  const entry={row,order:previous?.order??++this.#serial,valid};this.#entries.set(key,entry);
  if(!entry.valid){this.#invalid++;return this;}
  let rounds=this.#lives.get(row.monster_id);if(!rounds)this.#lives.set(row.monster_id,rounds=new Map());
  let bucket=rounds.get(row.spawn_round);if(!bucket)rounds.set(row.spawn_round,bucket=new Map());bucket.set(key,entry);return this;
 }
 delete(key){
  const existed=super.delete(key);if(!existed||this.#disabled)return existed;
  const entry=this.#entries.get(key);if(!entry){this.#disable();return existed;}
  this.#remove(key,entry);this.#entries.delete(key);return existed;
 }
 clear(){super.clear();this.#lives.clear();this.#entries.clear();this.#serial=0;this.#invalid=0;this.#disabled=false;}
 diagnostics(){return {rows:this.size,indexed:this.#entries.size,lives:this.#lives.size,invalid:this.#invalid,disabled:this.#disabled};}
 select(actor,monsters){
  if(this.#disabled||this.#invalid||this.#entries.size!==this.size||!Array.isArray(monsters))return null;
  // Unfamiliar input retains R51's strict equality/NaN/coercion behavior.
  for(const monster of monsters)if(!nativeMonster(monster))return null;
  const first=new Map();
  for(const monster of monsters){
   if(!(monster.hp>0))continue;
   const bucket=this.#lives.get(monster.id)?.get(monster.spawn_round);if(!bucket)continue;
   for(const {row,order}of bucket.values()){
    mixedParticipantMetricsR52.participantVisits++;
    if(row.player_id!==actor){const previous=first.get(row.player_id);if(previous===undefined||order<previous)first.set(row.player_id,order);}
   }
  }
  // Buckets are visited in target order, but the old planner visits the Map
  // once. Earliest global insertion ordinal preserves that exact actor order.
  const actors=new Set([actor]);for(const [id]of [...first].sort((a,b)=>a[1]-b[1]))actors.add(id);
  mixedParticipantMetricsR52.indexedQueries++;return actors;
 }
}

export function createMixedParticipantMapR52(rows){return mixedParticipantFastpathR52&&mixedParticipantIndexR51?new MixedParticipantMapR52(rows):new Map(rows);}
export function mixedParticipantsR52(actor,monsters,participants){
 mixedParticipantMetricsR52.queries++;
 if(mixedParticipantFastpathR52&&participants instanceof MixedParticipantMapR52){const actors=participants.select(actor,monsters);if(actors)return actors;}
 mixedParticipantMetricsR52.fallbacks++;return mixedParticipantsR51(actor,monsters,participants.values());
}
