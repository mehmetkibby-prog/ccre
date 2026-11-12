#!/usr/bin/env python3
"""Install the marketing/preregistration pages and a native scheduled opening.

Existing account, SSO and game handlers remain intact. Launch settings are saved
through the existing authenticated single-writer maintenance API, never SQLite.
"""
import argparse,copy,fcntl,hashlib,json,os,re,shutil,subprocess,sys,tempfile,time,urllib.request,urllib.error,zipfile
from pathlib import Path

HOSTS={'coreoflife.net','www.coreoflife.net'}
ACCOUNT_HOST='accounts.coreoflife.net'
LEGACY_IDS={'col-marketing-assets-v1','col-marketing-pages-v1'}
ROUTE_IDS={'col-marketing-assets-v2','col-marketing-pages-v2','col-prereg-pages-v2','col-prereg-redirect-v2','col-launch-status-v2'}
ALL_ROUTE_IDS=ROUTE_IDS|LEGACY_IDS
OPENING='2026-10-30T20:00:00+03:00'
CSP="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; object-src 'none'"
PREREG_CSP=CSP.replace("img-src 'self'", "img-src 'self' data:")

def require(condition,message):
    if not condition:raise RuntimeError(message)
def sha(data):return hashlib.sha256(data).hexdigest()
def read_json(path):return json.loads(Path(path).read_bytes())
def atomic(path,data,mode=0o600):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    previous=path.stat() if path.exists() else None
    fd,tmp=tempfile.mkstemp(prefix='.col-site-',dir=path.parent)
    try:
        os.fchmod(fd,mode)
        if previous:os.fchown(fd,previous.st_uid,previous.st_gid)
        with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
def json_bytes(value):return (json.dumps(value,indent=2,ensure_ascii=False)+'\n').encode()
def api(admin,path='',data=None):
    # Local Caddy admin traffic must never go through an external HTTP proxy.
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    request=urllib.request.Request(admin+path,data=None if data is None else json_bytes(data),headers={'Content-Type':'application/json'})
    with opener.open(request,timeout=20) as response:
        body=response.read(16*1024*1024)
        return json.loads(body) if body else None
def host_redirect(route):
    matches=route.get('match',[])
    if len(matches)!=1 or set(matches[0])!={'host'}:return False
    if set(matches[0]['host'])!=HOSTS:return False
    def responses(obj):
        if isinstance(obj,dict):
            if obj.get('handler')=='static_response':yield obj
            for value in obj.values():yield from responses(value)
        elif isinstance(obj,list):
            for value in obj:yield from responses(value)
    for response in responses(route):
        location=response.get('headers',{}).get('Location',[])
        if str(response.get('status_code')) in {'302','307','308','301'} and any(re.match(r'^https://accounts\.coreoflife\.net(?:$|/|\?|\{http\.request\.uri\})',str(s)) for s in location):return True
    return False
def legacy_routes(root):
    common={'X-Content-Type-Options':['nosniff'],'Referrer-Policy':['strict-origin-when-cross-origin'],'Permissions-Policy':['camera=(), microphone=(), geolocation=()']}
    def route(name,paths,cache,html):
        headers={**common,'Cache-Control':[cache]}
        if html:headers['Content-Security-Policy']=[CSP]
        return {'@id':name,'match':[{'host':sorted(HOSTS),'path':paths,'method':['GET','HEAD']}],'handle':[{'handler':'headers','response':{'set':headers}},{'handler':'encode','encodings':{'gzip':{}},'prefer':['gzip']},{'handler':'file_server','root':str(root),'index_names':['index.html']}],'terminal':True}
    return [route('col-marketing-assets-v1',['/col-site/*'],'public, max-age=31536000, immutable',False),route('col-marketing-pages-v1',['/','/index.html','/favicon.svg','/robots.txt','/sitemap.xml'],'no-cache',True)]
