/* =====================================================================
   tests/audit-endgame.js —— 通关/成就专项边界复审
   用法：node tests/audit-endgame.js
   覆盖：通关状态存档往返与导入、重新开档、继续执教后第 6 冠不再弹、
         旧存档字段迁移、声望成就即时解锁、通关页锁定、UI 开新赛季入口
   退出码：0 = 全通过
   ===================================================================== */
const H = require("./harness");
let errs = [];
const ok = (t, m, c, x) => { if (!c) errs.push(`[${t}] ${m}${x !== undefined ? " → " + x : ""}`); };
function env() { const h = H.makeEnv(); h.T.setConfirm(() => ({ then: f => f(true) })); return h; }
function createVictory(h) {
  const T = h.T; const S = T.getS(); const n = T.getMyTeam().name;
  for (let i = 1; i <= 5; i++) S.history.push({ season: i, team: n, rank: 1, playoff: true, final: true, champion: true, prestige: 100, champName: n, matches: [], fixtures: [] });
  S.season = 5; S.phase = "end"; T.getMyTeam().prestige = 100; T.checkAchievements(); T.checkVictory();
  return S;
}

// A. 通关状态存档往返
{
  const h = env(), T = h.T, tag = "A/存档往返";
  T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
  const S = createVictory(h);
  T.save();
  const raw = h.store[T.slotKey(1)];
  ok(tag, "通关页已落盘", JSON.parse(raw).victory && JSON.parse(raw).page === "victory", JSON.parse(raw).page);
  T.load();
  ok(tag, "读档后通关状态保留", !!T.getS().victory && T.getS().page === "victory", T.getS().page);
  T.render();
  ok(tag, "读档后渲染通关页", h.root().indexOf("王朝达成") >= 0);

  // G. 导入导出后成就保留
  const imp = T.importSaveText(raw, 3);
  ok(tag, "导入存档成功", imp !== false);
  T.load(3);
  ok(tag, "导入后成就保留", Object.keys(T.getS().achievements || {}).length === 5, Object.keys(T.getS().achievements || {}).length);
}

// B. 重新开档
{
  const h = env(), T = h.T, tag = "B/重新开档";
  T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
  createVictory(h);
  T.handleAct("victoryrestart");
  ok(tag, "重新开档后 S 清空", T.getS() === null, T.getS());
  ok(tag, "存档槽已删除", T.slotStatus(1) === "empty", T.slotStatus(1));
  ok(tag, "回到标题页", h.root().indexOf("存档 1") >= 0);
}

// C. 继续执教后第 6 冠不再弹通关
{
  const h = env(), T = h.T, tag = "C/继续执教";
  T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
  const S = createVictory(h);
  T.handleAct("victorycontinue");
  ok(tag, "回到主界面", S.page === "main" && S.victoryDismissed === true);
  ok(tag, "成就保留", Object.keys(S.achievements).length === 5);
  // 用 UI 按钮开新赛季
  S.tab = "schedule"; T.render();
  ok(tag, "结束页有开启新赛季按钮", h.root().indexOf('data-act="newseason"') >= 0);
  T.handleAct("newseason");
  ok(tag, "新赛季正常", S.season === 6 && S.phase === "regular", `${S.season}/${S.phase}`);
  S.history.push({ season: 6, team: T.getMyTeam().name, playoff: true, champion: true, matches: [], fixtures: [] });
  T.getMyTeam().prestige = 100;
  ok(tag, "第 6 冠不再触发通关", T.checkVictory() === false);
  // 旧档模拟：抹掉新增字段后读档
  T.save();
  const raw = JSON.parse(h.store[T.slotKey(1)]);
  delete raw.achievements; delete raw.victory; delete raw.victoryDismissed;
  h.store[T.slotKey(2)] = JSON.stringify(raw);
  T.load(2);
  const S2 = T.getS();
  ok(tag, "旧档补齐新字段", S2.achievements && S2.victory === null && S2.victoryDismissed === false, JSON.stringify({ a: !!S2.achievements, v: S2.victory, d: S2.victoryDismissed }));
}

// D. 赛季中声望成就即时解锁
{
  const h = env(), T = h.T, tag = "D/即时成就";
  T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
  const S = T.getS();
  T.getMyTeam().prestige = 59;
  T.addPrestige(2, "测试");
  ok(tag, "声望 61 即时解锁豪门", !!S.achievements.powerhouse, Object.keys(S.achievements).join(","));
  T.addPrestige(25, "测试");
  ok(tag, "声望 86 即时解锁传奇", !!S.achievements.legend);
  ok(tag, "没冠军不会通关", !T.checkVictory());
}

// E. 通关锁定页面：任何强制翻页都会回通关页
{
  const h = env(), T = h.T, tag = "E/页面锁定";
  T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
  const S = createVictory(h);
  ["main", "event", "series", "title"].forEach(p => {
    S.page = p; T.render();
    ok(tag, `强制切 ${p} 后仍锁定通关页`, S.page === "victory" && h.root().indexOf("王朝达成") >= 0, S.page);
  });
}

console.log("专项复审错误 " + errs.length + " 项");
errs.forEach(e => console.log("  ✗ " + e));
process.exitCode = errs.length ? 1 : 0;
