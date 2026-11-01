/* =====================================================================
   render.js — 渲染层：页面 / 卡片 / BP 看板 / 战报 / 弹窗
   由 game.js 拆分而来（v10）。所有文件按 index.html 中的顺序加载。
   ===================================================================== */

/* ---------------- 渲染 ---------------- */
const root = document.getElementById("game-root");
function toast(msg) { const el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2200); }
/* 滚动/焦点锚定：整页重渲染时保住滚动位置与输入焦点，避免按钮乱跳 */
function captureView() {
  const sc = { y: window.scrollY || window.pageYOffset || 0, inner: [], focus: null, sel: null };
  document.querySelectorAll("[data-scroll-id]").forEach(el => sc.inner.push([el.getAttribute("data-scroll-id"), el.scrollTop]));
  const ae = document.activeElement;
  if (ae && ae.id && /^(bench|ban)-filter$/.test(ae.id)) {
    sc.focus = ae.id;
    try { sc.sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) {}
  }
  return sc;
}
function restoreView(sc) {
  if (!sc) return;
  if (sc.inner.length) sc.inner.forEach(([id, top]) => { const el = document.querySelector(`[data-scroll-id="${id}"]`); if (el) el.scrollTop = top; });
  if (sc.y) { try { window.scrollTo(0, sc.y); } catch (e) {} }
  if (sc.focus) {
    const el = document.getElementById(sc.focus);
    if (el) {
      el.focus({ preventScroll: true });
      if (sc.sel) { try { el.setSelectionRange(sc.sel[0], sc.sel[1]); } catch (e) {} }
    }
  }
}
function render() {
  const sc = captureView();
  if (!S) { renderTitle(); }
  else if (S.gameOver) { root.innerHTML = renderGameOver(); }
  else if (S.page === "title") { renderTitle(); }
  else if (S.page === "series") { renderSeries(); }
  else if (S.page === "event") { renderEvent(); }
  else { renderMain(); }
  renderUndoBar();
  restoreView(sc);
}
/* ---------------- 撤销（单步快照） ---------------- */
function snapshot(label) {
  if (!S || S.page === "series" || S.gameOver) return;
  try {
    S.undo = { label, at: Date.now(), data: JSON.stringify(S, (k, v) => (k && k.charAt(0) === "_" ? undefined : v)) };
  } catch (e) { S.undo = null; }
  // 12 秒后自动收起撤销条（避免长期占位）
  if (S._undoTimer) { try { clearTimeout(S._undoTimer); } catch (e) {} }
  S._undoTimer = setTimeout(() => {
    if (S && S.undo && Date.now() - S.undo.at > 11000) { S.undo = null; render(); }
  }, 12000);
}
function undoLast() {
  if (!S || !S.undo) { toast("没有可撤销的操作"); return; }
  const keepSlot = S.slot, label = S.undo.label;
  try {
    const d = JSON.parse(S.undo.data);
    d.slot = keepSlot; d.undo = null;
    S = d;
    render();
    toast(`已撤销：${label}`);
  } catch (e) { toast("撤销失败"); }
}
function clearUndo() { if (S) S.undo = null; render(); }
function renderUndoBar() {
  let el = document.getElementById("undo-bar");
  if (!S || !S.undo || S.page === "series" || S.gameOver) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "undo-bar"; el.className = "undo-bar";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = b.getAttribute("data-act");
      if (a === "undo") undoLast();
      else if (a === "undoclear") clearUndo();
    });
  }
  el.innerHTML = `<span>已执行：<b>${escapeHtml(S.undo.label || "上一步")}</b></span>
    <button class="btn sm ghost" data-act="undo" aria-label="撤销 ${escapeHtml(S.undo.label || "上一步")}">↩ 撤销</button>
    <button class="btn sm ghost" data-act="undoclear" aria-label="关闭撤销提示">×</button>`;
}
/* ---------------- 文本输入弹窗（改名用，Promise） ---------------- */
function nameDialog(opt) {
  return new Promise(resolve => {
    const o = opt || {};
    const mask = document.createElement("div");
    mask.className = "modal-mask"; mask.id = "name-mask";
    mask.setAttribute("role", "dialog"); mask.setAttribute("aria-modal", "true");
    mask.innerHTML = `<div class="modal">
      <h3>${escapeHtml(o.title || "重命名")}</h3>
      ${o.tip ? `<div class="muted mb" style="font-size:12.5px;line-height:1.6">${o.tip}</div>` : ""}
      <input id="name-input" maxlength="24" value="${escapeHtml(o.value || "")}" placeholder="${escapeHtml(o.placeholder || "")}" aria-label="存档名称" autocomplete="off"
        style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--txt);padding:10px 12px;border-radius:9px;font-size:14px" />
      <div class="muted" style="font-size:11.5px;margin-top:6px">最多 24 个字符 · 留空则恢复显示战队名</div>
      <div class="opts mt">
        <button class="btn gold" data-x="ok">保存名称</button>
        <button class="btn ghost" data-x="cancel">取消</button>
      </div></div>`;
    document.body.appendChild(mask);
    const inp = () => document.getElementById("name-input");
    const done = v => { mask.remove(); resolve(v); };
    mask._cancel = () => done(null);
    mask.addEventListener("click", e => {
      if (e.target === mask) return done(null);
      const b = e.target.closest("[data-x]"); if (!b) return;
      done(b.getAttribute("data-x") === "ok" ? (inp() ? inp().value.trim() : "") : null);
    });
    mask.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); done(inp() ? inp().value.trim() : ""); }
    });
    const i = inp();
    if (i) { i.focus(); if (i.select) i.select(); }
  });
}
/* ---------------- 二次确认弹窗（Promise） ---------------- */
function confirmDialog(opt) {
  return new Promise(resolve => {
    const o = opt || {};
    const mask = document.createElement("div");
    mask.className = "modal-mask"; mask.id = "confirm-mask";
    mask.setAttribute("role", "dialog"); mask.setAttribute("aria-modal", "true");
    mask.innerHTML = `<div class="modal">
      <h3>${escapeHtml(o.title || "确认操作")}</h3>
      <div class="modal-body" style="color:var(--txt2);font-size:13.5px;line-height:1.7;margin-bottom:14px">${o.body || ""}</div>
      <div class="opts">
        <button class="btn ${o.danger ? '' : 'gold'}" data-x="ok">${escapeHtml(o.okText || "确认")}</button>
        <button class="btn ghost" data-x="cancel">${escapeHtml(o.cancelText || "取消")}</button>
      </div></div>`;
    document.body.appendChild(mask);
    const done = v => { mask.remove(); resolve(v); };
    mask._cancel = () => done(false);
    mask.addEventListener("click", e => {
      if (e.target === mask) return done(false);
      const b = e.target.closest("[data-x]"); if (!b) return;
      done(b.getAttribute("data-x") === "ok");
    });
    const ok = mask.querySelector('[data-x="ok"]');
    if (ok) ok.focus();
  });
}
function renderTitle() {
  const slots = [];
  for (let i = 1; i <= SLOT_COUNT; i++) {
    const m = slotMeta(i);
    if (!m) {
      slots.push(`<div class="slot empty" aria-label="存档位 ${i}，当前为空">
        <div class="slot-h"><b>存档 ${i}</b><span class="muted">空</span></div>
        <div class="slot-body muted">还没有存档</div>
        <div class="hero-opt"><button class="btn gold sm" data-act="newgame:${i}" aria-label="在存档位 ${i} 开始新赛季">开始新赛季</button></div>
      </div>`);
    } else {
      const d = m.savedAt ? new Date(m.savedAt) : null;
      const label = m.name || m.team;
      const sub = m.name ? `${escapeHtml(m.team)} · S${m.season} 第 ${m.round} 轮` : `S${m.season} 第 ${m.round} 轮`;
      slots.push(`<div class="slot" aria-label="存档 ${i}：${escapeHtml(label)}，${escapeHtml(m.team)}，第 ${m.season} 赛季第 ${m.round} 轮，${m.wins}胜${m.losses}负">
        <div class="slot-h"><b>存档 ${i}</b><span class="muted">${d ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : ""}</span></div>
        <div class="slot-body"><b style="color:var(--gold)">${escapeHtml(label)}</b> <span class="muted">· ${sub}</span></div>
        <div class="muted" style="font-size:12px">${m.difficulty}难度 · ${m.rosterMode === "real" ? "真实名单" : "平衡选秀"} · ${m.wins}胜${m.losses}负 · 声望 ${m.prestige}</div>
        <div class="hero-opt">
          <button class="btn gold sm" data-act="loadslot:${i}" aria-label="载入存档 ${i}">载入</button>
          <button class="btn ghost sm" data-act="renameslot:${i}" aria-label="重命名存档 ${i}">改名</button>
          <button class="btn ghost sm" data-act="exportslot:${i}" aria-label="导出存档 ${i} 为文件">导出</button>
          <button class="btn ghost sm" data-act="delslot:${i}" aria-label="删除存档 ${i}">删除</button>
          <button class="btn ghost sm" data-act="newgame:${i}" aria-label="覆盖存档 ${i} 并开始新赛季">重开</button>
        </div>
      </div>`);
    }
  }
  root.innerHTML = `
  <div class="title-screen">
    <div><div class="logo">KPL主教练</div><div class="sub">王 者 之 路</div></div>
    <div class="tip">你是一名 KPL 战队主教练。选人、训练、转会，按官方规则 BP（全局BP、红蓝方、ban位、克制），带领战队从常规赛杀进双败淘汰赛，捧起冠军奖杯，打造多赛季王朝。<br><b style="color:var(--gold)">选手均为真实 KPL 选手 ID，评级/总评按其历史战绩评估（非官方数据）。</b><br>难度（<b>新秀 / 职业 / 传奇</b>）与技术名单（<b>平衡选秀 / 真实大名单</b>）是<b>两个独立维度</b>，可自由搭配。</div>
    <div class="slot-list" role="list">${slots.join("")}</div>
    <div class="row" style="justify-content:center">
      <button class="btn ghost" data-act="importsave" aria-label="从文件导入存档">导入存档文件</button>
      <button class="btn ghost" data-act="showhelp" aria-label="查看快捷键与帮助">快捷键 / 帮助</button>
    </div>
    <input type="file" id="import-file" accept="application/json,.json" class="hidden" aria-hidden="true" />
    <div class="tip" style="opacity:.6">进度自动保存在所选存档位（本地浏览器）。可导出 .json 备份，或导入到任意槽位。</div>
  </div>`;
  const fi = document.getElementById("import-file");
  if (fi) fi.addEventListener("change", () => {
    const f = fi.files && fi.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importSaveText(String(rd.result || ""), null);
    rd.onerror = () => toast("读取文件失败");
    rd.readAsText(f);
  });
}
function prestigeColor(p) { return p >= 80 ? "#ff3b30" : p >= 60 ? "#f5c518" : p >= 40 ? "#34d3e0" : "#9aa6c4"; }
function renderTopbar() {
  const t = getMyTeam();
  const phaseName = S.phase === "regular" ? "常规赛" : S.phase === "playoff" ? "季后赛" : "赛季结束";
  const tabs = [["team", "战队"], ["train", "训练"], ["lineup", "阵容"], ["schedule", "赛程"], ["standings", "积分榜"], ["market", "转会"], ["prestige", "声望"], ["format", "赛制"]];
  const nav = tabs.map(([k, n], i) => `<button class="${S.tab === k ? 'active' : ''}" data-act="tab:${k}" aria-label="${n}（快捷键 ${i + 1}）" aria-current="${S.tab === k ? "page" : "false"}">${n}${k === "market" && S.transferWindow ? '<span class="dot-open" aria-label="转会窗口开放"></span>' : ""}</button>`).join("");
  return `
  <div class="topbar" role="banner">
    <div class="team-name">${escapeHtml(t.name)}</div>
    <div class="stat">S${S.season}·第${seasonYear(S.season)}年·${phaseName}<b>第 ${S.round} 轮</b></div>
    <div class="stat">资金<b>¥${t.money}万</b></div>
    <div class="stat">粉丝<b>${t.fans.toLocaleString()}</b></div>
    <div class="stat">声望<b style="color:${prestigeColor(t.prestige)}">${prestigeTier(t.prestige)} ${Math.round(t.prestige)}</b>${t.prestige <= 10 ? '<b style="color:var(--red2);margin-left:4px">⚠</b>' : ''}</div>
    <div class="stat">训练点<b>${S.trainPoints}</b></div>
    <div class="stat">战绩<b>${t.wins}胜${t.losses}负</b></div>
    <div class="spacer"></div>
    <div class="nav" role="navigation" aria-label="主菜单">${nav}</div>
    <button class="btn ghost sm" data-act="renamecurrent" aria-label="重命名当前存档（存档 ${S.slot || 1}）" title="重命名当前存档（${escapeHtml(S.saveName || t.name)}）">💾</button>
    <button class="btn ghost sm" data-act="showhelp" aria-label="快捷键与帮助（问号键）" title="快捷键 / 帮助（?）">?</button>
  </div>`;
}
function ratingColor(r) { return { S: "#ff3b30", A: "#f5c518", B: "#34d3e0", C: "#9aa6c4" }[r] || "#9aa6c4"; }
function playerCard(p, isStarter) {
  const [cls, label] = statusLabel(p);
  const attrs = [["操作", p.op], ["意识", p.aw], ["配合", p.co], ["心态", p.me], ["体能", p.st]]
    .map(([n, v]) => {
      const lowSt = n === "体能" && v <= 60;
      return `<div class="a" role="group" aria-label="${n} ${Math.round(v)}">
        <span class="name" aria-hidden="true">${n}</span>
        <span class="bar ${lowSt ? "st-low" : ""}" aria-hidden="true"><i style="width:${v}%"></i></span>
        <span aria-hidden="true">${Math.round(v)}</span></div>`;
    }).join("");
  let note = "";
  if (p.status === "inj") note = `<div class="muted" style="margin-top:6px;color:#e08cff">🚑 伤停 ${p.statusRounds} 轮</div>`;
  else if (p.status === "hot") note = `<div class="muted" style="margin-top:6px;color:var(--red2)">🔥 火热 ${p.statusRounds} 轮</div>`;
  else if (p.status === "low") note = `<div class="muted" style="margin-top:6px">😞 低迷 ${p.statusRounds} 轮</div>`;
  const rc = ratingColor(p.rating);
  const stWarn = staminaTagHtml(p);
  const age = p.age || 0;
  const ageTxt = `${p.age || "?"}岁${age >= AGE_DECLINE_FROM ? `<span class="age-down" title="${age >= 30 ? "30 岁以上：每赛季整体 -2" : "27 岁以上：每赛季整体 -1"}">↘</span>` : ""}`;
  const a11y = `${p.name}，${POS_NAME[p.pos]}，评级${p.rating}，总评${p.ovr}，${p.age || "?"}岁${age >= AGE_DECLINE_FROM ? "，已过巅峰期" : ""}，合同剩余${p.contract != null ? p.contract : "?"}个赛季，操作${Math.round(p.op)}，意识${Math.round(p.aw)}，配合${Math.round(p.co)}，心态${Math.round(p.me)}，体能${Math.round(p.st)}，状态${label}`;
  return `
  <div class="player-card" role="group" aria-label="${escapeHtml(a11y)}">
    <span class="pos ${p.pos}">${POS_NAME[p.pos]}</span>
    <h4>${escapeHtml(p.name)} ${isStarter ? '<span class="pill gold" style="font-size:10px">首发</span>' : ''} <span class="pill" style="font-size:10px;color:${rc};border-color:${rc}">${p.rating}</span></h4>
    <div class="lv">Lv.${p.level} · 总评 ${p.ovr} · 上限${p.ceil} · ${ageTxt} · 合同${p.contract != null ? p.contract + "赛季" : "?"}</div>
    <div class="attr">${attrs}</div>
    <span class="status-tag ${cls}">${label}</span>${stWarn}${note}
  </div>`;
}
function renderMain() {
  let body = "";
  if (S.tab === "team") body = renderTeam();
  else if (S.tab === "train") body = renderTrain();
  else if (S.tab === "lineup") body = renderLineup();
  else if (S.tab === "schedule") body = renderSchedule();
  else if (S.tab === "standings") body = renderStandings();
  else if (S.tab === "market") body = renderMarket();
  else if (S.tab === "prestige") body = renderPrestige();
  else if (S.tab === "format") body = renderFormat();
  root.innerHTML = renderTopbar() + `<div class="card">${body}</div>`;
  if (S.event) showEventModal();
  showTransferNotices();
}
function renderTeam() {
  const t = getMyTeam();
  const starters = POS.map(p => getPlayer(t, t.lineup[p]));
  const benches = POS.map(p => t.players[p].filter(pl => pl.id !== t.lineup[p])).flat();
  const left = (S.maxFanMeets || 2) - (S.fanMeets || 0);
  const meetMoney = fanMeetingIncome();
  const meetBlock = `<div class="section-title" style="margin-top:18px">粉丝运营</div>
    <div class="warn" style="border-color:rgba(52,211,224,.35);background:rgba(52,211,224,.07)">
      <b>粉丝见面会</b>：每赛季限 ${S.maxFanMeets || 2} 次（剩余 <b>${left}</b> 次）· 本次预计收入 <b style="color:var(--gold)">¥${meetMoney}万</b>（与粉丝数 ${t.fans.toLocaleString()}、声望挂钩）
      <button class="btn ${left > 0 ? 'gold' : 'ghost'} sm" style="margin-left:8px" data-act="fanmeet" ${left > 0 ? '' : 'disabled'} aria-label="举办粉丝见面会，预计收入 ${meetMoney} 万">举办见面会</button>
    </div>
    ${t.prestige <= 10 ? `<div class="warn" style="border-color:rgba(255,59,48,.5);background:rgba(255,59,48,.1);color:var(--red2)">⚠ 声望仅剩 ${Math.round(t.prestige)}，<b>降为 0 将直接判定赛季失败（游戏结束）</b>！</div>` : ''}`;
  // 合同临期：赛季末会自动续约（身价 50%），资金不足则离队
  const expiring = POS.flatMap(pos => t.players[pos].filter(p => (p.contract == null ? 3 : p.contract) <= 1).map(p => ({ pos, p })));
  const contractBlock = expiring.length ? `<div class="section-title" style="margin-top:18px">合同临期（本赛季末处理）</div>
    <div class="warn" style="border-color:rgba(245,197,24,.4);background:rgba(245,197,24,.07);color:var(--gold)">以下选手合同仅剩 1 个赛季：赛季结束时自动续约（费用 ★ 身价 50%），资金不足会<b>直接离队</b>。也可以现在手动续约锁定。</div>
    ${expiring.map(({ pos, p }) => {
      const cost = renewCost(p);
      const can = t.money >= cost;
      return `<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--line)">
        <div><span class="pos ${pos}" style="position:static;margin-right:6px">${POS_NAME[pos]}</span><b>${escapeHtml(p.name)}</b> <span class="muted">总评 ${p.ovr} · ${p.age}岁${(p.age || 0) >= AGE_DECLINE_FROM ? '<b class="c-bad">↘</b>' : ""} · 合同 ${p.contract == null ? 1 : p.contract} 赛季</span>${staminaTagHtml(p)}</div>
        <button class="btn ${can ? "gold" : "ghost"} sm" data-act="renew:${p.id}" ${can ? "" : "disabled"} aria-label="续约 ${escapeHtml(p.name)}，费用 ${cost} 万">续约 ¥${cost}万</button>
      </div>`;
    }).join("")}` : "";
  const lowSt = POS.map(p => getPlayer(t, t.lineup[p])).filter(p => p && p.st <= 60);
  return `
  ${kpiBlockHtml()}
  <div class="section-title">首发阵容 · 声望 ${prestigeTier(t.prestige)}</div>
  ${lowSt.length ? `<div class="warn mb">⚠ 首发体能偏低：${lowSt.map(p => `${escapeHtml(p.name)}（${Math.round(p.st)}）`).join("、")} — 可到【阵容】用「一键轮换建议」调整，或在【训练】全队休息（-2 训练点 +${restGain()} 体能）。</div>` : ""}
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${starters.map(p => playerCard(p, true)).join("")}</div>
  <div class="section-title" style="margin-top:18px">替补 / 轮换</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${benches.map(p => playerCard(p, false)).join("") || '<div class="muted">暂无替补（可从青训/转会补充）</div>'}</div>
  ${contractBlock}
  ${staffBlockHtml()}
  ${meetBlock}`;
}
/* 董事会赛季目标（KPI） */
function kpiBlockHtml() {
  const k = S && S.kpi;
  if (!k) return "";
  const res = (S.kpiResult && S.kpiResult.season === S.season) ? S.kpiResult : null;
  const badge = res
    ? (res.ok ? '<span class="pill green">已达成</span>' : '<span class="pill red">未达成</span>')
    : '<span class="pill gold">进行中</span>';
  return `<div class="kpi-card">
    <div class="flex-between"><div class="kpi-title">📋 董事会目标 · S${S.season}</div>${badge}</div>
    <div class="kpi-row"><b>${escapeHtml(k.main.title)}</b><span class="muted">${escapeHtml(k.main.desc)}</span></div>
    <div class="muted" style="font-size:12.5px">达成 <b class="c-good">+¥${k.reward.money}万 · 声望 +${k.reward.prestige}</b> ／ 未达成 <b class="c-bad">-¥${k.penalty.money}万 · 声望 -${k.penalty.prestige}</b></div>
    <div class="kpi-row" style="margin-top:6px"><b>🌱 ${escapeHtml(k.youth.title)}</b><span class="muted">${escapeHtml(k.youth.desc)} · 达成 +¥${k.youth.reward.money}万</span></div>
    ${res ? `<div class="muted" style="font-size:12px;margin-top:8px;line-height:1.7">${res.notes.map(escapeHtml).join("<br>")}</div>` : ""}
  </div>`;
}
/* 教练组（职员）：一次性聘用费 + 每赛季工资 */
function staffBlockHtml() {
  const t = getMyTeam();
  const wage = staffWage();
  return `<div class="section-title" style="margin-top:18px">教练组</div>
  <div class="muted mb" style="font-size:12.5px">一次性聘用费 + <b>每赛季工资</b>（赛季末从资金里扣，付不起会有人离职）。当前工资合计 <b style="color:var(--gold)">¥${wage}万/赛季</b>。</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">
    ${STAFF_DEFS.map(d => {
      const lv = staffLevel(d.key);
      const max = lv >= d.max;
      const cost = max ? 0 : d.cost[lv];
      const can = !max && t.money >= cost;
      return `<div class="player-card">
        <h4>${d.icon} ${d.name} <span class="pill ${lv ? "gold" : ""}" style="font-size:10px">Lv.${lv}/${d.max}</span></h4>
        <div class="muted" style="font-size:12px;min-height:34px">${lv ? d.effect(lv) : "未聘用：没有任何加成"}</div>
        <div class="muted" style="font-size:11px;margin-top:2px">${max ? "已满级" : `下一级：${d.effect(lv + 1)}`}</div>
        <div class="flex-between mt">
          <span class="muted" style="font-size:11.5px">${max ? `工资 ¥${d.wage[lv - 1]}万/季` : `¥${cost}万 · 工资 ¥${d.wage[lv]}万/季`}</span>
          <button class="btn ${can ? "gold" : "ghost"} sm" data-act="hirestaff:${d.key}" ${can ? "" : "disabled"} aria-label="${lv ? "升级" : "聘用"}${d.name}">${max ? "已满级" : lv ? "升级" : "聘用"}</button>
        </div>
      </div>`;
    }).join("")}
  </div>`;
}
// 粉丝见面会收益：与粉丝数、声望挂钩
function fanMeetingIncome() {
  const t = getMyTeam();
  return Math.round((t.fans / 1600) * (1 + t.prestige / 150));
}
function holdFanMeeting() {
  const t = getMyTeam();
  if ((S.fanMeets || 0) >= (S.maxFanMeets || 2)) { toast(`本赛季粉丝见面会已用完（${S.maxFanMeets} 次）`); return; }
  const money = Math.round(fanMeetingIncome() * (0.9 + rand() * 0.25));
  const fansGain = Math.round(t.fans * 0.03 + randInt(300, 1500));
  S.fanMeets = (S.fanMeets || 0) + 1;
  t.money += money;
  t.fans += fansGain;
  addPrestige(1, "粉丝见面会");
  S.log.unshift(`S${S.season} 粉丝见面会：+¥${money}万，粉丝 +${fansGain.toLocaleString()}`);
  toast(`🎉 见面会成功！+¥${money}万 · 粉丝 +${fansGain.toLocaleString()}`);
  save(); render();
}
function renderTrain() {
  const t = getMyTeam();
  if (S.trainPoints <= 0 && !POS.flatMap(p => t.players[p]).some(p => isCapped(p))) {
    return `<div class="section-title">训练中心</div><div class="warn">本轮训练点已用完（剩余 ${S.trainPoints}）。每轮比赛后恢复训练点。训练/休息都消耗训练点，请合理分配。</div>
    <div class="muted mt">每次特训还要花资金（按总评定价）；属性练满后可用「突破上限」继续提升（大量训练点 + 资金）。</div>`;
  }
  const all = POS.flatMap(p => t.players[p]);
  const options = all.map(p => {
    const cost = trainCost(p);
    const capped = isCapped(p);
    const bCost = breakCost(p);
    const ageOk = (p.age || 22) < AGE_DECLINE_FROM;
    const breakBtn = !ageOk
      ? `<div class="muted" style="font-size:11px;margin-top:6px;color:var(--red2)">${p.age} 岁已过巅峰，无法突破上限（上限会逐季下滑）</div>`
      : capped
        ? `<button class="btn ${S.trainPoints >= BREAK_PTS && t.money >= bCost ? 'gold' : 'ghost'} sm mt" data-act="trainbreak:${p.id}" aria-label="为 ${escapeHtml(p.name)} 突破成长上限，消耗 ${BREAK_PTS} 训练点与 ${bCost} 万" ${S.trainPoints >= BREAK_PTS && t.money >= bCost ? '' : 'disabled'}>突破上限 ¥${bCost}万 · ${BREAK_PTS}点</button>`
        : `<div class="muted" style="font-size:11px;margin-top:6px">练满后可突破上限</div>`;
    return `
    <div class="player-card">
      <span class="pos ${p.pos}">${POS_NAME[p.pos]}</span>
      <h4>${escapeHtml(p.name)} <span class="pill" style="font-size:10px;color:${ratingColor(p.rating)};border-color:${ratingColor(p.rating)}">${p.rating}</span></h4>
      <div class="lv">Lv.${p.level} · 上限 ${p.ceil} · ${p.age || "?"}岁${ageOk ? "" : '<span class="age-down">↘</span>'} · 特训 ¥${cost}万/次</div>
      <div class="hero-opt">
        <button data-act="train:op:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的操作，消耗 1 训练点与 ${cost} 万">操作</button><button data-act="train:aw:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的意识，消耗 1 训练点与 ${cost} 万">意识</button>
        <button data-act="train:co:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的配合，消耗 1 训练点与 ${cost} 万">配合</button><button data-act="train:me:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的心态，消耗 1 训练点与 ${cost} 万">心态</button>
        <button data-act="train:st:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的体能，消耗 1 训练点与 ${cost} 万">体能</button>
      </div>
      <div class="flex-between" style="margin-top:8px;gap:6px">
        <button class="btn ghost sm" data-act="herotrain:${p.id}" aria-label="训练 ${escapeHtml(p.name)} 的英雄熟练度">🎯 英雄熟练</button>
        <span class="muted" style="font-size:11px">绝活 ${masteryOf(p, (p.heroPool || [])[0] || "")} · ${(p.heroPool || []).length} 个池子</span>
      </div>
      ${breakBtn}
    </div>`;
  }).join("");
  return `
  <div class="section-title">训练中心（剩余训练点 ${S.trainPoints} · 资金 ¥${t.money}万）</div>
  <div class="muted mb">特训每次消耗 <b>1 训练点 + ¥（按选手总评 5~11 万）</b>，单项 +1~2（不超过上限）。<b>🎯 英雄熟练</b>：练某个英雄的熟练度（直接乘进战力，绝活 ≈×1.11），也可花 2 点学新英雄应对全局BP。<button class="btn ghost sm" data-act="rest" aria-label="全队休息，消耗 2 训练点，恢复体能 ${restGain()}">全队休息（-2 训练点）</button> 恢复体能心态。练满后可花 <b>${BREAK_PTS} 训练点 + 大量资金</b>「突破上限」。</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${options}</div>`;
}
function renderLineup() {
  const t = getMyTeam();
  const avg = Math.round(POS.reduce((a, pos) => { const p = getPlayer(t, t.lineup[pos]); return a + (p ? p.st : 0); }, 0) / 5);
  const rows = POS.map(pos => {
    const opts = t.players[pos].map(p => {
      const stCls = p.st <= 45 ? "c-bad" : p.st <= 60 ? "c-mid" : "muted";
      const con = p.contract != null && p.contract <= 1 ? ' <span class="pill red" style="font-size:9px;padding:1px 5px">合同末</span>' : "";
      return `<button class="btn ${t.lineup[pos] === p.id ? 'gold' : 'ghost'} sm" data-act="setlineup:${pos}:${p.id}" aria-label="将 ${escapeHtml(p.name)} 设为${POS_NAME[pos]}首发，总评${p.ovr}，体能${Math.round(p.st)}${p.contract != null ? "，合同剩余" + p.contract + "个赛季" : ""}">${escapeHtml(p.name)}${p.status === 'inj' ? '🚑(' + p.statusRounds + ')' : ''} <span class="${stCls}" style="font-size:10px">体${Math.round(p.st)}</span>${con}</button>`;
    }).join(" ");
    const cur = getPlayer(t, t.lineup[pos]);
    const curWarn = cur && cur.st <= 55 ? ` <b class="c-bad" style="font-size:11px">⚠ 体能告急</b>` : "";
    return `<div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--line)">
      <div><b style="color:var(--gold)">${POS_NAME[pos]}</b> &nbsp; <span class="muted">现任：${escapeHtml(cur.name)}</span>${curWarn}</div>
      <div class="hero-opt">${opts}</div></div>`;
  }).join("");
  const sug = rotationSuggest(t);
  return `<div class="section-title">排兵布阵</div>
  <div class="muted mb">点击切换首发。伤病选手（🚑）无法首发。系列赛局间也可在换人界面调整。当前首发平均体能 <b class="${avg <= 55 ? "c-bad" : ""}">${avg}</b>（每局 -${staminaCostPerGame()}，每轮自然 +${ROUND_STAMINA_GAIN}；全队休息 +${restGain()} / 2 训练点，<b>仅在大场之间可休息</b>，系列赛局间不行）。</div>
  <div class="hero-opt mb">
    <button class="btn ${sug.length ? "gold" : "ghost"} sm" data-act="rotate" aria-label="一键轮换建议">🔄 一键轮换建议${sug.length ? `（${sug.length} 处）` : ""}</button>
    ${sug.length ? `<span class="muted" style="font-size:12px;align-self:center">${sug.map(x => `${POS_NAME[x.pos]} ${escapeHtml(x.from.name)}→${escapeHtml(x.to.name)}`).join(" · ")}</span>` : '<span class="muted" style="font-size:12px;align-self:center">当前阵容无需轮换</span>'}
  </div>
  ${rows}`;
}
function renderSchedule() {
  const t = getMyTeam();
  if (S.phase === "regular") {
    const sc = S.schedule.find(s => !s.played);
    if (!sc) return `<div class="section-title">赛程</div><div class="muted">常规赛已全部结束，正在结算季后赛资格……</div>`;
    const opp = S.teams.find(x => x.id === sc.oppId);
    const diffTxt = teamPower(t) > teamPower(opp) ? "我方略占上风" : teamPower(t) < teamPower(opp) ? "对手稍强" : "五五开";
    return `<div class="section-title">本周对阵（第 ${sc.round} / ${S.maxRegular} 轮）· BO5</div>
    <div class="matchup card" style="padding:18px">
      <div class="center"><div style="font-weight:800;color:var(--gold)">${escapeHtml(t.name)}</div><div class="muted">战力 ${teamPower(t).toFixed(1)}</div></div>
      <div class="vs">VS</div>
      <div class="center"><div style="font-weight:800">${escapeHtml(opp.name)}</div><div class="muted">战力 ${teamPower(opp).toFixed(1)}</div><div class="muted" style="font-size:11px">风格：${personaOf(opp).name}</div></div>
    </div>
    <div class="muted mt">赛前评估：${diffTxt}。每局都会 BP（全局BP）。可在【阵容】调整首发、【训练】补强、【转会】引援后开打。</div>
    ${S.transferWindow ? `<div class="warn" style="border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)">🟢 赛季初<b>转会窗口开放中</b>（剩余 ${S.maxTransfers - S.transfersUsed} 次）— 点【转会】买卖选手，<b>打本场后关闭</b>。</div>` : ''}
    <button class="btn mt" data-act="startmatch">进入系列赛</button>
    <div class="section-title mt">第 ${sc.round} 轮 · 联盟对战（点开看比分与阵容）</div>
    <div class="fx-list">${roundFixturesHtml(sc.round) || '<div class="muted">暂无</div>'}</div>
    <div class="section-title mt">本赛季对战记录（按轮，可折叠）</div>
    ${seasonFixturesHtml() || '<div class="muted">还没有打完的比赛</div>'}
    ${renderHistory()}`;
  }
  if (S.phase === "playoff") {
    const next = S.pendingPlayoff || playoffMyNext();
    let oppBlock = "";
    if (next && next.oppId) {
      const opp = S.teams.find(x => x.id === next.oppId);
      oppBlock = `<div class="matchup card" style="padding:18px">
        <div class="center"><div style="font-weight:800;color:var(--gold)">${escapeHtml(t.name)}</div><div class="muted">战力 ${teamPower(t).toFixed(1)}</div></div>
        <div class="vs">VS</div>
        <div class="center"><div style="font-weight:800">${escapeHtml(opp.name)}</div><div class="muted">战力 ${teamPower(opp).toFixed(1)}</div><div class="muted" style="font-size:11px">风格：${personaOf(opp).name}</div></div>
      </div>
      <div class="muted mt">下一场：<b style="color:var(--gold)">${next.label}</b> · BO7（每局BP，全局BP；<b>3:3 进入巅峰对决</b>）</div>
      <button class="btn gold mt" data-act="startmatch">进入系列赛</button>`;
    }
    return `<div class="section-title">季后赛 · 双败淘汰</div>${oppBlock}${renderBracket()}
    <div class="section-title mt">常规赛对战记录（按轮，可折叠）</div>${seasonFixturesHtml() || '<div class="muted">暂无</div>'}
    ${renderHistory()}`;
  }
  const r = S.seasonResult || {};
  const title = S.champion ? "🏆 冠军" : r.final ? "亚军" : r.playoff ? "四强" : `第 ${r.rank || "?"} 名`;
  const myMatches = [];
  (S.fixtures || []).forEach((fx, i) => fx.forEach(f => {
    const mine = f.a === S.myTeamId || f.b === S.myTeamId;
    if (!mine || !f.played || f.sa == null) return;
    const iAmA = f.a === S.myTeamId;
    const myScore = iAmA ? f.sa : f.sb, opScore = iAmA ? f.sb : f.sa;
    myMatches.push({ round: i + 1, oppName: teamNameOf(iAmA ? f.b : f.a), myScore, opScore, win: myScore > opScore });
  }));
  return `<div class="section-title">第 ${S.season} 赛季 · 结束</div>
  <div class="warn" style="${S.champion ? 'border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)' : ''}">本赛季成绩：<b>${title}</b> · 当前声望 <b style="color:${prestigeColor(t.prestige)}">${prestigeTier(t.prestige)} ${Math.round(t.prestige)}</b></div>
  <details class="season-block" open><summary><b>S${S.season}</b> 本赛季对战（${myMatches.filter(m => m.win).length}胜${myMatches.length - myMatches.filter(m => m.win).length}负）</summary>
    <div class="season-body"><table><thead><tr><th>轮次</th><th style="text-align:left">对手</th><th>比分</th><th>结果</th></tr></thead><tbody>${myMatchRows(myMatches) || '<tr><td colspan="4" class="muted">暂无</td></tr>'}</tbody></table>
    <details class="fx-round"><summary>联盟全部对战（含比分与阵容）</summary>${seasonFixturesHtml() || '<div class="muted">暂无</div>'}</details></div>
  </details>
  ${renderHistory()}<button class="btn gold mt" data-act="newseason">开启第 ${S.season + 1} 赛季</button>`;
}
function teamNameOf(id) { const t = S.teams.find(x => x.id === id); return t ? t.name : "?"; }
// 单场比赛（可展开看每局 BP 阵容）
// 同一局内英雄不应重复：渲染时再兜底去重一次（兼容旧存档里已存的重复阵容）
// 注意：巅峰对决（g.peak）允许双方撞英雄，所以只在队内去重
function dedupeLineup(arr) {
  const own = new Set();
  return (arr || []).filter(h => {
    if (!h || h === "—") return false;
    if (own.has(h)) return false;
    own.add(h); return true;
  });
}
function fixtureDetails(f, round, opts) {
  const o = opts || {};
  const A = o.aName || teamNameOf(f.a), B = o.bName || teamNameOf(f.b);
  const me = f.a === S.myTeamId || f.b === S.myTeamId;
  const played = f.played && f.sa != null;
  const score = played ? `${f.sa} : ${f.sb}` : (f.played ? "已赛" : "未赛");
  const winCls = played ? (f.sa > f.sb ? "c-good" : "c-bad") : "muted";
  const games = (f.games || []).map((g, i) => {
    const luA = dedupeLineup(g.luA);
    let luB = dedupeLineup(g.luB);
    if (!g.peak) luB = luB.filter(h => !luA.includes(h)); // 普通对局：同一局双方不重复
    return `<div class="fx-game"><span class="muted">第${i + 1}局</span>${g.peak ? '<b class="peak-mark">巅峰对决</b>' : ""} <b class="${g.aWin ? "c-good" : "c-bad"}">${escapeHtml(g.aWin ? A : B)}</b> 胜
    <div class="fx-lu">${escapeHtml(A)}：${escapeHtml(luA.join(" / ") || "—")}</div>
    <div class="fx-lu">${escapeHtml(B)}：${escapeHtml(luB.join(" / ") || "—")}</div></div>`;
  }).join("");
  return `<details class="fx ${me ? "fx-me" : ""}"><summary><span class="fx-team">${escapeHtml(A)}</span><b class="fx-score ${winCls}">${score}</b><span class="fx-team right">${escapeHtml(B)}</span></summary>${games || `<div class="muted" style="padding:6px 0">${f.played ? "旧存档无阵容记录" : "尚未开赛"}</div>`}</details>`;
}
// 某一轮的全部对阵
function roundFixturesHtml(round) {
  const fx = (S.fixtures || [])[round - 1] || [];
  if (!fx.length) return "";
  return fx.map(f => fixtureDetails(f, round)).join("");
}
// 本赛季已打完的各轮（新→旧），可折叠
function seasonFixturesHtml() {
  const played = [];
  (S.fixtures || []).forEach((fx, i) => { if (fx.some(f => f.played)) played.push(i + 1); });
  if (!played.length) return "";
  return played.slice().reverse().map(r => {
    const done = ((S.fixtures || [])[r - 1] || []).filter(f => f.played).length;
    return `<details class="fx-round"><summary>第 ${r} 轮 · ${done} 场已赛</summary>${roundFixturesHtml(r)}</details>`;
  }).join("");
}
// 我的赛季战绩（对手 / 比分 / 胜负）
function myMatchRows(fixturesArr) {
  return (fixturesArr || []).map(m => `<tr class="${m.win ? "" : ""}"><td>${m.tag ? escapeHtml(m.tag) : "R" + m.round}</td><td style="text-align:left">${escapeHtml(m.oppName)}${m.label ? ` <span class="muted" style="font-size:11px">${escapeHtml(m.label)}</span>` : ""}</td><td><b class="${m.win ? "c-good" : "c-bad"}">${m.myScore} : ${m.opScore}</b></td><td class="${m.win ? "c-good" : "c-bad"}">${m.win ? "胜" : "负"}</td></tr>`).join("");
}
function renderHistory() {
  if (!S.history.length) return `<div class="muted mt">这是你的第一个赛季。</div>`;
  const blocks = S.history.slice().reverse().map(h => {
    const title = h.champion ? "🏆 冠军" : h.final ? "亚军" : h.rank ? `第 ${h.rank} 名` : (h.playoff ? "四强" : "未进季后赛");
    const wins = (h.matches || []).filter(m => m.win).length, loses = (h.matches || []).length - wins;
    const myTable = (h.matches && h.matches.length)
      ? `<table><thead><tr><th>轮次</th><th style="text-align:left">对手</th><th>比分</th><th>结果</th></tr></thead><tbody>${myMatchRows(h.matches)}</tbody></table>`
      : '<div class="muted">无对战记录（旧赛季）</div>';
    const league = (h.fixtures && h.fixtures.length)
      ? `<details class="fx-round"><summary>联盟全部对战（${h.fixtures.length} 场，按轮）</summary>${h.fixtures.map(f => `<div class="fx-line"><span class="muted">${typeof f[0] === "number" ? "R" + f[0] : escapeHtml(f[0])}</span> ${escapeHtml(f[1])} <b>${f[3]} : ${f[4]}</b> ${escapeHtml(f[2])}</div>`).join("")}</details>`
      : "";
    return `<details class="season-block"${S.history.length === 1 ? " open" : ""}>
      <summary><b>S${h.season}</b> · ${escapeHtml(h.team)} · <b class="${h.champion ? "c-good" : ""}">${title}</b> · ${wins}胜${loses}负 · 声望 ${Math.round(h.prestige)}</summary>
      <div class="season-body">${myTable}${league}</div>
    </details>`;
  }).join("");
  return `<div class="section-title mt">历届赛季总结（可折叠）</div>${blocks}`;
}
/* 小分（净胜局）与相互战绩：积分榜并列时的排序依据 */
function teamGameStats() {
  const m = {};
  (S.teams || []).forEach(t => m[t.id] = { gw: 0, gl: 0, diff: 0 });
  (S.fixtures || []).forEach(fx => (fx || []).forEach(f => {
    if (!f.played || f.sa == null) return;
    if (m[f.a]) { m[f.a].gw += f.sa; m[f.a].gl += f.sb; }
    if (m[f.b]) { m[f.b].gw += f.sb; m[f.b].gl += f.sa; }
  }));
  Object.keys(m).forEach(k => m[k].diff = m[k].gw - m[k].gl);
  return m;
}
function headToHead(aId, bId) {
  let a = 0, b = 0;
  (S.fixtures || []).forEach(fx => (fx || []).forEach(f => {
    if (!f.played || f.sa == null) return;
    if (f.a === aId && f.b === bId) { if (f.sa > f.sb) a++; else if (f.sb > f.sa) b++; }
    else if (f.a === bId && f.b === aId) { if (f.sa > f.sb) b++; else if (f.sb > f.sa) a++; }
  }));
  return a - b;
}
function standingsSorted() {
  const stats = teamGameStats();
  return S.teams.slice().sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;          // 1) 积分
    const da = stats[a.id] ? stats[a.id].diff : 0, db = stats[b.id] ? stats[b.id].diff : 0;
    if (db !== da) return db - da;                                  // 2) 小分（净胜局）
    const h = headToHead(b.id, a.id);
    if (h !== 0) return h;                                          // 3) 相互战绩
    if (b.wins !== a.wins) return b.wins - a.wins;                   // 4) 胜场
    return a.losses - b.losses;
  });
}
function renderStandings() {
  const sorted = standingsSorted();
  const stats = teamGameStats();
  let rows = "";
  sorted.forEach((t, i) => {
    const s = stats[t.id] || { gw: 0, gl: 0, diff: 0 };
    const cls = [t.id === S.myTeamId ? "you" : "", i < 4 ? "top4" : ""].filter(Boolean).join(" ");
    rows += `<tr class="${cls}">
      <td>${i < 4 ? '<b class="c-good">' + (i + 1) + "</b>" : i + 1}</td>
      <td style="text-align:left">${escapeHtml(t.name)}${t.id === S.myTeamId ? ' <span class="pill gold" style="font-size:10px">你</span>' : ""}</td>
      <td>${t.wins + t.losses}</td><td>${t.wins}</td><td>${t.losses}</td><td><b>${t.points}</b></td>
      <td class="${s.diff > 0 ? "c-good" : s.diff < 0 ? "c-bad" : "muted"}">${s.diff > 0 ? "+" : ""}${s.diff}</td>
      <td class="muted">${t.fans.toLocaleString()}</td><td class="muted">¥${t.money}万</td>
      <td style="color:${prestigeColor(t.prestige)}">${prestigeTier(t.prestige)}</td></tr>`;
    if (i === 3) rows += `<tr class="cutline"><td colspan="10">✂ 季后赛晋级线 — 前 4 名进入双败淘汰赛</td></tr>`;
  });
  return `<div class="section-title">联盟积分榜 · S${S.season}</div>
  <div class="standings-wrap"><table><thead><tr><th>排名</th><th style="text-align:left">战队</th><th>场次</th><th>胜</th><th>负</th><th>积分</th><th>小分</th><th>粉丝</th><th>资金</th><th>声望</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="legend mt">
    <div><b class="c-good">前 4 名</b>（绿底）晋级季后赛（双败淘汰，BO7）。</div>
    <div><b>小分</b> = 系列赛中<b>净胜局</b>（拿下的局数 − 丢掉的局数），用来衡量同为 X 积分时的强弱。</div>
    <div><b>排序规则</b>：① 积分（每场胜 +2）→ ② 小分（净胜局）→ ③ <b>相互战绩</b>（两队直接交手的胜负）→ ④ 总胜场 → ⑤ 总负场。</div>
    <div class="muted">全部 12 队每轮各打一场（其他战队比赛自动结算），场次保持一致。其他战队与玩家<b>同规则</b>：通过比赛获取资金/粉丝/声望，并在<b>赛季初</b>买卖选手。</div>
  </div>`;
}
/* ---------- 双败 bracket 可视化 ---------- */
function bracketSlot(name) {
  const B = S.bracket, SL = B.slots[name], R = B.resolved[name];
  const label = { usf1: "胜者组半决赛①", usf2: "胜者组半决赛②", ufin: "胜者组决赛", lr1: "败者组一轮", lfin: "败者组决赛", gf: "总决赛" }[name];
  if (!SL || !SL.a || !SL.b) return `<div class="bk-row"><span class="bk-label">${label}</span><span class="muted">待定</span></div>`;
  const aN = escapeHtml(teamName(SL.a)), bN = escapeHtml(teamName(SL.b));
  if (!R) return `<div class="bk-row"><span class="bk-label">${label}</span><span>${aN} vs ${bN}</span></div>`;
  // 有比分与阵容记录时，与常规赛一样可展开看每局 BP
  if (R.sa != null) {
    return `<div class="bk-wrap"><span class="bk-label">${label}<i class="muted" style="font-size:10px"> BO7</i></span>
      ${fixtureDetails({ a: SL.a, b: SL.b, sa: R.sa, sb: R.sb, played: true, games: R.games || [] })}</div>`;
  }
  // 兼容旧存档（只有胜负）
  const winN = escapeHtml(teamName(R.winner));
  return `<div class="bk-row done"><span class="bk-label">${label}</span><span>${aN} vs ${bN} → <b style="color:var(--green)">${winN}</b></span></div>`;
}
function renderBracket() {
  if (!S.bracket) return "";
  const order = S.bracket.order.map(id => teamName(id));
  return `<div class="section-title mt">双败淘汰赛程（前4：${order.map((n, i) => `${i + 1}.${escapeHtml(n)}`).join(" / ")}）</div>
  <div class="bracket">
    ${bracketSlot("usf1")}${bracketSlot("usf2")}${bracketSlot("ufin")}
    <div class="bk-sep">— 败者组 —</div>
    ${bracketSlot("lr1")}${bracketSlot("lfin")}
    <div class="bk-sep">— 总决赛 —</div>
    ${bracketSlot("gf")}
  </div>
  <div class="muted mt">双败规则：胜者组半决赛 1v4、2v3；胜者组决赛胜者直通总决赛，负者坠入败者组决赛；败者组再负即淘汰。总决赛 BO7，胜者夺冠。BO7 打到 3:3 时第 7 局为<b style="color:var(--gold)">巅峰对决</b>（无 ban、盲选、不受全局BP限制）。点开每场可看比分与每局双方阵容。</div>`;
}

