/* =====================================================================
   sim.js — 规则与模拟：选手生成 / 战力 / BP AI / 单局与系列赛 / 经济 / 年龄 / 双败赛制
   由 game.js 拆分而来（v10）。所有文件按 index.html 中的顺序加载。
   ===================================================================== */

/* ---------------- 工具 ---------------- */
const rand = () => Math.random();
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function ratingForOvr(ovr) { return ovr >= 88 ? "S" : ovr >= 82 ? "A" : ovr >= 75 ? "B" : "C"; }
function priceFor(ovr) { return Math.round((ovr - 58) * 11 + 24); }
// 卖出价：转会费 50%（买入 50% 折价，避免"低买高卖"套利）
function sellPrice(p) { return Math.round(priceFor(p.ovr) * 0.5); }
function ceilFor(rating) { return clamp({ S: 94, A: 87, B: 79, C: 71 }[rating] + randInt(-2, 2), 60, 98); }

/* ---------------- 生成 ---------------- */
// 英雄熟练度：0~100。对战斗力的影响是连续的（不再是"会/不会"二元判断）
// 熟练度 → 战力系数。池外英雄不是"0 熟练度"，而是「会玩但不熟」的基础值：
// 全局 BP 一个 BO5 要每人 5 个不同英雄，而初始池只有 5~6 个 —— 若池外记 0，
// 第 2 局起全联盟熟练度统一 0.94，这套系统就只剩第 1 局有用。
const BASE_MASTERY = 45;
function masteryOf(p, name) { return p && p.mastery ? (p.mastery[name] || 0) : 0; }
function profOf(p, name) {
  const m = masteryOf(p, name);
  return 0.94 + (Math.max(m, BASE_MASTERY) / 100) * 0.18;   // 池外 1.02 · 可用 1.03 · 绝活 1.11
}
function masteryLabel(m) { return m >= 85 ? "绝活" : m >= 70 ? "熟练" : m >= 50 ? "可用" : m > 0 ? "生疏" : "不会"; }
// 我方首发里，谁最会这个英雄（BP 选将台显示 ★88 用）
function myBestMastery(heroName) {
  const my = getMyTeam();
  if (!my) return 0;
  let best = 0;
  POS.forEach(pos => { const p = getPlayer(my, my.lineup[pos]); if (p) best = Math.max(best, masteryOf(p, heroName)); });
  return best;
}
function makePlayerFrom(e) {
  // 属性围绕「真实总评」小幅波动（±3~4），保证战力与历史评分一致，不会被随机数改写
  const span = e.ovr >= 82 ? 3 : 4;
  const ceil = clamp(Math.max(ceilFor(e.rating), e.ovr + randInt(0, 2)), 60, 99); // 成长上限至少不低于当前总评
  const r = () => clamp(Math.round(e.ovr + randInt(-span, span)), 45, ceil);
  // 年龄：评分越高的成型选手偏老；合同 2~6 个赛季（3 赛季 = 1 岁；赛季末递减）
  const age = clamp(e.ovr >= 90 ? randInt(20, 28) : e.ovr >= 84 ? randInt(19, 27) : randInt(17, 25), 17, 30);
  const stCap = stCapForAge(age);
  // 英雄池：6 个，第一个是绝活（熟练度最高），依次递减
  const heroPool = pickHeroes(e.pos, 6);
  const mastery = {};
  heroPool.forEach((n, i) => { mastery[n] = clamp(92 - i * 5 + randInt(-4, 4), 45, 96); });
  return {
    id: uid(), name: e.name, pos: e.pos, rating: e.rating, ovr: e.ovr,
    level: 1, exp: 0, age, contract: randInt(2, 6),
    op: r(), aw: r(), co: r(), me: r(),
    st: clamp(Math.round(e.ovr * 0.95 + randInt(-4, 6)), 55, stCap),
    stCap, ceil,
    arcPref: choice(posArcPool(e.pos)),
    heroPool, mastery,
    status: "ok", statusRounds: 0
  };
}
function pickHeroes(pos, n) {
  // 选手熟练池：主场英雄为主，掺入该选手也会用的高匹配摇摆英雄
  const mainPool = HEROES.filter(h => h.pos === pos).map(h => h.name);
  const flexPool = HEROES.filter(h => h.pos !== pos && laneFit(h, pos) >= 0.85).map(h => h.name);
  const pool = shuffle(mainPool.slice()).concat(shuffle(flexPool.slice()));
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
  return out;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
const FA_SY = ["小", "阿", "大", "老", "子", "青", "新", "夜", "风", "云", "星", "月", "山", "海", "林", "川", "泽", "屿", "晨", "暮"];
const FA_TA = ["星", "月", "阳", "风", "雨", "辰", "帆", "野", "鹿", "鹤", "澜", "舟", "辞", "年", "河", "岚", "川", "潼", "陌", "野"];
function uniqueRookieName(pos) {
  const existing = new Set();
  S.teams.forEach(t => { POS.forEach(p => { t.players[p].forEach(pl => existing.add(pl.name)); }); });
  for (let i = 0; i < 60; i++) { const n = choice(FA_SY) + choice(FA_TA); if (!existing.has(n)) return n; }
  return "新人" + randInt(100, 999);
}
function makeRookie(pos, ovr) {
  // 仅在真实选手池耗尽时的兜底（正常情况下不会出现虚构姓名）
  const o = ovr != null ? clamp(ovr, 55, 90) : randInt(58, 82);
  return makePlayerFrom({ name: uniqueRookieName(pos), pos, rating: ratingForOvr(o), ovr: o });
}
// 从自由身池取一名【真实选手】（用尽时才兜底生成）
function takeFreeAgent(pos) {
  const list = (S && S.freeAgents && S.freeAgents[pos]) || [];
  if (list.length) return makePlayerFrom(list.splice(randInt(0, list.length - 1), 1)[0]);
  return makeRookie(pos);
}
// 把一名选手放回自由身池（后续可被任何战队签走）
function recycleToFreeAgents(p) {
  if (!S || !S.freeAgents) return;
  if (!S.freeAgents[p.pos]) S.freeAgents[p.pos] = [];
  S.freeAgents[p.pos].push({ name: p.name, pos: p.pos, rating: p.rating, ovr: p.ovr });
}
// 分配初始名单：全部使用真实选手，按总评从高到低【蛇形选秀】——
// 每队拿到「一强一弱」两人，各队战力天然接近（靠分配平衡，绝不修改任何选手的评分/属性）。
function assignRosters(names) {
  const byPos = {};
  POS.forEach(pos => { byPos[pos] = shuffle(POOL.filter(p => p.pos === pos).map(p => ({ ...p }))); });
  const leftover = {};
  POS.forEach(pos => leftover[pos] = []);
  const result = {};
  names.forEach(name => { result[name] = {}; POS.forEach(pos => result[name][pos] = []); });

  // 全局「档位」：同一支队在所有位置都靠前 / 都靠后，联盟才会出现真正的强弱差距。
  // 旧版每个位置独立随机起点 → 大数定律把 12 队抹平成 1.2% 标准差，经营强弱毫无意义。
  // 注意玩家是 names[0]，其名次 = (n - off) % n：off=1 时玩家恰好抽到垫底，
  // 12% 战力差 + 自动 BP 会变成地狱开局，这里回避掉。
  let baseOff = randInt(0, names.length - 1);
  if (baseOff === 1) baseOff = 2;   // off=1 → 玩家第 12；改成 2 → 第 11，最差也不垫底

  POS.forEach((pos, pi) => {
    const need = names.length * 2;
    let list = byPos[pos].slice().sort((a, b) => b.ovr - a.ovr);
    // 预留 2 名「中上水平」的选手不参加选秀，作为赛季初转会市场的自由身（否则市场只剩最弱的替补）
    const reserve = list.filter(e => e.ovr >= 78 && e.ovr <= 87);
    const preLeft = [];
    while (preLeft.length < 2 && reserve.length) preLeft.push(reserve.splice(randInt(0, reserve.length - 1), 1)[0]);
    list = list.filter(e => !preLeft.includes(e));
    const take = list.slice(0, need), rest = list.slice(need);
    // 蛇形：0..n-1 拿排名 1..n，n-1..0 拿排名 n+1..2n → 各队两人名次之和几乎相同
    const idxs = names.map((_, i) => i);
    // 「首发取全队最强」意味着「拿到第 1 名的人就是该位置最强首发」。
    // 起点以全局 baseOff 为主（±1 抖动，避免五个位置完全一致），于是强队各位置都靠前、
    // 弱队各位置都靠后 —— 联盟才会自然分出层次（实测极差 ~12%，接近真实 KPL）。
    const off = baseOff;   // 同一支队在所有位置都用同一个起点
    const rot = idxs.slice(off).concat(idxs.slice(0, off));
    const order = rot.concat(rot);   // 同向：队 i 拿第 i 与第 n+i 名 → 强队首发强、替补也强
    order.forEach((teamIdx, i) => { const e = take[i]; if (e) result[names[teamIdx]][pos].push(makePlayerFrom(e)); });
    rest.forEach(e => leftover[pos].push(e));
    preLeft.forEach(e => leftover[pos].push(e));
  });
  names.forEach(n => POS.forEach(pos => {
    while (result[n][pos].length < 2) result[n][pos].push(makePlayerFrom(choice(POOL.filter(p => p.pos === pos))));
    result[n][pos].sort((a, b) => b.ovr - a.ovr); // 首发用更强的
  }));
  POS.forEach(pos => shuffle(leftover[pos]));
  return { result, leftover };
}
function freeAgentEntry(pos) { return choice(POOL.filter(p => p.pos === pos)); }
/* ---------------- 难度 = 对手 BP 水平（不改任何战力/属性） ----------------
   新秀：会犯小错——不读对手英雄池、不针对克制、偶尔拿"舒适英雄"；
         但仍然认分路、仍会挑强度高的英雄（不降智，只是不够细）。
   职业：常规水平——看克制、看自家选手擅长、读阵容前排/输出。
   传奇：近乎最优——几乎总拿最强解，ban 直指你的核心英雄。
   「真实大名单」模式：对手 BP 水平固定按传奇处理（强队 + 强 BP）。 */
const BP_LEVELS = {
  新秀: {
    name: "新秀", noise: 0.24, topN: 5, profW: 0.50, fitW: 0.78, counterW: 0.22,
    compAware: false, banPoolN: 8, banRandom: 0.85, banUseThreat: false, peakTopN: 4
  },
  职业: {
    name: "职业", noise: 0.18, topN: 4, profW: 0.85, fitW: 0.85, counterW: 0.85,
    compAware: true, banPoolN: 4, banRandom: 0.25, banUseThreat: true, peakTopN: 3
  },
  传奇: {
    name: "传奇", noise: 0.08, topN: 2, profW: 1.0, fitW: 1.0, counterW: 0.96,
    compAware: true, banPoolN: 2, banRandom: 0.03, banUseThreat: true, peakTopN: 1
  }
};
function aiBpLevel() {
  if (S && S.rosterMode === "real") return "传奇";     // 真实大名单：BP 按传奇
  const d = S && S.difficulty;
  return BP_LEVELS[d] ? d : "职业";
}
const LANE_PICK_FLOOR = 0.88;   // AI 选将的分路下限（摇摆·常见 0.95 / 摇摆 0.88 才用；逆用直接排除）
function aiBpCfg() { return BP_LEVELS[aiBpLevel()] || BP_LEVELS["职业"]; }
function aiBpLabel() { return aiBpLevel(); }
function posArcPool(pos) {
  return { top: ["fighter", "tank"], jungle: ["assassin", "fighter"], mid: ["mage", "assassin"], bot: ["marksman"], support: ["support", "tank"] }[pos];
}
function makeTeam(name, tier, players) {
  return {
    id: uid(), name, tier, players, lineup: {},
    persona: rollPersona(),   // 战术人格：只影响 BP 偏好（±3~8%），不是固定套路
    wins: 0, losses: 0, points: 0,
    // 所有战队（含 AI）起点一致：相同资金、相同声望、相同粉丝量级
    fans: 30000,
    money: 250, trainPoints: 12, streak: 0,
    prestige: 45
  };
}
function initLineup(team) {
  POS.forEach(pos => {
    const best = team.players[pos].slice().sort((a, b) => b.ovr - a.ovr)[0];
    team.lineup[pos] = best.id;
  });
}
// 首发伤停 → 换健康替补（没有就带伤上）。玩家在 startMatch 里走同一套逻辑，
// AI 战队也要走，否则伤员会一直挂在首发上、该位置战力为 0，
// 而玩家会自动换人 —— 等于玩家平白多一个位置的优势。
function autoFixInjuredLineup(team) {
  if (!team) return [];
  const changed = [];
  POS.forEach(pos => {
    const cur = getPlayer(team, team.lineup[pos]);
    if (!cur || cur.status !== "inj" || !(cur.statusRounds > 0)) return;
    const bench = team.players[pos]
      .filter(p => p.id !== cur.id && !(p.status === "inj" && p.statusRounds > 0))
      .sort((a, b) => b.ovr - a.ovr);
    if (bench.length) { team.lineup[pos] = bench[0].id; changed.push({ pos, from: cur, to: bench[0] }); }
    else { cur.status = "ok"; cur.statusRounds = 0; changed.push({ pos, from: cur, to: cur, forced: true }); }
  });
  return changed;
}

/* ---------------- 全局状态 ---------------- */
let S = null;

function newGame(opts) {
  const myName = opts.teamName || choice(TEAMS);
  const rivalNames = TEAMS.filter(t => t !== myName);
  // 两个独立维度：难度（只影响对手战力）与名单模式（平衡选秀 / 真实大名单）
  const diff = (opts.difficulty === "真实") ? "职业" : (opts.difficulty || "职业");
  const rosterMode = opts.rosterMode || (opts.difficulty === "真实" ? "real" : "draft");
  const { result: rosterMap, leftover } = (rosterMode === "real")
    ? buildRealRosters([myName, ...rivalNames])
    : assignRosters([myName, ...rivalNames]);
  const teams = [];
  const myTeam = makeTeam(myName, diff, rosterMap[myName]);
  initLineup(myTeam);
  teams.push(myTeam);
  rivalNames.forEach(n => {
    const t = makeTeam(n, diff, rosterMap[n]);
    initLineup(t);
    teams.push(t);
  });
  // 不再对选手做任何战力加成/削弱：真实评分保持原样，
  // 开局平衡完全靠「蛇形选秀」的分配来完成；难度只影响对手 BP 水平（见 BP_LEVELS）。

  const _sch = buildSchedule(myTeam.id, teams);
  S = {
    version: 9, page: "main", tab: "team", slot: clamp(opts.slot || 1, 1, SLOT_COUNT),
    saveName: String(opts.saveName || "").slice(0, 24),
    difficulty: diff, rosterMode, myTeamId: myTeam.id, season: 1,
    teams, round: 1, maxRegular: 11, phase: "regular",
    schedule: _sch.schedule,
    fixtures: _sch.fixtures,
    trainPoints: 12,
    series: null, bracket: null, pendingPlayoff: null,
    report: null, reportRewards: null, event: null, log: [],
    market: null, freeAgents: leftover,
    transfersUsed: 0, maxTransfers: 3,
    loansUsed: 0, maxLoans: 1, loans: [],
    transferWindow: true, aiTransfers: [], transferSeen: 0,
    staff: { mental: 0, fitness: 0, analyst: 0 },
    kpi: null, kpiResult: null,
    fanMeets: 0, maxFanMeets: 2, gameOver: null,
    champion: false, seasonResult: null, history: [],
    contractNotices: [], undo: null, savedAt: Date.now()
  };
  S.maxRegular = S.schedule.length;
  S.kpi = makeKpi();          // 董事会赛季目标
  buildMarket();          // 赛季初自动刷新转会市场（赛季内不变）
  maybeEvent({ safe: true });   // 开局/新赛季首日不出伤病
  save();
  render();
}
// 完整单循环赛程（圆桌法）：返回我的赛程 + 全部对阵
function buildSchedule(myId, teams) {
  const ids = teams.map(t => t.id);
  const rounds = roundRobin(ids);
  const fixtures = rounds.map(r => r.map(([a, b]) => ({ a, b, played: false })));
  const schedule = rounds.map((r, i) => {
    const pair = r.find(p => p[0] === myId || p[1] === myId);
    const oppId = pair[0] === myId ? pair[1] : pair[0];
    return { round: i + 1, oppId, played: false };
  });
  return { schedule, fixtures };
}
function roundRobin(ids) {
  const arr = ids.slice();
  if (arr.length % 2 === 1) arr.push(null); // 奇数补位
  const n = arr.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a && b) round.push([a, b]);
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()); // 固定第一个，其余轮转
  }
  return rounds;
}
// 战队比赛收益（AI 战队与玩家同规则：胜者拿资金/粉丝/声望）
function addTeamPrestige(team, delta, reason) {
  if (!team) return;
  team.prestige = clamp(team.prestige + delta, 0, 100);
  if (Math.abs(delta) >= 0.01) {
    S.log.unshift(`S${S.season}R${S.round} ${team.name} 声望${delta >= 0 ? "+" : ""}${delta}（${reason}）`);
    if (S.log.length > 60) S.log.pop();
  }
}
// 战队比赛收益：与玩家完全同规则（胜 +1.5声望 / 负 -1.2，季后赛胜 +3 / 负 -2）
function awardTeamMatch(team, win, playoff) {
  if (!team) return null;
  const mul = playoff ? 1.8 : 1;
  const money = Math.round((win ? randInt(20, 40) : randInt(6, 14)) * mul);
  const fans = Math.round((win ? randInt(4000, 11000) : -randInt(800, 3500)) * (1 + team.prestige / 150));
  team.money += money;
  team.fans = Math.max(1000, team.fans + fans);
  addTeamPrestige(team, win ? (playoff ? 3 : 1.5) : (playoff ? -2 : -1.2), playoff ? (win ? "季后赛胜利" : "季后赛失利") : (win ? "系列赛胜利" : "系列赛失利"));
  return { money, fans };
}
// 赛季结算：其他战队与玩家同规则（进季后赛 +3、无缘季后赛 -8、冠军 +15、亚军 +4）
function finalizeAiPrestige() {
  if (!S || !S.teams) return;
  // 没进季后赛（我未进四强）时没有 bracket，需要按常规赛积分榜取前四，否则会把四强也扣 -8
  let top4 = (S.bracket && S.bracket.order) || [];
  if (!top4.length) {
    top4 = standingsSorted().slice(0, 4).map(t => t.id);
  }
  const gf = S.bracket && S.bracket.resolved && S.bracket.resolved.gf;
  const champId = S.champion ? S.myTeamId : (gf ? gf.winner : null);
  const runnerId = gf ? gf.loser : null;
  S.teams.forEach(t => {
    if (t.id === S.myTeamId) return; // 玩家已按原有规则结算
    let d = top4.includes(t.id) ? 3 : -8;
    if (champId && t.id === champId) d = 15;
    else if (runnerId && t.id === runnerId) d = 4;
    addTeamPrestige(t, d, d > 0 ? (d >= 15 ? "总冠军" : d === 4 ? "亚军" : "晋级季后赛") : "无缘季后赛");
  });
}
// 结算某轮中「非我方」的对阵（其他战队也比赛，保证场次一致）
// 一套"BP 阵容"：按分路取选手擅长英雄。
// ownUsed = 本系列赛本队已用（近似全局BP）；takenNow = 本局对方已选（同一局双方不能重复）。
// 注意：local 会随生成立即更新，保证同一条阵容内部 5 个英雄互不重复。
function aiSeriesLineup(team, ownUsed, takenNow) {
  const local = (ownUsed || []).slice().concat(takenNow || []);
  return POS.map(pos => {
    const p = getPlayer(team, team.lineup[pos]);
    if (!p) return "—";
    const own = (p.heroPool || []).filter(h => heroByName(h));
    let pick = choice(own.filter(h => !local.includes(h))) || null;
    if (!pick) {
      // 兜底：先用本分路匹配的英雄，再退到全部英雄（都排除已用，避免重复）
      const laneCand = HEROES.filter(h => laneFit(h, pos) >= 1 && !local.includes(h.name));
      const anyCand = HEROES.filter(h => !local.includes(h.name));
      pick = laneCand.length ? choice(laneCand).name
        : anyCand.length ? choice(anyCand).name
        : (own.find(h => !local.includes(h)) || "—");
    }
    if (pick && pick !== "—") local.push(pick);
    return pick || "—";
  });
}
// AI 战队打完自己的比赛同样消耗体能（否则它们永远满体力，玩家会被系统性压制）
function wearTeamStamina(team, games) {
  if (!team) return;
  const cost = GAME_STAMINA_COST * Math.max(1, games || 1);
  POS.forEach(pos => {
    const p = getPlayer(team, team.lineup[pos]);
    if (p) p.st = clamp(p.st - cost, STAMINA_FLOOR, 100);
  });
}
// 模拟 AI vs AI 的 BO 系列赛：返回比分与每局双方阵容
function simAiSeries(aTeam, bTeam, bestOf) {
  const need = Math.ceil(bestOf / 2);
  let sa = 0, sb = 0, guard = 0;
  const games = [], usedA = [], usedB = [];
  while (sa < need && sb < need && guard++ < 20) {
    const pa = teamPower(aTeam), pb = teamPower(bTeam);
    const pWinA = 1 / (1 + Math.pow(10, (pb - pa) / 22));
    const aWin = rand() < clamp(pWinA + (rand() - 0.5) * 0.12, 0.05, 0.95);
    // BO7 打到 3:3 → 第 7 局为巅峰对决：不受全局BP限制、双方可撞英雄
    const isPeak = bestOf === 7 && sa === 3 && sb === 3 && games.length === 6;
    let luA, luB;
    if (isPeak) {
      luA = aiPeakPicks(aTeam).map(e => e.hero);
      luB = aiPeakPicks(bTeam).map(e => e.hero);
    } else {
      luA = aiSeriesLineup(aTeam, usedA, []);
      luB = aiSeriesLineup(bTeam, usedB, luA.filter(h => h !== "—")); // 同一局双方英雄也不同
      luA.forEach(h => { if (h !== "—") usedA.push(h); });
      luB.forEach(h => { if (h !== "—") usedB.push(h); });
    }
    games.push({ aWin, luA, luB, peak: isPeak });
    if (aWin) sa++; else sb++;
  }
  return { sa, sb, games };
}
// 结算某轮中「非我方」的对阵（其他战队也比赛，保证场次一致；记录比分与阵容）
function simRoundAIFixtures(round) {
  const fx = (S.fixtures || [])[round - 1];
  if (!fx) return;
  const bestOf = S.phase === "playoff" ? 7 : 5;
  fx.forEach(f => {
    if (f.played) return;
    if (f.a === S.myTeamId || f.b === S.myTeamId) return; // 我的比赛由玩家打
    const A = S.teams.find(t => t.id === f.a), B = S.teams.find(t => t.id === f.b);
    if (!A || !B) { f.played = true; return; }
    const r = simAiSeries(A, B, bestOf);
    f.sa = r.sa; f.sb = r.sb; f.games = r.games; f.played = true;
    wearTeamStamina(A, r.games.length); wearTeamStamina(B, r.games.length);
    const aWin = r.sa > r.sb;
    const wt = aWin ? A : B, lt = aWin ? B : A;
    wt.wins++; wt.points += 2; wt.streak++;
    lt.losses++; lt.streak = 0;
    awardTeamMatch(wt, true, S.phase === "playoff");
    awardTeamMatch(lt, false, S.phase === "playoff");
  });
}

