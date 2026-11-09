"use strict";
/* ---------- cross-reference ---------- */
function xrefCell(row, m) {
  const cell = (row[5] && row[5][m] != null) ? row[5][m] : row[FAMCOL[fam(m)]];
  return (cell || "").split("/").map(s => s.trim()).filter(Boolean);
}
const XSEC_TH = { "Motor data": "ข้อมูลมอเตอร์", "Macro / restore": "มาโคร / รีเซ็ต", "Start/stop/direction": "สตาร์ท / สต็อป / ทิศทาง", "Reference / ramps / limits": "ความเร็ว / ramp / ขีดจำกัด",
  "I/O": "I/O", "Fault functions": "การป้องกัน / fault", "Process PID": "PID", "Embedded fieldbus": "Fieldbus (Modbus)", "Actual values": "ค่าที่อ่านได้" };
// a cell with two numbers on the ACS580 / ACS880 families = the frequency (Scalar) and the speed (Vector/DTC) parameter of the same function
function noKind(m, n, many) {
  if (!many || !["n", "x"].includes(fam(m))) return "";
  if (/^28\./.test(n) || /^30\.1[34]$/.test(n)) return "ถ้าใช้ Scalar (Hz)";
  if (/^2[23]\./.test(n) || /^30\.1[12]$/.test(n)) return fam(m) === "x" ? "ถ้าใช้ DTC (rpm)" : "ถ้าใช้ Vector (rpm)";
  return "";
}
// the parameter number as the drive's panel shows it, from what was typed ("2202", "22.2", "1103", "11,03")
function normNo(q, m) {
  let n = q.trim().replace(",", ".");
  if (!/^(\d{1,3}\.\d{1,3}|\d{4})$/.test(n)) return "";
  if (fam(m) !== "o" && /^\d{4}$/.test(n)) n = n.slice(0, 2) + "." + n.slice(2);
  if (fam(m) === "o" && n.includes(".")) { const [g, i] = n.split("."); n = g.padStart(2, "0") + i.padStart(2, "0"); }
  if (/^\d\./.test(n)) n = "0" + n;
  if (/^\d{2}\.\d$/.test(n)) n = n.slice(0, 3) + "0" + n.slice(3);
  return pOf(m, n) ? n : "";
}
function xside(m, nums, guess) {
  if (!nums.length) return `<div class="xs none"><span class="xm">${esc(m)}</span><span class="xno">ไม่มีพารามิเตอร์นี้</span></div>`;
  return `<div class="xs"><span class="xm">${esc(m)}</span>${nums.map(n => { const p = pOf(m, n), k = noKind(m, n, nums.length > 1);
    return `<div class="xp">${k ? `<small class="xk">${k}</small>` : ""}<div class="xpl"><button class="pno" type="button" data-p="${esc(n)}" data-pm="${m}">${esc(fam(m) === "a" ? n.replace(".", "") : n)}</button><b>${esc(p ? p[1] : n)}</b></div>
      ${p && p[2] && p[2] !== "-" ? `<small>ค่าโรงงาน: ${esc(p[2])}</small>` : ""}</div>`; }).join("")}${guess ? `<small class="xg">จับคู่จากชื่อ – ตรวจในคู่มืออีกครั้ง</small>` : ""}</div>`;
}
const xcard = (fn, a, na, b, nb, guess) => `<div class="xc"><div class="xfn">${esc(fn)}</div><div class="xab">${xside(a, na)}<span class="xarr" aria-hidden="true">→</span>${xside(b, nb, guess)}</div></div>`;
function xrefCards() {
  const a = S.xa, b = S.xb, q = S.xq.trim().toLowerCase();
  let sec = "", out = "", pend = "", n = 0;
  // a typed parameter number: that row first, or a match by name when the table has no row for it
  const no = normNo(q, a);
  if (no && !xrefFind(a, no)) {
    const p = pOf(a, no), g = bestByName(p[1], b);
    return xcard("ไม่อยู่ในตารางเทียบ", a, [no], b, g ? [g[0]] : [], !!g);
  }
  for (const row of XREF) {
    if (row[1] == null) { sec = row[0]; pend = `<div class="xsec">${esc(XSEC_TH[sec] || sec)}</div>`; continue; }
    if (S.xsec && sec !== S.xsec) continue;
    const na = xrefCell(row, a), nb = xrefCell(row, b);
    if (no) { if (!na.includes(no)) continue; }
    else if (q) {
      const hay = [row[0], sec, XSEC_TH[sec] || "", ...na, ...nb, ...na.map(x => x.replace(".", "")), ...na.map(x => (pOf(a, x) || [, ""])[1]), ...nb.map(x => (pOf(b, x) || [, ""])[1])].join(" ").toLowerCase();
      if (!q.split(/\s+/).every(w => hay.includes(w))) continue;
    }
    out += pend; pend = ""; n++;
    out += xcard(row[0], a, na, b, nb);
  }
  return out || `<div class="empty">ไม่พบในตารางเทียบ – ลองพิมพ์ชื่อภาษาอังกฤษ เช่น accel, PID, relay หรือเลขพารามิเตอร์ของ ${esc(a)}</div>`;
}
/* ---------- converter: settings of one drive -> the matching parameters of another ---------- */
const ABBR = { mot: "motor", nom: "nominal", freq: "frequency", acc: "acceleration", accel: "acceleration", dec: "deceleration", decel: "deceleration", src: "source", ref: "reference", sel: "selection",
  curr: "current", temp: "temperature", max: "maximum", min: "minimum", ctrl: "control", func: "function", superv: "supervision", spd: "speed", fbk: "feedback", integ: "integration",
  deriv: "derivative", ena: "enable", par: "parameter", param: "parameter", const: "constant", crit: "critical", em: "emergency", inu: "inverter", cosfii: "cos", lo: "low", hi: "high" };
