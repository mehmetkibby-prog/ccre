#!/usr/bin/env python3
"""Read-only, deliberately redacted VDS preparation audit. No DB or secret output."""
import json,os,ssl,subprocess,urllib.request
from pathlib import Path

NEW='2d.coreoflife.net'
def read(p):return json.loads(Path(p).read_text())
def command(args):
 r=subprocess.run(args,capture_output=True,text=True,timeout=10)
 return r.stdout.strip() if r.returncode==0 else None
def local(url):
 with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(url,timeout=8) as r:return json.load(r)
def hosts(node):
 if isinstance(node,dict):
  for k,v in node.items():
   if k=='host' and isinstance(v,list):yield from v
   else:yield from hosts(v)
 elif isinstance(node,list):
  for v in node:yield from hosts(v)
def main():
 result={'audit':'R120_READONLY1','mutations':False,'cloudflareMode':'not available from VDS; inspect dashboard/API'}
 try:
  state=read('/var/lib/core511/state.json');root=Path(state['releaseRoot']);prior=state['prior']
  result['installedVersion']=state.get('r64Deployment',{}).get('version')
  cfgs={'r1':prior['newGameConfigFile'],'r2':state['r101']['realm2Config'],'accounts':prior.get('newAccountsConfigFile') or prior['accountsConfigFile']}
  result['services']={}
  for name,file in cfgs.items():
   c=read(file);e=c.get('environment',{})
   result['services'][name]={'hosts':c.get('hosts',[]),'origins':{k:e[k] for k in ('ALLOWED_ORIGINS','AUTH_PUBLIC_ORIGIN','REALTIME_PUBLIC_URL','REALTIME_SOCKET_URL') if k in e}}
  for unit in ('coreoflife-rt-r1.service','coreoflife-rt-r2.service','coreoflife-forum.service'):
   pid=command(['systemctl','show',unit,'-p','MainPID','--value']);values={}
   if pid and pid.isdigit() and int(pid)>1:
    env=Path('/proc',pid,'environ').read_bytes().split(b'\0')
    for item in env:
     k,_,v=item.partition(b'=')
     if k.decode(errors='replace') in ('ALLOWED_ORIGINS','FORUM_ORIGIN','FORUM_ALLOWED_ORIGINS','CORE_REALM_ID'):
      values[k.decode()]=v.decode(errors='replace')
   result['services'][unit]={'active':command(['systemctl','is-active',unit]),'origins':values,'environmentFiles':command(['systemctl','show',unit,'-p','EnvironmentFiles','--value'])}
  result['client']=read(root/'core511-source/scripts/core511/generated/native-client-proof.json')['name']
 except Exception as e:result['runtimeError']=type(e).__name__+': '+str(e)[:160]
 try:
  config=read('/etc/caddy/coreoflife-realms-417.json');current=local('http://127.0.0.1:2019/config/')
  result['caddy']={'fileMatchesRunning':config==current,'routes':[],'certificates':[]}
  for server in config.get('apps',{}).get('http',{}).get('servers',{}).values():
   for r in server.get('routes',[]):
    hs=sorted(set(hosts(r)))
    if set(hs)&{'coreoflife.net','www.coreoflife.net',NEW}:
     result['caddy']['routes'].append({'id':r.get('@id'),'hosts':hs,'paths':[x for m in r.get('match',[]) for x in m.get('path',[])]})
  certs=config.get('apps',{}).get('tls',{}).get('certificates',{}).get('load_files',[])
  for row in certs:
   p=row.get('certificate')
   if not p:continue
   decoded=ssl._ssl._test_decode_cert(p)
   names=[v for k,v in decoded.get('subjectAltName',[]) if k=='DNS']
   result['caddy']['certificates'].append({'certificateFile':p,'dnsNames':names,'expires':decoded.get('notAfter'),'covers2d':NEW in names or '*.coreoflife.net' in names})
  result['caddy']['automationConfigured']=bool(config.get('apps',{}).get('tls',{}).get('automation'))
 except Exception as e:result['caddyError']=type(e).__name__+': '+str(e)[:160]
 print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
