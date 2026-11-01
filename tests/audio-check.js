/* =====================================================================
   tests/audio-check.js — 用假 AudioContext 跑真实调度
   验证「点了播放真的会有声音」：振荡器被创建、序列在跑、切换/关闭/音效都工作。
   需要真 setTimeout（约 1.5 秒），所以不进 run.js 的同步断言框架。
   跑法：node tests/audio-check.js
   ===================================================================== */
const fs = require("fs");
const vm = require("vm");

const path = require("path");
const ROOT = path.join(__dirname, "..");
const order = [...fs.readFileSync(ROOT + "/index.html", "utf8").matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const src = order.map(p => fs.readFileSync(ROOT + "/" + p, "utf8")).join("\n");

let created = { osc: 0, gain: 0, buf: 0, src: 0, filter: 0 };
function param(v) {
  return {
    value: v || 0,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
    cancelScheduledValues() {}, setTargetAtTime() {}
  };
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 0; this.sampleRate = 44100; this.state = "running";
    this.destination = { name: "dest" };
    this._tick = setInterval(() => { this.currentTime += 0.05; }, 50);
    this._tick.unref && this._tick.unref();
  }
  createGain() { created.gain++; return { gain: param(1), connect() {} }; }
  createOscillator() { created.osc++; return { type: "", frequency: param(440), connect() {}, start() {}, stop() {} }; }
  createBuffer(ch, len) { created.buf++; return { getChannelData: () => new Float32Array(len) }; }
  createBufferSource() { created.src++; return { buffer: null, connect() {}, start() {}, stop() {} }; }
  createBiquadFilter() { created.filter++; return { type: "", frequency: param(1000), connect() {} }; }
  resume() { this.state = "running"; return Promise.resolve(); }
}

const els = {};
function mkEl() {
  return {
    innerHTML: "", textContent: "", value: "", id: "", className: "", style: {}, dataset: {}, files: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild() {}, remove() {}, addEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, click() {}, scrollIntoView() {}, get offsetParent() { return null; }
  };
}
const document = {
  getElementById(id) { return els[id] || (els[id] = Object.assign(mkEl(), { id })); },
  querySelector() { return null; }, querySelectorAll() { return []; },
  createElement() { return mkEl(); }, addEventListener() {},
  body: mkEl(), activeElement: null
};
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const ctx = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  Math, Date, JSON, Number, String, Object, Array, RegExp, Error, parseInt, parseFloat, isNaN,
  localStorage, document, window: { scrollY: 0, pageYOffset: 0, scrollTo() {}, AudioContext: FakeAudioContext },
  Blob: function () {}, URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} }, FileReader: function () {}
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src + "\n;globalThis.__A={playBgm,stopBgm,sfx,audioPref,saveAudioPref,bgmTrackFor,getS:()=>S,newGame,updateBgm,audioSupported,stopState:()=>({cur:_curName,timer:!!_seqTimer,ac:!!_ac})};", ctx);
const A = ctx.__A;

const ok = (n, c, x) => console.log(`${c ? "  ✓" : "  ✗"} ${n}${x !== undefined ? " → " + x : ""}`);
let pass = 0, fail = 0;
const t = (n, c, x) => { if (c) pass++; else fail++; ok(n, c, x); };

t("audioSupported() 检测到 AudioContext", A.audioSupported() === true);
A.playBgm("match");
const st1 = A.stopState();
t("playBgm 创建了 AudioContext", st1.ac === true);
t("当前曲目标记为 match", st1.cur === "match", st1.cur);

setTimeout(() => {
  const s2 = A.stopState();
  t("240ms 后序列已启动", s2.timer === true);
  t("真的产生了音符（oscillator）", created.osc > 0, created.osc + " 个振荡器");
  t("产生了打击/噪声缓冲", created.buf > 0, created.buf + " 个 buffer");

  // 重复调用不应重启
  const before = created.osc;
  A.playBgm("match");
  t("同一首重复调用被去重", A.stopState().cur === "match");

  // 切到 peak
  A.playBgm("peak");
  t("切到 peak 曲", A.stopState().cur === "peak", A.stopState().cur);

  setTimeout(() => {
    const s3 = A.stopState();
    t("peak 序列在跑", s3.timer === true);
    t("peak 用了更多音符（150BPM）", created.osc > before);

    // 音效
    const o0 = created.osc;
    A.sfx("click"); A.sfx("pick"); A.sfx("win");
    t("音效产生声音", created.osc > o0, created.osc - o0 + " 个新振荡器");

    // 关闭音乐
    A.audioPref().bgmOn = false;
    A.updateBgm();
    t("关闭音乐后停止序列", A.stopState().timer === false);
    A.audioPref().bgmOn = true;
    A.saveAudioPref();

    // 场景判定
    A.newGame({ difficulty: "职业", rosterMode: "draft", teamName: "成都AG超玩会", slot: 1 });
    t("主界面 → match", A.bgmTrackFor() === "match", A.bgmTrackFor());
    A.getS().series = { draft: { peak: true }, sub: "draft", myScore: 3, opScore: 3 };
    t("巅峰对决 → peak", A.bgmTrackFor() === "peak", A.bgmTrackFor());

    console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
    process.exit(fail ? 1 : 0);
  }, 700);
}, 700);
