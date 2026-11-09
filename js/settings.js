"use strict";
/* ---------- settings: pick a job → answer the questions → follow the steps (with the key path on the drive's own panel) ---------- */
function varVal(r, v) { const k = r.id + ":" + v.id + ":" + fam(S.model); if (S.vars[k] == null) S.vars[k] = v.default[fam(S.model)] || v.opts[0][0]; return S.vars[k]; }
function applies(st, r) {
  const m = S.model;
  if (st.only && !st.only.includes(m)) return false;
  if (st.skip && st.skip.includes(m)) return false;
  if (st.when) for (const k in st.when) { const v = (r.vars || []).find(x => x.id === k); if (v && v.fams.includes(fam(m)) && varVal(r, v) !== st.when[k]) return false; }
  return true;
}
function stepsFor(r) { return (r.steps[fam(S.model)] || []).filter(st => applies(st, r)).map(st => Object.assign({}, st, (st.alt || {})[S.model] || {})); }
const nrm = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9.]/g, "");
const numOf = s => { const m = String(s || "").match(/^\s*(?:scalar\s*)?(-?\d+(?:\.\d+)?)\s*([a-z%]*)/i); return m ? [parseFloat(m[1]), m[2].toLowerCase()] : null; };
// "chg" = has to be changed, "def" = already the factory value (check only), "chk" = read / check a value
function classify(st, p) {
  if (/^(ตรวจ|อ่าน)/.test(st.v)) return "chk";
  if (!p) return "chg";
  const d = p[2] || "";
  const om = st.v.match(/^([A-Za-z0-9][^()—]*?)\s*\((-?\d+)\)/);
  const name = om ? om[1] : st.v.split(/\s[—(]|\s+-\s/)[0];
  const optNames = p[5].map(o => nrm(o[1]));
  const cands = optNames.includes(nrm(d)) ? [d] : [d, ...d.split(";")];
  if (cands.some(c => nrm(c) && nrm(c) === nrm(name))) return "def";
  const a = numOf(name), b = numOf(d);
  if (a && b && a[0] === b[0] && (!a[1] || !b[1] || a[1] === b[1])) return "def";
  if (!om && /ค่าโรงงาน/.test(st.v)) return "def";
  return "chg";
}
const cleanV = v => v.replace(/\s*\(ค่าโรงงาน[^)]*\)/g, "").replace(/\s*—\s*ค่าโรงงาน.*$/, "").replace(/^ค่าโรงงาน\s*/, "").trim();
// parameters of a set of jobs, merged (used by the simulator loader)
function collect(ids) {
  const m = S.model, rows = new Map(), notes = [];
  for (const id of ids) {
    const r = RECIPES.find(x => x.id === id);
    stepsFor(r).forEach(st => {
      if (!st.p) { notes.push([r, st.note]); return; }
      const p = pOf(m, st.p), k = classify(st, p), v = cleanV(st.v);
      const cur = rows.get(st.p);
      if (!cur) rows.set(st.p, { p: st.p, par: p, v, why: st.why, k, from: [r.en], alts: [] });
      else { cur.from.push(r.en); if (nrm(cur.v) !== nrm(v)) cur.alts.push([r.en, v]); if (k === "chg") cur.k = "chg"; }
    });
  }
  return { list: [...rows.values()], notes };
}
// one job as an ordered list: notes stay where they are in the procedure
function jobItems(r) {
  const m = S.model, seen = new Set(), out = [];
  for (const st of stepsFor(r)) {
    if (!st.p) { out.push({ t: "note", text: st.note }); continue; }
    if (seen.has(st.p)) continue; seen.add(st.p);
    const p = pOf(m, st.p);
    out.push({ t: "par", p: st.p, par: p, v: cleanV(st.v), why: st.why || "", k: classify(st, p) });
  }
  return out;
}

const CATS = [["Basic setup", "เริ่มต้นใช้งาน"], ["Reference and speed", "ความเร็วและการสั่งงาน"], ["Application functions", "งานปั๊ม / PID / สื่อสาร"],
  ["I/O and protections", "I/O และการป้องกัน"], ["Other functions", "ฟังก์ชันอื่นๆ"], ["Troubleshooting", "แก้ปัญหา"]];
const catTh = c => (CATS.find(x => x[0] === c) || [c, c])[1];

