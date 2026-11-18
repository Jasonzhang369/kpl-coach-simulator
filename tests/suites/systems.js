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

  /* 租借：必须和转会买卖共用一个窗口（每赛季初开放），而不是"窗口关闭后才可用" */
  suite("赛季初租借窗口", () => {
    T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
    ok("新赛季转会窗口默认开放", S().transferWindow === true);
    ok("窗口开放时可以租借", T.loanBlocker(null) === null, T.loanBlocker(null));
    const t0 = T.getMyTeam();
    t0.money = 600;
    const cands = T.loanCandidates();
    ok("有可租借的替补", cands.length > 0, cands.length);
    const c = cands.find(x => t0.players[x.pos].length < 4) || cands[0];
    ok("选中目标可用", T.loanBlocker(c) === null, T.loanBlocker(c));

    // UI：窗口开放 → 按钮可点，文案是「赛季初租借」
    S().tab = "market"; S().market = null; T.handleAct("tab:market");
    const htmlOpen = root();
    const btnsOpen = (htmlOpen.match(/<button[^>]*data-act="loanin:[^"]*"[^>]*>/g) || []);
    ok("标题写「赛季初租借」", htmlOpen.indexOf("赛季初租借") >= 0);
    ok("区块提示窗口开放中", htmlOpen.indexOf("租借窗口开放中") >= 0);
    ok("渲染出 6 张租借卡", btnsOpen.length === 6, btnsOpen.length);
    ok("窗口开放时租借按钮全部可点", btnsOpen.every(b => b.indexOf("disabled") < 0), btnsOpen.filter(b => b.indexOf("disabled") >= 0).length);
    // 关键回归：按钮上的标识必须对得上候选（旧版用 indexOf 对新建对象，恒为 -1 → 点了必报"目标已不可用"）
    const acts = (htmlOpen.match(/data-act="loanin:([^"]*)"/g) || []).map(s => s.slice('data-act="loanin:'.length, -1));
    const ids = cands.map(x => String(x.p.id));
    ok("租借按钮的标识能在候选里对上", acts.length > 0 && acts.every(a => ids.indexOf(a) >= 0), acts.slice(0, 3).join(","));
    ok("不再出现「赛中租借」", htmlOpen.indexOf("赛中租借") < 0);

    // 真正租一次
    const pos = c.pos, n0 = t0.players[pos].length, money0 = t0.money, fee = T.loanFee(c);
    ok("执行租借成功", T.applyLoan(c) === true);
    const t1 = T.getMyTeam();
    ok("租借后该位置人数 +1", t1.players[pos].length === n0 + 1, `${n0} → ${t1.players[pos].length}`);
    ok("扣了租借费", t1.money === money0 - fee, `${money0} → ${t1.money}（费 ${fee}）`);
    ok("对方收到租借费", c.fromTeam.money >= 200);
    ok("计次 = 1", S().loansUsed === 1, S().loansUsed);
    ok("租借列表有 1 条", (S().loans || []).length === 1);
    ok("租借球员带 loan 标记", t1.players[pos].some(p => p.loan && p.name === c.p.name));
    ok("再租被次数限制拦下", T.loanBlocker(T.loanCandidates()[0]) === "本赛季租借次数已用完", T.loanBlocker(T.loanCandidates()[0]));

    // 计数单位 = 他「出场过的大场」：坐板凳不计，一个小局上过即算 1 场，季后赛同样计入
    const moved = t1.players[pos].find(p => p.loan && p.name === c.p.name);
    const origStarter = t1.lineup[pos];
    ok("租借球员进队后默认在替补席", origStarter !== moved.id);
    ok("初始剩余 = LOAN_GAMES 场", S().loans[0].roundsLeft === T.LOAN_GAMES, S().loans[0].roundsLeft);

    // 打完一场（中途不点继续，避免推进轮次/季后赛分支）
    const playToOver = () => {
      const S2 = T.getS();
      let g = 0;
      while (S2.series && S2.series.sub !== "over" && g++ < 200) {
        const s = S2.series;
        if (s.sub === "draft") { let k = 0; while (S2.series.draft && !S2.series.draft.over && k++ < 60) T.autoBpStep(); continue; }
        if (s.sub === "preview") { s.sub = "battle"; continue; }
        if (s.sub === "battle") { let k = 0; while (S2.series.sub === "battle" && k++ < 90) T.battleTick(); continue; }
        if (s.sub === "result") { T.handleAct("seriesnext"); continue; }
        if (s.sub === "sub") { if (s.nextSideBy === "me" && !s.nextSide) s.nextSide = s.firstSide || "blue"; T.newGameDraft(); continue; }
        break;
      }
      return S2.series;
    };
    const oppId = S().teams.find(t => t.id !== S().myTeamId).id;

    // A) 全程坐板凳打一场 → 不计次
    T.startSeries(oppId, 5, "regular", null, "测·板凳");
    playToOver();
    ok("坐板凳打完一场不扣次数", S().loans[0] && S().loans[0].roundsLeft === T.LOAN_GAMES, S().loans[0] && S().loans[0].roundsLeft);

    // B) 提进首发打一场常规赛 → 扣 1
    T.getMyTeam().lineup[pos] = moved.id;
    T.startSeries(oppId, 5, "regular", null, "测·首发1");
    playToOver();
    ok("首发出场 1 场 → 剩余 2", S().loans[0] && S().loans[0].roundsLeft === 2, S().loans[0] && S().loans[0].roundsLeft);

    // C) 季后赛也计数
    T.startSeries(oppId, 7, "playoff", "ub1", "测·季后赛");
    playToOver();
    ok("季后赛出场也扣 1 → 剩余 1", S().loans[0] && S().loans[0].roundsLeft === 1, S().loans[0] && S().loans[0].roundsLeft);

    // D) 第 3 次出场 → 到期归队，且不会在系列赛中途被抽走
    T.startSeries(oppId, 5, "regular", null, "测·首发3");
    // 只打第 1 小局，检查局中没有把人抽走
    let kd = 0;
    while (S().series.draft && !S().series.draft.over && kd++ < 60) T.autoBpStep();
    S().series.sub = "battle";
    let kb = 0;
    while (S().series.sub === "battle" && kb++ < 90) T.battleTick();
    ok("小局打完仍在队里（不到大场结束不归队）", T.getMyTeam().players[pos].some(p => p.loan));
    ok("小局打完剩余场次还没扣", S().loans[0] && S().loans[0].roundsLeft === 1, S().loans[0] && S().loans[0].roundsLeft);
    playToOver();
    ok("第 3 次出场后自动返回", (S().loans || []).length === 0, (S().loans || []).length);
    ok("归队后人数复原", T.getMyTeam().players[pos].length === n0, T.getMyTeam().players[pos].length);
    ok("归队后不再带 loan 标记", !T.getMyTeam().players[pos].some(p => p.loan));
    ok("租借球员回到原队", (c.fromTeam.players[pos] || []).some(p => p.name === c.p.name));
    S().series = null; S().page = "main"; T.render();

    // 打第一场常规赛 → 窗口关闭 → 租借必须不可用
    S().transferWindow = false;
    const closed = T.loanBlocker(T.loanCandidates()[0]);
    ok("窗口关闭后不可租借", /转会窗口开放期间/.test(closed || ""), closed);
    const n2 = T.getMyTeam().players[pos].length, m2 = T.getMyTeam().money, u2 = S().loansUsed;
    T.loanSign(0);                                   // 动作侧也要拦住
    ok("窗口关闭时点租借无副作用",
      T.getMyTeam().players[pos].length === n2 && T.getMyTeam().money === m2 && S().loansUsed === u2);
    S().tab = "market"; S().market = null; T.handleAct("tab:market");
    const htmlClosed = root();
    const btnsClosed = (htmlClosed.match(/<button[^>]*data-act="loanin:[^"]*"[^>]*>/g) || []);
    ok("区块提示窗口已关闭", htmlClosed.indexOf("租借窗口已关闭") >= 0);
    ok("窗口关闭时租借按钮全部禁用", btnsClosed.length > 0 && btnsClosed.every(b => b.indexOf("disabled") >= 0), btnsClosed.length);

    // 下赛季初重新开放（次数也随赛季重置）
    S().transferWindow = true; S().loansUsed = 0;
    ok("下赛季初重新可租", T.loanBlocker(null) === null);
  });

  /* 坦野补强：数据调整 + 新增英雄 + 打野英雄池保底 + 庄周解控特性 */
  suite("坦野与英雄特性", () => {
    const h = n => T.heroByName(n);
    const fit = (n, pos) => T.laneFit(T.heroByName(n), pos);

    ok("英雄池 130 个（+程咬金、姬小满、亚连、大司命、心魔六耳、刀锋宝贝、元流之子）", T.HEROES.length === 130, T.HEROES.length);
    ok("程咬金：对抗路 / 坦克", h("程咬金").pos === "top" && h("程咬金").arc === "tank");
    ok("程咬金：打野逆用 0.82", Math.abs(fit("程咬金", "jungle") - 0.82) < 1e-9, fit("程咬金", "jungle"));

    ok("夏侯惇：打野提到 0.95", Math.abs(fit("夏侯惇", "jungle") - 0.95) < 1e-9, fit("夏侯惇", "jungle"));
    ok("猪八戒：打野提到 0.95", Math.abs(fit("猪八戒", "jungle") - 0.95) < 1e-9, fit("猪八戒", "jungle"));
    ok("赵怀真：打野提到 0.90", Math.abs(fit("赵怀真", "jungle") - 0.90) < 1e-9, fit("赵怀真", "jungle"));
    ok("亚瑟：打野降到 0.80", Math.abs(fit("亚瑟", "jungle") - 0.80) < 1e-9, fit("亚瑟", "jungle"));
    ok("苏烈/廉颇/白起：打野不变", Math.abs(fit("苏烈", "jungle") - 0.86) < 1e-9
      && Math.abs(fit("廉颇", "jungle") - 0.84) < 1e-9 && Math.abs(fit("白起", "jungle") - 0.84) < 1e-9);

    ok("梦奇：打野主场", h("梦奇").pos === "jungle" && fit("梦奇", "jungle") === 1);
    ok("梦奇：对抗路常见 0.95", Math.abs(fit("梦奇", "top") - 0.95) < 1e-9, fit("梦奇", "top"));
    ok("梦奇：辅助回到生疏", fit("梦奇", "support") < 0.80, fit("梦奇", "support"));

    ok("庄周：辅助主场", h("庄周").pos === "support" && fit("庄周", "support") === 1);
    ok("庄周：其他分路一律生疏", ["top", "jungle", "mid", "bot"].every(p => fit("庄周", p) < 0.80),
      ["top", "jungle", "mid", "bot"].map(p => fit("庄周", p)).join("/"));

    // 解控特性：只对控制型英雄（c ≥ 65）生效
    ok("庄周克制控制型英雄", T.heroTraitMult(h("庄周"), h("张良")) > 1, T.heroTraitMult(h("庄周"), h("张良")));
    ok("庄周对非控制英雄无加成", T.heroTraitMult(h("庄周"), h("鲁班七号")) === 1);
    ok("非庄周无此特性", T.heroTraitMult(h("张飞"), h("张良")) === 1);
    ok("特性幅度约 6%", Math.abs(T.heroTraitMult(h("庄周"), h("张良")) - 1.06) < 1e-9);

    // 打野英雄池保底：可野坦克（arc=tank 且 fit≥0.85）
    const jt = T.HEROES.filter(x => x.arc === "tank" && T.laneFit(x, "jungle") >= 0.85).map(x => x.name);
    ok("可野坦克池 ≥ 4 个", jt.length >= 4, jt.join("、"));
    let miss = 0;
    for (let i = 0; i < 200; i++) {
      const pool = T.pickHeroes("jungle", 6);
      if (!pool.some(nm => jt.includes(nm))) miss++;
    }
    ok("200 次抽样打野池都含坦野", miss === 0, miss + " 次缺失");
  });

  /* 新增英雄 + 元流之子五形态（形态决定四维与定位，坦克形态才算前排） */
  suite("新增英雄与元流之子五形态", () => {
    const h = n => T.heroByName(n);
    ok("姬小满：对抗路 / 战士", h("姬小满").pos === "top" && h("姬小满").arc === "fighter");
    ok("亚连：对抗路 / 战士", h("亚连").pos === "top" && h("亚连").arc === "fighter");
    ok("大司命：打野 / 战士，可摇对抗路 0.92",
      h("大司命").pos === "jungle" && h("大司命").arc === "fighter" && Math.abs(T.laneFit(h("大司命"), "top") - 0.92) < 1e-9);
    ok("心魔六耳：打野 / 刺客", h("心魔六耳").pos === "jungle" && h("心魔六耳").arc === "assassin");
    ok("刀锋宝贝：打野 / 刺客（按玩家要求走打野）", h("刀锋宝贝").pos === "jungle" && h("刀锋宝贝").arc === "assassin");

    const ud = h("元流之子");
    ok("元流之子：只有一份英雄条目", T.HEROES.filter(x => x.name === "元流之子").length === 1);
    // 选将时在五个形态里挑一个，再像普通英雄一样放进任意分路
    const forms = T.heroFormList(ud);
    ok("可选五个形态", forms.length === 5, forms.map(f => f.key).join("/"));
    ok("五形态各有一条本命分路",
      new Set(forms.map(f => f.pos)).size === 5 && ["mid", "top", "bot", "support", "jungle"].every(p => forms.some(f => f.pos === p)),
      forms.map(f => f.key + ":" + f.pos).join(" "));
    ok("形态定位正确", forms.every(f => ({ mage: "mage", tank: "tank", marksman: "marksman", support: "support", assassin: "assassin" })[f.key] === f.arc));
    ok("形态四维不同", forms.every(f => [f.o, f.s, f.c, f.m].every(Number.isFinite))
      && T.heroInPos(ud, "top", "tank").s !== T.heroInPos(ud, "bot", "marksman").s);
    ok("非多形态英雄不受影响", T.heroInPos(h("吕布"), "mid") === h("吕布"));

    // 形态决定"本命分路"：放对 1.00，放错按逆用 0.72
    ok("坦克形态放对抗路 = 本命", T.laneFit(T.heroInPos(ud, "top", "tank"), "top") === 1);
    ok("坦克形态放中路 = 逆用", T.laneFit(T.heroInPos(ud, "mid", "tank"), "mid") < 0.8, T.laneFit(T.heroInPos(ud, "mid", "tank"), "mid"));
    // 元坦打野就是主场：坦克形态打野 1.00
    ok("坦克形态打野 = 主场 1.0", T.laneFit(T.heroInPos(ud, "jungle", "tank"), "jungle") === 1,
      T.laneFit(T.heroInPos(ud, "jungle", "tank"), "jungle"));
    ok("坦克形态打野显示「主场」", T.fitLabel(T.laneFit(T.heroInPos(ud, "jungle", "tank"), "jungle")) === "✓ 主场",
      T.fitLabel(T.laneFit(T.heroInPos(ud, "jungle", "tank"), "jungle")));
    ok("刺客形态可摇对抗路 0.88", Math.abs(T.laneFit(T.heroInPos(ud, "top", "assassin"), "top") - 0.88) < 1e-9,
      T.laneFit(T.heroInPos(ud, "top", "assassin"), "top"));
    ok("默认按分路取同名形态", T.heroInPos(ud, "jungle").formKey === "assassin" && T.heroInPos(ud, "jungle").arc === "assassin");
    ok("未知形态 key 回落到本路形态", T.heroInPos(ud, "top", "nope").formKey === "tank");

    // 阵容判定：坦克形态算前排（不论放哪一路），刺客形态不算
    const jt = T.evaluateComp({ top: "吕布", jungle: "元流之子", mid: "小乔", bot: "孙尚香", support: "张飞" }, "稳", { jungle: "tank" });
    const ja = T.evaluateComp({ top: "吕布", jungle: "元流之子", mid: "小乔", bot: "孙尚香", support: "张飞" }, "稳", { jungle: "assassin" });
    ok("元坦打野算前排", jt.tips.indexOf("前排充足，团战能扛") >= 0, jt.tips.join("/"));
    ok("刺客形态打野不算前排", ja.tips.indexOf("前排充足，团战能扛") < 0, ja.tips.join("/"));

    // 战力：同一个选手，用坦克形态 vs 法师形态，期望战力不同
    H.newGame(env, { difficulty: "职业" });
    const me = T.getMyTeam();
    const p = me.players.top.find(x => x.id === me.lineup.top) || me.players.top[0];
    const avg = (pos, key, n) => {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += T.posPower(p, ud, h("白起"), "稳", pos, null, key);
      return sum / n;
    };
    const aT = avg("top", "tank", 80), aM = avg("top", "mage", 80);
    ok("换形态会改变战力", Math.abs(aT - aM) > 0.5, `${aT.toFixed(1)} vs ${aM.toFixed(1)}`);

    // BP 流程：点英雄 → 选形态 → 点分路落位；pick 上带 form
    T.getS().transferWindow = false;
    T.startSeries(T.getS().schedule.find(x => !x.played).oppId, 5, "regular", null, "测形态");
    // 跳到「我方选将」这一步，待选卡片才会出现
    const dd0 = T.getS().series.draft;
    dd0.stepIndex = dd0.steps.findIndex(st => st.actor === dd0.mySide && st.type === "pick");
    T.renderSeries();
    ok("选将台能选到元流之子", root().indexOf("元流之子") >= 0);
    ok("标注为五形态", /元流之子[\s\S]{0,120}五形态/.test(root()));
    T.handleAct("pickhero:元流之子");
    const pend = root();
    ok("待选卡片给出五个形态按钮", ["mage", "tank", "marksman", "support", "assassin"].every(k => pend.indexOf(`data-act="pform:${k}"`) >= 0));
    T.handleAct("pform:tank");
    ok("选中坦克形态", /坦克形态/.test(root()) && root().indexOf("data-act=\"pform:tank\"") >= 0);
    const dd = T.getS().series.draft;
    dd.stepIndex = dd.steps.findIndex(st => st.actor === dd.mySide && st.type === "pick");
    T.handleAct("placeslot:jungle");
    const pick = T.getS().series.draft.picks[dd.mySide].find(x => x.hero === "元流之子");
    ok("落位后 pick 带形态", pick && pick.form === "tank" && pick.pos === "jungle", pick && (pick.pos + "/" + pick.form));
    T.renderSeries();
    ok("阵容区显示「元流之子·坦克形态」", /元流之子<i[^>]*>·坦克形态/.test(root()) || root().indexOf("·坦克形态") >= 0);

    // 用掉一个形态 = 整个英雄被消耗（其余四个也不可选）
    const dNow = T.getS().series.draft;
    ok("本队用过后元流之子从可选池消失",
      !T.availPickHeroes(dNow.mySide).some(x => x.name === "元流之子"));
    ok("使用记录按英雄名记（一形态消耗全部）", dNow.used.filter(n => n === "元流之子").length === 1);
    ok("英雄池里只有一份元流之子", T.HEROES.filter(x => x.name === "元流之子").length === 1);
    // ban 一次也是整只 ban 掉：把元流之子 ban 掉后，任何形态都不再出现在两个池子里
    ok("元流之子只有一个 ban 条目", T.availBanHeroes(true).filter(x => x.name === "元流之子").length <= 1);
    const bans = dNow.bans[dNow.mySide];
    if (!bans.includes("元流之子")) {
      dNow.used.push("元流之子"); bans.push("元流之子");
      ok("ban 掉后选将池不再有元流之子", !T.availPickHeroes(dNow.mySide).some(x => x.name === "元流之子"));
    } else { ok("ban 掉后选将池不再有元流之子", true); }
  });
};
