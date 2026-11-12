import {requireAutoIpGrantR102,autoIpUnavailableR102} from './auto-ip-r102.mjs';
import {runNativeAdminPlayerR76} from './native-admin-player-r76.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {NATIVE_ACTIONS} from './generated/action-names.mjs';
import {PROTOCOL,demand} from './contract.mjs';
import {bagUnequipBlocked,bagFullBody,isBagFull} from './bag-limit.mjs';
import {bagSpaceOperation,bagTradeOperation} from './bag-pending.mjs';

// These operations already have owned WS/entry implementations. An old HTTP
// client must upgrade; it must never start a second simulation on the writer.
export const OWNED_HTTP_ACTIONS=Object.freeze([...new Set([...NATIVE_ACTIONS,'move','attack','pvp_attack','cast_support456','heartbeat','hurt','join','select_channel','claim_rewards','afk_answer','afk_recover'])]);
export const coreProtocolResponse=()=>Response.json({code:'core511_protocol_required',protocol:PROTOCOL,relogin:true},{status:428,headers:{'cache-control':'no-store'}});

// Native /api/action keeps its asynchronous SQL batches and original guards.
// Only cold actions reach this gate. Native economy transactions are not
// rewritten or retried, and current owners stay frozen through final fsync and
// refresh. There is deliberately no async exception to permanentPlayers().
export class NativeHttpAction {
 #context=new AsyncLocalStorage();
 constructor(core){this.core=core;}
 assertBound(){const c=this.core;demand(c.database.core511HttpAction===this&&!c.closed,'native_http_action_binding');return c;}
 get active(){return this.#context.getStore()?.active===true;}
 adminPlayer(input,authorization,operation){return runNativeAdminPlayerR76(this,input,authorization,operation);}
 upgrade(){this.assertBound();return coreProtocolResponse();}
 payment(input,operation){
  const c=this.assertBound();demand(input&&typeof input.orderId==='string'&&typeof operation==='function','native_http_payment_scope');
  // The original provider callback has already verified its own HMAC/body.
  // Only the stored order selects the recipient; browser/session/actor fields
  // can never substitute a different account or character here.
  return c.serial(async()=>{
   this.assertBound();const order=c.database.sqlite.prepare('SELECT player_id FROM payment_orders WHERE id=?').get(input.orderId);
   if(!order)return operation();demand(typeof order.player_id==='string'&&order.player_id&&!c.transitions.has(order.player_id),'native_http_payment_actor');
   let value,rejected=null;await c.permanent.durablePlayers([order.player_id],async()=>{try{value=await operation();}catch(error){rejected=error;}demand(!c.database.sqlite.isTransaction,'native_http_payment_transaction_open');return null;});
   if(rejected)throw rejected;return value;
  });
 }
 readMarket(session,operation){
  const c=this.assertBound();demand(session?.account?.id&&typeof operation==='function','native_http_market_read');
  // The native market detail is a bounded SELECT snapshot; expiry is filtered
  // by SQL. Keep ordering and durability without draining a moving owner.
  return c.serial(async()=>{const value=await operation();await c.database.durableAfterCommit();return value;});
 }
 publish(args){const s=this.#context.getStore();this.assertBound();demand(s?.active&&Array.isArray(args),'native_http_action_publication');s.events.push(structuredClone(args));return true;}
 nativeOperation(request,operations){
  const c=this.assertBound(),s=this.#context.getStore();
  demand(s?.active&&request?.playerId===s.actor&&request.accountId===s.account&&request.input===s.payload&&!s.nativeCalled&&operations===c.host?.nativeHttp?.operations,'native_http_inventory_scope');
  const name=['answer_broken_core464','dismiss_broken_core464'].includes(s.payload.action)?'brokenCore464.act':['craft_jewelry456','choose_specialization456','upgrade_specialization456','exchange_wands456','use_halloween_candy456','buy_specialization_reset463','use_specialization_reset463'].includes(s.payload.action)?'expansion456.act':null;
  demand(name&&request.name===name,'native_http_inventory_name');s.nativeCalled=true;
  return c.database.atomic(()=>{demand(s.active,'native_http_inventory_expired');try{return operations.execute(request);}finally{operations.reset();}});
 }
 premium(session,input,reauthorize,operation){
  const c=this.assertBound();demand(session?.account?.id&&session.player?.id&&input&&typeof input==='object'&&typeof reauthorize==='function'&&typeof operation==='function','native_http_premium_scope');
  return c.serial(async()=>{
   this.assertBound();const current=await reauthorize();demand(current?.account?.id===session.account.id&&current.player?.id===session.player.id&&current.tokenHash===session.tokenHash,'native_http_premium_session_changed');
   const actor=current.player.id,sql=c.database.sqlite,ids=[actor];demand(sql.prepare('SELECT account_id FROM players WHERE id=?').get(actor)?.account_id===current.account.id,'native_http_premium_actor');
   if(input.action==='market_buy'){const listing=sql.prepare('SELECT seller_id FROM premium_listings WHERE id=?').get(String(input.listingId));if(listing?.seller_id)ids.push(listing.seller_id);}
   const unique=[...new Set(ids)];demand(unique.length<=2&&unique.every(id=>!c.transitions.has(id)),'native_http_premium_resources');
   // Preserve the original synchronous service and its own BEGIN/COMMIT,
   // including expiry before command validation. Both owners drain first.
   return c.permanent.permanentPlayers(unique,operation);
  });
 }
 async autoHuntR102(request,session,action,reauthorize,operation){
  const c=this.assertBound(),grant=await c.autoIpR102.prepare({playerId:session.player.id,accountId:session.account.id,securityVersion:session.securityVersion,mode:'island',action,ip:request.headers.get('x-real-ip')});
  if(action!=='stop'&&!grant.ok)return Response.json(grant,{status:grant.status??503});
  return this.player(session,reauthorize,async()=>{
   try{if(action!=='stop')requireAutoIpGrantR102(grant,{playerId:session.player.id,accountId:session.account.id,mode:'island',duration:15000});}
   catch(e){return Response.json({error:e.message,code:e.gameCode},{status:e.status??503});}
   const value=await operation(grant);await c.autoIpR102.complete(grant);return value;
  },true);
 }
 player(session,reauthorize,operation,asynchronous=false){
  const c=this.assertBound();demand(session?.account?.id&&session.player?.id&&typeof reauthorize==='function'&&typeof operation==='function'&&typeof asynchronous==='boolean','native_http_player_scope');
  return c.serial(async()=>{
   this.assertBound();const current=await reauthorize();demand(current?.account?.id===session.account.id&&current.player?.id===session.player.id&&current.tokenHash===session.tokenHash,'native_http_player_session_changed');
   const actor=current.player.id;demand(c.database.sqlite.prepare('SELECT account_id FROM players WHERE id=?').get(actor)?.account_id===current.account.id&&!c.transitions.has(actor),'native_http_player_actor');
   // A trusted route opts into awaiting its original native DB batches. Raw
   // native services keep the existing synchronous permanent-operation rule.
   if(!asynchronous)return c.permanent.permanentPlayers([actor],operation);
   let value,rejected=null;await c.permanent.durablePlayers([actor],async()=>{
    try{value=await operation();}catch(error){rejected=error;}
    demand(!c.database.sqlite.isTransaction,'native_http_player_transaction_open');return null;
   });
   if(rejected)throw rejected;return value;
  });
 }
 // Voice renewal changes only the native service's in-memory lease. It must
 // keep fresh session/guild/room checks without draining movement every 10 s.
 // Only this bound native operation is available here; economy mutations and
 // voice join/leave retain their existing permanent actor gates.
 voiceRenew(session,identity,reauthorize){
  const c=this.assertBound();demand(session?.account?.id&&session.player?.id&&typeof identity==='string'&&typeof reauthorize==='function','native_http_voice_renew_scope');
  return c.serial(async()=>{
   this.assertBound();const current=await reauthorize();demand(current?.account?.id===session.account.id&&current.player?.id===session.player.id&&current.tokenHash===session.tokenHash,'native_http_player_session_changed');
   const actor=current.player.id;demand(c.database.sqlite.prepare('SELECT account_id FROM players WHERE id=?').get(actor)?.account_id===current.account.id&&!c.transitions.has(actor),'native_http_player_actor');
   const service=c.host?.nativeHttp?.services?.__colGuildVoice;demand(service&&typeof service.renew==='function','native_http_voice_renew_binding');
   return service.renew(current,identity);
  });
 }
 // Invitation polling is read-only while there is no live trade or expiry
 // cleanup. In that common case draining the actor would pause walking for a
 // response containing only {trade:null}. All non-idle snapshots still use
 // the original synchronous native service under the permanent actor gate.
 tradeSnapshot(session,tradeId,reauthorize,operation){
  const c=this.assertBound();demand(session?.account?.id&&session.player?.id&&(tradeId===null||typeof tradeId==='string')&&typeof reauthorize==='function'&&typeof operation==='function','native_http_trade_snapshot_scope');
  return c.serial(async()=>{
   this.assertBound();const current=await reauthorize();demand(current?.account?.id===session.account.id&&current.player?.id===session.player.id&&current.tokenHash===session.tokenHash,'native_http_player_session_changed');
   const actor=current.player.id,sql=c.database.sqlite;demand(sql.prepare('SELECT account_id FROM players WHERE id=?').get(actor)?.account_id===current.account.id&&!c.transitions.has(actor),'native_http_player_actor');
   if(!tradeId){
    this.tradeIdleLock??=sql.prepare('SELECT 1 FROM player_trade_locks WHERE player_id=?');
    this.tradeIdleActive??=sql.prepare("SELECT 1 FROM player_trades WHERE status IN ('invited','open') AND (a=? OR b=?) LIMIT 1");
    this.tradeIdleExpiry??=sql.prepare("SELECT 1 FROM player_trades WHERE status IN ('invited','open') AND expires_at<=? LIMIT 1");
    this.tradeIdleClosedLock??=sql.prepare("SELECT 1 FROM player_trade_locks l WHERE EXISTS(SELECT 1 FROM player_trades t WHERE t.id=l.trade_id AND t.status NOT IN ('invited','open')) LIMIT 1");
    // No await separates these SELECTs from the result: another main-process
    // action cannot create an invitation between the check and this snapshot.
    if(!this.tradeIdleLock.get(actor)&&!this.tradeIdleActive.get(actor,actor)&&!this.tradeIdleExpiry.get(Date.now())&&!this.tradeIdleClosedLock.get())return {trade:null};
   }
   return c.permanent.permanentPlayers([actor],operation);
  });
 }
 trade(session,payload,reauthorize,operation){return this.#action(session,payload,reauthorize,operation,true);}
 action(session,payload,reauthorize,operation){return this.#action(session,payload,reauthorize,operation,false);}
 #action(session,payload,reauthorize,operation,trade){
  const c=this.assertBound();demand(session?.account?.id&&payload&&typeof payload==='object'&&typeof reauthorize==='function'&&typeof operation==='function','native_http_action_scope');
  if(!trade&&OWNED_HTTP_ACTIONS.includes(payload.action))return coreProtocolResponse();
  return c.serial(async()=>{
   this.assertBound();const current=await reauthorize();
   demand(current?.account?.id===session.account.id&&current.player?.id===session.player?.id&&current.tokenHash===session.tokenHash,'native_http_action_session_changed');
   // The original post-rate character-required response is retained. No
   // creation or other ownerless mutation can reach this cold operation.
   if(!current.player)return operation();
   const actor=current.player.id,sql=c.database.sqlite,ids=[actor];
   const own=sql.prepare('SELECT account_id FROM players WHERE id=?').get(actor);demand(own?.account_id===current.account.id,'native_http_action_actor');
   // Belts have a fixed crafted value and are sold to players through the
   // original marketplace. The legacy NPC sale treats unknown rarities as
   // cheap white gear, so reject this request before any item/currency write.
   if(!trade&&payload.action==='sell_item'&&typeof payload.itemId==='string'&&sql.prepare("SELECT 1 FROM player_items WHERE id=? AND player_id=? AND kind='belt'").get(payload.itemId,actor))return Response.json({error:'Kemer NPC’ye satılamaz; oyuncu pazarında satışa koyabilirsin.',code:'belt_npc_sale_forbidden'},{status:409});
   // Both live and replay receipts are server-selected. Request-supplied
   // seller/account/channel values never determine the freeze set.
   if(trade){
    const peer=payload.action==='invite'?sql.prepare('SELECT id FROM players WHERE id=?').get(String(payload.target??'')):
     sql.prepare('SELECT CASE WHEN a=? THEN b ELSE a END AS id FROM player_trades WHERE id=? AND (a=? OR b=?)').get(actor,String(payload.id??''),actor,actor);
    if(peer?.id)ids.push(peer.id);
   }else if(payload.action==='buy_listing'){
    const listing=typeof payload.listingId==='string'&&/^[a-zA-Z0-9-]{8,64}$/.test(payload.listingId)?payload.listingId:'';
    if(listing){for(const row of sql.prepare('SELECT seller_id FROM market_listings WHERE id=? UNION SELECT seller_id FROM market_settlements WHERE listing_id=?').all(listing,listing))if(row.seller_id)ids.push(row.seller_id);}
   }
   const unique=[...new Set(ids)];demand(unique.length<=2&&unique.every(id=>!c.transitions.has(id)),'native_http_action_resources');
   const state={active:true,events:[],actor,account:current.account.id,payload,nativeCalled:false};let value,rejected=null,notificationActors=[];
   await c.permanent.durablePlayers(unique,async()=>{
    try{value=bagUnequipBlocked(sql,actor,payload)?Response.json(bagFullBody(),{status:409}):await this.#context.run(state,()=>trade?bagTradeOperation(sql,actor,payload,operation):bagSpaceOperation(sql,actor,payload,operation));}catch(error){rejected=error;}finally{state.active=false;}
    demand(!sql.isTransaction,'native_http_action_transaction_open');
    // Original native notifications follow their native economy COMMIT. The
    // outbox preserves that ordering and survives delivery/reconnect faults;
    // it does not claim atomicity across the earlier native transaction.
    if(state.events.length){const result=await c.database.atomic(sql=>c.writer.notifications.append(sql,{realm:c.realmId,key:randomUUID()},{events:state.events}));notificationActors=result.notificationActors;}
    return null;
   });
   c.notify(notificationActors);if(isBagFull(rejected))return Response.json(bagFullBody(),{status:409});if(rejected)throw rejected;return value;
  });
 }
}
