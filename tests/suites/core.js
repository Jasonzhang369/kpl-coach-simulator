/* 核心玩法：开档 / 系列赛状态机 / 积分榜 / BP 情报 */
module.exports = function (env, H) {
  const { T, root } = env;
  const { ok, suite } = H;
  const S = () => T.getS();

  suite("开档", () => {
    H.newGame(env, { difficulty: "职业", rosterMode: "draft" });
    ok("S 已建立", !!S());
    ok("12 支战队", S().teams.length === 12, S().teams.length);
    ok("每队五路首发", S().teams.every(t => T.POS.every(p => t.lineup[p])));
    ok("选手有年龄/合同", S().teams.every(t => T.POS.every(p => t.players[p].every(x => x.age >= 17 && x.contract >= 1))));
    ok("起点资金 ≥250（可能触发赞助事件）", T.getMyTeam().money >= 250, T.getMyTeam().money);
    ok("render 不抛错", (() => { try { T.render(); return true; } catch (e) { console.log(e.stack); return false; } })());

    H.newGame(env, { difficulty: "传奇", rosterMode: "real" });
    ok("真实名单模式", S().rosterMode === "real");
    ok("真实名单：AG 有轩染", T.getMyTeam().players.top.some(p => p.name === "轩染"));
    ok("真实名单 BP=传奇", T.aiBpLevel() === "传奇");
  });

  suite("系列赛状态机", () => {
    H.newGame(env, { difficulty: "职业" });
    const oppId = S().schedule[0].oppId;
    T.startSeries(oppId, 5, "regular", null, "第 1 轮");
    ok("初始 gameIndex=0", S().series.gameIndex === 0);
    // 打完第一局
    let g = 0;
    while (S().series.draft && !S().series.draft.over && g++ < 60) T.autoBpStep();
    ok("BP 完成 → preview", S().series.sub === "preview", S().series.sub);
    S().series.sub = "battle";
    g = 0;
    while (S().series && S().series.sub === "battle" && g++ < 90) T.battleTick();
    ok("第 1 局结算 → result", S().series && S().series.sub === "result", S().series && S().series.sub);
    ok("games 记录 1 局", S().series.games.length === 1);
    T.handleAct("seriesnext");
    ok("进入局间", S().series.sub === "sub");
    T.renderSeries();
    ok("局间标题「第 2 局前」", root().indexOf("第 2 局前") >= 0);
    // 选边功能只在「我上局落败」时出现；比赛结果随机，这里强制构造该状态，
    // 否则这两条断言会随结果被跳过（曾导致断言总数在 151~153 间跳动）。
    S().series.nextSideBy = "me";
    S().series.nextSide = null;
    S().series.sideLocked = false;
    T.renderSeries();
    T.handleAct("chooseside:blue");
    const once = S().series.nextSide;
    T.handleAct("chooseside:red");
    T.handleAct("chooseside:blue");
    ok("选边锁定", S().series.sideLocked === true);
    ok("重复点击不改阵营", S().series.nextSide === once, once + "→" + S().series.nextSide);
    T.newGameDraft();
    ok("gameIndex 自增到 1", S().series.gameIndex === 1, S().series.gameIndex);
    ok("第 2 局 BP 页", (() => { T.renderSeries(); return root().indexOf("第 2 局") >= 0; })());

    // 打完整场
    H.playSeries(env);
    ok("系列赛走完", !S().series, S().series && S().series.sub);
    ok("常规赛战绩有记录", T.getMyTeam().wins + T.getMyTeam().losses === 1, T.getMyTeam().wins + "/" + T.getMyTeam().losses);
    ok("联盟其他场次也结算了", (S().fixtures[0] || []).filter(f => f.played).length === 6, (S().fixtures[0] || []).filter(f => f.played).length);
  });

  suite("swing 参与判定", () => {
    H.newGame(env, { difficulty: "职业" });
    T.startSeries(S().schedule[0].oppId, 5, "regular", null, "测");
    let g = 0;
    while (S().series.draft && !S().series.draft.over && g++ < 60) T.autoBpStep();
    const s = S().series, b = s.battle;
    ok("simGame 不再预先定胜负", b.myWin == null, b.myWin);
    s.sub = "battle";
    g = 0;
    while (S().series && S().series.sub === "battle" && g++ < 90) T.battleTick();
    ok("结束时有 swing 记录", typeof b.swing === "number");
    ok("结束时才产生胜负", typeof b.myWin === "boolean", b.myWin);
    const back = s.games[s.games.length - 1];
    ok("结果写入 games", back && back.winner === (b.myWin ? "me" : "opp"), back && back.winner);
  });

  suite("积分榜", () => {
    H.newGame(env, { difficulty: "职业" });
    H.playSeries(env);
    H.playSeries(env);
    const sorted = T.standingsSorted();
    ok("排序：积分降序", sorted.every((t, i) => i === 0 || sorted[i - 1].points >= t.points));
    ok("小分统计含 12 队", Object.keys(T.teamGameStats()).length === 12);
    S().tab = "standings";
    T.renderMain();
    ok("含晋级线", root().indexOf("晋级线") >= 0);
    ok("含小分列", root().indexOf("<th>小分</th>") >= 0);
    ok("前 4 高亮", root().indexOf("top4") >= 0);
  });

  suite("BP 界面与情报", () => {
    H.newGame(env, { difficulty: "职业" });
    T.startSeries(S().schedule.find(x => !x.played).oppId, 5, "regular", null, "测");
    ok("对手擅长英雄有结果", T.oppThreatHeroes(6).length > 0);
    T.renderSeries();
    const h = root();
    ok("分路 Tab", h.indexOf("lane-tabs") >= 0);
    ok("只看我的英雄池", h.indexOf("只看我的英雄池") >= 0);
    ok("键盘提示", h.indexOf("Enter") >= 0);
    ok("ban 阶段有对手情报", h.indexOf("对手擅长") >= 0);
  });
};
