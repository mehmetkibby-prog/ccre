// Public pages only; no login or account modification. Local HAR should be kept private.
import fs from 'node:fs';
import {chromium} from 'playwright';
const origins=process.argv.slice(2);if(!origins.length)origins.push('https://2d.coreoflife.net','https://coreoflife.net');
const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(proxy?{proxy:{server:proxy}}:{})});
const results=[];
try{
 for(const origin of origins){
  const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage(),row={origin,scope:'Fresh browser public homepage only; not existing users or authenticated flows.',requests:[],errors:[]};
  page.on('request',r=>{const u=new URL(r.url());row.requests.push({host:u.hostname,path:u.pathname,type:r.resourceType()});});page.on('pageerror',e=>row.errors.push(e.message));
  try{const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:25000});row.status=response?.status();await page.waitForTimeout(2000);row.serviceWorkers=await page.evaluate(async()=>('serviceWorker' in navigator)?(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.scriptURL})):[]);row.title=await page.title();}catch(e){row.error=e.message;}
  results.push(row);await context.close();
 }
}finally{await browser.close();}
console.log(JSON.stringify(results,null,2));
