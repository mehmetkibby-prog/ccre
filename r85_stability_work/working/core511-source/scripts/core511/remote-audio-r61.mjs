// Presentation only. Consumes existing authenticated events on the render loop.
// No requests, timers, prediction, or world/gameplay writes.
export const clientAudioR61 = {enabled:false};
export function acceptAudioR61(value){clientAudioR61.enabled=value===true;}

export function createRemoteAudioR61({play,soundFor,legacy,range=650,clock=()=>performance.now()}={}){
 const pending=[],seen=new Map(),active=[];
 let scope=null,lastFrame=0,lastEvents=null,primed=false,windowAt=0,voices=0,enabled=clientAudioR61.enabled;
 const old=legacy({soundFor,range,play:(sound,gain)=>{if(!enabled||sound==='step')play?.(sound,gain);}});
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const gainAt=(p,ear)=>finite(p)&&finite(ear)?Math.max(0,.8*(1-Math.hypot(p.x-ear.x,p.y-ear.y)/range)):0;
 const scopeOf=(w,id)=>JSON.stringify([id,w?.area,w?.channel,w?.world?.cycle,w?.arenaMatch?.id??null,w?.instanceId??w?.dungeon?.run?.id??w?.dungeonInstance?.id??null]);
 const compatible=(p,w,id,visible)=>p&&p.id!==id&&(p.area==null||p.area===w.area)&&(p.channel==null||p.channel===w.channel)&&(!visible||visible(p.id));
 function reset(key=null){scope=key;pending.length=0;seen.clear();active.length=0;lastFrame=windowAt=voices=0;primed=false;lastEvents=null;old.reset();}
 function remember(keys,now){const duplicate=keys.some(k=>seen.has(k));for(const k of keys)seen.set(k,now);while(seen.size>2048)seen.delete(seen.keys().next().value);return !duplicate;}
 const types=new Set(['monster_result','pvp_result','guardian_control','specialization_effect','player_hit']);
 return {
  event(event,world,id,{blocked=false}={}){
   if(!clientAudioR61.enabled||!enabled||!primed||blocked||!event||!types.has(event.type)||scope!==scopeOf(world,id))return;
   if(pending.length<128)pending.push({event,received:clock()});
  },
  frame(world,id,listener,positions,now,options={}){
   if(enabled!==clientAudioR61.enabled){enabled=clientAudioR61.enabled;reset();}
   if(!enabled){old.frame(world,id,listener,positions,now,options);return;}
   if(!world||!id||!finite(listener)||!Number.isFinite(now)){reset();return;}
   const key=scopeOf(world,id);if(scope!==key)reset(key);
   old.frame(world,id,listener,positions,now,options);
   const gap=lastFrame&&(now<lastFrame||now-lastFrame>1000);lastFrame=now;
   if(gap)pending.length=0;
   const {blocked=false,visible}=options,events=world.combatEvents??null;
   if(!pending.length&&events===lastEvents){primed=true;return;}
   const serverAt=Number(options.serverNow?.()??world.snapshotAtMs??Number(world.serverTime)*1000);
   const rows=new Map((world.players??[]).filter(p=>compatible(p,world,id,visible)).map(p=>[p.id,p]));
   const point=p=>positions?.get?.(p.id)??p;
   let monsters;
   const monster=id=>{monsters??=new Map((world.monsters??[]).map(m=>[m.id,m]));return monsters.get(id);};
   const fresh=at=>Number.isFinite(at)&&Number.isFinite(serverAt)&&serverAt-at<=1500&&at-serverAt<=500;
   const sounds=[];
   function cast(actor,ability,at,intent,support=false){
    const keys=['cast:'+actor+':'+ability+':'+at];if(intent)keys.push('intent:'+actor+':'+intent);
    if(!remember(keys,now)||!primed||blocked||!fresh(at))return;
    const row=rows.get(actor);if(!row||row.hp<=0)return;
    const gain=gainAt(point(row),listener),sound=support?'magic':soundFor?.(row.role,ability);
    if(gain>0&&typeof sound==='string')sounds.push({sound,gain});
   }
   // Legacy snapshots remain supported; multi-target rows share one cast key.
   if(events!==lastEvents)for(const e of (Array.isArray(events)?events:[]).slice(-128)){
    const ability=Number(e.ability),actor=String(e.player_id??''),at=Number(e.created_at);
    if(actor&&Number.isInteger(ability)&&ability>=0&&ability<=3)cast(actor,ability,at,e.intentId);
   }
   lastEvents=events;
   for(const {event:e,received}of pending){
    const at=Number(e.serverAt);if(blocked||now-received>250||!fresh(at)||(e.area!=null&&e.area!==world.area)||(e.channel!=null&&Number(e.channel)!==Number(world.channel))||(e.cycle!=null&&e.cycle!==world.world?.cycle)||(e.arenaMatchId!=null&&e.arenaMatchId!==(world.arenaMatch?.id??'')))continue;
    if(e.type==='player_hit'){
     const row=rows.get(e.targetId),source=monster(e.monsterId);
     if(row&&source&&e.eventId&&Number(e.damage)>0&&!e.attackBlocked&&(e.spawnRound==null||e.spawnRound===source.spawn_round)&&remember(['hit:'+e.eventId],now)){
      const gain=gainAt(point(row),listener)*.7;if(gain>0)sounds.push({sound:e.ability==='boss_fire'?'bossFire':'hit',gain});
     }
     continue;
    }
    if(e.type==='monster_result'&&(!Array.isArray(e.hits)||!e.hits.length))continue;
    const actor=String(e.attackerId??e.actorId??''),row=rows.get(actor),ability=e.type==='specialization_effect'?3:Number(e.ability);
    if(!row||row.hp<=0||!Number.isInteger(ability)||ability<0||ability>3||gainAt(point(row),listener)<=0)continue;
    const intent=typeof e.intentId==='string'&&e.intentId?e.intentId:null;
    cast(actor,ability,at,intent,e.type==='specialization_effect');
    if(e.type!=='monster_result'&&e.type!=='pvp_result')continue;
    const hitKey='impact:'+actor+':'+(intent??e.eventId??ability+':'+at);
    if(!remember([hitKey],now))continue;
    let gain=0;
    if(e.type==='pvp_result'){
     const target=rows.get(e.targetId);
     if(target&&Number(e.damage)>0&&!e.attackBlocked)gain=gainAt(point(target),listener);
    }else for(const hit of (Array.isArray(e.hits)?e.hits:[]).slice(0,64)){
     const target=monster(hit.id);
     if(target&&Number(hit.damage)>0&&(hit.spawnRound==null||hit.spawnRound===target.spawn_round))gain=Math.max(gain,gainAt(target,listener));
    }
    if(gain>0)sounds.push({sound:'hit',gain:gain*.7});
   }
   pending.length=0;primed=true;
   // Nearest first, <=6 sounds/120ms, <=12 sounds and <=24 native sources
   // in an 800ms window (longest selected native effect: 774ms).
   while(active.length&&active[0].until<=now)active.shift();
   let sources=active.reduce((n,v)=>n+v.cost,0);
   if(now-windowAt>=120||now<windowAt){windowAt=now;voices=0;}
   sounds.sort((a,b)=>b.gain-a.gain);
   for(const row of sounds){
    if(voices>=6||active.length>=12)break;
    const cost=({hunterArrowRain:8,guardianWhirlwind:4,lightningCircle:3,slash:2,arrow:2,guardianCleave:2,hunterPierce:2,arcaneSpear:2,bossFire:2})[row.sound]??1;
    if(sources+cost>24)continue;
    voices++;sources+=cost;active.push({until:now+800,cost});play?.(row.sound,row.gain);
   }
   for(const [key,at]of seen)if(now-at>10000)seen.delete(key);
  },
  reset(){reset();},
  inspect(){return{enabled,scope,primed,pending:pending.length,seen:seen.size,active:active.length,sources:active.reduce((n,v)=>n+v.cost,0),legacy:old.inspect()};}
 };
}
