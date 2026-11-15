"""Probe diagnostics preserve HTTP errors, do not follow redirects or expose secrets."""
import email.message,io,json,sys,unittest,urllib.error,urllib.request
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'deployment/modules'))
import public_probe as p
class Probe(unittest.TestCase):
 def response(self,status,body=b'Core of Life',headers=None):
  h=email.message.Message()
  for key,value in (headers or {}).items():h[key]=value
  return urllib.error.HTTPError(p.ORIGIN+'/',status,'synthetic',h,io.BytesIO(body))
 def check(self,value,raise_error=False):
  with patch.object(p.urllib.request,'build_opener') as create:
   opener=create.return_value
   if raise_error:opener.open.side_effect=value
   else:opener.open.return_value=value
   result=p.probe();self.assertIsInstance(create.call_args.args[0],p.NoRedirect)
   request=opener.open.call_args.args[0];self.assertEqual(request.full_url,p.ORIGIN+'/');self.assertNotIn('Authorization',request.headers);self.assertNotIn('Cookie',request.headers)
  return result
 def test_403_challenge_report_includes_ray_without_cookies_body_or_tokens(self):
  result=self.check(self.response(403,b'private-body',{'Server':'cloudflare','CF-Ray':'example-AMS','CF-Mitigated':'challenge','Set-Cookie':'secret=token'}),True)
  self.assertFalse(result['ok']);self.assertEqual(result['status'],403);self.assertEqual(result['headers']['CF-Ray'],'example-AMS');self.assertEqual(result['headers']['CF-Mitigated'],'challenge')
  self.assertNotIn('secret',json.dumps(result));self.assertNotIn('private-body',json.dumps(result))
 def test_redirect_is_rejected_and_query_credentials_not_printed(self):
  result=self.check(self.response(302,headers={'Location':'https://user:secret@coreoflife.net/game?token=private#secret'}),True)
  self.assertEqual(result['redirect'],{'scheme':'https','host':'coreoflife.net','path':'/game'});self.assertFalse(result['ok']);self.assertIsNone(p.NoRedirect().redirect_request(None,None,302,'',{},'https://coreoflife.net'))
 def test_525_is_retained_as_http_status(self):
  result=self.check(self.response(525,headers={'Server':'cloudflare'}),True);self.assertEqual(result['status'],525);self.assertFalse(result['ok'])
 def test_network_error_is_not_success_and_does_not_expose_proxy_credentials(self):
  result=self.check(urllib.error.URLError('https://user:secret@proxy'),True);self.assertFalse(result['ok']);self.assertEqual(result['errorType'],'URLError');self.assertNotIn('secret',json.dumps(result))
 def test_valid_homepage_success_but_unrelated_200_is_rejected(self):
  self.assertTrue(self.check(self.response(200))['ok']);self.assertFalse(self.check(self.response(200,b'other app'))['ok'])
 def test_challenge_is_not_reported_as_ready_even_with_200_and_brand(self):
  self.assertFalse(self.check(self.response(200,headers={'CF-Mitigated':'challenge'}))['ok'])
if __name__=='__main__':unittest.main()
