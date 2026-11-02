#!/usr/bin/env node
/* =====================================================================
   tests/shot.js — 无头截图工具（移动端适配验收用）
   用法：
     node tests/shot.js <target> [width] [height] [outfile]
   target: title | team | train | lineup | schedule | standings | market |
           prestige | format | draft | battle | guide | settings
   原理：生成一个临时 HTML，与游戏同文档加载全部脚本，注入 localStorage 存档，
        然后调用游戏内部函数切到目标界面，最后用 Edge 无头模式截图。
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const H = require(path.join(ROOT, "tests", "harness.js"));

const EDGE = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";

function buildSeed() {
  const env = H.makeEnv();
  const T = env.T;
  T.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
  T.getS().transferWindow = false;
  // 造一点进度：打一轮、训练点用掉、有点资金
  const t = T.getMyTeam();
  t.money = 520; t.fans = 86000; t.prestige = 58;
  T.getS().trainPoints = 9;
  T.getS().round = 4;
  T.save();
  const key = Object.keys(env.store).find(k => /_s1$/.test(k));
  return env.store[key];
}

function makeHtml(target, seed) {
  const setup = {
    title: `load(1); S.page="title"; render();`,
    team: `load(1); handleAct("tab:team");`,
    train: `load(1); handleAct("tab:train");`,
    lineup: `load(1); handleAct("tab:lineup");`,
    schedule: `load(1); handleAct("tab:schedule");`,
    standings: `load(1); handleAct("tab:standings");`,
    market: `load(1); handleAct("tab:market");`,
    prestige: `load(1); handleAct("tab:prestige");`,
    format: `load(1); handleAct("tab:format");`,
    guide: `load(1); openGuide(true);`,
    settings: `load(1); openSettings();`,
    draft: `load(1); S.transferWindow=false; startMatch(); var d=S.series.draft;
            var i=d.steps.findIndex(function(s){return s.type==="pick"&&s.actor===d.mySide;});
            if(i>=0) d.stepIndex=i; renderSeries();`,
    battle: `load(1); S.transferWindow=false; startMatch();
             var g=0; while(S.series.draft&&!S.series.draft.over&&g++<60) autoBpStep();
             if(S.series&&S.series.battle){ S.series.sub="battle"; S.series.battle.minute=6;
             S.series.battle.lines=S.series.battle.lines.slice(0,8); renderSeries(); }`,
    report: `load(1); S.transferWindow=false; startMatch();
             var g=0; while(S.series.draft&&!S.series.draft.over&&g++<60) autoBpStep();
             if(S.series&&S.series.battle){ S.series.sub="battle"; var k=0;
             while(S.series&&S.series.sub==="battle"&&k++<90) battleTick();
             if(S.series&&S.series.sub==="result") renderSeries(); }`
  };
  let code = setup[target];
  if (!code) throw new Error("未知 target: " + target);
  // 截图时关掉随机事件弹窗（它会盖住页面内容）
  code += `;
    try { if (S && S.event) { S.event = null; var m=document.getElementById("event-mask"); if(m) m.remove(); render(); } } catch(e){}
  `;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="style.css"></head><body>
<div id="game-root"></div>
<script src="js/data.js"></script>
<script src="js/audio.js"></script>
<script src="js/sim.js"></script>
<script src="js/render.js"></script>
<script src="js/state.js"></script>
<script>
window.addEventListener("error",function(e){document.title="ERR:"+e.message;});
try{
  localStorage.setItem("kpl_coach_save_v9_s1", ${JSON.stringify(seed)});
  localStorage.setItem("kpl_coach_last_slot","1");
  localStorage.setItem("kpl_coach_guide_seen_v1","1");
  localStorage.setItem("kpl_coach_audio_v1",JSON.stringify({master:0.6,bgm:0.5,sfx:0.7,bgmOn:false,sfxOn:false}));
  ${code}
  document.title="OK";
}catch(e){document.title="ERR:"+e.message+" | "+((e.stack||"").split("\\n")[1]||"");}
/*__AFTER__*/
<\/script></body></html>`;
}

function shot(target, w, h, out) {
  const seed = buildSeed();
  const html = makeHtml(target, seed);
  const tmp = path.join(ROOT, "_shot.html");
  fs.writeFileSync(tmp, html);
  try { fs.unlinkSync(out); } catch (e) {}
  try {
    execFileSync(EDGE, [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--no-proxy-server",
      "--hide-scrollbars", "--allow-file-access-from-files",
      "--screenshot=" + out, "--window-size=" + w + "," + h,
      "--virtual-time-budget=6000", "file://" + tmp
    ], { stdio: "ignore", timeout: 40000 });
  } catch (e) { /* Edge 有非零退出码时仍会写图 */ }
  return fs.existsSync(out);
}

if (require.main === module) {
  const target = process.argv[2] || "team";
  const w = parseInt(process.argv[3] || "390", 10);
  const h = parseInt(process.argv[4] || "844", 10);
  const out = process.argv[5] || ("/tmp/shot-" + target + "-" + w + ".png");
  const ok = shot(target, w, h, out);
  console.log((ok ? "✓ " : "✗ ") + out + "  (" + target + " @" + w + "x" + h + ")");
}
module.exports = { shot, buildSeed, makeHtml };
