// Real compiled client in separate storage/cookie contexts. Only identities,
// seed data and the accounts HTTP boundary are synthetic, as in tower-browser.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('base64url');
export function seedBrowserUsersR113(sql,seed){
 const put=(table,row)=>{const keys=Object.keys(row);sql.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...Object.values(row));};
 const player=sql.prepare('SELECT * FROM players WHERE id=?').get(seed.id),session=sql.prepare('SELECT * FROM auth_sessions WHERE account_id=?').get(seed.account.id);
 return [1,2].map(index=>{
  const account={...seed.account,id:'r113-browser-account-'+index,username:'Browser'+index,username_normalized:'browser'+index,email:'browser'+index+'@fixture.invalid',email_normalized:'browser'+index+'@fixture.invalid'};
  const id='r113-browser-player-'+index,token=randomUUID()+randomUUID(),csrf=randomUUID()+randomUUID(),instance=randomUUID();
  put('accounts',account);put('players',{...player,id,name:'Tarayıcı'+index,account_id:account.id,last_seen:0});
  put('auth_sessions',{...session,account_id:account.id,token_hash:hash(token),csrf_hash:hash(csrf),expires_at:Math.floor(Date.now()/1000)+3600});
  put('player_onboarding',{player_id:id,step:3,potion_hint_seen:1});
  return {index,id,account,token,csrf,instance};
 });
}
export async function openIndependentTowersR113({browser,users,origin,requests,namespace,bridge,errors}){
 const rows=[];
 for(const user of users){
  const context=await browser.newContext({viewport:{width:1000,height:700},serviceWorkers:'block',extraHTTPHeaders:{'x-qa-player':String(user.index)}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push({kind:'extra-browser',player:user.id,message:e.message}));
  await page.addInitScript(id=>sessionStorage.setItem('coreoflife-chrome-warning:'+id,'accepted'),user.account.id);
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);await page.getByRole('button',{name:'Maceraya katıl'}).click({timeout:30000});await page.getByRole('button',{name:/Kanal 1.*Katıl/s}).click({timeout:30000});
  await page.locator('.primary-skill-bar').waitFor({state:'visible',timeout:30000});
  const instance=requests.findLast(r=>r.player===user.index&&r.path==='/api/realtime/core511-character'&&r.status===200)?.instance;assert(instance);
  await page.evaluate(async({namespace,bridge,instance})=>window.__qaReadCore=(await import('/assets/'+namespace+'/'+bridge)).browserCore(instance),{namespace,bridge,instance});
  await page.waitForFunction(()=>window.__qaReadCore?.ready&&window.__qaReadCore.world?.players?.length);
  const entered=await page.evaluate(()=>window.__qaReadCore.command({action:'adventure_tower_enter',requestId:crypto.randomUUID()}));assert.equal(entered.status,200,JSON.stringify(entered));
  await page.waitForFunction(()=>window.__qaReadCore.world?.adventure511?.run?.floor===1);
  rows.push({...user,page,context});
 }
 return rows;
}
export async function advanceIndependentTowersR113(s,rows,out){
 // Deliberately complete each other tower while the first browser's messages
 // are dropped. Its pending response must not hold these unrelated runs.
 for(const row of rows){
  const p=s.f.sql.prepare('SELECT area FROM players WHERE id=?').get(row.id),enemy=s.f.sql.prepare('SELECT * FROM monsters WHERE area=? AND hp>0').get(p.area);assert(enemy);
  await s.core.permanentPlayers([row.id],()=>s.f.sql.prepare('UPDATE players SET x=?,y=?,attack_one_at=0 WHERE id=?').run(enemy.x,enemy.y,row.id));
  const result=await row.page.evaluate(enemy=>window.__qaReadCore.command({action:'attack',targetId:enemy.id,spawnRound:enemy.spawn_round,ability:0,intentId:crypto.randomUUID(),requestId:crypto.randomUUID()}),enemy);
  assert.equal(result.status,200,JSON.stringify(result));await row.page.waitForFunction(()=>window.__qaReadCore.world?.adventure511?.run?.floor===2);
  assert.match(s.f.sql.prepare('SELECT area FROM players WHERE id=?').get(row.id).area,/_02$/);
 }
}
