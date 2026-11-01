import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
import {patchTowerClient} from './patch-tower-client.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}
export function patchNativeClient(source,bridge,towerBridge){
 if(!/^core511-transport-[a-f0-9]{16}\.js$/.test(bridge))throw Error('client_bridge_name');
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[],fn=name=>ast.body.find(n=>n.id?.name===name),edit=(start,end,replacement)=>edits.push({start,end,original:source.slice(start,end),replacement});
 function one(original,replacement){const at=source.indexOf(original);if(at<0||source.indexOf(original,at+1)>=0)throw Error('native_client_anchor_changed:'+original.slice(0,80));edit(at,at+original.length,replacement);}
 edit(0,0,`import {browserCore as kernel511,browserRequest as kernel511Request} from './${bridge}';\n`);
 one('let r=await globalThis.fetch(e,{...t,headers:n})','let r=await kernel511Request(e,{...t,headers:n})');
 one('entry.channels.length!==3','entry.channels.length!==4');one('const n=result?.channel;if(!Number.isInteger(n)||n<1||n>3)','const n=result?.channel;if(!Number.isInteger(n)||n<1||n>4)');
 // Reconcile the native basic-shot reservation against the server's remaining
 // deadline. Queueing can move the actual reservation later than the speculative
 // projectile. Never overwrite a newer shot, shorten a basic deadline, retry a
 // rejected shot, or add a full cooldown after the ACK has already spent it.
 one('l=t=>{let n=Number(t.cooldownRemainingMs);e>0&&Number.isFinite(n)&&n>=0&&br.current[e]===c&&(br.current[e]=performance.now()+n,Wo([...br.current]))}',`l=t=>{let n=Number(t.cooldownRemainingMs);if(e===0&&!Number.isFinite(n)){const deadline=Number(t.nextAttackAtMs);if(Number.isFinite(deadline))n=Math.max(0,deadline-xp());}if(Number.isFinite(n)&&n>=0&&br.current[e]===c){br.current[e]=e===0?Math.max(c,performance.now()+n):performance.now()+n;e>0&&Wo([...br.current]);}}`);
 const basicRejected='e===0&&t instanceof Q_&&t.payload.code===`basic_attack_cadence`';
 const basicSynced=basicRejected+'&&(l({cooldownRemainingMs:t.payload.retryAfterMs,nextAttackAtMs:t.payload.nextAttackAtMs}),true)';
 one(basicRejected+'||(e>0&&(br.current[e]=0),K(',basicSynced+'||(e>0&&(br.current[e]=0),K(');
 one(basicRejected+'||(I.current=!0,colEarlyR13||K(',basicSynced+'||(I.current=!0,colEarlyR13||K(');
 const picker=fn('Xl'),fallback='Array.from({length:3}',start=source.indexOf(fallback,picker.start);if(start>picker.end||start<0)throw Error('native_channel_picker_changed');edit(start,start+fallback.length,'Array.from({length:4}');
 const game=fn('ev'),dungeon=fn('Tp');if(!game||!dungeon)throw Error('native_client_components_changed');
 // A physical hold owns one target identity until physical release. It may
 // repeat at the unchanged cadence, but can never prepare the next target.
 const basicPress=fn('bu');if(!basicPress)throw Error('native_basic_press_changed');
 edit(basicPress.body.start,basicPress.body.end,`{
  let pointer=null,target=null,scope='',finished=false,attacked=false,firstDeadline=0,pressedAt=0,nextPoll=0,generation=0,buffered=null,firing=false,cadence=null;
  const pending=new Set;
  const finish=()=>{finished=true;buffered=null;};
  const stop=()=>{const id=pointer;pointer=null;target=null;finished=true;buffered=null;nextPoll=0;generation++;if(id!==null)e.released?.(id);};
  const valid=()=>e.allowed()&&!e.blocked()&&(e.scope?.()??'')===scope&&(!e.target||!!target&&e.target()===target);
  const fire=(now,ready,fromBuffer=false)=>{
   // Native V510 backpressure: a second in-flight attack requires an advanced,
   // expired cadence; never more than two attack promises may be outstanding.
   if(firing||pending.size>=2||pending.size&&(cadence===null||ready<cadence||now<cadence))return false;
   const token={},epoch=generation;pending.add(token);attacked=true;firing=true;cadence=null;
   try{const result=e.attack(fromBuffer),next=e.readyAt(),advanced=Number.isFinite(next)&&next>Math.max(now,ready);if(advanced)cadence=next;
    const settle=()=>{pending.delete(token);if(advanced&&pointer!==null&&epoch===generation)nextPoll=0;};
    Promise.resolve(result).then(settle,()=>{settle();if(epoch===generation)finish();});
   }catch{pending.delete(token);if(epoch===generation)finish();}
   finally{firing=false;}
   return true;
  };
  const tick=now=>{
   if(pointer===null){
    const tap=buffered;if(!tap)return;
    if(now>tap.deadline+100||!(e.tapAllowed??e.allowed)()||e.blocked()||(e.scope?.()??'')!==tap.scope||e.target?.()!==tap.target||e.readyAt()>tap.deadline){buffered=null;return;}
    if(now>=tap.deadline&&now>=e.readyAt()&&fire(now,e.readyAt(),true))buffered=null;
    return;
   }
   if(finished)return;
   if(!valid()){finish();return;}
   if(now<nextPoll||firing)return;
   const ready=e.readyAt();
   nextPoll=now<ready?Math.min(now+80,ready):now+80;
   if(now<ready)return;
   fire(now,ready);
  };
  return{pointer:()=>pointer,stop,release(now){
   if(pointer===null)return;
   const tap=e.bufferTaps&&!finished&&!attacked&&target&&firstDeadline>pressedAt&&firstDeadline-pressedAt<=320&&now>=pressedAt&&now-pressedAt<=180&&now<=firstDeadline+100?{target,scope,deadline:firstDeadline}:null;
   stop();buffered=tap;
  },tick,start(id,now){
   if(pointer!==null)return;
   pointer=id;finished=false;attacked=false;target=null;scope=e.scope?.()??'';pressedAt=now;buffered=null;nextPoll=0;generation++;
   if(!e.allowed()||e.blocked()||e.prepare?.()===false){finish();return;}
   target=e.target?.()??null;
   if(e.target&&!target){finish();return;}
   firstDeadline=Math.max(now,e.readyAt());
   tick(now);
  }};
 }`);
 // Keep physical key ownership after a target dies; another held alias cannot rearm it.
 one('released:()=>{r.clear(),n.released()}', 'released:()=>{n.released()}');
 one('Temel saldırı · Basılı tut','Temel saldırı · Aynı hedef için basılı tut; yeni hedef için bırakıp bas');
 one('1 veya Space basılıyken temel saldırı devam eder; bırakınca durur.','1 veya Space basılıyken mevcut hedefe saldırı sürer. Hedef bitince durur; yeni hedef için bırakıp yeniden bas.');
 // Enter only after the user clicks a channel. Legacy balance metadata and
 // stale auto-selection flags cannot choose or override a destination.
 const automatic=fn('colAutoChannel504');if(!automatic)throw Error('native_auto_channel_changed');edit(automatic.body.start,automatic.body.end,'{return null;}');
 let selection,autoEffect;walk(game,n=>{
  if(n.type==='VariableDeclarator'&&n.id.name==='Bp'&&n.init?.type==='CallExpression')selection=n.init.arguments[0];
  if(n.type==='CallExpression'&&source.slice(n.callee.start,n.callee.end).includes('useEffect')&&n.arguments[0]?.body&&source.slice(n.arguments[0].body.start,n.arguments[0].body.end).includes('const next504=colAutoChannel504('))autoEffect=n.arguments[0];
 });
 if(!selection?.body||!autoEffect?.body)throw Error('native_manual_channel_changed');
 edit(autoEffect.body.start,autoEffect.body.end,'{}');
 edit(selection.body.start,selection.body.end,`{
  if(colSelection504!=='manual'||!Number.isInteger(e)||e<1||e>4)return;
  colChannelGuard504.current.manual=true;
  if(Yo.current||colVerificationBlocked501(colVerificationState501,g.current,Ea,colPvpBotSuspended476()))return;
  if(Ua!==null||!za.some(c=>c.id===e&&c.online<colCapacity510(c,Va)))return;
  Ka('');Wa(e);
  try{
   if(r){const result504=await Q('/api/action',{action:'join',channel:e});if(result504.channel!==e)throw Error('Seçtiğin kanal doğrulanamadı. Lütfen kanalını yeniden seç.');K(String(result504.message??('Kanal '+e+"'e katıldın.")));}
   colChannelGuard504.current.choice='manual';Ra(e);I.current=true;_e.current+=1;await J(true);Ip();
  }catch(error){Ka(colChannelError508(error));K(colChannelError508(error));Ip();}
  finally{Wa(null);}
 }`);
 one("channel:La,...(colChannelGuard504.current.choice==='auto'?{channelChoice504:'auto'}:{})",'channel:La');
 one("if(colChannelGuard504.current.choice==='auto')Ra(colResolvedChannel504('auto',e,La));",'');
 const entryPoll=[];walk(game,n=>{if(n.type==='VariableDeclarator'&&n.id.name==='J'&&n.init?.type==='CallExpression'&&n.init.arguments[0]?.body?.type==='BlockStatement')entryPoll.push(n.init.arguments[0]);});
 if(entryPoll.length!==1)throw Error('native_entry_poll_changed');
 edit(entryPoll[0].body.start+1,entryPoll[0].body.start+1,"if(!kernel511(Kt()).entrySelected)return Promise.resolve();");
 const declarations=new Map(),effects=[];walk(game,n=>{if(n.type==='VariableDeclarator'&&['Pp','dm'].includes(n.id.name))declarations.set(n.id.name,n);if(n.type==='CallExpression'&&source.slice(n.callee.start,n.callee.end).includes('useEffect')&&n.arguments[0]?.body&&source.slice(n.arguments[0].start,n.arguments[0].end).includes('new WebSocket(c)'))effects.push(n.arguments[0]);});
 if(effects.length!==1||declarations.size!==2)throw Error('native_client_transport_changed');
 const effect=effects[0],vars=effect.body.body.find(n=>n.type==='VariableDeclaration'),kept=vars.declarations.filter(n=>!['P','le','ue','ee'].includes(n.id.name));
 if(vars.declarations.length-kept.length!==4||!kept.some(n=>n.id.name==='se'))throw Error('native_client_event_handler_changed');
 const prefix=source.slice(effect.body.start+1,vars.start),retained=kept.map(n=>source.slice(n.start,n.end)).join(',');
 edit(effect.body.start,effect.body.end,`{${prefix}let ${retained};const core=kernel511(Kt()),off=core.subscribe((kind,value)=>{if(t)return;if(kind==='world'){Un.current=performance.now();Me.current=Un.current;Xe.current?.(value);}else if(kind==='event')se({data:''},value);else if(kind==='status'){hn.current=Hn.current=value==='online';yn.current=false;no(value==='online'?'socket':'connecting');$a(value);}else if(kind==='error'){if(value.status===401)window.dispatchEvent(new Event(Ut));if(value.code==='game_instance_expired')window.dispatchEvent(new CustomEvent(Yt,{detail:value.error}));if(value.code==='game_maintenance')window.dispatchEvent(new CustomEvent('coreoflife:maintenance',{detail:value}));}});const stop=()=>core.dispose();window.addEventListener('coreoflife:maintenance-exit491',stop);return()=>{t=true;off();window.removeEventListener('coreoflife:maintenance-exit491',stop);};}`);
 const pp=declarations.get('Pp').init.arguments[0];edit(pp.body.start,pp.body.end,"{return e.type==='ping';}");
 let stream;walk(dungeon,n=>{if(n.type==='CallExpression'&&source.slice(n.callee.start,n.callee.end).includes('useEffect')&&n.arguments[0]?.body&&source.slice(n.arguments[0].start,n.arguments[0].end).includes('new WebSocket(i.url)'))stream=n.arguments[0];});if(!stream)throw Error('native_dungeon_stream_changed');
 edit(stream.body.start,stream.body.end,"{T.current=false;return kernel511(Kt()).subscribe((kind,value)=>{if(kind==='dungeon'&&b.current)O(value);});}");
 const rawFetch=[];walk(dungeon,n=>{if(n.type==='CallExpression'&&n.callee.name==='fetch'&&source.slice(n.arguments[0].start,n.arguments[0].end)==='`/api/dungeon`')rawFetch.push(n.callee);});if(rawFetch.length!==1)throw Error('native_dungeon_fetch_changed');edit(rawFetch[0].start,rawFetch[0].end,'kernel511Request');
 let move;walk(game,n=>{if(n.type==='IfStatement'&&source.slice(n.start,n.consequent.start).startsWith('if(!le.run&&v.current&&w.current>0&&!xe&&!ki.current&&xp()>=bt.current.root)'))move=n;});if(!move)throw Error('native_client_movement_changed');
 one('let de=le.run?le.position:b.current',"let previous511=b.current,de=le.run?le.position:(b.current=kernel511(Kt()).position('players',F.current?.players.find(p=>p.id===g.current)??{id:g.current,...b.current},a))");
 edit(move.start,move.end,`${source.slice(move.start,move.consequent.start)}{
  const core=kernel511(Kt()),own=core.world?.players.find(p=>p.id===g.current);
  if(own){
   const keys511=Yo.current?new Set:new Set(fe.current),stick511=Yo.current?{x:0,y:0}:{...Si.current},speed511=tu(G);
   const intent=au(keys511,stick511,de,Yo.current?null:pe.current,speed511,Math.max(.001,s));
   if(intent.manual){pe.current=null;yr.current=wu(F.current,null,_r.current,Hc.current);}else if(intent.arrived)pe.current=null;
   const target511=Yo.current||!pe.current?null:{...pe.current},area511=own.area,bounds511=ve(area511);
   const start511=core.position('players',own,a);
   de=b.current=core.predictFrame({own,seconds:Math.min(s,.25),frameAt:a},(point511,dt)=>{
    const input511=au(keys511,stick511,point511,target511,speed511,dt),length511=Math.hypot(input511.x,input511.y);
    if(!length511)return point511;
    const stride511=speed511*Math.min(1,length511)*dt;
    return Ev(area511,point511,{x:Math.max(55,Math.min(bounds511.width-55,point511.x+input511.x/length511*stride511)),y:Math.max(80,Math.min(bounds511.height-55,point511.y+input511.y/length511*stride511))});
   });
   const dx511=de.x-start511.x,dy511=de.y-start511.y,distance511=Math.hypot(dx511,dy511);
   be=distance511>.01;if(be){if(performance.now()-ri.current>=(eu[ai.current]??eu[0]))oi.current={x:dx511/distance511,y:dy511/distance511};C.current+=distance511;_-=distance511;if(_<=0){_=78;fi.current.push({x:de.x+(Math.random()-.5)*18,y:de.y+12,vx:(Math.random()-.5)*12,vy:-4,life:.35,max:.35,size:4+Math.random()*5,color:'rgba(170,150,120,.55)'});Y('step');}}
  }else core.suspendPrediction();y=be;
 }else{kernel511(Kt()).suspendPrediction();}`);
 one('bp(u,He,!!(s||o),!!s)',"(()=>{const point=kernel511(Kt()).position('players',r,a),distance=Math.hypot(point.x-u.x,point.y-u.y);u.x=point.x;u.y=point.y;u.travel+=distance;return distance;})()");
 let smoother,model;walk(ast,n=>{if(n.type==='VariableDeclarator'&&n.init?.type==='ClassExpression'){if(n.id.name==='Sp')smoother=n.init;if(n.id.name==='tm')model=n.init;}});if(!smoother||!model)throw Error('native_dungeon_model_changed');
 edit(smoother.start,smoother.end,`class{travel=0;epoch=0;constructor(x,y){this.x=x;this.y=y;this.segment={x,y,tx:x,ty:y,elapsed:.05};}accept(x,y,_velocity,_latency,_own,_solo,at){if(this.segment.tx===x&&this.segment.ty===y)return;const jump=Math.hypot(x-this.x,y-this.y)>360;this.segment={x:jump?x:this.x,y:jump?y:this.y,tx:x,ty:y,elapsed:0};if(jump){this.x=x;this.y=y;}}advance(seconds){const p=this.segment,x=this.x,y=this.y;p.elapsed=Math.min(.05,p.elapsed+Math.max(0,seconds));const t=p.elapsed/.05;this.x=p.x+(p.tx-p.x)*t;this.y=p.y+(p.ty-p.y)*t;const distance=Math.hypot(this.x-x,this.y-y);this.travel+=distance;return distance;}}`);
 const strike=model.body.body.find(n=>n.key.name==='prepareStrike');edit(strike.value.body.start,strike.value.body.end,"{if(this.plannedAttack)return;const run=this.run,me=this.me,target=run?.enemies.find(row=>row.id===this.target&&row.hp>0),skill=this.queued??(this.autoAttack?0:null);if(!run||!me||me.hp<=0||run.status!=='active'||skill===null||e<(this.clock.deadlines[skill]??0))return;if(skill===3&&['heal','guard'].includes(this.branch456?.effect)){this.plannedAttack={skill:3,target:''};this.queued=null;this.clock.reserve(3,me.cadences?.[3]??this.branch456.cooldown,this.sequence+1,e);return;}if(target&&Math.hypot(target.x-me.x,target.y-me.y)<=nu(me.role,skill)){this.plannedAttack={skill,target:target.id};this.queued=null;this.clock.reserve(skill,me.cadences?.[skill]??iu()[skill],this.sequence+1,e);}}");
 const sorted=edits.toSorted((a,b)=>a.start-b.start);for(let i=1;i<sorted.length;i++)if(sorted[i].start<sorted[i-1].end)throw Error('native_client_patch_overlap');let output=source;for(const e of sorted.toReversed())output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 const tower=towerBridge?patchTowerClient(output,towerBridge):null;if(tower)output=tower.source;
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),bridge,edits,tower:tower?.proof,scope:'R20 basic-attack ACK and cadence-rejection deadlines reconcile only the matching local reservation; no rejected attack replay and no server cadence changes. R17 mobile/Space/1 hold repeats at existing cadence only for the initial target identity; death/disappearance/scope change latches the hold until release, with no retargeting. Existing same-target short-tap buffer preserved; cancel/blur discards it. Dungeon queued input consumed once per plan and native client cooldown reservation restored without predicting hits. R15 explicit manual channel choice only; automatic recommendation effect removed and no auto flags serialized. R14 entry selection gate; own-character same-frame V510 motion, bounded sequence-tagged prediction and committed-result replay; other-player snapshots buffered 100ms by default, adapting up to 300ms only for sparse checkpoint cadence; native V510 monster chase, return, collision, control presentation and visual targeting restored because monster x/y packets are spawn anchors. Pinned game UI and original command bodies; direct CORE511 transport, four-channel picker, native event renderer, authoritative world/dungeon snapshots; cadence-aware world interpolation, bounded held-input movement and displayed-motion animation. Dungeon interpolation remains unchanged. Legacy SSE/WS fallback removed. Server authority, native speed/collision and request limits unchanged.'}};
}
