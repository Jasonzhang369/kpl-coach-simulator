/* 新系统：董事会目标 / 教练组 / 战术人格 / 英雄熟练度 / 战力尺度 / swing 分布 */
module.exports = function (env, H) {
  const { T, root } = env;
  const { ok, suite } = H;
  const S = () => T.getS();
  const me = () => T.getMyTeam();

  suite("战力尺度", () => {
    ok("POWER_SCALE = 34", T.POWER_SCALE === 34, T.POWER_SCALE);
    // 战力领先 3% 时的胜率应落在"有优势但不碾压"
    const my = 500, opp = 515;
    const p = 1 / (1 + Math.pow(10, (opp - my) / T.POWER_SCALE));
    ok("战力差 3% 时胜率在 25%~40%", p > 0.25 && p < 0.40, p.toFixed(3));
    const p22 = 1 / (1 + Math.pow(10, (opp - my) / 22));
    ok("比旧尺度(22)更钝", p > p22, `${p.toFixed(3)} vs ${p22.toFixed(3)}`);
  });

  suite("swing 参与判定", () => {
    H.newGame(env, { difficulty: "职业" });
    T.startSeries(S().schedule[0].oppId, 5, "regular", null, "测");
    let g = 0; while (S().series.draft && !S().series.draft.over && g++ < 60) T.autoBpStep();
    const s = S().series, b = s.battle;
    ok("赛前不决定胜负", b.myWin == null);
    b.minute = Math.round(b.duration / 2);          // 比赛中段才看 swing 的影响
    const base = T.battleWinRate(b);
    b.swing = 0.4; const up = T.battleWinRate(b);
    b.swing = -0.4; const down = T.battleWinRate(b);
    ok("swing 正向提升胜算", up > base, `${base.toFixed(3)} → ${up.toFixed(3)}`);
    ok("swing 负向降低胜算", down < base, `${base.toFixed(3)} → ${down.toFixed(3)}`);
    b.swing = 0; b.minute = 0;
    s.sub = "battle";
    g = 0; while (S().series && S().series.sub === "battle" && g++ < 90) T.battleTick();
    ok("结束才定胜负", typeof b.myWin === "boolean");
    ok("记录最终概率", typeof b.finalProb === "number", b.finalProb);
  });

  suite("董事会目标", () => {
    H.newGame(env, { difficulty: "职业" });
    ok("开档即有目标", !!(S().kpi && S().kpi.main && S().kpi.main.title), S().kpi && S().kpi.main.title);
    ok("目标含奖励/惩罚", S().kpi.reward.money > 0 && S().kpi.penalty.money > 0);
    // 达成：伪造夺冠结果
    const t = me(), m0 = t.money;
    S().seasonResult = { champion: true, final: true, playoff: true, rank: 1 };
    S().champion = true;
    S().history = []; S().kpiResult = null; S().kpi = { ...S().kpi, main: { type: "champion", title: "卫冕夺冠", desc: "x" } };
    const res = T.evaluateKpi();
    ok("夺冠判定达成", res && res.ok === true);
    ok("达成后拿到奖金", t.money > m0, `${m0} → ${t.money}`);
    // 重复调用不会二次发钱
    const m1 = t.money;
    T.evaluateKpi();
    ok("目标只结算一次", t.money === m1, `${m1} → ${t.money}`);

    // 未达成：扣钱（reward/penalty 与 main.type 必须同源，这里手工对齐）
    const t2 = me(), m2 = t2.money;
    S().kpiResult = null;
    S().kpi = { ...S().kpi, main: { type: "champion", title: "卫冕夺冠", desc: "x" },
      reward: { money: 260, prestige: 8 }, penalty: { money: 80, prestige: 4 } };
    S().champion = false;
    S().seasonResult = { rank: 9, champion: false };
    const res2 = T.evaluateKpi();
    ok("未达成判定失败", res2 && res2.ok === false);
    ok("未达成扣钱", t2.money < m2, `${m2} → ${t2.money}`);
  });

  suite("季末不重复记账", () => {
    H.newGame(env, { difficulty: "职业" });
    S().seasonResult = { rank: 5, playoff: true };
    T.recordHistory();
    const n1 = S().history.length;
    T.recordHistory();
    ok("recordHistory 幂等", S().history.length === n1, `${n1} → ${S().history.length}`);
  });

  suite("教练组", () => {
    H.newGame(env, { difficulty: "职业" });
    ok("初始无职员", T.staffLevel("mental") === 0 && T.staffWage() === 0);
    const baseSt = T.staminaCostPerGame(), baseRest = T.restGain(), baseIntel = T.intelSize();
    S().staff = { mental: 2, fitness: 2, analyst: 3 };
    ok("体能教练降低每局消耗", T.staminaCostPerGame() === baseSt - 2, T.staminaCostPerGame());
    ok("体能教练提升休息收益", T.restGain() === baseRest + 8, T.restGain());
    ok("数据分析师增加情报", T.intelSize() === baseIntel + 6, T.intelSize());
    ok("工资合计 > 0", T.staffWage() > 0, T.staffWage());
    // 心理教练：每轮回心态 + 清低迷
    const p = me().players.mid[0];
    p.me = 60; p.status = "low"; p.statusRounds = 2;
    T.applyStaffPassive();
    ok("心理教练提心态", p.me > 60, p.me);
    ok("2 级心理教练清低迷", p.status === "ok", p.status);

    // 赛季末扣工资（通过赛季初汇报里的文案确认）
    S().staff = { mental: 1, fitness: 0, analyst: 0 };
    const wage = T.staffWage();
    T.newSeason();
    ok("赛季末扣工资有记录", !!(S().event && S().event.msg && S().event.msg.indexOf("教练组工资") >= 0), S().event && S().event.msg);

    S().staff = { mental: 3, fitness: 3, analyst: 3 };
    me().money = 0;
    S().champion = false;
    S().seasonResult = { rank: 10, champion: false };   // 无季后赛 → 奖金 42，付不起 62 的工资
    S().kpiResult = { season: S().season, ok: false, youthOk: false, notes: [] };  // 不吃 KPI 奖金
    T.newSeason();
    ok("付不起工资会有人离职", T.staffWage() < 62, T.staffWage());
  });

  suite("战术人格", () => {
    H.newGame(env, { difficulty: "职业" });
    ok("每队都有人格", S().teams.every(t => t.persona && T.personaOf(t)), "缺失");
    const kinds = new Set(S().teams.map(t => T.personaOf(t).key));
    ok("12 队风格不全相同", kinds.size >= 3, kinds.size);
    // 人格只是"偏好"，权重必须在 0.9~1.15 之间，不能把对手钉死
    let inRange = true;
    T.PERSONAS.forEach(p => {
      Object.values(p.pos || {}).concat(Object.values(p.arc || {})).forEach(v => { if (v < 0.9 || v > 1.15) inRange = false; });
    });
    ok("人格权重是软偏好（0.9~1.15）", inRange);
    // 人格会影响选人倾向：四保一 vs 野核，看两边首选分路的分布
    function firstPickLane(key) {
      const counts = {};
      for (let i = 0; i < 40; i++) {
        H.newGame(env, { difficulty: "职业" });
        S().teams.find(t => t.id === S().myTeamId).persona = key;
        S().series = null;
        T.startSeries(S().schedule[0].oppId, 5, "regular", null, "测");
        S().teams.find(t => t.id === S().series.oppId).persona = key;
        const d = S().series.draft;
        T.aiPickTurn({ actor: T.aiSide(d) });
        const pick = d.picks[T.aiSide(d)][0];
        if (pick) counts[pick.pos] = (counts[pick.pos] || 0) + 1;
      }
      return counts;
    }
    const protect = firstPickLane("protect");
    const jungle = firstPickLane("jungleCore");
    // 行为侧只看「方向」且用组合口径：单看 bot 的样本量太小（四保一首选更常是辅助/前排），
    // 会随随机数抖动；权重表本身（下面两条）才是确定性判据。
    const botSide = o => (o.bot || 0) + (o.support || 0);
    ok("四保一更偏向发育路+辅助", botSide(protect) > botSide(jungle), `${botSide(protect)} vs ${botSide(jungle)}`);
    ok("野核更爱先拿打野", (jungle.jungle || 0) > (protect.jungle || 0), `${jungle.jungle || 0} vs ${protect.jungle || 0}`);
    const P = k => T.PERSONAS.find(p => p.key === k) || { pos: {} };
    ok("人格表：四保一对发育路权重 > 野核", (P("protect").pos.bot || 1) > (P("jungleCore").pos.bot || 1));
    ok("人格表：野核对打野权重 > 四保一", (P("jungleCore").pos.jungle || 1) > (P("protect").pos.jungle || 1));
  });

  suite("英雄熟练度", () => {
    H.newGame(env, { difficulty: "职业" });
    const p = me().players.top[0];
    ok("英雄池 6 个", p.heroPool.length === 6, p.heroPool.length);
    ok("熟练度表齐全", p.heroPool.every(n => T.masteryOf(p, n) >= 45 && T.masteryOf(p, n) <= 96));
    ok("熟练度影响倍率", T.profOf(p, p.heroPool[0]) > T.profOf(p, "不存在"));
    const before = T.masteryOf(p, p.heroPool[p.heroPool.length - 1]);
    const tp = S().trainPoints, m0 = me().money;
    const lowHero = p.heroPool[p.heroPool.length - 1];
    T.trainHero(p.id, lowHero);
    ok("练英雄提升熟练度", T.masteryOf(p, lowHero) > before, `${before} → ${T.masteryOf(p, lowHero)}`);
    ok("练英雄消耗训练点", S().trainPoints === tp - 1, S().trainPoints);
    ok("练英雄花钱", me().money < m0, `${m0} → ${me().money}`);
    // BP 界面显示 ★数值
    S().series = null;
    T.startSeries(S().schedule.find(x => !x.played).oppId, 5, "regular", null, "测");
    const d = S().series.draft;
    const pickStep = d.steps.findIndex(st => st.type === "pick" && st.actor === d.mySide);
    d.stepIndex = pickStep;                    // 停在我的选将回合
    T.renderSeries();
    ok("BP 页出现熟练度标记", root().indexOf("★") >= 0);
    ok("熟练度标记是数字", /★\d+/.test(root()), (root().match(/★\d+/) || [])[0]);
  });

  /* ---- 平衡性回归：这几个坑修过一次，别再退回去 ---- */
  suite("平衡", () => {
    // 1) 池外英雄不是 0 熟练度（否则第 2 局起全联盟统一 0.94，熟练度系统只剩第 1 局有效）
    H.newGame(env, { difficulty: "职业" });
    const p = me().players.top[0];
    ok("池外英雄有基础熟练度", T.profOf(p, "池外英雄不存在") >= 1.0, T.profOf(p, "池外英雄不存在"));
    ok("绝活明显强于池外", T.profOf(p, p.heroPool[0]) > T.profOf(p, "池外英雄不存在") + 0.03);

    // 2) 玩家比赛里的对手 AI 也要掉体能（曾经只有玩家掉，11 轮后 AI 99 / 玩家 36）
    S().transferWindow = false;
    const opp = S().teams.find(t => t.id !== S().myTeamId);
    const oppSt = () => T.POS.reduce((a, q) => a + opp.players[q].find(z => z.id === opp.lineup[q]).st, 0) / 5;
    const before = oppSt();
    S().series = null; S().page = "main";
    T.startSeries(opp.id, 5, "regular", null, "测");
    S().series.sub = "battle";
    let g = 0; while (S().series && S().series.sub === "battle" && g++ < 90) T.battleTick();
    const games = (S().series.games || []).length;
    if (S().series.sub === "over") T.handleAct("seriescontinue");
    ok("对手打完系列赛会掉体能", oppSt() < before || games === 0, `${before.toFixed(0)} → ${oppSt().toFixed(0)}（${games} 局）`);

    // 3) 开局不触发负面事件（否则刚开档主力就伤停，战力直接掉一个位置）
    let bad = 0;
    for (let i = 0; i < 40; i++) {
      T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
      const t = T.getMyTeam();
      T.POS.forEach(q => t.players[q].forEach(x => { if (x.status === "inj" || x.status === "low") bad++; }));
    }
    ok("40 次开档无伤病/低迷", bad === 0, bad);

    // 4) 选秀不再把玩家固定为最强（蛇形起点按位置错开）
    const ranks = [];
    for (let i = 0; i < 30; i++) {
      T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
      const ps = T.getS().teams.map(t => T.teamPower(t));
      ranks.push(ps.slice().sort((a, b) => b - a).indexOf(T.teamPower(T.getMyTeam())) + 1);
    }
    const firstCount = ranks.filter(r => r === 1).length;
    ok("玩家不总是战力第一（< 40%）", firstCount / 30 < 0.4, `${firstCount}/30`);
    ok("玩家名次有分散（至少出现 4 种名次）", new Set(ranks).size >= 4, [...new Set(ranks)].join(","));

    // 5) AI 也会处理伤停首发（换替补；没替补就带伤出战）
    H.newGame(env, { difficulty: "职业" });
    const aiT = T.getS().teams.find(t => t.id !== T.getS().myTeamId);
    const starter = aiT.players.top.find(x => x.id === aiT.lineup.top);
    starter.status = "inj"; starter.statusRounds = 2;
    T.advanceRegular();
    const now = aiT.players.top.find(x => x.id === aiT.lineup.top);
    ok("AI 轮间处理好伤停首发", !(now && now.status === "inj" && now.statusRounds > 0), now && `${now.name}/${now.status}`);
  });

  /* ---- 音频与界面（设置 / 指南 / 返回首页） ---- */
  suite("音频与界面", () => {
    // 1) 无头环境（没有 AudioContext）下所有音频接口必须安全降级，不能抛错
    ok("无音频环境时 audioSupported() = false", T.audioSupported() === false);
    let threw = null;
    try {
      T.sfx("click"); T.playBgm("menu"); T.playBgm("peak"); T.updateBgm();
      T.stopBgm(); T.unlockAudio();
    } catch (e) { threw = e.message; }
    ok("音频接口在无 AudioContext 时不抛错", threw === null, threw);

    // 2) 偏好持久化
    const p = T.audioPref();
    ok("默认有 master/bgm/sfx", typeof p.master === "number" && typeof p.bgm === "number" && typeof p.sfx === "number");
    p.bgm = 0.31; T.saveAudioPref();
    const raw = env.store[T.AUDIO_PREF_KEY];
    ok("偏好写入 localStorage", !!raw && JSON.parse(raw).bgm === 0.31, raw);
    p.bgm = T.AUDIO_DEFAULTS.bgm; T.saveAudioPref();   // 还原，避免影响后续

    // 3) 四首曲子齐全，巅峰对决是独立曲目
    ["menu", "match", "peak", "win"].forEach(k => {
      const t = T.TRACKS[k];
      ok(`曲目 ${k} 存在且有音符`, !!t && Array.isArray(t.bass) && t.bass.some(x => x != null) && t.bass.length === 32);
    });
    ok("巅峰对决曲比常规赛更快", T.TRACKS.peak.bpm > T.TRACKS.match.bpm + 20, `${T.TRACKS.peak.bpm} vs ${T.TRACKS.match.bpm}`);

    // 4) 设置面板
    const mask = T.openSettings();
    ok("设置面板生成", !!mask && mask.id === "settings-mask");
    const h = mask ? mask.innerHTML : "";
    ok("设置含音乐开关", h.indexOf('data-set="bgmOn"') >= 0);
    ok("设置含音效开关", h.indexOf('data-set="sfxOn"') >= 0);
    ok("设置含三个音量滑块", (h.match(/data-vol="/g) || []).length === 3);
    ok("设置含返回首页入口", h.indexOf('data-act="gotitle"') >= 0);
    ok("设置含重看指南入口", h.indexOf('data-act="openguide"') >= 0);
    ok("设置说明巅峰对决 BGM 可替换", h.indexOf("audio/peak.mp3") >= 0);

    // 5) 游玩指南
    const g = T.openGuide(true);
    ok("指南面板生成", !!g && g.id === "guide-mask");
    const gh = g ? g.innerHTML : "";
    const steps = (gh.match(/class="guide-step"/g) || []).length;
    ok("指南有 8 个步骤", steps === 8, steps);
    ok("指南提到全局 BP", gh.indexOf("全局 BP") >= 0);
    ok("指南提到巅峰对决", gh.indexOf("巅峰对决") >= 0);
    ok("看完指南写入标记", T.guideSeen() === true);

    // 6) 场景选曲：巅峰对决必须是专属曲
    const keepSeries = S() ? S().series : null;
    if (S()) {
      S().series = { draft: { peak: true }, sub: "draft", myScore: 3, opScore: 3, kind: "playoff" };
      ok("巅峰对决 → peak 专属曲", T.bgmTrackFor() === "peak", T.bgmTrackFor());
      S().series = { draft: { peak: false }, sub: "draft", myScore: 1, opScore: 1, kind: "regular" };
      ok("普通局 → match", T.bgmTrackFor() === "match", T.bgmTrackFor());
      S().series = { draft: null, battle: { peak: true }, sub: "battle", myScore: 3, opScore: 3, kind: "playoff" };
      ok("巅峰对决战斗中仍放 peak", T.bgmTrackFor() === "peak", T.bgmTrackFor());
      S().series = { draft: null, sub: "over", myScore: 4, opScore: 2, kind: "playoff", playoffSlot: "gf" };
      ok("总决赛夺冠 → win 短曲", T.bgmTrackFor() === "win", T.bgmTrackFor());
      S().series = keepSeries;
      S().page = "main";
      ok("回到主界面 → match", T.bgmTrackFor() === "match", T.bgmTrackFor());
    }

    // 7) 顶栏入口齐全（指南 / 设置 / 返回首页）
    H.newGame(env, { difficulty: "职业" });
    S().tab = "team"; T.renderMain();
    const top = root();
    ["openguide", "opensettings", "gotitle"].forEach(a => ok(`顶栏含 ${a}`, top.indexOf(`data-act="${a}"`) >= 0));
  });
};