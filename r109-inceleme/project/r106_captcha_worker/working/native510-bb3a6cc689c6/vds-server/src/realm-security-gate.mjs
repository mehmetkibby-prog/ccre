// Local hot-path gate: valid sessions never wait for central I/O. Near-expiry
// refresh runs in the background; tickets may force a fresh check. No extra timer.
// applySecurity must durably update the local account mirror and invalidate
// local sessions/presence before resolving when the security version changes.
export class RealmSecurityGate {
  constructor({readSecurity,applySecurity,maintenance=null,now=Date.now,retryNow=()=>performance.now(),maxAgeMs=30000,onRefreshError=error=>console.warn("Realm security background refresh failed:",error.message)}={}) {
    if(typeof readSecurity!=='function'||typeof applySecurity!=='function')throw new Error('Security adapters required');
    if(!Number.isSafeInteger(maxAgeMs)||maxAgeMs<1||maxAgeMs>30000)throw new Error('Security freshness cannot exceed 30 seconds');
    this.maintenance=maintenance;this.readSecurity=readSecurity;this.applySecurity=applySecurity;this.now=now;this.maxAgeMs=maxAgeMs;
    this.onRefreshError=onRefreshError;
    this.retryNow=retryNow;this.backgroundRetries=new WeakMap();
    this.entries=new Map();this.pending=new Map();this.generations=new Map();
  }
  refreshInBackground(accountId,entry) {
    const retry=this.backgroundRetries.get(entry),now=this.retryNow();
    if(this.pending.has(accountId)||retry&&now>=retry.started&&now<retry.until)return;
    void this.refresh(accountId).catch(error=>{
      // Only the still-valid fast path may defer a retry. The authoritative
      // missing/expired path calls refresh directly and never uses this gate.
      // Key by entry identity so forget/revocation/new sessions cannot inherit
      // old backoff. A successful refresh installs a fresh entry automatically.
      if(this.entries.get(accountId)===entry){
        const started=this.retryNow();
        this.backgroundRetries.set(entry,{started,until:started+1000});
      }
      this.onRefreshError(error);
    });
  }
  canPlayEntry492(accountId,entry) {
    // Only a signed maintenance-specific denial can be exempted. Ban, version,
    // freshness, realm closure and all non-maintenance denials stay mandatory.
    return entry.canPlay!==false||(entry.maintenanceOnly492===true&&this.maintenance?.isGameMaster(accountId)===true);
  }
  allows(accountId,sessionVersion) {
    if(this.maintenance&&!this.maintenance.allows(accountId))return false;
    const entry=this.entries.get(accountId);
    return !!entry&&!entry.blocked&&this.canPlayEntry492(accountId,entry)&&entry.version===sessionVersion&&this.now()<entry.validUntil;
  }
  // Administration is a separate, exact-owner permission. Maintenance stops
  // the owner's character too, while this authenticated panel can reopen play.
  // No gameplay caller uses this method; block/version/freshness still apply.
  allowsAdministration(accountId,sessionVersion) {
    const entry=this.entries.get(accountId);
    return !!this.maintenance?.isAdmin(accountId)&&!!entry&&!entry.blocked&&entry.version===sessionVersion&&this.now()<entry.validUntil;
  }
  // Null is the synchronous fast path: callers must not await it. Refreshes
  // are single-flight; a failed background check never extends validUntil.
  ensure(accountId,sessionVersion) {
    if(this.allows(accountId,sessionVersion)) {
      const entry=this.entries.get(accountId);
      if(entry.validUntil-this.now()<10000)this.refreshInBackground(accountId,entry);
      return null;
    }
    const entry=this.entries.get(accountId);
    if(entry&&this.now()<entry.validUntil)return null; // Known denial never waits or grants access.
    return this.refresh(accountId);
  }
  authorize(accountId,sessionVersion) {
    if(this.maintenance&&!this.maintenance.allows(accountId))return false;
    // One clock sample/decision. ensure()+allows() on opposite sides of the
    // expiry millisecond used to reject a valid fast-path request spuriously.
    const entry=this.entries.get(accountId),now=this.now();
    if(entry&&now<entry.validUntil){
      const allowed=!entry.blocked&&this.canPlayEntry492(accountId,entry)&&entry.version===sessionVersion;
      if(allowed&&entry.validUntil-now<10000)this.refreshInBackground(accountId,entry);
      return allowed;
    }
    return this.refresh(accountId).then(()=>this.allows(accountId,sessionVersion));
  }
  refresh(accountId) {
    const running=this.pending.get(accountId);if(running)return running;
    const generation=this.generations.get(accountId)||0,started=this.now();
    const job=(async()=>{
      const state=await this.readSecurity(accountId);
      if(!state||!Number.isSafeInteger(state.securityVersion)||state.securityVersion<1||typeof state.blocked!=='boolean'){
        this.entries.delete(accountId);throw new Error('Invalid central security response');
      }
      if((this.generations.get(accountId)||0)!==generation)throw new Error('Security refresh belongs to a closed session');
      const current=this.entries.get(accountId);
      if(current&&state.securityVersion<current.version){this.entries.delete(accountId);throw new Error('Central security version regressed');}
      // Invalidate the local fast-path permission as soon as a changed/blocked
      // response is known; it cannot stay usable during the durable mirror write.
      if(state.blocked||current&&current.version!==state.securityVersion)this.entries.delete(accountId);
      await this.applySecurity(accountId,state);
      if((this.generations.get(accountId)||0)!==generation)throw new Error('Security refresh belongs to a closed session');
      // Slow auth/mirror work cannot extend the freshness window by its latency.
      // A pre-opening denial may be cached only until the announced opening.
      // Expiry still requires a fresh signed accounts response; time alone never
      // grants access or bypasses bans, ownership, versions or maintenance.
      const opening=state.canPlay===false&&state.launch?.automaticOpening===true&&Number.isSafeInteger(state.launch.opensAt)&&state.launch.opensAt>started?state.launch.opensAt:Infinity;
      const validUntil=Math.min(started+this.maxAgeMs,opening);
      if(this.now()>=validUntil){this.entries.delete(accountId);throw new Error('Central security response expired');}
      if(state.maintenanceControl438?.revision<this.maintenance?.policy?.revision){this.entries.delete(accountId);throw Error('stale_maintenance_policy');}
      const entry={version:state.securityVersion,blocked:state.blocked,validUntil,canPlay:state.canPlay!==false,maintenanceOnly492:state.canPlay===false&&state.launch?.phase==='maintenance'&&state.maintenanceControl438?.phase==='maintenance'};
      this.entries.set(accountId,entry);return {...entry};
    })();
    this.pending.set(accountId,job);
    void job.finally(()=>{
      if(this.pending.get(accountId)===job)this.pending.delete(accountId);
      if(!this.entries.has(accountId)&&!this.pending.has(accountId))this.generations.delete(accountId);
    }).catch(()=>{});
    return job;
  }
  forget(accountId) {
    this.entries.delete(accountId);
    if(this.pending.has(accountId))this.generations.set(accountId,(this.generations.get(accountId)||0)+1);
    else this.generations.delete(accountId);
  }
}
