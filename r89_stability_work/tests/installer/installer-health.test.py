import contextlib,copy,fcntl,importlib.util,json,os,sqlite3,sys,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('installer_fixture',Path(__file__).with_name('installer-fixture.py'));F=importlib.util.module_from_spec(spec);spec.loader.exec_module(F)
I,S,R=F.I,F.S,F.R

class HealthVersionGateTests(unittest.TestCase):
 def test_r89_health_requires_own_version_and_available_diagnostics_but_r86_does_not(self):
  live=I.Live.__new__(I.Live);live.port=19999;live.config={'realm':{'dbIdentity':'fixture'}};live.empty=lambda:None
  health={'kernel511':{'ready':True},'durable':True,'realm':{'dbIdentity':'fixture'},'channelProcesses':{'channels':[{'channel':n,'ready':True,'capacity':25,'online':0} for n in range(1,5)]},'checkpointR79':{'ready':True,'nodeVersion':R.VERSIONS['node'],'sqliteVersion':R.VERSIONS['sqlite']}}
  with patch.object(I.old,'local',side_effect=lambda *args:copy.deepcopy(health)):
   live.state={'r64Deployment':{'version':I.SOURCE_VERSION}};live.health()
   live.state={'r64Deployment':{'version':I.VERSION}}
   with self.assertRaisesRegex(RuntimeError,'R89 çalışma zamanı'):live.health()
   health['updateVersion']=I.VERSION;health['runtimeDiagnosticsR80']={'protocol':'runtime-diagnostics-r80-v1','available':False}
   with self.assertRaisesRegex(RuntimeError,'R89 çalışma zamanı'):live.health()
   health['runtimeDiagnosticsR80']['available']=True;health['updateVersion']=I.SOURCE_VERSION
   with self.assertRaisesRegex(RuntimeError,'R89 çalışma zamanı'):live.health()
   health['updateVersion']=I.VERSION;live.health()
   health['checkpointR79']['ready']=False
   with self.assertRaisesRegex(RuntimeError,'kayıt işçisi'):live.health()

if __name__=="__main__":unittest.main(verbosity=2)
