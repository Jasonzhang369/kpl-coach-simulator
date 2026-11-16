/* 存档：三槽 / 改名 / 导出结构 / 读档 */
module.exports = function (env, H) {
  const { T, root, localStorage } = env;
  const { ok, suite } = H;
  const S = () => T.getS();

  suite("存档", () => {
    H.newGame(env, { difficulty: "职业" });
    T.save();
    ok("写入槽 1", !!localStorage.getItem("kpl_coach_save_v9_s1"));
    const meta = T.slotMeta(1);
    ok("槽位元信息", meta && meta.team && meta.season >= 1, meta && meta.team);
    ok("元信息含名单模式", meta.rosterMode === "draft");
    ok("存档体积 < 2MB", localStorage.getItem("kpl_coach_save_v9_s1").length < 2 * 1024 * 1024);
    ok("存档不含 undo", localStorage.getItem("kpl_coach_save_v9_s1").indexOf('"undo":{') < 0);
  });

  suite("存档改名", () => {
    H.newGame(env, { difficulty: "职业" });
    ok("初始 saveName 为空", T.getS().saveName === "");
    ok("改名成功", T.renameSlot(1, "AG王朝") === true);
    ok("meta.name 更新", T.slotMeta(1).name === "AG王朝");
    ok("内存同步", T.getS().saveName === "AG王朝");
    ok("已落盘", JSON.parse(localStorage.getItem("kpl_coach_save_v9_s1")).saveName === "AG王朝");
    T.save();
    ok("再次保存保留名字", JSON.parse(localStorage.getItem("kpl_coach_save_v9_s1")).saveName === "AG王朝");
    T.setS({ page: "title" });
    T.render();
    ok("标题页显示自定义名", root().indexOf("AG王朝") >= 0);
    ok("标题页有改名按钮", root().indexOf("renameslot:1") >= 0);
    T.renameSlot(1, "   ");
    ok("清空名字", T.slotMeta(1).name === "");
    T.renameSlot(1, "一二三四五六七八九十一二三四五六七八九十一二三四五");
    ok("截断 24 字", T.slotMeta(1).name.length === 24, T.slotMeta(1).name.length);
    ok("空槽改名失败", T.renameSlot(2, "x") === false);
  });

  /* 回归：点「返回首页」后存档落盘 page="title"，再点「载入」会原地回到标题页，
     表现为「存档明明在第一格，但怎么点都进不去」。 */
  suite("存档·载入不再卡在标题页", () => {
    H.newGame(env, { difficulty: "职业" });
    T.getS().page = "title";
    T.save();
    ok("返回首页后落盘的 page 不是 title", JSON.parse(localStorage.getItem("kpl_coach_save_v9_s1")).page !== "title",
      JSON.parse(localStorage.getItem("kpl_coach_save_v9_s1")).page);
    ok("保存不污染内存里的 page", T.getS().page === "title");

    // 模拟旧版已经落盘了 title 的存档
    const o = JSON.parse(localStorage.getItem("kpl_coach_save_v9_s1"));
    o.page = "title";
    localStorage.setItem("kpl_coach_save_v9_s1", JSON.stringify(o));
    T.setS(null); T.render();
    ok("标题页能看到这个存档", root().indexOf("loadslot:1") >= 0);
    ok("载入返回 true", T.load(1) === true);
    ok("载入后 page 归一到 main", T.getS().page === "main", T.getS().page);
    ok("载入后不再是标题页", root().indexOf("KPL主教练") < 0);
    ok("载入后能正常渲染主界面", root().indexOf("topbar") >= 0);
  });

  /* 残局自愈：page=series 但 series / draft / battle 丢了，不能卡死，也不能崩 */
  suite("存档·残局自愈", () => {
    H.newGame(env, { difficulty: "职业" });
    const key = "kpl_coach_save_v9_s1";
    const base = JSON.parse(localStorage.getItem(key));

    localStorage.setItem(key, JSON.stringify(Object.assign({}, base, { page: "series", series: null })));
    T.setS(null);
    ok("series 页但残局丢失 → 回主界面", T.load(1) === true && T.getS().page === "main", T.getS() && T.getS().page);

    const oppId = base.teams.find(t => t.id !== base.myTeamId).id;
    const broken = Object.assign({}, base, {
      page: "series",
      series: { oppId, bestOf: 5, kind: "regular", label: "残局", myScore: 0, opScore: 0, gameIndex: 0, games: [], sub: "draft", draft: null, nextSide: "blue", firstSide: "blue" }
    });
    localStorage.setItem(key, JSON.stringify(broken));
    T.setS(null);
    const r = T.load(1);
    ok("缺 draft 的选秀残局不崩", r === true);
    ok("缺 draft 的残局被丢弃", T.getS().page === "main" && !T.getS().series);
    ok("丢弃后仍可继续开新赛程", root().indexOf("topbar") >= 0);

    const brokenBattle = Object.assign({}, base, {
      page: "series",
      series: { oppId, bestOf: 5, kind: "regular", label: "残局", myScore: 0, opScore: 0, gameIndex: 0, games: [], sub: "battle", battle: null }
    });
    localStorage.setItem(key, JSON.stringify(brokenBattle));
    T.setS(null);
    ok("缺 battle 的战斗残局也不崩", T.load(1) === true && !T.getS().series);
  });

  /* 坏档：不能显示成「空」（否则一点开始新赛季就被覆盖），要有明确提示且可导出原始数据 */
  suite("存档·坏档处理", () => {
    const key = "kpl_coach_save_v9_s2";
    localStorage.setItem(key, "{坏掉的半截JSON");
    ok("坏档识别为 broken", T.slotStatus(2) === "broken", T.slotStatus(2));
    ok("空槽识别为 empty", T.slotStatus(3) === "empty");
    ok("正常存档识别为 ok", T.slotStatus(1) === "ok");
    T.setS(null); T.render();
    ok("标题页标出数据异常", root().indexOf("数据异常") >= 0);
    ok("坏档槽位不提供载入按钮", root().indexOf("loadslot:2") < 0);
    ok("坏档槽位可导出原始数据", root().indexOf("exportslot:2") >= 0);
    ok("载入坏档返回 false", T.load(2) === false);
    ok("坏档不会被静默清掉", localStorage.getItem(key) === "{坏掉的半截JSON");

    // 版本比当前程序还新：要明确提示，而不是当成损坏
    const key3 = "kpl_coach_save_v9_s3";
    const o = JSON.parse(localStorage.getItem("kpl_coach_save_v9_s1"));
    o.version = 99;
    localStorage.setItem(key3, JSON.stringify(o));
    ok("过高版本识别为 ok（数据本身没坏）", T.slotStatus(3) === "ok");
    ok("过高版本载入失败并保住数据", T.load(3) === false && !!localStorage.getItem(key3));
    localStorage.removeItem(key); localStorage.removeItem(key3);
  });
};
