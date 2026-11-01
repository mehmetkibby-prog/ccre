import {pumpkinActive499,projectPumpkinAppearance499} from '../../lib/pumpkin499.mjs';
import {assertGroupLimit494,consumeGroupLimit494} from '../../lib/group-dungeon-limit494.mjs';
import {grantDungeonForge491} from '../../lib/forge-material491.mjs';
import {enhancementLevel491,enhancementBaseName491} from '../../lib/enhancement491.mjs';
import {balanceFromSettings487,balanceFactor487} from '../../lib/level-balance487.mjs';
import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,projectArenaWingAppearance477} from '../../lib/arena-wings477.mjs';
import {readSpecialistSkills459} from '../../lib/specialist-skills459.mjs';
import {specialization456 as colSpec456,skillFourGrowth456 as colSkillGrowth456} from '../../lib/expansion456.mjs';
import {deferDatabaseBackgroundTask} from './database.mjs';
import {craftSoloKey,createSolo,soloInfo,soloStage,soloTick,rewardSolo} from './solo-dungeon-engine.mjs';
import {SOLO_CATALOG_BY_ID} from '../../lib/solo-dungeon.mjs';
import {reportRuntimeWork} from './runtime-performance.mjs';
import {infiniteEquipmentPower} from '../../lib/infinite-power.mjs';
import {armorDamageReduction} from '../../lib/armor-mitigation.mjs';
import { classMoveSpeed, classAttackRange, combatCadences } from '../../lib/class-combat.mjs';
import {readEventsConfig,eventBonus} from '../../lib/game-events.mjs';
import {DUNGEON_MAP_VERSION,DUNGEON_WORLD,DUNGEON_MAPS,dungeonPortal,dungeonWalkable} from '../../lib/dungeon-maps.mjs';
import {GROUP_RULES,DUNGEON_KEEPER} from '../../lib/group-entry-rules.mjs';
import {dungeonAttackTargets,dungeonAttackDamage} from '../../lib/dungeon-combat.mjs';
import { randomUUID, randomInt } from 'node:crypto';
import { DUNGEON_DEFAULTS } from './dungeon-schema.mjs';
const MATERIALS = ['wing', 'infinite', 'pet'];
const GEAR = ['weapon', 'armor', 'helmet', 'shoes', 'necklace'];
const LABELS = { weapon: 'Silah', armor: 'Zırh', helmet: 'Kask', shoes: 'Çizme', necklace: 'Kolye' };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const walkable = dungeonWalkable;
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function validateDungeonSettings(input) {
    const out = {};
    for (const [key, def] of Object.entries(DUNGEON_DEFAULTS)) {
        const n = Number(input[key] ?? def);
        const max = key.endsWith('_chance') ? 100 : key === 'enabled' ? 1 : key === 'minimum_level' ? 50 : key === 'duration_seconds' ? 1800 : 10000000;
        if (!Number.isFinite(n) || n < 0 || n > max || (!key.endsWith('_chance') && !Number.isInteger(n)))
            throw new Error('Geçersiz zindan ayarı: ' + key);
        out[key] = n;
    }
    for (const k of MATERIALS)
        if (out[k + '_min'] < 1 || out[k + '_max'] < out[k + '_min'] || out[k + '_max'] > 100)
            throw new Error('Malzeme miktarı 1–100 olmalı; azami miktar en az asgari kadar olmalı.');
    if (out.duration_seconds < 300 || out.ready_seconds < 15 || out.ready_seconds > 120 || out.enemy_hp < 1 || out.boss_hp < 1 || out.crystal_hp < 1)
        throw new Error('Süre veya can ayarı geçersiz.');
    return out;
}
// A run uses its own authoritative coordinates, health and fixed roster. Open
// world actions are locked while membership is active; no client sends damage,
// health, loot results or stage transitions. All rewards/crafts commit atomically.
export class DungeonEngine {
    constructor(db, { now = Date.now, roll = () => randomInt(1000000) / 1000000, stats, rules = GROUP_RULES, periodicSave, settingsSnapshot, onWork = reportRuntimeWork, channel } = {}) {
        this.db = db;
        this.onWork = onWork;
        this.settingsSnapshot=settingsSnapshot;
        this.persistedAt=new Map();
        this.rules = rules;
        this.now = now;
        this.roll = roll;
        this.stats = stats;
        // Only recoverable one-second checkpoints may be queued. Transitions,
        // commands and reward receipts continue to call save() in their transaction.
        this.periodicSave = periodicSave ?? (run => this.save(run));
        this.runs = new Map();
        this.notices=new Map();
        this.returnRevisions=this.db.prepare("PRAGMA table_info(players)").all().filter(c=>["position_revision","hp_revision"].includes(c.name)).map(c=>`,${c.name}=${c.name}+1`).join("");
        this.lastSave = new Map();
        const recovered = channel === undefined
            ? db.prepare("SELECT state,updated_at FROM dungeon_runs WHERE status IN ('ready','active','portal','wipe','complete')").all()
            : db.prepare("SELECT r.state,r.updated_at FROM dungeon_runs r JOIN players p ON p.id=r.leader_id WHERE r.status IN ('ready','active','portal','wipe','complete') AND p.channel=?").all(channel);
        for (const row of recovered) {
            const run = JSON.parse(row.state);
            // A restarted V481 room may contain an already authored x5 strike.
            // Only this engine's known solo shapes/source kinds are normalized;
            // settings, HP, deadlines and reward receipts are never migrated.
            if(run.mode==='solo')for(const telegraph of run.telegraphs??[]){
                const enemy=run.enemies?.find(enemy=>enemy.id===telegraph.source);
                const known=enemy&&(enemy.kind==='boss'?['line','ring'].includes(telegraph.kind):['sentinel','imp'].includes(enemy.kind)&&telegraph.kind==='circle');
                const damage=known?(enemy.kind==='boss'?run.cfg?.boss_damage:run.cfg?.enemy_damage):undefined;
                if(Number.isFinite(damage)&&damage>=0)telegraph.damage=damage;
            }
            this.persistedAt.set(run.id,row.updated_at);
            for (const p of run.members) {
                p.input = { x: 0, y: 0 };
                p.moveTarget=null;
                p.inputAt = 0;
                p.seen = 0;
                p.cooldowns=Array.from({length:4},(_,i)=>Math.max(0,Number(p.cooldowns?.[i])||0));
                const owner = this.player(p.id);
                if(p.stats){const active499=pumpkinActive499(owner,this.now());if(p.stats.pumpkinActive499!==active499||p.stats.pumpkinUntil499!==owner.pumpkin_until499)p.stats.pumpkinRevision499=0;}
                if(p.stats){const active477=arenaWingsActive477(owner,this.now()),expiry477=owner.arena_wings_expires_at_ms??0;if(p.stats.arenaWingsActive477!==active477||p.stats.arenaWingsExpiresAt477!==expiry477)p.stats.arenaWingsRevision477=0;p.stats.arenaWingsActive477=active477;p.stats.arenaWingsExpiresAt477=expiry477;}
                p.gmInvisible = owner.is_gm === 1 && owner.gm_invisible === 1;
                p.visibilityRevision = owner.gm_visibility_revision || 0;
            }
            // Upgrade an unfinished legacy room at its current objective only.
            if (run.mapVersion !== DUNGEON_MAP_VERSION && ['active','portal','wipe'].includes(run.status)) {
                const cleared=run.status==='portal';this.stage(run);
                if(cleared){run.status='portal';run.enemies=[];run.message='Bölge tamamlandı. Açılan geçitten devam edin.';}
                this.save(run);
            }
            this.runs.set(run.id, run);
        }
        this.lastTick = now();
        for (const run of this.runs.values()) run.motionTime = this.lastTick;
    }
    settings() { return { ...DUNGEON_DEFAULTS, ...JSON.parse(this.db.prepare('SELECT value FROM dungeon_settings WHERE id=1').get().value) }; }
    // One synchronous command/tick sees one settings snapshot. The next step
    // reads fresh rows, so admin/event changes never wait for a time-based cache.
    withStepSettings(fn) {
        if(this.stepSettings)return fn();
        this.stepSettings={};try{return fn();}finally{this.stepSettings=null;}
    }
    gameSettings() {const cached=this.settingsSnapshot?.('game_settings');if(cached)return cached;return this.stepSettings ? (this.stepSettings.game ??= this.db.prepare('SELECT * FROM game_settings WHERE id=1').get()) : this.db.prepare('SELECT * FROM game_settings WHERE id=1').get();}
    combatSettings() {const cached=this.settingsSnapshot?.('combat_settings');if(cached)return cached;return this.stepSettings ? (this.stepSettings.combat ??= this.db.prepare('SELECT * FROM combat_settings WHERE id=1').get()) : this.db.prepare('SELECT * FROM combat_settings WHERE id=1').get();}

