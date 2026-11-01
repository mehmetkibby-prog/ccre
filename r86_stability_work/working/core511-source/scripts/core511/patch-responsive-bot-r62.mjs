import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
// Successful verification previously re-entered the global coordinator and
// writer queues solely to construct its response. Capture that response in the
// original durable verification; still wait for durability AND current-owner ACK.
export function patchResponsiveBotR62(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.id?.name==='POST$30');
 const from='const data = await readJsonObject(request), bot = globalThis.__colBotCheck;';
 if(!fn||source.slice(fn.start,fn.end).split(from).length!==2||source.includes('verificationR62'))throw Error('r62_bot_anchor');
 const addition=`
 if(process.env.CORE511_R62_VERIFICATION==='1'&&bot){
  const verificationR62=await db().core511BotCheck.call(auth,async()=>{
   const current=await requireGameSession(request);await assertCsrf(request,current);
   if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yenile.');return current;
  },bot,()=>{const ok=bot.verify(auth.account.id,'game',data.id,data.answer);return {ok,...ok?{dueAt:bot.deadline(auth.account.id)}:{}};});
  if(!verificationR62.ok)throw new AuthRequestError(400,'captcha_invalid','Kod hatalı veya süresi doldu. Görseli kontrol et.');
  return Response.json(verificationR62,{headers:{'Cache-Control':'no-store'}});
 }
`;
 const start=source.indexOf(from,fn.start),to=from+addition,output=source.slice(0,start)+to+source.slice(start+from.length);
 if(output.replace(to,from)!==source)throw Error('r62_bot_inverse');parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:sha(source),patchedSha256:sha(output),edits:[{from,to,count:1}],scope:'One durable verify+response instead of two coordinator/writer admissions. Authentication, CSRF, rate limit, wrong-attempt commit, one-use challenge, channel ACK remain mandatory. Flag0 uses original route.'}};
}
