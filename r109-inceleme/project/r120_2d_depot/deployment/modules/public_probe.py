"""Read-only HTTPS probe. Do not follow redirects into the separate 3D site.

Only allowlisted headers/classifications are returned; no response body,
cookies, tokens, proxy credentials or query parameters are logged.
"""
import urllib.error,urllib.request
from urllib.parse import urlsplit

ORIGIN='https://2d.coreoflife.net'

class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):return None

def safe_location(value):
 try:
  u=urlsplit(value)
  return {'scheme':u.scheme,'host':u.hostname,'path':u.path[:200]}
 except ValueError:return {'invalid':True}

def probe():
 result={'hostname':'2d.coreoflife.net','ok':False}
 request=urllib.request.Request(ORIGIN+'/',headers={'User-Agent':'CoreOfLife-R120-Readiness/3','Accept':'text/html'})
 opener=urllib.request.build_opener(NoRedirect())
 try:
  try:response=opener.open(request,timeout=20)
  except urllib.error.HTTPError as error:response=error
  with response:
   result['status']=response.code
   result['headers']={key:response.headers[key][:200] for key in ('Server','CF-Ray','CF-Mitigated') if response.headers.get(key)}
   if response.headers.get('Location'):result['redirect']=safe_location(response.headers['Location'])
   body=response.read(2*1024*1024)
   result['ok']=response.code==200 and urlsplit(response.geturl()).hostname=='2d.coreoflife.net' and response.headers.get('CF-Mitigated','').lower()!='challenge' and (b'Core of Life' in body or b'CORE OF LIFE' in body)
 except (urllib.error.URLError,OSError,ValueError) as error:
  result['errorType']=type(error).__name__
  reason=getattr(error,'reason',error);result['reasonType']=type(reason).__name__
 return result

def describe(result):
 import json
 return json.dumps(result,ensure_ascii=False,separators=(',',':'))
