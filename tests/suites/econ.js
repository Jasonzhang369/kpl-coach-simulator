/* 一键 BP 的强度与禁用规则 + 经济 */
module.exports = function (env, H) {
  const { T } = env;
  const { ok, suite } = H;
  const S = () => T.getS();
  const me = () => T.getMyTeam();

  function setup(diff, roster) {
    H.newGame(env, { difficulty: diff, rosterMode: roster || "draft" });
    T.startSeries(S().schedule[0].oppId, 5, "regular", null, "测");
    return S();
  }

  suite("一键BP 全难度可用", () => {
    setup("传奇");
    ok("传奇：允许一键BP", T.autoBpAllowed() === true);
    ok("传奇：myAutoPick 能给出英雄", !!(T.myAutoPick() && T.myAutoPick().hero), T.myAutoPick() && T.myAutoPick().hero);
    ok("传奇：myAutoBan 能给出 ban", !!T.myAutoBan());
    const d = S().series.draft, i0 = d.stepIndex;
    let steps = 0;
    for (let i = 0; i < 6; i++) if (T.autoBpStep() !== false) steps++;
    ok("传奇：一键BP 能推进 BP", steps > 0 && d.stepIndex > i0, `${steps} 步`);

    setup("职业", "real");
    ok("真实名单：BP=传奇", T.aiBpLevel() === "传奇");
    ok("真实名单：允许一键BP", T.autoBpAllowed() === true);

    ["新秀", "职业", "传奇"].forEach(diff => {
      setup(diff);
      const dd = S().series.draft;
      let g = 0; while (dd && !dd.over && g++ < 80) T.autoBpStep();
      ok(`${diff}：能走完 BP`, dd.over === true);
      ok(`${diff}：双方各 5 人`, dd.picks[dd.mySide].length === 5 && dd.picks[T.aiSide(dd)].length === 5);
    });
  });

  suite("一键BP 强度", () => {
    function quality(picks, team) {
      let sum = 0, n = 0;
      picks.forEach(e => {
        const h = T.heroByName(e.hero); if (!h) return;
        const st = team.players[e.pos].find(x => x.id === team.lineup[e.pos]);
        const starter = team.players[e.pos].find(x => x.id === team.lineup[e.pos]);
        sum += T.heroStrength(h) * T.laneFit(h, e.pos) * T.profOf(starter, h.name); n++;
      });
      return n ? sum / n : 0;
    }
    function measure(kind, diff) {
      let q = 0, n = 0;
      for (let i = 0; i < 40; i++) {
        setup(kind === "ai" ? diff : "职业");
        const realOpp = S().series.oppId;
        if (kind === "ai") S().series.oppId = S().myTeamId;
        const d = S().series.draft;
        const side = kind === "mine" ? d.mySide : T.aiSide(d);
        for (let k = 0; k < 5; k++) {
          if (kind === "mine") { const pk = T.myAutoPick(); if (pk) d.picks[d.mySide].push(T.pickEntry(null, pk.hero)); }
          else T.aiPickTurn({ actor: side });
        }
        T.autoAssignSide(d, side);   // 新流程：双方选满 5 个后再统一排位
        q += quality(d.picks[side], me());
        S().series.oppId = realOpp;
        n++;
      }
      return q / n;
    }
    const mine = measure("mine"), rookie = measure("ai", "新秀"), pro = measure("ai", "职业");
    console.log(`     阵容质量：新秀AI ${rookie.toFixed(2)} · 一键BP ${mine.toFixed(2)} · 职业AI ${pro.toFixed(2)}`);
    // 目标改成「和职业五五开」：一键BP 应当明显强于新秀，并且与职业同档
    ok("一键BP 明显强于新秀AI", mine > rookie + 1, `${mine.toFixed(2)} vs ${rookie.toFixed(2)}`);
    ok("一键BP 与职业AI 同档（±4 分内）", Math.abs(mine - pro) <= 4, `${mine.toFixed(2)} vs ${pro.toFixed(2)}`);
  });

  suite("一键BP 参数区间", () => {
    // 需要拿到玩家档与 AI 档常量：通过 src 文本解析（无头环境不便直接取闭包外常量）
    const m = env.src.match(/const AUTO_BP = \{([^}]+)\}/);
    ok("存在 AUTO_BP 配置", !!m);
    const auto = {};
    (m ? m[1] : "").split(",").forEach(kv => {
      const [k, v] = kv.split(":");
      if (!k || v == null) return;
      const val = v.trim().replace(/\/\/.*$/, "").trim();
      auto[k.trim()] = /^".*"$/.test(val) ? val.replace(/"/g, "") : parseFloat(val);
    });
    ok("默认走边际增益评估（mode=eval）", auto.mode === "eval", auto.mode);
    ok("精算候选 8~30 个（先剪枝再算边际）", auto.evalPool >= 8 && auto.evalPool <= 30, auto.evalPool);
    ok("最终在 2~6 个候选里抽样（不是永远最优）", auto.topN >= 2 && auto.topN <= 6, auto.topN);
    ok("判断误差 jitter 在 5~25 之间（用来对齐职业档）", auto.jitter >= 5 && auto.jitter <= 25, auto.jitter);
    ok("会顺手卡对手（denyW 0~1）", auto.denyW >= 0 && auto.denyW <= 1, auto.denyW);
  });

  suite("经济", () => {
    ok("特训费随总评上升", T.trainCost({ ovr: 90 }) > T.trainCost({ ovr: 70 }));
    ok("特训 90 分 ≈ 10 万", Math.abs(T.trainCost({ ovr: 90 }) - 10) <= 1, T.trainCost({ ovr: 90 }));
    ok("转会 90 分 ≈ 376 万", Math.abs(T.priceFor(90) - 376) <= 4, T.priceFor(90));
    ok("卖出价 = 50%", Math.abs(T.sellPrice({ ovr: 90 }) - T.priceFor(90) * 0.5) <= 1);
    ok("续约 = 身价 50%", T.renewCost({ ovr: 90 }) === Math.round(T.priceFor(90) * 0.5));
    ok("突破 ≈ 180~260 万（赛季常规操作）", T.breakCost({ ovr: 90 }) >= 170 && T.breakCost({ ovr: 90 }) <= 280, T.breakCost({ ovr: 90 }));

    H.newGame(env, { difficulty: "职业" });
    const m0 = me().money;
    H.playSeason(env);
    const inc = me().money - m0;
    ok("整赛季净收入在 40~1200 万（差赛季也不至于亏本）", inc >= 40 && inc <= 1200, inc);
  });
};
