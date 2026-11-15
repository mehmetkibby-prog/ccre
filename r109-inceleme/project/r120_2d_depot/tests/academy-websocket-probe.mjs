import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {sign,randomUUID,generateKeyPairSync} from 'node:crypto';
const [port,file,wsPath]=process.argv.slice(2),keys=JSON.parse(fs.readFileSync(file)),{default:WebSocket}=await import(pathToFileURL(wsPath));
function ticket(extra={},key=keys.private){const ms=Date.now(),sec=Math.floor(ms/1000);const payload={v:1,iss:'coreoflife.net',aud:'coreoflife-realtime',iat:sec,exp:sec+30,jti:randomUUID(),playerId:'normal-'+randomUUID(),name:'Test',role:'avci',area:'forest',x:500,y:500,hp:100,maxHp:100,leaseExpiresAt:ms+45000,securityVersion:1,scopeVersion:1,issuedAtMs:ms,instanceId:randomUUID(),channel:1,cycle:1,...extra};const b=Buffer.from(JSON.stringify(payload)).toString('base64url');return 'v1.'+b+'.'+sign('sha256',Buffer.from('COL-TICKET-V1.'+b),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');}
function connect(token,headers={}){return new Promise((resolve,reject)=>{const socket=new WebSocket('ws://127.0.0.1:'+port+'/ws',{headers:{origin:'https://r2.coreoflife.net',...headers}});const timer=setTimeout(()=>{socket.terminate();reject(Error('probe timeout'));},6000);const done=r=>{clearTimeout(timer);socket.terminate();resolve(r);};socket.on('open',()=>socket.send(JSON.stringify({type:'auth',ticket:token})));socket.on('message',raw=>{const data=JSON.parse(raw);if(data.type==='welcome')done({welcome:true});});socket.on('close',code=>done({code}));socket.on('error',e=>done({error:e.message}));});}
const good=await connect(ticket());assert.equal(good.welcome,true);
const fresh=await connect(ticket(),{origin:'https://2d.coreoflife.net'});assert.equal(fresh.welcome,true);
for(const origin of ['https://evil.test','https://r1.coreoflife.net','null','https://2d.coreoflife.net.evil.test']){const bad=await connect(ticket(),{origin});assert.notEqual(bad.welcome,true);}
const other=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey;
const wrongKey=await connect(ticket({},other));assert.equal(wrongKey.code,4003);
const bot=await connect(ticket({playerId:'blocked-bot'}));assert.equal(bot.code,4003);
const marker=await connect(ticket({loadlabRunId:'test-run'}));assert.equal(marker.code,4003);
const proof=await connect(ticket(),{'x-col-lab-proof':'invalid'});assert.notEqual(proof.welcome,true);
console.log(JSON.stringify({new2dOrigin:'accepted',foreignOrigins:'rejected',normalAcademyTicket:'accepted',otherRealmSigningKey:'rejected',durableBot:'rejected',markedBot:'rejected',testProof:'rejected'}));
