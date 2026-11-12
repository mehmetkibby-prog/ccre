"""Bounded local checks; both realms must expose the same expected code."""
import time
from r63_support import local
class NotReady(RuntimeError):pass

def probe(manifest,version='R109_LATENCY2',request=local):
 health={};issues=[]
 for realm in manifest['realms']:
  rid=realm['id']
  try:
   h=request(realm['ports']['app'],'/api/vds-health');rows=h['channelProcesses']['channels']
   if h.get('ok') is not True or h.get('updateVersion')!='R102_CONTENT' or (h.get('adminHotfix')!='R102_ADMIN1') or (h.get('rankingHotfix')!='R102_RANK1') or (h.get('entryHotfix')!='R102_ENTRY1') or (h.get('championLabelHotfix')!='R102_LABEL1') or (h.get('autoIpLimit')!='R102_AUTO_IP1') or (version=='R102_IP_MOBILE1' and h.get('mobileHud')!=version) or (version in ('R102_COMPLETE3','R103_SKILLS1','R104_AKADEMI4','R105_TOWER2','R105_PERF1','R106_CAPTCHA1','R107_POPULATION1','R109_LATENCY2') and (h.get('mobileHud')!='R102_HUD_SLIM1' or h.get('realmLoad')!='R102_LOAD1' or h.get('additionsHotfix')!='R102_COMPLETE3')):raise ValueError('beklenen sürüm hazır değil')
   if version in ('R103_SKILLS1','R104_AKADEMI4','R105_TOWER2','R105_PERF1','R106_CAPTCHA1','R107_POPULATION1','R109_LATENCY2') and (h.get('skillVisuals')!='R103_SKILLS1' or h.get('browserCompatibility')!='R103_ABORT1'):raise ValueError('R103 beceri ve giriş kodu hazır değil')
   if version in ('R104_AKADEMI4','R105_TOWER2','R105_PERF1','R106_CAPTCHA1','R107_POPULATION1','R109_LATENCY2') and (h.get('autoSession')!='R103_AUTO_SESSION1' or h.get('mobileChat')!='R103_CHAT_ANCHOR2'):raise ValueError('oto av oturum ve mobil sohbet düzeltmesi hazır değil')
   if version in ('R104_AKADEMI4','R105_TOWER2','R105_PERF1','R106_CAPTCHA1','R107_POPULATION1','R109_LATENCY2') and (h.get('academyPrereg')!='R104_AKADEMI4' or h.get('readerBoot')!='R104_BOOT1'):raise ValueError('R104 Akademi ve açılış kodu hazır değil')
   if version in ('R105_TOWER2','R105_PERF1','R106_CAPTCHA1','R107_POPULATION1','R109_LATENCY2') and h.get('connectionRecovery')!='R105_TOWER2':raise ValueError('Kule bağlantı düzeltmesi hazır değil')
   if version in ('R105_PERF1','R106_CAPTCHA1','R107_POPULATION1','R109_LATENCY2') and h.get('performanceReview')!='R105_PERF1':raise ValueError('performans düzenlemesi hazır değil')
   if version in ('R106_CAPTCHA1','R107_POPULATION1','R109_LATENCY2') and h.get('captchaWorker')!='R106_CAPTCHA1':raise ValueError('captcha worker kodu hazır değil')
   if version in ('R107_POPULATION1','R109_LATENCY2') and h.get('populationStability')!='R107_POPULATION1':raise ValueError('kalabalık oda düzeltmesi hazır değil')
   if version=='R109_LATENCY2' and h.get('latencyRepair')!='R109_LATENCY2':raise ValueError('gecikme düzeltmesi hazır değil')
   if h['realm'].get('realmId')!=rid or h['realm'].get('dbIdentity')!=realm['dbIdentity']:raise ValueError('sunucu/veritabanı kimliği farklı')
   if len(rows)!=4 or sorted(r['channel'] for r in rows)!=[1,2,3,4] or not all(r['ready'] is True and r.get('capacity')==realm['initialChannelCapacity'] for r in rows):raise ValueError('dört kanal hazır değil')
   context=request(realm['ports']['app'],'/api/realm/context')
   if context['realm']['id']!=rid:raise ValueError('seçim kimliği farklı')
   health[rid]=h
  except Exception as e:issues.append(rid+': '+(str(e)[:120] if isinstance(e,ValueError) else 'yerel servis henüz yanıt vermiyor'))
  try:
   for path in ('/healthz','/readyz'):
    rt=request(realm['ports']['realtime'],path)
    if rt.get('ok') is not True or rt.get('protocol')!='col-realtime-1':raise ValueError('bağlantı servisi hazır değil')
    if rid=='r2' and (rt.get('transportRepairVersion')!='R102_REALTIME1' or rt.get('realmId')!='r2' or rt.get('dbIdentity')!=realm['dbIdentity']):raise ValueError('Akademi bağlantı kimliği farklı')
  except Exception as e:issues.append(rid+' bağlantı: '+(str(e)[:120] if isinstance(e,ValueError) else 'yerel bağlantı servisi yanıt vermiyor'))
 try:
  if request(manifest['authPort'],'/api/auth/me').get('authenticated') is not False:issues.append('hesap: beklenmeyen yanıt')
 except Exception:issues.append('hesap: yerel servis henüz yanıt vermiyor')
 return health,issues

def wait(manifest,version='R109_LATENCY2',timeout=120,request=local,say=print):
 end=time.monotonic()+timeout;reported=0
 while time.monotonic()<end:
  health,issues=probe(manifest,version,request)
  if not issues:return health
  if time.monotonic()-reported>=10:say('Açılış kontrolü: '+'; '.join(issues));reported=time.monotonic()
  time.sleep(.5)
 raise NotReady('Sağlık kontrolü tamamlanamadı: '+'; '.join(issues))
