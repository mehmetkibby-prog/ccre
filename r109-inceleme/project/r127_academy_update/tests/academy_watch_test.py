import sys,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'deployment/modules'))
import academy_watch as watch

class LaunchObservation(unittest.TestCase):
 def setUp(self):
  self.realm=dict(id='r2',ports=dict(app=2,realtime=3),initialChannelCapacity=10,dbIdentity='r2-fixture')
  self.live=SimpleNamespace(manifest=dict(authPort=1,realms=[self.realm]))
  self.launch=dict(phase='waiting',automaticOpening=True,publicOpeningAt=1795194000000,canPlay=False,approvalRequired=False)
  self.game=dict(ok=True,realm=dict(dbIdentity='r2-fixture'),channelProcesses=dict(channels=[dict(channel=i,capacity=10,ready=True) for i in range(1,5)]))
  self.rt=dict(ok=True,realmId='r2',dbIdentity='r2-fixture')
  self.request=lambda port,endpoint:{1:self.launch,2:self.game,3:self.rt}[port]
  self.central=lambda live,id:dict(realm=dict(status=self.gate))
  self.gate='open'
 def test_health_checks_require_public_entry_its_four_channels_realtime_and_catalog(self):
  read=lambda:watch.status(self.live,self.central,self.request)
  self.assertFalse(read()['acik']);self.launch.update(phase='open',canPlay=True);self.assertTrue(read()['acik'])
  self.gate='maintenance';self.assertFalse(read()['acik']);self.gate='open'
  self.rt.update(dbIdentity='r1');self.assertFalse(read()['acik']);self.rt.update(dbIdentity='r2-fixture')
  self.game['channelProcesses']['channels'][3]['ready']=False;self.assertFalse(read()['acik'])
 def test_timer_uses_accounts_opening_and_persists_across_reboot_and_rollback(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);area=p/'observer';archive=p/'r127.zip';archive.write_bytes(b'fixture');system=p/'system';system.mkdir()
   seen=[]
   with patch.multiple(watch,AREA=area,PACKAGE=area/'observer.zip',SYSTEM=system):
    watch.install(self.live,archive,self.request,lambda:1795193700,lambda cmd,**kw:seen.append(cmd))
    self.assertEqual((area/'observer.zip').read_bytes(),b'fixture')
    unit=(system/(watch.UNIT+'.timer')).read_text();self.assertIn('2026-11-20 17:00:05 UTC',unit);self.assertIn('Persistent=true',unit)
    self.assertIn('--academy-open-check',(system/(watch.UNIT+'.service')).read_text())
    self.assertIn(['systemctl','restart',watch.UNIT+'.timer'],seen)
    watch.remove(lambda cmd,**kw:seen.append(cmd));self.assertFalse((area/'observer.zip').exists())
    self.assertFalse(list(system.iterdir()))
if __name__=='__main__':unittest.main(verbosity=2)