/* ---------------- 计算 ---------------- */
function counterMult(atkArc, defArc) { return (COUNTER[atkArc] && COUNTER[atkArc][defArc]) || 1.0; }
function counterLabel(atkArc, defArc) {
  if (counterMult(atkArc, defArc) > 1) return "克制";
  if (counterMult(defArc, atkArc) > 1) return "被克";
  return "均势";
}
function heroByName(name) { return HEROES.find(h => h.name === name); }
function heroStrength(h) { return (h.o + h.s + h.c + h.m) / 4; }
function getPlayer(team, id) { for (const pos of POS) for (const p of team.players[pos]) if (p.id === id) return p; return null; }
function getMyTeam() { return (S && S.teams) ? S.teams.find(t => t.id === S.myTeamId) : null; }
function teamName(id) { const t = S.teams.find(x => x.id === id); return t ? t.name : "?"; }
function statusMul(p) { return p.status === "hot" ? 1.12 : p.status === "low" ? 0.90 : 1.0; }
function statusLabel(p) {
  return { ok: ["status-ok", "正常"], hot: ["status-hot", "火热"], low: ["status-low", "低迷"], inj: ["status-inj", "伤病"] }[p.status] || ["status-ok", "正常"];
}
/* ---------------- 体能 ---------------- */
// 每局 -4：一场 BO5 ≈ -16、BO7 ≈ -28。轮间 +14 略低于一场 BO5 的消耗，
// 所以常规赛会缓慢下滑（需要偶尔轮换/休息），但不会一路趴到下限。
const GAME_STAMINA_COST = 4;
const REST_STAMINA_GAIN = 16;  // 全队休息（2 训练点）
const ROUND_STAMINA_GAIN = 11; // 每轮自然恢复：略低于一场 BO5 的消耗，全季缓慢下滑，需要主动轮换/休息
const PLAYOFF_REST_GAIN = 18;  // 季后赛每场开赛前的「休整日」，低于一场 BO7 的消耗（连续打会掉体能）
const STAMINA_FLOOR = 35;

/* ---------------- 教练组（职员） ----------------
   现实里教练不是自己练属性，而是"配班子"：花钱请人，换长期收益。
   一次性聘用费 + 每赛季工资（赛季末结算，付不起会有人离职）。 */
const STAFF_DEFS = [
  { key: "mental", name: "心理咨询师", icon: "🧠", max: 3, cost: [90, 180, 300], wage: [6, 12, 20],
    effect: lv => `每轮全队心态 +${lv * 2}；低迷更容易自愈` },
  { key: "fitness", name: "体能教练", icon: "🏋️", max: 3, cost: [90, 180, 300], wage: [6, 12, 20],
    effect: lv => `每局体力消耗 -${lv}；全队休息 +${lv * 4} 体能` },
  { key: "analyst", name: "数据分析师", icon: "📊", max: 3, cost: [100, 200, 320], wage: [7, 14, 22],
    effect: lv => `每轮训练点 +${lv}；BP 对手情报 +${lv * 2} 个；赛前胜算更精确` }
];
function staffLevel(key) { return (S && S.staff && S.staff[key]) || 0; }
function staffWage() { return STAFF_DEFS.reduce((a, d) => a + (d.wage[staffLevel(d.key) - 1] || 0), 0); }
function staminaCostPerGame() { return Math.max(2, GAME_STAMINA_COST - staffLevel("fitness")); }
function restGain() { return REST_STAMINA_GAIN + staffLevel("fitness") * 4; }
function intelSize() { return 6 + staffLevel("analyst") * 2; }
// 每轮开赛前的教练组被动收益（心理教练）
function applyStaffPassive() {
  const lv = staffLevel("mental");
  if (!lv) return 0;
  const t = getMyTeam();
  if (!t) return 0;
  POS.forEach(pos => t.players[pos].forEach(p => {
    p.me = clamp(p.me + lv * 2, 40, p.ceil);
    if (lv >= 2 && p.status === "low") { p.status = "ok"; p.statusRounds = 0; }
  }));
  return lv * 2;
}
function staminaLevel(p) { return p.st <= 45 ? "crit" : p.st <= 60 ? "low" : ""; }
function staminaTagHtml(p) {
  const lv = staminaLevel(p);
  if (!lv) return "";
  return `<span class="st-tag ${lv}" aria-label="体能${lv === "crit" ? "告急" : "偏低"}">${lv === "crit" ? "体力告急" : "体能偏低"} ${Math.round(p.st)}</span>`;
}
// 选手当前综合价值（用于轮换比较）
function lineupValue(p) { return p.op * 0.30 + p.aw * 0.25 + p.co * 0.20 + p.me * 0.10 + p.st * 0.15; }
// 一键轮换建议：伤停必换；体能过低且替补明显更能跑时轮换（弱不超过 8 总评）
function rotationSuggest(team) {
  const out = [];
  POS.forEach(pos => {
    const cur = getPlayer(team, team.lineup[pos]);
    if (!cur) return;
    const bench = team.players[pos].filter(p => p.id !== cur.id && !(p.status === "inj" && p.statusRounds > 0));
    if (!bench.length) return;
    const best = bench.slice().sort((a, b) => lineupValue(b) - lineupValue(a))[0];
    if (cur.status === "inj" && cur.statusRounds > 0) { out.push({ pos, from: cur, to: best, reason: "伤停" }); return; }
    if (cur.st <= 55 && best.st >= cur.st + 12 && best.ovr >= cur.ovr - 8) { out.push({ pos, from: cur, to: best, reason: `体能 ${Math.round(cur.st)}→${Math.round(best.st)}` }); return; }
    if (cur.status === "low" && best.ovr >= cur.ovr - 2 && best.st >= 60) { out.push({ pos, from: cur, to: best, reason: "低迷换人" }); }
  });
  return out;
}
function applyRotation(auto) {
  const t = getMyTeam();
  const sug = rotationSuggest(t);
  if (!sug.length) { toast("无需轮换：首发体能充足、状态正常"); return; }
  if (!auto) {
    confirmDialog({
      title: "一键轮换建议",
      body: sug.map(x => `<div>• <b>${POS_NAME[x.pos]}</b>：${escapeHtml(x.from.name)} → <b style="color:var(--gold)">${escapeHtml(x.to.name)}</b>（${escapeHtml(x.reason)}）</div>`).join(""),
      okText: "按建议轮换"
    }).then(ok => { if (ok) applyRotation(true); });
    return;
  }
  snapshot("一键轮换");
  sug.forEach(x => { t.lineup[x.pos] = x.to.id; });
  S.log.unshift(`S${S.season}R${S.round} 轮换：${sug.map(x => `${POS_NAME[x.pos]}${x.from.name}→${x.to.name}`).join("、")}`);
  toast(`已轮换 ${sug.length} 个位置`);
  save(); render();
}
/* 板凳深度：每个位置「第二强」的选手同样贡献一部分战力（默认 15%）。
   1) 现实里轮换深度决定长赛季稳定性；
   2) 让「双强主力 + 强替补」的队真的更强，联盟才有层次（否则首发取最强会把 12 队抹平）；
   3) 让转会/青训买替补不再只是"备胎"。 */
