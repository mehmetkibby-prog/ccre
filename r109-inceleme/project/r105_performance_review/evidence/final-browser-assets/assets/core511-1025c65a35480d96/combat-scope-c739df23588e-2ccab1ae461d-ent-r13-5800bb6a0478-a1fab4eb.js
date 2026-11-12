function validPendingCombatR13(data) {
  return !!data && data.combatPending === true && data.combatPhase === 'pending' &&
    Object.keys(data).every(key => ['combatPending','combatPhase','rewardPending','xp','groundDrops','intentId','provisionalHits','cycle','channel','area','serverAt'].includes(key)) &&
    data.rewardPending === false && data.xp === 0 && data.groundDrops === 0 &&
    data.hits === undefined && data.progression === undefined && data.drops === undefined &&
    typeof data.intentId === 'string' && /^[A-Za-z0-9:_-]{1,120}$/.test(data.intentId) &&
    Array.isArray(data.provisionalHits) && data.provisionalHits.length > 0 &&
    data.provisionalHits.length <= 32 && data.provisionalHits.every(hit => hit &&
      Object.keys(hit).length === 5 && Object.keys(hit).every(key => ['id','spawnRound','damage','hp','killPending'].includes(key)) &&
      typeof hit.id === 'string' && /^[A-Za-z0-9:_-]{1,120}$/.test(hit.id) &&
      Number.isSafeInteger(hit.spawnRound) && hit.spawnRound >= 0 &&
      Number.isFinite(hit.damage) && hit.damage > 0 && Number.isFinite(hit.hp) && hit.hp >= 0 &&
      typeof hit.killPending === 'boolean' && hit.killPending === (hit.hp === 0));
}

export const COMBAT_ATTACK_PROTOCOL = 'authoritative-combat-v1';

