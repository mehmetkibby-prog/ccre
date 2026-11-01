import {SharedCombatState,ChannelSharedCombat} from './channel-shared-combat.mjs';
import {SharedCombatAuthority} from './channel-shared-authority.mjs';
import {createChannelPeerServer,ChannelPeerClient} from './channel-peer.mjs';

// Worker bootstrap only. The main process provisions identities/endpoints, but
// it never hosts this authority or receives shared hit/snapshot messages.
export async function startChannelSharedRuntime(database,boot,rpc,{onFatal=()=>{}}={}){
 if(!boot.sharedSecret)return null;
 let state,authority,timer,shared;
 const replicas=new Map();
 const handlers={replica:frame=>shared.applyReplica(frame)};
 if(boot.channel===1){
  state=new SharedCombatState(database.sqlite);
  authority=new SharedCombatAuthority({incarnation:boot.incarnation,secret:boot.sharedSecret,load:()=>{state.reconcile();return state.snapshot();},recover:()=>state.reload()});
  handlers.acquire=({peer,id})=>authority.acquire(peer,id);
  handlers.finish=({peer,body})=>authority.finish(peer,body,records=>state.publish(records),async version=>{
   const frame={incarnation:boot.incarnation,version,rows:state.publicMonsterRows()};
   shared.applyReplica(frame);
   await Promise.all([...replicas.values()].map(client=>client.request('replica',frame)));
  });
  const prior=database.onCommitted;database.onCommitted=(changes,committedRows)=>{prior?.(changes,committedRows);state.changed(changes);};
  rpc.handlers.sharedSourceFenced=({peer})=>authority.fence(peer);
  rpc.handlers.sharedDirectory=({peers})=>{
   // A directory update must not abort a healthy replica's pending ACK.
   // Preserve clients for the same endpoint/incarnation; an actually removed
   // or replaced reader still follows the existing fail-closed/fencing path.
   const current=new Map(peers.filter(peer=>peer.channel!==1).map(peer=>[peer.channel,peer]));
   for(const [channel,client]of replicas){
    const peer=current.get(channel);
    if(peer&&peer.port===client.port&&peer.incarnation===client.peerIncarnation)continue;
    replicas.delete(channel);client.close();
   }
   for(const [channel,peer]of current)if(!replicas.has(channel)){
    const client=new ChannelPeerClient({port:peer.port,secret:boot.sharedSecret});client.peerIncarnation=peer.incarnation;replicas.set(channel,client);
   }
   return {ok:true};
  };
 }
 const server=await createChannelPeerServer({secret:boot.sharedSecret,handlers});
 const client=new ChannelPeerClient({port:boot.channel===1?server.port:boot.sharedPort,secret:boot.sharedSecret});
 shared=new ChannelSharedCombat(database,{peer:{channel:boot.channel,incarnation:boot.incarnation},
  acquire:(peer,id)=>client.request('acquire',{peer,id}),finish:(peer,body)=>client.request('finish',{peer,body}),onFatal});
 rpc.handlers.sharedOwnerReady=({port})=>{if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid peer port');client.port=port;return {ok:true};};
 let flushing=null;
 const flush=()=>{
  if(!state?.hasDirty())return Promise.resolve();
  if(!flushing)flushing=shared.flush().finally(()=>{flushing=null;});return flushing;
 };
 database.loadlabSharedRuntime=Object.freeze({state,authority,shared,replicas,incarnation:boot.incarnation});
 return {port:server.port,start(){if(state){timer=setInterval(()=>{void flush().catch(onFatal);},1000);timer.unref();}},
  async close(){clearInterval(timer);await flushing;if(state)await flush();await shared.tail;client.close();for(const c of replicas.values())c.close();authority?.close();await server.close();}};
}