const BENCH_WEIGHT = 0.15;
function attrPowerOf(p) { return p.op * 0.30 + p.aw * 0.25 + p.co * 0.20 + p.me * 0.10 + p.st * 0.15; }
function benchBest(team, pos) {
  if (!team) return null;
  const starterId = team.lineup[pos];
  const list = (team.players[pos] || []).filter(p => p.id !== starterId && !(p.status === "inj" && p.statusRounds > 0));
  if (!list.length) return null;
  return list.slice().sort((a, b) => attrPowerOf(b) - attrPowerOf(a))[0];
}
function posPower(p, hero, oppHero, tactic, pos, benchP) {
  if (!p || !hero || !oppHero) return 0;
  if (p.status === "inj" && p.statusRounds > 0) return 0;
  let attrPower = attrPowerOf(p);
  if (benchP && BENCH_WEIGHT > 0) attrPower = attrPower * (1 - BENCH_WEIGHT) + attrPowerOf(benchP) * BENCH_WEIGHT;
  const hs = heroStrength(hero) / 100;
  const proficient = profOf(p, hero.name); // 熟练度 0~100 连续换算（绝活 ≈1.11 / 生疏 ≈0.94）
  const fit = pos != null ? laneFit(hero, pos) : 1.0;              // 英雄与分路匹配度（不匹配掉战斗力）
  const counter = matchupMult(hero, oppHero); // 定位克制 × 英雄级克制（可跨分路）
  const tacticMul = tactic === "攻" ? 1.05 : tactic === "奇" ? 1.03 : 1.0;
  // 单局状态波动：原本 ±8%/人，5 个位置累积后战力比波动 ±5%，
  // 把玩家的 BP/训练/体能影响（±1~2%）完全淹没。收敛到 ±3%，让决策可被感知；
  // 「意外」交给局内事件（swing），那是玩家看得见、能归因的。
  return attrPower * (0.6 + hs * 0.5) * proficient * fit * counter * statusMul(p) * tacticMul * (0.97 + rand() * 0.06);
}
function teamPower(team) {
  let tot = 0;
  POS.forEach(pos => {
    const p = getPlayer(team, team.lineup[pos]);
    if (!p || p.status === "inj") return;
    let ap = attrPowerOf(p);
    const b = benchBest(team, pos);
    if (b) ap = ap * (1 - BENCH_WEIGHT) + attrPowerOf(b) * BENCH_WEIGHT;
    tot += ap * POS_WEIGHT[pos];
  });
  return tot;
}
function simAI(idA, idB) {
  const a = S.teams.find(t => t.id === idA), b = S.teams.find(t => t.id === idB);
  const pa = teamPower(a), pb = teamPower(b);
  return pa + rand() * 20 >= pb + rand() * 20 ? idA : idB;
}

/* ---------------- BP 官方规则（四阶段，每方5个ban） ----------------
   阶段一 禁用：蓝→红→蓝→红（4）
   阶段二 选择：蓝→红 红→蓝 蓝→红（6）
   阶段三 禁用：红→蓝→红→蓝→红→蓝（6）
   阶段四 选择：红→蓝 蓝→红（4）
   合计 10 ban（每方5）+ 10 选将（每方5） */
function buildDraftSteps() {
  const s = [];
  ["blue", "red", "blue", "red"].forEach(a => s.push({ actor: a, type: "ban" }));                 // 阶段一
  ["blue", "red", "red", "blue", "blue", "red"].forEach(a => s.push({ actor: a, type: "pick" }));   // 阶段二
  ["red", "blue", "red", "blue", "red", "blue"].forEach(a => s.push({ actor: a, type: "ban" }));    // 阶段三
  ["red", "blue", "blue", "red"].forEach(a => s.push({ actor: a, type: "pick" }));                  // 阶段四
  return s;
}
function aiSide(d) { return d.mySide === "blue" ? "red" : "blue"; }

/* ---------------- 巅峰对决（BO7 打到 3:3 时的第 7 局） ----------------
   官方规则：无 ban、双方盲选、不受全局 BP 影响（此前用过的英雄仍可选）、
   双方甚至可以选到同一个英雄。
   实现：进入本局时先决定 AI 的 5 个英雄但隐藏（盲选），玩家填满 5 个后立即揭示并开打。 */
function isPeakGame(s) {
  return !!(s && s.kind === "playoff" && s.bestOf === 7 && s.myScore === 3 && s.opScore === 3 &&
    (s.games || []).length === 6);
}
function peakHeroScore(h, pos, team) {
  const starter = getPlayer(team, team.lineup[pos]);
  const prof = profOf(starter, h.name);
  return heroStrength(h) * prof * laneFit(h, pos);
}
// AI 的巅峰对决盲选阵容（每个分路取较优解，同队内不重复；盲选质量同样随 BP 难度变化）
function aiPeakPicks(team) {
  const topN = (aiBpCfg() || {}).peakTopN || 2;
  return POS.map(pos => {
    const list = HEROES.filter(h => h.pos === pos).slice()
      .sort((a, b) => peakHeroScore(b, pos, team) - peakHeroScore(a, pos, team));
    const pick = list[randInt(0, Math.min(topN - 1, list.length - 1))] || list[0];
    return { pos, hero: pick ? pick.name : "—" };
  });
}
// 玩家侧一键选人（巅峰对决专用：不受全局 BP 限制）
function myPeakAutoPick(pos) {
  if (!autoBpAllowed()) return null;
  const myT = getMyTeam();
  const list = HEROES.filter(h => h.pos === pos).slice()
    .sort((a, b) => peakHeroScore(b, pos, myT) - peakHeroScore(a, pos, myT));
  if (!list.length) return null;
  const n = Math.max(1, Math.min(3, list.length));
  return list[randInt(0, n - 1)].name;
}
// 揭示对手盲选并开打（双方阵容都已就绪）
function finishPeakDraft() {
  const s = S.series, d = s.draft;
  d.picks[aiSide(d)] = (d.peakAi || aiPeakPicks(S.teams.find(t => t.id === s.oppId))).slice();
  d.over = true; d.phase = "done";
  simGame();
}function sideName(s) { return s === "blue" ? "蓝方" : "红方"; }
function filledPos(d, side) { return d.picks[side].map(e => e.pos); }
/* ---------------- 全局BP：以【战队】为单位记录已用英雄（与红蓝方完全无关） ----------------
   阵营（蓝/红）每局都会互换，因此英雄归属只按 teamId 存，绝不按 side 存。
   usedByTeam = { [teamId]: ["英雄", ...] }                                        */
function seriesTeamUsed(teamId) {
  const s = S.series;
  if (!s.usedByTeam) s.usedByTeam = {};
  if (!s.usedByTeam[teamId]) s.usedByTeam[teamId] = [];
  return s.usedByTeam[teamId];
}
function myUsed() { return seriesTeamUsed(S.myTeamId); }
function oppUsed() { return seriesTeamUsed(S.series.oppId); }
// 阵营 → 战队：阵营每局变，战队不变
function teamIdOfSide(side) { const s = S.series; return side === s.draft.mySide ? S.myTeamId : s.oppId; }
function usedOfSide(side) { return seriesTeamUsed(teamIdOfSide(side)); }
function usedOfOtherSide(side) { const s = S.series; return seriesTeamUsed(teamIdOfSide(side) === S.myTeamId ? s.oppId : S.myTeamId); }
// 全局BP已用英雄（合并，仅供展示）
function allUsedHeroes() { return Array.from(new Set(myUsed().concat(oppUsed()))); }
// 选将池：只排除「本战队」用过的英雄；对方用过的我方仍可选用
function availPickHeroes(side) {
  const own = usedOfSide(side);
  return HEROES.filter(h => !own.includes(h.name) && !S.series.draft.used.includes(h.name));
}
function availHeroes() { return availPickHeroes(S.series.draft.mySide); }
// ban位池：只去掉「对方战队」用过的英雄（本队用过的仍可 ban，只是不能选）
function availBanHeroes(forMySide) {
  const otherUsed = forMySide ? oppUsed() : myUsed();
  return HEROES.filter(h => !otherUsed.includes(h.name) && !S.series.draft.used.includes(h.name));
}
function currentStep() {
  const d = S.series.draft;
  return d.stepIndex < d.steps.length ? d.steps[d.stepIndex] : null;
}
function currentActor() { const st = currentStep(); return st ? st.actor : null; }
/* 我值多少分（用于 AI 判断该 ban 谁）：我在哪个分路拿到这个英雄最赚 */
function myThreatScore(h) {
  const my = getMyTeam();
  if (!my || !h) return 0;
  let best = 0;
  POS.forEach(pos => {
    const p = getPlayer(my, my.lineup[pos]);
    if (!p) return;
    const prof = profOf(p, h.name);
    const sc = heroStrength(h) * prof * laneFit(h, pos) * (POS_WEIGHT[pos] || 1);
    if (sc > best) best = sc;
  });
  return best;
}
// AI 的 ban：难度决定「是否读我的英雄池 / 是否针对我的核心」
//  新秀：约一半回合根本不看我会什么，只按当前版本强度 ban；另一半才看威胁，且候选范围很宽
//  职业：按我对每个英雄的威胁值排序，在前 4 里挑
//  传奇：几乎总是直接 ban 我的第一核心
function aiBanHero() {
  const cfg = aiBpCfg();
  const pool = availBanHeroes(false);          // 去掉我方战队已用过的（对 AI 而言是对方）
  if (!pool.length) return null;
  const byStrength = pool.slice().sort((a, b) => heroStrength(b) - heroStrength(a));
  const byThreat = pool.map(h => ({ h, sc: myThreatScore(h) })).sort((a, b) => b.sc - a.sc).map(x => x.h.name);
  if (!cfg.banUseThreat) {
    // 新秀：一半回合只按版本强度 ban（不看我会什么）；另一半"凭印象"针对，但只在最扎眼的 3 个里挑
    if (rand() < 0.5) {
      const n = Math.max(1, Math.min(3, byThreat.length));
      return byThreat[randInt(0, n - 1)];
    }
    const n = Math.max(1, Math.min(cfg.banPoolN, byStrength.length));
    return byStrength[randInt(0, n - 1)].name;
  }
  const n = Math.max(1, Math.min(cfg.banPoolN, byThreat.length));
  const idx = (rand() < cfg.banRandom) ? randInt(0, n - 1) : 0;
  return byThreat[idx];
}
// AI 读阵容：缺前排/缺输出/缺控制时，优先补对应定位（仅职业/传奇）
function aiCompFactor(d, side, hero) {
  const picks = d.picks[side].map(e => heroByName(e.hero)).filter(Boolean);
  const front = picks.filter(h => h.arc === "tank" || h.arc === "support").length;
  const dmg = picks.filter(h => ["mage", "marksman", "assassin", "fighter"].includes(h.arc)).length;
  const cc = picks.filter(h => h.c >= 70).length;
  let f = 1;
  if (front < 2 && (hero.arc === "tank" || hero.arc === "support")) f *= 1.08;
  if (dmg < 3 && ["mage", "marksman", "assassin", "fighter"].includes(hero.arc)) f *= 1.05;
  if (cc < 2 && hero.c >= 70) f *= 1.05;
  return f;
}
/* ---------------- AI 战术人格 ----------------
   注意：人格只是"把某些分路/定位的打分抬高 3~8%"，不是固定套路。
   所以同一支队伍在不同局、不同对手、不同 BP 顺序下依然会选出不一样的阵容，
   只是整体上更偏向某种风格。 */
