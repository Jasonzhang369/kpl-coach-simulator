/* =====================================================================
   audio.js — 程序化 BGM 与音效
   不引用任何音频文件、不发任何网络请求：全部用 Web Audio API 现场合成。
   这样仓库里没有版权素材，也能在 file:// 下直接响。

   曲目：
     menu  主菜单 / 首页
     match 常规赛、BP、战斗
     peak  巅峰对决（专属曲：更快、切分、警报音）
     win   夺冠短曲（一次性）

   巅峰对决的外部音频：把任意音频放到 audio/peak.mp3（或 .ogg/.m4a），
   检测到就会自动改用你的文件，合成曲作为兜底。
   ===================================================================== */

const AUDIO_PREF_KEY = "kpl_coach_audio_v1";
const AUDIO_DEFAULTS = { master: 0.62, bgm: 0.5, sfx: 0.72, bgmOn: true, sfxOn: true, guideSeen: false };

function audioPref() {
  if (!window.__audioPref) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(AUDIO_PREF_KEY) || "{}") || {}; } catch (e) { saved = {}; }
    window.__audioPref = Object.assign({}, AUDIO_DEFAULTS, saved);
  }
  return window.__audioPref;
}
function saveAudioPref() {
  try { localStorage.setItem(AUDIO_PREF_KEY, JSON.stringify(audioPref())); } catch (e) {}
}

/* ---------------- 上下文 ---------------- */
let _ac = null, _master = null, _bgmBus = null, _sfxBus = null;
let _seqTimer = null, _nextTime = 0, _step = 0, _curTrack = null, _curName = null;
let _peakEl = null, _peakExternal = "unknown";   // unknown | ok | fail

function audioSupported() {
  return typeof window !== "undefined" && !!(window.AudioContext || window.webkitAudioContext);
}
function ensureAudio() {
  if (_ac || !audioSupported()) return _ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  try {
    _ac = new AC();
    _master = _ac.createGain(); _master.gain.value = audioPref().master;
    _master.connect(_ac.destination);
    _bgmBus = _ac.createGain(); _bgmBus.gain.value = 0; _bgmBus.connect(_master);
    _sfxBus = _ac.createGain(); _sfxBus.gain.value = 1; _sfxBus.connect(_master);
  } catch (e) { _ac = null; }
  return _ac;
}
function resumeAudio() {
  const a = ensureAudio();
  if (a && a.state === "suspended") { a.resume().catch(() => {}); }
}
function applyVolume() {
  const p = audioPref();
  if (_master) _master.gain.value = p.master;
  if (_bgmBus) _bgmBus.gain.value = (p.bgmOn ? p.bgm * 0.5 : 0);
  if (_sfxBus) _sfxBus.gain.value = p.sfxOn ? p.sfx : 0;
  if (_peakEl) _peakEl.volume = Math.min(1, p.master * p.bgm * (p.bgmOn ? 1 : 0));
}

