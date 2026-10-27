/**
 * 无浏览器冒烟测试：在 Node 的 vm 中加载规则与剧情，跑大量随机对局。
 * 用法：node tests/sim.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({
  console, Math, JSON, Date, Object, Array, String, Number, Boolean, Error, RegExp, Map, Set,
  setTimeout, clearTimeout
});
for (const f of ['data.js', 'rules.js', 'content.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f });
}
const G = ctx.G;
const R = G.rules, C = G.content, D = G.data;

let checks = 0, failures = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { failures++; console.error('FAIL:', msg); }
}
function section(name) { console.log('\n== ' + name + ' =='); }

/* ------------------------------------------------------------------ */
section('数据完整性');
for (const race of D.RACES) {
  for (const cid of race.careers) {
    const career = D.CAREERS.find((c) => c.id === cid);
    ok(!!career, `种族 ${race.id} 引用了不存在的职业 ${cid}`);
    if (!career) continue;
    for (const w of career.weapons) ok(!!D.WEAPONS[w], `${career.id} 的武器 ${w} 不存在`);
    for (const it of career.items) ok(!!D.ITEMS[it], `${career.id} 的物品 ${it} 不存在`);
    for (const t of career.talents) ok(!!D.TALENTS[t], `${career.id} 的天赋 ${t} 不存在`);
    for (const s of career.spells || []) ok(!!D.SPELLS[s], `${career.id} 的法术 ${s} 不存在`);
    const ranks = D.CAREER_RANKS[career.id];
    ok(!!ranks, `${career.id} 缺少职业等级数据`);
    if (ranks) {
      ok(ranks.titles.length === 4 && ranks.status.length === 4, `${career.id} 等级数据长度错误`);
      for (const st of ranks.status) ok(st >= 1 && st <= 5, `${career.id} 身份阶级越界`);
    }
  }
  ok(!!D.TALENTS[race.talent], `${race.id} 的种族天赋不存在`);
}
for (const e of Object.values(D.ENEMIES)) ok(!!D.WEAPONS[e.weapon], `敌人 ${e.name} 的武器不存在`);

/* 静态检查场景跳转 */
const src = fs.readFileSync(path.join(root, 'src', 'content.js'), 'utf8');
const ids = new Set(Object.keys(C.scenes));
const refs = new Set();
for (const m of src.matchAll(/(?:goto|next|win|lose|flee):\s*'([a-z0-9_]+)'/g)) refs.add(m[1]);
for (const id of refs) ok(ids.has(id), `剧情引用了不存在的场景 ${id}`);

/* 结局文本覆盖所有种族 */
{
  const endings = ['ending_dawn', 'ending_sacrifice', 'ending_crown2', 'ending_flee2', 'ending_dark', 'ending_crown', 'ending_flee', 'ending_death', 'ending_destroy', 'ending_church', 'ending_maimed', 'cathay_death'];
  for (const race of D.RACES) {
    const s = R.createCharacter({ raceId: race.id, careerId: race.careers[0], name: '结局测试' });
    for (const id of endings) {
      C.enter(s, id);
      const text = C.text(s).join('');
      ok(text.length > 50, `${race.id}/${id} 文本过短`);
      ok(text.indexOf('undefined') < 0, `${race.id}/${id} 文本含 undefined`);
    }
  }
}

/* ------------------------------------------------------------------ */
section('身份与晋升');
{
  const s = R.createCharacter({ raceId: 'empire', careerId: 'soldier', name: '晋升者' });
  ok(s.rank === 1, '初始职业等级错误');
  ok(s.status === 2, '初始身份错误');
  ok(!!s.title, '初始头衔为空');
  s.xp = 1000;
  const noRenown = R.promote(s);
  ok(!!noRenown.error, '没有功勋也能晋升');
  s.flags.ch1Done = true;
  const r2 = R.promote(s);
  ok(r2.ok && s.rank === 2, '第一次晋升失败');
  ok(s.title === '老兵', '晋升头衔错误：' + s.title);
  s.flags.siegeWon = true;
  const r3 = R.promote(s);
  ok(r3.ok && s.rank === 3, '第二次晋升失败');
  ok(s.status === 3, '第二次晋升身份未提升');
  s.flags.bossWon = true;
  const r4 = R.promote(s);
  ok(r4.ok && s.rank === 4, '第三次晋升失败');
  ok(R.nextRank(s) === null, '满级后仍有下一等级');
  ok(R.renown(s) === 3, '功勋计算错误');

  const low = R.createCharacter({ raceId: 'empire', careerId: 'soldier', name: '平民' });
  const high = R.createCharacter({ raceId: 'bretonnia', careerId: 'knight', name: '骑士' });
  const lowTarget = R.testTarget(low, { skill: 'persuade' }).target;
  const highTarget = R.testTarget(high, { skill: 'persuade' }).target;
  ok(highTarget > lowTarget, '身份没有影响社交检定');
}

