/* =====================================================================
   tests/run.js —— 无头测试（node tests/run.js）
   用最小 DOM / localStorage 桩加载 js/*.js，跑断言。
   不依赖任何第三方库。
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

/* ---------- 加载顺序与 index.html 一致 ---------- */
function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const out = [];
  const re = /<script\s+src="([^"]+)"><\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
function loadSource() {
  return scriptList().map(p => `/* ==== ${p} ==== */\n` + fs.readFileSync(path.join(ROOT, p), "utf8")).join("\n");
}

/* ---------- DOM / storage 桩 ---------- */
function mkEl(tag) {
  const el = {
    tagName: (tag || "div").toUpperCase(), innerHTML: "", textContent: "", value: "", id: "", className: "",
    style: {}, dataset: {}, files: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] != null ? this.attrs[k] : null; },
    removeAttribute(k) { delete this.attrs[k]; },
    appendChild() {}, remove() {}, insertBefore() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {}, select() {}, setSelectionRange() {},
    scrollIntoView() {}, get offsetParent() { return null; }
  };
  return el;
}
function makeEnv() {
  const els = {};
  const store = {};
  const document = {
    getElementById(id) { if (!els[id]) { els[id] = mkEl(); els[id].id = id; } return els[id]; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(t) { return mkEl(t); },
    addEventListener() {},
    body: mkEl("body"),
    activeElement: null
  };
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); }
  };
  const src = loadSource();
  const hook = `
globalThis.__T = {
  getS: () => (typeof S !== "undefined" ? S : null),
  setS: v => { S = v; },
  newGame, save, load, slotKey, slotMeta, renameSlot, deleteSlot, exportSave,
  render, renderTitle, renderMain, renderSeries,
  handleAct, startSeries, startMatch, newGameDraft, autoBpStep, autoBp, autoBpAllowed,
  battleTick, finishBattle, simGame, commitGame, seriesContinue, newSeason, advanceRegular,
  myAutoPick, myAutoBan, myPeakAutoPick, aiBanHero, aiPickTurn, aiBpLevel, aiBpCfg,
  getMyTeam, teamPower, heroByName, heroStrength, laneFit, matchupMult,
  standingsSorted, teamGameStats, rotationSuggest, applyRotation, restTeam,
  oppThreatHeroes, loanCandidates, loanSign, loanTick, agePlayers, settleContracts,
  seasonYear, isAgeYearTick, ageDecline, growthChance, trainCost, priceFor, sellPrice, renewCost, breakCost,
  availBanHeroes, availPickHeroes, filledPos, aiSide, currentStep, POS, POS_NAME,
  profOf, masteryOf, masteryLabel, myBestMastery, stCapOf, trainHero, openHeroTrain,
  STAFF_DEFS, staffLevel, staffWage, staminaCostPerGame, restGain, intelSize, hireStaff, applyStaffPassive,
  PERSONAS, personaOf, rollPersona, makeKpi, evaluateKpi, recordHistory,
  battleWinRate, skipBattle, POWER_SCALE, profScale: 0,
  autoBpStepSafe: 0
};
`;
  const ctx = {
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    Math, Date, JSON, Number, String, Object, Array, RegExp, Error, parseInt, parseFloat, isNaN,
    localStorage, document, window: { scrollY: 0, pageYOffset: 0, scrollTo() {} },
    Blob: function () {}, URL: { createObjectURL() { return "blob:x"; }, revokeObjectURL() {} },
    FileReader: function () {}
  };
  vm.createContext(ctx);
  vm.runInContext(src + hook, ctx);
  const T = ctx.__T;
  return { T, els, store, localStorage, document, src, root: () => els["game-root"].innerHTML };
}

/* ---------- 断言与套件 ---------- */
let pass = 0, fail = 0, curSuite = "";
const failures = [];
function ok(msg, cond, extra) {
  if (cond) { pass++; return true; }
  fail++;
  failures.push(`[${curSuite}] ${msg}${extra !== undefined ? " → " + extra : ""}`);
  return false;
}
function suite(name, fn) {
  curSuite = name;
  try { fn(); } catch (e) {
    fail++;
    failures.push(`[${name}] 抛异常：${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
  }
}

/* ---------- 小工具 ---------- */
function playSeries(h, { autoDraft = true, skipBattle = true } = {}) {
  const { T } = h;
  const S = T.getS();
  let g = 0;
  while (S.series && g++ < 60) {
    const s = S.series;
    if (s.sub === "draft") {
      let k = 0;
      while (S.series && S.series.draft && !S.series.draft.over && k++ < 60) T.autoBpStep();
      continue;
    }
    if (s.sub === "preview") { s.sub = "battle"; continue; }
    if (s.sub === "battle") {
      let k = 0;
      while (S.series && S.series.sub === "battle" && k++ < 90) T.battleTick();
      continue;
    }
    if (s.sub === "result") { T.handleAct("seriesnext"); continue; }
    if (s.sub === "sub") { if (s.nextSideBy === "me" && !s.nextSide) s.nextSide = s.firstSide || "blue"; T.newGameDraft(); continue; }
    if (s.sub === "over") { T.handleAct("seriescontinue"); return s; }
    break;
  }
  return null;
}
function playSeason(h) {
  const { T } = h;
  const S = T.getS();
  let guard = 0;
  while (S.phase !== "end" && guard++ < 1200) {
    if (!S.series) T.startMatch();
    const s = S.series;
    if (!s) break;
    if (s.sub === "draft") { let k = 0; while (S.series && S.series.draft && !S.series.draft.over && k++ < 60) T.autoBpStep(); continue; }
    if (s.sub === "preview") { s.sub = "battle"; continue; }
    if (s.sub === "battle") { let k = 0; while (S.series && S.series.sub === "battle" && k++ < 90) T.battleTick(); continue; }
    if (s.sub === "result") { T.handleAct("seriesnext"); continue; }
    if (s.sub === "sub") { if (s.nextSideBy === "me" && !s.nextSide) s.nextSide = s.firstSide || "blue"; T.newGameDraft(); continue; }
    if (s.sub === "over") { T.handleAct("seriescontinue"); continue; }
    break;
  }
  return S;
}
function newGame(h, opts) {
  h.T.newGame(Object.assign({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 }, opts || {}));
  h.T.getS().transferWindow = false;
  return h.T.getS();
}

module.exports = { makeEnv, ok, suite, playSeries, playSeason, newGame, scriptList, loadSource, report: () => ({ pass, fail, failures }) };
