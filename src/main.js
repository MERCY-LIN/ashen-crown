/* 灰烬王冠 — 启动、存档 */
(function (root) {
  'use strict';
  var G = root.G = root.G || {};
  var KEY = 'ashen_crown_save_v1';

  var game = G.game = {
    state: null,

    hasSave: function () {
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    },

    newGame: function (opts) {
      this.state = G.rules.createCharacter(opts);
      return this.state;
    },

    save: function () {
      if (!this.state) return false;
      if (this.state.mode === 'combat') return false;
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
        return true;
      } catch (e) {
        return false;
      }
    },

    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return false;
        var obj = JSON.parse(raw);
        if (!obj || !obj.stats || !obj.sceneId) return false;
        this.state = normalize(obj);
        return true;
      } catch (e) {
        return false;
      }
    },

    clear: function () {
      try { localStorage.removeItem(KEY); } catch (e) { }
      this.state = null;
    },

    exportText: function () {
      return this.state ? JSON.stringify(this.state, null, 2) : '{}';
    },

    importText: function (txt) {
      try {
        var obj = JSON.parse(txt);
        if (!obj || !obj.stats || !obj.sceneId) return false;
        this.state = normalize(obj);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  function normalize(obj) {
    obj.flags = obj.flags || {};
    obj.clues = obj.clues || [];
    obj.items = obj.items || {};
    obj.npcs = obj.npcs || {};
    obj.party = obj.party || [];
    obj.prep = obj.prep || 0;
    obj.clock = obj.clock === undefined ? 8 : obj.clock;
    obj.deadline1 = obj.deadline1 || 80;
    obj.lastRest = obj.lastRest === undefined ? 8 : obj.lastRest;
    obj.fatigue = obj.fatigue || 0;
    obj.weapons = obj.weapons || ['unarmed'];
    obj.armour = Object.assign({ head: 0, arms: 0, body: 0, legs: 0 }, obj.armour || {});
    obj.talents = obj.talents || [];
    obj.mutations = obj.mutations || [];
    obj.spells = obj.spells || [];
    obj.log = obj.log || [];
    obj.statBuys = obj.statBuys || {};
    obj.rank = obj.rank || 1;
    if (!obj.status) {
      var cr = G.data.CAREER_RANKS[obj.careerId];
      obj.status = cr ? cr.status[obj.rank - 1] : 2;
    }
    if (!obj.title) {
      var cr2 = G.data.CAREER_RANKS[obj.careerId];
      obj.title = cr2 ? cr2.titles[obj.rank - 1] : '';
    }
    obj.corruption = obj.corruption || 0;
    obj.fortune = obj.fortune === undefined ? obj.fate : obj.fortune;
    obj.bonusDamage = obj.bonusDamage || 0;
    obj.initBonus = obj.initBonus || 0;
    obj.maxFate = obj.maxFate || obj.fate || 2;
    obj.isPlayer = true;
    if (obj.combat) {
      obj.combat.awaiting = true;
      obj.combat.log = obj.combat.log || [];
    }
    obj.version = obj.version || 1;
    if (!obj.maxWounds || obj.maxWounds < 1) obj.maxWounds = 10;
    if (obj.wounds === undefined) obj.wounds = obj.maxWounds;
    return obj;
  }

  function boot() {
    G.ui.render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
