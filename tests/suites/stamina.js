/* 体能 / 休息 / 轮换 */
module.exports = function (env, H) {
  const { T, root } = env;
  const { ok, suite } = H;
  const S = () => T.getS();
  const stMap = () => JSON.stringify(T.POS.map(p => T.getMyTeam().players[p].map(x => Math.round(x.st))));

  suite("局间禁止休息", () => {
    H.newGame(env, { difficulty: "职业" });
    T.startSeries(S().schedule[0].oppId, 5, "regular", null, "测");
    S().series.sub = "sub";
    S().trainPoints = 10;
    const before = stMap();
    T.renderSeries();
    ok("局间无休息按钮", root().indexOf('data-act="rest"') < 0);
    ok("局间有一键轮换", root().indexOf('data-act="rotate"') >= 0);
    T.restTeam();
    ok("局间休息无效（训练点）", S().trainPoints === 10, S().trainPoints);
    ok("局间休息无效（体能）", stMap() === before);

    // 大场打完（over）可以休息
    const s = S().series;
    s.myScore = 3; s.opScore = 1; s.sub = "over";
    s.games = [{ mySide: "blue", myPicks: { top: "吕布", jungle: "澜", mid: "不知火舞", bot: "公孙离", support: "张飞" }, oppPicks: { top: "铠", jungle: "镜", mid: "西施", bot: "后羿", support: "牛魔" }, winner: "me", posDetail: {}, myTotal: 500, oppTotal: 480, combos: [], oppCombos: [] }];
    s.rewards = { money: 80, fans: 5000, win: true };
    T.renderSeries();
    ok("大场结束页有休息按钮", root().indexOf('data-act="rest"') >= 0);
    const tp = S().trainPoints;
    T.restTeam();
    ok("大场结束后可休息", S().trainPoints === tp - 2, S().trainPoints);
  });

  suite("轮换与体能标签", () => {
    H.newGame(env, { difficulty: "职业" });
    const t = T.getMyTeam();
    // 把低体能打到「现任首发」身上，保证一定触发轮换建议与撤销快照
    // （原来打在 players[p][0] 上，而首发未必是第 0 个 → 偶发拿不到 undo）
    T.POS.forEach(p => {
      const cur = t.players[p].find(x => x.id === t.lineup[p]);
      if (cur) cur.st = 40;
    });
    const sug = T.rotationSuggest(t);
    ok("低体能触发轮换建议", sug.length > 0, sug.length);
    const before = T.POS.map(p => t.players[p].find(x => x.id === t.lineup[p]).st);
    T.applyRotation(true);
    const after = T.POS.map(p => t.players[p].find(x => x.id === t.lineup[p]).st);
    ok("轮换后首发体能不下降", after.every((v, i) => v >= before[i]), JSON.stringify(after));
    ok("撤销可用", !!S().undo, S().undo && S().undo.label);
    T.handleAct("undo");
    ok("撤销后仍有队伍", !!S().teams);

    t.players.top[0].st = 40;
    S().tab = "team";
    T.renderMain();
    ok("体能告急标签", root().indexOf("体力告急") >= 0 || root().indexOf("st-tag") >= 0);
  });
};
