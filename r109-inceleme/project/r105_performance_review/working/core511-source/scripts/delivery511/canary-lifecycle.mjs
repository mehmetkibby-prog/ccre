import {randomUUID} from 'node:crypto';

export function requestChild(child, operation, value, timeoutMs = 15000) {
 const id = randomUUID();
 return new Promise((resolve, reject) => {
  let timer;
  const finish = (error, result) => {
   clearTimeout(timer);
   child.off('message', message); child.off('exit', exit);
   child.off('error', errorEvent); child.off('disconnect', disconnect);
   error ? reject(error) : resolve(result);
  };
  const errorEvent = error => finish(error);
  const exit = (code, signal) => finish(Error(`canary_child_exited:${operation}:${code}:${signal}`));
  const disconnect = () => finish(Error(`canary_child_disconnected:${operation}`));
  const message = m => { if (m?.id === id) finish(m.error ? Error(m.error) : null, m.value); };
  if (!child.connected || child.exitCode !== null || child.signalCode !== null) {
   reject(Error(`canary_child_unavailable:${operation}`)); return;
  }
  child.on('message', message); child.once('exit', exit);
  child.once('error', errorEvent); child.once('disconnect', disconnect);
  timer = setTimeout(() => finish(Error(`canary_child_timeout:${operation}`)), timeoutMs);
  try { child.send({id, operation, value}, error => { if (error) finish(error); }); }
  catch (error) { finish(error); }
 });
}

export function waitForExit(child, timeoutMs = 5000) {
 if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
 return new Promise((resolve, reject) => {
  const exited = () => { clearTimeout(timer); resolve(); };
  const timer = setTimeout(() => {
   child.off('exit', exited); reject(Error('canary_child_exit_timeout'));
  }, timeoutMs);
  child.once('exit', exited);
 });
}

// Register exit observation BEFORE the stop RPC: a fast child can acknowledge,
// disconnect and exit before an await continuation installs an exit listener.
export async function stopChild(child, timeoutMs = 5000) {
 if (child.exitCode !== null || child.signalCode !== null) return;
 const exited = waitForExit(child, timeoutMs * 2);
 exited.catch(() => {});
 let error;
 try { await requestChild(child, 'stop', null, timeoutMs); await exited; }
 catch (e) {
  error = e;
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  try { await waitForExit(child, timeoutMs); }
  catch {
   if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
   await waitForExit(child, timeoutMs);
  }
 }
 if (error) throw error; // A forced cleanup must not be reported as success.
}
