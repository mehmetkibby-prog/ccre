import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
export function patchAdminAfkClient(source,bridgeName){
 if(typeof bridgeName!=='string'||!/^core511-afk-admin-r32-[a-f0-9]{16}\.js$/.test(bridgeName))throw Error('admin_afk_bridge_name_invalid');
 let output=source;const edits=[];
 const replace=(from,to,count=1)=>{if(output.split(from).length-1!==count)throw Error('admin_afk_client_anchor_changed:'+from.slice(0,70));output=output.split(from).join(to);edits.push({from,to,count});};
 const prefix=`import {createAfkAdmin} from './${bridgeName}';\n`;
 output=prefix+output;edits.push({from:'',to:prefix,count:1,prepend:true});
 replace('var X = e(t(), 1), Z = n();','var X = e(t(), 1), Z = n();\nconst colAfkAdminR32=createAfkAdmin(X);');
 const tab='{ id: `players`, label: `Oyuncular`';
 replace(tab,'{ id: "afk_suspects", label: "ŞÜPHELİLER", note: "Doğrulama ve kasma kayıtları", icon: (0, Z.jsx)(ft, {}) }, '+tab);
 const grid='className: `admin-grid admin-page-${n2}`, children: [';
 replace(grid,grid+'n2 === "afk_suspects" && X.createElement(colAfkAdminR32), ');
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Additive ŞÜPHELİLER admin tab; dedicated existing-admin-only GET/POST API; independent bounded request state; previous tabs unchanged.'}};
}
