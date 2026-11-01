const CONFIRMATION='LONCALARI SIFIRLA';
const ACTOR=/^[\s\S]{1,160}$/;
const REQUEST=/^[a-zA-Z0-9_-]{16,80}$/;
const AFFECTED=`SELECT p.id,p.channel FROM players p WHERE
 EXISTS(SELECT 1 FROM guild_members m WHERE m.player_id=p.id)
 OR p.area GLOB 'guild_hall_*'
 OR EXISTS(SELECT 1 FROM guild_wars w WHERE w.id=p.arena_match_id)
 ORDER BY p.id`;
function fail(message){throw Error(message);}
function validate(input,actor){
 if(input?.confirmation!==CONFIRMATION||typeof input.requestId!=='string'||!REQUEST.test(input.requestId))fail('Tüm loncaları sıfırlamak için onayı doğrula.');
 if(typeof actor!=='string'||!ACTOR.test(actor))fail('Yönetici kimliği geçersiz.');
}

// Only the coordinator constructs this service on its observed FULL connection.
// No schema mutation, background clock, player action or startup reset is added.
export function createAdminGuildReset470(db,{permanent,refreshHp,repairHall,sweepVoice,now=Date.now}={}){
 const receipt=(input,actor)=>{
  const row=db.prepare('SELECT admin_account_id,action,detail_json FROM admin_audit_events WHERE id=?').get('reset-guilds470:'+input.requestId);
  if(!row)return null;
  const detail=JSON.parse(row.detail_json);
  if(row.admin_account_id!==actor||row.action!=='reset_guilds'||detail.confirmation!==CONFIRMATION||detail.result?.requestId!==input.requestId)fail('İşlem kimliği başka bir işlemde kullanılmış.');
  return {...detail.result,replayed:true};
 };
 const effects=result=>({result,ejections:[],players:[],cycle:0});
 return {async run(input,actor){
  validate(input,actor);
  if(typeof permanent!=='function'||typeof refreshHp!=='function'||typeof repairHall!=='function')fail('Güncel kalıcı oyun yazıcısı gerekli.');
  let previous=receipt(input,actor),output;
  if(previous)output=effects(previous);
  else{
   const held=db.prepare(AFFECTED).all();
   if(held.some(p=>!Number.isInteger(p.channel)||p.channel<1||p.channel>3))fail('Lonca oyuncusunun kanalı geçersiz; sıfırlama uygulanmadı.');
   output=await permanent(held.map(p=>p.id),()=>{
    if(db.isTransaction||db.prepare('PRAGMA synchronous').get().synchronous!==2)fail('Lonca sıfırlaması FULL kalıcı yazıcı gerektirir.');
    db.exec('BEGIN IMMEDIATE');
    try{
     previous=receipt(input,actor);
     if(previous){db.exec('COMMIT');return effects(previous);}
     const current=db.prepare(AFFECTED).all();
     if(current.length!==held.length||current.some((p,i)=>p.id!==held[i].id||p.channel!==held[i].channel))fail('Lonca üyeliği veya konumu değişti. Aynı işlemi yeniden dene.');
     const time=now();if(!Number.isSafeInteger(time)||time<0)fail('Sunucu saati geçersiz.');
     const guilds=db.prepare('SELECT id,treasury FROM guilds ORDER BY id').all();
     const castles=db.prepare('SELECT COUNT(*) n FROM guild_castles').get().n;
     const members=db.prepare('SELECT COUNT(*) n FROM guild_members').get().n;
     const closedWars=db.prepare("SELECT COUNT(*) n FROM guild_wars WHERE status IN ('pending','active')").get().n;
     const halls=db.prepare("SELECT id FROM players WHERE area GLOB 'guild_hall_*' ORDER BY id").all();
     // A permanent freeze is NOT a channel transfer. Keep current public slots
     // during this administrative cancellation, then verify that invariant.
     db.prepare(`INSERT INTO guild_war_returns(war_id,player_id,channel)
      SELECT p.arena_match_id,p.id,p.channel FROM players p JOIN guild_wars w ON w.id=p.arena_match_id
      WHERE 1 ON CONFLICT(war_id,player_id) DO UPDATE SET channel=excluded.channel`).run();
     db.prepare(`UPDATE arena_matches SET status='cancelled',winner_team=0,finished_at_ms=?,updated_at_ms=?
      WHERE id IN(SELECT id FROM guild_wars) AND status IN('waiting','countdown','active')`).run(time,time);
     if(db.prepare('SELECT 1 FROM players p JOIN guild_wars w ON w.id=p.arena_match_id LIMIT 1').get())fail('Lonca savaşı dönüşü tamamlanamadı; sıfırlama uygulanmadı.');
     if(db.prepare('SELECT 1 FROM guild_war_locks LIMIT 1').get()||db.prepare("SELECT 1 FROM guild_wars WHERE status='active' LIMIT 1").get())fail('Lonca savaşı kilidi çözülemedi; sıfırlama uygulanmadı.');
     // Ordinary disband triggers archive finances and delete memberships,
     // invitations/banners/wars. Castle FK cascades remove its dependent state.
     // The deliberate forfeited treasury is retained in this operation's audit.
     db.prepare('UPDATE guilds SET treasury=0 WHERE treasury!=0').run();
     db.prepare('DELETE FROM guilds').run();
     const ejections=[];
     for(const p of halls){const event=repairHall(p.id);if(event&&typeof event.then==='function')fail('Senkron salon dönüşü gerekli.');if(event)ejections.push(event);}
     for(const p of held){const value=refreshHp(p.id);if(value&&typeof value.then==='function')fail('Senkron can yenilemesi gerekli.');}
     const readPlayer=db.prepare('SELECT id,channel,area,arena_match_id,hp,max_hp,hp_revision FROM players WHERE id=?');
     const players=held.map(p=>readPlayer.get(p.id));
     if(players.some((p,i)=>!p||p.channel!==held[i].channel))fail('Kanal sahipliği değişecekti; sıfırlama uygulanmadı.');
     if(db.prepare("SELECT 1 FROM players WHERE area GLOB 'guild_hall_*' LIMIT 1").get())fail('Lonca salonu boşaltılamadı; sıfırlama uygulanmadı.');
     const byId=new Map(players.map(p=>[p.id,p]));
     for(const event of ejections){const p=byId.get(event.playerId);event.hp=p.hp;event.maxHp=p.max_hp;event.hpRevision=p.hp_revision;}
     const result={ok:true,requestId:input.requestId,guilds:guilds.length,castles,members,closedWars,replayed:false};
     db.prepare("INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) VALUES(?,?,'reset_guilds','',?,?)")
      .run('reset-guilds470:'+input.requestId,actor,JSON.stringify({confirmation:CONFIRMATION,result,forfeitedTreasuries:guilds.filter(g=>g.treasury!==0)}),time);
     const cycle=db.prepare('SELECT cycle FROM world_state WHERE id=1').get()?.cycle??1;
     db.exec('COMMIT');return {result,ejections,players:players.map(({id,channel,area,arena_match_id})=>({id,channel,area,arena_match_id})),cycle};
    }catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
   });
  }
  // External voice cleanup must never happen before the durable commit. Its
  // existing five-second sweep also retries failures; access checks read SQL.
  let voiceCleanupPending=false;
  try{await sweepVoice?.();}catch{voiceCleanupPending=true;}
  return {...output,result:{...output.result,voiceCleanupPending}};
 }};
}
