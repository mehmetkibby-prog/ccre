// Incremental build over the exact installed R42 immutable client graph.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {patchR43Client} from './patch-r43-client.mjs';
import {reverseR40Edits} from './patch-r40-client.mjs';
const home=import.meta.dirname,baseline=process.argv[2];if(!baseline)throw Error('R42 core directory required');
const hash=s=>createHash('sha256').update(s).digest('hex'),read=(dir,name)=>fs.readFileSync(path.join(dir,name),'utf8');
const proofText=read(baseline,'generated/native-client-proof.json'),proof=JSON.parse(proofText);
if(proof.name!=='game-client-core511-d35a5765091a8a02.js'||proof.bridge!=='core511-transport-4744fba7c4e82e6a.js'||proof.r43)throw Error('r43_wrong_r42_graph');
const namespace=p=>'core511-'+createHash('sha256').update(fs.readFileSync(path.join(home,'client-assets.mjs'))).update(JSON.stringify(p)).digest('hex').slice(0,16);
if(namespace(proof)!=='core511-44c6ddc7eb47aca1')throw Error('r43_wrong_r42_namespace');
const assets=[],sources=[];
function asset(label,file,edits=[]){const original=read(home,file);let text=original;for(const [from,to]of edits){if(text.split(from).length!==2)throw Error('r43_import_anchor:'+file);text=text.replace(from,to);}const name='core511-r43-'+label+'-'+hash(text).slice(0,16)+'.js';assets.push([name,text]);sources.push({file,sourceSha256:hash(original),name,sha256:hash(text)});return name;}
const catalog=asset('materials','r43-tower-materials.mjs'),icons=proof.r40.helper.icons.name;
const helper=asset('ui','r43-client.mjs',[["'./r43-tower-materials.mjs'","'./"+catalog+"'"],["'./tower-material-icons-r40.mjs'","'./"+icons+"'"]]);
const native=asset('native-motion','generated/movement-presentation-rules.mjs'),playback=asset('playback','remote-playback-r43.mjs');
const remote=asset('remote','remote-movement.mjs',[["'./generated/movement-presentation-rules.mjs'","'./"+native+"'"],["'./r43-client.mjs'","'./"+helper+"'"],["'./remote-playback-r43.mjs'","'./"+playback+"'"]]);
const oldTransport=read(baseline,'generated/client/'+proof.bridge),oldGame=read(baseline,'generated/client/'+proof.name),oldPortal=read(baseline,'generated/client/'+proof.portal.name);
if(hash(oldTransport)!==proof.bridgeSha256||hash(oldGame)!==proof.patchedSha256||hash(oldPortal)!==proof.portal.patchedSha256)throw Error('r43_r42_asset_sha');
const prefix=`import {RemoteMovement as RemoteMovementR43} from './${remote}';\n`,from='this.interpolation = new RemoteMovement();',to='this.interpolation = new RemoteMovementR43();';if(oldTransport.split(from).length!==2)throw Error('r43_transport_constructor');
const transport=prefix+oldTransport.replace(from,to),transportEdits=[{position:'prepend',from:'',to:prefix},{from,to,count:1}],transportName='core511-transport-'+hash(transport).slice(0,16)+'.js';
if(reverseR40Edits(transport,transportEdits)!==oldTransport)throw Error('r43_transport_inverse');assets.push([transportName,transport]);
const game=patchR43Client(oldGame,helper);if(game.source.split(proof.bridge).length!==2)throw Error('r43_game_transport_reference');game.source=game.source.replace(proof.bridge,transportName);game.proof.edits.push({from:proof.bridge,to:transportName,count:1});game.proof.patchedSha256=hash(game.source);
if(reverseR40Edits(game.source,game.proof.edits)!==oldGame)throw Error('r43_game_inverse');const gameName='game-client-core511-'+hash(game.source).slice(0,16)+'.js';assets.push([gameName,game.source]);
const portal=oldPortal.replaceAll(proof.name,gameName),portalEdits=[{from:proof.name,to:gameName,count:oldPortal.split(proof.name).length-1}];if(portalEdits[0].count!==2||reverseR40Edits(portal,portalEdits)!==oldPortal)throw Error('r43_portal_inverse');const portalName='auth-portal-core511-'+hash(portal).slice(0,16)+'.js';assets.push([portalName,portal]);
for(const [,source]of assets)execFileSync(process.execPath,['--check','--input-type=module'],{input:source,stdio:['pipe','pipe','pipe']});
const next={...proof,name:gameName,patchedSha256:hash(game.source),bridge:transportName,bridgeSha256:hash(transport),portal:{...proof.portal,name:portalName,patchedSha256:hash(portal)},r43:{baseline:{gameName:proof.name,gameSHA256:hash(oldGame),portalName:proof.portal.name,portalSHA256:hash(oldPortal),proofSHA256:hash(proofText),namespace:namespace(proof)},sources,assets:assets.map(([name,text])=>({name,sha256:hash(text)})),game:game.proof,transport:{sourceName:proof.bridge,name:transportName,sourceSha256:hash(oldTransport),patchedSha256:hash(transport),edits:transportEdits},portal:{sourceSha256:hash(oldPortal),patchedSha256:hash(portal),edits:portalEdits}}};
// Rebuilding this candidate removes only its previously declared new assets.
const prior=JSON.parse(read(home,'generated/native-client-proof.json'));for(const row of prior.r43?.assets??[]){const file=path.join(home,'generated/client',row.name);if(fs.existsSync(path.join(baseline,'generated/client',row.name)))throw Error('r43_old_asset_removal');if(fs.existsSync(file)){if(hash(fs.readFileSync(file))!==row.sha256)throw Error('r43_changed_candidate_asset');fs.unlinkSync(file);}}
for(const [name,text]of assets){const file=path.join(home,'generated/client',name);if(fs.existsSync(file)&&read(home,'generated/client/'+name)!==text)throw Error('r43_immutable_collision');fs.writeFileSync(file,text);}
fs.writeFileSync(path.join(home,'generated/native-client-proof.json'),JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify({namespace:namespace(next),assets:next.r43.assets},null,2));
