// Bound only while the verification dialog is open. No network, polling or HUD writes.
function installBotViewport466(dialog, host = window) {
  if (!dialog) return;
  const doc = dialog.ownerDocument;
  const viewport = host.visualViewport;
  const pointer = host.matchMedia('(pointer: coarse)');
  let frame = 0, disposed = false;
  const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const update = () => {
    frame = 0;
    if (disposed) return;
    const width = Math.max(1, finite(viewport?.width, host.innerWidth));
    const height = Math.max(1, finite(viewport?.height, host.innerHeight));
    const left = Math.max(0, finite(viewport?.offsetLeft, 0));
    const top = Math.max(0, finite(viewport?.offsetTop, 0));
    const editing = dialog.contains(doc.activeElement) && /^(INPUT|TEXTAREA)$/.test(doc.activeElement?.tagName ?? '');
    const mobile = pointer.matches || width <= 640;
    for (const [key, value] of Object.entries({ width, height, left, top })) {
      dialog.style.setProperty('--col-bot-' + key + '466', value + 'px');
    }
    dialog.setAttribute('data-col-bot-viewport466', '');
    if (mobile && (editing || height < 260)) {
      dialog.setAttribute('data-col-bot-compact466', width >= 560 ? 'wide' : 'narrow');
      // iOS focus can preserve the old panel's input scroll position after the
      // visual viewport shrinks. The code and entry now fit beside each other.
      if (editing && dialog.scrollTop) dialog.scrollTop = 0;
    } else dialog.removeAttribute('data-col-bot-compact466');
  };
  const schedule = () => {
    if (!disposed && !frame) frame = host.requestAnimationFrame(update);
  };
  update();
  for (const event of ['resize', 'scroll']) viewport?.addEventListener(event, schedule);
  host.addEventListener('resize', schedule);
  host.addEventListener('orientationchange', schedule);
  pointer.addEventListener('change', schedule);
  dialog.addEventListener('focusin', schedule);
  dialog.addEventListener('focusout', schedule);
  return () => {
    disposed = true;
    if (frame) host.cancelAnimationFrame(frame);
    for (const event of ['resize', 'scroll']) viewport?.removeEventListener(event, schedule);
    host.removeEventListener('resize', schedule);
    host.removeEventListener('orientationchange', schedule);
    pointer.removeEventListener('change', schedule);
    dialog.removeEventListener('focusin', schedule);
    dialog.removeEventListener('focusout', schedule);
    dialog.removeAttribute('data-col-bot-viewport466');
    dialog.removeAttribute('data-col-bot-compact466');
    for (const key of ['width', 'height', 'left', 'top']) dialog.style.removeProperty('--col-bot-' + key + '466');
  };
}

// A stable callback ref binds after Radix's deferred portal really mounts, and
// unbinds on its actual removal. A parent effect can run before that portal exists.
function botViewportRef466(useRef) {
  const ref = useRef(null);
  if (!ref.current) {
    let dispose;
    ref.current = (node) => {
      dispose?.();
      dispose = node ? installBotViewport466(node) : undefined;
    };
  }
  return ref.current;
}

