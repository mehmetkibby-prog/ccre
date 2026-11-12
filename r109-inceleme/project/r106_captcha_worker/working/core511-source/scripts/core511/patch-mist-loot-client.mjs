import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
// Apply to the verified R30 shipped client, preserving the R24–R30 patches.
export function patchMistLootClient(source,bridge){
 if(!/^core511-(?:tower|mist-loot|r31|belt-r31)-[a-f0-9]{16}\.js$/.test(bridge))throw Error('mist_loot_bridge_name');
 let output=source;const edits=[];
 const one=(from,to)=>{const at=output.indexOf(from);if(at<0||output.indexOf(from,at+from.length)>=0)throw Error('mist_loot_client_anchor_changed:'+from.slice(0,100));output=output.slice(0,at)+to+output.slice(at+from.length);edits.push({from,to,count:1});};
 const head=`import {drawMistLoot as drawMistLootR31,mistLootHit as mistLootHitR31,activateMistLoot as activateMistLootR31,cancelMistLoot as cancelMistLootR31,createMistLootUI as createMistLootUIR31} from './${bridge}';\n`;
 output=head+output;edits.push({position:'prepend',from:'',to:head});
 one('drawAdventureScene511(n3, F2.current, xp2(), (x3, y3, r4 = 200) => jv(x3, y3, B2.current.x, B2.current.y, Be3, Ve2, r4));',"drawAdventureScene511(n3, F2.current, xp2(), (x3, y3, r4 = 200) => jv(x3, y3, B2.current.x, B2.current.y, Be3, Ve2, r4));\n      drawMistLootR31(n3, F2.current, xp2(), (x3,y3,r4=140)=>jv(x3,y3,B2.current.x,B2.current.y,Be3,Ve2,r4));");
 one('let a3 = F2.current, o3 = a3?.area?.startsWith(`guild_`) ? S(a3.area) : null;',"let a3 = F2.current, o3 = a3?.area?.startsWith(`guild_`) ? S(a3.area) : null;\n    const mistChestR31=mistLootHitR31(a3,n3,r3);\n    if(mistChestR31){vi2.current=null;pe2.current=null;Sr2.current?.stop();wr2.current?.stop();e4.preventDefault();activateMistLootR31(mistChestR31);return;}");
 one('Ea2 && X2 && R.createElement(tower511.Entry, {',"Ea2 && X2 && R.createElement(mistLootUIR31.Entry,{world:U2,own:X2,post:Q,uiSuspended:Xo2,onChange:()=>{I2.current=true;Ce2.current(true);}}),Ea2 && X2 && R.createElement(tower511.Entry, {");
 one('if (!length511) return point511;','if (!length511) return point511;\n            cancelMistLootR31("movement");');
 one('wm2 = (0, R.useCallback)(async (e4, t3, n3 = false, r3 = false) => {','wm2 = (0, R.useCallback)(async (e4, t3, n3 = false, r3 = false) => {\n    cancelMistLootR31("attack");');
 one('} else if (kind === "event") se2({ data: "" }, value);','} else if (kind === "event") {if(value?.targetId===g2.current&&(value.type==="player_hit"||value.type==="pvp_result"||value.type==="player_state"&&Number(value.hpRevision)>Number(F2.current?.players.find(p=>p.id===g2.current)?.hp_revision??0)))cancelMistLootR31("hit");se2({ data: "" }, value);}');
 one('else if (kind === "status") {\n        hn2.current = Hn2.current = value === "online";','else if (kind === "status") {\n        if(value!=="online")cancelMistLootR31("disconnected");\n        hn2.current = Hn2.current = value === "online";');
 const tail='\nconst mistLootUIR31=createMistLootUIR31(R,{Portal:Ia.createPortal});\n';output+=tail;edits.push({position:'append',from:'',to:tail});
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),bridge,edits,scope:'R31 Sis PvP chest world drawing/hit and 3-second receipt-safe UI. Same native pointer coordinates for mouse/touch; movement, attack, own hit and disconnect interrupt progress. Server owns timing, reward and chest removal.'}};
}
