/* =====================================================================
   state.js — 状态与交互：存档 / 动作 / 键鼠事件 / 启动
   由 game.js 拆分而来（v10）。所有文件按 index.html 中的顺序加载。
   ===================================================================== */

/* ---------------- 交互 ---------------- */
root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el) handleAct(el.getAttribute("data-act")); });

/* ---------------- 键盘快捷键 / 帮助 ---------------- */
const TAB_SHORTCUTS = [["team", "战队"], ["train", "训练"], ["lineup", "阵容"], ["schedule", "赛程"], ["standings", "积分榜"], ["market", "转会"], ["prestige", "声望"], ["format", "赛制"]];
function closeTopModal() {
  const ids = ["help-mask", "name-mask", "confirm-mask", "newgame-mask", "event-mask", "transfer-mask"];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (typeof el._cancel === "function") { el._cancel(); return true; } // 让 Promise 正常 resolve
    el.remove();
    if (id === "event-mask" && S) { S.event = null; save(); }
    if (id === "newgame-mask" && S) S.page = "title";
    return true;
  }
  return false;
}
function showHelp() {
  const old = document.getElementById("help-mask"); if (old) old.remove();
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "help-mask";
  mask.setAttribute("role", "dialog"); mask.setAttribute("aria-modal", "true"); mask.setAttribute("aria-label", "快捷键与帮助");
  const rows = [
    ["1 ~ 8", "切换主菜单页签（战队 / 训练 / 阵容 / 赛程 / 积分榜 / 转会 / 声望 / 赛制）"],
    ["/", "聚焦英雄搜索框（BP 阶段）"],
    ["方向键", "在英雄列表中移动高亮（↑↓ 跨行、←→ 逐个）"],
    ["Enter", "选择 / 禁用当前高亮的英雄"],
    ["B", "一键 BP / 停止自动 BP（传奇难度与真实大名单禁用）"],
    ["S", "战斗中跳过（直接看结果）"],
    ["R", "一键轮换建议（首发体能偏低时）"],
    ["Esc", "关闭弹窗 / 取消待放置的英雄"],
    ["?", "打开本帮助"]
  ];
  mask.innerHTML = `<div class="modal"><h3>⌨️ 快捷键 / 无障碍</h3>
    <div class="muted mb" style="font-size:12.5px">所有按钮都可 Tab 聚焦、Enter 触发；选手卡与属性条都带读屏标签（会完整读出选手名、位置、评级、年龄合同与五项属性），不再只念「操作/意识/配合」。</div>
    ${rows.map(([k, d]) => `<div class="report-line"><span class="tag key">${k}</span><span class="body">${d}</span></div>`).join("")}
    <button class="btn" data-act="closehelp" style="width:100%;margin-top:8px">知道了</button></div>`;
  document.body.appendChild(mask);
  mask.addEventListener("click", e => {
    if (e.target === mask) { mask.remove(); return; }
    const b = e.target.closest("[data-act]");
    if (b && b.getAttribute("data-act") === "closehelp") mask.remove();
  });
}
document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || tag === "select";
  if (e.key === "Escape") {
    if (closeTopModal()) { e.preventDefault(); return; }
    if (S) {
      S._pendingHero = null; S._swapFrom = null;
      if (S.series && S.series.sub === "draft") { e.preventDefault(); render(); }
    }
    return;
  }
  if (e.key === "?") {
    if (typing) return;             // 输入框里打问号不应弹帮助
    e.preventDefault(); showHelp(); return;
  }
  if (typing || !S) return;
  if (bpHandleKey(e)) return;
  const k = e.key;
  if (k === "/") {
    const el = document.getElementById("bench-filter") || document.getElementById("ban-filter");
    if (el) { e.preventDefault(); el.focus(); if (el.select) el.select(); }
    return;
  }
  if (k >= "1" && k <= "8") {
    const t = TAB_SHORTCUTS[parseInt(k, 10) - 1];
    if (t && S.page === "main" && !S.gameOver) { e.preventDefault(); S.tab = t[0]; render(); }
    return;
  }
  if (k === "s" || k === "S") { if (S.series && S.series.sub === "battle") { e.preventDefault(); skipBattle(); } return; }
  if (k === "b" || k === "B") { if (S.series && S.series.sub === "draft") { e.preventDefault(); autoBp(); } return; }
  if (k === "r" || k === "R") { if (S.page === "main" && !S.gameOver) { e.preventDefault(); applyRotation(false); } return; }
});
function bpHandleKey(e) {
  const k = e.key;
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(k)) return false;
  const list = bpVisibleList();
  if (!list.length) return false;
  if (k === "Enter") {
    const i = S._bpIdx == null ? 0 : S._bpIdx;
    if (list[i]) { e.preventDefault(); list[i].click(); return true; }
    return false;
  }
  let i = S._bpIdx == null ? -1 : S._bpIdx;
  if (k === "ArrowRight") i = Math.min(list.length - 1, i + 1);
  else if (k === "ArrowLeft") i = Math.max(0, i - 1);
  else if (k === "ArrowDown") i = Math.min(list.length - 1, i + 5);
  else if (k === "ArrowUp") i = Math.max(0, i - 5);
  else if (k === "Home") i = 0;
  else if (k === "End") i = list.length - 1;
  S._bpIdx = i;
  e.preventDefault();
  markBpFocus();
  return true;
}