import{r as e}from"./rolldown-runtime-S-ySWqyJ-ga4172.js";import{i as t,r as n}from"./framework-CXnKph_e-ga4172.js";import{t as r}from"./createLucideIcon-BiVFlVzr-ga4172.js";import{a as i,c as a,h as o,l as s,o as c,r as l,s as u}from"./launch-landing-qVKrjo7K-ga4172-prereg-1788-e486-48ff1d5b32ef-74b8821e.js";var d=r(`chevron-right`,[[`path`,{d:`m9 18 6-6-6-6`,key:`mthhwq`}]]),f=r(`mail`,[[`path`,{d:`m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7`,key:`132q7q`}],[`rect`,{x:`2`,y:`4`,width:`20`,height:`16`,rx:`2`,key:`izxlao`}]]),p=r(`sparkles`,[[`path`,{d:`M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z`,key:`1s2grr`}],[`path`,{d:`M20 2v4`,key:`1rf3ol`}],[`path`,{d:`M22 4h-4`,key:`gwowj6`}],[`circle`,{cx:`4`,cy:`20`,r:`2`,key:`6kqj1y`}]]),m=e(t(),1),h=n();function g({onChange:e,retry:t}){let[n,r]=(0,m.useState)(null),[i,a]=(0,m.useState)(``),[o,s]=(0,m.useState)(``),[c,l]=(0,m.useState)(0);return(0,m.useEffect)(()=>{let t=!0;return r(null),a(``),e(``,``),fetch(`/api/auth/challenge`,{method:`POST`,credentials:`same-origin`}).then(async e=>{let n=await e.json();if(!e.ok)throw Error(n.error);t&&(r(n),s(``))}).catch(e=>{t&&s(e.message)}),()=>{t=!1}},[t,c]),(0,h.jsxs)(`div`,{className:`captcha-box`,children:[(0,h.jsx)(`strong`,{children:`Bot doğrulaması`}),n&&(0,h.jsx)(`img`,{src:n.image,alt:`Doğrulama kodu: aşağıdaki alana görseldeki altı rakamı yaz`,width:252,height:88}),(0,h.jsx)(`input`,{"aria-label":`Görseldeki 6 rakam`,autoComplete:`off`,inputMode:`numeric`,pattern:`[0-9]{6}`,maxLength:6,value:i,required:!0,onChange:t=>{a(t.target.value),e(n?.id??``,t.target.value)},placeholder:`Görseldeki 6 rakam`}),o&&(0,h.jsx)(`small`,{role:`alert`,children:o}),(0,h.jsx)(`button`,{type:`button`,onClick:()=>l(e=>e+1),children:`Görseli yükle / yeniden dene`})]})}function _({enabled:e,read:t,post:n,onRequired:r}){let[d,f]=(0,m.useState)(null),[p,g]=(0,m.useState)(``),[_,v]=(0,m.useState)(``),[y,b]=(0,m.useState)(!1),x=(0,m.useRef)({read:t,post:n,onRequired:r});x.current={read:t,post:n,onRequired:r};let S=(0,m.useRef)(null),C=(0,m.useRef)(``),w=(0,m.useRef)(0),T=(0,m.useRef)(!1),colBot466=botViewportRef466(m.useRef);return(0,m.useEffect)(()=>{if(!e){f(null),C.current=``,x.current.onRequired(!1);return}let t=!0,n=!1,r=async()=>{if(n||T.current)return;n=!0;let e=w.current;try{let n=await x.current.read();if(!t||e!==w.current)return;n.required?(C.current!==n.id&&(C.current=n.id,g(``),v(``),f(n)),x.current.onRequired(!0)):(C.current=``,f(null),x.current.onRequired(!1))}catch{}finally{n=!1}};r();let i=setInterval(r,5e3);return window.addEventListener(`coreoflife:bot-check`,r),()=>{t=!1,w.current++,clearInterval(i),window.removeEventListener(`coreoflife:bot-check`,r)}},[e]),(0,h.jsx)(l,{open:e&&!!d,children:(0,h.jsxs)(a,{children:[(0,h.jsx)(u,{className:`bot-check-overlay`}),(0,h.jsxs)(o,{className:`bot-check-dialog`,ref:colBot466,"data-slot":`dialog-content`,onInteractOutside:e=>e.preventDefault(),onEscapeKeyDown:e=>e.preventDefault(),onOpenAutoFocus:e=>{window.matchMedia(`(pointer: coarse)`).matches&&e.preventDefault()},onCloseAutoFocus:e=>e.preventDefault(),onPointerDown:e=>e.stopPropagation(),onKeyDown:e=>e.stopPropagation(),children:[(0,h.jsxs)(c,{children:[(0,h.jsx)(s,{children:`Oyuncu doğrulaması`}),(0,h.jsx)(i,{children:`Oyuna devam etmek için görseldeki 6 rakamı yaz. Bu kontrol 30 dakikada bir yapılır.`})]}),(0,h.jsxs)(`form`,{className:`captcha-box`,onSubmit:async e=>{if(e.preventDefault(),!(!d||T.current)){T.current=!0,w.current++,b(!0);try{await x.current.post({id:d.id,answer:p}),C.current=``,f(null),g(``),v(``),x.current.onRequired(!1)}catch(e){v(e instanceof Error?e.message:`Kod doğrulanamadı.`),g(``),S.current?.focus({preventScroll:!0})}finally{T.current=!1,b(!1)}}},children:[d&&(0,h.jsx)(`img`,{src:d.image,alt:`Görseldeki altı rakamı aşağıya yaz`,width:252,height:88}),(0,h.jsx)(`input`,{ref:S,type:`text`,"aria-label":`Görseldeki 6 rakam`,placeholder:`Görseldeki 6 rakam`,autoComplete:`off`,inputMode:`numeric`,enterKeyHint:`done`,pattern:`[0-9]{6}`,maxLength:6,required:!0,value:p,onPointerDown:e=>e.stopPropagation(),onChange:e=>g(e.target.value.replace(/\D/g,``).slice(0,6))}),_&&(0,h.jsx)(`p`,{role:`alert`,children:_}),(0,h.jsx)(`button`,{disabled:y||p.length!==6,children:y?`Doğrulanıyor…`:`Doğrula ve devam et`})]})]})]})})}var v=null,y;function b(){if(typeof window>`u`)return;let e=window.AudioContext??window.webkitAudioContext;if(e)try{(!v||v.state===`closed`)&&(v=new e);let t=v;t.resume().catch(()=>{});let n=t.createBufferSource();n.buffer=t.createBuffer(1,1,t.sampleRate),n.connect(t.destination),n.start(),n.onended=()=>n.disconnect(),clearTimeout(y),y=setTimeout(()=>{v===t&&(v=null,t.close().catch(()=>{}))},6e4)}catch{}}function x(){let e=v;return v=null,clearTimeout(y),e?.state===`closed`?null:e}var S=`coreoflife:game-session-ended`,C=`x-game-instance`,w=`coreoflife:instance-ended`,T=15*6e4,E=``,D=0;function O(){return E||=crypto.randomUUID(),E}function k(e){D=Math.max(0,Number(e)||0)}function A(e){E=e}function j(){return D}export{j as a,S as c,_ as d,g as f,d as h,O as i,x as l,f as m,w as n,A as o,p,C as r,k as s,T as t,b as u};