// which panel the customer is holding
function panelOf(m) {
  const f = fam(m);
  if (m === "ACS180") return S.panelUi === "ap" ? "ACS-AP-x assistant panel" : "integrated panel";
  return { n: m === "ACH580" ? "ACH-AP-H assistant panel" : "ACS-AP-x assistant panel", x: "ACS-AP-I assistant panel", e: "CDP312R panel", o: "ACS-CP-A assistant panel", a: "ACS-CP-U panel (4-digit numbers)" }[f];
}
// key presses on the drive's own panel, from the home view to the saved value
function keyPath(m, x) {
  const f = fam(m), n = x.p, g = groupName(m, n).replace(/^Group /, ""), nm = x.par ? x.par[1] : "";
  const num = /^-?\d/.test(x.v), what = num ? `ปรับเป็น ${x.v}` : `เลือก ${x.v}`;
  if (m === "ACS180" && S.panelUi !== "ap") return ["OK (Main menu)", "Parameters", "Complete parameter list", g, `${n} ${nm}`, "OK", (num ? "◀▶ เลือกหลัก ▲▼ ปรับ: " : "▲▼ ") + what, "OK (save)"];
  if (f === "n" || f === "x") return ["Menu", "Parameters", "Complete list", g, `${n} ${nm}`, "Edit", (num ? "◀▶ เลือกหลัก ▲▼ ปรับ: " : "▲▼ ") + what, "Save"];
  if (f === "e") return ["PAR", `⇑⇓ กลุ่ม ${g}`, `▲▼ ${n} ${nm}`, "ENTER", "▲▼ " + what, "ENTER (save)"];
  const d = f === "a" ? n.replace(".", "") : n;
  return ["MENU", "PARAMETERS", `▲▼ กลุ่ม ${g}`, "SEL", `▲▼ ${d} ${nm}`, "EDIT", "▲▼ " + what, "SAVE"];
}

// the general key path for the panel in use (shown once; each step shows its own full path)
function navText(m) {
  const f = fam(m);
  if (m === "ACS180" && S.panelUi !== "ap") return "OK (Main menu) → Parameters → Complete parameter list → กลุ่ม → พารามิเตอร์ → OK → ปรับค่า → OK (save)";
  if (f === "n" || f === "x") return "Menu → Parameters → Complete list → กลุ่ม → พารามิเตอร์ → Edit → ปรับค่า → Save";
  return NAV[f];
}

const doneKey = p => `${S.model}:${S.fn}:${p}`;
const isDone = p => !!S.done[doneKey(p)];
function setDone(p, v) { if (v) S.done[doneKey(p)] = 1; else delete S.done[doneKey(p)]; store.set("done", S.done); }

function renderSettings() {
  if (S.fn && !RECIPES.some(r => r.id === S.fn)) S.fn = null;
  $("#main").innerHTML = S.fn ? `<section class="card wz" id="sheet">${jobHtml()}</section>` : jobsHtml();
  const inp = $("#ffilter");
  if (inp) inp.addEventListener("input", () => { S.ffilter = inp.value; $("#fgrid").innerHTML = jobTiles(); });
}

/* job list */
function jobTiles() {
  const m = S.model, f = S.ffilter.trim().toLowerCase();
  const hay = r => (r.en + " " + r.title + " " + r.short + " " + r.cust + " " + (TAGS[r.id] || "")).toLowerCase();
  return CATS.map(([c]) => {
    const rs = RECIPES.filter(r => r.cat === c && (!f || f.split(/\s+/).every(w => hay(r).includes(w))));
    if (!rs.length) return "";
    return `<div class="fcat">${esc(catTh(c))}</div><div class="ftiles">${rs.map(r => {
      const it = jobItems(r).filter(x => x.t === "par"), nC = it.filter(x => x.k === "chg").length;
      const ok = it.length > 0 || r.id === "macro";
      return `<button type="button" class="ftile${ok ? "" : " na"}" data-fn="${r.id}"><b>${esc(r.title)}</b><span>${esc(r.en)}</span><em>${ok ? (nC ? `ตั้ง ${nC} ค่า` : "ตรวจค่า") + (it.length - nC ? ` · ค่าโรงงาน ${it.length - nC}` : "") : `ไม่มีใน ${esc(m)}`}</em></button>`;
    }).join("")}</div>`;
  }).join("") || `<div class="empty">ไม่พบงานที่ค้นหา</div>`;
}
function jobsHtml() {
  return `<section class="card"><div class="hd"><h2>ตั้งค่าไดร์ฟ – ${esc(S.model)}</h2><span class="muted" style="font-size:13px">เลือกงานที่ลูกค้าต้องการ แล้วบอกลูกค้าทีละขั้น</span></div>
    <div class="bd fgw"><input class="input" id="ffilter" type="search" placeholder="ลูกค้าต้องการอะไร? เช่น PID, ปั๊ม, 4-20, Modbus, ไม่สตาร์ท" value="${esc(S.ffilter)}" aria-label="ค้นหางาน"><div id="fgrid">${jobTiles()}</div>
      <button type="button" class="plink" data-tab="param"><b>รายการพารามิเตอร์ทั้งหมด</b><span>${D[S.model].P.length} ตัวของ ${esc(S.model)} · ค้นหาตามเลข ชื่อ หรือกลุ่ม</span><i aria-hidden="true">›</i></button></div></section>`;
}