const STOPW = new Set(["of", "the", "as", "used", "in", "at", "and"]);
const toks = s => String(s || "").toLowerCase().replace(/%/g, " pct ").replace(/([a-z])(\d)/g, "$1 $2").split(/[^a-z0-9]+/).filter(Boolean).map(w => ABBR[w] || w).filter(w => !STOPW.has(w));
const VAL_ALIAS = [["dtc", "vector"], ["c.true", "always on", "selected", "true"], ["c.false", "always off", "not selected", "not used", "false"], ["ready relay", "ready run", "ready"],
  ["runningrelay", "running"], ["speed rpm", "motor speed used", "speed"], ["speed %", "motor speed %"], ["panel", "control panel (ref saved)", "keypad"], ["pid out", "pid"],
  ["mot pot", "motor potentiometer"], ["fba ref1", "fb a ref1", "fieldbus a ref1"], ["fba ref2", "fb a ref2"], ["in1", "in1 start", "di1"], ["in1st in2dir", "in1 start; in2 dir", "di1,2"],
  ["in1f in2r", "in1 start fwd; in2 start rev"], ["3-wire", "in1p start; in2 stop", "di1p,2p"], ["fba", "fieldbus a"], ["not sel", "not selected"], ["no", "no action", "not sel"],
  ["spd ref safe", "speed ref safe"], ["restore defs", "restore defaults"], ["dc-voltage", "dc voltage"], ["current", "motor current"], ["current %", "motor current % of motor nominal"],
  ["torque", "motor torque"], ["frequency", "output frequency"], ["power inu", "output power"], ["enable", "enabled", "on"], ["disable", "disabled", "off"], ["fault(-1)", "fault (-1)"],
  ["am", "asynchronous motor", "induction"], ["pmsm", "permanent magnet motor"], ["ramp", "ramp stop"], ["coast", "coast stop"], ["ai1", "ai1 scaled"], ["ai2", "ai2 scaled"],
  ["run", "running"], ["alarm", "warning"], ["fault/alarm", "fault/warning"], ["keypad", "control panel (ref saved)"], ["comm", "fieldbus a", "fba"], ["yes", "selected", "always on", "c.true"]];
