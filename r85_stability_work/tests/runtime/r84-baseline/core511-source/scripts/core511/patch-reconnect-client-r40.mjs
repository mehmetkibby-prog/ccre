import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function patchReconnectSourceR40(source){
 if(hash(source)!=='3febd9bd6d1760dbd7fb2594c5b4ecc1a104ab4335417232c98e7ca08819b680')throw Error('r40_reconnect_source_baseline');
 const edits=[
  {from:"import {NATIVE_ACTIONS} from './generated/action-names.mjs';",to:"import {NATIVE_ACTIONS} from './generated/action-names.mjs';\nimport {readR40Options} from './r40-client.mjs';",count:1},
  {from:'clearTimeout(this.reconnectTimer);const generation=++this.connection,old=this.ws;',to:'clearTimeout(this.reconnectTimer);if(readR40Options().reconnectRecovery)this.reconnectTimer=null;const generation=++this.connection,old=this.ws;',count:1}
 ];
 let output=source;for(const {from,to}of edits){if(output.split(from).length!==2)throw Error('r40_reconnect_source_anchor');output=output.replace(from,to);}
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits}};
}
// Preserve the shipped R39 transport byte for byte outside this one lifecycle
// insertion. The shared helper import observes the same options as the game.
export function patchReconnectClientR40(source,helper){
 if(!/^core511-r40-[a-f0-9]{16}\.js$/.test(helper))throw Error('r40_reconnect_helper_name');
 if(hash(source)!=='eef779dbd19520abba863895a5ab0e10109fb6e006e5aa22aba93d97022e2f50')throw Error('r40_reconnect_baseline');
 const from='    clearTimeout(this.reconnectTimer);\n    const generation = ++this.connection, old = this.ws;';
 const to='    clearTimeout(this.reconnectTimer);\n    if (readReconnectOptionsR40().reconnectRecovery) this.reconnectTimer = null;\n    const generation = ++this.connection, old = this.ws;';
 if(source.split(from).length!==2)throw Error('r40_reconnect_anchor');
 const prefix=`import {readR40Options as readReconnectOptionsR40} from './${helper}';\n`;
 const output=prefix+source.replace(from,to),edits=[{position:'prepend',from:'',to:prefix},{from,to,count:1}];
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),helper,edits,
  scope:'Clear cancelled reconnect timeout handle during open only. No command resend, outcome reconciliation, movement, cadence, session authorization or retry policy changes; flag0 retains exact R39 behavior.'}};
}
