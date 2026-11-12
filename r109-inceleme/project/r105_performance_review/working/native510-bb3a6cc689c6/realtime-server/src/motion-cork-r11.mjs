// Keep every ws.send() and every JSON text frame. This only joins the socket's
// existing writes until the next check phase; it owns at most one cork level.
const MAX_BYTES = 4096;
const MAX_FRAMES = 16;
const MAX_PENDING = 200;
const HOLD_BOUNDS_MS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512];

export function createRealtimeMotionCork({enabled = false} = {}) {
  const pending = new Map(), hooked = new WeakSet();
  let immediate = null;
  const stats = {batches:0,frames:0,maxPending:0,holds:0,holdSumMs:0,holdMaxMs:0,
    holdBuckets:new Array(HOLD_BOUNDS_MS.length+1).fill(0),
    flushes:{turn:0,essential:0,limit:0,backpressure:0,close:0,error:0,send_error:0,socket_changed:0}};
  const release = (socket, reason = 'close') => {
    const state = pending.get(socket);
    if (!state) return false;
    // Delete first: an error/close event while uncorking must not release twice.
    pending.delete(socket);
    const held = Math.max(0,performance.now()-state.started);
    stats.holds++;stats.holdSumMs+=held;stats.holdMaxMs=Math.max(stats.holdMaxMs,held);
    const bucket=HOLD_BOUNDS_MS.findIndex(bound=>held<=bound);
    stats.holdBuckets[bucket<0?HOLD_BOUNDS_MS.length:bucket]++;
    stats.flushes[Object.hasOwn(stats.flushes,reason)?reason:'close']++;
    // end() may already have released every level. Never create an extra one,
    // and never uncork another owner's complete nesting depth.
    if (state.net.writableCorked > 0) state.net.uncork();
    return true;
  };
  const schedule = () => {
    if (immediate) return;
    immediate=setImmediate(()=>{
      immediate=null;
      // The bounded snapshot prevents reentrant sends from joining this sweep.
      for (const socket of [...pending.keys()]) release(socket,'turn');
    });
  };
  const prepare = (socket, essential) => {
    if (!enabled || !pending.has(socket)) return;
    if (essential) release(socket,'essential');
    else if(socket.readyState!==1) release(socket,'close');
    else if(socket._socket!==pending.get(socket).net) release(socket,'socket_changed');
    // Corked bytes are included in ws.bufferedAmount. Release our bytes before
    // the caller applies its unchanged 8192-byte nonessential drop threshold.
    else if(socket.bufferedAmount>8192) release(socket,'backpressure');
  };
  const send = (socket, encoded, essential) => {
    const legacy=()=>socket.send(encoded,{binary:false});
    if (!enabled) return legacy();
    prepare(socket,essential);
    if (essential) return legacy();
    const net=socket._socket;
    // ws._socket is version-pinned but private. Any unsupported transport keeps
    // the original public ws.send path, without patching ws or net internals.
    if(!net||typeof net.cork!=='function'||typeof net.uncork!=='function'||
       typeof socket.once!=='function'||!Number.isInteger(net.writableCorked)||
       !Number.isFinite(net.writableLength)||net.destroyed||net.writableEnded||net.writable===false) {
      release(socket,'close');return legacy();
    }
    // Fourteen bytes is a conservative maximum frame header. Large individual
    // messages remain immediate, so our own queued batch cannot exceed 4096.
    const bytes=encoded.length+14;
    if(bytes>MAX_BYTES){release(socket,'limit');return legacy();}
    let state=pending.get(socket);
    if(state&&(state.frames>=MAX_FRAMES||state.bytes+bytes>MAX_BYTES||net.writableLength+bytes>MAX_BYTES)){
      release(socket,'limit');state=undefined;
    }
    if(!state){
      // Existing backlog already batches in Node. Do not add latency to it or
      // join an unknown external cork owner; saturation falls back immediately.
      if(pending.size>=MAX_PENDING||net.writableCorked!==0||net.writableLength!==0)return legacy();
      net.cork();state={net,frames:0,bytes:0,started:performance.now()};pending.set(socket,state);
      stats.batches++;stats.maxPending=Math.max(stats.maxPending,pending.size);
      if(!hooked.has(socket)){
        hooked.add(socket);
        socket.once('close',()=>release(socket,'close'));
        socket.once('error',()=>release(socket,'error'));
      }
      schedule();
    }
    let result;
    try {result=legacy();}
    catch(error){release(socket,'send_error');throw error;}
    state.frames++;state.bytes+=bytes;stats.frames++;
    if(state.frames>=MAX_FRAMES||state.bytes>=MAX_BYTES||net.writableLength>=MAX_BYTES)release(socket,'limit');
    return result;
  };
  const snapshot = () => ({enabled,limits:{bytes:MAX_BYTES,frames:MAX_FRAMES,pendingSockets:MAX_PENDING},
    batches:stats.batches,frames:stats.frames,pending:pending.size,maxPending:stats.maxPending,
    hold:{count:stats.holds,sumMs:stats.holdSumMs,maxMs:stats.holdMaxMs,
      upperBoundsMs:[...HOLD_BOUNDS_MS,null],buckets:[...stats.holdBuckets]},flushes:{...stats.flushes}});
  return Object.freeze({prepare,send,release,snapshot});
}
