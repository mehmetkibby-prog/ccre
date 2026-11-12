import {validateLocalPerformance} from '../acceptance.mjs';
export const FINAL_CAMPAIGN_POLICY=Object.freeze({firstRun:33,maximumPerformanceCorrections:0,correctnessRepairUntilProven:true,requiredConsecutivePasses:2,raw:true,exclusionsApplied:0,authorization:'2026-10-14 23:33 Europe/Istanbul: resume from681; diagnose503 with5x200 baseline transfers, repair correctness without one-fix cap, prove5x200 and longGCpause transfers. Then TWO consecutive180s passes on same finalcandidate, stop immediately on either failure. No newGCsettings or performanceoptimization. Historical failures retained; all other rawlimits and deliverygates unchanged.'});
export function finalCampaignMayContinue(history,candidate){
 const attempts=history.filter(r=>r.attempt>=FINAL_CAMPAIGN_POLICY.firstRun);
 if(!attempts.length)return true;
 const valid=r=>r.status==='measured'&&r.sourceUnchanged===true&&r.acceptanceEligible!==false&&validateLocalPerformance(r,r.sourceIdentity?.sha256).passed;
 const first=attempts[0].sourceIdentity?.sha256;
 return attempts.length<2&&candidate===first&&attempts.every(r=>r.sourceIdentity?.sha256===first&&valid(r));
}
