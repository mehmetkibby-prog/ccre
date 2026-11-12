import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupPvp} from '../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {createRetaliationRules} from '../working/core511-source/scripts/core511/generated/retaliation-rules.mjs';
test('retaliation frame and engagement lookups use existing keyed indexes',async t=>{
 const f=await setupPvp(t),queries=[];
 const capture={prepare:sql=>({bind:(...args)=>{queries.push({sql,args});return {};}})};
 createRetaliationRules().prepareFrame(capture,f.id,[{monster_id:'fixture-mob'}]);
 queries.push({sql:'SELECT * FROM pve_engagements WHERE player_id=?',args:[f.id]});
 const plans=queries.map(q=>({...q,plan:f.sql.prepare('EXPLAIN QUERY PLAN '+q.sql).all(...q.args)}));
 const detail=plans.map(p=>p.plan.map(r=>r.detail).join('\n'));
 assert.match(detail[0],/SEARCH players USING INDEX/);
 assert.match(detail[1],/SEARCH monster USING INDEX/);
 assert.match(detail[2],/SEARCH player_items USING INDEX/);
 assert.match(detail[3],/SEARCH pve_engagements USING INDEX/);
 for(const text of detail)assert(!/SCAN (?:players|monster|player_items|pve_engagements)(?:\s|$)/m.test(text),text);
 fs.writeFileSync(new URL('../evidence/retaliation-query-plans.json',import.meta.url),JSON.stringify(plans,null,2)+'\n');
});
