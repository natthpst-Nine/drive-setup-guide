"use strict";
/* ---------- ACS580 assistant panel simulator ---------- */
// panels that can be simulated; I/O and enable signals follow each firmware manual
const SIM_MODELS = ["ACS580", "ACH580", "ACS180"];
const SIMCFG = {
  ACS580: { di: 6, ro: ["10.24", "10.27", "10.30"], ao: ["13.12", "13.22"], runEn: ["20.12"], startEn: ["20.19"], body: "dark", macro: "ABB standard", panel: "ACS-AP-x" },
  ACH580: { di: 6, ro: ["10.24", "10.27", "10.30"], ao: ["13.12", "13.22"], runEn: ["20.40"], startEn: ["20.41", "20.42"], body: "white", macro: "HVAC default", panel: "ACH-AP-H", hoa: true },
  ACS180: { di: 5, ro: ["10.24"], ao: ["13.12"], runEn: ["20.12"], startEn: ["20.19"], body: "dark", macro: "ABB standard", panel: "ACS-AP-x" } };
let SM = SIM_MODELS.includes(S.model) ? S.model : "ACS580";
const CFG = () => SIMCFG[SM];
const MACRO_DIFF = (() => {
  // ACS580 firmware manual, "Parameter default values for different macros"
  const cols = { 1: 0, 2: 1, 3: 2, 7: 3, 11: 4, 12: 5, 13: 6, 14: 7, 15: 8, 16: 9, 17: 10, 28: 11 };
  const T = {
    "10.24": [2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 2, 2], "10.27": [7, 7, 7, 7, 7, 7, 7, 7, 7, 15, 7, 7], "10.30": [15, 15, 15, 15, 15, 15, 15, 15, 15, 46, 15, 15],
    "12.20": [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 1500, 1500], "13.12": [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1], "13.18": [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 1500, 1500],
    "19.11": [0, 5, 4, 0, 0, 0, 0, 0, 0, 5, 0, 5], "20.01": [2, 2, 1, 1, 5, 3, 2, 1, 1, 1, 2, 2], "20.03": [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    "20.04": [3, 3, 0, 0, 3, 3, 3, 0, 0, 0, 3, 3], "20.05": [0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0], "20.06": [0, 2, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    "20.08": [0, 7, 7, 0, 0, 0, 0, 0, 0, 7, 0, 2], "20.09": [0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "20.12": [1, 5, 6, 6, 1, 7, 7, 6, 6, 3, 1, 1],
    "22.11": [1, 1, 1, 16, 1, 1, 15, 16, 16, 1, 1, 1], "28.11": [1, 1, 1, 16, 1, 1, 15, 16, 16, 1, 1, 1],
    "22.18": [0, 2, 16, 0, 0, 0, 0, 0, 0, 16, 0, 0], "28.15": [0, 2, 16, 0, 0, 0, 0, 0, 0, 16, 0, 0],
    "22.21": [1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1], "28.21": [1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
    "22.22": [4, 0, 4, 5, 5, 4, 6, 5, 5, 0, 4, 4], "28.22": [4, 0, 4, 5, 5, 4, 6, 5, 5, 0, 4, 4],
    "22.23": [5, 0, 5, 0, 6, 5, 0, 0, 0, 0, 5, 5], "28.23": [5, 0, 5, 0, 6, 5, 0, 0, 0, 0, 5, 5],
    "22.71": [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], "22.73": [0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0], "22.74": [0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0],
    "23.11": [6, 0, 0, 0, 0, 6, 0, 0, 0, 0, 6, 6], "28.71": [6, 0, 0, 0, 0, 6, 0, 0, 0, 0, 6, 6],
    "40.07": [0, 0, 2, 2, 0, 0, 0, 2, 2, 2, 0, 0], "40.16": [11, 11, 11, 11, 11, 11, 11, 11, 13, 11, 11, 11], "40.17": [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0],
    "40.19": [0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0], "40.20": [0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0],
    "40.32": [1, 1, 1, 1, 1, 1, 1, 1, 1, 2.5, 1, 1], "40.33": [60, 60, 60, 60, 60, 60, 60, 60, 60, 3, 60, 60],
    "76.21": [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0], "76.25": [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1], "76.27": [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1],
    "99.04": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  };
  return code => { const c = cols[code]; if (c == null) return null; const o = {}; for (const k in T) o[k] = T[k][c]; return o; };
})();
const SIMALL = DSG.sim;
let SIMROWS = SIMALL[SM], SROW = new Map(SIMROWS.map(r => [r[0], r]));
const nameOf = n => (SROW.get(n) || pOf(SM, n) || [n, ""])[1];
const SIMP = {};
function simMeta(n) {
  if (n === "REF") { const c = chain(), [lo, hi] = refLimits(); return { t: "num", v: SIM.panelRef, dec: c.vec ? 0 : 1, unit: c.u, min: lo, max: hi }; }
  if (SIMP[n]) return SIMP[n];
  const r = SROW.get(n); if (!r) return null;
  // row: [no, name, type, default, extra] built from the parameter listing + "Additional parameter data"
  const t = r[2], x = r[4], m = { v: r[3] };
  if (t === "o") { m.t = "opt"; m.opts = x; }
  else if (t === "n") { m.t = "num"; m.dec = x[0]; m.unit = x[1]; m.min = x[2]; m.max = x[3]; }
  else if (t === "b") { m.t = "bits"; m.w = x[0]; m.bits = x[1]; }
  else if (t === "t") { m.t = "time"; m.fmt = x; }
  else { m.t = "ro"; m.unit = x || ""; }
  m.def = m.v;
  return SIMP[n] = m;
}
const SIMV = {};
const AIV = { "12.17": ["12.15", 0], "12.18": ["12.15", 10], "12.27": ["12.25", 0], "12.28": ["12.25", 10] };
const V = n => { if (n in SIMV) return SIMV[n]; if (AIV[n] && V(AIV[n][0]) === 2) return AIV[n][1]; return (simMeta(n) || {}).v; };
function setV(n, v) {
  if (n === "REF") { SIM.panelRef = v; simLog(`Reference = ${v} ${chain().u}`); return; }
  SIMV[n] = v; if (n === "96.04" && v) applyMacro(v); if (n === "96.06" && v === 8) restoreDefaults(); if (n === "96.06" && v === 512) { resetHome(); simLog("96.06 Parameter restore: Reset home view"); }
}
function restoreDefaults() { for (const k in SIMV) delete SIMV[k]; SIM.panelRef = 0; SIM.macro = CFG().macro; simLog("96.06 Parameter restore: Restore defaults"); }
function applyMacro(code) {
  const diff = SM === "ACS580" ? MACRO_DIFF(code) : null; restoreDefaults();
  if (diff) for (const k in diff) if (SROW.has(k)) SIMV[k] = diff[k];
  const nm = (simMeta("96.04").opts.find(o => o[0] === code) || [0, ""])[1];
  SIM.macro = nm; SIMV["96.04"] = 0; simLog("96.04 Macro select: " + nm);
}
function fmtV(n) {
  const m = simMeta(n); if (!m) return "";
  const v = V(n);
  if (m.t === "opt") { const o = m.opts.find(o => o[0] === v); return o ? o[1] : String(v); }
  if (m.t === "num") return Number(v).toFixed(m.dec) + (m.unit ? " " + m.unit : "");
  if (m.t === "bits") return fmtBits(m, v);
  if (m.t === "ro") { const live = simLive(n); return live != null ? live : m.v == null || m.v === "-" ? "-" : String(m.v); }
  return String(v);
}
function fmtBits(m, v) {
  const top = Math.max(3, ...m.bits.map(b => b[0]));
  if (m.w === "b" && top < 8) return v.toString(2).padStart(top < 4 ? 4 : 8, "0").replace(/(\d{4})(?=\d)/g, "$1 ") + "b";
  return v.toString(16).toUpperCase().padStart(4, "0") + "h";
}
const isMod = n => n in SIMV && SIMV[n] !== simMeta(n).def;

let holdN = 0;
const SIM = { di: Array(SIMCFG[SM].di).fill(false), diPrev: Array(SIMCFG[SM].di).fill(false), ai: [0, 4], sto: true, local: false, panelRef: 0, panelRun: false, panelDir: 1, latch: false, latchDir: 1,
  f: 0, run: false, fault: null, warn: [], faultHidden: false, inhibit: [], pid: 0, pidI: 0, sleep: false, sleepT: 0, wakeT: 0, mpot: 0, log: [], macro: SIMCFG[SM].macro, hoa: "auto", home: 0, homeViews: [["01.06", "01.07", "01.10"], ["01.10", "01.14"]], pfcAux: 0, pfcT: 0 };
function simLog(t) { SIM.log.unshift(new Date().toLocaleTimeString("en-GB") + "  " + t); SIM.log = SIM.log.slice(0, 40); }
const DI = i => i < SIM.di.length && !!SIM.di[i];
// reference range from the active minimum/maximum (30.11/30.12 or 30.13/30.14)
// why the reference cannot go below zero (reverse) on this drive's settings
function revBlocked() { const c = chain(); return V("20.21") === 1 ? "Reverse blocked: 20.21 Direction = Forward" : V(c.mn) >= 0 ? `Reverse blocked: ${c.mn} ${nameOf(c.mn)} = ${V(c.mn)} ${c.u}` : ""; }
function refLimits() { const c = chain(), hi = Math.abs(V(c.mx)), lo = Math.min(0, V(c.mn)); return [Math.max(-hi, lo), hi]; }
// switch the simulator to another drive: its own parameter table, defaults and I/O
function useSimModel(m) {
  SM = m; SIMROWS = SIMALL[m]; SROW = new Map(SIMROWS.map(r => [r[0], r]));
  for (const k in SIMP) delete SIMP[k];
  for (const k in SIMV) delete SIMV[k];
  const n = CFG().di;
  Object.assign(SIM, { di: Array(n).fill(false), diPrev: Array(n).fill(false), ai: [0, 4], sto: true, local: false, panelRef: 0, panelRun: false, panelDir: 1, f: 0, run: false,
    fault: null, warn: [], inhibit: [], latch: false, pid: 0, pidI: 0, sleep: false, mpot: 0, log: [], macro: CFG().macro, hoa: "auto", pfcAux: 0, pfcT: 0 });
  resetHome(); STK = [{ t: "home" }];
  simLog(`${m} simulator – factory defaults (${CFG().macro})`);
}
const srcA = c => c === 1 ? true : (c >= 2 && c <= 7) ? DI(c - 2) : false;
const srcB = c => c === 1 ? true : (c >= 3 && c <= 8) ? DI(c - 3) : false;
const aiUnit = i => (V(i ? "12.25" : "12.15") === 10 ? "mA" : "V");
function aiScaled(i) {
  const [mn, mx, smn, smx] = i ? ["12.27", "12.28", "12.29", "12.30"] : ["12.17", "12.18", "12.19", "12.20"];
  const a = V(mn), b = V(mx); if (b === a) return V(smn);
  const r = Math.max(0, Math.min(1, (SIM.ai[i] - a) / (b - a)));
  return V(smn) + r * (V(smx) - V(smn));
}
const aiPct = i => { const [mn, mx] = i ? ["12.27", "12.28"] : ["12.17", "12.18"]; return Math.max(0, Math.min(100, (SIM.ai[i] - V(mn)) / ((V(mx) - V(mn)) || 1) * 100)); };
function chain() {
  const vec = V("99.04") === 0;
  return vec ? { vec, r1: "22.11", r2: "22.18", cf: "22.21", s: ["22.22", "22.23", "22.24"], cv: "22.26", rs: "23.11", a1: "23.12", d1: "23.13", a2: "23.14", d2: "23.15", mn: "30.11", mx: "30.12", sc: "46.01", u: "rpm" }
             : { vec, r1: "28.11", r2: "28.15", cf: "28.21", s: ["28.22", "28.23", "28.24"], cv: "28.26", rs: "28.71", a1: "28.72", d1: "28.73", a2: "28.74", d2: "28.75", mn: "30.13", mx: "30.14", sc: "46.02", u: "Hz" };
}
const nomRpm = () => V("99.09") || 1500, nomHz = () => V("99.08") || 50;
const toHz = (x, c) => c.vec ? x * nomHz() / nomRpm() : x;
function faultName(code) { const f = D[SM].F.find(x => x[1] === code); return f ? f[2].split(" · ")[0] : code; }
function trip(code) { if (SIM.fault) return; SIM.fault = code; SIM.faultHidden = false; SIM.run = false; SIM.latch = false; SIM.panelRun = false; simLog(`Fault ${code} ${faultName(code)}`); }

let refUsed = 0, cmdInfo = "", refInfo = "";
function simTick(dt) {
  const c = chain(), ext2 = srcB(V("19.11")), rise = SIM.di.map((v, i) => v && !SIM.diPrev[i]);
  const fr = V("31.11"); if (fr >= 2 && fr <= 7 && rise[fr - 2] && SIM.fault) { simLog("Fault reset (31.11 DI" + (fr - 1) + ")"); SIM.fault = null; }
  const warn = [];
  if (!srcB(V("31.01"))) { if (V("31.02") === 1) warn.push("A981"); else trip("9081"); }
  if (V("12.03") > 0) { const b = V("12.04"), lo = ((b & 1) && SIM.ai[0] < V("12.17") - 0.5) || ((b & 4) && SIM.ai[1] < V("12.27") - 0.5); if (lo) { if (V("12.03") === 1) trip("80A0"); else warn.push("A8A0"); } }
  if (!SIM.sto) { if (SIM.run) trip("5091"); else warn.push("A5A0"); }
  const estopOk = srcB(V("21.05")); if (!estopOk) warn.push(V("21.04") === 1 ? "AFE1" : "AFE2");
  const local = SIM.local, mode = local ? 11 : (ext2 ? V("20.06") : V("20.01"));
  const ins = (ext2 ? ["20.08", "20.09", "20.10"] : ["20.03", "20.04", "20.05"]).map(n => V(n));
  const edge = (ext2 ? V("20.07") : V("20.02")) === 0;
  const i1 = srcA(ins[0]), i2 = srcA(ins[1]), i3 = srcA(ins[2]);
  const r1 = ins[0] >= 2 && ins[0] <= 7 ? rise[ins[0] - 2] : false, r2 = ins[1] >= 2 && ins[1] <= 7 ? rise[ins[1] - 2] : false;
  const nm = (n, v) => { const m = simMeta(n), o = m && m.opts ? m.opts.find(o => o[0] === v) : null; return o ? o[1] : String(v); };
  let start = false, dir = 1;
  if (mode === 1 || mode === 2) { if (edge) { if (r1) SIM.latch = true; if (!i1) SIM.latch = false; start = SIM.latch; } else start = i1; if (mode === 2) dir = i2 ? -1 : 1; }
  else if (mode === 3) { start = i1 !== i2; dir = i2 && !i1 ? -1 : 1; }
  else if (mode === 4 || mode === 5) { if (r1 && i2) SIM.latch = true; if (!i2) SIM.latch = false; start = SIM.latch; if (mode === 5) dir = i3 ? -1 : 1; }
  else if (mode === 6) { if (r1 && i3) { SIM.latch = true; SIM.latchDir = 1; } if (r2 && i3) { SIM.latch = true; SIM.latchDir = -1; } if (!i3) SIM.latch = false; start = SIM.latch; dir = SIM.latchDir; }
  else if (mode === 11) { start = SIM.panelRun; dir = SIM.panelDir; }
  if (local) { start = SIM.panelRun; dir = SIM.panelDir; }
  cmdInfo = local ? "Control panel (Local)" : `${ext2 ? "20.06 Ext2" : "20.01 Ext1"} commands = ${nm(ext2 ? "20.06" : "20.01", mode)}` + (mode === 12 || mode === 14 ? " (fieldbus not simulated)" : "");
  const dp = V("20.21"); if (dp === 1) dir = 1; if (dp === 2) dir = -1;
  const has = n => SROW.has(n), runEn = local || CFG().runEn.every(n => !has(n) || srcA(V(n))), startEn = local || CFG().startEn.every(n => !has(n) || srcA(V(n)));
  let ref = 0; const src = ext2 ? V(c.r2) : V(c.r1);
  if (local) { ref = SIM.panelRef; refInfo = "Control panel (Local)"; }
  else {
    refInfo = `${ext2 ? c.r2 : c.r1} = ${nm(c.r1, src)}`;
    if (src === 1) ref = aiScaled(0); else if (src === 2) ref = aiScaled(1);
    else if (src === 18 || src === 19) ref = SIM.panelRef;
    else if (src === 15) { const up = srcA(V("22.73")), dn = srcA(V("22.74")), span = (V("22.77") - V("22.76")) || 1, t = V("22.75") || 1;
      if (V("22.71") > 0) { if (up && !dn) SIM.mpot += span / t * dt; if (dn && !up) SIM.mpot -= span / t * dt; SIM.mpot = Math.max(V("22.76"), Math.min(V("22.77"), SIM.mpot)); } ref = SIM.mpot; }
    else if (src === 16) { ref = SIM.sleep ? 0 : SIM.pid; refInfo += ` (40.01 = ${SIM.pid.toFixed(2)})`; }
    const cfw = V(c.cf), s = c.s.map(n => srcA(V(n)));
    const idx = (cfw & 1) ? (s[0] ? 1 : 0) + (s[1] ? 2 : 0) + (s[2] ? 4 : 0) : (s[0] ? 1 : s[1] ? 2 : s[2] ? 3 : 0);
    if (idx) { const b = c.cv.split("."); ref = V(b[0] + "." + String(+b[1] + idx - 1)); refInfo = `Constant ${c.vec ? "speed" : "frequency"} ${idx}`; }
  }
  const pidOn = V("40.07") === 1 || (V("40.07") === 2 && SIM.run);
  if (pidOn && !local) {
    const fbS = V("40.08"), spS = V("40.16");
    const fb = fbS === 1 ? aiScaled(0) : fbS === 2 ? aiScaled(1) : fbS === 8 ? aiPct(0) : fbS === 9 ? aiPct(1) : 0;
    const isel = (srcA(V("40.19")) ? 1 : 0) + (srcA(V("40.20")) ? 2 : 0);          // internal setpoint 0...3 = 40.24, 40.21, 40.22, 40.23
    const sp = spS === 2 ? V(["40.24", "40.21", "40.22", "40.23"][isel]) : spS === 3 ? aiScaled(0) : spS === 4 ? aiScaled(1) : spS === 11 ? aiPct(0) : spS === 12 ? aiPct(1) : (spS === 13 || spS === 14) ? SIM.panelRef : 0;
    let e = sp - fb; if (V("40.31") === 1) e = -e;
    // control chain (manual "Process PID controller" diagram): deviation / 40.14 input scale -> PID -> x 40.15 output scale -> 40.36/40.37 limits = 40.01
    // 40.14 = 0: automatic setpoint scale (100 for percent sources, the AI scaling for scaled ones); 40.15 = 0: 46.01 / 46.02
    const spScale = V("40.14") || (spS === 3 ? V("12.20") : spS === 4 ? V("12.30") : 100) || 100, outScale = V("40.15") || V(c.sc) || 50, eN = e / spScale * outScale;
    const kp = V("40.32") || 1, ti = V("40.33") || 0, lo = V("40.36"), hi = V("40.37");
    if (ti > 0 && !SIM.sleep) SIM.pidI += kp * eN * dt / ti;
    SIM.pidI = Math.max(lo, Math.min(hi, SIM.pidI)); SIM.pid = Math.max(lo, Math.min(hi, kp * eN + SIM.pidI)); SIM.pidSp = sp; SIM.pidFb = fb;
    const sl = V("40.43");
    if (sl > 0 && !SIM.sleep && SIM.run) { SIM.sleepT = SIM.pid < sl ? SIM.sleepT + dt : 0; if (SIM.sleepT >= V("40.44")) { SIM.sleep = true; SIM.wakeT = 0; simLog("PID sleep"); } }
    if (SIM.sleep) { const dev = V("40.31") === 1 ? fb - sp : sp - fb; SIM.wakeT = dev > V("40.47") ? SIM.wakeT + dt : 0; if (SIM.wakeT >= V("40.48")) { SIM.sleep = false; SIM.sleepT = 0; simLog("PID wake-up"); } }
  } else { SIM.pid = 0; SIM.pidI = 0; SIM.sleep = false; }
  // jogging: external control only; a start that is already running keeps priority
  const jogEn = SROW.has("20.25") && !local && srcA(V("20.25")), j1 = jogEn && srcA(V("20.26")), j2 = jogEn && srcA(V("20.27"));
  if (!start) SIM.needFresh = false;
  if (jogEn && start && !(SIM.run && !SIM.jog)) SIM.needFresh = true;
  if (SIM.needFresh) start = false;                       // start is ignored while jogging is enabled; a fresh start is needed after
  if (!(SIM.jog === 1 && j1) && !(SIM.jog === 2 && j2)) SIM.jog = j1 ? 1 : j2 ? 2 : 0;   // the jog activated first has priority
  const jogOn = !start && SIM.jog > 0;
  let refHz = toHz(ref, c) * dir; const mn = toHz(V(c.mn), c), mx = toHz(V(c.mx), c);
  if (jogOn) {
    const jr = c.vec ? (SIM.jog === 1 ? "22.42" : "22.43") : (SIM.jog === 1 ? "28.42" : "28.43");
    refHz = toHz(V(jr), c); refInfo = `Jogging ${SIM.jog} ref ${jr} = ${V(jr)} ${c.u}`; cmdInfo = `Jogging ${SIM.jog} (${SIM.jog === 1 ? "20.26" : "20.27"}), enabled by 20.25`;
  }
  refHz = Math.max(mn, Math.min(mx, refHz)); refUsed = refHz;
  const inh = [];
  if (SIM.fault) inh.push("Fault active – reset required");
  if (!runEn) inh.push(`${nameOf(CFG().runEn[0])} missing (${CFG().runEn.join(", ")})`);
  if (!startEn) inh.push(`${nameOf(CFG().startEn[0])} missing (${CFG().startEn.filter(n => SROW.has(n) && !srcA(V(n))).join(", ")})`);
  if (!SIM.sto) inh.push("Safe torque off (STO)");
  if (!estopOk) inh.push("Emergency stop (21.05)");
  SIM.inhibit = inh; SIM.warn = warn;
  const want = (start || jogOn) && !SIM.fault && runEn && startEn && SIM.sto && estopOk && !SIM.sleep;
  if (want && !SIM.run) simLog((jogOn ? "Jogging – " : "Start – ") + cmdInfo); if (!want && SIM.run) simLog(SIM.jogRun ? "Jogging off – decelerating on 23.21" : "Stop");
  if (jogEn && SIM.needFresh && !SIM.jogWarned) { simLog("Start ignored while jogging is enabled (20.25)"); SIM.jogWarned = true; } if (!SIM.needFresh) SIM.jogWarned = false;
  SIM.jogRun = want && jogOn;
  if (SIM.jogRun) SIM.jogStop = true; else if (start || Math.abs(SIM.f) < 1e-6) SIM.jogStop = false;
  SIM.run = want; SIM.startPending = start && !want;
  const rs = V(c.rs), set2 = rs === 1 || (rs >= 2 && rs <= 7 && DI(rs - 2));
  const jr = SIM.jogStop && SROW.has("23.20");   // jogging and the stop after it use the jogging ramps
  const fsc = toHz(V(c.sc), c) || 50, acc = jr ? V("23.20") : V(set2 ? c.a2 : c.a1), dec = jr ? V("23.21") : V(set2 ? c.d2 : c.d1), target = SIM.run ? refHz : 0;
  const coast = !SIM.run && !(SIM.jogStop && !SIM.fault && SIM.sto) && (SIM.fault || !SIM.sto || (!runEn && (!SROW.has("20.11") || V("20.11") === 0)) || (!estopOk && V("21.04") === 1) || V("21.03") === 0);
  if (coast) SIM.f = 0;
  else { const accel = Math.abs(target) > Math.abs(SIM.f), t = accel ? acc : dec, rate = t > 0 ? fsc / t : 1e9, d = target - SIM.f; SIM.f += Math.sign(d) * Math.min(Math.abs(d), rate * dt); }
  // PFC: PFC1 = motor on the drive, PFC2... = auxiliary motors started/stopped from the drive speed (76.30.../76.41..., 76.55/76.56)
  const pfcOn = SROW.has("76.21") && /^PFC$/.test(nameOfOpt("76.21")), auxMax = pfcOn ? Math.max(0, Math.min(V("76.25"), V("76.27")) - 1) : 0;
  if (!pfcOn || !SIM.run) { if (SIM.pfcAux) simLog("PFC: auxiliary motors stopped"); SIM.pfcAux = 0; SIM.pfcT = 0; }
  else {
    const spd = c.vec ? Math.abs(SIM.f) * nomRpm() / nomHz() : Math.abs(SIM.f), k = SIM.pfcAux;
    const startPt = V("76." + (30 + k)), stopPt = k ? V("76." + (40 + k)) : -1, free = n => !SROW.has("76.8" + n) || srcA(V("76.8" + n));
    if (k < auxMax && spd >= startPt - 0.05 && free(k + 2)) { SIM.pfcT = Math.max(0, SIM.pfcT) + dt; if (SIM.pfcT >= V("76.55")) { SIM.pfcAux++; SIM.pfcT = 0; simLog(`PFC: start auxiliary motor ${SIM.pfcAux} (PFC${SIM.pfcAux + 1}) – speed ≥ 76.${30 + k} Start point ${k + 1} = ${startPt} ${c.u} for 76.55`); } }
    else if (k > 0 && spd <= stopPt) { SIM.pfcT = Math.min(0, SIM.pfcT) - dt; if (-SIM.pfcT >= V("76.56")) { simLog(`PFC: stop auxiliary motor ${k} (PFC${k + 1}) – speed ≤ 76.${40 + k} Stop point ${k} = ${stopPt} ${c.u} for 76.56`); SIM.pfcAux--; SIM.pfcT = 0; } }
    else SIM.pfcT = 0;
  }
  SIM.pfcOn = pfcOn;
  SIM.diPrev = SIM.di.slice();
}
const nameOfOpt = n => { const m = simMeta(n), o = m && m.opts ? m.opts.find(o => o[0] === V(n)) : null; return o ? o[1] : ""; };
// Home view signals (Options > Edit Home view); each page shows 1–3 signals
const HOME_DEF = () => [["01.06", "01.07", "01.10"], ["01.10", "01.14"]];
const HOME_SIGS = ["01.06", "01.01", "01.03", "01.07", "01.08", "01.10", "01.11", "01.13", "01.14", "01.15", "01.24", "12.11", "12.12", "12.101", "12.21", "12.22", "12.102", "28.01", "40.01", "40.02", "40.03"];
function homeSig(n) {
  const t = String(simLive(n) ?? fmtV(n)), m = t.match(/^\s*(-?\d+(?:\.\d+)?)\s*(.*)$/);
  return [nameOf(n), m ? m[2] : "", m ? m[1] : t];
}
function resetHome() { SIM.homeViews = HOME_DEF(); SIM.home = 0; }
function editHome() {
  const view = () => SIM.homeViews[SIM.home];
  STK.push({ t: "list", title: "Edit Home view", i: 0, r: "Edit", items: () => [...[0, 1, 2].map(k => ({ label: "Signal " + (k + 1), value: view()[k] ? nameOf(view()[k]) : "Not selected", slot: k })), { label: "Reset home view" }],
    onSel: it => {
      if (it.slot == null) { SIM.homeViews[SIM.home] = HOME_DEF()[SIM.home]; simLog("Home view reset"); return; }
      const cur = view()[it.slot] || "";
      const ch = [...(it.slot ? [["", "Not selected"]] : []), ...HOME_SIGS.filter(n => SROW.has(n)).map(n => [n, n + " " + nameOf(n)])];
      STK.push({ t: "list", title: "Signal " + (it.slot + 1), i: Math.max(0, ch.findIndex(c => c[0] === cur)), l: "Cancel", r: "Save", items: () => ch.map(c => ({ label: c[1], value: c[0] === cur ? "◉" : "" , n: c[0] })),
        onSel: c => { const v = view().slice(); v[it.slot] = c.n; SIM.homeViews[SIM.home] = v.filter(Boolean); simLog(`Home view ${SIM.home + 1}: signal ${it.slot + 1} = ${c.n ? c.n + " " + nameOf(c.n) : "Not selected"}`); STK.pop(); } });
    } });
}
function simLive(n) {
  const f = SIM.f, ld = Math.min(1.2, Math.abs(f) / nomHz()), inom = V("99.06") || 10;
  const cur = f === 0 ? 0 : inom * (0.32 + 0.6 * ld * ld), tq = f === 0 ? 0 : 100 * (0.15 + 0.7 * ld * ld), pw = f === 0 ? 0 : (V("99.10") || 4) * ld * ld * ld;
  switch (n) {
    case "01.06": return f.toFixed(2) + " Hz"; case "01.01": return (f * nomRpm() / nomHz()).toFixed(0) + " rpm";
    case "01.07": return cur.toFixed(2) + " A"; case "01.10": return tq.toFixed(1) + " %"; case "01.14": return pw.toFixed(2) + " kW";
    case "12.11": return SIM.ai[0].toFixed(3) + " " + aiUnit(0); case "12.12": return aiScaled(0).toFixed(3);
    case "12.21": return SIM.ai[1].toFixed(3) + " " + aiUnit(1); case "12.22": return aiScaled(1).toFixed(3);
    case "10.02": return SIM.di.map(x => (x ? 1 : 0)).reverse().join("") + "b";
    case "76.01": return (SIM.run ? 1 : 0) + Array.from({ length: 5 }, (_, i) => SIM.pfcAux > i ? 1 : 0).reduce((a, b, i) => a + (b << (i + 1)), 0).toString(16).toUpperCase().padStart(4, "0") + "h";
    case "40.01": return SIM.pid.toFixed(2); case "40.02": return (SIM.pidFb || 0).toFixed(2); case "40.03": return (SIM.pidSp || 0).toFixed(2);
    case "04.01": return SIM.fault || "0000h"; case "28.01": case "28.02": return refUsed.toFixed(2) + " Hz";
    case "01.03": return (100 * f / nomHz()).toFixed(2) + " %"; case "01.08": return (100 * cur / inom).toFixed(1) + " %";
    case "01.11": return (1.35 * (V("99.07") || 400) * (SIM.sto ? 1 : 1)).toFixed(0) + " V"; case "01.13": return ((V("99.07") || 400) * Math.min(1, Math.abs(f) / nomHz())).toFixed(0) + " V";
    case "01.15": return (100 * pw / (V("99.10") || 4)).toFixed(1) + " %"; case "01.24": return (f === 0 ? 0 : 100).toFixed(0) + " %";
    case "12.101": return (aiPct(0)).toFixed(2) + " %"; case "12.102": return (aiPct(1)).toFixed(2) + " %";
  }
  return null;
}
function roState(code) {
  const ready = !SIM.fault && SIM.sto && SIM.inhibit.length === 0, atSp = SIM.run && Math.abs(SIM.f - refUsed) < 0.5;
  switch (code) {
    case 1: return true; case 2: return ready; case 4: return !SIM.fault && SIM.sto; case 5: case 6: case 7: return SIM.run;
    case 8: case 9: return atSp; case 10: return SIM.f < 0; case 11: return Math.abs(SIM.f) < 0.5;
    case 13: return SIM.warn.length > 0; case 14: return !!SIM.fault; case 15: return !SIM.fault; case 16: return !!SIM.fault || SIM.warn.length > 0;
    case 23: return srcB(V("19.11")); case 24: return !SIM.local; case 45: return SIM.run;
    case 46: case 47: case 48: case 49: case 50: return SIM.pfcOn && SIM.run && SIM.pfcAux >= code - 45;
  }
  return false;
}
function aoValue(i) {
  const [sN, mn, mx, omn, omx] = i ? ["13.22", "13.27", "13.28", "13.29", "13.30"] : ["13.12", "13.17", "13.18", "13.19", "13.20"];
  const s = V(sN), f = SIM.f;
  const val = s === 3 ? f : s === 28 ? Math.abs(f) : s === 1 ? f * nomRpm() / nomHz() : s === 4 ? parseFloat(simLive("01.07")) : s === 6 ? parseFloat(simLive("01.10")) : s === 16 ? SIM.pid : 0;
  const r = (V(mx) - V(mn)) ? (val - V(mn)) / (V(mx) - V(mn)) : 0;
  return (V(omn) + Math.max(0, Math.min(1, r)) * (V(omx) - V(omn))).toFixed(2) + " " + (i ? "mA" : (V("13.15") === 2 ? "V" : "mA"));
}
function diUsers(i) {
  const out = [], chk = (n, enc) => { const v = V(n); if ((enc === "A" && v === i + 2) || (enc === "B" && v === i + 3)) out.push(n + " " + nameOf(n)); };
  ["20.03", "20.04", "20.05", "20.08", "20.09", "20.10", "20.25", "20.26", "20.27", ...CFG().runEn, ...CFG().startEn].filter(n => SROW.has(n)).forEach(n => chk(n, "A")); chk("19.11", "B");
  const c = chain(); c.s.forEach(n => chk(n, "A")); chk(c.rs, "A");
  ["31.01", "21.05"].filter(n => SROW.has(n)).forEach(n => chk(n, "B")); ["31.11", "22.73", "22.74"].filter(n => SROW.has(n)).forEach(n => chk(n, "A"));
  return out;
}

/* ---- panel screens (Assistant control panel ACS-AP) ---- */
let STK = [{ t: "home" }];
const wrapI = (i, d, n) => n ? (i + d + n) % n : 0;
const top_ = () => STK[STK.length - 1];
const GROUPS = () => Object.entries(D[SM].groups).sort((a, b) => +a[0] - +b[0]);
const pInGroup = g => SIMROWS.filter(r => gKey(r[0]) === g);
const ROWS = 7;
const PRIMARY = [
  ["Macro:", ["96.04"]], ["Motor", ["99.04", "99.06", "99.07", "99.08", "99.09", "99.10", "99.13"]],
  ["Start, stop, reference", ["28.11", "20.01", "20.03", "20.04", "19.11", "28.21", "28.22", "28.23", "28.26", "28.27", "28.28"]],
  ["Jogging", ["20.25", "20.26", "20.27", "22.42", "22.43", "28.42", "28.43", "23.20", "23.21"]],
  ["Ramps", ["28.72", "28.73", "28.71", "28.74", "28.75", "21.03"]], ["Limits", ["30.13", "30.14", "30.17"]],
  ["PID", ["40.07", "40.08", "40.16", "40.24", "40.32", "40.33", "40.43", "40.44", "40.47", "40.48"]],
  ["Pump and fan control", ["76.21", "76.25", "76.27", "76.30", "76.41", "76.70"]],
  ["Fieldbus", ["58.01", "58.03", "58.04", "58.05"]],
  ["Advanced functions", ["31.01", "31.02", "31.11", "21.05", "34.10", "21.18"]],
  ["Clock, region, display", null], ["Reset to defaults", ["96.06"]],
];
const MAINMENU = ["Primary settings", "I/O", "Diagnostics", "System info", "Energy efficiency", "Backups", "Parameters"];
function listScr(title, items, s, l, r) {
  if (!items.length) return { title, body: `<div class="lhelp">No parameters</div>`, l, r: "" };
  s.i = Math.max(0, Math.min(items.length - 1, s.i || 0));
  const st = Math.max(0, Math.min(s.i - 3, items.length - ROWS)), vis = items.slice(st, st + ROWS);
  const sb = items.length > ROWS ? `<div class="lsb"><i style="top:${st / items.length * 100}%;height:${ROWS / items.length * 100}%"></i></div>` : "";
  return { title, body: `<div class="ll">${vis.map((it, k) => `<div class="lr ${st + k === s.i ? "sel" : ""}"><span>${esc(it.label)}</span>${it.value != null && it.value !== "" ? `<em>${esc(it.value)}</em>` : ""}${it.arrow ? "<em>▸</em>" : ""}</div>`).join("")}</div>${sb}`, l, r };
}
const paramItems = list => list.filter(n => SROW.has(n)).map(n => ({ label: n + " " + nameOf(n), value: fmtV(n), p: n }));
function screen() {
  const s = top_();
  if (SIM.fault && !SIM.faultHidden && s.t !== "help") return { title: "Fault", body: `<div class="lfault"><div class="lfi">✕</div><div><div class="lfc">${SIM.fault}</div><div>${esc(faultName(SIM.fault))}</div></div></div><div class="lsmall">Aux code: 0000 0000</div>`, l: "Hide", r: "Reset" };
  if (s.t === "home") {
    const v = SIM.homeViews[SIM.home].map(homeSig), last = SIM.homeViews.length - 1;
    return { body: `<div class="hv">${SIM.home ? '<span class="arl">◀</span>' : ""}${v.map(r => `<div class="hb"><div class="hl"><span>${esc(r[0])}</span><span>${esc(r[1])}</span></div><b>${r[2]}</b></div>`).join("")}${SIM.home < last ? '<span class="arr">▶</span>' : ""}</div>`, l: "Options", r: "Menu", home: true };
  }
  if (s.t === "menu") return listScr("Main menu", MAINMENU.map(x => ({ label: x, arrow: true })), s, "Exit", "Select");
  if (s.t === "list") return listScr(s.title, s.items(), s, s.l || "Back", s.r || "Select");
  if (s.t === "edit") return editScr(s);
  return { title: s.title || "Help", body: `<div class="lhelp">${esc(s.text)}</div>`, l: "Back", r: "" };
}
function editScr(s) {
  const n = s.p, m = simMeta(n);
  const title = n === "REF" ? "Reference" : n + " " + nameOf(n);
  if (m.t === "opt") {
    s.i = Math.max(0, Math.min(m.opts.length - 1, s.i));
    const rows = ROWS - 1, st = Math.max(0, Math.min(s.i - 2, m.opts.length - rows));
    return { title, body: `<div class="ll">${m.opts.slice(st, st + rows).map((o, k) => `<div class="lr ${st + k === s.i ? "sel" : ""}"><span>${esc(o[1])}</span>${o[0] === V(n) ? "<em>◉</em>" : ""}</div>`).join("")}</div>`, l: "Cancel", r: "Save" };
  }
  if (m.t === "num") return { title, body: `<div class="enum">${numHtml(s, m)}<small>${esc(m.unit || "")}</small></div><div class="lsmall">${m.min != null ? `Min ${m.min}  Max ${m.max}` : ""}</div>`, l: "Cancel", r: "Save", num: true };
  if (m.t === "bits") {
    const bits = m.bits.length ? m.bits : [...Array(16)].map((_, k) => [k, "Bit " + k]);
    s.i = Math.max(0, Math.min(bits.length - 1, s.i));
    const rows = ROWS - 1, st = Math.max(0, Math.min(s.i - 2, bits.length - rows));
    return { title, body: `<div class="ll">${bits.slice(st, st + rows).map((b, k) => `<div class="lr ${st + k === s.i ? "sel" : ""}"><span>${(s.buf >> b[0]) & 1 ? "☑" : "☐"} ${b[0]} ${esc(b[1])}</span></div>`).join("")}</div>`, l: "Cancel", r: "Save" };
  }
  if (m.t === "time") return { title, body: `<div class="enum">${s.buf.split("").map((ch, k) => `<span class="${k === s.cur ? "cur" : ""}">${ch === " " ? "&nbsp;" : esc(ch)}</span>`).join("")}</div><div class="lsmall">${esc(m.fmt)}</div>`, l: "Cancel", r: "Save", num: true };
  const ro = fmtV(n);
  return { title, body: `<div class="lro"><b>${esc(ro)}</b>${m.unit && ro !== "-" && !ro.endsWith(m.unit) ? `<small>${esc(m.unit)}</small>` : ""}</div><div class="lsmall">Read-only (actual value)</div>`, l: "Back", r: "" };
}
function openEdit(n) {
  const m = simMeta(n); if (!m) return;
  const s = { t: "edit", p: n, i: 0 };
  if (m.t === "opt") s.i = Math.max(0, m.opts.findIndex(o => o[0] === V(n)));
  if (m.t === "num") { s.val = Number(n === "REF" ? SIM.panelRef : V(n)) || 0; s.place = -m.dec; }
  if (m.t === "bits") s.buf = V(n);
  if (m.t === "time") { s.buf = String(V(n)); s.cur = s.buf.search(/\d(?!.*\d)/); }
  STK.push(s);
}
const pushParamList = (title, list) => STK.push({ t: "list", title, i: 0, items: () => paramItems(typeof list === "function" ? list() : list), onSel: it => openEdit(it.p), r: "Edit" });
function selectMain(x) {
  if (x === "Primary settings") STK.push({ t: "list", title: "Primary settings", i: 0, items: () => PRIMARY.filter(([l, ps]) => !ps || ps.some(n => SROW.has(n))).map(([l, ps]) => ({ label: l, value: l === "Macro:" ? SIM.macro : null, arrow: l !== "Macro:", ps })), onSel: it => {
    if (!it.ps) STK.push({ t: "msg", title: it.label, text: "Not simulated." }); else if (it.ps.length === 1) openEdit(it.ps[0]); else pushParamList(it.label, it.ps); } });
  else if (x === "Parameters") STK.push({ t: "list", title: "Parameters", i: 0, items: () => [{ label: "Complete list", arrow: true }, { label: "Modified", arrow: true }], onSel: it => {
    if (it.label === "Modified") pushParamList("Modified", () => Object.keys(SIMV).filter(isMod).sort());
    else STK.push({ t: "list", title: "Complete list", i: 0, items: () => GROUPS().map(([k, v]) => ({ label: k.padStart(2, "0") + " " + v, arrow: true, g: k })), onSel: g => pushParamList(g.label, pInGroup(g.g).map(p => p[0])) }); } });
  else if (x === "I/O") STK.push({ t: "list", title: "I/O", i: 0, items: () => [
      ...SIM.di.map((v, i) => ({ label: `DI${i + 1}`, value: (v ? "1" : "0") + "  " + (diUsers(i)[0] || "").replace(/^\d+\.\d+ /, ""), io: i })),
      { label: "AI1", value: SIM.ai[0].toFixed(2) + " " + aiUnit(0), io: "ai" }, { label: "AI2", value: SIM.ai[1].toFixed(2) + " " + aiUnit(1), io: "ai" },
      ...CFG().ro.map((n, i) => ({ label: `RO${i + 1}`, value: (roState(V(n)) ? "1" : "0") + "  " + fmtV(n), p: n })),
      ...CFG().ao.map((n, i) => ({ label: `AO${i + 1}`, value: aoValue(i), p: n }))],
    onSel: it => { if (it.p) openEdit(it.p); else if (typeof it.io === "number") STK.push({ t: "msg", title: "DI" + (it.io + 1), text: diUsers(it.io).join("\n") || "Not used" }); } });
  else if (x === "Diagnostics") STK.push({ t: "list", title: "Diagnostics", i: 0, items: () => [
      { label: "Start, stop, reference summary", arrow: true }, { label: "Limit status", arrow: true }, { label: "Active faults", value: SIM.fault ? "1" : "0" }, { label: "Active warnings", value: String(SIM.warn.length) },
      { label: "Active inhibits", value: String(SIM.inhibit.length) }, { label: "Fault & event log", arrow: true }],
    onSel: it => {
      const c = chain(), txt = {
        "Start, stop, reference summary": () => `Control location: ${SIM.local ? "Local" : "Remote, " + (srcB(V("19.11")) ? "EXT2" : "EXT1")}\nStart/stop: ${cmdInfo}\nReference: ${refInfo}\nRef used: ${refUsed.toFixed(2)} Hz`,
        "Limit status": () => `Min ${V(c.mn)} ${c.u} (${c.mn})\nMax ${V(c.mx)} ${c.u} (${c.mx})`,
        "Active faults": () => SIM.fault ? `${SIM.fault} ${faultName(SIM.fault)}` : "No active faults",
        "Active warnings": () => SIM.warn.length ? SIM.warn.map(w => w + " " + faultName(w)).join("\n") : "No active warnings",
        "Active inhibits": () => SIM.inhibit.length ? SIM.inhibit.join("\n") : "No active inhibits",
        "Fault & event log": () => SIM.log.slice(0, 10).join("\n") || "Empty" };
      STK.push({ t: "msg", title: it.label, text: txt[it.label]() });
    } });
  else if (x === "System info") STK.push({ t: "msg", title: "System info", text: `Drive: ${SM} (simulator)\nPanel: ${CFG().panel}\nMacro: ${SIM.macro}` });
  else STK.push({ t: "msg", title: x, text: "Not simulated." });
}
const HELP_HOA = "Hand: start from the panel (local), reference with Up/Down\nOff: stop (local)\nAuto: external control (I/O, fieldbus)\nOptions / Menu: softkeys";
const HELP = { home: "Up/Down: change reference (Local)\nLeft/Right: Home view\nOptions / Menu: softkeys", menu: "Up/Down: select\nRight softkey: Select\nLeft softkey: Exit", list: "Up/Down: select\nRight softkey: Select / Edit\nLeft softkey: Back", edit: "Up/Down: change value\nLeft/Right: move cursor\nRight softkey: Save\nLeft softkey: Cancel" };
const panelCtl = () => SIM.local || V(srcB(V("19.11")) ? "20.06" : "20.01") === 11;
function key(k) {
  const s = top_();
  if (k === "help") { if (s.t === "help") STK.pop(); else STK.push({ t: "help", title: "Help", text: (s.t === "home" && CFG().hoa ? HELP_HOA : HELP[s.t]) || "" }); return; }
  if (CFG().hoa && (k === "start" || k === "stop" || k === "locrem")) {
    const was = SIM.hoa;
    if (k === "start") { if (was === "auto") { const c = chain(); SIM.panelRef = +(c.vec ? refUsed * nomRpm() / nomHz() : refUsed).toFixed(c.vec ? 0 : 1); } SIM.hoa = "hand"; SIM.local = true; SIM.panelRun = true; }
    else if (k === "stop") { SIM.hoa = "off"; SIM.local = true; SIM.panelRun = false; }
    else { SIM.hoa = "auto"; SIM.local = false; SIM.panelRun = false; }
    if (was !== SIM.hoa) simLog({ hand: "Hand", off: "Off", auto: "Auto" }[SIM.hoa] + " mode");
    return;
  }
  if (k === "locrem") { SIM.local = !SIM.local; if (SIM.local) { SIM.panelRun = SIM.run; if (!SIM.panelRef) { const c = chain(); SIM.panelRef = +(c.vec ? refUsed * nomRpm() / nomHz() : refUsed).toFixed(c.vec ? 0 : 1); } } simLog(SIM.local ? "Local" : "Remote"); return; }
  if (k === "start") { if (panelCtl()) SIM.panelRun = true; else flashMsg("Start from panel not allowed (Remote)"); return; }
  if (k === "stop") { if (panelCtl()) SIM.panelRun = false; else flashMsg("Stop from panel not allowed (Remote)"); return; }
  if (SIM.fault && !SIM.faultHidden && s.t !== "help") { if (k === "rsoft") { SIM.fault = null; simLog("Fault reset from panel"); } if (k === "lsoft") SIM.faultHidden = true; return; }
  if (s.t === "home") {
    if (k === "rsoft") STK.push({ t: "menu", i: 0 });
    else if (k === "lsoft") STK.push({ t: "list", title: "Options", i: 0, items: () => [...(SIM.fault ? [{ label: "Show fault", value: SIM.fault }] : []), { label: "Reference", value: SIM.panelRef.toFixed(chain().vec ? 0 : 1) + " " + chain().u }, { label: "Direction", value: SIM.panelDir > 0 ? "Forward" : "Reverse" }, { label: "Active faults", value: SIM.fault ? "1" : "0" }, { label: "Active warnings", value: String(SIM.warn.length) }, { label: "Edit Home view", arrow: true }], onSel: it => {
      if (it.label === "Show fault") { SIM.faultHidden = false; STK.pop(); }
      else if (it.label === "Edit Home view") editHome();
      else if (it.label === "Reference") openEdit("REF");
      else if (it.label === "Direction") SIM.panelDir = -SIM.panelDir;
      else selectMain("Diagnostics");
    } });
    else if (k === "up" || k === "down") {
      if (CFG().hoa && SIM.hoa === "off") flashMsg("Off: reference not allowed – press Hand");
      else if (SIM.local || panelRefActive()) { const c = chain(), [lo, hi] = refLimits(), step = (c.vec ? 1 : 0.1) * (holdN > 30 ? 100 : holdN > 12 ? 10 : 1);
        const want = +(SIM.panelRef + (k === "up" ? step : -step)).toFixed(c.vec ? 0 : 1);
        SIM.panelRef = Math.max(lo, Math.min(hi, want)); if (want < 0 && (SIM.panelRef === 0 || V("20.21") === 1) && revBlocked()) flashMsg(revBlocked()); }
      else flashMsg(CFG().hoa ? "Auto: reference from I/O – press Hand for panel control" : "Remote: press Loc/Rem for Local, or set ref source to Control panel"); }
    else if (k === "left" || k === "right") SIM.home = Math.max(0, Math.min(SIM.homeViews.length - 1, SIM.home + (k === "right" ? 1 : -1)));
    return;
  }
  if (s.t === "help" || s.t === "msg") { if (k === "lsoft" || k === "left") STK.pop(); return; }
  if (s.t === "menu" || s.t === "list") {
    const items = s.t === "menu" ? MAINMENU : s.items();
    if (k === "up" || k === "down") s.i = wrapI(s.i, k === "up" ? -1 : 1, items.length);
    else if (k === "lsoft" || k === "left") STK.pop();
    else if ((k === "rsoft" || k === "right") && items[s.i]) { if (s.t === "menu") selectMain(items[s.i]); else if (s.onSel) s.onSel(items[s.i]); }
    return;
  }
  if (s.t === "edit") {
    const m = simMeta(s.p);
    if (k === "lsoft") { STK.pop(); return; }
    if (m.t === "opt") { if (k === "up" || k === "down") s.i = wrapI(s.i, k === "up" ? -1 : 1, m.opts.length); else if (k === "rsoft") { setV(s.p, m.opts[s.i][0]); simLog(`${s.p} = ${m.opts[s.i][1]}`); STK.pop(); } }
    else if (m.t === "num") numKey(s, m, k);
    else if (m.t === "bits") {
      const bits = m.bits.length ? m.bits : [...Array(16)].map((_, k) => [k]);
      if (k === "up" || k === "down") s.i = wrapI(s.i, k === "up" ? -1 : 1, bits.length);
      else if (k === "left" || k === "right") s.buf ^= (1 << bits[s.i][0]);
      else if (k === "rsoft") { setV(s.p, s.buf); simLog(`${s.p} = ${fmtV(s.p)}`); STK.pop(); }
    } else if (m.t === "time") {
      const b = s.buf.split(""), dig = b.map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0), at = dig.indexOf(s.cur);
      if (k === "left" && at > 0) s.cur = dig[at - 1];
      else if (k === "right" && at < dig.length - 1) s.cur = dig[at + 1];
      else if (k === "up" || k === "down") { b[s.cur] = String((+b[s.cur] + (k === "up" ? 1 : 9)) % 10); s.buf = b.join(""); }
      else if (k === "rsoft") saveTime(s, s.buf);
    } else if (k === "left") STK.pop();
  }
}
function timeOk(fmt, t) {
  const g = t.match(/\d+/g) || [];
  if (fmt === "hh:mm:ss") return /^\d\d:\d\d:\d\d$/.test(t) && +g[0] < 24 && +g[1] < 60 && +g[2] < 60;
  if (fmt === "dd hh:mm") return /^\d\d \d\d:\d\d$/.test(t) && +g[1] < 24 && +g[2] < 60;
  return /^\d\d\.\d\d\.\d{4}$/.test(t) && +g[0] >= 1 && +g[0] <= 31 && +g[1] >= 1 && +g[1] <= 12 && +g[2] >= 1980 && +g[2] <= 2159;
}
function saveTime(s, t) {
  const m = simMeta(s.p); t = String(t).trim();
  if (!timeOk(m.fmt, t)) { flashMsg("Invalid value – " + m.fmt); return; }
  setV(s.p, t); simLog(`${s.p} = ${t}`); STK.pop();
}
// value editor: the cursor sits on one digit (s.place = power of ten); Up/Down add or subtract that step,
// so pressing Down at 0 gives a negative value when the minimum allows it
function numHtml(s, m) {
  const a = Math.abs(s.val).toFixed(m.dec), [ip0, fp = ""] = a.split("."), ip = ip0.padStart(Math.max(1, s.place + 1), "0");
  const d = (ch, place) => `<span class="${place === s.place ? "cur" : ""}">${ch}</span>`;
  return (s.val < 0 ? "<span>-</span>" : "") + ip.split("").map((ch, i) => d(ch, ip.length - 1 - i)).join("") + (m.dec ? "<span>.</span>" + fp.split("").map((ch, i) => d(ch, -(i + 1))).join("") : "");
}
function numKey(s, m, k) {
  const big = Math.max(Math.abs(m.min ?? 0), Math.abs(m.max ?? 1e6), 10);
  if (k === "left") { if (Math.pow(10, s.place + 1) <= big && s.place < 8) s.place++; }
  else if (k === "right") { if (s.place > -m.dec) s.place--; }
  else if (k === "up" || k === "down") {
    const step = Math.pow(10, s.place), want = +(s.val + (k === "up" ? step : -step)).toFixed(m.dec);
    let v = want; if (m.min != null) v = Math.max(m.min, Math.min(m.max, v));
    s.val = v;
    if (s.p === "REF" && want < 0 && v >= 0 && revBlocked()) flashMsg(revBlocked());
  }
  else if (k === "rsoft") saveNum(s, s.val);
}
function saveNum(s, v) {
  const m = simMeta(s.p); if (isNaN(v)) { flashMsg("Invalid value"); return; }
  if (m.min != null) v = Math.max(m.min, Math.min(m.max, v));
  v = +v.toFixed(m.dec);
  setV(s.p, v); if (s.p !== "REF") simLog(`${s.p} = ${v.toFixed(m.dec)} ${m.unit || ""}`); STK.pop();
}
let flash = "", flashT = 0;
function flashMsg(t) { flash = t; flashT = Date.now(); }
// in Remote the panel reference is used when the active Ext1/Ext2 reference is "Control panel (ref saved/copied)"
function panelRefActive() { const c = chain(), src = srcB(V("19.11")) ? V(c.r2) : V(c.r1); return src === 18 || src === 19 || src === 20 || src === 21; }
function crumbs() {
  // integrated panel: no Menu key, OK opens the Main menu and Back opens Options
  const ip = IPMODE(), out = ip ? [] : ["Menu"];
  for (const s of STK.slice(1)) { if (s.t === "menu") continue; if (s.t === "edit") out.push(s.p === "REF" ? "Reference" : s.p); else if (s.t === "ipmenu") out.push("OK (Main menu)"); else if (s.t === "ipopt") out.push("Back (Options)"); else if (s.title) out.push(s.title); }
  return STK.length > 1 ? out.join(" › ") : "หน้าแรก (Home view)";
}
function gotoParam(n) {
  n = String(n || "").trim().replace(",", ".").replace(/^(\d)\./, "0$1.");
  if (!SROW.has(n) && /^\d{2}\.\d$/.test(n)) n = n.replace(/\.(\d)$/, ".0$1");
  if (!SROW.has(n)) { toast((n || "Parameter") + " not found in " + SM); return; }
  const g = gKey(n), gs = GROUPS(), gl = gs.findIndex(([k]) => k === g);
  // the way there on the panel in use: integrated panel = Main menu › Parameters, assistant panel = Menu › Parameters
  if (IPMODE()) { const sub = ipSub("pa"); STK = [{ t: "home" }, { t: "ipmenu", title: "Main menu", i: IP_MAIN.findIndex(x => x[0] === "pa") }, { t: "ipgrid", title: sub.title, i: 0, items: sub.items }]; }
  else { STK = [{ t: "home" }, { t: "menu", i: MAINMENU.indexOf("Parameters") }]; selectMain("Parameters"); }
  STK.push({ t: "list", title: "Complete list", i: gl, items: () => GROUPS().map(([k, v]) => ({ label: k.padStart(2, "0") + " " + v, arrow: true, g: k })), onSel: x => pushParamList(x.label, pInGroup(x.g).map(p => p[0])) });
  const plist = pInGroup(g).map(p => p[0]);
  pushParamList(gs[gl][0].padStart(2, "0") + " " + gs[gl][1], plist); top_().i = plist.indexOf(n);
  openEdit(n);
}

/* ---- tab ---- */
let simTimer = null;
const SVG_STOP = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#d8322b"/><circle cx="12" cy="12" r="7.3" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M8.2 9.3h7.6L12 15.6z" fill="#fff"/></svg>';
const SVG_START = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 1.8 22.2 12 12 22.2 1.8 12z" fill="#2f8f3a"/><path d="M12 4.6 19.4 12 12 19.4 4.6 12z" fill="none" stroke="#fff" stroke-width="1.2"/><path d="M10.4 8.6v6.8l4.4-3.4z" fill="#fff"/></svg>';
const SVG_SOFT = '<svg viewBox="0 0 60 14" width="46" height="11" aria-hidden="true"><path d="M3 4 Q30 16 57 4" fill="none" stroke="#e9ecef" stroke-width="2.4" stroke-linecap="round"/></svg>';
const SVG_USB = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#7d848b" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v15M12 3l-2 3h4zM12 13l-4-3V8M12 15l4-3v-2"/><circle cx="12" cy="20" r="1.6" fill="#7d848b" stroke="none"/><rect x="7" y="6.5" width="2" height="2" fill="#7d848b" stroke="none"/><circle cx="16" cy="9" r="1.1" fill="#7d848b" stroke="none"/></svg>';
/* v5 panel geometry, in a 300 x 500 grid traced from the ACS-AP-x photo */
const K5 = [
  { k: "lsoft", c: "soft", x: 14, y: 236, w: 84, h: 42, s: "soft", lab: "Left softkey" },
  { k: "rsoft", c: "soft mir", x: 202, y: 236, w: 84, h: 42, s: "soft", lab: "Right softkey" },
  { k: "up", c: "ar", x: 125, y: 270, w: 38, h: 44, r: [14, 14, 5, 5], html: '<i class="tri u"></i>', lab: "Up" },
  { k: "left", c: "ar", x: 81, y: 315, w: 43, h: 38, r: [14, 5, 5, 14], html: '<i class="tri l"></i>', lab: "Left" },
  { k: "right", c: "ar", x: 164, y: 315, w: 43, h: 38, r: [5, 14, 14, 5], html: '<i class="tri r"></i>', lab: "Right" },
  { k: "down", c: "ar", x: 125, y: 354, w: 38, h: 44, r: [5, 5, 14, 14], html: '<i class="tri d"></i>', lab: "Down" },
  { k: "help", c: "help", x: 242, y: 300, w: 30, h: 66, r: [10, 10, 10, 10], html: "?", lab: "Help" },
  { k: "stop", c: "bk stop", x: 14, y: 380, w: 80, h: 56, s: "bk", tone: "stop", html: () => SVG_STOP + `<span>${CFG().hoa ? "Off" : "Stop"}</span>` },
  { k: "locrem", c: "loc", x: 114, y: 406, w: 72, h: 28, r: [9, 9, 9, 9], html: () => `<span>${CFG().hoa ? "Auto" : "Loc/Rem"}</span>` },
  { k: "start", c: "bk start mir", x: 206, y: 380, w: 80, h: 56, s: "bk", tone: "start", html: () => SVG_START + `<span>${CFG().hoa ? "Hand" : "Start"}</span>` }
];
const rr5 = (w, h, [a, b, c, d]) => `M${a} 0H${w - b}Q${w} 0 ${w} ${b}V${h - c}Q${w} ${h} ${w - c} ${h}H${d}Q0 ${h} 0 ${h - d}V${a}Q0 0 ${a} 0Z`;
const P5 = {
  soft: "M10 3H74Q84 3 84 13V27Q84 40 71 40H13Q0 40 0 27V13Q0 3 10 3Z",
  bk: "M9 0H71Q80 0 80 9V45Q80 56 69 56H30Q22 56 16 51L4 41Q0 37.5 0 32V9Q0 0 9 0Z"
};
const path5 = o => o.s ? P5[o.s] : rr5(o.w, o.h, o.r);
function cap5(o) {
  const d = path5(o);
  const soft = o.s === "soft";
  const face = soft ? "url(#k5soft)" : "url(#k5face)";
  const edge = soft ? "#63686f" : o.tone === "stop" ? "#dfb2ae" : o.tone === "start" ? "#b2cbb4" : "#cdd2d6";
  const skirt = soft ? "#050505" : o.tone === "stop" ? "#d2aaa7" : o.tone === "start" ? "#a9c3ab" : "#c3c8cd";
  const icon = soft ? '<path d="M22 17Q42 30 62 17" fill="none" stroke="#e9ecef" stroke-width="2.4" stroke-linecap="round"/>' : "";
  return `<svg class="cap" viewBox="0 0 ${o.w} ${o.h}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" transform="translate(0 2.6)" fill="${skirt}"/>
    <g class="top"><path d="${d}" fill="${face}" stroke="${edge}" stroke-width="1"/><path d="${d}" fill="url(#k5sheen)"/>${icon}</g></svg>`;
}
function well5(o) {
  const t = o.c.includes("mir") ? `translate(${o.x + o.w} ${o.y}) scale(-1 1)` : `translate(${o.x} ${o.y})`;
  const col = o.s === "soft" ? "#060708" : "#cfd3d7";
  return `<path d="${path5(o)}" transform="${t}" fill="${col}" stroke="${col}" stroke-width="4.5" stroke-linejoin="round"/>`;
}
function panel5() {
  const body = "M0 40Q0 0 40 0H260Q300 0 300 40V432Q300 440 294 446L228 496Q223 500 216 500H84Q77 500 72 496L6 446Q0 440 0 432Z";
  const front = "M0 262V40Q0 0 40 0H260Q300 0 300 40V262Z";
  const cover = "M104 441H196Q204 441 204 449V469Q204 476 198 479L158 495Q150 498 142 495L102 479Q96 476 96 469V449Q96 441 104 441Z";
  const shell = `<svg class="d5shell" viewBox="0 0 300 500" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="d5plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f4f5"/><stop offset=".55" stop-color="#eceeef"/><stop offset="1" stop-color="#e2e4e6"/></linearGradient>
      ${CFG().body === "white" ? '<radialGradient id="d5front" cx=".5" cy="0" r="1.1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#f4f5f6"/><stop offset="1" stop-color="#e7e9eb"/></radialGradient>'
        : '<radialGradient id="d5front" cx=".5" cy="0" r="1.1"><stop offset="0" stop-color="#3a3d42"/><stop offset=".45" stop-color="#232528"/><stop offset="1" stop-color="#17181a"/></radialGradient>'}
      <linearGradient id="d5seam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
      <linearGradient id="d5cover" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e6e8"/><stop offset="1" stop-color="#f2f3f4"/></linearGradient>
      <linearGradient id="k5face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f0f2f3"/><stop offset="1" stop-color="#e3e6e8"/></linearGradient>
      <linearGradient id="k5soft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34373b"/><stop offset="1" stop-color="#121315"/></linearGradient>
      <linearGradient id="k5sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="d5clip"><path d="${body}"/></clipPath>
    </defs>
    <path d="${body}" fill="url(#d5plate)"/>
    <g clip-path="url(#d5clip)">
      <path d="${front}" fill="url(#d5front)"/>
      <rect x="0" y="262" width="300" height="7" fill="url(#d5seam)"/>
      <path d="M0 262H300" stroke="${CFG().body === "white" ? "#c3c8cc" : "#0e0f10"}" stroke-width="1.2"/>
      <path d="M10 6Q20 2 40 2H260Q280 2 290 6" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="2"/>
      ${K5.map(well5).join("")}
      <path d="${cover}" fill="url(#d5cover)" stroke="#cdd1d5" stroke-width="1.2"/>
      <path d="M104 443.5H196" stroke="#000" stroke-opacity=".08" stroke-width="2"/>
    </g>
    <path d="${body}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.6"/>
    <path d="M1.5 262V432Q1.5 439.5 7 445" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>
  </svg>`;
  const pct = (v, t) => (v / t * 100).toFixed(3) + "%";
  const keys = K5.map(o => {
    const inner = typeof o.html === "function" ? o.html() : (o.html || "");
    const aria = o.lab ? ` aria-label="${o.lab}"` : "";
    return `<button class="k5 ${o.c}" data-k="${o.k}"${aria} style="left:${pct(o.x, 300)};top:${pct(o.y, 500)};width:${pct(o.w, 300)};height:${pct(o.h, 500)}">${cap5(o)}<span class="lab">${inner}</span></button>`;
  }).join("");
  return `<div class="d5 ${CFG().body}">${shell}<div class="d5glass"><div class="lcd" id="lcd"></div></div><span class="led" id="led"></span>${keys}<div class="d5usb">${SVG_USB}</div></div>`;
}
