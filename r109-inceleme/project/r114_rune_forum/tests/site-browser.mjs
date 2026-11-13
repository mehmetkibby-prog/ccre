import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),website=path.resolve(root,'../../website'),record=JSON.parse(fs.readFileSync(root+'/evidence/package.json'));
const html=execFileSync('python3',['-c',"import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read('site/index.html'))",root+'/'+record.file]);
const missing=[];
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end('{}');return;}
 let file=path.resolve(website,'.'+u.pathname);
 if(file.endsWith('entry-r104-d132b52349cf3539.js'))file=root+'/tests/fixtures/site-entry-before.js';
 if(!fs.existsSync(file)){missing.push(u.pathname);res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream');fs.createReadStream(file).pipe(res);
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const checks=[];
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
 for(const width of [360,390,768,1100,1280,1440]){
  await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const desktop=page.locator('.desktop-nav');
  if(await desktop.isVisible()){
   const nav=await desktop.boundingBox(),brand=await page.locator('.site-header .brand').boundingBox(),actions=await page.locator('.header-actions').boundingBox();assert(nav.x>=brand.x+brand.width);assert(nav.x+nav.width<=actions.x);
   assert(await desktop.getByRole('link',{name:'Forum',exact:true}).isVisible());
  }else{
   await page.locator('.menu-toggle').click();assert(await page.locator('.mobile-nav').getByRole('link',{name:'Forum',exact:true}).isVisible());await page.locator('.menu-toggle').click();
  }
  checks.push({width,overflow:false,forumLink:true});
 }
 assert.equal(await page.locator('a[href="/forum"]').count(),3);
 fs.writeFileSync(root+'/evidence/site-browser.json',JSON.stringify({passed:true,checks,missing:[...new Set(missing)],packageSHA256:record.sha256,live:false},null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks,missing:[...new Set(missing)]}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