const PERSONAS = [
  { key: "protect", name: "四保一", desc: "围绕射手打资源，前排与控制拉满",
    pos: { bot: 1.07 }, arc: { marksman: 1.06, tank: 1.05, support: 1.05, assassin: 0.94 } },
  { key: "jungleCore", name: "野核", desc: "资源全给打野，前期入侵抢节奏",
    pos: { jungle: 1.08 }, arc: { assassin: 1.06, fighter: 1.03, tank: 0.96 } },
  { key: "brawl", name: "打架队", desc: "全员开团，靠团战滚雪球",
    pos: { support: 1.03 }, arc: { fighter: 1.06, assassin: 1.03, mage: 1.02, tank: 1.02, marksman: 0.97 } },
  { key: "macro", name: "运营流", desc: "稳线运营，靠后期阵容厚度",
    pos: { top: 1.03, support: 1.04 }, arc: { tank: 1.05, support: 1.04, marksman: 1.03, assassin: 0.96 } },
  { key: "midJungle", name: "中野联动", desc: "中野双游走，抓边打开局面",
    pos: { mid: 1.06, jungle: 1.05 }, arc: { mage: 1.05, assassin: 1.03, marksman: 0.98 } },
  { key: "flex", name: "全英雄池", desc: "没有明显偏好，见招拆招", pos: {}, arc: {} }
];
function personaOf(team) {
  const flex = PERSONAS[PERSONAS.length - 1];
  return (team && team.persona && PERSONAS.find(p => p.key === team.persona)) || flex;
}
function rollPersona() {
  const pool = [];
  PERSONAS.forEach(p => { const w = p.key === "flex" ? 3 : 1; for (let i = 0; i < w; i++) pool.push(p.key); });
  return choice(pool);
}
function aiPickTurn(st) {
  const s = S.series, d = s.draft, side = st.actor;
  const aiTeam = S.teams.find(t => t.id === s.oppId);
  const cfg = aiBpCfg();
  const per = personaOf(aiTeam);
  const filled = filledPos(d, side);
  const unfilled = POS.filter(p => !filled.includes(p));
  const pool = availPickHeroes(side);
  const cands = [];
  unfilled.forEach(pos => {
    const starter = getPlayer(aiTeam, aiTeam.lineup[pos]);
    const enemy = (d.picks[d.mySide] || []).find(e => e.pos === pos);
    const enemyHero = enemy ? heroByName(enemy.hero) : null;
    // 底线：AI 不会把英雄塞到明显不适合的分路（摇摆·常见及以上才考虑），
    // 只有整个分路池都被 BP 吃光时才放宽——保证「低难度也不降智」。
    const laneOk = pool.filter(h => laneFit(h, pos) >= LANE_PICK_FLOOR);
    const usePool = laneOk.length ? laneOk : pool;
    usePool.forEach(h => {
      const prof = profOf(starter, h.name);
      const fit = laneFit(h, pos);
      const counter = enemyHero ? matchupMult(h, enemyHero) : 1;
      let sc = heroStrength(h);
      sc *= 1 + (prof - 1) * cfg.profW;        // 选手擅长（新秀权重低）
      sc *= 1 - (1 - fit) * cfg.fitW;          // 分路匹配（新秀容忍度高一点）
      sc *= 1 + (counter - 1) * cfg.counterW;  // 克制对手（新秀基本不读）
      // 战术人格：小幅偏好（±3~8%），不是固定套路
      sc *= (per.pos[pos] || 1) * (per.arc[h.arc] || 1);
      if (cfg.compAware) sc *= aiCompFactor(d, side, h);
      sc *= 1 + cfg.noise * (rand() * 2 - 1);  // 判断噪声 = 失误率
      cands.push({ pos, hero: h, sc });
    });
  });
  if (!cands.length) return;
  cands.sort((a, b) => b.sc - a.sc);
  const n = Math.max(1, Math.min(cfg.topN, cands.length));
  const pick = cands[randInt(0, n - 1)];
  d.picks[side].push({ pos: pick.pos, hero: pick.hero.name });
  d.used.push(pick.hero.name);
}
function runDraftAI() {
  const d = S.series.draft;
  if (d.peak) return; // 巅峰对决：双方盲选，没有 AI 回合可跑
  let guard = 0;
  while (guard++ < 200 && d.stepIndex < d.steps.length) {
    const st = d.steps[d.stepIndex];
    if (st.actor === d.mySide) break;
    if (st.type === "ban") { const hn = aiBanHero(); if (hn) { d.bans[st.actor].push(hn); d.used.push(hn); } }
    else aiPickTurn(st);
    d.stepIndex++;
  }
  if (d.stepIndex >= d.steps.length) { d.over = true; d.phase = "done"; }
}
function afterDraftAction() {
  runDraftAI();
  const d = S.series.draft;
  if (d.stepIndex >= d.steps.length) { d.over = true; d.phase = "done"; simGame(); } // 计算战力，进入战前预览
  save(); render();
}
function draftBan(hn) {
  const s = S.series, d = s.draft;
  const st = currentStep();
  if (!st || st.actor !== d.mySide || st.type !== "ban") return;
  if (d.used.includes(hn) || oppUsed().includes(hn)) return; // 本队用过的仍可ban；对方战队用过的已从ban池移除
  d.bans[d.mySide].push(hn); d.used.push(hn); d.stepIndex++;
  afterDraftAction();
}
function draftPick(pos, hn) {
  const s = S.series, d = s.draft;
  if (d.peak) {
    // 巅峰对决：不受全局 BP 限制（此前用过的英雄仍可选），双方可撞英雄；但本队内不能重复
    if (d.over) return;
    if (filledPos(d, d.mySide).includes(pos)) return;
    if (!heroByName(hn)) return;
    if (d.picks[d.mySide].some(e => e.hero === hn)) return;
    d.picks[d.mySide].push({ pos, hero: hn });
    if (d.picks[d.mySide].length >= 5) finishPeakDraft();
    save(); render();
    return;
  }
  const st = currentStep();
  if (!st || st.actor !== d.mySide || st.type !== "pick") return;
  if (filledPos(d, d.mySide).includes(pos)) return;
  const h = heroByName(hn);
  if (!h || d.used.includes(hn) || myUsed().includes(hn)) return; // 只锁「本战队」用过的英雄；对方用过的仍可选用（英雄不分区）
  d.picks[d.mySide].push({ pos, hero: hn }); d.used.push(hn); d.stepIndex++;
  afterDraftAction();
}

/* ---------------- 单局模拟 ---------------- */
function simGame() {
  const s = S.series, d = s.draft;
  const myT = getMyTeam(), opp = S.teams.find(t => t.id === s.oppId);
  const myPicks = {}, oppPicks = {};
  d.picks[d.mySide].forEach(e => myPicks[e.pos] = e.hero);
  d.picks[aiSide(d)].forEach(e => oppPicks[e.pos] = e.hero);
  let myTotal = 0, oppTotal = 0; const posDetail = {};
  POS.forEach(pos => {
    const mp = getPlayer(myT, myT.lineup[pos]);
    const op = getPlayer(opp, opp.lineup[pos]);
    const mh = heroByName(myPicks[pos]) || heroByName(mp.heroPool[0]);
    const oh = heroByName(oppPicks[pos]) || heroByName(op.heroPool[0]);
    const mpow = posPower(mp, mh, oh, d.tactic, pos, benchBest(myT, pos)) * POS_WEIGHT[pos];
    const opow = posPower(op, oh, mh, d.tactic, pos, benchBest(opp, pos)) * POS_WEIGHT[pos];
    myTotal += mpow; oppTotal += opow;
    posDetail[pos] = { mpow, opow, mh: mh.name, oh: oh.name, counter: matchupMult(mh, oh) };
  });
  const myCo = POS.reduce((a, p) => a + getPlayer(myT, myT.lineup[p]).co, 0) / 5;
  const opCo = POS.reduce((a, p) => a + getPlayer(opp, opp.lineup[p]).co, 0) / 5;
  myTotal *= (1 + (myCo - 70) / 400); oppTotal *= (1 + (opCo - 70) / 400);
  // 英雄组合/体系加成
  const cb = comboBonus(Object.values(myPicks));
  const ocb = comboBonus(Object.values(oppPicks));
  myTotal *= cb.mult; oppTotal *= ocb.mult;
  // 阵容 & 战术合理性判定（在胜率计算之前应用，真正影响战力与结果）
  const myComp = evaluateComp(myPicks, d.tactic);
  const oppComp = evaluateComp(oppPicks, "稳");
  myTotal *= myComp.mult; oppTotal *= oppComp.mult;
  const scale = POWER_SCALE;
  // 难度不再影响战力：双方战力完全由选手属性 / 英雄强度 / 阵容判定决定，
  // 难度只体现在对手的 BP 水平（ban 是否针对、选将是否读克制与阵容）——见 aiBpCfg()。
  const pWinRaw = 1 / (1 + Math.pow(10, (oppTotal - myTotal) / scale));
  const variance = d.tactic === "稳" ? 0.08 : d.tactic === "攻" ? 0.16 : 0.12;
  const pBase = clamp(pWinRaw + (rand() - 0.5) * variance, 0.05, 0.95);
  // 关键：这里不再决定胜负。只给出"赛前胜算"，胜负由局内事件（swing）在结束时参与决定。
  // 虚拟战斗：局内1分钟=现实1秒。时长与双方战力差相关（势均力敌更长、一边倒更短），但不绝对
  const closeness = 1 - Math.abs(pWinRaw - 0.5) * 2; // 1=势均力敌，0=一边倒
  let durRaw = 8 + closeness * 17 + randInt(-4, 5);
  // 意外：约22%概率打破正相关（均势速败 / 一边倒却拖长）
  if (rand() < 0.22) durRaw += (rand() < 0.5 ? -randInt(4, 8) : randInt(4, 10));
  const duration = clamp(Math.round(durRaw), 6, 35);
  const noise = [];
  for (let i = 0; i < duration; i++) noise.push((rand() - 0.5) * 0.10);
  s.battle = {
    myWin: null, duration, minute: 0, lines: [], done: false,
    pWin: pBase, pWinRaw, noise, swing: 0, surprises: [], finalProb: null,
    myTotal, oppTotal, myPicks, oppPicks, posDetail, mySide: d.mySide, tactic: d.tactic,
    combos: cb.hits, oppCombos: ocb.hits, comboMult: cb.mult, oppComboMult: ocb.mult,
    myComp, oppComp, peak: !!d.peak
  };
  s.sub = "preview"; // 先出战力计算，等玩家点「开始比赛」
}
// 阵容 & 战术合理性：返回档位/分数/建议/战力系数
function evaluateComp(picks, tactic) {
  const heroes = POS.map(p => heroByName(picks[p])).filter(Boolean);
  if (heroes.length < 5) return { tier: "—", score: 0, tips: ["阵容未完成"], mult: 1, fitAvg: 0 };
  const fitAvg = POS.reduce((a, p) => a + (picks[p] ? laneFit(heroByName(picks[p]), p) : 0), 0) / 5;
  const arcs = heroes.map(h => h.arc);
  const frontline = arcs.filter(a => a === "tank" || a === "support").length;
  const damage = arcs.filter(a => a === "mage" || a === "marksman" || a === "assassin" || a === "fighter").length;
  const cc = heroes.filter(h => h.c >= 70).length;
  let score = 55; const tips = [];
  if (fitAvg >= 0.97) { score += 15; tips.push("分路匹配到位"); }
  else if (fitAvg >= 0.90) { score += 8; }
  else { score -= 12; tips.push("有英雄逆用/生疏，战力受损"); }
  if (frontline >= 2) { score += 12; tips.push("前排充足，团战能扛"); }
  else if (frontline === 1) { score += 3; tips.push("前排偏少"); }
  else { score -= 15; tips.push("缺少坦克/辅助，团战易崩"); }
  if (damage >= 3) score += 8; else { score -= 10; tips.push("输出点偏少"); }
  if (cc >= 2) { score += 8; tips.push("控制链完整"); } else { score -= 5; tips.push("控制不足"); }
  if (tactic === "攻") { if (damage >= 3) { score += 6; tips.push("激进战术契合高输出阵容"); } else { score -= 6; tips.push("激进但输出不足，易被打回"); } }
  else if (tactic === "稳") { if (frontline >= 2) { score += 6; tips.push("稳健战术契合有前排阵容"); } else { score -= 6; tips.push("稳健但缺前排，守不住"); } }
  else if (tactic === "奇") { if (arcs.includes("assassin")) { score += 6; tips.push("奇袭契合刺客/切入阵容"); } else { score -= 4; } }
  score = clamp(Math.round(score), 0, 100);
  const tier = score >= 85 ? "优" : score >= 70 ? "良" : score >= 55 ? "中" : "差";
  const mult = score >= 85 ? 1.03 : score >= 70 ? 1.01 : score >= 55 ? 1.0 : 0.96;
  return { tier, score, tips, mult, fitAvg };
}

