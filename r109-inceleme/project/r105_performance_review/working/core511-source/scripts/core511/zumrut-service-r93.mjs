import {ZUMRUT_AREA_R93,ZUMRUT_NPC_R93,ZUMRUT_BENCH_R93,zumrutNode} from './zumrut-map-r93.mjs';
import {ZUMRUT_CATALOG_R93,ZUMRUT_BY_ID_R93,costSummaryR93,payCostRowsR93,grantCatalogR93,assertZumrutRewardPoolR93} from './zumrut-catalog-r93.mjs';
import {readZumrutConfigR93,validateZumrutConfigR93} from './zumrut-config-r93.mjs';
import {ZUMRUT_ACTIONS_R93} from './zumrut-actions-r93.mjs';
import {ZUMRUT_TOOL_SQL_R93 as TOOL_SQL} from './zumrut-tools-r93.mjs';
export {readZumrutToolR93} from './zumrut-tools-r93.mjs';
export {ZUMRUT_ACTIONS_R93} from './zumrut-actions-r93.mjs';

const MATERIALS=Object.freeze({wood:'zumrut_wood_r93',stone:'zumrut_stone_r93',axe:'zumrut_axe_r93',pickaxe:'zumrut_pickaxe_r93'});
export const ZUMRUT_NODE_RESPAWN_MS_R93=10000;
const reject=(message,gameCode='zumrut_rule',status=409)=>{throw Object.assign(Error(message),{zumrutRule:true,gameCode,status});};
const request=input=>{if(typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(input.requestId))reject('İşlem kimliği geçersiz.','zumrut_request',422);return input.requestId;};
const selected=value=>{
 if(value==null)return {};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>12)reject('Harcama için seçilen eşyalar geçersiz.','zumrut_selection',422);
 const out={};for(const key of Object.keys(value).sort()){const ids=value[key];if(!ZUMRUT_BY_ID_R93.has(key)||!Array.isArray(ids)||ids.length>35||ids.some(id=>typeof id!=='string'||!id||id.length>160)||new Set(ids).size!==ids.length)reject('Harcama için seçilen eşyalar geçersiz.','zumrut_selection',422);out[key]=[...ids].sort();}return out;
};
const BINDING_FIELDS=Object.freeze(['channel','world_cycle','realtime_scope_version','position_revision','motion_stream_id','motion_sequence','x','y']);
function binding(player,identity){
 if(!Number.isSafeInteger(identity?.epoch)||identity.epoch<1)reject('Oyuncu oturumu doğrulanamadı.','zumrut_owner',409);
 if(typeof identity.connectionId!=='string'||!identity.connectionId||identity.connectionId.length>160)reject('Oyun bağlantısı doğrulanamadı.','zumrut_connection',409);
 return {epoch:identity.epoch,connectionId:identity.connectionId,...Object.fromEntries(BINDING_FIELDS.map(key=>[key,player[key]??null]))};
}
const nearby=(p,target)=>Math.hypot(p.x-target.x,p.y-target.y)<=150;

