/* =====================================================================
   tests/audit-full.js —— 全流程检修（比 run.js 更狠的端到端）
   用法：node tests/audit-full.js
   覆盖：2 种名单模式 × 3 难度 × 2 赛季完整推进（常规赛+季后赛+换季）
        + 6 季长跑 + 边界（放弃系列赛、空 series 操作、坏档/旧档、巅峰对决）
   每一步都校验不变量：16 队 / 每位置有人 / 选手全局唯一 / 积分=胜*2 /
        场次=胜+负 / 首发合法 / 自由身无重复 / 资金与声望合法
   退出码：0 = 全通过，1 = 有错误
   ===================================================================== */
const H = require("./harness");
const POS = ["top", "jungle", "mid", "bot", "support"];
let errors = [], warns = [];
const err = (t, m) => errors.push(`[${t}] ${m}`);
const warn = (t, m) => warns.push(`[${t}] ${m}`);
const num = v => typeof v === "number" && isFinite(v);
const ok = (t, m, c) => { if (!c) err(t, m); };

function newEnv() { const h = H.makeEnv(); h.T.setConfirm(() => ({ then: f => f(true) })); return h; }

function checkState(T, tag) {
  const S = T.getS(); if (!S) return err(tag, "S 为空");
  const teams = S.teams || [];
  if (teams.length !== 16) err(tag, `队伍数 ${teams.length}`);
  const seen = new Map();
  teams.forEach(t => {
    POS.forEach(p => {
      const list = t.players[p] || [];
      if (!list.length) err(tag, `${t.name}.${p} 无球员`);
      list.forEach(pl => {
        if (seen.has(pl.name)) err(tag, `选手重复 ${pl.name}（${seen.get(pl.name)}/${t.name}）`); else seen.set(pl.name, t.name);
        if (pl.ovr != null && !num(pl.ovr)) err(tag, `${pl.name}.ovr 非法`);
        if (pl.st != null && (pl.st < 0 || pl.st > 100)) err(tag, `${pl.name}.st=${pl.st}`);
        if (pl.op != null && (pl.op < 0 || pl.op > pl.ceil)) err(tag, `${pl.name}.op=${pl.op}>上限${pl.ceil}`);
        if (pl.contract != null && !num(pl.contract)) err(tag, `${pl.name}.contract 非法`);
      });
      const id = t.lineup[p];
      if (!id) err(tag, `${t.name}.${p} 首发为空`);
      else if (!list.some(x => x.id === id)) err(tag, `${t.name}.${p} 首发不在名单`);
    });
    if (t.pts != null && t.pts !== t.wins * 2) err(tag, `${t.name} 积分≠胜*2`);
    if (t.games != null && t.games !== t.wins + t.losses) err(tag, `${t.name} 场次≠胜+负`);
    if (t.money < 0) err(tag, `${t.name} 资金负 ${t.money}`);
    if (t.prestige < 0 || t.prestige > 100) err(tag, `${t.name} 声望越界 ${t.prestige}`);
  });
  if (S.schedule && S.schedule.length !== 15) err(tag, `赛程 ${S.schedule.length} 场`);
  const fa = S.freeAgents || {}; const names = [];
  POS.forEach(p => (fa[p] || []).forEach(e => names.push(e.name)));
  if (new Set(names).size !== names.length) err(tag, "自由身重复");
  if (names.some(n => seen.has(n))) err(tag, "自由身与队内重复");
  if (S.trainPoints < 0) err(tag, `训练点为负 ${S.trainPoints}`);
}

function renderAll(T, tag, extraTab) {
  const S = T.getS(); const old = S.tab;
  ["team", "train", "lineup", "schedule", "standings", "market", "prestige", "format"].concat(extraTab || []).forEach(tb => {
    try { S.tab = tb; T.render(); } catch (e) { err(tag, `tab ${tb} 渲染异常 ${e.message}`); }
  });
  S.tab = old; try { T.render(); } catch (e) { err(tag, `主渲染异常 ${e.message}`); }
}