/* ---------------- 虚拟战斗过程 ---------------- */
const POWER_SCALE = 34;      // 战力→胜率的尺度（越大越"钝"：小战力差不至于决定胜负，BP/阵容更值钱）
const SWING_K = 3.4;         // 局内事件对最终胜负的影响权重
// 当前分钟的我方胜算：开局=赛前胜算，随局内事件（swing）漂移；不再向"预先内定的结果"过渡
function battleWinRate(b) {
  if (!b) return 0.5;
  const base = clamp(b.pWin != null ? b.pWin : 0.5, 0.02, 0.98);
  const p = Math.min(1, b.minute / Math.max(1, b.duration));
  const w = Math.pow(p, 0.65);                                  // 越到后期，局内局势越说话
  const logit = Math.log(base / (1 - base)) + (b.swing || 0) * SWING_K * w;
  const live = 1 / (1 + Math.exp(-logit));
  const n = (b.noise && b.noise[Math.max(0, b.minute - 1)]) || 0;
  return clamp(live + n * 0.5, 0.02, 0.98);
}
function startBattleTick() {
  const s = S.series;
  if (s._battleTimer) clearInterval(s._battleTimer);
  s._battleTimer = setInterval(() => {
    if (!S.series || S.series.sub !== "battle" || !S.series.battle) { clearInterval(s._battleTimer); s._battleTimer = null; return; }
    battleTick();
  }, 1000);
}
function battleTick(silent) {
  const s = S.series, b = s.battle;
  if (!b || b.done) return;
  b.minute++;
  // 意外事件（第2分钟起有概率触发）
  if (b.minute >= 2 && rand() < 0.16) {
    const sp = makeSurprise(b);
    if (sp) {
      b.swing = clamp(b.swing + sp.swing, -0.45, 0.45);
      b.lines.push({ text: `⚡ ${sp.text}`, surprise: true });
      b.surprises.push(sp.text);
    }
  }
  b.lines.push({ text: genBattleLine(b), surprise: false });
  if (b.minute >= b.duration) { finishBattle(); return; }
  if (!silent) patchBattle(); // 局部更新，避免整页重绘造成滚动/按钮跳动
}
function finishBattle() {
  const s = S.series, b = s.battle;
  if (!b) return;
  if (s._battleTimer) { clearInterval(s._battleTimer); s._battleTimer = null; }
  b.done = true;
  if (b.myWin == null) {
    // 最终判定：赛前胜算 + 全部局内 swing（暴君/主宰/ACE/偷家…真正决定这场）
    b.finalProb = battleWinRate(b);
    b.myWin = rand() < b.finalProb;
  }
  commitGame(b);
}
// 跳过战斗：把剩余分钟"快进"跑完（不是直接内定结果），保证跳不跳结果分布一致
function skipBattle() {
  const s = S.series;
  if (!s || !s.battle) return;
  let guard = 0;
  while (s.battle && !s.battle.done && guard++ < 60) battleTick(true);
  if (s.battle && !s.battle.done) finishBattle();
}
function commitGame(b) {
  const s = S.series;
  if (b.myWin) s.myScore++; else s.opScore++;
  s.games.push({
    mySide: b.mySide, myPicks: b.myPicks, oppPicks: b.oppPicks, winner: b.myWin ? "me" : "opp",
    posDetail: b.posDetail, myTotal: b.myTotal, oppTotal: b.oppTotal, combos: b.combos, oppCombos: b.oppCombos,
    peak: !!b.peak
  });
  // 全局BP归属：按【战队】记（与红蓝方无关）。巅峰对决不受全局BP影响，本局英雄不写入已用池
  if (!b.peak) {
    Object.values(b.myPicks).forEach(h => { if (h) { const arr = seriesTeamUsed(S.myTeamId); if (!arr.includes(h)) arr.push(h); } });
    Object.values(b.oppPicks).forEach(h => { if (h) { const arr = seriesTeamUsed(s.oppId); if (!arr.includes(h)) arr.push(h); } });
  }
  // 局内影响：体力下降 + 状态漂移
  const myT = getMyTeam();
  POS.forEach(pos => {
    const p = getPlayer(myT, myT.lineup[pos]);
    if (!p) return;
    p.st = clamp(p.st - staminaCostPerGame(), STAMINA_FLOOR, 100);
    if (p.status === "ok" && rand() < 0.08) { if (rand() < 0.5) { p.status = "hot"; p.statusRounds = 2; } else { p.status = "low"; p.statusRounds = 1; } }
  });
  // 败方选边权（下一局红蓝方由败方决定）
  s.nextSideBy = b.myWin ? "opp" : "me";
  const need = Math.ceil(s.bestOf / 2);
  if (s.myScore >= need || s.opScore >= need) {
    s.sub = "over";
    const win = s.myScore > s.opScore;
    const phaseMul = s.kind === "playoff" ? 2 : 1;
    s.rewards = {
      money: Math.round((win ? randInt(20, 40) : randInt(6, 14)) * phaseMul),   // 与 AI 同规则（awardTeamMatch）
      fans: Math.round((win ? randInt(5000, 15000) : -randInt(1000, 6000)) * (1 + myT.prestige / 150)),
      win
    };
  } else {
    if (s.nextSideBy === "opp") s.nextSide = rand() < 0.5 ? "blue" : "red"; // AI（败方）自动选边
    s.sub = "result";
  }
  save(); render();
}
// 意外事件：随机触发，制造局势反转（不提前剧透结果）
const SURPRISES = [
  { id: "stealTyrant", w: 12, min: 2, swing: 0.13, txt: (c) => `${c.who === "me" ? "我方" : "对手"}${c.hero} 惩戒抢下暴君！${c.who === "me" ? "拿到增益，节奏起飞" : "被抢，我方节奏被打断"}` },
  { id: "stealLord", w: 10, min: 8, swing: 0.18, txt: (c) => `${c.who === "me" ? "我方" : "对手"}抢下主宰！${c.who === "me" ? "三路兵线压制，直推高地" : "主宰丢失，我方被迫守家"}` },
  { id: "ace", w: 9, min: 4, swing: 0.22, txt: (c) => `${c.who === "me" ? "我方" : "对手"}一波团灭对方五人（ACE）！${c.who === "me" ? "顺势推掉中路二塔" : "我方只剩两人守家"}` },
  { id: "backdoor", w: 6, min: 10, swing: 0.16, txt: (c) => `${c.who === "me" ? "我方" : "对手"}${c.hero} 单人偷家，直拆水晶！${c.who === "me" ? "对手回防不及" : "我方回防及时才守住"}` },
  { id: "popoff", w: 11, min: 3, swing: 0.12, txt: (c) => `${c.who === "me" ? "我方" : "对手"}${c.hero} 手感爆棚，靠${c.skill}连续收割，打出一波小高潮` },
  { id: "throw", w: 9, min: 5, swing: -0.15, txt: (c) => `${c.who === "me" ? "我方" : "对手"}核心位走位失误被秒，${c.who === "me" ? "我方" : "对手"}丢掉关键资源` },
  { id: "hold", w: 7, min: 12, swing: 0.14, txt: (c) => `水晶前${c.who === "me" ? "我方" : "对手"}成功守家，反打一波，硬生生把节奏拖了回来` },
  { id: "stormSteal", w: 5, min: 20, swing: 0.20, txt: (c) => `风暴龙王团：${c.who === "me" ? "我方" : "对手"}拿下风暴龙王，一波终结比赛` }
];
function rollSurprise(b) {
  const m = b.minute;
  const pool = SURPRISES.filter(s => m >= s.min);
  if (!pool.length) return null;
  const total = pool.reduce((a, s) => a + s.w, 0);
  let r = rand() * total;
  for (const s of pool) { r -= s.w; if (r <= 0) return s; }
  return null;
}
function makeSurprise(b) {
  const s = rollSurprise(b);
  if (!s) return null;
  // 受益方：现在没有"内定赢家"了，只能按当前局势判断——优势方更容易拿到资源（但不保证）
  const cur = battleWinRate(b);
  const pMe = clamp(0.5 + (cur - 0.5) * 0.6, 0.25, 0.75);
  const who = rand() < pMe ? "me" : "opp";
  const pos = choice(POS);
  const hero = who === "me" ? b.myPicks[pos] : b.oppPicks[pos];
  const text = s.txt({ who, hero, skill: heroSkill(hero) });
  const swing = (who === "me" ? 1 : -1) * Math.abs(s.swing);
  return { text, swing };
}
/* 战况播报：只描述"当下"，不预告结果。
   局面由 swing（局内事件）+ 战力差共同决定，所以同一局里我方可能先领先、被打回、再反打。 */
function genBattleLine(b) {
  const m = b.minute;
  const mom = (b.swing || 0) + (b.myTotal - b.oppTotal) / 500;
  const fav = mom > 0.05 ? "me" : mom < -0.05 ? "opp" : "even";
  const pos = choice(POS), pn = POS_NAME[pos];
  const mh = b.myPicks[pos], oh = b.oppPicks[pos];
  const ms = heroSkill(mh), os = heroSkill(oh);
  const mine = fav === "me", theirs = fav === "opp";
  const leadTxt = mine ? "我方节奏领先" : theirs ? "对手节奏更快" : "双方咬得很紧";
  const lane = choice(["上路", "中路", "下路", "河道", "野区"]);
  const tpl = [];
  if (m <= 1) {
    tpl.push(
      `开局：双方开野，${pn}${mh} 用${ms}抢线，${leadTxt}。`,
      `一级团试探：${mh} 与对方${oh} 在${lane}对拼，${mine ? "我方换血占优" : theirs ? "我方被压，退回塔下" : "各自退开，谁也不亏"}。`,
      `河道蟹：${mh} 先手，${os ? `对手${oh} 的${os}被逼退` : "对手让出视野"}。`
    );
  } else if (m === 2) {
    tpl.push(
      `第一条暴君刷新：${mine ? `我方${mh} 的${ms}先手开团，暴君进账` : theirs ? `对手${oh} 用${os}抢先，暴君被抢` : "双方在河道拉扯，谁也没敢先手"}。`,
      `暴君团：${pn}${mh} 卡住入口，${theirs ? "但被对手绕后，只能放龙" : "把对手逼出龙坑"}。`
    );
  } else if (m < 8) {
    tpl.push(
      `${pn}${mh} 靠${ms}抓到${lane}落单，${mine ? "拿下人头，顺势推一塔" : theirs ? "被支援赶到，反被打残" : "一换一，无功而返"}。`,
      `我方${lane}一塔${mine ? "还在，兵线压到对面" : "告破，经济被拉开"}`,
      `小规模碰撞：${mh} 的${ms}换掉对方${oh}，${mine ? "我方赚了" : theirs ? "我方亏了" : "五五开"}。`,
      `视野战：${mine ? "我方把眼插到对方野区" : "对手反掉我方红区视野，打野被压节奏"}。`
    );
  } else if (m === 8) {
    tpl.push(
      `主宰刷新：${mine ? "我方拿下主宰，三路兵线开始推进" : theirs ? "主宰被对手控下，我方只能收线守塔" : "双方在主宰坑对峙，谁先动谁吃亏"}。`,
      `主宰团：${mh} 的${ms}进场抢龙，${mine ? "惩戒落地，龙是我方的" : "被对手反手惩戒拿下"}。`
    );
  } else if (m < 20) {
    tpl.push(
      `中期团战：${pn}${mh} 用${ms}进场，${mine ? "打出 2 换 3，推掉外塔" : theirs ? "被集火秒掉，团战溃败" : "互换前排，谁也没占到便宜"}。`,
      `兵线运营：${mh} 带线牵制${lane}，${mine ? "我方趁机拿资源滚雪球" : "对手抱团推进，我方被迫回防"}。`,
      `高地攻防：${mine ? "我方磨掉高地塔一半血" : "水晶前惊险守住一波"}。`,
      `经济面板：${mine ? "我方领先" : theirs ? "我方落后" : "基本持平"}，${mh} 的装备成型度决定下一波团战走向。`
    );
  } else {
    tpl.push(
      `风暴龙王团：${mine ? `我方${mh} 的${ms}先手秒掉核心` : `对手抢到风暴龙王，${os ? `被${oh}的${os}控住阵型` : "我方阵型被打散"}`}。`,
      `决胜团：${pn}${mh} 的${ms}定胜负，${mine ? "直扑水晶" : theirs ? "水晶前告急" : "双方在水晶前僵持"}。`,
      `大龙 buff 到期前，${mine ? "我方必须一波解决" : "对手正在逼团，我方只能接"}。`
    );
  }
  return `第 ${m} 分钟：${choice(tpl)}`;
}

/* ---------------- 声望 ---------------- */
function addPrestige(delta, reason) {
  if (!S || S.gameOver) return;
  const t = getMyTeam();
  t.prestige = clamp(t.prestige + delta, 0, 100);
  if (Math.abs(delta) >= 0.01) {
    S.log.unshift(`S${S.season}R${S.round} 声望${delta >= 0 ? "+" : ""}${delta}（${reason}）`);
    if (S.log.length > 60) S.log.pop();
  }
  // 声望归零 → 战队失去公信力，游戏失败
  if (t.prestige <= 0) triggerGameOver(reason);
}
function triggerGameOver(reason) {
  if (!S || S.gameOver) return;
  const t = getMyTeam();
  S.gameOver = {
    reason: reason || "声望归零",
    team: t.name, season: S.season, round: S.round,
    wins: t.wins, losses: t.losses,
    rank: (S.seasonResult && S.seasonResult.rank) || null,
    money: t.money, fans: t.fans
  };
  S.page = "gameover";
  S.event = null;
  const m = document.getElementById("event-mask"); if (m) m.remove();
  const tm = document.getElementById("transfer-mask"); if (tm) tm.remove();
  save();
  render();
}
function renderGameOver() {
  const g = S.gameOver || {};
  const t = getMyTeam();
  return `${renderTopbar()}<div class="card">
    <div class="center" style="font-size:40px;font-weight:900;color:var(--red2);letter-spacing:4px">GAME OVER</div>
    <div class="center" style="font-size:15px;margin:10px 0 18px">声望归零，投资方与粉丝彻底失去信心，${escapeHtml(g.team || t.name)} 被迫解散。</div>
    <div class="warn" style="border-color:rgba(255,59,48,.5);background:rgba(255,59,48,.1);color:var(--red2)">失败原因：声望降至 0（最近触发：${escapeHtml(g.reason || "—")}）</div>
    <div class="section-title mt">最终战绩</div>
    <div class="report-line"><span class="tag key">赛季</span><span class="body">S${g.season || S.season} · 第 ${g.round || 1} 轮</span></div>
    <div class="report-line"><span class="tag key">战绩</span><span class="body">${g.wins || 0} 胜 ${g.losses || 0} 负${g.rank ? ` · 常规赛第 ${g.rank} 名` : ""}</span></div>
    <div class="report-line"><span class="tag key">资产</span><span class="body">资金 ¥${g.money || 0}万 · 粉丝 ${(g.fans || 0).toLocaleString()}</span></div>
    <div class="muted mt">声望是本作的生存线：连续失利、无缘季后赛、卖掉主力都会扣声望，降到 0 即游戏结束。</div>
    <button class="btn gold mt" data-act="restartgame" style="width:100%">重新开始新赛季</button>
  </div>`;
}
function prestigeTier(p) { return p >= 80 ? "传奇" : p >= 60 ? "豪门" : p >= 40 ? "劲旅" : p >= 20 ? "新锐" : "无名"; }
function prestigeNext(p) { for (const x of [20, 40, 60, 80]) if (p < x) return x; return 100; }

