import test from 'node:test';
import assert from 'node:assert/strict';
import {native,hash} from './helpers.mjs';
import {setupPvp,json,update} from './pvp-fixture.mjs';
import {NativeModeServices} from '../mode-services.mjs';
import {createModeWriterHandler} from '../mode-writer.mjs';
import {captureModes,compareMode,compareModeSync,prepareCauldron,prepareModeCase,modeGlobals} from './mode-fixture.mjs';

const make=s=>new NativeModeServices(s.sql,{globals:modeGlobals,clock:()=>s.nowMs,fourChannels:false});
test('native mode factories require synchronous owned writer context and deterministic UUIDs',async t=>{
 const s=await setupPvp(t),services=make(s);
 assert.throws(()=>services.run({nowMs:s.nowMs,seed:s.seed},()=>{}),/mode_writer_context/);
 await assert.rejects(s.f.database.atomic(()=>services.run({nowMs:s.nowMs,seed:s.seed},()=>Promise.resolve())),/async_mode_service/);
 await assert.rejects(s.f.database.atomic(()=>services.run({nowMs:s.nowMs,seed:s.seed},()=>services.run({nowMs:s.nowMs,seed:s.seed},()=>{}))),/mode_writer_context/);
 const before=captureModes(s.sql),handler=createModeWriterHandler({services,assertOwnership:()=>false,assertResources:()=>true});
 await assert.rejects(s.f.database.atomic(sql=>handler(sql,{kind:'rune',input:{action:'rune_claim'},seed:s.seed,nowMs:s.nowMs},{actor:s.id})),/mode_owner_fenced/);assert.deepEqual(captureModes(s.sql),before);
});
test('all native rune inventory operations preserve SQL rows, UUID, costs and replay',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest',actor:{level:65,rank_tier:1}});const services=make(s),{createRunes}=await native('vds-server/src/runes.mjs');
 s.sql.function('unixepoch',()=>Math.floor(s.nowMs/1000));
 for(const kind of ['rune_attack','rune_defense','rune_hp'])s.sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,100) ON CONFLICT(player_id,kind) DO UPDATE SET amount=100').run(s.id,kind);
 const run=async(action,extra={})=>{const input={action,requestId:'mode-native-'+action,...extra};return compareMode(s,services,action,db=>createRunes(db),o=>o.command(s.id,input),g=>g.__colRunes.command(s.id,input));};
 await run('rune_claim');await run('rune_craft',{kind:'rune_attack'});
 const item=s.sql.prepare("SELECT id,power FROM player_items WHERE player_id=? AND kind='rune_attack' ORDER BY id LIMIT 1").get(s.id);
 await run('rune_upgrade',{itemId:item.id,expectedLevel:item.power});await run('rune_equip',{itemId:item.id,expectedLevel:item.power+1});await run('rune_unequip',{itemId:item.id,expectedLevel:item.power+1});
 const before=captureModes(s.sql);const again=await s.f.database.atomic(()=>services.run({nowMs:s.nowMs,seed:s.seed},g=>g.__colRunes.command(s.id,{action:'rune_claim',requestId:'mode-native-rune_claim'})));assert(again.replayed);assert.deepEqual(captureModes(s.sql),before);
});
test('cauldron entire native reward catalogue matches original grants and leaves no partial recipe on rejection',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest',actor:{level:1,xp:0,rank_tier:0,role:'avci'}});const services=make(s),{createCauldron488}=await native('vds-server/src/cauldron-engine488.mjs'),{CAULDRON_CATALOG488}=await native('lib/cauldron-catalog488.mjs');
 s.sql.function('unixepoch',()=>Math.floor(s.nowMs/1000));const account=s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.id).account_id;
 let n=0;for(const item of CAULDRON_CATALOG488){
  const input=await prepareCauldron(s,item.id);
  await s.f.database.atomic(()=>{
  s.sql.exec('SAVEPOINT cauldron_catalog');try{
   compareModeSync(s,services,item.id,db=>createCauldron488(db,{now:()=>s.nowMs}),o=>o.command(account,s.id,input),g=>g.__colCauldron488.command(account,s.id,input));n++;
   const before=captureModes(s.sql),again=services.run({nowMs:s.nowMs,seed:s.seed},g=>g.__colCauldron488.command(account,s.id,input));assert(again.replayed,item.id);assert.deepEqual(captureModes(s.sql),before,item.id+' replay');
  }finally{s.sql.exec('ROLLBACK TO cauldron_catalog;RELEASE cauldron_catalog');}
  });
 }
 assert.equal(n,CAULDRON_CATALOG488.length);assert(n>100);t.diagnostic('Original grant catalogue: '+n+' items, full persisted-row parity and replay');
 const input=await prepareCauldron(s);const before=captureModes(s.sql);await assert.rejects(s.f.database.atomic(()=>{services.run({nowMs:s.nowMs,seed:s.seed},g=>g.__colCauldron488.command(account,s.id,input));throw Error('receipt insertion failed');}),/receipt insertion failed/);assert.deepEqual(captureModes(s.sql),before);
});