    measure(name,fn) { const at=performance.now();try{return fn();}finally{this.onWork(name,performance.now()-at,performance.timeOrigin+at);} }
    transaction(fn) {
        // A lethal area cast groups its counters, event claims and boss reward
        // in the same existing durable transaction. Only this engine's own
        // nested operations may join it; unrelated database transactions do not.
        if(this.transactionSaves)return fn();
        this.db.exec('BEGIN IMMEDIATE'); const priorSaves=this.transactionSaves;this.transactionSaves=new Map();try {
        const r = fn();
        this.measure('dungeon_commit',()=>this.db.exec('COMMIT'));
        return r;
    }
    catch (e) {
        this.db.exec('ROLLBACK');
        for(const [id,stamp]of this.transactionSaves){if(stamp===undefined)this.persistedAt.delete(id);else this.persistedAt.set(id,stamp);}
        throw e;
    } finally {this.transactionSaves=priorSaves;} }
    save(r) {
        const at=performance.now();let bytes=0;
        try {
            const state=this.measure('dungeon_serialize',()=>JSON.stringify(r));bytes=Buffer.byteLength(state);
            const stamp=Math.max(this.now(),(this.persistedAt.get(r.id)??0)+1);
            const write=()=>this.db.prepare('INSERT INTO dungeon_runs(id,party_id,leader_id,status,state,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,state=excluded.state,updated_at=excluded.updated_at').run(r.id,r.partyId,r.leaderId,r.status,state,stamp);
            if(this.db.isTransaction)write();else this.measure('dungeon_commit',write);
            if(this.transactionSaves&&!this.transactionSaves.has(r.id))this.transactionSaves.set(r.id,this.persistedAt.get(r.id));
            this.persistedAt.set(r.id,stamp);this.lastSave.set(r.id,this.now());
        } finally {this.onWork('dungeon_save',performance.now()-at,performance.timeOrigin+at,bytes);}
    }