/* 拖拽选将：英雄芯片 -> 分路槽 */
root.addEventListener("dragstart", (e) => {
  const chip = e.target.closest("[data-hero]");
  if (!chip) return;
  S._pendingHero = chip.getAttribute("data-hero");
  try { e.dataTransfer.setData("text/plain", S._pendingHero); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
});
root.addEventListener("dragover", (e) => {
  const slot = e.target.closest("[data-slot]");
  if (!slot) return;
  e.preventDefault();
  try { e.dataTransfer.dropEffect = "move"; } catch (err) {}
  slot.classList.add("dragover");
});
root.addEventListener("dragleave", (e) => {
  const slot = e.target.closest("[data-slot]");
  if (slot) slot.classList.remove("dragover");
});
root.addEventListener("drop", (e) => {
  const slot = e.target.closest("[data-slot]");
  if (!slot) return;
  e.preventDefault();
  slot.classList.remove("dragover");
  let hero = S._pendingHero;
  try { const dt = e.dataTransfer.getData("text/plain"); if (dt) hero = dt; } catch (err) {}
  const pos = slot.getAttribute("data-slot");
  const d = S.series && S.series.draft;
  if (hero && d) {
    const placed = d.picks[d.mySide].find(x => x.hero === hero);
    if (placed) {
      // 拖的是已放置英雄 -> 与目标槽互换（仅已放置的槽之间，不可反悔/不可移出）
      const target = d.picks[d.mySide].find(x => x.pos === pos);
      if (target && target.pos !== placed.pos) swapSlots(placed.pos, pos);
    } else {
      draftPick(pos, hero);
    }
  }
  S._pendingHero = null;
});
// 分路槽点击：空槽=放置待选；已放置=选中/完成对调（不可撤销BP）
function handleSlotClick(pos) {
  const d = S.series && S.series.draft; if (!d) return;
  const e = d.picks[d.mySide].find(x => x.pos === pos);
  if (e) {
    if (!S._swapFrom) { S._swapFrom = pos; render(); return; }
    if (S._swapFrom === pos) { S._swapFrom = null; render(); return; }
    swapSlots(S._swapFrom, pos); S._swapFrom = null; render(); return;
  }
  const hero = S._pendingHero;
  if (hero) { draftPick(pos, hero); S._pendingHero = null; }
}
function swapSlots(a, b) {
  const s = S.series, d = s.draft; if (!d) return;
  const ea = d.picks[d.mySide].find(x => x.pos === a);
  const eb = d.picks[d.mySide].find(x => x.pos === b);
  if (!ea || !eb) return;
  const tmp = ea.hero; ea.hero = eb.hero; eb.hero = tmp;
  toast(`已对调 ${POS_NAME[a]} 与 ${POS_NAME[b]} 的英雄（不可反悔BP）`);
  save();
}
function handleAct(act) {
  const [cmd, ...args] = act.split(":");
  if (cmd === "newgame") return openNewGame(parseInt(args[0], 10) || 1);
  if (cmd === "loadslot") return load(parseInt(args[0], 10) || 1);
  if (cmd === "exportslot") return exportSave(parseInt(args[0], 10) || 1);
  if (cmd === "importsave") { const fi = document.getElementById("import-file"); if (fi) fi.click(); return; }
  if (cmd === "renameslot") {
    const n = parseInt(args[0], 10) || 1, m = slotMeta(n);
    return nameDialog({
      title: `重命名存档 ${n}`,
      value: m ? m.name : "",
      placeholder: m ? m.team : "",
      tip: "给这个存档起个名字，标题界面会用它来区分不同存档（例如「AG王朝」「真实名单挑战」）。留空则恢复显示战队名。"
    }).then(v => { if (v !== null) renameSlot(n, v); });
  }
  if (cmd === "renamecurrent") {
    if (!S || !S.slot) return;
    const team = getMyTeam();
    return nameDialog({
      title: `重命名当前存档（存档 ${S.slot}）`,
      value: S.saveName || "",
      placeholder: team ? team.name : "",
      tip: "名字会自动保存，标题界面显示。留空则恢复显示战队名。"
    }).then(v => { if (v !== null) renameSlot(S.slot, v); });
  }
  if (cmd === "delslot") {
    const n = parseInt(args[0], 10) || 1, m = slotMeta(n);
    return confirmDialog({
      title: `删除存档 ${n}？`,
      body: m ? `将删除 <b>${escapeHtml(m.team)}</b> · S${m.season} 第 ${m.round} 轮的进度（${m.wins}胜${m.losses}负）。<br><b style="color:var(--red2)">此操作不可恢复</b>，建议先导出备份。` : "该槽位为空。",
      okText: "确认删除", danger: true
    }).then(ok => { if (ok) deleteSlot(n); });
  }
  if (cmd === "showhelp") return showHelp();
  if (cmd === "undo") return undoLast();
  if (cmd === "undoclear") return clearUndo();
  if (cmd === "rotate") return applyRotation(false);
  if (cmd === "continue") { load(); return; }
  if (cmd === "closeevent") { S.event = null; const m = document.getElementById("event-mask"); if (m) m.remove(); save(); render(); return; }
  if (cmd === "closetransfer") { const m = document.getElementById("transfer-mask"); if (m) m.remove(); return; }
  if (cmd === "tab") { S.tab = args[0]; if (args[0] === "market" && !S.market) { buildMarket(); save(); } render(); return; }
  if (cmd === "rest") { restTeam(); return; }
  if (cmd === "hirestaff") { hireStaff(args[0]); return; }
  if (cmd === "train") { doTrain(args[0], args[1]); return; }
  if (cmd === "herotrain") { openHeroTrain(args[0]); return; }
  if (cmd === "setlineup") { setLineup(args[0], args[1]); return; }
  if (cmd === "startmatch") { startMatch(); return; }
  if (cmd === "ban") { draftBan(args[0]); return; }
  if (cmd === "pick") { draftPick(args[0], args[1]); return; }
  if (cmd === "pickhero") { S._pendingHero = (S._pendingHero === args[0]) ? null : args[0]; render(); return; }
  if (cmd === "placeslot") { handleSlotClick(args[0]); return; }
  if (cmd === "battleskip") { skipBattle(); return; }
  if (cmd === "startbattle") { const s = S.series; if (s && s.sub === "preview") { s.sub = "battle"; startBattleTick(); save(); render(); } return; }
  if (cmd === "chooseside") {
    const s = S.series;
    if (!s || s.nextSideBy !== "me" || s.sideLocked) return;   // 锁定后不再响应，防止反复横跳
    s.nextSide = args[0]; s.sideLocked = true;
    s.nextSideBy = "me";
    save(); render();
    toast(`已锁定 ${sideName(s.nextSide)}，进入第 ${s.gameIndex + 1} 局`);
    setTimeout(() => {
      if (S && S.series === s && S.series.sub === "sub" && S.series.sideLocked) { S.series.sideLocked = false; newGameDraft(); }
    }, 750);
    return;
  }
  if (cmd === "drafttactic") { S.series.draft.tactic = args[0]; render(); return; }
  if (cmd === "autobp") { autoBp(); return; }
  if (cmd === "bplane") { bpFilter().lane = args[0]; render(); return; }
  if (cmd === "seriesnext") { S.series.sub = "sub"; save(); render(); return; }
  if (cmd === "seriesstartgame") { newGameDraft(); return; }
  if (cmd === "seriescontinue") { seriesContinue(); return; }
  if (cmd === "abandonseries") {
    confirmDialog({
      title: "放弃本场系列赛？",
      body: "本场将按 <b>0 : " + Math.ceil(S.series.bestOf / 2) + "</b> 判负处理（战绩、声望都会受影响），并返回主界面。BP 进度会丢失。",
      okText: "放弃并返回", danger: true
    }).then(ok => {
      if (!ok) return;
      stopAutoBp(); S.series = null; S.page = "main"; save(); render();
    });
    return;
  }
  if (cmd === "newseason") {
    const nextS = S.season + 1;
    return confirmDialog({
      title: `开启第 ${nextS} 赛季？`,
      body: `本赛季战绩会被写入历史（不可回退），随后：<br>• 各队补充赛季奖金、选手<b>合同 −1 个赛季</b>（<b>每 3 个赛季年龄 +1</b>）<br>• <b>27 岁以上的选手整体属性逐季下滑</b><br>• 合同到期的选手将<b>续约或离队</b><br>• 赛程重置，转会窗口重新开放<br><br>当前声望 <b>${Math.round(getMyTeam().prestige)}</b>。`,
      okText: "开启新赛季"
    }).then(ok => { if (ok) newSeason(); });
  }
  if (cmd === "marketbuy") { marketBuy(args[0]); return; }
  if (cmd === "marketsell") { marketSell(args[0]); return; }
  if (cmd === "fanmeet") { holdFanMeeting(); return; }
  if (cmd === "trainbreak") { trainBreakthrough(args[0]); return; }
  if (cmd === "loanin") { loanSign(args[0]); return; }
  if (cmd === "loanreturn") { loanReturnById(args[0]); return; }
  if (cmd === "renew") { renewContract(args[0]); return; }
  if (cmd === "confirmnew") { confirmNewGame(); return; }
  if (cmd === "cancelnew") { S.page = "title"; render(); return; }
  if (cmd === "restartgame") {
    const slot = (S && S.slot) || 1;
    return confirmDialog({ title: "删除本存档并重开？", body: `存档 ${slot} 的进度将被清空。`, okText: "清空重开", danger: true }).then(ok => {
      if (!ok) return;
      try { localStorage.removeItem(slotKey(slot)); } catch (e) {}
      S = null; render();
    });
  }
}
function ngModalHtml() {
  const ng = S._ng;
  const teamBtns = TEAMS.map(t => `<button class="btn ghost sm ${ng.teamName === t ? 'gold' : ''}" data-act="selteam:${encodeURIComponent(t)}" aria-pressed="${ng.teamName === t}">${t}</button>`).join(" ");
  const diffBtn = d => `<button class="btn ghost sm ${ng.difficulty === d ? 'gold' : ''}" data-act="seldiff:${d}" aria-pressed="${ng.difficulty === d}" aria-label="难度 ${d}">${d}</button>`;
  const rosterBtn = (k, name, tip) => `<button class="btn ghost sm ${ng.rosterMode === k ? 'gold' : ''}" data-act="selroster:${k}" aria-pressed="${ng.rosterMode === k}" aria-label="名单模式 ${name}：${tip}">${name}</button>`;
  const teamNow = ng.teamName ? escapeHtml(ng.teamName) : "随机";
  const occupied = slotMeta(ng.slot || 1);
  const diffTip = {
    新秀: "会犯小错：不读你的英雄池、基本不针对克制，偶尔拿舒适英雄；但仍会认分路、挑强英雄。可用一键BP（强度略低于职业）。",
    职业: "常规教练：会读克制、会照顾自家选手擅长、会补阵容前排与输出。可用一键BP，但它<b>打不过手动</b>。",
    传奇: "近乎最优：几乎总拿最强解，ban 直指你的核心英雄，选将严丝合缝。<b>该难度禁用一键 BP</b>，必须手动 ban/选。"
  }[ng.difficulty] || "";
  return `<div class="modal" role="dialog" aria-modal="true" aria-label="开启新赛季"><h3>开启新赛季</h3>
    <p>难度与名单是<b>两个独立维度</b>：<b>难度只决定对手的 BP 水平</b>（ban/选将有多强），<b>不改任何战力与属性</b>；名单决定 12 队怎么分人。</p>
    ${occupied ? `<div class="warn mb" style="border-color:rgba(255,59,48,.5)">⚠ 存档 ${ng.slot || 1} 已有进度（${escapeHtml(occupied.team)} · S${occupied.season} 第 ${occupied.round} 轮），<b>确认后将被覆盖</b>。</div>` : ""}
    <div class="muted mb">难度 / 对手 BP 水平（当前：<b style="color:var(--gold)">${ng.difficulty}</b>）：</div>
    <div class="hero-opt">${diffBtn("新秀")}${diffBtn("职业")}${diffBtn("传奇")}<button class="btn ghost sm" data-act="seldiffrand" aria-label="随机难度">🎲 随机</button></div>
    <div class="muted" style="font-size:12px;margin:6px 0 12px;line-height:1.6">${diffTip}</div>
    <div class="muted mb">名单模式（当前：<b style="color:var(--gold)">${ng.rosterMode === "real" ? "真实大名单" : "平衡选秀"}</b>）：</div>
    <div class="hero-opt mb">${rosterBtn("draft", "平衡选秀", "蛇形分配，各队战力接近")}${rosterBtn("real", "真实大名单", "按 2025 KPL 名单绑定，强队更强")}</div>
    <div class="muted" style="font-size:12px;margin-bottom:10px">${ng.rosterMode === "real" ? "真实名单：12 队按 <b>2025 KPL 真实大名单</b>绑定首发/替补（强队更强、不平均分配）。<b>该名单下对手 BP 水平固定按「传奇」处理</b>（与所选难度无关）。" : "平衡选秀：按总评蛇形分配（每队一强一弱），各队开局战力接近；对手 BP 水平按上面的难度决定。"}</div>
    <div class="muted mb">选择战队（当前：<b style="color:var(--gold)">${teamNow}</b>）：</div>
    <div class="hero-opt" style="max-height:150px;overflow:auto">
      <button class="btn ghost sm ${ng.teamName === "" ? 'gold' : ''}" data-act="selrandom" aria-label="随机战队">🎲 随机战队</button>
      ${teamBtns}
    </div>
    <div class="flex-between mt"><input id="team-input" placeholder="或输入自定义战队名" value="${escapeHtml(ng.teamName)}" aria-label="自定义战队名称" style="flex:1;background:var(--bg2);border:1px solid var(--line);color:var(--txt);padding:9px 12px;border-radius:9px" /></div>
    <div class="opts mt"><button class="btn gold" data-act="confirmnew">确认，开始执教！</button><button class="btn ghost" data-act="cancelnew">返回</button></div></div>`;
}
function openNewGame(slot) {
  S = S || {};
  const s = clamp(slot || 1, 1, SLOT_COUNT);
  S._ng = { difficulty: "职业", teamName: "", rosterMode: "draft", slot: s };
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "newgame-mask";
  const renderNg = () => { mask.innerHTML = ngModalHtml(); };
  renderNg();
  document.body.appendChild(mask);
  mask.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.getAttribute("data-act");
    const inp = () => document.getElementById("team-input");
    if (a.startsWith("seldiff:")) { const i = inp(); if (i && i.value.trim()) S._ng.teamName = i.value.trim(); S._ng.difficulty = a.split(":")[1]; renderNg(); }
    else if (a === "seldiffrand") { const i = inp(); if (i && i.value.trim()) S._ng.teamName = i.value.trim(); S._ng.difficulty = choice(["新秀", "职业", "传奇"]); renderNg(); }
    else if (a.startsWith("selroster:")) { const i = inp(); if (i && i.value.trim()) S._ng.teamName = i.value.trim(); S._ng.rosterMode = a.split(":")[1]; renderNg(); }
    else if (a.startsWith("selteam:")) { S._ng.teamName = decodeURIComponent(a.split(":")[1]); renderNg(); }
    else if (a === "selrandom") { S._ng.teamName = ""; renderNg(); }
    else if (a === "confirmnew") { const i = inp(); if (i && i.value.trim()) S._ng.teamName = i.value.trim(); confirmNewGame(); }
    else if (a === "cancelnew") { mask.remove(); S.page = "title"; render(); }
  });
}
function confirmNewGame() {
  const ng = (S && S._ng) || { difficulty: "职业", teamName: "", rosterMode: "draft", slot: 1 };
  const occupied = slotMeta(ng.slot || 1);
  const go = () => {
    const mask = document.getElementById("newgame-mask"); if (mask) mask.remove();
    newGame({ difficulty: ng.difficulty, teamName: ng.teamName, rosterMode: ng.rosterMode, slot: ng.slot || 1 });
  };
  if (!occupied) return go();
  confirmDialog({
    title: "覆盖存档？",
    body: `存档 <b>${ng.slot || 1}</b> 已有进度：<b>${escapeHtml(occupied.team)}</b> · S${occupied.season} 第 ${occupied.round} 轮（${occupied.wins}胜${occupied.losses}负）。<br><br><b style="color:var(--red2)">开始新赛季会永久覆盖该进度</b>，无法恢复（建议先导出备份）。`,
    okText: "确认覆盖并开档", danger: true
  }).then(ok => { if (ok) go(); });
}

