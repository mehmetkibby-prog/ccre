#!/usr/bin/env python3
"""Inspect listeners and public TLS certificates. Never changes Caddy/services/DNS.

No certificate verification is inferred from the inspection handshake. An
omitted Caddy automation block is NOT proof that automatic HTTPS is disabled.
"""
import json,socket,ssl,tempfile,urllib.request
from pathlib import Path

HOSTS=('coreoflife.net','2d.coreoflife.net')
FILE=Path('/etc/caddy/coreoflife-realms-417.json')

def tls(host,port=443):
 result={'host':host,'port':port,'inspectionOnly':True}
 try:
  # Inspect only the public leaf certificate served locally, including an
  # Origin CA certificate. This does not disable verification for any service
  # and is deliberately not a trusted-HTTPS or readiness assertion.
  context=ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
  context.check_hostname=False;context.verify_mode=ssl.CERT_NONE
  with socket.create_connection(('127.0.0.1',port),timeout=4) as raw:
   with context.wrap_socket(raw,server_hostname=host) as connection:
    der=connection.getpeercert(binary_form=True);result['tls']=connection.version()
  with tempfile.TemporaryDirectory(prefix='col-public-cert-') as folder:
   public=Path(folder)/'leaf.pem';public.write_text(ssl.DER_cert_to_PEM_cert(der))
   cert=ssl._ssl._test_decode_cert(str(public))
  result.update(names=[v for k,v in cert.get('subjectAltName',[]) if k=='DNS'],expires=cert.get('notAfter'))
 except (OSError,ValueError) as e:result['error']=str(e)[:160]
 return result

def inspect(config):
 servers=[]
 for name,s in config.get('apps',{}).get('http',{}).get('servers',{}).items():
  auto=s.get('automatic_https',{})
  hosts=sorted({h for r in s.get('routes',[]) for m in r.get('match',[]) for h in m.get('host',[]) if h in HOSTS})
  servers.append({'server':name,'listen':s.get('listen',[]),'httpsDisabled':auto.get('disable',False),'certAutomationDisabled':auto.get('disable_certificates',False),'tlsPolicies':len(s.get('tls_connection_policies',[])),'targetHosts':hosts})
 return servers

def main():
 print('R120 TLS KONTROL: ayar/servis/DNS degistirilmez.')
 try:
  config=json.loads(FILE.read_text())
  opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
  try:
   with opener.open('http://127.0.0.1:2019/config/',timeout=5) as r:running=json.load(r)
   print('Dosya/calisan ayar esit:',config==running);config=running
  except Exception as e:print('Calisan Caddy okunamadi:',type(e).__name__)
  for row in inspect(config):print(json.dumps(row,ensure_ascii=False,separators=(',',':')))
  print('TLS yukleyici turleri:',','.join(config.get('apps',{}).get('tls',{}).get('certificates',{}).keys()) or '(varsayilan/elle yukleme yok)')
 except (OSError,ValueError) as e:print('Caddy dosyasi:',str(e)[:140])
 for host in HOSTS:print(json.dumps(tls(host),ensure_ascii=False,separators=(',',':')))
 print('Cloudflare SSL modu: panel/API gerekli; bu kontrolden anlasilmaz.')

if __name__=='__main__':main()
