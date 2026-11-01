// Transaction order shared by the production systemd adapter and direct-process
// installer verification. No game rules or database restoration in this layer.
export async function installTransaction(o){
 let prior,activated=false,stage='preflight';
 try{
  prior=await o.preflight();await o.journal({stage,prior});
  stage='maintenance';const policy=await o.maintenance(prior);prior.maintenanceRevision=policy.revision;
  await o.assertEmpty(prior);await o.journal({stage,prior});
  // This is the first installation gate, before staging/activation or game DB writes.
  stage='isolation';await o.isolation(prior);await o.journal({stage,prior});
  stage='stage';await o.stage(prior);await o.journal({stage,prior});
  stage='canary';const canary=await o.canary(prior);if(!canary.passed)throw Object.assign(Error('installation_canary_failed'),{failures:canary.failures});
  await o.journal({stage,prior,canary});await o.assertEmpty(prior);
  stage='activate';activated=true;await o.journal({stage,prior,canary});await o.activate(prior);
  stage='health';await o.health(prior);await o.assertMaintenance(prior);
  const result={installed:true,stage:'ready',maintenance:true,prior,canary,opened:false};await o.journal(result);return result;
 }catch(error){
  let rollback=null,rollbackError=null;
  if(prior?.maintenanceRevision){try{rollback=await o.rollback(prior,{activated});await o.assertMaintenance(prior);}catch(e){rollbackError=e.code??e.message;}}
  const result={installed:false,stage,prior,maintenance:rollbackError===null&&Boolean(prior?.maintenanceRevision),opened:false,failures:error.failures??[error.code??error.message],rollback,rollbackError};
  await o.journal(result);return result;
 }
}
