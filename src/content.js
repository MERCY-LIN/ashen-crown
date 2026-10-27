/* 灰烬王冠 — 剧情：一章战役 + 随机遭遇 */
(function (root) {
  'use strict';
  var G = root.G = root.G || {};
  var R = G.rules;

  var CLUES = {
    ashes:  { name: '余烬印记', desc: '焦黑的掌印，五指张开，掌心有一只闭合的眼。' },
    ledger: { name: '走私货单', desc: '货单上写着“圣布伦希尔达的遗物”，收货人一栏画着同样的掌印。' },
    saint:  { name: '圣布伦希尔达', desc: '三百年前封圣的修女，传说她以自身镇压了一件“会说话的金器”。' },
    urn:    { name: '骨灰瓮', desc: '瓮中不是骨灰，而是混着金屑的炭。炭上刻着王冠的图样。' },
    circle: { name: '仪式图', desc: '七道同心圆，圆心是一顶没有脸的冠。仪式需要七个活人。' },
    crown:  { name: '灰烬王冠', desc: '混沌军阀的遗物，能以他人的痛苦喂养佩戴者。它一直在低语。' },
    weakness:{ name: '王冠的弱点', desc: '古卷记载：王冠畏惧“自愿的牺牲”，也畏惧被彻底遗忘。' },
    mayor:  { name: '市长的烙印', desc: '灰港市长袖口下，藏着与信徒相同的焦痕。' },
    compass:{ name: '星盘指针', desc: '从木箱夹层里找到的玉制指针。它不指南，只指向城北旧礼拜堂的方向。' },
    traitor:{ name: '独眼骆', desc: '玉龙号的叛徒。他把星盘卖给了余烬之手，换了一袋带焦痕的银币。' },
    buyer:  { name: '玉莲商馆的买家', desc: '收货人穿着灰港市长的颜色，名字被墨涂掉了，但焦痕还在。' }
  };

  function hasClue(state, id) { return state.clues.indexOf(id) >= 0; }
  function addClue(state, id) {
    if (!hasClue(state, id)) {
      state.clues.push(id);
      state.log.push('获得线索：' + CLUES[id].name);
    }
  }
  function flag(state, id) { return !!state.flags[id]; }
  function setFlag(state, id, v) { state.flags[id] = v === undefined ? true : v; }
  function addXp(state, n) { state.xp += n; state.totalXp += n; }
  function result(state, title, paras, next, roll) {
    state.resultView = { title: title, paras: paras, next: next, roll: roll || null };
    state.sceneId = 'result';
  }
  function raceOf(state) {
    return G.data.RACES.filter(function (r) { return r.id === state.raceId; })[0];
  }
  function careerOf(state) {
    return G.data.CAREERS.filter(function (c) { return c.id === state.careerId; })[0];
  }
  function clueHint(state) {
    return '已掌握 ' + state.clues.length + ' 条线索' + (state.clues.length ? '：' + state.clues.map(function (c) { return CLUES[c].name; }).join('、') : '');
  }

  var RACE_LINES = {
    hub: {
      empire: '你熟悉这种城镇：雨、税吏，以及藏在祷告后面的恐惧。',
      bretonnia: '你下意识摸了摸胸口的纹章。这里没人认得它，但你认得自己。',
      chaos: '你能比旁人早一步听见王冠的低语。它在数人头。',
      kislev: '这里的冷对你来说不算什么。真正让你不安的，是这种慢慢渗进骨头里的恶意。',
      highelf: '以人类的尺度，这座城市只存在了几个呼吸。可他们的恐惧闻起来和奥苏安一样古老。',
      cathay: '这里的雨没有玉的味道，只有铁锈和煤烟。但恐惧的气味，长城内外都一样。',
    },
    ritual: {
      empire: '你想起征兵官说过的话：恐惧是帝国最便宜的城墙。',
      bretonnia: '湖中女士的祷词在你舌尖发苦。你还是念完了它。',
      chaos: '王冠认出了你身上的印记。它用你梦里的那个声音叫了你的名字。',
      kislev: '你把军刀握紧。北方人解决问题的方式一向很直接。',
      highelf: '你见过比这更古老的邪恶，也见过它如何被封印。这让你稍微安心了一点。',
      cathay: '星盘在你怀里发烫。裂痕的频率，和长城外的混沌风暴一模一样。',
    }
  };
  function raceLine(state, key) {
    var m = RACE_LINES[key];
    return m ? m[state.raceId] : '';
  }

  /* ------------------------------------------------------------------ */
  /* 时间与期限                                                          */
  /* ------------------------------------------------------------------ */
  function deadlineInfo(state) {
    if (state.ended) return null;
    if (state.act <= 3) {
      if (state.flags.atChapel) return null;
      return { key: 'ritual', label: '余烬仪式', left: state.deadline1 - state.clock };
    }
    if (state.act === 4 && state.siegeDeadline && !state.flags.siegeDone) {
      return { key: 'siege', label: '混沌夜袭', left: state.siegeDeadline - state.clock };
    }
    if (state.act >= 5 && state.riftDeadline) {
      return { key: 'rift', label: '裂痕扩张', left: state.riftDeadline - state.clock };
    }
    return null;
  }

  function checkDeadlines(state) {
    if (state.ended) return false;
    if (state.act <= 3 && !state.flags.atChapel && state.clock >= state.deadline1 && !state.flags.lateRitual) {
      state.flags.lateRitual = true;
      state.flags.atChapel = true;
      enter(state, 'late_ritual');
      return true;
    }
    if (state.act === 4 && state.siegeDeadline && !state.flags.siegeStarted && !state.flags.siegeDone && state.clock >= state.siegeDeadline) {
      state.flags.siegeStarted = true;
      enter(state, 'act4_siege_late');
      return true;
    }
    if (state.act >= 5 && state.riftDeadline && state.clock >= state.riftDeadline && !state.flags.riftLate) {
      state.flags.riftLate = true;
      state.log.push('裂痕扩张了。卡洛尔的力量在增强。');
      state.lastMessage = '裂痕又扩大了一圈——卡洛尔变强了。';
    }
    var d = deadlineInfo(state);
    if (d && d.left > 0) {
      [24, 12, 6, 3].forEach(function (th) {
        var key = 'warn_' + d.key + '_' + th;
        if (d.left <= th && !state.flags[key]) {
          state.flags[key] = true;
          state.log.push('期限警告：' + d.label + '还剩约 ' + th + ' 小时。');
          state.lastMessage = d.label + '只剩 ' + th + ' 小时了。';
        }
      });
    }
    return false;
  }

  function tick(state, hours) {
    if (!hours || state.ended) return false;
    R.advanceTime(state, hours);
    state.log.push('时间：' + R.timeLabel(state.clock));
    return checkDeadlines(state);
  }

  function priceFactor(state) {
    return Math.max(0.85, Math.min(1.1, 1 - ((state.status || 2) - 2) * 0.05));
  }


  /* ------------------------------------------------------------------ */
  /* 场景                                                                */
  /* ------------------------------------------------------------------ */
  var scenes = {};

  scenes.intro = {
    act: 0, title: '灰港',
    text: function (state) {
      return [
        raceOf(state).intro,
        '灰港在雨里。低矮的石屋挤在河岸上，烟囱吐出的黑烟被风撕碎。城门上钉着三张通缉令，最上面那张的脸已经被雨水泡烂了。',
        '你此行的目的很简单：找到那件被称作“灰烬王冠”的东西。传说它随一支混沌战帮沉入北方沼泽，最近却出现在这座城的黑市上。',
        '更麻烦的是，余烬之手也在这里。'
      ];
    },
    choices: function () {
      return [
        { label: '走向城门', hint: '开始第一章', goto: 'gate' }
      ];
    }
  };

  scenes.intro_cathay = {
    act: 0, title: '玉龙号',
    onEnter: function (s) { s.tempAlly = 'qingheng'; R.meetNPC(s, 'qingheng', 20); },
    text: function (state) {
      return [
        '玉龙号在灰港下锚。雨里混着鱼腥、煤烟，还有一种你说不上来的腐甜味。',
        '船长岑海把一只空玉匣交到你手里。龙帝的星盘在途中被余烬之手偷走，指针最后指向这座旧世界城市。',
        '“使团不能公开介入。”他说，“从现在起，你只是一个人。”',
        '桅杆下，鹤铳手青蘅正在擦枪。她抬头看了你一眼，什么也没说。'
      ];
    },
    choices: function (state) {
      return [
        {
          label: '以震旦使节的身份登岸', hint: '说服 · 标准', time: 2,
          consequence: '成功：身份 +1、经验 +15；失败：被守卫轻视',
          check: {
            skill: 'persuade', difficulty: 0, title: '使节',
            success: {
              text: ['你报出龙帝使团的名号。守卫听不懂，但你的玉甲和刀让他把矛杆收了回去。', '“东方来的大人。”他嘟囔了一句，让开了路。'],
              goto: 'cathay_deck',
              effects: function (s) { s.status = Math.min(5, s.status + 1); setFlag(s, 'cathayEnvoy'); addXp(s, 15); }
            },
            failure: {
              text: ['守卫把你的话听完，和同伴交换了一个眼神。', '“东方来的？”他笑了笑，“灰港不认东方的大人。”'],
              goto: 'cathay_deck',
              effects: function (s) { setFlag(s, 'cathaySnubbed'); }
            }
          }
        },
        {
          label: '换上旧世界的衣服，暗中上岸', hint: '隐匿 · 标准', time: 2,
          consequence: '成功：获得线索、经验 +15',
          check: {
            skill: 'stealth', difficulty: 0, title: '混入码头',
            success: {
              text: ['你脱下玉甲，换上船工学来的粗布外套，混进卸货的人群。', '码头上有人低声谈论“余烬”和“北边的货”。你记下了几个名字。'],
              goto: 'cathay_deck',
              effects: function (s) { setFlag(s, 'cathayShadow'); addClue(s, 'ledger'); addXp(s, 15); }
            },
            failure: {
              text: ['你的靴子太新，走路太直。一个搬运工盯了你很久，直到你拐进巷子。'],
              goto: 'cathay_deck',
              effects: function () { }
            }
          }
        },
        {
          label: '不折腾了，先回甲板', hint: '稳妥', time: 1,
          consequence: '经验 +5 · 听听船长的计划',
          goto: 'cathay_deck',
          effects: function (s) { addXp(s, 5); }
        }
      ];
    }
  };

  scenes.cathay_deck = {
    act: 0, title: '玉龙号 · 甲板',
    text: function (state) {
      var leads = ['cathayCrew', 'cathayHold', 'cathayDock'].filter(function (f) { return flag(state, f); }).length;
      var t = [
        '岑海把空玉匣放在桌上：“锁没被撬。偷星盘的人就在船上。”',
        '青蘅靠在船舷边擦鹤铳：“昨夜有人看见货舱的灯亮过。码头那边也有动静。”',
        '你有一条船、一队惊魂未定的船员，和一座不欢迎你的城市。'
      ];
      if (leads) t.push('你已经查过 ' + leads + ' 处。');
      if (leads >= 2) t.push('线索开始重合。玉莲商馆的人应该知道买家是谁。');
      return t;
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'cathayCrew')) {
        c.push({ label: '审问船员', hint: '威吓 / 侦查', consequence: '可能找到叛徒 · 可能动手', goto: 'cathay_crew', time: 2 });
      }
      if (!flag(state, 'cathayHold')) {
        c.push({ label: '检查货舱', hint: '运动 / 侦查', consequence: '可能找到星盘线索 · 可能遭遇伏击', goto: 'cathay_hold', time: 2 });
      }
      if (!flag(state, 'cathayDock')) {
        c.push({ label: '去码头打听', hint: '交际 / 隐匿', consequence: '可能找到买家 · 可能被盯上', goto: 'cathay_dock', time: 2 });
      }
      var leads = ['cathayCrew', 'cathayHold', 'cathayDock'].filter(function (f) { return flag(state, f); }).length;
      if (leads >= 2) {
        c.push({ label: '去玉莲商馆', hint: '收网', consequence: '推进序章 · 进入商馆对峙', goto: 'cathay_house', time: 2 });
      } else {
        c.push({ label: '去玉莲商馆', hint: '至少需要 2 条线索', disabled: true });
      }
      return c;
    }
  };

  scenes.cathay_crew = {
    act: 0, title: '玉龙号 · 船员舱',
    text: function () {
      return [
        '船员们挤在低矮的舱室里。青蘅提着鹤铳站在门边，枪口没有对准任何人，但也没放下。',
        '独眼骆坐在最里面，右手缠着新布。布下露出一小截焦黑的皮肤。',
        '“昨晚你在哪？”青蘅问。他没有回答。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'cathayCrew')) {
        c.push({
          label: '当面审问独眼骆', hint: '威吓 · 标准',
          check: {
            skill: 'intimidate', difficulty: 0, title: '审问',
            success: {
              text: ['你没有拔刀，只是把玉匣放在他面前。', '“星盘在哪？”', '他咽了口唾沫：“盐仓七号……余烬的人说，只借一晚。”'],
              goto: 'cathay_deck',
              effects: function (s) { setFlag(s, 'cathayCrew'); addClue(s, 'traitor'); R.addAffinity(s, 'qingheng', 5); addXp(s, 20); }
            },
            failure: {
              text: ['独眼骆突然掀翻桌子，从靴筒里抽出一把短刀。', '“你不该问的。”'],
              goto: 'cathay_crew_fight',
              effects: function (s) { setFlag(s, 'cathayCrew'); }
            }
          }
        });
        c.push({
          label: '让青蘅搜他的身', hint: '侦查 · 标准',
          check: {
            skill: 'perception', difficulty: 0, title: '搜身',
            success: {
              text: ['青蘅用枪管挑开他的袖口。焦痕从手腕一直延伸到肘部，形状像一只闭合的眼。', '“余烬的烙印。”她说。', '独眼骆瘫坐下去，把知道的全说了。'],
              goto: 'cathay_deck',
              effects: function (s) { setFlag(s, 'cathayCrew'); addClue(s, 'traitor'); R.addAffinity(s, 'qingheng', 5); addXp(s, 20); }
            },
            failure: {
              text: ['独眼骆猛地撞开青蘅，朝舱门冲去。', '青蘅骂了一声，抬枪。'],
              goto: 'cathay_crew_fight',
              effects: function (s) { setFlag(s, 'cathayCrew'); }
            }
          }
        });
        c.push({
          label: '直接拿下他', hint: '战斗', time: 2,
          combat: {
            groups: [{ key: 'cultist', count: 1 }, { key: 'thug', count: 1 }],
            intro: '独眼骆吹了声口哨，舱门外冲进来一个拿短棍的打手。',
            win: 'cathay_crew_win', lose: 'cathay_death', flee: 'cathay_deck'
          }
        });
      }
      c.push({ label: '回甲板', goto: 'cathay_deck', time: 1 });
      return c;
    }
  };

  scenes.cathay_crew_fight = {
    act: 0, title: '船员舱',
    text: function () {
      return ['独眼骆的短刀在昏暗里反光。青蘅把鹤铳架在舱门上。', '“别打穿船底。”她说。'];
    },
    choices: function () {
      return [{
        label: '迎战', time: 2,
        combat: {
          groups: [{ key: 'cultist', count: 1 }, { key: 'thug', count: 1 }],
          intro: '独眼骆扑了上来。',
          win: 'cathay_crew_win', lose: 'cathay_death', flee: 'cathay_deck'
        }
      }];
    }
  };

  scenes.cathay_crew_win = {
    act: 0, title: '船员舱',
    text: function () {
      return ['独眼骆倒在货箱之间，短刀脱手。青蘅踩住他的手腕，从他怀里摸出一枚烙着余烬的银币。', '“他招了。”她说，“盐仓七号。星盘今晚会被送进城。”'];
    },
    choices: function () {
      return [{
        label: '记下这条线索', goto: 'cathay_deck',
        effects: function (s) { setFlag(s, 'cathayCrew'); addClue(s, 'traitor'); s.gold += 8; addXp(s, 25); }
      }];
    }
  };

  scenes.cathay_hold = {
    act: 0, title: '玉龙号 · 货舱',
    text: function () {
      return [
        '货舱里堆着茶叶、丝绸和瓷器。最里面有一只不该出现在船上的黑木箱，箱盖上刻着七道同心圆。',
        '箱缝里渗出一种甜腻的焦味。青蘅在你身后压低声音：“要开吗？”'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'cathayHold')) {
        c.push({
          label: '撬开黑木箱', hint: '运动 · 标准',
          check: {
            skill: 'athletics', difficulty: 0, title: '黑木箱',
            success: {
              text: ['箱盖裂开，里面是一堆烧焦的文书和一只玉制指针。', '指针没有指南——它直直指向城北。', '阴影里有人动了一下。'],
              goto: 'cathay_hold_fight',
              effects: function (s) { addClue(s, 'compass'); addXp(s, 15); }
            },
            failure: {
              text: ['箱盖比你想象的沉。你用力过猛，箱子砸在地上，惊动了藏在货堆后的人。'],
              goto: 'cathay_hold_fight',
              effects: function (s) { s.wounds = Math.max(1, s.wounds - 2); }
            }
          }
        });
        c.push({
          label: '先搜其他货箱', hint: '侦查 · 标准',
          check: {
            skill: 'perception', difficulty: 0, title: '货堆',
            success: {
              text: ['你在茶叶箱底找到一本被撕掉几页的账册。买家一栏写着“玉莲商馆”，旁边画着焦黑的掌印。', '黑木箱还在原处。你没有惊动它。'],
              goto: 'cathay_deck',
              effects: function (s) { setFlag(s, 'cathayHold'); addClue(s, 'ledger'); s.gold += 6; addXp(s, 20); }
            },
            failure: {
              text: ['你搬动货箱时碰倒了瓷瓶。碎片声在货舱里炸开。', '黑木箱后传来一声低吼。'],
              goto: 'cathay_hold_fight',
              effects: function (s) { setFlag(s, 'cathayHold'); }
            }
          }
        });
        c.push({
          label: '直接劈开箱子', hint: '战斗', time: 2,
          combat: {
            groups: [{ key: 'cultist', count: 2 }],
            intro: '刀锋落下的一瞬，货堆后站起两个灰袍人。',
            win: 'cathay_hold_win', lose: 'cathay_death', flee: 'cathay_deck'
          }
        });
      }
      c.push({ label: '回甲板', goto: 'cathay_deck', time: 1 });
      return c;
    }
  };

  scenes.cathay_hold_fight = {
    act: 0, title: '货舱',
    text: function () {
      return ['两个灰袍人从货堆后走出来，手里提着刀。', '青蘅把鹤铳架上肩：“低头。”'];
    },
    choices: function () {
      return [{
        label: '迎战', time: 2,
        combat: {
          groups: [{ key: 'cultist', count: 2 }],
          intro: '灰袍人踢翻了货箱。',
          win: 'cathay_hold_win', lose: 'cathay_death', flee: 'cathay_deck'
        }
      }];
    }
  };

  scenes.cathay_hold_win = {
    act: 0, title: '货舱',
    text: function () {
      return ['灰袍人倒在碎瓷片里。你从黑木箱的夹层中取出那只玉制指针。', '它在你掌心微微发烫，固执地指向城北。'];
    },
    choices: function () {
      return [{
        label: '收好指针', goto: 'cathay_deck',
        effects: function (s) { setFlag(s, 'cathayHold'); addClue(s, 'compass'); s.gold += 10; addXp(s, 25); }
      }];
    }
  };

  scenes.cathay_dock = {
    act: 0, title: '灰港码头',
    text: function () {
      return [
        '三号码头，雨把鱼鳞和煤渣冲进河里。一个独眼工头坐在缆桩上抽烟，身后是一排上了锁的盐仓。',
        '“盐仓七号？”他吐了口烟，“那地方今晚不卸货。给多少钱都不卸。”'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'cathayDock')) {
        c.push({
          label: '花 5 枚银币买消息', hint: '花费 5 银币', time: 1,
          show: function (s) { return s.gold >= 5; },
          consequence: '花费 5 银币 · 获得买家线索',
          effects: function (s) {
            s.gold -= 5;
            setFlag(s, 'cathayDock');
            addClue(s, 'buyer');
            return '工头掂了掂银币：“余烬的人今晚在盐仓七号交货。买家穿的是市长的颜色。”';
          },
          goto: 'cathay_deck'
        });
        c.push({
          label: '威吓工头', hint: '威吓 · 标准',
          check: {
            skill: 'intimidate', difficulty: 0, title: '工头',
            success: {
              text: ['你把手按在刀柄上，往前一步。工头的烟掉进水里。', '“盐仓七号……余烬的人，买家是市长的人。别说是老子说的。”'],
              goto: 'cathay_deck',
              effects: function (s) { setFlag(s, 'cathayDock'); addClue(s, 'buyer'); addXp(s, 20); }
            },
            failure: {
              text: ['工头吹了声口哨，盐仓后转出两个拿撬棍的搬运工。'],
              goto: 'cathay_dock_fight',
              effects: function (s) { setFlag(s, 'cathayDock'); }
            }
          }
        });
        c.push({
          label: '跟踪搬货的人', hint: '隐匿 · 困难',
          check: {
            skill: 'stealth', difficulty: -10, title: '尾随',
            success: {
              text: ['你跟着两个搬运工绕过盐仓，看见他们把一只小箱子推进七号仓。', '箱子上刻着七道同心圆。'],
              goto: 'cathay_deck',
              effects: function (s) { setFlag(s, 'cathayDock'); addClue(s, 'buyer'); addXp(s, 20); }
            },
            failure: {
              text: ['你在拐角踩到一滩鱼内脏。搬运工回头，扔下箱子，抽出了撬棍。'],
              goto: 'cathay_dock_fight',
              effects: function (s) { setFlag(s, 'cathayDock'); }
            }
          }
        });
      }
      c.push({ label: '回船上', goto: 'cathay_deck', time: 1 });
      return c;
    }
  };

  scenes.cathay_dock_fight = {
    act: 0, title: '盐仓后巷',
    text: function () {
      return ['两个搬运工堵住巷口，撬棍在雨里泛着冷光。', '青蘅从你身后闪出，鹤铳已经上膛。'];
    },
    choices: function () {
      return [{
        label: '迎战', time: 2,
        combat: {
          groups: [{ key: 'thug', count: 2 }],
          intro: '搬运工扑了上来。',
          win: 'cathay_dock_win', lose: 'cathay_death', flee: 'cathay_deck'
        }
      }];
    }
  };

  scenes.cathay_dock_win = {
    act: 0, title: '盐仓后巷',
    text: function () {
      return ['两个搬运工躺在水里。撬棍滚到墙边。', '其中一人的腰带上挂着一枚玉莲商馆的铜牌。'];
    },
    choices: function () {
      return [{
        label: '收好铜牌', goto: 'cathay_deck',
        effects: function (s) { setFlag(s, 'cathayDock'); addClue(s, 'buyer'); s.gold += 6; addXp(s, 25); }
      }];
    }
  };

  scenes.cathay_house = {
    act: 0, title: '玉莲商馆',
    onEnter: function (s) { s.flags.cathayHouse = true; },
    text: function () {
      return [
        '玉莲商馆在灰港的旧城区，门面是一间卖丝绸的铺子。后院却烧着上好的沉香。',
        '主事沈夫人给你倒茶，手腕上戴着一串玉珠：“震旦来的？你们的人昨晚在码头闹得很大。”',
        '“星盘不在我手里。”她说，“但我知道谁想买它。”'
      ];
    },
    choices: function (state) {
      var c = [];
      c.push({
        label: '以使节身份交涉', hint: '说服 · 标准',
        check: {
          skill: 'persuade', difficulty: 0, title: '沈夫人',
          success: {
            text: ['你把玉匣放在茶案上。沈夫人看了一眼，叹了口气。', '“余烬的人在盐仓七号交货。买家穿着市长的颜色。”', '她推过来一袋银币：“拿去吧。别把商馆牵扯进来。”'],
            goto: 'cathay_ambush',
            effects: function (s) { addClue(s, 'buyer'); s.gold += 15; addXp(s, 25); }
          },
          failure: {
            text: ['沈夫人笑了笑，把茶盖合上。', '“使节？”她说，“在灰港，使节和乞丐一样，都要看人脸色。”'],
            goto: 'cathay_ambush',
            effects: function (s) { s.wounds = Math.max(1, s.wounds - 2); }
          }
        }
      });
      c.push({
        label: '出示星盘残片', hint: '学识 · 困难',
        check: {
          skill: 'lore', difficulty: -10, title: '星盘',
          success: {
            text: ['你把玉制指针放在茶案上。沈夫人的手停住了。', '“这是龙帝的东西。”她压低声音，“盐仓七号。买家是市长的人。快走，别让他们看见你从后门出去。”'],
            goto: 'cathay_ambush',
            effects: function (s) { addClue(s, 'compass'); addClue(s, 'buyer'); addXp(s, 30); }
          },
          failure: {
            text: ['沈夫人看着指针，眼神变了，但她摇头。', '“我看不懂。”她说。你听见后院有人关门。'],
            goto: 'cathay_ambush',
            effects: function (s) { }
          }
        }
      });
      c.push({
        label: '直接逼问', hint: '威吓 · 困难',
        check: {
          skill: 'intimidate', difficulty: -10, title: '逼问',
          success: {
            text: ['你掀翻茶案。沈夫人后退一步，玉珠撞在墙上。', '“盐仓七号！”她尖声说，“买家是市长的人！你满意了？”'],
            goto: 'cathay_ambush',
            effects: function (s) { addClue(s, 'buyer'); addXp(s, 20); }
          },
          failure: {
            text: ['沈夫人拍了拍手。后院的门开了，独眼骆带着两个人走进来。', '“我正愁找不到你。”他说。'],
            goto: 'cathay_ambush',
            effects: function (s) { s.wounds = Math.max(1, s.wounds - 3); }
          }
        }
      });
      c.push({ label: '先回船上', goto: 'cathay_deck', time: 1 });
      return c;
    }
  };

  scenes.cathay_ambush = {
    act: 0, title: '玉莲商馆 · 后巷',
    text: function () {
      return [
        '你从商馆后门出来，雨已经停了。巷口站着独眼骆和两个灰袍人。',
        '“星盘我卖了。”独眼骆说，“但买家说，活口更值钱。”',
        '青蘅把鹤铳抵上肩：“这次别打穿墙。”'
      ];
    },
    choices: function () {
      return [{
        label: '迎战', time: 2,
        combat: {
          groups: [{ key: 'cultist', count: 2 }, { key: 'thug', count: 1 }],
          intro: '独眼骆拔刀，灰袍人堵住巷口。',
          win: 'cathay_after', lose: 'cathay_death', flee: 'cathay_deck'
        }
      }];
    }
  };

  function finishCathay(s) {
    s.flags.compassIntact = hasClue(s, 'compass');
    setFlag(s, 'cathayChapterDone');
    addClue(s, 'compass');
    s.gold += 20;
    addXp(s, 40);
    s.tempAlly = null;
  }

  scenes.cathay_after = {
    act: 0, title: '灰港 · 码头',
    onEnter: function (s) { R.addAffinity(s, 'qingheng', 15); },
    text: function () {
      return [
        '独眼骆倒在雨后的石板上。你从他怀里摸出那只玉制指针。',
        '指针在你掌心转了一圈，最后指向城北——旧礼拜堂的方向。',
        '岑海把一袋银币塞给你：“船会留在港口。你要进城，就一个人去。”',
        '青蘅把鹤铳背回肩上，站在跳板边等你开口。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (R.canRecruit(state, 'qingheng')) {
        c.push({
          label: '请青蘅一起进城', hint: '招募同伴', consequence: '青蘅加入队伍 · 队伍 +1', goto: 'gate',
          effects: function (s) { R.recruitNPC(s, 'qingheng'); finishCathay(s); }
        });
      }
      c.push({
        label: R.canRecruit(state, 'qingheng') ? '让她留在船上' : '进城',
        hint: '进入第一章', goto: 'gate',
        effects: function (s) { finishCathay(s); }
      });
      return c;
    }
  };

  scenes.cathay_death = {
    act: 0, title: '结局 · 异乡的雨', ending: true,
    text: function (state) {
      return [
        '你倒在灰港的码头上。雨又下起来了。',
        '玉龙号在远处鸣了一声汽笛，像某种迟到很久的告别。',
        '星盘还在某个盐仓里，等着下一双手把它送进城里。',
        ''
      ].concat(summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.gate = {
    act: 1, title: '灰港城门',
    onEnter: function (s) { s.tempAlly = null; },
    text: function (state) {
      return [
        '守卫用矛杆横在你胸前。他缺了两颗牙，眼神却不算愚蠢。',
        '“姓名，来意。最近城里不太平，晚上别出门。”',
        '他背后的告示栏上，贴着市长的悬赏：提供“纵火犯”线索者，赏十枚银币。'
      ];
    },
    choices: function (state) {
      return [
        {
          label: '递上一份伪造的通行证', hint: '欺诈 · 标准',
          check: {
            skill: 'deceive', difficulty: 0, title: '伪造的通行证',
            success: { text: ['守卫眯起眼，把通行证对着火光看了很久，最终挥了挥手。', '“进去吧。别惹事。”'], goto: 'act1_hub', effects: function (s) { setFlag(s, 'gatePass'); addXp(s, 10); } },
            failure: { text: ['“这印是去年的。”守卫把通行证揉成一团，塞进你领口。', '你被罚了 3 枚银币的“入城税”，还挨了一记矛杆。'], goto: 'act1_hub', effects: function (s) { s.gold = Math.max(0, s.gold - 3); s.wounds = Math.max(1, s.wounds - 1); } }
          }
        },
        {
          label: '混进难民的队伍', hint: '隐匿 · 标准',
          check: {
            skill: 'stealth', difficulty: 0, title: '混入人群',
            success: { text: ['你低下头，跟着一队抱孩子的难民挤过侧门。', '守卫正忙着盘问一个独眼老人，没空看你。'], goto: 'act1_hub', effects: function (s) { addXp(s, 10); } },
            failure: { text: ['“站住！”守卫一把揪住你的后领。', '你被拖到墙边搜身，最后以“形迹可疑”罚了 2 枚银币。'], goto: 'act1_hub', effects: function (s) { s.gold = Math.max(0, s.gold - 2); } }
          }
        },
        {
          label: '往他手里塞 5 枚银币', hint: '花费 5 银币 · 必定通过',
          show: function (s) { return s.gold >= 5; },
          effects: function (s) { s.gold -= 5; setFlag(s, 'gatePass'); },
          goto: 'gate_bribe'
        },
        {
          label: '直视他的眼睛', hint: '威吓 · 困难',
          check: {
            skill: 'intimidate', difficulty: -10, title: '守门人',
            success: { text: ['你没有说话，只是往前走了半步。', '守卫的矛杆垂了下去。他侧过身，让你过去。'], goto: 'act1_hub', effects: function (s) { setFlag(s, 'gateFear'); addXp(s, 15); } },
            failure: { text: ['守卫嗤笑一声，用矛杆把你拨到一边。', '“排队去。下一个！”'], goto: 'act1_hub', effects: function (s) { s.flags.gateShoved = true; } }
          }
        },
        {
          label: '亮出身份，让他放行', hint: '士绅以上', show: function (s) { return s.status >= 4; },
          consequence: '无需检定 · 直接进城 · 身份专属', goto: 'act1_hub',
          effects: function (s) { addXp(s, 10); }
        }
      ];
    }
  };

  scenes.gate_bribe = {
    act: 1, title: '城门',
    text: function () {
      return ['银币落进守卫掌心，消失得比雨滴还快。', '“欢迎来到灰港，朋友。晚上听见钟响，别开窗。”'];
    },
    choices: function () {
      return [{ label: '进城', goto: 'act1_hub' }];
    }
  };

  scenes.act1_hub = {
    act: 1, title: '灰港街头',
    text: function (state) {
      var t = [
        '雨小了些。灰港的主街沿着河岸弯过去，酒馆的招牌在风里吱呀作响。',
        '你手里关于王冠的线索还太少。城里至少有三个地方值得去：断桨酒馆、圣米迦勒神殿、以及三号码头。',
        '你只有三天。三天之内若找不到旧礼拜堂，余烬之手就会完成仪式。'
      ];
      if (state.clues.length >= 2) t.push('线索开始拼合。你知道，该往更深处走了。');
      t.push(raceLine(state, 'hub'));
      t.push(clueHint(state));
      return t;
    },
    choices: function (state) {
      var c = [];
      c.push({ label: '去断桨酒馆', hint: flag(state, 'tavern') ? '已去过' : '打听消息', disabled: flag(state, 'tavern'), goto: 'tavern' });
      c.push({ label: '去圣米迦勒神殿', hint: flag(state, 'temple') ? '已去过' : '寻求庇护', disabled: flag(state, 'temple'), goto: 'temple' });
      c.push({ label: '去三号码头', hint: flag(state, 'docks') ? '已去过' : '查那批货', disabled: flag(state, 'docks'), goto: 'docks' });
      c.push({ label: '逛集市', hint: '补给与装备', goto: 'market' });
      if ((state.flags.wanderCount || 0) < 4) {
        c.push({
          label: '在城中游荡', hint: '随机遭遇',
          effect: function (s) { return wander(s); }
        });
      }
      if (state.clues.length >= 2) {
        c.push({ label: '循线深入', hint: '进入第二章', goto: 'act2_intro' });
      } else if (['tavern', 'temple', 'docks'].filter(function (f) { return flag(state, f); }).length >= 3) {
        c.push({ label: '循线深入', hint: '线索不足，但你决定冒险', goto: 'act2_intro' });
      } else {
        c.push({ label: '循线深入', hint: '至少需要 2 条线索', disabled: true });
      }
      return c;
    }
  };

  scenes.tavern = {
    act: 1, title: '断桨酒馆',
    text: function (state) {
      var t = [
        '酒馆里弥漫着酸啤酒和湿羊毛的味道。梁上挂着熏鱼，炉火烧得半死不活。',
        '角落里有几个车夫在低声说话，每次提到“余烬”两个字，就有人往门口看。'
      ];
      if (!flag(state, 'tavern')) t.push('一个脸上带疤的佣兵正把靴子翘在桌上，打量着你腰间的武器。');
      return t;
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'tavern')) {
        c.push({
          label: '请车夫们喝一轮酒', hint: '花费 4 银币 · 八卦 · 标准',
          show: function (s) { return s.gold >= 4; },
          check: {
            skill: 'gossip', difficulty: 0, title: '酒桌上的消息',
            effects: function (s) { s.gold -= 4; setFlag(s, 'tavern'); },
            success: {
              text: ['酒过三巡，车夫的话多了起来。', '“余烬之手？他们专挑老修道院下手。圣布伦希尔达那座，三十年前就封了，最近半夜有光。”', '“领头的不是人。我是说，他走路没声。”'],
              goto: 'act1_hub',
              effects: function (s) { addClue(s, 'saint'); addXp(s, 15); }
            },
            failure: {
              text: ['你请了一轮酒，车夫们却只是道谢，然后闭嘴。', '钱花了，只换来一句：“外乡人，少打听。”'],
              goto: 'act1_hub',
              effects: function (s) { setFlag(s, 'tavern'); }
            }
          }
        });
        c.push({
          label: '听墙角', hint: '侦查 · 困难',
          check: {
            skill: 'perception', difficulty: -10, title: '墙角的低语',
            success: {
              text: ['你背对炉火，慢慢啜酒，耳朵却跟着角落那桌。', '“……三号码头，今晚子时。货单上写的是遗物，其实是一口棺材。”', '有人把一张纸折起来，塞进靴筒。'],
              goto: 'act1_hub',
              effects: function (s) { addClue(s, 'ledger'); addXp(s, 15); }
            },
            failure: {
              text: ['你听得太入神，忘了收敛视线。', '角落那桌忽然安静下来，几双眼睛一起看向你。他们起身走了。'],
              goto: 'act1_hub',
              effects: function (s) { setFlag(s, 'tavern'); setFlag(s, 'tavernWatched'); }
            }
          }
        });
        c.push({
          label: '接下佣兵的挑衅', hint: '战斗 · 码头暴徒',
          goto: 'tavern_fight'
        });
      }
      c.push({ label: '离开酒馆', goto: 'act1_hub' });
      return c;
    }
  };

  scenes.tavern_fight = {
    act: 1, title: '酒馆斗殴',
    text: function () {
      return [
        '“看什么看？”佣兵把靴子从桌上放下来，抓起短棍。',
        '“灰港的规矩：盯着别人看，就得付点东西。”',
        '酒客们往后退，腾出一块空地。'
      ];
    },
    choices: function () {
      return [{
        label: '拔出武器', hint: '战斗',
        combat: {
          groups: [{ key: 'thug', count: 1 }],
          intro: '佣兵啐了一口，短棍在手里转了个圈。',
          win: 'tavern_win', lose: 'ending_death', flee: 'act1_hub'
        }
      }, { label: '认怂，请他喝一杯', hint: '花费 3 银币', show: function (s) { return s.gold >= 3; }, effects: function (s) { s.gold -= 3; setFlag(s, 'tavern'); }, goto: 'act1_hub' }];
    }
  };

  scenes.tavern_win = {
    act: 1, title: '断桨酒馆',
    text: function (state) {
      return [
        '佣兵倒在翻倒的桌子中间，短棍滚到炉火边。',
        '酒馆老板叹着气记下赔偿，又给你倒了杯酒：“打得好。那家伙欠了三个月酒钱。”',
        '“余烬的人最近在码头收货。三号库房，夜里去。”'
      ];
    },
    choices: function () {
      return [{
        label: '记下这条线索', goto: 'act1_hub',
        effects: function (s) { setFlag(s, 'tavern'); addClue(s, 'ledger'); addXp(s, 20); }
      }];
    }
  };

  scenes.temple = {
    act: 1, title: '圣米迦勒神殿',
    text: function (state) {
      var t = [
        '神殿的屋顶漏了一角，雨水落在石板地上，声音很轻。',
        '一位修女正在给一排陶罐换水。她叫阿格尼丝，头发已经全白了。'
      ];
      if (!flag(state, 'temple')) t.push('“孩子，你身上有铁锈和血腥味。”她没有抬头，“来祈祷，还是来问路？”');
      else t.push('阿格尼丝朝你点点头：“又见面了。灰港的雨还没停。”');
      return t;
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'temple')) {
        c.push({
          label: '捐出 5 枚银币', hint: '花费 5 银币 · 获得祝福',
          show: function (s) { return s.gold >= 5; },
          effects: function (s) {
            s.gold -= 5; setFlag(s, 'temple');
            s.fortune = Math.min(s.maxFate, s.fortune + 1);
            return '阿格尼丝为你念了一段简短的祷文。你觉得肩上轻了一些。（命运点 +1）';
          },
          goto: 'temple'
        });
        c.push({
          label: '询问圣布伦希尔达', hint: '学识 · 标准',
          check: {
            skill: 'lore', difficulty: 0, title: '被封圣的修女',
            success: {
              text: ['“圣布伦希尔达。”阿格尼丝放下水罐，“三百年前，她把自己和王冠一起封进地底。”', '“教会对外说王冠已毁。孩子，谎话有时候是为了让人睡得着。”', '她告诉你，修道院在城北沼泽边，入口在旧礼拜堂的祭坛下。'],
              goto: 'act1_hub',
              effects: function (s) { addClue(s, 'saint'); addClue(s, 'crown'); addXp(s, 20); }
            },
            failure: {
              text: ['阿格尼丝看了你很久，最后摇头。', '“有些名字不该由我来说。去问石头吧。”'],
              goto: 'act1_hub',
              effects: function (s) { setFlag(s, 'temple'); }
            }
          }
        });
        c.push({
          label: '请她处理伤口', hint: '恢复伤口',
          effects: function (s) {
            var heal = Math.floor(s.maxWounds * 0.35);
            s.wounds = Math.min(s.maxWounds, s.wounds + heal);
            setFlag(s, 'temple');
            return '阿格尼丝用草药和干净的布替你处理了伤口，恢复 ' + heal + ' 点伤口。';
          },
          goto: 'temple'
        });
      } else {
        c.push({
          label: '向她告别', goto: 'act1_hub'
        });
      }
      c.push({ label: '回到街上', goto: 'act1_hub' });
      return c;
    }
  };

  scenes.docks = {
    act: 1, title: '三号码头',
    text: function (state) {
      return [
        '三号码头堆着发霉的货箱。一艘没有旗的货船停在最外侧，跳板上有新鲜的泥。',
        '一个搬运工靠在缆桩上打盹。更远处的浮木间，有什么东西随着水起伏。',
        '货箱侧面烙着一只焦黑的掌印。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'docks')) {
        c.push({
          label: '查看水里的东西', hint: '侦查 · 标准',
          check: {
            skill: 'perception', difficulty: 0, title: '浮木之间',
            success: {
              text: ['那是一具尸体。喉咙被割开，怀里抱着一只油布包。', '包里是货单和半块烧焦的骨片。货单上写着“圣布伦希尔达的遗物”。', '你抬头时，搬运工已经不见了。'],
              goto: 'act1_hub',
              effects: function (s) { addClue(s, 'ledger'); s.gold += 6; addXp(s, 15); setFlag(s, 'docks'); }
            },
            failure: {
              text: ['你踩上浮木，脚下一滑，半个身子浸进冰水。', '等你爬回岸上，那东西已经漂远了。搬运工也不见了。'],
              goto: 'act1_hub',
              effects: function (s) { s.wounds = Math.max(1, s.wounds - 2); setFlag(s, 'docks'); }
            }
          }
        });
        c.push({
          label: '跟踪搬运工', hint: '隐匿 · 困难',
          check: {
            skill: 'stealth', difficulty: -10, title: '尾随',
            success: {
              text: ['搬运工穿过仓库区，在一扇铁门前停下，敲了三下。', '门开了一条缝，里面透出火光和低沉的诵念声。门关上后，你在墙上画了个记号。'],
              goto: 'act1_hub',
              effects: function (s) { addClue(s, 'ashes'); setFlag(s, 'docks'); setFlag(s, 'foundCellar'); addXp(s, 20); }
            },
            failure: {
              text: ['你刚转过第二个拐角，搬运工就回过头来。', '“老鼠。”他说。然后从货箱后走出两个人。'],
              goto: 'docks_fight',
              effects: function (s) { setFlag(s, 'docks'); }
            }
          }
        });
        c.push({
          label: '花钱买通搬运工', hint: '花费 4 银币',
          show: function (s) { return s.gold >= 4; },
          effects: function (s) {
            s.gold -= 4; setFlag(s, 'docks'); addClue(s, 'ledger');
            return '搬运工掂了掂银币，压低声音：“货是给余烬之手的。今晚还有一船，别多问。”';
          },
          goto: 'act1_hub'
        });
      }
      c.push({ label: '离开码头', goto: 'act1_hub' });
      return c;
    }
  };

  scenes.docks_fight = {
    act: 1, title: '仓库阴影',
    text: function () {
      return ['两个打手从货箱后绕出来，手里提着短棍。', '搬运工退到一边，脸上没什么表情。'];
    },
    choices: function () {
      return [{
        label: '迎战', combat: {
          groups: [{ key: 'thug', count: 2 }],
          distance: 'far',
          intro: '打手一左一右围上来。',
          win: 'docks_win', lose: 'ending_death', flee: 'act1_hub'
        }
      }];
    }
  };

  scenes.docks_win = {
    act: 1, title: '三号码头',
    text: function () {
      return ['打手倒在湿木板上。搬运工已经跑了，铁门却还虚掩着。', '门后是一条向下的窄梯，火光从深处透上来。', '梯子尽头传来诵念声，以及某种金属摩擦的声音。'];
    },
    choices: function () {
      return [{
        label: '记住位置，先不惊动他们', goto: 'act1_hub',
        effects: function (s) { addClue(s, 'ashes'); setFlag(s, 'foundCellar'); addXp(s, 20); }
      }, {
        label: '现在就走下去', goto: 'act2_intro',
        effects: function (s) { addClue(s, 'ashes'); setFlag(s, 'foundCellar'); addXp(s, 25); }
      }];
    }
  };

  scenes.market = {
    act: 1, title: '灰港集市',
    text: function (state) {
      return [
        '集市挤在两条街之间，卖鱼、卖旧铁、卖来路不明的圣物。',
        '一个裹着头巾的占卜师坐在角落里，面前摊着一副骨牌。她抬头看你，笑了笑。',
        '“你身上有灰的味道。”'
      ];
    },
    choices: function (state) {
      var c = [];
      var stock = [
        { id: 'potion', price: 14 }, { id: 'bandage', price: 3 }, { id: 'holy_water', price: 12 },
        { id: 'torch', price: 2 }, { id: 'rope', price: 4 }
      ];
      if (state.weapons.indexOf('sword') < 0) stock.push({ id: 'sword', price: 20, weapon: true });
      if (state.weapons.indexOf('crossbow') < 0) stock.push({ id: 'crossbow', price: 35, weapon: true });
      if (state.weapons.indexOf('axe') < 0) stock.push({ id: 'axe', price: 22, weapon: true });
      stock.forEach(function (it) {
        var name = it.weapon ? G.data.WEAPONS[it.id].name : G.data.ITEMS[it.id].name;
        var price = Math.max(1, Math.round(it.price * priceFactor(state)));
        c.push({
          label: '购买 ' + name + '（' + price + ' 银币）',
          hint: it.weapon ? '武器' : G.data.ITEMS[it.id].desc,
          consequence: '花费 ' + price + ' 银币 · 获得' + name,
          show: function (s) { return s.gold >= price; },
          effects: function (s) {
            s.gold -= price;
            if (it.weapon) { s.weapons.push(it.id); return '你买下了' + name + '。'; }
            R.addItem(s, it.id, 1);
            return '你买下了' + name + '。';
          },
          stay: true
        });
      });
      c.push({
        label: '请占卜师看一卦', hint: '花费 2 银币',
        show: function (s) { return s.gold >= 2 && !flag(s, 'fortune'); },
        effects: function (s) {
          s.gold -= 2; setFlag(s, 'fortune');
          s.fortune = Math.min(s.maxFate, s.fortune + 1);
          return '占卜师翻开骨牌，沉默了一会儿。“王冠会给你想要的东西，然后拿走你没想到的东西。”她收走银币，“这句忠告值两条命。”（命运点 +1）';
        },
        stay: true
      });
      c.push({ label: '离开集市', goto: 'act1_hub' });
      return c;
    }
  };

  /* ---------------------------- 第二章 ---------------------------- */
  scenes.act2_intro = {
    onEnter: function (s) {
      if (s.flags.temple && !s.flags.templeGift) {
        s.flags.templeGift = true;
        R.addItem(s, 'holy_water', 1);
        R.addItem(s, 'potion', 1);
        s.log.push('阿格尼丝托人捎来一个小包：一瓶药水，一瓶圣水。');
      }
    },
    act: 2, title: '灰港的阴影',
    text: function (state) {
      state.act = 2;
      return [
        '线索指向四个地方。你只有一条命，而余烬之手不会等你。',
        '城北的墓园、旧城的下水道、圣米迦勒的档案室，以及市长宅邸。',
        state.clues.length >= 4 ? '你掌握的东西已经够拼出仪式的轮廓了。该去旧礼拜堂了。' : '至少还需要更多线索，才能确定仪式的确切位置。'
      ];
    },
    choices: function (state) {
      var c = [
        { label: '城北墓园', hint: flag(state, 'graveyard') ? '已调查' : '骨灰与土', goto: 'graveyard' },
        { label: '旧城下水道', hint: flag(state, 'sewers') ? '已调查' : '追踪信徒', goto: 'sewers' },
        { label: '神殿档案室', hint: flag(state, 'archive') ? '已调查' : '查阅古卷', goto: 'archive' },
        { label: '市长宅邸', hint: flag(state, 'manor') ? '已调查' : '拜访体面人', goto: 'manor' }
      ];
      if ((state.flags.wanderCount || 0) < 4) {
        c.push({ label: '在城中游荡', hint: '随机遭遇', effect: function (s) { return wander(s); } });
      }
      var allVisited = ['graveyard', 'sewers', 'archive', 'manor'].every(function (f) { return flag(state, f); });
      if (!flag(state, 'rest2')) {
        c.push({
          label: '在神殿后院休整', hint: '恢复约三成伤口（一次）', consequence: '恢复伤口 · 清除疲劳', stay: true, time: 8,
          effects: function (s) {
            setFlag(s, 'rest2'); s.lastRest = s.clock; s.fatigue = 0;
            var heal = Math.max(3, Math.floor(s.maxWounds * 0.3));
            s.wounds = Math.min(s.maxWounds, s.wounds + heal);
            s.fortune = Math.min(s.maxFate, s.fortune + 1);
            s.conditions = [];
            return '你睡了一觉，吃了点热的东西，恢复 ' + heal + ' 点伤口。（命运点 +1）';
          }
        });
      }
      if (state.clues.length >= 4 || allVisited) {
        c.push({ label: '前往旧礼拜堂', hint: allVisited ? '不能再等了' : '进入终章', goto: 'act3_intro' });
      } else {
        c.push({ label: '前往旧礼拜堂', hint: '至少需要 4 条线索', disabled: true });
      }
      return c;
    }
  };

  scenes.graveyard = {
    act: 2, title: '城北墓园',
    text: function () {
      return [
        '墓园的围墙塌了一段。新翻的土散在各处，像有人急着把什么埋下去，又急着挖出来。',
        '一座小礼拜堂的废墟前，摆着七只倒扣的陶碗。碗底还是温的。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'graveyard')) {
        c.push({
          label: '挖开最新的一座坟', hint: '运动 · 标准',
          check: {
            skill: 'athletics', difficulty: 0, title: '不该挖开的土',
            success: {
              text: ['土下没有棺材，只有一只骨灰瓮。', '瓮里装的是混着金屑的炭，炭上刻着一顶没有脸的冠。', '你回头时，废墟的阴影里亮起两团眼睛。'],
              goto: 'graveyard_fight',
              effects: function (s) { addClue(s, 'urn'); setFlag(s, 'graveyard'); }
            },
            failure: {
              text: ['你一铲下去，土里露出半截手臂。', '不是尸体的——它还在动。'],
              goto: 'graveyard_fight',
              effects: function (s) { setFlag(s, 'graveyard'); s.wounds = Math.max(1, s.wounds - 1); }
            }
          }
        });
      } else {
        c.push({
          label: '再检查一次骨灰瓮', hint: '学识 · 困难',
          check: {
            skill: 'lore', difficulty: -10, title: '炭上的图样',
            success: { text: ['你核对图样，确认这是“七人祭”：七个活人的痛苦，足以唤醒王冠。'], goto: 'act2_intro', effects: function (s) { addClue(s, 'circle'); addXp(s, 15); } },
            failure: { text: ['炭上的纹路很快在风里碎了。'], goto: 'act2_intro', effects: function () { } }
          }
        });
      }
      c.push({ label: '离开墓园', goto: 'act2_intro' });
      return c;
    }
  };

  scenes.graveyard_fight = {
    act: 2, title: '墓园',
    text: function () {
      return ['一条三条腿的猎犬从墓碑后走出来，另一侧跟着一个灰袍人。', '猎犬有两张嘴，都在流涎。'];
    },
    choices: function () {
      return [{
        label: '迎战', combat: {
          groups: [{ key: 'hound', count: 1 }, { key: 'cultist', count: 1 }],
          intro: '灰袍人吹了声口哨。',
          win: 'graveyard_win', lose: 'ending_death', flee: 'act2_intro'
        }
      }];
    }
  };

  scenes.graveyard_win = {
    act: 2, title: '墓园',
    text: function () {
      return ['猎犬的尸身正在迅速腐烂，露出底下的骨头。灰袍人断气前抓住你的袖子。', '“七个……已经点了六个……”他笑了，“你是第七个。”'];
    },
    choices: function () {
      return [{
        label: '搜走他身上的东西', goto: 'act2_intro',
        effects: function (s) { addClue(s, 'urn'); addClue(s, 'circle'); s.gold += 8; addXp(s, 25); }
      }];
    }
  };

  scenes.sewers = {
    act: 2, title: '旧城下水道',
    text: function () {
      return [
        '下水道的砖壁上长着发光的苔。水不深，但气味让人想把肺吐出来。',
        '墙上有新鲜的刻痕：七道同心圆，圆心是一顶冠。',
        '远处有火光，还有人在唱。调子不对，像是倒着唱的。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'sewers')) {
        c.push({
          label: '循着火光摸过去', hint: '隐匿 · 标准',
          check: {
            skill: 'stealth', difficulty: 0, title: '下水道深处',
            success: {
              text: ['你贴着墙走，火光尽头是一间拱顶石室。', '七个灰袍人围着一只铁箱跪着，箱子里传出金属的低鸣。', '你在阴影里记下了路线，然后悄悄退了出去。'],
              goto: 'act2_intro',
              effects: function (s) { addClue(s, 'circle'); addClue(s, 'crown'); setFlag(s, 'sewers'); addXp(s, 25); }
            },
            failure: {
              text: ['你的靴子踢到一块松动的砖。', '诵念声停了。七双眼睛同时转过来。'],
              goto: 'sewers_fight',
              effects: function (s) { setFlag(s, 'sewers'); }
            }
          }
        });
        c.push({
          label: '直接杀进去', hint: '战斗',
          goto: 'sewers_fight'
        });
      }
      c.push({ label: '离开下水道', goto: 'act2_intro' });
      return c;
    }
  };

  scenes.sewers_fight = {
    act: 2, title: '拱顶石室',
    text: function () {
      return ['一个灰袍人挡在铁箱前，另一个已经念完了最后一段。', '铁箱的缝隙里渗出血一样的光，阴影里有什么东西在低吼。'];
    },
    choices: function () {
      return [{
        label: '迎战', combat: {
          groups: [{ key: 'cultist', count: 1 }, { key: 'hound', count: 1 }],
          intro: '灰袍人抽出锯齿匕首，阴影里响起低吼。',
          win: 'sewers_win', lose: 'ending_death', flee: 'act2_intro'
        }
      }];
    }
  };

  scenes.sewers_win = {
    act: 2, title: '拱顶石室',
    text: function () {
      return ['铁箱里只剩下一层灰。灰上留着王冠的压痕。', '墙上的七道圆环中，已经有六道被炭笔划掉。', '最后一道旁边写着：旧礼拜堂。'];
    },
    choices: function () {
      return [{
        label: '记下一切', goto: 'act2_intro',
        effects: function (s) { addClue(s, 'circle'); addClue(s, 'crown'); addXp(s, 30); s.gold += 5; }
      }];
    }
  };

  scenes.archive = {
    act: 2, title: '神殿档案室',
    text: function () {
      return [
        '档案室在神殿后殿的夹层里，霉味浓得能拧出水。',
        '阿格尼丝把钥匙交给你时，只说了一句：“别把书带出去。”',
        '最里层的柜子上着三道锁，柜门刻着圣布伦希尔达的记号。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'archive')) {
        c.push({
          label: '查阅被封存的古卷', hint: '学识 · 困难',
          check: {
            skill: 'lore', difficulty: -10, title: '被封印的记载',
            success: {
              text: ['古卷用古典语写成，字迹被水浸过。你读得很慢，但读懂了。', '王冠畏惧“自愿的牺牲”，也畏惧被彻底遗忘——如果没人记得它，它就只是一块金子。', '最后一页画着仪式场：旧礼拜堂，祭坛下。'],
              goto: 'act2_intro',
              effects: function (s) { addClue(s, 'crown'); addClue(s, 'weakness'); addClue(s, 'saint'); setFlag(s, 'archive'); setFlag(s, 'knowsWeakness'); addXp(s, 30); }
            },
            failure: {
              text: ['你翻到一半，书页上的字开始游动。', '你猛地合上书，发现自己流了鼻血。'],
              goto: 'act2_intro',
              effects: function (s) { setFlag(s, 'archive'); s.wounds = Math.max(1, s.wounds - 2); addXp(s, 10); }
            }
          }
        });
      } else {
        c.push({
          label: '再看一眼那页', hint: '花费时间',
          effects: function (s) { return '你确认了自己的记忆：王冠畏惧自愿的牺牲。'; },
          goto: 'act2_intro'
        });
      }
      c.push({ label: '离开档案室', goto: 'act2_intro' });
      return c;
    }
  };

  scenes.manor = {
    act: 2, title: '市长宅邸',
    text: function () {
      return [
        '市长宅邸是灰港唯一有玻璃窗的房子。门口站着两个佩剑的守卫，门廊下挂着一盏长明灯。',
        '你注意到窗帘缝里有人看你。',
        '后墙有一扇运煤的小门，锁是新的。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'manor')) {
        c.push({
          label: '从后门潜进去', hint: '隐匿 · 困难',
          check: {
            skill: 'stealth', difficulty: -10, title: '煤门',
            success: {
              text: ['你撬开煤门，穿过厨房，在书房的门外停下。', '市长正在和一个人说话。他卷起袖子倒酒时，小臂上露出焦黑的掌印。', '“明晚子时。”他说，“王冠需要一个自愿的容器。”'],
              goto: 'act2_intro',
              effects: function (s) { addClue(s, 'mayor'); addClue(s, 'circle'); setFlag(s, 'manor'); addXp(s, 30); }
            },
            failure: {
              text: ['锁比看上去难对付。你弄出了声响。', '“谁在那儿？”'],
              goto: 'manor_fight',
              effects: function (s) { setFlag(s, 'manor'); }
            }
          }
        });
        c.push({
          label: '正门求见', hint: '说服 · 困难 · 需要体面',
          check: {
            skill: 'persuade', difficulty: -10, title: '体面的访客',
            success: {
              text: ['你被引进书房。市长礼貌地听你说完，然后笑了。', '“外乡人，你知道得太多了。”他卷起袖子，露出焦痕，“不过，也许你能替我戴上它。”', '他起身离开时，你看见桌上摊着旧礼拜堂的地图。'],
              goto: 'act2_intro',
              effects: function (s) { addClue(s, 'mayor'); setFlag(s, 'manor'); setFlag(s, 'metMayor'); addXp(s, 25); }
            },
            failure: {
              text: ['守卫把你拦在台阶下。', '“市长不见客。”其中一人盯着你腰间的武器，“尤其是带刀的。”'],
              goto: 'act2_intro',
              effects: function () { }
            }
          }
        });
        c.push({
          label: '翻墙进去', hint: '攀爬 · 标准',
          check: {
            skill: 'climb', difficulty: 0, title: '后墙',
            success: {
              text: ['你踩着排水管爬上二楼阳台，从没关严的窗子翻进去。', '书房桌上摊着一张图：旧礼拜堂，祭坛，七道圆环。'],
              goto: 'act2_intro',
              effects: function (s) { addClue(s, 'circle'); addClue(s, 'mayor'); setFlag(s, 'manor'); addXp(s, 25); }
            },
            failure: {
              text: ['排水管在手里弯了。你摔进花圃，惊动了守卫。'],
              goto: 'manor_fight',
              effects: function (s) { setFlag(s, 'manor'); s.wounds = Math.max(1, s.wounds - 2); }
            }
          }
        });
      }
      c.push({ label: '离开宅邸', goto: 'act2_intro' });
      return c;
    }
  };

  scenes.manor_fight = {
    act: 2, title: '宅邸后巷',
    text: function () {
      return ['两个守卫拔剑堵住巷口。他们穿着市长的纹章，眼神却是余烬信徒的眼神。', '“抓住他。”其中一个说，“祭品要活的。”'];
    },
    choices: function () {
      return [{
        label: '应战', combat: {
          groups: [{ key: 'watchman', count: 2 }],
          intro: '守卫并肩逼近。',
          win: 'manor_win', lose: 'ending_death', flee: 'act2_intro'
        }
      }];
    }
  };

  scenes.manor_win = {
    act: 2, title: '宅邸后巷',
    text: function () {
      return ['守卫倒下时，巷子尽头的窗帘被拉上了。', '你在其中一人怀里找到一张折起的纸：明晚子时，旧礼拜堂，七人。', '纸角盖着市长的私印。'];
    },
    choices: function () {
      return [{
        label: '收好证据', goto: 'act2_intro',
        effects: function (s) { addClue(s, 'mayor'); addClue(s, 'circle'); s.gold += 10; addXp(s, 30); }
      }];
    }
  };

  /* ---------------------------- 第三章 ---------------------------- */
  scenes.act3_intro = {
    act: 3, title: '旧礼拜堂',
    onEnter: function (s) {
      s.flags.atChapel = true;
      if (s.flags.temple && !s.tempAlly) {
        s.tempAlly = 'agnes';
        s.log.push('阿格尼丝举着圣徽跟了上来。');
      }
    },
    text: function (state) {
      state.act = 3;
      var t = [
        '城北沼泽边缘，旧礼拜堂只剩半面墙和一座塌了顶的祭坛。',
        '雨停了。空气里有炭和铁的味道。祭坛下的石板被人搬开，露出一道向下的阶梯。',
        '阶梯深处，火光正在呼吸。'
      ];
      if (state.clues.indexOf('weakness') >= 0) t.push('你记得古卷上的话：王冠畏惧自愿的牺牲，也畏惧被遗忘。');
      return t;
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'rest3')) {
        c.push({
          label: '在废墟里喘口气', hint: '恢复约三成伤口（一次）', consequence: '恢复伤口 · 清除疲劳', stay: true, time: 8,
          effects: function (s) {
            setFlag(s, 'rest3'); s.lastRest = s.clock; s.fatigue = 0;
            var heal = Math.max(3, Math.floor(s.maxWounds * 0.3));
            s.wounds = Math.min(s.maxWounds, s.wounds + heal);
            s.fortune = Math.min(s.maxFate, s.fortune + 1);
            s.conditions = [];
            return '你在断墙后坐下，处理了伤口，恢复 ' + heal + ' 点伤口。（命运点 +1）';
          }
        });
      }
      c.push({
          label: '从侧面的排水渠潜入', hint: '隐匿 · 困难',
          check: {
            skill: 'stealth', difficulty: -10, title: '排水渠',
            success: { text: ['你从半塌的排水渠爬进去，绕过前厅，直接到了仪式厅的侧门。', '里面的人正背对着你。'], goto: 'act3_ritual', effects: function (s) { s.flags.bypass = true; addXp(s, 20); } },
            failure: { text: ['渠底积着及膝的污水，你走得不算安静。', '前厅的门开了。'], goto: 'act3_hall', effects: function (s) { s.wounds = Math.max(1, s.wounds - 3); } }
          }
        });
      c.push({ label: '从正门走进去', hint: '战斗 · 前厅', goto: 'act3_hall' });
      c.push({
          label: '等到换岗的间隙', hint: '意志 · 标准',
          check: {
            skill: 'intuition', difficulty: 0, title: '等待',
            success: { text: ['你在雨里蹲了两个钟头，等到守卫打哈欠的间隙。', '你贴着墙根溜进前厅，没惊动任何人。'], goto: 'act3_ritual', effects: function (s) { s.flags.bypass = true; } },
            failure: { text: ['你等得太久，腿麻了。起身时踢翻了一只铁桶。', '整座礼拜堂都听见了。'], goto: 'act3_hall', effects: function (s) { } }
          }
        });
      return c;
    }
  };

  scenes.act3_hall = {
    act: 3, title: '礼拜堂前厅',
    text: function () {
      return ['前厅的长椅上还留着烧焦的祷告书。两个灰袍人从柱子后闪出，一左一右堵住通往仪式厅的门。', '“第七个来了。”其中一个笑了，另一个开始低声诵念。'];
    },
    choices: function () {
      return [{
        label: '迎战', combat: {
          groups: [{ key: 'cultist', count: 2 }],
          distance: 'far',
          intro: '灰袍人散开，堵住通往仪式厅的门。',
          win: 'act3_ritual', lose: 'ending_death', flee: 'act3_intro'
        }
      }];
    }
  };

  scenes.act3_ritual = {
    act: 3, title: '仪式厅',
    text: function (state) {
      var t = [
        '地下的仪式厅比上面的教堂还大。七根石柱围成一圈，柱上绑着六个活人，嘴里塞着布。',
        '圈子中央，灰烬祭司举起一顶没有脸的金冠。它在他的手里低语，声音像很多人同时叹气。',
        '“第七位。”他转过身，灰袍下的脸被炭涂得看不清五官，“你是自己走下来的。很好，自愿的容器最合它胃口。”'
      ];
      if (state.flags.holySplash) t.push('圣水泼洒过的地方还在冒白烟。祭司的左臂垂着。');
      t.push(raceLine(state, 'ritual'));
      return t;
    },
    choices: function (state) {
      var c = [];
      c.push({
        label: '直接动手', hint: '战斗 · 灰烬祭司',
        combat: {
          groups: [{ key: 'priest', count: 1 }],
          intro: '祭司把王冠按在胸前，石柱上的火把同时熄灭又亮起。',
          win: 'act3_final', lose: 'ending_death', flee: 'act3_intro'
        }
      });
      if (state.items.holy_water) {
        c.push({
          label: '先泼出圣水', hint: '消耗 1 份圣水 · 削弱祭司',
          effects: function (s) {
            s.items.holy_water -= 1;
            if (s.items.holy_water <= 0) delete s.items.holy_water;
            s.flags.holySplash = true;
            return '圣水在祭司身上炸开白烟。他惨叫着后退，左臂的皮肉翻卷起来。';
          },
          combat: {
            groups: [{ key: 'priest', count: 1 }],
            intro: '祭司用烧焦的手抓起王冠，声音变了调。',
            prep: function (state, combat) { combat.enemies[0].wounds -= 8; combat.log.push('灰烬祭司被圣水灼伤，失去 8 点伤口。'); },
            win: 'act3_final', lose: 'ending_death', flee: 'act3_intro'
          }
        });
      }
      c.push({
        label: '喊出王冠的真名', hint: '学识 · 困难',
        check: {
          skill: 'lore', difficulty: -10, title: '真名',
          success: {
            text: ['你念出了古卷上的名字。不是通用语，音节刮过喉咙。', '王冠在祭司手里剧烈震颤，火光向内塌陷。祭司捂住耳朵，跪了下去。', '“不……还差一个……”'],
            goto: 'act3_ritual_weak',
            effects: function (s) { s.flags.trueName = true; addXp(s, 25); }
          },
          failure: {
            text: ['你念错了一个音节。', '王冠笑了——如果你能把那声音称作笑。祭司抬起头，眼睛里全是火。'],
            goto: 'act3_ritual_angry',
            effects: function (s) { }
          }
        }
      });
      return c;
    }
  };

  scenes.act3_ritual_weak = {
    act: 3, title: '仪式厅',
    text: function () {
      return ['祭司跪在石板上，王冠滚到一旁。六个被绑的人开始挣扎。', '但石柱上的火没有灭。仪式还在继续。', '你必须现在解决他。'];
    },
    choices: function () {
      return [{
        label: '趁他跪着，动手', combat: {
          groups: [{ key: 'priest', count: 1 }],
          intro: '祭司挣扎着站起来，脸上第一次露出恐惧。',
          prep: function (state, combat) { combat.enemies[0].wounds -= 10; combat.log.push('真名重创了灰烬祭司，他失去 10 点伤口。'); },
          win: 'act3_final', lose: 'ending_death', flee: 'act3_intro'
        }
      }];
    }
  };

  scenes.act3_ritual_angry = {
    act: 3, title: '仪式厅',
    text: function () {
      return ['火焰从祭司的袖口窜出来，顺着石柱爬上去。', '“你差点就成功了。”他朝你走来，“现在，我要亲手把你放上祭坛。”'];
    },
    choices: function () {
      return [{
        label: '迎战', combat: {
          groups: [{ key: 'priest', count: 1 }],
          intro: '祭司的杖头燃起紫火。',
          prep: function (state, combat) { state.wounds = Math.max(1, state.wounds - 3); combat.log.push('火焰灼伤了你，失去 3 点伤口。'); },
          win: 'act3_final', lose: 'ending_death', flee: 'act3_intro'
        }
      }];
    }
  };

  scenes.act3_final = {
    act: 3, title: '王冠',
    text: function (state) {
      return [
        '祭司倒下了。王冠落在灰里，没有脸的金面上映出你的影子。',
        '被绑的六个人还在挣扎。石柱上的火越来越低。',
        '王冠在说话。它说它可以给你想要的一切——权力、复仇、让死去的人回来。它说得很温柔。',
        '你只有一次选择。'
      ];
    },
    choices: function (state) {
      var c = [];
      c.push({
        label: '用剑劈碎它', hint: '意志 · 困难', consequence: '成功进入第四章 · 失败重伤',
        check: {
          skill: null, char: 'wp', difficulty: -10, title: '最后一击',
          success: {
            text: ['你举起武器，把王冠连同自己的恐惧一起砸下去。', '金面裂开，里面是空的。所有低语在同一瞬间停止。', '石柱上的火灭了。'],
            goto: 'ch1_destroy',
            effects: function (s) { addXp(s, 60); setFlag(s, 'destroyed'); }
          },
          failure: {
            text: ['你举起武器，手却停在半空。王冠的声音太像你自己。', '你咬破舌尖，用疼痛夺回手臂，砸了下去——但裂口不够深。', '王冠碎了，你也付出了代价。'],
            goto: 'ch1_maimed',
            effects: function (s) { s.wounds = Math.max(0, s.wounds - 8); addXp(s, 40); }
          }
        }
      });
      c.push({ label: '戴上它', hint: '接受王冠', consequence: '立即进入黑暗结局', goto: 'ending_crown' });
      if (flag(state, 'temple')) {
        c.push({ label: '把它交给阿格尼丝', hint: '教会路线', consequence: '封存王冠 · 继续北上', goto: 'ch1_church' });
      }
      c.push({ label: '转身离开', hint: '什么都不做', consequence: '立即进入逃离结局', goto: 'ending_flee' });
      return c;
    }
  };

  /* ---------------------------- 结局 ---------------------------- */
  var EPILOGUE = {
    destroy: {
      empire: '你回到帝国时，没有人相信一个外乡人毁掉了混沌遗物。你也不争辩。你在瑞克河畔买了块地，偶尔在夜里听见金子的声音，然后起床喝一杯水。',
      bretonnia: '你把王冠的碎片埋在一座无名礼拜堂下，然后骑马回了巴托尼亚。湖中女士没有显圣，但你知道她看见了。你的纹章重新上了色。',
      chaos: '诸神沉默了很久。你毁了它们的玩具，却没有遭到雷劈——这让你更害怕。你开始明白，最深的腐化不是戴上王冠，而是亲手毁掉它之后仍然渴望它。',
      kislev: '你带着一袋银币和满身伤回到北方。村庄已经重建，孩子们在雪里跑。你把王冠的事讲给炉火听，炉火没有回答。',
      highelf: '你把碎片封进铅匣，送回白塔。贤者们没有称赞你，只是把它锁进更深的地窖。你活了下来——对一个精灵来说，这不算什么成就，但也不坏。',
      cathay: '你把碎冠封进玉匣，随船带回震旦。龙帝没有召见你，但长城上的星象师记住了你的名字。',
    },
    crown: {
      empire: '王冠贴合你的额头，像是等了很久。灰港的人开始叫你“大人”。你修了城墙、清了码头、吊死了几个该吊死的人。只有你自己知道，每次照镜子，镜子里的冠比头上那顶更亮。',
      bretonnia: '你成了灰港的领主，用骑士的方式统治它：公正、严厉、不容置疑。湖中女士的祷告你不再念了。有时候你会梦见一顶没有脸的金冠，醒来时枕头是湿的。',
      chaos: '诸神终于笑了。你听见它们的赞许，像潮水一样灌进脑子。灰港的钟楼在那一夜倒了，余烬之手在废墟上跳舞。你坐在王座上，感觉很好——直到你发现，王座也在慢慢吃你。',
      kislev: '王冠给了你力量，也给了你一个不属于北方的梦。你回到基斯里夫，用灰港的银子重建了村庄。但每个冬天，你都能听见冰层下面有人叫你的名字。',
      highelf: '你戴上它的时候，白塔的警示在你脑中炸响。但你没有摘。你告诉自己这是为了研究，为了封印。三百年后，另一位精灵会来追杀你——你很清楚，因为你在镜子里已经看见了她的脸。',
      cathay: '你戴上王冠，灰港的雾变成了玉色。震旦的使团连夜离港，留下你一个人站在城头。',
    },
    church: {
      empire: '阿格尼丝接过王冠时，手没有抖。她把王冠锁进圣米迦勒的圣物匣，上了七道锁。“它会等着。”她说。你问等什么，她没有回答。',
      bretonnia: '教会的人收下了王冠，也收下了你的证词。你被允许在灰港的礼拜堂里过夜。第二天清晨，你发现自己的剑柄上多了一枚湖中女士的小像。',
      chaos: '你把王冠交给了一个穿灰袍的老修女。她看你的眼神很平静，像在看一个走错路的孩子。你离开神殿时，觉得脑子里空了一块——那低语跟了你太久。',
      kislev: '阿格尼丝把王冠封进圣物匣。你问她能不能毁掉它，她说：“能毁掉它的人，得先愿意被它毁掉。”你点点头，把这个答案带回了北方。',
      highelf: '你把王冠交给教会，白塔的贤者为此斥责了你三个月。但你知道，人类的信仰有时比精灵的魔法更能锁住东西。你回到奥苏安时，带走的只有一袋灰港的粗盐。',
      cathay: '阿格尼丝把王冠锁进圣物匣。你随船回国，把这段经历写进《西海见闻录》，没人相信。',
    },
    flee: {
      empire: '你走出礼拜堂，没有回头。身后传来六个人的尖叫，然后是钟声。灰港后来烧了三天。你在另一座城醒来，用别人的名字活着。',
      bretonnia: '你背对祭坛离开，骑士的誓言在背后碎了一地。你没有回头。此后每到夜里，你都会把剑擦得很亮，却再也没拔出来过。',
      chaos: '你转身走了。诸神没有拦你——它们只是记住了。你活了下来，但每个梦里，那顶王冠都在等你，耐心得像一块石头。',
      kislev: '你离开了灰港。三个月后，北方的商队带来消息：灰港没了。你在雪地里站了很久，然后继续往北走。有些债，活着也还不清。',
      highelf: '你放弃了任务，回到白塔。贤者没有惩罚你，只是把你的名字从记录里划掉了。你活得很久，久到足够后悔。',
      cathay: '你回到玉龙号，命令起锚。灰港在身后烧了三天。震旦的史书里，这一页被撕掉了。',
    },
    maimed: {
      empire: '王冠碎了，你的右手却再也握不紧剑。你在灰港开了间小书店，卖些没人读的古典语抄本。偶尔有人问起你手上的疤，你说是被猫抓的。',
      bretonnia: '王冠碎了，你的右手废了。你不能再执剑，于是把剑熔了，打成一口钟，挂在灰港的礼拜堂里。钟声很哑，但传得很远。',
      chaos: '你毁了王冠，也毁了自己的一条手臂。诸神没有收回它们的注视，反而更近了。你用左手继续走路，继续活着，继续听见那个声音。',
      kislev: '王冠碎了，你的右手留在了那里。你回到北方，用左手劈柴、打猎、抱孩子。没有人问你的手怎么了，基斯里夫人不问这种事。',
      highelf: '王冠碎了，你的右手废了。你把剑封进鞘里，转而去教人类的孩子们读书。你教了四十年。他们死的时候，你还是现在的样子。',
      cathay: '你带着一只废手回到震旦。龙帝的御医给你换了玉指，从此你能预感到风暴。',
    }
  };

  function epilogue(state, key) {
    var r = state.raceId;
    return EPILOGUE[key][r] || EPILOGUE[key].empire;
  }

  function summary(state) {
    var lines = [];
    lines.push('姓名：' + state.name + '　种族：' + raceOf(state).name + '　职业：' + careerOf(state).name);
    lines.push('身份：' + R.statusName(state.status || 2) + '　职业等级：Lv.' + (state.rank || 1) + ' ' + (state.title || '') + '　功勋：' + R.renown(state) + '/3');
    lines.push('线索：' + state.clues.length + ' 条　经验：' + state.totalXp + '　银币：' + state.gold + '　腐化：' + state.corruption);
    return lines;
  }

  scenes.ending_destroy = {
    act: 6, title: '结局 · 碎冠', ending: true,
    text: function (state) {
      return [
        '王冠碎了。低语停止的那一刻，你听见自己的呼吸声，很响，很陌生。',
        '六个被绑的人活了下来。他们不记得你的脸，只记得有人砸碎了那顶冠。',
        epilogue(state, 'destroy'),
        ''
      ].concat(summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_maimed = {
    act: 6, title: '结局 · 代价', ending: true,
    text: function (state) {
      return [
        '王冠碎了，但你的手没能完全收回来。',
        '你在灰港躺了半个月，靠阿格尼丝的草药活了下来。伤口愈合了，手指却不听使唤。',
        epilogue(state, 'maimed'),
        ''
      ].concat(summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_crown = {
    act: 6, title: '结局 · 无面之王', ending: true,
    text: function (state) {
      return [
        '你把王冠戴在头上。',
        '它比想象中轻。低语停了——因为现在说话的是你。',
        '六个祭品安静地低下头，石柱上的火重新燃起，颜色变了。',
        epilogue(state, 'crown'),
        ''
      ].concat(summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_church = {
    act: 6, title: '结局 · 七道锁', ending: true,
    text: function (state) {
      return [
        '阿格尼丝在礼拜堂门口等你。她看了看你怀里的王冠，没有问过程。',
        '“给我吧。”她说。你把王冠放进她手里，感觉像放下了一块烧红的铁。',
        epilogue(state, 'church'),
        ''
      ].concat(summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_flee = {
    act: 6, title: '结局 · 背影', ending: true,
    text: function (state) {
      return [
        '你走出礼拜堂，把火、惨叫声和那顶冠留在身后。',
        '下雨了。灰港的雨一直很多。',
        epilogue(state, 'flee'),
        ''
      ].concat(summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_death = {
    act: 6, title: '结局 · 灰', ending: true,
    text: function (state) {
      return [
        '你的血渗进石缝，和之前那些人的混在一起。',
        '王冠被举起来，第七个位置空着。祭司皱了皱眉，然后又笑了。',
        '“没关系。灰港还有很多活人。”',
        '——你的故事到此为止。',
        ''
      ].concat(summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.act2_hub = scenes.act2_intro;

  scenes.result = {
    title: '结果',
    text: function (state) {
      return state.resultView ? state.resultView.paras : [];
    },
    choices: function (state) {
      var rv = state.resultView || {};
      var list = [];
      if (state.lastCheck && state.lastCheck.failed && state.fortune > 0) {
        list.push({ label: '花费 1 点命运点重掷', hint: '命运点 ' + state.fortune, reroll: true, time: 0, consequence: '消耗 1 点命运点 · 立即重掷' });
      }
      list.push({
        label: rv.nextLabel || '继续', goto: rv.next || 'act1_hub', time: 0,
        effects: function (s) { s.lastCheck = null; }
      });
      return list;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 随机遭遇                                                            */
  /* ------------------------------------------------------------------ */
  /* ---------------------------- 第一章收尾：继续北上 ---------------------------- */
  scenes.ch1_destroy = {
    act: 3, title: '碎冠',
    onEnter: function (s) { s.flags.crown = 'destroyed'; s.flags.ch1Done = true; },
    text: function (state) {
      return [
        '王冠碎了。低语停止的那一刻，你听见自己的呼吸声，很响，很陌生。',
        state.flags.lateRitual ? '六个祭品没能活下来。你只来得及砸碎那顶冠。' : '六个被绑的人活了下来。他们不记得你的脸，只记得有人砸碎了那顶冠。',
        '你站在碎冠前，第一次觉得灰港的雨声很轻。',
        '但你在祭司的灰堆里找到一枚烙着黑石的铁牌——那是北方隘口的通行令。',
        '余烬之手只是一支先遣队。真正的战帮正在黑石隘口集结。'
      ];
    },
    choices: function () {
      return [{ label: '北上白蜡堡', hint: '进入第四章', goto: 'act4_intro' }];
    }
  };

  scenes.ch1_church = {
    act: 3, title: '七道锁',
    onEnter: function (s) { s.flags.crown = 'sealed'; s.flags.ch1Done = true; },
    text: function (state) {
      return [
        '阿格尼丝在礼拜堂门口等你。她看了看你怀里的王冠，没有问过程。',
        '“给我吧。”她说。你把王冠放进她手里，感觉像放下了一块烧红的铁。',
        '教会的人把王冠抬走时，阿格尼丝没有回头。',
        '她把王冠锁进圣物匣，然后递给你一封盖着教会火漆的信。',
        '“黑石隘口。”她说，“那里才是它真正想去的地方。”'
      ];
    },
    choices: function () {
      return [{ label: '带着教会的信北上', hint: '进入第四章', goto: 'act4_intro' }];
    }
  };

  scenes.ch1_maimed = {
    act: 3, title: '代价',
    onEnter: function (s) {
      s.flags.crown = 'destroyed';
      s.flags.ch1Done = true;
      if (s.wounds < 1) s.wounds = 1;
    },
    text: function (state) {
      return [
        '王冠碎了，但你的手没能完全收回来。',
        '你在灰港躺了半个月，靠阿格尼丝的草药活了下来。伤口愈合了，手指却不听使唤。',
        '阿格尼丝说你能活下来是个奇迹。你说不是。',
        '醒来时，阿格尼丝把一枚黑石铁牌放在你枕边。',
        '“余烬之手还有一支更大的队伍。”她说，“在北边。”'
      ];
    },
    choices: function () {
      return [{ label: '带着伤北上', hint: '进入第四章', goto: 'act4_intro' }];
    }
  };

  /* ---------------------------- 第四章：白蜡堡 ---------------------------- */
  scenes.act4_intro = {
    act: 4, title: '白蜡堡',
    onEnter: function (s) {
      s.act = 4;
      s.tempAlly = null;
      s.prep = s.prep || 0;
      s.siegeDeadline = (s.clock || 8) + 48;
      R.meetNPC(s, 'agnes', flag(s, 'temple') ? 35 : 15);
      R.meetNPC(s, 'grom', flag(s, 'tavern') ? 30 : 15);
      R.meetNPC(s, 'edric', 15);
    },
    text: function () {
      return [
        '白蜡堡比灰港更北。雨在这里变成了雪。',
        '城墙上的火把在风里歪斜，难民挤在门洞里。孩子不再哭——他们只是看着北方。',
        '灰港发生的事不是孤例。余烬之手在灰港收集王冠，只是为了给黑石隘口的大仪式凑齐最后一块碎片。',
        '灰烬领主·卡洛尔正在那里集结战帮。白蜡堡是挡在他和帝国腹地之间的最后一道墙。'
      ];
    },
    choices: function () {
      return [{ label: '进入城堡', goto: 'act4_arrival' }];
    }
  };

  scenes.act4_arrival = {
    act: 4, title: '白蜡堡 · 中庭',
    text: function () {
      return [
        '守军指挥官维克托只有一只眼睛。他看完你带来的信，沉默了很久。',
        '“白蜡堡撑不过一次进攻。”他说，“但我没有别的选择。”',
        '院子里，一个老修女正在给伤员换药；一个满脸疤痕的佣兵靠在井边磨斧头；一个穿不合身盔甲的年轻人站得笔直。',
        '你可以先做一件事，让这些人相信你。'
      ];
    },
    choices: function (state) {
      var c = [];
      var race = state.raceId;
      if (race === 'empire') {
        c.push({
          label: '出示帝国军令', hint: '说服 · 标准', consequence: '成功：备战 +1、命运点 +1',
          check: {
            skill: 'persuade', difficulty: 0, title: '帝国军令',
            success: {
              text: ['你展开军令，火漆在雪光里发亮。维克托单膝跪地，院里的民兵也跟着跪下。', '“以帝国的名义，白蜡堡听你调遣。”', '你获得了一点额外的命运。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; s.maxFate += 1; s.fate += 1; s.fortune += 1; s.flags.imperialBoon = true; addXp(s, 20); }
            },
            failure: {
              text: ['军令上的印被雪水泡花了。维克托皱着眉看了很久，最后把纸还给你。', '“我信你，但守军不会。”'],
              goto: 'act4_hub',
              effects: function () { }
            }
          }
        });
      } else if (race === 'bretonnia') {
        c.push({
          label: '要求接管防务', hint: '威吓 · 标准', consequence: '成功：备战 +1、伤害 +2',
          check: {
            skill: 'intimidate', difficulty: 0, title: '骑士的威仪',
            success: {
              text: ['你解下披风，露出褪色的纹章，把剑插进雪里。', '“以湖中女士之名，把城墙交给我。”', '维克托看了你很久，然后笑了：“至少你像个会守城的人。”'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; s.bonusDamage += 2; s.flags.ladyBoon = true; addXp(s, 20); }
            },
            failure: {
              text: ['你的口气太像命令，而这里的人已经受够了命令。', '维克托冷冷地让你“先去搬石头”。'],
              goto: 'act4_hub',
              effects: function () { }
            }
          }
        });
      } else if (race === 'chaos') {
        c.push({
          label: '以佣兵身份混入守军', hint: '欺诈 · 标准', consequence: '成功：备战 +1、腐化 +1',
          check: {
            skill: 'deceive', difficulty: 0, title: '佣兵名册',
            success: {
              text: ['你报了一个假名，说自己是南方来的佣兵。维克托在你的“推荐人”一栏看了很久，最后盖了章。', '你听见王冠的低语在城墙里回响——它认得这里。', '你获得了一些不该碰的知识。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; s.corruption += 1; s.flags.chaosMark = true; addXp(s, 20); }
            },
            failure: {
              text: ['维克托盯着你胸口的护符，手按上了剑柄。', '“我见过这种记号。”他说，“滚去城墙最外沿，让我看看你会不会死。”'],
              goto: 'act4_hub',
              effects: function (s) { s.wounds = Math.max(1, s.wounds - 2); }
            }
          }
        });
      } else if (race === 'kislev') {
        c.push({
          label: '用北方话安抚难民', hint: '魅惑 · 标准', consequence: '成功：备战 +1、坚韧 +5',
          check: {
            skill: 'charm', difficulty: 0, title: '同乡',
            success: {
              text: ['你蹲下来，用基斯里夫话对一个发抖的老妇人说：“我们会守住这里。”', '她抓住你的手，哭了出来。院子里的人安静下来。', '维克托什么也没说，只是让人给你端来热汤。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; s.stats.t += 5; R.recalc(s); addXp(s, 20); }
            },
            failure: {
              text: ['你的北方口音让难民更慌了。有人开始收拾东西。', '维克托花了一个钟头才把人群劝回去。'],
              goto: 'act4_hub',
              effects: function () { }
            }
          }
        });
      } else if (race === 'highelf') {
        c.push({
          label: '指出城墙上的魔法裂痕', hint: '学识 · 标准', consequence: '成功：备战 +1、学识与魔法 +10',
          check: {
            skill: 'lore', difficulty: 0, title: '八风之痕',
            success: {
              text: ['你让维克托把火把移开，露出墙缝里淡紫色的结晶。', '“这不是风化。”你说，“有人在这里埋了引信。”', '守军连夜挖出了三桶火油。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; s.skills.lore.adv += 10; s.skills.lore.trained = true; s.skills.magic.adv += 10; s.skills.magic.trained = true; s.flags.wardBoon = true; addXp(s, 20); }
            },
            failure: {
              text: ['你摸到的只是普通的霜。维克托看你的眼神多了几分怀疑。'],
              goto: 'act4_hub',
              effects: function () { }
            }
          }
        });
      } else {
        c.push({
          label: '以震旦使节的身份请求协防', hint: '说服 · 标准', consequence: '成功：备战 +1、身份 +1',
          check: {
            skill: 'persuade', difficulty: 0, title: '东方使节',
            success: {
              text: ['你解开玉匣，露出星盘的残片。淡青色的光在雪里亮了一瞬。', '“这不是旧世界的把戏。”你说，“但我们的敌人是同一个。”', '维克托盯着星盘看了很久，最后点了头。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; s.status = Math.min(5, s.status + 1); s.flags.cathayBoon = true; addXp(s, 20); }
            },
            failure: {
              text: ['维克托听不懂你的来意，只看见一个穿玉甲的异乡人。', '“东方来的？”他叹了口气，“先帮忙搬石头吧。”'],
              goto: 'act4_hub',
              effects: function () { }
            }
          }
        });
      }
      c.push({ label: '先去见见这些人', hint: '不冒险', goto: 'act4_hub' });
      return c;
    }
  };

  scenes.act4_hub = {
    act: 4, title: '白蜡堡 · 战前',
    onEnter: function (s) { if (s.wounds < 1) s.wounds = 1; },
    text: function (state) {
      var t = [
        '雪越下越大。城墙外的原野上，斥候说看见了火光。',
        '维克托把防务图铺在桌上：“我们最多还有两天。”',
        '你可以在同伴页与阿格尼丝、格罗姆、埃德里克交谈，提升好感并招募他们。',
        '当前备战：' + (state.prep || 0) + '（至少 2 项即可开战）。'
      ];
      if ((state.party || []).length) {
        t.push('同行者：' + state.party.map(function (id) { return G.data.NPCS[id].name; }).join('、') + '。');
      }
      return t;
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'prepWalls')) {
        c.push({
          label: '加固北墙', hint: '运动 · 标准', consequence: '成功：备战 +1；失败：受伤',
          check: {
            skill: 'athletics', difficulty: 0, title: '北墙',
            success: {
              text: ['你和民兵一起把石料拖上城墙，用冻硬的水和泥填缝。', '北墙至少能多撑一个时辰。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; setFlag(s, 'prepWalls'); addXp(s, 15); }
            },
            failure: {
              text: ['一块石料从坡上滚下来，砸在你的腿上。', '墙没修好，你先添了新伤。'],
              goto: 'act4_hub',
              effects: function (s) { setFlag(s, 'prepWalls'); s.wounds = Math.max(1, s.wounds - 3); }
            }
          }
        });
      }
      if (!flag(state, 'prepScout')) c.push({ label: '出城侦察', hint: '追踪 · 困难', consequence: '可能遭遇战 · 结识希尔达', goto: 'act4_scout' });
      if (!flag(state, 'prepTrait')) c.push({ label: '调查军需官', hint: '侦查 · 标准', consequence: '可能遭遇战 · 备战 +1', goto: 'act4_traitor' });
      if (!flag(state, 'prepDrill')) {
        c.push({
          label: '训练民兵', hint: '近战 · 标准', consequence: '成功：备战 +1、埃德里克好感 +8',
          check: {
            skill: 'melee', difficulty: 0, title: '民兵',
            success: {
              text: ['你把二十个农民排成两排，教他们只做一件事：把矛尖对准前面。', '埃德里克学得最快。他第一次没有在挥矛时闭眼。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; setFlag(s, 'prepDrill'); R.addAffinity(s, 'edric', 8); addXp(s, 15); }
            },
            failure: {
              text: ['民兵们被你的口令弄糊涂了，两个人撞在一起，一个哭了。', '训练草草收场。'],
              goto: 'act4_hub',
              effects: function (s) { setFlag(s, 'prepDrill'); }
            }
          }
        });
      }
      if (!flag(state, 'rest4')) {
        c.push({
          label: '在营房里睡一觉', hint: '恢复约三成伤口（一次）', consequence: '恢复伤口 · 清除疲劳', stay: true, time: 8,
          effects: function (s) {
            setFlag(s, 'rest4'); s.lastRest = s.clock; s.fatigue = 0;
            var heal = Math.max(4, Math.floor(s.maxWounds * 0.3));
            s.wounds = Math.min(s.maxWounds, s.wounds + heal);
            s.fortune = Math.min(s.maxFate, s.fortune + 1);
            s.conditions = [];
            (s.party || []).forEach(function (id) { if (s.npcs[id]) s.npcs[id].wounded = false; });
            return '你睡了一会儿，恢复 ' + heal + ' 点伤口。同伴们也得到了包扎。';
          }
        });
      }
      if (state.status >= 4 && !flag(state, 'statusLevy')) {
        c.push({
          label: '以身份征召守军', hint: '士绅以上', consequence: '备战 +1 · 无需检定 · 身份专属',
          effects: function (s) {
            s.prep += 1;
            setFlag(s, 'statusLevy');
            R.addAffinity(s, 'edric', 5);
            return '你报出名字和头衔。守军沉默了一瞬，然后开始动起来。';
          }
        });
      }
      var done = ['prepWalls', 'prepScout', 'prepTrait', 'prepDrill'].filter(function (f) { return flag(state, f); }).length;
      if ((state.prep || 0) >= 2) {
        c.push({ label: '召开战前会议', hint: '迎战夜袭', consequence: '进入夜袭战 · 可能阵亡', goto: 'act4_siege' });
      } else if (done >= 4) {
        c.push({ label: '召开战前会议', hint: '没有准备好，也只能开战', consequence: '进入夜袭战 · 准备不足', goto: 'act4_siege' });
      } else {
        c.push({ label: '召开战前会议', hint: '至少需要 2 项准备', disabled: true });
      }
      return c;
    }
  };

  scenes.act4_scout = {
    act: 4, title: '雪原',
    onEnter: function (s) { R.meetNPC(s, 'hilda', 15); },
    text: function () {
      return [
        '雪没过脚踝。你沿着一条被踩实的兽径往北走，远处是黑石隘口的方向。',
        '一棵枯树下蹲着一个女人，正在用雪擦箭头。她抬头看你，没有起身。',
        '“你是来送死的，还是来打仗的？”她问。她的口音是基斯里夫口音。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'prepScout')) {
        c.push({
          label: '请她带路追踪战帮', hint: '生存 · 困难',
          check: {
            skill: 'survival', difficulty: -10, title: '雪线',
            success: {
              text: ['希尔达看了你很久，然后把三支箭里的最后一支插回箭袋。', '“跟我走。”', '你们在雪里蹲了半个钟头，看见一支车队从隘口方向来——车上盖着黑布，布下在动。', '她记住了路线。'],
              goto: 'act4_hub',
              effects: function (s) {
                s.prep += 1; setFlag(s, 'prepScout');
                R.addAffinity(s, 'hilda', 25);
                addClue(s, 'circle'); addXp(s, 20);
              }
            },
            failure: {
              text: ['你踩碎了一层薄冰，声音在雪原上传得很远。', '希尔达骂了一句，从树后拖出一具被啃过的鹿尸。', '“它们来了。”'],
              goto: 'act4_scout_fight',
              effects: function (s) { setFlag(s, 'prepScout'); }
            }
          }
        });
      }
      c.push({ label: '带她回白蜡堡', goto: 'act4_hub' });
      return c;
    }
  };

  scenes.act4_scout_fight = {
    act: 4, title: '雪原',
    text: function () {
      return ['两条变异猎犬从雪堆后钻出来，肋骨上结着霜。', '希尔达拉开弓，箭尖对准了左边那只。'];
    },
    choices: function () {
      return [{
        label: '迎战', combat: {
          groups: [{ key: 'hound', count: 2 }],
          intro: '猎犬低吼着逼近。',
          win: 'act4_scout_win', lose: 'ending_death', flee: 'act4_hub'
        }
      }];
    }
  };

  scenes.act4_scout_win = {
    act: 4, title: '雪原',
    text: function () {
      return ['最后一支箭射穿了猎犬的眼睛。希尔达走过去，把箭拔出来，在雪里擦了擦。', '“箭要省着用。”她说，“人也是。”', '她答应带你去白蜡堡。'];
    },
    choices: function () {
      return [{
        label: '回城', goto: 'act4_hub',
        effects: function (s) {
          s.prep += 1; setFlag(s, 'prepScout');
          R.addAffinity(s, 'hilda', 20);
          addXp(s, 20); s.gold += 5;
        }
      }];
    }
  };

  scenes.act4_traitor = {
    act: 4, title: '军需库',
    text: function () {
      return [
        '军需官是个瘦小的男人，指甲缝里全是黑泥。他看见你时笑得太快。',
        '账本上写着三百支箭，库里只有一百二十支。剩下的箭，昨天夜里从后门运走了。',
        '后门的雪地上，有一串通往城外的脚印。'
      ];
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'prepTrait')) {
        c.push({
          label: '当面拆穿他', hint: '侦查 · 标准',
          check: {
            skill: 'perception', difficulty: 0, title: '账本',
            success: {
              text: ['你把账本摔在他面前。他的笑僵住了。', '“箭是给隘口的。”他低声说，“他们抓了我女儿。”', '他交出了城门暗号，还有一桶没来得及运走的火油。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; setFlag(s, 'prepTrait'); addClue(s, 'ashes'); addXp(s, 20); }
            },
            failure: {
              text: ['你翻账本的时候，他从袖子里抽出一把短刀。', '“你不该看这个。”'],
              goto: 'act4_traitor_fight',
              effects: function (s) { setFlag(s, 'prepTrait'); }
            }
          }
        });
        c.push({
          label: '先稳住他，再搜后门', hint: '欺诈 · 困难',
          check: {
            skill: 'deceive', difficulty: -10, title: '稳住',
            success: {
              text: ['你假装只是来领冬衣，和他聊了几句家常。', '等他转身去拿钥匙，你从后门溜了出去。', '雪地上的脚印通向一段废弃的排水渠——余烬之手就是从那里进城的。'],
              goto: 'act4_hub',
              effects: function (s) { s.prep += 1; setFlag(s, 'prepTrait'); setFlag(s, 'foundSewer'); addXp(s, 20); }
            },
            failure: {
              text: ['你的问题问得太急。他后退一步，撞翻了油灯。', '火光里，他吹了一声口哨。'],
              goto: 'act4_traitor_fight',
              effects: function (s) { setFlag(s, 'prepTrait'); }
            }
          }
        });
      }
      c.push({ label: '离开军需库', goto: 'act4_hub' });
      return c;
    }
  };

  scenes.act4_traitor_fight = {
    act: 4, title: '军需库',
    text: function () {
      return ['两个灰袍人从货架后走出来，手里提着刀。军需官缩在角落，抱着头。'];
    },
    choices: function () {
      return [{
        label: '迎战', combat: {
          groups: [{ key: 'cultist', count: 2 }],
          intro: '灰袍人踢翻了油桶。',
          win: 'act4_traitor_win', lose: 'ending_death', flee: 'act4_hub'
        }
      }];
    }
  };

  scenes.act4_traitor_win = {
    act: 4, title: '军需库',
    text: function () {
      return ['军需官跪在地上，把知道的都说了：今夜，余烬之手会从排水渠摸进北墙。', '“他们人不多。”他说，“但带了一件会动的笼子。”'];
    },
    choices: function () {
      return [{
        label: '把消息带回去', goto: 'act4_hub',
        effects: function (s) { s.prep += 1; setFlag(s, 'prepTrait'); addClue(s, 'circle'); addXp(s, 25); }
      }];
    }
  };

  scenes.late_ritual = {
    act: 3, title: '迟到的黎明',
    onEnter: function (s) { s.flags.atChapel = true; },
    text: function () {
      return [
        '你赶到旧礼拜堂时，天已经黑得不像话。',
        '祭坛下的火把全灭了。六个祭品躺在石柱之间，已经没有呼吸。',
        '灰烬祭司站在碎掉的地板上，王冠在他手里发着不符合常理的光。',
        '“你来晚了。”他说，“不过，门不介意多一个自愿的人。”'
      ];
    },
    choices: function () {
      return [
        {
          label: '冲上去，直取祭司', hint: '战斗 · 仪式已完成', time: 3,
          combat: {
            groups: [{ key: 'priest', count: 1 }],
            intro: '祭司抬起手，灰烬像潮水一样涌来。',
            prep: function (state, combat) {
              combat.enemies[0].wounds += 10;
              combat.enemies[0].maxWounds += 10;
              combat.log.push('仪式让灰烬祭司变得更强：伤口 +10。');
            },
            win: 'ch1_destroy', lose: 'ending_death', flee: 'ending_flee'
          }
        },
        { label: '转身离开，让灰港自己承担', goto: 'ending_flee', time: 1 }
      ];
    }
  };

  scenes.act4_siege_late = {
    act: 4, title: '白蜡堡 · 提前进攻',
    onEnter: function (s) { s.flags.siegeStarted = true; },
    text: function () {
      return [
        '你还没来得及做完最后的准备，北墙外就响起了号角。',
        '敌人比预想的更早。火把在雪里连成一片，撞车已经推到城门前。',
        '维克托把一把剑塞进你手里：“现在只能靠我们自己了。”'
      ];
    },
    choices: function () {
      return [{
        label: '迎战', hint: '战斗 · 准备不足', time: 3,
        combat: {
          groups: [{ key: 'marauder', count: 2 }, { key: 'cultist', count: 2 }],
          distance: 'far',
          intro: '城门在第三次撞击后裂开。',
          win: 'act4_after', lose: 'act4_rout', flee: 'act4_rout'
        }
      }];
    }
  };

  scenes.act4_siege = {
    act: 4, title: '白蜡堡 · 夜袭',
    onEnter: function (s) { s.flags.siegeStarted = true; },
    text: function (state) {
      var t = [
        '午夜，北墙外的雪地里亮起第一支火把。',
        '然后是第二支、第十支、第一百支。战鼓声从雪原深处滚过来，像有什么巨大的东西在呼吸。',
        '维克托拔出剑：“守住墙。守住门。守住后面那些人。”'
      ];
      if ((state.party || []).length) t.push('你的同伴站到了你身边。');
      if ((state.prep || 0) >= 3) t.push('你的准备让守军少流了很多血。');
      return t;
    },
    choices: function () {
      return [{
        label: '迎战', combat: {
          groups: [{ key: 'marauder', count: 1 }, { key: 'cultist', count: 2 }, { key: 'hound', count: 1 }],
          distance: 'far',
          intro: '第一波敌人翻过雪堆，冲向缺口。',
          prep: function (state, combat) {
            if ((state.prep || 0) >= 3) {
              combat.enemies = combat.enemies.filter(function (e) { return e.key !== 'hound'; });
              combat.log.push('预先布置的拒马挡住了猎犬，敌人少了一只。');
            }
            if ((state.prep || 0) >= 4) {
              combat.enemies[0].wounds = Math.max(4, combat.enemies[0].wounds - 4);
              combat.log.push('城墙上的滚油烫伤了掠夺者。');
            }
            if (state.flags.banner) {
              combat.allies.forEach(function (a) { a.wounds = Math.min(a.maxWounds, a.wounds + 6); });
              combat.log.push('军旗在城头展开，同伴们振作了精神。');
            }
          },
          win: 'act4_after', lose: 'act4_rout', flee: 'act4_rout'
        }
      }];
    }
  };

  scenes.act4_after = {
    act: 4, title: '白蜡堡 · 黎明',
    onEnter: function (s) { s.flags.siegeDone = true; s.flags.siegeWon = true; },
    text: function () {
      return [
        '天快亮时，最后一批敌人退回了雪原。',
        '城墙上到处是冰、血和烧焦的木头。维克托靠在垛口上，仅剩的那只眼睛望着北方。',
        '“他们没打算攻下这里。”他说，“他们只是想让咱们以为，这里就是终点。”',
        '斥候带回消息：卡洛尔的主力已经在黑石隘口集结。王冠只是钥匙，裂痕才是门。'
      ];
    },
    choices: function () {
      return [{
        label: '立刻北上', hint: '进入第五章', goto: 'act5_intro',
        effects: function (s) {
          (s.party || []).forEach(function (id) { R.addAffinity(s, id, 5); });
          addXp(s, 50); s.gold += 15;
        }
      }];
    }
  };

  scenes.act4_rout = {
    act: 4, title: '白蜡堡 · 陷落',
    onEnter: function (s) { s.flags.fortFallen = true; s.flags.siegeDone = true; },
    text: function () {
      return [
        '北墙塌了。',
        '你被人从雪里拖出来，拖上马，拖向南方。身后是火光和喊声。',
        '维克托没有跟上来。埃德里克也没有——如果你没把他带在身边的话。',
        '但你还活着。只要活着，就还能往北走。'
      ];
    },
    choices: function () {
      return [{
        label: '收拢残兵，继续北上', hint: '进入第五章',
        effects: function (s) {
          s.wounds = Math.max(8, s.wounds);
          addXp(s, 20);
        },
        goto: 'act5_intro'
      }];
    }
  };

  /* ---------------------------- 第五章：黑石隘口 ---------------------------- */
  scenes.act5_intro = {
    act: 5, title: '黑石隘口',
    onEnter: function (s) {
      if (!s.riftDeadline) s.riftDeadline = (s.clock || 8) + 24;
    },
    text: function (state) {
      var t = [
        '黑石隘口在雪线以上。天空有一道不会愈合的伤口，颜色像凝固的油。',
        '卡洛尔的战帮在山谷里扎营，篝火连成一条红色的河。营地中央，一座用黑石垒起的高台正在发光。',
        '裂痕在呼吸。每一次呼吸，雪就变黑一寸。',
        '你最多还有一天。一天之后，它就不再需要祭司了。'
      ];
      if (state.flags.crown === 'destroyed') t.push('你怀里那片王冠碎片也在发烫——它想回去。');
      if (state.flags.crown === 'sealed') t.push('教会封印的王冠在背包里沉默着，但你知道它醒着。');
      if (state.flags.fortFallen) t.push('白蜡堡的火光还在南边的天际线上。你没有退路了。');
      return t;
    },
    choices: function (state) {
      var c = [];
      if (!flag(state, 'rest5')) {
        c.push({
          label: '在雪洞里歇一晚', hint: '恢复约三成伤口（一次）', consequence: '恢复伤口 · 清除疲劳', stay: true, time: 8,
          effects: function (s) {
            setFlag(s, 'rest5'); s.lastRest = s.clock; s.fatigue = 0;
            var heal = Math.max(4, Math.floor(s.maxWounds * 0.3));
            s.wounds = Math.min(s.maxWounds, s.wounds + heal);
            s.fortune = Math.min(s.maxFate, s.fortune + 1);
            s.conditions = [];
            (s.party || []).forEach(function (id) { if (s.npcs[id]) s.npcs[id].wounded = false; });
            return '你在背风的雪洞里睡了一会儿，恢复 ' + heal + ' 点伤口。同伴们也缓了过来。';
          }
        });
      }
      c.push({
        label: '从营地侧翼潜入', hint: '隐匿 · 困难',
        check: {
          skill: 'stealth', difficulty: -10, title: '潜入',
          success: {
            text: ['你贴着岩壁绕过哨兵，摸进了营地边缘。', '几个掠夺者正围着火堆赌钱，盔甲丢在一边。'],
            goto: 'act5_camp',
            effects: function (s) { setFlag(s, 'sneak'); addXp(s, 20); }
          },
          failure: {
            text: ['一脚踩空，碎石滚下山坡。', '火堆边的掠夺者同时抬头。'],
            goto: 'act5_camp',
            effects: function () { }
          }
        }
      });
      c.push({ label: '从正面杀进去', hint: '战斗', goto: 'act5_camp' });
      c.push({
        label: '绕行旧矿道', hint: '生存 · 困难',
        check: {
          skill: 'survival', difficulty: -10, title: '矿道',
          success: {
            text: ['矿道塌了一半，但还能走。', '你从高台背后的裂缝钻出来，直接看见了祭坛的背面。'],
            goto: 'act5_ritual',
            effects: function (s) { setFlag(s, 'bypassCamp'); addXp(s, 30); }
          },
          failure: {
            text: ['矿道尽头塌死了。你花了半个钟头才退出来，手上全是血。'],
            goto: 'act5_camp',
            effects: function (s) { s.wounds = Math.max(1, s.wounds - 4); }
          }
        }
      });
      if (!flag(state, 'observedRift')) {
        c.push({
          label: '先观察仪式', hint: '学识 · 标准',
          check: {
            skill: 'lore', difficulty: 0, title: '裂痕',
            success: {
              text: ['你趴在一块黑石后看了很久，终于看懂了仪式的结构。', '裂痕不是被打开的——它是被“说服”的。只要打断唱名，它就会合上。'],
              goto: 'act5_intro',
              effects: function (s) { setFlag(s, 'riftWeak'); setFlag(s, 'observedRift'); addClue(s, 'weakness'); addXp(s, 30); }
            },
            failure: {
              text: ['你看了太久，眼睛开始流血。', '那些符号不是你该读的东西。'],
              goto: 'act5_intro',
              effects: function (s) { setFlag(s, 'observedRift'); s.wounds = Math.max(1, s.wounds - 3); R.addCorruption(s, 1); }
            }
          }
        });
      }
      return c;
    }
  };

  scenes.act5_camp = {
    act: 5, title: '战帮营地',
    text: function () {
      return [
        '营地比你想象的更安静。掠夺者们围在火边，没人说话，所有人都在看高台。',
        '一个神选者站在通往高台的路上，盔甲和血肉长在一起，剑尖垂在雪里。',
        '他抬起手，身后的掠夺者站了起来。'
      ];
    },
    choices: function () {
      return [{
        label: '杀过去', combat: {
          groups: [{ key: 'marauder', count: 2 }, { key: 'chosen', count: 1 }],
          distance: 'close',
          intro: '神选者拔剑，雪地被犁出一道黑痕。',
          prep: function (state, combat) {
            if (state.flags.sneak) {
              combat.enemies.forEach(function (e) { e.wounds = Math.max(3, e.wounds - 4); });
              combat.log.push('偷袭得手，敌人带着伤迎战。');
            }
          },
          win: 'act5_ritual', lose: 'ending_death', flee: 'act5_intro'
        }
      }];
    }
  };

  scenes.act5_ritual = {
    act: 5, title: '裂痕之台',
    text: function (state) {
      var t = [
        '高台上，卡洛尔背对着你。他的王冠熔进了头骨，声音像很多人共用一副喉咙。',
        '“你来得正好。”他没有回头，“门需要第七个自愿的人。”',
        '他脚下的裂痕里，有东西正在往上爬。'
      ];
      if (state.flags.riftWeak) t.push('你记得：打断唱名，裂痕就会合上。');
      if (state.tempAlly === 'agnes') t.push('阿格尼丝站在你身后，把圣徽攥得发白。她没有说话，但也没有退。');
      return t;
    },
    choices: function (state) {
      var c = [];
      c.push({
        label: '直接动手', hint: '战斗 · 灰烬领主', consequence: 'Boss 战 · 可能阵亡',
        combat: {
          groups: [{ key: 'lord', count: 1 }, { key: 'chosen', count: 1 }],
          intro: '卡洛尔转过身，剑上的火照亮了半个高台。',
          win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
        }
      });
      c.push({
        label: '打断祭坛的唱名', hint: '学识 · 困难', consequence: '成功削弱 Boss；失败被反噬',
        check: {
          skill: 'lore', difficulty: -10, title: '打断唱名',
          success: {
            text: ['你用一个错误的音节盖过了祭司的唱名。', '裂痕猛地收缩，卡洛尔踉跄了一步——他的力量有一半来自那道门。'],
            goto: 'act5_ritual_weak',
            effects: function (s) { setFlag(s, 'riftHurt'); addXp(s, 30); }
          },
          failure: {
            text: ['你喊错了。裂痕像被激怒一样张开，黑光扫过你的胸口。', '卡洛尔终于转过身。'],
            goto: 'act5_ritual_angry',
            effects: function (s) { s.wounds = Math.max(1, s.wounds - 5); }
          }
        }
      });
      if (state.flags.crown === 'destroyed' && state.items.holy_water) {
        c.push({
          label: '把王冠碎片和圣水一起砸进祭坛', hint: '消耗圣水 · 重创领主',
          effects: function (s) {
            s.items.holy_water -= 1;
            if (s.items.holy_water <= 0) delete s.items.holy_water;
            s.flags.shardBomb = true;
            return '碎片在祭坛上炸开，白光吞没了半个高台。卡洛尔发出不似人声的尖叫。';
          },
          combat: {
            groups: [{ key: 'lord', count: 1 }, { key: 'chosen', count: 1 }],
            prep: function (state, combat) {
              combat.enemies[0].wounds = Math.max(5, combat.enemies[0].wounds - 12);
              combat.log.push('王冠碎片重创了卡洛尔，他失去 12 点伤口。');
            },
            win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
          }
        });
      }
      if (state.raceId === 'empire') {
        c.push({
          label: '举起帝国军旗', hint: '帝国专属 · 鼓舞同伴',
          effects: function (s) {
            s.flags.banner = true;
            (s.party || []).forEach(function (id) { R.addAffinity(s, id, 5); });
            return '你将军旗插进雪里。旗帜在无风的裂痕下展开，同伴们握紧了武器。';
          },
          combat: {
            groups: [{ key: 'lord', count: 1 }, { key: 'chosen', count: 1 }],
            prep: function (state, combat) {
              combat.allies.forEach(function (a) { a.wounds = Math.min(a.maxWounds, a.wounds + 10); });
              state.damageBuff = (state.damageBuff || 0) + 2;
              combat.log.push('军旗之下，所有人恢复 10 点伤口，伤害 +2。');
            },
            win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
          }
        });
      }
      if (state.raceId === 'bretonnia') {
        c.push({
          label: '要求与卡洛尔单挑', hint: '巴托尼亚专属 · 决斗',
          effects: function (s) {
            s.flags.duel = true;
            (s.party || []).forEach(function (id) { R.addAffinity(s, id, 5); });
            return '你拔剑上前，按骑士礼将剑尖点地。卡洛尔笑了，挥手让神选者退下。';
          },
          combat: {
            groups: [{ key: 'lord', count: 1 }],
            prep: function (state, combat) {
              combat.enemies[0].wounds = Math.max(8, combat.enemies[0].wounds - 6);
              combat.log.push('决斗的荣誉让卡洛尔受了些伤。');
            },
            win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
          }
        });
      }
      if (state.raceId === 'chaos') {
        c.push({
          label: '以真名命令神选者退下', hint: '混沌专属 · 低语',
          effects: function (s) {
            s.flags.chosenFled = true;
            s.corruption += 1;
            return '你用一个不该由活人说出的名字叫住了神选者。他僵在原地，然后转身走进了雪里。';
          },
          combat: {
            groups: [{ key: 'lord', count: 1 }],
            prep: function (state, combat) { combat.log.push('神选者已经离开。'); },
            win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
          }
        });
      }
      if (state.raceId === 'kislev') {
        c.push({
          label: '呼唤熊神', hint: '基斯里夫专属 · 恢复',
          effects: function (s) {
            var heal = 15;
            s.wounds = Math.min(s.maxWounds, s.wounds + heal);
            (s.party || []).forEach(function (id) { R.addAffinity(s, id, 5); });
            return '你跪在雪里，用基斯里夫话念出熊神的名字。风雪短暂地停了。你恢复 ' + heal + ' 点伤口。';
          },
          combat: {
            groups: [{ key: 'lord', count: 1 }, { key: 'chosen', count: 1 }],
            prep: function (state, combat) {
              state.damageBuff = (state.damageBuff || 0) + 2;
              combat.log.push('熊神的怒意在你血管里燃烧，伤害 +2。');
            },
            win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
          }
        });
      }
      if (state.raceId === 'highelf') {
        c.push({
          label: '以八风锁住裂痕', hint: '高等精灵专属 · 削弱领主',
          effects: function (s) {
            s.flags.sealedRift = true;
            return '你以精灵语唱出八个音节。裂痕的边缘结出霜，卡洛尔的力量被抽走了一部分。';
          },
          combat: {
            groups: [{ key: 'lord', count: 1 }, { key: 'chosen', count: 1 }],
            prep: function (state, combat) {
              combat.enemies[0].wounds = Math.max(6, combat.enemies[0].wounds - 10);
              combat.log.push('八风锁链缠住卡洛尔，他失去 10 点伤口。');
            },
            win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
          }
        });
      }
      if (state.raceId === 'cathay') {
        c.push({
          label: '以星盘校准裂痕', hint: '震旦专属 · 削弱领主',
          effects: function (s) {
            s.flags.starRite = true;
            (s.party || []).forEach(function (id) { R.addAffinity(s, id, 5); });
            return s.flags.compassIntact
              ? '完整的星盘在你手里亮起。指针疯狂旋转，然后停住——你找到了裂痕的“频率”。'
              : '残缺的指针在你手里颤抖。你勉强找到了裂痕的“频率”，但它不太稳定。';
          },
          combat: {
            groups: [{ key: 'lord', count: 1 }, { key: 'chosen', count: 1 }],
            prep: function (state, combat) {
              var intact = !!state.flags.compassIntact;
              var dmg = intact ? 12 : 8;
              var heal = intact ? 10 : 6;
              combat.enemies[0].wounds = Math.max(5, combat.enemies[0].wounds - dmg);
              combat.allies.forEach(function (a) { a.wounds = Math.min(a.maxWounds, a.wounds + heal); });
              combat.log.push('星盘校准了裂痕的频率：卡洛尔失去 ' + dmg + ' 点伤口，同伴恢复 ' + heal + ' 点。');
            },
            win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
          }
        });
      }
      return c;
    }
  };

  scenes.act5_ritual_weak = {
    act: 5, title: '裂痕之台',
    text: function () {
      return ['卡洛尔单膝跪在祭坛前，王冠在他头骨里发出裂响。', '“你以为打断唱名就赢了？”他抬起头，“门已经记住了你的味道。”', '他站起来，剑尖拖在雪里。'];
    },
    choices: function () {
      return [{
        label: '现在解决他', combat: {
          groups: [{ key: 'lord', count: 1 }, { key: 'chosen', count: 1 }],
          prep: function (state, combat) {
            combat.enemies[0].wounds = Math.max(5, combat.enemies[0].wounds - 8);
            combat.log.push('被打断的仪式反噬了卡洛尔，他失去 8 点伤口。');
          },
          win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
        }
      }];
    }
  };

  scenes.act5_ritual_angry = {
    act: 5, title: '裂痕之台',
    text: function () {
      return ['黑光从裂痕里涌出来，缠住你的手脚。', '卡洛尔走到你面前，熔进头骨的王冠几乎贴上你的额头。', '“你念错了。”他轻声说，“让我教你怎么念。”'];
    },
    choices: function () {
      return [{
        label: '挣脱，迎战', combat: {
          groups: [{ key: 'lord', count: 1 }, { key: 'chosen', count: 1 }],
          prep: function (state, combat) {
            state.wounds = Math.max(1, state.wounds - 4);
            combat.log.push('黑光灼伤了你，失去 4 点伤口。');
          },
          win: 'act5_final', lose: 'ending_death', flee: 'act5_intro'
        }
      }];
    }
  };

  scenes.act5_final = {
    act: 5, title: '裂痕',
    onEnter: function (s) { s.flags.bossWon = true; },
    text: function (state) {
      var t = [
        '卡洛尔倒下了。他的王冠滚进雪里，裂成两半。',
        '但裂痕还开着。它不需要祭司了——它已经醒了。',
        '风从裂痕里吹出来，带着另一个世界的味道。你听见很多声音在叫你进去。'
      ];
      if (state.flags.riftWeak) t.push('你记得：打断唱名，它就会合上。现在它没有唱名了，只剩一道伤口。');
      return t;
    },
    choices: function (state) {
      var c = [];
      var diff = -10;
      if (state.flags.riftWeak) diff += 10;
      if (state.raceId === 'highelf') diff += 10;
      if (state.flags.sealedRift) diff += 10;
      if (state.flags.starRite) diff += (state.flags.compassIntact ? 15 : 10);
      if (state.flags.riftLate) diff -= 10;
      c.push({
        label: '以自身鲜血封印裂痕', hint: '意志 · ' + (diff < 0 ? '困难' : '标准'), consequence: '成功：破晓结局；失败：裂痕洞开',
        check: {
          skill: null, char: 'wp', difficulty: diff, title: '封印',
          success: {
            text: ['你割开手掌，把血按进裂痕的边缘。', '它像被烫到一样收缩、尖叫、然后合上。', '雪停了。'],
            goto: 'ending_dawn',
            effects: function (s) { s.flags.sealed = true; addXp(s, 80); }
          },
          failure: {
            text: ['你的血不够。或者说，裂痕想要的不是血。', '它张开得更大，把整个高台吞了进去。'],
            goto: 'ending_dark',
            effects: function (s) { addXp(s, 40); }
          }
        }
      });
      if ((state.party || []).length) {
        c.push({
          label: '让一位同伴留下，替你合上它', hint: '牺牲', consequence: '同伴牺牲 · 裂痕关闭',
          goto: 'ending_sacrifice'
        });
      }
      if (state.flags.crown !== 'destroyed') {
        c.push({ label: '戴上王冠，命令裂痕关闭', hint: '黑暗的胜利', consequence: '戴上王冠 · 黑暗结局', goto: 'ending_crown2' });
      }
      c.push({ label: '转身离开', hint: '活着离开', consequence: '裂痕继续扩张 · 逃离结局', goto: 'ending_flee2' });
      return c;
    }
  };

  /* ---------------------------- 终局 ---------------------------- */
  var EPILOGUE2 = {
    dawn: {
      empire: '你回到帝国时，黑石隘口的雪已经化了。没有人给你授勋，但瑞克河畔的村庄里多了一个总在夜里磨剑的人。',
      bretonnia: '湖中女士没有显圣。但你离开隘口那天，雪地上开出了一小片蓝色的花。你把剑留在那里，骑马回了巴托尼亚。',
      chaos: '诸神沉默了很久。你替它们关上了一扇门，却没有遭到惩罚。你开始明白，它们并不在意门，它们只在意你。',
      kislev: '你把卡洛尔的头骨埋进冻土，然后往南走。基斯里夫的春天很短，但足够让一个村庄重新冒烟。',
      highelf: '你以八风缝合了裂痕，白塔的贤者把你的名字刻进了档案。你活了下来，也终于明白人类为什么值得被拯救——他们明知道会死，还是会往前站。',
      cathay: '裂痕合上时，你的星盘裂成两半。你回到震旦，把碎片嵌进长城的星图。',
    },
    sacrifice: {
      empire: '有人留在了裂痕前。灰港的钟声在三天后响起，没有人知道它在为谁而鸣。',
      bretonnia: '有人把最后一袋银币塞给你，然后转身走向裂痕。你没能把他带回来。',
      chaos: '你让一个相信你的人留在了那里。裂痕合上时，你在雪里听见了诸神的笑声——它们终于找到了你身上最像它们的东西。',
      kislev: '有人留下了。北方人欠雪一条命，现在还了。你往南走，箭袋里还剩两支箭。',
      highelf: '你让一个短命的人类替你完成了精灵的仪式。白塔不会原谅你。但你活了下来，而裂痕合上了。',
      cathay: '有人留在了裂痕前。你带着他的骨灰回震旦，船过南洋时，海面亮了一夜。',
    },
    crown2: {
      empire: '你戴上王冠，命令裂痕关闭。它照做了。你回到白蜡堡，人们叫你“守夜人”。只有你知道，王冠一直在数城里有多少活人。',
      bretonnia: '你戴上王冠的那一刻，湖中女士的祷词在你脑中碎成了灰。裂痕关了。你成了巴托尼亚最受尊敬的领主，也成了最不敢照镜子的人。',
      chaos: '诸神终于满意了。你关上了它们的一扇门，然后打开了另一扇——在你自己的胸口。灰港、白蜡堡、黑石隘口，都成了你的。',
      kislev: '王冠让你活了下来，也让你再也听不见风雪。你回到北方，村庄里的人说你不像活人。你说得对。',
      highelf: '你戴上人类的混沌遗物，只为关上那道门。门关上了。三百年后，另一位精灵会来杀你，而你会笑着把剑递给她。',
      cathay: '你戴上王冠，裂痕闭合。震旦的使团在港口等了你三天，然后起锚离开。',
    },
    flee2: {
      empire: '你往南走，走了三天三夜。第四天，北方的天空变成了黑色。后来人们把那片地方叫作“没有早晨的隘口”。',
      bretonnia: '你背对裂痕离开。骑士的誓言碎在雪里。此后每到夜里，你都会梦见一扇开着的门，和门后叫你名字的声音。',
      chaos: '你转身走了。诸神没有拦你，因为它们知道你会回来。裂痕在身后张开，像一张等着喂食的嘴。',
      kislev: '你回到基斯里夫，把北方的事讲给炉火听。第二年冬天，雪里开始出现不该出现的脚印。',
      highelf: '你放弃了封印，回到奥苏安。贤者没有惩罚你，只是把你的名字从记录里划掉了。你活得很久，久到足够听见世界慢慢变黑。',
      cathay: '你回到震旦，把裂痕的事报告给龙帝。长城加高了三丈，但你知道那不够。',
    },
    dark: {
      empire: '裂痕吞掉了高台、山谷和半个白蜡堡。帝国在北境画了一条新的边界，边界以北不再有村庄。',
      bretonnia: '你没能合上它。湖中女士的蓝色火焰在雪里烧了一夜，然后熄了。巴托尼亚的骑士们后来在北境立了一块无字碑。',
      chaos: '门开了。诸神从门后走进来，像回家一样自然。你站在雪里，听见它们叫你的名字——这一次，你没有拒绝。',
      kislev: '裂痕吞掉了隘口。基斯里夫的冬天变得更长，雪里开始长出黑色的花。你活了下来，但再也没有回过北方。',
      highelf: '你算错了一个音节。门开了。白塔的预言里没有这一页，因为写预言的人也没能活下来。',
      cathay: '裂痕吞掉隘口那夜，震旦的星象师看见了。他们开始在长城上烧狼烟，一直烧到今天。',
    }
  };

  var COMP_LINES = {
    agnes: {
      high: '阿格尼丝在灰港重建了礼拜堂。每年冬天，她都会在窗台上留一盏灯。',
      mid: '阿格尼丝回了灰港。她没问你怎么活下来的，只是给你包扎了最后一道伤口。'
    },
    grom: {
      high: '格罗姆用你分给他的钱买下了一间酒馆，取名“铁牙”。他说你随时可以来喝免费的酒。',
      mid: '格罗姆去了南方，继续接佣兵的活。他偶尔会托人捎来一瓶劣质伏特加。'
    },
    hilda: {
      high: '希尔达留在了白蜡堡，教民兵怎么在雪里走路。她的箭袋里终于又有了三支箭。',
      mid: '希尔达回了基斯里夫。她说雪会记得你，虽然雪从来不说。'
    },
    edric: {
      high: '埃德里克活了下来。他长高了，盔甲也合身了。他成了白蜡堡最年轻的守夜人队长。',
      mid: '埃德里克留在了白蜡堡。每年新兵入伍，他都会讲一个外乡人的故事。'
    },
    qingheng: {
      high: '青蘅回了玉龙号，把鹤铳擦得比从前更亮。每年船到灰港，她都会在码头多站一个时辰。',
      mid: '青蘅跟着玉龙号回了震旦。她没写信，只托人捎来一只新磨的准星。'
    }
  };

  function companionLines(state) {
    var lines = [];
    (state.party || []).forEach(function (id) {
      var n = state.npcs && state.npcs[id];
      var L = COMP_LINES[id];
      if (!n || !L) return;
      lines.push(n.affinity >= 70 ? L.high : L.mid);
    });
    return lines;
  }

  function finalText(state, key) {
    var arr = [EPILOGUE2[key][state.raceId] || EPILOGUE2[key].empire];
    if (key === 'sacrifice' || key === 'crown2' || key === 'dark') return arr;
    var comp = companionLines(state);
    if (comp.length) arr = arr.concat([''], comp);
    return arr;
  }

  scenes.ending_dawn = {
    act: 6, title: '结局 · 破晓', ending: true,
    text: function (state) {
      return [
        '裂痕合上时，声音像一扇很重的门被关上。',
        '雪停了。东方的天空第一次露出不是铁灰色的颜色。'
      ].concat(finalText(state, 'dawn'), [''], summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_sacrifice = {
    act: 6, title: '结局 · 留下的人', ending: true,
    text: function (state) {
      return [
        '有人留在了裂痕前。',
        '门关上时，你听见了一声很轻的叹息。'
      ].concat(finalText(state, 'sacrifice'), [''], summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_crown2 = {
    act: 6, title: '结局 · 第二顶冠', ending: true,
    text: function (state) {
      return [
        '王冠贴合你的额头，像等了很久。',
        '裂痕在你脚下闭合，温顺得像一条狗。'
      ].concat(finalText(state, 'crown2'), [''], summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_flee2 = {
    act: 6, title: '结局 · 没有早晨的隘口', ending: true,
    text: function (state) {
      return [
        '你往南走，没有回头。',
        '身后的天空慢慢变黑。'
      ].concat(finalText(state, 'flee2'), [''], summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  scenes.ending_dark = {
    act: 6, title: '结局 · 门', ending: true,
    text: function (state) {
      return [
        '裂痕张开了。',
        '你没有听见尖叫——你听见的是欢呼。'
      ].concat(finalText(state, 'dark'), [''], summary(state));
    },
    choices: function () { return [{ label: '完成故事', action: 'finish' }]; }
  };

  /* ---------------------------- NPC 个人任务 ---------------------------- */
  scenes.npcq_qingheng = {
    act: 1, title: '鹤铳的准星',
    text: function () {
      return [
        '青蘅在断桨酒馆后巷等你，鹤铳拆成两半放在膝上。',
        '“准星在追独眼骆的时候磕坏了。”她说，“当铺里有一只旧的。陪我去赎。”',
        '她顿了顿，又补了一句：“不白让你帮忙。以后我替你看着背后。”'
      ];
    },
    choices: function (state) {
      var c = [];
      c.push({
        label: '花 10 银币赎回准星', hint: '花费 10 银币', time: 2,
        show: function (s) { return s.gold >= 10; },
        consequence: '花费 10 银币 · 青蘅好感 +20',
        effects: function (s) {
          s.gold -= 10;
          s.npcs.qingheng.questDone = true;
          R.addAffinity(s, 'qingheng', 20);
          s.skills.ranged.adv += 5;
          s.skills.ranged.trained = true;
          addXp(s, 20);
          return '当铺老板接过银币，把准星推过来。青蘅当场装好，拉了一下枪机。';
        },
        goto: 'act1_hub'
      });
      c.push({
        label: '用震旦话压价', hint: '说服 · 困难',
        check: {
          skill: 'persuade', difficulty: -10, title: '当铺',
          success: {
            text: ['你用震旦话和老板聊了几句茶叶行情。他听得半懂，最后只收了五枚银币。', '青蘅把准星装回鹤铳，嘴角动了一下。'],
            goto: 'act1_hub',
            effects: function (s) {
              s.gold -= 5;
              s.npcs.qingheng.questDone = true;
              R.addAffinity(s, 'qingheng', 20);
              s.skills.ranged.adv += 5;
              s.skills.ranged.trained = true;
              addXp(s, 20);
            }
          },
          failure: {
            text: ['老板听不懂你的话，但看懂了你的刀。他叫来两个看场子的。'],
            goto: 'npcq_qingheng_fight',
            effects: function (s) { s.npcs.qingheng.questDone = true; }
          }
        }
      });
      c.push({
        label: '从后库把准星“拿”回来', hint: '隐匿 · 困难',
        check: {
          skill: 'stealth', difficulty: -10, title: '后库',
          success: {
            text: ['你从后窗翻进库房，在一堆旧铜器里找到那只准星。', '青蘅在巷口接住你扔下来的小包，什么也没问。'],
            goto: 'act1_hub',
            effects: function (s) {
              s.npcs.qingheng.questDone = true;
              R.addAffinity(s, 'qingheng', 20);
              s.skills.ranged.adv += 5;
              s.skills.ranged.trained = true;
              addXp(s, 20);
            }
          },
          failure: {
            text: ['你碰倒了一摞铜壶。后库的门开了，两个看场子的提着棍子。'],
            goto: 'npcq_qingheng_fight',
            effects: function (s) { s.npcs.qingheng.questDone = true; }
          }
        }
      });
      c.push({ label: '现在不是时候', goto: 'act1_hub', time: 1 });
      return c;
    }
  };

  scenes.npcq_qingheng_fight = {
    act: 1, title: '当铺后巷',
    text: function () {
      return ['两个看场子的堵住巷口。青蘅把半拆的鹤铳往肩上一架。', '“准星还没装。”她说，“你顶前面。”'];
    },
    choices: function () {
      return [{
        label: '迎战', time: 2,
        combat: {
          groups: [{ key: 'thug', count: 2 }],
          intro: '看场子的抡起短棍。',
          win: 'npcq_qingheng_win', lose: 'ending_death', flee: 'act1_hub'
        }
      }];
    }
  };

  scenes.npcq_qingheng_win = {
    act: 1, title: '当铺后巷',
    text: function () {
      return ['两个看场子的躺在墙根。青蘅从柜台底下摸出准星，装回鹤铳。', '“还行。”她说。这大概是她能给出的最高评价。'];
    },
    choices: function () {
      return [{
        label: '回街上', goto: 'act1_hub',
        effects: function (s) {
          s.npcs.qingheng.questDone = true;
          R.addAffinity(s, 'qingheng', 20);
          s.skills.ranged.adv += 5;
          s.skills.ranged.trained = true;
          addXp(s, 25);
        }
      }];
    }
  };

  scenes.npcq_agnes = {
    act: 4, title: '病房',
    text: function () {
      return [
        '白蜡堡的礼拜堂里躺满了伤员。阿格尼丝一个人照顾三十个人，手上全是药草和血。',
        '她看见你，把一个水罐递过来：“别站着。帮忙。”'
      ];
    },
    choices: function () {
      return [
        {
          label: '留下来帮她处理伤口', hint: '医疗 · 困难',
          check: {
            skill: 'heal', difficulty: -10, title: '病房',
            success: {
              text: ['你按她教的步骤清洗、缝合、包扎。到天亮时，最重的三个人都稳住了。', '阿格尼丝洗了手，第一次认真看你。', '“你比我想的更有用。”'],
              goto: 'act4_hub',
              effects: function (s) {
                s.npcs.agnes.questDone = true;
                R.addAffinity(s, 'agnes', 20);
                R.addItem(s, 'potion', 1);
                addXp(s, 25);
              }
            },
            failure: {
              text: ['你缝错了一针。伤员惨叫，阿格尼丝把你推到一边。', '但她没有赶你走，只是说：“下一次，手要稳。”'],
              goto: 'act4_hub',
              effects: function (s) { s.npcs.agnes.questDone = true; R.addAffinity(s, 'agnes', 5); }
            }
          }
        },
        { label: '离开', goto: 'act4_hub' }
      ];
    }
  };

  scenes.npcq_grom = {
    act: 4, title: '旧债',
    text: function () {
      return [
        '格罗姆被三个人堵在军营后墙。他们穿着灰港的旧皮甲，为首的那个手里转着一把刀。',
        '“铁牙，欠债还钱。”',
        '格罗姆看见你，咧嘴笑了：“你来晚了。不过正好。”'
      ];
    },
    choices: function () {
      return [{
        label: '站到他身边', combat: {
          groups: [{ key: 'thug', count: 3 }],
          intro: '三个人同时拔刀。',
          win: 'npcq_grom_win', lose: 'act4_hub', flee: 'act4_hub'
        }
      }, { label: '不蹚这浑水', goto: 'act4_hub' }];
    }
  };

  scenes.npcq_grom_win = {
    act: 4, title: '旧债',
    text: function () {
      return ['三个人躺在雪里哼哼。格罗姆从为首那个的腰带上扯下钱袋，掂了掂，分了一半给你。', '“债清了。”他说，“现在轮到我还你的人情。”'];
    },
    choices: function () {
      return [{
        label: '收下', goto: 'act4_hub',
        effects: function (s) {
          s.npcs.grom.questDone = true;
          R.addAffinity(s, 'grom', 25);
          s.gold += 15; addXp(s, 25);
        }
      }];
    }
  };

  scenes.npcq_hilda = {
    act: 4, title: '雪线',
    text: function () {
      return [
        '希尔达在城墙外磨箭头。她看见你，把一支断箭递过来。',
        '“我妹妹的。”她说，“她去年跟商队北上，没回来。”',
        '“帮我找到她。或者找到她的箭。”'
      ];
    },
    choices: function () {
      return [
        {
          label: '陪她去雪线找', hint: '生存 · 困难',
          check: {
            skill: 'survival', difficulty: -10, title: '雪线',
            success: {
              text: ['你们在背风坡找到了一截断箭和一串向北的脚印。', '希尔达蹲下去，把断箭收进箭袋。', '“她没死。”她说，“她被抓走了。”', '她站起来时，眼神不一样了。'],
              goto: 'act4_hub',
              effects: function (s) {
                s.npcs.hilda.questDone = true;
                R.addAffinity(s, 'hilda', 25);
                R.addItem(s, 'potion', 1);
                addXp(s, 30);
              }
            },
            failure: {
              text: ['风雪太大。你们走了半天，又绕回了原地。', '希尔达什么也没说，但回城的路上，她走在你前面半步。'],
              goto: 'act4_hub',
              effects: function (s) { s.npcs.hilda.questDone = true; R.addAffinity(s, 'hilda', 8); }
            }
          }
        },
        { label: '现在不是时候', goto: 'act4_hub' }
      ];
    }
  };

  scenes.npcq_edric = {
    act: 4, title: '第一次守夜',
    text: function () {
      return [
        '埃德里克被安排在北墙最远的一段守夜。他握着矛，手在抖。',
        '“我不怕。”他说。他说得太快了。',
        '远处传来一声狼嚎。'
      ];
    },
    choices: function () {
      return [
        {
          label: '陪他站完这一班', hint: '意志 · 标准',
          check: {
            skill: null, char: 'wp', difficulty: 0, title: '守夜',
            success: {
              text: ['你靠在垛口上，给他讲灰港的事。讲着讲着，他的手不抖了。', '天快亮时，他说：“下次我一个人也能站。”', '你相信他。'],
              goto: 'act4_hub',
              effects: function (s) {
                s.npcs.edric.questDone = true;
                R.addAffinity(s, 'edric', 25);
                s.maxWounds += 2; s.wounds += 2;
                addXp(s, 25);
              }
            },
            failure: {
              text: ['你打了个盹。醒来时，埃德里克正盯着北方的黑暗，矛尖对着一个并不存在的人影。', '你拍了拍他的肩。他吓了一跳，但很快站直了。'],
              goto: 'act4_hub',
              effects: function (s) { s.npcs.edric.questDone = true; R.addAffinity(s, 'edric', 8); }
            }
          }
        },
        { label: '让他自己面对', goto: 'act4_hub' }
      ];
    }
  };

  var EVENTS = [
    function pickpocket(state) {
      var t = R.test(state, { skill: 'perception', label: '察觉扒手', difficulty: 0 });
      if (t.success) { state.gold += 4; return { title: '街角扒手', text: ['一个孩子撞进你怀里，手已经摸到你的钱袋。', '你抓住他的手腕。他挣了两下，把刚偷来的几枚银币丢在地上跑了。', '你捡起银币，多了 4 枚。'] }; }
      var lose = Math.min(state.gold, 5);
      state.gold -= lose;
      return { title: '街角扒手', text: ['一个孩子撞进你怀里，等你回过神，钱袋轻了。', '你损失了 ' + lose + ' 枚银币。', '灰港的孩子跑得比老鼠还快。'] };
    },
    function drunk(state) {
      var t = R.test(state, { skill: 'intimidate', label: '威吓醉汉', difficulty: 0 });
      if (t.success) { addXp(state, 10); return { title: '醉汉', text: ['三个醉汉堵住巷口，要你留下买路钱。', '你往前一步，盯着领头那个。他看了看你腰间的武器，拉着同伴走了。', '你摇摇头，继续赶路。'] }; }
      state.wounds = Math.max(1, state.wounds - 2);
      return { title: '醉汉', text: ['三个醉汉堵住巷口，嘴里不干不净。', '你不想惹事，但他们显然想。推搡中你挨了一拳，损失 2 点伤口。', '最后他们骂骂咧咧地走了。'] };
    },
    function doctor(state) {
      var heal = Math.floor(state.maxWounds * 0.3);
      state.wounds = Math.min(state.maxWounds, state.wounds + heal);
      return { title: '瘟疫医生', text: ['一个戴鸟嘴面具的医生在街边摆摊。', '他看了看你的伤口，摇头，然后塞给你一小瓶发黑的药水。', '“不要钱。”他说，“你看起来比我还需要它。”你喝下去，恢复 ' + heal + ' 点伤口。'] };
    },
    function gambler(state) {
      if (state.gold < 3) return { title: '赌局', text: ['巷子里有人掷骰子赌钱。你摸了摸空钱袋，站了一会儿就走了。'] };
      var t = R.test(state, { char: 'int', label: '看穿赌局', difficulty: -10 });
      if (t.success) { state.gold += 6; return { title: '赌局', text: ['你看出庄家的骰子灌了铅。', '你没拆穿，只是押了三把，赢走 6 枚银币。', '庄家的脸色很难看。'] }; }
      state.gold -= 3;
      return { title: '赌局', text: ['你押了三把，输了三把。', '庄家笑着收走你的 3 枚银币。你怀疑骰子有问题，但巷子里已经没人了。'] };
    },
    function beggar(state) {
      var t = R.test(state, { skill: 'intuition', label: '直觉', difficulty: 0 });
      if (t.success) {
        state.fortune = Math.min(state.maxFate, state.fortune + 1);
        return { title: '乞丐', text: ['一个瞎眼乞丐拦住你，说你的影子“太长”。', '你给了他两枚铜板。他抓住你的手，说了一句听不懂的话。', '你走出很远，才发现手里的伤口不疼了。（命运点 +1）'] };
      }
      state.wounds = Math.max(1, state.wounds - 1);
      return { title: '乞丐', text: ['一个瞎眼乞丐拦住你，你绕开他。', '他在你背后啐了一口，骂了句什么。你回头时，他已经不见了。'] };
    },
    function witchhunter(state) {
      if (state.corruption >= 2) {
        state.wounds = Math.max(1, state.wounds - 4);
        return { title: '猎巫人', text: ['一个戴宽檐帽的男人在街口拦下你，手里拎着一根烧红的铁条。', '“你身上有味道。”他凑近闻了闻。', '你后退，他笑了：“这次算了。下次见面，我请你喝茶。”你离开时背脊发凉。'] };
      }
      return { title: '猎巫人', text: ['一个戴宽檐帽的男人正在盘问路人。', '他看了你一眼，目光在你的武器上停了停，然后移开。', '“最近别走夜路。”他说，“灰港不干净。”'] };
    },
    function shrine(state) {
      var t = R.test(state, { skill: 'lore', label: '辨认神龛', difficulty: 0 });
      if (t.success) { state.fortune = Math.min(state.maxFate, state.fortune + 1); return { title: '路边神龛', text: ['你在墙角发现一座被雨淋坏的小神龛。', '你认出那是旅人之神的手印，便按规矩放了一枚铜板。', '起身时，你觉得脚步轻了一些。（命运点 +1）'] }; }
      return { title: '路边神龛', text: ['你在墙角发现一座被雨淋坏的小神龛。', '神像的脸已经看不清了。你站了一会儿，继续赶路。'] };
    },
    function urchin(state) {
      if (state.gold < 2) return { title: '报童', text: ['一个报童向你兜售消息，你摸了摸钱袋，摇了摇头。', '他在你身后喊：“余烬之手！余烬之手！”'] };
      state.gold -= 2;
      addClue(state, 'ashes');
      return { title: '报童', text: ['一个报童拽住你的袖子：“先生，两个铜板，一条命的消息。”', '你给了他钱。他压低声音：“三号码头，今晚有货。灰袍人给的錢最多。”'] };
    },
    function storm(state) {
      var t = R.test(state, { skill: 'survival', label: '避雨', difficulty: 0 });
      if (t.success) return { title: '暴雨', text: ['暴雨来得毫无预兆。', '你躲进一间废弃的货仓，生起火，烘干衣服。', '雨停时，你睡了一小会儿，精神好了些。'] };
      state.wounds = Math.max(1, state.wounds - 2);
      return { title: '暴雨', text: ['暴雨来得毫无预兆。', '你找不到避雨的地方，在雨里走了半个钟头。', '等你回到街上，手指已经冻得发僵，损失 2 点伤口。'] };
    },
    function corpse(state) {
      var t = R.test(state, { skill: 'perception', label: '搜查尸体', difficulty: 0 });
      if (t.success) { state.gold += 9; return { title: '巷中尸体', text: ['巷子深处躺着一具尸体，喉咙被割开，血还没干。', '你搜了他的口袋，找到 9 枚银币和一张撕碎的货单。', '货单上能认出“礼拜堂”三个字。'] }; }
      return { title: '巷中尸体', text: ['巷子深处躺着一具尸体，喉咙被割开。', '你翻了翻，什么也没有。远处传来脚步声，你快步离开。'] };
    }
  ];

  function wander(state) {
    state.flags.wanderCount = (state.flags.wanderCount || 0) + 1;
    var ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    var out = ev(state);
    state.log.push('遭遇：' + out.title);
    result(state, out.title, out.text, state.act >= 2 ? 'act2_hub' : 'act1_hub');
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* 引擎                                                                */
  /* ------------------------------------------------------------------ */
  function currentScene(state) { return scenes[state.sceneId] || scenes.intro; }

  function enter(state, id) {
    var sc = scenes[id];
    if (!sc) throw new Error('未知场景 ' + id);
    state.sceneId = id;
    if (sc.onEnter && !state.flags['on_' + id]) {
      state.flags['on_' + id] = true;
      sc.onEnter(state);
    }
    state.resultView = null;
    if (!sc.ending && state.wounds < 1) state.wounds = 1;
    state.log.push('【' + (sc.title || id) + '】');
    if (sc.act) state.act = sc.act;
    if (sc.ending) state.ended = true;
  }

  function text(state) {
    var sc = currentScene(state);
    var t = typeof sc.text === 'function' ? sc.text(state) : (sc.text || []);
    if (state.sceneId === 'result' && state.resultView && state.resultView.roll) {
      var r = state.resultView.roll;
      t = t.slice();
      t.push((r.success ? '◆ 检定成功' : '◆ 检定失败') + '：d100 = ' + r.roll + ' / 目标 ' + r.target + '（SL ' + r.sl + '）');
    }
    return t;
  }

  function choices(state) {
    var sc = currentScene(state);
    var list = typeof sc.choices === 'function' ? sc.choices(state) : (sc.choices || []);
    return list.map(function (c) {
      var o = Object.assign({}, c);
      if (typeof c.show === 'function') o.hidden = !c.show(state);
      return o;
    }).filter(function (c) { return !c.hidden; });
  }

  function doCheck(state, choice, index) {
    var cfg = choice.check;
    var t = R.test(state, { skill: cfg.skill, char: cfg.char, difficulty: cfg.difficulty, label: cfg.title });
    if (index !== undefined) {
      state.lastCheck = { sceneId: state.sceneId, index: index, failed: !t.success };
    }
    if (cfg.effects) cfg.effects(state);
    var branch = t.success ? cfg.success : cfg.failure;
    if (branch.effects) branch.effects(state);
    result(state, cfg.title, typeof branch.text === 'function' ? branch.text(state) : branch.text, branch.goto, t);
  }

  function choose(state, index) {
    var list = choices(state);
    var ch = list[index];
    if (!ch || ch.disabled) return { ok: false };
    if (ch.action === 'finish') return { ok: true, finish: true };
    if (ch.reroll) {
      if (state.fortune <= 0 || !state.lastCheck) return { ok: false };
      var lc = state.lastCheck;
      state.fortune -= 1;
      state.lastCheck = null;
      enter(state, lc.sceneId);
      return choose(state, lc.index);
    }
    var cost = ch.time !== undefined ? ch.time : (ch.check ? 2 : ch.combat ? 2 : 1);
    var applyEffect = ch.effect || ch.effects;
    if (applyEffect) {
      var msg = applyEffect(state);
      if (msg) state.lastMessage = msg;
      if (ch.stay) {
        tick(state, cost);
        return { ok: true, message: msg };
      }
    }
    if (ch.combat) {
      R.startCombat(state, ch.combat.groups, {
        intro: ch.combat.intro, winScene: ch.combat.win,
        loseScene: ch.combat.lose, fleeScene: ch.combat.flee,
        distance: ch.combat.distance || 'close'
      });
      if (ch.combat.prep && state.combat && !state.combat.over) ch.combat.prep(state, state.combat);
      if (state.combat) state.combat.timeCost = cost;
      if (state.combat && state.combat.over) {
        return { ok: true, combat: true, ended: state.combat.result };
      }
      state.mode = 'combat';
      return { ok: true, combat: true };
    }
    if (ch.check) {
      doCheck(state, ch, index);
      tick(state, cost);
      return { ok: true };
    }
    if (ch.goto) {
      var forced = tick(state, cost);
      if (!forced) enter(state, ch.goto);
      return { ok: true };
    }
    tick(state, cost);
    return { ok: true };
  }

  function onCombatEnd(state, res) {
    var c = state.combat;
    var target = null;
    if (res === 'victory') target = c.winScene;
    else if (res === 'defeat') target = c.loseScene || 'ending_death';
    else if (res === 'fled') target = c.fleeScene || 'act1_hub';
    var cost = c.timeCost || 2;
    state.combat = null;
    state.mode = 'story';
    if (res !== 'defeat') {
      R.advanceTime(state, cost);
      state.log.push('时间：' + R.timeLabel(state.clock));
      if (checkDeadlines(state)) return state.sceneId;
    }
    if (target) enter(state, target);
    return target;
  }

  G.content = {
    scenes: scenes, CLUES: CLUES, EVENTS: EVENTS,
    enter: enter, text: text, choices: choices, choose: choose,
    onCombatEnd: onCombatEnd, currentScene: currentScene, wander: wander,
    tick: tick, checkDeadlines: checkDeadlines, deadlineInfo: deadlineInfo
  };
})(typeof window !== 'undefined' ? window : globalThis);