def account_proxy(config):
    found=[]
    for server in config.get('apps',{}).get('http',{}).get('servers',{}).values():
        for route in server.get('routes',[]):
            if route.get('@id') in ALL_ROUTE_IDS:continue
            if any(m.get('host')==[ACCOUNT_HOST] and set(m)=={'host'} for m in route.get('match',[])):
                def walk(value):
                    if isinstance(value,dict):
                        if value.get('handler')=='reverse_proxy':found.append(copy.deepcopy(value))
                        else:
                            for v in value.values():walk(v)
                    elif isinstance(value,list):
                        for v in value:walk(v)
                walk(route.get('handle',[]))
    require(len(found)==1,'Expected one existing accounts reverse proxy; refusing to guess the account service address.')
    proxy=found[0]
    require(proxy.get('upstreams'),'Account proxy has no configured upstream.')
    request=proxy.setdefault('headers',{}).setdefault('request',{})
    request.setdefault('set',{})['Host']=[ACCOUNT_HOST]
    request['delete']=list(dict.fromkeys(request.get('delete',[])+['Cookie','Authorization']))
    return proxy
def new_routes(root,proxy):
    common={'X-Content-Type-Options':['nosniff'],'Referrer-Policy':['strict-origin-when-cross-origin'],'Permissions-Policy':['camera=(), microphone=(), geolocation=()']}
    def static(name,hosts,paths,cache,html=False,rewrite=None,extra=None):
        headers={**common,'Cache-Control':[cache]}
        if html:headers['Content-Security-Policy']=[CSP]
        match={'host':hosts,'path':paths,'method':['GET','HEAD'],**(extra or {})}
        handlers=[{'handler':'headers','response':{'set':headers}},{'handler':'encode','encodings':{'gzip':{}},'prefer':['gzip']}]
        if rewrite:handlers.append({'handler':'rewrite','uri':rewrite})
        handlers.append({'handler':'file_server','root':str(root),'index_names':['index.html']})
        return {'@id':name,'match':[match],'handle':handlers,'terminal':True}
    assets=static('col-marketing-assets-v2',sorted(HOSTS|{ACCOUNT_HOST}),['/col-site/*'],'public, max-age=31536000, immutable')
    pages=static('col-marketing-pages-v2',sorted(HOSTS),['/','/index.html','/favicon.svg','/robots.txt','/sitemap.xml'],'no-cache',True)
    prereg=static('col-prereg-pages-v2',[ACCOUNT_HOST],['/on-kayit','/on-kayit/'],'no-store',True,'/prereg.html')
    prereg['handle'][0]['response']['set']['Content-Security-Policy']=[PREREG_CSP]
    # Root query requests belong to the native SSO/logout/admin portal.
    prereg['match'].append({'host':[ACCOUNT_HOST],'path':['/'],'method':['GET','HEAD'],'expression':"{http.request.uri.query} == ''"})
    redirect={'@id':'col-prereg-redirect-v2','match':[{'host':sorted(HOSTS),'path':['/on-kayit','/on-kayit/'],'method':['GET','HEAD']}],'handle':[{'handler':'static_response','status_code':302,'headers':{'Location':['https://accounts.coreoflife.net/on-kayit'],'Cache-Control':['no-store']}}],'terminal':True}
    status={'@id':'col-launch-status-v2','match':[{'host':sorted(HOSTS|{ACCOUNT_HOST}),'path':['/api/site-launch'],'method':['GET','HEAD']}],'handle':[{'handler':'headers','response':{'set':{'Cache-Control':['no-store'],'X-Content-Type-Options':['nosniff']}}},{'handler':'rewrite','uri':'/api/launch'},proxy],'terminal':True}
    return [assets,pages,prereg,redirect,status]
def transform(config,root):
    result=copy.deepcopy(config);targets=[];proxy=account_proxy(config)
    servers=result.get('apps',{}).get('http',{}).get('servers',{})
    for key,server in servers.items():
        routes=server.get('routes',[])
        old=[r for r in routes if r.get('@id') in ALL_ROUTE_IDS]
        if old:
            expected=legacy_routes(root) if {r.get('@id') for r in old}==LEGACY_IDS else new_routes(root,proxy)
            require(old==expected,'Existing site routes were modified; refusing to overwrite unknown changes.')
            routes[:]=[r for r in routes if r.get('@id') not in ALL_ROUTE_IDS]
        indexes=[i for i,r in enumerate(routes) if host_redirect(r)]
        if indexes:
            require(len(indexes)==1,'Multiple apex redirect routes; no changes made.')
            require(any(any(m.get('host')==[ACCOUNT_HOST] for m in r.get('match',[])) for r in routes),'Account and apex routes must share the same server.')
            routes[0:0]=new_routes(root,proxy);targets.append(key)
    require(len(targets)==1,'Expected exactly one existing apex redirect to accounts.coreoflife.net; no changes made.')
    # Removal of our routes must preserve every unrelated configuration value.
    check=copy.deepcopy(result)
    original=copy.deepcopy(config)
    for snapshot in [check,original]:
        for server in snapshot['apps']['http']['servers'].values():server['routes']=[r for r in server.get('routes',[]) if r.get('@id') not in ALL_ROUTE_IDS]
    require(check==original,'Unrelated Caddy configuration would change.')
    return result,targets[0]