/* ---------------- 随机事件 ---------------- */
const EVENTS = [
  { title: "选手状态火热", weight: 10, text: "队内一名选手近期手感爆棚，训练赛屡屡打出高光操作。",
    apply: () => { const p = randomStarter(getMyTeam()); p.status = "hot"; p.statusRounds = 3; return `【${p.name}】进入火热状态，未来 3 轮属性提升！`; } },
  { title: "突发伤病", weight: 9, bad: true, text: "一名首发选手在训练中扭伤，需要休养。",
    apply: () => { const p = randomStarter(getMyTeam()); p.status = "inj"; p.statusRounds = randInt(2, 3); return `【${p.name}】受伤，将伤停 ${p.statusRounds} 轮，请到【阵容】调整首发！`; } },
  { title: "赞助商青睐", weight: 8, text: "一家电竞外设品牌看中战队人气，送来一笔赞助。",
    apply: () => { const bonus = Math.round(getMyTeam().prestige / 10) * 10; const m = randInt(55, 140) + bonus; getMyTeam().money += m; return `获得赞助资金 +${m} 万（声望加成 +${bonus}）！`; } },
  { title: "粉丝暴涨", weight: 8, text: "上一场精彩操作被剪成集锦，全网刷屏。",
    apply: () => { const f = Math.round(randInt(3000, 12000) * (1 + getMyTeam().prestige / 120)); getMyTeam().fans += f; return `粉丝 +${f}！人气水涨船高。`; } },
  { title: "队内矛盾", weight: 6, bad: true, text: "两名选手因战术分歧发生争执，影响更衣室氛围。",
    apply: () => { const ps = getMyTeam().players; const all = POS.flatMap(p => ps[p]); const a = choice(all), b = choice(all); a.me = clamp(a.me - 4, 40, a.ceil); b.me = clamp(b.me - 4, 40, b.ceil); a.status = "low"; b.status = "low"; a.statusRounds = Math.max(a.statusRounds, 2); b.statusRounds = Math.max(b.statusRounds, 2); return `【${a.name}】与【${b.name}】心态下滑，低迷 2 轮。`; } },
  { title: "青训惊喜", weight: 7, text: "二队一名小将表现惊艳，可上调一队。",
    apply: () => { const t = getMyTeam(); const pos = choice(POS); const rookie = takeFreeAgent(pos); t.players[pos].push(rookie); return `青训提拔【${rookie.name}】（${ratingForOvr(rookie.ovr)}/总评${rookie.ovr}）加入 ${POS_NAME[pos]} 轮换！`; } },
  { title: "对手情报", weight: 7, text: "侦察到下一对手近期状态波动，是个抢分良机。",
    apply: () => { const opp = nextOpponent(); if (opp) { const p = randomStarter(opp); if (p) { p.status = "low"; p.statusRounds = 2; } } return `情报到手：下个对手一名首发状态低迷，把握机会！`; } },
  { title: "媒体赞誉", weight: 6, text: "战队近期的表现获得主流电竞媒体好评。",
    apply: () => { const d = randInt(2, 4); addPrestige(d, "媒体赞誉"); return `声望 +${d}！战队口碑上升。`; } }
];
function randomStarter(team) { if (!team) return null; return getPlayer(team, choice(POS.map(p => team.lineup[p]).filter(Boolean))); }
function nextOpponent() {
  if (S.phase === "regular") { const sc = S.schedule.find(s => !s.played); return sc ? S.teams.find(t => t.id === sc.oppId) : null; }
  if (S.pendingPlayoff && S.pendingPlayoff.oppId) return S.teams.find(t => t.id === S.pendingPlayoff.oppId);
  return null;
}
function maybeEvent(opts) {
  // safe：开局/新赛季首日只允许中性或正面事件。否则会出现「刚开档还没打一场，
  // 主力就在训练中伤停 3 轮」，队伍战力直接掉一个位置，玩家会觉得选秀崩了。
  const pool = (opts && opts.safe) ? EVENTS.filter(e => !e.bad) : EVENTS;
  if (rand() < 0.7) {
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let r = rand() * total, ev = pool[0];
    for (const e of pool) { r -= e.weight; if (r <= 0) { ev = e; break; } }
    S.event = { title: ev.title, text: ev.text, msg: ev.apply() };
  } else S.event = null;
}
function tickStatuses() {
  S.teams.forEach(t => POS.forEach(pos => t.players[pos].forEach(p => {
    if (p.status && p.status !== "ok") { p.statusRounds--; if (p.statusRounds <= 0) { p.status = "ok"; p.statusRounds = 0; } }
  })));
}


/* ---------------- 双败淘汰 ---------------- */
function setupPlayoff(top4) {
  S.bracket = {
    order: top4,
    slots: {
      usf1: { a: top4[0], b: top4[3] },
      usf2: { a: top4[1], b: top4[2] },
      ufin: { a: null, b: null }, lr1: { a: null, b: null }, lfin: { a: null, b: null }, gf: { a: null, b: null }
    },
    resolved: {}
  };
  S.phase = "playoff"; S.round = 1;
}
function resolveAI(name) {
  const B = S.bracket, SL = B.slots[name], R = B.resolved;
  if (!R[name] && SL && SL.a && SL.b) {
    const A = S.teams.find(t => t.id === SL.a), Bt = S.teams.find(t => t.id === SL.b);
    // 与玩家同规则：季后赛每场前有「休整日」，否则 AI 会带着常规赛末的残血打 BO7
    [A, Bt].forEach(tm => {
      if (tm) POS.forEach(pos => tm.players[pos].forEach(p => { p.st = clampSt(p, p.st + PLAYOFF_REST_GAIN); }));
    });
    const r = simAiSeries(A, Bt, 7); // 季后赛全部 BO7（3:3 时第 7 局自动为巅峰对决）
    const aWin = r.sa > r.sb;
    const w = aWin ? SL.a : SL.b, l = aWin ? SL.b : SL.a;
    R[name] = { winner: w, loser: l, sa: r.sa, sb: r.sb, games: r.games };
    wearTeamStamina(A, r.games.length); wearTeamStamina(Bt, r.games.length);
    awardTeamMatch(S.teams.find(t => t.id === w), true, true);  // 季后赛收益更高
    awardTeamMatch(S.teams.find(t => t.id === l), false, true);
  }
}
function playoffMyNext() {
  const myId = S.myTeamId, B = S.bracket, R = B.resolved, SL = B.slots;
  const mine = (SL.usf1.a === myId || SL.usf1.b === myId) ? "usf1" : "usf2";
  const other = mine === "usf1" ? "usf2" : "usf1";
  const semiOpp = SL[mine].a === myId ? SL[mine].b : SL[mine].a;
  if (!R[mine]) return { slot: mine, oppId: semiOpp, label: mine === "usf1" ? "胜者组半决赛 (1v4)" : "胜者组半决赛 (2v3)" };
  const wonSemi = R[mine].winner === myId;
  if (wonSemi) {
    resolveAI(other);
    const otherWin = R[other].winner;
    if (!R.ufin) { SL.ufin = { a: myId, b: otherWin }; return { slot: "ufin", oppId: otherWin, label: "胜者组决赛" }; }
    if (R.ufin.winner === myId) {
      resolveAI(mine); resolveAI(other);
      if (!SL.lr1.a) { SL.lr1 = { a: R[mine].loser, b: R[other].loser }; resolveAI("lr1"); }
      if (!SL.lfin.a) { SL.lfin = { a: R.ufin.loser, b: R.lr1.winner }; resolveAI("lfin"); }
      SL.gf = { a: myId, b: R.lfin.winner };
      return { slot: "gf", oppId: R.lfin.winner, label: "总决赛" };
    } else {
      resolveAI(mine); resolveAI(other);
      if (!SL.lr1.a) { SL.lr1 = { a: R[mine].loser, b: R[other].loser }; resolveAI("lr1"); }
      if (!R.lfin) { SL.lfin = { a: myId, b: R.lr1.winner }; return { slot: "lfin", oppId: R.lr1.winner, label: "败者组决赛" }; }
      if (R.lfin.winner !== myId) return { eliminated: true, label: "止步败者组决赛" };
      SL.gf = { a: myId, b: R.ufin.winner };
      return { slot: "gf", oppId: R.ufin.winner, label: "总决赛" };
    }
  } else {
    resolveAI(other);
    const otherLose = R[other].loser;
    if (!R.lr1) { SL.lr1 = { a: myId, b: otherLose }; return { slot: "lr1", oppId: otherLose, label: "败者组第一轮" }; }
    if (R.lr1.winner !== myId) return { eliminated: true, label: "止步败者组第一轮" };
    resolveAI(mine); resolveAI(other);
    if (!SL.ufin.a) { SL.ufin = { a: R[mine].winner, b: R[other].winner }; resolveAI("ufin"); }
    if (!R.lfin) { SL.lfin = { a: myId, b: R.ufin.loser }; return { slot: "lfin", oppId: R.ufin.loser, label: "败者组决赛" }; }
    if (R.lfin.winner !== myId) return { eliminated: true, label: "止步败者组决赛" };
    SL.gf = { a: myId, b: R.ufin.winner };
    return { slot: "gf", oppId: R.ufin.winner, label: "总决赛" };
  }
}
/* ---------------- 董事会目标（KPI） ----------------
   赛季初给 1 个主目标 + 1 个青年培养目标，赛季结束结算：达成给预算与声望，未达成扣预算。
   让中期有压力、有方向，而不是"只要不破产就一直打"。 */
