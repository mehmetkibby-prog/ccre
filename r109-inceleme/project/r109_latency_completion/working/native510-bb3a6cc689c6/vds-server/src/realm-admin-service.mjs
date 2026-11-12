// Central administration: the accounts process alone owns these writes.
// The caller must have verified either the central owner session or a signed
// realm request whose actor/version are checked against the central authority.
export async function realmAdminOperation(runtime, actorId, input, {launch,mail}={}) {
 const fail=message=>{throw Object.assign(new Error(message),{status:400});};
 if(!input||typeof input!=='object')fail('Geçersiz yönetim isteği.');
 if(input.resource==='site_visits'){
  if(input.method!=='GET')fail('Geçersiz yönetim isteği.');
  return globalThis.__colSiteVisits?.snapshot()??{day:new Date(Date.now()+10800000).toISOString().slice(0,10),count:null,available:false,label:'Bugünkü site ziyaretçisi',timezone:'Europe/Istanbul'};
 }
 if(input.resource==='launch'){
  if(input.method==='POST'){
   const body=input.body??{};
   if(body.action==='save')launch.save(body.settings);
   else if(body.action==='grant'){
    if(typeof body.accountId!=='string'||typeof body.allow!=='boolean')fail('Geçersiz erişim izni.');
    launch.grant(body.accountId,body.allow);
   }else if(body.action==='grant_self')launch.grant(actorId,true);
   else if(body.action==='email_enabled'){
    if(!mail||typeof body.enabled!=='boolean')fail('E-posta tercihi geçersiz.');mail.setEnabled(body.enabled);
   }else if(body.action==='email_test'){
    if(!mail)fail('E-posta sistemi hazır değil.');await mail.test(runtime.store.currentAccount(actorId).email);
   }else fail('Geçersiz yönetim işlemi.');
  }else if(input.method!=='GET')fail('Geçersiz istek.');
  if(input.view==='registrations')return {...launch.registrations(input.query??'',input.page),characterScope:'realm',earlyAccessUrl:runtime.authOrigin+'/early-access'};
  return {settings:launch.settings(),accounts:launch.accounts(input.query??''),status:launch.status(),email:mail?.adminStatus(),earlyAccessUrl:runtime.authOrigin+'/early-access'};
 }
 if(input.resource==='realms'){
  if(input.method==='POST'){
   const body=input.body??{};
   if(body.action==='realm'){
    // Do not permit the only available administration realm to lock itself out.
    if(body.realmId===runtime.manifest.primaryRealmId&&body.status==='closed')fail('Ana sunucu için bakım modunu kullan.');
    runtime.control.saveRealm(body);
   }else if(['ban','unban','suspend'].includes(body.action))runtime.control.sanction(actorId,body);
   else fail('Geçersiz sunucu işlemi.');
  }else if(input.method!=='GET')fail('Geçersiz istek.');
  const catalog=await runtime.catalog({includeHidden:true}),settings=runtime.control.realms();
  return {realms:catalog.map(row=>{
   const source=settings.find(r=>r.id===row.id),locked=runtime.manifest.phase==='416a'&&row.id!==runtime.manifest.primaryRealmId;
   return {...row,configuredStatus:source.status,canOpen:!locked,openingNote:locked?'Sunucu 2 hazır ve kapalı. Açılması için ayrı onay ve eşzamanlı yük testi gerekiyor.':null};
  }),launch:launch.status()};
 }
 fail('Geçersiz yönetim bölümü.');
}
