import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
// Patch the current R39 tower bridge directly; never rebuild older native UI.
export function patchTowerMaterialIconsR40(source,helper){
 if(!/^core511-r40-[a-f0-9]{16}\.js$/.test(helper))throw Error('r40_tower_icon_helper_name');
 if(source.includes('readTowerOptionsR40')||source.includes('materialIconR40'))throw Error('r40_tower_icon_anchor_changed');
 const edits=[];let output=source;
 const replace=(from,to)=>{const first=output.indexOf(from);if(first<0||output.indexOf(from,first+from.length)>=0)throw Error('r40_tower_icon_anchor_changed');output=output.slice(0,first)+to+output.slice(first+from.length);edits.push({from,to});};
 replace('function drawTowerLoot(ctx, loot) {\n',"function drawTowerLoot(ctx, loot) {\n  if (readTowerOptionsR40().towerMaterialIcons && drawMaterialR40(ctx, loot)) return true;\n");
 replace('function Icon({ kind }) {\n    const i = towerItemIndex(kind);\n    if (i < 0) return null;\n',
  'function Icon({ kind }) {\n    const i = towerItemIndex(kind);\n    if (i < 0) return null;\n    if (readTowerOptionsR40().towerMaterialIcons) return materialIconR40(React, kind, TOWER_ITEMS[i][1]);\n');
 const prefix=`import {readR40Options as readTowerOptionsR40,towerMaterialIconR40 as materialIconR40,drawTowerMaterialIconR40 as drawMaterialR40} from './${helper}';\n`;
 output=prefix+output;
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),prefix,edits,
  scope:'Six tower material icons only: inline SVG inventory/belt/tower views and equivalent cached canvas paths for ground loot. Disabled flag retains original atlas rendering.'}};
}
