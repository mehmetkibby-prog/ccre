import {measureSync504,rpcWorkName504} from './runtime-performance.mjs';
import {randomUUID} from 'node:crypto';
import {CHANNEL_PROTOCOL, jsonBytes, requestDigest, channelError} from './channel-protocol.mjs';

// The transport is a fork-created IPC pipe, never an HTTP/browser endpoint.
// A retry keeps the same operation id; a timeout means UNKNOWN, not rollback.
export class ChannelRpc {
  constructor(transport, {identity, handlers = {}, timeoutMs = 5000, maxPending = 128, maxResponses = 256} = {}) {
    this.transport = transport; this.identity = identity; this.handlers = handlers;
    this.timeoutMs = timeoutMs; this.maxPending = maxPending; this.maxResponses = maxResponses;
    this.pending = new Map(); this.responses = new Map(); this.closed = false;
    this.stats = {sent: 0, received: 0, timeouts: 0, rejected: 0, errors: 0};
    this.listen = message => { void measureSync504('rpc_receive',()=>this.receive(message)); };
    this.disconnect = () => this.close();
    transport.on('message', this.listen); transport.on('disconnect', this.disconnect);
  }
  send(message) {
    if (this.closed || this.transport.connected === false) throw channelError('ipc_disconnected');
    const encoded=measureSync504('rpc_serialize',()=>typeof message==='string'?message:jsonBytes(message));
    this.transport.send(encoded, error => { if (error) { this.stats.errors++; this.close(); } });
    this.stats.sent++;
  }
  request(method, payload, {id = randomUUID(), timeoutMs = this.timeoutMs} = {}) {
    if (this.closed) return Promise.reject(channelError('ipc_disconnected'));
    if (this.pending.has(id)) return Promise.reject(channelError('ipc_request_pending'));
    if (this.pending.size >= this.maxPending) return Promise.reject(channelError('ipc_backpressure'));
    const frame = {protocol: CHANNEL_PROTOCOL, identity: this.identity, type: 'request', id, method, payload};
    let encoded;try { encoded=jsonBytes(frame); } catch (error) { return Promise.reject(error); }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id); this.stats.timeouts++;
        reject(Object.assign(channelError('ipc_outcome_unknown'), {operationId: id}));
      }, timeoutMs);
      this.pending.set(id, {resolve, reject, timer});
      try { this.send(encoded); } catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  async receive(frame) {
    if (this.closed) return;
    try { if(typeof frame==='string'){if(Buffer.byteLength(frame)>1024*1024)throw Error('ipc_payload_limit');frame=JSON.parse(frame);}else jsonBytes(frame); } catch { this.stats.rejected++; return; }
    if (frame?.protocol !== CHANNEL_PROTOCOL || frame.identity !== this.identity || typeof frame.id !== 'string' || frame.id.length > 160) {
      this.stats.rejected++; return;
    }
    this.stats.received++;
    if (frame.type === 'response') {
      const pending = this.pending.get(frame.id); if (!pending) return;
      this.pending.delete(frame.id); clearTimeout(pending.timer);
      if (frame.ok === true) pending.resolve(frame.result);
      else pending.reject(channelError(typeof frame.code === 'string' ? frame.code : 'ipc_request_failed'));
      return;
    }
    if (frame.type !== 'request' || !Object.hasOwn(this.handlers, frame.method)) { this.stats.rejected++; return; }
    // Profiles are bounded, read-only diagnostics with their own start id.
    // Never retain downloaded chunks in the game RPC replay-response cache.
    if(frame.method==='cpuProfile507'){
      let result;try{const value=await this.handlers.cpuProfile507(frame.payload);jsonBytes(value);result={ok:true,result:value};}catch(error){result={ok:false,code:error.code||'profile_failed'};}
      this.sendResult(frame.id,result);return;
    }
    const digest = requestDigest({method: frame.method, payload: frame.payload});
    let cached = this.responses.get(frame.id);
    if (cached && cached.digest !== digest) {
      this.sendResult(frame.id, {ok: false, code: 'ipc_id_reused'}); return;
    }
    if (!cached) {
      // Do not evict executing requests; an immediate retry must share them.
      while (this.responses.size >= this.maxResponses) {
        const idle = [...this.responses].find(([, value]) => value.done);
        if (!idle) { this.sendResult(frame.id, {ok: false, code: 'ipc_backpressure'}); return; }
        this.responses.delete(idle[0]);
      }
      cached = {digest, done: false}; this.responses.set(frame.id, cached);
      cached.promise = Promise.resolve().then(() => measureSync504(rpcWorkName504(frame.method),()=>this.handlers[frame.method](frame.payload, frame.id)))
        .then(result => measureSync504('rpc_reply',()=>{ jsonBytes(result); return {ok: true, result}; }), error => ({ok: false, code: error.code || 'ipc_handler_failed'}))
        .catch(() => ({ok: false, code: 'ipc_handler_failed'}))
        .finally(() => { cached.done = true; });
    }
    const result = await cached.promise;
    this.sendResult(frame.id, result);
  }
  sendResult(id, result) {
    try { this.send({protocol: CHANNEL_PROTOCOL, identity: this.identity, type: 'response', id, ...result}); }
    catch { this.stats.errors++; }
  }
  close() {
    if (this.closed) return; this.closed = true;
    this.transport.off('message', this.listen); this.transport.off('disconnect', this.disconnect);
    for (const [id, pending] of this.pending) { clearTimeout(pending.timer); pending.reject(Object.assign(channelError('ipc_outcome_unknown'), {operationId: id})); }
    this.pending.clear(); this.responses.clear();
  }
}