function renderMarket() {
  if (!S.market) buildMarket();
  const t = getMyTeam();
  const open = !!S.transferWindow;
  const myBench = POS.flatMap(pos => t.players[pos].filter(p => p.id !== t.lineup[pos]));
  const cands = S.market.map(c => {
    const can = open && t.money >= c.price && S.transfersUsed < S.maxTransfers && t.players[c.pos].length < 4;
    return `<div class="player-card">
      <span class="pos ${c.pos}">${POS_NAME[c.pos]}</span>
      <h4>${escapeHtml(c.name)} <span class="pill" style="font-size:10px;color:${ratingColor(c.rating)};border-color:${ratingColor(c.rating)}">${c.rating}</span></h4>
      <div class="lv">总评 ${c.ovr} · 上限${c.ceil != null ? c.ceil : ceilFor(c.rating)} · ${c.kind === "poach" ? `来自 ${escapeHtml(c.teamName)}(替补)` : "自由身"}</div>
      <div class="flex-between mt"><span style="color:var(--gold);font-weight:800">¥${c.price}万</span>
      <button class="btn sm ${can ? '' : 'ghost'}" data-act="marketbuy:${c.id}" aria-label="签约 ${escapeHtml(c.name)}，${POS_NAME[c.pos]}，总评 ${c.ovr}，价格 ${c.price} 万" ${can ? '' : 'disabled'}>签约</button></div>
    </div>`;
  }).join("");
  const bench = myBench.map(p => `<div class="player-card">
      <span class="pos ${p.pos}">${POS_NAME[p.pos]}</span><h4>${escapeHtml(p.name)}</h4>
      <div class="lv">总评 ${p.ovr} · ${ratingForOvr(p.ovr)}</div>
      <div class="flex-between mt"><span class="muted">卖出约 ¥${sellPrice(p)}万</span>
      <button class="btn ghost sm" data-act="marketsell:${p.id}" aria-label="卖出 ${escapeHtml(p.name)}，总评 ${p.ovr}" ${open && S.transfersUsed < S.maxTransfers ? '' : 'disabled'}>卖出</button></div></div>`).join("");
  const windowBar = open
    ? `<div class="warn" style="border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)">🟢 转会窗口开放中（赛季初）— 打第一场常规赛后关闭</div>`
    : `<div class="warn">🔴 转会窗口已关闭 — 每个赛季初才可买卖选手（下赛季开始时重新开放）</div>`;
  const aiFeed = (S.aiTransfers || []).map(x => `<div class="report-line"><span class="tag ${x.type === "in" ? "win" : "lose"}">${x.type === "in" ? "签入" : "卖出"}</span><span class="body"><b>${escapeHtml(x.teamName)}</b> ${x.type === "in" ? "签下" : "卖出"} ${POS_NAME[x.pos]}【${escapeHtml(x.name)}】总评${x.ovr} · ¥${x.price}万${x.from ? `（来自 ${escapeHtml(x.from)}）` : ""}</span></div>`).join("");
  // 赛中租借：转会窗关闭后仍可短期补强
  const loanLeft = Math.max(0, (S.maxLoans || 1) - (S.loansUsed || 0));
  const loanCard = c => {
    const fee = Math.round(priceFor(c.p.ovr) * 0.25);
    const can = !open && loanLeft > 0 && t.money >= fee && t.players[c.pos].length < 4;
    return `<div class="player-card">
      <span class="pos ${c.pos}">${POS_NAME[c.pos]}</span>
      <h4>${escapeHtml(c.p.name)} <span class="pill" style="font-size:10px;color:${ratingColor(c.p.rating)};border-color:${ratingColor(c.p.rating)}">${c.p.rating}</span></h4>
      <div class="lv">总评 ${c.p.ovr} · ${c.p.age || "?"}岁 · 来自 ${escapeHtml(c.fromTeam.name)}（替补）</div>
      <div class="flex-between mt"><span style="color:var(--gold);font-weight:800">租费 ¥${fee}万</span>
      <button class="btn sm ${can ? '' : 'ghost'}" data-act="loanin:${loanCandidates().indexOf(c)}" ${can ? '' : 'disabled'} aria-label="租借 ${escapeHtml(c.p.name)}，租费 ${fee} 万，期限 3 轮">租借 3 轮</button></div>
    </div>`;
  };
  const loanBlock = `<div class="section-title" style="margin-top:18px">赛中租借（${open ? "窗口开放中，可直接签约" : "转会窗关闭后可用"}）</div>
    <div class="muted mb" style="font-size:12.5px">租借费 = 身价 <b>25%</b>，<b>3 轮后自动返回</b>原队。每赛季限 <b>${S.maxLoans || 1}</b> 次（剩余 <b>${loanLeft}</b> 次）。${(S.loans || []).length ? `<br>租借中：${S.loans.map(l => `${POS_NAME[l.pos]}【${escapeHtml(l.name)}】剩余 ${l.roundsLeft} 轮`).join("、")}` : ""}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${loanCandidates().slice(0, 6).map(loanCard).join("") || '<div class="muted">暂无可租借的替补</div>'}</div>`;
  return `<div class="section-title">转会市场（赛季转会 ${S.transfersUsed} / ${S.maxTransfers}）</div>
  ${windowBar}
  <div class="muted mb" style="margin-top:8px">资金 <b style="color:var(--gold)">¥${t.money}万</b> · 声望越高池子越强（${prestigeTier(t.prestige)}）。买入入替补席，需到【阵容】提首发。
    <span class="pill" style="margin-left:8px">🔒 市场每赛季初自动刷新（赛季中不可刷新）</span></div>
  <div class="section-title" style="margin-top:6px">可签约</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${cands || '<div class="muted">暂无候选</div>'}</div>
  <div class="section-title" style="margin-top:18px">我的替补（可卖出）</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${bench || '<div class="muted">暂无替补可卖</div>'}</div>
  ${loanBlock}
  <div class="section-title" style="margin-top:18px">其他战队转会动态（本赛季）</div>
  ${aiFeed || '<div class="muted">其他战队本赛季暂无转会</div>'}`;
}
/* ---------------- 声望页 ---------------- */
function renderPrestige() {
  const t = getMyTeam(), p = t.prestige, next = prestigeNext(p);
  const pct = p >= 100 ? 100 : Math.round((p % 20) / 20 * 100);
  const eff = [`粉丝增长 ×${(1 + p / 150).toFixed(2)}`, `转会吸引力：${p >= 80 ? "极强(可挖顶级)" : p >= 60 ? "强" : p >= 40 ? "中等" : "一般"}`, `赞助加成 +¥${Math.round(p / 10) * 10}万`];
  const logs = (S.log || []).slice(0, 20).map(l => `<div class="report-line"><span class="tag even">记</span><span class="body">${escapeHtml(l)}</span></div>`).join("");
  return `<div class="section-title">战队声望</div>
  <div class="center" style="font-size:34px;font-weight:900;color:${prestigeColor(p)}">${prestigeTier(p)}</div>
  <div class="center muted" style="margin-bottom:10px">声望值 ${Math.round(p)} / 100</div>
  <div class="bar" style="height:12px"><i style="width:${pct}%;background:linear-gradient(90deg,var(--cyan),${prestigeColor(p)})"></i></div>
  <div class="muted mt">距离下一档「${prestigeTier(next)}」还差 ${Math.max(0, Math.round(next - p))} 点。</div>
  <div class="section-title mt">声望效果</div>
  <ul class="muted" style="line-height:1.9;padding-left:18px">${eff.map(e => `<li>${e}</li>`).join("")}</ul>
  <div class="muted mt">获取：比赛/系列赛胜利、晋级/夺冠、正面事件、媒体赞誉；失利与卖主力会降低。</div>
  <div class="section-title mt">近期动态</div>${logs || '<div class="muted">暂无记录</div>'}`;
}
/* ---------------- 赛制表 ---------------- */
function renderFormat() {
  return `<div class="section-title">KPL 赛制表（S${S.season}）</div>
  <div class="report-line"><span class="tag key">联盟</span><span class="body">共 12 支战队，与其余 11 支进行一个赛季较量。</span></div>
  <div class="report-line"><span class="tag win">常规赛</span><span class="body">单循环，每队 11 场，每场为 <b>BO5 系列赛</b>（先拿 3 分）。系列赛中<b>每一局都要 BP</b>，采用<b>全局 BP</b>：任意一方选过的英雄，后续局双方都不能再用。胜一场积 2 分，取<b>前 4 名</b>晋级季后赛。</span></div>
  <div class="report-line"><span class="tag key">季后赛</span><span class="body"><b>双败淘汰</b>。胜者组半决赛 1v4、2v3（BO7）；胜者组决赛胜者直通总决赛、负者坠入败者组决赛；败者组半决赛（两个半决赛负者）再负即淘汰；败者组决赛胜者进总决赛。<b>总决赛 BO7</b>，胜者夺冠。</span></div>
  <div class="report-line"><span class="tag key">巅峰对决</span><span class="body">BO7 打到 <b>3:3</b> 时，第 7 局为<b>巅峰对决</b>：<b>没有 ban 位</b>、双方<b>盲选</b>、<b>不受全局BP限制</b>（此前用过的英雄仍可选），双方甚至可能<b>选到同一个英雄</b>。选满 5 人后立即揭示对手阵容并开赛。</span></div>
  <div class="report-line"><span class="tag key">季后赛赛果</span><span class="body">季后赛每场都会记录<b>比分与每局双方 BP 阵容</b>，在【赛程】页的双败赛程里点开即可查看；赛季结束后也会写进该赛季的赛季总结。</span></div>
  <div class="report-line"><span class="tag key">BP规则</span><span class="body">每局系统分配<b>蓝/红方</b>并逐局交替。官方四阶段征召，<b>每方共 5 个 ban</b>：①禁用 蓝→红→蓝→红；②选择 蓝→红 红→蓝 蓝→红；③禁用 红→蓝→红→蓝→红→蓝；④选择 红→蓝 蓝→红。<b>对手选将实时可见</b>，可后手 Counter；选将时可自选填充位置。</span></div>
  <div class="report-line"><span class="tag key">摇摆位</span><span class="body">英雄<b>不锁死分路</b>，可拖到任意分路槽。按各英雄摇摆到不同分路的常见程度<b>分档</b>：主场 1.0（✓）、摇摆·常见 0.95~0.98（○）、摇摆 0.88~0.94（~）、逆用 0.80~0.87（⚠）、极少出现 0.72（✖）。<b>不匹配会直接扣战斗力，并连带降低胜算</b>；★=有选手擅长该英雄。</span></div>
  <div class="report-line"><span class="tag key">克制</span><span class="body">两层叠加：①<b>定位克制</b>（刺客克射手/法师、射手法师克坦克战士、坦克克刺客、战士克法师射手）；②<b>英雄级克制</b>（<b>可跨分路</b>，如张良/东皇压制进场刺客、盾山格挡弹道射手、吕布·马可波罗·貂蝉真伤破坦、虞姬免疫物理克制物理刺客、庄周解控克甄姬王昭君、老夫子捆位移射手）。BP 界面对每个候选/已选英雄都会标出<b>克制/被克</b>与原因，鼠标悬停雷达图可看 OSCM。</span></div>
  <div class="report-line"><span class="tag key">OSCM</span><span class="body">英雄按 <b>输出(O)/生存(S)/控制(C)/机动(M)</b> 四维建模。BP 界面有双方阵容的 <b>OSCM 雷达图</b>（我方 vs 对手均值对比 + 逐项差值），并给每个已选英雄配迷你雷达；点选英雄时弹出该英雄雷达与对位克制提示，方便判断"差的是输出还是前排"。</span></div>
  <div class="report-line"><span class="tag key">一键BP</span><span class="body">BP 界面右上角 <b>⚡ 一键BP</b>：自动完成本局剩余全部 ban/选将（含 AI 回合），完成后直接进入战前战力计算。<b>强度介于「新秀」与「职业」之间</b>——会按分路/克制/选手擅长打分，但偶尔放过克制、偶尔随到次优英雄、ban 有时不盯对面绝活，<b>不适合当成稳赢工具</b>。<b>传奇难度（含真实大名单）直接禁用一键BP</b>，必须手动 ban/选。<b>不限使用次数</b>；执行时<b>逐步演示</b>（约 0.5 秒/步），运行中可点『停止自动BP』中止。</span></div>
  <div class="report-line"><span class="tag key">全局BP</span><span class="body">以<b>战队</b>为单位记录（<b>与红蓝方无关</b>，阵营每局互换不影响归属）：<b>本队用过的英雄后续局不能再选</b>；<b>对方战队用过的英雄，本队仍可抢选</b>（对方只锁它自己）。ban 位池只移除<b>对方战队</b>用过的英雄（本队用过的仍可 ban、只是不能选）。</span></div>
  <div class="report-line"><span class="tag key">赛程</span><span class="body">全部 12 队每轮各打一场（其他战队比赛自动按战力结算），<b>场次保持一致</b>，积分榜实时更新。每轮的 <b>6 场对阵都会列出比分</b>，点开可看<b>每局双方 BP 阵容</b>；本赛季各轮对战可在赛程页折叠查看。</span></div>
  <div class="report-line"><span class="tag key">赛季总结</span><span class="body">每个赛季结束会把<b>你与各队的全部战绩（对手/比分/胜负）</b>和联盟全部对战比分写入该赛季总结，<b>可折叠但永久保留</b>（赛程页底部与赛季结束页均可查看）。</span></div>
  <div class="report-line"><span class="tag key">战前</span><span class="body">选将完成后先出<b>战力计算</b>：双方战力对比、分路克制、<b>阵容合理性判定</b>（分路匹配/前排/输出/控制/战术契合），确认后点「开始比赛」。</span></div>
  <div class="report-line"><span class="tag key">败方选边</span><span class="body">系列赛中<b>上一局的败方</b>有权选择下一局的红/蓝方（蓝方先选、红方后手 Counter）。你落败时可自行选择阵营。</span></div>
  <div class="report-line"><span class="tag key">组合体系</span><span class="body">同队同时选出经典组合（如盾山+艾琳、张良+王昭君、鬼昭吕）可<b>提升全队战力</b>，多个组合可叠加（上限 +18%）。</span></div>
  <div class="report-line"><span class="tag key">转会</span><span class="body">每赛季 <b>${S.maxTransfers}</b> 次转会，<b>仅在赛季初转会窗口开放</b>（打第一场常规赛后关闭）。市场<b>每赛季初自动刷新一次、赛季内不可手动刷新</b>；<b>S 级选手极罕见</b>（约 1/4 的赛季才会出现 1 名）。<b>价格按身价</b>：总评 80 ≈ ¥266 万、90 ≈ ¥376 万，<b>卖出只回收 50%</b>。<b>其他 11 支战队与玩家完全同规则</b>：起点资金 250 万、声望 45、选手评分相近，通过比赛赚取资金/粉丝/声望，并在赛季初自动买卖选手——他们完成交易时会弹出通知，也可在【转会】页查看全部动态。</span></div>
  <div class="report-line"><span class="tag key">训练</span><span class="body">特训每次消耗 <b>1 训练点 + 资金</b>（按选手总评 5~11 万，越强越贵），单项 +1~2 且不超过上限。练满后可花 <b>${BREAK_PTS} 训练点 + 大量资金</b>（约 290~330 万）<b>突破上限</b> +1~2，继续成长（执行前二次确认）；<b>27 岁以上已过巅峰，不能突破上限</b>。<b>全队休息</b>：2 训练点 → 体能 +${restGain()}、心态 +4。每次特训/休息都可<b>撤销</b>。</span></div>
  <div class="report-line"><span class="tag key">教练组</span><span class="body">在【战队】页<b>聘用职员</b>（一次性聘用费 + 每赛季工资，赛季末结算，付不起会有人离职）：<b>🧠 心理咨询师</b> 每轮回心态（2 级起自动清低迷）· <b>🏋️ 体能教练</b> 每局体力消耗 -1/级、全队休息 +4/级 · <b>📊 数据分析师</b> 每轮训练点 +1/级、BP 对手情报 +2 个/级。每项 3 级。</span></div>
  <div class="report-line"><span class="tag key">董事会目标</span><span class="body">每个赛季初董事会给 1 个<b>主目标</b>（卫冕夺冠 / 打进总决赛 / 进入四强 / 常规赛前 6，按上赛季成绩递进）+ 1 个<b>青年目标</b>（赛季末首发里有 ≤22 岁且总评 ≥80 的选手）。<b>达成</b>给预算与声望（最高 +260 万 / +8 声望），<b>未达成扣预算与声望</b>。目标卡片在【战队】页顶部，赛季末结算。</span></div>
  <div class="report-line"><span class="tag key">英雄熟练</span><span class="body">每名选手有 6 个英雄的<b>熟练度 0~100</b>，直接乘进战力（绝活 ≈×1.11、可用 ≈×1.03、生疏 ≈×0.94）——所以"会用"比"版本强"更值钱。在【训练】页点 <b>🎯 英雄熟练</b> 可练某个英雄（1 训练点，+5~9），也可以花 2 训练点<b>学新英雄</b>（应对全局 BP 被 ban 光）。BP 选将台上的 <b>★数字</b> 就是熟练度。</span></div>
  <div class="report-line"><span class="tag key">对手风格</span><span class="body">每支 AI 战队有<b>战术人格</b>：四保一 / 野核 / 打架队 / 运营流 / 中野联动 / 全英雄池。人格只是把对应分路与定位的打分抬高 <b>3~8%</b>，<b>不是固定套路</b>——同一支队在不同局依然会选出不同阵容，只是整体更偏某种风格。赛程页与系列赛页会显示对手风格。</span></div>
  <div class="report-line"><span class="tag key">胜负判定</span><span class="body">一场比赛 = <b>赛前战力对比 → 赛前胜算 → 局内事件 → 结算</b>。<b>赛前胜算</b>由双方战力差决定（战力尺度 ${POWER_SCALE}：3% 战力差 ≈ 60% 胜率，不是一锤定音）。<b>局内事件会真正改变结果</b>：抢暴君、抢主宰、ACE、偷家、核心失误……都会累积成 <b>swing</b>，越到后期权重越高，最后一分钟用「赛前胜算 + 全部 swing」摇出胜负。<b>跳过战斗不会作弊</b>——它只是把剩余分钟快进跑完，概率分布与逐分钟观看完全一致。</span></div>
  <div class="report-line"><span class="tag key">经济</span><span class="body">收入已收紧：<b>系列赛</b>胜利约 ¥42~98 万（季后赛 ×2）、失利 ¥7~28 万，另有同额的联盟分成；<b>赛季奖金</b> 冠军 140 / 进季后赛 85 / 其他 42 万；<b>粉丝见面会</b>与粉丝数、声望挂钩（每赛季 2 次）；赞助事件 55~140 万 + 声望加成。<b>支出</b>：特训 5~11 万/次、突破上限约 290~330 万、<b>转会按身价</b>（总评 90 约 376 万，卖出仅回收 50%）、<b>续约 = 身价 50%</b>、教练组工资。<b>一个赛季正常运营下来，通常只够补 1~2 个关键位置。</b></span></div>
  <div class="report-line"><span class="tag key">粉丝运营</span><span class="body">每赛季可举办 <b>2 次粉丝见面会</b>，收入与<b>粉丝数、声望</b>挂钩（粉丝越多赚得越多），并小幅涨粉。入口在【战队】页。</span></div>
  <div class="report-line"><span class="tag key">失败条件</span><span class="body"><b>声望降到 0 即游戏失败（GAME OVER）</b>：连续失利每场 −1.2（季后赛 −2）、无缘季后赛 −8、卖掉 85+ 主力 −3。声望低于 10 时【战队】页会红字警告。</span></div>
  <div class="report-line"><span class="tag key">积分榜</span><span class="body">前 <b>4 名高亮</b>并标出<b>晋级线</b>。并列时依次比较：① 积分（胜 +2）→ ② <b>小分</b>（系列赛净胜局 = 拿下局数 − 丢掉局数）→ ③ <b>相互战绩</b>（两队直接交手）→ ④ 总胜场 → ⑤ 总负场。</span></div>
  <div class="report-line"><span class="tag key">体能</span><span class="body">每局消耗 <b>${staminaCostPerGame()}</b> 体能（下限 ${STAMINA_FLOOR}，有体能教练会降低）；≤60 标「体能偏低」、≤45 标「体力告急」红标。恢复途径：<b>轮间自然 +${ROUND_STAMINA_GAIN}</b>（每轮开赛前）· <b>全队休息 +${restGain()}</b>（2 训练点，<b>只有大场打完后才能休息</b>，系列赛局间不可）· 赛季重置 +25。系列赛局间只能<b>换人</b>或<b>一键轮换</b>。</span></div>
  <div class="report-line"><span class="tag key">年龄合同</span><span class="body"><b>3 个赛季 = 1 岁</b>：第 4、7、10… 赛季开始时全联盟年龄 +1（顶栏显示「第 N 年」）。<b>26 岁以上开始衰退</b>，而且是<b>逐季</b>掉：<b>27~29 岁</b>每赛季操作/意识/配合/心态 <b>−1</b>、成长上限 −1；<b>30 岁起</b>每赛季 <b>−2</b>、上限 −2（练不回来）。≤26 岁仍有成长机会（21 岁以下最高，27 岁起不再成长）。<b>合同按赛季计（2~6 赛季）</b>，赛季末 −1；到期自动续约（身价 50%，主力或 A 级以上且资金足够），否则<b>离队进自由身池</b>；也可在【战队】页手动续约（3~6 赛季）。</span></div>
  <div class="report-line"><span class="tag key">赛中租借</span><span class="body">转会窗口关闭后，仍可从其他战队<b>租借替补</b>：租费 = 身价 <b>25%</b>，期限 <b>3 轮</b>，到期<b>自动返回原队</b>。每赛季限 <b>${S.maxLoans || 1}</b> 次，入口在【转会】页。</span></div>
  <div class="report-line"><span class="tag key">难度</span><span class="body"><b>难度 = 对手的 BP 水平</b>，<b>不改动任何战力/属性</b>：<b>新秀</b> 会犯小错——多数回合只按版本强度 ban（很少主动针对你的英雄池）、基本不读克制、偶尔拿舒适英雄，但仍会认分路、挑强度高的英雄；<b>职业</b> 会读克制、照顾自家选手擅长、补阵容前排与输出，ban 会瞄着你的核心；<b>传奇</b> 近乎最优，几乎总拿最强解，ban 基本必中你的第一核心。<b>名单模式</b>（平衡选秀 / 真实大名单）是另一个维度，只决定 12 队怎么分人；<b>真实大名单下对手 BP 固定按「传奇」</b>。</span></div>
  <div class="report-line"><span class="tag key">存档</span><span class="body"><b>3 个存档槽</b>，自动保存到当前槽位；每个槽可<b>改自定义名称</b>（标题界面「改名」，或游戏内右上角 💾），留空则显示战队名。标题界面可<b>导出 .json 备份</b>、<b>导入存档</b>（自动找空槽）、删除槽位。旧版单存档会自动迁移到存档 1。<b>危险操作</b>（覆盖开档、删除存档、卖出选手、突破上限、放弃系列赛）都会<b>二次确认</b>；特训/休息/签约等消耗型操作支持<b>↩ 撤销</b>（底部撤销条，仅主界面可撤销）。</span></div>
  <div class="report-line"><span class="tag key">开档</span><span class="body">选手全部来自<b>真实 KPL/K甲 参赛选手</b>（2016-2026 各届大名单），评级与总评按其<b>历史战绩</b>综合评估：S = 拿过总冠军/FMVP（Fly、小胖、一诺、清融、久诚、花海、钟意、长生、坦然、大帅、子阳、流浪、轩染、清清等），A = 冠军队成员/总决赛常客，B = KPL 常规首发，C = 轮换替补/新秀。<b>平衡选秀</b>下开局不做任何属性加成或削弱，12 队靠<b>蛇形分配</b>拉平（每队一强一弱）；<b>真实名单</b>则按大名单原样绑定。后续各队靠训练、转会、比赛自行发展。</span></div>
  <div class="report-line"><span class="tag key">操作</span><span class="body">键盘：<b>1~8</b> 切换页签 · <b>/</b> 搜索英雄 · <b>方向键 + Enter</b> 选/ban 英雄 · <b>B</b> 一键BP · <b>S</b> 跳过战斗 · <b>R</b> 一键轮换 · <b>Esc</b> 关闭弹窗 · <b>?</b> 帮助。所有按钮带 <b>aria-label</b>，属性条与选手卡有完整读屏描述；页面重渲染会<b>保留滚动位置与输入焦点</b>。</span></div>
  <div class="report-line"><span class="tag key">其他</span><span class="body">训练有<b>成长上限</b>（可花训练点+资金突破）；声望五档影响粉丝/转会/赞助；<b>一键BP 不限次数</b>；<b>BP 支持分路筛选/只看我的英雄池/对手擅长提示</b>；可打多个赛季建立王朝。</span></div>`;
}

