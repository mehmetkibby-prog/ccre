import {REQUIRED_MECHANICS} from './contract.mjs';
import {validateLocalLoad,validatePerformancePair} from './acceptance.mjs';

// User-authorized split: complete-game local MessageChannel evidence first;
// the real network gate runs inside the authenticated installer in maintenance.
// It is never legal to replace missing gameplay with a transport microbenchmark.
export function releaseGate(evidence){
 const failures=[];
 for(const name of REQUIRED_MECHANICS)if(evidence?.parity?.[name]!==true)failures.push('parity:'+name);
 for(const name of ['killBeforeCommit','killAfterCommitBeforeAck','writerRestart','channelTransfer','reconnect','duplicateIntent','rollbackCurrentDatabase','productionIsolation'])if(evidence?.faults?.[name]!==true)failures.push('fault:'+name);
 const local=validateLocalLoad(evidence?.load,evidence?.manifestSha256);failures.push(...local.failures.map(name=>'load:'+name));
 if(!validatePerformancePair(evidence?.performanceRuns,evidence?.manifestSha256))failures.push('load:consecutive_same_candidate_pair');
 for(const name of ['clientParity','nginxIsolation','signedInstaller','rollbackVerified','installerCanaryBound','installerCanaryFailureRecoveryTested'])if(evidence?.[name]!==true)failures.push('delivery:'+name);
 return {ready:failures.length===0,failures,networkGate:'installer-maintenance-100-clients-180-seconds'};
}
