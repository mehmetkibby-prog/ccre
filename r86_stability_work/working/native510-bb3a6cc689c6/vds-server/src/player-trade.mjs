import {isCoupon483,verifyCoupon483,couponActor483,couponCapacity483} from './cp-coupons483.mjs';
import {randomUUID} from 'node:crypto';
export const TRADE_COUNTERS=Object.freeze({pearls:'İnci',red_pearls:'Kırmızı İnci',potions:'Kırmızı İksir',stone_dust:'Taş Tozu',fish_sokan:'Sokan Balığı',fish_levrek:'Levrek',fish_zargana:'Zargana'});
export const TRADE_STONES=Object.freeze({crystal_chest:'Kristal Sandığı',book:'Taş Sanatı Kitabı',evolution_scroll:'Evrim Parşömeni',attack:'Saldırı Taşı',defense:'Savunma Taşı',critical:'Kritik Taşı',block:'Blok Taşı'});
const empty=()=>({gems:0,items:[],materials:[]});
const amount=(n,max=1000000000)=>{if(!Number.isSafeInteger(n)||n<0||n>max)throw new Error('Geçersiz miktar.');return n;};
const itemView=i=>({id:i.id,item_name:i.item_name,kind:i.kind,rarity:i.rarity,power:i.power,role:i.role,enchantments:i.enchantments,expires_at_ms:i.expires_at_ms??0,premium_origin:i.premium_origin??0});
export function ensureTradeSchema(db){db.exec(`
 CREATE TABLE IF NOT EXISTS player_trades(id TEXT PRIMARY KEY,a TEXT NOT NULL,b TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'invited',revision INTEGER NOT NULL DEFAULT 0,a_offer TEXT NOT NULL,b_offer TEXT NOT NULL,a_ready INTEGER NOT NULL DEFAULT 0,b_ready INTEGER NOT NULL DEFAULT 0,a_confirm INTEGER NOT NULL DEFAULT 0,b_confirm INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,completed_at INTEGER);
 CREATE TABLE IF NOT EXISTS player_trade_locks(player_id TEXT PRIMARY KEY,trade_id TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_trade_expiry ON player_trades(status,expires_at);
 CREATE TABLE IF NOT EXISTS player_trade_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,body TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(player_id,request_id));
 `);}