/* ------------------------------------------------------------------ */
section('时间系统');
{
  const s = R.createCharacter({ raceId: 'empire', careerId: 'soldier', name: '计时' });
  C.enter(s, 'act1_hub');
  const t0 = s.clock;
  C.choose(s, 0);
  ok(s.clock > t0, '选择没有推进时间');
  ok(s.sceneId === 'tavern', '时间推进后场景异常');

  const s2 = R.createCharacter({ raceId: 'empire', careerId: 'soldier', name: '迟到' });
  C.enter(s2, 'act1_hub');
  s2.clock = 79;
  C.choose(s2, 0);
  ok(s2.sceneId === 'late_ritual', '超时后没有触发迟到场景：' + s2.sceneId);

  const s3 = R.createCharacter({ raceId: 'empire', careerId: 'soldier', name: '守城' });
  C.enter(s3, 'act4_intro');
  ok(s3.siegeDeadline === s3.clock + 48, '第四章期限未设置');
  s3.clock = s3.siegeDeadline;
  C.checkDeadlines(s3);
  ok(s3.sceneId === 'act4_siege_late', '第四章超时后没有强制夜袭：' + s3.sceneId);

  const s4 = R.createCharacter({ raceId: 'empire', careerId: 'soldier', name: '裂痕' });
  C.enter(s4, 'act5_intro');
  ok(!!s4.riftDeadline, '第五章裂痕期限未设置');
  s4.clock = s4.riftDeadline + 1;
  C.checkDeadlines(s4);
  ok(s4.flags.riftLate === true, '裂痕超时未施加惩罚');
  const before = s4.fatigue;
  R.advanceTime(s4, 30);
  ok(s4.fatigue >= before, '疲劳没有随时间增长');
}

/* ------------------------------------------------------------------ */
section('角色创建');
for (const race of D.RACES) {
  for (const cid of race.careers) {
    const s = R.createCharacter({ raceId: race.id, careerId: cid, name: '测试' });
    ok(s.maxWounds >= 8 && s.maxWounds <= 40, `${race.id}/${cid} 伤口异常 ${s.maxWounds}`);
    ok(s.wounds === s.maxWounds, `${race.id}/${cid} 初始伤口未满`);
    ok(s.fate >= 1 && s.fate <= 4, `${race.id}/${cid} 命运点异常 ${s.fate}`);
    ok(s.xp >= 50, `${race.id}/${cid} 初始经验异常`);
    for (const ch of D.CHARS) ok(s.stats[ch.id] >= 5 && s.stats[ch.id] <= 80, `${race.id}/${cid} 属性 ${ch.id}=${s.stats[ch.id]}`);
  }
}

/* 震旦开局 */
{
  const s = R.createCharacter({ raceId: 'cathay', careerId: 'astromancer', name: '玉衡' });
  ok(s.status === 4, '震旦星象师初始身份错误');
  ok(s.spells.indexOf('celestial_bolt') >= 0, '震旦星象师缺少专属法术');
  C.enter(s, 'intro_cathay');
  ok(C.text(s).join('').indexOf('玉龙号') >= 0, '震旦序章文本缺失');
  ok(C.choices(s).length >= 3, '震旦序章选项不足');
  ok(s.npcs.qingheng.met, '序章没有结识青蘅');
  ok(R.makeAlly('qingheng') && R.makeAlly('qingheng').name === '青蘅', '青蘅无法作为援护参战');
  C.enter(s, 'cathay_deck');
  s.flags.cathayCrew = true;
  s.flags.cathayHold = true;
  ok(C.choices(s).some((c) => c.label.indexOf('玉莲商馆') >= 0), '两条线索后未解锁商馆');
  C.enter(s, 'cathay_after');
  C.choose(s, 0);
  ok(s.sceneId === 'gate', '震旦序章结束后未进入城门：' + s.sceneId);

  const q = R.createCharacter({ raceId: 'cathay', careerId: 'crane_gunner', name: '青蘅线' });
  C.enter(q, 'intro_cathay');
  q.clues.push('compass');
  R.addAffinity(q, 'qingheng', 20);
  C.enter(q, 'cathay_after');
  ok(C.choices(q).some((c) => c.label.indexOf('青蘅') >= 0), '好感足够时没有招募青蘅的选项');
  C.choose(q, 0);
  ok(q.party.indexOf('qingheng') >= 0, '青蘅没有加入队伍');
  ok(q.flags.compassIntact === true, '完整星盘状态未记录');
  C.enter(q, 'npcq_qingheng');
  ok(C.choices(q).length >= 3, '青蘅个人任务选项不足');
}

