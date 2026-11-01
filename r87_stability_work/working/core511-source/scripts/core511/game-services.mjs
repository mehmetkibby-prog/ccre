import {createCastleSchema} from './castle-schema-r59.mjs';
import {CastleServiceR59} from './castle-service-r59.mjs';
import {castleEnabled,castleMayDamage,castleSchedule,castleTestScheduleR59} from './castle-model-r59.mjs';
import {MountService} from './mounts-service.mjs';
import {AdventureService} from './adventure-service.mjs';
import {BeltService} from './belt-service.mjs';
import {installBeltHpGuard} from './belt-hp.mjs';
import {towerConfigFromDatabase} from './tower-config.mjs';
import {createTowerRules} from './tower-rules.mjs';
import {NativeModeServices} from './mode-services.mjs';
import {createDungeonRules} from './generated/dungeon-rules.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {demand} from './contract.mjs';
import {installBagLimit} from './bag-limit.mjs';

// Cold/writer services only. No native scheduler, reset, cleanup sweep or
// migration is run by construction. Every service body remains mechanically
// extracted from the pinned release; the existing database is authoritative.
export class NativeGameServices extends NativeModeServices {
 constructor(sql,options={}){
  super(sql,options);const {modules:m,globals:g,database:db}=this,now=()=>this.active?.nowMs??this.clock();
  if(!sql.prepare('PRAGMA query_only').get().query_only){installBeltHpGuard(sql,{now});installBagLimit(sql);createCastleSchema(sql);}
  g.__colEquipmentSets=true;g.__colProgression=m.progression.createProgressionSettings(db);
  g.__colPremium=new m.premium.PremiumEngine(db,{now,wheelRandom:(...args)=>{demand(this.active,'mode_random_outside_operation');return this.active.integer(...args);}});
  g.__colGuildSkill=m.guildSkill.createGuildSkill(db,{now,refreshHp:id=>g.__colPremium.refreshHp(id)});
  const random=()=>{demand(this.active,'mode_random_outside_operation');return this.active.random();},uuid=()=>{demand(this.active,'mode_random_outside_operation');return this.active.uuid();};
  const rules=createDungeonRules({globals:g,progressionSettings:()=>g.__colProgression.snapshot(),randomUUID:uuid,randomInt:(...args)=>{demand(this.active,'mode_random_outside_operation');return this.active.integer(...args);}});
  // Main writer holds the native read/admin methods, never a duplicate room
  // simulation or timer. Room state belongs exclusively to its channel.
  const dungeon=Object.create(rules.DungeonEngine.prototype);Object.assign(dungeon,{db,now,runs:new Map(),notices:new Map(),settingsSnapshot:table=>table==='kadim_tower_settings'?towerConfigFromDatabase(sql):sql.prepare('SELECT * FROM '+({game_settings:'game_settings',combat_settings:'combat_settings'}[table]??'invalid_settings')).get()});
  // Inventory commands reuse the established tower economy rules without
  // constructing a native dungeon scheduler. Their nested receipt must join
  // the sole writer's current atomic command; only its outer commit may ACK.
  const inventory=Object.create(dungeon);Object.assign(inventory,{roll:random,transaction:fn=>{demand(sql.isTransaction&&this.active,'tower_inventory_writer_context');return fn();}});
  const tower=createTowerRules({randomUUID:uuid,globals:g});
  dungeon.towerOpenChest=tower.towerOpenChest.bind(inventory);dungeon.towerRefine=tower.towerRefine.bind(inventory);
  g.__colDungeon=dungeon;
  g.__colAdventure=new AdventureService(sql,{now,lootClock:this.clock,random,uuid,globals:g});
  g.__colMounts=new MountService(sql,{now,uuid,locked:id=>Boolean(g.__colDungeon.locked(id)||g.__colAdventure.membership(id))});
  g.__colBelt=new BeltService(sql,{now,uuid,refreshHp:id=>g.__colPremium.refreshHp(id),locked:id=>Boolean(g.__colDungeon.locked(id)||g.__colAdventure.membership(id))});
  this.castle=new CastleServiceR59(sql,{clock:this.clock,services:this});
  if(castleEnabled()){let policy=null;const current=()=>{if(!this.active||policy?.operation!==this.active)policy={operation:this.active,boot:this.castle.boot(),guilds:new Map()};return policy;};const guild=id=>{const p=current();if(!p.guilds.has(id))p.guilds.set(id,this.castle.guild(id)?.id??null);return p.guilds.get(id);};g.__colCastle={guild,command:(id,input)=>input.action==='castle_enter_r59'?this.castle.enter(id):this.castle.leave(id),mayDamage:(a,b)=>{const {boot}=current(),now=this.clock(),test=castleTestScheduleR59(boot.config,now);return (Boolean(test)||boot.config.enabled&&boot.state?.status==='active'&&boot.state.day===castleSchedule(now).day)&&castleMayDamage(a,b,now,guild,test??castleSchedule(now));}};}
  this.rules=createAttackWriterRules({globals:g,now,random,uuid,fourChannels:true});
  this.rules.dungeonService(); // Original equipment stats and solo gear rolls.
 }
 refresh({rankRefreshR85=null,serviceRefreshR89=null}={}){super.refresh({serviceRefreshR89});if(!serviceRefreshR89?.refresh(this,'__colProgression'))this.globals.__colProgression.refresh();this.globals.__colRanks=rankRefreshR85?rankRefreshR85.refresh(this):this.modules.ranks.createRanks(this.database);}
 dungeonOptions(){
  const g=this.globals;return {globals:g,stats:(...args)=>g.__colDungeon.stats(...args),makeGear:(...args)=>g.__colDungeon.makeGear(...args),progressionSettings:()=>g.__colProgression.snapshot()};
 }
 eventProfile(kind,settings){demand(this.active,'event_profile_operation');return this.rules.eventBossProfile444(kind,settings);}
}
