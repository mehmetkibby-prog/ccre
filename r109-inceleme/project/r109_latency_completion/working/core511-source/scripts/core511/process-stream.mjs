import {Duplex} from 'node:stream';
// Length-prefixed authenticated protocol over the parent's private OS IPC pipe.
// The pipe is supplied only by the spawning supervisor; no browser can attach.
export class ProcessStream extends Duplex {
 constructor(peer,{stream='kernel511',connect=true}={}){
  super({highWaterMark:65536});this.peer=peer;this.name=stream;
  this.message=message=>{if(message?.type!=='kernel511-bytes'||message.stream!==stream)return;if(message.bytes===null){this.push(null);return;}if(!(message.bytes instanceof Uint8Array)){this.destroy(Error('invalid_process_frame'));return;}this.push(Buffer.from(message.bytes));};
  this.closedPeer=()=>this.destroy();peer.on('message',this.message);peer.once('disconnect',this.closedPeer);peer.once('exit',this.closedPeer);if(connect)queueMicrotask(()=>this.emit('connect'));
 }
 _read(){}
 // Writable owns this chunk until the send callback. Advanced IPC serializes
 // it into a distinct process buffer before acknowledging that callback.
 _write(bytes,encoding,callback){if(!this.peer.connected){callback(Error('process_ipc_disconnected'));return;}this.peer.send({type:'kernel511-bytes',stream:this.name,bytes},callback);}
 // ws corks the header and payload together. Preserve that batching across
 // the OS pipe instead of serializing two IPC messages for every WS frame.
 // Node releases each original write callback only after this one callback.
 _writev(chunks,callback){if(!this.peer.connected){callback(Error('process_ipc_disconnected'));return;}this.peer.send({type:'kernel511-bytes',stream:this.name,bytes:Buffer.concat(chunks.map(row=>row.chunk))},callback);}
 _final(callback){if(!this.peer.connected){callback();return;}this.peer.send({type:'kernel511-bytes',stream:this.name,bytes:null},callback);}
 _destroy(error,callback){this.peer.off('message',this.message);this.peer.off('disconnect',this.closedPeer);this.peer.off('exit',this.closedPeer);callback(error);}
}
