// Mechanically reversible writer-only port. All original native XP statements
// remain verbatim as fallback, and are used when the independent flag is off.
export function adaptRewardR54(source){
 const start=source.indexOf('function prepareMonsterXp('),end=source.indexOf('\n function awardProfileBossRewards',start);
 if(start<0||end<=start)throw Error('reward_r54_function_anchor');
 let part=source.slice(start,end);
 if(part.split('\treturn [').length!==2||part.split('\n\t];\n}').length!==2)throw Error('reward_r54_statement_anchor');
 part=part.replace('\treturn [','\tconst statementsR54 = [').replace('\n\t];\n}',"\n\t];\n\treturn ports.prepareMonsterXpR54?.({database,statements:statementsR54,subject:questMonster438,monsterId,spawnRound,lethalDamage,includeBefore,token,xp,now,settings,extra:!!extraService(),guild:!!guildSkillService(),ranks:!!globalThis.__colRanks,quest:!!(globalThis.__colQuests438?.enabled&&questMonsterEligible438(questMonster438)),balanceSql:balanceXpFactor487})??statementsR54;\n}");
 return source.slice(0,start)+part+source.slice(end);
}