    membership(id) { return this.db.prepare('SELECT run_id FROM dungeon_members WHERE player_id=?').get(id)?.run_id; }
    locked(id) { return !!this.membership(id); }
    player(id) { const p = this.db.prepare('SELECT * FROM players WHERE id=?').get(id); if (!p)
        throw new Error('Karakter bulunamadı.'); return p; }
    keeper(id, requireNearby = true) { const p = this.player(id); if (p.area !== 'bazaar' || p.hp <= 0 || (requireNearby && Math.hypot(p.x - DUNGEON_KEEPER.x, p.y - DUNGEON_KEEPER.y) > 190) || this.locked(id))
        throw new Error('Pazar Köyü’nde Zindan Bekçisi’nin yanına gel.'); return p; }
refreshSpecialistSkills459(member){
   // Actual main and resident channel engines reuse WorldLoop's committed
   // settings row. Revision checks and six-entry cache reads do no SQL.
   const settings=this.settingsSnapshot?.('game_settings')??{events_json:this.specialistSettingsRaw459};
   const config=readSpecialistSkills459(settings.events_json),stats=member.stats;
   if(!stats||stats.specialistRevision459===config.revision)return;
   const branch=colSpec456(member.role,stats.specialization,settings);stats.branch456=branch;
   stats.multipliers[3]=(branch?.multiplier??1)*stats.growth456*(stats.specialistScale459??1);
   stats.cooldowns[3]=Math.max(500,Math.round((branch?.cooldown??24000)/(1+Math.max(0,Math.min(50,stats.specialistCastSpeed459??0))/100)));
   stats.specialistRevision459=config.revision;
  }
      statsFor(p) {
        const arenaWingsNow477=this.now();
        const items = this.db.prepare('SELECT * FROM player_items WHERE player_id=? AND equipped=1').all(p.id);
        const settings = { ...this.gameSettings(), ...this.combatSettings() };this.specialistSettingsRaw459=settings.events_json;
        if (!this.stats)
            throw new Error('Savaş istatistikleri hazır değil.');
        const coreWings=this.db.prepare('SELECT equipped FROM dungeon_wings WHERE player_id=?').get(p.id)?.equipped===1;
        const s = this.stats(p.role, items, settings, !!p.wings_equipped||coreWings, !!p.weapon_skin_enabled, globalThis.__colRanks?.bonuses(p.id),globalThis.__colGuildSkill?.bonuses(p.id),globalThis.__colPremium?.buff?.(p.id));
        const pet = this.db.prepare('SELECT kind FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind=char(115,116,97,114,116,101,114) THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1').get(p.id);
        const multipliers = ['one', 'two', 'three'].map((k, i) => (Number(settings['skill_' + k + '_multiplier']) || [1, 1.8, 2.4][i]) * (1 + (Math.max(1, Number(p['skill_' + k]) || 1) - 1) * (Number(settings.skill_upgrade_damage_per_level) || 0)) * (Number(settings.skill_damage_scale) || 1));
        const cooldowns=combatCadences(settings,s.attackSpeed,s.castSpeed),branch456=colSpec456(p.role,p.specialization,settings),growth456=colSkillGrowth456(p.skill_four,settings.skill_upgrade_damage_per_level);
 multipliers.push((branch456?.multiplier??1)*growth456*(Number(settings.skill_damage_scale)||1));cooldowns.push(Math.max(500,Math.round((branch456?.cooldown??24000)/(1+Math.max(0,Math.min(50,s.castSpeed??0))/100))));
        return { pumpkinAttackBonus499:pumpkinActive499(p,arenaWingsNow477)?20*(globalThis.__colRunes?.factor(p,'attack')??1):0,pumpkinHpBonus499:pumpkinActive499(p,arenaWingsNow477)?Math.round((s.maxHp+(pet?.kind==='starter'?350:0))*(globalThis.__colRunes?.factor(p,'hp')??1))-Math.round((s.maxHp+(pet?.kind==='starter'?350:0)-1000)*(globalThis.__colRunes?.factor(p,'hp')??1)):0,pumpkinRevision499:1,pumpkinActive499:pumpkinActive499(p,arenaWingsNow477),pumpkinUntil499:p.pumpkin_until499??0,arenaWingsRevision477:1,arenaWingsActive477:arenaWingsActive477(p,arenaWingsNow477),arenaWingsExpiresAt477:p.arena_wings_expires_at_ms??0,combatRevision:459,specialistRevision459:readSpecialistSkills459(settings.events_json).revision,specialistScale459:Number(settings.skill_damage_scale)||1,specialistCastSpeed459:s.castSpeed??0,specialization:p.specialization,skillFour:p.skill_four,branch456,growth456, level:p.level, unlocks:[1,Number(settings.skill_two_unlock_level)||5,Number(settings.skill_three_unlock_level)||30,30], fire:s.fire??0, ice:s.ice??0, monsterPower:(s.monsterPower??0)+(arenaWingsActive477(p,arenaWingsNow477)?10:0), multipliers, cooldowns, thirdCritical: s.thirdSkillCriticalChance ?? s.criticalChance, attack: (s.attack + (pet?.kind === 'dog' ? 0 : pet?.kind === 'dragon' ? 45 : pet?.kind === 'starter' ? 10 : pet ? 20 : 0))*(globalThis.__colRunes?.factor(p,'attack')??1), defense: s.defense*(globalThis.__colRunes?.factor(p,'defense')??1), maxHp: Math.round((s.maxHp+(pet?.kind==='starter'?350:0))*(globalThis.__colRunes?.factor(p,'hp')??1)), critical: s.criticalChance, criticalMultiplier: s.criticalDamageMultiplier, lifeSteal: s.lifeSteal, block: s.attackBlock };
    }
    create(id) {
        const cfg = this.settings();
        if (!cfg.enabled)
            throw new Error('Zindan şu anda bakımdadır.');
        this.keeper(id, false);
        return this.transaction(() => {
            const party = this.db.prepare('SELECT * FROM parties WHERE leader_id=?').get(id);
            if (!party)
                throw new Error(`${this.rules.dungeonMin} kişilik grubun lideri olmalısın.`);
            const members = this.db.prepare('SELECT p.* FROM party_members m JOIN players p ON p.id=m.player_id WHERE m.party_id=? ORDER BY m.joined_at,p.id').all(party.id);
            if (members.length < this.rules.dungeonMin || members.length > this.rules.dungeonMax)
                throw new Error(`Zindan için ${this.rules.dungeonMin === this.rules.dungeonMax ? this.rules.dungeonMin : this.rules.dungeonMin+'–'+this.rules.dungeonMax} kişi gerekir.`);
            const now = this.now(), channel = this.player(id).channel;
            if (members.some(p => p.level < cfg.minimum_level || p.hp <= 0 || p.area !== 'bazaar' || p.channel !== channel || p.last_seen < now / 1000 - 30 || p.arena_match_id || p.combat_lock_until_ms > now || this.locked(p.id)))
                throw new Error('Tüm üyeler gereken seviyede, aynı Pazar kanalında ve savaş dışında çevrimiçi olmalı.');
            for(const member of members)assertGroupLimit494(member,now);
            const r = { id: randomUUID(), partyId: party.id, leaderId: id, status: 'ready', created: now, readyUntil: now + cfg.ready_seconds * 1000, started: 0, deadline: 0, stage: 0, wave: 0, attempt: 0, size: members.length, cfg, members: members.map(p => ({ id: p.id, gmInvisible: p.is_gm === 1 && p.gm_invisible === 1, visibilityRevision: p.gm_visibility_revision || 0, name: p.name, role: p.role, ready: p.id === id, x: 600, y: 760, hp: 1, maxHp: 1, damage: 0, seen: now, input: { x: 0, y: 0 }, inputAt: 0, sequence: 0, cooldowns: [0, 0, 0, 0], stats: null })), enemies: [], telegraphs: [], effects: [], message: 'Grup üyelerinin hazır onayı bekleniyor.', rewards: {} };
            r.motionTime = this.lastTick;
            for (const p of r.members)
                this.db.prepare('INSERT INTO dungeon_members(player_id,run_id) VALUES(?,?)').run(p.id, r.id);
            this.save(r);
            this.runs.set(r.id, r);
            return { ok: true };
        });
    }
    begin(r) {
        if(r.mode!=='solo'){
        if (r.size < this.rules.dungeonMin || r.size > this.rules.dungeonMax)
            throw new Error("Girişte gereken grup sayısı değişti. Bekçi üzerinden yeni hazırlık başlat.");
        const live = this.db.prepare('SELECT player_id FROM party_members WHERE party_id=?').all(r.partyId).map(p => p.player_id);
        const leader = this.db.prepare('SELECT leader_id FROM parties WHERE id=?').get(r.partyId);
        if (leader?.leader_id !== r.leaderId || live.length !== r.size || r.members.some(p => !live.includes(p.id)))
            throw new Error('Grup değişti. Bekçi üzerinden yeni hazırlık başlat.');
        }
        const channel = this.player(r.leaderId).channel;
        for (const m of r.members) {
            const p = this.player(m.id);
            if (p.level < r.cfg.minimum_level || p.area !== 'bazaar' || p.hp <= 0 || p.channel !== channel || p.last_seen < this.now() / 1000 - 30 || p.combat_lock_until_ms > this.now() || p.arena_match_id)
                throw new Error('Bir üye giriş koşullarını artık karşılamıyor.');
            m.gmInvisible = p.is_gm === 1 && p.gm_invisible === 1;
            m.visibilityRevision = p.gm_visibility_revision || 0;
            m.stats = this.statsFor(p);
            m.maxHp = m.stats.maxHp;
            const gear = this.db.prepare('SELECT kind,rarity,enchantments FROM player_items WHERE player_id=? AND equipped=1').all(p.id);
            const pet=this.db.prepare('SELECT * FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind=char(115,116,97,114,116,101,114) THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1').get(p.id);
            m.appearance = { premiumBuff:globalThis.__colPremium?.buff?.(p.id),talismanColor:JSON.parse(gear.find(g=>g.kind==='weapon')?.enchantments||'[]').find(e=>e.kind==='stone_talisman_color')?.value??0,rank:globalThis.__colRanks?.appearance(p.id), weaponSkin:!!p.weapon_skin_enabled, costume:gear.some(g=>g.kind==='costume'),level:p.level,petKind:pet?.kind,petName:pet?.name,coreWings:!!this.db.prepare('SELECT 1 FROM dungeon_wings WHERE player_id=? AND equipped=1').get(p.id),wings:!!p.wings_equipped,weapon: gear.find(g => g.kind === 'weapon')?.rarity ?? 'white', armor: gear.find(g => g.kind === 'armor')?.rarity ?? 'white', evolution: JSON.parse(gear.find(g => g.kind === 'weapon')?.enchantments ?? '[]').find(e => e.kind === 'evolution_level')?.value ?? 0 };
        }
        if(r.mode!=='solo'){
            if(r.started)throw new Error('Zindan zaten başladı.');
            consumeGroupLimit494(this.db,r.members.map(m=>m.id),this.now());
        }
        r.started = this.now();
        r.deadline = r.started + r.cfg.duration_seconds * 1000;
        r.stage = 1;
        this.stage(r);
    }
    stage(r) {
        r.motionTime = this.lastTick;
        r.status = 'active';
        r.mapVersion=DUNGEON_MAP_VERSION;
        r.mapId=DUNGEON_MAPS[r.stage].id;
        r.attempt++;
        r.stageStarted = this.now();
        r.enemies = [];
        r.telegraphs = [];
        r.effects = [];
        r.wave = 0;
        r.waveAt = 0;
        r.waveSpawn = null;
        r.focusPhase = 0;
        r.crystal = { x: 1200, y: 675, hp: r.cfg.crystal_hp, maxHp: r.cfg.crystal_hp };
        for (const [i, p] of r.members.entries()) {
            this.refreshPumpkin499(p);
            p.x = DUNGEON_MAPS[r.stage].spawn.x + (i-(r.members.length-1)/2)*70;
            p.y = DUNGEON_MAPS[r.stage].spawn.y;
            p.inputAt=0;
            p.hp = p.maxHp;
            p.input = { x: 0, y: 0 };
            p.moveTarget=null;
            p.cooldowns = [0, 0, 0, 0];
            if (r.stage === 3)
                p.damage = 0;
        }
        if(r.mode==='solo'){soloStage.call(this,r);return;}
        const scaled = 1;
        if (r.stage === 1) {
            for (const [x, y] of [[360, 660], [2040, 660], [1200, 235]])
                this.enemy(r, 'seal', x, y, r.cfg.enemy_hp * scaled * 3);
            r.message = 'Kırık Mühürler · Üç mühür muhafızını yen.';
        }
        if (r.stage === 2) {
            r.waveAt = this.now() + 4000;
            r.message = 'Çekirdeği Koru · Kristali üç dalgadan sağ çıkar.';
        }
        if (r.stage === 3) {
            this.enemy(r, 'boss', 1200, 540, r.cfg.boss_hp * scaled);
            r.message = 'Bozulmuş Muhafız · Kırmızı işaretlerden çık, enerji odaklarını parçala.';
        }
    }
    enemy(r, kind, x, y, hp) { r.enemies.push({ id: randomUUID(), kind, skin:r.mode==='solo'?'solo':undefined, name: r.mode==='solo'?(kind==='boss'?'Demir Hükümdar':'Kül Nöbetçisi'):{ seal: 'Mühür Muhafızı', imp: 'Çekirdek Yiyici', boss: 'Bozulmuş Muhafız', focus: 'Enerji Odağı' }[kind], x, y, hp: Math.round(hp), maxHp: Math.round(hp), nextAttack: this.now() + (r.mode==='solo'?1250:2500), attackCount: 0, shield: false }); }
    refreshPumpkin499(member,now=this.now()) {
        if(!member.stats||member.left)return;
        if(member.stats?.pumpkinRevision499===1&&(!member.stats.pumpkinActive499||member.stats.pumpkinUntil499>now))return;
        member.stats=this.statsFor(this.player(member.id));member.maxHp=member.stats.maxHp;member.hp=Math.min(member.hp,member.maxHp);
        member.appearance=projectPumpkinAppearance499(member.appearance,now);
    }
    snapshot(id) {
        const rid = this.membership(id), r = rid && this.runs.get(rid);
        if (r) {
            const p = r.members.find(p => p.id === id);
            p.seen = this.now();
            return { run: this.publicRun(r, id), ...(r.mode==='solo'?{solo:{settings:r.solo,used:0,remaining:0}}:{}), settings: r.cfg, materials: this.materials(id) };
        }
        const reward = this.db.prepare('SELECT run_id,rewards,created_at FROM dungeon_rewards WHERE player_id=? ORDER BY created_at DESC LIMIT 1').get(id);
        return { run: null, ...(globalThis.__colProgression?{solo:soloInfo(this,id)}:{}), notice:this.notices.get(id)?.message, settings: this.settings(), materials: this.materials(id), wings: this.db.prepare('SELECT equipped FROM dungeon_wings WHERE player_id=?').get(id) ?? null, lastReward: reward ? { ...reward, rewards: JSON.parse(reward.rewards) } : null };
    }
    materials(id) { return Object.fromEntries(this.db.prepare('SELECT kind,amount FROM dungeon_materials WHERE player_id=?').all(id).map(m => [m.kind, m.amount])); }
    setPlayerVisibility(id, invisible, revision) {
        for (const run of this.runs.values()) {
            const member = run.members.find(p => p.id === id);
            if (member && revision >= (member.visibilityRevision || 0)) {
                member.gmInvisible = invisible === true;
                member.visibilityRevision = revision;
            }
        }
    }
    publicRun(r, viewerId = '') {
        const hidden = new Set(r.members.filter(p => p.gmInvisible && p.id !== viewerId).map(p => p.id));
        return { id: r.id, mode:r.mode??'group', status: r.status, attempt:r.attempt, motionTime:r.motionTime, mapVersion:r.mapVersion, mapId:r.mapId, stage: r.stage, wave: r.wave, size: r.size, deadline: r.deadline, readyUntil: r.readyUntil, leaderId: r.leaderId, serverTime: this.now(), message: r.message, crystal: r.crystal, enemies: r.enemies, telegraphs: r.telegraphs, effects: r.effects.filter(e => !hidden.has(e.actorId)), members: r.members.filter(p => !hidden.has(p.id)).map(p=>{this.refreshPumpkin499(p);return p;}).map(({ stats, input, inputAt, sequence, ...p }) => ({...p,appearance:projectPumpkinAppearance499(projectArenaWingAppearance477(p.appearance,stats?.arenaWingsActive477??p.appearance?.rank?.arenaWings,stats?.arenaWingsExpiresAt477??0,this.now()),this.now()),specialization:stats?.specialization??'',skillFour:stats?.skillFour??1,cadences:stats?.cooldowns,inputSequence:sequence,velocity:p.hp>0&&this.now()-inputAt<=800&&['active','portal','complete'].includes(r.status)?{x:input.x*classMoveSpeed(p.role),y:input.y*classMoveSpeed(p.role)}:{x:0,y:0}})), groundLoot:r.groundLoot??[], rewards: r.rewards }; }
    command(id,input) {return this.withStepSettings(()=>this.commandStep(id,input));}
    commandStep(id, input) {
        if (input.action === 'sync') {
            const run = this.runs.get(this.membership(id)), member = run?.members.find(p => p.id === id);
            // A delayed input from the previous map or wipe cannot move the group at its new spawn.
            if(run&&((input.runId!==undefined&&input.runId!==run.id)||(input.attempt!==undefined&&input.attempt!==run.attempt)))return this.snapshot(id);
            if(member&&(!Number.isSafeInteger(input.sequence)||input.sequence<=member.sequence))return this.snapshot(id);
            if (run && member && member.hp > 0 && ['active', 'portal','complete'].includes(run.status)) {
                this.command(id, { action: 'move', x: input.x, y: input.y, sequence: input.sequence,destination:input.destination,followTarget:input.followTarget });
                if (input.attack && run.status === 'active') {
                    try {
                        this.command(id, { action: 'attack', skill: input.attack.skill, target: input.attack.target });
                    }
                    catch (e) {
                        return { ...this.snapshot(id), notice: e.message };
                    }
                }
            }
            return input.stream?{ok:true}:this.snapshot(id);
        }
        if(input.action==='create_solo')return createSolo.call(this,id,input);
        if(input.action==='craft_solo_key')return craftSoloKey.call(this,id,input);
        if (input.action === 'create')
            return this.create(id);
        if (input.action === 'craft')
            return this.craft(id, input);
        if (input.action === 'wings') {
            if (this.locked(id) || this.player(id).hp <= 0)
                throw new Error('Şu anda kanat değiştirilemez.');
            this.db.prepare('UPDATE dungeon_wings SET equipped=CASE equipped WHEN 1 THEN 0 ELSE 1 END WHERE player_id=?').run(id);
            return { ok: true };
        }
        const r = this.runs.get(this.membership(id));
        if (!r)
            throw new Error('Aktif zindanın yok.');
        const p = r.members.find(p => p.id === id), now = this.now();
        p.seen = now;this.refreshPumpkin499(p,now);
        if(input.action==='collect'){
            if(r.status!=='complete'||now>=r.deadline||p.left||p.hp<=0)throw new Error('Şu anda ganimet toplanamaz.');
            const drops=(r.groundLoot??[]).filter(d=>d.ownerId===id&&dist(p,d)<=140);
            if(!drops.length)return {...this.snapshot(id),notice:'Ganimete yaklaş.'};
            const previous=r.groundLoot;
            try{this.transaction(()=>{for(const d of drops){
                if(r.mode==='solo'){const item=SOLO_CATALOG_BY_ID.get(d.catalogId);if(!item||!globalThis.__colDragonBoss)throw Error('Ödül teslim sistemi hazır değil.');globalThis.__colDragonBoss.grantCatalog(id,item,d.amount,{...d,item_name:d.name});}
                else if(MATERIALS.includes(d.kind))this.material(id,d.kind,d.amount);
                else if(['crystal_chest','evolution_scroll','stone_book'].includes(d.kind))this.db.prepare("INSERT INTO player_stones(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount").run(id,d.kind==='stone_book'?'book':d.kind,d.amount);
                else if(d.kind==='gems')this.db.prepare('UPDATE players SET gems=gems+? WHERE id=?').run(d.amount,id);
                else this.db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at) VALUES(?,?,?,?,?,?,?,'[]',0,?)").run(d.itemId,id,d.kind,d.name,'red',d.power,d.role,Math.floor(now/1000));
            }const ids=new Set(drops.map(d=>d.id));r.groundLoot=r.groundLoot.filter(d=>!ids.has(d.id));this.save(r);});}catch(e){r.groundLoot=previous;throw e;}
            return {ok:true,...this.snapshot(id),lootReceipts473:drops.map(d=>({id:d.id,ownerId:id,label:d.name??({wing:'Kanat Parçası',infinite:'Sonsuz Taşı Parçası',pet:'Ejderha Parçası',gems:'Mücevher'})[d.kind]??'Ganimet',amount:d.amount}))};
        }
        if(input.action==='potion'){
            if(input.automatic===true){const owner=this.player(id);if(!owner.auto_potion_owned||!owner.auto_potion_enabled||owner.auto_potion_remaining<=0||p.hp>p.maxHp*.5||owner.auto_potion_at_ms>this.now()-2000)return this.snapshot(id);}
            if(!['active','portal'].includes(r.status)||p.hp<=0||p.left)throw new Error('Şu anda iksir kullanılamaz.');
            if(p.hp>=p.maxHp)throw new Error('Canın zaten dolu.');
            const before=p.hp,autoCharge=input.automatic===true?Math.min(p.maxHp-p.hp,this.player(id).auto_potion_remaining):Math.min(p.maxHp-p.hp,Math.max(1,Math.floor(p.maxHp*.2)));
            try{this.transaction(()=>{const used=input.automatic===true?this.db.prepare('UPDATE players SET auto_potion_remaining=auto_potion_remaining-MIN(auto_potion_remaining,?),auto_potion_enabled=CASE WHEN auto_potion_remaining<=? THEN 0 ELSE 1 END,auto_potion_owned=CASE WHEN auto_potion_remaining<=? THEN 0 ELSE 1 END,auto_potion_at_ms=? WHERE id=? AND auto_potion_owned=1 AND auto_potion_enabled=1 AND auto_potion_remaining>0 AND auto_potion_at_ms<=? RETURNING potions,auto_potion_remaining').get(p.maxHp-p.hp,p.maxHp-p.hp,p.maxHp-p.hp,this.now(),id,this.now()-2000):this.db.prepare('UPDATE players SET potions=potions-1 WHERE id=? AND potions>0 RETURNING potions').get(id);if(!used)throw new Error(input.automatic===true?'Oto iksir bekleme süresinde.':'Can iksirin yok.');p.hp=Math.min(p.maxHp,p.hp+autoCharge);this.save(r);});}catch(e){p.hp=before;throw e;}
            return this.snapshot(id);
        }
        if (input.action === 'leave') {
            if(r.mode==='solo'){this.finish(r,r.status==='complete'?'complete':'abandoned','Solo zindandan ayrıldın. Pazar Köyü’ne döndün.');return {ok:true};}
            if (r.status === 'ready') {
                this.finish(r, 'cancelled', 'Hazırlık iptal edildi.');
                return { ok: true };
            }
            p.left = true;
            p.hp = 0;
            p.input = { x: 0, y: 0 };
            this.db.prepare('DELETE FROM dungeon_members WHERE player_id=? AND run_id=?').run(id, r.id);
            this.save(r);
            return { ok: true };
        }
        if (input.action === 'ready') {
            if (r.status !== 'ready' || now >= r.readyUntil)
                throw new Error('Hazırlık süresi doldu.');
            p.ready = input.ready === true;
            if (r.members.every(m => m.ready)) {
                try {
                    this.transaction(()=>{this.begin(r);this.save(r);});
                }
                catch (e) {
                    this.finish(r, 'cancelled', e.message);
                    throw e;
                }
            } else this.save(r);
            return { ok: true };
        }
        if (input.action === 'portal') {
            if (r.status !== 'portal' || p.hp <= 0 || dist(p, dungeonPortal(r.stage)) > 130)
                throw new Error('Açılan geçidin yanına gel.');
            r.stage++;
            this.stage(r);
            this.save(r);
            return { ok: true };
        }
        if (!['active', 'portal','complete'].includes(r.status) || p.hp <= 0 || p.left)
            throw new Error('Şu an hareket veya saldırı yapılamaz.');
        if (input.action === 'move') {
            const x = Number(input.x), y = Number(input.y), seq = Number(input.sequence);
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isSafeInteger(seq) || seq <= p.sequence)
                return { ok: true };
            const len = Math.hypot(x, y);
            p.input = { x: x / Math.max(1, len), y: y / Math.max(1, len) };
            p.moveTarget=null;
            if(typeof input.followTarget==='string'&&r.enemies.some(e=>e.id===input.followTarget&&e.hp>0))p.moveTarget={id:input.followTarget};
            else if(input.destination&&walkable(Number(input.destination.x),Number(input.destination.y)))p.moveTarget={x:Number(input.destination.x),y:Number(input.destination.y)};
            p.inputAt = now;
            p.sequence = seq;
            return { ok: true };
        }
        if (input.action === 'attack') {
            if (r.status !== 'active')
                throw new Error('Bu bölüm tamamlandı.');
            const skill = Number(input.skill ?? 0);
            if (!Number.isInteger(skill) || skill < 0 || skill > 3)
                throw new Error('Geçersiz beceri.');
            // Recovered pre-452 rooms have a persisted combat snapshot without
            // elements/unlocks. Refresh it once on first attack, preserving HP,
            // timers, cooldowns and the room's original deadline.
            if(p.stats?.pumpkinRevision499!==1||(p.stats.pumpkinActive499&&p.stats.pumpkinUntil499<=now)||p.stats?.combatRevision!==459||p.stats?.arenaWingsRevision477!==1||(p.stats.arenaWingsActive477&&p.stats.arenaWingsExpiresAt477>0&&p.stats.arenaWingsExpiresAt477<=now)){p.stats=this.statsFor(this.player(p.id));p.maxHp=p.stats.maxHp;p.hp=Math.min(p.hp,p.maxHp);}
            this.refreshSpecialistSkills459(p);
            if(p.stats.level<p.stats.unlocks[skill])throw new Error(`Bu yetenek ${p.stats.unlocks[skill]}. seviyede açılır.`);
            if(skill===3&&!p.stats.branch456)throw Error('Önce uzmanlığını seçmelisin.');
            if(!Array.isArray(p.cooldowns))p.cooldowns=[0,0,0,0];else if(p.cooldowns.length<4)p.cooldowns[3]=0;
            if (now < p.cooldowns[skill])
                return { ok: true };
            if(skill===3){const branch=p.stats.branch456;if(branch.effect==='heal'||branch.effect==='guard'){const eligible=branch.effect==='guard'?[p]:[p,...r.members.filter(m=>m.id!==p.id&&m.hp>0&&!m.left&&dist(p,m)<=320).sort((a,b)=>dist(p,a)-dist(p,b)||(a.id<b.id?-1:a.id>b.id?1:0))].slice(0,5),rate=Math.min(.30,branch.heal*p.stats.growth456);for(const m of eligible){const n=rate>0?Math.min(Math.max(0,m.maxHp-m.hp),Math.max(1,Math.round(m.maxHp*rate))):0;m.hp+=n;if(n)r.effects.push({id:randomUUID(),kind:'heal',actorId:p.id,x:m.x,y:m.y,text:'+'+n,until:now+850});}if(branch.effect==='guard')p.specialGuardUntil=now+branch.guardMs;r.effects.push({id:randomUUID(),kind:'specialization',specialization:branch.id,actorId:p.id,x:p.x,y:p.y,targets:eligible.map(m=>({id:m.id,x:m.x,y:m.y})),until:now+850});p.cooldowns[3]=now+p.stats.cooldowns[3];p.lastAttack=now;p.lastAbility=3;return {ok:true};}}
 const target = r.enemies.find(e => e.id === input.target && e.hp > 0);
            if (!target)
                throw new Error('Hedef bulunamadı.');
            const range = classAttackRange(p.role, skill);
            if (dist(p, target) > range)
                throw new Error('Hedef menzil dışında.');
            const origin={x:p.x,y:p.y};
            const targets=dungeonAttackTargets(r.enemies,target,p.role,skill);
            // Ordinary PvE rolls critical once for the whole cast.
            const critical=targets.some(e=>!e.shield)&&this.roll()<(skill===2?p.stats.thirdCritical:p.stats.critical);
            const plans=targets.map(enemy=>{
                const floor=r.mode!=='solo'&&enemy.kind==='boss'&&r.focusPhase<2?Math.ceil(enemy.maxHp*(r.focusPhase===0?.7:.35)):0;
                return {enemy,...(enemy.shield?{damage:0,elemental:[]}:dungeonAttackDamage(p.stats,skill,enemy,critical,floor))};
            });
            const kills=plans.filter(hit=>!hit.enemy.shield&&hit.damage>=hit.enemy.hp&&hit.enemy.kind!=='boss'&&hit.enemy.kind!=='focus');
            const bossKilled=plans.some(hit=>hit.enemy.kind==='boss'&&!hit.enemy.shield&&hit.damage>=hit.enemy.hp);
            const durable=kills.length>0||bossKilled;
            // A failed multi-kill must restore the whole cast, including phase
            // changes, HP/lifesteal, effects and reward state. References held
            // by existing callers remain valid when the rollback is applied.
            const before=durable?{state:structuredClone(r),members:[...r.members],enemies:[...r.enemies],lastSave:this.lastSave.get(r.id)}:null;
            const apply=()=>{
                if(p.role==='muhafiz'&&skill===2){
                    r.effects.push({id:randomUUID(),kind:'leap',actorId:p.id,x:p.x,y:p.y,tx:target.x,ty:target.y,until:now+600});
                    const d=dist(p,target),x=clamp(target.x+(p.x-target.x)/Math.max(1,d)*70,DUNGEON_WORLD.minX,DUNGEON_WORLD.maxX),y=clamp(target.y+(p.y-target.y)/Math.max(1,d)*70,DUNGEON_WORLD.minY,DUNGEON_WORLD.maxY);
                    if(walkable(x,y)){p.x=x;p.y=y;p.positionEpoch=(p.positionEpoch??0)+1;}
                }
                if(p.role==='muhafiz'&&skill===1){
                    r.effects.push({id:randomUUID(),kind:'chain',actorId:p.id,x:p.x,y:p.y,tx:target.x,ty:target.y,until:now+600});
                    if(['imp','seal','sentinel'].includes(target.kind)){
                        const d=dist(p,target),x=clamp(p.x+(target.x-p.x)/Math.max(1,d)*80,DUNGEON_WORLD.minX,DUNGEON_WORLD.maxX),y=clamp(p.y+(target.y-p.y)/Math.max(1,d)*80,DUNGEON_WORLD.minY,DUNGEON_WORLD.maxY);
                        if(walkable(x,y)){target.x=x;target.y=y;}
                    }
                    target.nextAttack=Math.max(target.nextAttack,now+2000);target.rootUntil=Math.max(target.rootUntil??0,now+2000);target.guardianRootUntil481=now+2000;
                }
                if(skill===3&&p.stats.branch456?.effect==='root'&&target.kind!=='boss'&&target.kind!=='focus'){target.rootUntil=Math.max(target.rootUntil??0,now+p.stats.branch456.rootMs);target.nextAttack=Math.max(target.nextAttack,now+400);}
 p.cooldowns[skill]=now+p.stats.cooldowns[skill];p.lastAttack=now;p.lastAbility=skill;p.direction={x:target.x-p.x,y:target.y-p.y};
                let healedTotal=0;
                for(const [index,{enemy,damage,elemental}]of plans.entries()){
                    if(enemy.shield){r.effects.push({id:randomUUID(),kind:'shield',x:enemy.x,y:enemy.y,text:'KALKAN',until:now+800});continue;}
                    enemy.hp-=damage;
                    if(enemy.kind==='boss'){p.damage+=damage;this.focus(r,enemy);}
                    const healed=Math.min(p.maxHp-p.hp,Math.floor(damage*p.stats.lifeSteal/100));p.hp+=healed;healedTotal+=healed;
                    r.effects.push({id:randomUUID(),kind:p.role==='muhafiz'?'slash':'bolt',x:origin.x,y:origin.y,tx:enemy.x,ty:enemy.y,text:String(damage),damage,critical,elemental,areaHit:index>0,until:now+1500,at:now,actorId:p.id,ability:skill});
                }
                if(healedTotal>0)r.effects.push({id:randomUUID(),kind:'heal',actorId:p.id,x:p.x,y:p.y,text:'+'+healedTotal,until:now+1000});
                if(durable)grantDungeonForge491(this.db,this.gameSettings(),p.id,kills.length+(bossKilled?1:0),this.roll);
                if(kills.length){
                    const day=Math.floor((now+10800000)/86400000);
                    this.db.prepare('UPDATE players SET daily_monster_kills=CASE WHEN daily_monster_day=? THEN daily_monster_kills+? ELSE ? END,daily_monster_day=? WHERE id=? AND is_gm=0').run(day,kills.length,kills.length,day,p.id);
                    if(r.mode!=='solo')for(const hit of kills)this.eventChest(r,hit.enemy,false);
                }
                // Existing reward PKs and catalog amounts stay unchanged. Both
                // ordinary counters and all claims commit once for this cast.
                if(bossKilled)this.reward(r);else if(kills.length)this.save(r);
            };
            try{if(durable)this.transaction(apply);else apply();}
            catch(error){
                if(before){
                    for(const [index,member]of before.members.entries()){for(const key of Object.keys(member))if(!(key in before.state.members[index]))delete member[key];Object.assign(member,before.state.members[index]);}
                    for(const [index,enemy]of before.enemies.entries()){for(const key of Object.keys(enemy))if(!(key in before.state.enemies[index]))delete enemy[key];Object.assign(enemy,before.state.enemies[index]);}
                    Object.assign(r,before.state,{members:before.members,enemies:before.enemies});
                    if(before.lastSave===undefined)this.lastSave.delete(r.id);else this.lastSave.set(r.id,before.lastSave);
                }
                throw error;
            }
            return { ok: true };
        }
        throw new Error('Geçersiz zindan işlemi.');
    }
    focus(r, boss) {
        if(r.mode==='solo')return;
        if (r.focusPhase >= 2 || boss.shield || boss.hp > Math.ceil(boss.maxHp * (r.focusPhase === 0 ? .7 : .35)))
            return;
        r.focusPhase++;
        boss.shield = true;
        r.telegraphs = [];
        this.enemy(r, 'focus', 760, 660, r.cfg.enemy_hp);
        this.enemy(r, 'focus', 1640, 660, r.cfg.enemy_hp);
        r.message = 'Muhafız koruma altında! İki enerji odağını kır.';
    }
    tick() {return this.withStepSettings(()=>this.tickStep());}
    async tickScheduled() {
        const now=this.now(),dt=Math.min(.2,Math.max(0,(now-this.lastTick)/1000));
        this.lastTick=now;
        // A separate I/O turn per room prevents many simultaneous finishes
        // from chaining synchronous FULL commits in one timer callback.
        for(const run of [...this.runs.values()])await deferDatabaseBackgroundTask(()=>{
            if(this.runs.get(run.id)!==run)return;
            this.measure('dungeon_tick',()=>this.withStepSettings(()=>this.tickStep([run],now,dt)));
        });
    }
    tickStep(runs=this.runs.values(), now=this.now(), elapsed) {
        const dt = elapsed??Math.min(.2, Math.max(0, (now - this.lastTick) / 1000));
        this.lastTick = now;
        for (const r of runs) {
            r.motionTime = now;
            if (r.status === 'ready') {
                if (now >= r.readyUntil)
                    this.finish(r, 'cancelled', 'Hazır onayı süresi doldu.');
                continue;
            }
            if(r.status==='complete'&&now>=r.deadline){this.finish(r,'complete','Zindan tamamlandı. Pazar Köyü’ne döndünüz.');continue;}
            if (!['active', 'portal', 'wipe','complete'].includes(r.status))
                continue;
            if (now >= r.deadline) {
                this.finish(r, 'expired', '30 dakikalık zindan süresi doldu.');
                continue;
            }
            if (r.status === 'wipe') {
                this.finish(r,'failed','Zindan başarısız oldu. Pazar Köyü’ne dönüyorsunuz.');
                continue;
            }
            const alive = r.members.filter(p => {if(!p.left)this.refreshPumpkin499(p,now);return p.hp > 0 && !p.left;});
            for (const p of alive) {
                if (now - p.inputAt > 800){
                    p.input = { x: 0, y: 0 };
                    p.moveTarget=null;
                }
                if(p.moveTarget){
                    const goal=p.moveTarget.id?r.enemies.find(e=>e.id===p.moveTarget.id&&e.hp>0):p.moveTarget;
                    const stop=p.moveTarget.id?Math.max(80,classAttackRange(p.role,0)-50):0;
                    const distance=goal?dist(p,goal):0,strength=Math.min(1,Math.max(0,distance-stop)/(classMoveSpeed(p.role)*Math.max(.001,dt)));
                    p.input=goal&&distance>.001?{x:(goal.x-p.x)/distance*strength,y:(goal.y-p.y)/distance*strength}:{x:0,y:0};
                }
                const x = clamp(p.x + p.input.x * classMoveSpeed(p.role) * dt, DUNGEON_WORLD.minX, DUNGEON_WORLD.maxX), y = clamp(p.y + p.input.y * classMoveSpeed(p.role) * dt, DUNGEON_WORLD.minY, DUNGEON_WORLD.maxY);
                if (walkable(x, y)) {
                    p.x = x;
                    p.y = y;
                    if(Math.hypot(p.input.x,p.input.y)>.01)p.direction={...p.input};
                }
                else if (walkable(x, p.y))
                    p.x = x;
                else if (walkable(p.x, y))
                    p.y = y;
            }
            if(r.status==='complete'){if(now-(this.lastSave.get(r.id)??0)>=1000)this.periodicSave(r);continue;}
            if (r.members.every(p => p.left)) {
                this.finish(r, 'abandoned', 'Grup zindandan ayrıldı.');
                continue;
            }
            if (!alive.length || (r.mode!=='solo' && r.stage === 2 && r.crystal.hp <= 0)) {
                this.finish(r,'failed',r.mode!=='solo'&&r.stage===2&&r.crystal.hp<=0?'Çekirdek yok oldu. Zindan başarısız; Pazar Köyü’ne dönüyorsunuz.':'Grup yenildi. Zindan başarısız; Pazar Köyü’ne dönüyorsunuz.');
                continue;
            }
            r.effects = r.effects.filter(e => e.until > now);
            for (const t of r.telegraphs.filter(t => t.at <= now)) {
                r.effects.push({id:randomUUID(),kind:'impact',shape:t.kind,x:t.x,y:t.y,angle:t.angle??0,radius:t.radius,at:t.at,until:t.at+650});
                if(t.crystal&&r.stage===2&&dist(r.crystal,t)<t.radius)r.crystal.hp=Math.max(0,r.crystal.hp-t.damage);
                for (const p of alive) {
                    if(t.crystal)continue;
                    const hit = t.kind === 'line' ? Math.abs(angleDelta(Math.atan2(p.y - t.y, p.x - t.x), t.angle)) < .15 && dist(p, t) < 650 : t.kind === 'ring' ? dist(p, t) > 95 && dist(p, t) < t.radius : dist(p, t) < t.radius;
                    if (!hit)
                        continue;
                    if (this.roll() < Math.min(15, p.stats.block) / 100) {
                        r.effects.push({ id: randomUUID(), kind: 'block', actorId: p.id, x: p.x, y: p.y, text: 'BLOKLAMA', until: now + 700 });
                        continue;
                    }
                    const damage=Math.min(p.hp,Math.max(1, Math.round(t.damage * (1 - armorDamageReduction(p.stats.defense, 'dungeon'))*(p.specialGuardUntil>now?1-(colSpec456(p.role,p.stats?.specialization,this.settingsSnapshot?.('game_settings')??{events_json:this.specialistSettingsRaw459})?.guard??0):1))));
                    p.hp = Math.max(0, p.hp - damage);
                    r.effects.push({id:randomUUID(),kind:'hurt',actorId:p.id,x:p.x,y:p.y,tx:p.x,ty:p.y,text:String(damage),until:now+650});
                }
            }
            r.telegraphs = r.telegraphs.filter(t => t.at > now);
            if (r.status === 'active') {
                if(r.mode==='solo')soloTick.call(this,r);
                if (r.mode!=='solo' && r.stage === 2 && !r.waveSpawn && r.enemies.every(e => e.hp <= 0)) {
                    if (r.wave >= 3)
                        this.portal(r);
                    else if (!r.waveAt)
                        r.waveAt = now + 3500;
                    else if (now >= r.waveAt) {
                        r.wave++;
                        r.waveAt = 0;
                        // Retire the previous wave; distribute arrivals over frames instead of one burst.
                        r.enemies = [];
                        r.waveSpawn = { index: 0, count: Math.min(8, r.size + 2), nextAt: now };
                    }
                }
                if (r.mode!=='solo' && r.stage === 2 && r.waveSpawn && now >= r.waveSpawn.nextAt) {
                    const pending = r.waveSpawn;
                    this.enemy(r, 'imp', 660 + pending.index * 145, r.wave % 2 ? 260 : 1160, r.cfg.enemy_hp);
                    pending.index++;
                    pending.nextAt = now + 180;
                    if (pending.index >= pending.count) r.waveSpawn = null;
                }
                if (r.stage === 1 && r.enemies.every(e => e.hp <= 0))
                    this.portal(r);
                const boss = r.enemies.find(e => e.kind === 'boss' && e.hp > 0);
                if (boss) {
                    this.focus(r, boss);
                    if (boss.shield && !r.enemies.some(e => e.kind === 'focus' && e.hp > 0)) {
                        boss.shield = false;
                        boss.nextAttack = now + 5000;
                        r.effects.push({id:randomUUID(),kind:'impact',shape:'circle',x:boss.x,y:boss.y,radius:180,at:now,until:now+650});
                        r.message = 'Kalkan kırıldı! Muhafız savunmasız.';
                    }
                }
                for (const e of r.enemies) {
                    if (e.hp <= 0 || e.kind === 'focus')
                        continue;
                    const connected = alive.filter(p => p.hp>0 && now - p.seen < 10000 && (e.kind !== 'seal' || dist(p,e) < 550)), nearest = connected.reduce((best, p) => !best || dist(p, e) < dist(best, e) ? p : best, null);
                    const previous=connected.find(p=>p.id===e.targetId),target=previous&&(!nearest||dist(previous,e)<=dist(nearest,e)+40)?previous:nearest;
                    e.targetId=target?.id;
                    e.moving=false;
                    if(target&&now>=(e.castingUntil??0)){const d=Math.max(1,dist(target,e));e.direction={x:(target.x-e.x)/d,y:(target.y-e.y)/d};}
                    if (e.kind !== 'imp' && target && !e.shield && now >= (e.rootUntil??0) && now >= (e.castingUntil??0) && dist(e,target)>(e.kind==='boss'?210:115)) {
                        const d=dist(e,target),speed=e.kind==='boss'?115:100;
                        const step=r.mode==='solo'?Math.min(speed*dt,Math.max(0,d-(e.kind==='boss'?210:115))):speed*dt;
                        e.x=clamp(e.x+(target.x-e.x)/d*step,DUNGEON_WORLD.minX,DUNGEON_WORLD.maxX);
                        e.y=clamp(e.y+(target.y-e.y)/d*step,DUNGEON_WORLD.minY,DUNGEON_WORLD.maxY);e.moving=step>0;
                    }
                    if (e.kind === 'imp') {
                        if(now<(e.castingUntil??0))continue;
                        const objective = target && dist(target, e) < 150 ? target : r.crystal;
                        const d = dist(e, objective);
                        e.direction={x:objective.x-e.x,y:objective.y-e.y};
                        if (d > 60 && now >= (e.rootUntil ?? 0)) {
                            e.moving=true;
                            e.x += (objective.x - e.x) / d * 95 * dt;
                            e.y += (objective.y - e.y) / d * 95 * dt;
                        }
                        else if (now >= e.nextAttack) {
                            e.lastAttack=now;
                            e.nextAttack = now + (r.mode==='solo'?900:1800);
                            e.strikeAt=now+800;e.castingUntil=e.strikeAt+350;
                            r.telegraphs.push({ id: randomUUID(),source:e.id,kind: 'circle', x: e.x, y: e.y, radius: 95, startedAt:now,at:e.strikeAt,crystal:objective===r.crystal,damage: r.cfg.enemy_damage });
                        }
                    }
                    else if (target && dist(e,target)<(e.kind==='boss'?540:r.mode==='solo'?135:185) && now >= e.nextAttack && now>=(e.rootUntil??0) && (r.mode!=='solo'||now>=(e.castingUntil??0)) && !e.shield) {
                        e.attackCount++;
                        e.lastAttack=now;e.moving=false;
                        const kind = e.kind === 'boss' ? (e.attackCount % 3 === 0 ? 'ring' : 'line') : 'circle';
                        e.strikeAt=now+(kind==='line'?1600:2000);e.castingUntil=e.strikeAt+350;
                        r.telegraphs.push({ id: randomUUID(),source:e.id,kind, x: e.x, y: e.y, angle: Math.atan2(target.y - e.y, target.x - e.x), radius: kind === 'ring' ? 360 : 135, startedAt:now,at:e.strikeAt, damage: e.kind === 'boss' ? r.cfg.boss_damage : r.cfg.enemy_damage });
                        e.nextAttack = now + (e.kind === 'boss' ? 5000 : 4000)*(r.mode==='solo'?.5:1);
                    }
                }
            }
            if(r.status==='portal'&&now>=(r.portalAt??0)+1000&&alive.some(p=>p.hp>0&&dist(p,dungeonPortal(r.stage))<=85)){
                r.stage++;this.stage(r);this.save(r);continue;
            }
            if (now - (this.lastSave.get(r.id) ?? 0) >= 1000)
                this.periodicSave(r);
        }
    }
    portal(r) { r.status = 'portal'; r.portalAt=this.now();r.telegraphs = []; r.message = r.mode==='solo'?'Bölge temizlendi. Açılan geçitten sonraki kademeye ilerle.':r.stage===1?'Üç mühür kırıldı. Haritanın ortasında açılan geçide yürüyün.':'Bölge tamamlandı. Kuzey geçidine yürüyün; grup sonraki haritaya geçer.'; this.save(r); }
    finish(r,status,message) {return this.measure('dungeon_finish',()=>this.finishRun(r,status,message));}
    finishRun(r, status, message) {
        const before={status:r.status,message:r.message};
        try{this.transaction(() => {
            this.db.prepare(`UPDATE players SET area='bazaar',x=1910,y=660,hp=max_hp${this.returnRevisions} WHERE id IN (SELECT player_id FROM dungeon_members WHERE run_id=?)`).run(r.id);
            r.status=status;r.message=message;this.save(r);
            this.db.prepare('DELETE FROM dungeon_members WHERE run_id=?').run(r.id);
        });}catch(error){Object.assign(r,before);throw error;}
        for(const [id,n] of this.notices)if(this.now()-n.at>300000)this.notices.delete(id);
        for(const p of r.members)this.notices.set(p.id,{message,at:this.now()});
        this.runs.delete(r.id);this.lastSave.delete(r.id);this.persistedAt.delete(r.id);
    }
    material(id, kind, amount) { this.db.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount').run(id, kind, amount); }
    eventChest(r,enemy,save=true){
      const config=readEventsConfig(this.gameSettings()?.events_json);
      const chance=eventBonus(config,'chest',this.now()/1000);
      if(chance<=0)return;
      const effects=[];
      this.transaction(()=>{
        for(const p of r.members.filter(p=>!p.left)){
          const amount=this.roll()*100<chance*balanceFactor487(balanceFromSettings487(this.gameSettings()),r.mode==='solo'?'solo':'dungeon',p.stats?.level??p.level)?1:0;
          const claim=this.db.prepare('INSERT OR IGNORE INTO dungeon_event_claims(run_id,enemy_id,player_id,amount) VALUES(?,?,?,?)').run(r.id,enemy.id,p.id,amount);
          if(claim.changes&&amount){this.db.prepare("INSERT INTO player_stones(player_id,kind,amount) VALUES(?,'crystal_chest',1) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+1").run(p.id);
            effects.push({id:randomUUID(),kind:'chest',x:enemy.x,y:enemy.y,text:'Kristal Sandığı · '+p.name,until:this.now()+5000});}
        }
        if(save)this.save(r);
      });
      r.effects.push(...effects);
    }
    redGear(id, role, helmet = false, ground = false) { const kind = helmet ? 'helmet' : ['weapon', 'armor', 'shoes', 'necklace'][randomInt(4)], itemId = randomUUID(); const cfg = { ...this.gameSettings(), ...this.combatSettings() }; const category = kind === 'weapon' ? 'weapon' : 'armor'; const min = Math.max(1, Number(cfg['red_' + category + '_power_min']) || 60), max = Math.max(min, Number(cfg['red_' + category + '_power_max']) || 85); const power = Math.round(min + this.roll() * (max - min)); if(!ground)this.db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at) VALUES(?,?,?,?,'red',?,?,'[]',0,?)").run(itemId, id, kind, 'Çekirdeğin Kızıl ' + LABELS[kind], power, role, Math.floor(this.now() / 1000)); return { kind, itemId,power,role,amount:1,name: 'Çekirdeğin Kızıl ' + LABELS[kind] }; }
    reward(r) {return this.measure('dungeon_reward',()=>this.withStepSettings(()=>this.rewardRun(r)));}
    rewardRun(r) {
        if(r.mode==='solo')return rewardSolo.call(this,r);
        if(r.status==='complete')return;
        // Reward log PK plus one transaction prevents retries/restarts paying twice.
        const eventConfig=readEventsConfig(this.gameSettings()?.events_json);
        const rewardTime=this.now()/1000;
        const eventMultiplier=1+eventBonus(eventConfig,'loot',rewardTime)/100;
        const chestChance=eventBonus(eventConfig,'chest',rewardTime);
        const winner = [...r.members].filter(p => !p.left && p.damage > 0).sort((a, b) => b.damage - a.damage || a.id.localeCompare(b.id))[0];
        const before={rewards:structuredClone(r.rewards),groundLoot:structuredClone(r.groundLoot??[]),status:r.status,message:r.message,deadline:r.deadline},health=r.members.map(p=>[p.hp,p.positionEpoch]);
        try{this.transaction(() => {
            for (const p of r.members) {
                if (p.left)
                    continue;
                if (this.db.prepare('SELECT 1 FROM dungeon_rewards WHERE run_id=? AND player_id=?').get(r.id, p.id))
                    continue;
                const balance487=balanceFactor487(balanceFromSettings487(this.gameSettings()),'dungeon',p.stats?.level??p.level);
                const rewards = [];
                if(chestChance>0&&this.roll()*100<chestChance*balance487)rewards.push({kind:'crystal_chest',name:'Kristal Sandığı',amount:1});
                for (const kind of MATERIALS) {
                    const bonusChance=Number(r.cfg[kind+'_bonus_chance']??10);
                    rewards.push({kind,amount:1+(this.roll()<Math.min(1,bonusChance/100*eventMultiplier)?1:0)});
                }
                if (this.roll() < Math.min(1,r.cfg.red_chance / 100*eventMultiplier*balance487))
                    rewards.push(this.redGear(p.id, p.role,false,true));
                if (this.roll() < Math.min(1,r.cfg.helmet_chance / 100*eventMultiplier*balance487))
                    rewards.push(this.redGear(p.id, p.role, true,true));
                if (p.id === winner?.id) {

                    if(r.cfg.winner_gems>0)rewards.push({ kind: 'gems', amount: r.cfg.winner_gems });
                    if(this.roll()<Math.min(1,(r.cfg.winner_red_chance??100)/100*eventMultiplier))rewards.push(this.redGear(p.id,p.role,false,true));
                }
                // Independent fixed chances; loot-event bonuses do not change these two rolls.
                if(this.roll()<.25)rewards.push({kind:'evolution_scroll',name:'Evrim Parşömeni',amount:1});
                if(this.roll()<.25)rewards.push({kind:'stone_book',name:'Taş Sanatı Kitabı',amount:1});
                this.db.prepare('INSERT INTO dungeon_rewards(run_id,player_id,rewards,created_at) VALUES(?,?,?,?)').run(r.id, p.id, JSON.stringify(rewards), this.now());
                r.rewards[p.id] = rewards;
                const boss=r.enemies.find(e=>e.kind==='boss')??{x:1200,y:800};r.groundLoot??=[];
                // Keep the entire loose cluster reachable even when the boss died at a wall.
                const cx=clamp(boss.x,460,1940),cy=clamp(boss.y,370,1100);
                rewards.forEach((d,i)=>{const row=Math.floor(i/3),col=i%3;
                    r.groundLoot.push({...d,id:randomUUID(),ownerId:p.id,x:cx+(col-1)*200+(row%2?32:-18)+(i%2)*12,y:cy+(row-1)*115+(col===1?-18:12)});
                });
            }
            const leaderName=r.members.find(p=>p.id===r.leaderId)?.name??this.player(r.leaderId).name;
            const announcedAt=this.now();
            this.db.prepare(`INSERT OR IGNORE INTO messages
              (player_id,player_name,recipient_id,scope,area,channel,body,created_at,announcement_expires_at_ms,announcement_request_id)
              SELECT ?,'ZİNDAN',NULL,'world',NULL,1,?,
              MAX(?,COALESCE((SELECT MAX(announcement_expires_at_ms) FROM messages WHERE announcement_expires_at_ms>?),0))/1000,
              MAX(?,COALESCE((SELECT MAX(announcement_expires_at_ms) FROM messages WHERE announcement_expires_at_ms>?),0))+7000,?`)
              .run(r.leaderId,leaderName+' ve grubu Zindanı ele geçirdi',announcedAt,announcedAt,announcedAt,announcedAt,'dungeon:'+r.id);
            r.status = 'complete';
            r.message = 'Boss yenildi! Yerdeki ganimetlerini topla. 1 dakika sonra Pazar Köyü’ne döneceksiniz.';
            r.deadline = this.now() + 60000;
            for(const p of r.members)if(!p.left&&p.hp<=0){this.refreshPumpkin499(p);p.hp=p.maxHp;p.positionEpoch=(p.positionEpoch??0)+1;}
            this.save(r);
        });}catch(error){Object.assign(r,before);r.members.forEach((p,i)=>{p.hp=health[i][0];p.positionEpoch=health[i][1];});throw error;}
    }
    craft(id, input) {
        const request = String(input.requestId ?? '');
        if (!/^[a-zA-Z0-9-]{16,80}$/.test(request))
            throw new Error('Geçerli işlem kimliği gerekiyor.');
        this.keeper(id);
        return this.transaction(() => {
            const previous = this.db.prepare('SELECT result FROM dungeon_crafts WHERE player_id=? AND request_id=?').get(id, request);
            if (previous)
                return JSON.parse(previous.result);
            const cfg = this.settings(), kind = String(input.kind), p = this.player(id);
            if (!MATERIALS.includes(kind))
                throw new Error('Geçersiz dönüşüm.');
            const count = this.materials(id)[kind] ?? 0, cost = cfg[kind + '_cost'], gems = kind === 'infinite' ? cfg.infinite_gems : kind === 'pet' ? cfg.pet_gems : 0, pearls = kind === 'infinite' ? cfg.infinite_pearls : 0;
            if (count < cost || p.gems < gems || p.pearls < pearls)
                throw new Error('Malzeme veya mücevher yetersiz.');
            if (kind === 'wing') {
                if (this.db.prepare('SELECT 1 FROM dungeon_wings WHERE player_id=?').get(id))
                    throw new Error('Bu kanada zaten sahipsin.');
                this.db.prepare('INSERT INTO dungeon_wings(player_id,equipped) VALUES(?,1)').run(id);
            }
            else if (kind === 'pet') {
                if (this.db.prepare("SELECT 1 FROM player_pets WHERE player_id=? AND kind='dragon' AND acquired_at+(CASE WHEN kind=char(115,116,97,114,116,101,114) THEN 259200 ELSE 604800 END)>unixepoch()").get(id))
                    throw new Error('Ejderha petine zaten sahipsin.');
                this.db.prepare("INSERT INTO player_pets(player_id,kind,equipped,acquired_at) VALUES(?,'dragon',0,?) ON CONFLICT(player_id,kind) DO UPDATE SET acquired_at=excluded.acquired_at,equipped=0").run(id, Math.floor(this.now() / 1000));
            }
            else {
                const item = this.db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?').get(String(input.itemId ?? ''), id);
                if (!item || item.rarity !== 'unique' || !GEAR.includes(item.kind))
                    throw new Error('Sana ait Eşsiz bir ekipman seç. Kuşanılmış eşya da seçilebilir.');
                const enhancementLevel = enhancementLevel491(item);
                this.db.prepare("UPDATE player_items SET rarity='infinite',item_name=?,power=? WHERE id=? AND player_id=? AND rarity='unique'").run('+'+enhancementLevel+' Sonsuz '+enhancementBaseName491(item.item_name).replace(/^Eşsiz\s+/u,''), infiniteEquipmentPower(item,cfg), item.id, id);
            }
            globalThis.__colPremium?.refreshHp(id);
            this.db.prepare('UPDATE dungeon_materials SET amount=amount-? WHERE player_id=? AND kind=?').run(cost, id, kind);
            this.db.prepare('UPDATE players SET gems=gems-?,pearls=pearls-? WHERE id=?').run(gems, pearls, id);
            const result = { ok: true, message: 'Dönüşüm tamamlandı. Eşyan envanterinde.' };
            this.db.prepare('INSERT INTO dungeon_crafts(player_id,request_id,result) VALUES(?,?,?)').run(id, request, JSON.stringify(result));
            return result;
        });
    }
    admin(input) {
        if (input.action === 'settings') {
            const cfg = validateDungeonSettings(input.settings ?? {});
            this.db.prepare('UPDATE dungeon_settings SET value=? WHERE id=1').run(JSON.stringify(cfg));
            return { ok: true };
        }
        if (input.action === 'grant') {
            const p = this.db.prepare('SELECT id FROM players WHERE name=?').get(String(input.playerName ?? ''));
            if (!p)
                throw new Error('Oyuncu bulunamadı.');
            const kind = String(input.kind);
            if (MATERIALS.includes(kind)) {
                const n = Number(input.amount);
                if (!Number.isSafeInteger(n) || n < 1 || n > 10000)
                    throw new Error('Miktar 1–10000 olmalı.');
                this.material(p.id, kind, n);
            }
            else if (kind === 'wings')
                this.db.prepare('INSERT OR IGNORE INTO dungeon_wings(player_id,equipped) VALUES(?,0)').run(p.id);
            else if (kind === 'dragon')
                this.db.prepare("INSERT OR IGNORE INTO player_pets(player_id,kind,equipped,acquired_at) VALUES(?,'dragon',0,?)").run(p.id, Math.floor(this.now() / 1000));
            else
                throw new Error('Geçersiz ödül.');
            return { ok: true };
        }
        throw new Error('Geçersiz yönetim işlemi.');
    }
}
