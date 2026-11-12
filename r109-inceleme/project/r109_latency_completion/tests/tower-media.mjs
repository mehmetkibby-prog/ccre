// Follow up only the three missing fixture images after the completed combat run.
// Production source assets are verified by SHA; serve the exact installer output.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {chromium} from '/workspace/ccre/r60_mount_work/tooling/node_modules/playwright/index.mjs';
const root=new URL('../',import.meta.url).pathname,evidence=root+'evidence/',assets=evidence+'final-browser-assets';
const report=JSON.parse(fs.readFileSync(evidence+'three-browser-perf-final-r1/report.json'));
const proof=JSON.parse(fs.readFileSync(evidence+'unchanged-tower-media.json'));
const final=fs.readFileSync(evidence+'three-browser-perf-final-r1/final.jsonl','utf8').trim().split('\n').map(JSON.parse);
assert.equal(final.length,3);assert.deepEqual(report.errors,[]);assert.deepEqual(report.nativeFaults,[]);
for(const row of final){assert.deepEqual(row.sockets,[]);assert.deepEqual(row.bot.results,[]);assert.deepEqual(row.bot.floors.map(f=>f.floor),[1,2,3,4,5,6,7,8,9,10]);assert(row.bot.stopped);}
assert.deepEqual(report.missingAssets.map(s=>s.split('/').at(-1)).sort(),['floor-10.webp','floor-4.webp','floor-7.webp']);
for(const url of report.missingAssets){const floor=Number(url.match(/floor-(\d+)/)[1]),row=proof.find(x=>x.floor===floor);assert(row.equal);assert.equal(createHash('sha256').update(fs.readFileSync(assets+url)).digest('hex'),row.liveSha256);}
const urls=new Set(report.missingAssets),server=http.createServer((req,res)=>{if(!urls.has(req.url)){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':'image/webp'});res.end(fs.readFileSync(assets+req.url));});
server.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.REVIEW_CHROMIUM||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage();
 const base='http://127.0.0.1:'+server.address().port,decoded=await page.evaluate(async urls=>Promise.all(urls.map(async src=>{const img=new Image();img.src=src;await img.decode();return {src,width:img.naturalWidth,height:img.naturalHeight};})),[...urls].map(p=>base+p));
 assert(decoded.every(i=>i.width>128&&i.height>128));
 const result={passed:true,combatReport:'three-browser-perf-final-r1/report.json',combatPassed:true,independentBrowsers:3,tenFloorsEach:true,commandErrors:0,spontaneousDisconnects:0,nativeFaults:0,mediaRetest:decoded,scope:'Original full combat run passed all gameplay assertions; only missing unchanged fixture media failed. Those media are now served from exact installer asset_updates and decoded in real Chromium; production source SHA matches.'};
 fs.writeFileSync(evidence+'three-browser-combined-validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,combatBrowsers:3,decoded:decoded.length}));
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
