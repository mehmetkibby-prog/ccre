export const MOVEMENT_CHECKPOINT_PROTOCOL = 'durable-movement-v1';

// One pending durable checkpoint per socket. Presentation motion keeps its
// independent 30 Hz stream. Late replies can never complete a newer request.
export function createMovementCheckpointClient({timeoutMs=1800,now=Date.now}={}) {
  const states=new WeakMap();
  const unavailable=()=>Object.assign(new Error('Movement transport unavailable'),{transportUnavailable:true});
  function fail(state){if(!state?.pending)return;const pending=state.pending;state.pending=null;clearTimeout(pending.timer);pending.reject(unavailable());}
  return {
    welcome(socket,message){
      fail(states.get(socket));
      states.set(socket,{streamId:message.motionStreamId,capable:message.movementProtocol===MOVEMENT_CHECKPOINT_PROTOCOL,
        ready:message.movementReady!==false,serial:0,pending:null,pauseUntil:0});
    },
    receive(socket,message){
      const state=states.get(socket);
      if(!state)return false;
      if(message.type==='movement_transport'&&message.protocol===MOVEMENT_CHECKPOINT_PROTOCOL){
        state.ready=state.capable&&message.ready===true;
        if(!state.ready)fail(state);
        return true;
      }
      if(message.type!=='movement_ack')return false;
      const pending=state.pending;
      if(message.protocol!==MOVEMENT_CHECKPOINT_PROTOCOL||message.streamId!==state.streamId||!pending||message.id!==pending.id)return true;
      if(!Number.isInteger(message.status)||message.status<200||message.status>599||!message.data||typeof message.data!=='object')return true;
      state.pending=null;clearTimeout(pending.timer);
      if(message.data.code==='movement_transport_unavailable'||(message.data.code==='movement_grant_expired'||(message.status===409&&message.data.code==="realtime_scope_changed"))){
        state.pauseUntil=now()+5000;pending.reject(unavailable());
        if((message.data.code==='movement_grant_expired'||(message.status===409&&message.data.code==="realtime_scope_changed")))socket.close(1012,'Movement authorization refresh');
      }else pending.resolve({status:message.status,data:message.data});
      return true;
    },
    disconnect(socket){const state=states.get(socket);if(state)state.ready=false;fail(state);},
    async request(socket,payload,fallback){
      const state=socket&&states.get(socket);
      if(!state?.capable||!state.ready||socket.readyState!==1||state.pauseUntil>now()
        ||state.pending||socket.bufferedAmount>65536||!Number.isSafeInteger(payload.basePositionRevision)
        ||(payload.motionStreamId&&payload.motionStreamId!==state.streamId))return fallback();
      try {
        return await new Promise((resolve,reject)=>{
          const id=++state.serial;
          const timer=setTimeout(()=>{if(state.pending?.id!==id)return;state.pauseUntil=now()+5000;fail(state);},timeoutMs);
          state.pending={id,timer,resolve,reject};
          try {
            const {motionStreamId,motionSequence,...coordinates}=payload;
            socket.send(JSON.stringify({...coordinates,type:'movement_checkpoint',streamId:state.streamId,id,
              ...(motionStreamId&&Number.isSafeInteger(motionSequence)&&motionSequence>=1?{motionStreamId,motionSequence}:{})}));
          }catch{state.pauseUntil=now()+5000;fail(state);}
        });
      }catch(error){if(!error?.transportUnavailable)throw error;return fallback();}
    },
  };
}
