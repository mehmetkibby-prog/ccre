import {Duplex} from 'node:stream';
// Same length-prefixed IPC protocol over MessagePort. This measures the game
// and writer without TCP/Unix sockets; it does NOT measure WS or nginx costs.
export class MessagePortStream extends Duplex {
 constructor(port){
  super({highWaterMark:65536});this.port=port;
  port.on('message',bytes=>{if(bytes===null){this.push(null);return;}if(!(bytes instanceof Uint8Array)){this.destroy(Error('invalid_port_frame'));return;}if(!this.push(Buffer.from(bytes)))port.pause?.();});
  port.on('close',()=>this.destroy());port.on('messageerror',error=>this.destroy(error));
  queueMicrotask(()=>this.emit('connect'));
 }
 _read(){this.port.resume?.();}
 _write(chunk,encoding,callback){try{this.port.postMessage(Buffer.from(chunk));callback();}catch(error){callback(error);}}
 _writev(chunks,callback){try{this.port.postMessage(Buffer.concat(chunks.map(row=>row.chunk)));callback();}catch(error){callback(error);}}
 _final(callback){try{this.port.postMessage(null);callback();}catch(error){callback(error);}}
 _destroy(error,callback){this.port.close();callback(error);}
}
