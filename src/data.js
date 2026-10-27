/* 灰烬王冠 — 数据层：属性、技能、种族、职业、装备、法术、敌人 */
(function (root) {
  'use strict';
  var G = root.G = root.G || {};

  var CHARS = [
    { id: 'ws',  name: '武器技巧', short: 'WS', desc: '白刃相接的本领。' },
    { id: 'bs',  name: '射击技巧', short: 'BS', desc: '弓弩火器的准头。' },
    { id: 's',   name: '力量',     short: 'S',  desc: '决定伤害与负重。' },
    { id: 't',   name: '坚韧',     short: 'T',  desc: '抵抗伤痛与毒素。' },
    { id: 'ag',  name: '敏捷',     short: 'Ag', desc: '身法与反应速度。' },
    { id: 'int', name: '智力',     short: 'Int',desc: '知识、推理与观察。' },
    { id: 'wp',  name: '意志',     short: 'WP', desc: '对抗恐惧与腐化。' },
    { id: 'fel', name: '交际',     short: 'Fel',desc: '言辞、魅力与威仪。' }
  ];

  var SKILLS = {
    melee:      { name: '近战',     char: 'ws',  advanced: true,  desc: '刀剑斧锤的搏杀。' },
    ranged:     { name: '射击',     char: 'bs',  advanced: true,  desc: '弓弩与火器。' },
    dodge:      { name: '闪避',     char: 'ag',  advanced: false, desc: '侧身避开攻击。' },
    parry:      { name: '格挡',     char: 'ws',  advanced: true,  desc: '以兵器架开攻击。' },
    athletics:  { name: '运动',     char: 'ag',  advanced: false, desc: '奔跑、跳跃、平衡。' },
    climb:      { name: '攀爬',     char: 's',   advanced: false, desc: '翻墙越脊。' },
    stealth:    { name: '隐匿',     char: 'ag',  advanced: true,  desc: '潜行与藏身。' },
    perception: { name: '侦查',     char: 'int', advanced: false, desc: '察觉细节与埋伏。' },
    track:      { name: '追踪',     char: 'int', advanced: true,  desc: '循迹觅踪。' },
    lore:       { name: '学识',     char: 'int', advanced: true,  desc: '历史、神学与秘闻。' },
    heal:       { name: '医疗',     char: 'int', advanced: true,  desc: '包扎、解毒与急救。' },
    streetwise: { name: '街头知识', char: 'int', advanced: false, desc: '黑市、帮派与流言。' },
    persuade:   { name: '说服',     char: 'fel', advanced: true,  desc: '以理服人。' },
    deceive:    { name: '欺诈',     char: 'fel', advanced: true,  desc: '说谎与伪装。' },
    intimidate: { name: '威吓',     char: 's',   advanced: false, desc: '以势压人。' },
    charm:      { name: '魅惑',     char: 'fel', advanced: true,  desc: '博取好感。' },
    gossip:     { name: '八卦',     char: 'fel', advanced: false, desc: '酒馆里套话。' },
    survival:   { name: '生存',     char: 'int', advanced: true,  desc: '野外与废墟中的活命本事。' },
    ride:       { name: '骑术',     char: 'ag',  advanced: false, desc: '驾驭坐骑。' },
    swim:       { name: '游泳',     char: 's',   advanced: false, desc: '水中挣扎。' },
    intuition:  { name: '直觉',     char: 'wp',  advanced: false, desc: '察觉谎言与恶意。' },
    magic:      { name: '魔法',     char: 'wp',  advanced: true,  desc: '引导八风之力。' },
    pray:       { name: '祈祷',     char: 'wp',  advanced: true,  desc: '向神祇祈求。' },
    language:   { name: '古典语',   char: 'int', advanced: true,  desc: '读懂古老文本。' }
  };

  /* ------------------------------------------------------------------ */
  /* 种族                                                                */
  /* ------------------------------------------------------------------ */
  var RACES = [
    {
      id: 'empire', name: '帝国人类', tag: '旧世界的中坚',
      blurb: '农夫、士兵、商人与学者的国度。没有精灵的优雅，也没有矮人的固执，但人类什么都能学会一点。',
      mods: { int: 5, fel: 5 },
      fate: 3, resilience: 1, wounds: 0,
      talent: 'ambition',
      traits: ['适应力：起始额外获得 25 经验'],
      careers: ['soldier', 'thief', 'scholar'],
      intro: '你生在瑞克河畔的一个普通村庄。征兵官敲开你家门的那年，你学会了握剑；后来你学会了闭嘴、喝酒、以及在死人身上找钱。灰港对你而言只是又一个可以重头开始的地方——或者结束的地方。'
    },
    {
      id: 'bretonnia', name: '巴托尼亚骑士', tag: '湖中女士的剑',
      blurb: '骑士道的国度。荣耀高于性命，誓言重于黄金。即便落魄至此，你仍然记得如何挺直脊背。',
      mods: { ws: 10, bs: -5, s: 5, t: 5, ag: 5, int: -5, wp: 5, fel: 5 },
      fate: 2, resilience: 1, wounds: 2,
      talent: 'lady',
      traits: ['骑士训练：骑术与近战更易精进', '湖中女士的眷顾：+1 命运点'],
      careers: ['knight', 'squire', 'troubadour'],
      intro: '你的家族纹章已经褪色，马匹卖给了商人，铠甲上补过三次。但你仍在每个清晨向湖中女士祷告。灰港的泥泞弄脏了你的靴子，却弄不脏你的誓言：找到那件被亵渎的圣物，把它带回阳光之下。'
    },
    {
      id: 'chaos', name: '混沌信徒', tag: '诸神的低语',
      blurb: '你在梦里听见了名字。诸神并不仁慈，但它们会回应。腐化既是恩赐，也是绳索。',
      mods: { ws: 5, s: 5, t: 10, int: -5, wp: 10, fel: -5 },
      fate: 2, resilience: 2, wounds: 2,
      talent: 'corrupt_flesh',
      traits: ['腐化之躯：起始腐化 1 点，伤口 +2', '诸神注视：腐化达到阈值会获得变异'],
      careers: ['cultist', 'marauder', 'sorcerer'],
      intro: '你曾以为那些梦只是梦。直到某夜，你在柴房墙上用血画出了那个符号，而它回了你一个名字。灰港的余烬之手在招募同道，你带着匕首与满身低语而来——你想知道，那顶王冠究竟属于谁。'
    },
    {
      id: 'kislev', name: '基斯里夫', tag: '寒原上的熊',
      blurb: '北方的冰雪国度。这里的冬天会杀人，而基斯里夫人学会了先杀冬天。',
      mods: { ws: 5, bs: 5, s: 5, t: 10, ag: 5, fel: -5 },
      fate: 2, resilience: 2, wounds: 2,
      talent: 'cold_blood',
      traits: ['寒地血脉：抵抗寒冷与疲劳时 +10', '熊神庇佑：意志坚定'],
      careers: ['lancer', 'hunter', 'ice_witch'],
      intro: '你越过边境时，身后是烧掉的村庄和没来得及埋葬的亲人。灰港的冬天没有基斯里夫冷，但这里的寒意来自人心。你带着一柄军刀、一壶伏特加，和一条必须完成的誓言。'
    },
    {
      id: 'highelf', name: '高等精灵', tag: '衰落的荣光',
      blurb: '奥苏安的子嗣。你见过海洋尽头的光，因此格外无法忍受人类的臭气与短视。',
      mods: { ws: 10, bs: 10, s: -5, t: -5, ag: 10, int: 10, wp: 5, fel: 5 },
      fate: 3, resilience: 2, wounds: -1,
      talent: 'aethyr',
      traits: ['魔法亲和：魔法技能 +5', '傲慢：与人类打交道时部分检定 -10'],
      careers: ['swordmaster', 'mage', 'shadow'],
      intro: '你奉白塔之命追踪一件流失的器物。线索把你带到这座人类城市——肮脏、喧闹、短命。你本可以一剑劈开城门，但你选择了礼貌。至少现在还是。'
    },
    {
      id: 'cathay', name: '震旦', tag: '龙帝的疆域',
      blurb: '世界另一端的庞大帝国。玉甲、火药与星象术守着长城，也守着龙帝的疆土。你是随使团西来的震旦人。',
      mods: { ws: 5, bs: 5, t: 5, int: 5, wp: 5 },
      fate: 2, resilience: 2, wounds: 1,
      talent: 'dragon_blood',
      traits: ['龙帝血脉：命运点 +1，意志 +5', '玉与火药：可使用震旦兵器', '异邦人：你的身份在旧世界需要重新证明'],
      careers: ['jade_warrior', 'astromancer', 'crane_gunner'],
      intro: '玉龙号在灰港下锚时，雨正从北边来。你是震旦使团的一员——或者说，曾经是。龙帝的星盘在途中被余烬之手偷走，指针最后指向这座旧世界城市。你带着一柄刀、一身玉甲，和一份必须完成的使命，踏上了陌生的码头。'
    }
  ];

  /* ------------------------------------------------------------------ */
  /* 职业                                                                */
  /* ------------------------------------------------------------------ */
  var CAREERS = [
    /* 帝国 */
    {
      id: 'soldier', name: '帝国士兵', race: 'empire',
      blurb: '长枪方阵里活下来的老兵。纪律是你的第二层皮。',
      mods: { ws: 5, t: 5 }, skills: { melee: 10, dodge: 5, athletics: 5, perception: 5 },
      talents: ['drilled'], weapons: ['sword', 'shield'], armour: { head: 1, arms: 1, body: 2, legs: 0 },
      items: ['bandage', 'potion'], money: 14,
      kit: '长剑、盾牌、旧军服改的皮甲'
    },
    {
      id: 'thief', name: '盗贼', race: 'empire',
      blurb: '在灰港，锁比人诚实。你只偷那些活该被偷的人——大部分时候。',
      mods: { ag: 5, fel: 5 }, skills: { stealth: 10, streetwise: 10, deceive: 5, dodge: 5, perception: 5 },
      talents: ['catlike'], weapons: ['dagger', 'dagger'], armour: { head: 0, arms: 0, body: 1, legs: 0 },
      items: ['lockpick', 'rope'], money: 22,
      kit: '两把匕首、皮背心、撬锁工具'
    },
    {
      id: 'scholar', name: '学者', race: 'empire',
      blurb: '你读过不该读的书，于是知道了不该知道的事。',
      mods: { int: 10, wp: 5 }, skills: { lore: 10, language: 10, perception: 5, heal: 5, persuade: 5 },
      talents: ['bookworm'], weapons: ['dagger'], armour: { head: 0, arms: 0, body: 0, legs: 0 },
      items: ['potion', 'book'], money: 10,
      kit: '匕首、笔记、一瓶劣质药剂'
    },
    /* 巴托尼亚 */
    {
      id: 'knight', name: '骑士', race: 'bretonnia',
      blurb: '誓言在身，铠甲在身。哪怕只剩一匹马的名字。',
      mods: { ws: 10, s: 5, fel: 5 }, skills: { melee: 10, ride: 10, parry: 10, athletics: 5, persuade: 5 },
      talents: ['swordmaster'], weapons: ['longsword', 'shield'], armour: { head: 3, arms: 2, body: 3, legs: 1 },
      items: ['bandage', 'potion', 'holy_water'], money: 24,
      kit: '双手长剑、盾牌、板甲（祖传，缺了几片）'
    },
    {
      id: 'squire', name: '侍从', race: 'bretonnia',
      blurb: '你替骑士牵马、磨剑、挡刀。你还没资格被称为骑士，但你已经比他们大多数人更懂泥。',
      mods: { ws: 5, ag: 5, t: 5 }, skills: { melee: 5, ride: 5, athletics: 5, heal: 5, perception: 5 },
      talents: ['loyal'], weapons: ['spear', 'shield'], armour: { head: 1, arms: 1, body: 2, legs: 0 },
      items: ['bandage', 'bandage'], money: 9,
      kit: '长矛、盾牌、锁子甲背心'
    },
    {
      id: 'troubadour', name: '游吟诗人', race: 'bretonnia',
      blurb: '你的歌声值几个铜板，你的秘密值几条命。',
      mods: { fel: 10, wp: 5 }, skills: { persuade: 10, charm: 10, gossip: 10, language: 5, deceive: 5 },
      talents: ['silver_tongue'], weapons: ['dagger'], armour: { head: 0, arms: 0, body: 1, legs: 0 },
      items: ['lute', 'potion'], money: 18,
      kit: '匕首、鲁特琴、一件体面的外套'
    },
    /* 混沌 */
    {
      id: 'cultist', name: '邪教徒', race: 'chaos',
      blurb: '你在集市上卖草药，在夜里割开活人的喉咙。两件事都需要耐心。',
      mods: { wp: 5, fel: 5, int: 5 }, skills: { deceive: 10, stealth: 5, lore: 5, persuade: 5, perception: 5 },
      talents: ['whisper'], weapons: ['dagger'], armour: { head: 0, arms: 0, body: 0, legs: 0 },
      items: ['ritual_dagger', 'incense'], money: 12,
      kit: '仪式匕首、熏香、一件带兜帽的斗篷'
    },
    {
      id: 'marauder', name: '掠夺者', race: 'chaos',
      blurb: '你来自荒原。你活着，因为你先动了手。',
      mods: { ws: 10, s: 10, t: 5 }, skills: { melee: 10, athletics: 10, intimidate: 10, survival: 5 },
      talents: ['bloodlust'], weapons: ['axe', 'shield'], armour: { head: 1, arms: 1, body: 2, legs: 1 },
      items: ['bandage'], money: 6,
      kit: '缺口战斧、蒙皮盾、破旧毛皮'
    },
    {
      id: 'sorcerer', name: '低语者', race: 'chaos',
      blurb: '诸神在你脑子里说话。你学会了回答。',
      mods: { wp: 10, int: 5 }, skills: { magic: 10, lore: 10, deceive: 5, language: 5 },
      talents: ['witchsight'], spells: ['tainted_bolt', 'chaos_gift'],
      weapons: ['staff'], armour: { head: 0, arms: 0, body: 0, legs: 0 },
      items: ['potion'], money: 10,
      kit: '黑木法杖、写满符号的皮卷'
    },
    /* 基斯里夫 */
    {
      id: 'lancer', name: '翼骑兵', race: 'kislev',
      blurb: '你背上的木翼曾让整个旧世界回头。现在它们只剩一边。',
      mods: { ws: 5, ag: 5, s: 5 }, skills: { ride: 10, melee: 10, athletics: 5, perception: 5 },
      talents: ['cavalry'], weapons: ['sabre', 'shield'], armour: { head: 2, arms: 1, body: 2, legs: 1 },
      items: ['bandage', 'potion', 'vodka'], money: 14,
      kit: '军刀、圆盾、残破的翼骑兵皮甲'
    },
    {
      id: 'hunter', name: '猎人', race: 'kislev',
      blurb: '森林教你两件事：别出声，别打偏。',
      mods: { bs: 10, ag: 5, int: 5 }, skills: { ranged: 10, survival: 10, stealth: 10, perception: 5 },
      talents: ['deadeye'], weapons: ['bow', 'knife'], armour: { head: 0, arms: 0, body: 1, legs: 0 },
      items: ['bandage', 'rope'], money: 11,
      kit: '角弓、猎刀、鞣皮袄'
    },
    {
      id: 'ice_witch', name: '冰霜女巫', race: 'kislev',
      blurb: '你从冰里借力，冰总有一天会来讨债。',
      mods: { wp: 10, int: 5 }, skills: { magic: 10, lore: 10, heal: 5, perception: 5 },
      talents: ['ice_blood'], spells: ['ice_shard', 'frost_shield'],
      weapons: ['staff'], armour: { head: 0, arms: 0, body: 0, legs: 0 },
      items: ['potion'], money: 12,
      kit: '冰纹法杖、熊皮斗篷'
    },
    /* 高等精灵 */
    {
      id: 'swordmaster', name: '剑圣', race: 'highelf',
      blurb: '你的剑比大多数人类的一生更长。你并不因此骄傲——只是理所当然。',
      mods: { ws: 10, ag: 5, int: 5 }, skills: { melee: 15, parry: 10, dodge: 5, athletics: 5, perception: 5 },
      talents: ['swordmaster'], weapons: ['longsword'], armour: { head: 2, arms: 1, body: 2, legs: 0 },
      items: ['bandage', 'potion'], money: 20,
      kit: '精灵长剑、鳞甲、白塔徽记'
    },
    {
      id: 'mage', name: '荷斯法师', race: 'highelf',
      blurb: '你研究八风，而八风也在研究你。',
      mods: { int: 10, wp: 10 }, skills: { magic: 10, lore: 15, language: 10, perception: 5 },
      talents: ['aethyr'], spells: ['fireball', 'heal'], weapons: ['staff'], armour: { head: 0, arms: 0, body: 0, legs: 0 },
      items: ['potion', 'book'], money: 15,
      kit: '白塔法杖、法术笔记'
    },
    {
      id: 'shadow', name: '影武者', race: 'highelf',
      blurb: '纳迦瑞斯的血脉在你的弓弦上低鸣。你从不正面杀人。',
      mods: { ag: 10, bs: 5 }, skills: { stealth: 10, ranged: 10, perception: 5, athletics: 5, survival: 5 },
      talents: ['catlike'], weapons: ['bow', 'dagger'], armour: { head: 0, arms: 0, body: 1, legs: 0 },
      items: ['rope', 'bandage'], money: 16,
      kit: '长弓、短刃、深色斗篷'
    },
    /* 震旦 */
    {
      id: 'jade_warrior', name: '玉勇', race: 'cathay',
      blurb: '玉甲在身，长刀在手。你是龙帝长城上的一块砖，也是最后一道墙。',
      mods: { ws: 10, t: 5 }, skills: { melee: 10, parry: 10, athletics: 5, perception: 5, intimidate: 5 },
      talents: ['jade_resolve'], weapons: ['dao', 'shield'], armour: { head: 2, arms: 2, body: 3, legs: 1 },
      items: ['bandage', 'potion'], money: 16,
      kit: '震旦长刀、玉鳞甲、圆盾'
    },
    {
      id: 'astromancer', name: '星象师', race: 'cathay',
      blurb: '你读星图，也读命运。龙帝的星盘在你手里发烫时，通常意味着坏事。',
      mods: { int: 10, wp: 10 }, skills: { magic: 10, lore: 10, language: 10, perception: 5, heal: 5 },
      talents: ['celestial_sight'], spells: ['celestial_bolt', 'star_shield'],
      weapons: ['staff'], armour: { head: 0, arms: 0, body: 1, legs: 0 },
      items: ['potion', 'book', 'jade_compass'], money: 14,
      kit: '星盘法杖、玉制罗盘、星图'
    },
    {
      id: 'crane_gunner', name: '鹤铳手', race: 'cathay',
      blurb: '鹤铳一声，山岭回响。你负责在敌人靠近之前，把他们留在远处。',
      mods: { bs: 10, ag: 5, int: 5 }, skills: { ranged: 10, perception: 10, stealth: 5, survival: 5, athletics: 5 },
      talents: ['crane_eye'], weapons: ['crane_gun', 'knife'], armour: { head: 1, arms: 0, body: 2, legs: 0 },
      items: ['bandage', 'rope'], money: 12,
      kit: '鹤铳、短刀、轻便玉片甲'
    }
  ];

  /* ------------------------------------------------------------------ */
  /* 身份阶级与职业晋升                                                   */
  /* ------------------------------------------------------------------ */
  var STATUS = [
    { tier: 1, name: '流民', desc: '没有产业、没有靠山的人。城门卫兵会多看你两眼。' },
    { tier: 2, name: '平民', desc: '农夫、佣兵、手艺人。旧世界的大多数人。' },
    { tier: 3, name: '自由民', desc: '行会成员、老兵、学者。说话有人听。' },
    { tier: 4, name: '士绅', desc: '骑士、富商、低级贵族。可以要求接见。' },
    { tier: 5, name: '贵族', desc: '领主与古老血脉。你的名字本身就是命令。' }
  ];

  var CAREER_RANKS = {
    soldier:    { titles: ['新兵', '老兵', '军士', '队长'], status: [2, 2, 3, 4] },
    thief:      { titles: ['扒手', '窃贼', '盗团头目', '影中大师'], status: [1, 1, 2, 3] },
    scholar:    { titles: ['抄写员', '学者', '博学者', '大贤者'], status: [3, 3, 4, 4] },
    knight:     { titles: ['侍从骑士', '游侠骑士', '圣杯骑士', '骑士领主'], status: [4, 4, 5, 5] },
    squire:     { titles: ['侍从', '扈从', '骑士', '掌旗官'], status: [3, 4, 4, 5] },
    troubadour: { titles: ['卖唱者', '游吟诗人', '宫廷诗人', '传奇歌者'], status: [2, 3, 3, 4] },
    cultist:    { titles: ['信徒', '祭徒', '低语者', '余烬祭司'], status: [1, 1, 2, 3] },
    marauder:   { titles: ['掠夺者', '战帮勇士', '战团首领', '混沌冠军'], status: [1, 1, 2, 3] },
    sorcerer:   { titles: ['学徒', '巫师', '低语者', '裂隙之主'], status: [1, 2, 3, 4] },
    lancer:     { titles: ['翼骑兵', '老兵翼骑', '翼骑队长', '北方之翼'], status: [3, 3, 4, 5] },
    hunter:     { titles: ['猎户', '追踪者', '猎手', '雪原传说'], status: [2, 2, 3, 3] },
    ice_witch:  { titles: ['霜之后裔', '冰霜女巫', '寒冬侍女', '冰雪女王'], status: [3, 3, 4, 5] },
    swordmaster:{ titles: ['剑士', '剑术大师', '荷斯剑圣', '白塔之刃'], status: [4, 4, 5, 5] },
    mage:       { titles: ['学徒法师', '荷斯法师', '大法师', '白塔贤者'], status: [3, 3, 4, 5] },
    shadow:     { titles: ['影徒', '影武者', '暗影猎手', '纳迦瑞斯之影'], status: [2, 2, 3, 4] },
    jade_warrior:{ titles: ['玉勇', '玉勇什长', '玉勇校尉', '玉龙将军'], status: [3, 3, 4, 5] },
    astromancer:{ titles: ['星象学徒', '星象师', '天象大法师', '龙帝御用星象师'], status: [4, 4, 5, 5] },
    crane_gunner:{ titles: ['鹤铳手', '鹤铳什长', '鹤铳校尉', '天鹤神射手'], status: [3, 3, 4, 4] }
  };

  /* ------------------------------------------------------------------ */
  /* 天赋                                                                */
  /* ------------------------------------------------------------------ */
  var TALENTS = {
    ambition:     { name: '野心', desc: '起始额外获得 25 经验。', xp: 25 },
    lady:         { name: '湖中女士的眷顾', desc: '+1 命运点，意志 +5。', stats: { wp: 5 }, fate: 1 },
    corrupt_flesh:{ name: '腐化之躯', desc: '伤口 +2，起始腐化 +1。', wounds: 2 },
    cold_blood:   { name: '寒地血脉', desc: '坚韧 +5，抵抗寒冷与疲劳 +10。', stats: { t: 5 } },
    aethyr:       { name: '魔法亲和', desc: '魔法技能 +5，意志 +5。', stats: { wp: 5 }, skills: { magic: 5 } },

    drilled:      { name: '操练', desc: '近战 +5，格挡 +5。', skills: { melee: 5, parry: 5 } },
    catlike:      { name: '猫步', desc: '隐匿 +10，闪避 +5。', skills: { stealth: 10, dodge: 5 } },
    bookworm:     { name: '书虫', desc: '学识 +10。', skills: { lore: 10 } },
    swordmaster:  { name: '剑术大师', desc: '近战 +10，格挡 +5。', skills: { melee: 10, parry: 5 } },
    loyal:        { name: '忠仆', desc: '意志 +5，伤口 +1。', stats: { wp: 5 }, wounds: 1 },
    silver_tongue:{ name: '如簧之舌', desc: '说服 +10，魅惑 +10。', skills: { persuade: 10, charm: 10 } },
    whisper:      { name: '低语者', desc: '欺诈 +10，魔法 +5。', skills: { deceive: 10, magic: 5 } },
    bloodlust:    { name: '嗜血', desc: '近战伤害 +2。', damage: 2 },
    witchsight:   { name: '巫视', desc: '魔法 +10，侦查 +5。', skills: { magic: 10, perception: 5 } },
    cavalry:      { name: '马背生涯', desc: '骑术 +10，先攻 +1。', skills: { ride: 10 }, init: 1 },
    deadeye:      { name: '鹰眼', desc: '射击 +10。', skills: { ranged: 10 } },
    ice_blood:    { name: '冰血', desc: '魔法 +5，坚韧 +5。', skills: { magic: 5 }, stats: { t: 5 } },

    iron_will:    { name: '钢铁意志', desc: '意志 +10，对抗恐惧 +10。', stats: { wp: 10 } },
    tough:        { name: '强壮', desc: '力量 +5，伤口 +2。', stats: { s: 5 }, wounds: 2 },
    swift:        { name: '迅捷', desc: '敏捷 +5，先攻 +1。', stats: { ag: 5 }, init: 1 },
    lucky:        { name: '幸运', desc: '+1 命运点上限。', fate: 1 },
    survivor:     { name: '幸存者', desc: '生存 +10，医疗 +5。', skills: { survival: 10, heal: 5 } },
    dragon_blood: { name: '龙帝血脉', desc: '意志 +5，命运点 +1。', stats: { wp: 5 }, fate: 1 },
    jade_resolve: { name: '玉心', desc: '坚韧 +5，伤口 +2。', stats: { t: 5 }, wounds: 2 },
    crane_eye:    { name: '鹤眼', desc: '射击 +10。', skills: { ranged: 10 } },
    celestial_sight: { name: '观星', desc: '魔法 +10，学识 +5。', skills: { magic: 10, lore: 5 } }
  };

  /* ------------------------------------------------------------------ */
  /* 武器 / 护甲 / 物品                                                   */
  /* ------------------------------------------------------------------ */
  var WEAPONS = {
    unarmed:   { name: '拳脚',     type: 'melee',  dmg: 0, hands: 1, price: 0,  qualities: [] },
    dagger:    { name: '匕首',     type: 'melee',  dmg: 4, hands: 1, price: 8,  qualities: ['fast', 'pierce'] },
    knife:     { name: '猎刀',     type: 'melee',  dmg: 4, hands: 1, price: 6,  qualities: ['fast', 'pierce'] },
    sword:     { name: '长剑',     type: 'melee',  dmg: 5, hands: 1, price: 20, qualities: ['balanced'] },
    longsword: { name: '双手剑',   type: 'melee',  dmg: 7, hands: 2, price: 40, qualities: ['balanced', 'twohand'] },
    sabre:     { name: '军刀',     type: 'melee',  dmg: 5, hands: 1, price: 18, qualities: ['fast'] },
    dao:       { name: '震旦长刀', type: 'melee',  dmg: 6, hands: 1, price: 22, qualities: ['fast', 'balanced'] },
    axe:       { name: '战斧',     type: 'melee',  dmg: 6, hands: 1, price: 22, qualities: ['pierce'] },
    club:      { name: '短棍',     type: 'melee',  dmg: 4, hands: 1, price: 5,  qualities: [] },
    spear:     { name: '长矛',     type: 'melee',  dmg: 5, hands: 2, price: 15, qualities: ['reach'] },
    lance:     { name: '骑枪',     type: 'melee',  dmg: 7, hands: 1, price: 30, qualities: ['reach'] },
    staff:     { name: '法杖',     type: 'melee',  dmg: 5, hands: 2, price: 10, qualities: ['focus'] },
    bow:       { name: '角弓',     type: 'ranged', dmg: 7, hands: 2, price: 25, qualities: ['reload0'] },
    crossbow:  { name: '弩',       type: 'ranged', dmg: 9, hands: 2, price: 35, qualities: ['reload'] },
    crane_gun: { name: '鹤铳',     type: 'ranged', dmg: 10, hands: 2, price: 50, qualities: ['reload', 'pierce'] },
    pistol:    { name: '手枪',     type: 'ranged', dmg: 8, hands: 1, price: 60, qualities: ['reload', 'close'] },
    shield:    { name: '盾牌',     type: 'shield', dmg: 0, hands: 1, price: 12, qualities: ['shield'] }
  };

  var ARMOUR_PIECES = {
    leather: { name: '皮甲',  ap: 1, price: 15, slot: 'body' },
    mail:    { name: '锁子甲', ap: 2, price: 45, slot: 'body' },
    plate:   { name: '板甲',  ap: 3, price: 120, slot: 'body' }
  };

  var ITEMS = {
    potion:    { name: '治疗药水', price: 14, use: 'heal', desc: '恢复 1d10+3 点伤口。' },
    bandage:   { name: '绷带',     price: 3,  use: 'bandage', desc: '止住流血，恢复 2 点伤口。' },
    holy_water:{ name: '圣水',     price: 12, use: 'holy', desc: '对亡灵与魔物造成 2d10 伤害。' },
    rope:      { name: '绳索',     price: 4,  use: null, desc: '攀爬与捆绑时 +10。' },
    lockpick:  { name: '撬锁工具', price: 10, use: null, desc: '开锁时 +10。' },
    torch:     { name: '火把',     price: 2,  use: null, desc: '照明。黑暗中的侦查不再 -20。' },
    book:      { name: '笔记',     price: 6,  use: null, desc: '学识检定 +5。' },
    vodka:     { name: '伏特加',   price: 5,  use: 'vodka', desc: '恢复 1d5 伤口，下一战意志 +5。' },
    lute:      { name: '鲁特琴',   price: 25, use: null, desc: '卖艺与魅惑时 +10。' },
    incense:   { name: '熏香',     price: 4,  use: null, desc: '仪式用品。' },
    ritual_dagger:{ name: '仪式匕首', price: 15, use: null, desc: '对腐化者造成额外伤害。' },
    jade_compass: { name: '玉制罗盘', price: 0, use: null, desc: '震旦星盘的残件。靠近混沌裂痕时会发烫。' }
  };

  /* ------------------------------------------------------------------ */
  /* 法术                                                                */
  /* ------------------------------------------------------------------ */
  var SPELLS = {
    fireball: {
      name: '火焰弹', cost: '1 回合', test: 'magic', range: 'far',
      desc: '掷出赤红的火球，造成 10 点伤害，命中后目标可能着火。',
      effect: { type: 'damage', dmg: 10, burn: 2 }
    },
    heal: {
      name: '治愈之手', cost: '1 回合', test: 'magic', range: 'self',
      desc: '以生命之风缝合伤口，恢复 1d10+4 点伤口。',
      effect: { type: 'heal', dmg: '1d10+4' }
    },
    tainted_bolt: {
      name: '腐化之箭', test: 'magic', range: 'far',
      desc: '一道污浊的紫光，造成 9 点伤害并腐蚀目标。',
      effect: { type: 'damage', dmg: 9, corrupt: 1 }
    },
    chaos_gift: {
      name: '混沌馈赠', test: 'magic', range: 'self',
      desc: '诸神的低语灌入四肢：本场战斗近战 +10、伤害 +2，自身腐化 +1。',
      effect: { type: 'buff', ws: 10, dmg: 2, rounds: 99, corruption: 1 }
    },
    ice_shard: {
      name: '冰霜碎片', test: 'magic', range: 'far',
      desc: '凝冰成刃，造成 8 点伤害，并使目标下回合攻击 -10。',
      effect: { type: 'damage', dmg: 8, chill: 1 }
    },
    frost_shield: {
      name: '霜甲', test: 'magic', range: 'self',
      desc: '寒冰覆体，3 回合内护甲 +2。',
      effect: { type: 'armour', ap: 2, rounds: 3 }
    },
    celestial_bolt: {
      name: '星辰之矢', test: 'magic', range: 'far',
      desc: '以星图引下一道冷光，造成 9 点伤害。',
      effect: { type: 'damage', dmg: 9 }
    },
    star_shield: {
      name: '星辉护体', test: 'magic', range: 'self',
      desc: '星辉覆体，3 回合内护甲 +2。',
      effect: { type: 'armour', ap: 2, rounds: 3 }
    }
  };

  /* ------------------------------------------------------------------ */
  /* 敌人                                                                */
  /* ------------------------------------------------------------------ */
  var ENEMIES = {
    thug: {
      name: '码头暴徒', desc: '满身鱼腥味的打手，腰间挂着一根包铁短棍。',
      ws: 35, bs: 20, s: 35, t: 30, ag: 30, int: 25, wp: 25, fel: 20,
      wounds: 11, armour: { head: 0, arms: 0, body: 1, legs: 0 },
      weapon: 'club', xp: 15, gold: [2, 8], ai: 'aggressive'
    },
    cultist: {
      name: '余烬信徒', desc: '灰袍罩身，脸涂成炭色，手持一把锯齿匕首。',
      ws: 40, bs: 25, s: 30, t: 30, ag: 35, int: 30, wp: 35, fel: 25,
      wounds: 11, armour: { head: 0, arms: 0, body: 1, legs: 0 },
      weapon: 'dagger', xp: 18, gold: [0, 6], ai: 'aggressive'
    },
    hound: {
      name: '变异猎犬', desc: '三条腿，两张嘴，眼睛的位置长着别的东西。',
      ws: 45, bs: 0, s: 40, t: 35, ag: 45, int: 10, wp: 20, fel: 5,
      wounds: 10, armour: { head: 0, arms: 0, body: 0, legs: 0 },
      weapon: 'unarmed', xp: 16, gold: [0, 0], ai: 'beast'
    },
    zealot: {
      name: '灰烬狂信徒', desc: '身上缠着浸油的布条，笑着点燃自己。',
      ws: 45, bs: 20, s: 40, t: 35, ag: 30, int: 20, wp: 45, fel: 10,
      wounds: 11, armour: { head: 0, arms: 0, body: 1, legs: 0 },
      weapon: 'axe', xp: 22, gold: [0, 5], ai: 'aggressive'
    },
    watchman: {
      name: '灰港巡夜人', desc: '被收买的守夜人，盔甲下面藏着余烬的烙印。',
      ws: 40, bs: 35, s: 35, t: 35, ag: 30, int: 30, wp: 30, fel: 30,
      wounds: 12, armour: { head: 1, arms: 1, body: 2, legs: 0 },
      weapon: 'spear', xp: 24, gold: [4, 10], ai: 'defensive'
    },
    priest: {
      name: '灰烬祭司', desc: '灰烬王冠的看守者。他的影子比身体先动。',
      ws: 45, bs: 30, s: 35, t: 40, ag: 35, int: 45, wp: 55, fel: 30,
      wounds: 20, armour: { head: 1, arms: 1, body: 2, legs: 1 },
      weapon: 'staff', xp: 80, gold: [20, 40], ai: 'caster',
      spells: ['tainted_bolt', 'chaos_gift'], boss: true
    },
    marauder: {
      name: '混沌掠夺者', desc: '从北方荒原来的战帮成员，皮甲上钉着人骨。',
      ws: 45, bs: 25, s: 45, t: 40, ag: 30, int: 25, wp: 35, fel: 20,
      wounds: 15, armour: { head: 1, arms: 1, body: 2, legs: 1 },
      weapon: 'axe', xp: 28, gold: [5, 12], ai: 'aggressive'
    },
    chosen: {
      name: '混沌神选', desc: '盔甲与血肉长在一起，动作却快得不像人。',
      ws: 55, bs: 30, s: 50, t: 45, ag: 35, int: 30, wp: 45, fel: 25,
      wounds: 18, armour: { head: 2, arms: 2, body: 3, legs: 1 },
      weapon: 'longsword', xp: 45, gold: [10, 20], ai: 'aggressive'
    },
    lord: {
      name: '灰烬领主·卡洛尔', desc: '他的王冠熔进了头骨，声音像很多人在同一副喉咙里说话。',
      ws: 60, bs: 40, s: 55, t: 50, ag: 40, int: 45, wp: 60, fel: 35,
      wounds: 28, armour: { head: 2, arms: 2, body: 3, legs: 2 },
      weapon: 'longsword', xp: 120, gold: [50, 100], ai: 'caster',
      spells: ['tainted_bolt', 'chaos_gift'], boss: true
    }
  };

  /* ------------------------------------------------------------------ */
  /* 可招募同伴                                                          */
  /* ------------------------------------------------------------------ */
  var NPCS = {
    agnes: {
      name: '阿格尼丝', title: '圣米迦勒修女', role: '医师',
      desc: '头发全白的老修女。她见过太多伤口，因此不太容易被吓到。',
      stats: { ws: 35, bs: 25, s: 30, t: 35, ag: 30, int: 45, wp: 50, fel: 45 },
      wounds: 16, armour: { head: 0, arms: 0, body: 1, legs: 0 },
      weapons: ['staff'], spells: ['heal'], ai: 'healer',
      quest: 'npcq_agnes', gift: 'potion',
      boon: '战斗中优先治疗伤势最重的人。'
    },
    grom: {
      name: '格罗姆·铁牙', title: '无旗佣兵', role: '先锋',
      desc: '脸上有一道从眉骨划到下巴的旧疤。他收钱办事，但从不背弃还活着的人。',
      stats: { ws: 50, bs: 25, s: 45, t: 45, ag: 30, int: 25, wp: 35, fel: 30 },
      wounds: 22, armour: { head: 1, arms: 1, body: 2, legs: 1 },
      weapons: ['axe', 'shield'], ai: 'bruiser',
      quest: 'npcq_grom', gift: 'vodka',
      boon: '在前排承受更多攻击。'
    },
    hilda: {
      name: '希尔达', title: '基斯里夫猎手', role: '斥候',
      desc: '她说话很少，箭袋里只剩三支箭，其中一支一直留着。',
      stats: { ws: 35, bs: 50, s: 30, t: 30, ag: 45, int: 35, wp: 35, fel: 25 },
      wounds: 15, armour: { head: 0, arms: 0, body: 1, legs: 0 },
      weapons: ['bow', 'knife'], ai: 'archer',
      quest: 'npcq_hilda', gift: 'bandage',
      boon: '每回合远程射击，优先攻击最脆弱的敌人。'
    },
    edric: {
      name: '埃德里克', title: '白蜡堡民兵', role: '盾卫',
      desc: '十九岁，盔甲不合身，但他站岗时从不坐下。',
      stats: { ws: 40, bs: 35, s: 35, t: 35, ag: 30, int: 30, wp: 30, fel: 35 },
      wounds: 18, armour: { head: 1, arms: 1, body: 2, legs: 0 },
      weapons: ['spear', 'shield'], ai: 'soldier',
      quest: 'npcq_edric', gift: 'bandage',
      boon: '为你格挡一次攻击。'
    },
    qingheng: {
      name: '青蘅', title: '玉龙号鹤铳手', role: '援护',
      desc: '玉龙号上的鹤铳手。话不多，装填很快，只在瞄准时呼吸。',
      stats: { ws: 35, bs: 50, s: 30, t: 30, ag: 40, int: 35, wp: 35, fel: 30 },
      wounds: 15, armour: { head: 0, arms: 0, body: 1, legs: 0 },
      weapons: ['crane_gun', 'knife'], ai: 'archer',
      quest: 'npcq_qingheng', gift: 'bandage',
      boon: '远程援护：每回合射击最脆弱的敌人。'
    }
  };

  G.data = {
    CHARS: CHARS, SKILLS: SKILLS, RACES: RACES, CAREERS: CAREERS, TALENTS: TALENTS,
    WEAPONS: WEAPONS, ARMOUR_PIECES: ARMOUR_PIECES, ITEMS: ITEMS, SPELLS: SPELLS, ENEMIES: ENEMIES,
    NPCS: NPCS, CAREER_RANKS: CAREER_RANKS, STATUS: STATUS
  };
  G.charName = function (id) {
    for (var i = 0; i < CHARS.length; i++) if (CHARS[i].id === id) return CHARS[i].name;
    return id;
  };
})(typeof window !== 'undefined' ? window : globalThis);
