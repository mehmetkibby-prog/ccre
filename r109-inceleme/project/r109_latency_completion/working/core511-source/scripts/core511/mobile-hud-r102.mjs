// Layout only. No game input, network, inventory or timer changes.
// Observe the few HUD boxes that can change when a party/mount/button appears.
// No frame loop and no world-snapshot polling.
export function attachMobileHudR102(doc=document,win=window){
 const shell=doc.querySelector('.game-shell');if(!shell)return()=>{};
 const media=win.matchMedia('(max-width:900px), (pointer:coarse)');
 const safeProbe=doc.createElement('i');safeProbe.setAttribute('aria-hidden','true');safeProbe.style.cssText='position:absolute;left:0;top:0;width:env(safe-area-inset-left,0px);height:env(safe-area-inset-right,0px);visibility:hidden;pointer-events:none';shell.append(safeProbe);
 const selectors='.world-hud,.hud-counters,.left-hud-rail,.world-actions,.combat-dock,.party-hud,.party-roster,.mount49-controls,.chat-panel';
 const observed=new Set(),properties=new Set();let frame=0,closed=false;
 const set=(name,value)=>{properties.add(name);if(shell.style.getPropertyValue(name)!==value)shell.style.setProperty(name,value);};
 const px=n=>Math.round(n*100)/100+'px';
 const clear=()=>{shell.removeAttribute('data-mobile-hud-r102');for(const name of properties)shell.style.removeProperty(name);properties.clear();};
 const schedule=()=>{if(!closed&&!frame)frame=win.requestAnimationFrame(layout);};
 const resize=new ResizeObserver(schedule);
 function layout(){
  frame=0;if(closed)return;
  if(!media.matches){clear();return;}
  shell.setAttribute('data-mobile-hud-r102','1');
  const elements=[...shell.querySelectorAll(selectors)];
  for(const e of observed)if(!e.isConnected){resize.unobserve(e);observed.delete(e);}
  for(const e of elements)if(!observed.has(e)){observed.add(e);resize.observe(e);}
  const bounds=shell.getBoundingClientRect(),hud=shell.querySelector('.world-hud'),actions=shell.querySelector('.world-actions'),dock=shell.querySelector('.combat-dock');
  if(!dock||!actions)return;
  const insets=safeProbe.getBoundingClientRect(),left=Math.max(8,insets.width),right=Math.max(8,insets.height);
  const top=Math.max(48,(hud?.getBoundingClientRect().bottom??bounds.top+42)-bounds.top+6);
  set('--mh-actions-top',px(top));
  const available=Math.max(240,bounds.width-left-right-8);
  const scale=Math.min(1,available/Math.max(1,dock.offsetWidth));
  set('--mh-dock-scale',String(Math.floor(scale*1000)/1000));
  const db=dock.getBoundingClientRect(),ab=actions.getBoundingClientRect();
  const joystickSize=Math.max(44,Math.min(bounds.width<=780?86:92,db.top-ab.bottom-16));
  set('--mh-joystick-size',px(joystickSize));
  const controls=shell.querySelector('.mobile-view-controls')?.getBoundingClientRect();
  const listWidth=Math.max(140,Math.min(210,(controls?.left??bounds.right-right)-ab.right-20));
  const partyButton=shell.querySelector('.party-hud')?.getBoundingClientRect();
  const listLeft=Math.max(ab.right-bounds.left+10,Math.min((partyButton?.right??bounds.right-right)-bounds.left-listWidth,(controls?.left??bounds.right-right)-bounds.left-listWidth-10));
  set('--mh-list-left',px(listLeft));set('--mh-list-width',px(listWidth));
  set('--mh-list-height',px(Math.max(64,db.top-bounds.top-top-10)));
  set('--mh-control-bottom',px(Math.max(0,bounds.bottom-db.top)+8));
  // A few readable lines between the toolbar and movement control. On very
  // short phones, use the free space beside the joystick instead of covering it.
  const chatStart=ab.bottom-bounds.top+10,joyTop=db.top-bounds.top-8-joystickSize;
  const beside=joyTop-chatStart<116;
  const chatHeight=Math.min(116,Math.max(64,db.top-bounds.top-chatStart-8));
  const joyLeft=shell.querySelector('.mobile-joystick')?.getBoundingClientRect().left??bounds.left+left;
  const chatLeft=beside?joyLeft-bounds.left+joystickSize+12:left;
  // Keep the released layout's left and bottom edges fixed. Grow only upward
  // and rightward; if the toolbar leaves no room above, keep the old height.
  const previousTop=beside?chatStart:chatStart+(joyTop-chatStart-chatHeight)/2;
  const previousBottom=previousTop+chatHeight;
  const chatTop=Math.max(chatStart,previousBottom-148);
  const expandedHeight=Math.max(0,previousBottom-chatTop);
  let chatRight=bounds.width-right;
  const roster=shell.querySelector('.party-roster-body')?.getBoundingClientRect();
  if(roster?.height>0&&chatTop<top+roster.height&&chatTop+expandedHeight>top&&listLeft>chatLeft){
   chatRight=Math.min(chatRight,listLeft-10);
  }
  const expandedWidth=Math.max(0,Math.min(214,Math.max(174,bounds.width*.225)+24,chatRight-chatLeft));
  set('--mh-chat-left',px(chatLeft));
  set('--mh-chat-top',px(chatTop));
  set('--mh-chat-width',px(expandedWidth));
  set('--mh-chat-height',px(expandedHeight));
 }
 const mutations=new MutationObserver(records=>{
  if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.(selectors)||n.querySelector?.(selectors)))))schedule();
 });
 mutations.observe(shell,{childList:true,subtree:true});resize.observe(shell);
 media.addEventListener('change',schedule);win.addEventListener('resize',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);schedule();
 return()=>{closed=true;if(frame)win.cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();safeProbe.remove();media.removeEventListener('change',schedule);win.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);clear();};
}

