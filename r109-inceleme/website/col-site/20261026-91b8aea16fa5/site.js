(() => {
  'use strict';
  const $=(s,root=document)=>root.querySelector(s), $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const assetBase='/col-site/20261026-91b8aea16fa5/';
  if($('#year')) $('#year').textContent=String(new Date().getFullYear());
  const toggle=$('.menu-toggle'),menu=$('#mobile-menu');
  function closeMenu(){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menüyü aç');}
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');});
  $$('a',menu).forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();toggle.focus();}});
  const media=matchMedia('(min-width: 1050px)');media.addEventListener('change',e=>{if(e.matches)closeMenu();});
  const tabs=$$('[data-class]');
  function activate(tab){for(const t of tabs){const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;$('#'+t.getAttribute('aria-controls')).hidden=!active;}}
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',e=>{const next=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;if(next!==null){e.preventDefault();activate(tabs[next]);tabs[next].focus();}});});
  const dialog=$('#media-dialog'),content=$('#media-content'),caption=$('#media-caption');let opener=null,oldOverflow='';
  function openDialog(button,title,description){opener=button;$('#media-title').textContent=title;caption.textContent=description;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();$('.dialog-close').focus();}
  function cleanup(){const video=$('video',content);if(video){video.pause();video.removeAttribute('src');video.load();}content.replaceChildren();document.body.style.overflow=oldOverflow;opener?.focus();opener=null;}
  dialog.addEventListener('close',cleanup);$('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  $$('[data-video]').forEach(button=>button.addEventListener('click',()=>{const video=document.createElement('video');video.src=assetBase+'core-of-life-tanitim.mp4';video.poster=assetBase+'trailer-poster.webp';video.controls=true;video.playsInline=true;video.preload='metadata';video.setAttribute('aria-label','Core of Life genel tanıtım videosu');dialog.classList.add('video-dialog');content.replaceChildren(video);openDialog(button,'Core of Life · Bir dünyadan fazlası','60 saniye · Haritalar, pazar, kule, zindanlar, eşya gelişimi ve lonca kalesi.');void video.play().catch(()=>{});}));
  $$('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{const img=new Image();img.src=assetBase+button.dataset.gallery;img.alt=button.dataset.galleryTitle;img.decoding='async';dialog.classList.remove('video-dialog');content.replaceChildren(img);openDialog(button,button.dataset.galleryTitle,button.dataset.galleryCaption);}));
  if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:.08});$$('.reveal').forEach(el=>{el.classList.add('will-reveal');observer.observe(el);});}
})();
