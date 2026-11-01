// Render-only, no service execution. Runtime credentials are written only to
// the target installation, never source control or downloadable review ZIPs.
export function renderRealmDeployment(manifest,configs,{releaseRoot='/opt/coreoflife-realms/current',dataRoot}={}) {
 const units={};
 const unit=(name,user,command,env,writable,memory)=>`[Unit]\nDescription=Core of Life ${name}\nAfter=network.target\n\n[Service]\nUser=${user}\nGroup=${user}\nWorkingDirectory=${releaseRoot}\nExecStart=/usr/bin/node ${command}\n${env.map(([k,v])=>`Environment="${k}=${v}"`).join('\n')}\nRestart=on-failure\nRestartSec=3\nTimeoutStopSec=45\nKillMode=control-group\nUMask=0077\nNoNewPrivileges=true\nPrivateTmp=true\nProtectHome=true\nProtectSystem=strict\nReadWritePaths=${writable}\nMemoryMax=${memory}\n\n[Install]\nWantedBy=multi-user.target\n`;
 units['coreoflife-accounts.service']=unit('accounts','col-accounts','vds-server/src/accounts-app.mjs',[
  ['CORE_CONFIG_FILE',dataRoot+'/accounts/config.json']],dataRoot+'/accounts','384M');
 for(const realm of manifest.realms){
  const user='col-'+realm.id,env=Object.entries({CORE_DATA_ROOT:realm.dataRoot,CORE_APP_PORT:realm.ports.app,CORE_PROXY_PORT:realm.ports.proxy,CORE_REALM_ID:realm.id});
  units[`coreoflife-${realm.id}.service`]=unit(realm.name,user,'vds-server/src/server.mjs',env,realm.dataRoot,'1152M').replace('Restart=on-failure',`EnvironmentFile=-${realm.dataRoot}/runtime.env\nRestart=on-failure`);
  units[`coreoflife-rt-${realm.id}.service`]=unit('realtime '+realm.id,user,'realtime-server/src/server.mjs',[],realm.dataRoot,'192M').replace('Restart=on-failure',`EnvironmentFile=${realm.dataRoot}/realtime.env\nRestart=on-failure`);
 }
 const backups=[{id:'accounts',dataRoot:dataRoot+'/accounts',config:dataRoot+'/accounts/config.json'},...manifest.realms.map(r=>({id:r.id,dataRoot:r.dataRoot,config:r.dataRoot+'/jobs/realm/config.json'}))];
 for(const [index,b] of backups.entries()){
  const name=`coreoflife-${b.id}-backup`;
  units[name+'.service']=`[Unit]\nDescription=Core of Life verified ${b.id} backup\nConditionPathExists=${b.config}\n\n[Service]\nType=oneshot\nUser=col-${b.id}\nGroup=col-${b.id}\nWorkingDirectory=${releaseRoot}\nExecStart=/usr/bin/node vds-server/src/backup.mjs\nEnvironment="CORE_DATA_ROOT=${b.dataRoot}"\nEnvironment="CORE_CONFIG_FILE=${b.config}"\nNice=10\nIOSchedulingClass=idle\nTimeoutStartSec=15min\nUMask=0077\nPrivateTmp=true\nNoNewPrivileges=true\nProtectSystem=strict\nReadWritePaths=${b.dataRoot}\n`;
  units[name+'.timer']=`[Unit]\nDescription=Core of Life scheduled ${b.id} backups\n\n[Timer]\nOnCalendar=*-*-* 00,06,12,18:${String(15+index*5).padStart(2,'0')}:00\nPersistent=true\nUnit=${name}.service\n\n[Install]\nWantedBy=timers.target\n`;
 }
 const authHost=new URL(manifest.authOrigin).host;
 let caddy=`${authHost} {\n @private path /api/realm/internal\n respond @private 404\n reverse_proxy 127.0.0.1:${manifest.authPort} {\n  header_up CF-Connecting-IP {http.request.remote.host}\n  header_up -X-Real-IP\n  header_up Host ${authHost}\n  header_up X-Forwarded-Host ${authHost}\n  header_up X-Forwarded-Proto https\n }\n}\n`;
 for(const r of manifest.realms){
  const host=new URL(r.origin).host,rt=new URL(r.realtimeOrigin).host,c=configs.get(r.id);
  caddy+=`${host} {\n route {\n @private path /api/realm/internal /internal/* /_game/*\n respond @private 404\n rewrite * /_game{uri}\n reverse_proxy 127.0.0.1:${r.ports.proxy} {\n  header_up X-Col-Proxy-Token ${c.proxyToken}\n  header_up X-Col-Public-Host ${host}\n  header_up X-Col-Client-IP {http.request.remote.host}\n }\n }\n}\n`;
  caddy+=`${rt} {\n @socket path /ws /healthz /readyz\n handle @socket {\n  reverse_proxy 127.0.0.1:${r.ports.realtime} {\n   header_up X-Real-IP {http.request.remote.host}\n   header_up -X-Forwarded-For\n  }\n }\n handle /dungeon-ws {\n  reverse_proxy 127.0.0.1:${r.ports.dungeon}\n }\n handle_path /voice/* {\n  reverse_proxy 127.0.0.1:${r.ports.dungeon+1}\n }\n handle {\n  respond 404\n }\n}\n`;
 }
 return {units,caddy};
}
