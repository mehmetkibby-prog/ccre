import assert from 'node:assert/strict';
export function patchAdminR118(original,names){
 let text=original;const edits=[];
 const change=(label,from,to,count=1)=>{assert.equal(text.split(from).length-1,count,label);text=text.replaceAll(from,to);edits.push({label,from,to,count});};
 const prefix=`import {createRoyalAdminR118} from './${names.royalAdmin}';\nimport {createChampionsAdminR118} from './${names.championsAdmin}';\n`;
 text=prefix+text;edits.push({label:'new admin module imports',prefix});
 change('new navigation group membership','core511-admin-nav-r102-190e3198a3c8e3b0.js',names.nav);
 change('new authenticated panel factories','const colAdminNavigatorR66=createAdminNavigatorR66(X);', 'const colAdminNavigatorR66=createAdminNavigatorR66(X);\nconst colRoyalAdminR118=createRoyalAdminR118(X);\nconst colChampionsAdminR118=createChampionsAdminR118(X);');
 change('new admin navigation cards','{ id: "kadim_tower", label:', '{id:"royal_r118",label:"Kraliyet Eşyaları",note:"Dönüşüm malzemeleri ve Zümrüt Tozu",icon:"♛"},{id:"champions_r118",label:"Şampiyonlar Diyarı",note:"Canavar, tecrübe, öz ve ganimet",icon:"⚔"},{ id: "kadim_tower", label:');
 change('new panel mounts','n2 === "kadim_tower" && X.createElement', 'n2 === "royal_r118" && X.createElement(colRoyalAdminR118),n2 === "champions_r118" && X.createElement(colChampionsAdminR118),n2 === "kadim_tower" && X.createElement');
 return {text,edits};
}
