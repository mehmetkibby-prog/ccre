import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';

// Native GM functions retain their SQL and visibility rollback. Only this
// database-bound adapter may await them inside the global configuration gate.
export class NativeGm {
 #context=new AsyncLocalStorage();
 constructor(core){this.core=core;}
 assertBound(){const c=this.core;demand(!c.closed&&c.database.core511Gm===this,'native_gm_binding');return c;}
 get active(){return this.#context.getStore()?.active===true;}
 player(session,reauthorize,operation){return this.run(async()=>{const current=await reauthorize();demand(current?.account?.id===session.account.id&&current.player?.id===session.player?.id&&current.tokenHash===session.tokenHash,'native_gm_session_changed');},operation);}
 admin(identity,reauthorize,operation){return this.run(async()=>demand(await reauthorize()===identity&&typeof identity==='string'&&identity.length>0,'native_gm_admin_changed'),operation);}
 async run(reauthorize,operation){
  const c=this.assertBound();demand(typeof reauthorize==='function'&&typeof operation==='function','native_gm_operation');let notificationActors=[];
  const value=await c.nativeConfiguration.runGm(this,async()=>{
   this.assertBound();const state={active:true,events:[]};let value,rejected=null;
   try{value=await this.#context.run(state,operation);}catch(error){rejected=error;}finally{state.active=false;}
   demand(!c.database.sqlite.isTransaction,'native_gm_open_transaction');
   if(state.events.length){const result=await c.database.atomic(sql=>c.writer.notifications.append(sql,{realm:c.realmId,key:randomUUID()},{events:state.events}));notificationActors=result.notificationActors;}
   if(rejected)throw rejected;return value;
  },reauthorize);c.notify(notificationActors);return value;
 }
 event(args){this.assertBound();const state=this.#context.getStore();demand(state?.active&&Array.isArray(args),'native_gm_publication');state.events.push(structuredClone(args));return true;}
 async visibility(player){
  const c=this.assertBound(),state=this.#context.getStore(),h=c.globalWorld?.held;demand(state?.active&&h?.mode==='configuration'&&h.phase==='frozen','native_gm_visibility_scope');
  const saved=c.database.sqlite.prepare('SELECT id,is_gm,gm_invisible,gm_visibility_revision,channel,area,arena_match_id FROM players WHERE id=?').get(player.id);
  demand(saved&&Object.keys(saved).every(k=>Object.is(saved[k],player[k])),'native_gm_visibility_row');
  const world=c.database.sqlite.prepare('SELECT cycle FROM world_state WHERE id=1').get();if(!world)return false;
  demand(world.cycle===h.cycle&&c.sharedWorld.row?.peer.incarnation===h.peer.incarnation&&!c.sharedWorld.row.exited,'native_gm_visibility_world');
  await Promise.all(h.channels.map(async row=>{const ack=await row.control.request('gm_visibility',{token:h.token,player:saved});c.process(row.peer);demand(ack?.token===h.token&&ack.id===saved.id&&ack.revision===saved.gm_visibility_revision,'native_gm_visibility_ack');}));return true;
 }
}
