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

  suite("一键BP 禁用", () => {
    setup("传奇");
    ok("传奇：禁用", T.autoBpAllowed() === false);
    ok("传奇：myAutoPick 返回 null", T.myAutoPick() === null);
    ok("传奇：myAutoBan 返回 null", T.myAutoBan() === null);
    const d = S().series.draft, i0 = d.stepIndex;
    let moved = false;
    for (let i = 0; i < 6; i++) if (T.autoBpStep() !== false) { moved = true; break; }
    ok("传奇：不推进 BP", !moved && d.stepIndex === i0, d.stepIndex);
    T.autoBp();
    ok("传奇：不进入运行态", !S()._autoRun);

    setup("新秀", "real");
    ok("真实名单：BP=传奇", T.aiBpLevel() === "传奇");
    ok("真实名单：禁用一键BP", T.autoBpAllowed() === false);

    ["新秀", "职业"].forEach(diff => {
      setup(diff);
      const d = S().series.draft;
      let g = 0; while (d && !d.over && g++ < 60) T.autoBpStep();
      ok(`${diff}：能走完 BP`, d.over === true);
      ok(`${diff}：双方各 5 人`, d.picks[d.mySide].length === 5 && d.picks[T.aiSide(d)].length === 5);
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
          if (kind === "mine") { const pk = T.myAutoPick(); if (pk) d.picks[d.mySide].push({ pos: pk.pos, hero: pk.hero }); }
          else T.aiPickTurn({ actor: side });
        }
        q += quality(d.picks[side], me());
        S().series.oppId = realOpp;
        n++;
      }
      return q / n;
    }
    const mine = measure("mine"), rookie = measure("ai", "新秀"), pro = measure("ai", "职业");
    ok("一键BP 强于新秀AI", mine > rookie, `${mine.toFixed(2)} vs ${rookie.toFixed(2)}`);
    ok("一键BP 弱于职业AI", mine < pro, `${mine.toFixed(2)} vs ${pro.toFixed(2)}`);
  });

  suite("经济", () => {
    ok("特训费随总评上升", T.trainCost({ ovr: 90 }) > T.trainCost({ ovr: 70 }));
    ok("特训 90 分 ≈ 10 万", Math.abs(T.trainCost({ ovr: 90 }) - 10) <= 1, T.trainCost({ ovr: 90 }));
    ok("转会 90 分 ≈ 376 万", Math.abs(T.priceFor(90) - 376) <= 4, T.priceFor(90));
    ok("卖出价 = 50%", Math.abs(T.sellPrice({ ovr: 90 }) - T.priceFor(90) * 0.5) <= 1);
    ok("续约 = 身价 50%", T.renewCost({ ovr: 90 }) === Math.round(T.priceFor(90) * 0.5));
    ok("突破 > 300 万", T.breakCost({ ovr: 90 }) > 300, T.breakCost({ ovr: 90 }));

    H.newGame(env, { difficulty: "职业" });
    const m0 = me().money;
    H.playSeason(env);
    const inc = me().money - m0;
    ok("整赛季净收入在 200~1800 万（含季后赛与董事会奖金）", inc >= 200 && inc <= 1800, inc);
  });
};
