/* =====================================================================
   tests/suites/mobile.js — 移动端适配回归
   覆盖：顶栏 DOM 重构、触屏 BP 提示、底部页签条、积分榜滑动提示、CSS 断点
   ===================================================================== */
module.exports = function (env, H) {
  const { T, root, css, html: pageHtml } = env;
  const { ok, suite } = H;
  const S = () => T.getS();

  suite("移动端适配", () => {
    // 1) 顶栏 DOM 重构：三个包装容器
    H.newGame(env, { difficulty: "职业" });
    S().tab = "team"; T.renderMain();
    const html = root();
    ok("顶栏有 head 容器", html.indexOf('class="topbar-head"') >= 0);
    ok("顶栏有 stats 容器", html.indexOf('class="topbar-stats"') >= 0);
    ok("顶栏有 tools 容器", html.indexOf('class="topbar-tools"') >= 0);
    ok("页签仍在顶栏内", html.indexOf('class="nav"') >= 0);
    // 视觉顺序由 CSS order 控制：name(0) → stats(0) → spacer(4) → nav(5) → tools(10)
    ok("桌面端用 order 把工具按钮排到最后",
      /\.topbar-tools\{[^}]*order:10/.test(css));
    ok("桌面端页签 order=5（在 spacer 之后）",
      /\.nav\{order:5\}/.test(css));
    ok("head/stats 透明化以保持原布局",
      /\.topbar-head,\.topbar-stats\{display:contents\}/.test(css));
    ok("tools 内含 5 个图标按钮",
      (html.slice(html.indexOf('class="topbar-tools"'), html.indexOf('class="topbar-tools"') + 900).match(/data-act="/g) || []).length >= 5);

    // 2) 触屏检测：harness 无 matchMedia 时必须安全降级为 false
    ok("isTouchDevice 在无 matchMedia 环境返回 false", T.isTouchDevice() === false);
    let threw = null;
    try { T.isTouchDevice(); } catch (e) { threw = e.message; }
    ok("isTouchDevice 不抛错", threw === null, threw);

    // 3) BP 提示语：非触屏应显示「拖拽」
    S().transferWindow = false;
    T.startSeries(S().schedule[0].oppId, 5, "regular", null, "测");
    const d = S().series.draft;
    const pickStep = d.steps.findIndex(st => st.type === "pick" && st.actor === d.mySide);
    if (pickStep >= 0) d.stepIndex = pickStep;
    T.renderSeries();
    const bpHtml = root();
    ok("BP 看板有拖拽提示（桌面）", bpHtml.indexOf("拖拽英雄到分路") >= 0);
    ok("BP 空槽有放置提示", bpHtml.indexOf("拖拽英雄到此") >= 0);

    // 4) 积分榜有移动端滑动提示
    S().page = "main"; S().tab = "standings"; T.renderMain();
    ok("积分榜含左右滑动提示", root().indexOf("左右滑动查看完整榜单") >= 0);
    ok("滑动提示带 only-mobile 类", root().indexOf('class="only-mobile') >= 0);

    // 5) CSS 断点规则
    ok("存在 ≤760px 移动端断点", css.indexOf("@media (max-width:760px)") >= 0);
    ok("存在 ≤420px 小屏断点", css.indexOf("@media (max-width:420px)") >= 0);
    ok("移动端页签为固定底栏", /@media\s*\(max-width:760px\)[\s\S]*?\.nav\{[^}]*position:fixed/.test(css));
    ok("移动端页签 8 个一排", /@media\s*\(max-width:760px\)[\s\S]*?\.nav\{[^}]*grid-template-columns:repeat\(8/.test(css));
    ok("移动端战斗操作条抬高到页签之上", /@media\s*\(max-width:760px\)[\s\S]*?\.action-bar\{[^}]*bottom:calc\(52px/.test(css));
    ok("移动端预留了底部页签空间", /@media\s*\(max-width:760px\)[\s\S]*?#game-root\{[^}]*padding:8px 8px calc\(66px/.test(css));
    ok("桌面端页签仍是普通网格（未变）", !/\.nav\{[^}]*position:fixed[^}]*\}\s*$/m.test(css.split("@media (max-width:760px)")[0]));
    ok("only-mobile 默认隐藏", /\.only-mobile\{display:none !important\}/.test(css));
    ok("viewport 允许缩放（去掉 user-scalable=no）", pageHtml.indexOf("user-scalable=no") < 0);
    ok("viewport 含 viewport-fit=cover（刘海屏安全区）", pageHtml.indexOf("viewport-fit=cover") >= 0);

    // 6) 网格列已改为 class（便于响应式覆盖）
    ok("选手卡网格用 cards-grid 类", root().indexOf("cards-grid") >= 0 || css.indexOf(".cards-grid") >= 0);
    ok("style.css 定义了 cards-grid", css.indexOf(".cards-grid{") >= 0);
  });
};