/* ---------------- 动作 ---------------- */
/* ---------------- 教练组聘用 ---------------- */
function hireStaff(key) {
  const d = STAFF_DEFS.find(x => x.key === key);
  if (!d) return;
  const lv = staffLevel(key), t = getMyTeam();
  if (lv >= d.max) { toast(d.name + " 已是最高等级"); return; }
  const cost = d.cost[lv];
  if (t.money < cost) { toast("资金不足：升级需 ¥" + cost + "万"); return; }
  confirmDialog({
    title: (lv ? "升级 " : "聘用 ") + d.name,
    body: `等级 <b>${lv} → ${lv + 1}</b>，一次性费用 <b style="color:var(--gold)">¥${cost}万</b>，之后每赛季工资 <b>¥${d.wage[lv]}万</b>。<br>效果：${d.effect(lv + 1)}`,
    okText: "确认"
  }).then(ok => {
    if (!ok) return;
    if (getMyTeam().money < cost) { toast("资金不足"); return; }
    snapshot(d.name + " Lv." + (lv + 1));
    getMyTeam().money -= cost;
    S.staff[key] = lv + 1;
    S.log.unshift("S" + S.season + " 教练组：" + d.name + " 升至 Lv." + (lv + 1) + "（-¥" + cost + "万）");
    toast(d.name + " 已升至 Lv." + (lv + 1));
    save(); render();
  });
}
function restTeam() {
  // 休息只在大场之间可用：系列赛进行中（draft/battle/sub 等）不允许休息，只能在"大场已打完"或回到主界面后休息
  if (S && S.series && S.series.sub !== "over") { toast("系列赛进行中不能全队休息：请先打完本场大场（BO5/BO7 全部打完）再休息"); return; }
  if (S.trainPoints < 2) { toast("休息需消耗 2 训练点，点数不足"); return; }
  snapshot("全队休息");
  S.trainPoints -= 2;
  POS.flatMap(p => getMyTeam().players[p]).forEach(p => {
    p.st = clampSt(p, p.st + restGain()); p.me = clamp(p.me + 4, 40, p.ceil);
    if (p.status === "low") { p.status = "ok"; p.statusRounds = 0; }
  });
  toast(`全队休息（-2 训练点）· 体能 +${restGain()}、心态 +4`);
  save(); render();
}
function doTrain(attr, pid) {
  const p = getPlayer(getMyTeam(), pid); if (!p) return;
  const money = trainCost(p);
  if (S.trainPoints <= 0) { toast("训练点不足"); return; }
  if (getMyTeam().money < money) { toast(`资金不足：本次特训需 ¥${money}万`); return; }
  if (p[attr] >= p.ceil) { toast(`${p.name} 该项已达上限(${p.ceil})，可用「突破上限」提升`); render(); return; }
  // 二次确认：一次特训会同时扣训练点与资金，避免误点
  const nameMap = { op: "操作", aw: "意识", co: "配合", me: "心态", st: "体能" };
  snapshot(`${nameMap[attr]}特训·${p.name}`);
  const gain = randInt(1, 2);
  const before = p[attr];
  p[attr] = attr === "st" ? clampSt(p, p.st + gain) : clamp(p[attr] + gain, 40, p.ceil);
  S.trainPoints--;
  getMyTeam().money -= money;
  p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
  toast(`${p.name} ${nameMap[attr]} +${p[attr] - before}（-¥${money}万 · -1 训练点）`);
  save(); render();
}
// 特训费用：与选手总评挂钩（越强越贵）
function trainCost(p) { return Math.round(5 + Math.max(0, p.ovr - 55) / 6.5); }
/* ---------------- 英雄熟练度训练 ---------------- */
function trainHero(pid, heroName) {
  const t = getMyTeam(), p = getPlayer(t, pid);
  if (!p) return;
  const h = heroByName(heroName);
  if (!h) return;
  const inPool = (p.heroPool || []).includes(heroName);
  const pts = inPool ? 1 : 2;                       // 学新英雄更贵
  const cost = inPool ? trainCost(p) : Math.round(trainCost(p) * 1.6);
  const cur = masteryOf(p, heroName);
  if (cur >= 96) { toast(`${p.name} 的${heroName}已练到上限（96）`); return; }
  if (S.trainPoints < pts) { toast(`练英雄需要 ${pts} 训练点（剩 ${S.trainPoints}）`); return; }
  if (t.money < cost) { toast(`资金不足：需要 ¥${cost}万`); return; }
  snapshot(`练 ${heroName}`);
  S.trainPoints -= pts; t.money -= cost;
  const gain = randInt(5, 9);
  p.mastery[heroName] = clamp(cur + gain, 0, 96);
  if (!inPool && p.mastery[heroName] >= 50) p.heroPool.push(heroName);   // 练到"可用"就进池子
  S.log.unshift(`S${S.season} 训练：${p.name} 的${heroName}熟练度 ${cur}→${p.mastery[heroName]}`);
  toast(`${p.name}·${heroName} 熟练度 ${cur} → ${p.mastery[heroName]}`);
  save(); render();
  openHeroTrain(pid);   // 刷新弹窗
}
function openHeroTrain(pid) {
  const old = document.getElementById("hero-mask"); if (old) old.remove();
  const t = getMyTeam(), p = getPlayer(t, pid);
  if (!p) return;
  if (!p.mastery) p.mastery = {};
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "hero-mask";
  mask.setAttribute("role", "dialog"); mask.setAttribute("aria-modal", "true");
  const body = () => {
    const pool = (p.heroPool || []).slice().sort((a, b) => masteryOf(p, b) - masteryOf(p, a));
    const cost = trainCost(p);
    const rows = pool.map(n => {
      const m = masteryOf(p, n), hh = heroByName(n);
      const can = S.trainPoints >= 1 && m < 96;
      return `<div class="hero-train-row">
        <div class="ht-body">
          <div><b>${escapeHtml(n)}</b> <span class="muted" style="font-size:11px">${hh ? POS_NAME[hh.pos] : ""} · ${masteryLabel(m)}</span>
            <b style="float:right;color:var(--gold)">${m}</b></div>
          <div class="bar" style="height:5px;margin-top:4px"><i style="width:${m}%"></i></div>
        </div>
        <button class="btn ${can ? "gold" : "ghost"} sm" data-hx="${escapeHtml(n)}" ${can ? "" : "disabled"} aria-label="练 ${escapeHtml(n)}，消耗 1 训练点">练 +5~9<br><i style="font-size:10px;font-style:normal">1点 · ¥${cost}万</i></button>
      </div>`;
    }).join("");
    const learn = HEROES.filter(h => !pool.includes(h.name) && laneFit(h, p.pos) >= 0.95)
      .sort((a, b) => heroStrength(b) - heroStrength(a)).slice(0, 8)
      .map(h => `<button class="btn ghost sm" data-hx="${escapeHtml(h.name)}" ${S.trainPoints >= 2 ? "" : "disabled"} aria-label="学习 ${escapeHtml(h.name)}，消耗 2 训练点">${escapeHtml(h.name)} <i class="muted" style="font-size:10px;font-style:normal">2点 ¥${Math.round(cost * 1.6)}万</i></button>`).join("");
    return `${rows}
      <div class="section-title mt" style="font-size:13px">学新英雄（同分路契合 · 2 训练点）</div>
      <div class="hero-opt">${learn || '<span class="muted">没有可学的新英雄</span>'}</div>`;
  };
  mask.innerHTML = `<div class="modal"><h3>🎯 英雄熟练度 · ${escapeHtml(p.name)}</h3>
    <div class="muted mb" style="font-size:12px;line-height:1.6">熟练度 0~100，直接乘进该英雄的实际战力（<b>绝活</b> ≈×1.11，<b>生疏</b> ≈×0.94）。可以只练绝活，也可以花钱开新英雄应对全局BP。<br>剩余训练点 <b>${S.trainPoints}</b> · 资金 <b>¥${t.money}万</b></div>
    <div class="hero-train-list" data-scroll-id="hero-train">${body()}</div>
    <button class="btn ghost" data-x="close" style="width:100%;margin-top:10px">关闭</button></div>`;
  document.body.appendChild(mask);
  mask._cancel = () => mask.remove();
  mask.addEventListener("click", e => {
    if (e.target === mask) { mask.remove(); return; }
    if (e.target.closest("[data-x]")) { mask.remove(); return; }
    const b = e.target.closest("[data-hx]");
    if (b) trainHero(pid, b.getAttribute("data-hx"));
  });
}
// 突破上限：需要大量训练点与资金
const BREAK_PTS = 5;
function breakCost(p) { return Math.round(150 + p.ovr * 1.9); }
function isCapped(p) { return p.ceil < 99 && ["op", "aw", "co", "me"].every(a => p[a] >= p.ceil - 1); }
function trainBreakthrough(pid) {
  const p = getPlayer(getMyTeam(), pid); if (!p) return;
  if ((p.age || 22) >= AGE_DECLINE_FROM) { toast(`${p.name} ${p.age} 岁已过巅峰期，无法再突破成长上限`); return; }
  if (!isCapped(p)) { toast("属性还没练满，无需突破"); return; }
  const money = breakCost(p);
  if (S.trainPoints < BREAK_PTS) { toast(`突破需 ${BREAK_PTS} 训练点`); return; }
  if (getMyTeam().money < money) { toast(`资金不足：突破需 ¥${money}万`); return; }
  confirmDialog({
    title: "突破成长上限",
    body: `【${escapeHtml(p.name)}】当前上限 <b>${p.ceil}</b>。<br>本次将消耗 <b>${BREAK_PTS} 训练点</b> + <b style="color:var(--gold)">¥${money}万</b>，上限 +1~2（不可退回）。<br><br>当前训练点 ${S.trainPoints} · 资金 ¥${getMyTeam().money}万。`,
    okText: "确认突破"
  }).then(ok => {
    if (!ok) return;
    if (S.trainPoints < BREAK_PTS || getMyTeam().money < money) { toast("资源不足，操作已取消"); return; }
    snapshot(`突破上限·${p.name}`);
    S.trainPoints -= BREAK_PTS;
    getMyTeam().money -= money;
    const up = randInt(1, 2);
    p.ceil = clamp(p.ceil + up, 60, 99);
    ["op", "aw", "co", "me"].forEach(a => p[a] = clamp(p[a] + 1, 40, p.ceil));
    p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
    S.log.unshift(`S${S.season} 特训：${p.name} 突破上限 +${up}（-¥${money}万）`);
    toast(`💪 ${p.name} 突破上限！上限 ${p.ceil}（-${BREAK_PTS}训练点 -¥${money}万）`);
    save(); render();
  });
}
function setLineup(pos, pid) {
  const p = getPlayer(getMyTeam(), pid);
  if (p && p.status === "inj" && p.statusRounds > 0) { toast(`${p.name} 伤病中，无法首发`); return; }
  getMyTeam().lineup[pos] = pid; toast("已调整首发"); save(); render();
}
function startMatch() {
  const t = getMyTeam();
  // 自动处理伤停首发：有健康替补就换上，没有就带伤出战（避免卡死）
  POS.forEach(pos => {
    const cur = getPlayer(t, t.lineup[pos]);
    if (cur && cur.status === "inj" && cur.statusRounds > 0) {
      const bench = t.players[pos]
        .filter(p => p.id !== t.lineup[pos] && !(p.status === "inj" && p.statusRounds > 0))
        .sort((a, b) => b.ovr - a.ovr);
      if (bench.length) { t.lineup[pos] = bench[0].id; toast(`${POS_NAME[pos]}首发伤停，已自动换上 ${bench[0].name}`); }
      else { cur.status = "ok"; cur.statusRounds = 0; toast(`${POS_NAME[pos]}无健康替补，${cur.name} 带伤出战`); }
    }
  });
  if (S.phase === "regular") {
    const sc = S.schedule.find(s => !s.played); if (!sc) return;
    startSeries(sc.oppId, 5, "regular", null, `第 ${sc.round} 轮常规赛`);
  } else if (S.phase === "playoff") {
    const next = S.pendingPlayoff || playoffMyNext();
    if (!next || !next.oppId) return;
    startSeries(next.oppId, 7, "playoff", next.slot, next.label);
  }
}
function startSeries(oppId, bestOf, kind, slot, label) {
  const firstSide = rand() < 0.5 ? "blue" : "red";
  // 转会窗口只在赛季初开放：打第一场常规赛即关闭
  if (kind === "regular" && S.transferWindow) { S.transferWindow = false; S.market = null; }
  S.series = { oppId, bestOf, kind, playoffSlot: slot, label, myScore: 0, opScore: 0, gameIndex: 0, usedByTeam: { [S.myTeamId]: [], [oppId]: [] }, games: [], firstSide, nextSide: firstSide, nextSideBy: null, sideLocked: false, draft: null, sub: "draft", rewards: null, battle: null };
  S.page = "series";
  newGameDraft();
}
function newGameDraft() {
  stopAutoBp();
  const s = S.series;
  // 关键修复：gameIndex 以「已打完的局数」为准，每开一局同步一次（旧版从不自增，
  // 导致永远显示「第 1 局」、局间永远「第 2 局前」、选边兜底也一直落在第 1 局的阵营上）
  s.gameIndex = (s.games || []).length;
  s.sideLocked = false;
  // 红蓝方：有败方选边结果则用之，否则按局数交替
  const side = s.nextSide || (s.gameIndex % 2 === 0 ? s.firstSide : (s.firstSide === "blue" ? "red" : "blue"));
  if (isPeakGame(s)) {
    // 第 7 局 · 巅峰对决：无 ban、盲选、不受全局 BP 限制
    const opp = S.teams.find(t => t.id === s.oppId);
    s.draft = {
      mySide: side, phase: "peak", peak: true, steps: [], stepIndex: 0,
      bans: { blue: [], red: [] }, picks: { blue: [], red: [] }, used: [],
      tactic: "稳", over: false,
      peakAi: aiPeakPicks(opp)   // 对手盲选阵容（已决定但先隐藏）
    };
  } else {
    s.draft = { mySide: side, phase: "ban", steps: buildDraftSteps(), stepIndex: 0, bans: { blue: [], red: [] }, picks: { blue: [], red: [] }, used: [], tactic: "稳", over: false };
  }
  s.sub = "draft";
  s.nextSide = null; s.nextSideBy = null;
  runDraftAI();
  save(); render();
}
function seriesContinue() {
  stopAutoBp();
  const s = S.series, t = getMyTeam(), win = s.myScore > s.opScore;
  const rw = s.rewards || { money: 0, fans: 0 };
  t.money += rw.money; t.fans = Math.max(1000, t.fans + rw.fans);
  t.wins += win ? 1 : 0; t.losses += win ? 0 : 1;
  if (s.kind === "regular" && win) t.points += 2;
  addPrestige(win ? (s.kind === "playoff" ? 3 : 1.5) : (s.kind === "playoff" ? -2 : -1.2), win ? "系列赛胜利" : "系列赛失利");
  POS.forEach(pos => {
    const p = getPlayer(t, t.lineup[pos]);
    if (!p) return;
    p.exp += win ? 60 : 35;
    if (p.exp < p.level * 100) return;
    p.exp = 0; p.level++;
    // 升级涨属性只在巅峰期前有效：27 岁起升级不再回补属性，否则会把年龄衰退抵消掉
    if ((p.age || 22) < AGE_DECLINE_FROM) ["op", "aw", "co", "me"].forEach(a => p[a] = clamp(p[a] + randInt(1, 2), 40, p.ceil));
    p.st = clampSt(p, p.st + 10);
    p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
  });
  S.series = null; S.page = "main"; S.tab = "schedule";

  if (s.kind === "regular") {
    const sc = S.schedule.find(x => !x.played); if (sc) sc.played = true;
    // 把我这场比赛也写进本轮对阵（含比分与每局阵容，供赛程页展示）
    const myFx = ((S.fixtures || [])[S.round - 1] || []).find(f => f.a === S.myTeamId || f.b === S.myTeamId);
    if (myFx) {
      const iAmA = myFx.a === S.myTeamId;
      myFx.sa = iAmA ? s.myScore : s.opScore;
      myFx.sb = iAmA ? s.opScore : s.myScore;
      myFx.played = true;
      myFx.games = (s.games || []).map(g => ({
        aWin: iAmA ? g.winner === "me" : g.winner === "opp",
        luA: iAmA ? POS.map(p => g.myPicks[p]) : POS.map(p => g.oppPicks[p]),
        luB: iAmA ? POS.map(p => g.oppPicks[p]) : POS.map(p => g.myPicks[p])
      }));
    }
    // 记录本场对手战绩（否则对手场次落后）
    const oppT = S.teams.find(x => x.id === s.oppId);
    if (oppT) {
      oppT.wins += win ? 0 : 1; oppT.losses += win ? 1 : 0;
      if (!win) oppT.points += 2;
      oppT.streak = win ? 0 : oppT.streak + 1;
      awardTeamMatch(oppT, !win, false); // 对手同样拿到/损失资金、粉丝、声望
    }
    // 结算本轮其他战队的比赛（保证全场次一致）
    simRoundAIFixtures(S.round);
    advanceRegular();
  } else {
    if (s.playoffSlot === "gf") {
      S.phase = "end"; S.champion = win; S.seasonResult = { champion: win, final: true };
      if (win) { addPrestige(15, "总冠军"); t.fans += randInt(30000, 80000); }
      else addPrestige(4, "亚军");
      recordHistory();
      S.event = { title: win ? "🏆 总冠军！" : "亚军", text: win ? "你带领战队捧起冠军奖杯！" : "总决赛惜败。", msg: win ? `恭喜！${t.name} 夺得 KPL 总冠军！` : "距离巅峰只差一步，明年卷土重来！" };
      S.page = "event"; save(); render(); return;
    }
    {
      // 记录本场季后赛比分与每局阵容（供 bracket 与赛季总结展示，与常规赛一致）
      const SL = S.bracket.slots[s.playoffSlot] || {};
      const iAmA = SL.a === S.myTeamId;
      S.bracket.resolved[s.playoffSlot] = {
        winner: win ? S.myTeamId : s.oppId, loser: win ? s.oppId : S.myTeamId,
        sa: iAmA ? s.myScore : s.opScore, sb: iAmA ? s.opScore : s.myScore,
        games: (s.games || []).map(g => ({
          aWin: iAmA ? g.winner === "me" : g.winner === "opp",
          luA: iAmA ? POS.map(p => g.myPicks[p]) : POS.map(p => g.oppPicks[p]),
          luB: iAmA ? POS.map(p => g.oppPicks[p]) : POS.map(p => g.myPicks[p]),
          peak: !!g.peak
        }))
      };
    }
    const next = playoffMyNext();
    if (next.eliminated) {
      S.phase = "end"; S.seasonResult = { champion: false, playoff: true }; recordHistory();
      S.event = { title: "季后赛止步", text: "双败淘汰赛出局。", msg: `${next.label}。来年再战！` };
      S.page = "event"; save(); render(); return;
    }
    S.pendingPlayoff = next;
    S.event = { title: "晋级下一轮", text: "双败淘汰赛推进。", msg: `下一场：${next.label} vs ${teamName(next.oppId)}（BO7）。可在赛程页进入，期间可训练/换人/转会。` };
    S.page = "event"; save(); render(); return;
  }
}
function advanceRegular() {
  tickStatuses();
  loanTick();                       // 租借到期自动返回
  const remaining = S.schedule.filter(s => !s.played).length;
  if (remaining > 0) {
    S.round++;
    // 轮间休整：全队（含 AI）自然恢复体能，避免连续 BO5 一路掉到见底
    S.teams.forEach(tm => POS.forEach(pos => tm.players[pos].forEach(p => { p.st = clampSt(p, p.st + ROUND_STAMINA_GAIN); })));
    refreshTrainPoints();
    const meUp = applyStaffPassive();          // 心理咨询师：每轮回心态
    maybeEvent();
    toast(`轮间休整：全队体能 +${ROUND_STAMINA_GAIN}${meUp ? ` · 心态 +${meUp}` : ""} · 训练点已补充`);
    save(); render(); return;
  }
  const sorted = standingsSorted();
  const top4 = sorted.slice(0, 4);
  const myRank = top4.findIndex(t => t.id === S.myTeamId);
  if (myRank === -1) {
    S.phase = "end"; S.seasonResult = { rank: sorted.findIndex(t => t.id === S.myTeamId) + 1, champion: false };
    addPrestige(-8, "无缘季后赛"); recordHistory();
    S.event = { title: "赛季落幕", text: "常规赛结束。", msg: `很遗憾未能进入前四，最终排名第 ${S.seasonResult.rank}。` };
    S.page = "event"; S.tab = "schedule"; save(); render(); return;
  }
  setupPlayoff(top4.map(t => t.id));
  const next = playoffMyNext();
  S.pendingPlayoff = next;
  addPrestige(3, "晋级季后赛");
  S.event = { title: "晋级季后赛（双败）！", text: "常规赛结束，杀入四强。", msg: `以第 ${myRank + 1} 名进入双败淘汰赛！首战：${next.label} vs ${teamName(next.oppId)}。` };
  S.page = "event"; S.tab = "schedule"; save(); render();
}