export const MOBILE_HUD_CSS_R102=`
.mobile-mount-slot-r102{display:none}
@media(max-width:900px),(pointer:coarse){
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102]{--mh-safe-left:max(8px,env(safe-area-inset-left,0px));--mh-safe-right:max(8px,env(safe-area-inset-right,0px));--mh-action-size:40px;--mh-dock-scale:1;--mh-actions-top:54px;--mh-list-left:300px;--mh-list-width:190px;--mh-list-height:180px;--mh-control-bottom:108px}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-hud{left:var(--mh-safe-left)!important;right:var(--mh-safe-right)!important;top:4px!important;width:auto!important;max-width:none!important;min-height:44px!important;height:44px!important;box-sizing:border-box;display:flex!important;align-items:center;gap:8px;padding:4px 8px!important;translate:0 0!important;transform:none!important;scale:1!important;z-index:50}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-hud .brand-mark{display:none!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-hud .health-block{flex:1 1 auto!important;width:auto!important;min-width:60px!important;max-width:none!important;margin:0!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-hud .hud-counters{display:flex!important;flex:0 0 auto;flex-wrap:nowrap;align-items:center;gap:4px!important;min-width:0}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .hud-counters>*{order:4}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .hud-counters>.events-hud{order:0}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mobile-mount-slot-r102{display:flex;order:1;align-items:center}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .hud-counters>.party-hud{order:2;white-space:nowrap;min-width:72px;padding:4px 8px!important;font-size:12px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .hud-counters>.gem-hud{order:5;font-size:12px!important;gap:3px!important;padding:0 3px!important;min-width:0}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .hud-counters>:is(.events-hud,.instagram-hud,.party-hud){box-sizing:border-box;height:34px!important;min-height:34px!important;transform:none!important;scale:1!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .hud-counters>:is(.events-hud,.instagram-hud){width:32px!important;min-width:32px!important;padding:4px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mount49-controls{position:relative!important;inset:auto!important;translate:0 0!important;transform:none!important;scale:1!important;display:flex;max-width:none;z-index:auto}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mount49-toggle{box-sizing:border-box;height:34px;min-height:34px;min-width:58px;padding:4px 7px;gap:4px;font-size:12px;white-space:nowrap}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mount49-toggle svg{width:18px;height:18px}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mount49-toast{position:fixed;top:54px;left:50%;transform:translateX(-50%);width:max-content;max-width:220px;box-sizing:border-box;pointer-events:none}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .left-hud-rail{top:var(--mh-actions-top)!important;left:var(--mh-safe-left)!important;right:auto!important;bottom:auto!important;transform:none!important;scale:1!important;width:max-content!important;max-width:calc(100% - 16px)!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-actions{position:static!important;display:grid!important;grid-template-columns:repeat(6,var(--mh-action-size))!important;gap:4px!important;width:max-content!important;max-width:none!important;scale:1!important;transform:none!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-actions>button,html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-actions>.icon-action{width:var(--mh-action-size)!important;min-width:var(--mh-action-size)!important;height:var(--mh-action-size)!important;min-height:var(--mh-action-size)!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock{position:absolute!important;top:auto!important;bottom:env(safe-area-inset-bottom,0px)!important;left:calc(50% + (env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)) / 2)!important;right:auto!important;translate:0 0!important;transform:translateX(-50%) scale(var(--mh-dock-scale))!important;transform-origin:50% 100%!important;scale:1!important;max-width:none!important;margin:0!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock{align-items:center!important;padding-bottom:6px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .vital-orb{margin:0!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar{padding-bottom:15px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mount49-toggle kbd{display:none}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .party-roster{position:absolute!important;top:var(--mh-actions-top)!important;left:var(--mh-list-left)!important;right:auto!important;bottom:auto!important;width:var(--mh-list-width)!important;max-height:var(--mh-list-height)!important;height:auto!important;overflow:visible!important;translate:0 0!important;transform:none!important;scale:1!important;border:0!important;padding:0!important;background:none!important;box-shadow:none!important;z-index:45}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .party-roster-toggle{display:none!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .party-roster-body{position:static!important;width:100%!important;max-height:var(--mh-list-height)!important;box-sizing:border-box;overflow-y:auto!important;overscroll-behavior:contain;touch-action:pan-y;padding:10px!important;margin:0!important;border:1px solid #9e7a46;border-radius:10px;background:#10251ef5;box-shadow:0 8px 24px #0008;scrollbar-width:thin;scrollbar-color:#9e7a46 #10251e}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mobile-joystick,html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mobile-basic-attack{bottom:var(--mh-control-bottom)!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .mobile-joystick{width:var(--mh-joystick-size,86px)!important;height:var(--mh-joystick-size,86px)!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock{--hud-orb:clamp(44px,5.8vw,54px);--hud-slot:48px;--hud-label:9px;--mh-rank:clamp(48px,7.2vw,74px);--mh-tool:clamp(32px,4.4vw,40px);box-sizing:border-box!important;display:flex!important;flex-wrap:nowrap!important;width:calc(100% - var(--mh-safe-left) - var(--mh-safe-right) - 8px)!important;height:74px!important;min-height:0!important;gap:4px!important;padding:3px 7px!important;align-items:center!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .vital-orb{flex:0 0 var(--hud-orb)!important;width:var(--hud-orb)!important;min-width:var(--hud-orb)!important;height:var(--hud-orb)!important;margin:0!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .vital-orb span{font-size:clamp(12px,1.7vw,16px)!important;top:45%!important;bottom:auto!important;line-height:1!important;transform:translateY(-50%)!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .vital-orb small{font-size:6px!important;letter-spacing:.06em!important;top:65%!important;bottom:auto!important;line-height:1!important;transform:none!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .hero-level{flex:0 0 var(--mh-rank)!important;width:var(--mh-rank)!important;min-width:var(--mh-rank)!important;max-width:var(--mh-rank)!important;max-height:54px!important;gap:2px!important;padding:2px!important;margin:0!important;line-height:1.1!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .hero-level strong{width:26px!important;min-width:26px!important;height:20px!important;font-size:13px!important;line-height:18px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .hero-level>span{font-size:8px!important;letter-spacing:.04em!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .hero-level>b{font-size:11px!important;line-height:13px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .hero-level small{font-size:8px!important;line-height:10px!important;max-width:100%!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .hero-level :is(progress,[data-slot=progress]){width:calc(var(--mh-rank) - 8px)!important;max-width:100%!important;height:3px!important;min-height:3px!important;margin:1px 0!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar{flex:1 1 auto!important;min-width:0!important;box-sizing:border-box!important;height:64px!important;gap:3px!important;padding:3px 4px 5px!important;justify-content:center!important;align-items:center!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar>button{box-sizing:border-box!important;flex:1 1 0!important;width:auto!important;min-width:0!important;max-width:76px!important;height:54px!important;min-height:54px!important;padding:0!important;margin:0!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar>button small{box-sizing:border-box!important;font-size:9px!important;line-height:12px!important;height:12px!important;padding:0 2px!important;bottom:0!important;left:0!important;right:0!important;width:auto!important;max-width:none!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar>button>span{font-size:8px!important;line-height:11px!important;min-width:12px!important;height:13px!important;padding:0 2px!important;top:1px!important;left:1px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar>button>em{font-size:7px!important;line-height:9px!important;right:2px!important;top:1px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar .hud-skill-art-r100{width:min(40px,calc(100% - 6px))!important;max-width:none!important;height:40px!important;inset:0 auto auto 50%!important;object-fit:contain!important;object-position:center!important;transform:translateX(-50%)!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar::after{height:2px!important;bottom:3px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .primary-skill-bar::before{width:6px!important;height:6px!important;bottom:1px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .potion-slot{flex:0 0 32px!important;width:32px!important;min-width:32px!important;height:48px!important;min-height:48px!important;margin:0!important;padding:0!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .potion-slot .hud-skill-art-r100{width:26px!important;height:32px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .potion-slot b{font-size:10px!important;line-height:12px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .potion-slot small{font-size:7px!important;line-height:9px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .dock-utility-actions{display:flex!important;flex:0 0 auto!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;gap:2px!important;padding:3px!important;margin:0!important;height:auto!important;width:auto!important;grid-template-columns:none!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .dock-utility-actions>button{box-sizing:border-box!important;flex:0 0 var(--mh-tool)!important;width:var(--mh-tool)!important;min-width:var(--mh-tool)!important;height:42px!important;min-height:42px!important;padding:0!important;margin:0!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .combat-dock .dock-utility-actions svg{width:18px!important;height:18px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open{position:absolute!important;inset:var(--mh-chat-top,150px) auto auto var(--mh-chat-left,8px)!important;transform:none!important;translate:0 0!important;scale:1!important;box-sizing:border-box!important;width:var(--mh-chat-width,214px)!important;max-width:none!important;height:var(--mh-chat-height,148px)!important;min-height:0!important;max-height:none!important;display:flex!important;flex-direction:column!important;gap:0!important;padding:0!important;border:1px solid #9b845775!important;border-radius:9px!important;background:linear-gradient(110deg,#071b19c9,#071713aa)!important;box-shadow:0 3px 12px #0003!important;backdrop-filter:none!important;z-index:12!important;overflow:hidden!important;touch-action:pan-y}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-toggle{flex:0 0 24px!important;box-sizing:border-box!important;display:flex!important;justify-content:space-between!important;align-items:center!important;width:100%!important;min-width:0!important;height:24px!important;min-height:24px!important;max-height:24px!important;margin:0!important;padding:0 9px!important;color:#e5c995!important;background:#0b19173d!important;border:0!important;border-bottom:1px solid #b99a5d29!important;border-radius:0!important;font:600 11px/1.2 Arial,sans-serif!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-toggle svg{width:14px!important;height:14px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-log{box-sizing:border-box!important;display:block!important;flex:1 1 0!important;min-height:0!important;height:auto!important;max-height:none!important;min-width:0!important;margin:0!important;padding:2px 9px!important;overflow-y:auto!important;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#a78d5955 transparent}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-log p{margin:0!important;font:11px/18px Arial,sans-serif!important;color:#e0e8e3!important;overflow-wrap:anywhere;text-shadow:0 1px 2px #0008}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-log p small{font-size:9px!important;color:#89b4a4!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-log p strong{font-size:11px!important;color:#e8cf9e!important;font-weight:700!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-form{box-sizing:border-box!important;display:grid!important;grid-template-columns:64px minmax(0,1fr) 30px!important;flex:0 0 28px!important;width:100%!important;min-width:0!important;height:28px!important;min-height:28px!important;margin:0!important;padding:0!important;border-top:1px solid #a88c5129!important;background:#07171366!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-form :is(select,input,button){box-sizing:border-box!important;width:100%!important;min-width:0!important;height:27px!important;min-height:27px!important;max-height:27px!important;margin:0!important;padding:0 6px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#c5d6cc!important;font:11px/1.2 Arial,sans-serif!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-form input{font-size:16px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-form input::placeholder{color:#9cb0a7!important;opacity:1;font-size:11px!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-form button{padding:0!important;color:#e5c995!important}
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open>.chat-send-warning{flex:0 0 auto;box-sizing:border-box;margin:0!important;padding:0 8px!important;font:10px/12px Arial,sans-serif!important;max-height:12px!important;white-space:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
/* The compact dungeon task used the left chat area before mobile chat existed. */
html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-actions .dungeon-mobile-task{position:absolute!important;inset:48px auto auto calc(100vw - var(--mh-safe-left) - var(--mh-safe-right) - 180px)!important;width:180px!important;max-width:none!important;transform:none!important;translate:0 0!important;box-sizing:border-box!important;padding:4px 8px!important}
@media(max-width:520px){html .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .world-actions .dungeon-mobile-task{top:100px!important}}
/* Reuse the game's existing visual-viewport/typing state. The compact idle
   panel must not override the keyboard-safe composer or fall behind HUD keys. */
html[data-col-typing] .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open:focus-within{--mh-chat-entry-height:min(156px,calc(var(--chat-viewport-height,100dvh) - 12px));position:fixed!important;inset:auto!important;top:calc(var(--chat-viewport-top,0px) + var(--chat-viewport-height,100dvh) - var(--mh-chat-entry-height) - 6px)!important;left:calc(var(--chat-viewport-left,0px) + var(--chat-viewport-width,100vw)/2)!important;transform:translateX(-50%)!important;width:min(360px,calc(var(--chat-viewport-width,100vw) - 24px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)))!important;height:var(--mh-chat-entry-height)!important;max-height:var(--mh-chat-entry-height)!important;z-index:96!important;background:#091c19f2!important}
html[data-col-typing] .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open:focus-within>.chat-form{grid-template-columns:70px minmax(0,1fr) 44px!important;flex-basis:44px!important;height:44px!important;min-height:44px!important}
html[data-col-typing] .game-shell[data-core-hud="v1"][data-mobile-hud-r102] .chat-panel.open:focus-within>.chat-form :is(select,input,button){height:43px!important;min-height:43px!important;max-height:43px!important}
}
`;