/* ---------------- OSCM 雷达图（输出/生存/控制/机动） ---------------- */
const OSCM_AXES = [
  { k: 0, label: "输出", a: -90 },
  { k: 2, label: "控制", a: 0 },
  { k: 1, label: "生存", a: 90 },
  { k: 3, label: "机动", a: 180 }
];
function oscmVals(h) { return h ? [h.o, h.s, h.c, h.m] : [0, 0, 0, 0]; }
// 雷达图缓存：BP 每步都会全页重绘，但双方阵容的 OSCM 图大部分时间没变，
// 缓存掉纯字符串拼接可以显著降低每步开销（#13 的一部分）
const _radarCache = new Map();
function radarSvg(items, size, withLabels) {
  const key = size + "|" + (withLabels ? 1 : 0) + "|" + items.map(it => it.vals.join(",") + it.color + it.fill).join(";");
  const hit = _radarCache.get(key);
  if (hit) return hit;
  const cx = size / 2, cy = size / 2, R = size * (withLabels ? 0.32 : 0.38);
  const pt = (v, a) => {
    const r = R * (clamp(v, 0, 100) / 100), rad = a * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  let s = `<svg class="radar" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const p = OSCM_AXES.map(ax => pt(100 * f, ax.a).map(n => n.toFixed(1)).join(",")).join(" ");
    s += `<polygon points="${p}" fill="none" stroke="#2a3454" stroke-width="1"/>`;
  });
  OSCM_AXES.forEach(ax => {
    const [x, y] = pt(100, ax.a);
    s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2a3454" stroke-width="1"/>`;
  });
  items.forEach(it => {
    const p = OSCM_AXES.map(ax => pt(it.vals[ax.k], ax.a).map(n => n.toFixed(1)).join(",")).join(" ");
    s += `<polygon points="${p}" fill="${it.fill}" stroke="${it.color}" stroke-width="1.8" stroke-linejoin="round"/>`;
  });
  if (withLabels) {
    OSCM_AXES.forEach(ax => {
      const [x, y] = pt(122, ax.a);
      s += `<text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" font-size="10" fill="#8b96b0" text-anchor="middle">${ax.label}</text>`;
    });
  }
  const out = s + `</svg>`;
  if (_radarCache.size > 400) _radarCache.clear();
  _radarCache.set(key, out);
  return out;
}
// 阵容 OSCM 均值（用于对比双方风格）
function lineupOscm(picks) {
  const hs = POS.map(p => heroByName(picks[p])).filter(Boolean);
  if (!hs.length) return [0, 0, 0, 0];
  return [0, 1, 2, 3].map(i => Math.round(hs.reduce((a, h) => a + oscmVals(h)[i], 0) / hs.length));
}
function renderOscmPanel(myPicks, oppPicks, oppName) {
  const mine = lineupOscm(myPicks), foe = lineupOscm(oppPicks);
  const diff = i => mine[i] - foe[i];
  const rows = ["输出", "生存", "控制", "机动"].map((n, i) => {
    const d = diff(i);
    const cls = d > 3 ? "c-good" : d < -3 ? "c-bad" : "c-mid";
    return `<div class="oscm-row"><span class="oscm-k">${n}</span>
      <span class="oscm-bar"><i style="width:${mine[i]}%"></i></span><b>${mine[i]}</b>
      <span class="muted" style="margin:0 6px">vs</span>
      <span class="oscm-bar foe"><i style="width:${foe[i]}%"></i></span><b>${foe[i]}</b>
      <b class="${cls}" style="margin-left:6px">${d > 0 ? "+" : ""}${d}</b></div>`;
  }).join("");
  return `<div class="oscm-panel">
    <div class="oscm-left">${radarSvg([
      { vals: mine, color: "#34d3e0", fill: "rgba(52,211,224,.22)" },
      { vals: foe, color: "#ff6b5e", fill: "rgba(255,107,94,.18)" }
    ], 150, true)}
      <div class="oscm-legend"><span class="c-good">● 我方</span> <span class="c-bad">● ${escapeHtml(oppName || "对手")}</span></div>
    </div>
    <div class="oscm-right">${rows}
      <div class="muted" style="font-size:11px;margin-top:4px">OSCM = 输出/生存/控制/机动（阵容五人均值）。缺输出或前排时按需 pick。</div>
    </div>
  </div>`;
}