// on ACS550/ACH550/ACS800 "NOT SEL" for these signals means "not used = always allowed"; on the newer drives "Not selected" means the signal is 0
const PERMISSIVE = /^(Run enable 1 source|Enable start command|External event 1|Emergency stop source)/;
// names compared without spaces/punctuation, but "%" must still count ("Current" is not "Current %")
const eqKey = s => String(s || "").toLowerCase().replace(/%/g, "pct").replace(/[^a-z0-9-]/g, "");
const eqName = (a, b) => eqKey(a) === eqKey(b);
const vkey = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
function aliases(v) { const k = vkey(v), out = [v]; for (const g of VAL_ALIAS) if (g.some(x => vkey(x) === k)) out.push(...g.filter(x => vkey(x) !== k)); return out; }
const firstDef = d => String(d || "").replace(/\s*\(95\.20[^)]*\)/g, "").split(";")[0].replace(/\s+(Request|N\/A)$/, "").trim();
function unitOf(p) {
  const d = numOf(firstDef(p[2])); if (d && d[1]) return d[1];
  const m = (p[6] + " " + p[5].map(o => o[0] + " " + o[1]).join(" ")).match(/\b(rpm|hz|ms|s|ma|v|a|kw|%)\b/i); return m ? m[1].toLowerCase() : "";
}
function mapOpt(val, p) {
  const opts = p[5].filter(o => o[1] && !/\.\.\./.test(o[1]) && !/^\d+ ?=/.test(o[1]));
  if (!opts.length) return null;
  for (const a of aliases(val)) { const o = opts.find(o => eqName(o[1], a)); if (o) return { o, exact: true }; }
  const vt = toks(val); let best = null, bs = 0;
  if (vt.length) for (const o of opts) { const ot = toks(o[1]), sc = vt.filter(w => ot.includes(w)).length / vt.length - ot.length * 0.001; if (sc > bs) { bs = sc; best = o; } }
  return bs >= 0.5 ? { o: best, exact: false } : null;
}
const optTxt = o => o[1] + (o[0] && /^-?\d+$/.test(o[0]) ? ` (${o[0]})` : "");
function bestByName(name, m) {
  const a = toks(name); if (!a.length) return null; let best = null, bs = 0;
  for (const p of D[m].P) { const b = toks(p[1]); const inter = a.filter(w => b.includes(w)).length, sc = inter / Math.max(a.length, b.length); if (sc > bs) { bs = sc; best = p; } }
  return bs >= 0.6 ? best : null;
}
function xrefFind(m, n) {
  for (const row of XREF) { if (row[1] == null) continue; const c = xrefCell(row, m); const i = c.indexOf(n); if (i >= 0) return { row, i, n: c.length }; }
  return null;
}
// index of the scalar / vector number when a cell holds two ("28.11 / 22.11"): ACS580 family lists Scalar first, ACS880 lists DTC first
const pairIdx = (m, scalar) => fam(m) === "n" ? (scalar ? 0 : 1) : (scalar ? 1 : 0);
const NOTE = {
  "Maximum current": "ขึ้นกับขนาดไดร์ฟ — ใช้ค่าไม่เกินพิกัดของไดร์ฟใหม่ (ค่าโรงงาน = กระแสสูงสุดของไดร์ฟนั้น)",
  "Acceleration time 1": "เวลานับจาก 0 ถึงค่า Speed/Frequency scaling — ถ้าสเกลเท่ากัน ใช้ค่าเดิมได้เลย", "Deceleration time 1": "เวลานับจาก 0 ถึงค่า Speed/Frequency scaling",
  "AI1 min": "ตรวจชนิดสัญญาณ V/mA ให้ตรงกัน (ACS580: 12.15, ACS850: jumper J1, ACS800/550: ค่าใน 13.xx)", "AI1 max": "ตรวจชนิดสัญญาณ V/mA ให้ตรงกัน",
  "AI1 scaled at AI1 min": "ไดร์ฟที่คุมแบบ Scalar สเกลเป็น Hz, แบบ Vector/DTC เป็น rpm", "AI1 scaled at AI1 max": "ไดร์ฟที่คุมแบบ Scalar สเกลเป็น Hz, แบบ Vector/DTC เป็น rpm",
  "Motor control mode": "ACS580/ACH580 ค่าโรงงาน Scalar — ถ้าไดร์ฟเดิมเป็น DTC/Vector ควรตั้ง Vector แล้วทำ ID run" };
