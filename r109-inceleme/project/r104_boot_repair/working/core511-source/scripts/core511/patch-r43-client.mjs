import {createHash} from 'node:crypto';
import {reverseR40Edits} from './patch-r40-client.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchR43Client(input,helper){
 let source=input;const edits=[];
 const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('r43_client_anchor:'+from.slice(0,100));source=source.replace(from,to);edits.push({from,to,count:1});};
 const prefix=`import {loadR43Options,choosePvpTargetR43,pvpEligibleR43,remoteCastPhaseR43,towerMarketEntriesR43,towerMarketIconR43} from './${helper}';\n`;
 source=prefix+source;edits.push({position:'prepend',from:'',to:prefix});
 const argumentsFor=(world,point,range)=>`world:${world},ownId:g2.current,point:${point},range:${range},selectedId:Hc2.current,monsterId:_r2.current,now:xp2(),friendly:colPartyFriendly502,safe:it,isOpen:colOpenPvp483,monsterValid:monster=>hv(${world}.area,${world}.channel,monster)&&!Op2(monster)`;
 replace('  let Cm2 = (0, R.useCallback)(() => {\n    let e4 = F2.current;',`  let Cm2 = (0, R.useCallback)(() => {\n    let e4 = F2.current;\n    if(e4&&!W2.current?.run){const targetR43=choosePvpTargetR43({${argumentsFor('e4','b2.current','nu(G2,0)')}});if(targetR43){Hc2.current=targetR43;return true;}}`);
 replace('      }, _2 = b2.current, y2 = nu(G2, e4);',`      }, _2 = b2.current, y2 = nu(G2, e4);\n      if(e4!==0&&!t3){const targetR43=choosePvpTargetR43({${argumentsFor('d2','_2','y2')}});if(targetR43)Hc2.current=targetR43;}`);
 replace('r4 = d2.players.filter((e5) => !colPartyFriendly502(d2, e5.id)', 'r4 = d2.players.filter((e5) => pvpEligibleR43(d2,e5,g2.current,_2,xp2(),colPartyFriendly502,it,colOpenPvp483) && !colPartyFriendly502(d2, e5.id)');
 replace('hh(im2.current.get(r6.id), a3, eu[h2?.ability ?? 0])','remoteCastPhaseR43(h2, hh(im2.current.get(r6.id), a3, eu[h2?.ability ?? 0]), a3)');
 replace('...Object.keys(Qf).map((e4) => ({ id: `part:${e4}`','...towerMarketEntriesR43(U2,R), ...Object.keys(Qf).map((e4) => ({ id: `part:${e4}`');
 const icon='e4.kind === `dungeon_material` ? (0, z.jsx)(`img`, { src: `/dungeon/${$f(`item_id` in e4 ? e4.item_id : null)?.image ?? `infinite`}.webp`, alt: ``, style: { width: `100%`, height: `100%`, objectFit: `contain` } })';
 replace(icon,icon.replace('? (0, z.jsx)', '? (towerMarketIconR43(R,e4.item_id) ?? (0, z.jsx)')+')');
 const suffix='\nvoid loadR43Options();\n';source+=suffix;edits.push({position:'append',from:'',to:suffix});
 if(reverseR40Edits(source,edits)!==input)throw Error('r43_game_inverse');
 return {source,proof:{sourceSha256:hash(input),patchedSha256:hash(source),edits}};
}
