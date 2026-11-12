import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseHost} from './database-host.mjs';
import {installRealmRouteGuard} from './generated/native-realm-runtime.mjs';
import {installSiteVisitRoute457} from '../../../native510-bb3a6cc689c6/vds-server/src/site-visits457.mjs';
import {instrumentNativeHttp} from '../../../native510-bb3a6cc689c6/vds-server/src/http-timing.mjs';
import {demand} from './contract.mjs';

// The exact installed native Vinext adapter retains static assets, path
// normalization, trusted proxy rules, RSC streaming and compression. This
// listener never imports the legacy application/bootstrap/simulation.
export class NativeHttpServer {
 static async start(host,{outDir,port=3003,hosts}={}){
  demand(host instanceof DatabaseHost&&!host.nativeHttpServer&&host.nativeHttp?.health().status===200,'native_http_server_not_ready');
  demand(typeof outDir==='string'&&path.isAbsolute(outDir)&&Number.isInteger(port)&&(port===0||port>=1024&&port<=65535)&&Array.isArray(hosts)&&hosts.length>0&&hosts.every(h=>typeof h==='string'&&h.length>0),'native_http_server_configuration');
  const proof=JSON.parse(fs.readFileSync(new URL('./generated/native-http-composition-proof.json',import.meta.url))),entry=fs.readFileSync(path.join(outDir,'server/index.js'));
  demand(createHash('sha256').update(entry).digest('hex')===proof.generatedSha256,'native_http_server_entry_changed');
  // Import only after the application's runtime environment is configured.
  const dependency=JSON.parse(fs.readFileSync(new URL('./generated/native-http-server-proof.json',import.meta.url))),adapter=new URL('../../../native510-bb3a6cc689c6/node_modules/vinext/dist/server/prod-server.js',import.meta.url);
  demand(createHash('sha256').update(fs.readFileSync(adapter)).digest('hex')===dependency.vinext.adapterSha256,'native_http_server_adapter_changed');
  const {startProdServer}=await import('../../../native510-bb3a6cc689c6/node_modules/vinext/dist/server/prod-server.js');
  const {server,port:bound}=await startProdServer({host:'127.0.0.1',port,outDir}),self=new NativeHttpServer(host,server,bound);
  try{
   installRealmRouteGuard(server,'game');installSiteVisitRoute457(server,null,{hosts,writable:false});server.keepAliveTimeout=65000;instrumentNativeHttp(server);
   const handlers=server.listeners('request');server.removeAllListeners('request');
   server.on('request',(req,res)=>{
    if(self.stopping){res.writeHead(503,{'content-type':'application/json','cache-control':'no-store',connection:'close'});res.end(JSON.stringify({code:'core511_stopping'}));return;}
    // Track the complete response stream as well as handler completion.
    self.responses.add(res);const done=()=>{self.responses.delete(res);res.off('finish',done);res.off('close',done);};res.once('finish',done);res.once('close',done);
    for(const handler of handlers)handler.call(server,req,res);
   });
   host.nativeHttpServer=self;return self;
  }catch(error){await self.stop();throw error;}
 }
 constructor(host,server,port){Object.assign(this,{host,server,port});this.responses=new Set();this.stopping=false;this.stopped=false;this.closing=null;}
 stop(){
  if(this.closing)return this.closing;this.stopping=true;
  this.closing=(async()=>{await new Promise((resolve,reject)=>{this.server.close(error=>error&&error.code!=='ERR_SERVER_NOT_RUNNING'?reject(error):resolve());this.server.closeIdleConnections();});
   // A disconnected private caller may leave a signed operation running.
   // Its original maintenance/loadtest handler is tracked by the binding.
   await this.host.nativeHttp.stop();demand(this.responses.size===0,'native_http_responses_pending');this.stopped=true;
  })().catch(error=>{this.closing=null;throw error;});return this.closing;
 }
}
