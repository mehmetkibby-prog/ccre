import {WRITER_TIMING_KEYS,sanitizeWriterPerf477,sanitizeCombatPath477} from '../../vds-server/src/writer-perf-wire477.mjs';
const keys=new Set(['server_body','server_session','server_csrf','server_seed','server_pre_reads','server_reads','server_pvp_validation','server_pvp_commit','server_pve_retaliation','server_pve_validation','server_finish','server_prepare','server_snapshot','server_response','server_move','server_total','native_ingress_session','native_owner_wall','native_total','writer_queue_wall','writer_rpc_wall','world_snapshot_wall',...WRITER_TIMING_KEYS]);
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=120000;
export function relayPerf477(row,item){
 if(!Number.isFinite(item.receivedAt477)||!Number.isFinite(item.sentAt477)||!item.socket.player?.loadlabRunId||typeof row?.perf?.requestId!=='string'||!/^([a-f0-9]{32})$/.test(row.perf.requestId)||!Number.isSafeInteger(row.perf.serverAtMs)||row.perf.serverAtMs<0||!row.timing||typeof row.timing!=='object'||Array.isArray(row.timing))return {};
 const timing={};for(const key of keys)if(finite(row.timing[key]))timing[key]=row.timing[key];if(!Object.keys(timing).length)return {};
 const at=performance.now();
 timing.realtime_prepare=at>=item.sentAt477?Math.round((item.sentAt477-item.receivedAt477)*1000)/1000:0;
 timing.realtime_upstream=Math.round((at-item.sentAt477)*1000)/1000;
 timing.realtime_total=Math.round((at-item.receivedAt477)*1000)/1000;
 const writer=sanitizeWriterPerf477(row.perf.writer),combatPath=sanitizeCombatPath477(row.perf.combatPath);return {timing,perf:{requestId:row.perf.requestId,serverAtMs:row.perf.serverAtMs,...(writer?{writer}:{}),...(combatPath?{combatPath}:{})}};
}
export function optionalPerfBudget477(reply,limit){if(reply.perf&&Buffer.byteLength(JSON.stringify(reply))>limit){delete reply.perf;delete reply.timing;}return reply;}