/* ---------------- 选将中的英雄卡片（OSCM + 跨分路克制提示） ---------------- */
function renderPendingCard(name) {
  const h = heroByName(name);
  if (!h) return "";
  const d = S.series.draft, oth = aiSide(d);
  const rel = POS.map(pos => {
    const e = d.picks[oth].find(x => x.pos === pos);
    if (!e) return null;
    const eh = heroByName(e.hero);
    const m = matchupMult(h, eh);
    return { pos, hero: e.hero, m, note: heroCounterNote(h.name, eh.name) };
  }).filter(Boolean);
  const good = rel.filter(x => x.m >= 1.06).sort((a, b) => b.m - a.m).slice(0, 3);
  const bad = rel.filter(x => x.m <= 0.96).sort((a, b) => a.m - b.m).slice(0, 2);
  const tag = (x, cls) => `<span class="pill ${cls}" style="font-size:10px">${POS_NAME[x.pos]} ${x.hero} ×${x.m.toFixed(2)}${x.note ? ` · ${escapeHtml(x.note)}` : ""}</span>`;
  return `<div class="pend-card">
    <span class="mini-radar">${radarSvg([{ vals: oscmVals(h), color: "#f5c518", fill: "rgba(245,197,24,.22)" }], 64, true)}</span>
    <div style="flex:1">
      <div><b style="color:var(--gold)">${escapeHtml(h.name)}</b> <span class="muted" style="font-size:11px">${POS_NAME[h.pos]} · ${ARC_NAME[h.arc]}</span></div>
      <div class="muted" style="font-size:11.5px">输出 <b>${h.o}</b> · 生存 <b>${h.s}</b> · 控制 <b>${h.c}</b> · 机动 <b>${h.m}</b></div>
      <div style="margin-top:4px">${good.map(x => tag(x, "green")).join(" ")}${bad.map(x => tag(x, "red")).join(" ")}${!good.length && !bad.length ? '<span class="muted" style="font-size:11px">对位无明显克制关系</span>' : ""}</div>
    </div>
  </div>`;
}

