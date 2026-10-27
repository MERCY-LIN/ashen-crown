/**
 * UI 冒烟测试：用最小 DOM 桩渲染各个界面，捕捉模板/引用错误。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const els = new Map();

function makeEl(id) {
  return {
    id, innerHTML: '', className: '', textContent: '', value: '',
    style: {}, scrollTop: 0, scrollHeight: 0,
    addEventListener() { }, insertAdjacentHTML(pos, html) { this.innerHTML += html; },
    classList: { add() { }, remove() { }, contains() { return false; } },
    getAttribute() { return null; }, setAttribute() { }, click() { }, closest() { return null; }
  };
}

const listeners = { click: [], keydown: [], input: [] };
const document = {
  readyState: 'complete',
  getElementById(id) {
    if (!els.has(id)) els.set(id, makeEl(id));
    return els.get(id);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return makeEl('created'); },
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  body: makeEl('body')
};

const ctx = vm.createContext({
  console, Math, JSON, Date, Object, Array, String, Number, Boolean, Error, RegExp, Map, Set,
  setTimeout, clearTimeout,
  document,
  localStorage: {
    _v: {},
    getItem(k) { return this._v[k] || null; },
    setItem(k, v) { this._v[k] = String(v); },
    removeItem(k) { delete this._v[k]; }
  },
  requestAnimationFrame(fn) { fn(); },
  scrollTo() { },
  confirm() { return true; },
  Blob: class { },
  URL: { createObjectURL() { return ''; }, revokeObjectURL() { } }
});
ctx.window = ctx;
ctx.globalThis = ctx;

for (const f of ['data.js', 'rules.js', 'content.js', 'ui.js', 'main.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f });
}
const G = ctx.G;
let checks = 0, fails = 0;
function ok(c, m) { checks++; if (!c) { fails++; console.error('FAIL:', m); } }
function click(attrs) {
  const el = {
    tagName: 'BUTTON',
    getAttribute(k) { return attrs[k] === undefined ? null : attrs[k]; },
    closest() { return this; }
  };
  (listeners.click || []).forEach((fn) => fn({ target: el, stopPropagation() { } }));
}
function render() {
  try { G.ui.render(); return document.getElementById('screen').innerHTML; }
  catch (e) { fails++; checks++; console.error('RENDER ERROR:', e.message, '\n', e.stack.split('\n').slice(0, 3).join('\n')); return ''; }
}

// 标题
G.game.state = null;
let html = render();
ok(html.includes('灰烬王冠'), '标题页缺少标题');
ok(html.includes('开始新的故事'), '标题页缺少开始按钮');

// 创建流程三步
G.ui.create = { active: true, step: 0, raceId: null, careerId: null, name: '' };
html = render();
ok(html.includes('选择你的血脉'), '创建第一步缺失');
for (const race of G.data.RACES) ok(html.includes(race.name), '种族卡片缺失：' + race.name);

G.ui.create.step = 1; G.ui.create.raceId = 'highelf';
html = render();
ok(html.includes('选择职业'), '创建第二步缺失');
ok(html.includes('剑圣'), '精灵职业缺失');

G.ui.create.step = 2; G.ui.create.careerId = 'mage';
html = render();
ok(html.includes('最后一步'), '创建第三步缺失');
ok(html.includes('踏入灰港'), '缺少开始按钮');

// 游戏内各页签
G.ui.create.active = false;
G.game.newGame({ raceId: 'empire', careerId: 'soldier', name: '汉斯' });
G.content.enter(G.game.state, 'act1_hub');

for (const tab of ['adventure', 'character', 'companions', 'inventory', 'journal', 'system']) {
  G.ui.tab = tab;
  html = render();
  ok(html.length > 300, '页签渲染过短：' + tab);
}
G.ui.tab = 'adventure';
ok(html.includes('汉斯'), '侧栏缺少角色名');

// 同伴与队伍
G.game.state.npcs = {};
G.rules.meetNPC(G.game.state, 'agnes', 50);
G.rules.addAffinity(G.game.state, 'agnes', 40);
ok(G.rules.canRecruit(G.game.state, 'agnes'), '满足条件却无法招募');
ok(G.rules.recruitNPC(G.game.state, 'agnes'), '招募失败');
ok(G.game.state.party.length === 1, '队伍人数未更新');
G.ui.tab = 'companions';
html = render();
ok(html.includes('阿格尼丝'), '同伴页缺少 NPC');
ok(html.includes('同行'), '同伴页缺少同行状态');
G.ui.tab = 'adventure';

// 剧情检定结果
G.game.state.resultView = {
  title: '测试', paras: ['第一段', '第二段'], next: 'act1_hub',
  roll: { roll: 42, target: 55, success: true, sl: 1 }
};
G.game.state.sceneId = 'result';
html = render();
ok(html.includes('检定成功'), '检定结果未显示');

// 所有场景文本 + 选项渲染（用宽松状态）
G.game.state.sceneId = 'act1_hub';
const scenes = Object.keys(G.content.scenes);
for (const id of scenes) {
  G.game.state.sceneId = id;
  G.game.state.resultView = id === 'result' ? { title: 'x', paras: ['y'], next: 'act1_hub' } : null;
  html = render();
  ok(html.length > 100, '场景渲染为空：' + id);
}

// 战斗界面
G.game.state.sceneId = 'act3_ritual';
G.rules.startCombat(G.game.state, [{ key: 'priest', count: 1 }], { winScene: 'act3_final', loseScene: 'ending_death' });
G.ui.tab = 'adventure';
html = render();
ok(html.includes('灰烬祭司'), '战斗界面缺少敌人');
ok(html.includes('近战攻击'), '战斗界面缺少动作');
ok(html.includes('阿格尼丝'), '战斗界面缺少同伴');
ok(html.includes('自动行动') || html.includes('倒下'), '战斗界面缺少同伴状态');

// 结局
G.content.enter(G.game.state, 'ending_dawn');
html = render();
ok(html.includes('完成故事'), '结局页缺少按钮');

// 交互链路：新游戏 → 创建 → 同伴页操作
click({ 'data-act': 'new-game' });
ok(G.ui.create.active, '新游戏未进入创建流程');
click({ 'data-act': 'pick-race', 'data-id': 'empire' });
ok(G.ui.create.step === 1, '选择种族后未进入职业步骤');
click({ 'data-act': 'pick-career', 'data-id': 'soldier' });
ok(G.ui.create.step === 2, '选择职业后未进入命名步骤');
click({ 'data-act': 'create-start' });
ok(G.game.state && G.game.state.name, '创建流程未生成角色');
ok(G.game.state.careerId === 'soldier', '创建职业错误');

// 训练消耗时间
G.game.state.act = 1;
G.game.state.xp = 100;
G.ui.tab = 'character';
G.ui.render();
const clockBeforeTrain = G.game.state.clock;
click({ 'data-act': 'buy-stat', 'data-id': 'ws' });
ok(G.game.state.clock === clockBeforeTrain + 4, '训练没有消耗 4 小时');
G.ui.render();
ok(document.getElementById('screen').innerHTML.includes('第1天'), '界面没有显示时间');

// 职业晋升
G.game.state.xp = 1000;
G.game.state.flags.ch1Done = true;
const clockBeforePromote = G.game.state.clock;
click({ 'data-act': 'promote' });
ok(G.game.state.rank === 2, '点击晋升未提升职业等级');
ok(G.game.state.clock === clockBeforePromote + 8, '晋升没有消耗 8 小时');
G.ui.tab = 'character';
G.ui.render();
ok(document.getElementById('screen').innerHTML.includes('身份'), '角色页缺少身份信息');

G.game.state.act = 4;
G.rules.meetNPC(G.game.state, 'agnes', 15);
const beforeTalk = G.game.state.npcs.agnes.affinity;
click({ 'data-act': 'npc-talk', 'data-id': 'agnes' });
ok(G.game.state.npcs.agnes.affinity === beforeTalk + 6, '交谈未提升好感');
const beforeGold = G.game.state.gold;
click({ 'data-act': 'npc-gift', 'data-id': 'agnes' });
ok(G.game.state.gold === beforeGold - 10, '赠礼未扣钱');
ok(G.game.state.npcs.agnes.gift === true, '赠礼状态未记录');
G.rules.addAffinity(G.game.state, 'agnes', 20);
click({ 'data-act': 'npc-recruit', 'data-id': 'agnes' });
ok(G.game.state.party.indexOf('agnes') >= 0, '点击招募未加入队伍');
click({ 'data-act': 'npc-dismiss', 'data-id': 'agnes' });
ok(G.game.state.party.length === 0, '点击离队未生效');

// 场景选项交互
G.ui.tab = 'adventure';
G.content.enter(G.game.state, 'act1_hub');
G.ui.render();
click({ 'data-act': 'choose', 'data-i': '0' });
ok(G.game.state.sceneId === 'tavern', '场景选项未跳转：' + G.game.state.sceneId);

// 立绘
for (const id of ['empire', 'bretonnia', 'chaos', 'kislev', 'highelf', 'cathay', 'qingheng', 'agnes', 'grom', 'hilda', 'edric', 'priest', 'lord', 'chosen']) {
  const svg = G.ui.portrait(id);
  ok(svg.indexOf('<svg') === 0 && svg.indexOf('</svg>') > 0, '立绘缺失：' + id);
  ok(svg.indexOf('undefined') < 0, '立绘含 undefined：' + id);
}
ok(G.ui.portrait('nope') === '', '未知立绘应返回空');

// 选项后果与耗时提示
G.content.enter(G.game.state, 'act1_hub');
html = render();
ok(html.includes('⏳'), '选项缺少耗时提示');
ok(html.includes('推进剧情') || html.includes('可能受伤'), '选项缺少后果提示');

// 震旦开局分支
G.ui.create = { active: true, step: 0, raceId: null, careerId: null, name: '' };
click({ 'data-act': 'pick-race', 'data-id': 'cathay' });
click({ 'data-act': 'pick-career', 'data-id': 'astromancer' });
click({ 'data-act': 'create-start' });
ok(G.game.state.raceId === 'cathay', '震旦角色创建失败');
ok(G.game.state.sceneId === 'intro_cathay', '震旦没有进入专属序章：' + G.game.state.sceneId);

// 规则弹窗
G.ui.modal = 'help';
html = render();
ok(html.includes('规则速查'), '规则弹窗缺失');
G.ui.modal = null;

console.log(`UI 检查 ${checks} 项，失败 ${fails} 项。`);
process.exit(fails ? 1 : 0);