export class PlayerTrade{
 constructor(db,clock=Date.now){this.db=db;this.clock=clock;}
 expire(){
  const d=this.db,now=this.clock();
  // Every joined player polls for invitations. Reuse plans, not results: idle
  // polls must not acquire SQLite's write lock or scan closed trade history.
  this.expiryDue??=d.prepare("SELECT 1 FROM player_trades WHERE status IN ('invited','open') AND expires_at<=? LIMIT 1");
  if(this.expiryDue.get(now)){
   this.expireTrades??=d.prepare("UPDATE player_trades SET status='expired' WHERE status IN ('invited','open') AND expires_at<=?");
   this.expireTrades.run(now);
  }
  const closedTrade="EXISTS(SELECT 1 FROM player_trades t WHERE t.id=player_trade_locks.trade_id AND t.status NOT IN ('invited','open'))";
  this.closedLock??=d.prepare('SELECT 1 FROM player_trade_locks WHERE '+closedTrade+' LIMIT 1');
  if(this.closedLock.get()){
   this.releaseClosedLocks??=d.prepare('DELETE FROM player_trade_locks WHERE '+closedTrade);
   this.releaseClosedLocks.run();
  }
 }
 player(id){return this.db.prepare('SELECT * FROM players WHERE id=?').get(id);}
 pair(t){const a=this.player(t.a),b=this.player(t.b),now=this.clock();
  if(!a||!b||a.account_id===b.account_id||a.hp<=0||b.hp<=0||a.last_seen<now/1000-30||b.last_seen<now/1000-30||a.area!==b.area||a.channel!==b.channel||a.arena_match_id||b.arena_match_id||!['bazaar','forest','fishing','frozen','sanctum','sinsi'].includes(a.area)||Math.hypot(a.x-b.x,a.y-b.y)>420||a.combat_lock_until_ms>now||b.combat_lock_until_ms>now)throw new Error('Ticaret için aynı kanalda yan yana ve savaş dışında olmalısınız.');
  const active=this.db.prepare(`SELECT COUNT(*) n FROM players p JOIN accounts a ON a.id=p.account_id JOIN game_presence g ON g.account_id=a.id JOIN auth_sessions s ON s.token_hash=g.token_hash AND s.account_id=a.id WHERE p.id IN (?,?) AND g.expires_at_ms>? AND s.expires_at>? AND s.security_version=a.security_version AND a.permanently_banned=0 AND COALESCE(a.suspended_until_ms,0)<=?`).get(t.a,t.b,now,now/1000,now);
  if(active.n!==2)throw new Error('Her iki oyuncunun da oturumu açık olmalı.');
  if(this.db.prepare('SELECT 1 FROM dungeon_members WHERE player_id IN (?,?) LIMIT 1').get(a.id,b.id))throw new Error('Zindanda ticaret yapılamaz.');
  if(this.db.prepare('SELECT 1 FROM pve_engagements WHERE player_id IN (?,?) LIMIT 1').get(a.id,b.id))throw new Error('Savaş sırasında ticaret yapılamaz.');
  return [a,b];
 }
 inventory(id){const p=this.player(id);if(!p)throw new Error('Oyuncu yok.');return {gems:p.gems,items:this.db.prepare("SELECT * FROM player_items WHERE player_id=? AND equipped=0 AND sale_locked499=0 AND kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet','cp_coupon_100','cp_coupon_200','cp_coupon_500') ORDER BY created_at DESC LIMIT 500").all(id).filter(i=>!i.expires_at_ms||i.expires_at_ms>this.clock()).map(itemView),materials:[...Object.entries(TRADE_COUNTERS).map(([key,label])=>({key,label,amount:Number(p[key]??0)})),...Object.entries(TRADE_STONES).map(([key,label])=>({key:'stone:'+key,label,amount:Number(this.db.prepare('SELECT amount FROM player_stones WHERE player_id=? AND kind=?').get(id,key)?.amount??0)}))].filter(m=>m.amount>0)};}
 view(t,id){return {...t,a_offer:JSON.parse(t.a_offer),b_offer:JSON.parse(t.b_offer),a_name:this.player(t.a)?.name??'Oyuncu',b_name:this.player(t.b)?.name??'Oyuncu',side:t.a===id?'a':'b',serverTime:this.clock()};}
 snapshot(id,tradeId){this.expire();const t=tradeId?this.db.prepare('SELECT * FROM player_trades WHERE id=? AND (a=? OR b=?)').get(tradeId,id,id):this.db.prepare('SELECT t.* FROM player_trades t JOIN player_trade_locks l ON l.trade_id=t.id WHERE l.player_id=?').get(id);return {trade:t?this.view(t,id):null,...(t?.status==='open'?{inventory:this.inventory(id)}:{})};}
 normalize(id,input){if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Teklif geçersiz.');const gems=amount(input.gems),ids=input.items,materials=input.materials;
  if(!Array.isArray(ids)||ids.length>12||ids.some(i=>typeof i!=='string')||new Set(ids).size!==ids.length||!Array.isArray(materials)||materials.length>16)throw new Error('Teklif en fazla 12 ekipman ve 16 malzeme içerebilir.');
  const stock=this.inventory(id);if(gems>stock.gems)throw new Error('Mücevherin yetersiz.');
  const items=ids.map(key=>{const i=stock.items.find(i=>i.id===key);if(!i)throw new Error('Eşya artık çantanda değil, kilitli veya kuşanılmış.');if(isCoupon483(i.kind)){couponActor483(this.db,this.player(id));verifyCoupon483(this.db,this.db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?').get(i.id,id));}return i;});
  const seen=new Set();const mats=materials.map(m=>{const n=amount(m.amount);if(!n||seen.has(m.key))throw new Error('Malzeme miktarı geçersiz.');seen.add(m.key);const own=stock.materials.find(s=>s.key===m.key);if(!own||own.amount<n)throw new Error('Malzemen yetersiz.');return {key:m.key,label:own.label,amount:n};}).sort((a,b)=>a.key.localeCompare(b.key));
  return {gems,items:items.sort((a,b)=>a.id.localeCompare(b.id)),materials:mats};
 }
 validate(id,offer){const live=this.normalize(id,{gems:offer.gems,items:offer.items.map(i=>i.id),materials:offer.materials});if(JSON.stringify(live)!==JSON.stringify(offer))throw new Error('Eşyanın özellikleri değişmiş. Teklifini yeniden kaydet.');}
 transfer(from,to,offer){const d=this.db;let n=d.prepare('UPDATE players SET gems=gems-? WHERE id=? AND gems>=?').run(offer.gems,from,offer.gems);if(n.changes!==1)throw new Error('Bakiye değişti.');d.prepare('UPDATE players SET gems=gems+? WHERE id=?').run(offer.gems,to);
  for(const i of offer.items){if(d.prepare('UPDATE player_items SET player_id=? WHERE id=? AND player_id=? AND equipped=0 AND sale_locked499=0').run(to,i.id,from).changes!==1)throw new Error('Eşya değişti.');}
  for(const m of offer.materials){if(m.key.startsWith('stone:')){const kind=m.key.slice(6);if(!Object.hasOwn(TRADE_STONES,kind))throw new Error('Malzeme geçersiz.');if(d.prepare('UPDATE player_stones SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=?').run(m.amount,from,kind,m.amount).changes!==1)throw new Error('Malzeme değişti.');d.prepare('INSERT INTO player_stones(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount').run(to,kind,m.amount);}
   else{if(!Object.hasOwn(TRADE_COUNTERS,m.key))throw new Error('Malzeme geçersiz.');if(d.prepare(`UPDATE players SET ${m.key}=${m.key}-? WHERE id=? AND ${m.key}>=?`).run(m.amount,from,m.amount).changes!==1)throw new Error('Malzeme değişti.');d.prepare(`UPDATE players SET ${m.key}=${m.key}+? WHERE id=?`).run(m.amount,to);}}
 }
 act(id,input){const d=this.db,now=this.clock(),key=input.requestId;
  if(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(key))throw new Error('İşlem kimliği geçersiz.');
  const body=JSON.stringify(input);d.exec('BEGIN IMMEDIATE');try{
   const receipt=d.prepare('SELECT body,result FROM player_trade_receipts WHERE player_id=? AND request_id=?').get(id,key);
   if(receipt){if(receipt.body!==body)throw new Error('İşlem kimliği yeniden kullanılamaz.');d.exec('COMMIT');return JSON.parse(receipt.result);}
   this.expire();let t;
   if(input.action==='invite'){
    if(typeof input.target!=='string'||input.target===id)throw new Error('Oyuncu seç.');t={id:randomUUID(),a:id,b:input.target};this.pair(t);
    if(d.prepare('SELECT 1 FROM player_trade_locks WHERE player_id IN (?,?)').get(t.a,t.b))throw new Error('Oyunculardan birinin devam eden ticareti var.');
    d.prepare('INSERT INTO player_trades(id,a,b,a_offer,b_offer,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(t.id,t.a,t.b,JSON.stringify(empty()),JSON.stringify(empty()),now,now+120000);
    d.prepare('INSERT INTO player_trade_locks VALUES(?,?),(?,?)').run(t.a,t.id,t.b,t.id);
   }else{
    t=d.prepare('SELECT * FROM player_trades WHERE id=? AND (a=? OR b=?)').get(String(input.id),id,id);
    if(!t)throw new Error('Ticaret bulunamadı.');
    if(!['invited','open'].includes(t.status))throw new Error('Ticaret kapanmış.');
    const side=t.a===id?'a':'b';
    if(input.action==='cancel'){d.prepare("UPDATE player_trades SET status='cancelled' WHERE id=?").run(t.id);}
    else{
     this.pair(t);
     if(input.revision!==t.revision)throw new Error('Teklif değişti. Güncel teklifi kontrol et.');
     if(input.action==='accept'){
      if(side!=='b'||t.status!=='invited')throw new Error('Davet kabul edilemez.');d.prepare("UPDATE player_trades SET status='open',revision=revision+1,expires_at=? WHERE id=?").run(now+300000,t.id);
     }else{
      if(t.status!=='open')throw new Error('Önce davet kabul edilmeli.');
      if(input.action==='offer'){
       const offer=this.normalize(id,input.offer);d.prepare(`UPDATE player_trades SET ${side}_offer=?,revision=revision+1,a_ready=0,b_ready=0,a_confirm=0,b_confirm=0,expires_at=? WHERE id=?`).run(JSON.stringify(offer),now+300000,t.id);
      }else if(input.action==='unlock'){
       d.prepare('UPDATE player_trades SET revision=revision+1,a_ready=0,b_ready=0,a_confirm=0,b_confirm=0 WHERE id=?').run(t.id);
      }else if(['ready','confirm'].includes(input.action)){
       const a=JSON.parse(t.a_offer),b=JSON.parse(t.b_offer);this.validate(t.a,a);this.validate(t.b,b);
       if(input.action==='ready')d.prepare(`UPDATE player_trades SET ${side}_ready=1 WHERE id=?`).run(t.id);
       else{
        if(!t.a_ready||!t.b_ready)throw new Error('İki taraf da önce teklifini kilitlemeli.');
        if(t[side+'_confirm'])throw new Error('Onayın alındı; diğer oyuncu bekleniyor.');
        d.prepare(`UPDATE player_trades SET ${side}_confirm=1 WHERE id=?`).run(t.id);
        if(t[(side==='a'?'b':'a')+'_confirm']){
         // Revalidate and debit both original balances before credits could finance an offer.
         for(const [p,out,inc] of [[this.player(t.a),a,b],[this.player(t.b),b,a]]){
          if(inc.items.some(i=>isCoupon483(i.kind))){couponActor483(d,p);couponCapacity483(d,p.id,inc.items.length,out.items.length);}
          if(!Number.isSafeInteger(p.gems-out.gems+inc.gems)||p.gems-out.gems+inc.gems>9e12)throw new Error('Bakiye sınırı.');
          // Both original inventories are checked before either transfer. No
          // state changes occur between these material checks in this transaction.
          const materials=inc.materials.length?this.inventory(p.id).materials:[];
          for(const m of inc.materials){const stock=materials.find(n=>n.key===m.key)?.amount??0;if(stock+m.amount>1000000000)throw new Error('Malzeme sınırı.');}
         }
         this.transfer(t.a,t.b,a);this.transfer(t.b,t.a,b);
         d.prepare("UPDATE player_trades SET status='completed',completed_at=? WHERE id=?").run(now,t.id);
        }
       }
      }else throw new Error('Geçersiz ticaret işlemi.');
     }
    }
   }
   t=d.prepare('SELECT * FROM player_trades WHERE id=?').get(t.id);if(!['invited','open'].includes(t.status))d.prepare('DELETE FROM player_trade_locks WHERE trade_id=?').run(t.id);
   const result={ok:true,trade:this.view(t,id),recipients:[t.a,t.b],...(t.status==='open'?{inventory:this.inventory(id)}:{})};
   d.prepare('INSERT INTO player_trade_receipts VALUES(?,?,?,?)').run(id,key,body,JSON.stringify(result));d.exec('COMMIT');return result;
  }catch(e){d.exec('ROLLBACK');throw e;}
 }
}