/* ---------------- 基础音色 ---------------- */
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function tone(when, midi, dur, type, gain, bus) {
  const a = _ac; if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || "triangle";
  o.frequency.setValueAtTime(midiToFreq(midi), when);
  const peak = Math.max(0.0001, gain == null ? 0.18 : gain);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.05, dur));
  o.connect(g); g.connect(bus || _bgmBus);
  o.start(when); o.stop(when + dur + 0.02);
}
function noiseHit(when, dur, gain, hp) {
  const a = _ac; if (!a) return;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const g = a.createGain(); g.gain.value = gain == null ? 0.12 : gain;
  const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 1200;
  src.connect(f); f.connect(g); g.connect(_bgmBus);
  src.start(when); src.stop(when + dur);
}
function kick(when, gain) {
  const a = _ac; if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(150, when);
  o.frequency.exponentialRampToValueAtTime(46, when + 0.12);
  g.gain.setValueAtTime(gain == null ? 0.5 : gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  o.connect(g); g.connect(_bgmBus);
  o.start(when); o.stop(when + 0.22);
}

/* ---------------- 曲目 ----------------
   每首都是 32 步（16 分音符）循环；null = 休止。 */
const TRACKS = {
  menu: {
    bpm: 88, swing: 0,
    // 和弦进行 C - G - Am - F（每 8 步换一个）
    bass: [45, null, null, null, null, null, null, null, 43, null, null, null, null, null, null, null,
           41, null, null, null, null, null, null, null, 41, null, null, null, null, null, null, null],
    lead: [72, null, 76, null, 79, null, 76, null, 71, null, 74, null, 79, null, 74, null,
           69, null, 72, null, 76, null, 72, null, 69, null, 72, null, 77, null, 72, null],
    pad: [60, 67, 62, 67],
    drums: 0
  },
  match: {
    bpm: 116, swing: 0,
    // Am - F - C - G
    bass: [45, null, 45, null, 45, null, 52, null, 41, null, 41, null, 41, null, 48, null,
           48, null, 48, null, 48, null, 55, null, 43, null, 43, null, 43, null, 50, null],
    lead: [69, null, 72, null, 76, 74, 72, null, 69, null, 72, null, 74, 72, 69, null,
           67, null, 72, null, 76, null, 79, 77, 74, null, 71, null, 67, null, 69, null],
    pad: [57, 60, 55, 59],
    drums: 1
  },
  peak: {
    bpm: 150, swing: 0,
    // Dm - Bb - Gm - A：切分 + 强鼓，三连音式强调
    bass: [38, null, 38, 38, null, 38, null, 38, 34, null, 34, 34, null, 34, null, 34,
           31, null, 31, 31, null, 31, null, 31, 33, 33, null, 33, 33, null, 33, 33],
    lead: [74, 77, 81, 77, 74, 81, 86, null, 70, 74, 77, 74, 70, 77, 82, null,
           67, 70, 74, 70, 67, 74, 79, null, 69, 73, 76, 73, 76, 79, 81, 83],
    pad: [50, 46, 55, 57],
    drums: 2
  },
  win: {
    bpm: 132, swing: 0, once: true,
    bass: [48, null, null, null, 55, null, null, null, 60, null, null, null, 48, null, null, null,
           45, null, null, null, 52, null, null, null, 55, null, null, null, 48, null, null, null],
    lead: [72, 76, 79, 84, 79, 84, 88, null, 84, 88, 91, null, 88, null, null, null,
           84, 88, 91, 88, 84, 88, 84, null, 79, 84, 88, null, 84, null, null, null],
    pad: [60, 64, 67, 72],
    drums: 1
  }
};

function scheduleStep(track, step, when) {
  const bar = Math.floor(step / 8) % 4;
  const b = track.bass[step]; if (b != null) tone(when, b, 0.32, "triangle", 0.20);
  const l = track.lead[step]; if (l != null) tone(when, l, 0.22, "square", 0.075);
  if (step % 8 === 0 && track.pad) {
    const root = track.pad[bar];
    if (root != null) { tone(when, root, 1.6, "sine", 0.055); tone(when, root + 7, 1.6, "sine", 0.032); }
  }
  if (track.drums) {
    if (step % 8 === 0 || step % 8 === 6) kick(when, track.drums === 2 ? 0.55 : 0.4);
    if (track.drums === 2 && (step % 4 === 2)) noiseHit(when, 0.08, 0.10, 2400);
    else if (track.drums === 1 && step % 8 === 4) noiseHit(when, 0.07, 0.07, 2600);
    if (track.drums === 2 && step % 8 === 7) noiseHit(when, 0.16, 0.09, 1600);
  }
}

function stopSeq() {
  if (_seqTimer) { clearInterval(_seqTimer); _seqTimer = null; }
}
function startSeq(name) {
  const track = TRACKS[name]; if (!track) return;
  const a = ensureAudio(); if (!a) return;
  stopSeq();
  _curTrack = track; _curName = name; _step = 0;
  const stepDur = 60 / track.bpm / 4;
  _nextTime = a.currentTime + 0.08;
  _seqTimer = setInterval(() => {
    if (!_ac || !_curTrack) return;
    const p = audioPref();
    if (!p.bgmOn) return;
    while (_nextTime < _ac.currentTime + 0.3) {
      scheduleStep(_curTrack, _step, _nextTime);
      _nextTime += stepDur;
      _step++;
      if (_curTrack.once && _step >= 32) { _curTrack = null; _curName = null; return; }
      _step %= 32;
    }
  }, 60);
}

/* ---------------- 外部「巅峰对决」音频 ---------------- */
const PEAK_AUDIO_CANDIDATES = ["audio/peak.mp3", "audio/peak.ogg", "audio/peak.m4a", "audio/peak.wav"];
function probePeakAudio() {
  if (_peakExternal !== "unknown") return;
  if (typeof Audio === "undefined") { _peakExternal = "fail"; return; }
  let idx = 0;
  const tryNext = () => {
    if (idx >= PEAK_AUDIO_CANDIDATES.length) { _peakExternal = "fail"; return; }
    const src = PEAK_AUDIO_CANDIDATES[idx++];
    try {
      const el = new Audio();
      el.preload = "auto"; el.loop = true; el.src = src;
      el.addEventListener("canplaythrough", () => { _peakEl = el; _peakExternal = "ok"; applyVolume(); }, { once: true });
      el.addEventListener("error", () => { tryNext(); }, { once: true });
      el.load && el.load();
    } catch (e) { tryNext(); }
  };
  tryNext();
}

/* ---------------- 对外接口 ---------------- */
function playBgm(name) {
  const p = audioPref();
  if (!p.bgmOn) { stopBgm(); return; }
  // 关键：先占位再去重。render() 每帧都会调过来，若等到 setTimeout 里才写 _curName，
  // 240ms 内会重复排队、反复重启序列（听感上是同一条旋律叠了好几层）。
  if (_curName === name) return;
  _curName = name;
  const a = ensureAudio();
  if (!a) { _curName = null; return; }
  resumeAudio();

  if (name === "peak") {
    probePeakAudio();
    if (_peakExternal === "ok" && _peakEl) {
      stopSeq();
      applyVolume();
      try { _peakEl.currentTime = 0; _peakEl.play().catch(() => {}); } catch (e) {}
      return;
    }
  }
  if (_peakEl) { try { _peakEl.pause(); } catch (e) {} }

  // 淡出 → 换曲 → 淡入
  const target = (p.bgm * 0.5);
  try { _bgmBus.gain.cancelScheduledValues(a.currentTime); _bgmBus.gain.setValueAtTime(_bgmBus.gain.value, a.currentTime); _bgmBus.gain.linearRampToValueAtTime(0.0001, a.currentTime + 0.22); } catch (e) {}
  setTimeout(() => {
    if (!_ac || _curName !== name) return;   // 期间又被切走了，放弃这次启动
    startSeq(name);
    try {
      _bgmBus.gain.cancelScheduledValues(_ac.currentTime);
      _bgmBus.gain.setValueAtTime(0.0001, _ac.currentTime);
      _bgmBus.gain.linearRampToValueAtTime(target, _ac.currentTime + 0.5);
    } catch (e) {}
  }, 240);
}
function stopBgm() {
  stopSeq();
  if (_peakEl) { try { _peakEl.pause(); } catch (e) {} }
  _curName = null; _curTrack = null;
  if (_bgmBus && _ac) { try { _bgmBus.gain.setTargetAtTime(0.0001, _ac.currentTime, 0.05); } catch (e) {} }
}

/* 音效 */
function sfx(name) {
  const p = audioPref();
  if (!p.sfxOn) return;
  const a = ensureAudio(); if (!a) return;
  resumeAudio();
  const t = a.currentTime + 0.01;
  const bus = _sfxBus;
  const seq = (notes, type, gain, gap, dur) => notes.forEach((m, i) => {
    if (m != null) tone(t + i * gap, m, dur, type, gain, bus);
  });
  switch (name) {
    case "click": tone(t, 96, 0.05, "square", 0.05, bus); break;
    case "back": tone(t, 80, 0.07, "square", 0.05, bus); break;
    case "ban": seq([72, 64], "sawtooth", 0.09, 0.07, 0.09); break;
    case "pick": seq([67, 72, 76], "square", 0.08, 0.06, 0.10); break;
    case "tick": tone(t, 88, 0.035, "triangle", 0.05, bus); break;
    case "win": seq([72, 76, 79, 84], "triangle", 0.13, 0.11, 0.22); break;
    case "lose": seq([69, 65, 60], "triangle", 0.12, 0.14, 0.26); break;
    case "surprise": seq([91, 96], "square", 0.07, 0.05, 0.08); break;
    case "peak": seq([74, 81, 74, 86], "sawtooth", 0.10, 0.09, 0.12); break;
    case "notify": seq([84, 88], "sine", 0.10, 0.08, 0.14); break;
    default: tone(t, 88, 0.04, "square", 0.05, bus);
  }
}

/* 当前局面该放哪首（纯函数，便于测试） */
function bgmTrackFor() {
  if (typeof S === "undefined" || !S) return "menu";
  if (S.gameOver) return "menu";
  if (S.page === "title") return "menu";
  const s = S.series;
  if (s) {
    // 巅峰对决（第 7 局 3:3 盲选）：专属曲，整局都放
    if ((s.draft && s.draft.peak) || (s.battle && s.battle.peak)) return "peak";
    if (s.sub === "over" && s.myScore > s.opScore && s.kind === "playoff" && s.playoffSlot === "gf") return "win";
    return "match";
  }
  return "match";
}

/* 根据当前局面选曲（由 render() 每帧调用，内部去重） */
function updateBgm() {
  if (!audioPref().bgmOn) { if (_curName) stopBgm(); return; }
  playBgm(bgmTrackFor());
}

/* 浏览器要求「先有用户手势」才能出声 */
function unlockAudio() {
  const a = ensureAudio();
  if (!a) return;
  if (a.state === "suspended") a.resume().catch(() => {});
  if (!_curName) updateBgm();
}
