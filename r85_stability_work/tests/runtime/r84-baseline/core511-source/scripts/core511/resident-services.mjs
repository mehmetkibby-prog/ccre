import {createCombatServices,extraBuff,guildSkillLevel,EMPTY_GUILD_BUFF,infiniteEquipmentPower} from './generated/combat-services.mjs';
import {demand} from './contract.mjs';

const immutable=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))immutable(child);Object.freeze(value);}return value;};

// Only a committed read-worker snapshot can replace configuration or guild
// state. Timed buffs still evaluate the native current-clock predicates on
// every hit; a five-second checkpoint never extends a premium/guild effect.
export class ResidentServices {
 constructor({player,locked,config,clock=Date.now}){
  demand(typeof player==='function'&&typeof locked==='function','resident_services_dependencies');
  Object.assign(this,{player,locked,clock});this.guild=new Map();this.eventProfiles=new Map();this.adventureProfiles=new Map();this.globals={};this.revision=-1;
  this.configure(config);
 }
 configure(snapshot){
  demand(Number.isSafeInteger(snapshot?.revision)&&snapshot.revision>this.revision,'resident_config_revision');
  for(const key of ['rank','rune','runeV2','status','progression','dragon','dungeon','dungeonRaw','events'])demand(snapshot[key]&&typeof snapshot[key]==='object','resident_config_'+key);
  demand(Array.isArray(snapshot.eventProfiles),'resident_event_profiles');
  const c=immutable(structuredClone(snapshot)),profiles=new Map(c.eventProfiles);
  const services=createCombatServices({player:this.player,rank:c.rank.config,rune:c.rune.config,runeV2:c.runeV2.config,status:c.status.config,profiles});
  Object.assign(this.globals,services,{
   __colEquipmentSets:true,__colAdventure:Object.freeze({profile:m=>this.adventureProfiles.get(typeof m==='string'?m:m?.id)??null}),
   __colPremium:Object.freeze({buff:id=>extraBuff(this.player(id),this.clock())}),
   __colGuildSkill:Object.freeze({bonuses:id=>{const s=this.guild.get(id);return s&&s.active_until>this.clock()?{...guildSkillLevel(s.active_level),until:s.active_until}:EMPTY_GUILD_BUFF;}}),
   __colProgression:Object.freeze({snapshot:()=>c.progression}),
   __colRuneV2:Object.freeze({...services.__colRuneV2,settings:()=>c.runeV2}),
   __colDragonBoss:Object.freeze({settings:()=>c.dragon,infinitePower:item=>infiniteEquipmentPower(item,{infinite_power_percent:30,infinite_weapon_power:230,...c.dungeonRaw})}),
   __colDungeon:Object.freeze({locked:this.locked,settings:()=>c.dungeon}),
   __colEventIsland444:Object.freeze({...services.__colEventIsland444,settings:()=>c.events})
  });
  this.config=c;this.eventProfiles=profiles;this.revision=c.revision;
 }
 hydrate(bundle){
  demand(bundle?.player?.id&&Object.hasOwn(bundle,'guildSkill'),'resident_guild_snapshot_required');
  for(const [id,p]of bundle.adventure?.profiles??[])this.adventureProfiles.set(id,immutable(p));
  const row=bundle.guildSkill;
  if(row){demand(Number.isSafeInteger(row.active_until)&&Number.isSafeInteger(row.active_level)&&row.active_level>=0&&row.active_level<=3,'resident_guild_snapshot_invalid');this.guild.set(bundle.player.id,immutable({...row}));}
  else this.guild.delete(bundle.player.id);
 }
 forget(id){this.guild.delete(id);this.globals.__colRanks.forget(id);}
}
