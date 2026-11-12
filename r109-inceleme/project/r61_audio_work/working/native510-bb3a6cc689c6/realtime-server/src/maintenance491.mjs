// Called exclusively after verification of the existing signed loopback request.
// One timer per realtime process; no player timers, SQL, or periodic polling.
function policy491(input){
 if(!input||!Number.isSafeInteger(input.revision)||input.revision<1||!['normal','open','waiting','ended','maintenance'].includes(input.phase))throw Error('maintenance_policy_invalid');
 const startedAt=Number(input.startedAt)||0,deadlineMs=Number(input.deadlineMs)||0;
 if(!Number.isSafeInteger(startedAt)||!Number.isSafeInteger(deadlineMs)||startedAt<0||deadlineMs<0||input.phase==='maintenance'&&deadlineMs<startedAt)throw Error('maintenance_deadline_invalid');
 return Object.freeze({revision:input.revision,phase:input.phase,startedAt,deadlineMs,maintenanceText:String(input.maintenanceText??'').slice(0,2000)});
}
export function createRealtimeMaintenance491({clients,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let policy=null,timer=null,closed=false;
 const stats={updates:0,announcements:0,deadlineCloses:0,admissionRejects:0};
 const blocked=()=>policy?.phase==='maintenance'&&now()>=policy.deadlineMs;
 const exempt=player=>player?.maintenanceGm492===true&&Number.isFinite(player.leaseExpiresAt)&&player.leaseExpiresAt>now();
 const message=player=>({type:'maintenance491',revision:policy.revision,maintenanceRevision491:policy.revision,serverTime:now(),maintenance438:policy.phase==='maintenance'&&!exempt(player)?{revision:policy.revision,startedAt:policy.startedAt,deadlineMs:policy.deadlineMs,serverTime:now(),maintenanceText:policy.maintenanceText}:null});
 function send(socket,encoded){if(socket.readyState!==1||socket.bufferedAmount>262144)return false;try{socket.send(encoded);stats.announcements++;return true;}catch{return false;}}
 function announce(){const encoded=JSON.stringify(message()),gm=JSON.stringify(message({maintenanceGm492:true,leaseExpiresAt:now()+1}));for(const socket of clients())if(socket.player)send(socket,exempt(socket.player)?gm:encoded);}
 function expire(){if(closed||!blocked())return;const encoded=JSON.stringify(message());for(const socket of clients()){if(socket.readyState!==1||exempt(socket.player))continue;if(socket.player)send(socket,encoded);stats.deadlineCloses++;socket.close(1008,'Game maintenance');}}
 function arm(){if(timer!==null)clearTimer(timer);timer=null;if(closed||policy?.phase!=='maintenance')return;if(blocked()){expire();return;}const revision=policy.revision;timer=setTimer(()=>{timer=null;if(closed||policy?.revision!==revision)return;if(!blocked()){arm();return;}expire();},Math.min(2147483647,Math.max(1,policy.deadlineMs-now())));timer?.unref?.();}
 return {
  apply(input){const next=policy491(input);if(closed||policy&&next.revision<policy.revision)return false;if(policy&&next.revision===policy.revision){if(JSON.stringify(next)!==JSON.stringify(policy))throw Error('maintenance_revision_conflict');return false;}policy=next;stats.updates++;announce();arm();return true;},
  admit(socket,verifiedPlayer=socket.player){if(!blocked()||exempt(verifiedPlayer))return true;stats.admissionRejects++;if(socket.readyState===1){send(socket,JSON.stringify(message()));socket.close(1008,'Game maintenance');}return false;},
  connected(socket){if(policy)send(socket,JSON.stringify(message(socket.player)));return this.admit(socket);},
  revalidate(notify=false){if(policy){if(notify)announce();expire();}},
  snapshot(){return {...stats,revision:policy?.revision??0,phase:policy?.phase??'unknown',deadlineMs:policy?.deadlineMs??0};},
  close(){closed=true;if(timer!==null)clearTimer(timer);timer=null;},
 };
}
