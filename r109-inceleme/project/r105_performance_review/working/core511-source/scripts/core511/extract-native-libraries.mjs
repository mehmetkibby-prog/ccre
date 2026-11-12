import fs from 'node:fs';
import path from 'node:path';

// Keep native helper bodies in the same deterministic operation closure as
// damage/loot. An imported helper's ambient crypto would otherwise bypass the
// injected seed even when its caller already uses the correct RNG stream.
export function nativeLibraryClosure({root,manifest,out,hash,parse,names}){
 const catalogue={eventKind444:['lib/event-island444.mjs',[]],runeMonsterKey:['lib/runes.mjs',[]],runeV2MonsterKey:['lib/rune-v2.mjs',['RUNE_V2_AREA']],prepareRuneDrops:['lib/rune-drops.mjs',['RUNE_TYPES','RUNE_LOOT_LABELS']]},bodies=[],proof=[],imports=[],selected=new Set();
 for(const name of names){const definition=catalogue[name];if(!definition)continue;const [file,dependencies]=definition,source=fs.readFileSync(path.join(root,file),'utf8');if(manifest.files.find(row=>row.path===file)?.sha256!==hash(source))throw Error('Changed native helper '+file);
  const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.declaration?.id?.name===name)?.declaration;if(!node)throw Error('Missing native helper '+name);
  const original=source.slice(node.start,node.end);let text=original;
  if(name!=='prepareRuneDrops'){
   const tree=parse(text,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
   const walk=n=>{if(!n||typeof n!=='object')return;if(n.type==='Literal'&&n.regex?.pattern.includes('[1-3]')){const old=text.slice(n.start,n.end);edits.push([n.start,n.end,'(fourChannels?'+old.replaceAll('[1-3]','[1-4]')+':'+old+')']);}for(const value of Object.values(n)){if(Array.isArray(value))for(const child of value)walk(child);else if(value?.type)walk(value);}};walk(tree);
   for(const [start,end,next]of edits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,start)+next+text.slice(end);
  }
  selected.add(name);bodies.push(text);proof.push({file,sourceSha256:hash(source),name,nativeSha256:hash(original),generatedSha256:hash(text)});
  for(const dep of dependencies){const depFile=dep==='RUNE_V2_AREA'?'lib/rune-v2.mjs':'lib/runes.mjs';imports.push([dep,path.relative(out,path.join(root,depFile))]);}
 }
 return {selected,imports,bodies,proof};
}
