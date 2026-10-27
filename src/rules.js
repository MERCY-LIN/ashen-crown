/* 灰烬王冠 — 规则引擎：d100 检定、战斗、伤害、法术、成长 */
(function (root) {
  'use strict';
  var G = root.G = root.G || {};

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rnd(n) { return Math.floor(Math.random() * n) + 1; }
  function d10() { return rnd(10); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function tens(n) { return Math.floor(n / 10); }
  function isDouble(n) { return n % 11 === 0 && n <= 99; }
  function fmt(n) { return (n >= 0 ? '+' : '') + n; }

  function timeLabel(clock) {
    clock = Math.max(0, Math.floor(clock || 0));
    var day = Math.floor(clock / 24) + 1;
    var hour = clock % 24;
    return '第' + day + '天 ' + (hour < 10 ? '0' : '') + hour + ':00';
  }

  function advanceTime(state, hours) {
    if (!hours) return state.clock;
    state.clock = (state.clock || 8) + hours;
    state.timeSpent = (state.timeSpent || 0) + hours;
    if (state.lastRest === undefined) state.lastRest = 8;
    var prevFatigue = state.fatigue || 0;
    state.fatigue = Math.min(2, Math.max(0, Math.floor((state.clock - state.lastRest) / 24)));
    if (state.fatigue > prevFatigue && state.log) {
      state.log.push('你已经很久没有休息了。所有检定 -' + (state.fatigue * 10) + '。');
    }
    return state.clock;
  }

  function rollDice(expr) {
    var m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(String(expr).replace(/\s/g, ''));
    if (!m) return 0;
    var count = +m[1], sides = +m[2], mod = m[3] ? +m[3] : 0, total = 0;
    for (var i = 0; i < count; i++) total += rnd(sides);
    return total + mod;
  }

  /* ------------------------------------------------------------------ */
  /* 角色创建                                                            */
  /* ------------------------------------------------------------------ */
  function applyMods(stats, mods) {
    if (!mods) return;
    for (var k in mods) if (stats[k] !== undefined) stats[k] += mods[k];
  }

  function createCharacter(opts) {
    var race = null, career = null, i;
    for (i = 0; i < G.data.RACES.length; i++) if (G.data.RACES[i].id === opts.raceId) race = G.data.RACES[i];
    for (i = 0; i < G.data.CAREERS.length; i++) if (G.data.CAREERS[i].id === opts.careerId) career = G.data.CAREERS[i];
    if (!race || !career) throw new Error('未知的种族或职业');

    var stats = {};
    G.data.CHARS.forEach(function (c) { stats[c.id] = 30; });
    applyMods(stats, race.mods);
    applyMods(stats, career.mods);

    var skills = {};
    Object.keys(G.data.SKILLS).forEach(function (id) { skills[id] = { adv: 0, trained: false }; });

    var talents = [race.talent].concat(career.talents || []).filter(Boolean);
    var talentWounds = 0, talentFate = 0, talentInit = 0, talentDamage = 0, xpBonus = 0;

    Object.keys(career.skills || {}).forEach(function (id) {
      if (!skills[id]) skills[id] = { adv: 0, trained: false };
      skills[id].adv += career.skills[id];
      skills[id].trained = true;
    });

    talents.forEach(function (tid) {
      var t = G.data.TALENTS[tid];
      if (!t) return;
      applyMods(stats, t.stats);
      if (t.skills) {
        Object.keys(t.skills).forEach(function (sid) {
          if (!skills[sid]) skills[sid] = { adv: 0, trained: false };
          skills[sid].adv += t.skills[sid];
          skills[sid].trained = true;
        });
      }
      talentWounds += t.wounds || 0;
      talentFate += t.fate || 0;
      talentInit += t.init || 0;
      talentDamage += t.damage || 0;
      if (t.xp) xpBonus += t.xp;
    });

    // 所有角色都受过最基本的自卫训练，避免非战斗职业完全无法应战
    ['melee', 'dodge'].forEach(function (id) {
      if (!skills[id]) skills[id] = { adv: 0, trained: false };
      if (skills[id].adv < 10) skills[id].adv = 10;
      skills[id].trained = true;
    });

    var sb = tens(stats.s), tb = tens(stats.t), wpb = tens(stats.wp);
    var maxWounds = sb + 2 * tb + wpb + 13 + (race.wounds || 0) + talentWounds;

    var items = {};
    (career.items || []).forEach(function (id) { items[id] = (items[id] || 0) + 1; });
    items.bandage = (items.bandage || 0) + 1;

    var rankData = G.data.CAREER_RANKS[career.id] || { titles: [career.name], status: [2, 2, 3, 4] };

    var state = {
      version: 1,
      name: opts.name || '无名者',
      raceId: race.id,
      careerId: career.id,
      rank: 1,
      status: rankData.status[0] || 2,
      title: rankData.titles[0] || career.name,
      stats: stats,
      skills: skills,
      talents: talents,
      spells: (career.spells || []).slice(),
      wounds: maxWounds,
      maxWounds: maxWounds,
      fate: race.fate + talentFate,
      maxFate: race.fate + talentFate,
      fortune: race.fate + talentFate,
      resilience: race.resilience,
      resolve: race.resilience,
      xp: 50 + xpBonus,
      totalXp: 50 + xpBonus,
      gold: career.money || 10,
      items: items,
      statBuys: {},
      weapons: (career.weapons || ['unarmed']).slice(),
      armour: Object.assign({ head: 0, arms: 0, body: 0, legs: 0 }, career.armour || {}),
      clues: [],
      flags: {},
      npcs: {},
      party: [],
      prep: 0,
      corruption: race.id === 'chaos' ? 1 : 0,
      mutations: [],
      bonusDamage: talentDamage + 2,
      isPlayer: true,
      initBonus: talentInit,
      sceneId: null,
      act: 1,
      clock: 8,
      deadline1: 80,
      timeSpent: 0,
      lastRest: 8,
      fatigue: 0,
      mode: 'story',
      combat: null,
      log: [],
      history: [],
      difficulty: 'normal'
    };

    state.maxWounds = maxWounds + (state.mutations || []).reduce(function (a, m) { return a + (m.wounds || 0); }, 0);
    state.wounds = state.maxWounds;
    state.statsVersion = 0;
    initNPCs(state);
    return state;
  }

  function initNPCs(state) {
    state.npcs = state.npcs || {};
    Object.keys(G.data.NPCS).forEach(function (id) {
      if (!state.npcs[id]) {
        state.npcs[id] = {
          affinity: 0, met: false, recruited: false,
          talkAct: 0, gift: false, questDone: false, wounded: false
        };
      }
    });
    state.party = state.party || [];
    state.prep = state.prep || 0;
  }

  function npcOf(state, id) {
    initNPCs(state);
    return state.npcs[id];
  }

  function meetNPC(state, id, base) {
    if (!G.data.NPCS[id]) return null;
    var n = npcOf(state, id);
    if (!n.met) {
      n.met = true;
      state.log.push('结识了' + G.data.NPCS[id].name + '。');
    }
    if (base) n.affinity = Math.max(n.affinity, base);
    return n;
  }

  function addAffinity(state, id, amount) {
    var n = npcOf(state, id);
    if (!n) return 0;
    var before = n.affinity;
    n.affinity = clamp(n.affinity + amount, 0, 100);
    state.log.push(G.data.NPCS[id].name + ' 好感 ' + before + ' → ' + n.affinity);
    return n.affinity;
  }

  function canRecruit(state, id) {
    var n = npcOf(state, id);
    if (!n || !n.met || n.recruited) return false;
    if (n.affinity < 40) return false;
    return (state.party || []).length < 2;
  }

  function recruitNPC(state, id) {
    if (!canRecruit(state, id)) return false;
    var n = state.npcs[id];
    n.recruited = true;
    n.wounded = false;
    state.party.push(id);
    state.log.push(G.data.NPCS[id].name + ' 加入了队伍。');
    return true;
  }

  function dismissNPC(state, id) {
    var n = state.npcs[id];
    if (!n || !n.recruited) return false;
    n.recruited = false;
    state.party = state.party.filter(function (x) { return x !== id; });
    state.log.push(G.data.NPCS[id].name + ' 离开了队伍。');
    return true;
  }

  function makeAlly(id) {
    var d = G.data.NPCS[id];
    if (!d) return null;
    var stats = Object.assign({}, d.stats);
    var skills = {};
    Object.keys(G.data.SKILLS).forEach(function (k) { skills[k] = { adv: 0, trained: true }; });
    skills.melee.adv = 10;
    skills.ranged.adv = 10;
    skills.dodge.adv = 5;
    skills.magic.adv = 15;
    return {
      uid: 'ally_' + id, npcId: id, name: d.name, isAlly: true,
      stats: stats, skills: skills,
      wounds: d.wounds, maxWounds: d.wounds,
      armour: Object.assign({ head: 0, arms: 0, body: 0, legs: 0 }, d.armour || {}),
      weapons: (d.weapons || ['unarmed']).slice(),
      spells: (d.spells || []).slice(),
      ai: d.ai || 'soldier',
      conditions: [], defense: 0
    };
  }

  var RANK_COSTS = {
    2: { xp: 60, renown: 1 },
    3: { xp: 150, renown: 2 },
    4: { xp: 300, renown: 3 }
  };

  function statusName(tier) {
    var s = G.data.STATUS.filter(function (x) { return x.tier === tier; })[0];
    return s ? s.name : ('阶级 ' + tier);
  }

  function renown(state) {
    var n = 0;
    if (state.flags && state.flags.ch1Done) n++;
    if (state.flags && state.flags.siegeWon) n++;
    if (state.flags && state.flags.bossWon) n++;
    return n;
  }

  function nextRank(state) {
    if (!state.rank || state.rank >= 4) return null;
    var next = state.rank + 1;
    var cfg = RANK_COSTS[next];
    var data = G.data.CAREER_RANKS[state.careerId];
    if (!data) return null;
    return {
      rank: next, xp: cfg.xp, renown: cfg.renown,
      title: data.titles[next - 1],
      status: data.status[next - 1],
      haveRenown: renown(state)
    };
  }

  function promote(state) {
    var info = nextRank(state);
    if (!info) return { error: '已达最高职业等级。' };
    if (state.xp < info.xp) return { error: '经验不足：需要 ' + info.xp + ' XP。' };
    if (renown(state) < info.renown) return { error: '功勋不足：需要 ' + info.renown + ' 点功勋。' };
    state.xp -= info.xp;
    state.rank = info.rank;
    state.status = info.status;
    state.title = info.title;
    state.maxWounds += 1;
    state.wounds += 1;
    var career = G.data.CAREERS.filter(function (c) { return c.id === state.careerId; })[0];
    Object.keys(career.skills || {}).slice(0, 2).forEach(function (id) {
      if (!state.skills[id]) state.skills[id] = { adv: 0, trained: false };
      state.skills[id].adv += 5;
      state.skills[id].trained = true;
    });
    if (info.rank === 3) {
      state.maxFate += 1;
      state.fate += 1;
      state.fortune += 1;
    }
    if (info.rank === 4) {
      state.bonusDamage += 2;
      ['head', 'arms', 'body', 'legs'].forEach(function (l) {
        state.armour[l] = (state.armour[l] || 0) + 1;
      });
    }
    state.log.push('晋升：' + info.title + '（' + statusName(info.status) + '）。');
    return { ok: true, info: info };
  }

  function recalc(state) {
    var sb = tens(state.stats.s), tb = tens(state.stats.t), wpb = tens(state.stats.wp);
    var base = sb + 2 * tb + wpb + 13 + ((state.rank || 1) - 1);
    var race = G.data.RACES.filter(function (r) { return r.id === state.raceId; })[0];
    if (race) base += race.wounds || 0;
    (state.talents || []).forEach(function (tid) {
      var t = G.data.TALENTS[tid];
      if (t && t.wounds) base += t.wounds;
    });
    (state.mutations || []).forEach(function (m) { base += m.wounds || 0; });
    var diff = base - state.maxWounds;
    if (diff > 0) { state.maxWounds = base; state.wounds += diff; }
    else { state.maxWounds = base; state.wounds = Math.min(state.wounds, base); }
  }

  function sb(state) { return tens(state.stats.s); }
  function tb(state) { return tens(state.stats.t); }
  function wpb(state) { return tens(state.stats.wp); }

  /* ------------------------------------------------------------------ */
  /* 检定                                                                */
  /* ------------------------------------------------------------------ */
  function skillInfo(actor, skillId) {
    var meta = G.data.SKILLS[skillId];
    var own = actor.skills && actor.skills[skillId];
    return {
      meta: meta,
      adv: own ? own.adv : 0,
      trained: own ? own.trained : false
    };
  }

  function testTarget(actor, opts) {
    var skillId = opts.skill;
    var meta = skillId ? G.data.SKILLS[skillId] : null;
    var charId = opts.char || (meta ? meta.char : 'int');
    var base = actor.stats[charId] || 0;
    var info = skillId ? skillInfo(actor, skillId) : { adv: 0, trained: true };
    var penalty = 0;
    if (skillId && meta) {
      if (meta.advanced && !info.trained) penalty = -20;
      if (!meta.advanced && !info.trained) penalty = -10;
    }
    var target = base + info.adv + penalty + (opts.difficulty || 0) + (opts.bonus || 0);
    if (skillId && typeof actor.status === 'number' && ['persuade', 'intimidate', 'charm', 'gossip'].indexOf(skillId) >= 0) {
      target += (actor.status - 2) * 5;
    }
    if (actor.fatigue) target -= 10 * actor.fatigue;
    if (actor.conditions) {
      actor.conditions.forEach(function (c) {
        if (c.id === 'prone') target -= 10;
        if (c.id === 'chill') target -= 10;
        if (c.id === 'stun') target -= 10;
      });
    }
    return { target: clamp(target, 5, 95), charId: charId, base: base, adv: info.adv, penalty: penalty };
  }

  function actorTest(actor, opts) {
    var t = testTarget(actor, opts);
    var roll = rnd(100);
    var success = roll <= t.target;
    var sl = tens(t.target) - tens(roll);
    if (roll === 100) success = false;
    if (!success && sl >= 0) sl = Math.max(sl, 0) - 1;
    var crit = isDouble(roll);
    return {
      roll: roll, target: t.target, success: success, sl: sl,
      crit: crit, criticalFail: roll === 100 || (crit && !success),
      label: opts.label || (opts.skill ? G.data.SKILLS[opts.skill].name : G.charName(t.charId)),
      skill: opts.skill || null, charId: t.charId
    };
  }

  function test(state, opts) { return actorTest(state, opts); }

  function opposedTest(a, b, aOpts, bOpts) {
    var at = actorTest(a, aOpts);
    var bt = actorTest(b, bOpts);
    var winner = null;
    if (at.success && !bt.success) winner = 'a';
    else if (!at.success && bt.success) winner = 'b';
    else if (at.success && bt.success) winner = at.sl > bt.sl ? 'a' : (bt.sl > at.sl ? 'b' : 'tie');
    else winner = at.sl > bt.sl ? 'a' : (bt.sl > at.sl ? 'b' : 'tie');
    return { a: at, b: bt, winner: winner, diff: Math.abs(at.sl - bt.sl) };
  }

  /* ------------------------------------------------------------------ */
  /* 命中部位与伤害                                                       */
  /* ------------------------------------------------------------------ */
  function hitLocation(roll) {
    var rev = roll === 100 ? 100 : (roll % 10) * 10 + Math.floor(roll / 10);
    if (rev <= 15) return { id: 'head', name: '头部' };
    if (rev <= 35) return { id: 'arms', name: '左臂' };
    if (rev <= 55) return { id: 'arms', name: '右臂' };
    if (rev <= 80) return { id: 'body', name: '躯干' };
    if (rev <= 90) return { id: 'legs', name: '左腿' };
    return { id: 'legs', name: '右腿' };
  }

  function armourAt(actor, loc) {
    var ap = actor.armour ? (actor.armour[loc] || 0) : 0;
    if (actor.armourBuff) ap += actor.armourBuff.ap || 0;
    return ap;
  }

  function weaponOf(actor, kind) {
    var list = (actor.weapons || ['unarmed']);
    var best = null;
    list.forEach(function (wid) {
      var w = G.data.WEAPONS[wid];
      if (!w) return;
      if (kind === 'melee' && w.type !== 'melee') return;
      if (kind === 'ranged' && w.type !== 'ranged') return;
      if (!best || w.dmg > best.w.dmg) best = { id: wid, w: w };
    });
    if (!best) best = { id: 'unarmed', w: G.data.WEAPONS.unarmed };
    return best;
  }

  function addCondition(actor, cond, duration) {
    actor.conditions = actor.conditions || [];
    var existing = actor.conditions.filter(function (c) { return c.id === cond.id; })[0];
    if (existing) { existing.duration = Math.max(existing.duration, duration); return; }
    actor.conditions.push({ id: cond.id, name: cond.name, duration: duration });
  }

  function hasCondition(actor, id) {
    return !!(actor.conditions && actor.conditions.filter(function (c) { return c.id === id; }).length);
  }

  function tickConditions(actor, log) {
    if (!actor.conditions) return;
    actor.conditions.forEach(function (c) {
      if (c.id === 'bleed') {
        actor.wounds = Math.max(0, actor.wounds - (1));
        if (log) log.push(actor.name + '因流血失去 1 点伤口。');
      }
      if (c.id === 'burn') {
        actor.wounds = Math.max(0, actor.wounds - (2));
        if (log) log.push(actor.name + '被火焰灼烧，失去 2 点伤口。');
      }
      c.duration -= 1;
    });
    actor.conditions = actor.conditions.filter(function (c) { return c.duration > 0; });
  }

  /* ------------------------------------------------------------------ */
  /* 战斗                                                                */
  /* ------------------------------------------------------------------ */
  function makeEnemy(key, index) {
    var e = G.data.ENEMIES[key];
    if (!e) throw new Error('未知敌人 ' + key);
    var stats = { ws: e.ws, bs: e.bs, s: e.s, t: e.t, ag: e.ag, int: e.int, wp: e.wp, fel: e.fel };
    var skills = {};
    Object.keys(G.data.SKILLS).forEach(function (id) { skills[id] = { adv: 0, trained: true }; });
    skills.melee.adv = 0; skills.dodge.adv = 0; skills.ranged.adv = 0;
    return {
      uid: 'e' + index,
      key: key,
      name: e.name + (index > 0 ? ' ' + ['甲', '乙', '丙', '丁', '戊'][index - 1] : ''),
      desc: e.desc,
      stats: stats,
      skills: skills,
      wounds: e.wounds,
      maxWounds: e.wounds,
      armour: Object.assign({ head: 0, arms: 0, body: 0, legs: 0 }, e.armour || {}),
      weapons: [e.weapon || 'unarmed'],
      weapon: e.weapon || 'unarmed',
      spells: e.spells || [],
      conditions: [],
      xp: e.xp, gold: e.gold, ai: e.ai || 'aggressive', boss: !!e.boss
    };
  }

  function initOf(actor) {
    var total = actor.stats.ag + actor.stats.int + (actor.initBonus || 0);
    var fast = (actor.weapons || []).some(function (w) {
      var wp = G.data.WEAPONS[w];
      return wp && wp.qualities && wp.qualities.indexOf('fast') >= 0;
    });
    if (fast) total += 2;
    return total;
  }

  function startCombat(state, groups, opts) {
    opts = opts || {};
    var enemies = [];
    groups.forEach(function (g) {
      for (var i = 0; i < (g.count || 1); i++) enemies.push(makeEnemy(g.key, i));
    });
    var allies = (state.party || []).map(makeAlly).filter(Boolean);
    if (state.flags.riftLate) {
      enemies.forEach(function (e) {
        if (e.boss) { e.wounds += 6; e.maxWounds += 6; }
      });
    }
    if (state.tempAlly && allies.every(function (a) { return a.npcId !== state.tempAlly; })) {
      var tmp = makeAlly(state.tempAlly);
      if (tmp) { tmp.temporary = true; allies.push(tmp); }
    }
    state.combat = {
      enemies: enemies,
      allies: allies,
      round: 1,
      distance: opts.distance || 'close',
      log: [],
      awaiting: true,
      target: 0,
      aim: false,
      defense: 0,
      reload: false,
      spellsCast: 0,
      winScene: opts.winScene,
      loseScene: opts.loseScene,
      fleeScene: opts.fleeScene,
      intro: opts.intro || ''
    };
    state.mode = 'combat';
    state.defense = 0;
    var log = state.combat.log;
    log.push('—— 战斗开始 ——');
    if (opts.intro) log.push(opts.intro);
    enemies.forEach(function (e) { log.push('『' + e.name + '』拦在你面前：' + e.desc); });
    allies.forEach(function (a) { log.push('【同伴】' + a.name + '与你并肩。'); });
    if (state.flags.riftLate) log.push('裂痕扩张的力量灌进了敌人的身体。');

    var playerInit = initOf(state) + rnd(10);
    var enemyFastest = -99;
    enemies.forEach(function (e) { enemyFastest = Math.max(enemyFastest, initOf(e) + rnd(10)); });
    state.combat.playerFirst = playerInit >= enemyFastest;
    if (!state.combat.playerFirst) {
      log.push('敌人抢得先机！');
      enemyRound(state);
      state.combat.round += 1;
    }
    return state.combat;
  }

  function livingEnemies(cb) {
    return cb.enemies.filter(function (e) { return e.wounds > 0; });
  }

  function bestDefense(actor) {
    var dodge = actorTest(actor, { skill: 'dodge', label: '闪避' });
    var parryOpts = { skill: 'parry', label: '格挡' };
    if ((actor.weapons || []).indexOf('shield') >= 0) parryOpts.bonus = 10;
    var parry = actorTest(actor, parryOpts);
    var best = dodge;
    if (parry.success && (!dodge.success || parry.sl > dodge.sl)) best = parry;
    else if (!dodge.success && parry.success) best = parry;
    else if (dodge.success && parry.success && parry.sl > dodge.sl) best = parry;
    return best;
  }

  function attack(attacker, defender, kind, opts) {
    opts = opts || {};
    var wsel = weaponOf(attacker, kind);
    var weapon = wsel.w;
    var aOpts = { skill: kind === 'melee' ? 'melee' : 'ranged', label: weapon.name };
    if (opts.aim) aOpts.bonus = (aOpts.bonus || 0) + 10;
    if (attacker.wsBuff) aOpts.bonus = (aOpts.bonus || 0) + attacker.wsBuff;
    if (attacker.isPlayer) aOpts.bonus = (aOpts.bonus || 0) + 10;
    if (weapon.qualities.indexOf('balanced') >= 0) aOpts.bonus = (aOpts.bonus || 0) + 5;
    if (weapon.qualities.indexOf('focus') >= 0 && kind === 'melee') aOpts.bonus = (aOpts.bonus || 0) + 5;

    var dOpts = { skill: 'dodge', label: '闪避' };
    var parryOpts = { skill: 'parry', label: '格挡', bonus: 0 };
    if ((defender.weapons || []).indexOf('shield') >= 0) parryOpts.bonus += 10;
    if (defender.defense) dOpts.bonus = (dOpts.bonus || 0) + defender.defense;
    var at = actorTest(attacker, aOpts);
    var dt = null;
    if (defender.stats) {
      dt = actorTest(defender, dOpts);
      var pt = actorTest(defender, parryOpts);
      if (pt.success && (!dt.success || pt.sl > dt.sl)) dt = pt;
    }

    var slDiff = at.sl - (dt ? dt.sl : 0);
    var hit = at.success && (!dt || slDiff > 0);
    var result = {
      attacker: attacker.name, defender: defender.name, weapon: weapon.name,
      at: at, dt: dt, hit: hit, slDiff: slDiff, damage: 0,
      location: null, crit: false, killed: false
    };
    if (!hit) {
      if (at.criticalFail) result.fumble = true;
      return result;
    }

    var loc = hitLocation(at.roll);
    result.location = loc;
    var damage = weapon.dmg + sb(attacker) + (attacker.bonusDamage || 0) + (attacker.damageBuff || 0);
    if (weapon.qualities.indexOf('twohand') >= 0) damage += 1;
    damage += Math.max(0, slDiff);
    if (weapon.qualities.indexOf('pierce') >= 0) damage += 1;
    damage -= tb(defender);
    var ap = armourAt(defender, loc.id);
    if (weapon.qualities.indexOf('pierce') >= 0) ap = Math.max(0, ap - 1);
    damage -= ap;
    if (damage < 0) damage = 0;
    if (damage === 0) damage = 0;
    result.damage = damage;

    var crit = at.crit && at.success;
    if (crit) {
      result.crit = true;
      damage += d10();
      result.critRoll = rnd(100);
      result.critEffect = critEffect(defender, result.critRoll);
    }
    result.damage = damage;
    defender.wounds = Math.max(0, defender.wounds - (damage));
    if (hasCondition(defender, 'bleed') === false && crit && result.critEffect === 'bleed') {
      addCondition(defender, { id: 'bleed', name: '流血' }, 3);
    }
    if (result.critEffect === 'stun') addCondition(defender, { id: 'stun', name: '眩晕' }, 1);
    if (result.critEffect === 'prone') addCondition(defender, { id: 'prone', name: '倒地' }, 2);
    if (defender.wounds <= 0) { defender.wounds = 0; result.killed = true; }
    return result;
  }

  function critEffect(defender, roll) {
    var table = [
      [10, 'bleed'], [25, 'stun'], [40, 'prone'], [60, 'extra'],
      [75, 'bleed'], [90, 'stun'], [100, 'extra']
    ];
    for (var i = 0; i < table.length; i++) if (roll <= table[i][0]) return table[i][1];
    return 'extra';
  }

  function damageLine(r) {
    var s = r.attacker + '以' + r.weapon + '击中' + r.defender + '的' + r.location.name +
      '，造成 ' + r.damage + ' 点伤害';
    if (r.crit) s += '（致命一击！' + ({ bleed: '伤口撕裂，血流不止', stun: '头颅受震，眼冒金星', prone: '被击倒在地', extra: '骨裂声清晰可闻' }[r.critEffect] || '') + '）';
    return s + '。';
  }

  function attackLog(r) {
    var dice = '（d100 ' + r.at.roll + '/' + r.at.target;
    if (r.dt) dice += '，防守 ' + r.dt.roll + '/' + r.dt.target;
    dice += '）';
    if (!r.hit) {
      if (r.fumble) return r.attacker + '的' + r.weapon + '脱手偏出，露出破绽。' + dice;
      return r.attacker + '挥动' + r.weapon + '，被' + r.defender + '闪开。' + dice;
    }
    return damageLine(r) + dice;
  }

  function playerAttack(state, kind) {
    var c = state.combat;
    if (!c || !c.awaiting) return null;
    if (kind === 'melee' && c.distance === 'far') {
      c.log.push('距离太远，必须先逼近。');
      return { blocked: true };
    }
    if (kind === 'ranged' && c.reload) {
      c.log.push('武器尚未装填。');
      return { blocked: true };
    }
    var enemies = livingEnemies(c);
    if (!enemies.length) return endCombat(state, 'victory');
    var target = c.enemies[c.target];
    if (!target || target.wounds <= 0) {
      target = enemies[0];
      c.target = c.enemies.indexOf(target);
    }
    var wsel = weaponOf(state, kind);
    var r = attack(state, target, kind, { aim: c.aim });
    c.aim = false;
    c.log.push(attackLog(r));
    if (kind === 'ranged' && wsel.w.qualities.indexOf('reload') >= 0) c.reload = true;
    if (r.killed) c.log.push('『' + target.name + '』倒下了。');
    else if (r.crit && r.critEffect === 'extra') {
      var extra = d10();
      target.wounds = Math.max(0, target.wounds - (extra));
      c.log.push('额外造成 ' + extra + ' 点伤害。');
      if (target.wounds <= 0) { target.wounds = 0; c.log.push('『' + target.name + '』倒下了。'); }
    }
    c.defense = 0;
    return afterPlayerAction(state);
  }

  function playerCast(state, spellId) {
    var c = state.combat;
    if (!c || !c.awaiting) return null;
    var spell = G.data.SPELLS[spellId];
    if (!spell) return null;
    if (spell.range === 'far' && c.distance === 'far') { /* 可远程施法 */ }
    var t = actorTest(state, { skill: 'magic', label: spell.name });
    if (!t.success) {
      c.log.push(state.name + '吟唱' + spell.name + '，法术在指尖溃散（检定 ' + t.roll + '/' + t.target + '）。');
      if (t.crit) {
        var backlash = rollDice('1d10');
        state.wounds = Math.max(0, state.wounds - (backlash));
        c.log.push('反噬！' + state.name + '受到 ' + backlash + ' 点伤害。');
      }
    } else {
      c.log.push(state.name + '施放' + spell.name + '（检定 ' + t.roll + '/' + t.target + '，SL ' + t.sl + '）。');
      applySpell(state, spell, t);
    }
    if (t.crit && t.success) {
      var miscast = rollDice('1d10');
      state.wounds = Math.max(0, state.wounds - (miscast));
      c.log.push('魔风反冲，' + state.name + '额外受到 ' + miscast + ' 点伤害。');
    }
    c.defense = 0;
    return afterPlayerAction(state);
  }

  function applySpell(state, spell, t) {
    var c = state.combat;
    var e = spell.effect;
    if (e.type === 'damage') {
      var enemies = livingEnemies(c);
      if (!enemies.length) return;
      var target = c.enemies[c.target];
      if (!target || target.wounds <= 0) {
        target = enemies[0];
        c.target = c.enemies.indexOf(target);
      }
      var dmg = e.dmg + Math.max(0, t.sl);
      target.wounds = Math.max(0, target.wounds - (dmg));
      c.log.push(spell.name + '命中『' + target.name + '』，造成 ' + dmg + ' 点伤害。');
      if (e.burn) addCondition(target, { id: 'burn', name: '燃烧' }, 2);
      if (e.chill) addCondition(target, { id: 'chill', name: '寒颤' }, 2);
      if (e.corrupt) { target.corruption = (target.corruption || 0) + e.corrupt; }
      if (target.wounds <= 0) { target.wounds = 0; c.log.push('『' + target.name + '』被法术击倒。'); }
    } else if (e.type === 'heal') {
      var heal = rollDice(e.dmg) + Math.max(0, t.sl);
      state.wounds = Math.min(state.maxWounds, state.wounds + heal);
      c.log.push('温暖的光缝合伤口，恢复 ' + heal + ' 点伤口。');
    } else if (e.type === 'buff') {
      state.wsBuff = (state.wsBuff || 0) + (e.ws || 0);
      state.damageBuff = (state.damageBuff || 0) + (e.dmg || 0);
      state.buffRounds = e.rounds || 3;
      if (e.corruption) addCorruption(state, e.corruption);
      c.log.push('混沌之力灌入四肢，近战 +' + (e.ws || 0) + '，伤害 +' + (e.dmg || 0) + '。');
    } else if (e.type === 'armour') {
      state.armourBuff = { ap: e.ap, rounds: e.rounds || 3 };
      c.log.push('寒冰覆体，护甲 +' + e.ap + '。');
    }
  }

  function playerDefend(state) {
    var c = state.combat;
    if (!c || !c.awaiting) return null;
    c.defense = 20;
    state.defense = 20;
    c.aim = false;
    c.log.push(state.name + '摆出防御姿态，本回合闪避与格挡 +20。');
    return afterPlayerAction(state);
  }

  function playerAim(state) {
    var c = state.combat;
    if (!c || !c.awaiting) return null;
    c.aim = true;
    c.log.push(state.name + '屏息瞄准，下一次攻击 +10。');
    return afterPlayerAction(state);
  }

  function playerClose(state) {
    var c = state.combat;
    if (!c || !c.awaiting) return null;
    c.distance = 'close';
    c.log.push(state.name + '压低身形，逼近敌人。');
    var reach = (state.weapons || []).filter(function (w) { return (G.data.WEAPONS[w] || {}).qualities && G.data.WEAPONS[w].qualities.indexOf('reach') >= 0; })[0];
    if (reach) {
      var target = livingEnemies(c)[0];
      if (target) {
        var r = attack(state, target, 'melee', {});
        c.log.push('长柄武器先发制人！' + attackLog(r));
        if (r.killed) c.log.push('『' + target.name + '』倒下了。');
      }
    }
    return afterPlayerAction(state);
  }

  function playerReload(state) {
    var c = state.combat;
    if (!c || !c.awaiting) return null;
    c.reload = false;
    c.log.push(state.name + '迅速装填。');
    return afterPlayerAction(state);
  }

  function playerUseItem(state, itemId) {
    var c = state.combat;
    if (!state.items[itemId]) {
      if (c) c.log.push('你没有' + (G.data.ITEMS[itemId] ? G.data.ITEMS[itemId].name : itemId) + '。');
      return { blocked: true };
    }
    state.items[itemId] -= 1;
    if (state.items[itemId] <= 0) delete state.items[itemId];
    var msg = useItemEffect(state, itemId);
    if (c) {
      c.log.push(msg);
      c.defense = 0;
      return afterPlayerAction(state);
    }
    return { msg: msg };
  }

  function useItemEffect(state, itemId) {
    var item = G.data.ITEMS[itemId];
    if (itemId === 'potion') {
      var heal = rollDice('1d10+3');
      state.wounds = Math.min(state.maxWounds, state.wounds + heal);
      return '你饮下治疗药水，恢复 ' + heal + ' 点伤口。';
    }
    if (itemId === 'bandage') {
      state.conditions = (state.conditions || []).filter(function (c) { return c.id !== 'bleed'; });
      state.wounds = Math.min(state.maxWounds, state.wounds + 2);
      return '你包扎伤口，止住了流血，恢复 2 点伤口。';
    }
    if (itemId === 'holy_water') {
      return '圣水在你手中微微发烫。';
    }
    if (itemId === 'vodka') {
      var h = rollDice('1d5');
      state.wounds = Math.min(state.maxWounds, state.wounds + h);
      return '一口伏特加烧过喉咙，恢复 ' + h + ' 点伤口。';
    }
    return '你使用了' + item.name + '。';
  }

  function playerFlee(state) {
    var c = state.combat;
    if (!c || !c.awaiting) return null;
    var t = actorTest(state, { skill: 'athletics', label: '逃跑', difficulty: -10 });
    if (t.success) {
      c.log.push('你转身冲进黑暗，敌人没能追上。');
      return endCombat(state, 'fled');
    }
    c.log.push('逃跑失败！敌人趁机扑上来。（d100 ' + t.roll + '/' + t.target + '）');
    c.defense = 0;
    return afterPlayerAction(state);
  }

  function afterPlayerAction(state) {
    var c = state.combat;
    if (!c) return null;
    if (!livingEnemies(c).length) return endCombat(state, 'victory');
    if (state.wounds <= 0) return checkDefeat(state);
    allyRound(state);
    if (c.over) return combatOutcome(state);
    enemyRound(state);
    if (c.over) return combatOutcome(state);
    c.round += 1;
    c.awaiting = true;
    c.defense = 0;
    state.defense = 0;
    state.conditions = (state.conditions || []).filter(function (x) { return x.duration > 0; });
    if (state.buffRounds > 0) {
      state.buffRounds -= 1;
      if (state.buffRounds <= 0) { state.wsBuff = 0; state.damageBuff = 0; state.buffRounds = 0; }
    }
    if (state.armourBuff) {
      state.armourBuff.rounds -= 1;
      if (state.armourBuff.rounds <= 0) state.armourBuff = null;
    }
    return { ended: null, round: c.round };
  }

  function livingAllies(c) {
    return (c.allies || []).filter(function (a) { return a.wounds > 0; });
  }

  function allyRound(state) {
    var c = state.combat;
    var allies = livingAllies(c);
    allies.forEach(function (a) {
      if (c.over || !livingEnemies(c).length) return;
      if (a.ai === 'healer' && a.spells.indexOf('heal') >= 0) {
        var candidates = [{ t: state, w: state.wounds / state.maxWounds }]
          .concat(livingAllies(c).filter(function (x) { return x !== a; })
            .map(function (x) { return { t: x, w: x.wounds / x.maxWounds }; }));
        candidates.sort(function (x, y) { return x.w - y.w; });
        if (candidates[0].w < 0.6) {
          var heal = rollDice('1d10+4');
          var who = candidates[0].t;
          who.wounds = Math.min(who.maxWounds, who.wounds + heal);
          c.log.push('【' + a.name + '】低声祈祷，' + (who === state ? '你' : who.name) + '恢复 ' + heal + ' 点伤口。');
          return;
        }
      }
      var enemies = livingEnemies(c);
      if (!enemies.length) return;
      var target = enemies.slice().sort(function (x, y) { return x.wounds - y.wounds; })[0];
      var kind = a.ai === 'archer' ? 'ranged' : 'melee';
      var r = attack(a, target, kind, {});
      c.log.push('【' + a.name + '】' + attackLog(r));
      if (r.killed) c.log.push('『' + target.name + '』倒下了。');
    });
    if (!c.over && !livingEnemies(c).length) endCombat(state, 'victory');
  }

  function pickTarget(state, c) {
    var allies = livingAllies(c);
    if (!allies.length) return state;
    var total = 3;
    allies.forEach(function (a) { total += a.ai === 'bruiser' ? 2 : 1; });
    var roll = Math.random() * total;
    if (roll < 3) return state;
    roll -= 3;
    for (var i = 0; i < allies.length; i++) {
      var w = allies[i].ai === 'bruiser' ? 2 : 1;
      if (roll < w) return allies[i];
      roll -= w;
    }
    return state;
  }

  function enemyRound(state) {
    var c = state.combat;
    tickConditions(state, c.log);
    if (state.wounds <= 0) { checkDefeat(state); if (c.over) return; }
    var enemies = livingEnemies(c).slice().sort(function (a, b) { return initOf(b) - initOf(a); });
    enemies.forEach(function (e) {
      if (c.over || state.wounds <= 0) return;
      if (hasCondition(e, 'stun')) {
        c.log.push('『' + e.name + '』仍在眩晕中，没能出手。');
        e.conditions = e.conditions.filter(function (x) { return x.id !== 'stun'; });
        return;
      }
      tickConditions(e, c.log);
      if (e.wounds <= 0) { c.log.push('『' + e.name + '』倒下了。'); return; }
      if (c.distance === 'far') {
        c.log.push('『' + e.name + '』向你逼近。');
        c.distance = 'close';
        return;
      }
      enemyAct(state, e);
    });
    if (!c.over) c.awaiting = true;
    if (!c.over && !livingEnemies(c).length) { endCombat(state, 'victory'); return; }
    if (state.wounds <= 0) checkDefeat(state);
  }

  function enemyAct(state, e) {
    var c = state.combat;
    if (e.ai === 'caster' && e.spells.length && c.round % 3 === 0) {
      var sid = e.spells[0];
      var spell = G.data.SPELLS[sid];
      var t = actorTest(e, { skill: 'magic', label: spell.name });
      if (t.success) {
        var dmg = Math.max(3, (spell.effect.dmg || 0) - 2) + Math.max(0, t.sl);
        state.wounds = Math.max(0, state.wounds - (dmg));
        c.log.push('『' + e.name + '』施放' + spell.name + '，你受到 ' + dmg + ' 点伤害。（d100 ' + t.roll + '/' + t.target + '）');
        if (spell.effect.burn) addCondition(state, { id: 'burn', name: '燃烧' }, 2);
      } else {
        c.log.push('『' + e.name + '』的法术消散在空气中。');
      }
      return;
    }
    var target = pickTarget(state, c);
    var r = attack(e, target, 'melee', {});
    c.log.push(attackLog(r));
    if (r.crit && r.critEffect === 'extra') {
      var extra = d10();
      target.wounds = Math.max(0, target.wounds - extra);
      c.log.push((target === state ? '你' : target.name) + '额外受到 ' + extra + ' 点伤害。');
    }
    if (target !== state && target.wounds <= 0 && !target.downed) {
      target.downed = true;
      c.log.push('【' + target.name + '】倒下了。');
      var npc = state.npcs[target.npcId];
      if (npc) npc.wounded = true;
      return;
    }
    if (state.wounds <= 0) checkDefeat(state);
  }

  function checkDefeat(state) {
    var c = state.combat;
    if (!c || c.over) return c && c.result ? combatOutcome(state) : null;
    if (state.wounds > 0) return null;
    if (state.fate > 0) {
      state.fate -= 1;
      state.wounds = 1;
      c.log.push('命运在此刻拉住了你——你消耗 1 点命运点，以 1 点伤口勉强站住。');
      return { ended: null, saved: true };
    }
    c.log.push('你的视野沉入黑暗……');
    return endCombat(state, 'defeat');
  }

  function combatOutcome(state) {
    var c = state.combat;
    return {
      ended: c.result, winScene: c.winScene, loseScene: c.loseScene,
      fleeScene: c.fleeScene, xp: c.rewardXp || 0, gold: c.rewardGold || 0
    };
  }

  function endCombat(state, result) {
    var c = state.combat;
    if (!c) return null;
    if (c.finished) return combatOutcome(state);
    c.finished = true;
    c.over = true;
    c.result = result;
    state.mode = 'story';
    c.awaiting = false;
    state.defense = 0;
    state.armourBuff = null;
    state.wsBuff = 0;
    state.damageBuff = 0;
    state.buffRounds = 0;
    state.conditions = [];
    var xp = 0, gold = 0;
    if (result === 'victory') {
      c.enemies.forEach(function (e) {
        if (e.wounds <= 0) {
          xp += e.xp || 0;
          var g = e.gold || [0, 0];
          gold += rnd(g[1] - g[0] + 1) - 1 + g[0];
        }
      });
      state.xp += xp;
      state.totalXp += xp;
      state.gold += gold;
      c.rewardXp = xp;
      c.rewardGold = gold;
      (c.allies || []).forEach(function (a) {
        a.wounds = a.maxWounds;
        a.conditions = [];
        if (state.npcs[a.npcId]) state.npcs[a.npcId].wounded = false;
      });
      (state.party || []).forEach(function (id) {
        if (state.npcs[id]) addAffinity(state, id, 3);
      });
      c.log.push('—— 战斗结束 ——');
      c.log.push('你活了下来，搜刮到 ' + gold + ' 枚银币，获得 ' + xp + ' 点经验。');
    }
    return combatOutcome(state);
  }

  /* ------------------------------------------------------------------ */
  /* 腐化                                                                */
  /* ------------------------------------------------------------------ */
  var MUTATIONS = [
    { id: 'scales', name: '鳞甲之肤', desc: '皮肤覆上细密鳞片，全身护甲 +1。', ap: 1 },
    { id: 'arm', name: '突变之臂', desc: '右臂粗壮扭曲，力量 +5。', stats: { s: 5 } },
    { id: 'eye', name: '第三只眼', desc: '额上裂开一只眼，侦查 +10，交际 -5。', skills: { perception: 10 }, stats: { fel: -5 } },
    { id: 'wings', name: '残破之翼', desc: '背生骨翼，先攻 +2，但无法穿斗篷。', init: 2 }
  ];

  function addCorruption(state, n) {
    state.corruption += n;
    var thresholds = [3, 6, 9];
    thresholds.forEach(function (th, idx) {
      if (state.corruption >= th && !state.flags['mut' + th]) {
        state.flags['mut' + th] = true;
        var mut = MUTATIONS[idx % MUTATIONS.length];
        applyMutation(state, mut);
      }
    });
  }

  function applyMutation(state, mut) {
    state.mutations.push({ id: mut.id, name: mut.name, desc: mut.desc });
    if (mut.stats) applyMods(state.stats, mut.stats);
    if (mut.skills) Object.keys(mut.skills).forEach(function (s) {
      if (!state.skills[s]) state.skills[s] = { adv: 0, trained: false };
      state.skills[s].adv += mut.skills[s];
      state.skills[s].trained = true;
    });
    if (mut.init) state.initBonus = (state.initBonus || 0) + mut.init;
    if (mut.ap) {
      ['head', 'arms', 'body', 'legs'].forEach(function (l) { state.armour[l] = (state.armour[l] || 0) + mut.ap; });
    }
    recalc(state);
  }

  /* ------------------------------------------------------------------ */
  /* 成长 / 物品                                                          */
  /* ------------------------------------------------------------------ */
  function xpCostStat() { return 15; }
  function xpCostSkill() { return 10; }
  function xpCostTalent() { return 40; }

  function buyStat(state, id) {
    if (state.xp < 15) return { error: '经验不足。' };
    if ((state.statBuys[id] || 0) >= 15) return { error: '该项已达上限。' };
    state.statBuys[id] = (state.statBuys[id] || 0) + 1;
    state.stats[id] += 1;
    state.xp -= 15;
    recalc(state);
    return { ok: true };
  }

  function buySkill(state, id) {
    if (state.xp < 10) return { error: '经验不足。' };
    var s = state.skills[id];
    if (s.adv >= 20) return { error: '该技能已达上限。' };
    s.adv += 5; s.trained = true;
    state.xp -= 10;
    return { ok: true };
  }

  function buyTalent(state, id) {
    if (state.xp < 40) return { error: '经验不足。' };
    if (state.talents.indexOf(id) >= 0) return { error: '已拥有该天赋。' };
    var t = G.data.TALENTS[id];
    if (!t) return { error: '未知天赋。' };
    state.talents.push(id);
    applyMods(state.stats, t.stats);
    if (t.skills) Object.keys(t.skills).forEach(function (sid) {
      if (!state.skills[sid]) state.skills[sid] = { adv: 0, trained: false };
      state.skills[sid].adv += t.skills[sid];
    });
    if (t.fate) { state.maxFate += t.fate; state.fate += t.fate; state.fortune += t.fate; }
    if (t.damage) state.bonusDamage += t.damage;
    if (t.init) state.initBonus += t.init;
    state.xp -= 40;
    recalc(state);
    return { ok: true };
  }

  function addItem(state, id, n) {
    n = n || 1;
    state.items[id] = (state.items[id] || 0) + n;
  }

  function removeItem(state, id, n) {
    n = n || 1;
    if (!state.items[id]) return false;
    state.items[id] -= n;
    if (state.items[id] <= 0) delete state.items[id];
    return true;
  }

  function rest(state) {
    var healed = Math.max(1, Math.floor(state.maxWounds * 0.25));
    state.wounds = Math.min(state.maxWounds, state.wounds + healed);
    state.fortune = Math.min(state.maxFate, state.fortune + 1);
    state.fatigue = 0;
    state.conditions = [];
    return healed;
  }

  G.rules = {
    rnd: rnd, d10: d10, rollDice: rollDice, clamp: clamp,
    createCharacter: createCharacter, recalc: recalc,
    advanceTime: advanceTime, timeLabel: timeLabel,
    statusName: statusName, renown: renown, nextRank: nextRank, promote: promote,
    test: test, actorTest: actorTest, opposedTest: opposedTest, testTarget: testTarget,
    sb: sb, tb: tb, wpb: wpb,
    startCombat: startCombat, playerAttack: playerAttack, playerCast: playerCast,
    playerDefend: playerDefend, playerAim: playerAim, playerClose: playerClose,
    playerReload: playerReload, playerUseItem: playerUseItem, playerFlee: playerFlee,
    endCombat: endCombat, useItemEffect: useItemEffect,
    addCorruption: addCorruption, applyMutation: applyMutation, MUTATIONS: MUTATIONS,
    buyStat: buyStat, buySkill: buySkill, buyTalent: buyTalent,
    addItem: addItem, removeItem: removeItem, rest: rest,
    attack: attack, weaponOf: weaponOf, hitLocation: hitLocation,
    hasCondition: hasCondition, addCondition: addCondition,
    initNPCs: initNPCs, meetNPC: meetNPC, addAffinity: addAffinity,
    canRecruit: canRecruit, recruitNPC: recruitNPC, dismissNPC: dismissNPC,
    makeAlly: makeAlly
  };
})(typeof window !== 'undefined' ? window : globalThis);
