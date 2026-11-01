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
};
