import {DatabaseSync} from 'node:sqlite';
import {createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {existsSync} from 'node:fs';

export const siteVisitDay457=(now=Date.now())=>new Date(now+10800000).toISOString().slice(0,10);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const cookieValue=(header,name)=>String(header??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)??'';
const bot=/bot|crawler|spider|headless|lighthouse|pagespeed|facebookexternalhit|slurp|preview|embedly/i;

// This database is unrelated to players, combat, inventory and reward receipts.
// Only accounts writes. Game realms read counts through the signed admin bridge.
export function createSiteVisits457({file,writable=false,now=Date.now}={}){
 let sqlite=null,key=null,insert=null,count=null,prune=null,closed=false,lastPrunedDay='';
 const connect=()=>{
  if(closed)return false;
  if(sqlite)return true;
  if(!writable&&!existsSync(file))return false;
  sqlite=new DatabaseSync(file,{readOnly:!writable});
  try{
   sqlite.exec('PRAGMA busy_timeout=30; PRAGMA cache_size=-256;');
   if(writable){
    sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;
CREATE TABLE IF NOT EXISTS site_visit_settings(id INTEGER PRIMARY KEY CHECK(id=1),cookie_key BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS site_visitors_daily(day TEXT NOT NULL,visitor_id TEXT NOT NULL,PRIMARY KEY(day,visitor_id)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS site_visitor_totals(day TEXT PRIMARY KEY,count INTEGER NOT NULL DEFAULT 0) WITHOUT ROWID;
CREATE TRIGGER IF NOT EXISTS site_visitor_total_insert AFTER INSERT ON site_visitors_daily BEGIN
INSERT INTO site_visitor_totals(day,count) VALUES(NEW.day,1) ON CONFLICT(day) DO UPDATE SET count=count+1;
END;`);
    sqlite.prepare('INSERT OR IGNORE INTO site_visit_settings(id,cookie_key) VALUES(1,?)').run(randomBytes(32));
    key=Buffer.from(sqlite.prepare('SELECT cookie_key FROM site_visit_settings WHERE id=1').get().cookie_key);
    insert=sqlite.prepare('INSERT OR IGNORE INTO site_visitors_daily(day,visitor_id) VALUES(?,?)');
    prune=sqlite.prepare('DELETE FROM site_visitors_daily WHERE (day,visitor_id) IN (SELECT day,visitor_id FROM site_visitors_daily WHERE day<? ORDER BY day,visitor_id LIMIT 128)');
   }
   count=sqlite.prepare('SELECT count FROM site_visitor_totals WHERE day=?');
   return true;
  }catch(error){sqlite.close();sqlite=null;throw error;}
 };
 // Optional analytics failures never prevent launch or game readiness.
 const snapshot=()=>{
  const day=siteVisitDay457(now()),info={day,label:'Bugünkü site ziyaretçisi',timezone:'Europe/Istanbul'};
  try{return connect()?{...info,count:Number(count.get(day)?.count??0),available:true}:{...info,count:null,available:false};}
  catch{return {...info,count:null,available:false};}
 };
 const sign=text=>createHmac('sha256',key).update(text).digest('base64url');
 const readToken=token=>{
  const parts=token.split('.');
  if(parts.length!==3||!uuid.test(parts[0])||!/^\d{4}-\d{2}-\d{2}$/.test(parts[1])||!/^[\w-]{43}$/.test(parts[2]))return null;
  const actual=Buffer.from(parts[2]),expected=Buffer.from(sign(parts[0]+'.'+parts[1]));
  return actual.length===expected.length&&timingSafeEqual(actual,expected)?{id:parts[0],day:parts[1]}:null;
 };
 const record=(cookieHeader,{secure=true,userAgent=''}={})=>{
  if(!writable||bot.test(String(userAgent)))return {recorded:false,ignored:true};
  if(!connect())throw new Error('Site ziyaret sayacı kullanılamıyor.');
  const day=siteVisitDay457(now()),name=secure?'__Host-col-site-visit457':'col-site-visit457-local';
  const token=readToken(cookieValue(cookieHeader,name));
  // A valid server-signed same-day cookie has no SQL writes or reads.
  if(token?.day===day)return {recorded:false,day};
  const id=token?.id??randomUUID();
  sqlite.exec('BEGIN IMMEDIATE');
  try{
   // Bounded incremental ID cleanup, never an unbounded midnight scan.
   prune.run(day);
   if(lastPrunedDay!==day){
    // Totals retain 31 small daily rows.
    sqlite.prepare('DELETE FROM site_visitor_totals WHERE day<?').run(siteVisitDay457(now()-30*86400000));
   }
   const inserted=insert.run(day,id).changes;
   sqlite.exec('COMMIT');lastPrunedDay=day;
   const value=id+'.'+day;
   return {recorded:!!inserted,day,setCookie:name+'='+value+'.'+sign(value)+'; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax'+(secure?'; Secure':'')};
  }catch(error){if(sqlite.isTransaction)sqlite.exec('ROLLBACK');throw error;}
 };
 return {snapshot,record,close(){closed=true;sqlite?.close();sqlite=null;}};
}

export function installSiteVisitRoute457(server,service,{hosts=[],writable=false}={}){
 const handlers=server.listeners('request');server.removeAllListeners('request');
 const allowed=new Set(hosts.map(h=>String(h).toLowerCase()));
 server.on('request',(req,res)=>{
  let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{for(const h of handlers)h.call(server,req,res);return;}
  if(pathname!=='/api/site-visit'){for(const h of handlers)h.call(server,req,res);return;}
  const reply=(status,value={},cookie)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...(cookie?{'set-cookie':cookie}:{})});res.end(JSON.stringify(value));};
  if(req.method!=='POST'){reply(405,{error:'POST gerekli.'});return;}
  const host=String(req.headers['x-forwarded-host']??req.headers.host??'').toLowerCase(),secure=String(req.headers['x-forwarded-proto']??'https')!=='http';
  const expected=(secure?'https://':'http://')+host;
  if(!allowed.has(host)||req.headers.origin!==expected){req.resume();reply(403,{error:'İstek kaynağı doğrulanamadı.'});return;}
  // R1/R2 transitions are intentionally not counted as another site arrival.
  if(!writable){req.resume();reply(200,{ok:true,ignored:true});return;}
  const length=Number(req.headers['content-length']??0);
  if(!Number.isFinite(length)||length<0||length>256){req.resume();reply(413,{error:'İstek çok büyük.'});return;}
  let bytes=0,failed=false;
  req.on('data',chunk=>{bytes+=chunk.length;if(bytes>256&&!failed){failed=true;reply(413,{error:'İstek çok büyük.'});}});
  req.on('end',()=>{
   if(failed||res.destroyed)return;
   try{const result=service.record(req.headers.cookie,{secure,userAgent:req.headers['user-agent']});reply(200,{ok:true,recorded:result.recorded},result.setCookie);}
   catch{reply(503,{error:'Site ziyaret sayacı geçici olarak kullanılamıyor.'});}
  });
 });
}