// One pending durable checkpoint per socket. Presentation motion keeps its
// independent 30 Hz stream. Late replies can never complete a newer request.
export function createCombatAttackClient({timeoutMs=1800,now=Date.now,onPending:observePendingR13,enableDeferred=false}={}) {
  const notifyR13=(fn,value)=>{try{fn?.(value);}catch{}};
  const states=new WeakMap();
  const unavailable=()=>Object.assign(new Error('Combat transport unavailable'),{transportUnavailable:true});
  function fail(state){if(!state?.pending)return;const pending=state.pending;state.pending=null;clearTimeout(pending.timer);notifyR13(pending.callbacksR13?.onSettled,{status:503,data:{code:'combat_outcome_unknown'}});const error=unavailable();if(pending.observedPendingR13)error.outcomeUnknown=true;pending.reject(error);}
  return {
    welcome(socket,message){
      fail(states.get(socket));
      states.set(socket,{streamId:message.motionStreamId,capable:message.combatProtocol===COMBAT_ATTACK_PROTOCOL,actions:new Set(Array.isArray(message.combatActions)?message.combatActions:['attack']),
        deferredR13:enableDeferred===true&&message.deferredRewardProtocol==='durable-combat-two-phase-r13',ready:message.combatReady!==false,serial:0,pending:null,pauseUntil:0});
    },
    receive(socket,message){
      const state=states.get(socket);
      if(!state)return false;
      if(message.type==='combat_transport'&&message.protocol===COMBAT_ATTACK_PROTOCOL){
        state.ready=state.capable&&message.ready===true;
        if(!state.ready)fail(state);
        return true;
      }
      if(message.type==='combat_pending'){
        const pending=state.pending;
        if(!state.deferredR13||message.protocol!==COMBAT_ATTACK_PROTOCOL||message.deferredRewardProtocol!=='durable-combat-two-phase-r13'||message.streamId!==state.streamId||!pending||message.id!==pending.id||pending.observedPendingR13||message.status!==202||!validPendingCombatR13(message.data)||message.data.intentId!==pending.intentIdR13)return true;
        pending.observedPendingR13=true;
        const notification={id:message.id,data:message.data,serverMs:message.serverMs};
        notifyR13(observePendingR13,notification);notifyR13(pending.callbacksR13?.onPending,notification);
        return true;
      }
      if(message.type!=='combat_ack')return false;
      const pending=state.pending;
      if(message.protocol!==COMBAT_ATTACK_PROTOCOL||message.streamId!==state.streamId||!pending||message.id!==pending.id)return true;
      if(!Number.isInteger(message.status)||message.status<200||message.status>599||!message.data||typeof message.data!=='object')return true;
      state.pending=null;clearTimeout(pending.timer);
      notifyR13(pending.callbacksR13?.onSettled,{status:message.status,data:message.data});
      if(message.data.code==='combat_transport_unavailable'||(message.data.code==='combat_grant_expired'||(message.status===409&&message.data.code==="realtime_scope_changed"))){
        state.pauseUntil=now()+5000;const errorR13=unavailable();if(pending.observedPendingR13)errorR13.outcomeUnknown=true;pending.reject(errorR13);
        if((message.data.code==='combat_grant_expired'||(message.status===409&&message.data.code==="realtime_scope_changed")))socket.close(1012,'Combat authorization refresh');
      }else pending.resolve({status:message.status,data:message.data,serverMs:message.serverMs});
      return true;
    },
    deferred(socket){const state=socket&&states.get(socket);return !!(state?.deferredR13&&state.capable&&state.ready&&socket.readyState===1&&state.pauseUntil<=now()&&!state.pending&&socket.bufferedAmount<=65536);},
    disconnect(socket){const state=states.get(socket);if(state)state.ready=false;fail(state);},
    async request(socket,payload,fallback,callbacksR13){
      const state=socket&&states.get(socket);
      if(!state?.capable||!state.ready||socket.readyState!==1||state.pauseUntil>now()
        ||state.pending||socket.bufferedAmount>65536||!state.actions.has(payload.action??'attack'))return fallback();
      try {
        return await new Promise((resolve,reject)=>{
          const id=++state.serial;
          const timer=setTimeout(()=>{if(state.pending?.id!==id)return;state.pauseUntil=now()+5000;fail(state);},timeoutMs);
          state.pending={id,timer,resolve,reject,callbacksR13,intentIdR13:payload.intentId,observedPendingR13:false};
          try {
            const {motionStreamId,motionSequence,...coordinates}=payload;
            socket.send(JSON.stringify({...coordinates,type:'combat_attack',streamId:state.streamId,id,...(state.deferredR13&&(payload.action??'attack')==='attack'?{deferredRewardProtocol:'durable-combat-two-phase-r13'}:{}),
              ...(motionStreamId&&Number.isSafeInteger(motionSequence)&&motionSequence>=1?{motionStreamId,motionSequence}:{})}));
          }catch{state.pauseUntil=now()+5000;fail(state);}
        });
      }catch(error){
        if(!error?.transportUnavailable)throw error;
        // For newly supported actions, an absent ACK is an unknown outcome.
        // Never automatically execute them a second time over HTTP. HTTP is
        // still used when the socket/capability is unavailable before sending.
        if(error.outcomeUnknown||payload.action==='pvp_attack'||payload.action==='guardian_dash')throw Object.assign(new Error('Eylemin sonucu bekleniyor; dünya durumu yenileniyor.'),{outcomeUnknown:true});
        return fallback();
      }
    },
  };
}

export async function requestScopedAction(client,socket,payload,fallback,options){
 let reply;
 try{reply=await client.request(socket,payload,async()=>({status:200,data:await fallback(),viaHttp:true}));}
 catch(error){if(error?.outcomeUnknown)throw new options.TimeoutError();throw error;}
 const result=reply.data;
 if(!reply.viaHttp){
  if(result.guardianEffect)window.dispatchEvent(new CustomEvent('game-guardian-control',{detail:{...result.guardianEffect,viaHttp:true}}));
  if(result.lifeSteal)window.dispatchEvent(new CustomEvent('game-life-steal',{detail:result.lifeSteal}));
  if(result.pveHit)window.dispatchEvent(new CustomEvent('game-pve-hit',{detail:result.pveHit}));
  if(reply.status===401)window.dispatchEvent(new Event(options.sessionEnded));
  if(reply.status===403&&result.code==='bot_check_required')window.dispatchEvent(new Event('coreoflife:bot-check'));
  if(reply.status===409&&result.code==='game_instance_expired')window.dispatchEvent(new CustomEvent(options.instanceEnded,{detail:result.error}));
  if(reply.status>=400)throw new options.ActionError(result.error??'İşlem tamamlanamadı.',reply.status,result);
 }
 return result;
}