def select_link(path,target):
    path=Path(path)
    require(not path.exists() or path.is_symlink(),'Current site path is not a symlink; refusing to replace it.')
    next_path=path.with_name('.current-'+str(os.getpid()))
    if next_path.is_symlink():next_path.unlink()
    os.symlink(str(target),next_path);os.replace(next_path,path)
def validate(caddy,config):
    run=subprocess.run([caddy,'validate','--config',str(config)],capture_output=True,text=True)
    require(run.returncode==0,'Caddy configuration validation failed; live configuration was not changed.')
def payload(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        manifest=json.loads(z.read('BUILD.json'))
        require(re.fullmatch(r'20261026-[0-9a-f]{12}',manifest['release']) is not None,'Invalid release identifier.')
        for name,meta in manifest['files'].items():
            p=Path(name);require(not p.is_absolute() and '..' not in p.parts,'Invalid archive path.')
            data=z.read('site/'+name);require(len(data)==meta['bytes'] and sha(data)==meta['sha256'],'Archive integrity failure: '+name)
        helper=z.read('launch-config.mjs');meta=manifest['launchHelper']
        require(len(helper)==meta['bytes'] and sha(helper)==meta['sha256'],'Launch helper integrity failure.')
        require(manifest.get('opening')==OPENING,'Opening date mismatch.')
        return manifest
def launch_command(args,action,helper,receipt=None):
    state=read_json(args.game_state)
    require(state.get('installed') is True,'Existing CORE511 installation is required for the opening schedule.')
    release=Path(state['releaseRoot']).resolve()
    require(str(release).startswith('/opt/core511/releases/'),'Unrecognized game release root.')
    node=release/'bin/node';require(node.is_file(),'Installed game Node executable is missing.')
    command=[str(node),str(helper),'--'+action,'--state',args.game_state,'--opens-at',OPENING]
    if receipt:command+=['--receipt',str(receipt)]
    run=subprocess.run(command,capture_output=True,text=True,timeout=120)
    if run.returncode:
        try:detail=json.loads(run.stderr.strip().splitlines()[-1]).get('error','launch_operation_failed')
        except (ValueError,IndexError):detail='launch_operation_failed'
        raise RuntimeError('Opening schedule: '+detail+'. No account data was migrated.')
    return json.loads(run.stdout)
def write_helper(archive,destination):
    with zipfile.ZipFile(archive) as z:atomic(destination,z.read('launch-config.mjs'))
def retain_assets(previous,release,root):
    if not previous:return
    source=Path(previous).resolve()
    require(source.is_relative_to(root/'releases'),'Previous site release is outside the managed directory.')
    old=source/'col-site'
    if old.is_dir():
        for folder in old.iterdir():
            require(folder.is_dir() and not folder.is_symlink() and re.fullmatch(r'20261026-[0-9a-f]{12}',folder.name),'Unknown previous asset directory.')
            target=release/'col-site'/folder.name
            if not target.exists():shutil.copytree(folder,target,symlinks=False)
def extract(zip_path,manifest,destination):
    if destination.exists():
        require(destination.is_dir() and not destination.is_symlink(),'Release destination is not a managed directory.')
        for name,meta in manifest['files'].items():
            f=destination/name
            require(f.is_file() and not f.is_symlink() and f.stat().st_size==meta['bytes'] and sha(f.read_bytes())==meta['sha256'],'Existing release integrity failure: '+name)
        return
    destination.mkdir(parents=True,mode=0o755)
    with zipfile.ZipFile(zip_path) as z:
        for name,meta in manifest['files'].items():
            f=destination/name;f.parent.mkdir(parents=True,exist_ok=True)
            for parent in [f.parent,*f.parents]:
                if parent==destination.parent:break
                os.chmod(parent,0o755)
            atomic(f,z.read('site/'+name),0o644)
def current_admin(args):
    require(re.fullmatch(r'http://127\.0\.0\.1:\d+',args.admin) is not None,'Admin endpoint must be loopback HTTP.')
    return api(args.admin,'/config/')
def main(argv=None,archive=None):
    p=argparse.ArgumentParser(description='Core of Life professional website installer')
    action=p.add_mutually_exclusive_group(required=True)
    for flag in ['check','apply','rollback-latest','status']:action.add_argument('--'+flag,action='store_true')
    p.add_argument('--config',default='/etc/caddy/coreoflife-realms-417.json',help='Existing active JSON configuration file')
    p.add_argument('--site-root',default='/opt/coreoflife-site')
    p.add_argument('--state-root',default='/var/lib/coreoflife-site')
    p.add_argument('--admin',default='http://127.0.0.1:2019')
    p.add_argument('--caddy',default='caddy')
    p.add_argument('--game-state',default='/var/lib/core511/state.json',help='Existing CORE511 installer state; no database is edited directly')
    p.add_argument('--archive',default=archive)
    args=p.parse_args(argv);config_file=Path(args.config).resolve();root=Path(args.site_root).resolve();state_root=Path(args.state_root).resolve()
    require(root!=Path('/') and state_root!=Path('/') and root!=state_root,'Unsafe output path.')
    require(root!=config_file and state_root!=config_file,'Invalid configuration path.')
    require(config_file.is_file(),'Active Caddy JSON configuration not found: '+str(config_file))
    active=current_admin(args);disk=read_json(config_file)
    require(active==disk,'Active Caddy configuration differs from its disk file. Refusing to overwrite pending changes.')
    if args.status:
        installed=any(r.get('@id') in ALL_ROUTE_IDS for s in active.get('apps',{}).get('http',{}).get('servers',{}).values() for r in s.get('routes',[]))
        result={'installed':installed,'siteRoot':str(root),'config':str(config_file),'opening':OPENING}
        if (state_root/'latest.json').is_file():
            current=read_json(state_root/'latest.json');result['installationStatus']=current.get('status')
            helper=Path(current.get('backup',''))/'launch-config.mjs'
            if helper.is_file():result['launch']=launch_command(args,'status',helper)
        print(json.dumps(result,ensure_ascii=False));return
    if args.check or args.apply:
        require(args.archive,'Installer archive required.');manifest=payload(args.archive)
        planned,server_name=transform(active,root/'current')
        with tempfile.TemporaryDirectory(prefix='col-site-check-') as temp:
            stage=Path(temp)/'caddy.json';stage.write_bytes(json_bytes(planned));validate(args.caddy,stage)
            helper=Path(temp)/'launch-config.mjs';write_helper(args.archive,helper)
            launch_command(args,'check',helper)
        print('CHECK OK: '+manifest['release']+'; website + existing-account preregistration + scheduled opening '+OPENING+'.')
        if args.check:return
    require(os.geteuid()==0 or os.environ.get('COL_SITE_LOCAL_TEST')=='1','Run installation/rollback as root.')
    state_root.mkdir(parents=True,exist_ok=True,mode=0o700);os.chmod(state_root,0o700)
    with open(state_root/'install.lock','a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        require(current_admin(args)==active and read_json(config_file)==disk,'Configuration changed during preparation; retry after review.')
        if args.rollback_latest:
            receipt=read_json(state_root/'latest.json')
            require(receipt.get('status') in {'applied','prepared','failed_recovery_required'},'No website installation is available for rollback.')
            require(receipt['configFile']==str(config_file),'Rollback configuration path mismatch.')
            require(receipt.get('siteRoot')==str(root) and receipt.get('gameState')==str(Path(args.game_state).resolve()),'Rollback site root or game state differs from the installation receipt.')
            backup=Path(receipt['backup']);expected=read_json(backup/'after.json');before=read_json(backup/'before.json')
            require(active in [expected,before],'Caddy configuration changed after installation. Automatic rollback refused to preserve later changes.')
            validate(args.caddy,backup/'before.json')
            if (backup/'launch.json').is_file():launch_command(args,'rollback',backup/'launch-config.mjs',backup/'launch.json')
            try:
                api(args.admin,'/load',before);atomic(config_file,(backup/'before-file.json').read_bytes(),receipt['configMode'])
                require(current_admin(args)==before,'Rollback verification failed.')
            except Exception:
                api(args.admin,'/load',expected);atomic(config_file,json_bytes(expected),receipt['configMode']);raise
            link=root/'current'
            if receipt['previousLink']:select_link(link,receipt['previousLink'])
            elif link.is_symlink():link.unlink()
            receipt['status']='rolled_back';atomic(state_root/'latest.json',json_bytes(receipt));print('ROLLBACK OK: previous site and opening policy restored; current accounts and player data retained.');return
        previous_link=str((root/'current').resolve()) if (root/'current').is_symlink() else None
        require(not (root/'current').exists() or (root/'current').is_symlink(),'Refusing to replace a non-symlink current directory.')
        if (state_root/'latest.json').is_file():
            last=read_json(state_root/'latest.json')
            require(last.get('status') not in {'prepared','failed_recovery_required'},'An unfinished installation needs --rollback-latest before another installation.')
            if last.get('status')=='applied' and last.get('release')==manifest['release'] and active==planned:
                require(previous_link==str(root/'releases'/manifest['release']),'Current site link differs from the installed release.')
                extract(args.archive,manifest,Path(previous_link))
                status=launch_command(args,'status',Path(last['backup'])/'launch-config.mjs')
                expected_ms=1793379600000
                require(all(status[k].get('publicOpeningAt')==expected_ms and status[k].get('mode')=='scheduled' and status[k].get('enabled') is True for k in ['accounts','game']),'Site installed but opening settings changed; inspect --status.')
                print('APPLY OK: this release and scheduled opening are already installed.');return
        root.mkdir(parents=True,exist_ok=True,mode=0o755);os.chmod(root,0o755)
        release=root/'releases'/manifest['release'];extract(args.archive,manifest,release)
        retain_assets(previous_link,release,root)
        os.chmod(root/'releases',0o755)
        (state_root/'backups').mkdir(parents=True,exist_ok=True,mode=0o700)
        backup=Path(tempfile.mkdtemp(prefix=time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+manifest['release']+'-',dir=state_root/'backups'))
        mode=config_file.stat().st_mode&0o777
        atomic(backup/'before.json',json_bytes(active));atomic(backup/'before-file.json',config_file.read_bytes());atomic(backup/'after.json',json_bytes(planned))
        write_helper(args.archive,backup/'launch-config.mjs')
        receipt={'status':'prepared','release':manifest['release'],'configFile':str(config_file),'configMode':mode,'backup':str(backup),'previousLink':previous_link,'server':server_name,'siteRoot':str(root),'gameState':str(Path(args.game_state).resolve())}
        atomic(state_root/'latest.json',json_bytes(receipt))
        try:
            launch_command(args,'apply',backup/'launch-config.mjs',backup/'launch.json')
            select_link(root/'current',release);api(args.admin,'/load',planned)
            atomic(config_file,json_bytes(planned),mode)
            require(current_admin(args)==planned,'Loaded configuration does not match the prepared website routes.')
        except Exception as original_error:
            # Caddy validates before loading; also recover from a failed disk write.
            failures=[]
            if (backup/'launch.json').is_file():
                try:launch_command(args,'rollback',backup/'launch-config.mjs',backup/'launch.json')
                except Exception as error:failures.append(str(error))
            try:api(args.admin,'/load',active);atomic(config_file,(backup/'before-file.json').read_bytes(),mode)
            except Exception as error:failures.append(str(error))
            if previous_link:select_link(root/'current',previous_link)
            elif (root/'current').is_symlink():(root/'current').unlink()
            receipt['status']='failed_recovery_required' if failures else 'failed_reverted';atomic(state_root/'latest.json',json_bytes(receipt))
            if failures:raise RuntimeError(str(original_error)+'; recovery needs review: '+'; '.join(failures)) from original_error
            raise
        receipt['status']='applied';atomic(state_root/'latest.json',json_bytes(receipt))
        print('APPLY OK: https://coreoflife.net/ — website and preregistration installed; opening scheduled for 30 October 2026, 20:00 Türkiye. Caddy reloaded; game/account processes were not restarted.')

if __name__=='__main__':
    try:main()
    except (RuntimeError,OSError,ValueError,KeyError,zipfile.BadZipFile) as error:
        print('STOP: '+str(error),file=sys.stderr);sys.exit(1)