function playSeries(T, tag, S) {
  let guard = 0, peakSeen = false;
  while (S.series && guard++ < 300) {
    const s = S.series;
    if (s.sub === "draft") {
      let k = 0;
      while (S.series && S.series.draft && !S.series.draft.over && k++ < 100) T.autoBpStep();
      if (k >= 100) { err(tag, "BP 卡死"); return; }
      const d = S.series && S.series.draft;
      if (d && d.over && S.series.sub === "draft") renderAll(T, tag);
      continue;
    }
    if (s.sub === "preview") { renderAll(T, tag); s.sub = "battle"; continue; }
    if (s.sub === "battle") {
      let k = 0; while (S.series && S.series.sub === "battle" && k++ < 300) T.battleTick();
      if (k >= 300) { err(tag, "战斗卡死"); return; }
      continue;
    }
    if (s.sub === "result") {
      if (!s.games.length) err(tag, "result 无局记录");
      const g = s.games[s.games.length - 1];
      if (!g.myPicks || POS.some(p => !g.myPicks[p])) err(tag, "战报缺我方阵容");
      if (!g.oppPicks || POS.some(p => !g.oppPicks[p])) err(tag, "战报缺对手阵容");
      renderAll(T, tag);
      T.handleAct("seriesnext"); continue;
    }
    if (s.sub === "sub") {
      renderAll(T, tag);
      if (s.nextSideBy === "me" && !s.nextSide) s.nextSide = s.firstSide || "blue";
      T.newGameDraft(); continue;
    }
    if (s.sub === "over") {
      if (s.games.length > s.bestOf) err(tag, `局数 ${s.games.length}>BO${s.bestOf}`);
      if (s.games.length === 7) peakSeen = true;
      renderAll(T, tag);
      T.handleAct("seriescontinue"); return { games: s.games.length, peak: peakSeen };
    }
    err(tag, `未知 sub=${s.sub}`); return;
  }
  if (guard >= 300) err(tag, "系列赛卡死");
}

/* ---------- 1. 完整赛季矩阵 ---------- */
function runSeason(T, tag) {
  const S = T.getS(); let guard = 0;
  while (S.phase !== "end" && guard++ < 80) {
    if (!S.series) T.startMatch();
    if (!S.series) { err(tag, `第${S.round}轮无系列赛 phase=${S.phase}`); return; }
    playSeries(T, tag, S);
    checkState(T, tag);
  }
  if (S.phase !== "end") err(tag, `赛季未结束 phase=${S.phase}`);
}

function scenario(mode, diff, team, seasons) {
  const h = newEnv(); const T = h.T; const tag = `${mode}/${diff}/${team}`;
  T.newGame({ difficulty: diff, rosterMode: mode, teamName: team, slot: 1 });
  const S = T.getS();
  checkState(T, tag + "/开局"); renderAll(T, tag);
  if (!S.kpi) err(tag, "无 KPI");
  if (!S.market || !S.market.length) err(tag, "市场为空");
  if (!S.transferWindow) err(tag, "开局转会窗口未开");

  // 训练 5 属性各 1 次 + 突破 + 英雄训练
  const pid = T.getMyTeam().players.top[0].id;
  const tp0 = S.trainPoints, m0 = T.getMyTeam().money;
  ["op", "aw", "co", "me", "st"].forEach(a => T.handleAct(`train:${a}:${pid}`));
  if (S.trainPoints !== tp0 - 5) warn(tag, `5 次特训后训练点 ${S.trainPoints}（期望 ${tp0 - 5}）`);
  if (T.getMyTeam().money >= m0) warn(tag, "特训未扣钱");
  T.handleAct("rest");
  T.handleAct("hirestaff:mental");
  T.trainHero(pid, T.getMyTeam().players.top[0].heroPool[0]);
  T.handleAct(`trainbreak:${pid}`);
  checkState(T, tag + "/训练后");

  // 换首发 + 一键轮换
  const tp = T.getMyTeam();
  if (tp.players.top[1]) T.handleAct(`setlineup:top:${tp.players.top[1].id}`);
  T.applyRotation(true);
  checkState(T, tag + "/阵容");

  // 转会：买、卖、续约
  if (S.market.length) {
    const c = S.market[0]; const before = T.getMyTeam().players[c.pos].length;
    T.handleAct("marketbuy:" + c.id);
    if (T.getMyTeam().players[c.pos].length < before && T.getMyTeam().money > 0) warn(tag, "买人失败（可能资金不足/位置满）");
  }
  const bench = ["top", "jungle", "mid", "bot", "support"]
    .map(p => (T.getMyTeam().players[p] || []).find(x => x.id !== T.getMyTeam().lineup[p])).find(Boolean);
  if (bench) T.handleAct("marketsell:" + bench.id);
  const anyP = T.getMyTeam().players.top[0];
  T.handleAct("renew:" + anyP.id);
  checkState(T, tag + "/转会");

  // 租借（窗口期）
  const cands = T.loanCandidates();
  if (cands.length) {
    T.handleAct("loanin:" + cands[0].p.id);
    checkState(T, tag + "/租借");
  } else warn(tag, "无租借候选");

  // 见面会（有次数限制）
  T.handleAct("fanmeet"); T.handleAct("fanmeet"); T.handleAct("fanmeet");
  if (S.fanMeets > S.maxFanMeets) err(tag, `见面会次数越界 ${S.fanMeets}/${S.maxFanMeets}`);

  // 存档往返
  T.save();
  const raw = h.store[T.slotKey(1)];
  ok(tag, "存档未落盘", !!raw);
  const snap = JSON.parse(raw);
  ok(tag, "存档页签非法", snap.page !== "title");
  T.load();
  checkState(T, tag + "/读档");

  // 导出/导入
  const raw2 = h.store[T.slotKey(1)];
  const imported = T.importSaveText(raw2, 2);
  ok(tag, "导入存档失败", imported !== false);
  ok(tag, "存档槽2 应为 ok", T.slotStatus(2) === "ok", T.slotStatus(2));

  // 完整赛季 × N
  for (let i = 1; i <= seasons; i++) {
    runSeason(T, tag + `/S${i}`);
    const Sx = T.getS();
    if (Sx.phase !== "end") break;
    // 季后赛结构核对
    if (Sx.bracket) {
      const B = Sx.bracket;
      ok(tag, "季后赛不是 10 队", B.order.length === 10, B.order.length);
      ok(tag, "季后赛不是 12 场", (B.def || []).length === 12, (B.def || []).length);
      const unresolved = (B.def || []).filter(m => !B.resolved[m.key]);
      if (unresolved.length) warn(tag, `季后赛未结算 ${unresolved.length} 场：${unresolved.map(m => m.stage).join(",")}`);
      const gf = B.resolved.gf;
      if (gf && Sx.champion && gf.winner !== Sx.myTeamId) err(tag, "标记夺冠但总决赛胜者不是我");
      if (gf && !Sx.champion && gf.winner === Sx.myTeamId) err(tag, "总决赛赢了我却没标记冠军");
      // 参赛队必须是常规赛前 10（用结束时的排名近似核对：至少都在 S.teams 内且不重复）
      if (new Set(B.order).size !== 10) err(tag, "季后赛参赛队有重复");
      B.order.forEach(id => { if (!Sx.teams.some(t => t.id === id)) err(tag, "季后赛出现不存在的战队 id"); });
    }
    if ((Sx.history || []).length !== i) err(tag, `历史 ${Sx.history.length} 条 ≠ ${i}`);
    if (i < seasons) {
      T.handleAct("newseason");
      checkState(T, tag + `/S${i + 1}开季`);
      renderAll(T, tag);
    }
  }
  return { T, tag };
}

