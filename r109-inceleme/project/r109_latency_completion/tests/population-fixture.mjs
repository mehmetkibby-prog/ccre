// Synthetic, isolated fixture. No production DB or access/capacity bypass.
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {seedSharedBoss} from './population-shared-boss.mjs';
import {seedPopulationEquipment} from './population-equipment.mjs';
const tree=process.env.STUTTER_TREE,core=tree+'/core511-source/scripts/core511';
const {put}=await import(core+'/tests/pvp-fixture.mjs');
const {temporary,BASE}=await import(core+'/tests/helpers.mjs');
const {NativeGameServices}=await import(core+'/game-services.mjs');
const {createAdventureSchema}=await import(core+'/adventure-schema.mjs');
const zones=['forest','tower','solo','mist','black','rune_v2'];
export async function seedPopulation(host,actors,mode){
 const q=host.database.sqlite;createAdventureSchema(q);
 const sharedBoss=mode==='shared_boss'||mode==='shared_boss_terminal';
 q.exec('DELETE FROM party_members;DELETE FROM parties');
 const template=q.prepare("SELECT * FROM monsters WHERE area='forest' AND channel>0 LIMIT 1").get();
 if(!template)throw Error('population_monster_template_missing');
 const parties=new Set();
 for(const a of actors){
  a.zone=mode==='mixed'?zones[a.index%zones.length]:sharedBoss?'forest':mode;
  const area=['tower','solo'].includes(a.zone)?'bazaar':a.zone==='mist'?'forest':a.zone;
  const point=a.zone==='tower'?{x:2070,y:430}:a.zone==='solo'?{x:1910,y:660}:{x:1000,y:1000};
  q.prepare('UPDATE players SET area=?,x=?,y=?,gems=100000,essence=100000,potions=100,stat_hp=1000000,hp=1001000,max_hp=1001000 WHERE id=?').run(area,point.x,point.y,a.id);
  if(a.zone==='tower'&&process.env.INDEPENDENT_TOWERS!=='1'){
   const party='population-tower-'+a.channel;
   if(!parties.has(party)){put(q,'parties',{id:party,leader_id:a.id,created_at:Math.floor(Date.now()/1000)});parties.add(party);}
   put(q,'party_members',{party_id:party,player_id:a.id,joined_at:Math.floor(Date.now()/1000)});
  }
  if(a.zone==='solo')q.prepare("INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,'solo_key',1) ON CONFLICT(player_id,kind) DO UPDATE SET amount=1").run(a.id);
 }
 // Match a growing world with out-of-view monsters; do not pretend this is a live DB copy.
 const background=Number(process.env.BACKGROUND_MONSTERS||0);
 for(let i=0;i<background;i++)put(q,'monsters',{...template,id:'curuk-pop-bg-'+i,channel:i%4+1,area:'ancient',x:2000+(i%25)*25,y:1000+Math.floor(i/25)%25*25,hp:template.max_hp,respawn_at:0});
 for(const area of ['forest','black','rune_v2'])for(let channel=1;channel<=4;channel++)for(let i=0;i<12;i++){
  // Rune profiles and respawn rules require their actual family IDs.
  const id=area==='rune_v2'?'rune-v2-'+['tide','warden','sentinel'][Math.floor(i/5)]+'-c'+channel+'-'+(i%5+1):area==='black'?['golge','curuk','yutan'][Math.floor(i/4)]+'-black-c'+channel+'-'+(i%4+1):'curuk-pop-'+area+'-'+channel+'-'+i;
  const row={...template,id,area,channel,x:930+(i%4)*55,y:930+Math.floor(i/4)*55,hp:1800,max_hp:1800,respawn_at:0};
  if(q.prepare('SELECT 1 FROM monsters WHERE id=?').get(id))q.prepare('UPDATE monsters SET x=?,y=?,hp=?,max_hp=?,respawn_at=0 WHERE id=?').run(row.x,row.y,row.hp,row.max_hp,id);
  else put(q,'monsters',row);
 }
 const services=new NativeGameServices(q);
 await host.database.atomic(()=>services.run({nowMs:Date.now(),seed:'7'.repeat(64)},()=>{
  const portals=new Map();
  for(const a of actors.filter(a=>a.zone==='mist')){
   const key=a.channel+':'+Math.floor(a.index/24);
   if(!portals.has(key))portals.set(key,services.globals.__colAdventure.portal({channel:a.channel,area:'forest',x:1000,y:1000,at:Date.now()}));
   a.portalId=portals.get(key)?.id;if(!a.portalId)throw Error('population_portal_missing');
  }
 }));
 const equipment=process.env.POPULATION_EQUIPMENT==='1'?await seedPopulationEquipment(q,actors,{tree,bagItems:30,rotateRoles:true}):null;
 const boss=sharedBoss?seedSharedBoss(q,actors,{terminal:mode==='shared_boss_terminal'}):null;
 return {backgroundMonsters:background,monsters:q.prepare('SELECT count(*) n FROM monsters').get().n,zones:Object.fromEntries([...zones,'shared_boss'].map(z=>[z,actors.filter(a=>a.zone===z).length])),independentTowers:process.env.INDEPENDENT_TOWERS==='1',synthetic:true,equipment,boss};
}
export async function nativeRoute(scope){
 const temp=temporary(scope),serverDir=path.join(temp,'dist-vds/server');fs.mkdirSync(serverDir,{recursive:true});
 fs.writeFileSync(path.join(temp,'package.json'),'{"type":"module"}');
 for(const name of ['lib','vds-server','node_modules'])fs.symlinkSync(path.join(tree,'native510-bb3a6cc689c6',name),path.join(temp,name),'dir');
 fs.cpSync(path.join(BASE,'dist-vds/server'),serverDir,{recursive:true});
 fs.writeFileSync(path.join(serverDir,'__vite_rsc_assets_manifest.js'),'export default {serverResources:{},clientReferenceDeps:{}};\n');
 fs.copyFileSync(tree+'/http-runtime/dist-vds/server/index.js',path.join(serverDir,'index.js'));
 return (await import(pathToFileURL(path.join(serverDir,'index.js')))).default;
}