/* ------------------------------------------------------------------ */
section('检定');
{
  const s = R.createCharacter({ raceId: 'empire', careerId: 'soldier', name: '检定者' });
  let wins = 0;
  for (let i = 0; i < 3000; i++) if (R.test(s, { skill: 'melee', difficulty: 0 }).success) wins++;
  const rate = wins / 3000;
  ok(rate > 0.3 && rate < 0.8, `近战成功率异常 ${rate.toFixed(2)}`);
  const untrained = R.testTarget(s, { skill: 'magic' });
  ok(untrained.target < s.stats.wp, '未受训的进阶技能应受惩罚');
}

/* ------------------------------------------------------------------ */
section('战斗模拟');
const GROUPS = [
  [{ key: 'thug', count: 1 }],
  [{ key: 'thug', count: 2 }],
  [{ key: 'cultist', count: 1 }, { key: 'hound', count: 1 }],
  [{ key: 'watchman', count: 2 }],
  [{ key: 'priest', count: 1 }, { key: 'zealot', count: 2 }]
];

function combatLoop(state, maxActions = 200) {
  let n = 0;
  while (state.combat && !state.combat.over && n++ < maxActions) {
    const c = state.combat;
    if (!c.awaiting) c.awaiting = true;
    const hasRanged = state.weapons.some((w) => (D.WEAPONS[w] || {}).type === 'ranged');
    let res;
    if (c.reload) res = R.playerReload(state);
    else if (state.wounds < state.maxWounds * 0.35 && state.items.potion) res = R.playerUseItem(state, 'potion');
    else if (state.wounds < state.maxWounds * 0.2 && state.items.bandage) res = R.playerUseItem(state, 'bandage');
    else if (state.spells.length && Math.random() < 0.75) res = R.playerCast(state, state.spells[0]);
    else if (hasRanged) res = R.playerAttack(state, 'ranged');
    else if (c.distance === 'far') res = R.playerClose(state);
    else if (Math.random() < 0.9) res = R.playerAttack(state, 'melee');
    else res = R.playerDefend(state);
    if (res && res.ended) break;
    if (!res) break;
  }
  return state.combat ? state.combat.result : 'none';
}

{
  let victories = 0, defeats = 0, stuck = 0;
  for (let i = 0; i < 300; i++) {
    const race = D.RACES[i % D.RACES.length];
    const career = race.careers[i % race.careers.length];
    const s = R.createCharacter({ raceId: race.id, careerId: career, name: '战士' });
    const group = GROUPS[i % GROUPS.length];
    R.startCombat(s, group, { winScene: 'x', loseScene: 'y', fleeScene: 'z' });
    const result = combatLoop(s);
    if (result === 'victory') victories++;
    else if (result === 'defeat') defeats++;
    else if (!result) stuck++;
    ok(['victory', 'defeat', 'fled', 'none'].includes(result), `战斗结果异常 ${result}`);
    ok(s.wounds >= 0, '伤口为负');
  }
  console.log(`  胜利 ${victories} / 失败 ${defeats} / 卡住 ${stuck}`);
  ok(victories > 20, '战斗胜利过少，可能数值失衡');
  ok(stuck === 0, '存在无法结束的战斗');
}

/* ------------------------------------------------------------------ */
section('升级');
{
  const s = R.createCharacter({ raceId: 'empire', careerId: 'scholar', name: '学者' });
  s.xp = 1000;
  const before = s.stats.ws;
  for (let i = 0; i < 20; i++) R.buyStat(s, 'ws');
  ok(s.stats.ws > before, '属性未提升');
  ok(s.stats.ws <= before + 15, '属性突破上限');
  const sk = s.skills.lore.adv;
  for (let i = 0; i < 10; i++) R.buySkill(s, 'lore');
  ok(s.skills.lore.adv <= 20, '技能突破上限');
  ok(R.buyTalent(s, 'tough').ok, '天赋购买失败');
  ok(s.maxWounds > 0, '天赋后伤口异常');
}