/* ---------- 2. 系列赛状态机边界 ---------- */
function seriesEdges() {
  const h = newEnv(); const T = h.T; const tag = "edge/series";
  T.newGame({ difficulty: "传奇", rosterMode: "real", teamName: "成都AG超玩会", slot: 1 });
  let S = T.getS();
  T.startMatch();
  S = T.getS();
  ok(tag, "未进入系列赛", !!S.series);
  const s = S.series;
  ok(tag, `BO 应为 5/7，实际 ${s.bestOf}`, s.bestOf === 5 || s.bestOf === 7);
  // 非法操作：未选英雄就 aplace / readylineup
  T.handleAct("aplace:top");
  T.handleAct("readylineup");
  ok(tag, "未分配就开打（数据未变）", s.draft && s.draft.phase !== "done");
  // 重复点 seriesnext / seriescontinue 不应崩
  ["seriesnext", "seriescontinue", "bogus:action", "pick:", "ban:"].forEach(a => { try { T.handleAct(a); } catch (e) { err(tag, `${a} 抛异常 ${e.message}`); } });
  // 放弃系列赛
  const round0 = S.round, loss0 = T.getMyTeam().losses;
  T.handleAct("abandonseries");
  ok(tag, "放弃后系列赛未清空", !T.getS().series);
  ok(tag, "放弃后未记负", T.getMyTeam().losses === loss0 + 1, `${loss0}->${T.getMyTeam().losses}`);
  ok(tag, "放弃后轮次未推进", T.getS().round === round0 + 1, `${round0}->${T.getS().round}`);
  checkState(T, tag + "/放弃");
  // 放弃后残留操作不应崩（series 为 null）
  ["pick:镜", "ban:镜", "drafttactic:push", "seriesnext", "seriescontinue", "autobp", "placeslot:top", "readylineup"].forEach(a => {
    try { T.handleAct(a); } catch (e) { err(tag, `${a} 在无系列赛时抛异常 ${e.message}`); }
  });

  // 巅峰对决：把比分堆到 3:3（BO7 季后赛）或打到第 7 局
  const h2 = newEnv(); const T2 = h2.T; const tag2 = "edge/peak";
  T2.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "重庆狼队", slot: 1 });
  const S2 = T2.getS();
  // 直接构造巅峰对决：进入系列赛后手动设 sub=peak
  T2.startMatch();
  const s2 = T2.getS().series;
  try {
    s2.sub = "peak"; T2.render();
    const picks = POS.map(p => T2.myPeakAutoPick(p));
    ok(tag2, `巅峰对决一键选人返回空 ${JSON.stringify(picks)}`, picks.every(x => typeof x === "string" && x && x !== "—"));
    const dup = new Set(picks).size !== picks.length;
    ok(tag2, "巅峰对决五个位置选到重复英雄", !dup);
  } catch (e) { err(tag2, "巅峰对决渲染异常 " + e.message); }
}

