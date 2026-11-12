import path from 'node:path';
export function nginxConfig({root,origin,appPort,channels,port=443,bind='127.0.0.1',certificate,key}){
 const u=new URL(origin),host=u.hostname;
 if(u.protocol!=='https:'||u.pathname!=='/'||(u.port&&Number(u.port)!==port)||!/^[a-z0-9.-]+$/.test(host)||!['127.0.0.1','0.0.0.0'].includes(bind)||![appPort,port,...channels].every(p=>Number.isSafeInteger(p)&&p>0&&p<=65535)||channels.length!==4||new Set([appPort,...channels]).size!==5)throw Error('nginx_configuration');
 for(const p of [root,certificate,key])if(!path.isAbsolute(p)||!/^[a-zA-Z0-9_./-]+$/.test(p))throw Error('nginx_path');
 return `worker_processes 1;
pid ${root}/nginx.pid;
error_log ${root}/error.log warn;
events { worker_connections 2048; }
http {
 access_log off;
 client_body_temp_path ${root}/body;
 proxy_temp_path ${root}/proxy;
 fastcgi_temp_path ${root}/fastcgi;
 uwsgi_temp_path ${root}/uwsgi;
 scgi_temp_path ${root}/scgi;
 map $http_upgrade $connection_upgrade { default upgrade; '' close; }
 server {
  listen ${bind}:${port} ssl;
  server_name ${host};
  if ($host != ${host}) { return 421; }
  ssl_certificate ${certificate};
  ssl_certificate_key ${key};
  ssl_protocols TLSv1.2 TLSv1.3;
  server_tokens off;
  client_max_body_size 2m;
  add_header X-Content-Type-Options nosniff always;
  proxy_http_version 1.1;
  proxy_set_header Host ${u.host};
  proxy_set_header X-Forwarded-Host ${u.host};
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header Forwarded '';
  proxy_set_header Connection '';
  location = /api/realm/maintenance { return 404; }
  location = /api/realm/internal { return 404; }
  location ^~ /api/loadtest/ { return 404; }
  location ^~ /internal/ { return 404; }
${channels.map((p,i)=>`  location = /game/channel/${i+1} {
   proxy_set_header Host ${u.host};
   proxy_set_header X-Forwarded-Host ${u.host};
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-For $remote_addr;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header Forwarded '';
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection $connection_upgrade;
   proxy_buffering off;
   proxy_read_timeout 65s;
   proxy_send_timeout 65s;
   proxy_pass http://127.0.0.1:${p};
  }`).join('\n')}
  location /game/channel/ { return 404; }
  location / { proxy_pass http://127.0.0.1:${appPort}; }
 }
}
`;
}
