/* 年龄 / 成长 / 衰退（3 赛季 = 1 岁） */
module.exports = function (env, H) {
  const { T } = env;
  const { ok, suite } = H;
  const S = () => T.getS();
  const me = () => T.getMyTeam();

  suite("年龄规则", () => {
    ok("S1-3 = 第1年", [1, 2, 3].every(s => T.seasonYear(s) === 1));
    ok("S4-6 = 第2年", [4, 5, 6].every(s => T.seasonYear(s) === 2));
    ok("S7 = 第3年", T.seasonYear(7) === 3);
    ok("涨岁季只有 4/7/10", [4, 7, 10].every(s => T.isAgeYearTick(s)) && ![1, 2, 3, 5, 6, 8, 9].some(s => T.isAgeYearTick(s)));
    ok("26 岁不衰退", T.ageDecline({ age: 26 }) === 0);
    ok("27 岁 -1", T.ageDecline({ age: 27 }) === 1);
    ok("30 岁 -2", T.ageDecline({ age: 30 }) === 2);
    ok("26 岁仍可成长", T.growthChance(26) > 0);
    ok("27 岁停止成长", T.growthChance(27) === 0);
  });

  suite("年龄结算", () => {
    H.newGame(env, { difficulty: "职业" });
    const p0 = me().players.top[0];
    p0.age = 24;
    const ages = [p0.age];
    T.newSeason(); ages.push(p0.age);
    T.newSeason(); ages.push(p0.age);
    T.newSeason(); ages.push(p0.age);
    ok("3 个赛季才涨 1 岁", JSON.stringify(ages) === JSON.stringify([24, 24, 24, 25]), JSON.stringify(ages));
    ok("S4 = 第 2 年", S().season === 4 && T.seasonYear(4) === 2);

    // 27 岁：只掉操作/体能，意识配合心态不掉
    const p27 = me().players.top[0];
    p27.age = 27; p27.op = 80; p27.aw = 80; p27.co = 80; p27.me = 80; p27.st = 80; p27.ceil = 90;
    T.agePlayers();
    ok("27 岁：操作 -1", p27.op === 79, p27.op);
    ok("27 岁：意识不降", p27.aw === 80, p27.aw);
    ok("27 岁：配合不降", p27.co === 80, p27.co);
    ok("27 岁：心态不降", p27.me === 80, p27.me);
    ok("27 岁：上限 -1", p27.ceil === 89, p27.ceil);

    // 30 岁：操作 -2
    const p30 = me().players.mid[0];
    p30.age = 30; p30.op = 80; p30.aw = 80; p30.co = 80; p30.me = 80; p30.ceil = 92;
    T.agePlayers();
    ok("30 岁：操作 -2", p30.op === 78, p30.op);
    ok("30 岁：意识不降（经验还可能 +1）", p30.aw >= 80, p30.aw);

    // 26 岁：什么都不掉（先确保不是涨岁季）
    const p26 = me().players.bot[0];
    p26.age = 26; p26.op = 70; p26.aw = 70; p26.co = 70; p26.me = 70; p26.ceil = 99;
    while (T.isAgeYearTick(S().season)) S().season++;
    T.agePlayers();
    ok("26 岁：属性不降", p26.op === 70 && p26.aw === 70 && p26.co === 70 && p26.me === 70);
    ok("26 岁：年龄不变", p26.age === 26);
  });

  suite("大赛季推进", () => {
    H.newGame(env, { difficulty: "职业" });
    const before = S().season;
    T.newSeason();
    ok("赛季 +1", S().season === before + 1);
    ok("租借次数重置", S().loansUsed === 0);
    ok("新赛季各页可渲染", (() => {
      try {
        ["team", "train", "lineup", "schedule", "standings", "market", "prestige", "format"].forEach(tab => { S().tab = tab; T.renderMain(); });
        return true;
      } catch (e) { console.log(e.stack); return false; }
    })());
  });
};