/* ---------- 3. 存档边界 ---------- */
function saveEdges() {
  const h = newEnv(); const T = h.T; const tag = "edge/save";
  T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "北京WB", slot: 1 });
  // 空槽 load 不崩
  try { T.load(3); } catch (e) { err(tag, "空槽读取抛异常 " + e.message); }
  // 坏档
  h.store[T.slotKey(4)] = "{not json";
  ok(tag, "坏档应判 broken", T.slotStatus(4) === "broken", T.slotStatus(4));
  try { T.load(4); } catch (e) { err(tag, "坏档读取抛异常 " + e.message); }
  // 缺字段档
  h.store[T.slotKey(5)] = JSON.stringify({ teams: [] });
  ok(tag, "缺字段应判 broken", T.slotStatus(5) === "broken", T.slotStatus(5));
  // 旧版本档迁移
  const cur = JSON.parse(h.store[T.slotKey(1)]);
  cur.version = 9; cur.page = "title"; delete cur.scout;
  h.store[T.slotKey(6)] = JSON.stringify(cur);
  try { T.load(6); ok(tag, "旧档迁移后页面仍在标题", T.getS().page === "main", T.getS().page); checkState(T, tag + "/迁移"); }
  catch (e) { err(tag, "旧档迁移抛异常 " + e.message); }
  // 越界槽位
  try { T.load(99); T.load(-1); } catch (e) { err(tag, "越界槽位抛异常 " + e.message); }
}

/* ---------- 4. 渲染边界 ---------- */
function renderEdges() {
  const h = newEnv(); const T = h.T; const tag = "edge/render";
  T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "苏州KSG", slot: 1 });
  const S = T.getS();
  // 未开赛时的季后赛页 / 积分榜
  renderAll(T, tag);
  // 打到季后赛（强制）
  const order = T.standingsSorted().slice(0, 10).map(t => t.id);
  T.setupPlayoff(order);
  renderAll(T, tag, ["standings"]);
  ok(tag, "bracket 未生成", !!S.bracket);
  ok(tag, "bracket order 应为 10 队", S.bracket.order.length === 10, S.bracket.order.length);
  ok(tag, "bracket 定义 12 场", S.bracket.def.length === 12, S.bracket.def.length);
  // 我的对手推进
  try { const n = T.playoffMyNext(); ok(tag, "季后赛无下一场", !!n); } catch (e) { err(tag, "playoffMyNext 抛异常 " + e.message); }
  // 反复渲染（bracket 各槽位有空值的情况）
  renderAll(T, tag);
  ok(tag, "积分榜渲染后 bracket 仍在", !!T.getS().bracket);
}

/* ---------- 5. 多赛季长跑 ---------- */
function longRun() {
  const h = newEnv(); const T = h.T; const tag = "long/6季";
  T.newGame({ difficulty: "职业", rosterMode: "real", teamName: "深圳DYG", slot: 1 });
  for (let i = 1; i <= 6; i++) {
    runSeason(T, tag + `/S${i}`);
    const S = T.getS();
    if (S.phase !== "end") { err(tag, `S${i} 未结束`); break; }
    checkState(T, tag + `/S${i}末`);
    const ages = S.teams.flatMap(t => POS.flatMap(p => t.players[p].map(x => x.age)));
    if (ages.some(a => !num(a) || a < 16 || a > 40)) err(tag, `S${i} 年龄异常 ${ages.filter(a => !num(a) || a < 16 || a > 40)}`);
    if (i < 6) T.handleAct("newseason");
  }
}

/* ---------- 执行 ---------- */
const t0 = Date.now();
["draft", "real"].forEach(mode => ["新秀", "职业", "传奇"].forEach(diff => {
  try { scenario(mode, diff, mode === "real" ? "深圳DYG" : "成都AG超玩会", 2); }
  catch (e) { err(`EXC ${mode}/${diff}`, e.stack.split("\n").slice(0, 3).join(" | ")); }
}));
[seriesEdges, saveEdges, renderEdges, longRun].forEach(fn => {
  try { fn(); } catch (e) { err("EXC " + fn.name, e.stack.split("\n").slice(0, 3).join(" | ")); }
});

console.log(`=== 错误 ${errors.length} ===`);
errors.slice(0, 70).forEach(e => console.log("  ✗ " + e));
console.log(`=== 警告 ${warns.length} ===`);
warns.slice(0, 40).forEach(e => console.log("  ! " + e));
console.log("耗时", ((Date.now() - t0) / 1000).toFixed(1) + "s");
process.exitCode = errors.length ? 1 : 0;
