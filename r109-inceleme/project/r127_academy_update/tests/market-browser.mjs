import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const root=path.resolve(import.meta.dirname,'..');
const file=(await fs.readdir(path.join(root,'assets'))).filter(f=>f.startsWith('game-client-'));
const source=await fs.readFile(path.join(root,'build/market-ui.js'),'utf8');
const game=(await Promise.all(file.map(f=>fs.readFile(path.join(root,'assets',f),'utf8')))).find(t=>t.includes(source.trim()));
assert(game);
const market=game.indexOf('className: `market-offer-grid`');
assert(game.indexOf('StoneArtShopR127,{world:U2',market)>game.indexOf('action: `buy_potion`',market));
const craftParser=game.slice(game.indexOf('var cu ='),game.indexOf('function pu('));
const idGenerator=game.slice(game.indexOf('var Uu ='),game.indexOf(';',game.indexOf('var Uu ='))+1);
const deps=process.env.R127_REACT_DEPS??'/workspace/ccre/r55_gameplay_work/tooling/node_modules';
const testCode=[
 'import * as R from '+JSON.stringify(path.join(deps,'react/index.js'))+';',
 'import {createRoot} from '+JSON.stringify(path.join(deps,'react-dom/client.js'))+';',
 craftParser,idGenerator,'const Cn=()=>null;',source,
 `const root=createRoot(document.getElementById('app'));
 const own={id:'royal-test',hp:40,gems:200};
 const item={id:'gear',item_name:'Kılıç',kind:'weapon',sale_locked499:0,enchantments:JSON.stringify([{kind:'stone_attack',value:24}])};
 const world={inventory:[item],dungeonMaterials:[]};
 window.calls=[];
 async function post(url,input){
  window.calls.push({url,...input});
  if(input.action==='buy_stone_extractor') {own.gems=0;world.dungeonMaterials=[{kind:'stone_extractor',amount:1}];return {message:'Alındı'};}
  if(input.action==='extract_socket_stone'&&input.stoneKind==='attack:24'&&input.itemId==='gear') {world.dungeonMaterials=[];item.enchantments='[]';return {message:'Çantaya döndü'};}
  throw Error('invalid_fixture');
 }
 function refresh(){root.render(R.createElement(StoneArtShopR127,{world,own,refresh,post}));}
 refresh();`].join('\n');
const bundled=await build({stdin:{contents:testCode,resolveDir:root},bundle:true,format:'iife',platform:'browser',write:false,define:{'process.env.NODE_ENV':'"production"'}});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [width,height] of [[1280,800],[393,852]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost/market',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><meta name="viewport" content="width=device-width"><div id="app"></div></html>'}));
  await page.goto('http://localhost/market');await page.addScriptTag({content:bundled.outputFiles[0].text});
  await page.getByRole('button',{name:'200 Mücevhere Al'}).click();
  await page.getByLabel('Çıkarılacak taş').selectOption({label:'Kılıç · Saldırı Gücü +24'});
  await page.getByRole('button',{name:'1 Taş Sanatı Kullan'}).click();
  await page.getByText('Çantaya döndü').waitFor();
  const calls=await page.evaluate(()=>window.calls);assert.deepEqual(calls.map(c=>c.action),['buy_stone_extractor','extract_socket_stone']);assert.notEqual(calls[0].requestId,calls[1].requestId);
  assert.equal(errors.length,0,errors.join('\n'));await page.close();console.log(width+'x'+height+' purchase and exact stone selection passed');
 }
}finally{await browser.close();}
