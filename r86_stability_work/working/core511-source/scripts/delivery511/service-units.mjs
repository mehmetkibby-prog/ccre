import path from 'node:path';
const safe=p=>{if(!path.isAbsolute(p)||!/^[A-Za-z0-9_./-]+$/.test(p))throw Error('unit_path');return p;};
export function canaryUnit({releaseRoot,root,parentNetns,user='col-r1',probe=false,cpus='0 1 2 3'}){
 for(const p of [releaseRoot,root])safe(p);
 if(!/^net:\[\d+\]$/.test(parentNetns)||!/^col-[a-z0-9-]+$/.test(user)||!/^\d+(?: \d+){3}$/.test(cpus))throw Error('unit_identity');
 return `[Unit]
Description=Core511 isolated ${probe?'isolation probe':'100 WebSocket canary'}
[Service]
Type=exec
User=${user}
Group=${user}
WorkingDirectory=${releaseRoot}/core511-source
ExecStart=${releaseRoot}/bin/node ${releaseRoot}/core511-source/scripts/delivery511/${probe?'isolation-probe.mjs':'canary-host.mjs'}
Environment=CORE511_CANARY_ROOT=${root}
Environment=CORE511_PARENT_NETNS=${parentNetns}
Environment=CORE511_CANDIDATE_SHA=531a16553be1fecfd56084183ef7da885ac9d5a71facd6bcc35c3c42e034c747
Environment=PATH=${releaseRoot}/bin:/usr/bin:/bin
Environment=COL_TEST_ACORN_MODULE=/tmp/core511-build-deps/node_modules/acorn/dist/acorn.mjs
PrivateNetwork=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ProtectHome=yes
NoNewPrivileges=yes
CapabilityBoundingSet=
RestrictNamespaces=yes
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
LockPersonality=yes
InaccessiblePaths=-/var/lib/coreoflife-realms-417 -/opt/coreoflife-realms -/opt/col-loadlab-live -/var/lib/core511 -/etc/caddy
TemporaryFileSystem=/etc/col-loadlab-live:ro,mode=0755,size=1M /var/lib/col-loadlab-live:ro,mode=0755,size=1M
ReadOnlyPaths=${releaseRoot}
ReadWritePaths=${root}
BindReadOnlyPaths=${releaseRoot}/deps/build:/tmp/core511-build-deps ${releaseRoot}/deps/build:/tmp/col-perf-r11-dependencies
UMask=0077
CPUAffinity=${cpus}
MemoryMax=3G
TasksMax=128
RuntimeMaxSec=${probe?30:330}
TimeoutStopSec=15
KillMode=control-group
SendSIGKILL=yes
Restart=no
`;
}
export function runtimeOverride({releaseRoot,configFile,role,dataRoot}){
 for(const p of [releaseRoot,configFile,dataRoot])safe(p);
 if(!['game','accounts'].includes(role))throw Error('unit_role');
 return `[Service]
ExecStart=
ExecStart=${releaseRoot}/bin/node ${releaseRoot}/core511-source/scripts/delivery511/${role==='game'?'runtime-entry.mjs':'generated/accounts-entry.mjs'}
WorkingDirectory=${releaseRoot}/native510-bb3a6cc689c6
Environment=CORE_CONFIG_FILE=${configFile}
Environment=PATH=${releaseRoot}/bin:/usr/bin:/bin
ReadOnlyPaths=${releaseRoot} ${path.dirname(configFile)}
ReadWritePaths=${dataRoot}
MemoryMax=${role==='game'?'3G':'384M'}
KillMode=mixed
TimeoutStopSec=60
UMask=0077
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
`;
}
export function validateCanaryUnit(text){
 const lines=new Set(text.trim().split('\n'));
 const required=['PrivateNetwork=yes','PrivateTmp=yes','PrivateDevices=yes','ProtectSystem=strict','ProtectHome=yes','NoNewPrivileges=yes','CapabilityBoundingSet=','RestrictNamespaces=yes','ProtectControlGroups=yes','KillMode=control-group','SendSIGKILL=yes','UMask=0077','Restart=no','MemoryMax=3G','TemporaryFileSystem=/etc/col-loadlab-live:ro,mode=0755,size=1M /var/lib/col-loadlab-live:ro,mode=0755,size=1M'];
 for(const row of required)if(!lines.has(row))throw Error('unit_missing:'+row);
 if(/scratch-driver-test|INVOCATION_ID=|\bUser=root\b/.test(text))throw Error('unit_isolation_bypass');
 for(const pattern of [/^User=col-/m,/^InaccessiblePaths=.*\/var\/lib\/coreoflife-realms-417.*\/var\/lib\/core511/m,/^BindReadOnlyPaths=.*core511-build-deps.*col-perf-r11-dependencies/m,/^ReadWritePaths=\/[^\s]+$/m,/^RuntimeMaxSec=(30|330)$/m])if(!pattern.test(text))throw Error('unit_isolation_incomplete');
 return true;
}
