// TEST ONLY: richer synthetic inventory for the isolated population fixture.
// Call before channel startup. This does not model an anonymized live database.
// All powers, names and enchantments come from the selected tree's native loot
// functions/current settings. No invented combat power or guaranteed damage.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const slots=['weapon','armor','helmet','shoes','necklace'];
const roles=['muhafiz','avci','arkanist'];
const attackSpecialization={muhafiz:'muhafiz_strike',avci:'avci_sharp',arkanist:'arkanist_burst'};
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const equipmentId=(index,suffix)=>`population-equipped-${index}-${suffix}`;
const insertItemSql='INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)';

/**
 * Seed 5 equipped slots and bagItems ordinary gear rows per actor.
 * `rotateRoles` is explicit; default preserves each existing player role.
 * Returns only fixture metadata. Caller may pass actor.equipmentFixture to
 * the separate bot process; existing gateway must opt in to that extra field.
 */
export async function seedPopulationEquipment(sql,actors,{
 tree=process.env.STUTTER_TREE,bagItems=30,pet=true,wings=true,rotateRoles=false,nowMs=Date.now(),seed=1080712,
}={}){
 assert(typeof tree==='string'&&path.isAbsolute(tree),'selected isolated working tree required');
 assert(Array.isArray(actors)&&actors.length>0&&actors.length<=100);
 assert(Number.isSafeInteger(bagItems)&&bagItems>=0&&bagItems<=128);
 assert(Number.isSafeInteger(nowMs)&&nowMs>0);
 assert.equal(new Set(actors.map(a=>a.id)).size,actors.length);
 const core=path.join(tree,'core511-source/scripts/core511');
 const [{createRules},{specialization456}]=await Promise.all([
  import(pathToFileURL(path.join(core,'generated/rules.mjs')).href),
  import(pathToFileURL(path.join(tree,'native510-bb3a6cc689c6/lib/expansion456.mjs')).href),
 ]);
 const settings={...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM economy_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()};
 // Select a possible four-enchantment outcome using the existing generator.
 // Weight/tier values and item-slot restrictions remain the native ones. The
 // override only chooses this richer synthetic fixture, never changes SQL.
 const lootSettings={...settings,enchant_item_chance:1,enchant_one_chance:0,enchant_two_chance:0,enchant_three_chance:0,enchant_four_chance:1};
 let serial=0;const random=seeded(seed),rules=createRules({globals:{},random,uuid:()=>`population-drop-${++serial}`,now:()=>nowMs});
 const now=Math.floor(nowMs/1000),put=sql.prepare(insertItemSql),rows=[];
 const makeItem=(actor,role,index,kind,rarity,equipped)=>{
  const item={type:'gear',family:'generic',kind,rarity};
  // This native profile family permits helmets; ordinary open-world profiles
  // deliberately filter them through withLegacyHelmetDrops.
  const profile={version:1,key:'sinsi.stone',groups:[{id:'gear',rolls:1,gearChanceModel:'direct',charmMultiplierBps:10000,outcomes:[{id:kind,item,baseChancePpm:1000000,minAmount:1,maxAmount:1,charmWeight:1}]}]};
  // Native stone armor rolls can become helmets. Bounded selection obtains
  // one possible native item for the requested slot; it does not claim to
  // reproduce drop frequencies or count the other generated reward rows.
  let gear;
  for(let attempt=0;attempt<64&&!gear;attempt++){
   const generated=rules.prepareProfileDrops(profile,[{player_id:actor.id,role,level:1,drop_charm_until:0}],'population-gear-source',{x:1000,y:1000,area:'forest'},lootSettings,now,'{}');
   gear=generated.find(row=>row[3]===kind&&row[5]===rarity&&roles.includes(row[8]));
  }
  assert(gear,'native fixture gear missing '+JSON.stringify({kind,rarity}));
  const enchants=JSON.parse(gear[9]);
  assert.equal(gear[3],kind);assert.equal(gear[5],rarity);assert(Number.isSafeInteger(gear[6])&&gear[6]>=0);
  assert(Array.isArray(enchants)&&enchants.length>0&&enchants.length<=4,'native enchant weights must enable a valid richer fixture');
  const id=equipped?equipmentId(index,kind):equipmentId(index,'bag-'+rows.length);
  const name=rules.resolveLootItemName(item,role);
  assert(typeof name==='string'&&name.length>0);
  // Loot role is random; assign the selected valid player class and resolve
  // its native name. Power and allowed enchantments are class-independent.
  const row={id,player_id:actor.id,kind,item_name:name,rarity,power:gear[6],role,enchantments:gear[9],equipped,created_at:now-1-rows.length};
  put.run(...Object.values(row));rows.push(row);return row;
 };
 const summaries=[];
 sql.exec('SAVEPOINT population_equipment_fixture');
 try{
  for(let index=0;index<actors.length;index++){
   const actor=actors[index],player=sql.prepare('SELECT * FROM players WHERE id=?').get(actor.id);
   assert(player&&player.level>=30,'specialist fixture requires an already legal level30+ player');
   assert.equal(sql.prepare('SELECT COUNT(*) n FROM player_items WHERE player_id=?').get(actor.id).n,0,'seed only fresh empty fixture inventories');
   const role=rotateRoles?roles[index%roles.length]:player.role;
   assert(roles.includes(role),'native player role required');
   const specialization=attackSpecialization[role],branch=specialization456(role,specialization,settings);
   assert(branch&&!['heal','guard'].includes(branch.effect));
   sql.prepare('UPDATE players SET role=?,specialization=?,skill_four=MAX(1,skill_four) WHERE id=?').run(role,specialization,actor.id);
   const equipped=slots.map(kind=>makeItem(actor,role,index,kind,'blue',1));
   for(let bag=0;bag<bagItems;bag++)makeItem(actor,role,index,slots[bag%slots.length],['white','blue','orange','red'][bag%4],0);
   if(pet){
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM player_pets WHERE player_id=?').get(actor.id).n,0,'seed only fresh fixture pets');
    // Same legal starter-pet row shape as player-jobs-fixture.mjs; fresh,
    // rather than the expiry case used by that regression test.
    sql.prepare("INSERT INTO player_pets(player_id,kind,equipped,acquired_at) VALUES(?,'starter',1,?)").run(actor.id,now);
   }
   if(wings)sql.prepare('UPDATE players SET has_wings=1,wings_equipped=1,wings_expires_at_ms=? WHERE id=?').run(nowMs+3600000,actor.id);
   const stats=rules.calculateEquipmentStats(role,equipped,settings,wings,false);
   for(const key of ['attack','defense'])if(Object.hasOwn(stats,key))assert(Number.isFinite(stats[key]),'native equipment stats must be finite');
   const abilities=[
    {ability:0,unlockLevel:1,skillLevel:player.skill_one,baseCooldownMs:650},
    {ability:1,unlockLevel:settings.skill_two_unlock_level,skillLevel:player.skill_two,baseCooldownMs:settings.skill_two_cooldown_ms},
    {ability:2,unlockLevel:settings.skill_three_unlock_level,skillLevel:player.skill_three,baseCooldownMs:settings.skill_three_cooldown_ms},
    {ability:3,unlockLevel:30,skillLevel:Math.max(1,player.skill_four),baseCooldownMs:branch.cooldown},
   ].map(a=>{
    assert(Number.isFinite(a.baseCooldownMs)&&a.baseCooldownMs>0&&Number.isFinite(a.unlockLevel));
    return {...a,available:player.level>=a.unlockLevel&&a.skillLevel>0,safeCadenceMs:Math.ceil(a.baseCooldownMs)+100};
   });
   // Base cooldown +100ms is deliberately conservative with attack/cast-speed
   // enchants. Bot still must respect server ACK reservedUntilMs/rejections,
   // stun, target lifetime and range. No guarantee that every cast can land.
   summaries.push({actor:actor.n??index,id:actor.id,role,specialization,equippedCount:5,bagItems,pet:pet?'starter':null,wings,weaponId:equipmentId(index,'weapon'),abilities});
  }
  sql.exec('RELEASE population_equipment_fixture');
 }catch(error){sql.exec('ROLLBACK TO population_equipment_fixture;RELEASE population_equipment_fixture');throw error;}
 for(let index=0;index<actors.length;index++)actors[index].equipmentFixture=summaries[index];
 return {synthetic:true,liveDatabase:false,gearSource:'native prepareProfileDrops / current realm settings',enchantmentSelection:'native valid four-enchantment outcome',actors:summaries,itemCount:rows.length,bagItemsPerActor:bagItems,roleRotation:rotateRoles};
}

// Read actual persisted weapon rows after acknowledged combat, rather than a
// client cache. Ordinary native lethal hits append/update evolution_kills;
// this helper never edits that counter or assumes Solo uses the same path.
export function populationWeaponCounterSnapshot(sql,actors){
 return actors.map((actor,index)=>{
  const weaponId=actor.equipmentFixture?.weaponId??equipmentId(index,'weapon');
  const row=sql.prepare("SELECT id,player_id,kind,equipped,enchantments FROM player_items WHERE id=?").get(weaponId);
  assert(row&&row.player_id===actor.id&&row.kind==='weapon'&&row.equipped===1,'fixture weapon must remain equipped');
  const counter=JSON.parse(row.enchantments).filter(e=>e.kind==='evolution_kills');
  assert(counter.length<=1);const kills=counter[0]?.value??0;
  assert(Number.isSafeInteger(kills)&&kills>=0&&kills<=1000000000);
  return {actor:actor.n??index,id:actor.id,zone:actor.zone??null,weaponId,kills};
 });
}