/* ---------------- 一键 BP ----------------
   强度刻意设在「新秀 < 一键BP < 职业」之间：会犯一些不致命的判断错误
   （偶尔放过克制、偶尔随到次优英雄、ban 有时不盯着对面绝活），
   但不会把英雄塞到不该去的分路（同样遵守 LANE_PICK_FLOOR）。
   传奇难度（含真实大名单）直接禁用一键 BP，必须手动 ban/选。 */
const AUTO_BP = { noise: 0.21, topN: 5, profW: 0.65, fitW: 0.82, counterW: 0.50, banTop: 2, banTargetRate: 0.75 };
function autoBpAllowed() { return aiBpLevel() !== "传奇"; }
function myAutoBan() {
  if (!autoBpAllowed()) return null;
  const opp = S.teams.find(t => t.id === S.series.oppId);
  const pool = availBanHeroes(true);
  if (!pool.length) return null;
  const oppPool = new Set();
  POS.forEach(pos => { const p = getPlayer(opp, opp.lineup[pos]); if (p) (p.heroPool || []).forEach(h => oppPool.add(h)); });
  const byStrength = pool.slice().sort((a, b) => heroStrength(b) - heroStrength(a));
  const targeted = byStrength.filter(h => oppPool.has(h.name));
  // 75% 会盯对面英雄池（但只在最扎眼的 2 个里挑），25% 只看版本强度
  const useTarget = targeted.length >= 2 && rand() < AUTO_BP.banTargetRate;
  const list = useTarget ? targeted : byStrength;
  const n = Math.max(1, Math.min(useTarget ? AUTO_BP.banTop : 6, list.length));
  return list[randInt(0, n - 1)].name;
}
function myAutoPick() {
  if (!autoBpAllowed()) return null;
  const s = S.series, d = s.draft, mySide = d.mySide, oth = aiSide(d);
  const myT = getMyTeam();
  const filled = filledPos(d, mySide);
  const unfilled = POS.filter(p => !filled.includes(p));
  const pool = availHeroes();
  const cands = [];
  unfilled.forEach(pos => {
    const starter = getPlayer(myT, myT.lineup[pos]);
    const enemy = (d.picks[oth] || []).find(e => e.pos === pos);
    const enemyHero = enemy ? heroByName(enemy.hero) : null;
    const laneOk = pool.filter(h => laneFit(h, pos) >= LANE_PICK_FLOOR);
    (laneOk.length ? laneOk : pool).forEach(h => {
      const prof = profOf(starter, h.name);
      const fit = laneFit(h, pos);
      const counter = enemyHero ? matchupMult(h, enemyHero) : 1;
      let sc = heroStrength(h);
      sc *= 1 + (prof - 1) * AUTO_BP.profW;
      sc *= 1 - (1 - fit) * AUTO_BP.fitW;
      sc *= 1 + (counter - 1) * AUTO_BP.counterW;
      sc *= 1 + AUTO_BP.noise * (rand() * 2 - 1);
      cands.push({ pos, hero: h.name, sc });
    });
  });
  if (!cands.length) return null;
  cands.sort((a, b) => b.sc - a.sc);
  const n = Math.max(1, Math.min(AUTO_BP.topN, cands.length));
  return cands[randInt(0, n - 1)];
}
// 一键 BP：逐帧执行（默认 260ms/步），玩家能看清 ban/选将过程；运行中再点一次即停止
const AUTO_BP_DELAY = 500; // 每步约 0.5 秒，玩家能看清 ban/选将过程
function autoBpRunning() { return !!S._autoRun; }
function stopAutoBp(msg) {
  if (S._autoTimer) { try { clearTimeout(S._autoTimer); } catch (e) {} S._autoTimer = null; }
  S._autoRun = false;
  if (msg) toast(msg);
}
// 执行一步（我或对手的 ban / pick）
function autoBpStep() {
  const s = S.series;
  if (!s || s.sub !== "draft" || !s.draft) return false;
  const d = s.draft;
  if (d.peak) {
    // 巅峰对决：一键补满我方 5 个分路（不考虑全局 BP）
    if (d.over) return false;
    const filled = filledPos(d, d.mySide);
    const pos = POS.find(p => !filled.includes(p));
    if (!pos) { finishPeakDraft(); return false; }
    const hn = myPeakAutoPick(pos);
    if (!hn) { finishPeakDraft(); return false; }
    d.picks[d.mySide].push({ pos, hero: hn });
    if (d.picks[d.mySide].length >= 5) { finishPeakDraft(); return false; }
    return true;
  }
  if (d.over || d.stepIndex >= d.steps.length) {
    if (!d.over) { d.over = true; d.phase = "done"; simGame(); }
    return false;
  }
  const st = d.steps[d.stepIndex];
  if (st.type === "ban") {
    const hn = st.actor === d.mySide ? myAutoBan() : aiBanHero(st.actor);
    if (!hn) return false;                       // 我方被禁用一键BP / ban池空：停在原步，不推进
    d.bans[st.actor].push(hn); d.used.push(hn);
  } else if (st.actor === d.mySide) {
    const pk = myAutoPick();
    if (!pk) return false;                       // 同上：不跳过玩家的选将回合
    d.picks[d.mySide].push({ pos: pk.pos, hero: pk.hero }); d.used.push(pk.hero);
  } else {
    aiPickTurn(st);
  }
  d.stepIndex++;
  if (d.stepIndex >= d.steps.length) { d.over = true; d.phase = "done"; simGame(); return false; }
  return true;
}
function autoBpTick() {
  const delay = S._autoDelay != null ? S._autoDelay : AUTO_BP_DELAY;
  S._autoTimer = setTimeout(() => {
    S._autoTimer = null;
    if (!S._autoRun || !S.series || S.series.sub !== "draft") { stopAutoBp(); return; }
    const more = autoBpStep();
    save(); render();
    if (more && S._autoRun) autoBpTick(); else stopAutoBp();
  }, delay);
}
function autoBp() {
  if (!autoBpAllowed()) { toast("传奇难度（含真实大名单）禁用一键 BP，请手动 ban / 选将"); return; }
  if (S._autoRun) { stopAutoBp("已停止自动 BP"); render(); return; }
  if (!S.series || S.series.sub !== "draft" || !S.series.draft) { toast("现在不是 BP 阶段"); return; }
  if (S.series.draft.over) { toast("本局 BP 已结束"); return; }
  S._autoRun = true;
  const more = autoBpStep();   // 第一步立即执行，玩家马上看到变化
  save(); render();
  if (more && S._autoRun) autoBpTick(); else stopAutoBp();
}

