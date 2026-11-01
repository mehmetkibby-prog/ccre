import fs from 'node:fs';
// /proc may expose host PIDs while child.pid belongs to a nested namespace.
// Match BOTH namespace pid and actual parent, never an unrelated same-number PID.
export function childMemory(pid){
 const parent=Number(fs.readFileSync('/proc/self/status','utf8').match(/^Pid:\s+(\d+)/m)[1]);
 for(const name of fs.readdirSync('/proc')){if(!/^\d+$/.test(name))continue;let s;try{s=fs.readFileSync('/proc/'+name+'/status','utf8');}catch{continue;}
  const p=Number(s.match(/^PPid:\s+(\d+)/m)?.[1]),ids=s.match(/^NSpid:\s+(.+)$/m)?.[1].trim().split(/\s+/).map(Number)??[Number(name)];
  if(p===parent&&ids.at(-1)===pid)return {rssBytes:Number(s.match(/^VmRSS:\s+(\d+)/m)?.[1])*1024,peakRssBytes:Number(s.match(/^VmHWM:\s+(\d+)/m)?.[1])*1024};
 }
 throw Error('child_resource_identity_not_found');
}
