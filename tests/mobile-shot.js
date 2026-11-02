#!/usr/bin/env node
/* =====================================================================
   tests/mobile-shot.js — 用 CDP 做「真·移动设备」模拟并截图 / 审计布局
   用法：
     node tests/mobile-shot.js shot  <target> [w] [h] [out]
     node tests/mobile-shot.js audit <target> [w] [h]
   target: title | team | train | lineup | schedule | standings | market |
           prestige | format | draft | battle | report | guide | settings
   依赖：本机 Microsoft Edge + Node 22 内置 WebSocket（无第三方包）
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const EDGE = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
const ROOT = process.env.KPL_ROOT || path.join(__dirname, "..");
const PORT = 9411;
const shot = require(path.join(ROOT, "tests", "shot.js"));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForPort(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch (e) {}
    await sleep(250);
  }
  throw new Error("Edge 调试端口未就绪");
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.logs = []; }
  static async attach(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const c = new CDP(ws);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && c.pending.has(msg.id)) {
        const { res, rej } = c.pending.get(msg.id); c.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method === "Runtime.consoleAPICalled") {
        c.logs.push((msg.params.args || []).map(a => a.value).join(" "));
      } else if (msg.method === "Runtime.exceptionThrown") {
        c.logs.push("EXCEPTION: " + (msg.params.exceptionDetails.exception?.description ||
          msg.params.exceptionDetails.text));
      }
    };
    return c;
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error("CDP 超时: " + method)); } }, 30000);
    });
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: expr, returnByValue: true, awaitPromise: true
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}

const AUDIT_FN = `
(function(){
  var vw = document.documentElement.clientWidth;
  var out = [];
  out.push("viewport=" + vw + "x" + document.documentElement.clientHeight +
           " docScrollW=" + document.documentElement.scrollWidth +
           " bodyScrollW=" + document.body.scrollWidth);
  // 元素若处在可横向滚动的祖先里，超出是「设计如此」，不算缺陷
  function inScroller(e){
    for (var p = e.parentElement; p; p = p.parentElement) {
      var ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
      if (p === document.body) break;
    }
    return false;
  }
  var all = document.querySelectorAll("body *");
  for (var i = 0; i < all.length; i++) {
    var e = all[i];
    if (e.id === "LAYOUT_AUDIT") continue;
    var cs = getComputedStyle(e);
    if (cs.position === "fixed") continue;
    var r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    var right = r.left + r.width;
    if (right > vw + 1 && !inScroller(e)) {
      out.push("OVERFLOW <" + e.tagName.toLowerCase() +
        (e.className ? "." + String(e.className).trim().split(/\\s+/).join(".") : "") +
        "> left=" + Math.round(r.left) + " w=" + Math.round(r.width) +
        " right=" + Math.round(right) + " | " + (e.textContent||"").trim().slice(0,40));
    }
  }
  // 小于 32px 的可点元素（手指不好按）
  var taps = document.querySelectorAll("button, .lane-tab, .bp-toggle, .hero-chip, a");
  var small = 0, sample = [];
  for (var i2 = 0; i2 < taps.length; i2++) {
    var t = taps[i2], tr = t.getBoundingClientRect();
    if (tr.width === 0 || tr.height === 0) continue;
    if (getComputedStyle(t).display === "none") continue;
    if (tr.height < 28) { small++; if (sample.length < 5) sample.push(t.tagName + "." + (t.className||"") + " h=" + Math.round(tr.height) + " | " + (t.textContent||"").trim().slice(0,20)); }
  }
  out.push("SMALLTAPS count=" + small + (sample.length ? " e.g. " + sample.join(" ;; ") : ""));

  // 关键区块高度（判断「顶栏吃掉多少屏」）
  var h = function(sel){ var e=document.querySelector(sel); return e?Math.round(e.getBoundingClientRect().height):-1; };
  out.push("HEIGHTS topbar=" + h(".topbar") + " nav=" + h(".nav") +
           " stats=" + h(".topbar-stats") + " vh=" + document.documentElement.clientHeight +
           " topbarPct=" + (h(".topbar") / document.documentElement.clientHeight * 100).toFixed(1) + "%");
  var nv = document.querySelector(".nav");
  if (nv) {
    var ncs = getComputedStyle(nv), nrect = nv.getBoundingClientRect();
    var nb = nv.querySelector("button"), bcs = nb ? getComputedStyle(nb) : null, brect = nb ? nb.getBoundingClientRect() : null;
    out.push("NAV pos=" + ncs.position + " disp=" + ncs.display + " cols=" + ncs.gridTemplateColumns +
      " rect=[" + Math.round(nrect.left) + "," + Math.round(nrect.top) + " " + Math.round(nrect.width) + "x" + Math.round(nrect.height) + "]" +
      (bcs ? " btn=[" + Math.round(brect.width) + "x" + Math.round(brect.height) + "] minH=" + bcs.minHeight + " font=" + bcs.fontSize : ""));
  }
  return out.join("\\n");
})()
`;

async function main() {
  const mode = process.argv[2] || "shot";
  const targets = (process.argv[3] || "team").split(",");
  const W = parseInt(process.argv[4] || "390", 10);
  const H = parseInt(process.argv[5] || "844", 10);
  const outDir = process.argv[6] || "/tmp";

  const seed = shot.buildSeed();
  const tmp = path.join(ROOT, "_mobile.html");

  const proc = spawn(EDGE, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--no-proxy-server",
    "--allow-file-access-from-files", "--hide-scrollbars",
    "--remote-debugging-port=" + PORT,
    "--user-data-dir=/tmp/edge-kpl-profile",
    "about:blank"
  ], { stdio: "ignore", detached: false });

  let cdp;
  try {
    await waitForPort("http://127.0.0.1:" + PORT + "/json/version");
    const list = await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json();
    const page = list.find(t => t.type === "page");
    cdp = await CDP.attach(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: W, height: H, deviceScaleFactor: 2, mobile: true,
      screenWidth: W, screenHeight: H
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

    for (const target of targets) {
      fs.writeFileSync(tmp, shot.makeHtml(target, seed));
      await cdp.send("Page.navigate", { url: "file://" + tmp });
      await sleep(1600);
      const audit = await cdp.eval(AUDIT_FN);
      const lines = audit.split("\n");
      const bad = lines.filter(l => l !== lines[0]);
      console.log("##### " + target + "  " + lines[0]);
      if (bad.length) bad.forEach(l => console.log("   " + l));
      else console.log("   （无溢出元素）");
      if (mode === "shot") {
        const outFile = path.join(outDir, "m-" + target + "-" + W + ".png");
        const r = await cdp.send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(outFile, Buffer.from(r.data, "base64"));
        console.log("   ✓ " + outFile);
      }
    }
    if (cdp.logs.length) {
      console.log("--- 页面控制台 ---");
      cdp.logs.slice(0, 12).forEach(l => console.log("  " + l));
    }
  } finally {
    try { proc.kill(); } catch (e) {}
    try { fs.unlinkSync(tmp); } catch (e) {}
  }
}

main().catch(e => { console.error("失败:", e.message); process.exit(1); });
