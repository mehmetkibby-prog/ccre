import {randomUUID} from 'node:crypto';

// One record per native group, never per ACK/member. Fixed integer bins retain
// exact quantiles without storing request IDs or growing a sample collection.
export class GroupSizeMetrics477 {
  constructor(scope,{generation=randomUUID(),config,maxSize}={}) {
    if(!['committed-transactions','dispatched-channel-cohorts'].includes(scope)||
       !Number.isSafeInteger(maxSize)||maxSize<1||maxSize>256||
       typeof generation!=='string'||generation.length>100||
       typeof config?.enabled!=='boolean'||!Number.isSafeInteger(config.maxJobs)||config.maxJobs<1||config.maxJobs>maxSize||
       !Number.isFinite(config.windowMs)||config.windowMs<0||config.windowMs>10)throw Error('invalid_group_metrics_config');
    this.scope=scope;this.generation=generation;this.config=Object.freeze({enabled:config.enabled,maxJobs:config.maxJobs,windowMs:config.windowMs});
    this.maxSize=maxSize;this.bins=Array(maxSize+1).fill(0);this.groups=0;this.jobs=0;this.overflowGroups=0;
  }
  record(size) {
    // Diagnostics never reject an otherwise valid gameplay write. Impossible
    // sizes invalidate histogram coverage instead of clamping to a fake bin.
    if(!Number.isSafeInteger(size)||size<1||size>this.maxSize||size>this.config.maxJobs){this.overflowGroups++;return false;}
    this.bins[size]++;this.groups++;this.jobs+=size;return true;
  }
  snapshot() {
    return {schema:'col-writer-group-sizes-v1',scope:this.scope,generation:this.generation,
      observedAtMs:Date.now(),config:{...this.config},maxSize:this.maxSize,groups:this.groups,jobs:this.jobs,
      bins:this.bins.slice(),overflowGroups:this.overflowGroups};
  }
}