/* one job */
function stepCard(x, i, total, big) {
  const m = S.model, done = isDone(x.p), def = x.k !== "chg";
  const path = keyPath(m, x);
  return `<article class="wstep${done ? " done" : ""}${def ? " def" : ""}${big ? " big" : ""}">
    <div class="wsh"><span class="wn">${def ? "ตรวจ" : `ขั้น ${i}/${total}`}</span><button class="pno${big ? " big" : ""}" type="button" data-p="${esc(x.p)}">${esc(fam(m) === "a" ? x.p.replace(".", "") : x.p)}</button><b class="wnm">${x.par ? esc(x.par[1]) : `<span style="color:var(--fault)">ไม่พบในคู่มือ</span>`}</b>
      <button type="button" class="tick" data-tick="${esc(x.p)}" aria-pressed="${done}" aria-label="ตั้งแล้ว ${esc(x.p)}"></button></div>
    <div class="wv"><span>${def ? "ควรเป็น" : "ตั้งเป็น"}</span><b>${esc(x.v)}</b><small>ค่าโรงงาน: ${esc(x.par && x.par[2] ? x.par[2] : "–")}</small></div>
    ${x.why ? `<div class="wwhy">${linkify(x.why, m)}</div>` : ""}
    ${def ? "" : `<div class="wpath" aria-label="วิธีกดบนจอ">${path.map(s => `<span>${esc(s)}</span>`).join("<i>›</i>")}</div>`}
  </article>`;
}
function jobHtml() {
  const m = S.model, r = RECIPES.find(x => x.id === S.fn), items = jobItems(r);
  const pars = items.filter(x => x.t === "par"), todo = pars.filter(x => x.k === "chg"), defs = pars.filter(x => x.k !== "chg");
  const nDone = todo.filter(x => isDone(x.p)).length;
  const vars = (r.vars || []).filter(v => v.fams.includes(fam(m)));
  const one = S.wmode === "one" && todo.length > 0;
  if (S.wstep >= todo.length) S.wstep = Math.max(0, todo.length - 1);
  const panelSel = m === "ACS180" ? `<div class="opt"><span>จอที่ลูกค้าใช้</span><div class="seg"><button type="button" data-wpanel="ip" aria-pressed="${S.panelUi !== "ap"}">Integrated panel</button><button type="button" data-wpanel="ap" aria-pressed="${S.panelUi === "ap"}">ACS-AP-x</button></div></div>` : "";
  const optHtml = vars.map(v => `<div class="opt"><span>${esc(v.label)}</span><div class="seg">${v.opts.map(o => `<button type="button" data-var="${v.id}" data-val="${o[0]}" aria-pressed="${varVal(r, v) === o[0]}">${esc(o[1])}</button>`).join("")}</div></div>`).join("") + panelSel;
  const jump = `<select class="input fjump" id="fnjump" aria-label="เปลี่ยนงาน">${CATS.map(([c]) => `<optgroup label="${esc(catTh(c))}">${RECIPES.filter(x => x.cat === c).map(x => `<option value="${x.id}" ${x.id === r.id ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</optgroup>`).join("")}</select>`;
  let k = 0;
  const flow = items.map(x => x.t === "note" ? `<div class="wnote">${linkify(x.text, m)}</div>` : x.k === "chg" ? stepCard(x, ++k, todo.length, false) : "").join("");
  const cur = todo[S.wstep];
  const oneHtml = one ? `<div class="wone">${stepCard(cur, S.wstep + 1, todo.length, true)}
      <div class="wnav"><button class="btn" type="button" data-wgo="-1" ${S.wstep ? "" : "disabled"}>‹ ก่อนหน้า</button>
        <button class="btn pri" type="button" data-wnext>${isDone(cur.p) ? "ถัดไป ›" : "ตั้งแล้ว · ถัดไป ›"}</button></div></div>` : "";
  return `<div class="hd sh"><button class="btn sm" type="button" data-fnback>‹ งานทั้งหมด</button>${jump}</div>
    <div class="stitle"><h2>${esc(r.title)}</h2><span class="muted">${esc(m)} · ${esc(r.en)}</span></div>
    ${r.cust ? `<div class="wcust">ลูกค้ามักพูดว่า: ${esc(r.cust)}</div>` : ""}
    ${(r.ask && r.ask.length) || optHtml ? `<div class="wpre">${r.ask && r.ask.length ? `<div><div class="sub">ถามลูกค้าก่อน</div><ul>${r.ask.map(q => `<li>${esc(q)}</li>`).join("")}</ul></div>` : ""}${optHtml ? `<div class="opts">${optHtml}</div>` : ""}</div>` : ""}
    ${r.id === "macro" ? macroTable(m) : ""}
    <div class="toolbar"><span class="counts">${todo.length ? `ตั้งแล้ว <b>${nDone}</b>/${todo.length}` : "ไม่มีค่าที่ต้องแก้"}</span>
      ${todo.length ? `<div class="wbar"><i style="width:${Math.round(nDone / todo.length * 100)}%"></i></div>` : ""}<span class="sp"></span>
      ${todo.length ? `<div class="seg"><button type="button" data-wmode="all" aria-pressed="${!one}">ดูทั้งหมด</button><button type="button" data-wmode="one" aria-pressed="${one}">ทีละขั้น</button></div>` : ""}
      ${nDone ? `<button class="btn" type="button" data-act="untick">ล้างเครื่องหมาย</button>` : ""}
      ${SIM_MODELS.includes(m) && todo.length ? `<button class="btn" type="button" data-act="tosim">ลองในจอจำลอง</button>` : ""}
      <button class="btn pri" type="button" data-act="copy">คัดลอกส่ง LINE</button></div>
    <div class="navhint"><b>จอ ${esc(panelOf(m))}:</b> ${esc(navText(m))}</div>
    <div class="wflow">${one ? oneHtml : flow || `<div class="empty">งานนี้ไม่มีพารามิเตอร์ใน ${esc(m)}</div>`}</div>
    ${defs.length ? `<details class="wdefs"${one ? "" : " open"}><summary>ค่าที่ควรเป็นค่าโรงงานอยู่แล้ว – ตรวจอย่างเดียว ไม่ต้องแก้ (${defs.length})</summary><div class="wflow">${defs.map(x => stepCard(x, 0, 0, false)).join("")}</div></details>` : ""}
    ${(r.check && r.check.length) || (r.trouble && r.trouble.length) ? `<div class="wend">
      ${r.check && r.check.length ? `<div><div class="sub">ทดสอบหลังตั้งค่า</div><ul>${r.check.map(c => `<li>${linkify(c, m)}</li>`).join("")}</ul></div>` : ""}
      ${r.trouble && r.trouble.length ? `<div><div class="sub">ถ้ายังไม่ได้ผล</div><ul>${r.trouble.map(c => `<li>${linkify(c, m)}</li>`).join("")}</ul></div>` : ""}</div>` : ""}`;
}
function macroTable(m) {
  const rows = MAC[m] || [];
  if (!rows.length) return "";
  return `<div class="wmac"><div class="sub">มาโครของ ${esc(m)}</div><div class="scroll"><table class="mtable"><thead><tr><th>Macro</th><th>Default I/O</th><th>รูปการต่อสาย</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td><b>${esc(x[0])}</b></td><td>${esc(x[1])}</td><td>${pdfLink(m, x[2])}</td></tr>`).join("")}</tbody></table></div></div>`;
}
// plain text for LINE: numbered steps with the key path once at the top
function jobText() {
  const m = S.model, r = RECIPES.find(x => x.id === S.fn), items = jobItems(r);
  const todo = items.filter(x => x.t === "par" && x.k === "chg"), defs = items.filter(x => x.t === "par" && x.k !== "chg");
  const no = x => fam(m) === "a" ? x.p.replace(".", "") : x.p;
  const out = [`ตั้งค่า ${m}: ${r.title}`, `วิธีเข้า (${panelOf(m)}): ${navText(m)}`, ""];
  let k = 0;
  for (const x of items) {
    if (x.t === "note") { out.push(`* ${x.text}`); continue; }
    if (x.k !== "chg") continue;
    out.push(`${++k}) ${no(x)} ${x.par ? x.par[1] : ""} = ${x.v}`);
    if (x.why) out.push(`   ${x.why}`);
  }
  if (!todo.length) out.push("(ไม่มีค่าที่ต้องแก้)");
  if (defs.length) out.push("", "ตรวจว่าเป็นค่าโรงงาน (ไม่ต้องแก้):", ...defs.map(x => `- ${no(x)} ${x.par ? x.par[1] : ""} = ${x.v}`));
  if (r.check && r.check.length) out.push("", "ทดสอบ:", ...r.check.map(c => "- " + c));
  out.push("", "— TG Control");
  return out.join("\n");
}
// Put the "to set" values into the simulator, where the value can be read as a selection or a number
function loadIntoSim() {
  if (S.model !== SM) useSimModel(S.model);
  const { list } = collect([S.fn]); let n = 0;
  const mac = list.find(x => x.p === "96.04" && x.k === "chg"), mc = mac && mac.v.match(/\((\d+)\)/);
  if (mc) { applyMacro(+mc[1]); n++; } else restoreDefaults();
  for (const x of list) {
    if (x.k !== "chg" || x === mac) continue;
    const m = simMeta(x.p); if (!m) continue;
    let v = null;
    if (m.t === "opt") {
      const code = x.v.match(/\((-?\d+)\)/), nm = nrm(x.v.split(/\s[—(]/)[0]);
      const o = (code && m.opts.find(o => o[0] === +code[1])) || m.opts.find(o => nrm(o[1]) === nm);
      if (o) v = o[0];
    } else if (m.t === "num") {
      // a plain value ("25 Hz") or an example in the note ("ช่วงวัดสูงสุด เช่น 10")
      const g = x.v.match(/^\s*(-?\d+(?:\.\d+)?)/) || x.v.match(/เช่น\s*(-?\d+(?:\.\d+)?)/);
      if (g) { v = parseFloat(g[1]); if (m.min != null) v = Math.max(m.min, Math.min(m.max, v)); }
    } else if (m.t === "time") {
      const g = x.v.match(/\d\d:\d\d:\d\d|\d\d \d\d:\d\d|\d\d\.\d\d\.\d{4}/);
      if (g && timeOk(m.fmt, g[0])) v = g[0];
    } else if (m.t === "bits") {
      const g = x.v.match(/\(([0-9A-F]{4})h\)|\(([01]{4,})b\)/i);
      if (g) v = g[1] ? parseInt(g[1], 16) : parseInt(g[2], 2);
    }
    if (v != null) { SIMV[x.p] = v; n++; }
  }
  simLog(`Loaded ${n} values: ${RECIPES.find(r => r.id === S.fn).en}`);
  toast(`โหลด ${n} ค่าเข้าจอจำลองแล้ว`);
  setTab("sim");
}
const redrawJob = () => { const y = window.scrollY; $("#sheet").innerHTML = jobHtml(); window.scrollTo(0, y); };
document.addEventListener("click", e => {
  const fn = e.target.closest("[data-fn]");
  if (fn) { S.fn = fn.dataset.fn; S.wstep = 0; renderSettings(); window.scrollTo(0, 0); return; }
  if (e.target.closest("[data-fnback]")) { S.fn = null; renderSettings(); window.scrollTo(0, 0); return; }
  const tk = e.target.closest("[data-tick]");
  if (tk) { setDone(tk.dataset.tick, !isDone(tk.dataset.tick)); redrawJob(); return; }
  const vb = e.target.closest("[data-var]");
  if (vb) { S.vars[S.fn + ":" + vb.dataset.var + ":" + fam(S.model)] = vb.dataset.val; redrawJob(); return; }
  const wp = e.target.closest("[data-wpanel]"); if (wp) { S.panelUi = wp.dataset.wpanel; store.set("panelui", S.panelUi); redrawJob(); return; }
  const wm = e.target.closest("[data-wmode]"); if (wm) { S.wmode = wm.dataset.wmode; store.set("wmode", S.wmode); redrawJob(); return; }
  const wg = e.target.closest("[data-wgo]"); if (wg) { S.wstep = Math.max(0, S.wstep + +wg.dataset.wgo); redrawJob(); return; }
  if (e.target.closest("[data-wnext]")) {
    const r = RECIPES.find(x => x.id === S.fn), todo = jobItems(r).filter(x => x.t === "par" && x.k === "chg");
    setDone(todo[S.wstep].p, true);
    if (S.wstep < todo.length - 1) S.wstep++; else toast("ครบทุกขั้นแล้ว – ทดสอบตามรายการด้านล่าง");
    redrawJob(); return;
  }
  const ac = e.target.closest("[data-act]"); if (!ac) return;
  if (ac.dataset.act === "copy") copyText(jobText());
  else if (ac.dataset.act === "untick") { for (const k in S.done) if (k.startsWith(S.model + ":" + S.fn + ":")) delete S.done[k]; store.set("done", S.done); S.wstep = 0; redrawJob(); }
  else if (ac.dataset.act === "tosim") loadIntoSim();
});
document.addEventListener("change", e => { if (e.target.id === "fnjump") { S.fn = e.target.value; S.wstep = 0; renderSettings(); } });
