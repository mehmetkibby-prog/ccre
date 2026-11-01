import http from 'node:http';
import net from 'node:net';
// Lives in the proxy process. Tickets remain private to their channel; the
// query chooses a socket endpoint, never a player or an authorization scope.
export function createChannelStreamIngress({port,directory}){
 const sockets=new Set();const server=http.createServer((req,res)=>{res.writeHead(404);res.end();});
 server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url,'http://localhost'),channel=Number(url.searchParams.get('channel')),endpoint=directory()?.directory.get(channel);
  if(url.pathname!=='/dungeon-ws'||!endpoint?.ready||!endpoint.dungeonPort){socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');return;}
  const upstream=net.connect(endpoint.dungeonPort,'127.0.0.1');sockets.add(socket);sockets.add(upstream);
  const close=()=>{socket.destroy();upstream.destroy();sockets.delete(socket);sockets.delete(upstream);};socket.on('error',close);upstream.on('error',close);socket.on('close',close);upstream.on('close',close);
  upstream.once('connect',()=>{const lines=[`${req.method} ${req.url} HTTP/${req.httpVersion}`];for(let i=0;i<req.rawHeaders.length;i+=2)lines.push(req.rawHeaders[i]+': '+req.rawHeaders[i+1]);upstream.write(lines.join('\r\n')+'\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);});
 });
 server.listen(port,'127.0.0.1');return {server,close(){for(const s of sockets)s.destroy();server.close();}};
}
