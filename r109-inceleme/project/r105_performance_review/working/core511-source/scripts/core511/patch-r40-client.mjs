import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function patchR40Client(source,helper){
 if(!/^core511-r40-[a-f0-9]{16}\.js$/.test(helper))throw Error('r40_helper_name');
 let output=source;const edits=[];
 const one=(from,to)=>{const at=output.indexOf(from);if(at<0||output.indexOf(from,at+from.length)>=0)throw Error('r40_client_anchor:'+from.slice(0,120));output=output.slice(0,at)+to+output.slice(at+from.length);edits.push({from,to,count:1});};
 const head=`import {createR40UI,chooseMistTargetR40,ordinaryEnchantR40} from './${helper}';\n`;
 output=head+output;edits.push({position:'prepend',from:'',to:head});
 one('(0, z.jsxs)(`div`, { className: `world-actions`, children:', '(0, z.jsxs)(r40UI.Menu, { className: `world-actions`, children:');
 one('(0, z.jsx)(`h3`, { children: `\\xC7anta` }), (0, z.jsxs)(`div`, { className: `bag-heading-actions`', '(0, z.jsx)(`h3`, { children: `\\xC7anta` }),R.createElement(r40UI.BagCapacity,{inventory:U2?.inventory}), (0, z.jsxs)(`div`, { className: `bag-heading-actions`');
 const countPattern=/filter\(\((\w+)\) => !\1.kind.startsWith\(`evolution_`\)\)\.length/g;
 const counts=[...output.matchAll(countPattern)];if(counts.length!==7)throw Error('r40_enchant_count_anchors');
 const groups=new Map();for(const match of counts)groups.set(match[0],match[1]);
 for(const [from,name] of groups){const to=from.replace(`!${name}.kind.startsWith(\`evolution_\`)`,`!${name}.kind.startsWith(\`evolution_\`) && ordinaryEnchantR40(${name})`),count=output.split(from).length-1;output=output.replaceAll(from,to);edits.push({from,to,count});}
 const initial='    let t3 = b2.current, n3 = nu(G2, 0);';
 one(initial,initial+`\n    const mistTargetR40=chooseMistTargetR40({world:e4,ownId:g2.current,point:t3,range:n3,selectedId:Hc2.current,monsterId:_r2.current,isMist:isMistArea511(e4.area),friendly:colPartyFriendly502,monsterValid:monster=>hv(e4.area,e4.channel,monster)&&!Op2(monster)});\n    if(mistTargetR40){Hc2.current=mistTargetR40;return true;}`);
 const skill='      }, _2 = b2.current, y2 = nu(G2, e4);';
 one(skill,skill+`\n      if(e4!==0&&!t3){const mistTargetR40=chooseMistTargetR40({world:d2,ownId:g2.current,point:_2,range:y2,selectedId:Hc2.current,monsterId:_r2.current,isMist:isMistArea511(d2.area),friendly:colPartyFriendly502,monsterValid:monster=>hv(d2.area,d2.channel,monster)&&!Op2(monster)});if(mistTargetR40)Hc2.current=mistTargetR40;}`);
 const tail='\nconst r40UI=createR40UI(R);\n';output+=tail;edits.push({position:'append',from:'',to:tail});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),helper,edits,scope:'R39 to R40 only: mobile action menu, inventory wrapping/capacity, ordinary enchant display classification and initial Sis target selection. Basic hold latch, transport and movement unchanged.'}};
}
export function reverseR40Edits(source,edits){let output=source;for(const edit of [...edits].reverse()){if(edit.position==='prepend'){if(!output.startsWith(edit.to))throw Error('r40_reverse_head');output=output.slice(edit.to.length);}else if(edit.position==='append'){if(!output.endsWith(edit.to))throw Error('r40_reverse_tail');output=output.slice(0,-edit.to.length);}else{if(output.split(edit.to).length-1!==edit.count)throw Error('r40_reverse_count');output=output.replaceAll(edit.to,edit.from);}}return output;}
