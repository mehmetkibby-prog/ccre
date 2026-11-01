"""Assess the exact R89 candidate. A JSON integrity pass alone is insufficient."""
import hashlib,json,re
from pathlib import Path
from prepare_package import ROOT,PACKAGE,CORE,identity

def read(path):return json.loads(path.read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def assess():
 proof=read(ROOT/'evidence/package-plan.json');target=proof['targetCoreSHA256']
 plan=read(PACKAGE/'update.json');rows=[]
 for p in (ROOT/'working'/CORE).rglob('*'):
  if p.is_file():rows.append({'path':p.relative_to(ROOT/'working'/CORE).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
 assert identity(rows)==target
 names={'normal':'native-crowd-r89-refresh-forest-final-50.json','rune':'native-rune-r89-refresh-rune-final-50.json'}
 results={};pins=[]
 for kind,name in names.items():
  path=ROOT/'evidence'/name;d=read(path);actors=d['clientTransport']['actors']
  caps=sum(a['predictionCapEpisodes'] for a in actors);frames=sum(a['predictionLimitedFrames'] for a in actors);clipped=sum(a['predictionLimitedInputMs'] for a in actors)
  integrity=all([d['passed'],d['coreSHA256']==target,d['sourceUnchanged'],d['deliveryUnchanged'],not d['liveTouched'],d['players']==50,d['seconds']==180,d['durationMs']>=180000,len(actors)==50,not d['errors'],not d['faults'],d['unacknowledged']==0,d['runtimeCancelledInputCount']==0])
  performance=integrity and caps==0 and frames==0 and clipped==0 and d['commandLatencyMs']['p99']<=150 and all(a['remainingCommandQueue']==0 and not a['cancelledInputs'] for a in actors)
  results[kind]={'path':'evidence/'+name,'sha256':sha(path),'players':d['players'],'seconds':d['seconds'],'populationChannels':d['populationChannels'],'integrityPassed':integrity,'performancePassed':performance,'commands':d['commandLatencyMs'],'byAction':d['byAction'],'predictionCapEpisodes':caps,'predictionLimitedFrames':frames,'predictionLimitedInputMs':clipped,'runeDefeats':len(d.get('runeEconomy',{}).get('defeats',[])) if kind=='rune' else None,'faults':len(d['faults']),'errors':len(d['errors'])}
  pins.append({'path':'evidence/'+name,'sha256':sha(path)})
 midjoins=[]
 for name in ['native-midjoin-r89-refresh-midjoin-final-50.json','native-midjoin-r89-refresh-midjoin-confirm-50.json']:
  path=ROOT/'evidence'/name;d=read(path);actors=d['clientTransport']['actors'];m=d['midjoin']
  caps=sum(a['predictionCapEpisodes'] for a in actors);frames=sum(a['predictionLimitedFrames'] for a in actors)
  valid=all([d['passed'],d['coreSHA256']==target,d['sourceUnchanged'],d['deliveryUnchanged'],not d['liveTouched'],d['players']==50,d['seconds']==30,len(actors)==50,not d['errors'],not d['faults'],d['unacknowledged']==0,d['runtimeCancelledInputCount']==0,m['connected'],m['status']==200,m['establishedEconomyPassed'],m['lateEconomyPassed'],caps==0,frames==0])
  midjoins.append({'path':'evidence/'+name,'sha256':sha(path),'passed':valid,'commands':d['commandLatencyMs'],'byAction':d['byAction'],'predictionCapEpisodes':caps,'predictionLimitedFrames':frames,'joinReadyMs':m['readyOffsetMs']-m['requestOffsetMs'],'windows':m['establishedWindows']})
  pins.append({'path':'evidence/'+name,'sha256':sha(path)})
 # Retain the failed pre-final candidate: it triggered the additional worker
 # settings fix, and must not be represented as a zero-stall final result.
 priorPath=ROOT/'evidence/native-midjoin-r89-midjoin-final-50.json';prior=read(priorPath)
 priorCaps=sum(a['predictionCapEpisodes'] for a in prior['clientTransport']['actors']);assert priorCaps==5 and prior['coreSHA256']!=target
 pins.append({'path':str(priorPath.relative_to(ROOT)),'sha256':sha(priorPath)})
 tests=read(ROOT/'evidence/final-checks.json');assert tests['coreSHA256']==target
 for row in tests['logs']:
  assert sha(ROOT/row['path'])==row['sha256'];pins.append(row)
 installer=read(ROOT/'evidence/installer-final.json');assert installer['coreSHA256']==target
 for row in installer['modules']:assert sha(PACKAGE/'modules'/row['name'])==row['sha256']
 for row in installer['logs']:assert sha(ROOT/row['path'])==row['sha256'];pins.append(row)
 gate={'version':'R89_GAMEPLAY','sourceVersion':'R86_GAMEPLAY','coreSHA256':target,'assessmentKind':'local-native50-twochannels-forest180-rune180','liveDeploymentPerformed':False,'fullGameAcceptance':False,'performancePassed':all(r['performancePassed'] for r in results.values()) and all(r['passed'] for r in midjoins),'allRequiredChecksPassed':tests['passed'] and installer['passed'],'productionFiles':plan['files'],'runs':results,'midjoins':midjoins,'supersededTrial':{'coreSHA256':prior['coreSHA256'],'predictionCapEpisodes':priorCaps,'reason':'Pre-final cold reward burst; retained evidence, not final acceptance'},'tests':tests,'installer':installer,'evidencePins':pins,'limits':['Local native server and actual transport/prediction; 25 players per channel on two channels.','Arranged HP/targets and automatic potion charges; finite180s runs. Primary command p99 gate150ms; midjoin checks require intact economy and zero prediction clipping, with all latencies reported.','No live VDS, Caddy/TLS/WAN, full rendered browser FPS or every50-player boss/instance mixture.']}
 write(ROOT/'evidence/final-release-gate-r89.json',gate)
 print(json.dumps({k:v for k,v in gate.items() if k in ['coreSHA256','performancePassed','allRequiredChecksPassed','runs']},ensure_ascii=False,indent=2))
 return gate
if __name__=='__main__':assess()