/* ---------------- 存档（3 槽位 + 导入/导出） ---------------- */
const SAVE_PREFIX = "kpl_coach_save_v9_s";
const LEGACY_SAVE_KEY = "kpl_coach_save_v4";
const SLOT_COUNT = 3;
const LAST_SLOT_KEY = "kpl_coach_last_slot";
/* 存档版本与迁移：每个函数只负责「从 v-1 升到 v」这一步，load() 里按顺序叠加执行。
   以后改数据结构时，加一个 SAVE_MIGRATIONS[n] 即可，不用再往 load() 里堆 if。 */
const SAVE_VERSION = 10;
const SAVE_MIGRATIONS = {
  10: s => {
    (s.teams || []).forEach(tm => POS.forEach(pos => (tm.players[pos] || []).forEach(p => {
      if (p.age == null) p.age = randInt(18, 27);
      if (p.stCap == null) p.stCap = stCapForAge(p.age);
      if (!p.mastery || typeof p.mastery !== "object") {
        p.mastery = {};
        (p.heroPool || []).forEach((n, i) => { p.mastery[n] = clamp(90 - i * 6 + randInt(-4, 4), 45, 95); });
      }
      if (!Array.isArray(p.heroPool) || !p.heroPool.length) p.heroPool = Object.keys(p.mastery).slice(0, 6);
      if (p.contract == null) p.contract = randInt(2, 4);
      if (p.st == null) p.st = clamp(p.st || 80, 40, p.stCap);
    })));
    if (!s.staff) s.staff = { mental: 0, fitness: 0, analyst: 0 };
    if (s.difficulty === "真实") { s.rosterMode = "real"; s.difficulty = "职业"; }
    if (!s.rosterMode) s.rosterMode = "draft";
    if (s.saveName == null) s.saveName = "";
  }
};
function migrateSaveData(s) {
  let v = s.version || 4;
  while (v < SAVE_VERSION) {
    v++;
    const fn = SAVE_MIGRATIONS[v];
    if (fn) { try { fn(s); } catch (e) { /* 单步迁移失败不影响读档 */ } }
  }
  s.version = SAVE_VERSION;
  return s;
}
function slotKey(n) { return SAVE_PREFIX + n; }
function slotMeta(n) {
  try {
    const raw = localStorage.getItem(slotKey(n));
    if (!raw) return null;
    const o = JSON.parse(raw);
    const t = (o.teams || []).find(x => x.id === o.myTeamId) || {};
    return {
      n, name: o.saveName || "", team: t.name || "?", season: o.season || 1, round: o.round || 1,
      wins: t.wins || 0, losses: t.losses || 0, prestige: Math.round(t.prestige || 0),
      difficulty: o.difficulty || "职业",
      rosterMode: o.rosterMode || (o.difficulty === "真实" ? "real" : "draft"),
      phase: o.phase || "regular", savedAt: o.savedAt || 0
    };
  } catch (e) { return null; }
}
function save() {
  if (!S) return;
  S.savedAt = Date.now(); S.version = SAVE_VERSION;
  S.slot = clamp(S.slot || 1, 1, SLOT_COUNT);
  const keepUndo = S.undo;
  S.undo = null;                       // 撤销快照只存在内存里，避免存档体积翻倍
  try {
    localStorage.setItem(slotKey(S.slot), JSON.stringify(S));
    localStorage.setItem(LAST_SLOT_KEY, String(S.slot));
  } catch (e) {} finally { S.undo = keepUndo; }
}
function hasAnySave() { for (let i = 1; i <= SLOT_COUNT; i++) if (localStorage.getItem(slotKey(i))) return true; return false; }
// 重命名存档：空名字 = 恢复显示战队名
function renameSlot(n, name) {
  const nm = String(name == null ? "" : name).trim().slice(0, 24);
  try {
    const raw = localStorage.getItem(slotKey(n));
    if (raw) {
      const o = JSON.parse(raw);
      o.saveName = nm;
      localStorage.setItem(slotKey(n), JSON.stringify(o));
    } else if (!(S && S.slot === n)) {
      toast("该存档位为空");
      return false;
    }
  } catch (e) { toast("重命名失败"); return false; }
  if (S && S.slot === n) { S.saveName = nm; save(); }
  render();
  toast(nm ? `存档 ${n} 已命名为「${nm}」` : `存档 ${n} 已恢复默认名称`);
  return true;
}
function deleteSlot(n) {
  try { localStorage.removeItem(slotKey(n)); } catch (e) {}
  if (S && S.slot === n) S = null;
  render();
  toast(`存档 ${n} 已删除`);
}
function migrateLegacySave() {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return;
    if (!localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), raw);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch (e) {}
}
function exportSave(n) {
  const raw = localStorage.getItem(slotKey(n));
  if (!raw) { toast("该存档位为空"); return; }
  try {
    const meta = slotMeta(n) || {};
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const nm = String(meta.name || meta.team || "save").replace(/[\\/:*?"<>|]/g, "_");
    a.download = `KPL教练_${nm}_S${meta.season || 1}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast("已导出存档文件");
  } catch (e) { toast("导出失败"); }
}
function importSaveText(text, preferSlot) {
  let o;
  try { o = JSON.parse(text); } catch (e) { toast("文件不是有效的存档"); return false; }
  if (!o || !o.myTeamId || !Array.isArray(o.teams) || !o.teams.length) { toast("存档内容不完整"); return false; }
  let slot = preferSlot;
  if (!slot) { for (let i = 1; i <= SLOT_COUNT; i++) if (!localStorage.getItem(slotKey(i))) { slot = i; break; } }
  if (!slot) slot = 1;
  o.slot = slot; o.savedAt = o.savedAt || Date.now();
  try { localStorage.setItem(slotKey(slot), JSON.stringify(o)); } catch (e) { toast("写入存档失败"); return false; }
  load(slot);
  toast(`已导入到存档 ${slot}`);
  return true;
}
function load(n) {
  let slot = n;
  if (!slot) slot = parseInt(localStorage.getItem(LAST_SLOT_KEY) || "0", 10) || 0;
  if (!slot) { for (let i = 1; i <= SLOT_COUNT; i++) if (localStorage.getItem(slotKey(i))) { slot = i; break; } }
  if (!slot) slot = 1;
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) { toast("该存档位为空"); S = { page: "title" }; render(); return; }
    S = migrateSaveData(JSON.parse(raw));
    S.slot = slot;
    S._autoRun = false; S._autoTimer = null; // 读档时不会残留自动BP 计时器
    if (!S.page) S.page = "main";
    if (!S.tab) S.tab = "team";
    if (S.season == null) S.season = 1;
    if (!S.history) S.history = [];
    if (S.transfersUsed == null) S.transfersUsed = 0;
    if (S.maxTransfers == null) S.maxTransfers = 3;
    if (!S.freeAgents) S.freeAgents = {};
    delete S.marketRefreshUsed;
    if (S.fanMeets == null) S.fanMeets = 0;
    if (S.maxFanMeets == null) S.maxFanMeets = 2;
    delete S.autoBpUsed;
    if (S.gameOver === undefined) S.gameOver = null;
    if (!S.fixtures) S.fixtures = buildSchedule(S.myTeamId, S.teams).fixtures;
    if (S.transferWindow == null) S.transferWindow = !(S.round > 1 || (S.schedule || []).some(s => s.played));
    if (!S.aiTransfers) S.aiTransfers = [];
    if (S.transferSeen == null) S.transferSeen = (S.aiTransfers || []).length;
    // 旧存档字段补齐：年龄/合同/租借/撤销/存档名
    if (!S.rosterMode) S.rosterMode = (S.difficulty === "真实") ? "real" : "draft";
    if (S.difficulty === "真实") S.difficulty = "职业"; // 旧版把「真实」当难度，现在拆成名单模式
    if (S.saveName == null) S.saveName = "";
    if (!S.loans) S.loans = [];
    if (S.loansUsed == null) S.loansUsed = 0;
    if (S.maxLoans == null) S.maxLoans = 1;
    if (!S.contractNotices) S.contractNotices = [];
    if (!S.staff) S.staff = { mental: 0, fitness: 0, analyst: 0 };
    if (!S.kpi) S.kpi = makeKpi();
    if (S.undo === undefined) S.undo = null;
    // 旧存档：补齐 AI 战队的资金/声望字段（与玩家同规则的经济体系）
    (S.teams || []).forEach(tm => {
      if (tm.money == null) tm.money = 200;
      if (tm.prestige == null) tm.prestige = 45;
      POS.forEach(pos => (tm.players[pos] || []).forEach(p => {
        if (p.age == null) p.age = randInt(18, 27);
        if (p.contract == null) p.contract = randInt(2, 4);
        if (p.stCap == null) p.stCap = stCapForAge(p.age);
        // 旧存档没有熟练度：按原英雄池补一个 55~90 的熟练度表
        if (!p.mastery || typeof p.mastery !== "object") {
          p.mastery = {};
          (p.heroPool || []).forEach((n, i) => { p.mastery[n] = clamp(90 - i * 6 + randInt(-4, 4), 45, 95); });
        }
        if (!Array.isArray(p.heroPool)) p.heroPool = Object.keys(p.mastery);
        if (p.st == null) p.st = clamp(p.st || 80, 40, p.stCap);
      }));
    });
    // 旧存档迁移：全局BP由「红蓝方」改为「战队」记录
    if (S.series) {
      if (!S.series.usedByTeam) {
        S.series.usedByTeam = {};
        if (Array.isArray(S.series.myUsedHeroes)) S.series.usedByTeam[S.myTeamId] = S.series.myUsedHeroes.slice();
        if (Array.isArray(S.series.oppUsedHeroes)) S.series.usedByTeam[S.series.oppId] = S.series.oppUsedHeroes.slice();
      }
      delete S.series.myUsedHeroes; delete S.series.oppUsedHeroes;
      if (!S.series.usedByTeam[S.myTeamId]) S.series.usedByTeam[S.myTeamId] = [];
      if (!S.series.usedByTeam[S.series.oppId]) S.series.usedByTeam[S.series.oppId] = [];
      if (S.series.gameIndex == null) S.series.gameIndex = (S.series.games || []).length;
    }
    // 读档时若停在虚拟战斗中，直接结算，避免卡住
    if (S.series && S.series.sub === "battle" && S.series.battle) { finishBattle(); return; }
    // 声望已归零的存档直接进失败页
    const me = getMyTeam();
    if (!S.gameOver && me && me.prestige <= 0) triggerGameOver("声望归零");
    render();
  } catch (e) { toast("存档读取失败"); }
}

/* ---------------- 启动 ---------------- */
S = null;
migrateLegacySave();   // 旧版单存档 → 存档 1
render();