/* ------------------------------------------------------------------ */
section('同伴系统');
{
  const s = R.createCharacter({ raceId: 'empire', careerId: 'soldier', name: '队长' });
  C.enter(s, 'act4_intro');
  ok(s.npcs.agnes.met, '进入第四章后未结识阿格尼丝');
  R.addAffinity(s, 'agnes', 45);
  ok(R.canRecruit(s, 'agnes'), '好感足够却无法招募');
  ok(R.recruitNPC(s, 'agnes'), '招募失败');
  ok(s.party.length === 1, '队伍未加入同伴');
  R.startCombat(s, [{ key: 'thug', count: 1 }], { winScene: 'x', loseScene: 'y' });
  ok(s.combat.allies.length === 1, '战斗中未生成同伴');
  const res = combatLoop(s);
  ok(['victory', 'defeat', 'fled', 'none'].includes(res), '带同伴战斗结果异常：' + res);
  ok(R.dismissNPC(s, 'agnes'), '离队失败');
  ok(s.party.length === 0, '离队后队伍未清空');
}

/* ------------------------------------------------------------------ */
section('剧情自动通关');
const ENDINGS = {};
let maxSteps = 0;
function autoPlay(seed) {
  const race = D.RACES[seed % D.RACES.length];
  const career = race.careers[seed % race.careers.length];
  const s = R.createCharacter({ raceId: race.id, careerId: career, name: '旅人' });
  C.enter(s, 'intro');
  let steps = 0;
  while (!s.ended && steps++ < 500) {
    if (s.mode === 'combat' && s.combat) {
      combatLoop(s);
      if (s.combat && s.combat.over) {
        C.onCombatEnd(s, s.combat.result);
      }
      continue;
    }
    // 模拟玩家：进入第四章后招募同伴
    if (s.act === 4 && !s.flags.testRecruited) {
      s.flags.testRecruited = true;
      ['agnes', 'grom', 'hilda', 'edric'].forEach((id) => {
        R.meetNPC(s, id, 35);
        R.addAffinity(s, id, 60);
        if (s.party.length < 2 && R.canRecruit(s, id)) R.recruitNPC(s, id);
      });
    }
    // 模拟玩家：把经验花掉
    if (s.xp >= 10) {
      if (s.skills.melee.adv < 20) R.buySkill(s, 'melee');
      else if (s.xp >= 15) R.buyStat(s, 'ws');
    }
    const all = C.choices(s);
    const usable = all.map((c, i) => i).filter((i) => !all[i].disabled);
    if (!usable.length) break;

    const score = (c) => {
      if (c.reroll) return 5;
      if (c.label.indexOf('旧礼拜堂') >= 0) return 100;
      if (c.label.indexOf('循线深入') >= 0) return 99;
      if (c.stay && (c.label.indexOf('休整') >= 0 || c.label.indexOf('喘口气') >= 0 || c.label.indexOf('睡一觉') >= 0 || c.label.indexOf('歇一晚') >= 0)) return s.wounds < s.maxWounds * 0.7 ? 105 : 5;
      if (c.stay && c.label.indexOf('治疗药水') >= 0) return (s.items.potion || 0) < 2 ? 97 : 4;
      if (c.label.indexOf('离开') >= 0 || c.label.indexOf('回到') >= 0 || c.label.indexOf('继续') >= 0) return 30;
      if (c.label.indexOf('购买') >= 0) return 25;
      return 60;
    };
    const best = Math.max(...usable.map((i) => score(all[i])));
    const pool = usable.filter((i) => score(all[i]) === best);
    const idx = pool[Math.floor(Math.random() * pool.length)];
    const res = C.choose(s, idx);
    if (res && res.finish) break;
    if (res && res.combat && res.ended) C.onCombatEnd(s, res.ended);
  }
  maxSteps = Math.max(maxSteps, steps);
  return s;
}

{
  for (let i = 0; i < 120; i++) {
    const s = autoPlay(i);
    const key = s.sceneId || 'none';
    ENDINGS[key] = (ENDINGS[key] || 0) + 1;
    if (!s.ended) ok(false, `第 ${i} 局未能结束（${s.sceneId}, 线索 ${s.clues.length}）`);
    ok(s.wounds >= 0, '剧情中伤口为负');
  }
  console.log('  结局分布：', ENDINGS);
  console.log('  最大步数：', maxSteps);
  ok(Object.keys(ENDINGS).some((k) => k.indexOf('ending_') === 0), '没有到达任何结局');
  ok(maxSteps < 400, '存在疑似死循环');
}

/* ------------------------------------------------------------------ */
section('存档往返');
{
  const s = autoPlay(3);
  const clone = JSON.parse(JSON.stringify(s));
  const state = clone;
  const scene = C.currentScene(state);
  ok(!!scene, '读档后场景不存在');
  if (!state.ended) {
    const list = C.choices(state);
    ok(Array.isArray(list), '读档后无法生成选项');
  }
  ok(JSON.parse(JSON.stringify(state)).sceneId === state.sceneId, '场景 ID 未保留');
}

console.log(`\n共 ${checks} 项检查，失败 ${failures} 项。`);
process.exit(failures ? 1 : 0);
