import {ZUMRUT_AREA,ZUMRUT_REACH,zumrutNode} from './zumrut-map-r93.mjs';

// A small projection of authenticated native player snapshots. It owns no
// simulation, requests or timers and never credits resources.
export function createZumrutPeerPresentationR96(){
 const players=new Map(),nodes=new Map(),retired=new Map();let area=null,channel=null,owner=null;
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const same=(a,b)=>a===undefined||b===undefined||a===b;
 function reset(){players.clear();nodes.clear();retired.clear();area=channel=owner=null;}
 function validPosition(entry,player){
  return !player||(player.hp===undefined||player.hp>0&&player.hp===entry.hp)&&finite(player)&&Math.hypot(player.x-entry.x,player.y-entry.y)<=2&&same(entry.hpRevision,player.hp_revision)&&same(entry.positionRevision,player.position_revision)&&(player.equippedToolR93==null||player.equippedToolR93===(entry.kind==='wood'?'axe':'pickaxe'));
 }
 return {
  reset,
  frame(world,ownId,now,{blocked=false,serverNow,visible}={}){
   const at=typeof serverNow==='function'?serverNow():serverNow;
   const snapshotAt=world?.snapshotAtMs??(Number.isFinite(world?.serverTime)?world.serverTime*1000:world?.zumrutR93?.serverAtMs);
   if(blocked||world?.area!==ZUMRUT_AREA||!ownId||!Number.isFinite(now)||!Number.isFinite(at)||!Number.isFinite(snapshotAt)||at-snapshotAt>1500||snapshotAt-at>500){reset();return;}
   if(area!==world.area||channel!==world.channel||owner!==ownId){reset();area=world.area;channel=world.channel;owner=ownId;}
   const seen=new Set();nodes.clear();
   for(const p of (world.players??[]).slice(0,128)){
    const g=p?.gatherR96;
    if(!g){retired.delete(p?.id);continue;}
    if(retired.get(p?.id)===g.operationId)continue;
    if(visible&&!visible(p.id)){const prior=players.get(p.id);if(prior){prior.hidden=true;seen.add(p.id);}continue;}
    if(!p?.id||p.id===ownId||seen.has(p.id)||!g||!['wood','stone'].includes(g.kind)||typeof g.operationId!=='string'||!g.operationId||!finite(p)||!(p.hp>0)||(p.area!=null&&p.area!==world.area)||(p.channel!=null&&p.channel!==world.channel))continue;
    const node=zumrutNode(g.nodeId),duration=g.finishAtMs-g.startedAtMs;
    if(!node||(g.kind==='wood'?node.kind!=='tree':node.kind!=='rock')||!Number.isFinite(g.startedAtMs)||!Number.isFinite(g.finishAtMs)||duration<=0||duration>10000||g.startedAtMs>at+250||g.finishAtMs<=at||Math.hypot(node.x-p.x,node.y-p.y)>ZUMRUT_REACH)continue;
    let entry=players.get(p.id);
    if(entry&&entry.operationId===g.operationId){
     if(!validPosition(entry,p)||entry.kind!==g.kind||entry.nodeId!==g.nodeId||entry.serverStartedAt!==g.startedAtMs||entry.serverEndsAt!==g.finishAtMs){retired.set(p.id,g.operationId);continue;}
    }else entry={playerId:p.id,operationId:g.operationId,nodeId:g.nodeId,kind:g.kind,phase:'channeling',x:p.x,y:p.y,hp:p.hp,hpRevision:p.hp_revision,positionRevision:p.position_revision,serverStartedAt:g.startedAtMs,serverEndsAt:g.finishAtMs,visualStartedAt:now-(at-g.startedAtMs),visualEndsAt:now+(g.finishAtMs-at)};
    if(!validPosition(entry,p))continue;
    entry.hidden=false;seen.add(p.id);retired.delete(p.id);players.set(p.id,entry);
    const peers=nodes.get(g.nodeId);if(peers)peers.push(entry);else nodes.set(g.nodeId,[entry]);
   }
   for(const [id,entry]of players)if(!seen.has(id)){retired.set(id,entry.operationId);players.delete(id);}
   while(retired.size>128)retired.delete(retired.keys().next().value);
  },
  get(id,now,player){const entry=players.get(id);return entry&&!entry.hidden&&Number.isFinite(now)&&now>=entry.visualStartedAt&&now<entry.visualEndsAt&&validPosition(entry,player)?entry:null;},
  forNode(id){return nodes.get(id)??[];},
  values(){return players.values();},
  inspect(){return {players:players.size,nodes:nodes.size,area,channel,owner};}
 };
}