// This is a normal action handler, not a world engine: no tick, timers, process,
// polling, room, scheduler or changes to the player movement implementation.
export class ZumrutServiceR93{
 constructor(sql,{now=Date.now,random=Math.random,uuid,globals={},economy=null}={}){Object.assign(this,{sql,now,random,uuid,globals});this.statements=new Map();this.economy=economy??{costSummaryR93,payCostRowsR93,grantCatalogR93,assertZumrutRewardPoolR93};}
 q(text){let q=this.statements.get(text);if(!q){q=this.sql.prepare(text);this.statements.set(text,q);}return q;}
 config(){const value=this.q('SELECT value FROM zumrut_settings_r93 WHERE id=1').get()?.value;if(value!==this.configValue){this.configValue=value;this.configCache=readZumrutConfigR93(value);}return this.configCache??readZumrutConfigR93(value);}
 mayAccess(player){const config=this.config();return config.enabled&&(config.access==='public'||player?.is_gm===1);}
 requireAccess(player){const config=this.config();if(!config.enabled)reject('Zümrüt Vadisi şu anda kapalı.','zumrut_closed');if(config.access!=='public'&&player.is_gm!==1)reject('Zümrüt Vadisi şu anda yalnızca oyun yöneticisine açık.','zumrut_admin_only',403);}
 adminGet(){const config=structuredClone(this.config());return {config,revision:config.revision,catalog:ZUMRUT_CATALOG_R93};}
 saveConfig(input,revision){
  if(!this.sql.isTransaction)throw Error('zumrut_settings_transaction_required');
  if(!Number.isSafeInteger(revision)||revision<1||revision>=Number.MAX_SAFE_INTEGER||this.config().revision!==revision)reject('Vadi ayarları değişti. Paneli yenileyip tekrar kaydet.','zumrut_settings_conflict');
  let config;try{config=validateZumrutConfigR93({...input,revision:revision+1});}catch(error){if(error.zumrutRule)throw error;reject(error.message,'zumrut_settings_invalid',422);}
  if(this.q('UPDATE zumrut_settings_r93 SET value=?,revision=? WHERE id=1 AND revision=?').run(JSON.stringify(config),config.revision,revision).changes!==1)reject('Vadi ayarları değişti. Paneli yenileyip tekrar kaydet.','zumrut_settings_conflict');
  return {config,revision:config.revision,catalog:ZUMRUT_CATALOG_R93};
 }
 operation(id){return this.q('SELECT * FROM zumrut_operations_r93 WHERE player_id=?').get(id)??null;}
 nodeAvailableAt(channel,nodeId){return this.q('SELECT available_at_ms FROM zumrut_nodes_r93 WHERE channel=? AND node_id=?').get(channel,nodeId)?.available_at_ms??0;}
 nodeDepletions(channel){if(!Number.isSafeInteger(channel)||channel<1||channel>4)return [];return this.q('SELECT node_id,available_at_ms FROM zumrut_nodes_r93 WHERE channel=? AND available_at_ms>? ORDER BY available_at_ms,node_id').all(channel,this.now()).filter(row=>zumrutNode(row.node_id)).map(row=>({nodeId:row.node_id,channel,availableAtMs:row.available_at_ms}));}
 sameNodeGeneration(p,op){if(op.kind==='craft')return true;const available=this.nodeAvailableAt(p.channel,op.node_id);return available===JSON.parse(op.recipe_json).nodeAvailableAtMs&&available<=this.now();}
 busy(id){const op=this.operation(id);if(!op||op.status!=='active'||op.expires_ms<this.now())return false;const p=this.actor(id),prior=JSON.parse(op.binding_json);return p.area===ZUMRUT_AREA_R93&&p.hp>0&&BINDING_FIELDS.every(key=>prior[key]===(p[key]??null))&&this.sameNodeGeneration(p,op);}
 actor(id){const player=this.q('SELECT * FROM players WHERE id=?').get(id);if(!player)reject('Karakter bulunamadı.','zumrut_player',404);return player;}
 amounts(id){return Object.fromEntries(this.q("SELECT kind,amount FROM dungeon_materials WHERE player_id=? AND kind IN ('zumrut_wood_r93','zumrut_stone_r93','zumrut_axe_r93','zumrut_pickaxe_r93')").all(id).map(row=>[row.kind,row.amount]));}
 equipped(id){return this.q(TOOL_SQL).get(id)?.equipped??'';}
 publicState(id,identity,{full=false}={}){
  const p=this.actor(id),amounts=this.amounts(id),op=this.operation(id),time=this.now();
  let active=null;if(op?.status==='active'&&op.expires_ms>=time&&p.area===ZUMRUT_AREA_R93){const prior=JSON.parse(op.binding_json);if(identity&&JSON.stringify(prior)===JSON.stringify(binding(p,identity))&&this.sameNodeGeneration(p,op))active={operationId:op.operation_id,kind:op.kind,nodeId:op.node_id,startedAtMs:op.started_ms,finishAtMs:op.ready_ms,expiresAtMs:op.expires_ms};}
  const value={tools:{axe:(amounts[MATERIALS.axe]??0)>0,pickaxe:(amounts[MATERIALS.pickaxe]??0)>0},equippedTool:this.equipped(id),wood:amounts[MATERIALS.wood]??0,stone:amounts[MATERIALS.stone]??0,active,serverAtMs:time};
  if(full){const config=this.config(),ids=new Set([...Object.values(MATERIALS).map(kind=>'material:'+kind),...config.toolCosts.axe.map(r=>r.itemId),...config.toolCosts.pickaxe.map(r=>r.itemId),...config.recipe.costs.map(r=>r.itemId),...config.recipe.rewards.map(r=>r.itemId)]);Object.assign(value,{config:structuredClone(config),catalog:ZUMRUT_CATALOG_R93.filter(item=>ids.has(item.id)),nodeDepletions:this.nodeDepletions(p.channel),costs:{axe:this.economy.costSummaryR93(this.sql,id,config.toolCosts.axe,{now:time}),pickaxe:this.economy.costSummaryR93(this.sql,id,config.toolCosts.pickaxe,{now:time}),craft:this.economy.costSummaryR93(this.sql,id,config.recipe.costs,{now:time})}});}
  return value;
 }
 ensureReady(p){const time=this.now();if(p.area!==ZUMRUT_AREA_R93||p.hp<=0||p.arena_match_id||p.combat_lock_until_ms>time||p.root_until_ms>time||p.stun_until_ms>time)reject('Zümrüt Vadisi’nde, hayatta ve savaş dışında olmalısın.','zumrut_scope');if(!this.config().enabled)reject('Zümrüt Vadisi şu anda kapalı.','zumrut_closed');if((this.q('SELECT expires_at_ms FROM fishing_sessions WHERE player_id=?').get(p.id)?.expires_at_ms??-1)>=time)reject('Önce balık avını bitir.','zumrut_fishing');}
 checkCosts(id,costs){const rows=this.economy.costSummaryR93(this.sql,id,costs,{now:this.now()});const missing=rows.find(row=>row.missing>0||row.available<row.amount);if(missing)reject(`${missing.name}: yeterli malzemen yok.`,'zumrut_cost');return rows;}
 economyOptions(extra={}){return {now:this.now(),globals:this.globals,uuid:this.uuid,random:this.random,...extra};}
 craftDraw(id,recipe){
  const key=JSON.stringify({costs:recipe.costs,rewards:recipe.rewards}),prior=this.q('SELECT recipe_key,draw_json FROM zumrut_craft_draws_r93 WHERE player_id=?').get(id);
  if(prior?.recipe_key===key)return {key,reward:JSON.parse(prior.draw_json)};
  const draw=this.random();if(!Number.isFinite(draw)||draw<0||draw>=1)throw Error('zumrut_random_range');
  let ticket=draw*10000;const row=recipe.rewards.find(row=>(ticket-=Math.round(row.chance*100))<0)??recipe.rewards.at(-1),reward={itemId:row.itemId,amount:row.amount};
  this.q('INSERT INTO zumrut_craft_draws_r93(player_id,recipe_key,draw_json) VALUES(?,?,?) ON CONFLICT(player_id) DO UPDATE SET recipe_key=excluded.recipe_key,draw_json=excluded.draw_json').run(id,key,JSON.stringify(reward));
  return {key,reward};
 }
 oldReceipt(id,key,digest){const old=this.q('SELECT operation,result_json FROM zumrut_receipts_r93 WHERE player_id=? AND request_id=?').get(id,key);if(!old)return null;if(old.operation!==digest)reject('Bu işlem kimliği farklı bir işlemde kullanılmış.','zumrut_request_conflict');return {...JSON.parse(old.result_json),replayed:true};}
 saveReceipt(id,key,digest,result){this.q('INSERT INTO zumrut_receipts_r93(player_id,request_id,operation,result_json,created_ms) VALUES(?,?,?,?,?)').run(id,key,digest,JSON.stringify(result),this.now());}
 command(id,input,identity){
  if(!this.sql.isTransaction)throw Error('zumrut_requires_writer_transaction');
  if(!input||typeof input!=='object'||Array.isArray(input)||!ZUMRUT_ACTIONS_R93.includes(input.action))reject('Geçersiz vadi işlemi.','zumrut_action',422);
  const p=this.actor(id);binding(p,identity);
  // Matches the existing in-game GM preview privilege. Authority comes only
  // from the owned player row, never from a client-supplied permission flag.
  if(!['zumrut_equip','zumrut_cancel'].includes(input.action))this.requireAccess(p);
  if(input.action==='zumrut_view'){if(p.area!==ZUMRUT_AREA_R93)reject('Önce Zümrüt Vadisi’ne gel.','zumrut_scope');return {ok:true,zumrut:this.publicState(id,identity,{full:true})};}
  const key=request(input);let result;
  if(input.action==='zumrut_equip')result=this.equip(p,input,key);
  else if(input.action==='zumrut_buy')result=this.buy(p,input,key);
  else if(input.action==='zumrut_begin')result=this.begin(p,input,key,identity);
  else if(input.action==='zumrut_finish')result=this.finish(p,input,key,identity);
  else result=this.cancel(p,input,key,identity);
  return {...result,zumrut:this.publicState(id,identity)};
 }
 equip(p,input,key){
  if(!['','axe','pickaxe'].includes(input.tool))reject('Alet seçimi geçersiz.','zumrut_tool',422);
  const time=this.now();
  if(p.hp<=0||p.arena_match_id||p.combat_lock_until_ms>time||p.root_until_ms>time||p.stun_until_ms>time||this.globals.__colDungeon?.locked?.(p.id))reject('Aleti değiştirmek için hayatta ve savaş dışında olmalısın.','zumrut_equip_locked');
  if(this.busy(p.id)||(this.q('SELECT expires_at_ms FROM fishing_sessions WHERE player_id=?').get(p.id)?.expires_at_ms??-1)>=time)reject('Önce yaptığın işi veya balık avını bitir.','zumrut_busy');
  if(input.tool&&!(this.amounts(p.id)[MATERIALS[input.tool]]>0))reject('Bu alet çantanda yok.','zumrut_tool_missing');
  if(input.tool)this.q('UPDATE players SET rod_equipped=0 WHERE id=? AND rod_equipped<>0').run(p.id);
  // Desired-state assignment is intrinsically idempotent and has no cost or
  // reward. No append-only receipt is generated for repeated slot changes.
  this.q('INSERT INTO zumrut_tools_r93(player_id,equipped) VALUES(?,?) ON CONFLICT(player_id) DO UPDATE SET equipped=excluded.equipped').run(p.id,input.tool);
  return {ok:true,equippedTool:input.tool,message:input.tool==='axe'?'Baltayı kuşandın.':input.tool==='pickaxe'?'Kazmayı kuşandın.':'El aletini çıkardın.'};
 }
 buy(p,input,key){
  if(!['axe','pickaxe'].includes(input.tool))reject('Alet seçimi geçersiz.','zumrut_tool',422);
  const selectedItems=selected(input.selectedItems),digest=JSON.stringify(['buy',input.tool,selectedItems]),old=this.oldReceipt(p.id,key,digest);if(old)return old;
  this.ensureReady(p);if(!nearby(p,ZUMRUT_NPC_R93))reject('Alet satın almak için ustanın yanına gel.','zumrut_distance');
  if(this.busy(p.id))reject('Önce yaptığın işi bitir veya iptal et.','zumrut_busy');
  const kind=MATERIALS[input.tool];if((this.amounts(p.id)[kind]??0)>0){const result={ok:true,owned:true,message:'Bu alet zaten çantanda.'};this.saveReceipt(p.id,key,digest,result);return result;}
  const costs=this.config().toolCosts[input.tool];this.checkCosts(p.id,costs);
  this.economy.payCostRowsR93(this.sql,p.id,costs,this.economyOptions({selectedItems}));
  const reward=this.economy.grantCatalogR93(this.sql,p.id,'material:'+kind,1,this.economyOptions());
  const result={ok:true,tool:input.tool,reward,message:input.tool==='axe'?'Oduncu baltası çantana eklendi.':'Madenci kazması çantana eklendi.'};this.saveReceipt(p.id,key,digest,result);return result;
 }
 begin(p,input,key,identity){
  if(!['wood','stone','craft'].includes(input.kind))reject('Üretim veya toplama türü geçersiz.','zumrut_kind',422);
  const selectedItems=selected(input.selectedItems),nodeId=input.kind==='craft'?'bench':input.nodeId;
  if(typeof nodeId!=='string'||nodeId.length>80)reject('Kaynak seçimi geçersiz.','zumrut_node',422);
  const digest=JSON.stringify([input.kind,nodeId,selectedItems]),prior=this.operation(p.id);
  if(prior?.request_id===key){if(prior.input_json!==digest)reject('Bu işlem kimliği farklı bir işlemde kullanılmış.','zumrut_request_conflict');if(prior.status==='done')return {...JSON.parse(prior.result_json),replayed:true};if(prior.status==='cancelled')reject('Bu iş iptal edildi; yeniden başlat.','zumrut_cancelled');if(prior.expires_ms<this.now())reject('İşin süresi doldu; yeniden başlat.','zumrut_expired');this.assertBinding(p,prior,identity);if(!this.sameNodeGeneration(p,prior))reject('Bu kaynak toplandı; yeniden oluştuğunda yeni bir işlem başlat.','zumrut_node_depleted');return {ok:true,started:true,replayed:true};}
  this.ensureReady(p);if(prior?.status==='active'&&prior.expires_ms>=this.now()){const same=JSON.stringify(JSON.parse(prior.binding_json))===JSON.stringify(binding(p,identity));if(same&&this.sameNodeGeneration(p,prior))reject('Önce yaptığın işi bitir veya iptal et.','zumrut_busy');}
  const config=this.config();let recipe={selectedItems};
  if(input.kind==='craft'){
   if(!nearby(p,ZUMRUT_BENCH_R93))reject('Üretim için tezgâhın yanına gel.','zumrut_distance');
   if(!config.recipe.rewards.length)reject('Üretim tezgâhı henüz açılmadı. Yönetici ödülleri belirlemeli.','zumrut_craft_closed');
   this.checkCosts(p.id,config.recipe.costs);this.economy.assertZumrutRewardPoolR93(this.sql,p.id,config.recipe.rewards,{now:this.now()});
   recipe={...structuredClone(config.recipe),selectedItems,revision:config.revision,hiddenDraw:this.craftDraw(p.id,config.recipe)};
  }else{
   const node=zumrutNode(nodeId);if(!node||node.kind!==(input.kind==='wood'?'tree':'rock'))reject('Kaynak bulunamadı.','zumrut_node');
   if(!Number.isSafeInteger(p.channel)||p.channel<1||p.channel>4)reject('Oyun kanalı geçersiz.','zumrut_channel');
   if(!nearby(p,node))reject('Kesmek veya kırmak için kaynağa yaklaş.','zumrut_distance');
   const tool=input.kind==='wood'?'axe':'pickaxe';if(!(this.amounts(p.id)[MATERIALS[tool]]>0))reject(tool==='axe'?'Önce ustadan balta satın al.':'Önce ustadan kazma satın al.','zumrut_tool_missing');
   if(p.rod_equipped||this.equipped(p.id)!==tool)reject(tool==='axe'?'Ağaç kesmek için çantandan baltayı kuşan.':'Taş kırmak için çantandan kazmayı kuşan.','zumrut_tool_not_equipped');
   const available=this.nodeAvailableAt(p.channel,nodeId);if(available>this.now())reject('Bu kaynak toplandı; 10 saniye içinde yeniden oluşacak.','zumrut_node_depleted');recipe.nodeAvailableAtMs=available;
  }
  const time=this.now(),ready=time+(input.kind==='craft'?config.craftMs:config.gatherMs),operationId=this.uuid();
  this.q(`INSERT INTO zumrut_operations_r93(player_id,operation_id,request_id,input_json,kind,node_id,status,started_ms,ready_ms,expires_ms,binding_json,recipe_json,result_json) VALUES(?,?,?,?,?,?,'active',?,?,?,?,?,'{}') ON CONFLICT(player_id) DO UPDATE SET operation_id=excluded.operation_id,request_id=excluded.request_id,input_json=excluded.input_json,kind=excluded.kind,node_id=excluded.node_id,status='active',started_ms=excluded.started_ms,ready_ms=excluded.ready_ms,expires_ms=excluded.expires_ms,binding_json=excluded.binding_json,recipe_json=excluded.recipe_json,result_json='{}'`).run(p.id,operationId,key,digest,input.kind,nodeId,time,ready,ready+30000,JSON.stringify(binding(p,identity)),JSON.stringify(recipe));
  return {ok:true,started:true,message:input.kind==='craft'?'Üretim başladı. Malzemeler işlem tamamlandığında harcanır.':input.kind==='wood'?'Ağaç kesiliyor…':'Taş kırılıyor…'};
 }
 assertBinding(p,op,identity){if(JSON.stringify(JSON.parse(op.binding_json))!==JSON.stringify(binding(p,identity)))reject('Hareket ettiğin veya bağlantın değiştiği için iş durdu. Yeniden başlat.','zumrut_interrupted');}
 finish(p,input,key,identity){
  if(typeof input.operationId!=='string'||input.operationId.length>80)reject('İş kimliği geçersiz.','zumrut_operation',422);
  const digest=JSON.stringify(['finish',input.operationId]),old=this.oldReceipt(p.id,key,digest);if(old)return old;
  const op=this.operation(p.id);if(!op||op.operation_id!==input.operationId)reject('Bu iş artık geçerli değil.','zumrut_operation');
  if(op.status==='done')return {...JSON.parse(op.result_json),replayed:true};
  if(op.status!=='active')reject('Bu iş iptal edildi.','zumrut_cancelled');
  this.ensureReady(p);this.assertBinding(p,op,identity);
  const time=this.now();if(time<op.ready_ms)reject('Animasyon henüz tamamlanmadı.','zumrut_early',425);if(time>op.expires_ms)reject('İşin süresi doldu; yeniden başlat.','zumrut_expired');
  let reward,nodeDepletion;
  if(op.kind==='craft'){
   if(!nearby(p,ZUMRUT_BENCH_R93))reject('Tezgâhtan uzaklaştın.','zumrut_distance');
   const recipe=JSON.parse(op.recipe_json);this.checkCosts(p.id,recipe.costs);this.economy.assertZumrutRewardPoolR93(this.sql,p.id,recipe.rewards,{now:time});
   const pending=this.q('SELECT recipe_key,draw_json FROM zumrut_craft_draws_r93 WHERE player_id=?').get(p.id);
   if(!recipe.hiddenDraw||pending?.recipe_key!==recipe.hiddenDraw.key||pending.draw_json!==JSON.stringify(recipe.hiddenDraw.reward))reject('Üretim seçimi değişti. İşlemi yeniden başlat.','zumrut_draw_changed');
   this.economy.payCostRowsR93(this.sql,p.id,recipe.costs,this.economyOptions({selectedItems:recipe.selectedItems}));
   const selectedReward=recipe.hiddenDraw.reward;
   reward=this.economy.grantCatalogR93(this.sql,p.id,selectedReward.itemId,selectedReward.amount,this.economyOptions());
   this.q('DELETE FROM zumrut_craft_draws_r93 WHERE player_id=? AND recipe_key=?').run(p.id,recipe.hiddenDraw.key);
  }else{
   const node=zumrutNode(op.node_id);if(!node||!nearby(p,node))reject('Kaynaktan uzaklaştın.','zumrut_distance');
   if(!(this.amounts(p.id)[MATERIALS[op.kind==='wood'?'axe':'pickaxe']]>0))reject('Gerekli alet artık çantanda değil.','zumrut_tool_missing');
   if(p.rod_equipped||this.equipped(p.id)!==(op.kind==='wood'?'axe':'pickaxe'))reject('Gerekli alet artık kuşanılı değil.','zumrut_tool_not_equipped');
   const expected=JSON.parse(op.recipe_json).nodeAvailableAtMs,availableAtMs=time+ZUMRUT_NODE_RESPAWN_MS_R93;
   if(!Number.isSafeInteger(expected)||expected<0||expected>time||!Number.isSafeInteger(availableAtMs)||!Number.isSafeInteger(p.channel)||p.channel<1||p.channel>4)reject('Kaynak işlemi artık geçerli değil.','zumrut_node_depleted');
   // The single existing writer serializes this CAS with the inventory grant.
   // Capturing the previous deadline at begin also rejects a losing actor's
   // old animation after the node has already respawned ten seconds later.
   const claimed=expected===0
    ?this.q('INSERT INTO zumrut_nodes_r93(channel,node_id,available_at_ms) VALUES(?,?,?) ON CONFLICT(channel,node_id) DO UPDATE SET available_at_ms=excluded.available_at_ms WHERE zumrut_nodes_r93.available_at_ms=0 RETURNING available_at_ms').get(p.channel,op.node_id,availableAtMs)
    :this.q('UPDATE zumrut_nodes_r93 SET available_at_ms=? WHERE channel=? AND node_id=? AND available_at_ms=? AND available_at_ms<=? RETURNING available_at_ms').get(availableAtMs,p.channel,op.node_id,expected,time);
   if(!claimed)reject('Bu kaynak başka bir oyuncu tarafından toplandı. Yeniden oluştuğunda tekrar başlat.','zumrut_node_depleted');
   nodeDepletion={nodeId:op.node_id,channel:p.channel,availableAtMs};
   reward=this.economy.grantCatalogR93(this.sql,p.id,'material:'+MATERIALS[op.kind],1,this.economyOptions());
  }
  const result={ok:true,completed:true,operationId:op.operation_id,kind:op.kind,reward,...(nodeDepletion?{nodeDepletion}:{}),message:op.kind==='craft'?'Üretim tamamlandı; ödül çantana eklendi.':op.kind==='wood'?'+1 Odun kazandın!':'+1 Taş kazandın!'};
  this.q("UPDATE zumrut_operations_r93 SET status='done',result_json=? WHERE player_id=? AND operation_id=? AND status='active'").run(JSON.stringify(result),p.id,op.operation_id);
  if(op.kind==='craft')this.saveReceipt(p.id,key,digest,result);
  return result;
 }
 cancel(p,input,key,identity){
  const op=this.operation(p.id);if(!op||op.operation_id!==input.operationId)return {ok:true,cancelled:true};
  if(op.status==='done')return {...JSON.parse(op.result_json),replayed:true};
  // A caller can cancel only its own actor's pending operation, including an
  // operation invalidated by movement/reconnect. Cancellation never refunds:
  // gathering and crafting charge nothing until the successful completion.
  this.q("UPDATE zumrut_operations_r93 SET status='cancelled' WHERE player_id=? AND operation_id=? AND status='active'").run(p.id,op.operation_id);
  return {ok:true,cancelled:true,message:'İş iptal edildi; malzeme harcanmadı.'};
 }
}
