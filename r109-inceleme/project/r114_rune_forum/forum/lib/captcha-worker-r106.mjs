import {parentPort} from 'node:worker_threads';
import {performance} from 'node:perf_hooks';
import {captchaPng} from './captcha-image.mjs';

// This worker has no database, session, HTTP or game-state access.
parentPort.on('message',message=>{
 const id=message?.id;
 if(!Number.isSafeInteger(id)||id<1||!/^\d{6}$/.test(message?.answer??'')){
  parentPort.postMessage({id,error:'captcha_render_input'});return;
 }
 try{
  const started=performance.now(),png=new Uint8Array(captchaPng(message.answer));
  parentPort.postMessage({id,png,renderMs:performance.now()-started},[png.buffer]);
 }catch{parentPort.postMessage({id,error:'captcha_render_failed'});}
});
