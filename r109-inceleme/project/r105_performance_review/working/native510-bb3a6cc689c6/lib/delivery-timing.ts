// Fixed action labels and numerical timings only; never bodies or player data.
const actionNames = new Set(['attack','pvp_attack','heartbeat','move','collect','claim_rewards','join','hurt']);
export function deliveryAction(value: unknown): string {
  return typeof value === 'string' && actionNames.has(value) ? value : 'other';
}
export function deliveryTiming(header:string|null,edgeMs:number) {
  const value=(name:string)=>{
    const match=(header??'').slice(0,4096).match(new RegExp(`(?:^|,)\\s*${name}\\s*;\\s*dur=(\\d+(?:\\.\\d+)?)(?=\\s*(?:[,;]|$))`,'i'));
    const n=match?Number(match[1]):NaN;
    return Number.isFinite(n)&&n<=2147483647?n:undefined;
  };
  const proxyMs=value('vds_proxy'),appMs=value('total');
  const nativePhases=Object.fromEntries([['proxyQueueMs','vds_queue'],['proxySendMs','vds_send'],['nativeIngressMs','vds_ingress'],['nativeHttpMs','vds_http']].flatMap(([key,name])=>{const ms=value(name);return ms===undefined?[]:[[key,ms]];}));
  const stages=Object.fromEntries(['body','session','csrf','seed','pre_reads','reads','pve_retaliation','pve_validation','pvp_validation','pvp_commit','heartbeat_retaliation','heartbeat_commit','heartbeat_maintenance','reward_limits','reward_delivery','reward_repair','reward_drops','reward_progress','finish'].flatMap(name=>{const ms=value(name);return ms===undefined?[]:[[name,ms]];}));
  return {...(Object.keys(stages).length?{stages}:{}),...nativePhases,edgeMs:Math.round(edgeMs),...(proxyMs===undefined?{}:{proxyMs}),...(appMs===undefined?{}:{appMs}),
    ...(proxyMs===undefined||appMs===undefined?{}:{outsideHandlerMs:Math.max(0,Math.round(proxyMs-appMs))})};
}
