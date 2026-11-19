"use strict";
/* ---------- the drives the panel simulator covers: I/O, enable signals, macros (one entry per drive) ---------- */
// panels that can be simulated; I/O and enable signals follow each firmware manual
const SIM_MODELS = ["ACS580", "ACH580", "ACS180", "ACS880"];
const SIMCFG = {
  ACS580: { di: 6, ro: ["10.24", "10.27", "10.30"], ao: ["13.12", "13.22"], runEn: ["20.12"], startEn: ["20.19"], body: "dark", macro: "ABB standard", panel: "ACS-AP-x" },
  ACH580: { di: 6, ro: ["10.24", "10.27", "10.30"], ao: ["13.12", "13.22"], runEn: ["20.40"], startEn: ["20.41", "20.42"], body: "white", macro: "HVAC default", panel: "ACH-AP-H", hoa: true },
  ACS180: { aiTerm: "AI1/DI5 ขั้ว 14 · AI2 ขั้ว 15", stoTerm: "ขั้ว S+ SGND S1 S2", di: 5, ro: ["10.24"], do: ["11.06"], ao: ["13.12"], runEn: ["20.12"], startEn: ["20.19"], body: "dark", macro: "ABB standard", panel: "ACS-AP-x" },
  // ACS880 primary control program: DI1…DI6 + DIIL (run enable input, wired on by default here), DTC by default
  ACS880: { aiTerm: "AI1 XAI:4-5 · AI2 XAI:6-7", stoTerm: "XSTO", di: 7, diNames: ["DI1", "DI2", "DI3", "DI4", "DI5", "DI6", "DIIL"], diOn: [6], ro: ["10.24", "10.27", "10.30"], ao: ["13.12", "13.22"], runEn: ["20.12"], startEn: ["20.19"], body: "dark", macro: "Factory", panel: "ACS-AP-I" } };
// input names (the ACS880 has DIIL next to DI1…DI6) and the inputs that start closed
const diName = i => (SIMCFG[SM].diNames || [])[i] || "DI" + (i + 1);
// "DI1…DI6", or "DI1…DI6 + DIIL" when the last input has its own name
const diRange = () => { const n = SIMCFG[SM].di, last = diName(n - 1); return /^DI\d+$/.test(last) ? "DI1…" + last : "DI1…" + diName(n - 2) + " + " + last; };
const diStart = m => { const a = Array(SIMCFG[m].di).fill(false); (SIMCFG[m].diOn || []).forEach(i => { a[i] = true; }); return a; };
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
// ACS180: the manual has no table of defaults per macro; these values follow the default control connections of each
// macro (ACS180 firmware manual, chapter Control macros, pages 30–46). Codes are the ACS180 selection codes.
// Hand/PID: the manual does not name the PID setpoint source – AI1 percent as in the ACS580 Hand/PID macro.
const MACRO_180 = {
  2: { "20.01": 1, "20.03": 2, "20.04": 0, "19.11": 4, "20.06": 1, "20.08": 4, "28.11": 1, "28.15": 2, "31.11": 5, "28.22": 0, "28.23": 0, "12.25": 10 },
  3: { "20.01": 1, "20.03": 2, "20.04": 0, "19.11": 4, "20.06": 1, "20.08": 4, "28.11": 1, "28.15": 16, "40.07": 2, "40.08": 9, "40.16": 11, "28.22": 5, "28.23": 0, "12.25": 10 },
  5: { "19.11": 5, "20.01": 14, "28.11": 8, "20.06": 2, "20.08": 2, "20.09": 3, "28.15": 2, "31.11": 5, "28.22": 6, "28.23": 0, "11.21": 0, "58.01": 1, "12.25": 2 },
  11: { "20.01": 5, "20.03": 2, "20.04": 3, "20.05": 4, "28.11": 2, "28.22": 5, "28.23": 6, "11.21": 0, "12.25": 2 },
  12: { "20.01": 3, "20.03": 2, "20.04": 3, "28.11": 2, "28.22": 4, "28.23": 5, "31.11": 6, "11.21": 0, "12.25": 2 },
  13: { "28.11": 15, "22.71": 1, "22.73": 4, "22.74": 5, "28.22": 6, "28.23": 0, "11.21": 0 },
  14: { "20.01": 1, "20.04": 0, "28.11": 16, "40.07": 2, "40.08": 9, "40.16": 11, "40.19": 3, "40.20": 4, "28.22": 5, "28.23": 0, "12.25": 10 } };
// ACS880: "Default parameter settings for the … macro" tables (ACS880 primary control program firmware manual,
// chapter Application macros, pages 100–109). Values as printed: a selection by its name, a number as is.
// Fieldbus control macro: "not supported by the current firmware version" (page 111).
const MACRO_880 = {
  2: { "12.30": 1500, "19.11": "DI3", "20.06": "In1 Start; In2 Dir", "20.08": "DI6", "20.09": "DI5", "20.12": "DIIL", "22.12": "AI2 scaled",
       "22.14": "Follow Ext1/Ext2 selection", "22.22": "DI4", "23.11": "Acc/Dec time 1", "31.11": "Not selected" },
  3: { "12.27": 4, "19.11": "DI3", "20.01": "In1 Start", "20.04": "Not selected", "20.06": "In1 Start", "20.08": "DI6", "20.12": "DI5", "22.12": "PID",
       "22.22": "DI4", "23.11": "Acc/Dec time 1", "31.11": "Not selected", "40.07": "On when drive running", "40.08": "AI2 scaled", "40.11": 0.04,
       "40.35": 1, "40.60": "Follow Ext1/Ext2 selection" },
  4: { "19.11": "DI3", "19.14": "Torque", "20.02": "Level", "20.06": "In1 Start; In2 Dir", "20.07": "Level", "20.08": "DI1", "20.09": "DI2", "20.12": "DI6",
       "22.22": "DI4", "23.11": "DI5", "26.11": "AI2 scaled", "31.11": "Not selected" },
  5: { "20.12": "DIIL", "21.03": "Ramp", "22.21": 1, "22.22": "DI4", "22.23": "DI5", "22.24": "DI6", "22.27": 600, "22.28": 900, "22.29": 1200,
       "22.30": 1500, "22.31": 2400, "22.32": 3000, "23.11": "DI3", "25.06": 0.12, "31.11": "Not selected" } };
// a selection named in a macro table -> its code on this drive
function optCode(n, name) { const m = simMeta(n), o = m && m.opts && m.opts.find(o => o[1].toLowerCase() === String(name).toLowerCase()); return o ? o[0] : null; }
// in Vector control the same macro uses the speed chain (22.xx) instead of the frequency chain (28.xx)
const VEC_OF = { "28.11": "22.11", "28.15": "22.18", "28.22": "22.22", "28.23": "22.23" };
function macroValues(code) {
  if (SM === "ACS580") return MACRO_DIFF(code);
  if (SM === "ACS880") {
    if (!MACRO_880[code]) return null;
    const o = {};
    for (const [n, v] of Object.entries(MACRO_880[code])) { const c = typeof v === "string" ? optCode(n, v) : v; if (c != null) o[n] = c; else console.warn("macro value not found", n, v); }
    return o;
  }
  if (SM !== "ACS180" || !MACRO_180[code]) return null;
  const o = Object.assign({}, MACRO_180[code]); for (const k in VEC_OF) if (k in o) o[VEC_OF[k]] = o[k]; return o;
}