test('native arena market purchases, activation and timed ring use preserve costs and expiry',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest'});const {createArenaMarket}=await native('vds-server/src/arena-market.mjs');
 for(const [action,extra]of [['arena_market_buy',{itemId:'arena:wings'}],['arena_market_buy',{itemId:'arena:exp_ring'}],['arena_market_buy',{itemId:'rune:rune_attack'}],['arena_market_buy',{itemId:'premium:auto_potion'}],['arena_market_wings',{}],['arena_market_exp',{}]]){
  const p=await prepareModeCase(s,'arena_market',action,extra),services=make(s);await compareMode(s,services,action+JSON.stringify(extra),db=>createArenaMarket(db,{now:()=>s.nowMs}),o=>o.command(s.id,p.input),g=>g.__colArenaMarket.command(s.id,p.input));
 }
});
test('native battle pass purchase and all default free/premium rewards preserve balances and claims',async t=>{
 const s=await setupPvp(t),{createBattlePass}=await native('vds-server/src/battle-pass.mjs'),{defaultBattlePassConfig}=await native('lib/battle-pass.mjs');
 const cases=[['battle_pass_buy',{}],...defaultBattlePassConfig().tiers.flatMap(tier=>['free','premium'].map(track=>['battle_pass_claim',{tier:tier.id,track}]))];
 for(const [action,extra]of cases){const p=await prepareModeCase(s,'battle_pass',action,extra),services=make(s);await compareMode(s,services,action+JSON.stringify(extra),db=>createBattlePass(db,{now:()=>s.nowMs}),o=>o.command(s.id,p.input),g=>g.__colBattlePass.command(s.id,p.input));}
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM battle_pass_claims WHERE player_id=?').get(s.id).n,60);
});
test('native community three-stage claims and guild village transactions retain original guards and rows',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest'});const {createCommunityEvent}=await native('vds-server/src/community-event.mjs'),{createGuildVillage}=await native('vds-server/src/guild-village.mjs'),account=s.sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.id).account_id;
 s.sql.function('strftime',{varargs:true},(pattern)=>{assert.equal(pattern,'%s');return String(Math.floor(s.nowMs/1000));});
 for(const stage of [0,1,2]){const p=await prepareModeCase(s,'community_claim','claim',{stage}),services=make(s);await compareMode(s,services,'community'+stage,db=>createCommunityEvent(db,{now:()=>Math.floor(s.nowMs/1000)}),o=>o.claim(account,s.id,p.input.eventId,stage),g=>g.__colCommunityEvent.claim(account,s.id,p.input.eventId,stage));}
 for(const action of ['village','buy','donate','invite','revoke','hall']){const p=await prepareModeCase(s,'guild_village',action),services=make(s);await compareMode(s,services,'guild'+action,db=>createGuildVillage(db,{now:()=>s.nowMs,dungeonLocked:()=>false}),o=>o.act(s.id,p.input),g=>g.__colGuildVillage.act(s.id,p.input));}
 const p=await prepareModeCase(s,'guild_village','upgrade');s.sql.prepare('UPDATE guild_castles SET decor_essence=1000 WHERE guild_id=?').run('mode-guild');await compareMode(s,make(s),'guild-upgrade',db=>createGuildVillage(db,{now:()=>s.nowMs,dungeonLocked:()=>false}),o=>o.act(s.id,p.input),g=>g.__colGuildVillage.act(s.id,p.input));
});