/* ---------------- 系列赛页面 ---------------- */
function renderSeries() {
  const s = S.series, d = s.draft;
  const myT = getMyTeam(), opp = S.teams.find(t => t.id === s.oppId);
  const head = `${renderTopbar()}<div class="card">
    <div class="section-title">${escapeHtml(s.label)} — ${escapeHtml(myT.name)} vs ${escapeHtml(opp.name)} · BO${s.bestOf}</div>
    <div class="center muted" style="font-size:12px;margin-bottom:4px">对手 BP 水平：<b style="color:var(--gold)">${escapeHtml(aiBpLabel())}</b>${S.rosterMode === "real" ? "（真实大名单固定按传奇）" : "（由难度决定，不改战力）"} · 风格：<b style="color:var(--cyan)">${escapeHtml(personaOf(opp).name)}</b> <span title="${escapeHtml(personaOf(opp).desc)}">ⓘ</span></div>
    <div class="score-big" style="font-size:30px"><span class="w">${s.myScore}</span> : <span class="l">${s.opScore}</span></div>
    ${d && d.peak
      ? `<div class="center peak-banner" style="margin-bottom:10px"><b>⚡ 第 7 局 · 巅峰对决</b> · 无 ban 位 · 双方盲选 · 不受全局BP限制（此前用过的英雄仍可选）· 双方可选到相同英雄</div>`
      : `<div class="center muted" style="margin-bottom:10px">第 ${s.gameIndex + 1} 局 · 全局BP（按战队记）：${escapeHtml(myT.name)} 已用 ${myUsed().length} / ${escapeHtml(opp.name)} 已用 ${oppUsed().length}</div>`}`;

  if (s.sub === "over") { root.innerHTML = head + renderSeriesOver(s) + "</div>"; return; }
  if (s.sub === "preview") { root.innerHTML = head + renderPreview(s) + "</div>"; return; }
  if (s.sub === "battle") { root.innerHTML = head + renderBattle(s) + "</div>"; return; }
  if (s.sub === "result") { root.innerHTML = head + renderGameResult(s) + "</div>"; return; }
  if (s.sub === "sub") { root.innerHTML = head + renderSubBetween(s) + "</div>"; return; }

  // draft
  const mySide = d.mySide, oth = aiSide(d);
  const peak = !!d.peak;
  const playerTurn = !d.over && currentActor() === mySide;
  const sideTag = mySide === "blue" ? '<span class="pill cyan">本局我方蓝方 · 先选</span>' : '<span class="pill red">本局我方红方 · 后手Counter</span>';
  function board(side) {
    const banTxt = peak ? '<i class="muted">无（巅峰对决）</i>' : (d.bans[side].length ? d.bans[side].map(b => escapeHtml(b)).join("、") : '<i class="muted">—</i>');
    // 巅峰对决为盲选：我方填满前不揭示对手阵容
    if (peak && !d.over && side !== mySide) {
      const hiddenRows = POS.map(pos => `<div class="draft-row"><span class="pname">${POS_NAME[pos]}</span><span class="phero"><i class="muted">盲选中…</i></span></div>`).join("");
      return `<div class="draft-side foe">
      <div class="draft-head">${escapeHtml(opp.name)} · ${sideName(side)} · 盲选</div>
      <div class="draft-bans">禁：${banTxt}</div>
      ${hiddenRows}</div>`;
    }
    const rows = POS.map(pos => {
      const e = d.picks[side].find(x => x.pos === pos);
      const h = e ? heroByName(e.hero) : null;
      const fit = h ? laneFit(h, pos) : null;
      const fitHtml = h ? ` <b class="${fitClass(fit)}" style="font-size:11px">${fitLabel(fit)}</b>` : "";
      const mini = h ? `<span class="mini-radar" title="OSCM 输出${h.o}/生存${h.s}/控制${h.c}/机动${h.m}">${radarSvg([{ vals: oscmVals(h), color: "#8b96b0", fill: "rgba(139,150,176,.18)" }], 22)}</span>` : "";
      return `<div class="draft-row"><span class="pname">${POS_NAME[pos]}</span><span class="phero">${e ? escapeHtml(e.hero) + fitHtml + mini : '<i class="muted">…</i>'}</span></div>`;
    }).join("");
    return `<div class="draft-side ${side === mySide ? 'me' : 'foe'}">
      <div class="draft-head">${side === mySide ? "我方" : escapeHtml(opp.name)} · ${sideName(side)}${peak ? " · 巅峰对决" : ""}</div>
      <div class="draft-bans">禁：${banTxt}</div>
      ${rows}</div>`;
  }
  // 我方侧：选将回合变为可拖拽的分路槽
  const st = currentStep();
  const peakTurn = peak && !d.over;
  const pickTurn = peak ? peakTurn : (playerTurn && st && st.type === "pick");
  function myBoard() {
    if (!pickTurn) return board(mySide);
    const pending = S._pendingHero;
    const rows = POS.map(pos => {
      const e = d.picks[mySide].find(x => x.pos === pos);
      let heroHtml, fit = null;
      const sw = S._swapFrom === pos ? " swapfrom" : "";
      if (e) {
        const h = heroByName(e.hero);
        fit = laneFit(h, pos);
        const mini = `<span class="mini-radar" title="OSCM 输出${h.o}/生存${h.s}/控制${h.c}/机动${h.m}">${radarSvg([{ vals: oscmVals(h), color: "#34d3e0", fill: "rgba(52,211,224,.22)" }], 22)}</span>`;
        heroHtml = `<span class="chip" draggable="true" data-hero="${escapeHtml(e.hero)}">${escapeHtml(e.hero)}</span> <b class="${fitClass(fit)}" style="font-size:11px">${fitLabel(fit)}</b>${mini}`;
      }
      else if (pending) {
        const ph = heroByName(pending);
        fit = laneFit(ph, pos);
        const enemySame = d.picks[oth].find(x => x.pos === pos);
        const lbl = enemySame ? matchupLabel(ph, heroByName(enemySame.hero)) : "";
        heroHtml = `<span class="muted">放置【${escapeHtml(pending)}】</span> <b class="${fitClass(fit)}" style="font-size:11px">${fitLabel(fit)}</b>${lbl ? ` <b class="${lbl === '克制' ? 'c-good' : lbl === '被克' ? 'c-bad' : 'c-mid'}" style="font-size:11px">${lbl}</b>` : ""}`;
      }
      else heroHtml = `<span class="muted">拖拽英雄到此 / 或先点英雄</span>`;
      return `<div class="draft-row slot ${e ? 'filled' : ''} ${pending && !e ? 'hint' : ''}${sw}" data-slot="${pos}" data-act="placeslot:${pos}"><span class="pname">${POS_NAME[pos]}</span><span class="phero">${heroHtml}</span></div>`;
    }).join("");
    return `<div class="draft-side me">
      <div class="draft-head">我方 · ${sideName(mySide)}（拖拽英雄到分路）${peak ? " · 巅峰对决" : ""}</div>
      <div class="draft-bans">禁：${peak ? '<i class="muted">无（巅峰对决）</i>' : (d.bans[mySide].length ? d.bans[mySide].map(b => escapeHtml(b)).join("、") : '<i class="muted">—</i>')}</div>
      ${rows}</div>`;
  }
  let action = "";
  const banNo = d.bans[mySide].length + 1; // 我方第几个ban（共5）
  if (peakTurn) {
    // 巅峰对决：全部英雄可选（含此前用过的），无 ban、不受全局BP限制
    const pending = S._pendingHero;
    const prevUsed = myUsed();
    const benchHtml = HEROES.map(h => {
      const mst = myBestMastery(h.name);
      const mine = mst > 0;
      const star = mine ? `★${mst}` : "";
      const sel = pending === h.name ? "sel" : "";
      const tag = prevUsed.includes(h.name) ? `<em class="peak-tag" title="本系列赛用过，巅峰对决仍可选">曾用</em>` : "";
      return `<button class="hero-chip ${sel}" draggable="true" data-hero="${h.name}" data-lane="${h.pos}" data-mine="${mine ? 1 : 0}" data-act="pickhero:${h.name}" aria-label="选择 ${h.name}，${POS_NAME[h.pos]}，${ARC_NAME[h.arc]}${mine ? "，本队选手擅长" : ""}">${h.name}${star}${tag}<i class="muted" style="font-size:10px"> ${ARC_NAME[h.arc]}</i></button>`;
    }).join("");
    action = `<div class="section-title mt">⚡ 巅峰对决 · 我方盲选（${d.picks[mySide].length}/5）</div>
      <div class="warn mb peak-note">本局 <b>没有 ban 位</b>、<b>不受全局BP限制</b>：此前用过的英雄仍可选（标 <em class="peak-tag">曾用</em>），双方也可能选到<b>同一个英雄</b>。选满 5 个后立即揭示对手阵容并开赛。</div>
      ${pending ? renderPendingCard(pending) : ""}
      ${bpFilterBarHtml("bench")}
      <div class="bench" id="bench" data-scroll-id="bench">${benchHtml}</div>`;
  } else if (playerTurn && st && st.type === "ban") {
    const pool = availBanHeroes(true); // ban位池：只去掉对方全局BP用过的
    const threat = oppThreatHeroes(intelSize());
    const groups = POS.map(pos => {
      const hs = pool.filter(h => h.pos === pos); if (!hs.length) return "";
      return `<div class="mb" data-lane-group="${pos}"><div class="muted" style="font-size:12px;margin-bottom:4px">${POS_NAME[pos]}</div>
        <div class="hero-opt">${hs.map(h => `<button class="ban-btn" data-act="ban:${h.name}" data-hero="${h.name}" data-lane="${h.pos}" data-mine="${heroInMyPool(h.name) ? 1 : 0}" aria-label="禁用 ${h.name}，${POS_NAME[h.pos]}，${ARC_NAME[h.arc]}">${h.name}<i class="muted" style="font-size:10px"> ${ARC_NAME[h.arc]}</i></button>`).join("")}</div></div>`;
    }).join("");
    const intel = threat.length ? `<div class="intel mb">
      <div class="intel-h">🎯 对手擅长（按其首发选手英雄池与战力排序，建议优先 ban，数据分析师等级越高情报越多）</div>
      <div class="hero-opt">${threat.map(t => `<button class="ban-btn threat" data-act="ban:${t.name}" data-hero="${t.name}" aria-label="禁用对手擅长英雄 ${t.name}，由 ${escapeHtml(t.by)} 使用">${t.name}<i class="muted" style="font-size:10px"> ${POS_NAME[t.pos]}·${escapeHtml(t.by)}</i></button>`).join("")}</div>
      ${oppPickHistoryHtml()}
    </div>` : "";
    action = `<div class="section-title mt">禁用阶段 · 我方第 ${banNo}/5 个 ban ${sideTag} — 点击英雄禁用</div>
      <div class="muted mb" style="font-size:12px">ban 位池按<b>战队</b>过滤：已移除<b>对手战队</b>用过的英雄；本队用过的仍可 ban（只是不能再选）。</div>
      ${intel}
      ${bpFilterBarHtml("ban")}
      <div class="ban-pool" id="banpool" data-scroll-id="banpool">${groups}</div>`;
  } else if (pickTurn) {
    const bench = availHeroes();
    const pending = S._pendingHero;
    const oppPrev = oppUsed(); // 对手战队的已用英雄：本队仍可选（全局BP按战队）
    const benchHtml = bench.map(h => {
      const mst = myBestMastery(h.name);
      const mine = mst > 0;
      const star = mine ? `★${mst}` : "";
      const sel = pending === h.name ? "sel" : "";
      const otag = oppPrev.includes(h.name) ? `<em class="otag" title="对手战队用过，本队仍可选用">敌用</em>` : "";
      return `<button class="hero-chip ${sel}" draggable="true" data-hero="${h.name}" data-lane="${h.pos}" data-mine="${mine ? 1 : 0}" data-oppused="${oppPrev.includes(h.name) ? 1 : 0}" data-act="pickhero:${h.name}" aria-label="选择 ${h.name}，${POS_NAME[h.pos]}，${ARC_NAME[h.arc]}${mine ? "，本队选手擅长" : ""}${oppPrev.includes(h.name) ? "，对手用过但本队仍可选" : ""}">${h.name}${star}${otag}<i class="muted" style="font-size:10px"> ${ARC_NAME[h.arc]}</i></button>`;
    }).join("");
    action = `<div class="section-title mt">选将台（点英雄或直接拖拽到左侧分路）${sideTag}</div>
      ${pending ? renderPendingCard(pending) : ""}
      ${bpFilterBarHtml("bench")}
      <div class="bench" id="bench" data-scroll-id="bench">${benchHtml || '<div class="muted">已无可选英雄</div>'}</div>
      <div class="muted mt">★数字=我方首发对该英雄的熟练度（0~100，越高越强）；<em class="otag">敌用</em>=对手战队用过、本队仍可抢；<b>本队用过的英雄已从池中锁定</b>（与红蓝方无关，只按战队记）。键盘：<kbd>/</kbd> 搜索、方向键移动、<kbd>Enter</kbd> 选择。</div>`;
  } else {
    action = `<div class="section-title mt">对手正在选择…</div><div class="muted">BP 推进中。</div>`;
  }
  root.innerHTML = head + `
    ${renderLineupVs()}
    <div class="draft-board">${myBoard()}<div class="draft-vs">VS</div>${board(oth)}</div>
    ${renderOscmPanel(Object.fromEntries(d.picks[mySide].map(e => [e.pos, e.hero])), Object.fromEntries(d.picks[oth].map(e => [e.pos, e.hero])), opp.name)}
    ${renderPastGames()}
    <div class="flex-between mt">
      <div class="hero-opt">
        <span class="muted" style="margin-right:6px">本局战术：</span>
        <button class="btn ghost sm ${d.tactic === '稳' ? 'gold' : ''}" data-act="drafttactic:稳" aria-pressed="${d.tactic === '稳'}" aria-label="本局战术：稳健">稳健</button>
        <button class="btn ghost sm ${d.tactic === '攻' ? 'gold' : ''}" data-act="drafttactic:攻" aria-pressed="${d.tactic === '攻'}" aria-label="本局战术：激进">激进</button>
        <button class="btn ghost sm ${d.tactic === '奇' ? 'gold' : ''}" data-act="drafttactic:奇" aria-pressed="${d.tactic === '奇'}" aria-label="本局战术：奇袭">奇袭</button>
      </div>
      ${autoBpAllowed()
        ? `<button class="btn ${autoBpRunning() ? 'ghost' : 'gold'} sm" data-act="autobp" aria-label="${autoBpRunning() ? "停止自动BP" : "一键BP，自动完成剩余禁用与选将"}" title="强度略低于手动（介于新秀与职业之间）：偶尔会放过克制或随到次优英雄。可再次点击停止，快捷键 B">${autoBpRunning() ? '⏹ 停止自动BP' : '⚡ 一键BP'}</button>`
        : `<button class="btn ghost sm" disabled aria-label="传奇难度禁用一键BP，必须手动 ban 和选将" title="传奇难度（含真实大名单）禁用一键BP">🔒 一键BP（传奇禁用）</button>`}
    </div>
    ${!autoBpAllowed() ? `<div class="warn" style="border-color:rgba(255,59,59,.35);background:rgba(255,59,59,.07)">🔒 <b>传奇难度</b>（含真实大名单）下<b>禁用一键 BP</b>：请手动 ban / 选将。想用一键 BP 请切到新秀或职业难度开档。</div>` : ''}
    ${autoBpRunning() ? (peak
      ? `<div class="warn" style="border-color:rgba(245,197,24,.45);background:rgba(245,197,24,.08);color:var(--gold)">⚡ 正在自动盲选…（巅峰对决，选满 5 人即开赛）</div>`
      : `<div class="warn" style="border-color:rgba(245,197,24,.45);background:rgba(245,197,24,.08);color:var(--gold)">⚡ 自动 BP 进行中… 第 ${Math.min(d.stepIndex + 1, d.steps.length)} / ${d.steps.length} 步 · 我方 ${sideName(mySide)}（点『停止自动BP』可中止）</div>`) : ''}
    ${action}
    ${d.over ? '' : '<button class="btn ghost sm mt" data-act="abandonseries" aria-label="放弃本场系列赛并返回">放弃本场系列赛（返回）</button>'}
    </div>`;
  wireBpTools();
}
/* ---------------- BP 筛选（分路Tab / 只看我的英雄池 / 搜索 / 键盘） ---------------- */
function bpFilter() {
  if (!S._bpFilter) S._bpFilter = { lane: "all", mine: false, q: "" };
  return S._bpFilter;
}
function heroInMyPool(name) {
  const myT = getMyTeam();
  if (!myT) return false;
  return POS.some(pos => { const p = getPlayer(myT, myT.lineup[pos]); return p && (p.heroPool || []).includes(name); });
}
function bpFilterBarHtml(kind) {
  const f = bpFilter();
  const lanes = [["all", "全部"], ["top", "对抗路"], ["jungle", "打野"], ["mid", "中路"], ["bot", "发育路"], ["support", "辅助"]];
  const tabs = lanes.map(([k, n]) => `<button class="lane-tab ${f.lane === k ? "sel" : ""}" data-act="bplane:${k}" role="tab" aria-selected="${f.lane === k}" aria-pressed="${f.lane === k}" aria-label="只看${n}英雄">${n}</button>`).join("");
  return `<div class="bp-tools">
    <div class="lane-tabs" role="tablist" aria-label="分路筛选">${tabs}</div>
    <label class="bp-toggle"><input type="checkbox" id="bp-mine" ${f.mine ? "checked" : ""} aria-label="只看我的英雄池" /> 只看我的英雄池</label>
    <input id="${kind}-filter" class="bp-search" type="search" placeholder="搜索英雄（按 / 定位）…" value="${escapeHtml(f.q || "")}" aria-label="搜索英雄" />
    <span class="muted" style="font-size:11px">方向键移动 · <kbd>Enter</kbd> 确认</span>
    <span class="muted" id="bp-count" style="font-size:11px"></span>
  </div>`;
}
function bpVisibleList() {
  return Array.from(document.querySelectorAll("#bench .hero-chip, #banpool .ban-btn")).filter(el => el.offsetParent !== null);
}
function markBpFocus() {
  const list = bpVisibleList();
  list.forEach((el, i) => el.classList.toggle("kbd", i === S._bpIdx));
  if (S._bpIdx >= 0 && list[S._bpIdx]) { try { list[S._bpIdx].scrollIntoView({ block: "nearest" }); } catch (e) {} }
}
function applyBpFilter() {
  const f = bpFilter();
  const hit = el => {
    const name = el.getAttribute("data-hero") || (el.getAttribute("data-act") || "").split(":")[1] || "";
    const lane = el.getAttribute("data-lane") || "";
    if (f.lane !== "all" && lane !== f.lane) return false;
    if (f.mine && el.getAttribute("data-mine") !== "1") return false;
    if (f.q && !name.includes(f.q)) return false;
    return true;
  };
  document.querySelectorAll("#bench .hero-chip, #banpool .ban-btn").forEach(el => { el.style.display = hit(el) ? "" : "none"; });
  document.querySelectorAll("#banpool [data-lane-group]").forEach(g => {
    const any = Array.from(g.querySelectorAll(".ban-btn")).some(b => b.style.display !== "none");
    g.style.display = any ? "" : "none";
  });
  const shown = Array.from(document.querySelectorAll("#bench .hero-chip, #banpool .ban-btn")).filter(el => el.style.display !== "none").length;
  const cnt = document.getElementById("bp-count"); if (cnt) cnt.textContent = `显示 ${shown} 个`;
  const list = bpVisibleList();
  if (S._bpIdx != null && S._bpIdx > list.length - 1) S._bpIdx = list.length - 1;
  markBpFocus();
}
function wireBpTools() {
  ["bench-filter", "ban-filter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => { bpFilter().q = el.value; applyBpFilter(); });
  });
  const mineEl = document.getElementById("bp-mine");
  if (mineEl) mineEl.addEventListener("change", () => { bpFilter().mine = mineEl.checked; applyBpFilter(); });
  applyBpFilter();
}
// 对手擅长英雄（用于 ban 阶段情报）
function oppThreatHeroes(n) {
  if (!S || !S.series) return [];
  const opp = S.teams.find(t => t.id === S.series.oppId);
  if (!opp) return [];
  const best = {};
  POS.forEach(pos => {
    const p = getPlayer(opp, opp.lineup[pos]);
    if (!p) return;
    (p.heroPool || []).forEach(nm => {
      const h = heroByName(nm); if (!h) return;
      const sc = heroStrength(h) * 1.12 * laneFit(h, pos) * (POS_WEIGHT[pos] || 1);
      if (!best[nm] || best[nm].score < sc) best[nm] = { name: nm, pos, score: sc, by: p.name };
    });
  });
  const pool = new Set(availBanHeroes(true).map(h => h.name));
  return Object.values(best).filter(x => pool.has(x.name)).sort((a, b) => b.score - a.score).slice(0, n || 6);
}
// 对手本系列赛的常用 pick（ban 阶段参考）
function oppPickHistoryHtml() {
  const s = S.series;
  const cnt = {};
  (s.games || []).forEach(g => Object.values(g.oppPicks || {}).forEach(h => { if (h) cnt[h] = (cnt[h] || 0) + 1; }));
  const list = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!list.length) return `<div class="muted" style="font-size:11.5px;margin-top:6px">本系列赛对手尚无 pick 记录（第 ${s.gameIndex + 1} 局）。</div>`;
  return `<div class="muted" style="font-size:11.5px;margin-top:6px">本系列赛对手已用：${list.map(([h, c]) => `${escapeHtml(h)}${c > 1 ? `×${c}` : ""}`).join("、")}</div>`;
}
// 当前分钟胜算由 sim.js 的 battleWinRate() 提供（赛前胜算 + 局内 swing）
function renderPreview(s) {
  const b = s.battle;
  const myPow = Math.round(b.myTotal), oppPow = Math.round(b.oppTotal);
  const tot = (myPow + oppPow) || 1; const mp = Math.round(myPow / tot * 100);
  const myIsBlue = b.mySide === "blue";
  const compBadge = (c) => `<span class="pill ${c.tier === '优' ? 'green' : c.tier === '差' ? 'red' : 'gold'}">${c.tier} ${c.score}</span>`;
  const rows = POS.map(pos => {
    const mh = b.myPicks[pos], oh = b.oppPicks[pos];
    const lh = heroByName(mh), ohh = heroByName(oh);
    const lbl = matchupLabel(lh, ohh);
    const note = heroCounterNote(lh.name, ohh.name);
    return `<div class="draft-row"><span class="pname">${POS_NAME[pos]}</span><span class="phero">${escapeHtml(mh)} <i class="muted">vs</i> ${escapeHtml(oh)} <b class="${lbl === '克制' ? 'c-good' : lbl === '被克' ? 'c-bad' : 'c-mid'}">${lbl}</b>${note ? ` <i class="muted" style="font-size:11px">${escapeHtml(note)}</i>` : ""}</span></div>`;
  }).join("");
  return `<div class="section-title mt">战前 · 战力计算</div>
  <div class="pk-wrap"><div class="pk-half ${myIsBlue ? 'blue' : 'red'}" style="width:${mp}%">我方 ${myPow}</div><div class="pk-half ${myIsBlue ? 'red' : 'blue'}" style="width:${100 - mp}%">${oppPow} 对手</div></div>
  <div class="pk-labels"><span>◀ 我方战力（${sideName(b.mySide)}）</span><span>对手战力（${sideName(b.mySide === 'blue' ? 'red' : 'blue')}）▶</span></div>
  ${rows}
  ${renderOscmPanel(b.myPicks, b.oppPicks, S.teams.find(t => t.id === S.series.oppId).name)}
  <div class="mb mt"><b>我方阵容判定</b> ${compBadge(b.myComp)} <span class="muted" style="font-size:12px">${b.myComp.tips.map(escapeHtml).join("；")}</span></div>
  <div class="mb"><b>对手阵容判定</b> ${compBadge(b.oppComp)}</div>
  ${b.combos.length ? `<div class="warn" style="border-color:rgba(245,197,24,.4);background:rgba(245,197,24,.08);color:var(--gold)">触发组合体系：${b.combos.map(escapeHtml).join(" / ")}（战力 ×${b.comboMult.toFixed(2)}）</div>` : ""}
  <div class="muted mt">本局战术：<b>${b.tactic}</b> · 阵容系数 ×${b.myComp.mult.toFixed(2)}</div>
  <button class="btn gold mt" data-act="startbattle">开始比赛</button>`;
}
function renderPastGames() {
  const s = S.series;
  if (!s.games || !s.games.length) return "";
  const opp = S.teams.find(t => t.id === s.oppId);
  const myT = getMyTeam();
  const rows = s.games.map((g, i) => {
    const myH = POS.map(p => g.myPicks[p]).filter(Boolean).join("、");
    const opH = POS.map(p => g.oppPicks[p]).filter(Boolean).join("、");
    return `<div class="bk-row"><span class="bk-label">第${i + 1}局${g.peak ? '<b class="peak-mark">巅峰对决</b>' : ""}</span><span>"${escapeHtml(myH)}" VS "${escapeHtml(opH)}" <b class="${g.winner === 'me' ? 'c-good' : 'c-bad'}">${g.winner === 'me' ? '胜' : '负'}</b></span></div>`;
  }).join("");
  // 按战队统计已用英雄（与红蓝方无关，阵营每局互换也不影响归属）
  const teamBlock = (name, list, cls) => `<div class="mb"><div class="muted" style="font-size:12px;margin-bottom:4px"><b class="${cls}">${escapeHtml(name)}</b> 已用 ${list.length} 个 · 本队后续局不可再选${cls === 'c-bad' ? '（且已从你 ban 位池移除）' : '（仍可被 ban）'}</div><div class="hero-opt">${list.length ? list.map(h => `<span class="tag even">${escapeHtml(h)}</span>`).join("") : '<i class="muted">—</i>'}</div></div>`;
  return `<div class="section-title mt">往期对局英雄（本系列赛）</div><div class="bracket">${rows}</div>
  <div class="section-title mt">全局BP 已用英雄 · 按战队记（红蓝方每局互换不改变归属）</div>
  ${teamBlock(`${myT.name}（本队）`, myUsed(), "c-good")}
  ${teamBlock(`${opp.name}（对手）`, oppUsed(), "c-bad")}`;
}
function battleFeedHtml(b) {
  // 最新战况在最上面（不提前告知本局总时长）
  return b.lines.slice().reverse().map(l => `<div class="report-line ${l.surprise ? 'sp' : ''}"><span class="tag ${l.surprise ? 'key' : 'even'}">${l.surprise ? '⚡' : '战'}</span><span class="body">${escapeHtml(l.text)}</span></div>`).join("");
}
function renderBattle(s) {
  const b = s.battle;
  const pct = Math.min(100, Math.round(b.minute / b.duration * 100));
  const wr = battleWinRate(b);
  const myPct = Math.round(wr * 100), oppPct = 100 - myPct;
  const mySide = b.mySide, oth = mySide === "blue" ? "red" : "blue";
  const myIsBlue = mySide === "blue";
  // 胜率条：左=我方（标注红/蓝），右=对手（标注红/蓝），避免混淆
  const bar = `
  <div class="pk-wrap" role="img" aria-label="实时胜算：我方 ${myPct}%，对手 ${oppPct}%">
    <div class="pk-half ${myIsBlue ? 'blue' : 'red'}" id="battle-bar-me" style="width:${myPct}%">我方·${sideName(mySide)} ${myPct}%</div>
    <div class="pk-half ${myIsBlue ? 'red' : 'blue'}" id="battle-bar-op" style="width:${oppPct}%">${oppPct}% 对手·${sideName(oth)}</div>
  </div>
  <div class="pk-labels"><span>◀ 我方（${sideName(mySide)}${myIsBlue ? '，先选' : '，后手Counter'}）</span><span>（${sideName(oth)}）对手 ▶</span></div>`;
  const feed = battleFeedHtml(b);
  return `<div class="section-title mt">本局进行中（实时战况，最新在上）</div>
  ${bar}
  <div class="center muted mt">第 <b id="battle-minute">${b.minute}</b> 分钟 · 系列赛 ${s.myScore} : ${s.opScore}</div>
  <div class="battle-feed mt" id="battle-feed" data-scroll-id="battle-feed" aria-live="polite" aria-label="实时战况播报">${feed || '<div class="muted">双方进入召唤师峡谷…</div>'}</div>
  <div class="action-spacer"></div>
  <div class="action-bar" role="toolbar" aria-label="战斗操作条">
    <div class="ab-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="本局进度"><i id="battle-progress" style="width:${pct}%"></i></div>
    <div class="ab-btns">
      <span class="muted" style="font-size:12px">按 <kbd>S</kbd> 也可跳过</span>
      <button class="btn gold" data-act="battleskip" aria-label="跳过战斗，直接看结果">⏭ 跳过战斗</button>
    </div>
  </div>`;
}
/* 战斗页局部更新：只改播报区/进度/胜率条，不再整页重绘（避免滚动与按钮跳动） */
function patchBattle() {
  const b = S && S.series && S.series.battle;
  const feed = document.getElementById("battle-feed");
  if (!b || !feed) { render(); return; }
  feed.innerHTML = battleFeedHtml(b) || '<div class="muted">双方进入召唤师峡谷…</div>';
  const m = document.getElementById("battle-minute"); if (m) m.textContent = b.minute;
  const pct = Math.min(100, Math.round(b.minute / b.duration * 100));
  const pr = document.getElementById("battle-progress");
  if (pr) pr.style.width = pct + "%";
  const wr = battleWinRate(b), my = Math.round(wr * 100), op = 100 - my;
  const me = document.getElementById("battle-bar-me"), fo = document.getElementById("battle-bar-op");
  const sideTxt = sideName(b.mySide), othTxt = sideName(b.mySide === "blue" ? "red" : "blue");
  if (me) { me.style.width = my + "%"; me.textContent = `我方·${sideTxt} ${my}%`; }
  if (fo) { fo.style.width = op + "%"; fo.textContent = `${op}% 对手·${othTxt}`; }
}
function renderGameResult(s) {
  const g = s.games[s.games.length - 1];
  const win = g.winner === "me";
  const rows = POS.map(pos => {
    const lh = heroByName(g.myPicks[pos]), oh = heroByName(g.oppPicks[pos]);
    const lbl = matchupLabel(lh, oh);
    return `<div class="draft-row"><span class="pname">${POS_NAME[pos]}</span><span class="phero">${escapeHtml(g.myPicks[pos])} <i class="muted">vs</i> ${escapeHtml(g.oppPicks[pos])} <b class="${lbl === '克制' ? 'c-good' : lbl === '被克' ? 'c-bad' : 'c-mid'}">${lbl}</b></span></div>`;
  }).join("");
  const comboTxt = (g.combos && g.combos.length) ? `<div class="warn mt" style="border-color:rgba(245,197,24,.4);background:rgba(245,197,24,.08);color:var(--gold)">触发组合体系：${g.combos.map(c => escapeHtml(c)).join(" / ")}（我方战力加成）</div>` : "";
  const oppComboTxt = (g.oppCombos && g.oppCombos.length) ? `<div class="muted mt">对手组合：${g.oppCombos.map(c => escapeHtml(c)).join(" / ")}</div>` : "";
  return `<div class="section-title mt">第 ${s.games.length} 局结果${g.peak ? ' <b class="peak-mark">⚡ 巅峰对决</b>' : ""}</div>
  <div class="warn" style="${win ? 'border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)' : ''}">${win ? '✅ 本局获胜' : '❌ 本局落败'} · 系列赛比分 ${s.myScore} : ${s.opScore}</div>
  ${rows}${comboTxt}${oppComboTxt}
  ${renderLineupVs()}
  <div class="muted mt">${g.peak ? "⚡ 巅峰对决结束，本系列赛收官（本局英雄不写入全局BP池）。" : "本局我方选将后续局不可再用（但仍可ban）；对方选将从ban位池移除。可先换人再进入下一局。"}</div>
  <button class="btn gold mt" data-act="seriesnext">下一局 · 准备</button>`;
}
function renderSubBetween(s) {
  const t = getMyTeam();
  const avg = Math.round(POS.reduce((a, pos) => { const p = getPlayer(t, t.lineup[pos]); return a + (p ? p.st : 0); }, 0) / 5);
  const worn = POS.filter(pos => { const p = getPlayer(t, t.lineup[pos]); return p && p.st <= 55; });
  const rows = POS.map(pos => {
    const opts = t.players[pos].map(p => {
      const st = p.st <= 45 ? " <b class=\"c-bad\">体" + Math.round(p.st) + "</b>" : p.st <= 60 ? " <b class=\"c-mid\">体" + Math.round(p.st) + "</b>" : "";
      return `<button class="btn ${t.lineup[pos] === p.id ? 'gold' : 'ghost'} sm" data-act="setlineup:${pos}:${p.id}" aria-label="将 ${escapeHtml(p.name)} 设为${POS_NAME[pos]}首发，总评${p.ovr}，体能${Math.round(p.st)}">${escapeHtml(p.name)}${p.status === 'inj' ? '🚑' : ''}${st}</button>`;
    }).join(" ");
    const cur = getPlayer(t, t.lineup[pos]);
    const warn = cur && cur.st <= 55 ? `<b class="c-bad" style="font-size:11px;margin-left:6px">⚠ 体能 ${Math.round(cur.st)}</b>` : "";
    return `<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--line)">
      <div><b style="color:var(--gold)">${POS_NAME[pos]}</b> <span class="muted">${escapeHtml(cur.name)} 体${Math.round(cur.st)}${cur.status !== 'ok' ? ' ' + statusLabel(cur)[1] : ''}</span>${warn}</div>
      <div class="hero-opt">${opts}</div></div>`;
  }).join("");
  // 败方选边（巅峰对决为盲选，没有先手/后手之分，无需选边）
  let sideBlock = "";
  const nextPeak = isPeakGame(s);
  const locked = !!s.sideLocked;
  if (nextPeak) {
    sideBlock = `<div class="warn mt peak-note">下一局是 <b>⚡ 巅峰对决</b>：双方盲选，没有先选/后手之分，无需选边（也没有 ban 位）。</div>`;
  } else if (s.nextSideBy === "me") {
    sideBlock = `<div class="section-title mt">败方选边（上局你落败，由你选择下一局阵营）</div>
      <div class="hero-opt">
        <button class="btn ${s.nextSide === 'blue' ? 'gold' : 'ghost'} sm" data-act="chooseside:blue" ${locked ? "disabled" : ""} aria-pressed="${s.nextSide === 'blue'}" aria-label="选择蓝方，先选英雄">${s.nextSide === 'blue' && locked ? '✓ ' : ''}蓝方（先选）</button>
        <button class="btn ${s.nextSide === 'red' ? 'gold' : 'ghost'} sm" data-act="chooseside:red" ${locked ? "disabled" : ""} aria-pressed="${s.nextSide === 'red'}" aria-label="选择红方，后手 Counter">${s.nextSide === 'red' && locked ? '✓ ' : ''}红方（后手Counter）</button>
      </div>
      <div class="muted mt">${locked ? `<b class="c-good">已锁定：${sideName(s.nextSide)}</b> · 正在进入第 ${s.gameIndex + 1} 局 BP…` : "选择后即锁定（不可反悔），并自动进入下一局 BP。"}</div>`;
  } else if (s.nextSideBy === "opp") {
    sideBlock = `<div class="warn mt">上局对手落败，对手选择了下一局阵营：<b>${sideName(s.nextSide)}</b>。</div>`;
  }
  return `<div class="section-title mt">局间换人（第 ${(s.games || []).length + 1} 局前 · 系列赛 ${s.myScore} : ${s.opScore}）</div>
  <div class="muted mb">上一局后选手体能下降（每局 -${staminaCostPerGame()}）、状态可能波动。当前首发平均体能 <b class="${avg <= 55 ? 'c-bad' : ''}">${avg}</b>${worn.length ? ` · <b class="c-bad">${worn.map(p => POS_NAME[p]).join("/")} 体能告急</b>` : ""}。
    <br><b>系列赛进行中不能全队休息</b>（大场打完后才能休息），这段只能靠<b>换人</b>和<b>一键轮换</b>调度体能。</div>
  <div class="hero-opt mb">
    <button class="btn ghost sm" data-act="rotate" aria-label="一键轮换建议，自动换上体能更好的替补">🔄 一键轮换建议</button>
    <span class="muted" style="font-size:12px;align-self:center">局间仅可换人 · 全队休息需等本场结束</span>
  </div>
  ${sideBlock}
  ${rows}
  <button class="btn gold mt" data-act="seriesstartgame" ${(!nextPeak && s.nextSideBy === "me" && !s.nextSide) ? "disabled" : ""}>开始第 ${(s.games || []).length + 1} 局 BP</button>`;
}
// 双方出场选手（ID + 评级/总评）
function renderLineupVs() {
  const s = S.series;
  const myT = getMyTeam(), opp = S.teams.find(t => t.id === s.oppId);
  const row = (team) => POS.map(pos => {
    const p = getPlayer(team, team.lineup[pos]);
    const rc = ratingColor(p.rating);
    return `<span class="pill" style="font-size:11px">${POS_NAME[pos]} <b>${escapeHtml(p.name)}</b> <span style="color:${rc}">${p.rating}</span>${p.ovr}</span>`;
  }).join(" ");
  return `<div class="section-title mt">双方出场选手</div>
  <div class="mb"><div class="muted" style="font-size:12px;margin-bottom:4px">我方 ${escapeHtml(myT.name)}</div><div class="hero-opt">${row(myT)}</div></div>
  <div class="mb"><div class="muted" style="font-size:12px;margin-bottom:4px">${escapeHtml(opp.name)}</div><div class="hero-opt">${row(opp)}</div></div>`;
}
function renderSeriesOver(s) {
  const win = s.myScore > s.opScore;
  const rw = s.rewards || { money: 0, fans: 0 };
  const gameLines = s.games.map((g, i) => `<div class="report-line"><span class="tag ${g.winner === 'me' ? 'win' : 'lose'}">${g.winner === 'me' ? '胜' : '负'}</span><span class="body">第${i + 1}局${g.peak ? '<b class="peak-mark">巅峰对决</b>' : ""}（我方${sideName(g.mySide)}）：${POS.map(p => `${POS_NAME[p]}${g.myPicks[p]}`).join("/")} 击败/负于 ${POS.map(p => g.oppPicks[p]).join("/")}</span></div>`).join("");
  const opp = S.teams.find(t => t.id === s.oppId);
  const usedNote = `全局BP按<b>战队</b>记（与红蓝方无关）：${escapeHtml(getMyTeam().name)} 已用 ${myUsed().length} 个（本队后续局不可再选、但仍可 ban）；${escapeHtml(opp.name)} 已用 ${oppUsed().length} 个（从本队 ban 位池移除，其英雄本队仍可选）。`;
  const myT2 = getMyTeam();
  const starters2 = POS.map(p => getPlayer(myT2, myT2.lineup[p])).filter(Boolean);
  const avgSt = starters2.length ? Math.round(starters2.reduce((a, p) => a + p.st, 0) / starters2.length) : 0;
  const tired = POS.filter(p => { const pl = getPlayer(myT2, myT2.lineup[p]); return pl && pl.st <= 55; });
  return `<div class="center muted">BO${s.bestOf} · ${win ? '🏆 系列赛胜利！' : '💢 系列赛落败'}</div>
  <div class="warn mt" style="${win ? 'border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)' : ''}">${win ? `胜利！资金 +${rw.money}万，粉丝 +${rw.fans.toLocaleString()}。` : `落败。粉丝 ${rw.fans >= 0 ? '+' : ''}${rw.fans.toLocaleString()}。`}</div>
  <div class="warn mt" style="border-color:rgba(245,197,24,.35);background:rgba(245,197,24,.06);color:var(--gold)">
    赛后体能：本场 ${s.games.length} 局，首发平均体能 <b>${avgSt}</b>。
    ${tired.length ? `⚠ ${tired.map(p => POS_NAME[p]).join("、")} 体能偏低（≤55）→ 下一轮开始前自动恢复 +${ROUND_STAMINA_GAIN}；本场已结束，现在就可以让队伍休息。` : "队伍体能状况良好，可直接进入下一轮。"}
    <div class="hero-opt" style="margin-top:8px">
      <button class="btn gold sm" data-act="rest" ${S.trainPoints < 2 ? "disabled" : ""} aria-label="全队休息，消耗 2 训练点，恢复体能 ${restGain()}">🛌 全队休息（-2 训练点 · 体能 +${restGain()}）</button>
      <span class="muted" style="font-size:11.5px;align-self:center">大场已结束，这是本场唯一能休息的时机（剩余训练点 ${S.trainPoints}）</span>
    </div>
  </div>
  <div class="section-title mt">各局回顾</div>${gameLines}
  ${renderLineupVs()}
  <div class="muted mt">${usedNote}</div>
  <button class="btn gold mt" data-act="seriescontinue" aria-label="继续，返回主界面">继续</button>`;
}

/* ---------------- 事件弹窗 ---------------- */
function showEventModal() {
  const e = S.event; if (!e) return;
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "event-mask";
  const old = document.getElementById("event-mask"); if (old) old.remove();
  mask.innerHTML = `<div class="modal"><h3>📰 ${escapeHtml(e.title)}</h3><p>${escapeHtml(e.text)}</p>
    <div class="warn" style="margin-bottom:14px">${escapeHtml(e.msg)}</div>
    <button class="btn" data-act="closeevent" style="width:100%">知道了</button></div>`;
  document.body.appendChild(mask);
  mask.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b) handleAct(b.getAttribute("data-act")); });
}
function renderEvent() { renderMain(); }
