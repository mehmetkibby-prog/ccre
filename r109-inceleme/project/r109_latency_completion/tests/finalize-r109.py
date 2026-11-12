"""Bind the exact tested executable package, functional evidence and honest load report."""
import hashlib,json,re,subprocess,zipfile,csv,io,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];EV=ROOT/'evidence';VERSION='R109_LATENCY2'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
def require(ok,msg):
 if not ok:raise RuntimeError(msg)

def main():
 progress=read(EV/'r109-ready-load-progress.json');require(len(progress)==6 and all(x['exit']==0 for x in progress),'All six declared load runs must pass')
 loads=[]
 for row in progress:
  p=EV/row['file'];r=read(p);require(r['passed'] and r['endSettlement']['completed'],'Unsettled or failed native load '+p.name)
  require(not r.get('errors') and not r.get('faults'),'Native load error '+p.name)
  require(r['durationRequestedMs']==60000 and not any(r.get('instrumentation',{}).get(k) for k in ['cpuSampling','allocationSampling','sqlTiming']),'Acceptance run cannot use profiler')
  require(r['webSocketTransport']=='production-style-tcp-proxy','Real TCP required')
  for name,h in r['runtimeFiles'].items():require(sha(ROOT/'working/core511-source/scripts/core511'/name)==h,'Source changed since load: '+name)
  loads.append((row,r,sha(p)))
 validation=read(EV/'validation-progress.json')
 expected=['focused','boss-prewarm','cold-worker-regression','native-fixtures','native-current','captcha','package-build','installer','runtime-stage','relocated-runtime','browser-assets','browser-r1','browser-r2','three-browser-tower']
 require([r['name'] for r in validation]==expected and all(r['exit']==0 for r in validation),'Release validation is incomplete')
 checks=[];counts={'focused':54,'boss-prewarm':8,'cold-worker-regression':2,'native-current':29,'captcha':20,'relocated-runtime':2}
 for r in validation:
  p=Path(r['log']);require(p.is_relative_to(EV),'Validation log path');text=p.read_text();n=counts.get(r['name'])
  if n:
   for key,value in {'tests':n,'pass':n,'fail':0,'cancelled':0,'skipped':0,'todo':0}.items():
    matches=re.findall(r'^# '+key+r' (\d+)\s*$',text,re.M);require(matches and int(matches[-1])==value,'Unexpected '+r['name']+' '+key)
  if r['name']=='installer':require(re.search(r'Ran 26 tests[^\n]*\n\s*\nOK\s*$',text,re.M),'Installer checks incomplete')
  checks.append({**r,'sha256':sha(p),'tests':n})
 browsers=[]
 for p in [EV/'browser-r1-hud-r109-latency/report.json',EV/'browser-r2-hud-mobile-r109-latency/report.json',EV/'three-browser-r109-latency/report.json']:
  r=read(p);require(r.get('passed') and not r.get('failure') and all(k in r and not r[k] for k in ['errors','nativeFaults','missingAssets']),'Browser failure '+str(p));browsers.append({'file':str(p),'sha256':sha(p),'passed':True})
 stage=read(EV/'runtime-stage.json');tested=stage.get('actualTestedPackage',stage.get('package'));require(sha(tested['file'])==tested['sha256'],'Tested package changed')
 with zipfile.ZipFile(tested['file']) as z:
  plan=json.loads(z.read('plan.json'));require(plan['version']==VERSION,'Wrong target')
  require(plan['databaseScope']=='none' and plan['databaseChanges']==False and plan['databaseSchemaChanges']==False,'Code-only contract')
  for name,row in plan['files'].items():
   content=z.read('payload/'+name);require(hashlib.sha256(content).hexdigest()==row['after'],'Archive hash');require((Path(stage['release'])/name).read_bytes()==content,'Installed file mismatch '+name)
  require(len(plan['files'])==20,'Unexpected payload expansion')
 baseline=ROOT.parent/'r106_captcha_worker/delivery/r106-captcha.zip';require(sha(baseline)=='6c8a931dfa7da3cdaf054d5c2c5715103abfa35024ff422402a9aaa734d22d2a','Original selected R106 changed')
 prior=ROOT.parent/'r108_latency_repair/delivery/r108-gecikme.zip';require(sha(prior)=='389147cca4bb7c4192c129bf51a1242628f06ccef43db11532b7be10d29d9588','Original R108 changed')
 table=['| Senaryo | Oyuncu | Tick p95/p99 (ms) | Ana >50 ms/dk | Kanal >50 ms/dk (toplam) | En uzun ana/kanal (ms) | Ana ELU | Toplam RSS (MiB) |','|---|---:|---:|---:|---:|---:|---:|---:|']
 replies=['| Senaryo | Oyuncu başına yanıt p95 medyanı (ms) | En yüksek oyuncu p95 (ms) | En uzun tek yanıt (ms) |','|---|---:|---:|---:|']
 csvrows=[];allUnder50=True;target=True
 for row,r,h in loads:
  s=r['summary'];loops=r['measurement']['measurement']['eventLoops'];maxall=max(l['maxPauseMs'] for l in loops);allUnder50 &= maxall<50;target &= s['tickP99Ms']<30 and s['mainPausesOver50Ms']<=1 and s['channelPausesOver50Ms']<=1
  table.append(f"| {row['realm']} / {row['name']} | {row['players']} | {s['tickP95Ms']:.2f} / {s['tickP99Ms']:.2f} | {s['mainPausesOver50Ms']} | {s['channelPausesOver50Ms']} | {s['mainMaxPauseMs']:.1f} / {s['maxChannelPauseMs']:.1f} | %{100*s['mainElu']:.1f} | {s['resources']['maxRssBytes']/1048576:.0f} |")
  reply={'medianActorReplyP95Ms':statistics.median(a['latencyP95Ms'] for a in r['actors']),'maxActorReplyP95Ms':max(a['latencyP95Ms'] for a in r['actors']),'maxReplyMs':max(a['maxLatencyMs'] for a in r['actors'])}
  replies.append(f"| {row['realm']} / {row['name']} | {reply['medianActorReplyP95Ms']:.1f} | {reply['maxActorReplyP95Ms']:.1f} | {reply['maxReplyMs']:.1f} |")
  csvrows.append({'file':row['file'],'sha256':h,'realm':row['realm'],'players':row['players'],'passed':True,**{k:v for k,v in s.items() if k!='resources'},**reply,'allLoopsMaxPauseMs':maxall,'endSettlementMs':r['endSettlement']['durationMs']})
 text='''# R109 — kalan gecikme incelemesi ve düzeltmeler

R106_CAPTCHA1 üzerine önceki R108 düzeltmeleri ve üç yeni dar değişiklik eklendi.
R106_READY1, swap, canlı telemetri veya deneysel Node bellek ayarı eklenmedi.
Canlıya kurulmadı. Oyun kuralları, kayıt biçimi ve ödül/sahiplik garantileri korundu.

## Yeni düzeltmeler

1. Ayrı yazıcıya uygun olmayan saldırılar ana yola döndüğünde sorgu önbelleği
   kapsamı eksikti. Normal yoldaki sınırlı, şema denetimli önbellek bu senkron
   işlemde de kullanılıyor. Commit ve kalıcı onay sırası değişmiyor.
2. İlk boss ölümünün özgün sorguları açılışta derleniyor. En fazla sekiz sınırlı
   sorgu kalabiliyor; kullanılınca veya şema değişince bırakılıyor. Ödül verisi,
   sonuç satırı veya oyuncu bilgisi önbelleğe alınmıyor.
3. Toplu ölümlerde ana saldırının yanına en fazla bir kabul edilmiş saldırı
   ekleniyor. Sonraki kuyruk başları tüketilmiyor; sıra, seed, sahiplik ve kayıt
   korumaları aynı. Bir tek atomik işlemde uzayan işlem yükü azaltıldı.

## Dağıtılacak kodun 60 saniyelik ölçümleri

Dört gerçek kanal, ayrı bot süreci, TCP bağlantıları, 6.000 arka plan canavarı;
üç sınıf/uzmanlık, eşya/efsun, pet/kanat ve çanta. Karma senaryo normal harita,
Kadim Kule, Solo, Sis Yarığı, Kara Harita ve Rün Sahili içeriyor. Sohbet,
iksir, lonca/görev/pazar okuma istekleri de var. Boss dört kanalın gerçek
katkı/ölüm/XP ve ganimet kontrollerini çalıştırıyor. Bot IP'leri ayrı;
IP başına oto atak güvenliği değiştirilmedi. Akademi gerçek 10 kişi/kanal
sınırında; Efsane yoğun koşusu 25+15 kişi şeklinde.

'''+ '\n'.join(table)+'\n\n'
 text+='Her satır ayrı bir 60 saniyelik pencere. Tick p95/p99, dört kanal içindeki en yüksek kanal değeridir. Ana ve kanal sayıları aynı fiziksel duraklamada örtüşebilir; toplanarak benzersiz donma sayısı sayılmaz.\n\n'
 text+='**Tüm süreçlerde 50 ms altı hedefi:** '+('sağlandı.' if allUnder50 else 'sağlanmadı; tekil uzun duraklamalar devam ediyor.')+'\n'
 text+='**Tick p99 <30 ms, ana süreçte ve kanalların toplamında en fazla bir >50 ms kontrolü:** '+('bu koşularda geçti.' if target else 'bütün koşularda geçmedi.')+'\n\n'
 text+='''### Botun komut yanıtını beklediği süre

Tick süresi bir komutun yanıt süresi değildir. Aşağıdaki ölçüm botun gerçek
istemci transportuna komutu vermesi ile HTTP/WebSocket yanıtını alması
arasındadır; istemci/sunucu kuyruğunu ve protokol beklemesini de içerir.
202 geçici yanıtı kalıcı ödül onayı sayılmaz; son olay ve ödül tamamlanması
ayrıca denetlendi. Bunlar toplu komut p95'i değil, oyuncu başına p95'lerin
medyanı ve en yüksek değeridir. Bot, test sunucusuyla aynı makinededir;
internet ve çizim süresi dahil değildir.

'''+ '\n'.join(replies)+'\n\n'
 text+='Özellikle ortak boss koşusunda bir saniyeyi aşan tekil komut yanıtları da var. Düşük tick p99 sonucu, bütün etkileşimlerin gecikmesiz olduğu anlamına gelmiyor. Bu paket tüm kalan gecikmelerin giderildiği bir sürüm olarak sunulamaz.\n\n'
 text+='''Test makinesi 4 CPU kotasını paylaşır; canlı VDS 8 çekirdektir. Sentetik veri
kullanıldı; anonim canlı DB kopyası yok. CPU steal ve kotalama ham JSON host
alanında korunur. Birkaç süreçte aynı anda görülen duraklamalar rapordan
çıkarılmadı; bunların tamamını işletim sistemine yüklemek doğru değildir.
Sunucu tick ölçümü oyuncunun ağ gecikmesini veya GPU/FPS değerini ölçmez.
Sıfır lag ve canlı kapasite garantisi verilmez. İlk boss koşusunda 59,3 ms
süren bir native kayıt işlemi diğer döngülerdeki duraklamayla çakışmadı;
bu kalan süreyi yalnız donanıma bağlamıyoruz.

## Önce/sonra ve olumsuz bulgular

Aynı 40 kişilik eşyalı, yoğun kanal senaryosunda bu çalışma içindeki ilk
önbellek koşusu p99 43,71 ms ve ana >50 ms 8; küçük grup denemesi p99 32,76 ms
ve ana >50 ms 2 verdi. Bunlar farklı zamanlardaki tekil pilotlardır; kesin
nedensel yüzde veya canlı kapasite artışı olarak yorumlanamaz. Son kodun
tekrarları yukarıdaki tabloda, değişkenlik dahil gösterildi.

Önceki R108 ölçümleri ve arşivi değiştirilmedi. Eski dengeli/eşyasız R106
ölçümleri yeni eşyalı/yoğun kanalla doğrudan karşılaştırılmadı.

Bir tanı koşusu yanlış senaryo adıyla çalıştı ve başarısız sayıldı; test artık
bilinmeyen adları başlangıçta reddediyor. İlk kanal profili dosya dizini yokluğu
nedeniyle yazılamadı; ayrı tanı tekrarında düzeltildi. Profil ve SQL planı açık
koşular kabul ölçümlerine dahil değil, oyuna da eklenmedi.

İlk son-paket koşusunda geçici bir 202 ölüm tahmini kapanışta bekledi. O koşuda
son olaylar kaydedilmediğinden kesin neden belirlenemedi; başarısız sonuç korundu.
Gözlemci artık aynı oyuncu/intent için monster_result veya monster_reject
olayını izliyor; yalnız gerçek killed=true sonucunda ödül istiyor. Eksik son
olay veya cevapsız istek hâlâ testi başarısız yapıyor. Yeni gözlemciyle tüm
kabul koşularında komutlar, ödül istekleri ve bekleyen ölümler tamamlandı.
Ölçüm bittikten sonraki kapanış süresi 60 saniyelik tick istatistiğine eklenmedi.

## İşlev ve kurulum doğrulaması

- 54 odaklı, 8 boss sorgusu, 2 okuma worker, 29 native oyun ve 20 captcha testi.
- Test gözlemcisinde son olay/cevap sırası ve bitmeyen işlemler: 7 test.
- 26 gerçek dosya kurulum/geri dönüş testi; yarım yazma, yanlış kimlik ve
  sağlık başarısızlığı; oyuncu verisinin ve tek önceki kod yedeğinin korunması.
- Taşınmış kurulumla 2 runtime kontrolü; iki sunucu ve sekiz kanal.
- Paketin kesin JS/CSS dosyalarıyla Efsane PC ve Akademi mobil giriş/HUD;
  üç ayrı tarayıcıyla on kule katı. Eksik dosya veya native hata yok.

Yalnız değişen 20 kod dosyası; 13'ü seçili R106'ya göre farktır. Tam DB
kopyası, taraması veya sıkıştırması yok. Bakım/ön kayıt ayarları korunur.
Kesin ham kimlikler evidence/release-validation.json dosyasında.
'''
 (ROOT/'PERFORMANS_RAPORU.md').write_text(text)
 output=io.StringIO();writer=csv.DictWriter(output,fieldnames=csvrows[0].keys());writer.writeheader();writer.writerows(csvrows);(EV/'r109-measurements.csv').write_text(output.getvalue())
 subprocess.run(['python3','build/package.py'],cwd=ROOT,check=True)
 final=read(EV/'package.json');require(sha(final['file'])==final['sha256'],'Final package hash')
 with zipfile.ZipFile(tested['file']) as a,zipfile.ZipFile(final['file']) as b:
  require(set(a.namelist())==set(b.namelist()),'Archive membership changed');changes=[n for n in a.namelist() if a.read(n)!=b.read(n)];require(set(changes)<= {'KURULUM.md','DOGRULAMA.md','PERFORMANS_RAPORU.md'},'Executable changed after tests')
 verdict={'version':VERSION,'functionalChecksPassed':True,'performanceTargetMet':bool(target),'allProcessesUnder50ms':bool(allUnder50),'zeroLagGuaranteed':False,'liveInstalled':False,'liveDatabase':False,'cpuQuota':4,'liveVdsCpu':8,'sources':list(plan['sources']),'changedFiles':list(plan['files']),'tests':checks,'browsers':browsers,'loads':csvrows,'testedPackage':tested,'finalPackage':final,'documentationOnlyChanges':changes,'testedExecutableBytesMatchFinal':True}
 (EV/'release-validation.json').write_text(json.dumps(verdict,ensure_ascii=False,indent=2)+'\n')
 delivery=ROOT/'delivery';delivery.mkdir(exist_ok=True)
 for source,name in [(Path(final['file']),'r109-gecikme.zip'),(ROOT/'PERFORMANS_RAPORU.md','R109-olcum-raporu.md'),(EV/'r109-measurements.csv','R109-olcumler.csv')]:
  out=delivery/name;require(not out.exists(),'Immutable delivery already exists');out.write_bytes(source.read_bytes())
 (delivery/'r109-gecikme.zip.sha256').write_text(final['sha256']+'  r109-gecikme.zip\n')
 print(json.dumps({k:verdict[k] for k in ['functionalChecksPassed','performanceTargetMet','allProcessesUnder50ms','finalPackage']},indent=2))
if __name__=='__main__':main()
