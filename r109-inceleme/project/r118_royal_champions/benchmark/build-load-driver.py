"""Adapt retained real-protocol driver; does not alter runtime sources."""
from pathlib import Path
import re
HERE=Path(__file__).resolve().parent
CORE=HERE.parents[1]/'r109_latency_completion/working/core511-source/scripts/core511'
s=(CORE/'benchmark/my-load-real.mjs').read_text()
def change(old,new):
 global s
 assert old in s,old[:100]
 s=s.replace(old,new)
# All relative imports target the same current runtime, never a copied old engine.
s=re.sub(r"(['\"])\.\./([^'\"]+)\1",lambda m:m[1]+'../../r109_latency_completion/working/core511-source/scripts/core511/'+m[2]+m[1],s)
s=re.sub(r"(['\"])\./(reward-observation-r54|load-input-protocol)\.mjs\1",lambda m:m[1]+'../../r109_latency_completion/working/core511-source/scripts/core511/benchmark/'+m[2]+'.mjs'+m[1],s)
s="import {canonicalFixtureContentTriggerR118} from '../tests/production-trigger-fixture-r118.mjs';\nimport {nonlethalSchemaR56,nonlethalStatsR56} from '../../r109_latency_completion/working/core511-source/scripts/core511/nonlethal-rewards-r56.mjs';\nimport {emeraldPower444} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/lib/emerald-set.mjs';\nimport {createChampionsR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-service-r118.mjs';\n"+s
change("const RULES=createRules(),walkable=(x1,y1,x2,y2)=>RULES.isAreaWalkableSegment('forest',x1,y1,x2,y2);", "const AREA=process.env.R118_BENCH_AREA,COUNTS=[13,13,12,12],TOTAL=50;\nif(!['forest','champions'].includes(AREA))throw Error('explicit_r118_benchmark_area_required');\nconst RULES=createRules(),walkable=(x1,y1,x2,y2)=>RULES.isAreaWalkableSegment(AREA,x1,y1,x2,y2);")
change("channelEntry:path.join(import.meta.dirname,'native-channel-entry.mjs')", "channelEntry:path.resolve(import.meta.dirname,'../../r109_latency_completion/working/core511-source/scripts/core511/benchmark/native-channel-entry.mjs')")
change("PER=Number(process.env.CORE_PER??25)","PER=13")
change("const REAL=process.env.CORE_SCENARIO==='real',MONS=REAL?Number(process.env.CORE_MONS??60):1;", "const REAL=true,MONS=48;")
start=s.index("   for(let channel=1;channel<=4;channel++)for(let i=0;i<PER;i++){",s.index('realmSetup:'))
end=s.index("   if(process.env.CORE_GEAR)",start)
replacement="""   // Identical dense farm geometry and primary combat parameters for both maps.
   // Normal accounts: champion1/level65, no GM or loadlab bypass. Fixture setup
   // alone chooses legal admin settings; the timed path uses ordinary input.
   const champions=createChampionsR118(sql),cfg=structuredClone(champions.settings().config);
   for(const mob of Object.values(cfg.monsters)){mob.hp=3000;mob.damage=1;mob.xp=200;mob.essence=10;mob.respawnSeconds=10;}
   champions.save(cfg,champions.settings().revision);
   // Ambient forest families also retaliate while accounts join. Calibrate
   // the entire ordinary forest profile set, not only the chosen target IDs.
   for(const family of ['golge','curuk','yutan'])for(const variant of ['normal','agresif','katil'])sql.prepare("INSERT INTO monster_combat_profiles(profile_key,area,family,variant,max_hp,hit_damage,updated_at) VALUES(?,'forest',?,?,3000,1,0) ON CONFLICT(profile_key) DO UPDATE SET max_hp=3000,hit_damage=1").run('forest.'+family+'.'+variant,family,variant);
   fixtureNormalization.profileCalibration=sql.prepare("SELECT profile_key,max_hp,hit_damage FROM monster_combat_profiles WHERE area='forest' ORDER BY profile_key").all();demand(fixtureNormalization.profileCalibration.length===9&&fixtureNormalization.profileCalibration.every(r=>r.hit_damage===1&&r.max_hp===3000),'benchmark_profile_calibration');
   sql.prepare('UPDATE combat_settings SET forest_monster_respawn_seconds=10 WHERE id=1').run();
   const combatSettings=sql.prepare('SELECT * FROM combat_settings WHERE id=1').get(),hpEnchant=Number(combatSettings.enchant_hp_tier_five)||Number(combatSettings.enchant_hp_tier_three)||180;\n   const pools=new Map();
   for(let channel=1;channel<=4;channel++){
    const championRows=sql.prepare("SELECT * FROM monsters WHERE area='champions' AND channel=? ORDER BY id").all(channel);demand(championRows.length===48,'champion_fixture_population');
    const mons=championRows.map((old,index)=>{
     let x=2600+(index%8)*45,y=1800+Math.floor(index/8)*45;
     for(let d=0;!walkable(x,y,x,y)&&d<200;d+=5){x=2600+(index%8)*45+d;y=1800+Math.floor(index/8)*45;}
     demand(walkable(x,y,x,y),'benchmark_spawn_walkability');
     const id=AREA==='champions'?old.id:'golge-validation-'+runId+'-'+channel+'-'+index;
     // Both scenarios have the same total world population. Only actor area differs.
     sql.prepare('UPDATE monsters SET x=?,y=?,hp=3000,max_hp=3000,spawn_round=17,respawn_at=0 WHERE id=?').run(x,y,old.id);
     put(sql,'monsters',{id:'golge-validation-'+runId+'-'+channel+'-'+index,name:'Gölge',area:"forest",channel,x,y,hp:3000,max_hp:3000,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});
     return {id,x,y};
    });pools.set(channel,mons);
   }
   for(let channel=1;channel<=4;channel++)for(let i=0;i<COUNTS[channel-1];i++){
    // Explicit stationary-combat comparison: ordinary actors, one nearby
    // target, controlled admin damage1. Retaliation and all guards still run.
    const n=(channel-1)*25+i,id=runId+':'+n,accountId=id+':account',token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),instance=randomUUID(),all=pools.get(channel),target=all[i*3],offset=[[-20,0],[20,0],[0,-20],[0,20]].find(([dx,dy])=>walkable(target.x+dx,target.y+dy,target.x,target.y));
    demand(offset,'benchmark_stationary_spawn_walkability');const x=target.x+offset[0],y=target.y+offset[1],targetId=target.id;
    put(sql,'accounts',{...seed.account,id:accountId,username:'validation'+n,username_normalized:'validation'+n,email:'validation'+n+'@fixture.invalid',email_normalized:'validation'+n+'@fixture.invalid'});
    put(sql,'players',{...template,id,account_id:accountId,name:'Validation'+n,channel,area:AREA,x,y,role:'arkanist',level:65,rank_tier:1,champion_level_r102:1,is_gm:0,hp:100,max_hp:100,potions:100,gems:10000,essence:1000,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,last_seen:0,loadlab_run_id:''});
    put(sql,'auth_sessions',{token_hash:nativeTokenHash(token),csrf_hash:nativeTokenHash(csrf),account_id:accountId,created_at:Math.floor(now/1000),last_seen_at:Math.floor(now/1000),expires_at:Math.floor(now/1000)+3600,security_version:seed.account.security_version});
    put(sql,'game_presence',{account_id:accountId,token_hash:nativeTokenHash(token),instance_id:instance,expires_at_ms:now+300000,chat_after_id:0});
    put(sql,'player_items',{id:randomUUID(),player_id:id,kind:'weapon',role:'arkanist',item_name:'Kadim Zümrüt Öz Asası',rarity:'emerald',power:350,enchantments:'[]',equipped:1,created_at:Math.floor(now/1000)});
    for(const kind of ['armor','helmet','shoes','necklace'])put(sql,'player_items',{id:randomUUID(),player_id:id,kind,role:'arkanist',item_name:'Kadim Zümrüt '+kind,rarity:'emerald',power:emeraldPower444(kind,combatSettings),enchantments:JSON.stringify([{kind:'hp',value:hpEnchant}]),equipped:1,created_at:Math.floor(now/1000)});
    // Equipment triggers calculate real max HP; only spawn at that legal cap.
    sql.prepare('UPDATE players SET hp=max_hp WHERE id=?').run(id);
    const mons=[target];players.push({id,accountId,token,csrf,instance,channel,x,y,targetId,mons,role:'arkanist'});
   }
"""
s=s[:start]+replacement+s[end:]
change("for(let i=0;i<PER;i++)for(const channel of [2,3,4,1])await connect(players.find(p=>p.channel===channel&&p.id.endsWith(':'+((channel-1)*25+i))));", "for(let i=0;i<PER;i++)for(const channel of [1,2,3,4])if(i<COUNTS[channel-1])await connect(players.find(p=>p.channel===channel&&p.id.endsWith(':'+((channel-1)*25+i))));")
s=s.replace('PER*4','TOTAL').replace('perChannel:PER','perChannel:COUNTS')
s=s.replace("area:'forest'","area:AREA")
# Locate only live monsters in each player's own three-monster view; this is
# read-only bot observation, like the retained driver's owned-drop query.
change("function nextMonster(c){c.atMonster=false;goTo(c,approach(c,c.p.mons[c.tgt]));}","""function nextMonster(c){c.atMonster=false;c.waitMonster=false;for(let n=0;n<c.p.mons.length;n++){const i=(c.tgt+n)%c.p.mons.length,mo=c.p.mons[i],row=s.host.database.sqlite.prepare('SELECT hp,spawn_round FROM monsters WHERE id=?').get(mo.id);if(row?.hp>0){c.tgt=i;(c.rounds??=new Map()).set(mo.id,row.spawn_round);c.path=[];c.atMonster=true;return;}}c.path=[];c.waitMonster=true;c.nextMonsterAt=performance.now()+1000;}
""")
s=s.replace("(c.tgt+1)%MONS","(c.tgt+1)%c.p.mons.length")
change("if(!c.protocol.canSend(now))continue;let payload=null;", "if(c.waitMonster&&now>=c.nextMonsterAt)nextMonster(c);\n   if(!c.protocol.canSend(now))continue;let payload=null;")
# Observe only nearby collectible drops; a retained forest drop across the
# grid must not manufacture a pickup rejection/retry storm in the bots.
change("SELECT id FROM world_drops WHERE owner_id=? AND collectible_at<=? AND expires_at>? AND enchantments NOT LIKE '%pending%' LIMIT 1", "SELECT id FROM world_drops WHERE owner_id=? AND collectible_at<=? AND expires_at>? AND enchantments NOT LIKE '%pending%' AND ((x-?)*(x-?)+(y-?)*(y-?))<=6400 ORDER BY expires_at LIMIT 1")
change("dropQ.get(c.p.id,Math.floor(Date.now()/1000),Math.floor(Date.now()/1000))", "dropQ.get(c.p.id,Math.floor(Date.now()/1000),Math.floor(Date.now()/1000),c.pos.x,c.pos.x,c.pos.y,c.pos.y)")
change("else if(!c.usedPotion){c.usedPotion=true;c.nextPotion=now+10000+Math.random()*20000;payload={action:'use_potion'};}", "else if(!c.usedPotion){c.usedPotion=true;c.nextPotion=now+15000;}")
change("else if(now>c.nextPotion){c.nextPotion=now+10000+Math.random()*20000;payload={action:'use_potion'};}", "else if(now>c.nextPotion){c.nextPotion=now+15000;const hp=sql.prepare('SELECT hp,max_hp FROM players WHERE id=?').get(c.p.id);if(hp?.hp>0&&hp.hp<hp.max_hp)payload={action:'use_potion'};}")
change("}else if(c.retry)c.retry=c.retry.filter(x=>x.id!==payload.targetId);", "}else{c.collectSuccess=(c.collectSuccess??0)+1;if(c.retry)c.retry=c.retry.filter(x=>x.id!==payload.targetId);}")
change("const killed=b?.hits?.some(h=>h.killed),bad=!b||b.ok===false||result.error;", "const killed=b?.hits?.some(h=>h.killed),bad=!b||b.ok===false||result.error;if(!bad&&(b.hits?.length??0)>0)c.successfulAttacks=(c.successfulAttacks??0)+1;")
# Prove rewards from database receipts, not the legacy double-counted bot hook.
needle="const out={completed:true,"
change(needle,"const actualRewards={defeats:sql.prepare('SELECT count(*) n FROM normal_defeats').get().n,claims:sql.prepare('SELECT count(*) n FROM normal_reward_claims').get().n,unfinished:sql.prepare('SELECT count(*) n FROM normal_defeats WHERE rewards_completed_at=0').get().n,duplicateClaims:sql.prepare('SELECT count(*) n FROM (SELECT monster_id,spawn_round,player_id,count(*) n FROM normal_reward_claims GROUP BY monster_id,spawn_round,player_id HAVING n>1)').get().n,crowns:sql.prepare(\"SELECT COALESCE(SUM(amount),0) n FROM dungeon_materials WHERE kind='royal_crown'\").get().n};const out={completed:true,area:AREA,actualRewards,benchmarkContract:{players:50,channels:COUNTS,normalAccounts:true,loadlabBypass:false,gm:false,monsterPoolPerChannel:48,playerLevel:65,championLevel:1,weaponPower:350,defenseGear:\"emerald-full-set-native-hp-enchant\",monsterHp:3000,denseFarmFixture:true},")
s=s.replace("legacyCountersNotUnique:['kills','rewardPending']","legacyCountersNotUnique:['kills','rewardPending'],actualKillsUse:'actualRewards.defeats'")
s=s.replace("benchmarkContract:{players:50,", "playerEvidence:clients.map(c=>({actor:c.p.id,channel:c.p.channel,ready:c.ready&&c.ws.readyState===1,attacks:c.attacks,successfulAttacks:c.successfulAttacks??0,collected:c.collectSuccess??0,rewardClaims:sql.prepare('SELECT count(*) n FROM normal_reward_claims WHERE player_id=?').get(c.p.id).n})),benchmarkContract:{players:50,")
change("kills++;c.tgt=(c.tgt+1)%c.p.mons.length;","kills++;")
# The inherited stress harness ignored deaths and authoritative movement. Use
# actual own-state revisions and a bounded one-flight motion/checkpoint path.
change("function onResult(c,payload,result){", """function ownState(c,row){
 if(!row)return;
 const rev=row.hpRevision??row.hp_revision;
 if(Number.isSafeInteger(rev)&&rev>=(c.hpRev??-1)){c.hpRev=rev;if(Number.isFinite(row.hp))c.hp=row.hp;if(Number.isFinite(row.maxHp??row.max_hp))c.maxHp=row.maxHp??row.max_hp;}
}
function onResult(c,payload,result){
 const own=result.data??result.body;ownState(c,own);
 if(payload.action==='move'&&Number.isFinite(own?.x)&&Number.isFinite(own?.y)){c.pos={x:own.x,y:own.y};c.anchor={...c.pos};c.lastSent=null;if(c.path?.length)c.atMonster=false;}
 if(payload.action==='attack')c.nextAttackAt=Math.max(c.lastAttackAt+650,performance.now()+Math.max(0,Number(own?.retryAfterMs)||0,Number(own?.nextAttackAtMs)-Date.now()||0));
""")
change("  const packet=JSON.parse(bytes);", """  const packet=JSON.parse(bytes);
  const self=(packet.world?.data?.players??packet.world?.entities?.players?.upsert??[]).find(p=>p.id===c.p.id);ownState(c,self);
  for(const e of packet.events??(packet.type==='event'?[packet.event??packet.payload??packet.data]:[]))if(e?.targetId===c.p.id||e?.playerId===c.p.id)ownState(c,e);
""")
change("c.pos={x:c.p.x,y:c.p.y};c.path=[];", "const own=sql.prepare('SELECT x,y,hp,max_hp,hp_revision,position_revision FROM players WHERE id=?').get(c.p.id);ownState(c,own);c.pos={x:own.x,y:own.y};c.anchor={...c.pos};c.posRev=own.position_revision;c.path=[];")
change("   if(c.path.length){let budget=c.speed*(c.mounted?1.25:1)*dt;", "   if(c.path.length&&c.hp>0&&c.protocol.canSend(now)){let budget=Math.min(c.speed*(c.mounted?1.25:1)*dt,Math.max(0,100-Math.hypot(c.pos.x-c.anchor.x,c.pos.y-c.anchor.y)));")
change("hpRevision:1e9", "hpRevision:c.hpRev")
change("if(c.walking||stoppedNow){c.mseq++", "if((c.walking||stoppedNow)&&c.hp>0){c.mseq++")
change("   if(!c.protocol.canSend(now))continue;let payload=null;", "   if(!c.protocol.canSend(now)||c.hp<=0)continue;let payload=null;")
change("else if((c.walking||c.needMove)&&now-c.lastMoveAt>=200)", "else if((c.walking||c.needMove)&&c.lastSent&&now-c.lastMoveAt>=200)")
change("else if(c.fighter&&c.atMonster&&now-c.lastAttackAt>=1000)", "else if(c.fighter&&c.atMonster&&now>=(c.nextAttackAt??0)&&now-c.lastAttackAt>=650)")
change("c.nextPotion=now+15000", "c.nextPotion=now+2000")
change("if(hp?.hp>0&&hp.hp<hp.max_hp)", "if(hp?.hp>0&&hp.hp<hp.max_hp*.7)")
change("error:result.error??result.body?.error}", "error:result.error??result.body?.error??result.data?.error,code:result.body?.code??result.data?.code,data:result.data,body:result.body}")
change("successfulAttacks:c.successfulAttacks??0,collected:", "successfulAttacks:c.successfulAttacks??0,hp:c.hp,maxHp:c.maxHp,hpRevision:c.hpRev,collected:")
change("  await s.core.diagnostics.beginLoad(runId);", "  const nonlethalSchemaReady=nonlethalSchemaR56(sql);demand(nonlethalSchemaReady,'r118_benchmark_schema_not_certified');\n  await s.core.diagnostics.beginLoad(runId);")
change("const out={completed:true,area:AREA,", "const out={completed:true,area:AREA,nonlethal:{schemaReady:nonlethalSchemaReady,stats:nonlethalStatsR56(sql)},")
change("let s,timer,stopping=false", "let fixtureNormalization;\nlet s,timer,stopping=false")
change("   // Seed offline actors.", "   fixtureNormalization=canonicalFixtureContentTriggerR118(sql);\n   // Seed offline actors.")
change("nonlethal:{schemaReady:nonlethalSchemaReady,", "fixtureNormalization,nonlethal:{schemaReady:nonlethalSchemaReady,")
change("// Single-input preparation validates the scenario before the one timed run.", "// Single-input preparation validates the scenario before the one timed run.\n for(const c of clients){const row=sql.prepare('SELECT hp,max_hp FROM players WHERE id=?').get(c.p.id);demand(row.hp>0,'benchmark_actor_died_during_admission:'+JSON.stringify(row));}\n demand(sql.prepare(\"SELECT COUNT(*) n FROM monster_combat_profiles WHERE area='forest' AND hit_damage=1\").get().n===9,'benchmark_live_profile_calibration');\n")
change("for(const channel of [1,2,3,4]){const c=clients.find(c=>c.p.channel===channel);send(c,{action:'move',area:AREA,x:c.p.x+2,y:c.p.y});await settled(c);send(c,{action:'move',area:AREA,x:c.p.x,y:c.p.y});await settled(c);}", "for(const channel of [1,2,3,4]){const c=clients.find(c=>c.p.channel===channel);send(c,{action:'heartbeat'});await settled(c);}")
s=s.replace('denseFarmFixture:true','stationaryCombat:true,controlledMonsterDamage:1,navigationCoverage:false,productionCapacityValidation:false')
# A 202 ACK is not a durable monster result. Like the actual kill-pending UI,
# do not attack that actor's target again until its final result is observed.
# Other legal actions continue; unresolved/rejected outcomes fail acceptance.
change("function ownState(c,row){", "function pendingDurableR118(c){for(const r of c.rewardR54?.inputs.values()??[])if(r.provisional&&!r.done)return true;return false;}\nfunction ownState(c,row){")
change("else if(c.fighter&&c.atMonster&&now>=(c.nextAttackAt??0)", "else if(c.fighter&&c.atMonster&&!pendingDurableR118(c)&&now>=(c.nextAttackAt??0)")
change("while(clients.some(c=>c.pending.size)&&performance.now()<until)", "while(clients.some(c=>c.pending.size||pendingDurableR118(c))&&performance.now()<until)")
change("pendingAfterOriginal5s:protocolEvidence().pending,", "pendingAfterOriginal5s:protocolEvidence().pending,pendingFinalAfterOriginal5s:rewardObservationR54.report().pendingFinal,")
change("while(clients.some(c=>c.ws.readyState===1&&c.pending.size)&&performance.now()<drainDeadline)", "while(clients.some(c=>c.ws.readyState===1&&(c.pending.size||pendingDurableR118(c)))&&performance.now()<drainDeadline)")
change("postWorkloadDrain.elapsedMs=performance.now()-drainStarted;", "postWorkloadDrain.elapsedMs=performance.now()-drainStarted;postWorkloadDrain.pendingFinalAfterDrain=rewardObservationR54.report().pendingFinal;")
change("demand(postWorkloadDrain.openSocketPending===0,'load_pending_after_bounded_drain');", "demand(postWorkloadDrain.openSocketPending===0&&postWorkloadDrain.pendingFinalAfterDrain.length===0,'load_pending_after_bounded_drain');demand(rewardObservationR54.report().rejected===0,'load_durable_monster_rejected');")
change("{completed:false,...protocolEvidence(),", "{completed:false,rewardObservationR54:rewardObservationR54.report(),...protocolEvidence(),")
s=s.replace("// (her oyuncu 500 ms'de bir hareket/saldırı, ilk girdi iksir), kampanya kapıları olmadan.", "// R118: gerçek650ms saldırı ritmi, tek bekleyen giriş, yasal ekipman/iksir ve kalıcı ölüm bekleyişi.")
(HERE/'load50.mjs').write_text(s)
print(HERE/'load50.mjs')
