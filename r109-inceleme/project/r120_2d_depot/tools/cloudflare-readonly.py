#!/usr/bin/env python3
"""GET-only Cloudflare inventory. Token via hidden prompt; never writes settings."""
import argparse,getpass,hashlib,json,os,sys,urllib.request,urllib.error
p=argparse.ArgumentParser();p.add_argument('--zone',default='coreoflife.net');p.add_argument('--out',default='cloudflare-2d-kontrol.json');args=p.parse_args()
token=os.environ.get('CLOUDFLARE_READ_TOKEN') or getpass.getpass('Cloudflare salt okunur API token (gizli): ')
def get(path):
 req=urllib.request.Request('https://api.cloudflare.com/client/v4/'+path,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='GET')
 try:
  with urllib.request.urlopen(req,timeout=20) as r:body=json.load(r)
  if not body.get('success'):return {'unavailable':True,'errors':[{'code':e.get('code'),'message':e.get('message')} for e in body.get('errors',[])]}
  return body
 except urllib.error.HTTPError as e:return {'unavailable':True,'httpStatus':e.code}
 except Exception as e:return {'unavailable':True,'error':type(e).__name__}
def safe(value):
 if isinstance(value,dict):return {k:('[redacted]' if any(x in k.lower() for x in ('token','authorization','secret','private_key')) else safe(v)) for k,v in value.items()}
 if isinstance(value,list):return [safe(v) for v in value]
 return value
zones=get('zones?name='+args.zone)
if zones.get('unavailable') or len(zones.get('result',[]))!=1:sys.exit('Bölge okunamadı; token yalnız bu bölge için okuma yetkili olmalı.')
zone=zones['result'][0]['id'];base='zones/'+zone+'/'
result={'scope':'GET only, no mutations','zone':args.zone,'plan':zones['result'][0].get('plan',{}).get('name'),'ssl':get(base+'settings/ssl')}
for label,path in [('pageRules','pagerules?per_page=100'),('rulesets','rulesets'),('workersRoutes','workers/routes'),('customHostnames','custom_hostnames?per_page=50')]:result[label]=get(base+path)
sets=result['rulesets'].get('result',[])
result['ruleDetails']=[{'id':r['id'],'phase':r.get('phase'),'data':get(base+'rulesets/'+r['id'])} for r in sets]
records=[];page=1
while True:
 body=get(base+'dns_records?per_page=100&page='+str(page))
 if body.get('unavailable'):result['dnsUnavailable']=body;break
 records+=body.get('result',[])
 if page>=body.get('result_info',{}).get('total_pages',1):break
 page+=1
# DNS TXT/email contents are not printed; fingerprints let the owner compare
# protected records before/after. DNS is never written by this program.
result['dns']=[{'type':r['type'],'name':r['name'],'proxied':r.get('proxied'),**({'address':r['content']} if r['type'] in ('A','AAAA','CNAME') else {}),'valueSha256':hashlib.sha256(r['content'].encode()).hexdigest()} for r in records]
fd=os.open(args.out,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:json.dump(safe(result),f,ensure_ascii=False,indent=2)
print('Yalnız okundu. Hiçbir ayar değiştirilmedi. Sonuç: '+args.out)
print('SSL modu: '+str(result['ssl'].get('result',{}).get('value','OKUNAMADI')))
print('unavailable alanı bulunan API izin/plan nedeniyle okunamadı; boş kural listesi sayılmaz.')
