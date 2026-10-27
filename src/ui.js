/* 灰烬王冠 — 界面层 */
(function (root) {
  'use strict';
  var G = root.G = root.G || {};
  var R = G.rules, C = G.content, D = G.data;

  var UI = G.ui = {
    tab: 'adventure',
    create: { active: false, step: 0, raceId: null, careerId: null, name: '' },
    modal: null,
    toastTimer: null,
    diceTimer: null
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function st() { return G.game.state; }
  function $(id) { return document.getElementById(id); }
  function pct(a, b) { return Math.max(0, Math.min(100, Math.round(a / b * 100))); }
  function spendHours(s, hours) {
    R.advanceTime(s, hours);
    var forced = C.checkDeadlines(s);
    if (forced) UI.tab = 'adventure';
    return forced;
  }
  function actNames(n) { return ['序章', '第一章', '第二章', '第三章', '第四章', '第五章', '终章'][n] || ('第' + n + '章'); }

  /* ------------------------------------------------------------------ */
  /* 立绘（内联 SVG，无外部资源）                                         */
  /* ------------------------------------------------------------------ */
  var PORTRAITS = {
    empire: `<rect width="120" height="120" fill="#1b1712"/><circle cx="60" cy="54" r="46" fill="#8d2b2b" opacity=".16"/><path d="M8 120c4-26 25-36 52-36s48 10 52 36Z" fill="#4a1f1f"/><path d="M42 88 60 108 78 88" fill="#8d2b2b" opacity=".9"/><rect x="52" y="68" width="16" height="20" fill="#a9795b"/><ellipse cx="60" cy="52" rx="19" ry="23" fill="#d2a17d"/><path d="M41 46q4-18 19-18t19 18q-7-9-19-9t-19 9" fill="#5b402c"/><path d="M39 40q21-17 42 0v4q-21-10-42 0z" fill="#77766e"/><path d="M39 44h42" stroke="#57564f" stroke-width="2"/><path d="M49 51q4-3 8 0M63 51q4-3 8 0" fill="none" stroke="#3a2a1f" stroke-width="2"/><circle cx="53" cy="52" r="1.5" fill="#231710"/><circle cx="67" cy="52" r="1.5" fill="#231710"/><path d="M60 53l-2 9h4" fill="none" stroke="#b07d5e" stroke-width="1.6"/><path d="M54 68q6 4 12 0" fill="none" stroke="#7a4536" stroke-width="1.8"/><path d="M70 56l3 10" stroke="#8c4a3a" stroke-width="1.6"/><circle cx="60" cy="97" r="4" fill="#d8c39a" opacity=".5"/>`,
    bretonnia: `<rect width="120" height="120" fill="#161b22"/><circle cx="60" cy="54" r="46" fill="#2f5f8f" opacity=".2"/><path d="M10 120c4-28 24-36 50-36s46 8 50 36Z" fill="#1f3550"/><rect x="52" y="70" width="16" height="18" fill="#b98a68"/><ellipse cx="60" cy="56" rx="16" ry="20" fill="#c99773"/><path d="M39 50q0-24 21-26 21 2 21 26v14q-9 8-21 8t-21-8z" fill="#8b8f96"/><path d="M42 52h36" stroke="#2a2d33" stroke-width="4"/><path d="M58 38v14" stroke="#2a2d33" stroke-width="3"/><path d="M58 24q8-18 24-10-12 2-16 14" fill="#2f5f8f"/><path d="M46 96q14-12 28 0" fill="none" stroke="#d8c39a" stroke-width="2"/><path d="M60 90l-4 8h8z" fill="#d8c39a"/><path d="M54 70q6 3 12 0" fill="none" stroke="#7a4536" stroke-width="1.6"/>`,
    chaos: `<rect width="120" height="120" fill="#15110f"/><circle cx="60" cy="54" r="46" fill="#7a2a1e" opacity=".22"/><path d="M8 120c6-28 26-36 52-36s46 8 52 36Z" fill="#241c18"/><path d="M30 84q-2-58 30-62 32 4 30 62-14-12-30-12t-30 12z" fill="#2a211c"/><ellipse cx="60" cy="56" rx="15" ry="18" fill="#4a3a32"/><path d="M44 42q16-14 32 0v6q-16-9-32 0z" fill="#1c1512" opacity=".7"/><circle cx="54" cy="54" r="2.2" fill="#e05a2a"/><circle cx="66" cy="54" r="2.2" fill="#e05a2a"/><path d="M60 40v9M56 44h8" stroke="#c2573a" stroke-width="1.6"/><path d="M54 68q6 3 12 0" stroke="#2a1a14" stroke-width="2" fill="none"/><path d="M34 96q10-8 26-8t26 8" fill="none" stroke="#6a2a1e" stroke-width="2"/>`,
    kislev: `<rect width="120" height="120" fill="#13181a"/><circle cx="60" cy="54" r="46" fill="#3f6b6f" opacity=".22"/><path d="M8 120c6-28 26-38 52-38s46 10 52 38Z" fill="#27404a"/><path d="M32 92q10-14 28-14t28 14q-14 8-28 8t-28-8" fill="#7a6a58"/><rect x="52" y="68" width="16" height="20" fill="#b98a68"/><ellipse cx="60" cy="54" rx="18" ry="22" fill="#d2a17d"/><path d="M44 58q2 24 16 26 14-2 16-26-6 12-16 12t-16-12" fill="#6b4a33"/><path d="M35 45q-3-24 25-26 28 2 25 26v8q-25-10-50 0z" fill="#5a4a3d"/><path d="M35 45q25-12 50 0" stroke="#8a7a66" stroke-width="4" fill="none"/><circle cx="53" cy="52" r="2" fill="#7fb0c0"/><circle cx="67" cy="52" r="2" fill="#7fb0c0"/><path d="M56 64q4 2 8 0" fill="none" stroke="#4a2f22" stroke-width="2"/>`,
    highelf: `<rect width="120" height="120" fill="#121a1a"/><circle cx="60" cy="54" r="46" fill="#4f8f8a" opacity=".2"/><path d="M8 120c6-28 26-38 52-38s46 10 52 38Z" fill="#1f4a4a"/><rect x="53" y="68" width="14" height="20" fill="#c9a98a"/><ellipse cx="60" cy="52" rx="17" ry="22" fill="#e2c3a4"/><path d="M38 52q-4-30 22-32 26 2 22 32l4 40q-12-10-14-34 0-14-12-14t-12 14q-2 24-14 34z" fill="#d8c48a"/><path d="M41 50l-8-6 6 10M79 50l8-6-6 10" fill="#e2c3a4"/><path d="M44 36q16-8 32 0" stroke="#b9c6c9" stroke-width="2" fill="none"/><path d="M50 52q4-3 8 0M62 52q4-3 8 0" fill="none" stroke="#3a4a44" stroke-width="1.8"/><circle cx="54" cy="53" r="1.4" fill="#2f4a44"/><circle cx="66" cy="53" r="1.4" fill="#2f4a44"/><path d="M56 66q4 2 8 0" fill="none" stroke="#a86a58" stroke-width="1.6"/>`,
    cathay: `<rect width="120" height="120" fill="#111817"/><circle cx="60" cy="54" r="46" fill="#3f8f7a" opacity=".2"/><path d="M8 120c6-28 26-38 52-38s46 10 52 38Z" fill="#7a1f1f"/><path d="M28 120q4-26 32-30 28 4 32 30" fill="#2f6b5a"/><path d="M32 96q28-10 56 0" stroke="#c8a24a" stroke-width="2" fill="none"/><rect x="53" y="68" width="14" height="20" fill="#c99773"/><ellipse cx="60" cy="54" rx="18" ry="22" fill="#d6a26f"/><path d="M41 46q3-24 19-24t19 24q-7-10-19-10t-19 10" fill="#1a1512"/><circle cx="60" cy="20" r="7" fill="#1a1512"/><path d="M52 19h16" stroke="#c8a24a" stroke-width="2"/><path d="M43 38q17-7 34 0" stroke="#c8a24a" stroke-width="2" fill="none"/><path d="M49 52q4-2 8 0M63 52q4-2 8 0" stroke="#2a1c14" stroke-width="2" fill="none"/><circle cx="53" cy="54" r="1.5" fill="#1f140d"/><circle cx="67" cy="54" r="1.5" fill="#1f140d"/><path d="M60 56l-2 8h4" stroke="#b07d5e" stroke-width="1.5" fill="none"/><path d="M54 68q6 3 12 0" stroke="#7a4536" stroke-width="1.8" fill="none"/><path d="M48 64q-8 2-6 8M72 64q8 2 6 8" stroke="#2a1c14" stroke-width="1.5" fill="none"/><path d="M60 90l-6-8 6-4 6 4z" fill="#c8a24a" opacity=".8"/>`,
    qingheng: `<rect width="120" height="120" fill="#101615"/><circle cx="60" cy="54" r="46" fill="#4f8f8a" opacity=".2"/><path d="M96 112 62 44" stroke="#6b6a63" stroke-width="6"/><path d="M62 44 54 30" stroke="#8b8f96" stroke-width="4"/><path d="M8 120c6-28 26-38 52-38s46 10 52 38Z" fill="#2f4a3f"/><path d="M30 96q30-12 60 0" stroke="#c8a24a" stroke-width="1.6" fill="none"/><rect x="53" y="68" width="14" height="20" fill="#c99773"/><ellipse cx="60" cy="54" rx="17" ry="21" fill="#d6a26f"/><path d="M40 50q-3-28 20-30 23 2 20 30l4 30q-10-8-12-26 0-12-12-12t-12 12q-2 18-12 26z" fill="#1a1512"/><path d="M78 28q8 4 4 12" stroke="#4f8f7a" stroke-width="4" fill="none"/><path d="M48 28l14-6" stroke="#c8a24a" stroke-width="2"/><path d="M49 52q4-2 8 0M63 52q4-2 8 0" stroke="#2a1c14" stroke-width="2" fill="none"/><circle cx="53" cy="54" r="1.5" fill="#1f140d"/><circle cx="67" cy="54" r="1.5" fill="#1f140d"/><path d="M60 56l-2 8h4" stroke="#b07d5e" stroke-width="1.5" fill="none"/><path d="M54 68q6 2 12 0" stroke="#7a4536" stroke-width="1.8" fill="none"/>`,
    agnes: `<rect width="120" height="120" fill="#1a1712"/><circle cx="60" cy="54" r="46" fill="#c9b98a" opacity=".18"/><path d="M8 120c6-28 26-38 52-38s46 10 52 38Z" fill="#e6ddc8"/><path d="M28 84q-2-62 32-64 34 2 32 64-14-12-32-12t-32 12z" fill="#efe8d8"/><ellipse cx="60" cy="55" rx="14" ry="17" fill="#d9b394"/><path d="M46 40q-6 14-4 26M74 40q6 14 4 26" stroke="#b9b3a8" stroke-width="5" fill="none"/><path d="M52 54q3-2 6 0M62 54q3-2 6 0" fill="none" stroke="#6b4a3a" stroke-width="1.6"/><path d="M56 66q4 3 8 0" fill="none" stroke="#8a5a4a" stroke-width="1.6"/><circle cx="60" cy="95" r="5" fill="none" stroke="#b08d4a" stroke-width="1.6"/><path d="M60 90v10M55 95h10" stroke="#b08d4a" stroke-width="1.4"/>`,
    grom: `<rect width="120" height="120" fill="#171310"/><circle cx="60" cy="54" r="46" fill="#8a5a2a" opacity=".18"/><path d="M96 14 70 106" stroke="#6b4a2f" stroke-width="6"/><path d="M92 12l18 9-13 11-11-11z" fill="#8b8f96"/><path d="M8 120c6-28 26-38 52-38s46 10 52 38Z" fill="#3a2b22"/><rect x="52" y="68" width="16" height="20" fill="#a9795b"/><ellipse cx="60" cy="52" rx="20" ry="23" fill="#c08a63"/><path d="M41 44q4-20 19-20t19 20q-8-8-19-8t-19 8" fill="#7a4f36"/><path d="M48 36l7 24" stroke="#8c4a3a" stroke-width="2"/><path d="M44 62q2 16 16 18 14-2 16-18-6 10-16 10t-16-10" fill="#4a3427" opacity=".55"/><path d="M50 51q4-2 7 0M63 51q4-2 7 0" fill="none" stroke="#3a2518" stroke-width="2"/><circle cx="53" cy="52" r="1.6" fill="#24160f"/><circle cx="66" cy="52" r="1.6" fill="#24160f"/><path d="M56 68q4 2 8 0" fill="none" stroke="#5a3524" stroke-width="2"/>`,
    hilda: `<rect width="120" height="120" fill="#141812"/><circle cx="60" cy="54" r="46" fill="#4a6b3f" opacity=".2"/><path d="M16 106Q22 50 58 16" stroke="#6b4a2f" stroke-width="3" fill="none"/><path d="M58 16 40 104" stroke="#cfc3a8" stroke-width="1"/><path d="M8 120c6-28 26-38 52-38s46 10 52 38Z" fill="#2f3a2c"/><path d="M30 86q-2-60 30-64 32 4 30 64-14-14-30-14t-30 14z" fill="#3f4a3a"/><ellipse cx="60" cy="54" rx="16" ry="20" fill="#d2a17d"/><path d="M32 50q28-14 56 0" stroke="#6a6a52" stroke-width="5" fill="none"/><path d="M78 60q8 16 2 34" stroke="#8a6a3f" stroke-width="6" fill="none"/><circle cx="54" cy="53" r="1.6" fill="#3f5a33"/><circle cx="66" cy="53" r="1.6" fill="#3f5a33"/><path d="M56 66q4 2 8 0" fill="none" stroke="#8a5a4a" stroke-width="1.6"/>`,
    edric: `<rect width="120" height="120" fill="#15181c"/><circle cx="60" cy="54" r="46" fill="#5f6b7a" opacity=".2"/><path d="M8 120c6-30 26-38 52-38s46 8 52 38Z" fill="#4a4f55"/><path d="M18 120q8-26 42-30 34 4 42 30" fill="#5f666e"/><rect x="52" y="70" width="16" height="18" fill="#c9a17d"/><ellipse cx="60" cy="55" rx="17" ry="20" fill="#d6a982"/><path d="M40 44q0-21 20-21t20 21v8H40z" fill="#777b80"/><path d="M58 42v24" stroke="#5b5f64" stroke-width="4"/><path d="M51 54q3-2 6 0M63 54q3-2 6 0" fill="none" stroke="#3a2a1f" stroke-width="1.6"/><circle cx="54" cy="55" r="1.4" fill="#2a1d15"/><circle cx="66" cy="55" r="1.4" fill="#2a1d15"/><path d="M56 68q4-2 8 0" fill="none" stroke="#8a5a4a" stroke-width="1.6"/>`,
    priest: `<rect width="120" height="120" fill="#120f0d"/><circle cx="60" cy="54" r="46" fill="#c06a2a" opacity=".18"/><path d="M8 120c6-30 26-38 52-38s46 8 52 38Z" fill="#2b2620"/><path d="M30 84q-2-62 30-66 32 4 30 66-14-14-30-14t-30 14z" fill="#211b17"/><ellipse cx="60" cy="54" rx="15" ry="19" fill="#3a2f28"/><path d="M40 32 46 18 52 30 60 14 68 30 74 18 80 32" fill="none" stroke="#c08a4a" stroke-width="2.5"/><circle cx="54" cy="54" r="2.4" fill="#e0702a"/><circle cx="66" cy="54" r="2.4" fill="#e0702a"/><path d="M54 66h12" stroke="#1a1210" stroke-width="2"/><path d="M46 46l6 6-4 4" stroke="#c06a2a" opacity=".5" fill="none"/><circle cx="32" cy="40" r="1.5" fill="#e0702a" opacity=".5"/><circle cx="90" cy="34" r="1" fill="#e0702a" opacity=".4"/>`,
    lord: `<rect width="120" height="120" fill="#100d0b"/><circle cx="60" cy="54" r="46" fill="#a8792a" opacity=".16"/><path d="M6 120q8-34 54-36 46 2 54 36Z" fill="#2a2622"/><path d="M14 100l20-14 10 20-24 8zM106 100l-20-14-10 20 24 8z" fill="#4a4138"/><ellipse cx="60" cy="52" rx="17" ry="21" fill="#6b5a4a"/><path d="M40 34 46 16 54 32 60 10 66 32 74 16 80 34" fill="#8a6a2f" stroke="#2a1f12" stroke-width="1.5"/><circle cx="54" cy="53" r="3" fill="#e0702a"/><circle cx="66" cy="53" r="3" fill="#e0702a"/><path d="M50 70q10 8 20 0" stroke="#3a2a20" stroke-width="2" fill="none"/><path d="M44 40l8 10M76 40l-8 10" stroke="#c06a2a" opacity=".6" fill="none"/>`,
    chosen: `<rect width="120" height="120" fill="#13100e"/><circle cx="60" cy="54" r="46" fill="#7a2a1e" opacity=".2"/><path d="M8 120c6-30 26-38 52-38s46 8 52 38Z" fill="#302a26"/><path d="M40 38Q24 26 30 12q10 6 16 20M80 38Q96 26 90 12q-10 6-16 20" fill="#8a7a66"/><path d="M38 48q0-25 22-27 22 2 22 27v10q-10 8-22 8t-22-8z" fill="#56504a"/><path d="M46 52h28" stroke="#1a1512" stroke-width="4"/><circle cx="54" cy="53" r="2" fill="#d04a2a"/><circle cx="66" cy="53" r="2" fill="#d04a2a"/><path d="M50 72q10 6 20 0" stroke="#2a1a14" stroke-width="2" fill="none"/>`
  };
  function portrait(key, cls) {
    var body = PORTRAITS[key];
    if (!body) return '';
    return '<svg class="portrait ' + (cls || '') + '" viewBox="0 0 120 120" preserveAspectRatio="xMidYMin slice" aria-hidden="true">' + body + '</svg>';
  }
  UI.portrait = portrait;

  /* ------------------------------------------------------------------ */
  /* 渲染入口                                                            */
  /* ------------------------------------------------------------------ */
  UI.render = function () {
    var s = st();
    var screen = $('screen');
    if (!s) {
      screen.innerHTML = UI.create.active ? renderCreate() : renderTitle();
    } else if (s.ended) {
      screen.innerHTML = renderEnding(s);
    } else {
      screen.innerHTML = renderGame(s);
    }
    bindInputs();
    if (UI.modal) screen.insertAdjacentHTML('beforeend', renderModal());
    requestAnimationFrame(function () {
      var log = document.querySelector('.combat-log');
      if (log) log.scrollTop = log.scrollHeight;
    });
    if (G.game.state) G.game.state.lastMessage = null;
  };

  /* ------------------------------------------------------------------ */
  /* 标题页                                                              */
  /* ------------------------------------------------------------------ */
  function renderTitle() {
    var hasSave = G.game.hasSave();
    return '' +
      '<section class="card hero">' +
        '<svg class="crest" viewBox="0 0 64 40" aria-hidden="true">' +
          '<path d="M5 34 L9 9 L22 19 L32 3 L42 19 L55 9 L59 34 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
          '<path d="M5 34 H59" stroke="currentColor" stroke-width="1.6"/>' +
          '<circle cx="32" cy="12" r="2.2" fill="currentColor"/>' +
        '</svg>' +
        '<div class="eyebrow">Warhammer Fantasy · 文字跑团</div>' +
        '<h1>灰烬王冠</h1>' +
        '<div class="sub">A S H E N &nbsp; C R O W N</div>' +
        '<div class="hero-portraits">' + ['empire', 'bretonnia', 'chaos', 'kislev', 'highelf', 'cathay'].map(function (id) {
          return '<div class="hero-portrait">' + portrait(id) + '</div>';
        }).join('') + '</div>' +
        '<p class="lede">灰港的雨下了七天。城北的旧礼拜堂里，有人在数第七个祭品。<br>' +
        '你带着自己的理由走进这座城——然后一路向北，走进混沌战帮的营地。</p>' +
        '<div class="actions">' +
          (hasSave ? '<button class="btn primary" data-act="continue">继续上次的故事</button>' : '') +
          '<button class="btn ' + (hasSave ? '' : 'primary') + '" data-act="new-game">开始新的故事</button>' +
          '<button class="btn ghost" data-act="help">规则说明</button>' +
        '</div>' +
        '<div class="hero-foot">' +
          '<span><i>◆</i> 6 个种族 · 18 种职业 · 5 名同伴</span>' +
          '<span><i>◆</i> d100 检定 · 部位命中 · 同伴参战</span>' +
          '<span><i>◆</i> 五章战役 · 完全离线</span>' +
        '</div>' +
      '</section>' +
      '<p class="muted small" style="text-align:center;margin-top:18px">本作为中古战锤背景的同人文字游戏，所有文本均为原创。</p>';
  }

  /* ------------------------------------------------------------------ */
  /* 创建角色                                                            */
  /* ------------------------------------------------------------------ */
  function renderCreate() {
    var c = UI.create;
    if (c.step === 0) {
      return '<section class="card" style="padding:clamp(20px,4vw,34px)">' +
        '<div class="create-head"><h2>选择你的血脉</h2>' + steps(1) + '</div>' +
        '<p class="muted small" style="margin-top:-8px">每个种族都有独特的属性修正、天赋与初始命运点。</p>' +
        '<div class="grid races" style="margin-top:16px">' +
        D.RACES.map(function (r) {
          return '<button class="pick" data-act="pick-race" data-id="' + r.id + '">' +
            '<div class="race-portrait">' + portrait(r.id) + '</div>' +
            '<span class="tag">' + esc(r.tag) + '</span>' +
            '<h3>' + esc(r.name) + '</h3>' +
            '<p>' + esc(r.blurb) + '</p>' +
            '<div class="traits">' + r.traits.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
          '</button>';
        }).join('') +
        '</div>' +
        '<div class="actions" style="display:flex;gap:8px;margin-top:20px">' +
          '<button class="btn ghost" data-act="back-title">返回</button>' +
        '</div>' +
      '</section>';
    }
    if (c.step === 1) {
      var race = D.RACES.filter(function (r) { return r.id === c.raceId; })[0];
      var careers = D.CAREERS.filter(function (x) { return x.race === c.raceId; });
      return '<section class="card" style="padding:clamp(20px,4vw,34px)">' +
        '<div class="create-head"><h2>' + esc(race.name) + ' · 选择职业</h2>' + steps(2) + '</div>' +
        '<p class="muted small" style="margin-top:-8px">' + esc(race.blurb) + '</p>' +
        '<div class="grid races" style="margin-top:16px">' +
        careers.map(function (x) {
          return '<button class="pick" data-act="pick-career" data-id="' + x.id + '">' +
            '<span class="tag">' + esc(x.name) + '</span>' +
            '<h3 style="font-size:17px;margin-top:6px">' + esc(x.blurb) + '</h3>' +
            '<p>' + esc(x.kit) + '</p>' +
            '<div class="traits">' +
              Object.keys(x.mods || {}).map(function (k) { return '<span class="chip gold">' + G.charName(k).slice(0, 2) + ' +' + x.mods[k] + '</span>'; }).join('') +
              '<span class="chip">命运 ' + race.fate + '</span>' +
            '</div>' +
          '</button>';
        }).join('') +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:20px">' +
          '<button class="btn ghost" data-act="create-back">返回</button>' +
        '</div>' +
      '</section>';
    }
    var race2 = D.RACES.filter(function (r) { return r.id === c.raceId; })[0];
    var career2 = D.CAREERS.filter(function (x) { return x.id === c.careerId; })[0];
    var preview = R.createCharacter({ raceId: c.raceId, careerId: c.careerId, name: '预演' });
    return '<section class="card" style="padding:clamp(20px,4vw,34px)">' +
      '<div class="create-head"><h2>最后一步</h2>' + steps(3) + '</div>' +
      '<p class="muted small" style="margin-top:-8px">' + esc(race2.name) + ' · ' + esc(career2.name) + '。给你的角色起个名字。</p>' +
      '<div class="name-row"><input type="text" id="name-input" maxlength="16" placeholder="输入姓名，或留空由命运决定" value="' + esc(c.name) + '"></div>' +
      '<div class="preview">' +
        D.CHARS.map(function (ch) {
          return '<div><span>' + ch.name + '</span><b>' + preview.stats[ch.id] + '</b></div>';
        }).join('') +
        '<div><span>伤口</span><b>' + preview.maxWounds + '</b></div>' +
        '<div><span>命运</span><b>' + preview.fate + '</b></div>' +
        '<div><span>银币</span><b>' + preview.gold + '</b></div>' +
      '</div>' +
      '<div class="tag-list" style="margin-top:14px">' +
        preview.talents.map(function (t) { return '<span class="chip gold">' + esc(D.TALENTS[t].name) + '</span>'; }).join('') +
        '<span class="chip">' + esc(career2.kit) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:24px;flex-wrap:wrap">' +
        '<button class="btn primary" data-act="create-start">踏入灰港</button>' +
        '<button class="btn ghost" data-act="create-back">返回</button>' +
      '</div>' +
    '</section>';
  }

  function steps(n) {
    var names = ['血脉', '职业', '姓名'];
    return '<div class="steps">' + names.map(function (x, i) {
      return (i + 1 === n ? '<b>' + (i + 1) + '. ' + x + '</b>' : '<span>' + (i + 1) + '. ' + x + '</span>');
    }).join(' <span>/</span> ') + '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* 游戏主界面                                                          */
  /* ------------------------------------------------------------------ */
  function renderGame(s) {
    return '<div class="game">' + renderSheet(s) + '<div class="stage">' + renderTabs(s) + renderStage(s) + '</div></div>';
  }

  function renderSheet(s) {
    var race = D.RACES.filter(function (r) { return r.id === s.raceId; })[0];
    var career = D.CAREERS.filter(function (c) { return c.id === s.careerId; })[0];
    var dots = '';
    for (var i = 0; i < s.maxFate; i++) dots += '<i class="' + (i < s.fate ? 'on' : '') + '"></i>';
    return '' +
      '<aside class="card sheet">' +
        '<div class="scene-meta">' + (race ? race.name : '') + '</div>' +
        '<div class="sheet-portrait">' + portrait(s.raceId) + '</div>' +
        '<h2 class="sheet-name">' + esc(s.name) + '</h2>' +
        '<div class="sheet-sub">' + esc(career ? career.name : '') + ' · Lv.' + (s.rank || 1) + ' ' + esc(s.title || '') + ' · ' + actNames(s.act) + '</div>' +
        (function () {
          var d = C.deadlineInfo(s);
          var left = d ? d.left : null;
          var cls = left !== null && left <= 12 ? ' red' : '';
          return '<div class="clock-row">' +
            '<span>⏳ ' + G.rules.timeLabel(s.clock) + '</span>' +
            (d ? '<span class="deadline' + cls + '">' + esc(d.label) + ' ' + (left > 0 ? '剩 ' + left + 'h' : '已超时') + '</span>' : '') +
          '</div>';
        })() +
        '<div class="woundbar"><i style="width:' + pct(s.wounds, s.maxWounds) + '%"></i></div>' +
        '<div class="sheet-row"><span>伤口</span><span>' + s.wounds + ' / ' + s.maxWounds + '</span></div>' +
        '<div class="dot-row">命运 <span class="dots">' + dots + '</span> <span class="muted">' + s.fate + '/' + s.maxFate + '</span></div>' +
        '<div class="sheet-row" style="margin-top:6px"><span>经验</span><span>' + s.xp + ' XP</span></div>' +
        '<div class="sheet-row"><span>银币</span><span>' + s.gold + '</span></div>' +
        '<div class="stats-mini">' +
          D.CHARS.map(function (c) { return '<div><b>' + s.stats[c.id] + '</b><span>' + c.short + '</span></div>'; }).join('') +
        '</div>' +
        '<div class="sheet-meta">' +
          '<span class="chip">线索 ' + s.clues.length + '</span>' +
          '<span class="chip gold">身份 ' + esc(R.statusName(s.status || 2)) + '</span>' +
          '<span class="chip">功勋 ' + R.renown(s) + '/3</span>' +
          '<span class="chip">命运点 ' + s.fortune + '</span>' +
          '<span class="chip">同伴 ' + (s.party || []).length + '/2</span>' +
          (s.corruption > 0 ? '<span class="chip red">腐化 ' + s.corruption + '</span>' : '') +
          (s.fatigue > 0 ? '<span class="chip red">疲惫 -' + (s.fatigue * 10) + '</span>' : '') +
          (s.conditions || []).map(function (c) { return '<span class="chip red">' + esc(c.name) + '</span>'; }).join('') +
        '</div>' +
        (s.mode === 'combat' ? '<div class="roll" style="margin-top:14px">战斗中 · 存档暂停</div>' : '') +
      '</aside>';
  }

  function renderTabs(s) {
    var tabs = [['adventure', '冒险'], ['character', '角色'], ['companions', '同伴'], ['inventory', '行囊'], ['journal', '日志'], ['system', '系统']];
    return '<div class="tabs">' + tabs.map(function (t) {
      return '<button class="tab ' + (UI.tab === t[0] ? 'on' : '') + '" data-act="tab" data-id="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }

  function renderStage(s) {
    if (UI.tab === 'character') return renderCharacter(s);
    if (UI.tab === 'companions') return renderCompanions(s);
    if (UI.tab === 'inventory') return renderInventory(s);
    if (UI.tab === 'journal') return renderJournal(s);
    if (UI.tab === 'system') return renderSystem(s);
    return s.mode === 'combat' && s.combat ? renderCombat(s) : renderScene(s);
  }

  /* ---------------------------- 场景 ---------------------------- */
  function renderScene(s) {
    var sc = C.currentScene(s);
    var paras = C.text(s);
    var choices = C.choices(s);
    var rv = s.resultView;
    var title = (s.sceneId === 'result' && rv) ? rv.title : (sc.title || '');
    return '<article class="card scene">' +
      '<div class="scene-meta">' + actNames(s.act) + ' · ' + esc(sc.title || '') + '</div>' +
      '<h2>' + esc(title) + '</h2>' +
      paras.map(function (p) { return p ? '<p>' + esc(p) + '</p>' : '<p class="muted">　</p>'; }).join('') +
      (rv && rv.roll ? '<div class="roll ' + (rv.roll.success ? '' : 'fail') + '">' +
        (rv.roll.success ? '检定成功' : '检定失败') + '：d100 = <b>' + rv.roll.roll + '</b> / 目标 ' + rv.roll.target +
        '　SL ' + (rv.roll.sl >= 0 ? '+' : '') + rv.roll.sl +
        (rv.roll.crit ? '　<span class="chip gold">双数</span>' : '') + '</div>' : '') +
      '<hr class="divider">' +
      '<div class="choices">' +
        choices.map(function (c, i) {
          var cost = c.time !== undefined ? c.time : (c.check ? 2 : c.combat ? 2 : 1);
          var cons = c.consequence || (c.combat ? '可能受伤' : c.check ? '失败有代价' : c.stay ? '原地停留' : (c.goto && c.goto.indexOf('ending') === 0) ? '走向结局' : '推进剧情');
          var sub = [];
          if (c.hint) sub.push(c.hint);
          if (!c.reroll && cost > 0) sub.push('⏳' + cost + 'h');
          sub.push(cons);
          return '<button class="choice ' + (c.check ? 'check' : '') + '" data-act="choose" data-i="' + i + '"' + (c.disabled ? ' disabled' : '') + '>' +
            '<span class="num">' + (i + 1) + '</span>' +
            '<span class="lbl">' + esc(c.label) + '<span class="choice-sub">' + esc(sub.join(' · ')) + '</span></span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</article>';
  }

  /* ---------------------------- 战斗 ---------------------------- */
  function renderCombat(s) {
    var c = s.combat;
    var alive = c.enemies.filter(function (e) { return e.wounds > 0; }).length;
    var hasRanged = s.weapons.some(function (w) { return (D.WEAPONS[w] || {}).type === 'ranged'; });
    var usable = ['potion', 'bandage', 'vodka'].filter(function (id) { return s.items[id]; });
    return '<article class="card scene">' +
      '<div class="combat-head">' +
        '<h2>战斗</h2>' +
        '<div class="combat-meta">' +
          '<span>第 ' + c.round + ' 回合</span>' +
          '<span>' + (c.distance === 'far' ? '距离：远' : '距离：近') + '</span>' +
          '<span>敌人 ' + alive + '</span>' +
          (c.reload ? '<span class="chip red">需装填</span>' : '') +
          (c.aim ? '<span class="chip gold">已瞄准</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="enemies">' +
        c.enemies.map(function (e, i) {
          return '<div class="enemy ' + (c.target === i ? 'target' : '') + (e.wounds <= 0 ? ' dead' : '') + '" data-act="target" data-i="' + i + '">' +
            (e.boss || e.key === 'chosen' ? '<div class="enemy-art">' + portrait(e.key) + '</div>' : '') +
            '<h4><span>' + esc(e.name) + '</span>' + (e.boss ? '<span class="badge boss">首领</span>' : '') + '</h4>' +
            '<div class="hp"><i style="width:' + pct(e.wounds, e.maxWounds) + '%"></i></div>' +
            '<div class="hp-txt"><span>' + e.wounds + ' / ' + e.maxWounds + '</span><span>' + esc((D.WEAPONS[e.weapon] || {}).name || '') + '</span></div>' +
            '<div class="conds">' + (e.conditions || []).map(function (x) { return '<span class="badge">' + esc(x.name) + '</span>'; }).join('') + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      ((c.allies || []).length ? '<div class="allies-row">' + c.allies.map(function (a) {
        return '<div class="ally ' + (a.wounds <= 0 ? 'down' : '') + '">' +
          '<div class="ally-name">' + esc(a.name) + ' <span class="muted small">' + esc(D.NPCS[a.npcId].role) + '</span></div>' +
          '<div class="hp"><i style="width:' + pct(a.wounds, a.maxWounds) + '%"></i></div>' +
          '<div class="hp-txt"><span>' + a.wounds + ' / ' + a.maxWounds + '</span><span>' + (a.wounds > 0 ? '自动行动' : '倒下') + '</span></div>' +
        '</div>';
      }).join('') + '</div>' : '') +
      '<div class="actions">' +
        '<button class="act-btn" data-act="attack" data-kind="melee"' + (c.distance === 'far' ? ' disabled' : '') + '>近战攻击<small>' + esc(R.weaponOf(s, 'melee').w.name) + '</small></button>' +
        (hasRanged ? '<button class="act-btn" data-act="attack" data-kind="ranged"' + (c.reload ? ' disabled' : '') + '>射击<small>' + esc(R.weaponOf(s, 'ranged').w.name) + '</small></button>' : '') +
        (c.distance === 'far' ? '<button class="act-btn" data-act="close">逼近<small>拉近距离</small></button>' : '') +
        (c.reload ? '<button class="act-btn" data-act="reload">装填<small>恢复射击</small></button>' : '') +
        '<button class="act-btn" data-act="aim">瞄准<small>下次攻击 +10</small></button>' +
        '<button class="act-btn" data-act="defend">防御<small>本回合 +20</small></button>' +
        usable.map(function (id) {
          return '<button class="act-btn" data-act="item" data-id="' + id + '">' + esc(D.ITEMS[id].name) + '<small>还剩 ' + s.items[id] + '</small></button>';
        }).join('') +
        (s.spells || []).map(function (sid) {
          return '<button class="act-btn" data-act="cast" data-id="' + sid + '">' + esc(D.SPELLS[sid].name) + '<small>施法</small></button>';
        }).join('') +
        '<button class="act-btn" data-act="flee">逃跑<small>运动检定 -10</small></button>' +
      '</div>' +
      '<div class="combat-log">' +
        (c.log || []).slice(-14).map(function (line) { return '<p>' + esc(line) + '</p>'; }).join('') +
      '</div>' +
    '</article>';
  }

  /* ---------------------------- 角色 ---------------------------- */
  function renderCharacter(s) {
    var buys = s.statBuys || {};
    var skills = Object.keys(D.SKILLS).map(function (id) {
      var meta = D.SKILLS[id], own = s.skills[id] || { adv: 0, trained: false };
      var base = s.stats[meta.char];
      var pen = own.trained ? 0 : (meta.advanced ? -20 : -10);
      return { id: id, meta: meta, own: own, target: Math.max(5, Math.min(95, base + own.adv + pen)) };
    }).sort(function (a, b) { return b.own.adv - a.own.adv || a.meta.name.localeCompare(b.meta.name, 'zh'); });

    return '<section class="card panel">' +
      '<h3>角色</h3>' +
      '<p class="lead">经验 ' + s.xp + '　·　属性 +1 花费 15 XP（4h）　·　技能 +5 花费 10 XP（3h）　·　天赋 40 XP（6h）</p>' +
      (function () {
        var info = R.nextRank(s);
        var html = '<div class="career-box">' +
          '<div class="career-row"><b>职业等级</b><span>Lv.' + (s.rank || 1) + ' · ' + esc(s.title || '') + '</span></div>' +
          '<div class="career-row"><b>身份阶级</b><span class="chip gold">' + esc(R.statusName(s.status || 2)) + '</span></div>' +
          '<div class="career-row"><b>功勋</b><span>' + R.renown(s) + ' / 3</span></div>';
        if (!info) {
          html += '<div class="career-next">你已经站在这个职业的顶点。剩下的路，只能靠自己走出来。</div>';
        } else {
          var can = s.xp >= info.xp && info.haveRenown >= info.renown;
          html += '<div class="career-row"><b>下一等级</b><span>Lv.' + info.rank + ' ' + esc(info.title) + ' · ' + esc(R.statusName(info.status)) + '</span></div>' +
            '<div class="career-next">需要 ' + info.xp + ' XP + ' + info.renown + ' 功勋（现有 ' + info.haveRenown + '）<br>' +
            '奖励：伤口 +1、两项职业技能 +5' +
            (info.rank === 3 ? '、命运点 +1' : '') +
            (info.rank === 4 ? '、伤害 +2、全护甲 +1' : '') +
            '<br>晋升仪式耗时 8 小时。</div>' +
            '<button class="btn primary" data-act="promote"' + (can ? '' : ' disabled') + '>晋升</button>';
        }
        html += '</div>';
        return html;
      })() +
      '<div class="stat-grid">' +
        D.CHARS.map(function (c) {
          var n = buys[c.id] || 0;
          return '<div class="stat-row">' +
            '<div><div class="nm">' + c.name + '</div><b>' + s.stats[c.id] + '</b></div>' +
            '<button data-act="buy-stat" data-id="' + c.id + '"' + (s.xp < 15 || n >= 15 ? ' disabled' : '') + ' title="' + esc(c.desc) + '">+</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<h4>派生属性</h4>' +
      '<dl class="kv">' +
        '<dt>力量加成</dt><dd>' + R.sb(s) + '</dd>' +
        '<dt>坚韧加成</dt><dd>' + R.tb(s) + '</dd>' +
        '<dt>意志加成</dt><dd>' + R.wpb(s) + '</dd>' +
        '<dt>先攻</dt><dd>' + (s.stats.ag + s.stats.int + (s.initBonus || 0)) + '</dd>' +
        '<dt>伤害加成</dt><dd>+' + (s.bonusDamage || 0) + '</dd>' +
      '</dl>' +
      '<h4>技能</h4>' +
      '<div class="skill-list">' +
        skills.map(function (x) {
          return '<div class="skill-item">' +
            '<span>' + x.meta.name + (x.own.adv ? ' <span class="muted">+' + x.own.adv + '</span>' : '') + '</span>' +
            '<span class="v">' + x.target + '</span>' +
            '<button data-act="buy-skill" data-id="' + x.id + '"' + (s.xp < 10 || x.own.adv >= 20 ? ' disabled' : '') + '>+5</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<h4>天赋</h4>' +
      '<div class="tag-list">' +
        (s.talents.length ? s.talents.map(function (t) {
          return '<span class="chip gold" title="' + esc(D.TALENTS[t].desc) + '">' + esc(D.TALENTS[t].name) + '</span>';
        }).join('') : '<span class="muted small">暂无</span>') +
      '</div>' +
      (s.mutations.length ? '<h4>变异</h4><div class="tag-list">' + s.mutations.map(function (m) {
        return '<span class="chip red" title="' + esc(m.desc) + '">' + esc(m.name) + '</span>';
      }).join('') + '</div>' : '') +
      '<h4>可学习天赋</h4>' +
      '<div class="skill-list">' +
        Object.keys(D.TALENTS).filter(function (t) { return s.talents.indexOf(t) < 0; }).slice(0, 6).map(function (t) {
          return '<div class="skill-item"><span>' + esc(D.TALENTS[t].name) + '<br><span class="muted" style="font-size:11px">' + esc(D.TALENTS[t].desc) + '</span></span>' +
            '<button data-act="buy-talent" data-id="' + t + '"' + (s.xp < 40 ? ' disabled' : '') + '>40</button></div>';
        }).join('') +
      '</div>' +
    '</section>';
  }

  /* ---------------------------- 同伴 ---------------------------- */
  function renderCompanions(s) {
    var ids = Object.keys(D.NPCS).filter(function (id) { return s.npcs && s.npcs[id] && s.npcs[id].met; });
    var body;
    if (!ids.length) {
      body = '<div class="empty">你还没有结识可以同行的人。去第四章的白蜡堡看看。</div>';
    } else {
      body = ids.map(function (id) {
        var d = D.NPCS[id], n = s.npcs[id];
        var status = n.recruited ? '<span class="chip gold">同行</span>' : '<span class="chip">未招募</span>';
        var actions = '';
        if (s.mode !== 'combat') {
          if (n.talkAct !== s.act) actions += '<button class="btn" data-act="npc-talk" data-id="' + id + '">交谈（+6）</button>';
          if (!n.gift && s.gold >= 10) actions += '<button class="btn" data-act="npc-gift" data-id="' + id + '">赠礼（10 银币，+12）</button>';
          if (n.affinity >= 30 && !n.questDone && d.quest && (s.sceneId === 'act4_hub' || (id === 'qingheng' && s.sceneId === 'act1_hub'))) actions += '<button class="btn" data-act="npc-quest" data-id="' + id + '">个人任务</button>';
          if (R.canRecruit(s, id)) actions += '<button class="btn primary" data-act="npc-recruit" data-id="' + id + '">招募</button>';
          if (n.recruited) actions += '<button class="btn ghost" data-act="npc-dismiss" data-id="' + id + '">离队</button>';
        }
        return '<div class="npc-card">' +
          '<div class="npc-head">' +
            '<div class="npc-avatar">' + portrait(id) + '</div>' +
            '<div style="flex:1"><h4>' + esc(d.name) + ' <span class="chip">' + esc(d.role) + '</span></h4>' +
            '<div class="muted small">' + esc(d.title) + '</div></div>' + status +
          '</div>' +
          '<p class="small">' + esc(d.desc) + '</p>' +
          '<div class="affinity"><span>好感</span><div class="bar"><i style="width:' + n.affinity + '%"></i></div><b>' + n.affinity + '</b></div>' +
          '<div class="npc-boon small muted">' + esc(d.boon) + '　·　' + (n.questDone ? '个人任务已完成' : '个人任务待解锁') + '</div>' +
          (actions ? '<div class="npc-actions">' + actions + '</div>' : '') +
        '</div>';
      }).join('');
    }
    return '<section class="card panel">' +
      '<h3>同伴</h3>' +
      '<p class="lead">好感达到 40 即可招募，最多 2 人同行。交谈每章一次，赠礼每人一次；好感 30 后可触发个人任务。同伴会在战斗中自动行动。</p>' +
      '<p class="lead">当前队伍：' + (s.party.length ? s.party.map(function (id) { return esc(D.NPCS[id].name); }).join('、') : '独自一人') + '（' + s.party.length + '/2）</p>' +
      body +
    '</section>';
  }

  /* ---------------------------- 行囊 ---------------------------- */
  function renderInventory(s) {
    var q = { fast: '迅捷', balanced: '平衡', pierce: '破甲', reach: '长柄', twohand: '双手', reload: '装填', focus: '法器', shield: '盾牌' };
    return '<section class="card panel">' +
      '<h3>行囊</h3>' +
      '<p class="lead">银币 ' + s.gold + '　·　负重不设限，但手只有两只。</p>' +
      '<h4>武器</h4>' +
      (s.weapons.length ? s.weapons.map(function (wid) {
        var w = D.WEAPONS[wid];
        return '<div class="item-row"><div><b>' + esc(w.name) + '</b>' +
          (w.qualities.length ? ' <span class="muted small">' + w.qualities.map(function (x) { return q[x] || x; }).join('、') + '</span>' : '') +
          '<div class="desc">' + (w.type === 'melee' ? '伤害 ' + w.dmg + ' + 力量加成' : w.type === 'ranged' ? '伤害 ' + w.dmg : '防御用') + '</div></div>' +
          '<span class="chip">' + (w.type === 'melee' ? '近战' : w.type === 'ranged' ? '远程' : '副手') + '</span></div>';
      }).join('') : '<div class="empty">你赤手空拳。</div>') +
      '<h4>护甲</h4>' +
      '<div class="kv">' +
        ['head', 'arms', 'body', 'legs'].map(function (l) {
          return '<dt>' + ({ head: '头部', arms: '手臂', body: '躯干', legs: '腿部' }[l]) + '</dt><dd>' + (s.armour[l] || 0) + ' AP</dd>';
        }).join('') +
      '</div>' +
      '<h4>物品</h4>' +
      (Object.keys(s.items).length ? Object.keys(s.items).map(function (id) {
        var it = D.ITEMS[id];
        if (!it) return '';
        return '<div class="item-row"><div><b>' + esc(it.name) + '</b> <span class="muted">×' + s.items[id] + '</span><div class="desc">' + esc(it.desc) + '</div></div>' +
          (it.use ? '<button class="btn" data-act="use-item" data-id="' + id + '">使用</button>' : '') + '</div>';
      }).join('') : '<div class="empty">空空如也。</div>') +
    '</section>';
  }

  /* ---------------------------- 日志 ---------------------------- */
  function renderJournal(s) {
    return '<section class="card panel">' +
      '<h3>日志</h3>' +
      '<p class="lead">你的经历会留在这里，直到这一局结束。</p>' +
      '<h4>线索</h4>' +
      (s.clues.length ? '<div style="display:grid;gap:8px">' + s.clues.map(function (id) {
        var c = C.CLUES[id];
        return '<div class="item-row"><div><b>' + esc(c.name) + '</b><div class="desc">' + esc(c.desc) + '</div></div></div>';
      }).join('') + '</div>' : '<div class="empty">还没有线索。去酒馆、神殿或码头看看。</div>') +
      '<h4>经历</h4>' +
      '<div class="journal">' + s.log.slice(-80).reverse().map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>' +
    '</section>';
  }

  /* ---------------------------- 系统 ---------------------------- */
  function renderSystem(s) {
    return '<section class="card panel">' +
      '<h3>系统</h3>' +
      '<p class="lead">存档保存在浏览器的本地存储中，不联网也能读取。</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn primary" data-act="save">立即存档</button>' +
        '<button class="btn" data-act="load">读取存档</button>' +
        '<button class="btn" data-act="export">导出存档</button>' +
        '<button class="btn" data-act="import">导入存档</button>' +
        '<button class="btn" data-act="help">规则说明</button>' +
      '</div>' +
      '<h4>本局信息</h4>' +
      '<dl class="kv">' +
        '<dt>角色</dt><dd>' + esc(s.name) + '</dd>' +
        '<dt>进度</dt><dd>' + actNames(s.act) + ' · ' + esc(C.currentScene(s).title || '') + '</dd>' +
        '<dt>累计经验</dt><dd>' + s.totalXp + '</dd>' +
        '<dt>线索</dt><dd>' + s.clues.length + '</dd>' +
        '<dt>腐化</dt><dd>' + s.corruption + '</dd>' +
        '<dt>存档版本</dt><dd>v' + s.version + '</dd>' +
      '</dl>' +
      '<h4>危险区域</h4>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn" data-act="restart">重新开始（清除存档）</button>' +
      '</div>' +
    '</section>';
  }

  /* ---------------------------- 结局 ---------------------------- */
  function renderEnding(s) {
    var sc = C.currentScene(s);
    var paras = C.text(s);
    return '<div class="center-col"><section class="card ending">' +
      '<div class="scene-meta" style="justify-content:center">' + actNames(s.act) + ' · 完</div>' +
      '<div class="ending-portrait">' + portrait(s.raceId) + '</div>' +
      '<h1>' + esc(sc.title.replace(/^结局 · /, '')) + '</h1>' +
      paras.map(function (p) { return p ? '<p>' + esc(p) + '</p>' : '<p style="height:6px"></p>'; }).join('') +
      '<div class="actions">' +
        '<button class="btn primary" data-act="finish">完成故事</button>' +
        '<button class="btn" data-act="export">导出这局记录</button>' +
      '</div>' +
    '</section></div>';
  }

  /* ------------------------------------------------------------------ */
  /* 弹窗与提示                                                          */
  /* ------------------------------------------------------------------ */
  function renderModal() {
    if (UI.modal === 'help') {
      return '<div class="overlay" data-act="close-modal-bg"><div class="modal">' +
        '<h2>规则速查</h2>' +
        '<p>本作使用简化的 d100 跑团规则：掷 1d100，结果小于等于目标值即成功。十位数之差为成功等级（SL），差值越大效果越好。</p>' +
        '<h3>属性与技能</h3>' +
        '<p>八项属性约为 20–60。技能提供加值；未受训的进阶技能 -20，未受训的基础技能 -10。双数（11、22……）为暴击/大失败。</p>' +
        '<p>剧情检定失败后，只要还有命运点，就可以花费 1 点重掷。命运点同时会在你濒死时自动救你一命。</p>' +
        '<h3>战斗</h3>' +
        '<p>攻击与防守为对抗检定：你的命中 SL 高于对方闪避/格挡 SL 才命中。伤害 = 武器伤害 + 力量加成 + SL 差 − 坚韧加成 − 护甲。命中部位由骰子倒序决定。</p>' +
        '<p>伤口归零时，若还有命运点会自动消耗 1 点并以 1 点伤口站住；没有命运点则死亡。战斗中可以防御（+20）、瞄准（下次 +10）、装填或逃跑。</p>' +
        '<h3>成长</h3>' +
        '<p>经验可用于：属性 +1（15 XP，每项最多 15 次，训练 4 小时）、技能 +5（10 XP，上限 +20，3 小时）、天赋（40 XP，6 小时）。</p>' +
        '<h3>职业与身份</h3>' +
        '<p>每个职业有 4 个等级。完成章节、守住白蜡堡、击败灰烬领主各获得 1 点功勋；用 XP 与功勋在角色页晋升，获得伤口、技能、命运点或护甲。晋升耗时 8 小时。</p>' +
        '<p>身份从流民到贵族共五档。身份会影响说服、威吓、魅惑、八卦检定（每档 ±5），商店价格，以及部分专属选项。</p>' +
        '<h3>时间与生存</h3>' +
        '<p>每个选项都会消耗时间：普通行动约 1 小时，检定 2 小时，战斗 2 小时，休息 8 小时。界面左侧显示当前时间与期限倒计时。</p>' +
        '<p>余烬仪式、白蜡堡夜袭、裂痕扩张各有期限；超时会被强制推进，敌人更强，甚至直接改变结局。连续 24 小时不休息会疲劳（所有检定 -10），48 小时 -20，休息可清除。</p>' +
        '<h3>同伴</h3>' +
        '<p>在同伴页交谈、赠礼、完成个人任务可以提升好感。好感达到 40 即可招募，最多 2 人同行。同伴在战斗中自动行动：医师会治疗，猎手会远程射击，先锋会替你分担攻击。倒下的同伴会在战斗结束后恢复。</p>' +
        '<h3>腐化</h3>' +
        '<p>混沌角色与某些选择会增加腐化。腐化到达 3/6/9 时会获得变异——有力量，也有代价。</p>' +
        '<div class="actions"><button class="btn primary" data-act="close-modal">知道了</button></div>' +
      '</div></div>';
    }
    if (UI.modal === 'export') {
      return '<div class="overlay" data-act="close-modal-bg"><div class="modal">' +
        '<h2>导出存档</h2>' +
        '<p class="muted small">复制下面的文本，或下载 JSON 文件。导入时把它粘贴回来即可。</p>' +
        '<textarea id="export-text" readonly>' + esc(G.game.exportText()) + '</textarea>' +
        '<div class="actions">' +
          '<button class="btn" data-act="download">下载文件</button>' +
          '<button class="btn primary" data-act="close-modal">关闭</button>' +
        '</div>' +
      '</div></div>';
    }
    if (UI.modal === 'import') {
      return '<div class="overlay" data-act="close-modal-bg"><div class="modal">' +
        '<h2>导入存档</h2>' +
        '<p class="muted small">粘贴之前导出的 JSON，然后读取。</p>' +
        '<textarea id="import-text" placeholder="{ ... }"></textarea>' +
        '<div class="actions">' +
          '<button class="btn" data-act="close-modal">取消</button>' +
          '<button class="btn primary" data-act="import-apply">读取</button>' +
        '</div>' +
      '</div></div>';
    }
    return '';
  }

  UI.toast = function (msg, bad) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(UI.toastTimer);
    UI.toastTimer = setTimeout(function () { el.className = 'toast'; }, 2400);
  };

  UI.showDice = function (r) {
    var el = $('dice');
    if (!el || !r) return;
    el.innerHTML = '<div class="dice-card">' +
      '<div class="t">D100</div>' +
      '<div class="n">' + r.roll + '</div>' +
      '<div class="r ' + (r.success ? 'ok' : 'no') + '">' + (r.success ? '成功' : '失败') + ' · 目标 ' + r.target + ' · SL ' + (r.sl >= 0 ? '+' : '') + r.sl + '</div>' +
      '</div>';
    el.classList.add('show');
    clearTimeout(UI.diceTimer);
    UI.diceTimer = setTimeout(function () { el.classList.remove('show'); }, 1300);
  };

  function bindInputs() {
    var input = $('name-input');
    if (input) {
      input.addEventListener('input', function () { UI.create.name = input.value; });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); startGame(); }
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 操作                                                                */
  /* ------------------------------------------------------------------ */
  function startGame() {
    var c = UI.create;
    if (!c.raceId || !c.careerId) return;
    var name = (c.name || '').trim() || defaultName(c.raceId);
    G.game.newGame({ raceId: c.raceId, careerId: c.careerId, name: name });
    UI.create = { active: false, step: 0, raceId: null, careerId: null, name: '' };
    UI.tab = 'adventure';
    C.enter(st(), st().raceId === 'cathay' ? 'intro_cathay' : 'intro');
    G.game.save();
    UI.render();
  }

  function defaultName(raceId) {
    var pool = {
      empire: ['汉斯', '格蕾塔', '库尔特', '艾拉'],
      bretonnia: ['吉尔', '伊莎博', '洛朗', '玛蒂尔'],
      chaos: ['无名者', '灰烬之子', '维尔', '第七'],
      kislev: ['伊万', '卡捷琳娜', '鲍里斯', '娜塔莎'],
      highelf: ['艾拉瑞尔', '瑟兰', '伊瑟琳', '卡多'],
      cathay: ['玉衡', '青云', '李昭', '白霜']
    };
    var arr = pool[raceId] || ['流浪者'];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function afterStoryAction() {
    var s = st();
    if (s.lastMessage) { UI.toast(s.lastMessage); s.lastMessage = null; }
    if (UI.tab === 'adventure' && s.resultView && s.resultView.roll) UI.showDice(s.resultView.roll);
    G.game.save();
    UI.render();
  }

  function resolveCombat(res) {
    var s = st();
    if (!res) { UI.render(); return; }
    if (res.blocked) { UI.render(); return; }
    if (res.ended) {
      var win = res.ended === 'victory';
      var before = s.clock;
      C.onCombatEnd(s, res.ended);
      G.game.save();
      UI.render();
      var msg = win ? '战斗胜利' : (res.ended === 'defeat' ? '你倒下了……' : '你逃走了');
      if (s.clock !== before) msg += '（耗时 ' + (s.clock - before) + ' 小时）';
      UI.toast(msg, !win);
      return;
    }
    UI.render();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    var s = st();

    if (act === 'new-game') { UI.create = { active: true, step: 0, raceId: null, careerId: null, name: '' }; UI.render(); return; }
    if (act === 'continue') { if (G.game.load()) { UI.tab = 'adventure'; UI.render(); } else UI.toast('没有可读取的存档。', true); return; }
    if (act === 'back-title') { UI.create.active = false; UI.render(); return; }
    if (act === 'pick-race') { UI.create.raceId = el.getAttribute('data-id'); UI.create.step = 1; UI.create.careerId = null; UI.render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (act === 'pick-career') { UI.create.careerId = el.getAttribute('data-id'); UI.create.step = 2; UI.render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (act === 'create-back') { UI.create.step = Math.max(0, UI.create.step - 1); UI.render(); return; }
    if (act === 'create-start') { startGame(); return; }
    if (act === 'help') { UI.modal = 'help'; UI.render(); return; }
    if (act === 'close-modal') { UI.modal = null; UI.render(); return; }
    if (act === 'close-modal-bg') { if (e.target === el) { UI.modal = null; UI.render(); } return; }
    if (act === 'download') {
      var blob = new Blob([G.game.exportText()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ashen-crown-save.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      return;
    }
    if (act === 'import-apply') {
      var txt = ($('import-text') || {}).value || '';
      if (G.game.importText(txt)) { UI.modal = null; UI.tab = 'adventure'; G.game.save(); UI.render(); UI.toast('存档已读取。'); }
      else UI.toast('存档格式不正确。', true);
      return;
    }

    if (!s) return;

    if (act === 'tab') { UI.tab = el.getAttribute('data-id'); UI.render(); return; }
    if (act === 'save') {
      var ok = G.game.save();
      UI.toast(ok ? '已存档。' : '战斗中无法存档。', !ok);
      return;
    }
    if (act === 'load') { if (G.game.load()) { UI.render(); UI.toast('已读取存档。'); } else UI.toast('没有存档。', true); return; }
    if (act === 'export') { UI.modal = 'export'; UI.render(); return; }
    if (act === 'import') { UI.modal = 'import'; UI.render(); return; }
    if (act === 'restart') {
      if (confirm('确定要清除当前存档并重新开始吗？')) {
        G.game.clear();
        UI.create = { active: true, step: 0, raceId: null, careerId: null, name: '' };
        UI.tab = 'adventure';
        UI.render();
      }
      return;
    }
    if (act === 'finish') {
      if (confirm('完成故事并清除本局存档？')) {
        G.game.clear();
        UI.create = { active: false, step: 0, raceId: null, careerId: null, name: '' };
        UI.tab = 'adventure';
        UI.render();
      }
      return;
    }

    if (act === 'choose') {
      var idx = +el.getAttribute('data-i');
      var beforeClock = s.clock;
      var res = C.choose(s, idx);
      if (res && res.finish) { return; }
      if (res && res.combat && res.ended) { resolveCombat({ ended: res.ended }); return; }
      if (s.lastMessage) UI.toast(s.lastMessage);
      else if (s.clock !== beforeClock) UI.toast('时间流逝：' + R.timeLabel(s.clock) + '（+' + (s.clock - beforeClock) + 'h）');
      if (s.mode !== 'combat' && s.resultView && s.resultView.roll) UI.showDice(s.resultView.roll);
      if (s.mode !== 'combat') G.game.save();
      UI.render();
      return;
    }

    if (act === 'buy-stat') {
      if (s.mode === 'combat') { UI.toast('战斗中无法研习。', true); return; }
      var r1 = R.buyStat(s, el.getAttribute('data-id'));
      if (r1.error) { UI.toast(r1.error, true); return; }
      spendHours(s, 4);
      UI.toast('属性提升。训练消耗 4 小时。');
      G.game.save(); UI.render(); return;
    }
    if (act === 'buy-skill') {
      if (s.mode === 'combat') { UI.toast('战斗中无法研习。', true); return; }
      var r2 = R.buySkill(s, el.getAttribute('data-id'));
      if (r2.error) { UI.toast(r2.error, true); return; }
      spendHours(s, 3);
      UI.toast('技能提升。训练消耗 3 小时。');
      G.game.save(); UI.render(); return;
    }
    if (act === 'buy-talent') {
      if (s.mode === 'combat') { UI.toast('战斗中无法研习。', true); return; }
      var r3 = R.buyTalent(s, el.getAttribute('data-id'));
      if (r3.error) { UI.toast(r3.error, true); return; }
      spendHours(s, 6);
      UI.toast('学会了新天赋。钻研消耗 6 小时。');
      G.game.save(); UI.render(); return;
    }
    if (act === 'promote') {
      if (s.mode === 'combat') { UI.toast('战斗中无法晋升。', true); return; }
      var pr = R.promote(s);
      if (pr.error) { UI.toast(pr.error, true); return; }
      spendHours(s, 8);
      UI.toast('晋升为 ' + pr.info.title + '（' + R.statusName(pr.info.status) + '），耗时 8 小时。');
      G.game.save(); UI.render(); return;
    }
    if (act === 'use-item') {
      if (s.mode === 'combat') { UI.toast('战斗中请使用战斗动作。', true); return; }
      var iid = el.getAttribute('data-id');
      if (!s.items[iid]) { UI.toast('没有这个物品。', true); return; }
      s.items[iid] -= 1;
      if (s.items[iid] <= 0) delete s.items[iid];
      UI.toast(R.useItemEffect(s, iid));
      G.game.save(); UI.render(); return;
    }

    if (act.indexOf('npc-') === 0) {
      if (s.mode === 'combat') { UI.toast('战斗中无法交谈。', true); return; }
      var nid = el.getAttribute('data-id');
      var n = s.npcs && s.npcs[nid];
      if (!n) return;
      if (act === 'npc-talk') {
        if (n.talkAct === s.act) return;
        n.talkAct = s.act;
        R.addAffinity(s, nid, 6);
        spendHours(s, 1);
        UI.toast('你和' + D.NPCS[nid].name + '聊了一会儿（1 小时）。');
      } else if (act === 'npc-gift') {
        if (n.gift || s.gold < 10) { UI.toast('现在无法赠礼。', true); return; }
        s.gold -= 10; n.gift = true;
        R.addAffinity(s, nid, 12);
        spendHours(s, 1);
        UI.toast(D.NPCS[nid].name + '收下了你的礼物（1 小时）。');
      } else if (act === 'npc-quest') {
        if (!(s.sceneId === 'act4_hub' || (nid === 'qingheng' && s.sceneId === 'act1_hub')) || n.affinity < 30 || n.questDone || !D.NPCS[nid].quest) { UI.toast('还没有到谈这件事的时候。', true); return; }
        UI.tab = 'adventure';
        C.enter(s, D.NPCS[nid].quest);
      } else if (act === 'npc-recruit') {
        if (!R.recruitNPC(s, nid)) {
          UI.toast(s.party.length >= 2 ? '队伍已满（最多 2 人）。' : '好感达到 40 才能招募。', true);
          return;
        }
        UI.toast(D.NPCS[nid].name + '加入了队伍。');
      } else if (act === 'npc-dismiss') {
        if (R.dismissNPC(s, nid)) UI.toast(D.NPCS[nid].name + '离开了队伍。');
      }
      G.game.save();
      UI.render();
      return;
    }

    if (act === 'target') {
      if (!s.combat) return;
      var ti = +el.getAttribute('data-i');
      if (s.combat.enemies[ti].wounds <= 0) return;
      s.combat.target = ti;
      UI.render(); return;
    }
    if (act === 'attack') { resolveCombat(R.playerAttack(s, el.getAttribute('data-kind'))); return; }
    if (act === 'cast') { resolveCombat(R.playerCast(s, el.getAttribute('data-id'))); return; }
    if (act === 'aim') { resolveCombat(R.playerAim(s)); return; }
    if (act === 'defend') { resolveCombat(R.playerDefend(s)); return; }
    if (act === 'close') { resolveCombat(R.playerClose(s)); return; }
    if (act === 'reload') { resolveCombat(R.playerReload(s)); return; }
    if (act === 'flee') { resolveCombat(R.playerFlee(s)); return; }
    if (act === 'item') { resolveCombat(R.playerUseItem(s, el.getAttribute('data-id'))); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (UI.modal) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var s = st();
    if (!s || s.mode === 'combat' || UI.tab !== 'adventure' || s.ended) return;
    if (/^[1-9]$/.test(e.key)) {
      var buttons = document.querySelectorAll('[data-act="choose"]');
      var b = buttons[+e.key - 1];
      if (b && !b.disabled) b.click();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
