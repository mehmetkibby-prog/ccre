// Installer verification never treats the writer's readiness as evidence that
// all resident game processes booted. R2 remains a separate closed-realm check.
export function channelModeHealthy(health,enabled){
 if(enabled===null)return true;
 if(!enabled)return health.channelProcesses?.enabled!==true;
 const c=health.channelProcesses;
 return c?.enabled===true&&c.protocol==='resident-channel-v1'&&Array.isArray(c.channels)&&c.channels.length===3&&
  [1,2,3].every(id=>c.channels.filter(row=>row.channel===id&&row.ready===true&&Number.isInteger(row.pid)&&row.pid>0).length===1);
}

export function channelRealtimeHealthy(health,enabled){
 for(const name of ['movement','combatTransport']){
  const bridge=health?.[name];if(bridge?.ready!==true)return false;
  if(enabled&&(!Array.isArray(bridge.channels)||![1,2,3].every(id=>bridge.channels.some(row=>row.channel===id&&row.ready===true))))return false;
 }
 return true;
}