const KPI_REWARD = {
  champion: { money: 120, prestige: 6, penaltyMoney: 70, penaltyPrestige: 4 },
  final: { money: 90, prestige: 5, penaltyMoney: 50, penaltyPrestige: 3 },
  playoff: { money: 65, prestige: 3.5, penaltyMoney: 38, penaltyPrestige: 2.5 },
  top6: { money: 45, prestige: 2.5, penaltyMoney: 28, penaltyPrestige: 2 }
};
function makeKpi() {
  const t = getMyTeam();
  const r = S.seasonResult || {};
  let type = "top6";
  if (S.champion) type = "champion";
  else if (r.final) type = "final";
  else if (r.playoff) type = "playoff";
  else if ((t.prestige || 0) >= 55) type = "playoff";
  else if ((r.rank || 99) <= 6) type = "playoff";
  const TITLE = { champion: "卫冕夺冠", final: "打进总决赛", playoff: "进入四强", top6: "常规赛前 6" };
  const DESC = {
    champion: "再次捧起总冠军奖杯",
    final: "至少打进总决赛（BO7）",
    playoff: "常规赛杀进前 4，进入双败淘汰赛",
    top6: "常规赛排名前 6（不降级、不垫底）"
  };
  const k = KPI_REWARD[type];
  return {
    season: S.season,
    main: { type, title: TITLE[type], desc: DESC[type] },
    youth: { title: "培养新人", desc: "赛季结束时首发里有 ≤22 岁、总评 ≥80 的选手", reward: { money: 45, prestige: 1 } },
    reward: { money: k.money, prestige: k.prestige },
    penalty: { money: k.penaltyMoney, prestige: k.penaltyPrestige }
  };
}
function evaluateKpi() {
  if (!S || !S.kpi) return null;
  if (S.kpiResult && S.kpiResult.season === S.season) return S.kpiResult;
  const r = S.seasonResult || {};
  const t = getMyTeam();
  const rank = r.rank || (S.champion ? 1 : null);
  const type = S.kpi.main.type;
  let ok = false;
  if (type === "champion") ok = !!S.champion;
  else if (type === "final") ok = !!r.final || !!S.champion;
  else if (type === "playoff") ok = !!r.playoff || !!r.final || !!S.champion;
  else ok = !!S.champion || !!r.playoff || (rank != null && rank <= 6);
  const youthOk = POS.some(pos => {
    const p = getPlayer(t, t.lineup[pos]);
    return p && (p.age || 99) <= 22 && p.ovr >= 80;
  });
  const notes = [];
  if (ok) {
    t.money += S.kpi.reward.money;
    addPrestige(S.kpi.reward.prestige, "达成董事会目标");
    notes.push(`✅ 主目标达成「${S.kpi.main.title}」：+¥${S.kpi.reward.money}万 · 声望 +${S.kpi.reward.prestige}`);
  } else {
    t.money = Math.max(0, t.money - S.kpi.penalty.money);
    addPrestige(-S.kpi.penalty.prestige, "未达成董事会目标");
    notes.push(`❌ 主目标未达成「${S.kpi.main.title}」：-¥${S.kpi.penalty.money}万 · 声望 -${S.kpi.penalty.prestige}`);
  }
  if (youthOk) {
    t.money += S.kpi.youth.reward.money;
    notes.push(`🌱 青年目标达成：+¥${S.kpi.youth.reward.money}万`);
  } else {
    notes.push("🌱 青年目标未达成（没有 ≤22 岁首发达到 80 总评）");
  }
  S.kpiResult = { season: S.season, ok, youthOk, notes };
  S.log.unshift(`S${S.season} 董事会：${ok ? "达成" : "未达成"}「${S.kpi.main.title}」`);
  return S.kpiResult;
}
function recordHistory() {
  // 同一赛季只记一次（赛季结束时已记录过，newSeason 再调时跳过）
  if (S.history && S.history.some(h => h.season === S.season)) return;
  finalizeAiPrestige();
  evaluateKpi();
  const t = getMyTeam(), r = S.seasonResult || {};
  // 本赛季我的所有对战（对手/比分/胜负）
  const matches = [];
  (S.fixtures || []).forEach((fx, i) => {
    fx.forEach(f => {
      const mine = f.a === S.myTeamId || f.b === S.myTeamId;
      if (!mine || !f.played || f.sa == null) return;
      const iAmA = f.a === S.myTeamId;
      const myScore = iAmA ? f.sa : f.sb, opScore = iAmA ? f.sb : f.sa;
      matches.push({ round: i + 1, oppName: teamNameOf(iAmA ? f.b : f.a), myScore, opScore, win: myScore > opScore });
    });
  });
  // 联盟全部对战（只存比分，控制存档体积）
  const fixtures = [];
  (S.fixtures || []).forEach((fx, i) => {
    fx.forEach(f => { if (f.played && f.sa != null) fixtures.push([i + 1, teamNameOf(f.a), teamNameOf(f.b), f.sa, f.sb]); });
  });
  // 季后赛（双败）对战也计入赛季总结：我的战绩 + 联盟全部季后赛比分
  if (S.bracket && S.bracket.slots) {
    const SLOT_LABEL = { usf1: "胜者组半决赛①", usf2: "胜者组半决赛②", ufin: "胜者组决赛", lr1: "败者组一轮", lfin: "败者组决赛", gf: "总决赛" };
    Object.keys(S.bracket.slots).forEach(slot => {
      const SL = S.bracket.slots[slot], R = S.bracket.resolved[slot];
      if (!SL || !SL.a || !SL.b || !R || R.sa == null) return;
      fixtures.push([SLOT_LABEL[slot] || "季后赛", teamNameOf(SL.a), teamNameOf(SL.b), R.sa, R.sb]);
      if (SL.a !== S.myTeamId && SL.b !== S.myTeamId) return;
      const iAmA = SL.a === S.myTeamId;
      const myScore = iAmA ? R.sa : R.sb, opScore = iAmA ? R.sb : R.sa;
      matches.push({ tag: "季后赛", round: 0, label: SLOT_LABEL[slot], oppName: teamNameOf(iAmA ? SL.b : SL.a), myScore, opScore, win: myScore > opScore });
    });
  }
  S.history.push({ season: S.season, team: t.name, rank: r.rank || null, playoff: !!r.playoff || !!r.final || !!r.champion, final: !!r.final, champion: !!S.champion, prestige: Math.round(t.prestige), matches, fixtures });
}
function newSeason() {
  const t = getMyTeam(), r = S.seasonResult || {};
  recordHistory();
  S.season++;
  returnAllLoans();   // 先把租借球员退回原队
  // 先发赛季奖金再谈合同：否则刚打完季后赛却因为账上没钱而放走主力
  const bonus = S.champion ? 90 : (r.playoff || r.final ? 55 : 28);
  t.money += bonus;
  // 赛季末：年龄按「3 赛季 = 1 岁」结算，27 岁起逐季下滑；合同 -1（按赛季）
  const ageInfo = agePlayers();
  const notices = settleContracts();
  S.teams.forEach(tm => {
    tm.wins = 0; tm.losses = 0; tm.points = 0; tm.streak = 0;
    POS.forEach(pos => tm.players[pos].forEach(p => {
      p.status = "ok"; p.statusRounds = 0; p.st = Math.max(60, clampSt(p, p.st + 25));
      // 成长只给 26 岁及以下（越年轻概率越高）；27 岁起停止成长，开始被年龄拖累
      const gr = growthChance(p.age);
      if (gr > 0 && rand() < gr) { ["op", "aw", "co", "me"].forEach(a => p[a] = clamp(p[a] + randInt(0, 2), 45, p.ceil)); }
      p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
    }));
    POS.forEach(pos => {
      if (tm.players[pos].length > 1 && rand() < 0.3) {
        const benched = tm.players[pos][1];
        recycleToFreeAgents(benched);              // 被换下的选手回到市场（真实姓名循环）
        tm.players[pos][1] = takeFreeAgent(pos);   // 从自由身签一名真实选手
      }
    });
    initLineup(tm);
  });
  // 赛季奖金按战绩给：AI 战队同样领取（冠军 140 / 季后赛 85 / 其他 42）
  S.teams.forEach(tm => {
    if (tm.id === S.myTeamId) return;
    tm.money += 42 + Math.round(tm.prestige * 0.3) + randInt(0, 28);
    tm.fans = Math.max(1000, Math.round(tm.fans * (1 + (tm.prestige - 30) / 400)));
  });
  // 教练组工资（赛季末结算；付不起就有人离职）
  const wage = staffWage();
  let wageNote = "";
  if (wage > 0) {
    if (t.money >= wage) { t.money -= wage; wageNote = `教练组工资 -¥${wage}万`; }
    else {
      const top = STAFF_DEFS.filter(d => staffLevel(d.key) > 0).sort((a, b) => staffLevel(b.key) - staffLevel(a.key))[0];
      if (top) { S.staff[top.key] = 0; wageNote = `资金不足，${top.name} 离职（工资 ¥${wage}万未付清）`; }
    }
  }
  t.fans = Math.max(1000, Math.round(t.fans * (1 + (t.prestige - 30) / 400)));
  S.kpi = makeKpi();          // 新赛季目标（按上赛季结果）
  S.kpiResult = null;
  S.round = 1; S.phase = "regular"; S.champion = false; S.seasonResult = null;
  const _sch2 = buildSchedule(t.id, S.teams);
  S.schedule = _sch2.schedule; S.fixtures = _sch2.fixtures;
  S.maxRegular = S.schedule.length;
  S.trainPoints = 12; S.transfersUsed = 0; S.market = null;
  S.fanMeets = 0;   // 每赛季重置：2 次粉丝见面会
  S.loans = []; S.loansUsed = 0;   // 租借赛季重置
  // 赛季初转会窗口：AI 战队先行动，随后弹出通知
  S.transferWindow = true; S.transferSeen = 0; S.aiTransfers = [];
  runAiTransferWindow(S.season);
  buildMarket();      // 赛季初自动刷新转会市场（赛季内不变）
  S.series = null; S.bracket = null; S.pendingPlayoff = null; S.event = null;
  S.page = "main"; S.tab = "schedule";
  toast(`第 ${S.season} 赛季开始！赛季奖金 +¥${bonus}万 · 转会窗口开启`);
  maybeEvent({ safe: true });   // 开局/新赛季首日不出伤病
  // 赛季年 + 合同结算合并成一条消息（优先于随机事件，避免信息丢失）
  const rep = [];
  if (ageInfo.tick) rep.push(`🎂 <b>新赛季年</b>：3 个赛季 = 1 岁，全联盟年龄 +1${ageInfo.aged.length ? `（本队：${ageInfo.aged.join("、")}）` : ""}`);
  if (notices.length) rep.push(...notices);
  if (wageNote) rep.push(`💼 ${wageNote}`);
  if (rep.length) S.event = {
    title: ageInfo.tick ? "🎂 新赛季年 · 合同结算" : "📄 合同季结算",
    text: ageInfo.tick ? `第 ${S.season} 赛季开始（第 ${seasonYear(S.season)} 年）。27 岁以上的选手整体属性已开始逐季下滑。` : `赛季末共有 ${notices.length} 份到期合同在处理（自动续约或离队）。`,
    msg: rep.join("；")
  };
  save(); render();
}
function refreshTrainPoints() { S.trainPoints = 10 + Math.floor(getMyTeam().fans / 40000) + staffLevel("analyst"); }


/* ========== 经济 / 合同 / 年龄 / 租借（从 render.js 归位到规则层） ========== */
/* ---------------- AI 战队转会（与玩家同规则：赛季初窗口、按 ovr 定价） ---------------- */
function aiTeamDoTransfers(team, season, moved) {
  const out = [];
  if (!team || team.id === S.myTeamId) return out;
  const movedSet = moved || new Set();
  // 弱队更积极补强（战力低于联盟平均 6% 以上，多试几次）
  const avgPower = S.teams.reduce((a, t) => a + teamPower(t), 0) / S.teams.length;
  const rounds = teamPower(team) < avgPower * 0.94 ? randInt(2, 4) : randInt(1, 3);
  for (let r = 0; r < rounds; r++) {
    // 最弱首发
    let weakest = null, wpos = null;
    POS.forEach(pos => { const p = getPlayer(team, team.lineup[pos]); if (p && (!weakest || p.ovr < weakest.ovr)) { weakest = p; wpos = pos; } });
    if (!wpos) break;
    // 1) 先从自由身签到更强的（按 ovr 定价）
    if (!S.freeAgents[wpos]) S.freeAgents[wpos] = [];
    const faList = S.freeAgents[wpos].filter(e => e).sort((a, b) => b.ovr - a.ovr);
    const target = faList.find(e => e.ovr > weakest.ovr && priceFor(e.ovr) <= team.money && !movedSet.has(e.name));
    if (target && team.players[wpos].length < 4) {
      const price = priceFor(target.ovr);
      const idx = S.freeAgents[wpos].indexOf(target);
      if (idx !== -1) S.freeAgents[wpos].splice(idx, 1);
      const np = makePlayerFrom(target);
      team.players[wpos].push(np);
      team.money -= price;
      initLineup(team);
      movedSet.add(target.name);
      out.push({ season, teamId: team.id, teamName: team.name, type: "in", pos: wpos, name: np.name, ovr: np.ovr, price });
      continue;
    }
    // 2) 自由身没有合适的，就挖其他 AI 战队的替补（加价 25%）；弱队因此能补强
    const donors = [];
    S.teams.forEach(o => {
      if (o.id === team.id || o.id === S.myTeamId) return;
      POS.forEach(pos => o.players[pos].forEach(p => { if (o.lineup[pos] !== p.id) donors.push({ team: o, pos, p }); }));
    });
    donors.sort((a, b) => b.p.ovr - a.p.ovr);
    const poach = donors.find(d => d.p.ovr > weakest.ovr && Math.round(priceFor(d.p.ovr) * 1.25) <= team.money && !movedSet.has(d.p.name));
    if (poach && team.players[poach.pos].length < 4) {
      const price = Math.round(priceFor(poach.p.ovr) * 1.25);
      const idx = poach.team.players[poach.pos].findIndex(x => x.id === poach.p.id);
      if (idx !== -1) {
        const moved_p = poach.team.players[poach.pos].splice(idx, 1)[0];
        if (poach.team.players[poach.pos].length === 0) poach.team.players[poach.pos].push(takeFreeAgent(poach.pos));
        initLineup(poach.team);
        team.players[poach.pos].push(moved_p);
        team.money -= price; poach.team.money += price;
        initLineup(team);
        movedSet.add(moved_p.name);
        out.push({ season, teamId: team.id, teamName: team.name, type: "in", pos: poach.pos, name: moved_p.name, ovr: moved_p.ovr, price, from: poach.team.name });
        continue;
      }
    }
    // 3) 资金偏少就卖掉一个替补回血（进自由身池，玩家也能签）
    const bench = POS.map(pos => { const p = team.players[pos].find(x => x.id !== team.lineup[pos]); return p ? { pos, p } : null; }).filter(Boolean).sort((a, b) => b.p.ovr - a.p.ovr)[0];
    if (bench && team.money < 140) {
      const price = Math.round(priceFor(bench.p.ovr) * 0.55);
      const idx = team.players[bench.pos].findIndex(x => x.id === bench.p.id);
      if (idx !== -1) {
        const sold = team.players[bench.pos].splice(idx, 1)[0];
        team.money += price;
        if (!S.freeAgents[bench.pos]) S.freeAgents[bench.pos] = [];
        S.freeAgents[bench.pos].push({ name: sold.name, pos: bench.pos, rating: sold.rating, ovr: sold.ovr });
        out.push({ season, teamId: team.id, teamName: team.name, type: "out", pos: bench.pos, name: sold.name, ovr: sold.ovr, price });
      }
    }
  }
  return out;
}
// 赛季初：全部 AI 战队开启转会窗口
function runAiTransferWindow(season) {
  const all = [];
  const moved = new Set(); // 同一转会窗内一名选手只流动一次
  S.teams.filter(t => t.id !== S.myTeamId).forEach(t => { all.push(...aiTeamDoTransfers(t, season, moved)); });
  all.forEach(x => {
    S.log.unshift(`S${x.season} 转会：${x.teamName} ${x.type === "in" ? "签下" : "卖出"} ${POS_NAME[x.pos]}${x.name}（总评${x.ovr}，¥${x.price}万）`);
  });
  S.aiTransfers = all;
  return all;
}
function showTransferNotices() {
  const list = S.aiTransfers || [];
  if (!list.length || (S.transferSeen || 0) >= list.length) return;
  if (document.getElementById("event-mask")) return; // 等事件弹窗关掉再弹
  const old = document.getElementById("transfer-mask"); if (old) old.remove();
  const rows = list.map(x => `<div class="report-line"><span class="tag ${x.type === "in" ? "win" : "lose"}">${x.type === "in" ? "签入" : "卖出"}</span><span class="body"><b>${escapeHtml(x.teamName)}</b> ${x.type === "in" ? "签下" : "卖出"} ${POS_NAME[x.pos]}【${escapeHtml(x.name)}】总评${x.ovr} · ¥${x.price}万${x.from ? `（来自 ${escapeHtml(x.from)}）` : ""}</span></div>`).join("");
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "transfer-mask";
  mask.innerHTML = `<div class="modal"><h3>🔄 赛季初转会窗口</h3>
    <p>其他战队也在买卖选手（资金、声望与你同规则），阵容已变化：</p>
    <div style="max-height:260px;overflow:auto">${rows}</div>
    <div class="warn" style="margin:10px 0">转会窗口现已开放，<b>打第一场常规赛后关闭</b>。可在【转会】页操作。</div>
    <button class="btn" data-act="closetransfer" style="width:100%">知道了</button></div>`;
  document.body.appendChild(mask);
  mask.addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b) handleAct(b.getAttribute("data-act")); });
  S.transferSeen = list.length;
  save();
}

