import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchNativePayment(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.id?.name==='markPaymentSuccessful');
 if(!fn?.async||fn.params.length!==1||fn.params[0].name!=='input'||!source.slice(fn.start,fn.end).includes('support_pack_grants'))throw Error('native_payment_function_changed');
 const original=source.slice(fn.body.start+1,fn.body.end-1);if(original.includes('core511HttpAction'))throw Error('native_payment_already_patched');
 const e={start:fn.body.start+1,end:fn.body.end-1,original,replacement:'return db().core511HttpAction.payment(input,async()=>{'+original+'});'},output=source.slice(0,e.start)+e.replacement+source.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[e],scope:'Exact native payment grant body under stored-order owner drain; PayTR/Shopier HMAC, amounts, currency, event receipts, paid/failed/test policy and SQL unchanged'}};
}