const IDRUN_ROWS = /^(User motor model in use|Rs user|Rr user|Lm user|SigmaL user)/;
const RPM_ROWS = /^(AI1 scaled at AI1|Constant frequency \/ speed|Critical frequency \/ speed 1|Minimum frequency|Maximum frequency)/;
function convertOne(e, from, to, ctx) {
  const r = { e, toN: "", toP: null, set: "", st: "none", note: "" };
  const hit = e.p && xrefFind(from, e.n);
  let toN = "";
  if (hit) {
    const cell = xrefCell(hit.row, to);
    toN = cell.length > 1 ? cell[pairIdx(to, ctx.scalar)] : (cell[0] || "");
    r.label = hit.row[0]; r.note = NOTE[hit.row[0]] || "";
    if (!toN) { r.note = `${to} ไม่มีพารามิเตอร์นี้` + (r.note ? " — " + r.note : ""); return r; }
  } else if (e.p) {
    const g = bestByName(e.p[1], to);
    if (g) { toN = g[0]; r.byName = true; r.note = "จับคู่จากชื่อ — ตรวจในคู่มืออีกครั้ง"; }
    else { r.note = `ไม่พบพารามิเตอร์ที่ตรงกันใน ${to}`; return r; }
  } else { r.note = `ไม่พบ ${e.n} ใน ${from}`; return r; }
  const tp = pOf(to, toN); r.toN = toN; r.toP = tp; if (!tp) { r.note = `${toN} ไม่พบใน ${to}`; return r; }
  r.def = firstDef(tp[2]);
  if (r.label && IDRUN_ROWS.test(r.label)) { r.set = "ทำ ID run แทน (99.13)"; r.st = "check"; r.note = "ค่าจาก ID run ของไดร์ฟเดิม (p.u. อิงพิกัดไดร์ฟเดิม) — ไม่ต้องคัดลอก ให้ทำ ID run ที่ไดร์ฟใหม่"; return r; }
  let v = e.v;
  // coded values ("2 (DI1,2)", "8 [RAMP]" or just "2") -> the selection name of the source drive
  const cm = v && e.p && v.match(/^(-?\d+)\s*(?:[\(\[](.*)[\)\]])?\s*([A-Z ,()-]*)$/);
  if (cm) { const o = e.p[5].find(o => o[0] === cm[1] && o[1] && !/\.\.\./.test(o[1])); if (o) v = o[1]; else if (cm[2]) v = cm[2]; }
  if (v && r.label && PERMISSIVE.test(r.label) && ["o", "e"].includes(fam(from)) && /^(not sel|not used|no)\b/i.test(v)) {
    const ok = r.label.startsWith("External event") || r.label.startsWith("Emergency stop") ? ["inactive (true)", "c.true", "always on", "selected"] : ["selected", "always on", "c.true"];
    const o = tp[5].find(o => ok.some(a => eqName(o[1], a)));
    if (o) { r.set = optTxt(o); r.st = eqName(o[1], r.def) ? "def" : "set"; r.note = (r.note ? r.note + " · " : "") + `${from} "${v}" = ไม่ใช้สัญญาณนี้ (อนุญาตตลอด)`; return r; }
  }
  if (!v) { r.set = "–"; r.st = "check"; r.note = (r.note ? r.note + " · " : "") + "ไม่มีค่าในรายการ"; return r; }
  const num = numOf(v), isNum = /^\s*-?\d/.test(v);
  const optHit = !isNum || tp[5].some(o => eqName(o[1], v)) ? mapOpt(v, tp) : null;
  if (optHit) {
    r.set = optTxt(optHit.o); r.st = eqName(optHit.o[1], r.def) ? "def" : "set"; if (!optHit.exact) { r.st = "check"; r.note = (r.note ? r.note + " · " : "") + "ชื่อตัวเลือกไม่ตรงกันทุกตัว — ตรวจ"; }
    return r;
  }
  if (num) {
    let [x, u] = num, tu = unitOf(tp);
    if (!u && r.label && RPM_ROWS.test(r.label)) u = ctx.fromScalar ? "hz" : "rpm";
    if (!tu && r.label && RPM_ROWS.test(r.label)) tu = ctx.scalar ? "hz" : "rpm";
    if (u === "rpm" && tu === "hz") { x = x * ctx.fn / ctx.ns; r.note = (r.note ? r.note + " · " : "") + `แปลง rpm → Hz (${ctx.ns} rpm = ${ctx.fn} Hz)`; }
    else if (u === "hz" && tu === "rpm") { x = x * ctx.ns / ctx.fn; r.note = (r.note ? r.note + " · " : "") + `แปลง Hz → rpm (${ctx.fn} Hz = ${ctx.ns} rpm)`; }
    else if (u && tu && u !== tu && !(["v", "ma"].includes(u) && ["v", "ma"].includes(tu))) { r.unitBad = true; r.note = (r.note ? r.note + " · " : "") + `หน่วยต่างกัน (${u} → ${tu}) — ตรวจ`; }
    const dm = firstDef(tp[2]).match(/-?\d+\.(\d+)/), dec = dm ? dm[1].length : (String(num[0]).split(".")[1] || "").length;
    const unitTxt = (firstDef(tp[2]).match(/^-?[\d.]+\s*([A-Za-z%°]+)/) || [])[1] || (u === tu ? (v.match(/[\d.]\s*([A-Za-z%°]+)/) || [])[1] : "") || "";
    const showU = u && ["v", "ma"].includes(u) ? (v.match(/[\d.]\s*([A-Za-z%°]+)/) || [])[1] : unitTxt;
    r.set = (+x.toFixed(Math.min(4, Math.max(dec, 0)))).toFixed(Math.min(4, dec)) + (showU ? " " + showU : "");
    // defaults like "4.000 mA or 0.000 V" depend on another setting: any of them counts
    const alts = String(r.def).split(/\s+or\s+/).map(numOf).filter(Boolean);
    const el = w => ["v", "ma"].includes(w);
    r.st = alts.some(dn => Math.abs(dn[0] - x) < 1e-6 && (!dn[1] || !showU || dn[1] === showU.toLowerCase() || (el(dn[1]) && el(showU.toLowerCase()) && new RegExp("\\b" + showU + "\\b", "i").test(r.def)))) ? "def" : "set";
    if (r.unitBad && r.st === "set") r.st = "check";
    const rg = (tp[6] + " " + tp[5].map(o => o[1]).join(" ")).match(/(-?\d+(?:\.\d+)?)\s*\.\.\.\s*(-?\d+(?:\.\d+)?)/);
    if (rg && r.st === "set" && !/^(Motor nominal|Maximum current)/.test(r.label || "") && (x < +rg[1] - 1e-9 || x > +rg[2] + 1e-9)) { r.st = "check"; r.note = (r.note ? r.note + " · " : "") + `นอกช่วงที่ ${to} ตั้งได้ (${rg[1]}…${rg[2]})`; }
    if (r.label === "Maximum current") r.st = "check";
    return r;
  }
  r.set = v; r.st = "check"; r.note = (r.note ? r.note + " · " : "") + "ตรวจค่าที่จะตั้ง";
  return r;
}
function parseList(txt, m) {
  const out = [];
  for (const raw of String(txt || "").split(/\n/)) {
    const l = raw.trim(); if (!l) continue;
    const mm = l.match(/^(\d{1,3}[.,]\d{1,3}|\d{4})\b\s*(.*)$/); if (!mm) { out.push({ raw: l, bad: true }); continue; }
    let n = mm[1].replace(",", ".");
    if (fam(m) !== "o" && /^\d{4}$/.test(n)) n = n.slice(0, 2) + "." + n.slice(2);
    if (fam(m) === "o" && n.includes(".")) { const [g, i] = n.split("."); n = g.padStart(2, "0") + i.padStart(2, "0"); }
    if (/^\d\./.test(n)) n = "0" + n;
    const p = pOf(m, n);
    let rest = mm[2].trim();
    const eq = rest.search(/[=:]/);
    if (eq >= 0) rest = rest.slice(eq + 1);
    else if (p && rest.toLowerCase().startsWith(p[1].toLowerCase())) rest = rest.slice(p[1].length);
    out.push({ n, p, v: rest.replace(/^[\s=:–-]+/, "").trim(), raw: l });
  }
  return out;
}
const EXAMPLE850 = `99.06 Mot nom current = 58.0 A
99.07 Mot nom voltage = 380.0 V
99.08 Mot nom freq = 50.0 Hz
99.09 Mot nom speed = 1460 rpm
99.10 Mot nom power = 30.00 kW
11.03 Stop mode = Ramp
13.03 AI1 min = 0.000 V
13.05 AI1 min scale = 0.000
15.01 AO1 src = Current
15.04 AO1 out min = 0.000 mA
20.02 Minimum speed = 0 rpm
20.05 Maximum current = 164.05 A
22.02 Acc time1 = 10.000 s
22.03 Dec time1 = 10.000 s
95.03 Temp inu ambient = 55 C
97.02 Rs user = 0.02776 p.u.
97.03 Rr user = 0.02005 p.u.
97.04 Lm user = 2.13462 p.u.
97.05 SigmaL user = 0.20314 p.u.
97.09 Rs user SI = 0.10500 Ohm
97.10 Rr user SI = 0.07586 Ohm
97.11 Lm user SI = 25.70 mH
97.12 SigL user SI = 2.45 mH`;
function convert() {
  const from = S.xa, to = S.xb, list = parseList(S.cvText, from);
  const ctrlN = (xrefCell(XREF.find(r => r[0] === "Motor control mode"), from) || [])[0];
  const ctrlE = list.find(e => e.n === ctrlN), ctrlV = ctrlE ? ctrlE.v : firstDef((pOf(from, ctrlN) || [])[2]);
  const fromScalar = /scalar/i.test(ctrlV || "");
  const val = no => { const c = xrefCell(XREF.find(r => r[0] === no), from)[0], e = list.find(x => x.n === c), d = e ? numOf(e.v) : null; return d && d[0] ? d[0] : 0; };
  const ctx = { fromScalar, scalar: S.cvMode ? S.cvMode === "s" : fromScalar, fn: val("Motor nominal frequency") || 50, ns: val("Motor nominal speed") || 1500 };
  const rows = list.filter(e => !e.bad).map(e => convertOne(e, from, to, ctx));
  // the control mode decides which numbers apply: add it when the list does not include it
  const toCtrl = (xrefCell(XREF.find(r => r[0] === "Motor control mode"), to) || [])[0];
  if (!ctrlE && ctrlN && toCtrl && pOf(from, ctrlN)) {
    const r = convertOne({ n: ctrlN, p: pOf(from, ctrlN), v: ctx.scalar ? "Scalar" : (fam(from) === "n" ? "Vector" : ctrlV), raw: "" }, from, to, ctx);
    r.extra = true; r.note = `ไม่อยู่ในรายการ — ${from} ค่าโรงงาน ${ctrlV}` + (r.note ? " · " + r.note : ""); rows.unshift(r);
  }
  // parameters the list does not mention keep their factory value: show where the two drives' defaults differ
  const SECS = new Set(["Start/stop/direction", "Reference / ramps / limits", "I/O", "Fault functions"]);
  const listed = new Set(rows.map(r => r.label).filter(Boolean)), diffs = [];
  let sec = "";
  for (const row of XREF) {
    if (row[1] == null) { sec = row[0]; continue; }
    if (!SECS.has(sec) || listed.has(row[0]) || /^(Maximum current|AI1 unit)/.test(row[0])) continue;
    const fc = xrefCell(row, from); if (!fc.length) continue;
    const fn = fc.length > 1 ? fc[pairIdx(from, ctx.fromScalar)] : fc[0], fp = pOf(from, fn);
    if (!fp) continue;
    // skip defaults that depend on another setting or the drive variant ("4 mA or 0 V", "-01: 5 Hz / 300 rpm", bit words)
    const fd = firstDef(fp[2]); if (!fd || fd === "-" || /;/.test(fp[2]) || /^P\.\d|\sor\s|:|\/|parameter|^[01]{3,}b$|^0b|^[0-9A-F]{4}h$/i.test(fd)) continue;
    const r = convertOne({ n: fn, p: fp, v: fd, raw: "" }, from, to, ctx);
    if (r.st === "set") { r.note = `ค่าโรงงาน ${from} = ${fd}` + (r.note ? " · " + r.note : ""); diffs.push(r); }
  }
  return { rows, bad: list.filter(e => e.bad), ctx, diffs };
}
const CV_TAG = { set: ["chg", "ต้องตั้ง"], def: ["def", "ค่าโรงงานอยู่แล้ว"], check: ["W", "ตรวจ"], none: ["F", "ไม่มีคู่"] };
function convCard(r, from, to) {
  const [cls, lab] = CV_TAG[r.st];
  const src = r.e.p ? `<button class="pno" type="button" data-p="${esc(r.e.n)}" data-pm="${from}">${esc(r.e.n)}</button><b>${esc(r.e.p[1])}</b>` : `<span class="pno">${esc(r.e.n)}</span><b class="bad">ไม่พบในคู่มือ ${esc(from)}</b>`;
  const dst = r.toP ? `<button class="pno" type="button" data-p="${esc(r.toN)}" data-pm="${to}">${esc(fam(to) === "a" ? r.toN.replace(".", "") : r.toN)}</button><b>${esc(r.toP[1])}</b>` : `<b class="muted">–</b>`;
  return `<div class="cvc ${r.st}${r.extra ? " ex" : ""}">
    <div class="xab"><div class="xs"><span class="xm">${esc(from)}</span><div class="xpl">${src}</div><div class="cvv">= ${esc(r.e.v || "–")}</div></div>
      <span class="xarr" aria-hidden="true">→</span>
      <div class="xs"><span class="xm">${esc(to)} <span class="tag ${cls}">${lab}</span></span><div class="xpl">${dst}</div>${r.set ? `<div class="cvv"><span>ตั้งเป็น</span> <b>${esc(r.set)}</b></div>` : ""}${r.def ? `<small>ค่าโรงงาน: ${esc(r.def)}</small>` : ""}</div></div>
    ${r.note ? `<div class="cvn">${esc(r.note)}</div>` : ""}</div>`;
}
function convHtml() {
  const from = S.xa, to = S.xb;
  if (!S.cvText.trim()) return `<div class="empty">วางค่าที่ตั้งไว้ในไดร์ฟเดิม (${esc(from)}) ลงในช่องด้านบน หรือกด “ดูตัวอย่าง”</div>`;
  const { rows, bad, ctx, diffs } = convert();
  const cnt = k => rows.filter(r => r.st === k).length;
  const f = S.cvf || "all", show = r => f === "all" || r.st === f;
  const chips = [["all", `ทั้งหมด ${rows.length}`], ["set", `ต้องตั้ง ${cnt("set")}`], ["check", `ตรวจ ${cnt("check")}`], ["def", `ค่าโรงงาน ${cnt("def")}`], ["none", `ไม่มีคู่ ${cnt("none")}`]];
  const vis = rows.filter(show), dvis = diffs.filter(show);
  return `<div class="toolbar"><div class="seg cvf">${chips.map(([k, l]) => `<button type="button" data-cvf="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div><span class="sp"></span>
      <span class="muted" style="font-size:12.5px">มอเตอร์ ${ctx.ns} rpm = ${ctx.fn} Hz</span><button class="btn pri" type="button" data-act="cvcopy">คัดลอกส่ง LINE</button></div>
    <div class="xlist">${vis.map(r => convCard(r, from, to)).join("") || `<div class="empty">ไม่มีรายการในกลุ่มนี้</div>`}</div>
    ${dvis.length ? `<div class="cvsec"><b>ไม่อยู่ในรายการ แต่ค่าโรงงานสองรุ่นต่างกัน</b><span>ไดร์ฟเดิมใช้ค่าโรงงานของ ${esc(from)} อยู่ ให้ตั้งค่าเหล่านี้ใน ${esc(to)} เพื่อให้ทำงานเหมือนเดิม</span></div>
      <div class="xlist">${dvis.map(r => convCard(r, from, to)).join("")}</div>` : ""}
    ${bad.length ? `<div class="notes"><b>บรรทัดที่อ่านไม่ได้</b> (ต้องขึ้นต้นด้วยเลขพารามิเตอร์): ${bad.map(b => esc(b.raw)).join(" · ")}</div>` : ""}`;
}
function convText() {
  const { rows, diffs } = convert(), L = { set: "ตั้ง", def: "ค่าโรงงานอยู่แล้ว", check: "ตรวจ", none: "ไม่มีคู่" };
  const no = (m, n) => fam(m) === "a" ? n.replace(".", "") : n;
  const line = r => `${r.e.n} ${r.e.p ? r.e.p[1] : ""} = ${r.e.v || "-"}\n   → ${r.toN ? no(S.xb, r.toN) + " " + (r.toP ? r.toP[1] : "") + " = " + r.set : "-"}  [${L[r.st]}]${r.note ? "\n   " + r.note : ""}`;
  const out = [`แปลงค่า ${S.xa} → ${S.xb}`, ""].concat(rows.filter(r => r.st !== "def").map(line));
  if (diffs.length) out.push("", `ค่าโรงงานต่างกัน (ตั้งใน ${S.xb}):`, ...diffs.map(line));
  out.push("", "— TG Control");
  return out.join("\n");
}
document.addEventListener("click", e => { if (e.target.closest("[data-act='cvcopy']")) copyText(convText()); });

function renderXref() {
  if (!MODELS.includes(S.xa)) S.xa = S.model;
  if (!MODELS.includes(S.xb) || S.xb === S.xa) S.xb = MODELS.find(m => m !== S.xa && fam(m) !== fam(S.xa)) || MODELS.find(m => m !== S.xa);
  const cv = S.xmode === "cv";
  const sel = (id, v) => `<select class="input" id="${id}" aria-label="${id === "xa" ? "ไดร์ฟเดิม" : "ไดร์ฟใหม่"}">${MODELS.map(m => `<option ${m === v ? "selected" : ""}>${m}</option>`).join("")}</select>`;
  const secs = XREF.filter(r => r[1] == null).map(r => r[0]);
  const ctrlSeg = ["n", "x"].includes(fam(S.xb)) ? `<div class="opt"><span>โหมดคุมมอเตอร์ของ ${esc(S.xb)}</span><div class="seg">${[["", "เหมือนไดร์ฟเดิม"], ["s", "Scalar"], ["v", "Vector"]].map(([k, l]) => `<button type="button" data-cvmode="${k}" aria-pressed="${(S.cvMode || "") === k}">${l}</button>`).join("")}</div></div>` : "";
  $("#main").innerHTML = `<section class="card xr"><div class="hd"><h2>เทียบพารามิเตอร์</h2><span class="muted" style="font-size:13px">ฟังก์ชันเดียวกัน ใช้เลขอะไรในอีกรุ่น</span></div>
    <div class="xbar"><label class="xl">ไดร์ฟเดิม${sel("xa", S.xa)}</label><button class="btn xsw" type="button" id="xswap" aria-label="สลับ">⇄</button><label class="xl">ไดร์ฟใหม่${sel("xb", S.xb)}</label></div>
    <div class="xmodes"><div class="seg"><button type="button" data-xmode="cmp" aria-pressed="${!cv}">ค้นหาทีละตัว</button><button type="button" data-xmode="cv" aria-pressed="${cv}">แปลงทั้งชุด</button></div></div>
    ${cv ? `<div class="cvin"><div class="cvhow">วางค่าที่ตั้งไว้ใน <b>${esc(S.xa)}</b> บรรทัดละ 1 ค่า: เลขพารามิเตอร์ แล้วตามด้วยค่า เช่น <code>2202 10 s</code> หรือ <code>11.03 Stop mode = Ramp</code> (เลข 4 หลักแบบบนจอก็ได้) → ได้รายการที่ต้องตั้งใน <b>${esc(S.xb)}</b></div>
        <textarea class="input" id="cvtext" rows="6" spellcheck="false" placeholder="2202 10 s&#10;1103 AI1&#10;9906 58 A">${esc(S.cvText)}</textarea>
        <div class="cvbtn">${ctrlSeg}<span class="sp"></span><button class="btn" type="button" id="cvex">ดูตัวอย่าง (ACS850 → ACS580)</button><button class="btn" type="button" id="cvclr">ล้าง</button></div></div>
      <div id="cvout">${convHtml()}</div>`
      : `<div class="xfind"><input class="input" id="xq" type="search" placeholder="พิมพ์เลขหรือชื่อของ ${esc(S.xa)} เช่น ${fam(S.xa) === "o" ? "2202" : "22.02"}, accel, PID, relay" value="${esc(S.xq)}" aria-label="ค้นหา">
        <div class="chips xchips"><button type="button" class="chip" data-xsec="" aria-pressed="${!S.xsec}">ทั้งหมด</button>${secs.map(s => `<button type="button" class="chip" data-xsec="${esc(s)}" aria-pressed="${S.xsec === s}">${esc(XSEC_TH[s] || s)}</button>`).join("")}</div></div>
      <div class="xlist" id="xlist">${xrefCards()}</div>`}</section>`;
  const set = () => { store.set("xa", S.xa); store.set("xb", S.xb); renderXref(); };
  $("#xa").addEventListener("change", e => { if (e.target.value === S.xb) S.xb = S.xa; S.xa = e.target.value; set(); });
  $("#xb").addEventListener("change", e => { if (e.target.value === S.xa) S.xa = S.xb; S.xb = e.target.value; set(); });
  $("#xswap").addEventListener("click", () => { [S.xa, S.xb] = [S.xb, S.xa]; set(); });
  if (cv) {
    const ta = $("#cvtext"); let t = null;
    ta.addEventListener("input", () => { S.cvText = ta.value; store.set("cvtext", S.cvText); clearTimeout(t); t = setTimeout(() => { $("#cvout").innerHTML = convHtml(); }, 250); });
    $("#cvex").addEventListener("click", () => { S.xa = "ACS850"; S.xb = "ACS580"; S.cvText = EXAMPLE850; S.cvMode = ""; S.cvf = "all"; store.set("cvtext", S.cvText); set(); });
    $("#cvclr").addEventListener("click", () => { S.cvText = ""; store.set("cvtext", ""); renderXref(); $("#cvtext").focus(); });
  } else {
    const inp = $("#xq"); inp.addEventListener("input", () => { S.xq = inp.value; $("#xlist").innerHTML = xrefCards(); });
  }
}
document.addEventListener("click", e => {
  const xm = e.target.closest("[data-xmode]"); if (xm) { S.xmode = xm.dataset.xmode; store.set("xmode", S.xmode); renderXref(); return; }
  const xs = e.target.closest("[data-xsec]"); if (xs) { S.xsec = xs.dataset.xsec; renderXref(); return; }
  const cf = e.target.closest("[data-cvf]"); if (cf) { S.cvf = cf.dataset.cvf; $("#cvout").innerHTML = convHtml(); return; }
  const cm = e.target.closest("[data-cvmode]"); if (cm) { S.cvMode = cm.dataset.cvmode; renderXref(); }
});