/* ---------------- 转会市场 ---------------- */
// 每个赛季初自动刷新一次（赛季内固定，不可手动刷新）
function buildMarket() {
  const myP = getMyTeam().prestige;
  let cands = [];
  const fa = S.freeAgents || {};
  POS.forEach(pos => {
    const list = (fa[pos] || []).filter(e => e);
    shuffle(list);
    const take = list.slice(0, 2);
    take.forEach(e => {
      const p = makePlayerFrom(e);
      cands.push({ id: uid(), kind: "fa", name: p.name, pos, rating: p.rating, ovr: p.ovr, ceil: p.ceil, price: priceFor(p.ovr), player: p });
    });
  });
  // 挖角：他队替补
  const benchPool = [];
  S.teams.filter(t => t.id !== S.myTeamId).forEach(t => POS.forEach(pos => t.players[pos].forEach(p => { if (t.lineup[pos] !== p.id) benchPool.push({ team: t, pos, p }); })));
  shuffle(benchPool);
  const nPoach = clamp(1 + Math.floor(myP / 28), 1, 4);
  for (let i = 0; i < nPoach && i < benchPool.length; i++) {
    const { team, pos, p } = benchPool[i];
    cands.push({ id: uid(), kind: "poach", name: p.name, pos, rating: p.rating, ovr: p.ovr, ceil: p.ceil, price: Math.round(priceFor(p.ovr) * 1.3), teamId: team.id, teamName: team.name, playerId: p.id });
  }
  // S 级选手罕见：整个市场最多出现 1 个，且只有 25% 的赛季会刷出
  const sCands = cands.filter(c => c.rating === "S");
  if (sCands.length) {
    const keep = rand() < 0.25 ? choice(sCands) : null;
    cands = cands.filter(c => c.rating !== "S" || c === keep);
  }
  S.market = cands;
  S.marketSeason = S.season;
}
function marketBuy(id) {
  const c = (S.market || []).find(x => x.id === id);
  const t = getMyTeam();
  if (!c) return;
  if (!S.transferWindow) { toast("转会窗口已关闭：每个赛季初才可操作"); return; }
  if (S.transfersUsed >= S.maxTransfers) { toast(`本赛季转会次数已用完（${S.maxTransfers} 次）`); return; }
  if (t.money < c.price) { toast("资金不足！"); return; }
  if (t.players[c.pos].length >= 4) { toast(`${POS_NAME[c.pos]} 人数已满`); return; }
  snapshot(`签下 ${c.name}`);
  if (c.kind === "fa") t.players[c.pos].push(c.player);
  else {
    const src = S.teams.find(x => x.id === c.teamId);
    const idx = src.players[c.pos].findIndex(p => p.id === c.playerId);
    if (idx === -1) { toast("该选手已被挖走"); S.market = null; render(); return; }
    const moved = src.players[c.pos].splice(idx, 1)[0];
    if (src.players[c.pos].length === 0) src.players[c.pos].push(takeFreeAgent(c.pos));
    if (src.lineup[c.pos] === moved.id) initLineup(src);
    t.players[c.pos].push(moved);
  }
  t.money -= c.price; S.transfersUsed++;
  S.log.unshift(`S${S.season} 转会：签下 ${c.name}（¥${c.price}万）`);
  S.market = (S.market || []).filter(x => x.id !== c.id); // 赛季内不刷新，只移除已签走的
  toast(`成功签下【${c.name}】！`); save(); render();
}
function marketSell(pid) {
  const t = getMyTeam();
  if (!S.transferWindow) { toast("转会窗口已关闭：每个赛季初才可操作"); return; }
  if (S.transfersUsed >= S.maxTransfers) { toast(`本赛季转会次数已用完（${S.maxTransfers} 次）`); return; }
  let found = null;
  POS.forEach(p => { const idx = t.players[p].findIndex(x => x.id === pid); if (idx !== -1 && t.lineup[p] !== pid) found = { pos: p, p: t.players[p][idx] }; });
  if (!found) { toast("只能卖出替补席选手"); return; }
  const price = sellPrice(found.p);
  confirmDialog({
    title: "确认卖出选手？",
    body: `【${escapeHtml(found.p.name)}】${POS_NAME[found.pos]} · 总评 ${found.p.ovr}。<br>卖出可得 <b style="color:var(--gold)">¥${price}万</b>，占用 1 次转会次数（剩余 ${S.maxTransfers - S.transfersUsed - 1} 次）。${found.p.ovr >= 85 ? '<br><b class="c-bad">卖掉 85+ 主力会额外 -3 声望。</b>' : ""}`,
    okText: "确认卖出", danger: true
  }).then(ok => {
    if (!ok) return;
    let sold = null;
    POS.forEach(p => { const idx = t.players[p].findIndex(x => x.id === pid); if (idx !== -1 && t.lineup[p] !== pid) { sold = t.players[p][idx]; t.players[p].splice(idx, 1); } });
    if (!sold) { toast("该选手已不在替补席"); return; }
    snapshot(`卖出 ${sold.name}`);
    t.money += price; S.transfersUsed++;
    if (sold.ovr >= 85) addPrestige(-3, `卖掉主力 ${sold.name}`);
    S.log.unshift(`S${S.season} 转会：卖出 ${sold.name}（+¥${price}万）`);
    toast(`卖出【${sold.name}】，+¥${price}万`); save(); render();
  });
}
/* ---------------- 续约 / 年龄 / 合同 ---------------- */
function renewCost(p) { return Math.round(priceFor(p.ovr) * 0.5); }
function renewContract(pid) {
  const t = getMyTeam();
  const p = getPlayer(t, pid);
  if (!p) return;
  const cost = renewCost(p);
  if (t.money < cost) { toast(`资金不足：续约需 ¥${cost}万`); return; }
  confirmDialog({
    title: "续约选手",
    body: `与【${escapeHtml(p.name)}】续约 <b>3~6 个赛季</b>（约 1~2 年，3 赛季 = 1 岁），费用 <b style="color:var(--gold)">¥${cost}万</b>（身价 50%）。<br>当前资金 ¥${t.money}万。`,
    okText: "确认续约"
  }).then(ok => {
    if (!ok) return;
    if (t.money < cost) { toast("资金不足"); return; }
    snapshot(`续约 ${p.name}`);
    t.money -= cost;
    p.contract = randInt(3, 6);
    S.log.unshift(`S${S.season} 续约：${p.name} 合同 +${p.contract} 赛季（-¥${cost}万）`);
    toast(`${p.name} 续约成功：合同 ${p.contract} 个赛季`);
    save(); render();
  });
}
/* 赛季末合同结算：自动续约（有资金）或离队 */
function settleContracts() {
  const t = getMyTeam();
  const notices = [];
  POS.forEach(pos => {
    t.players[pos].slice().forEach(p => {
      if (p.loan) return;                       // 租借球员不参与合同结算
      p.contract = (p.contract == null ? 1 : p.contract) - 1;
      if (p.contract > 0) return;
      const cost = renewCost(p);
      const isStarter = t.lineup[pos] === p.id;
      if (t.money >= cost && (isStarter || p.ovr >= 82)) {
        t.money -= cost;
        p.contract = randInt(3, 6);
        notices.push(`【${p.name}】自动续约 ${p.contract} 赛季（-¥${cost}万）`);
      } else {
        const idx = t.players[pos].findIndex(x => x.id === p.id);
        if (idx === -1 || t.players[pos].length <= 1) { p.contract = 1; return; } // 最后一人不放手
        t.players[pos].splice(idx, 1);
        recycleToFreeAgents(p);
        notices.push(`【${p.name}】合同到期离队（资金不足 ¥${cost}万）`);
        if (p.ovr >= 85) addPrestige(-2, `${p.name} 合同到期离队`);
      }
    });
    // 离队造成空位时从自由身补人
    while (!t.players[pos].length) t.players[pos].push(takeFreeAgent(pos));
    initLineup(t);
  });
  // AI 战队同样处理（简化：直接续约，不弹通知）
  S.teams.forEach(tm => {
    if (tm.id === S.myTeamId) return;
    POS.forEach(pos => tm.players[pos].forEach(p => {
      p.contract = (p.contract == null ? 1 : p.contract) - 1;
      if (p.contract <= 0) p.contract = randInt(2, 3);
    }));
  });
  S.contractNotices = notices;
  return notices;
}
/* ---------------- 年龄 / 成长（3 个赛季 = 1 岁） ----------------
   年 = 3 个赛季：第 4、7、10… 赛季开始时全联盟年龄 +1。
   衰退是「逐季」结算的，不是等长一岁才掉：
     · 27~29 岁：每赛季 操作/意识/配合/心态 -1，成长上限 -1
     · 30 岁以上：每赛季 -2，上限 -2（下限 40 / 60）
   ≤26 岁仍有成长机会（越年轻概率越高），27 岁起停止成长、只减不增。 */
const AGE_SEASONS_PER_YEAR = 3;
const AGE_DECLINE_FROM = 27;          // 26 岁以上开始下滑
function seasonYear(season) { return Math.floor((Math.max(1, season || 1) - 1) / AGE_SEASONS_PER_YEAR) + 1; }
// 涨岁季：第 4、7、10… 赛季（第 1 赛季是开局，不算"长了一岁"）
function isAgeYearTick(season) { const s = Math.max(1, season || 1); return s > 1 && (s - 1) % AGE_SEASONS_PER_YEAR === 0; }
function ageDecline(p) { const a = p.age || 22; return a >= 30 ? 2 : a >= AGE_DECLINE_FROM ? 1 : 0; }
function growthChance(age) { const a = age || 22; return a <= 21 ? 0.75 : a <= 24 ? 0.55 : a <= 26 ? 0.30 : 0; }
// 体能上限随年龄下降（26 岁起每岁 -4，最低 60）：老将"跑不动"体现在这里
function stCapForAge(age) { return clamp(100 - Math.max(0, (age || 22) - 26) * 4, 60, 100); }
function stCapOf(p) { return p && p.stCap != null ? p.stCap : 100; }
function clampSt(p, v) { return clamp(v, 40, Math.min(100, stCapOf(p))); }
// 赛季末调用：返回 { tick: 是否长了一岁, aged: 本队涨岁名单 }
// 老将只掉"操作"（手上功夫）与体能上限；意识/配合/心态是经验，不降（30 岁后偶尔还会 +1）
function agePlayers() {
  const tick = isAgeYearTick(S.season);
  const aged = [];
  S.teams.forEach(tm => POS.forEach(pos => tm.players[pos].forEach(p => {
    if (tick) {
      p.age = (p.age || 22) + 1;
      if (tm.id === S.myTeamId) aged.push(`${p.name} ${p.age}岁`);
    }
    const age = p.age || 22;
    p.stCap = stCapForAge(age);
    p.st = clampSt(p, p.st);
    const dec = ageDecline(p);
    if (dec > 0) {
      p.op = clamp(p.op - dec, 40, p.ceil);
      p.ceil = clamp(p.ceil - 1, 60, 99);           // 上限随年龄回落，练不回来
      if (age >= 30 && rand() < 0.4) p.aw = clamp(p.aw + 1, 40, p.ceil); // 老而弥坚：经验补一点意识
    }
    p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
  })));
  return { tick, aged };
}
/* ---------------- 赛中租借（转会窗关闭后仍可短期补强） ---------------- */
function loanCandidates() {
  const out = [];
  S.teams.forEach(o => {
    if (o.id === S.myTeamId) return;
    POS.forEach(pos => o.players[pos].forEach(p => {
      if (o.lineup[pos] === p.id) return;
      out.push({ pos, p, fromTeam: o });
    }));
  });
  return out.sort((a, b) => b.p.ovr - a.p.ovr).slice(0, 8);
}
function loanSign(key) {
  const t = getMyTeam();
  if ((S.loansUsed || 0) >= (S.maxLoans || 1)) { toast("本赛季租借次数已用完"); return; }
  if (S.transferWindow) { toast("转会窗口开放期间不需要租借，可直接签约"); return; }
  const cands = loanCandidates();
  const c = cands[parseInt(key, 10)];
  if (!c) { toast("该租借目标已不可用"); return; }
  if (t.players[c.pos].length >= 4) { toast(`${POS_NAME[c.pos]} 人数已满`); return; }
  const fee = Math.round(priceFor(c.p.ovr) * 0.25);
  if (t.money < fee) { toast(`资金不足：租借费 ¥${fee}万`); return; }
  confirmDialog({
    title: "赛中租借",
    body: `从 <b>${escapeHtml(c.fromTeam.name)}</b> 租借 ${POS_NAME[c.pos]}【<b>${escapeHtml(c.p.name)}</b>】（总评 ${c.p.ovr}）。<br>租借费 <b style="color:var(--gold)">¥${fee}万</b>，期限 <b>3 轮</b>，到期自动返回原队。<br>本赛季剩余租借次数：${(S.maxLoans || 1) - (S.loansUsed || 0)} 次。`,
    okText: "确认租借"
  }).then(ok => {
    if (!ok) return;
    if (t.money < fee) { toast("资金不足"); return; }
    snapshot(`租借 ${c.p.name}`);
    const idx = c.fromTeam.players[c.pos].findIndex(x => x.id === c.p.id);
    if (idx === -1) { toast("该选手已被其他队签走"); render(); return; }
    const moved = c.fromTeam.players[c.pos].splice(idx, 1)[0];
    moved.loan = { fromTeamId: c.fromTeam.id, roundsLeft: 3, origId: moved.id };
    if (c.fromTeam.players[c.pos].length === 0) c.fromTeam.players[c.pos].push(takeFreeAgent(c.pos));
    initLineup(c.fromTeam);
    t.players[c.pos].push(moved);
    t.money -= fee; c.fromTeam.money += fee;
    S.loansUsed = (S.loansUsed || 0) + 1;
    S.loans.push({ name: moved.name, pos: c.pos, fromTeamId: c.fromTeam.id, roundsLeft: 3 });
    S.log.unshift(`S${S.season} 租借：从 ${c.fromTeam.name} 租入 ${moved.name}（¥${fee}万 / 3轮）`);
    toast(`租入【${moved.name}】（3 轮后自动返回）`);
    save(); render();
  });
}
function loanTick() {
  const t = getMyTeam();
  if (!t || !S.loans) return;
  const back = [];
  POS.forEach(pos => t.players[pos].slice().forEach(p => {
    if (!p.loan) return;
    p.loan.roundsLeft--;
    if (p.loan.roundsLeft > 0) return;
    const idx = t.players[pos].findIndex(x => x.id === p.id);
    if (idx !== -1) t.players[pos].splice(idx, 1);
    const src = S.teams.find(x => x.id === p.loan.fromTeamId);
    delete p.loan;
    if (src) { src.players[pos].push(p); initLineup(src); }
    else recycleToFreeAgents(p);
    back.push(`${p.name}`);
    if (t.lineup[pos] === p.id) initLineup(t);
    if (!t.players[pos].length) t.players[pos].push(takeFreeAgent(pos));
    initLineup(t);
  }));
  S.loans = (S.loans || []).filter(l => !back.includes(l.name));
  if (back.length) { S.log.unshift(`S${S.season}R${S.round} 租借到期：${back.join("、")} 已返回原队`); toast(`租借到期：${back.join("、")} 返回原队`); }
}
function loanReturnById(key) { /* 兼容占位：租借到期自动返回 */ }
// 赛季结束时把所有租借球员强行退回原队（避免跨赛季残留）
function returnAllLoans() {
  const t = getMyTeam();
  if (!t) return;
  POS.forEach(pos => t.players[pos].slice().forEach(p => {
    if (!p.loan) return;
    const idx = t.players[pos].findIndex(x => x.id === p.id);
    if (idx !== -1) t.players[pos].splice(idx, 1);
    const src = S.teams.find(x => x.id === p.loan.fromTeamId);
    const back = p; delete back.loan;
    if (src) { src.players[pos].push(back); initLineup(src); } else recycleToFreeAgents(back);
    if (!t.players[pos].length) t.players[pos].push(takeFreeAgent(pos));
  }));
  S.loans = [];
  initLineup(t);
}
