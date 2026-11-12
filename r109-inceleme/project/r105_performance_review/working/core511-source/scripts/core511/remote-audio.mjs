// Remote presentation only: no requests, combat prediction, timers, or game-state writes.
export function createRemoteAudio511({play,soundFor,range=650}={}){
 let scope=null,primed=false,lastEvents=null,lastFrame=0,stepWindow=0,stepCount=0,castWindow=0,castCount=0;
 const seen=new Map(),walkers=new Map();
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const soundGain=(source,listener)=>{if(!finite(source)||!finite(listener))return 0;const d=Math.hypot(source.x-listener.x,source.y-listener.y);return d>=range?0:.8*(1-d/range);};
 const scopeKey=(world,id)=>JSON.stringify([id,world?.area,world?.channel,world?.world?.cycle,world?.arenaMatch?.id??null]);
 const compatible=(row,world,id,visible)=>row&&row.id!==id&&row.hp>0&&(row.area==null||row.area===world.area)&&(row.channel==null||row.channel===world.channel)&&(!visible||visible(row.id));
 const reset=key=>{scope=key;primed=false;lastEvents=null;lastFrame=0;seen.clear();walkers.clear();stepCount=castCount=0;stepWindow=castWindow=0;};
 const trim=now=>{for(const[k,v]of seen)if(now-v>10000)seen.delete(k);while(seen.size>2048)seen.delete(seen.keys().next().value);};
 return{
  frame(world,id,listener,positions,now,{blocked=false,visible}={}){
   if(!world||!id||!finite(listener)||!Number.isFinite(now)){reset(null);return;}
   const key=scopeKey(world,id);if(key!==scope)reset(key);
   const rows=Array.isArray(world.players)?world.players:[],players=new Map(rows.filter(p=>compatible(p,world,id,visible)).map(p=>[p.id,p]));
   const serverAt=Number(world.snapshotAtMs??Number(world.serverTime)*1000),events=Array.isArray(world.combatEvents)?world.combatEvents:[];
   const toPlay=[];
   for(const event of events===lastEvents?[]:events){
    const actor=String(event.player_id??''),ability=Number(event.ability),at=Number(event.created_at);
    if(!actor||!Number.isInteger(ability)||ability<0||ability>3||!Number.isFinite(at))continue;
    // Area hits have multiple target rows, but represent one audible cast.
    const castKey=actor+':'+ability+':'+at;if(seen.has(castKey))continue;seen.set(castKey,now);
    if(!primed||blocked||!Number.isFinite(serverAt)||serverAt-at>1500||at-serverAt>250)continue;
    const player=players.get(actor);if(!player)continue;
    const point=positions?.get?.(actor)??player,gain=soundGain(point,listener);if(gain<=0)continue;
    const sound=soundFor?.(player.role,ability);if(typeof sound==='string')toPlay.push({sound,gain});
   }
   lastEvents=events;primed=true;trim(now);
   if(now-castWindow>=120){castWindow=now;castCount=0;}
   // Prioritize the nearest audible casts if a large crowd acts in one frame.
   toPlay.sort((a,b)=>b.gain-a.gain);for(const row of toPlay){if(castCount>=8)break;castCount++;play?.(row.sound,row.gain);}
   const gap=!lastFrame||now-lastFrame>1000||now<lastFrame;lastFrame=now;
   if(now-stepWindow>=160){stepWindow=now;stepCount=0;}
   const steps=[];
   for(const[id,player]of players){
    const point=positions?.get?.(id)??player;if(!finite(point))continue;
    const previous=walkers.get(id),gain=soundGain(point,listener),jump=previous?Math.hypot(point.x-previous.x,point.y-previous.y):0;
    const record={x:point.x,y:point.y,travel:previous?.travel??0,lastStep:previous?.lastStep??now};
    // Teleports, reveal, resume and large discontinuities never become footsteps.
    if(!previous||gap||blocked||gain<=0||jump>180){record.travel=0;record.lastStep=now;}
    else{record.travel+=jump;if(record.travel>=78&&now-record.lastStep>=160){record.travel%=78;record.lastStep=now;steps.push({gain});}}
    walkers.set(id,record);
   }
   for(const id of walkers.keys())if(!players.has(id))walkers.delete(id);
   steps.sort((a,b)=>b.gain-a.gain);for(const row of steps){if(stepCount>=4)break;stepCount++;play?.('step',row.gain);}
  },
  reset(){reset(null);},
  inspect(){return{scope,primed,seen:seen.size,walkers:walkers.size};}
 };
}
